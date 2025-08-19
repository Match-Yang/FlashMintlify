import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { FilePathResolver } from './FilePathResolver';

/**
 * 文件变更事件
 */
export interface FileChangeEvent {
    type: 'rename' | 'move';
    oldPath: string;
    newPath: string;
    isDirectory: boolean;
}

/**
 * 文件监听器
 * 监听文件和文件夹的重命名、移动事件
 */
export class FileWatcher {
    private pathResolver: FilePathResolver;
    private fileWatcher?: vscode.FileSystemWatcher;
    private folderWatcher?: vscode.FileSystemWatcher;
    private onFileChangeCallback?: (event: FileChangeEvent) => void;
    private onFolderChangeCallback?: (events: FileChangeEvent[]) => void;

    // 用于跟踪文件重命名的临时存储
    private deletedFiles = new Map<string, number>(); // 文件路径 -> 删除时间戳
    private createdFiles = new Map<string, number>(); // 文件路径 -> 创建时间戳
    private readonly RENAME_DETECTION_TIMEOUT = 1000; // 1秒内的删除和创建视为重命名

    constructor(pathResolver: FilePathResolver) {
        this.pathResolver = pathResolver;
    }

    /**
     * 开始监听文件变更
     */
    startWatching(
        onFileChange: (event: FileChangeEvent) => void,
        onFolderChange: (events: FileChangeEvent[]) => void
    ): void {
        this.onFileChangeCallback = onFileChange;
        this.onFolderChangeCallback = onFolderChange;

        // 监听Mintlify相关文件的变更
        this.fileWatcher = vscode.workspace.createFileSystemWatcher(
            '**/*.{md,mdx,jsx}',
            false, // 不忽略创建事件
            true,  // 忽略修改事件
            false  // 不忽略删除事件
        );

        // 监听文件夹变更
        this.folderWatcher = vscode.workspace.createFileSystemWatcher(
            '**/',
            false, // 不忽略创建事件
            true,  // 忽略修改事件
            false  // 不忽略删除事件
        );

        // 注册文件事件处理器
        this.fileWatcher.onDidCreate(this.onFileCreated.bind(this));
        this.fileWatcher.onDidDelete(this.onFileDeleted.bind(this));

        // 注册文件夹事件处理器
        this.folderWatcher.onDidCreate(this.onFolderCreated.bind(this));
        this.folderWatcher.onDidDelete(this.onFolderDeleted.bind(this));

        console.log('FileWatcher: 开始监听文件和文件夹变更');
    }

    /**
     * 停止监听
     */
    stopWatching(): void {
        if (this.fileWatcher) {
            this.fileWatcher.dispose();
            this.fileWatcher = undefined;
        }

        if (this.folderWatcher) {
            this.folderWatcher.dispose();
            this.folderWatcher = undefined;
        }

        this.deletedFiles.clear();
        this.createdFiles.clear();
        this.deletedFolders.clear();
        this.createdFolders.clear();
        
        console.log('FileWatcher: 停止监听文件和文件夹变更');
    }

