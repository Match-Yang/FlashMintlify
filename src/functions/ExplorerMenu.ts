import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as url from 'url';

function getWorkspaceRoot(): string | null {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || null;
}

function getFileTitle(filePath: string): string {
    try {
        const content = fs.readFileSync(filePath, 'utf8');

        // Try to extract title from frontmatter
        const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
        if (frontmatterMatch) {
            const frontmatter = frontmatterMatch[1];
            const titleMatch = frontmatter.match(/^title:\s*(.+)$/m);
            if (titleMatch) {
                return titleMatch[1].replace(/^["']|["']$/g, '').trim();
            }
        }

        // Try to extract title from first # heading
        const headingMatch = content.match(/^#\s+(.+)$/m);
        if (headingMatch) {
            return headingMatch[1].trim();
        }

        // Fallback to filename without extension
        return path.basename(filePath, path.extname(filePath));
    } catch (error) {
        // Fallback to filename without extension
        return path.basename(filePath, path.extname(filePath));
    }
}

function createMintlifyInternalLink(filePath: string): string {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
        throw new Error('No workspace folder found');
    }

    const relativePath = path.relative(workspaceRoot, filePath);
    const pathWithoutExt = relativePath.replace(/\.(md|mdx)$/, '');
    const internalPath = '/' + pathWithoutExt.replace(/\\/g, '/');
    const title = getFileTitle(filePath);

    return `[${title}](${internalPath})`;
}

function createExplorerMenuProviders() {
    const copyMarkdownLinkCommand = vscode.commands.registerCommand('flashMintlify.explorer.copyInternalLink', async (uri: vscode.Uri) => {
        if (uri && (uri.fsPath.endsWith('.md') || uri.fsPath.endsWith('.mdx'))) {
            try {
                const internalLink = createMintlifyInternalLink(uri.fsPath);
                await vscode.env.clipboard.writeText(internalLink);
                vscode.window.showInformationMessage(`Copied internal link: ${internalLink}`);
            } catch (error: any) {
                vscode.window.showErrorMessage(`Failed to copy internal link: ${error.message}`);
            }
        } else {
            vscode.window.showErrorMessage('Invalid file type. Only .md and .mdx files are supported.');
        }
    });

    const copyImportCommand = vscode.commands.registerCommand('flashMintlify.explorer.copyImport', async (uri: vscode.Uri) => {
        if (uri && (uri.fsPath.endsWith('.md') || uri.fsPath.endsWith('.mdx'))) {
            try {
                // 读取文件内容
                const fileContent = await vscode.workspace.fs.readFile(uri);
                const content = Buffer.from(fileContent).toString('utf8');

                // 正则表达式匹配 props.xxx 字段及其值
                const regex = /props\.(\w+)="([^"]*)"|props\.(\w+)=(undefined|true|false|[\d\.]+)/g;
                const propsMap = new Map<string, Set<any>>();

                let match;
                while ((match = regex.exec(content)) !== null) {
                    const propName = match[1] || match[3];
                    const propValue = match[2] || match[4];

                    // 确保 Map 中的 Set 存在
                    if (!propsMap.has(propName)) {
                        propsMap.set(propName, new Set<any>());
                    }

                    // 根据值的类型将其正确地插入 Set
                    if (propValue === 'undefined') {
                        propsMap.get(propName)!.add(undefined);
                    } else if (propValue === 'true') {
                        propsMap.get(propName)!.add(true);
                    } else if (propValue === 'false') {
                        propsMap.get(propName)!.add(false);
                    } else if (!isNaN(Number(propValue))) {
                        propsMap.get(propName)!.add(Number(propValue));
                    } else {
                        propsMap.get(propName)!.add(propValue);
                    }
                }

                // 将属性和值构建为字符串
                const propsArray: string[] = [];
                propsMap.forEach((values, name) => {
                    values.forEach(value => {
                        let valueString: string;
                        if (value === undefined) {
                            valueString = '{}';
                        } else if (typeof value === 'boolean') {
                            valueString = `{${value.toString()}}`;
                        } else if (typeof value === 'number') {
                            valueString = `{${value.toString()}}`;
                        } else {
                            valueString = `"${value}"`;
                        }
                        propsArray.push(`${name}=${valueString}`);
                    });
                });

                const propsString = propsArray.join(' ');

                // 获取相对路径
                const relativePath = vscode.workspace.asRelativePath(uri);
                if (relativePath) {
                    // 写入剪贴板
                    const clipboardText = `import Content from '/${relativePath}'\n\n<Content ${propsString}/>`;
                    await vscode.env.clipboard.writeText(clipboardText);
                    vscode.window.showInformationMessage('Import statement copied to clipboard!');
                }
            } catch (error: any) {
                vscode.window.showErrorMessage(`Failed to copy import: ${error.message}`);
            }
        } else {
            vscode.window.showErrorMessage('Invalid file type. Only .md and .mdx files are supported.');
        }
    });



    return [copyMarkdownLinkCommand, copyImportCommand]
}

export { createExplorerMenuProviders };