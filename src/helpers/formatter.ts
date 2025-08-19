
import * as vscode from 'vscode';

function formatContent(document: any) {
	if (document.languageId === 'markdown' || document.languageId === 'mdx') {
		const content = document.getText();
		const lines = content.split('\n');
		const newTextLines: string[] = [];

		lines.forEach((line: string) => {
			const regex = /\[(.*?)\]\((.*?)\)/g;
			const modifiedLine = line.replace(regex, (match, text, link) => {
				// link = decodeURI(link).toLowerCase().replace(/\s+/g, '-').replace(/%20/g, '-');
				if ((link.startsWith('./') || link.startsWith('../')) && link.endsWith(".mdx")) {
					link = link.replace(/\s+/g, '%20');
					return `[${text}](${link})`;
				}
				return match;
			});
			newTextLines.push(modifiedLine);
		});

		const newText = newTextLines.join('\n');
		const edit = new vscode.WorkspaceEdit();
		edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), newText);
		vscode.workspace.applyEdit(edit);
	}
}

export { formatContent }