    /**
     * 文件创建事件处理
     */
    private onFileCreated(uri: vscode.Uri): void {
        const filePath = uri.fsPath;
        const now = Date.now();

        // verbose logs removed

        // 检查是否为重命名操作（在短时间内有对应的删除事件）
        const renamedFromPath = this.findRecentlyDeletedFile(filePath, now);

        console.log(`FileWatcher: 查找重命名源文件结果: ${renamedFromPath}`);

        if (renamedFromPath) {
            // 这是一个重命名操作
            this.deletedFiles.delete(renamedFromPath);

            const event: FileChangeEvent = {
                type: 'rename',
                oldPath: renamedFromPath,
                newPath: filePath,
                isDirectory: false
            };

            console.log(`FileWatcher: 检测到文件重命名 - ${renamedFromPath} -> ${filePath}`);
            this.onFileChangeCallback?.(event);
        } else {
            // 记录创建事件，可能是移动操作的一部分
            console.log(`FileWatcher: 未找到重命名源，记录创建事件用于后续检查`);
            this.createdFiles.set(filePath, now);

            // 延迟检查是否为重命名操作（处理创建→删除的顺序）
            setTimeout(() => {
                if (this.createdFiles.has(filePath)) {
                    console.log(`FileWatcher: 延迟检查重命名操作 - 创建文件: ${filePath}`);

                    // 再次查找是否有匹配的删除事件
                    const currentTime = Date.now();
                    const renamedFromPathDelayed = this.findRecentlyDeletedFile(filePath, currentTime);

                    if (renamedFromPathDelayed) {
                        console.log(`FileWatcher: 延迟检测到重命名操作 - ${renamedFromPathDelayed} -> ${filePath}`);

                        // 清理缓存
                        this.createdFiles.delete(filePath);
                        this.deletedFiles.delete(renamedFromPathDelayed);

                        const event: FileChangeEvent = {
                            type: 'rename',
                            oldPath: renamedFromPathDelayed,
                            newPath: filePath,
                            isDirectory: false
                        };

                        this.onFileChangeCallback?.(event);
                    } else {
                        console.log(`FileWatcher: 超时清理创建事件缓存: ${filePath}`);
                        this.createdFiles.delete(filePath);
                        // 如果没有匹配的删除事件，这可能是新文件创建，不需要处理
                    }
                }
            }, this.RENAME_DETECTION_TIMEOUT);
        }
    }

    /**
     * 文件删除事件处理
     */
    private onFileDeleted(uri: vscode.Uri): void {
        const filePath = uri.fsPath;
        const now = Date.now();

        console.log(`FileWatcher: 文件删除 - ${filePath}`);
        console.log(`FileWatcher: 当前创建文件缓存:`, Array.from(this.createdFiles.keys()));

        // 检查是否为移动操作（在短时间内有对应的创建事件）
        const movedToPath = this.findRecentlyCreatedFile(filePath, now);

        console.log(`FileWatcher: 查找移动目标文件结果: ${movedToPath}`);

        if (movedToPath) {
            // 这是一个移动操作
            this.createdFiles.delete(movedToPath);

            const event: FileChangeEvent = {
                type: 'move',
                oldPath: filePath,
                newPath: movedToPath,
                isDirectory: false
            };

            console.log(`FileWatcher: 检测到文件移动 - ${filePath} -> ${movedToPath}`);
            this.onFileChangeCallback?.(event);
        } else {
            // 记录删除事件，可能是重命名操作的一部分
            console.log(`FileWatcher: 未找到移动目标，记录删除事件用于后续检查`);
            this.deletedFiles.set(filePath, now);
            console.log(`FileWatcher: 删除事件已记录，当前删除缓存:`, Array.from(this.deletedFiles.keys()));

            // 延迟检查是否为重命名操作（处理删除→创建的顺序）
            setTimeout(() => {
                if (this.deletedFiles.has(filePath)) {
                    console.log(`FileWatcher: 延迟检查重命名操作 - 删除文件: ${filePath}`);

                    // 再次查找是否有匹配的创建事件
                    const currentTime = Date.now();
                    const renamedToPath = this.findRecentlyCreatedFile(filePath, currentTime);

                    if (renamedToPath) {
                        console.log(`FileWatcher: 延迟检测到重命名操作 - ${filePath} -> ${renamedToPath}`);

                        // 清理缓存
                        this.deletedFiles.delete(filePath);
                        this.createdFiles.delete(renamedToPath);

                        const event: FileChangeEvent = {
                            type: 'rename',
                            oldPath: filePath,
                            newPath: renamedToPath,
                            isDirectory: false
                        };

                        this.onFileChangeCallback?.(event);
                    } else {
                        console.log(`FileWatcher: 超时清理删除事件缓存: ${filePath}`);
                        this.deletedFiles.delete(filePath);
                        // 如果没有匹配的创建事件，这是真正的删除，不需要处理
                    }
                }
            }, this.RENAME_DETECTION_TIMEOUT);
        }
    }

