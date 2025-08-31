/**
 * FlashMintlify - Link updater utilities for markdown files
 *
 * @author Match-Yang(OliverYeung)
 * @email oliver.yeung.me@gmail.com
 * @license MIT
 */
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { FilePathResolver } from './FilePathResolver';
import { UpdateResult, createEmptyResult } from './ProgressReporter';

/**
 * Internal Links更新器
 * 处理Mintlify文档中的内部链接更新
 */
export class LinkUpdater {
    private pathResolver: FilePathResolver;

    constructor(pathResolver: FilePathResolver) {
        this.pathResolver = pathResolver;
    }

    /**
     * 更新所有文件中指向指定文件的内部链接
     */
    async updateLinksForFile(
        oldFilePath: string, 
        newFilePath: string,
        progressCallback?: (message: string) => void
    ): Promise<UpdateResult> {
        const result = createEmptyResult();

        try {
            // Get all markdown files
            progressCallback?.('Scanning markdown files...');
            const markdownFiles = await this.pathResolver.getAllMarkdownFiles();

            // Calculate old and new internal link paths
            const oldLinkPath = this.pathResolver.toInternalLinkPath(oldFilePath);
            const newLinkPath = this.pathResolver.toInternalLinkPath(newFilePath);

            console.log(`LinkUpdater: Converting file paths to internal links:`);
            console.log(`LinkUpdater: Old file: ${oldFilePath} -> ${oldLinkPath}`);
            console.log(`LinkUpdater: New file: ${newFilePath} -> ${newLinkPath}`);

            progressCallback?.(`Updating links pointing to ${oldLinkPath}...`);

            // Process each file
            for (let i = 0; i < markdownFiles.length; i++) {
                const filePath = markdownFiles[i];
                progressCallback?.(`Processing file ${this.pathResolver.toRelativePath(filePath)} (${i + 1}/${markdownFiles.length})`);

                const fileResult = await this.updateLinksInFile(filePath, oldLinkPath, newLinkPath);
                if (fileResult.linksUpdated > 0) {
                    result.linksUpdated += fileResult.linksUpdated;
                    result.updatedFiles.push(this.pathResolver.toRelativePath(filePath));
                }
                result.errors.push(...fileResult.errors);
            }

        } catch (error) {
            const errorMsg = `Error updating internal links: ${error instanceof Error ? error.message : 'Unknown error'}`;
            result.errors.push(errorMsg);
            console.error(errorMsg, error);
        }

        return result;
    }

