/**
 * FlashMintlify - Import calculation and analysis utilities
 *
 * @author Match-Yang(OliverYeung)
 * @email oliver.yeung.me@gmail.com
 * @license MIT
 */
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface ImportInfo {
    filePath: string;
    importCount: number;
}

export class ImportCalculator {
    private importCache: Map<string, string[]> = new Map(); // 文件路径 -> 该文件中的所有import路径
    private importCountCache: Map<string, number> = new Map(); // 文件路径 -> 被import次数
    private referencesCache: Map<string, string[]> = new Map(); // 文件路径 -> 引用它的文件列表
    private workspaceRoot: string;

    constructor() {
        this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    }

    /**
     * 计算所有md/mdx文件的import次数
     */
    async calculateImportCounts(progressCallback?: (progress: number, message: string) => void): Promise<Map<string, number>> {
        try {
            // 清空缓存
            this.importCache.clear();
            this.importCountCache.clear();

            progressCallback?.(10, '正在扫描MDX文件...');
            
            // 1. 获取所有mdx文件
            const mdxFiles = await this.getAllMdxFiles();
            
            progressCallback?.(30, `找到 ${mdxFiles.length} 个MDX文件，正在解析import语句...`);
            
            // 2. 解析所有mdx文件中的import语句
            await this.parseAllImports(mdxFiles, progressCallback);
            
            progressCallback?.(70, '正在计算import次数...');
            
            // 3. 获取所有md和mdx文件
            const allMarkdownFiles = await this.getAllMarkdownFiles();
            
            // 4. 计算每个文件被import的次数
            this.calculateCounts(allMarkdownFiles);
            
            progressCallback?.(100, '计算完成！');
            
            return new Map(this.importCountCache);
        } catch (error) {
            console.error('计算import次数时出错:', error);
            throw error;
        }
    }

    /**
     * 获取所有md/mdx文件
     */
    private async getAllMdxFiles(): Promise<string[]> {
        const files: string[] = [];

        // 扫描 .md 和 .mdx 文件
        const patterns = ['**/*.md', '**/*.mdx'];

        for (const pattern of patterns) {
            const uris = await vscode.workspace.findFiles(pattern, '**/node_modules/**');
        
            for (const uri of uris) {
                files.push(uri.fsPath);
            }
        }

        console.log(`Found ${files.length} MD/MDX files`);
        return files;
    }

    /**
     * 获取所有md和mdx文件
     */
    private async getAllMarkdownFiles(): Promise<string[]> {
        const files: string[] = [];
        const patterns = ['**/*.md', '**/*.mdx'];
        
        for (const pattern of patterns) {
            const uris = await vscode.workspace.findFiles(pattern, '**/node_modules/**');
            for (const uri of uris) {
                files.push(uri.fsPath);
            }
        }
        
        return files;
    }

    /**
     * 解析所有mdx文件中的import语句
     */
    private async parseAllImports(mdxFiles: string[], progressCallback?: (progress: number, message: string) => void): Promise<void> {
        const totalFiles = mdxFiles.length;
        
        for (let i = 0; i < totalFiles; i++) {
            const filePath = mdxFiles[i];
            const imports = await this.parseImportsFromFile(filePath);
            this.importCache.set(filePath, imports);
            
            // 更新进度
            const progress = 30 + Math.floor((i + 1) / totalFiles * 40);
            progressCallback?.(progress, `解析文件 ${i + 1}/${totalFiles}: ${path.basename(filePath)}`);
        }
    }

