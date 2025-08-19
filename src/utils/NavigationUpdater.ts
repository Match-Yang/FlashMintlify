import * as fs from 'fs';
import * as vscode from 'vscode';
import { FilePathResolver } from './FilePathResolver';
import { UpdateResult, createEmptyResult } from './ProgressReporter';

/**
 * mint.json导航更新器
 * 处理Mintlify配置文件中的页面路径更新
 */
export class NavigationUpdater {
    private pathResolver: FilePathResolver;

    constructor(pathResolver: FilePathResolver) {
        this.pathResolver = pathResolver;
    }

    /**
     * 更新mint.json中指向指定文件的页面路径
     */
    async updateNavigationForFile(
        oldFilePath: string, 
        newFilePath: string,
        progressCallback?: (message: string) => void
    ): Promise<UpdateResult> {
        const result = createEmptyResult();

        try {
            const mintJsonPath = this.pathResolver.getMintJsonPath();
            
            if (!this.pathResolver.hasMintJson()) {
                progressCallback?.('未找到mint.json文件，跳过导航更新');
                return result;
            }

            progressCallback?.('正在更新mint.json中的导航路径...');

            // 计算旧路径和新路径的页面格式（不包含扩展名）
            const oldPagePath = this.pathResolver.toInternalLinkPath(oldFilePath).substring(1); // 移除开头的/
            const newPagePath = this.pathResolver.toInternalLinkPath(newFilePath).substring(1);

            // 读取mint.json
            const content = fs.readFileSync(mintJsonPath, 'utf8');
            const mintConfig = JSON.parse(content);

            // 更新导航配置
            let navigationUpdated = 0;
            this.updateNavigationRecursive(mintConfig, oldPagePath, newPagePath, (count) => {
                navigationUpdated += count;
            });

            // 如果有更新，写入文件
            if (navigationUpdated > 0) {
                const updatedContent = JSON.stringify(mintConfig, null, 2);
                fs.writeFileSync(mintJsonPath, updatedContent, 'utf8');
                result.navigationUpdated = navigationUpdated;
                result.updatedFiles.push('mint.json');
                console.log(`NavigationUpdater: Updated ${navigationUpdated} navigation paths in mint.json`);
            }

        } catch (error) {
            const errorMsg = `更新mint.json导航时出错: ${error instanceof Error ? error.message : '未知错误'}`;
            result.errors.push(errorMsg);
            console.error(errorMsg, error);
        }

        return result;
    }

