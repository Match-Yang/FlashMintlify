import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';

/**
 * 文件路径解析工具
 */
export class FilePathResolver {
    private workspaceRoot: string;

    constructor() {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            throw new Error('No workspace folder found');
        }
        this.workspaceRoot = workspaceFolder.uri.fsPath;
    }

    /**
     * 获取工作区根目录
     */
    getWorkspaceRoot(): string {
        return this.workspaceRoot;
    }

    /**
     * 将绝对路径转换为相对于工作区的路径
     */
    toRelativePath(absolutePath: string): string {
        return path.relative(this.workspaceRoot, absolutePath).replace(/\\/g, '/');
    }

    /**
     * 将相对路径转换为绝对路径
     */
    toAbsolutePath(relativePath: string): string {
        // 移除开头的/，因为我们需要相对于工作区根目录的路径
        const cleanPath = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;
        return path.join(this.workspaceRoot, cleanPath);
    }

    /**
     * 将Mintlify内部链接路径转换为实际文件路径
     * 例如：/quickstart -> quickstart.md 或 quickstart.mdx
     */
    resolveInternalLinkPath(linkPath: string): string | null {
        if (!linkPath.startsWith('/')) {
            return null;
        }

        const cleanPath = linkPath.substring(1); // 移除开头的/
        const basePath = path.join(this.workspaceRoot, cleanPath);

        // 尝试不同的文件扩展名
        const extensions = ['.md', '.mdx'];
        for (const ext of extensions) {
            const fullPath = basePath + ext;
            if (fs.existsSync(fullPath)) {
                return fullPath;
            }
        }

        // 如果没有扩展名，直接检查是否存在
        if (fs.existsSync(basePath)) {
            return basePath;
        }

        return null;
    }

    /**
     * 将import路径转换为实际文件路径
     * 例如：/snippets/my-snippet.mdx -> snippets/my-snippet.mdx
     */
    resolveImportPath(importPath: string): string | null {
        if (!importPath.startsWith('/')) {
            return null;
        }

        const cleanPath = importPath.substring(1);
        const fullPath = path.join(this.workspaceRoot, cleanPath);

        if (fs.existsSync(fullPath)) {
            return fullPath;
        }

        return null;
    }

    /**
     * 将文件路径转换为Mintlify内部链接格式
     * 例如：quickstart.md -> /quickstart
     */
    toInternalLinkPath(filePath: string): string {
        const relativePath = this.toRelativePath(filePath);
        // 移除文件扩展名
        const pathWithoutExt = relativePath.replace(/\.(md|mdx)$/, '');
        return '/' + pathWithoutExt;
    }

    /**
     * 将文件路径转换为import路径格式
     * 例如：snippets/my-snippet.mdx -> /snippets/my-snippet.mdx
     */
    toImportPath(filePath: string): string {
        const relativePath = this.toRelativePath(filePath);
        return '/' + relativePath;
    }

    /**
     * 检查文件是否为Mintlify相关文件
     */
    isMintlifyFile(filePath: string): boolean {
        const ext = path.extname(filePath).toLowerCase();
        return ['.md', '.mdx', '.jsx'].includes(ext);
    }

    /**
     * 检查文件是否为markdown文件
     */
    isMarkdownFile(filePath: string): boolean {
        const ext = path.extname(filePath).toLowerCase();
        return ['.md', '.mdx'].includes(ext);
    }

    /**
     * 获取mint.json文件路径
     */
    getMintJsonPath(): string {
        return path.join(this.workspaceRoot, 'mint.json');
    }

    /**
     * 检查mint.json是否存在
     */
    hasMintJson(): boolean {
        return fs.existsSync(this.getMintJsonPath());
    }

    /**
     * 规范化路径分隔符为正斜杠
     */
    normalizePath(filePath: string): string {
        return filePath.replace(/\\/g, '/');
    }

    /**
     * 获取所有Mintlify相关文件
     */
    async getAllMintlifyFiles(): Promise<string[]> {
        const files: string[] = [];
        const pattern = '**/*.{md,mdx,jsx}';
        
        const uris = await vscode.workspace.findFiles(pattern, '**/node_modules/**');
        
        for (const uri of uris) {
            files.push(uri.fsPath);
        }
        
        return files;
    }

    /**
     * 获取所有markdown文件
     */
    async getAllMarkdownFiles(): Promise<string[]> {
        const files: string[] = [];
        const pattern = '**/*.{md,mdx}';
        
        const uris = await vscode.workspace.findFiles(pattern, '**/node_modules/**');
        
        for (const uri of uris) {
            files.push(uri.fsPath);
        }
        
        return files;
    }
}