    // 用于跟踪文件夹重命名的临时存储
    private deletedFolders = new Map<string, number>(); // 文件夹路径 -> 删除时间戳
    private createdFolders = new Map<string, number>(); // 文件夹路径 -> 创建时间戳

    /**
     * 文件夹创建事件处理
     */
    private onFolderCreated(uri: vscode.Uri): void {
        const folderPath = uri.fsPath;
        const now = Date.now();

        console.log(`FileWatcher: 文件夹创建 - ${folderPath}`);
        console.log(`FileWatcher: 当前删除文件夹缓存:`, Array.from(this.deletedFolders.keys()));

        // 检查是否为文件夹重命名操作
        const renamedFromPath = this.findRecentlyDeletedFolder(folderPath, now);

        console.log(`FileWatcher: 查找文件夹重命名源结果: ${renamedFromPath}`);

        if (renamedFromPath) {
            // 这是一个文件夹重命名操作
            this.deletedFolders.delete(renamedFromPath);

            console.log(`FileWatcher: 检测到文件夹重命名 - ${renamedFromPath} -> ${folderPath}`);
            this.handleFolderRename(renamedFromPath, folderPath);
        } else {
            // 记录创建事件，可能是移动操作的一部分
            console.log(`FileWatcher: 未找到文件夹重命名源，记录创建事件用于后续检查`);
            this.createdFolders.set(folderPath, now);

            // 延迟检查是否为重命名操作
            setTimeout(() => {
                if (this.createdFolders.has(folderPath)) {
                    console.log(`FileWatcher: 延迟检查文件夹重命名操作 - 创建文件夹: ${folderPath}`);

                    const currentTime = Date.now();
                    const renamedFromPathDelayed = this.findRecentlyDeletedFolder(folderPath, currentTime);

                    if (renamedFromPathDelayed) {
                        console.log(`FileWatcher: 延迟检测到文件夹重命名操作 - ${renamedFromPathDelayed} -> ${folderPath}`);

                        this.createdFolders.delete(folderPath);
                        this.deletedFolders.delete(renamedFromPathDelayed);

                        this.handleFolderRename(renamedFromPathDelayed, folderPath);
                    } else {
                        console.log(`FileWatcher: 超时清理文件夹创建事件缓存: ${folderPath}`);
                        this.createdFolders.delete(folderPath);
                    }
                }
            }, this.RENAME_DETECTION_TIMEOUT);
        }
    }

    /**
     * 文件夹删除事件处理
     */
    private onFolderDeleted(uri: vscode.Uri): void {
        const folderPath = uri.fsPath;
        const now = Date.now();

        console.log(`FileWatcher: 文件夹删除 - ${folderPath}`);
        console.log(`FileWatcher: 当前创建文件夹缓存:`, Array.from(this.createdFolders.keys()));

        // 检查是否为文件夹移动操作
        const movedToPath = this.findRecentlyCreatedFolder(folderPath, now);

        console.log(`FileWatcher: 查找文件夹移动目标结果: ${movedToPath}`);

        if (movedToPath) {
            // 这是一个文件夹移动操作
            this.createdFolders.delete(movedToPath);

            console.log(`FileWatcher: 检测到文件夹移动 - ${folderPath} -> ${movedToPath}`);
            this.handleFolderRename(folderPath, movedToPath);
        } else {
            // 记录删除事件，可能是重命名操作的一部分
            console.log(`FileWatcher: 未找到文件夹移动目标，记录删除事件用于后续检查`);
            this.deletedFolders.set(folderPath, now);
            console.log(`FileWatcher: 文件夹删除事件已记录，当前删除缓存:`, Array.from(this.deletedFolders.keys()));

            // 延迟检查是否为重命名操作
            setTimeout(() => {
                if (this.deletedFolders.has(folderPath)) {
                    console.log(`FileWatcher: 延迟检查文件夹重命名操作 - 删除文件夹: ${folderPath}`);

                    const currentTime = Date.now();
                    const renamedToPath = this.findRecentlyCreatedFolder(folderPath, currentTime);

                    if (renamedToPath) {
                        console.log(`FileWatcher: 延迟检测到文件夹重命名操作 - ${folderPath} -> ${renamedToPath}`);

                        this.deletedFolders.delete(folderPath);
                        this.createdFolders.delete(renamedToPath);

                        this.handleFolderRename(folderPath, renamedToPath);
                    } else {
                        console.log(`FileWatcher: 超时清理文件夹删除事件缓存: ${folderPath}`);
                        this.deletedFolders.delete(folderPath);
                    }
                }
            }, this.RENAME_DETECTION_TIMEOUT);
        }
    }

