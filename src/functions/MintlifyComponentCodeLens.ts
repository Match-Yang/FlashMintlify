/**
 * FlashMintlify - Mintlify component CodeLens provider
 *
 * @author Match-Yang(OliverYeung)
 * @email oliver.yeung.me@gmail.com
 * @license MIT
 */
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { PropertySetterPanel } from '../webview/PropertySetterPanel';

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

class MintlifyComponentCodeLensProvider implements vscode.CodeLensProvider {
  private config: MintlifyConfig | null = null;

  constructor() {
    this.loadConfig();
  }

  private loadConfig() {
    try {
      // 尝试多个可能的配置文件路径
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
        this.config = JSON.parse(configContent);
      } else {
        console.error('Mintlify components config file not found in any expected location');
      }
    } catch (error) {
      console.error('Failed to load Mintlify components config:', error);
    }
  }

  provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
    if (!this.config) {
      return [];
    }

    const codeLenses: vscode.CodeLens[] = [];
    const text = document.getText();
    
    // 匹配Mintlify组件标签 (支持自闭合和开放标签)
    const componentRegex = /<(\w+)([^>]*?)(?:\s*\/?>|>)/g;
    let match;

    while ((match = componentRegex.exec(text)) !== null) {
      const componentName = match[1];
      const attributesText = match[2];
      
      // 检查是否是Mintlify组件
      if (this.config.components[componentName]) {
        const startPos = document.positionAt(match.index);
        const endPos = document.positionAt(match.index + match[0].length);
        const range = new vscode.Range(startPos, endPos);

        // 解析现有属性
        const existingAttributes = this.parseAttributes(attributesText);

        // 创建设置属性的CodeLens
        const setAttributeCommand: vscode.Command = {
          title: '⚙️ Set Properties',
          tooltip: `Set properties for ${componentName} component`,
          command: 'flashMintlify.component.setAttributes',
          arguments: [componentName, range, existingAttributes]
        };

        codeLenses.push(new vscode.CodeLens(range, setAttributeCommand));
      }
    }

    return codeLenses;
  }

  private parseAttributes(attributesText: string): { [key: string]: string } {
    const attributes: { [key: string]: string } = {};
    
    // 匹配属性：name="value" 或 name={value} 或 name (布尔属性)
    const attrRegex = /(\w+)(?:=(?:"([^"]*)"|{([^}]*)}|([^\s>]+)))?/g;
    let match;

    while ((match = attrRegex.exec(attributesText)) !== null) {
      const attrName = match[1];
      const attrValue = match[2] || match[3] || match[4] || 'true'; // 如果没有值，默认为true（布尔属性）
      attributes[attrName] = attrValue;
    }

    return attributes;
  }

  resolveCodeLens?(codeLens: vscode.CodeLens, token: vscode.CancellationToken): vscode.CodeLens | Thenable<vscode.CodeLens> {
    return codeLens;
  }
}

// 所有属性设置逻辑现在都在PropertySetterPanel WebView中处理

async function updateComponentAttribute(range: vscode.Range, attrName: string, attrValue: string, attrType: string) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  const document = editor.document;
  const componentText = document.getText(range);
  
  // 如果值为空字符串，表示删除属性
  if (attrValue === '') {
    const newText = removeAttribute(componentText, attrName);
    await editor.edit(editBuilder => {
      editBuilder.replace(range, newText);
    });
    vscode.window.showInformationMessage(`Removed ${attrName} attribute`);
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

  const newText = updateAttribute(componentText, attrName, formattedValue);
  
  await editor.edit(editBuilder => {
    editBuilder.replace(range, newText);
  });

  vscode.window.showInformationMessage(`Set ${attrName} to ${attrValue}`);
}

function updateAttribute(componentText: string, attrName: string, formattedValue: string): string {
  // 更精确的属性匹配正则表达式
  const existingAttrRegex = new RegExp(`\\s+${attrName}(?:=(?:"[^"]*"|{[^}]*}|[^\\s/>]+))?(?=\\s|/?>)`, 'g');

  if (existingAttrRegex.test(componentText)) {
    // 替换现有属性
    const newRegex = new RegExp(`\\s+${attrName}(?:=(?:"[^"]*"|{[^}]*}|[^\\s/>]+))?(?=\\s|/?>)`, 'g');
    return componentText.replace(newRegex, ` ${formattedValue}`);
  } else {
    // 添加新属性
    // 在组件名后添加属性，但要考虑已有属性的情况
    const componentNameMatch = componentText.match(/^<(\w+)(\s[^>]*)?/);
    if (componentNameMatch) {
      const componentName = componentNameMatch[1];
      const existingAttrs = componentNameMatch[2] || '';

      // 在现有属性后添加新属性
      return componentText.replace(
        new RegExp(`<${componentName}${existingAttrs.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
        `<${componentName}${existingAttrs} ${formattedValue}`
      );
    }
  }

  return componentText;
}

function removeAttribute(componentText: string, attrName: string): string {
  // 移除属性及其值
  const attrRegex = new RegExp(`\\s*\\b${attrName}(?:=(?:"[^"]*"|{[^}]*}|[^\\s>]+))?`, 'g');
  return componentText.replace(attrRegex, '');
}

function createMintlifyComponentCodeLensProvider(extensionUri?: vscode.Uri) {
  const provider = vscode.languages.registerCodeLensProvider(
    [{ language: 'markdown', scheme: 'file' }, { language: 'mdx', scheme: 'file' }],
    new MintlifyComponentCodeLensProvider()
  );

  const setAttributesCommand = vscode.commands.registerCommand(
    'flashMintlify.component.setAttributes',
    (componentName: string, range: vscode.Range, existingAttributes: { [key: string]: string }) => {
      if (extensionUri) {
        PropertySetterPanel.createOrShow(extensionUri, componentName, range, existingAttributes);
      } else {
        vscode.window.showErrorMessage('Extension URI not available');
      }
    }
  );

  return [provider, setAttributesCommand];
}

export { createMintlifyComponentCodeLensProvider };
