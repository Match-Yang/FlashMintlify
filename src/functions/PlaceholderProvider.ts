/**
 * FlashMintlify - Placeholder provider for editor decorations
 *
 * @author Match-Yang(OliverYeung)
 * @email oliver.yeung.me@gmail.com
 * @license MIT
 */
import * as vscode from 'vscode';

export class PlaceholderProvider {
    private decorationType: vscode.TextEditorDecorationType;
    private disposables: vscode.Disposable[] = [];

    constructor() {
        // 创建装饰类型，模仿VSCode内置的placeholder样式
        this.decorationType = vscode.window.createTextEditorDecorationType({
            after: {
                contentText: 'Press "/" for command, or just start typing.',
                color: '#888888', // 灰色文本
                fontStyle: 'italic',
                margin: '0 0 0 0'
            },
            // 确保placeholder不会被选中
            rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed
        });

        // 监听编辑器变化
        this.disposables.push(
            vscode.window.onDidChangeActiveTextEditor(editor => {
                if (editor) {
                    this.updatePlaceholder(editor);
                }
            }),
            vscode.workspace.onDidChangeTextDocument(event => {
                const editor = vscode.window.activeTextEditor;
                if (editor && event.document === editor.document) {
                    this.updatePlaceholder(editor);
                }
            }),
            vscode.window.onDidChangeTextEditorSelection(event => {
                this.updatePlaceholder(event.textEditor);
            })
        );

        // 为当前激活的编辑器初始化placeholder
        if (vscode.window.activeTextEditor) {
            this.updatePlaceholder(vscode.window.activeTextEditor);
        }
    }

    private updatePlaceholder(editor: vscode.TextEditor) {
        // 只在markdown和mdx文件中显示placeholder
        if (editor.document.languageId !== 'markdown' && editor.document.languageId !== 'mdx') {
            editor.setDecorations(this.decorationType, []);
            return;
        }

        const position = editor.selection.active;
        const line = editor.document.lineAt(position.line);
        
        // 检查当前行是否为空且光标在行尾
        if (line.text.trim() === '' && position.character === line.text.length) {
            // 显示placeholder
            const decoration: vscode.DecorationOptions = {
                range: new vscode.Range(position.line, line.text.length, position.line, line.text.length)
            };
            editor.setDecorations(this.decorationType, [decoration]);
        } else {
            // 隐藏placeholder
            editor.setDecorations(this.decorationType, []);
        }
    }

    dispose() {
        this.decorationType.dispose();
        this.disposables.forEach(d => d.dispose());
    }
}

export function createPlaceholderProvider(): vscode.Disposable {
    const provider = new PlaceholderProvider();
    return {
        dispose: () => provider.dispose()
    };
}