    /**
     * 从单个文件中解析import语句
     */
    private async parseImportsFromFile(filePath: string): Promise<string[]> {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const imports: string[] = [];
            
            // 匹配import语句，支持单引号和双引号
            const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
            let match;
            
            while ((match = importRegex.exec(content)) !== null) {
                const importPath = match[1];
                
                // 只处理以/开头的路径（相对于根目录的路径）
                if (importPath.startsWith('/')) {
                    imports.push(importPath);
                }
            }
            
            return imports;
        } catch (error) {
            console.error(`解析文件 ${filePath} 时出错:`, error);
            return [];
        }
    }

    /**
     * 计算每个文件被import的次数
     */
    private calculateCounts(allMarkdownFiles: string[]): void {
        // 初始化所有文件的计数为0和空的引用列表
        for (const filePath of allMarkdownFiles) {
            this.importCountCache.set(filePath, 0);
            this.referencesCache.set(filePath, []);
        }

        // 遍历所有import语句，计算被引用次数并构建引用关系
        for (const [sourceFile, imports] of this.importCache) {
            for (const importPath of imports) {
                // 将import路径转换为实际文件路径
                const actualFilePath = this.resolveImportPath(importPath);

                if (actualFilePath && this.importCountCache.has(actualFilePath)) {
                    // 增加引用次数
                    const currentCount = this.importCountCache.get(actualFilePath) || 0;
                    this.importCountCache.set(actualFilePath, currentCount + 1);

                    // 添加到引用关系缓存
                    const references = this.referencesCache.get(actualFilePath) || [];
                    references.push(sourceFile);
                    this.referencesCache.set(actualFilePath, references);
                }
            }
        }
    }

    /**
     * 将import路径解析为实际文件路径
     */
    private resolveImportPath(importPath: string): string | null {
        try {
            // 移除开头的/，因为我们需要相对于工作区根目录的路径
            const relativePath = importPath.startsWith('/') ? importPath.substring(1) : importPath;
            const fullPath = path.join(this.workspaceRoot, relativePath);
            
            // 检查文件是否存在
            if (fs.existsSync(fullPath)) {
                return fullPath;
            }
            
            return null;
        } catch (error) {
            console.error(`解析import路径 ${importPath} 时出错:`, error);
            return null;
        }
    }

    /**
     * 获取指定文件的import次数
     */
    getImportCount(filePath: string): number {
        return this.importCountCache.get(filePath) || 0;
    }

    /**
     * 清空缓存
     */
    clearCache(): void {
        this.importCache.clear();
        this.importCountCache.clear();
        this.referencesCache.clear();
    }

    /**
     * 获取引用指定文件的所有文件列表
     */
    async getFilesImporting(targetFilePath: string): Promise<string[]> {
        // 确保已经计算过导入关系
        if (this.referencesCache.size === 0) {
            await this.calculateImportCounts();
        }

        console.log(`Looking for files importing: ${targetFilePath}`);

        // 直接从缓存中获取引用关系
        const referencingFiles = this.referencesCache.get(targetFilePath) || [];

        console.log(`Found ${referencingFiles.length} files importing ${targetFilePath}:`, referencingFiles);
        return referencingFiles;
    }

    /**
     * 判断两个文件路径是否指向同一个文件
     */
    private isSameFile(path1: string, path2: string): boolean {
        try {
            // 标准化路径进行比较
            const normalized1 = path.resolve(path1).toLowerCase().replace(/\\/g, '/');
            const normalized2 = path.resolve(path2).toLowerCase().replace(/\\/g, '/');

            console.log(`    Comparing normalized paths: "${normalized1}" vs "${normalized2}"`);

            const isMatch = normalized1 === normalized2;

            // 如果直接比较不匹配，尝试其他匹配方式
            if (!isMatch) {
                // 检查是否一个是另一个的相对路径
                const basename1 = path.basename(normalized1);
                const basename2 = path.basename(normalized2);

                // 如果文件名相同，检查路径是否匹配
                if (basename1 === basename2) {
                    const result = normalized1.endsWith(normalized2) || normalized2.endsWith(normalized1);
                    console.log(`    Basename match (${basename1}), path match: ${result}`);
                    return result;
                }
            }

            return isMatch;
        } catch (error) {
            console.error(`Error comparing paths: ${path1} vs ${path2}`, error);
            return false;
        }
    }
}
