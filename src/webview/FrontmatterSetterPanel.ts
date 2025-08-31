/**
 * FlashMintlify - Frontmatter setter panel webview
 *
 * @author Match-Yang(OliverYeung)
 * @email oliver.yeung.me@gmail.com
 * @license MIT
 */
import * as vscode from 'vscode';
import { SettingsPanel, SettingsField, SettingsData } from './SettingsPanel';
import { getAllFrontmatterFieldGroups } from './FrontmatterFieldGroups';
import * as path from 'path';

export class FrontmatterSetterPanel extends SettingsPanel {
  public static currentPanel: FrontmatterSetterPanel | undefined;
  private _range?: vscode.Range;

  public static createOrShow(extensionUri: vscode.Uri) {
    // 如果已经有面板打开，就显示它
    if (FrontmatterSetterPanel.currentPanel) {
      FrontmatterSetterPanel.currentPanel._panel.reveal(vscode.ViewColumn.Two);
      return;
    }

    // 创建新面板
    const panel = new FrontmatterSetterPanel(extensionUri);
    FrontmatterSetterPanel.currentPanel = panel;
  }

  private constructor(extensionUri: vscode.Uri) {
    super(extensionUri, 'mintlifyFrontmatterSetter', 'Set page options');
    
    // 获取当前编辑器
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      this._documentUri = editor.document.uri;
      this.analyzeFrontmatter(editor);
    }