    /**
     * 处理文件夹变更
     */
    private async handleFolderChange(deletedFolderPath: string): Promise<void> {
        // 这里我们采用简化的方法：
        // 当检测到文件夹删除时，扫描工作区中的所有文件夹，
        // 查找可能的重命名目标（基于内容相似性或时间戳）
        
        // 由于文件夹重命名检测比较复杂，这里先记录日志
        // 实际的文件夹重命名处理可以通过手动命令触发
        console.log(`FileWatcher: 文件夹变更检测 - ${deletedFolderPath}`);
        
        // TODO: 实现更复杂的文件夹重命名检测逻辑
        // 可以考虑：
        // 1. 比较文件夹内容
        // 2. 检查时间戳
        // 3. 用户确认对话框
    }

    /**
     * 查找最近删除的文件（用于重命名检测）
     */
    private findRecentlyDeletedFile(newFilePath: string, currentTime: number): string | null {
        const newFileName = path.basename(newFilePath);
        const newFileDir = path.dirname(newFilePath);

        console.log(`FileWatcher: 查找重命名源文件 - 新文件: ${newFilePath}`);
        console.log(`FileWatcher: 新文件名: ${newFileName}, 新文件目录: ${newFileDir}`);

        for (const [deletedPath, deleteTime] of this.deletedFiles) {
            const timeDiff = currentTime - deleteTime;
            const deletedFileName = path.basename(deletedPath);
            const deletedFileDir = path.dirname(deletedPath);

            console.log(`FileWatcher: 检查删除文件: ${deletedPath}`);
            console.log(`FileWatcher: 删除文件名: ${deletedFileName}, 删除文件目录: ${deletedFileDir}`);
            console.log(`FileWatcher: 时间差: ${timeDiff}ms, 超时阈值: ${this.RENAME_DETECTION_TIMEOUT}ms`);

            if (timeDiff <= this.RENAME_DETECTION_TIMEOUT) {
                console.log(`FileWatcher: 时间差在阈值内，检查是否为重命名...`);

                // 检查是否为同一目录下的重命名
                if (deletedFileDir === newFileDir) {
                    console.log(`FileWatcher: 同一目录下的文件变更，判定为重命名: ${deletedPath} -> ${newFilePath}`);
                    return deletedPath;
                }

                // 检查是否为相同文件名的移动
                if (deletedFileName === newFileName) {
                    console.log(`FileWatcher: 相同文件名的变更，判定为移动: ${deletedPath} -> ${newFilePath}`);
                    return deletedPath;
                }

                console.log(`FileWatcher: 不匹配重命名条件`);
            } else {
                console.log(`FileWatcher: 时间差超出阈值，跳过`);
            }
        }

        console.log(`FileWatcher: 未找到匹配的删除文件`);
        return null;
    }

