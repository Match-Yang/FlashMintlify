import * as vscode from 'vscode'

function createFrontmatterProvider() {
	const provider = vscode.commands.registerCommand('flashMintlify.basic.frontmatter', async () => {

		let options = [
			{ label: 'Generation' , kind: vscode.QuickPickItemKind.Separator },
			{ label: 'date', picked: false, description: "Date of this page. Default: current date" },
			{ label: 'show_toc', picked: false, description: "Show table of contents in the page. Default: true" },
			{ label: 'articleID', picked: false, description: "Article ID of old link from doc.oa. Set this to generate the correct API links." },
			{ label: 'docType', picked: false, description: "Default: doc. Optional: doc/api. Document classification filter used for searching." },
			{ label: 'Basic' , kind: vscode.QuickPickItemKind.Separator },
			{ label: 'title', picked: false, description: "Title of this page. e.g. Quick start | My Site Name. The default is the combination of the article title with the 'title' configuration value in the docuo.config.json." },
			{ label: 'description', picked: false, description: "Description of this page. The default is the first line of the article body." },
			{ label: 'Page' , kind: vscode.QuickPickItemKind.Separator },
			{ label: 'id', picked: false, description: "ID of this article. e.g. quick-start/intro"},
			{ label: 'url', picked: false, description: "Once this option is set to a valid HTTP/HTTPS link, the page will become an external link. e.g. https://google.com" },
			{ label: 'SEO' , kind: vscode.QuickPickItemKind.Separator },
			{ label: 'og:site_name', picked: false },
			{ label: 'og:title', picked: false },
			{ label: 'og:description', picked: false },
			{ label: 'og:image', picked: false },
			{ label: 'og:url', picked: false },
			{ label: 'og:local', picked: false },
			{ label: 'og:logo', picked: false },
			{ label: 'og:image:width', picked: false },
			{ label: 'og:image:height', picked: false },
			{ label: 'twitter:title', picked: false },
			{ label: 'twitter:description', picked: false },
			{ label: 'twitter:url', picked: false },
			{ label: 'twitter:image', picked: false },
			{ label: 'twitter:site', picked: false },
			{ label: 'article:publisher', picked: false }
		];

		let selectedOptions = await vscode.window.showQuickPick(options, {
			canPickMany: true,
			placeHolder: 'Select the item to insert'
		});


		if (selectedOptions?.length  == 0) {
			return;
		}

		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}

		const content = editor.document.getText();
		let newFrontmatter = "";
		const hasFrontmatter = content.trim().startsWith('---');
		if (hasFrontmatter) {
			const lines = content.split('\n');
			let firstDashLineIndex = -1;
			for (let i = 0; i < lines.length; i++) {
				if (lines[i].trim() === '---') {
					firstDashLineIndex = i;
					break;
				}
			}
			let secondDashLineIndex = -1;
			for (let i = firstDashLineIndex + 1; i < lines.length; i++) {
				if (lines[i].trim() === '---') {
					secondDashLineIndex = i;
					break;
				}
			}
			editor.selection = new vscode.Selection(firstDashLineIndex + 1, 0, secondDashLineIndex, 0);
			const selectedText = editor.document.getText(editor.selection);
			newFrontmatter = selectedText;
			selectedOptions?.forEach(option => {
				if (!selectedText.includes(option.label)) {
					let defaultValue = "";
					if (option.description?.startsWith('Default:')) {
						const match = option.description.match(/^Default:\s*(\S+)\b/);
						if (match) {
							defaultValue = match[1]; // 获取默认值（即 doc）
						}
					}
					newFrontmatter += option.label + ": " + defaultValue + "\n";
				}
			});
			editor.edit(editBuilder => {
				editBuilder.replace(editor.selection, newFrontmatter);
			})

		} else {
			newFrontmatter += "---\n";
			if (selectedOptions) {
				selectedOptions.forEach(option => {
					let defaultValue = "";
					if (option.description?.startsWith('Default:')) {
						const match = option.description.match(/^Default:\s*(\S+)\b/);
						if (match) {
							defaultValue = match[1]; // 获取默认值（即 doc）
						}
					}
					newFrontmatter += option.label + ": " + defaultValue + "\n";
				});
			}
			newFrontmatter += "---\n";

			editor.edit(editBuilder => {
				editBuilder.insert(new vscode.Position(0, 0), newFrontmatter);
			});
		}
	});
	return provider;
}

export { createFrontmatterProvider }