    /**
     * 更新单个文件中的内部链接
     */
    private async updateLinksInFile(
        filePath: string, 
        oldLinkPath: string, 
        newLinkPath: string
    ): Promise<UpdateResult> {
        const result = createEmptyResult();

        try {
            // Read file content
            const content = fs.readFileSync(filePath, 'utf8');
            let updatedContent = content;
            let linksUpdated = 0;

            console.log(`LinkUpdater: Checking file ${filePath} for links to ${oldLinkPath}`);

            // Regular expression to match markdown links
            // Format: [link text](link path)
            const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;

            updatedContent = content.replace(linkRegex, (match, linkText, linkPath) => {
                // Check if it's an internal link (starts with /, doesn't contain http)
                if (linkPath.startsWith('/') && !linkPath.includes('http')) {
                    // Remove possible anchors and query parameters
                    let cleanLinkPath = linkPath.split('#')[0].split('?')[0];

                    // Normalize to forward slashes for consistent comparison
                    cleanLinkPath = cleanLinkPath.replace(/\\/g, '/');

                    // Mintlify internal links can omit the .md/.mdx extension; ensure we compare without extensions
                    const normalizedOld = oldLinkPath.replace(/\.(md|mdx)$/i, '');

                    console.log(`LinkUpdater: Found internal link: ${linkPath} (clean: ${cleanLinkPath}) vs target: ${normalizedOld}`);

                    if (cleanLinkPath === normalizedOld) {
                        linksUpdated++;
                        // Preserve original anchors and query parameters
                        // Compute suffix (anchor/query) from original link
                        const anchorIndex = linkPath.indexOf('#');
                        const queryIndex = linkPath.indexOf('?');
                        const suffixStart = [anchorIndex, queryIndex]
                            .filter(i => i >= 0)
                            .sort((a, b) => a - b)[0] ?? linkPath.length;
                        const suffix = linkPath.substring(suffixStart);

                        const newLink = `[${linkText}](${newLinkPath}${suffix})`;
                        console.log(`LinkUpdater: Updating link: ${match} -> ${newLink}`);
                        return newLink;
                    }
                }
                return match;
            });

            // Additionally handle MDX/JSX-style internal links: <a href="/..."> or <Link href="/..."> or to="/..."
            const attrRegex = /(\b(href|to)\s*=\s*["'])([^"']+)(["'])/gi;
            const normalize = (p: string) => p
                .replace(/#.*$/, '')
                .replace(/\?.*$/, '')
                .replace(/\\/g, '/')
                .replace(/\.(md|mdx)$/i, '')
                .replace(/\/$/, '');

            const normalizedOldNoExt = normalize(oldLinkPath);

            updatedContent = updatedContent.replace(attrRegex, (match, prefix: string, _attr: string, url: string, suffixQuote: string) => {
                if (!url || !url.startsWith('/') || url.includes('http')) return match;
                const normalizedUrl = normalize(url);
                console.log(`LinkUpdater: Found attribute link: ${url} (normalized: ${normalizedUrl}) vs target: ${normalizedOldNoExt}`);
                if (normalizedUrl === normalizedOldNoExt) {
                    // Preserve anchor/query from original url
                    const anchorIndex = url.indexOf('#');
                    const queryIndex = url.indexOf('?');
                    const suffixStart = [anchorIndex, queryIndex].filter(i => i >= 0).sort((a,b)=>a-b)[0] ?? url.length;
                    const suffix = url.substring(suffixStart);
                    const replaced = `${prefix}${newLinkPath}${suffix}${suffixQuote}`;
                    console.log(`LinkUpdater: Updating attribute link: ${match} -> ${replaced}`);
                    linksUpdated++;
                    return replaced;
                }
                return match;
            });

            // If there are updates, write to file
            if (linksUpdated > 0) {
                fs.writeFileSync(filePath, updatedContent, 'utf8');
                result.linksUpdated = linksUpdated;
                console.log(`LinkUpdater: Updated ${linksUpdated} internal links in ${filePath}`);
            } else {
                console.log(`LinkUpdater: No links to update in ${filePath}`);
            }

        } catch (error) {
            const errorMsg = `Error updating links in file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`;
            result.errors.push(errorMsg);
            console.error(errorMsg, error);
        }

        return result;
    }

    /**
     * 批量更新多个文件的链接
     */
    async updateLinksForMultipleFiles(
        fileChanges: Array<{ oldPath: string; newPath: string }>,
        progressCallback?: (message: string) => void
    ): Promise<UpdateResult> {
        const result = createEmptyResult();

        for (let i = 0; i < fileChanges.length; i++) {
            const { oldPath, newPath } = fileChanges[i];
            progressCallback?.(`正在更新文件 ${i + 1}/${fileChanges.length} 的链接...`);
            
            const fileResult = await this.updateLinksForFile(oldPath, newPath, progressCallback);
            result.linksUpdated += fileResult.linksUpdated;
            result.updatedFiles.push(...fileResult.updatedFiles);
            result.errors.push(...fileResult.errors);
        }

        return result;
    }

    /**
     * 查找所有指向指定文件的内部链接
     */
    async findLinksToFile(targetFilePath: string): Promise<Array<{ filePath: string; linkText: string; linkPath: string }>> {
        const links: Array<{ filePath: string; linkText: string; linkPath: string }> = [];
        
        try {
            const markdownFiles = await this.pathResolver.getAllMarkdownFiles();
            const targetLinkPath = this.pathResolver.toInternalLinkPath(targetFilePath);

            for (const filePath of markdownFiles) {
                try {
                    const content = fs.readFileSync(filePath, 'utf8');
                    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
                    
                    let match;
                    while ((match = linkRegex.exec(content)) !== null) {
                        const [, linkText, linkPath] = match;
                        
                        if (linkPath.startsWith('/') && !linkPath.includes('http')) {
                            const cleanLinkPath = linkPath.split('#')[0].split('?')[0];
                            
                            if (cleanLinkPath === targetLinkPath) {
                                links.push({
                                    filePath: this.pathResolver.toRelativePath(filePath),
                                    linkText,
                                    linkPath
                                });
                            }
                        }
                    }
                } catch (error) {
                    console.error(`读取文件 ${filePath} 时出错:`, error);
                }
            }
        } catch (error) {
            console.error('查找链接时出错:', error);
        }

        return links;
    }
}