    // 更新内容
    this.updateContent(this.getFields());
  }

  private analyzeFrontmatter(editor: vscode.TextEditor) {
    const content = editor.document.getText();
    const hasFrontmatter = content.trim().startsWith('---');
    
    if (hasFrontmatter) {
      // 严谨的frontmatter范围检测
      const lines = content.split('\n');
      let startLine = -1;
      let endLine = -1;

      // 1. 查找第一个 --- (必须在文件开头)
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === '---') {
          startLine = i;
          break;
        } else if (line !== '' && !line.startsWith('#')) {
          // 遇到非空非注释行，没有frontmatter
          return;
        }
      }

      // 2. 查找第二个 --- (frontmatter结束)
      if (startLine !== -1) {
        for (let i = startLine + 1; i < lines.length; i++) {
          if (lines[i].trim() === '---') {
            endLine = i;
            break;
          }
        }
      }

      // 3. 设置精确的Range
      if (startLine !== -1 && endLine !== -1) {
        // 标准情况：完整的frontmatter（包含第二个 --- 后的换行）
        this._range = new vscode.Range(
          startLine, 0,
          endLine + 1, 0
        );
        console.log(`Standard frontmatter: lines ${startLine}-${endLine}`);
      } else if (startLine !== -1) {
        // 损坏情况：只有开始的---，查找所有可能的frontmatter内容
        let lastFrontmatterLine = startLine;
        for (let i = startLine + 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line === '---') {
            // 找到结束标记
            lastFrontmatterLine = i + 1; // 包含结束 --- 的下一行
            break;
          } else if (line === '' || line.includes(':')) {
            // 空行或包含冒号的行（可能是frontmatter字段）
            lastFrontmatterLine = i + 1; // 包含这行
          } else if (!line.startsWith('#')) {
            // 遇到非注释的内容行，停止
            break;
          }
        }

        this._range = new vscode.Range(
          startLine, 0,
          lastFrontmatterLine, 0
        );
        console.log(`Damaged frontmatter: lines ${startLine}-${lastFrontmatterLine}`);
      }
    }
  }

  protected getTitle(): string {
    return 'Set page options';
  }

  // 重写HTML生成方法以支持分组
  protected getHtmlForWebview(_fields: SettingsField[]): string {
    const fieldGroups = this.getFieldGroups();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.getTitle()}</title>
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
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--vscode-widget-border);
        }
        .header h2 {
            margin: 0;
            color: var(--vscode-foreground);
        }

        /* 分组样式 */
        .field-group {
            margin-bottom: 20px;
            border: 1px solid var(--vscode-widget-border);
            border-radius: 4px;
            background-color: var(--vscode-input-background);
        }
        .group-header {
            padding: 12px 15px;
            background-color: var(--vscode-button-secondaryBackground);
            border-bottom: 1px solid var(--vscode-widget-border);
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-weight: bold;
        }
        .group-header:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
        .group-toggle {
            font-size: 12px;
            transition: transform 0.2s;
        }
        .group-content {
            padding: 15px;
            display: block;
        }
        .group-content.collapsed {
            display: none;
        }
        .group-header.collapsed .group-toggle {
            transform: rotate(-90deg);
        }

        .property-group {
            margin-bottom: 15px;
            padding: 10px;
            border: 1px solid var(--vscode-widget-border);
            border-radius: 4px;
            background-color: var(--vscode-editor-background);
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
            justify-content: flex-start;
            padding-left: 10px;
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
        <input type="text" id="field-search" class="property-input" placeholder="🔍 Search fields..."
               oninput="filterFields(this.value)" style="margin-bottom: 15px;">
    </div>

    <div id="fields">
        ${Object.entries(fieldGroups).map(([groupName, groupFields]) => this.generateGroupHtml(groupName, groupFields)).join('')}
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

  // 生成分组HTML
  protected generateGroupHtml(groupName: string, fields: SettingsField[]): string {
    const isPageMetadata = groupName === 'Page metadata';
    const collapsedClass = isPageMetadata ? '' : 'collapsed';
    const contentCollapsedClass = isPageMetadata ? '' : 'collapsed';

    return `
      <div class="field-group">
        <div class="group-header ${collapsedClass}" onclick="toggleGroup(this)">
          <span>${groupName}</span>
          <span class="group-toggle">▼</span>
        </div>
        <div class="group-content ${contentCollapsedClass}">
          ${fields.map(field => this.generateFieldHtml(field)).join('')}
        </div>
      </div>`;
  }

  protected getFieldGroups(): { [groupName: string]: SettingsField[] } {
    // 获取当前文件名作为默认标题
    const editor = vscode.window.activeTextEditor;
    let defaultTitle = '';
    if (editor) {
      const fileName = path.basename(editor.document.fileName, path.extname(editor.document.fileName));
      defaultTitle = fileName.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    // 获取现有frontmatter值
    const existingValues = this.getExistingFrontmatterValues();

    return getAllFrontmatterFieldGroups(existingValues, defaultTitle);
  }

  protected getFields(): SettingsField[] {
    const groups = this.getFieldGroups();
    const allFields: SettingsField[] = [];

    for (const [, fields] of Object.entries(groups)) {
      allFields.push(...fields);
    }

    return allFields;
  }

  // 构建允许的字段名白名单，防止意外的字段（如 '---'）被保存
  private getAllowedFieldNames(): Set<string> {
    const allowed = new Set<string>();
    const groups = this.getFieldGroups();
    for (const [, fields] of Object.entries(groups)) {
      for (const f of fields) {
        allowed.add(f.name);
      }
    }
    return allowed;
  }

  private getExistingFrontmatterValues(): { [key: string]: string } {
    if (!this._documentUri || !this._range) {
      return {};
    }

    // 找到对应的编辑器
    const editor = vscode.window.visibleTextEditors.find(
      editor => editor.document.uri.toString() === this._documentUri!.toString()
    );

    if (!editor) {
      return {};
    }

    const frontmatterText = editor.document.getText(this._range);
    const values: { [key: string]: string } = {};

    // 解析frontmatter，支持带引号的key
    const lines = frontmatterText.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#') && trimmedLine !== '---') {
        // 匹配 key: value 格式，支持带引号的key
        const match = trimmedLine.match(/^(['"]?)([^'":\s]+)\1:\s*(.*)$/);
        if (match) {
          const quote = match[1];
          const fieldName = match[2];
          const fullFieldName = quote ? `${quote}${fieldName}${quote}` : fieldName;
          let value = match[3].trim();

          // 移除值的引号
          if ((value.startsWith('"') && value.endsWith('"')) ||
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }

          values[fullFieldName] = value;
        }
      }
    }

    return values;
  }

  protected async handleIconSearch(query: string): Promise<void> {
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

  protected async handleSave(data: SettingsData): Promise<void> {
    if (!this._documentUri) {
      vscode.window.showErrorMessage('No document reference found');
      return;
    }

    // 确保目标编辑器是打开的
    let targetEditor = vscode.window.visibleTextEditors.find(
      editor => editor.document.uri.toString() === this._documentUri!.toString()
    );

    if (!targetEditor) {
      // 如果编辑器不可见，尝试打开它
      const document = await vscode.workspace.openTextDocument(this._documentUri);
      targetEditor = await vscode.window.showTextDocument(document, { preserveFocus: true });
    }

    if (!targetEditor) {
      vscode.window.showErrorMessage('Could not access the target document');
      return;
    }

    try {
      // 在每次保存前重新分析，确保Range是最新的（避免因行数变化导致Range失效）
      this.analyzeFrontmatter(targetEditor);
      const hasFrontmatter = !!this._range;

      let newFrontmatter = '';

      // 构建新的frontmatter（仅允许白名单字段）
      const allowed = this.getAllowedFieldNames();
      const fields = Object.entries(data).filter(([key, fieldData]) =>
        allowed.has(key) && fieldData.value && fieldData.value.trim() !== ''
      );

      if (fields.length === 0) {
        vscode.window.showInformationMessage('No fields to save');
        return;
      }

      if (hasFrontmatter && this._range) {
        // 更新现有frontmatter
        const existingFrontmatter = targetEditor.document.getText(this._range);
        console.log('=== UPDATE EXISTING FRONTMATTER ===');
        console.log('Range:', `${this._range.start.line}:${this._range.start.character} to ${this._range.end.line}:${this._range.end.character}`);
        console.log('Existing content:', JSON.stringify(existingFrontmatter));

        newFrontmatter = this.updateFrontmatterText(existingFrontmatter, data);
        console.log('New content:', JSON.stringify(newFrontmatter));
        console.log('Content length match:', existingFrontmatter.length, '->', newFrontmatter.length);

        const success = await targetEditor.edit((editBuilder: vscode.TextEditorEdit) => {
          editBuilder.replace(this._range!, newFrontmatter);
        });

        if (!success) {
          vscode.window.showErrorMessage('Failed to apply frontmatter changes');
          return;
        }
        console.log('=== UPDATE COMPLETED ===');
      } else {
        // 插入新的frontmatter
        console.log('=== INSERT NEW FRONTMATTER ===');
        const frontmatterLines = ['---'];
        for (const [fieldName, fieldData] of Object.entries(data)) {
          if (fieldData.value.trim() !== '') {
            let value = fieldData.value;
            // 如果是字符串且包含特殊字符，用引号包围
            if (fieldData.type === 'text' && (value.includes(' ') || value.includes(':'))) {
              value = `'${value}'`;
            }
            frontmatterLines.push(`${fieldName}: ${value}`);
          }
        }
        frontmatterLines.push('---');
        frontmatterLines.push(''); // 空行分隔

        newFrontmatter = frontmatterLines.join('\n');
        console.log('New frontmatter:', JSON.stringify(newFrontmatter));

        const success = await targetEditor.edit((editBuilder: vscode.TextEditorEdit) => {
          editBuilder.insert(new vscode.Position(0, 0), newFrontmatter);
        });

        if (!success) {
          vscode.window.showErrorMessage('Failed to insert frontmatter');
          return;
        }
        console.log('=== INSERT COMPLETED ===');
      }

      vscode.window.showInformationMessage('Frontmatter updated successfully');
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to update frontmatter: ${error}`);
    }
  }

  private updateFrontmatterText(existingText: string, data: SettingsData): string {
    console.log('Input existingText:', JSON.stringify(existingText));

    const lines = existingText.split('\n');

    // 解析现有的frontmatter字段（跳过 --- 行）
    const existingFields = new Map<string, string>();
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#') && trimmedLine !== '---') {
        // 匹配 key: value 格式，支持带引号的key
        const match = trimmedLine.match(/^(['"]?)([^'":\s]+)\1:\s*(.*)$/);
        if (match) {
          const quote = match[1];
          const fieldName = match[2];
          const fullFieldName = quote ? `${quote}${fieldName}${quote}` : fieldName;
          existingFields.set(fullFieldName, match[3]);
        }
      }
    }

    // 更新字段值
    for (const [fieldName, fieldData] of Object.entries(data)) {
      if (fieldData.value.trim() !== '') {
        let value = fieldData.value;
        // 如果值包含空格或冒号，用单引号包围
        if (fieldData.type === 'text' && (value.includes(' ') || value.includes(':'))) {
          value = `'${value}'`;
        }
        existingFields.set(fieldName, value);
      } else {
        // 如果新值为空，删除该字段
        existingFields.delete(fieldName);
      }
    }

    // 重建frontmatter - 格式必须与Range完全匹配
    const newFrontmatterLines = ['---'];
    for (const [fieldName, value] of existingFields) {
      newFrontmatterLines.push(`${fieldName}: ${value}`);
    }
    newFrontmatterLines.push('---');

    // 末尾添加换行，匹配标准Range（包含第二个 --- 后的换行）
    const result = newFrontmatterLines.join('\n') + '\n';
    console.log('Output result:', JSON.stringify(result));

    return result;
  }





  protected getWebviewScript(): string {
    return `
      ${this.getBaseWebviewScript()}

      // 分组折叠/展开功能
      function toggleGroup(header) {
        const content = header.nextElementSibling;
        const toggle = header.querySelector('.group-toggle');

        if (content.classList.contains('collapsed')) {
          content.classList.remove('collapsed');
          header.classList.remove('collapsed');
          toggle.textContent = '▼';
        } else {
          content.classList.add('collapsed');
          header.classList.add('collapsed');
          toggle.textContent = '▶';
        }
      }

      // 重写搜索功能以支持分组
      function filterFields(query) {
        const groups = document.querySelectorAll('.field-group');
        const searchTerm = query.toLowerCase();

        groups.forEach(group => {
          const fields = group.querySelectorAll('.property-group');
          let hasVisibleFields = false;

          fields.forEach(field => {
            const fieldName = field.getAttribute('data-field') || '';
            const label = field.querySelector('.property-label')?.textContent || '';
            const description = field.querySelector('.property-description')?.textContent || '';

            const matches = fieldName.toLowerCase().includes(searchTerm) ||
                           label.toLowerCase().includes(searchTerm) ||
                           description.toLowerCase().includes(searchTerm);

            field.style.display = matches ? 'block' : 'none';
            if (matches) hasVisibleFields = true;
          });

          // 如果搜索时有匹配的字段，展开分组
          if (query && hasVisibleFields) {
            const content = group.querySelector('.group-content');
            const header = group.querySelector('.group-header');
            const toggle = header.querySelector('.group-toggle');

            content.classList.remove('collapsed');
            header.classList.remove('collapsed');
            toggle.textContent = '▼';
          }

          // 隐藏没有匹配字段的分组
          group.style.display = hasVisibleFields || !query ? 'block' : 'none';
        });
      }

      let searchTimeout;

      // 图标搜索功能
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
      }

      // 处理图标搜索结果
      window.addEventListener('message', event => {
        const message = event.data;
        if (message.command === 'iconSearchResults') {
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
            resultsDiv.style.display = 'block';

            // 检查图标是否存在并显示正确的样式
            setTimeout(() => {
              resultsDiv.querySelectorAll('.icon-item').forEach(item => {
                const iconName = item.textContent.trim();
                const fasIcon = item.querySelector('.fas');
                const fabIcon = item.querySelector('.fab');
                const farIcon = item.querySelector('.far');

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
        }
      });

      function saveSettings() {
        const data = {};
        
        document.querySelectorAll('.property-group').forEach(group => {
          const fieldName = group.getAttribute('data-field');
          if (fieldName) {
            const input = group.querySelector('input, select');
            if (input && input.value && input.value.trim() !== '') {
              let fieldType = 'text';
              if (input.type === 'number') {
                fieldType = 'number';
              } else if (input.tagName === 'SELECT') {
                fieldType = 'select';
              } else if (fieldName === 'icon') {
                fieldType = 'searchable';
              }
              
              data[fieldName] = {
                value: input.value,
                type: fieldType
              };
            }
          }
        });
        
        vscode.postMessage({
          command: 'save',
          data: data
        });
      }

      function closePanel() {
        vscode.postMessage({ command: 'close' });
      }

      function searchIcons(query) {
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
          vscode.postMessage({
            command: 'searchIcons',
            query: ''
          });
        }
      }

      function selectIcon(iconName) {
        const iconInput = document.getElementById('icon');
        if (iconInput) {
          iconInput.value = iconName;
          const resultsDiv = document.getElementById('icon-results');
          resultsDiv.style.display = 'none';
        }
      }

      // 处理来自扩展的消息
      window.addEventListener('message', event => {
        const message = event.data;
        switch (message.command) {
          case 'iconSearchResults':
            const resultsDiv = document.getElementById('icon-results');
            if (resultsDiv) {
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
              
              // 检查图标是否存在
              setTimeout(() => {
                document.querySelectorAll('.icon-item').forEach(item => {
                  const icons = item.querySelectorAll('i');
                  const fasIcon = icons[0];
                  const fabIcon = icons[1];
                  const farIcon = icons[2];
                  
                  if (fasIcon && getComputedStyle(fasIcon, ':before').content === 'none') {
                    fasIcon.style.display = 'none';
                    fabIcon.style.display = 'inline';
                    
                    setTimeout(() => {
                      if (getComputedStyle(fabIcon, ':before').content === 'none') {
                        fabIcon.style.display = 'none';
                        farIcon.style.display = 'inline';
                      }
                    }, 10);
                  }
                });
              }, 10);
            }
            break;
        }
      });
    `;
  }

  public dispose() {
    FrontmatterSetterPanel.currentPanel = undefined;
    super.dispose();
  }
}
