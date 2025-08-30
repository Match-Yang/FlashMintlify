import * as vscode from 'vscode';
import { createMintlifyComponentCodeLensProvider } from './MintlifyComponentCodeLens';

class HeadingCodeLensProvider implements vscode.CodeLensProvider {
	provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
		const codeLenses: vscode.CodeLens[] = [];
		// Match headings in Markdown, including Chinese and other characters
		const regex = /^(#+)\s+(.*)$/gm;
		const anchorRegex = /<a\s+[^>]*id=["']([^"']+)["'][^>]*>/i;
		let match;

		while ((match = regex.exec(document.getText())) !== null) {
			const fullLineText = match[0];
			const range = new vscode.Range(
				document.positionAt(match.index),
				document.positionAt(match.index + match[0].length)
			);

			const anchorMatch = fullLineText.match(anchorRegex);
			if (anchorMatch) {
				const commandCopyAnchor: vscode.Command = {
					title: 'Copy Anchor',
					tooltip: 'Click to copy anchor id',
					command: 'flashMintlify.codelens.copyanchor',
					arguments: [range]
				};
				codeLenses.push(new vscode.CodeLens(range, commandCopyAnchor));
			} else {
				const commandGenerateAnchor: vscode.Command = {
					title: 'Generate Anchor',
					tooltip: 'Click to generate anchor tag',
					command: 'flashMintlify.codelens.generateanchor',
					arguments: [range]
				};
				codeLenses.push(new vscode.CodeLens(range, commandGenerateAnchor));
			}
		}

		return codeLenses;
	}

	resolveCodeLens?(codeLens: vscode.CodeLens, token: vscode.CancellationToken): vscode.CodeLens | Thenable<vscode.CodeLens> {
		return codeLens;
	}
}

class TableCodeLensProvider implements vscode.CodeLensProvider {
	provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
		const codeLenses: vscode.CodeLens[] = [];
		const lines = document.getText().split('\n');

		for (let i = 0; i < lines.length - 1; i++) {
			const currentLine = lines[i];
			const nextLine = lines[i + 1];

			// 检测表格标题行：当前行以|开头和|结尾，下一行是分隔行
			if (currentLine.trim().startsWith('|') && currentLine.trim().endsWith('|')) {
				if (this.isTableSeparatorLine(currentLine, nextLine)) {
					const range = new vscode.Range(i, 0, i, currentLine.length);

					const setWidthCommand = {
						title: 'Set Width',
						tooltip: 'Set column width for current cursor position',
						command: 'flashMintlify.codelens.table.setwidth',
						arguments: [range, i, currentLine]
					};

					const setAlignmentCommand = {
						title: 'Set Alignment',
						tooltip: 'Set column alignment for current cursor position',
						command: 'flashMintlify.codelens.table.setalignment',
						arguments: [range, i, currentLine]
					};

					const mergeCommand = {
						title: 'Merge',
						tooltip: 'Merge table cells for current cursor position',
						command: 'flashMintlify.codelens.table.merge',
						arguments: [range, i, currentLine]
					};

					codeLenses.push(new vscode.CodeLens(range, setWidthCommand));
					codeLenses.push(new vscode.CodeLens(range, setAlignmentCommand));
					codeLenses.push(new vscode.CodeLens(range, mergeCommand));
				}
			}
		}

		return codeLenses;
	}

	private isTableSeparatorLine(headerLine: string, separatorLine: string): boolean {
		// 检查分隔行是否以|开头和|结尾
		if (!separatorLine.trim().startsWith('|') || !separatorLine.trim().endsWith('|')) {
			return false;
		}

		// 计算表头的列数
		const headerColumns = headerLine.split('|').filter(col => col.trim() !== '').length;

		// 计算分隔行的列数，并检查每列是否包含连接符
		const separatorColumns = separatorLine.split('|').filter(col => col.trim() !== '');

		// 列数必须相同
		if (headerColumns !== separatorColumns.length) {
			return false;
		}

		// 每个分隔列都必须包含连接符（- 或 :）
		for (const col of separatorColumns) {
			const trimmedCol = col.trim();
			if (!trimmedCol.includes('-') && !trimmedCol.includes(':')) {
				return false;
			}
		}

		return true;
	}

	private isSeparatorLine(line: string): boolean {
		// 检查是否是分隔行（包含连接符的行）
		const columns = line.split('|').filter(col => col.trim() !== '');

		for (const col of columns) {
			const trimmedCol = col.trim();
			if (!trimmedCol.includes('-') && !trimmedCol.includes(':')) {
				return false;
			}
		}

		return columns.length > 0;
	}

	resolveCodeLens?(codeLens: vscode.CodeLens, token: vscode.CancellationToken): vscode.CodeLens | Thenable<vscode.CodeLens> {
		return codeLens;
	}
}


