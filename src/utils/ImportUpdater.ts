/**
 * FlashMintlify - Import statement updater utilities
 *
 * @author Match-Yang(OliverYeung)
 * @email oliver.yeung.me@gmail.com
 * @license MIT
 */
import * as fs from 'fs';
import * as vscode from 'vscode';
import { FilePathResolver } from './FilePathResolver';
import { UpdateResult, createEmptyResult } from './ProgressReporter';

/**
 * Import语句更新器
 * 处理Mintlify文档中的import语句更新
 */
export class ImportUpdater {
    private pathResolver: FilePathResolver;

    constructor(pathResolver: FilePathResolver) {
        this.pathResolver = pathResolver;
    }

    /**
     * 更新所有文件中指向指定文件的import语句
     */
    async updateImportsForFile(
        oldFilePath: string, 
        newFilePath: string,
        progressCallback?: (message: string) => void
    ): Promise<UpdateResult> {
        const result = createEmptyResult();

        try {
            // 获取所有Mintlify相关文件（md, mdx, jsx）
            progressCallback?.('Scanning Mintlify files...');
            const mintlifyFiles = await this.pathResolver.getAllMintlifyFiles();

            // 计算旧路径和新路径的import格式
            const oldImportPath = this.pathResolver.toImportPath(oldFilePath);
            const newImportPath = this.pathResolver.toImportPath(newFilePath);

            progressCallback?.(`Updating import statements pointing to ${oldImportPath}...`);

            // 处理每个文件
            for (let i = 0; i < mintlifyFiles.length; i++) {
                const filePath = mintlifyFiles[i];
                progressCallback?.(`正在处理文件 ${this.pathResolver.toRelativePath(filePath)} (${i + 1}/${mintlifyFiles.length})`);

                const fileResult = await this.updateImportsInFile(filePath, oldImportPath, newImportPath);
                if (fileResult.importsUpdated > 0) {
                    result.importsUpdated += fileResult.importsUpdated;
                    result.updatedFiles.push(this.pathResolver.toRelativePath(filePath));
                }
                result.errors.push(...fileResult.errors);
            }

        } catch (error) {
            const errorMsg = `更新import语句时出错: ${error instanceof Error ? error.message : '未知错误'}`;
            result.errors.push(errorMsg);
            console.error(errorMsg, error);
        }

        return result;
    }

    /**
     * 更新单个文件中的import语句
     */
    private async updateImportsInFile(
        filePath: string, 
        oldImportPath: string, 
        newImportPath: string
    ): Promise<UpdateResult> {
        const result = createEmptyResult();

        try {
            // 读取文件内容
            const content = fs.readFileSync(filePath, 'utf8');
            let updatedContent = content;
            let importsUpdated = 0;

            // 匹配import语句的正则表达式
            // 支持多种import格式：
            // import MySnippet from '/path/to/file.mdx'
            // import { myName, myObject } from '/path/to/file.mdx'
            // import { MyJSXSnippet } from '/path/to/file.jsx'
            // import * as Something from '/path/to/file.mdx'
            const importRegex = /import\s+(?:(?:\{[^}]+\}|\w+|\*\s+as\s+\w+)\s+from\s+)?['"]([^'"]+)['"]/g;
            
            updatedContent = content.replace(importRegex, (match, importPath) => {
                // 检查是否为内部import（以/开头）
                if (importPath.startsWith('/')) {
                    if (importPath === oldImportPath) {
                        importsUpdated++;
                        return match.replace(oldImportPath, newImportPath);
                    }
                }
                return match;
            });

            // 如果有更新，写入文件
            if (importsUpdated > 0) {
                fs.writeFileSync(filePath, updatedContent, 'utf8');
                result.importsUpdated = importsUpdated;
                console.log(`更新了 ${filePath} 中的 ${importsUpdated} 个import语句`);
            }

        } catch (error) {
            const errorMsg = `更新文件 ${filePath} 中的import语句时出错: ${error instanceof Error ? error.message : '未知错误'}`;
            result.errors.push(errorMsg);
            console.error(errorMsg, error);
        }

        return result;
    }

    /**
     * 批量更新多个文件的import语句
     */
    async updateImportsForMultipleFiles(
        fileChanges: Array<{ oldPath: string; newPath: string }>,
        progressCallback?: (message: string) => void
    ): Promise<UpdateResult> {
        const result = createEmptyResult();

        for (let i = 0; i < fileChanges.length; i++) {
            const { oldPath, newPath } = fileChanges[i];
            progressCallback?.(`正在更新文件 ${i + 1}/${fileChanges.length} 的import语句...`);
            
            const fileResult = await this.updateImportsForFile(oldPath, newPath, progressCallback);
            result.importsUpdated += fileResult.importsUpdated;
            result.updatedFiles.push(...fileResult.updatedFiles);
            result.errors.push(...fileResult.errors);
        }

        return result;
    }

    /**
     * 查找所有导入指定文件的import语句
     */
    async findImportsToFile(targetFilePath: string): Promise<Array<{ filePath: string; importStatement: string }>> {
        const imports: Array<{ filePath: string; importStatement: string }> = [];
        
        try {
            const mintlifyFiles = await this.pathResolver.getAllMintlifyFiles();
            const targetImportPath = this.pathResolver.toImportPath(targetFilePath);

            for (const filePath of mintlifyFiles) {
                try {
                    const content = fs.readFileSync(filePath, 'utf8');
                    const lines = content.split('\n');
                    
                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i];
                        const importRegex = /import\s+(?:(?:\{[^}]+\}|\w+|\*\s+as\s+\w+)\s+from\s+)?['"]([^'"]+)['"]/g;
                        
                        let match;
                        while ((match = importRegex.exec(line)) !== null) {
                            const [importStatement, importPath] = match;
                            
                            if (importPath === targetImportPath) {
                                imports.push({
                                    filePath: this.pathResolver.toRelativePath(filePath),
                                    importStatement: line.trim()
                                });
                            }
                        }
                    }
                } catch (error) {
                    console.error(`读取文件 ${filePath} 时出错:`, error);
                }
            }
        } catch (error) {
            console.error('查找import语句时出错:', error);
        }

        return imports;
    }

    /**
     * 验证import路径是否有效
     */
    validateImportPath(importPath: string): boolean {
        if (!importPath.startsWith('/')) {
            return false;
        }

        const resolvedPath = this.pathResolver.resolveImportPath(importPath);
        return resolvedPath !== null;
    }

    /**
     * 获取文件中所有的import语句
     */
    getImportsFromFile(filePath: string): Array<{ importStatement: string; importPath: string; lineNumber: number }> {
        const imports: Array<{ importStatement: string; importPath: string; lineNumber: number }> = [];
        
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n');
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const importRegex = /import\s+(?:(?:\{[^}]+\}|\w+|\*\s+as\s+\w+)\s+from\s+)?['"]([^'"]+)['"]/g;
                
                let match;
                while ((match = importRegex.exec(line)) !== null) {
                    const [importStatement, importPath] = match;
                    
                    if (importPath.startsWith('/')) {
                        imports.push({
                            importStatement: line.trim(),
                            importPath,
                            lineNumber: i + 1
                        });
                    }
                }
            }
        } catch (error) {
            console.error(`读取文件 ${filePath} 时出错:`, error);
        }

        return imports;
    }
}
