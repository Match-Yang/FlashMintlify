import * as vscode from 'vscode';
import { InternalLinkCodeLensProvider } from './InternalLinkProviders';

export function createInternalLinkProviders(context: vscode.ExtensionContext) {
  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBar.tooltip = 'Number of invalid internal links in current file';

  const codeLensProvider = new InternalLinkCodeLensProvider(statusBar);

  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider([{ language: 'markdown' }, { language: 'mdx' }], codeLensProvider),
    statusBar
  );
}