    /**
     * 递归更新导航配置中的页面路径
     */
    private updateNavigationRecursive(
        obj: any, 
        oldPagePath: string, 
        newPagePath: string, 
        updateCallback: (count: number) => void
    ): void {
        if (!obj || typeof obj !== 'object') {
            return;
        }

        // 处理数组
        if (Array.isArray(obj)) {
            for (let i = 0; i < obj.length; i++) {
                if (typeof obj[i] === 'string' && obj[i] === oldPagePath) {
                    obj[i] = newPagePath;
                    updateCallback(1);
                } else if (typeof obj[i] === 'object') {
                    this.updateNavigationRecursive(obj[i], oldPagePath, newPagePath, updateCallback);
                }
            }
            return;
        }

        // 处理对象的所有属性
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const value = obj[key];

                // 特殊处理pages数组
                if (key === 'pages' && Array.isArray(value)) {
                    this.updateNavigationRecursive(value, oldPagePath, newPagePath, updateCallback);
                }
                // 递归处理嵌套对象
                else if (typeof value === 'object') {
                    this.updateNavigationRecursive(value, oldPagePath, newPagePath, updateCallback);
                }
                // 处理字符串值
                else if (typeof value === 'string' && value === oldPagePath) {
                    obj[key] = newPagePath;
                    updateCallback(1);
                }
            }
        }
    }

    /**
     * 批量更新多个文件的导航路径
     */
    async updateNavigationForMultipleFiles(
        fileChanges: Array<{ oldPath: string; newPath: string }>,
        progressCallback?: (message: string) => void
    ): Promise<UpdateResult> {
        const result = createEmptyResult();

        if (!this.pathResolver.hasMintJson()) {
            progressCallback?.('未找到mint.json文件，跳过导航更新');
            return result;
        }

        try {
            const mintJsonPath = this.pathResolver.getMintJsonPath();
            progressCallback?.('正在批量更新mint.json中的导航路径...');

            // 读取mint.json
            const content = fs.readFileSync(mintJsonPath, 'utf8');
            const mintConfig = JSON.parse(content);

            let totalNavigationUpdated = 0;

            // 批量处理所有文件变更
            for (let i = 0; i < fileChanges.length; i++) {
                const { oldPath, newPath } = fileChanges[i];
                progressCallback?.(`正在更新导航路径 ${i + 1}/${fileChanges.length}...`);

                const oldPagePath = this.pathResolver.toInternalLinkPath(oldPath).substring(1);
                const newPagePath = this.pathResolver.toInternalLinkPath(newPath).substring(1);

                this.updateNavigationRecursive(mintConfig, oldPagePath, newPagePath, (count) => {
                    totalNavigationUpdated += count;
                });
            }

            // 如果有更新，写入文件
            if (totalNavigationUpdated > 0) {
                const updatedContent = JSON.stringify(mintConfig, null, 2);
                fs.writeFileSync(mintJsonPath, updatedContent, 'utf8');
                result.navigationUpdated = totalNavigationUpdated;
                result.updatedFiles.push('mint.json');
                console.log(`NavigationUpdater: Batch updated ${totalNavigationUpdated} navigation paths in mint.json`);
            }

        } catch (error) {
            const errorMsg = `批量更新mint.json导航时出错: ${error instanceof Error ? error.message : '未知错误'}`;
            result.errors.push(errorMsg);
            console.error(errorMsg, error);
        }

        return result;
    }

    /**
     * 查找mint.json中指向指定文件的所有页面路径
     */
    findNavigationReferencesToFile(targetFilePath: string): Array<{ path: string; location: string }> {
        const references: Array<{ path: string; location: string }> = [];
        
        try {
            if (!this.pathResolver.hasMintJson()) {
                return references;
            }

            const mintJsonPath = this.pathResolver.getMintJsonPath();
            const content = fs.readFileSync(mintJsonPath, 'utf8');
            const mintConfig = JSON.parse(content);

            const targetPagePath = this.pathResolver.toInternalLinkPath(targetFilePath).substring(1);
            
            this.findNavigationReferencesRecursive(mintConfig, targetPagePath, references, 'root');

        } catch (error) {
            console.error('查找导航引用时出错:', error);
        }

        return references;
    }

    /**
     * 递归查找导航配置中的页面引用
     */
    private findNavigationReferencesRecursive(
        obj: any, 
        targetPagePath: string, 
        references: Array<{ path: string; location: string }>,
        currentLocation: string
    ): void {
        if (!obj || typeof obj !== 'object') {
            return;
        }

        // 处理数组
        if (Array.isArray(obj)) {
            for (let i = 0; i < obj.length; i++) {
                if (typeof obj[i] === 'string' && obj[i] === targetPagePath) {
                    references.push({
                        path: targetPagePath,
                        location: `${currentLocation}[${i}]`
                    });
                } else if (typeof obj[i] === 'object') {
                    this.findNavigationReferencesRecursive(obj[i], targetPagePath, references, `${currentLocation}[${i}]`);
                }
            }
            return;
        }

        // 处理对象的所有属性
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const value = obj[key];
                const newLocation = currentLocation === 'root' ? key : `${currentLocation}.${key}`;

                if (typeof value === 'string' && value === targetPagePath) {
                    references.push({
                        path: targetPagePath,
                        location: newLocation
                    });
                } else if (typeof value === 'object') {
                    this.findNavigationReferencesRecursive(value, targetPagePath, references, newLocation);
                }
            }
        }
    }

    /**
     * 验证mint.json的格式是否正确
     */
    validateMintJson(): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];
        
        try {
            if (!this.pathResolver.hasMintJson()) {
                errors.push('mint.json文件不存在');
                return { isValid: false, errors };
            }

            const mintJsonPath = this.pathResolver.getMintJsonPath();
            const content = fs.readFileSync(mintJsonPath, 'utf8');
            
            try {
                JSON.parse(content);
            } catch (parseError) {
                errors.push(`mint.json格式错误: ${parseError instanceof Error ? parseError.message : '未知错误'}`);
                return { isValid: false, errors };
            }

        } catch (error) {
            errors.push(`读取mint.json时出错: ${error instanceof Error ? error.message : '未知错误'}`);
            return { isValid: false, errors };
        }

        return { isValid: true, errors };
    }
}
