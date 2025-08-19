import * as vscode from 'vscode';
import * as path from 'path';

class MdFoldingRangeProvider implements vscode.FoldingRangeProvider {
    public provideFoldingRanges(
        document: vscode.TextDocument,
        context: vscode.FoldingContext,
        token: vscode.CancellationToken
    ): vscode.FoldingRange[] | null {
        const foldingRanges: vscode.FoldingRange[] = [];
        const tagRegex = /<\/?([A-Za-z][A-Za-z0-9]*)\b[^>]*>/g;
        const codeBlockRegex = /^```/;
        const headerRegex = /^(#{1,6})\s.*$/;
        const conditionBlockRegex = /^:::/;
        const stack: { type: 'tag' | 'code' | 'header' | 'condition', tag?: string, level?: number, line: number }[] = [];

        for (let i = 0; i < document.lineCount; i++) {
            const lineText = document.lineAt(i).text;

            // Check for code block start or end
            if (codeBlockRegex.test(lineText)) {
                if (stack.length > 0 && stack[stack.length - 1].type === 'code') {
                    const start = stack.pop()!.line;
                    if (start !== i) {
                        foldingRanges.push(new vscode.FoldingRange(start, i - 1));
                    }
                } else {
                    stack.push({ type: 'code', line: i });
                }
                continue;
            }

            // Check for condition block start or end
            if (conditionBlockRegex.test(lineText)) {
                if (stack.length > 0 && stack[stack.length - 1].type === 'condition') {
                    const start = stack.pop()!.line;
                    if (start !== i) {
                        foldingRanges.push(new vscode.FoldingRange(start, i - 1));
                    }
                } else {
                    stack.push({ type: 'condition', line: i });
                }
                continue;
            }

            // Check for HTML tags and React components
            let match;
            while ((match = tagRegex.exec(lineText)) !== null) {
                const tag = match[1];
                const isClosingTag = match[0].startsWith('</');

                if (isClosingTag) {
                    let index = stack.length - 1;
                    while (index >= 0 && (stack[index].type !== 'tag' || stack[index].tag !== tag)) {
                        index--;
                    }

                    if (index >= 0) {
                        const start = stack[index].line;
                        stack.splice(index, 1);
                        if (start !== i) {
                            foldingRanges.push(new vscode.FoldingRange(start, i - 1));
                        }
                    }
                } else {
                    stack.push({ type: 'tag', tag, line: i });
                }
            }

            // Check for headers
            const headerMatch = headerRegex.exec(lineText);
            if (headerMatch) {
                const level = headerMatch[1].length;

                while (stack.length > 0 && stack[stack.length - 1].type === 'header' && stack[stack.length - 1].level! >= level) {
                    const startHeader = stack.pop();
                    if (startHeader) {
                        const start = startHeader.line;
                        if (start !== i - 1) {
                            foldingRanges.push(new vscode.FoldingRange(start, i - 1));
                        }
                    }
                }
                stack.push({ type: 'header', level, line: i });
            }
        }

        // Handle any remaining headers
        while (stack.length > 0) {
            const item = stack.pop();
            if (item && item.type === 'header') {
                const start = item.line;
                if (start !== document.lineCount - 1) {
                    foldingRanges.push(new vscode.FoldingRange(start, document.lineCount - 1));
                }
            }
        }

        return foldingRanges;
    }
}


class FileLinkProvider implements vscode.DocumentLinkProvider {
    public provideDocumentLinks(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): vscode.DocumentLink[] {
        const text = document.getText();
        const links: vscode.DocumentLink[] = [];

        // Regex to match Markdown links, HTML <a> links, and import statements
        const regex = /import\s+.*?\s+from\s+['"`]([^'"`\n]+)['"`]|(?:\[[^\]]*?\]\(([^)\s]+)\))|<a\s+href=['"`]([^'"`\s]+)['"`]/g;
        let match;

        while ((match = regex.exec(text)) !== null) {
            let filePath = match[1] || match[2] || match[3];

            if (!filePath) continue;

            const startPos = document.positionAt(match.index + match[0].indexOf(filePath));
            const endPos = document.positionAt(match.index + match[0].indexOf(filePath) + filePath.length);
            const linkRange = new vscode.Range(startPos, endPos);

            // URL decode the path for Markdown and HTML links
            if (match[2] || match[3]) {
                try {
                    filePath = decodeURIComponent(filePath);
                } catch (e) {
                    // Ignore decoding errors
                }
            }

            // Determine if the path is relative or absolute
            let absolutePath: string;
            if (filePath.startsWith('/')) {
                // Handle absolute paths (starting with '/')
                absolutePath = path.join(vscode.workspace.workspaceFolders?.[0].uri.fsPath || '', filePath.slice(1));
            } else {
                // Handle relative paths
                const currentFileDir = path.dirname(document.uri.fsPath);
                absolutePath = path.resolve(currentFileDir, filePath);
            }

            // Create the file URI and add it to the document links
            const fileUri = vscode.Uri.file(absolutePath);
            links.push(new vscode.DocumentLink(linkRange, fileUri));
        }

        return links;
    }
}





function createNavigationProviders() {
    const foldingRangeProvider = vscode.languages.registerFoldingRangeProvider(
        [{ language: 'markdown', scheme: 'file' }, { language: 'mdx', scheme: 'file' }],
        new MdFoldingRangeProvider()
    );

    const fileLinkProvider = vscode.languages.registerDocumentLinkProvider(
        [{ language: 'markdown', scheme: 'file' }, { language: 'mdx', scheme: 'file' }],
        new FileLinkProvider()
    )

    return [foldingRangeProvider, fileLinkProvider]
}

export { createNavigationProviders };
