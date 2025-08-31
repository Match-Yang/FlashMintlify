/**
 * FlashMintlify - FontAwesome icon provider for completion
 *
 * @author Match-Yang(OliverYeung)
 * @email oliver.yeung.me@gmail.com
 * @license MIT
 */
import * as vscode from 'vscode';
import * as https from 'https';

interface FontAwesomeIcon {
  id: string;
  label: string;
  unicode: string;
  styles: string[];
  categories: string[];
  search?: {
    terms: string[];
  };
}

interface FontAwesomeResponse {
  icons: { [key: string]: FontAwesomeIcon };
}

class FontAwesomeIconProvider {
  private icons: FontAwesomeIcon[] = [];
  private iconsLoaded = false;

  constructor() {
    this.loadIcons();
  }

  private async loadIcons(): Promise<void> {
    try {
      // 使用FontAwesome的免费图标API
      const iconData = await this.fetchFontAwesomeIcons();
      if (iconData && iconData.icons) {
        this.icons = Object.entries(iconData.icons).map(([id, icon]) => ({
          ...icon,
          id
        }));
        this.iconsLoaded = true;
      }
    } catch (error) {
      console.error('Failed to load FontAwesome icons:', error);
      // 如果API失败，使用预定义的常用图标列表
      this.loadFallbackIcons();
    }
  }

  private fetchFontAwesomeIcons(): Promise<FontAwesomeResponse> {
    return new Promise((resolve, reject) => {
      // 使用FontAwesome的免费图标元数据
      const url = 'https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/metadata/icons.json';
      
      https.get(url, (response) => {
        let data = '';
        
        response.on('data', (chunk) => {
          data += chunk;
        });
        
        response.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed);
          } catch (error) {
            reject(error);
          }
        });
      }).on('error', (error) => {
        reject(error);
      });
    });
  }

  private loadFallbackIcons(): void {
    // 预定义的常用图标列表作为后备
    const fallbackIcons = [
      'home', 'user', 'search', 'heart', 'star', 'flag', 'bell', 'envelope', 'phone', 'calendar',
      'clock', 'map-marker-alt', 'globe', 'link', 'external-link-alt', 'file', 'folder', 'image',
      'video', 'music', 'code', 'terminal', 'database', 'server', 'cloud', 'wifi', 'bluetooth',
      'battery-full', 'volume-up', 'play', 'pause', 'stop', 'forward', 'backward', 'repeat',
      'random', 'expand', 'compress', 'info-circle', 'exclamation-triangle', 'check-circle',
      'times-circle', 'question-circle', 'shield-alt', 'key', 'tag', 'bookmark', 'filter',
      'sort', 'th', 'list', 'table', 'chart-bar', 'chart-line', 'chart-pie', 'trending-up',
      'trending-down', 'users', 'user-friends', 'comments', 'thumbs-up', 'thumbs-down',
      'plus', 'minus', 'edit', 'trash', 'save', 'download', 'upload', 'share', 'copy',
      'cut', 'undo', 'redo', 'sync', 'lock', 'unlock', 'eye', 'eye-slash', 'cog', 'bars'
    ];

    this.icons = fallbackIcons.map(id => ({
      id,
      label: id.replace(/-/g, ' '),
      unicode: '',
      styles: ['solid'],
      categories: []
    }));
    this.iconsLoaded = true;
  }

  async searchIcons(query: string): Promise<FontAwesomeIcon[]> {
    // 等待图标加载完成
    while (!this.iconsLoaded) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (!query) {
      return this.icons.slice(0, 50); // 返回前50个图标
    }

    const lowerQuery = query.toLowerCase();
    return this.icons.filter(icon => {
      // 搜索图标ID
      if (icon.id.toLowerCase().includes(lowerQuery)) {
        return true;
      }
      
      // 搜索标签
      if (icon.label.toLowerCase().includes(lowerQuery)) {
        return true;
      }
      
      // 搜索搜索词
      if (icon.search?.terms) {
        return icon.search.terms.some(term => 
          term.toLowerCase().includes(lowerQuery)
        );
      }
      
      return false;
    }).slice(0, 50); // 限制结果数量
  }

  async showIconPicker(currentValue?: string): Promise<string | undefined> {
    const quickPick = vscode.window.createQuickPick();
    quickPick.placeholder = 'Search for FontAwesome icons...';
    quickPick.matchOnDescription = true;
    quickPick.matchOnDetail = true;

    // 初始加载
    const initialIcons = await this.searchIcons('');
    quickPick.items = this.formatIconItems(initialIcons, currentValue);

    // 监听输入变化
    quickPick.onDidChangeValue(async (value) => {
      quickPick.busy = true;
      try {
        const searchResults = await this.searchIcons(value);
        quickPick.items = this.formatIconItems(searchResults, currentValue);
      } catch (error) {
        console.error('Error searching icons:', error);
      } finally {
        quickPick.busy = false;
      }
    });

    return new Promise((resolve) => {
      quickPick.onDidAccept(() => {
        const selected = quickPick.selectedItems[0];
        if (selected) {
          if (selected.label === '$(edit) Custom value...') {
            quickPick.hide();
            // 显示自定义输入框
            vscode.window.showInputBox({
              prompt: 'Enter custom icon value',
              value: currentValue || '',
              placeHolder: 'Icon name, URL, or file path'
            }).then(resolve);
          } else {
            resolve(selected.detail);
          }
        } else {
          resolve(undefined);
        }
        quickPick.hide();
      });

      quickPick.onDidHide(() => {
        resolve(undefined);
      });

      quickPick.show();
    });
  }

  private formatIconItems(icons: FontAwesomeIcon[], currentValue?: string): vscode.QuickPickItem[] {
    const items: vscode.QuickPickItem[] = [];

    // 添加自定义输入选项
    items.push({
      label: '$(edit) Custom value...',
      description: 'Enter a custom icon value',
      detail: ''
    });

    // 添加图标选项
    icons.forEach(icon => {
      const isCurrent = currentValue === icon.id;
      items.push({
        label: `$(symbol-misc) ${icon.id}`,
        description: isCurrent ? '(current)' : icon.label,
        detail: icon.id,
        picked: isCurrent
      });
    });

    return items;
  }

  isValidIcon(iconName: string): boolean {
    return this.icons.some(icon => icon.id === iconName);
  }
}

// 单例实例
let fontAwesomeProvider: FontAwesomeIconProvider | null = null;

export function getFontAwesomeProvider(): FontAwesomeIconProvider {
  if (!fontAwesomeProvider) {
    fontAwesomeProvider = new FontAwesomeIconProvider();
  }
  return fontAwesomeProvider;
}
