/**
 * FlashMintlify - Frontmatter management functionality
 *
 * @author Match-Yang(OliverYeung)
 * @email oliver.yeung.me@gmail.com
 * @license MIT
 */
import * as vscode from 'vscode'
import * as path from 'path'
import { FrontmatterSetterPanel } from '../webview/FrontmatterSetterPanel'

function createFrontmatterProvider(context: vscode.ExtensionContext) {
	const provider = vscode.commands.registerCommand('flashMintlify.basic.frontmatter', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showErrorMessage('No active editor found');
			return;
		}

		// 使用新的设置面板
		FrontmatterSetterPanel.createOrShow(context.extensionUri);



	});
	return provider;
}

export { createFrontmatterProvider }