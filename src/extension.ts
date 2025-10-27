/**
 * FlashMintlify - Fast and powerful Mintlify documentation development
 *
 * @author Match-Yang(OliverYeung)
 * @email oliver.yeung.me@gmail.com
 * @license MIT
 */
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';
import { createCompletionProviders } from './functions/Completion';
import { createFrontmatterProvider } from './functions/Frontmatter';

import { createSettingChangedListenerProvider } from './helpers/SettingChangedListenerProvider';
import { createCodeLensesProviders } from './functions/CodeLenses';
// import { createTerminologyQuickFixProviders } from './functions/TerminologyQuickFix'
import { createExplorerMenuProviders } from './functions/ExplorerMenu'
// import { createNavigationProviders } from './functions/Navigation'
import { createFileImportProviders } from './functions/FileImportProvider';
import { createFlashMintlifyLanguageServiceProvider } from './utils/FlashMintlifyLanguageServiceMain';
import { createInternalLinkProviders } from './functions/ProvidersBootstrap';
import { createPlaceholderProvider } from './functions/PlaceholderProvider';
import { PreviewPanel } from './webview/PreviewPanel';
import { PreviewSettingsPanel } from './webview/PreviewSettingsPanel';

/**
 * Check if the workspace root contains a docs.json file
 */
function checkDocsJsonExists(): boolean {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return false;
  }

  const rootPath = workspaceFolders[0].uri.fsPath;
  const docsJsonPath = path.join(rootPath, 'docs.json');

  try {
    return fs.existsSync(docsJsonPath);
  } catch (error) {
    console.error('Error checking docs.json existence:', error);
    return false;
  }
}

/**
 * Set the context key to indicate if this is a Mintlify project
 */
async function setMintlifyProjectContext(isMintlifyProject: boolean): Promise<void> {
  await vscode.commands.executeCommand('setContext', 'flashMintlify.isMintlifyProject', isMintlifyProject);
}

export async function activate(context: vscode.ExtensionContext) {
  // Check if the workspace root contains a docs.json file
  const isMintlifyProject = checkDocsJsonExists();

  // Set the context key to control UI visibility
  await setMintlifyProjectContext(isMintlifyProject);

  // Watch for docs.json changes to dynamically enable/disable features
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders && workspaceFolders.length > 0) {
    const rootPath = workspaceFolders[0].uri.fsPath;
    const docsJsonPattern = new vscode.RelativePattern(rootPath, 'docs.json');
    const watcher = vscode.workspace.createFileSystemWatcher(docsJsonPattern);

    watcher.onDidCreate(async () => {
      console.log('FlashMintlify: docs.json created, enabling extension features');
      await setMintlifyProjectContext(true);
      vscode.window.showInformationMessage('FlashMintlify: Mintlify project detected, extension features enabled');
    });

    watcher.onDidDelete(async () => {
      console.log('FlashMintlify: docs.json deleted, disabling extension features');
      await setMintlifyProjectContext(false);
      vscode.window.showWarningMessage('FlashMintlify: docs.json not found, extension features disabled');
    });

    context.subscriptions.push(watcher);
  }

  // If not a Mintlify project, do not activate the plugin features
  if (!isMintlifyProject) {
    console.log('FlashMintlify: docs.json not found in workspace root, extension features disabled');
    return;
  }

  console.log('FlashMintlify: docs.json found, activating extension features');
  const settingChangedListenerProvider = createSettingChangedListenerProvider();

  // Register AI command
  const writeWithAICommand = vscode.commands.registerCommand('flashMintlify.writeWithAI', async () => {
    vscode.window.showInformationMessage('Coming soon...');
  });

  const openPreviewCommand = vscode.commands.registerCommand('flashMintlify.preview.open', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor found');
      return;
    }
    const doc = editor.document;
    const filePath = doc.uri.fsPath;

    // Build internal path
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) {
      vscode.window.showErrorMessage('No workspace folder found');
      return;
    }
    const rel = path.relative(root, filePath).replace(/\\/g, '/').replace(/\.(md|mdx)$/i, '');

    // Special case: index.mdx in root directory should render as localhost:port, not localhost:port/index
    const internalPath = rel === 'index' ? '/' : '/' + rel;

    // Determine port and mode
    const cfg = vscode.workspace.getConfiguration('flashMintlify');
    const configuredPort = cfg.get<number>('preview.port', 3000);
    const mode = cfg.get<'beside' | 'fullscreen' | 'browser'>('preview.mode', 'browser');

    // // Try to detect the running port quickly: first try configured, then 3000-3010
    // const probePort = async (p: number): Promise<boolean> => {
    //   return new Promise(resolve => {
    //     const req = http.get({ host: 'localhost', port: p, path: '/_next/static/chunks/webpack.js' }, () => resolve(true));
    //     req.on('error', () => resolve(false));
    //     req.setTimeout(700, () => { try { req.destroy(); } catch {} resolve(false); });
    //   });
    // };

    // let port = configuredPort;
    // if (!(await probePort(port))) {
    //   for (let p = 3000; p <= 3010; p++) {
    //     if (await probePort(p)) { port = p; break; }
    //   }
    // }

    const targetUrl = `http://localhost:${configuredPort}${internalPath}`;

    if (mode === 'beside') {
      PreviewPanel.createOrShow(context.extensionUri, targetUrl, vscode.ViewColumn.Beside);
    } else if (mode === 'fullscreen') {
      PreviewPanel.createOrShow(context.extensionUri, targetUrl, vscode.ViewColumn.Active);
    } else {
      vscode.env.openExternal(vscode.Uri.parse(targetUrl));
    }
  });

  const openPreviewOptionsCommand = vscode.commands.registerCommand('flashMintlify.preview.options', async () => {
    PreviewSettingsPanel.createOrShow(context.extensionUri);
  });

  context.subscriptions.push(
    ...createCodeLensesProviders(context.extensionUri),
    ...createCompletionProviders(),
    ...createExplorerMenuProviders(),
    // ...createNavigationProviders(),
    ...createFileImportProviders(),
    ...createFlashMintlifyLanguageServiceProvider(),
    createFrontmatterProvider(context),
    createPlaceholderProvider(),
    writeWithAICommand,
    openPreviewCommand,
    openPreviewOptionsCommand,
    settingChangedListenerProvider
  );

  // bootstrap internal link providers (CodeLens + DocumentLink + StatusBar)
  createInternalLinkProviders(context);

}

export function deactivate() { }