    /**
     * 查找最近创建的文件（用于移动检测）
     */
    private findRecentlyCreatedFile(deletedFilePath: string, currentTime: number): string | null {
        const deletedFileName = path.basename(deletedFilePath);
        const deletedFileDir = path.dirname(deletedFilePath);

        console.log(`FileWatcher: 查找重命名目标文件 - 删除文件: ${deletedFilePath}`);
        console.log(`FileWatcher: 删除文件名: ${deletedFileName}, 删除文件目录: ${deletedFileDir}`);

        for (const [createdPath, createTime] of this.createdFiles) {
            const timeDiff = currentTime - createTime;
            const createdFileName = path.basename(createdPath);
            const createdFileDir = path.dirname(createdPath);

            console.log(`FileWatcher: 检查创建文件: ${createdPath}`);
            console.log(`FileWatcher: 创建文件名: ${createdFileName}, 创建文件目录: ${createdFileDir}`);
            console.log(`FileWatcher: 时间差: ${timeDiff}ms, 超时阈值: ${this.RENAME_DETECTION_TIMEOUT}ms`);

            if (timeDiff <= this.RENAME_DETECTION_TIMEOUT) {
                console.log(`FileWatcher: 时间差在阈值内，检查是否为重命名...`);

                // 检查是否为同一目录下的重命名
                if (createdFileDir === deletedFileDir) {
                    console.log(`FileWatcher: 同一目录下的文件变更，判定为重命名: ${deletedFilePath} -> ${createdPath}`);
                    return createdPath;
                }

                // 检查是否为相同文件名的移动
                if (deletedFileName === createdFileName) {
                    console.log(`FileWatcher: 相同文件名的变更，判定为移动: ${deletedFilePath} -> ${createdPath}`);
                    return createdPath;
                }

                console.log(`FileWatcher: 不匹配重命名条件`);
            } else {
                console.log(`FileWatcher: 时间差超出阈值，跳过`);
            }
        }

        console.log(`FileWatcher: 未找到匹配的创建文件`);
        return null;
    }

    /**
     * 查找最近删除的文件夹（用于重命名检测）
     */
    private findRecentlyDeletedFolder(newFolderPath: string, currentTime: number): string | null {
        const newFolderName = path.basename(newFolderPath);
        const newFolderDir = path.dirname(newFolderPath);

        console.log(`FileWatcher: 查找文件夹重命名源 - 新文件夹: ${newFolderPath}`);
        console.log(`FileWatcher: 新文件夹名: ${newFolderName}, 新文件夹目录: ${newFolderDir}`);

        for (const [deletedPath, deleteTime] of this.deletedFolders) {
            const timeDiff = currentTime - deleteTime;
            const deletedFolderName = path.basename(deletedPath);
            const deletedFolderDir = path.dirname(deletedPath);

            console.log(`FileWatcher: 检查删除文件夹: ${deletedPath}`);
            console.log(`FileWatcher: 删除文件夹名: ${deletedFolderName}, 删除文件夹目录: ${deletedFolderDir}`);
            console.log(`FileWatcher: 时间差: ${timeDiff}ms, 超时阈值: ${this.RENAME_DETECTION_TIMEOUT}ms`);

            if (timeDiff <= this.RENAME_DETECTION_TIMEOUT) {
                console.log(`FileWatcher: 时间差在阈值内，检查是否为文件夹重命名...`);

                // 检查是否为同一目录下的重命名
                if (deletedFolderDir === newFolderDir) {
                    console.log(`FileWatcher: 同一目录下的文件夹变更，判定为重命名: ${deletedPath} -> ${newFolderPath}`);
                    return deletedPath;
                }

                console.log(`FileWatcher: 不匹配文件夹重命名条件`);
            } else {
                console.log(`FileWatcher: 时间差超出阈值，跳过`);
            }
        }

        console.log(`FileWatcher: 未找到匹配的删除文件夹`);
        return null;
    }