function createCodeLensesProviders(extensionUri?: vscode.Uri) {
	const headingIdProvider = vscode.languages.registerCodeLensProvider(
		[{ language: 'markdown', scheme: 'file' }, { language: 'mdx', scheme: 'file' }],
		new HeadingCodeLensProvider()
	)

	// const tableProvider = vscode.languages.registerCodeLensProvider(
	// 	[{ language: 'markdown', scheme: 'file' }, { language: 'mdx', scheme: 'file' }],
	// 	new TableCodeLensProvider()
	// )

	const copyHeadingIdCommand = vscode.commands.registerCommand('flashMintlify.codelens.copyheadingid', (headingText: string) => {
		const headingId = headingText.toLowerCase().replace(/\s+/g, '-').replace(/[^\p{L}\p{N}-]/gu, '');
		vscode.env.clipboard.writeText(`#${headingId}`);
		vscode.window.showInformationMessage('Heading ID copied');
	});

	// 生成锚点命令
	const generateAnchorCommand = vscode.commands.registerCommand('flashMintlify.codelens.generateanchor', async (range: vscode.Range) => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) return;
		const document = editor.document;
		const text = document.getText(range);
		const anchorRegex = /<a\s+[^>]*id=["']([^"']+)["'][^>]*>/i;
		if (anchorRegex.test(text)) {
			vscode.window.showInformationMessage('Anchor already exists.');
			return;
		}
		const headingText = text
			.replace(/^#+\s+/, '')
			.replace(/\s*<a\s+[^>]*id=["'][^"']+["'][^>]*\/>\s*$/i, '')
			.replace(/\s*<a\s+[^>]*id=["'][^"']+["'][^>]*>\s*<\/a>\s*$/i, '')
			.trim();
		const headingId = headingText.toLowerCase().replace(/\s+/g, '-').replace(/[^\p{L}\p{N}-]/gu, '');
		const newLine = `${text.trimEnd()} <a id="${headingId}" />`;
		editor.edit(editBuilder => {
			editBuilder.replace(range, newLine);
		}).then(success => {
			if (success) {
				vscode.window.showInformationMessage('Anchor generated');
			} else {
				vscode.window.showErrorMessage('Failed to generate anchor');
			}
		});
	});

	// 复制锚点命令
	const copyAnchorCommand = vscode.commands.registerCommand('flashMintlify.codelens.copyanchor', async (range: vscode.Range) => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) return;
		const document = editor.document;
		const text = document.getText(range);
		const anchorRegex = /<a\s+[^>]*id=["']([^"']+)["'][^>]*>/i;
		const m = text.match(anchorRegex);
		if (m && m[1]) {
			await vscode.env.clipboard.writeText(`#${m[1]}`);
			vscode.window.showInformationMessage('Anchor copied');
		} else {
			vscode.window.showWarningMessage('No anchor id found');
		}
	});


	// // 表格设置宽度命令
	// const setTableWidthCommand = vscode.commands.registerCommand('flashMintlify.codelens.table.setwidth', async (range: vscode.Range, lineIndex: number, lineText: string) => {
	// 	const editor = vscode.window.activeTextEditor;
	// 	if (!editor) return;

	// 	// 计算当前光标所在的列
	// 	const cursorPosition = editor.selection.active;
	// 	let columnIndex = 0;
	// 	if (cursorPosition.line === lineIndex) {
	// 		const beforeCursor = lineText.substring(0, cursorPosition.character);
	// 		columnIndex = Math.max(0, (beforeCursor.match(/\|/g) || []).length - 1);
	// 	}

	// 	const width = await vscode.window.showInputBox({
	// 		prompt: 'Enter column width (e.g., 50%)',
	// 		placeHolder: '50%'
	// 	});

	// 	if (width) {
	// 		const columns = lineText.split('|').map(col => col.trim()).filter(col => col !== '');
	// 		if (columnIndex < columns.length) {
	// 			// 移除现有的宽度设置
	// 			let columnText = columns[columnIndex].replace(/-\d+%?/, '');
	// 			// 添加新的宽度设置
	// 			columnText += `-${width}`;
	// 			columns[columnIndex] = columnText;

	// 			const newLineText = '|' + columns.join(' | ') + '|';
	// 			editor.edit(editBuilder => {
	// 				editBuilder.replace(range, newLineText);
	// 			});
	// 		}
	// 	}
	// });

	// // 表格设置对齐命令
	// const setTableAlignmentCommand = vscode.commands.registerCommand('flashMintlify.codelens.table.setalignment', async (range: vscode.Range, lineIndex: number, lineText: string) => {
	// 	const editor = vscode.window.activeTextEditor;
	// 	if (!editor) return;

	// 	// 计算当前光标所在的列
	// 	const cursorPosition = editor.selection.active;
	// 	let columnIndex = 0;
	// 	if (cursorPosition.line === lineIndex) {
	// 		const beforeCursor = lineText.substring(0, cursorPosition.character);
	// 		columnIndex = Math.max(0, (beforeCursor.match(/\|/g) || []).length - 1);
	// 	}

	// 	const alignment = await vscode.window.showQuickPick([
	// 		{ label: 'Left', value: 'l', description: 'Left alignment' },
	// 		{ label: 'Center', value: 'c', description: 'Center alignment' },
	// 		{ label: 'Right', value: 'r', description: 'Right alignment' }
	// 	], {
	// 		placeHolder: 'Select column alignment'
	// 	});

	// 	if (alignment) {
	// 		const columns = lineText.split('|').map(col => col.trim()).filter(col => col !== '');
	// 		if (columnIndex < columns.length) {
	// 			// 移除现有的对齐设置
	// 			let columnText = columns[columnIndex].replace(/-[lcr]$/, '');
	// 			// 添加新的对齐设置
	// 			columnText += `-${alignment.value}`;
	// 			columns[columnIndex] = columnText;

	// 			const newLineText = '|' + columns.join(' | ') + '|';
	// 			editor.edit(editBuilder => {
	// 				editBuilder.replace(range, newLineText);
	// 			});
	// 		}
	// 	}
	// });

	// // 表格合并单元格命令
	// const mergeTableCellCommand = vscode.commands.registerCommand('flashMintlify.codelens.table.merge', async (range: vscode.Range, lineIndex: number, lineText: string) => {
	// 	const editor = vscode.window.activeTextEditor;
	// 	if (!editor) return;

	// 	const cursorPosition = editor.selection.active;
	// 	const document = editor.document;
	// 	const lines = document.getText().split('\n');

	// 	// 找到光标所在的表格行
	// 	let targetLineIndex = cursorPosition.line;
	// 	let targetLine = lines[targetLineIndex];

	// 	// 检查光标是否在表格区域内
	// 	if (!targetLine.trim().startsWith('|') || !targetLine.trim().endsWith('|')) {
	// 		vscode.window.showWarningMessage('请将光标放在表格单元格内');
	// 		return;
	// 	}

	// 	// 检查是否是分隔行
	// 	const columns = targetLine.split('|').filter(col => col.trim() !== '');
	// 	let isSeparator = true;
	// 	for (const col of columns) {
	// 		const trimmedCol = col.trim();
	// 		if (!trimmedCol.includes('-') && !trimmedCol.includes(':')) {
	// 			isSeparator = false;
	// 			break;
	// 		}
	// 	}

	// 	if (isSeparator) {
	// 		vscode.window.showWarningMessage('请将光标放在表格单元格内容中，而不是分隔行');
	// 		return;
	// 	}

	// 	// 计算当前光标所在的列
	// 	const beforeCursor = targetLine.substring(0, cursorPosition.character);
	// 	const pipeCount = (beforeCursor.match(/\|/g) || []).length;

	// 	// 检查光标是否在单元格内（不在|符号上）
	// 	if (pipeCount === 0 || targetLine[cursorPosition.character] === '|') {
	// 		vscode.window.showWarningMessage('请将光标放在表格单元格内容中，而不是在分隔符上');
	// 		return;
	// 	}

	// 	const mergeDirection = await vscode.window.showQuickPick([
	// 		{ label: 'Merge Up', value: 'up', description: 'Merge with cell above' },
	// 		{ label: 'Merge Down', value: 'down', description: 'Merge with cell below' },
	// 		{ label: 'Merge Left', value: 'left', description: 'Merge with cell to the left' },
	// 		{ label: 'Merge Right', value: 'right', description: 'Merge with cell to the right' }
	// 	], {
	// 		placeHolder: 'Select merge direction'
	// 	});

	// 	if (mergeDirection) {
	// 		// 获取光标所在的单元格位置
	// 		const columnIndex = Math.max(0, pipeCount - 1);
	// 		const targetColumns = targetLine.split('|').map(col => col.trim()).filter(col => col !== '');

	// 		if (columnIndex < targetColumns.length) {
	// 			// 根据合并方向设置对应的标记
	// 			let mergeMarker = '';
	// 			switch (mergeDirection.value) {
	// 				case 'up':
	// 					mergeMarker = '!mu';
	// 					break;
	// 				case 'down':
	// 					mergeMarker = '!md';
	// 					break;
	// 				case 'left':
	// 					mergeMarker = '!ml';
	// 					break;
	// 				case 'right':
	// 					mergeMarker = '!mr';
	// 					break;
	// 			}

	// 			// 替换当前单元格内容为合并标记
	// 			targetColumns[columnIndex] = mergeMarker;
	// 			const newLineText = '|' + targetColumns.join(' | ') + '|';

	// 			const targetRange = new vscode.Range(targetLineIndex, 0, targetLineIndex, targetLine.length);
	// 			editor.edit(editBuilder => {
	// 				editBuilder.replace(targetRange, newLineText);
	// 			}).then(success => {
	// 				if (success) {
	// 					vscode.window.showInformationMessage(`单元格已设置为${mergeDirection.label}标记: ${mergeMarker}`);
	// 				} else {
	// 					vscode.window.showErrorMessage('合并标记设置失败');
	// 				}
	// 			});
	// 		}
	// 	}
	// });

	// 创建Mintlify组件CodeLens提供器
	const mintlifyComponentProviders = createMintlifyComponentCodeLensProvider(extensionUri);

	return [
		headingIdProvider,
		copyHeadingIdCommand,
		/*tableProvider, setTableWidthCommand, setTableAlignmentCommand, mergeTableCellCommand,*/
		generateAnchorCommand,
		copyAnchorCommand,
		...mintlifyComponentProviders
	]
}

export { createCodeLensesProviders };