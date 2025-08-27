// FlashMintlify - Fast and powerful Mintlify documentation development
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
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

/**
 * Check if the workspace root contains a mint.json file
 */
function checkMintJsonExists(): boolean {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return false;
  }

  const rootPath = workspaceFolders[0].uri.fsPath;
  const mintJsonPath = path.join(rootPath, 'mint.json');
  
  try {
    return fs.existsSync(mintJsonPath);
  } catch (error) {
    console.error('Error checking mint.json existence:', error);
    return false;
  }
}

export async function activate(context: vscode.ExtensionContext) {
  // Check if the workspace root contains a mint.json file, if not, do not activate the plugin features
  if (!checkMintJsonExists()) {
    console.log('FlashMintlify: mint.json not found in workspace root, extension features disabled');
    return;
  }

  console.log('FlashMintlify: mint.json found, activating extension features');
  const settingChangedListenerProvider = createSettingChangedListenerProvider();

  // Register AI command
  const writeWithAICommand = vscode.commands.registerCommand('flashMintlify.writeWithAI', async () => {
    vscode.window.showInformationMessage('Coming soon...');
  });

  context.subscriptions.push(
    ...createCodeLensesProviders(),
    ...createCompletionProviders(),
    ...createExplorerMenuProviders(),
    // ...createNavigationProviders(),
    ...createFileImportProviders(),
    ...createFlashMintlifyLanguageServiceProvider(),
    createFrontmatterProvider(),
    createPlaceholderProvider(),
    writeWithAICommand,
    settingChangedListenerProvider
  );

  // bootstrap internal link providers (CodeLens + DocumentLink + StatusBar)
  createInternalLinkProviders(context);

}

export function deactivate() { }