import * as vscode from 'vscode';
import { SettingsPanel, SettingsField, SettingsData } from './SettingsPanel';

export class PreviewSettingsPanel extends SettingsPanel {
  public static currentPanel: PreviewSettingsPanel | undefined;

  public static createOrShow(extensionUri: vscode.Uri) {
    console.log('[PreviewSettings] createOrShow called, currentPanel exists:', !!PreviewSettingsPanel.currentPanel);

    if (PreviewSettingsPanel.currentPanel) {
      console.log('[PreviewSettings] Revealing existing panel');
      PreviewSettingsPanel.currentPanel._panel.reveal(vscode.ViewColumn.Two);
      return;
    }

    console.log('[PreviewSettings] Creating new panel');
    const panel = new PreviewSettingsPanel(extensionUri);
    PreviewSettingsPanel.currentPanel = panel;
  }

  private constructor(extensionUri: vscode.Uri) {
    super(extensionUri, 'flashMintlifyPreviewSettings', 'Set preview options');

    // 监听面板关闭事件，确保清理静态变量
    this._panel.onDidDispose(() => {
      console.log('[PreviewSettings] Panel disposed, cleaning up currentPanel');
      PreviewSettingsPanel.currentPanel = undefined;
    });

    this.updateContent(this.getFields());
  }

  public dispose() {
    console.log('[PreviewSettings] dispose() called');
    PreviewSettingsPanel.currentPanel = undefined;
    super.dispose();
  }

  protected async handleSave(data: SettingsData): Promise<void> {
    console.log('[PreviewSettings] handleSave called with data:', data);

    const cfg = vscode.workspace.getConfiguration('flashMintlify');
    const portValue = Number(data['preview.port']?.value ?? 3000);
    const modeValue = (data['preview.mode']?.value ?? 'browser') as 'beside' | 'fullscreen' | 'browser';

    console.log('[PreviewSettings] Raw form data:', data);
    console.log('[PreviewSettings] Parsed - port:', portValue, '(type:', typeof portValue, ') mode:', modeValue);
    console.log('[PreviewSettings] Port is valid number:', !isNaN(portValue) && portValue > 0);

    // 验证端口值
    if (isNaN(portValue) || portValue <= 0 || portValue > 65535) {
      vscode.window.showErrorMessage(`Invalid port number: ${portValue}. Please enter a valid port between 1 and 65535.`);
      return;
    }

    try {
      console.log('[PreviewSettings] Before save - inspect port:', cfg.inspect('preview.port'));

      await cfg.update('preview.port', portValue, vscode.ConfigurationTarget.Workspace);
      await cfg.update('preview.mode', modeValue, vscode.ConfigurationTarget.Workspace);

      console.log('[PreviewSettings] After save - inspect port:', cfg.inspect('preview.port'));
      console.log('[PreviewSettings] After save - get port:', cfg.get('preview.port'));

      // 验证保存是否成功
      const newCfg = vscode.workspace.getConfiguration('flashMintlify');
      const savedPort = newCfg.get<number>('preview.port');
      const savedMode = newCfg.get<string>('preview.mode');

      console.log('[PreviewSettings] Verification - saved port:', savedPort, 'saved mode:', savedMode);

      if (savedPort === portValue && savedMode === modeValue) {
        console.log('[PreviewSettings] Settings saved and verified successfully');

        // 强制触发配置更改事件
        vscode.workspace.onDidChangeConfiguration(e => {
          if (e.affectsConfiguration('flashMintlify.preview')) {
            console.log('[PreviewSettings] Configuration change detected');
          }
        });

        const action = await vscode.window.showInformationMessage(
          'Preview options saved successfully!',
          'OK',
          'Reload Window'
        );

        if (action === 'Reload Window') {
          vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
      } else {
        console.warn('[PreviewSettings] Settings saved but verification failed');
        vscode.window.showWarningMessage('Settings may not have been saved correctly. Check console for details.');
      }
    } catch (error) {
      console.error('[PreviewSettings] Failed to save settings:', error);
      vscode.window.showErrorMessage('Failed to save preview options: ' + error);
    }
  }

  protected async handleIconSearch(_query: string): Promise<void> {
    // No icon search in this panel; noop
    return;
  }

  protected getFields(): SettingsField[] {
    const cfg = vscode.workspace.getConfiguration('flashMintlify');
    const port = cfg.get<number>('preview.port', 3000);
    const mode = cfg.get<string>('preview.mode', 'browser');

    console.log('[PreviewSettings] getFields - Current port:', port, 'mode:', mode);
    console.log('[PreviewSettings] Config inspect port:', cfg.inspect('preview.port'));
    console.log('[PreviewSettings] Config inspect mode:', cfg.inspect('preview.mode'));

    return [
      {
        name: 'preview.port',
        type: 'number',
        label: 'Preview port',
        description: "Port where 'mint dev' is running",
        defaultValue: String(port),
        currentValue: String(port),
        placeholder: '3000'
      },
      {
        name: 'preview.mode',
        type: 'select',
        label: 'Preview mode',
        description: 'Choose how to open the preview',
        options: ['beside', 'fullscreen', 'browser'],
        defaultValue: mode,
        currentValue: mode
      }
    ];
  }

  protected getTitle(): string {
    return 'Set preview options';
  }

  protected getWebviewScript(): string {
    return `
      ${this.getBaseWebviewScript()}

      // Tweak UI for this lightweight settings panel
      document.addEventListener('DOMContentLoaded', function() {
        const sc = document.querySelector('.search-container');
        if (sc) { sc.style.display = 'none'; }
        const buttons = document.querySelector('.buttons');
        if (buttons) { buttons.style.justifyContent = 'flex-start'; }
        const sel = document.getElementById('preview.mode');
        if (sel && sel.tagName === 'SELECT') {
          const options = sel.options;
          for (let i = 0; i < options.length; i++) {
            const opt = options[i];
            if (opt.value === 'beside') opt.textContent = 'Preview in editor (beside)';
            if (opt.value === 'fullscreen') opt.textContent = 'Preview in editor (fullscreen)';
            if (opt.value === 'browser') opt.textContent = 'Open in browser';
          }
        }
      });

      function getFormData() {
        const fields = document.querySelectorAll('.property-group');
        const data = {};
        fields.forEach(function(field) {
          const id = field.getAttribute('data-field');
          const input = field.querySelector('.property-input');
          if (!id || !input) return;
          const tag = input.tagName ? input.tagName.toLowerCase() : '';
          const value = input.value;
          data[id] = { value: value, type: tag };
        });
        return data;
      }

      function saveSettings() {
        console.log('[PreviewSettings] saveSettings clicked');
        const data = getFormData();
        console.log('[PreviewSettings] Form data:', data);
        vscode.postMessage({ command: 'save', data: data });
      }

      function closePanel() {
        console.log('[PreviewSettings] closePanel clicked');
        vscode.postMessage({ command: 'close' });
      }
    `;
  }
}

