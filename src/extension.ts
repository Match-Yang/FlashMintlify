// FlashMintlify - Fast and powerful Mintlify documentation development
import * as vscode from 'vscode';
import { createCompletionProviders } from './functions/Completion';
import { createFrontmatterProvider } from './functions/Frontmatter';

import { createSettingChangedListenerProvider } from './helpers/SettingChangedListenerProvider';
import { createCodeLensesProviders } from './functions/CodeLenses';
// import { createTerminologyQuickFixProviders } from './functions/TerminologyQuickFix'
import { createExplorerMenuProviders } from './functions/ExplorerMenu'
import { createNavigationProviders } from './functions/Navigation'
import { createFileImportProviders } from './functions/FileImportProvider';
import { createFlashMintlifyLanguageServiceProvider } from './utils/FlashMintlifyLanguageServiceMain';
import { createInternalLinkProviders } from './functions/ProvidersBootstrap';


export async function activate(context: vscode.ExtensionContext) {
  const settingChangedListenerProvider = createSettingChangedListenerProvider();

  context.subscriptions.push(
    ...createCodeLensesProviders(),
    ...createCompletionProviders(),
    ...createExplorerMenuProviders(),
    ...createNavigationProviders(),
    ...createFileImportProviders(),
    ...createFlashMintlifyLanguageServiceProvider(),
    createFrontmatterProvider(),

    settingChangedListenerProvider
  );

  // bootstrap internal link providers (CodeLens + DocumentLink + StatusBar)
  createInternalLinkProviders(context);

}

export function deactivate() { }