    /**
     * 查找最近创建的文件夹（用于移动检测）
     */
    private findRecentlyCreatedFolder(deletedFolderPath: string, currentTime: number): string | null {
        const deletedFolderName = path.basename(deletedFolderPath);
        const deletedFolderDir = path.dirname(deletedFolderPath);

        console.log(`FileWatcher: 查找文件夹重命名目标 - 删除文件夹: ${deletedFolderPath}`);
        console.log(`FileWatcher: 删除文件夹名: ${deletedFolderName}, 删除文件夹目录: ${deletedFolderDir}`);

        for (const [createdPath, createTime] of this.createdFolders) {
            const timeDiff = currentTime - createTime;
            const createdFolderName = path.basename(createdPath);
            const createdFolderDir = path.dirname(createdPath);

            console.log(`FileWatcher: 检查创建文件夹: ${createdPath}`);
            console.log(`FileWatcher: 创建文件夹名: ${createdFolderName}, 创建文件夹目录: ${createdFolderDir}`);
            console.log(`FileWatcher: 时间差: ${timeDiff}ms, 超时阈值: ${this.RENAME_DETECTION_TIMEOUT}ms`);

            if (timeDiff <= this.RENAME_DETECTION_TIMEOUT) {
                console.log(`FileWatcher: 时间差在阈值内，检查是否为文件夹重命名...`);

                // 检查是否为同一目录下的重命名
                if (createdFolderDir === deletedFolderDir) {
                    console.log(`FileWatcher: 同一目录下的文件夹变更，判定为重命名: ${deletedFolderPath} -> ${createdPath}`);
                    return createdPath;
                }

                console.log(`FileWatcher: 不匹配文件夹重命名条件`);
            } else {
                console.log(`FileWatcher: 时间差超出阈值，跳过`);
            }
        }

        console.log(`FileWatcher: 未找到匹配的创建文件夹`);
        return null;
    }

    /**
     * 手动触发文件夹重命名处理
     */
    async handleFolderRename(oldFolderPath: string, newFolderPath: string): Promise<void> {
        console.log(`FileWatcher: 手动处理文件夹重命名 - ${oldFolderPath} -> ${newFolderPath}`);
        
        try {
            // 收集文件夹中的所有Mintlify文件
            const fileChanges: FileChangeEvent[] = [];
            
            // 递归扫描新文件夹中的所有文件
            const newFiles = await this.getAllFilesInFolder(newFolderPath);
            
            for (const newFilePath of newFiles) {
                if (this.pathResolver.isMintlifyFile(newFilePath)) {
                    // 计算对应的旧文件路径
                    const relativePath = path.relative(newFolderPath, newFilePath);
                    const oldFilePath = path.join(oldFolderPath, relativePath);
                    
                    fileChanges.push({
                        type: 'move',
                        oldPath: oldFilePath,
                        newPath: newFilePath,
                        isDirectory: false
                    });
                }
            }

            if (fileChanges.length > 0) {
                console.log(`FileWatcher: 文件夹重命名包含 ${fileChanges.length} 个文件`);
                this.onFolderChangeCallback?.(fileChanges);
            }

        } catch (error) {
            console.error('处理文件夹重命名时出错:', error);
        }
    }

    /**
     * 获取文件夹中的所有文件
     */
    private async getAllFilesInFolder(folderPath: string): Promise<string[]> {
        const files: string[] = [];
        
        try {
            const entries = fs.readdirSync(folderPath, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(folderPath, entry.name);
                
                if (entry.isDirectory()) {
                    // 递归处理子文件夹
                    const subFiles = await this.getAllFilesInFolder(fullPath);
                    files.push(...subFiles);
                } else if (entry.isFile()) {
                    files.push(fullPath);
                }
            }
        } catch (error) {
            console.error(`扫描文件夹 ${folderPath} 时出错:`, error);
        }
        
        return files;
    }
}
