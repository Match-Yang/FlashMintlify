/**
 * FlashMintlify - Mintlify language service
 *
 * @author Match-Yang(OliverYeung)
 * @email oliver.yeung.me@gmail.com
 * @license MIT
 */
import * as vscode from 'vscode';
import { FilePathResolver } from './FilePathResolver';
import { FileWatcher, FileChangeEvent } from './FileWatcher';
import { LinkUpdater } from './LinkUpdater';
import { ImportUpdater } from './ImportUpdater';
import { NavigationUpdater } from './NavigationUpdater';
import { ProgressReporter, UpdateResult, createEmptyResult, mergeResults, showResultSummary } from './ProgressReporter';
import { PreviewPanel } from '../webview/PreviewPanel';

/**
 * Mintlify Language Service
 * 主要的语言服务类，协调所有更新操作
 */
export class MintlifyLanguageService {
    private pathResolver: FilePathResolver;
    private fileWatcher: FileWatcher;
    private linkUpdater: LinkUpdater;
    private importUpdater: ImportUpdater;
    private navigationUpdater: NavigationUpdater;
    private progressReporter: ProgressReporter;
    private isEnabled: boolean = true;

    constructor() {
        this.pathResolver = new FilePathResolver();
        this.fileWatcher = new FileWatcher(this.pathResolver);
        this.linkUpdater = new LinkUpdater(this.pathResolver);
        this.importUpdater = new ImportUpdater(this.pathResolver);
        this.navigationUpdater = new NavigationUpdater(this.pathResolver);
        this.progressReporter = new ProgressReporter();

        // 检查配置
        this.updateConfiguration();

        // 监听配置变更
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('flashMintlify.enableLanguageService')) {
                this.updateConfiguration();
            }
        });

        // 监听编辑器切换，实现自动预览更新（添加防抖逻辑避免频繁触发）
        vscode.window.onDidChangeActiveTextEditor(this.handleActiveEditorChange.bind(this));
    }

    /**
     * 启动Language Service
     */
    start(): void {
        if (!this.isEnabled) {
            console.log('MintlifyLanguageService: 已禁用，跳过启动');
            return;
        }

        console.log('MintlifyLanguageService: 正在启动...');

        // 检查是否有docs.json文件
        if (!this.pathResolver.hasDocsJson()) {
            console.log('MintlifyLanguageService: 未找到docs.json文件，Language Service将以有限功能运行');
        }

        // 开始监听文件变更
        this.fileWatcher.startWatching(
            this.handleFileChange.bind(this),
            this.handleFolderChange.bind(this)
        );

        console.log('MintlifyLanguageService: 启动完成');
    }

    /**
     * 停止Language Service
     */
    stop(): void {
        console.log('MintlifyLanguageService: 正在停止...');

        this.fileWatcher.stopWatching();

        console.log('MintlifyLanguageService: 已停止');
    }

    /**
     * 处理单个文件变更
     */
    private async handleFileChange(event: FileChangeEvent): Promise<void> {
        if (!this.isEnabled) return;

        console.log(`MintlifyLanguageService: 处理文件变更 - ${event.type}: ${event.oldPath} -> ${event.newPath}`);

        try {
            // Start progress display
            const progressPromise = this.progressReporter.start('Updating file references...', 100);

            // 执行更新操作
            const result = await this.updateReferencesForFile(event.oldPath, event.newPath);

            // 结束进度显示
            this.progressReporter.complete();
            await progressPromise;

            // 显示结果摘要
            showResultSummary(result);

        } catch (error) {
            this.progressReporter.complete();
            console.error('处理文件变更时出错:', error);
            vscode.window.showErrorMessage(`更新文件引用时出错: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    }

    /**
     * 处理文件夹变更
     */
    private async handleFolderChange(events: FileChangeEvent[]): Promise<void> {
        if (!this.isEnabled || events.length === 0) return;

        console.log(`MintlifyLanguageService: 处理文件夹变更 - ${events.length} 个文件`);

        try {
            // Start progress display
            const progressPromise = this.progressReporter.start('Updating folder references...', 100);

            // 执行批量更新操作
            const result = await this.updateReferencesForMultipleFiles(events);

            // 结束进度显示
            this.progressReporter.complete();
            await progressPromise;

            // 显示结果摘要
            showResultSummary(result);

        } catch (error) {
            this.progressReporter.complete();
            console.error('处理文件夹变更时出错:', error);
            vscode.window.showErrorMessage(`更新文件夹引用时出错: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    }

    /**
     * 更新单个文件的所有引用
     */
    private async updateReferencesForFile(oldFilePath: string, newFilePath: string): Promise<UpdateResult> {
        const totalResult = createEmptyResult();

        try {
            // 1. Update internal links (30%)
            this.progressReporter.report(10, 'Updating internal links...');
            const linkResult = await this.linkUpdater.updateLinksForFile(
                oldFilePath,
                newFilePath,
                (message) => this.progressReporter.report(10, message)
            );
            Object.assign(totalResult, mergeResults(totalResult, linkResult));
            this.progressReporter.report(30, 'Internal links update completed');

            // 2. Update import statements (60%)
            this.progressReporter.report(30, 'Updating import statements...');
            const importResult = await this.importUpdater.updateImportsForFile(
                oldFilePath,
                newFilePath,
                (message) => this.progressReporter.report(30, message)
            );
            Object.assign(totalResult, mergeResults(totalResult, importResult));
            this.progressReporter.report(60, 'Import statements update completed');

            // 3. Update navigation configuration (90%)
            this.progressReporter.report(60, 'Updating navigation configuration...');
            const navigationResult = await this.navigationUpdater.updateNavigationForFile(
                oldFilePath,
                newFilePath,
                (message) => this.progressReporter.report(60, message)
            );
            Object.assign(totalResult, mergeResults(totalResult, navigationResult));
            this.progressReporter.report(90, 'Navigation configuration update completed');

            this.progressReporter.report(100, 'All updates completed');

        } catch (error) {
            const errorMsg = `更新文件引用时出错: ${error instanceof Error ? error.message : '未知错误'}`;
            totalResult.errors.push(errorMsg);
            console.error(errorMsg, error);
        }

        return totalResult;
    }

    /**
     * 批量更新多个文件的引用
     */
    private async updateReferencesForMultipleFiles(events: FileChangeEvent[]): Promise<UpdateResult> {
        const totalResult = createEmptyResult();

        try {
            const fileChanges = events.map(event => ({
                oldPath: event.oldPath,
                newPath: event.newPath
            }));

            // 1. Batch update internal links (30%)
            this.progressReporter.report(10, 'Batch updating internal links...');
            const linkResult = await this.linkUpdater.updateLinksForMultipleFiles(
                fileChanges,
                (message) => this.progressReporter.report(10, message)
            );
            Object.assign(totalResult, mergeResults(totalResult, linkResult));
            this.progressReporter.report(30, 'Internal links batch update completed');

            // 2. Batch update import statements (60%)
            this.progressReporter.report(30, 'Batch updating import statements...');
            const importResult = await this.importUpdater.updateImportsForMultipleFiles(
                fileChanges,
                (message) => this.progressReporter.report(30, message)
            );
            Object.assign(totalResult, mergeResults(totalResult, importResult));
            this.progressReporter.report(60, 'Import statements batch update completed');

            // 3. Batch update navigation configuration (90%)
            this.progressReporter.report(60, 'Batch updating navigation configuration...');
            const navigationResult = await this.navigationUpdater.updateNavigationForMultipleFiles(
                fileChanges,
                (message) => this.progressReporter.report(60, message)
            );
            Object.assign(totalResult, mergeResults(totalResult, navigationResult));
            this.progressReporter.report(90, 'Navigation configuration batch update completed');

            this.progressReporter.report(100, 'All batch updates completed');

        } catch (error) {
            const errorMsg = `批量更新文件引用时出错: ${error instanceof Error ? error.message : '未知错误'}`;
            totalResult.errors.push(errorMsg);
            console.error(errorMsg, error);
        }

        return totalResult;
    }

    /**
     * 手动分析文件引用
     */
    async analyzeFileReferences(filePath?: string): Promise<void> {
        try {
            const targetFile = filePath || vscode.window.activeTextEditor?.document.uri.fsPath;
            
            if (!targetFile) {
                vscode.window.showErrorMessage('请先打开一个文件');
                return;
            }

            if (!this.pathResolver.isMintlifyFile(targetFile)) {
                vscode.window.showErrorMessage('当前文件不是Mintlify相关文件（.md, .mdx, .jsx）');
                return;
            }

            // 查找所有引用
            const links = await this.linkUpdater.findLinksToFile(targetFile);
            const imports = await this.importUpdater.findImportsToFile(targetFile);
            const navigation = this.navigationUpdater.findNavigationReferencesToFile(targetFile);

            // 显示分析结果
            const relativePath = this.pathResolver.toRelativePath(targetFile);
            let message = `文件引用分析结果 - ${relativePath}\n\n`;
            
            message += `内部链接: ${links.length} 个\n`;
            if (links.length > 0) {
                message += links.map(link => `  • ${link.filePath}: [${link.linkText}](${link.linkPath})`).join('\n') + '\n';
            }
            
            message += `\nImport语句: ${imports.length} 个\n`;
            if (imports.length > 0) {
                message += imports.map(imp => `  • ${imp.filePath}: ${imp.importStatement}`).join('\n') + '\n';
            }
            
            message += `\n导航引用: ${navigation.length} 个\n`;
            if (navigation.length > 0) {
                message += navigation.map(nav => `  • ${nav.location}: ${nav.path}`).join('\n');
            }

            vscode.window.showInformationMessage(message);

        } catch (error) {
            console.error('分析文件引用时出错:', error);
            vscode.window.showErrorMessage(`分析失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    }

    /**
     * 重新加载Language Service
     */
    async reload(): Promise<void> {
        console.log('MintlifyLanguageService: 正在重新加载...');
        
        this.stop();
        
        // 重新初始化组件
        this.pathResolver = new FilePathResolver();
        this.fileWatcher = new FileWatcher(this.pathResolver);
        this.linkUpdater = new LinkUpdater(this.pathResolver);
        this.importUpdater = new ImportUpdater(this.pathResolver);
        this.navigationUpdater = new NavigationUpdater(this.pathResolver);
        
        this.start();
        
        vscode.window.showInformationMessage('Mintlify Language Service 已重新加载');
    }

    /**
     * 更新配置
     */
    private updateConfiguration(): void {
        const config = vscode.workspace.getConfiguration('flashMintlify');
        const wasEnabled = this.isEnabled;
        this.isEnabled = config.get('enableLanguageService', true);

        if (wasEnabled !== this.isEnabled) {
            if (this.isEnabled) {
                this.start();
            } else {
                this.stop();
            }
        }
    }

    /**
     * 手动处理文件夹重命名
     */
    async handleManualFolderRename(oldFolderPath: string, newFolderPath: string): Promise<void> {
        if (!this.isEnabled) return;

        try {
            await this.fileWatcher.handleFolderRename(oldFolderPath, newFolderPath);
        } catch (error) {
            console.error('手动处理文件夹重命名时出错:', error);
            vscode.window.showErrorMessage(`处理文件夹重命名时出错: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    }

    private lastActiveFile: string | undefined;
    private previewUpdateTimeout: NodeJS.Timeout | undefined;

    /**
     * 处理活动编辑器变更，实现自动预览更新（带防抖逻辑）
     */
    private async handleActiveEditorChange(editor: vscode.TextEditor | undefined): Promise<void> {
        if (!this.isEnabled || !editor) return;

        const doc = editor.document;
        const currentFile = doc.uri.fsPath;
        const isMarkdownFile = doc.languageId === 'markdown' || doc.languageId === 'mdx';

        // 防抖逻辑：只有当文件真正切换时才触发预览更新
        if (isMarkdownFile && currentFile !== this.lastActiveFile) {
            this.lastActiveFile = currentFile;

            // 清除之前的定时器
            if (this.previewUpdateTimeout) {
                clearTimeout(this.previewUpdateTimeout);
            }

            // 设置防抖延迟，避免快速切换时频繁更新
            this.previewUpdateTimeout = setTimeout(() => {
                const cfg = vscode.workspace.getConfiguration('flashMintlify');
                const mode = cfg.get<'beside' | 'fullscreen' | 'browser'>('preview.mode', 'browser');

                // 只有在 beside 模式下且已有预览面板时才自动更新预览
                if (mode === 'beside' && PreviewPanel.currentPanel) {
                    // 直接更新预览内容，而不是重新执行整个预览命令
                    try {
                        const filePath = doc.uri.fsPath;
                        const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

                        if (root) {
                            const path = require('path');
                            const rel = path.relative(root, filePath).replace(/\\/g, '/').replace(/\.(md|mdx)$/i, '');

                            // Special case: index.mdx in root directory should render as localhost:port, not localhost:port/index
                            const internalPath = rel === 'index' ? '/' : '/' + rel;
                            const configuredPort = cfg.get<number>('preview.port', 3000);
                            const targetUrl = `http://localhost:${configuredPort}${internalPath}`;

                            PreviewPanel.currentPanel.update(targetUrl);
                        } else {
                            vscode.commands.executeCommand('flashMintlify.preview.open');
                        }
                    } catch (error) {
                        console.error('MintlifyLanguageService: 自动更新预览失败:', error);
                        // 如果直接更新失败，回退到命令方式
                        vscode.commands.executeCommand('flashMintlify.preview.open');
                    }
                }
            }, 100); // 100ms 防抖延迟
        }
    }
}
