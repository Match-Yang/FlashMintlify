import * as vscode from 'vscode';
import * as path from 'path';

export class PreviewPanel {
  public static currentPanel: PreviewPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;

  public static createOrShow(extensionUri: vscode.Uri, url: string, viewColumn: vscode.ViewColumn = vscode.ViewColumn.Two) {
    if (PreviewPanel.currentPanel) {
      // 如果已经有预览面板，只更新内容，不改变位置
      // 这避免了因为 ViewColumn.Beside 相对位置变化导致的面板移动问题
      PreviewPanel.currentPanel.update(url);
      return;
    }

    const panel = new PreviewPanel(extensionUri, url, viewColumn);
    PreviewPanel.currentPanel = panel;
  }

  private constructor(extensionUri: vscode.Uri, url: string, viewColumn: vscode.ViewColumn) {
    this._extensionUri = extensionUri;

    // 根据 viewColumn 决定标题和图标
    const isFullscreen = viewColumn === vscode.ViewColumn.Active;
    const title = isFullscreen ? 'Mintlify Preview (Fullscreen)' : 'Mintlify Preview';

    this._panel = vscode.window.createWebviewPanel(
      'flashMintlifyPreview',
      title,
      { viewColumn, preserveFocus: !isFullscreen },
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'media'),
          vscode.Uri.joinPath(extensionUri, 'out', 'webview')
        ]
      }
    );

    // 设置图标 - 全屏模式用不同的图标
    if (isFullscreen) {
      this._panel.iconPath = vscode.Uri.file(path.join(extensionUri.fsPath, 'resources', 'browser.svg'));
    } else {
      this._panel.iconPath = vscode.Uri.file(path.join(extensionUri.fsPath, 'resources', 'preview.svg'));
    }

    this._panel.onDidDispose(() => this.dispose());
    this.update(url);
  }

  public dispose() {
    PreviewPanel.currentPanel = undefined;
    this._panel.dispose();
  }

  public update(url: string) {
    const nonce = String(Date.now());
    const csp = `default-src 'none'; img-src vscode-resource: https: data:; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; frame-src ${url};`;
    this._panel.webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mintlify Preview</title>
  <style>
    html, body, iframe { height: 100%; width: 100%; padding: 0; margin: 0; }
    body { background: var(--vscode-editor-background); }
    iframe { border: 0; }
  </style>
</head>
<body>
  <iframe src="${url}" allow="clipboard-read; clipboard-write"></iframe>
</body>
</html>`;
  }
}

