import * as vscode from 'vscode';

export interface SettingsField {
  name: string;
  type: 'text' | 'number' | 'select' | 'boolean' | 'searchable';
  label?: string;
  description?: string;
  options?: string[];
  defaultValue?: string;
  currentValue?: string;
  placeholder?: string;
}

export interface SettingsData {
  [key: string]: {
    value: string;
    type: string;
  };
}

export abstract class SettingsPanel {
  public static currentPanel: SettingsPanel | undefined;
  protected readonly _panel: vscode.WebviewPanel;
  protected readonly _extensionUri: vscode.Uri;
  protected _disposables: vscode.Disposable[] = [];
  protected _documentUri?: vscode.Uri;

  constructor(
    extensionUri: vscode.Uri,
    panelType: string,
    title: string,
    viewColumn: vscode.ViewColumn = vscode.ViewColumn.Two
  ) {
    this._extensionUri = extensionUri;

    // 创建WebView面板
    this._panel = vscode.window.createWebviewPanel(
      panelType,
      title,
      { viewColumn, preserveFocus: true },
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'media'),
          vscode.Uri.joinPath(extensionUri, 'out', 'webview')
        ]
      }
    );

    // 注意：VS Code的WebView面板大小由用户拖拽控制，无法通过API设置
    // 我们通过CSS控制内容的最小和最大宽度来适应面板大小

    // 设置图标
    this._panel.iconPath = {
      light: vscode.Uri.joinPath(this._extensionUri, 'resources', 'light', 'settings.svg'),
      dark: vscode.Uri.joinPath(this._extensionUri, 'resources', 'dark', 'settings.svg')
    };

    // 监听面板关闭
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // 处理来自webview的消息
    this._panel.webview.onDidReceiveMessage(
      message => this.handleMessage(message),
      null,
      this._disposables
    );
  }

  protected handleMessage(message: any) {
    switch (message.command) {
      case 'save':
        this.handleSave(message.data);
        break;
      case 'searchIcons':
        this.handleIconSearch(message.query);
        break;
      case 'error':
        vscode.window.showErrorMessage(`Settings Panel error: ${message.message}`);
        break;
      case 'close':
        this._panel.dispose();
        break;
    }
  }

  protected abstract handleSave(data: SettingsData): Promise<void>;
  
  protected abstract handleIconSearch(query: string): Promise<void>;

  protected abstract getFields(): SettingsField[];

  protected abstract getTitle(): string;

  public dispose() {
    SettingsPanel.currentPanel = undefined;

    // 清理资源
    this._panel.dispose();

    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  protected updateContent(fields: SettingsField[]) {
    this._panel.webview.html = this.getHtmlForWebview(fields);
  }

  protected getHtmlForWebview(fields: SettingsField[]): string {

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.getTitle()}</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 10px;
            margin: 0;
            overflow-x: hidden;
            min-width: 280px;
            max-width: 100%;
            box-sizing: border-box;
        }
        * {
            box-sizing: border-box;
        }
        .header {
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--vscode-widget-border);
        }
        .header h2 {
            margin: 0;
            color: var(--vscode-foreground);
        }
        .property-group {
            margin-bottom: 15px;
            padding: 10px;
            border: 1px solid var(--vscode-widget-border);
            border-radius: 4px;
            background-color: var(--vscode-input-background);
        }
        .property-label {
            font-weight: bold;
            margin-bottom: 5px;
            color: var(--vscode-foreground);
        }
        .property-description {
            font-size: 0.9em;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 8px;
        }
        .property-input {
            width: 100%;
            padding: 6px 8px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 2px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
        }
        .property-input:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }
        select.property-input {
            cursor: pointer;
        }
        .buttons {
            margin-top: 20px;
            display: flex;
            gap: 10px;
            justify-content: flex-end;
        }
        .button {
            padding: 8px 16px;
            border: none;
            border-radius: 2px;
            cursor: pointer;
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
        }
        .button-primary {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        .button-primary:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .button-secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        .button-secondary:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
        .current-value {
            font-style: italic;
            color: var(--vscode-textPreformat-foreground);
        }
        
        /* Icon search specific styles */
        .icon-search {
            position: relative;
        }
        .icon-results {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            max-height: 200px;
            overflow-y: auto;
            background-color: var(--vscode-dropdown-background);
            border: 1px solid var(--vscode-dropdown-border);
            border-radius: 2px;
            z-index: 1000;
        }
        .icon-item {
            padding: 8px;
            cursor: pointer;
            display: flex;
            align-items: center;
            border-bottom: 1px solid var(--vscode-widget-border);
        }
        .icon-item:hover {
            background-color: var(--vscode-list-hoverBackground);
        }
        .icon-item:last-child {
            border-bottom: none;
        }
        .icon-preview {
            margin-right: 8px;
            width: 20px;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="header">
        <h2>${this.getTitle()}</h2>
    </div>
    
    <div class="search-container">
        <input type="text" id="field-search" class="property-input" placeholder="Search fields..."
               oninput="filterFields(this.value)" style="margin-bottom: 15px;">
    </div>

    <div id="fields">
        ${fields.map(field => this.generateFieldHtml(field)).join('')}
    </div>
    
    <div class="buttons">
        <button class="button button-primary" onclick="saveSettings()">Save</button>
        <button class="button button-secondary" onclick="closePanel()">Close</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        ${this.getWebviewScript()}
    </script>
</body>
</html>`;
  }

  protected generateFieldHtml(field: SettingsField): string {
    const currentValueText = field.currentValue ? 
      `<span class="current-value">Current: ${field.currentValue}</span>` : 
      '<span class="current-value"></span>';

    let inputHtml = '';

    switch (field.type) {
      case 'searchable':
        if (field.name === 'icon') {
          inputHtml = `
            <div class="icon-search">
              <input type="text" class="property-input" id="${field.name}" placeholder="Search FontAwesome icons..."
                     value="${field.currentValue || ''}" oninput="searchIcons(this.value)">
              <div class="icon-results" id="${field.name}-results" style="display: none;"></div>
            </div>`;
        } else {
          const placeholder = field.placeholder ? `placeholder="${field.placeholder}"` : '';
          inputHtml = `<input type="text" class="property-input" id="${field.name}" value="${field.currentValue || ''}" ${placeholder}>`;
        }
        break;
      case 'select':
        const options = field.options || [];
        inputHtml = `
          <select class="property-input" id="${field.name}">
            ${options.map(option => 
              `<option value="${option}" ${field.currentValue === option ? 'selected' : ''}>${option}</option>`
            ).join('')}
          </select>`;
        break;
      case 'boolean':
        inputHtml = `
          <select class="property-input" id="${field.name}">
            <option value="true" ${field.currentValue === 'true' ? 'selected' : ''}>true</option>
            <option value="false" ${field.currentValue === 'false' ? 'selected' : ''}>false</option>
          </select>`;
        break;
      case 'number':
        const numberPlaceholder = field.placeholder ? `placeholder="${field.placeholder}"` : '';
        inputHtml = `<input type="number" class="property-input" id="${field.name}" value="${field.currentValue || field.defaultValue || ''}" ${numberPlaceholder}>`;
        break;
      default: // text
        const textPlaceholder = field.placeholder ? `placeholder="${field.placeholder}"` : '';
        inputHtml = `<input type="text" class="property-input" id="${field.name}" value="${field.currentValue || field.defaultValue || ''}" ${textPlaceholder}>`;
        break;
    }

    return `
      <div class="property-group" data-field="${field.name}">
        <div class="property-label">${field.label || field.name}</div>
        ${field.description ? `<div class="property-description">${field.description}</div>` : ''}
        ${currentValueText}
        ${inputHtml}
      </div>`;
  }

  protected abstract getWebviewScript(): string;

  public getBaseWebviewScript(): string {
    return `
      function filterFields(query) {
        const fields = document.querySelectorAll('.property-group');
        const searchTerm = query.toLowerCase();

        fields.forEach(field => {
          const fieldName = field.getAttribute('data-field') || '';
          const label = field.querySelector('.property-label')?.textContent || '';
          const description = field.querySelector('.property-description')?.textContent || '';

          const matches = fieldName.toLowerCase().includes(searchTerm) ||
                         label.toLowerCase().includes(searchTerm) ||
                         description.toLowerCase().includes(searchTerm);

          field.style.display = matches ? 'block' : 'none';
        });
      }
    `;
  }
}
