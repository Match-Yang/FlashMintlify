import * as vscode from 'vscode';
import { MintlifyLanguageService } from './MintlifyLanguageService';

/**
 * FlashMintlify Language Service 主入口
 * 管理Language Service的生命周期和命令注册
 */

let languageService: MintlifyLanguageService | undefined;

/**
 * 创建FlashMintlify Language Service提供者
 */
export function createFlashMintlifyLanguageServiceProvider(): vscode.Disposable[] {
    const disposables: vscode.Disposable[] = [];

    try {
        // 初始化Language Service
        languageService = new MintlifyLanguageService();
        languageService.start();

        console.log('FlashMintlifyLanguageServiceMain: Language Service已启动');

        // 注册分析引用命令
        const analyzeReferencesCommand = vscode.commands.registerCommand(
            'flashMintlify.analyzeReferences',
            async () => {
                if (languageService) {
                    await languageService.analyzeFileReferences();
                } else {
                    vscode.window.showErrorMessage('Language Service未启动');
                }
            }
        );

        // 注册重新加载命令
        const reloadLanguageServiceCommand = vscode.commands.registerCommand(
            'flashMintlify.reloadLanguageService',
            async () => {
                if (languageService) {
                    await languageService.reload();
                } else {
                    // 如果Language Service未启动，尝试重新创建
                    try {
                        languageService = new MintlifyLanguageService();
                        languageService.start();
                        vscode.window.showInformationMessage('Mintlify Language Service 已启动');
                    } catch (error) {
                        console.error('重新启动Language Service失败:', error);
                        vscode.window.showErrorMessage(`启动Language Service失败: ${error instanceof Error ? error.message : '未知错误'}`);
                    }
                }
            }
        );

        // 注册手动文件夹重命名命令
        const handleFolderRenameCommand = vscode.commands.registerCommand(
            'flashMintlify.handleFolderRename',
            async () => {
                if (!languageService) {
                    vscode.window.showErrorMessage('Language Service未启动');
                    return;
                }

                try {
                    // 让用户输入旧文件夹路径
                    const oldFolderPath = await vscode.window.showInputBox({
                        prompt: '请输入旧文件夹路径（相对于工作区根目录）',
                        placeHolder: '例如: old-folder-name',
                        validateInput: (value) => {
                            if (!value || value.trim().length === 0) {
                                return '路径不能为空';
                            }
                            return null;
                        }
                    });

                    if (!oldFolderPath) {
                        return;
                    }

                    // 让用户输入新文件夹路径
                    const newFolderPath = await vscode.window.showInputBox({
                        prompt: '请输入新文件夹路径（相对于工作区根目录）',
                        placeHolder: '例如: new-folder-name',
                        validateInput: (value) => {
                            if (!value || value.trim().length === 0) {
                                return '路径不能为空';
                            }
                            return null;
                        }
                    });

                    if (!newFolderPath) {
                        return;
                    }

                    // 转换为绝对路径
                    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                    if (!workspaceRoot) {
                        vscode.window.showErrorMessage('未找到工作区');
                        return;
                    }

                    const oldAbsolutePath = require('path').join(workspaceRoot, oldFolderPath);
                    const newAbsolutePath = require('path').join(workspaceRoot, newFolderPath);

                    // 执行文件夹重命名处理
                    await languageService.handleManualFolderRename(oldAbsolutePath, newAbsolutePath);

                } catch (error) {
                    console.error('手动处理文件夹重命名失败:', error);
                    vscode.window.showErrorMessage(`处理文件夹重命名失败: ${error instanceof Error ? error.message : '未知错误'}`);
                }
            }
        );

        // 注册测试命令（用于开发调试）
        const testLanguageServiceCommand = vscode.commands.registerCommand(
            'flashMintlify.testLanguageService',
            async () => {
                if (!languageService) {
                    vscode.window.showErrorMessage('Language Service未启动');
                    return;
                }

                try {
                    const activeEditor = vscode.window.activeTextEditor;
                    if (!activeEditor) {
                        vscode.window.showErrorMessage('请先打开一个文件');
                        return;
                    }

                    const filePath = activeEditor.document.uri.fsPath;
                    console.log('测试Language Service，当前文件:', filePath);

                    // 模拟文件重命名事件
                    const testOldPath = filePath;
                    const testNewPath = filePath.replace(/(\.[^.]+)$/, '_renamed$1');

                    vscode.window.showInformationMessage(`测试模式：模拟将 ${testOldPath} 重命名为 ${testNewPath}`);

                    // 注意：这只是测试，不会实际重命名文件
                    console.log('这是测试模式，不会实际修改文件');

                } catch (error) {
                    console.error('测试Language Service失败:', error);
                    vscode.window.showErrorMessage(`测试失败: ${error instanceof Error ? error.message : '未知错误'}`);
                }
            }
        );

        // 添加所有命令到disposables
        disposables.push(
            analyzeReferencesCommand,
            reloadLanguageServiceCommand,
            handleFolderRenameCommand,
            testLanguageServiceCommand
        );

        // 添加Language Service停止处理
        disposables.push(new vscode.Disposable(() => {
            if (languageService) {
                languageService.stop();
                languageService = undefined;
                console.log('FlashMintlifyLanguageServiceMain: Language Service已停止');
            }
        }));

    } catch (error) {
        console.error('初始化FlashMintlify Language Service失败:', error);
        vscode.window.showErrorMessage(`初始化Language Service失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }

    return disposables;
}

/**
 * 获取当前的Language Service实例
 */
export function getLanguageService(): MintlifyLanguageService | undefined {
    return languageService;
}

/**
 * 检查Language Service是否正在运行
 */
export function isLanguageServiceRunning(): boolean {
    return languageService !== undefined;
}

/**
 * 手动启动Language Service
 */
export async function startLanguageService(): Promise<void> {
    if (languageService) {
        console.log('Language Service已经在运行');
        return;
    }

    try {
        languageService = new MintlifyLanguageService();
        languageService.start();
        console.log('Language Service手动启动成功');
    } catch (error) {
        console.error('手动启动Language Service失败:', error);
        throw error;
    }
}

/**
 * 手动停止Language Service
 */
export function stopLanguageService(): void {
    if (languageService) {
        languageService.stop();
        languageService = undefined;
        console.log('Language Service手动停止成功');
    }
}
