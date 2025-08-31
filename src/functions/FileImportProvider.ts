/**
 * FlashMintlify - File import provider for CodeLens functionality
 *
 * @author Match-Yang(OliverYeung)
 * @email oliver.yeung.me@gmail.com
 * @license MIT
 */
import * as vscode from 'vscode';
import * as path from 'path';
import { ImportCalculator } from '../utils/ImportCalculator';

/**
 * 文件导入次数显示Provider
 * 在文件末尾显示⬆数字标记，表示该文件被多少个文件import
 */
class FileImportCodeLensProvider implements vscode.CodeLensProvider {
    private importCalculator: ImportCalculator;
    private importCounts: Map<string, number> = new Map();
    private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

    constructor(importCalculator: ImportCalculator) {
        this.importCalculator = importCalculator;
    }

    provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
        const codeLenses: vscode.CodeLens[] = [];
        
        // 只处理md和mdx文件
        if (document.languageId !== 'markdown' && document.languageId !== 'mdx') {
            return codeLenses;
        }

        // 获取当前文件的import次数
        const filePath = document.uri.fsPath;
        const importCount = this.importCounts.get(filePath) || 0;

        // 调试信息
        console.log(`CodeLens for file: ${filePath}, import count: ${importCount}, cache size: ${this.importCounts.size}`);

        // 如果有被import，在文件开头显示标记
        if (importCount > 0) {
            // 找到第一行非空内容
            let targetLine = 0;
            for (let i = 0; i < document.lineCount; i++) {
                const lineText = document.lineAt(i).text.trim();
                if (lineText.length > 0) {
                    targetLine = i;
                    break;
                }
            }

            const lineText = document.lineAt(targetLine).text;
            const range = new vscode.Range(targetLine, 0, targetLine, lineText.length);

            const command: vscode.Command = {
                title: `imported by ${importCount} files`,
                tooltip: `此文件被 ${importCount} 个文件引用`,
                command: 'flashMintlify.fileimport.showreferences',
                arguments: [filePath]
            };

            codeLenses.push(new vscode.CodeLens(range, command));
            console.log(`Created CodeLens for ${filePath} at line ${targetLine}: ⬆${importCount}`);
        }

        console.log(`Returning ${codeLenses.length} CodeLenses for ${filePath}`);
        return codeLenses;
    }

    resolveCodeLens?(codeLens: vscode.CodeLens, token: vscode.CancellationToken): vscode.CodeLens | Thenable<vscode.CodeLens> {
        return codeLens;
    }

    /**
     * 更新import次数缓存
     */
    updateImportCounts(importCounts: Map<string, number>): void {
        this.importCounts = importCounts;
        console.log(`Updated import counts cache with ${importCounts.size} files`);

        // 打印一些示例数据用于调试
        let count = 0;
        for (const [filePath, importCount] of importCounts) {
            if (importCount > 0 && count < 5) {
                console.log(`  ${filePath}: ${importCount} imports`);
                count++;
            }
        }

        // 触发CodeLens刷新
        this.refresh();
    }

    /**
     * 刷新CodeLens显示
     */
    private refresh(): void {
        // 使用事件发射器通知VSCode刷新CodeLens
        this._onDidChangeCodeLenses.fire();
    }
}

/**
 * 创建文件导入相关的providers和commands
 */
function createFileImportProviders() {
    const importCalculator = new ImportCalculator();
    const fileImportProvider = new FileImportCodeLensProvider(importCalculator);

    // 注册CodeLens provider
    const codeLensProvider = vscode.languages.registerCodeLensProvider(
        [{ language: 'markdown', scheme: 'file' }, { language: 'mdx', scheme: 'file' }],
        fileImportProvider
    );

    // 旧的显示引用详情命令已移除，使用新的showFileReferences

    // 注册计算import次数的命令
    const calculateImportCommand = vscode.commands.registerCommand(
        'flashMintlify.basic.calculateimport',
        async () => {
            // 显示进度条
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "计算文件引用次数",
                cancellable: false
            }, async (progress, token) => {
                try {
                    progress.report({ increment: 0, message: "开始计算..." });

                    const importCounts = await importCalculator.calculateImportCounts(
                        (progressValue: number, message: string) => {
                            progress.report({ 
                                increment: progressValue - (progress as any).lastReported || 0, 
                                message 
                            });
                            (progress as any).lastReported = progressValue;
                        }
                    );

                    // 更新provider的缓存
                    fileImportProvider.updateImportCounts(importCounts);

                    // 显示完成消息
                    const totalFiles = importCounts.size;
                    const referencedFiles = Array.from(importCounts.values()).filter(count => count > 0).length;
                    
                    vscode.window.showInformationMessage(
                        `计算完成！共扫描 ${totalFiles} 个文件，其中 ${referencedFiles} 个文件被引用。请查看文件名后的⬆标记。`
                    );

                } catch (error) {
                    console.error('计算import次数失败:', error);
                    vscode.window.showErrorMessage(`计算失败: ${error instanceof Error ? error.message : '未知错误'}`);
                }
            });
        }
    );

    // 注册显示引用文件的命令
    const showReferencesCommand2 = vscode.commands.registerCommand(
        'flashMintlify.fileimport.showreferences',
        showFileReferences
    );

    return [codeLensProvider, calculateImportCommand, showReferencesCommand2];
}

/**
 * 显示文件引用信息的命令
 */
async function showFileReferences(filePath: string) {
    try {
        // 获取引用该文件的所有文件
        const calculator = new ImportCalculator();
        const referencingFiles = await calculator.getFilesImporting(filePath);

        if (referencingFiles.length === 0) {
            vscode.window.showInformationMessage('没有文件引用此文件');
            return;
        }

        // 创建快速选择项
        const quickPickItems: vscode.QuickPickItem[] = referencingFiles.map((file: string) => ({
            label: path.basename(file),
            description: path.relative(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '', file),
            detail: file
        }));

        // 显示快速选择列表
        const selected = await vscode.window.showQuickPick(quickPickItems, {
            placeHolder: `选择要跳转的文件 (共 ${referencingFiles.length} 个文件引用此文件)`,
            matchOnDescription: true,
            matchOnDetail: true
        });

        if (selected && selected.detail) {
            // 打开选中的文件
            const document = await vscode.workspace.openTextDocument(selected.detail);
            await vscode.window.showTextDocument(document);
        }

    } catch (error) {
        console.error('显示文件引用时出错:', error);
        vscode.window.showErrorMessage(`显示文件引用失败: ${error}`);
    }
}

export { createFileImportProviders, FileImportCodeLensProvider };
