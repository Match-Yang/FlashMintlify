import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

interface ComponentAttribute {
  type: string;
  options?: string[];
  required?: boolean;
  description: string;
}

interface ComponentConfig {
  attributes: { [key: string]: ComponentAttribute };
}

interface MintlifyConfig {
  components: { [key: string]: ComponentConfig };
}

export class PropertySetterPanel {
  public static currentPanel: PropertySetterPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];
  private _config: MintlifyConfig | null = null;
  private _documentUri: vscode.Uri | null = null;
  private _currentRange: vscode.Range | null = null;

  public static createOrShow(
    extensionUri: vscode.Uri,
    componentName: string,
    range: vscode.Range,
    existingAttributes: { [key: string]: string }
  ) {
    // 如果已经有面板打开，就更新内容
    if (PropertySetterPanel.currentPanel) {
      PropertySetterPanel.currentPanel._panel.reveal(vscode.ViewColumn.Two);
      PropertySetterPanel.currentPanel.updateContent(componentName, range, existingAttributes);
      return;
    }

    // 创建新面板，固定在右侧
    const panel = vscode.window.createWebviewPanel(
      'mintlifyPropertySetter',
      `${componentName} Properties`,
      { viewColumn: vscode.ViewColumn.Two, preserveFocus: true }, // 固定在右侧，不抢焦点
      {
        enableScripts: true,
        retainContextWhenHidden: true, // 保持状态
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'media'),
          vscode.Uri.joinPath(extensionUri, 'out', 'webview')
        ]
      }
    );

    // 注意：VS Code的WebView面板大小由用户拖拽控制，无法通过API设置
    // 我们通过CSS控制内容的最小和最大宽度来适应面板大小

    PropertySetterPanel.currentPanel = new PropertySetterPanel(
      panel,
      extensionUri,
      componentName,
      range,
      existingAttributes
    );
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    componentName: string,
    range: vscode.Range,
    existingAttributes: { [key: string]: string }
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    // 保存当前编辑器信息
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
      this._documentUri = activeEditor.document.uri;
      this._currentRange = range;
    }

    // 加载配置
    this.loadConfig();

    // 设置初始内容
    this.updateContent(componentName, range, existingAttributes);

    // 监听面板关闭
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // 处理来自webview的消息
    this._panel.webview.onDidReceiveMessage(
      message => {
        switch (message.command) {
          case 'setAttribute':
            this.handleSetAttribute(message.data);
            break;
          case 'searchIcons':
            this.handleIconSearch(message.query);
            break;
          case 'saveAttributes':
            this.handleSaveAttributes(message.data);
            break;
          case 'error':
            vscode.window.showErrorMessage(`WebView error: ${message.message}`);
            break;
          case 'close':
            this._panel.dispose();
            break;
        }
      },
      null,
      this._disposables
    );
  }

  private loadConfig() {
    try {
      const possiblePaths = [
        path.join(__dirname, '..', 'config', 'mintlify-components.json'),
        path.join(__dirname, '..', 'src', 'config', 'mintlify-components.json'),
        path.join(__dirname, 'config', 'mintlify-components.json')
      ];
      
      let configContent: string | null = null;
      for (const configPath of possiblePaths) {
        try {
          if (fs.existsSync(configPath)) {
            configContent = fs.readFileSync(configPath, 'utf8');
            break;
          }
        } catch (e) {
          // 继续尝试下一个路径
        }
      }
      
      if (configContent) {
        this._config = JSON.parse(configContent);
      }
    } catch (error) {
      console.error('Failed to load Mintlify components config:', error);
    }
  }

  private updateContent(
    componentName: string,
    range: vscode.Range,
    existingAttributes: { [key: string]: string }
  ) {
    // 更新保存的范围信息
    this._currentRange = range;

    if (!this._config || !this._config.components[componentName]) {
      this._panel.webview.html = this.getErrorHtml('Component configuration not found');
      return;
    }

    const componentConfig = this._config.components[componentName];
    this._panel.webview.html = this.getWebviewContent(componentName, componentConfig, existingAttributes, range);
  }

  private async handleSetAttribute(data: {
    componentName: string;
    attrName: string;
    attrValue: string;
    attrType: string;
    range: { start: { line: number; character: number }, end: { line: number; character: number } }
  }) {
    // 只更新WebView显示，不立即写入代码
    this._panel.webview.postMessage({
      command: 'attributeUpdated',
      attrName: data.attrName,
      attrValue: data.attrValue
    });
  }

  private async handleSaveAttributes(data: {
    componentName: string;
    attributes: { [key: string]: { value: string; type: string } };
    range: { start: { line: number; character: number }, end: { line: number; character: number } }
  }) {
    if (!data.range || !data.range.start || !data.range.end) {
      vscode.window.showErrorMessage('Invalid range information');
      return;
    }

    if (!this._documentUri) {
      vscode.window.showErrorMessage('No document reference found');
      return;
    }

    try {
      // 查找包含目标文档的编辑器
      let targetEditor: vscode.TextEditor | undefined;

      // 首先尝试当前活动编辑器
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor && this._documentUri && activeEditor.document.uri.toString() === this._documentUri.toString()) {
        targetEditor = activeEditor;
      } else {
        // 如果当前编辑器不是目标文档，查找所有可见编辑器
        targetEditor = vscode.window.visibleTextEditors.find(
          editor => this._documentUri && editor.document.uri.toString() === this._documentUri.toString()
        );
      }

      if (!targetEditor) {
        // 如果找不到编辑器，尝试打开文档
        const document = await vscode.workspace.openTextDocument(this._documentUri);
        targetEditor = await vscode.window.showTextDocument(document, { preserveFocus: true });
      }

      if (!targetEditor) {
        console.error('Could not find or open target editor');
        vscode.window.showErrorMessage('Could not access the target document');
        return;
      }

      const range = new vscode.Range(
        data.range.start.line,
        data.range.start.character,
        data.range.end.line,
        data.range.end.character
      );

      const document = targetEditor.document;
      let componentText = document.getText(range);

      // 批量更新所有属性
      for (const [attrName, attrInfo] of Object.entries(data.attributes)) {
        if (attrInfo.value && attrInfo.value.trim() !== '') {
          componentText = this.updateAttributeInText(componentText, attrName, attrInfo.value, attrInfo.type);
        }
      }

      // 一次性替换整个组件
      await targetEditor.edit(editBuilder => {
        editBuilder.replace(range, componentText);
      });

      vscode.window.showInformationMessage(`Saved ${data.componentName} properties`);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to save ${data.componentName} properties: ${error}`);
    }
  }

  private async handleIconSearch(query: string) {
    try {
      // 如果没有查询，显示常用图标
      if (!query || query.trim().length < 2) {
        const commonIcons = [
          'home', 'user', 'search', 'heart', 'star', 'flag', 'bell', 'envelope', 'phone', 'calendar',
          'clock', 'map-marker-alt', 'globe', 'link', 'external-link-alt', 'file', 'folder', 'image',
          'video', 'music', 'code', 'terminal', 'database', 'server', 'cloud', 'wifi', 'bluetooth',
          'battery-full', 'volume-up', 'play', 'pause', 'stop', 'forward', 'backward', 'repeat'
        ];

        this._panel.webview.postMessage({
          command: 'iconSearchResults',
          icons: commonIcons.slice(0, 20)
        });
        return;
      }

      // 优先调用FontAwesome搜索API
      const searchResults = await this.searchFontAwesomeAPI(query);

      // 发送搜索结果回webview
      this._panel.webview.postMessage({
        command: 'iconSearchResults',
        icons: searchResults
      });
    } catch (error) {
      console.error('Icon search failed:', error);
      // 如果API失败，使用本地fallback
      this.fallbackIconSearch(query);
    }
  }

  private async searchFontAwesomeAPI(query: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const https = require('https');

      // 使用更可靠的GitHub API获取FontAwesome图标数据
      const url = 'https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/metadata/icons.json';

      const options = {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive'
        },
        timeout: 10000 // 10秒超时
      };

      const request = https.get(url, options, (response: any) => {
        let data = '';

        // 处理gzip压缩
        let stream: any;
        if (response.headers['content-encoding'] === 'gzip') {
          stream = require('zlib').createGunzip();
          response.pipe(stream);
        } else {
          stream = response;
        }

        stream.on('data', (chunk: any) => {
          data += chunk;
        });

        stream.on('end', () => {
          try {
            const icons = JSON.parse(data);
            const matchingIcons: string[] = [];

            for (const [iconName, iconData] of Object.entries(icons)) {
              if (matchingIcons.length >= 20) break;

              const iconInfo = iconData as any;
              const searchTerms = [
                iconName,
                ...(iconInfo.search?.terms || []),
                ...(iconInfo.aliases?.names || [])
              ];

              if (searchTerms.some(term =>
                term.toLowerCase().includes(query.toLowerCase())
              )) {
                matchingIcons.push(iconName);
              }
            }

            resolve(matchingIcons);
          } catch (error) {
            console.error('Failed to parse FontAwesome data:', error);
            reject(error);
          }
        });

        stream.on('error', (error: any) => {
          console.error('Stream error:', error);
          reject(error);
        });
      });

      request.on('error', (error: any) => {
        console.error('Request error:', error);
        reject(error);
      });

      request.on('timeout', () => {
        request.destroy();
        reject(new Error('Request timeout'));
      });

      // 设置超时
      request.setTimeout(10000, () => {
        request.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  private fallbackIconSearch(query: string) {
    // 简单的本地fallback，仅在网络API失败时使用
    const commonIcons = [
      'home', 'user', 'search', 'heart', 'star', 'flag', 'bell', 'envelope', 'phone', 'calendar',
      'clock', 'map-marker-alt', 'globe', 'link', 'external-link-alt', 'file', 'folder', 'image',
      'video', 'music', 'code', 'terminal', 'database', 'server', 'cloud', 'wifi', 'bluetooth',
      'battery-full', 'volume-up', 'play', 'pause', 'stop', 'forward', 'backward', 'repeat',
      'random', 'expand', 'compress', 'info-circle', 'exclamation-triangle', 'check-circle',
      'times-circle', 'question-circle', 'shield-alt', 'key', 'tag', 'bookmark', 'filter',
      'sort', 'th', 'list', 'table', 'chart-bar', 'chart-line', 'chart-pie', 'trending-up',
      'trending-down', 'users', 'user-friends', 'comments', 'thumbs-up', 'thumbs-down',
      'plus', 'minus', 'edit', 'trash', 'save', 'download', 'upload', 'share', 'copy',
      'cut', 'undo', 'redo', 'sync', 'lock', 'unlock', 'eye', 'eye-slash', 'cog', 'bars',
      'android', 'apple', 'mobile', 'tablet', 'laptop', 'desktop'
    ];

    const filteredIcons = commonIcons.filter(icon =>
      icon.toLowerCase().includes(query.toLowerCase())
    );

    this._panel.webview.postMessage({
      command: 'iconSearchResults',
      icons: filteredIcons.slice(0, 20)
    });
  }

  private async updateComponentAttribute(range: vscode.Range, attrName: string, attrValue: string, attrType: string) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    const document = editor.document;
    const componentText = document.getText(range);
    
    // 如果值为空字符串，表示删除属性
    if (attrValue === '') {
      const newText = this.removeAttribute(componentText, attrName);
      await editor.edit(editBuilder => {
        editBuilder.replace(range, newText);
      });
      return;
    }

    // 格式化属性值
    let formattedValue: string;
    if (attrType === 'boolean' && attrValue === 'true') {
      formattedValue = attrName; // 布尔属性为true时只写属性名
    } else if (attrType === 'number') {
      formattedValue = `${attrName}={${attrValue}}`;
    } else if (attrType === 'array') {
      formattedValue = `${attrName}=${attrValue}`; // 数组已经包含{}
    } else {
      formattedValue = `${attrName}="${attrValue}"`;
    }

    const newText = this.updateAttribute(componentText, attrName, formattedValue);
    
    await editor.edit(editBuilder => {
      editBuilder.replace(range, newText);
    });
  }

  private updateAttributeInText(componentText: string, attrName: string, attrValue: string, attrType: string): string {
    // 格式化属性值
    let formattedValue: string;
    if (attrType === 'boolean' && attrValue === 'true') {
      formattedValue = attrName; // 布尔属性为true时只写属性名
    } else if (attrType === 'number') {
      formattedValue = `${attrName}={${attrValue}}`;
    } else if (attrType === 'array') {
      formattedValue = `${attrName}=${attrValue}`; // 数组已经包含{}
    } else {
      formattedValue = `${attrName}="${attrValue}"`;
    }

    return this.updateAttribute(componentText, attrName, formattedValue);
  }

  private updateAttribute(componentText: string, attrName: string, formattedValue: string): string {
    // 转义特殊字符
    const escapedAttrName = attrName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // 更精确的属性匹配正则表达式
    const existingAttrRegex = new RegExp(`\\s+${escapedAttrName}(?:=(?:"[^"]*"|{[^}]*}|[^\\s/>]+))?(?=\\s|/?>)`, 'g');

    if (existingAttrRegex.test(componentText)) {
      // 替换现有属性
      const newRegex = new RegExp(`\\s+${escapedAttrName}(?:=(?:"[^"]*"|{[^}]*}|[^\\s/>]+))?(?=\\s|/?>)`, 'g');
      return componentText.replace(newRegex, ` ${formattedValue}`);
    } else {
      // 添加新属性 - 在第一个>或/>之前插入
      const insertPosition = componentText.search(/\s*\/?>/);
      if (insertPosition !== -1) {
        return componentText.slice(0, insertPosition) + ` ${formattedValue}` + componentText.slice(insertPosition);
      }
    }

    return componentText;
  }

  private removeAttribute(componentText: string, attrName: string): string {
    const attrRegex = new RegExp(`\\s*\\b${attrName}(?:=(?:"[^"]*"|{[^}]*}|[^\\s>]+))?`, 'g');
    return componentText.replace(attrRegex, '');
  }

  private getWebviewContent(
    componentName: string,
    componentConfig: ComponentConfig,
    existingAttributes: { [key: string]: string },
    range: vscode.Range
  ): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Set ${componentName} Properties</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
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
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        .header h2 {
            margin: 0;
            font-size: 1.1em;
            font-weight: 600;
        }
        .property-group {
            margin-bottom: 12px;
            padding: 10px;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 3px;
            background-color: var(--vscode-input-background);
        }
        .property-label {
            font-weight: bold;
            margin-bottom: 5px;
            color: var(--vscode-input-foreground);
        }
        .property-description {
            font-size: 0.9em;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 10px;
        }
        .property-input {
            width: 100%;
            padding: 6px 8px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 2px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-family: var(--vscode-font-family);
            font-size: 0.9em;
            box-sizing: border-box;
        }
        .property-select {
            width: 100%;
            padding: 6px 8px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 2px;
            background-color: var(--vscode-dropdown-background);
            color: var(--vscode-dropdown-foreground);
            font-family: var(--vscode-font-family);
            font-size: 0.9em;
            box-sizing: border-box;
        }
        .icon-search {
            position: relative;
        }
        .icon-results {
            max-height: 150px;
            overflow-y: auto;
            border: 1px solid var(--vscode-input-border);
            border-top: none;
            background-color: var(--vscode-dropdown-background);
            border-radius: 0 0 3px 3px;
        }
        .icon-item {
            padding: 6px 8px;
            cursor: pointer;
            border-bottom: 1px solid var(--vscode-panel-border);
            font-size: 0.9em;
            display: flex;
            align-items: center;
        }
        .icon-item:hover {
            background-color: var(--vscode-list-hoverBackground);
        }
        .icon-item:last-child {
            border-bottom: none;
        }
        .icon-symbol {
            margin-right: 6px;
            color: var(--vscode-symbolIcon-colorForeground);
        }
        .buttons {
            margin-top: 15px;
            text-align: center;
            display: flex;
            gap: 8px;
        }
        .button {
            padding: 6px 12px;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-family: var(--vscode-font-family);
            font-size: 0.9em;
            flex: 1;
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
    </style>
</head>
<body>
    <div class="header">
        <h2>Set Properties for &lt;${componentName}&gt;</h2>
    </div>
    
    <div id="properties">
        ${Object.entries(componentConfig.attributes).map(([attrName, attrConfig]) => 
          this.generatePropertyHtml(attrName, attrConfig, existingAttributes[attrName])
        ).join('')}
    </div>
    
    <div class="buttons">
        <button class="button button-primary" onclick="saveAttributes()">Save</button>
        <button class="button button-secondary" onclick="closePanel()">Close</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const componentName = '${componentName}';
        const range = ${JSON.stringify({
          start: { line: range.start.line, character: range.start.character },
          end: { line: range.end.line, character: range.end.character }
        })};



        ${this.getWebviewScript()}
    </script>
</body>
</html>`;
  }

  private generatePropertyHtml(attrName: string, attrConfig: ComponentAttribute, currentValue?: string): string {
    const currentValueText = currentValue ? `<span class="current-value">Current: ${currentValue}</span>` : '<span class="current-value"></span>';

    let inputHtml = '';

    switch (attrConfig.type) {
      case 'searchable':
        if (attrName === 'icon') {
          inputHtml = `
            <div class="icon-search">
              <input type="text" class="property-input" id="${attrName}" placeholder="Search FontAwesome icons..."
                     value="${currentValue || ''}" oninput="searchIcons(this.value)">
              <div class="icon-results" id="${attrName}-results" style="display: none;"></div>
            </div>`;
        } else {
          inputHtml = `<input type="text" class="property-input" id="${attrName}" value="${currentValue || ''}"
                              oninput="handleRealTimeInput('${attrName}', '${attrConfig.type}', this)">`;
        }
        break;
      case 'select':
        const options = attrConfig.options || [];
        inputHtml = `
          <select class="property-select" id="${attrName}" onchange="handleRealTimeInput('${attrName}', '${attrConfig.type}', this)">
            <option value="">Select...</option>
            ${options.map(option =>
              `<option value="${option}" ${currentValue === option ? 'selected' : ''}>${option}</option>`
            ).join('')}
          </select>`;
        break;
      case 'boolean':
        inputHtml = `
          <select class="property-select" id="${attrName}" onchange="handleRealTimeInput('${attrName}', '${attrConfig.type}', this)">
            <option value="">Not set</option>
            <option value="true" ${currentValue === 'true' ? 'selected' : ''}>true</option>
            <option value="false" ${currentValue === 'false' ? 'selected' : ''}>false</option>
          </select>`;
        break;
      case 'number':
        inputHtml = `<input type="number" class="property-input" id="${attrName}" value="${currentValue || ''}"
                            oninput="handleRealTimeInput('${attrName}', '${attrConfig.type}', this)"
                            placeholder="Enter number">`;
        break;
      case 'color':
        inputHtml = `<input type="text" class="property-input" id="${attrName}" value="${currentValue || ''}"
                            oninput="handleRealTimeInput('${attrName}', '${attrConfig.type}', this)"
                            placeholder="#FF5733" pattern="^#[0-9A-Fa-f]{6}$">`;
        break;
      default:
        inputHtml = `<input type="text" class="property-input" id="${attrName}" value="${currentValue || ''}"
                            oninput="handleRealTimeInput('${attrName}', '${attrConfig.type}', this)">`;
    }

    return `
      <div class="property-group" data-attr="${attrName}">
        <div class="property-label">${attrName} ${attrConfig.required ? '(required)' : ''}</div>
        <div class="property-description">${attrConfig.description} ${currentValueText}</div>
        ${inputHtml}
      </div>`;
  }

  private getWebviewScript(): string {
    return `
      let searchTimeout;

      function setAttribute(attrName, attrValue, attrType) {
        vscode.postMessage({
          command: 'setAttribute',
          data: {
            componentName,
            attrName,
            attrValue,
            attrType,
            range
          }
        });
      }

      function searchIcons(query) {
        // 防抖搜索
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          vscode.postMessage({
            command: 'searchIcons',
            query
          });
        }, 300);

        const resultsDiv = document.getElementById('icon-results');
        resultsDiv.style.display = query.length >= 2 ? 'block' : 'none';

        if (query.length < 2) {
          // 显示常用图标
          vscode.postMessage({
            command: 'searchIcons',
            query: ''
          });
        }
      }

      function selectIcon(iconName) {
        document.getElementById('icon').value = iconName;
        document.getElementById('icon-results').style.display = 'none';
        updateCurrentValue('icon', iconName);
        // 存储到临时状态
        if (!window.pendingAttributes) {
          window.pendingAttributes = {};
        }
        window.pendingAttributes['icon'] = { value: iconName, type: 'searchable' };
      }

      function updateCurrentValue(attrName, value) {
        const group = document.querySelector(\`[data-attr="\${attrName}"] .current-value\`);
        if (group) {
          group.textContent = \`Current: \${value}\`;
        }
      }

      function closePanel() {
        vscode.postMessage({ command: 'close' });
      }

      // 实时输入处理 - 只更新显示，不写入代码
      function handleRealTimeInput(attrName, attrType, element) {
        const value = element.value;
        updateCurrentValue(attrName, value);
        // 存储到临时状态，等待保存
        if (!window.pendingAttributes) {
          window.pendingAttributes = {};
        }
        window.pendingAttributes[attrName] = { value, type: attrType };
      }

      function saveAttributes() {
        // 收集所有当前的属性值
        const attributes = {};

        // 获取所有属性组
        document.querySelectorAll('.property-group').forEach(group => {
          const attrName = group.getAttribute('data-attr');
          if (attrName) {
            const input = group.querySelector('input, select');
            if (input && input.value && input.value.trim() !== '') {
              // 确定属性类型
              let attrType = 'text';
              if (input.type === 'number') {
                attrType = 'number';
              } else if (input.tagName === 'SELECT') {
                attrType = 'select';
                // 检查是否是布尔类型
                const options = Array.from(input.options).map(opt => opt.value);
                if (options.includes('true') && options.includes('false')) {
                  attrType = 'boolean';
                }
              } else if (attrName === 'icon') {
                attrType = 'searchable';
              }

              attributes[attrName] = {
                value: input.value,
                type: attrType
              };
            }
          }
        });

        // 确保range对象存在且有正确的结构
        if (!range || !range.start || !range.end) {
          vscode.postMessage({
            command: 'error',
            message: 'Invalid range information'
          });
          return;
        }

        vscode.postMessage({
          command: 'saveAttributes',
          data: {
            componentName: componentName,
            attributes: attributes,
            range: {
              start: {
                line: range.start.line,
                character: range.start.character
              },
              end: {
                line: range.end.line,
                character: range.end.character
              }
            }
          }
        });
      }

      // 监听来自扩展的消息
      window.addEventListener('message', event => {
        const message = event.data;
        switch (message.command) {
          case 'iconSearchResults':
            const resultsDiv = document.getElementById('icon-results');
            if (resultsDiv) {
              console.log('Displaying icons:', message.icons); // 调试：显示搜索到的图标
              resultsDiv.innerHTML = message.icons.map(icon =>
                \`<div class="icon-item" onclick="selectIcon('\${icon}')">
                  <span class="icon-preview">
                    <i class="fas fa-\${icon}" style="margin-right: 8px; width: 16px; text-align: center;"></i>
                    <i class="fab fa-\${icon}" style="margin-right: 8px; width: 16px; text-align: center; display: none;"></i>
                    <i class="far fa-\${icon}" style="margin-right: 8px; width: 16px; text-align: center; display: none;"></i>
                  </span>
                  \${icon}
                </div>\`
              ).join('');

              // 检查图标是否存在，如果不存在则尝试其他类型
              setTimeout(() => {
                document.querySelectorAll('.icon-item').forEach(item => {
                  const icons = item.querySelectorAll('i');
                  const fasIcon = icons[0];
                  const fabIcon = icons[1];
                  const farIcon = icons[2];
                  const iconName = item.textContent.trim();

                  // 检查fas图标是否存在
                  if (fasIcon && getComputedStyle(fasIcon, ':before').content === 'none') {
                    console.log(\`Icon '\${iconName}' not found in fas, trying fab\`);
                    fasIcon.style.display = 'none';
                    fabIcon.style.display = 'inline';

                    // 如果fab也不存在，尝试far
                    setTimeout(() => {
                      if (getComputedStyle(fabIcon, ':before').content === 'none') {
                        console.log(\`Icon '\${iconName}' not found in fab, trying far\`);
                        fabIcon.style.display = 'none';
                        farIcon.style.display = 'inline';

                        // 如果far也不存在，记录错误
                        setTimeout(() => {
                          if (getComputedStyle(farIcon, ':before').content === 'none') {
                            console.log(\`Icon '\${iconName}' not found in any FontAwesome class (fas/fab/far)\`);
                          }
                        }, 10);
                      }
                    }, 10);
                  }
                });
              }, 10);
            }
            break;
          case 'attributeUpdated':
            updateCurrentValue(message.attrName, message.attrValue);
            break;
        }
      });

      // 页面加载完成后初始化
      document.addEventListener('DOMContentLoaded', () => {
        // 初始化图标搜索
        const iconInput = document.getElementById('icon');
        if (iconInput) {
          searchIcons(''); // 加载常用图标
        }
      });
    `;
  }

  private getErrorHtml(error: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error</title>
</head>
<body>
    <h2>Error</h2>
    <p>${error}</p>
</body>
</html>`;
  }

  public dispose() {
    PropertySetterPanel.currentPanel = undefined;

    this._panel.dispose();

    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }
}
