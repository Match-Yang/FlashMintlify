import * as vscode from 'vscode';


// CompletionItemProvider for slash commands
class SlashCommandCompletionItemProvider implements vscode.CompletionItemProvider {
	provideCompletionItems(
		document: vscode.TextDocument, 
		position: vscode.Position, 
		token: vscode.CancellationToken,
		context: vscode.CompletionContext
	): Thenable<vscode.CompletionItem[]> {
		
		const line = document.lineAt(position.line);
		const prefix = line.text.substring(0, position.character);
		
		// Only trigger slash commands at line start or after whitespace
		if (!prefix.trim().endsWith('/')) {
			return Promise.resolve([]);
		}

		// Check if inside parentheses or quotes, don't trigger if so
		const fullLineText = line.text;
		let inParentheses = false;
		let inDoubleQuotes = false;
		let inSingleQuotes = false;
		
		for (let i = 0; i < position.character; i++) {
			const char = fullLineText[i];
			const prevChar = i > 0 ? fullLineText[i - 1] : '';
			
			// Check parentheses status (ignore escaped parentheses)
			if (char === '(' && prevChar !== '\\') {
				inParentheses = true;
			} else if (char === ')' && prevChar !== '\\') {
				inParentheses = false;
			}
			
			// Check double quote status (ignore escaped quotes)
			if (char === '"' && prevChar !== '\\') {
				inDoubleQuotes = !inDoubleQuotes;
			}
			
			// Check single quote status (ignore escaped quotes)
			if (char === "'" && prevChar !== '\\') {
				inSingleQuotes = !inSingleQuotes;
			}
		}
		
		// Don't trigger slash commands if inside parentheses or quotes
		if (inParentheses || inDoubleQuotes || inSingleQuotes) {
			return Promise.resolve([]);
		}

		const completionItems: vscode.CompletionItem[] = [];

		// Component Commands
		const componentCommands = [
			{
				label: '🧩 Note',
				detail: 'Insert note callout',
				description: 'Note callout component',
				insertText: '<Note>\n${1:This adds a note in the content}\n</Note>',
				kind: vscode.CompletionItemKind.Snippet
			},
			{
				label: '🧩 Tip',
				detail: 'Insert tip callout',
				description: 'Tip callout component',
				insertText: '<Tip>\n${1:This suggests a helpful tip}\n</Tip>',
				kind: vscode.CompletionItemKind.Snippet
			},
			{
				label: '🧩 Warning',
				detail: 'Insert warning callout',
				description: 'Warning callout component',
				insertText: '<Warning>\n${1:This raises a warning to watch out for}\n</Warning>',
				kind: vscode.CompletionItemKind.Snippet
			},
			{
				label: '🧩 Info',
				detail: 'Insert info callout',
				description: 'Info callout component',
				insertText: '<Info>\n${1:This draws attention to important information}\n</Info>',
				kind: vscode.CompletionItemKind.Snippet
			},
			{
				label: '🧩 Check',
				detail: 'Insert check callout',
				description: 'Check callout component',
				insertText: '<Check>\n${1:This brings us a checked status}\n</Check>',
				kind: vscode.CompletionItemKind.Snippet
			},
			{
				label: '🧩 Danger',
				detail: 'Insert danger callout',
				description: 'Danger callout component',
				insertText: '<Danger>\n${1:This is a danger callout}\n</Danger>',
				kind: vscode.CompletionItemKind.Snippet
			},
			{
				label: '🧩 Frame',
				detail: 'Insert image frame',
				description: 'Image frame component',
				insertText: '<Frame caption="${1:Optional image caption}">\n  <img src="${2:/path/to/image.jpg}" alt="${3:Alt text}" />\n</Frame>',
				kind: vscode.CompletionItemKind.Snippet
			},
			{
				label: '🧩 Icon',
				detail: 'Insert icon',
				description: 'Icon component - Font Awesome, Lucide, URL, or relative path',
				insertText: '<Icon icon="${1:icon-name}" iconType="${2|regular,solid,light,thin,sharp-solid,duotone,brands|}" size={${3|16,20,24,32|}} color="${4:#FF5733}" />',
				kind: vscode.CompletionItemKind.Snippet
			},
			{
				label: '🧩 Tooltip',
				detail: 'Insert tooltip',
				description: 'Add tooltip to text',
				insertText: '<Tooltip tip="${1:Tooltip text that appears on hover}">\n  ${2:Text that users will hover over}\n</Tooltip>',
				kind: vscode.CompletionItemKind.Snippet
			},
			{
				label: '🧩 CodeGroup',
				detail: 'Insert code group',
				description: 'Group multiple code blocks with tabs',
				insertText: '<CodeGroup>\n```javascript ${1:filename.js}\n${2:// Use <CodeGroup dropdown> to switch code blocks by dropping down.\n// JavaScript example\nconsole.log("Hello World");}\n```\n\n```python ${3:filename.py}\n${4:# Python example\nprint("Hello World")}\n```\n</CodeGroup>',
				kind: vscode.CompletionItemKind.Snippet
			},
			{
				label: '🧩 Tabs',
				detail: 'Insert tabs',
				description: 'Toggle content using tabs',
				insertText: '<Tabs>\n<Tab title="${1:Tab title - keep it short}">\n${2:Content for this tab - can include text, code, or other components}\n</Tab>\n<Tab title="${3:Second tab title}">\n${4:- **title** (*string*, *required*): The title of the tab. Short titles are easier to navigate.\n- **icon** (*string*): Font Awesome, Lucide icon, or JSX SVG code.\n- **iconType** (*string*): Icon style - regular, solid, light, thin, sharp-solid, duotone, brands.\n}</Tab>\n</Tabs>',
				kind: vscode.CompletionItemKind.Snippet
			},
			{
				label: '🧩 Steps',
				detail: 'Insert step guide',
				description: 'Create step-by-step instructions',
				insertText: '<Steps titleSize="${1|p,h2,h3|}">\n  <Step title="${2:First Step Title}">\n    ${3:- **children** (*ReactNode*, *required*): Content of step as text or components.\n- **icon** (*string*): Font Awesome, Lucide icon, or SVG code.\n- **iconType** (*string*): regular, solid, light, thin, sharp-solid, duotone, brands.\n- **title** (*string*): Primary text shown next to indicator.\n- **stepNumber** (*number*): Number of the step.\n- **titleSize** (*string*, default: p): Size of titles - p, h2, h3.}\n  </Step>\n  <Step title="${4:Second Step Title}">\n    ${5:Instructions for the second step}\n  </Step>\n</Steps>',
				kind: vscode.CompletionItemKind.Snippet
			},
			{
				label: '🧩 Columns',
				detail: 'Insert multi-column layout',
				description: 'Create multi-column layout',
				insertText: '<Columns cols={${1|2,3,4|}}>\n<Card title="First Card">\nNeque porro quisquam est qui dolorem ipsum quia dolor sit amet\n</Card>\n<Card title="Second Card">\nLorem ipsum dolor sit amet, consectetur adipiscing elit\n</Card>\n</Columns>',
				kind: vscode.CompletionItemKind.Snippet
			},
			{
				label: '🧩 Card',
				detail: 'Insert card',
				description: 'Basic clickable card with icon and link',
				insertText: '<Card title="${1:Card Title}" icon="${2:icon-name}" href="${3:https://example.com}">\n${4:- **title** (*string*, *required*): The title of the card.\n- **icon** (*string*): Font Awesome, Lucide icon, or JSX SVG code.\n- **iconType** (*string*): Icon style - regular, solid, light, thin, sharp-solid, duotone, brands.\n- **color** (*string*): Icon color as hex code (e.g., #FF6B6B).\n- **href** (*string*): URL to navigate to when clicked.\n- **horizontal** (*boolean*): Display in compact horizontal layout.\n- **img** (*string*): Image URL or path for top of card.\n- **cta** (*string*): Custom text for action button.\n- **arrow** (*boolean*): Show or hide link arrow icon.}\n</Card>',
				kind: vscode.CompletionItemKind.Snippet
			},
			{
				label: '🧩 Card with Image',
				detail: 'Insert card with image',
				description: 'Card with image at the top',
				insertText: '<Card title="${1:Image Card}" img="${2:/images/card-image.png}">\n  ${3:Card with image displayed at the top}\n</Card>',
				kind: vscode.CompletionItemKind.Snippet
			},
			{
				label: '🧩 Horizontal Card',
				detail: 'Insert horizontal card',
				description: 'Card displayed in horizontal compact layout',
				insertText: '<Card title="${1:Horizontal Card}" icon="${2:icon-name}" horizontal>\n  ${3:Compact horizontal layout card}\n</Card>',
				kind: vscode.CompletionItemKind.Snippet
			},
			{
				label: '🧩 Accordion',
				detail: 'Insert accordion',
				description: 'Create collapsible content section',
				insertText: '<Accordion title="${1:Accordion Title}" defaultOpen={${2|false,true|}}>\n${3:- **title** (*string*, *required*): Title in the Accordion preview.\n- **description** (*string*): Detail below the title in preview.\n- **defaultOpen** (*boolean*, default: false): Whether open by default.\n- **icon** (*string*): Font Awesome, Lucide icon, or SVG code.\n- **iconType** (*string*): regular, solid, light, thin, sharp-solid, duotone, brands.}\n</Accordion>',
				kind: vscode.CompletionItemKind.Snippet
			},
			{
				label: '🧩 AccordionGroup',
				detail: 'Insert accordion group',
				description: 'Group multiple accordions together',
				insertText: '<AccordionGroup>\n<Accordion title="${1:First Question}">\n${2:Answer or content for first accordion}\n</Accordion>\n<Accordion title="${3:Second Question}">\n${4:Answer or content for second accordion}\n</Accordion>\n</AccordionGroup>',
				kind: vscode.CompletionItemKind.Snippet
			},
			{
				label: '🧩 Expandable',
				detail: 'Insert expandable content',
				description: 'Create expandable content section',
				insertText: '<Expandable title="${1:Click to expand - describes what\'s inside}" defaultOpen={${2|false,true|}}>\n  ${3:Content that can be shown or hidden - useful for optional details}\n</Expandable>',
				kind: vscode.CompletionItemKind.Snippet
			},
			{
				label: '🧩 ParamField',
				detail: 'Insert parameter field',
				description: 'Document API parameters',
				insertText: '<ParamField ${1|query,path,body,header|}="${2:parameterName}" type="${3|string,number,boolean,object,array|}" required>\n${4:- **path** (*string*): Parameter type and name (e.g., "query paramName").\n- **type** (*string*): Expected type - string, number, bool, object, arrays with [].\n- **required** (*boolean*): Whether parameter is required.\n- **deprecated** (*boolean*): Whether parameter is deprecated.\n- **default** (*string*): Default value if not provided.\n- **initialValue** (*any*): Value for playground initialization.\n- **placeholder** (*string*): Placeholder text for playground input.}\n</ParamField>',
				kind: vscode.CompletionItemKind.Snippet
			},
			{
				label: '🧩 ResponseField',
				detail: 'Insert response field',
				description: 'Document API response fields',
				insertText: '<ResponseField name="${1:fieldName}" type="${2|string,number,boolean,object,array|}" required>\n${3:- **name** (*string*, *required*): Name of the response value.\n- **type** (*string*, *required*): Expected type of response value.\n- **default** (*string*): Default value.\n- **required** (*boolean*): Show "required" beside field name.\n- **deprecated** (*boolean*): Whether field is deprecated.\n- **pre** (*string[]*): Labels shown before field name.\n- **post** (*string[]*): Labels shown after field name.}\n</ResponseField>',
				kind: vscode.CompletionItemKind.Snippet
			},
			{
				label: '🧩 Panel',
				detail: 'Insert sidebar panel',
				description: 'Add content to the right panel',
				insertText: '<Panel>\n  ${1:Content that appears in the right sidebar - useful for additional info}\n</Panel>',
				kind: vscode.CompletionItemKind.Snippet
			},
			{
				label: '🧩 Update',
				detail: 'Insert changelog entry',
				description: 'Create changelog entry',
				insertText: '<Update label="${1:2024-01-01}" description="${2:v1.0.0}" tags={[${3:"feature", "bugfix"}]}>\n  ${4:- **label** (*string*, *required*): Label for update, appears as sticky text.\n- **tags** (*string[]*): Tags for changelog, shown as filters in right panel.\n- **description** (*string*): Description below label and tag.}\n</Update>',
				kind: vscode.CompletionItemKind.Snippet
			}
		];

		// Code Block Commands
		const codeBlockCommands = [
			{
				label: '💻 Basic Code Block',
				detail: 'Insert basic code block',
				description: 'Simple code block with language and filename',
				insertText: '```javascript ${1:filename.js}\n${2:// Basic code block\nconsole.log("Hello World");}\n```',
				kind: vscode.CompletionItemKind.Snippet
			},
			{
				label: '💻 Code Block with Title',
				detail: 'Insert code block with title',
				description: 'Code block with custom title instead of filename',
				insertText: '```javascript ${1:Code Block Example}\n${2:// Custom title instead of filename\nconsole.log("Custom title example");}\n```',
				kind: vscode.CompletionItemKind.Snippet
			},
			{
				label: '💻 Code Block with Line Numbers',
				detail: 'Insert code block with line numbers',
				description: 'Code block with line numbers displayed using \'lines\'',
				insertText: '```javascript ${1:filename.js} lines\n${2:// Display line numbers on the left\nfunction example() {\n  console.log("Line numbers shown");\n  return true;\n}}\n```',
				kind: vscode.CompletionItemKind.Snippet
			},
			{
				label: '💻 Code Block with Icon',
				detail: 'Insert code block with icon',
				description: 'Code block with icon (Font Awesome, Lucide, or URL)',
				insertText: '```javascript ${1:filename.js} icon="${2:square-js}"\n${3:// Add an icon to the code block\nconsole.log("Code with icon");}\n```',
				kind: vscode.CompletionItemKind.Snippet
			},
			{
				label: '💻 Code Block with Highlighting',
				detail: 'Insert code block with highlighting',
				description: 'Code block with line highlighting using highlight={1-2,5}',
				insertText: '```javascript ${1:Line Highlighting Example} highlight={${2:1-2,5}}\n${3:// Highlight specific lines or ranges\nconst greeting = "Hello, World!";\nfunction sayHello() {\n  console.log(greeting);\n}\nsayHello();}\n```',
				kind: vscode.CompletionItemKind.Snippet
			},
			{
				label: '💻 Code Block with Focus',
				detail: 'Insert code block with focus',
				description: 'Code block with focus on specific lines using focus={2,4-5}',
				insertText: '```javascript ${1:Line Focus Example} focus={${2:2,4-5}}\n${3:// Focus on specific lines\nconst greeting = "Hello, World!";\nfunction sayHello() {\n  console.log(greeting);\n}\nsayHello();}\n```',
				kind: vscode.CompletionItemKind.Snippet
			}
		];

		// AI Commands
		const aiCommands = [
			{
				label: '✨ Write with AI',
				detail: 'AI-powered writing assistant',
				description: 'Generate content with artificial intelligence',
				command: 'flashMintlify.writeWithAI',
				insertText: ''
			}
		];

		// Basic Commands
		const basicCommands = [
			{
				label: '📝 Set page options',
				detail: 'Set page frontmatter options',
				description: 'Open page options editor for Mintlify frontmatter',
				command: 'flashMintlify.basic.frontmatter',
				insertText: ''
			},
			// {
			// 	label: '🌐 Open page preview',
			// 	detail: 'Open current page in Mintlify dev server',
			// 	description: 'Open http://localhost:<port>/<internalPath> either inside VS Code or in browser',
			// 	command: 'flashMintlify.preview.open',
			// 	insertText: ''
			// },
			{
				label: '⚙️ Set preview options',
				detail: 'Configure preview port and mode',
				description: 'Choose internal webview or external browser and set port',
				command: 'flashMintlify.preview.options',
				insertText: ''
			},
			// {
			// 	label: '🔍 Calculate Import References',
			// 	detail: 'Calculate import references',
			// 	description: 'Analyze and display file import relationships',
			// 	command: 'flashMintlify.basic.calculateimport',
			// 	insertText: ''
			// },
			// {
			// 	label: '📈 Current Date',
			// 	detail: 'Insert current date',
			// 	description: 'Insert formatted current date',
			// 	insertText: new Date().toISOString().split('T')[0],
			// 	kind: vscode.CompletionItemKind.Text
			// },
			// {
			// 	label: '⏰ Current DateTime',
			// 	detail: 'Insert current date and time',
			// 	description: 'Insert complete current date and time',
			// 	insertText: new Date().toISOString().replace('T', ' ').split('.')[0],
			// 	kind: vscode.CompletionItemKind.Text
			// },
			{
				label: '📊 Insert Table',
				detail: 'Insert table',
				description: 'Quick insert Markdown table template',
				insertText: '| Column 1 | Column 2 | Column 3 |\n|----------|----------|----------|\n| Row 1    | Data     | Data     |\n| Row 2    | Data     | Data     |',
				kind: vscode.CompletionItemKind.Snippet
			}
		];

		// Create category function
		const createCategoryItems = (commands: any[], categoryPrefix: string, categoryName: string, startIndex: number) => {
			const items: vscode.CompletionItem[] = [];
			
			// Add category title (separator effect)
			const separator = new vscode.CompletionItem(
				`────────── ${categoryName} ──────────`,
				vscode.CompletionItemKind.Text
			);
			separator.detail = '';
			separator.documentation = new vscode.MarkdownString(`**${categoryName}**`);
			separator.insertText = '';
			separator.sortText = `${categoryPrefix}000`;
			separator.command = { command: 'vscode.executeCommand', title: '', arguments: ['hideSuggestWidget'] };
			items.push(separator);
			
			// Add command items
			commands.forEach((cmd, index) => {
			const item = new vscode.CompletionItem(
				cmd.label, 
				cmd.kind || vscode.CompletionItemKind.Function
			);
			
			item.detail = cmd.detail;
			item.documentation = new vscode.MarkdownString(cmd.description);
			
				if ('command' in cmd && cmd.command) {
				// If has command, create custom insert text and command
				item.insertText = '';
				item.command = {
					command: cmd.command,
					title: cmd.label
				};
			} else {
				// If no command, insert text directly
				if (typeof cmd.insertText === 'string' && cmd.insertText.includes('$')) {
					item.insertText = new vscode.SnippetString(cmd.insertText);
				} else {
					item.insertText = cmd.insertText;
				}
			}
			
				// Sort by code order, same category together
				const paddedIndex = String(index + 1).padStart(3, '0');
				item.sortText = `${categoryPrefix}${paddedIndex}`;
			
			// Remove triggering slash
			item.additionalTextEdits = [
				vscode.TextEdit.delete(new vscode.Range(
					position.line, 
					position.character - 1, 
					position.line, 
					position.character
				))
			];
			
				items.push(item);
			});
			
			return items;
		};

		// Create categorized completion items
		const aiItems = createCategoryItems(aiCommands, '1', 'AI', 0);
		const basicItems = createCategoryItems(basicCommands, '2', 'Basic', aiCommands.length);
		const componentItems = createCategoryItems(componentCommands, '3', 'Mintlify Components', aiCommands.length + basicCommands.length);
		const codeBlockItems = createCategoryItems(codeBlockCommands, '4', 'Code Blocks', aiCommands.length + basicCommands.length + componentCommands.length);
		
		// Merge all completion items
		completionItems.push(...aiItems, ...basicItems, ...componentItems, ...codeBlockItems);

		return Promise.resolve(completionItems);
	}
}

class ComponentCompletionItemProvider implements vscode.CompletionItemProvider {
	provideCompletionItems(
		document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken):
		Thenable<vscode.CompletionItem[]> {

		const lineText = document.lineAt(position.line).text;

		const completionItems: vscode.CompletionItem[] = [];

		const snippets = [
			{
				title: "Mintlify: Callout - Note",
				content: 'Note>\n${1:This adds a note in the content}\n</Note',
				desc: "Insert note callout"
			},
			{
				title: "Mintlify: Callout - Tip",
				content: 'Tip>\n${1:This suggests a helpful tip}\n</Tip',
				desc: "Insert tip callout"
			},
			{
				title: "Mintlify: Callout - Warning",
				content: 'Warning>\n${1:This raises a warning to watch out for}\n</Warning',
				desc: "Insert warning callout"
			},
			{
				title: "Mintlify: Callout - Info",
				content: 'Info>\n${1:This draws attention to important information}\n</Info',
				desc: "Insert info callout"
			},
			{
				title: "Mintlify: Callout - Check",
				content: 'Check>\n${1:This brings us a checked status}\n</Check',
				desc: "Insert check callout"
			},
			{
				title: "Mintlify: Callout - Danger",
				content: 'Danger>\n${1:This is a danger callout}\n</Danger',
				desc: "Insert danger callout"
			},
			{
				title: "Mintlify: Frame",
				content: 'Frame caption="${1:Optional image caption}">\n  <img src="${2:/path/to/image.jpg}" alt="${3:Alt text}" />\n</Frame',
				desc: "Insert image with frame"
			},
			{
				title: "Mintlify: Icon",
				content: 'Icon icon="${1:icon-name}" iconType="${2|regular,solid,light,thin,sharp-solid,duotone,brands|}" size={${3|16,20,24,32|}} color="${4:#FF5733}" /',
				desc: "Insert an icon - Font Awesome, Lucide, URL, or relative path"
			},
			{
				title: "Mintlify: Tooltip",
				content: 'Tooltip tip="${1:Tooltip text that appears on hover}">\n  ${2:Text that users will hover over}\n</Tooltip',
				desc: "Add tooltip to text"
			},
			{
				title: "Mintlify: CodeGroup",
				content: 'CodeGroup>\n```javascript ${1:filename.js}\n${2:// Use <CodeGroup dropdown> to switch code blocks by dropping down.\n// JavaScript example\nconsole.log("Hello World");}\n```\n\n```python ${3:filename.py}\n${4:# Python example\nprint("Hello World")}\n```\n</CodeGroup',
				desc: "Group multiple code blocks with tabs"
			},
			{
				title: "Mintlify: Tabs",
				content: 'Tabs>\n<Tab title="${1:Tab title - keep it short}">\n${2:Content for this tab - can include text, code, or other components}\n</Tab>\n<Tab title="${3:Second tab title}">\n${4:- **title** (*string*, *required*): The title of the tab. Short titles are easier to navigate.\n- **icon** (*string*): Font Awesome, Lucide icon, or JSX SVG code.\n- **iconType** (*string*): Icon style - regular, solid, light, thin, sharp-solid, duotone, brands.\n}</Tab>\n</Tabs',
				desc: "Toggle content using tabs"
			},
			{
				title: "Mintlify: Steps",
				content: 'Steps titleSize="${1|p,h2,h3|}">\n  <Step title="${2:First Step Title}">\n    ${3:- **children** (*ReactNode*, *required*): Content of step as text or components.\n- **icon** (*string*): Font Awesome, Lucide icon, or SVG code.\n- **iconType** (*string*): regular, solid, light, thin, sharp-solid, duotone, brands.\n- **title** (*string*): Primary text shown next to indicator.\n- **stepNumber** (*number*): Number of the step.\n- **titleSize** (*string*, default: p): Size of titles - p, h2, h3.}\n  </Step>\n  <Step title="${4:Second Step Title}">\n    ${5:Instructions for the second step}\n  </Step>\n</Steps',
				desc: "Create step-by-step instructions"
			},
			{
				title: "Mintlify: Columns",
				content: 'Columns cols={${1|2,3,4|}}>\n<Card title="First Card">\nNeque porro quisquam est qui dolorem ipsum quia dolor sit amet\n</Card>\n<Card title="Second Card">\nLorem ipsum dolor sit amet, consectetur adipiscing elit\n</Card>\n</Columns',
				desc: "Create multi-column layout"
			},
			{
				title: "Mintlify: Basic Card",
				content: 'Card title="${1:Card Title}" icon="${2:icon-name}" href="${3:https://example.com}">\n${4:- **title** (*string*, *required*): The title of the card.\n- **icon** (*string*): Font Awesome, Lucide icon, or JSX SVG code.\n- **iconType** (*string*): Icon style - regular, solid, light, thin, sharp-solid, duotone, brands.\n- **color** (*string*): Icon color as hex code (e.g., #FF6B6B).\n- **href** (*string*): URL to navigate to when clicked.\n- **horizontal** (*boolean*): Display in compact horizontal layout.\n- **img** (*string*): Image URL or path for top of card.\n- **cta** (*string*): Custom text for action button.\n- **arrow** (*boolean*): Show or hide link arrow icon.}\n</Card',
				desc: "Basic clickable card with icon and link"
			},
			{
				title: "Mintlify: Card with Image",
				content: 'Card title="${1:Image Card}" img="${2:/images/card-image.png}">\n  ${3:Card with image displayed at the top}\n</Card',
				desc: "Card with image at the top"
			},
			{
				title: "Mintlify: Horizontal Card",
				content: 'Card title="${1:Horizontal Card}" icon="${2:icon-name}" horizontal>\n  ${3:Compact horizontal layout card}\n</Card',
				desc: "Card displayed in horizontal compact layout"
			},
			{
				title: "Mintlify: Accordion",
				content: 'Accordion title="${1:Accordion Title}" defaultOpen={${2|false,true|}}>\n${3:- **title** (*string*, *required*): Title in the Accordion preview.\n- **description** (*string*): Detail below the title in preview.\n- **defaultOpen** (*boolean*, default: false): Whether open by default.\n- **icon** (*string*): Font Awesome, Lucide icon, or SVG code.\n- **iconType** (*string*): regular, solid, light, thin, sharp-solid, duotone, brands.}\n</Accordion',
				desc: "Create collapsible content section"
			},
			{
				title: "Mintlify: AccordionGroup",
				content: 'AccordionGroup>\n<Accordion title="${1:First Question}">\n${2:Answer or content for first accordion}\n</Accordion>\n<Accordion title="${3:Second Question}">\n${4:Answer or content for second accordion}\n</Accordion>\n</AccordionGroup',
				desc: "Group multiple accordions together"
			},
			{
				title: "Mintlify: Expandable",
				content: 'Expandable title="${1:Click to expand - describes what\'s inside}" defaultOpen={${2|false,true|}}>\n  ${3:Content that can be shown or hidden - useful for optional details}\n</Expandable',
				desc: "Create expandable content section"
			},
			{
				title: "Mintlify: ParamField",
				content: 'ParamField ${1|query,path,body,header|}="${2:parameterName}" type="${3|string,number,boolean,object,array|}" required>\n${4:- **path** (*string*): Parameter type and name (e.g., "query paramName").\n- **type** (*string*): Expected type - string, number, bool, object, arrays with [].\n- **required** (*boolean*): Whether parameter is required.\n- **deprecated** (*boolean*): Whether parameter is deprecated.\n- **default** (*string*): Default value if not provided.\n- **initialValue** (*any*): Value for playground initialization.\n- **placeholder** (*string*): Placeholder text for playground input.}\n</ParamField',
				desc: "Document API parameters"
			},
			{
				title: "Mintlify: ResponseField",
				content: 'ResponseField name="${1:fieldName}" type="${2|string,number,boolean,object,array|}" required>\n${3:- **name** (*string*, *required*): Name of the response value.\n- **type** (*string*, *required*): Expected type of response value.\n- **default** (*string*): Default value.\n- **required** (*boolean*): Show "required" beside field name.\n- **deprecated** (*boolean*): Whether field is deprecated.\n- **pre** (*string[]*): Labels shown before field name.\n- **post** (*string[]*): Labels shown after field name.}\n</ResponseField',
				desc: "Document API response fields"
			},
			{
				title: "Mintlify: Panel",
				content: 'Panel>\n  ${1:Content that appears in the right sidebar - useful for additional info}\n</Panel',
				desc: "Add content to the right panel"
			},
			{
				title: "Mintlify: Update",
				content: 'Update label="${1:2024-01-01}" description="${2:v1.0.0}" tags={[${3:"feature", "bugfix"}]}>\n  ${4:- **label** (*string*, *required*): Label for update, appears as sticky text.\n- **tags** (*string[]*): Tags for changelog, shown as filters in right panel.\n- **description** (*string*): Description below label and tag.}\n</Update',
				desc: "Create changelog entry"
			}
		];
		for (let i = 0; i < snippets.length; i++) {
			completionItems.push(createSnippetCompletion(snippets[i]));
		}


		return Promise.resolve(completionItems);
	}
}

class CodeBlockCompletionItemProvider implements vscode.CompletionItemProvider {
	provideCompletionItems(
		document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken):
		Thenable<vscode.CompletionItem[]> {

		const lineText = document.lineAt(position.line).text;

		const completionItems: vscode.CompletionItem[] = [];

		if (lineText.startsWith('```')) {
			const snippets = [
				{
					title: "Mintlify: Basic Code Block",
					content: 'javascript ${1:filename.js}\n${2:// Basic code block\nconsole.log("Hello World");}\n```',
					desc: "Simple code block with language and filename"
				},
				{
					title: "Mintlify: Code Block with Title",
					content: 'javascript ${1:Code Block Example}\n${2:// Custom title instead of filename\nconsole.log("Custom title example");}\n```',
					desc: "Code block with custom title instead of filename"
				},
				{
					title: "Mintlify: Code Block with Line Numbers",
					content: 'javascript ${1:filename.js} lines\n${2:// Display line numbers on the left\nfunction example() {\n  console.log("Line numbers shown");\n  return true;\n}}\n```',
					desc: "Code block with line numbers displayed using 'lines'"
				},
				{
					title: "Mintlify: Code Block with Icon",
					content: 'javascript ${1:filename.js} icon="${2:square-js}"\n${3:// Add an icon to the code block\nconsole.log("Code with icon");}\n```',
					desc: "Code block with icon (Font Awesome, Lucide, or URL)"
				},
				{
					title: "Mintlify: Code Block with Line Highlighting",
					content: 'javascript ${1:Line Highlighting Example} highlight={${2:1-2,5}}\n${3:// Highlight specific lines or ranges\nconst greeting = "Hello, World!";\nfunction sayHello() {\n  console.log(greeting);\n}\nsayHello();}\n```',
					desc: "Code block with line highlighting using highlight={1-2,5}"
				},
				{
					title: "Mintlify: Code Block with Focus",
					content: 'javascript ${1:Line Focus Example} focus={${2:2,4-5}}\n${3:// Focus on specific lines\nconst greeting = "Hello, World!";\nfunction sayHello() {\n  console.log(greeting);\n}\nsayHello();}\n```',
					desc: "Code block with focus on specific lines using focus={2,4-5}"
				}
			];
			for (let i = 0; i < snippets.length; i++) {
				completionItems.push(createSnippetCompletion(snippets[i]));
			}
		}


		return Promise.resolve(completionItems);
	}
}



function createSnippetCompletion(snippet: any) {
	const snippetCompletion = new vscode.CompletionItem(snippet.title, 14);
	snippetCompletion.insertText = new vscode.SnippetString(snippet.content);
	const docs: any = new vscode.MarkdownString(`${snippet.desc}  [read doc](https://mintlify.com/docs/components).`);
	docs.supportHtml = true
	snippetCompletion.documentation = docs;
	docs.baseUri = vscode.Uri.parse('https://mintlify.com/docs/');
	return snippetCompletion;
}

function createCompletionProviders() {
	const completionProvider = vscode.languages.registerCompletionItemProvider(
		[{ language: 'mdx', scheme: 'file' }, { language: 'markdown', scheme: 'file' }],
		new ComponentCompletionItemProvider(),
		'<'
	)
	const cbCompletionProvider = vscode.languages.registerCompletionItemProvider(
		[{ language: 'mdx', scheme: 'file' }, { language: 'markdown', scheme: 'file' }],
		new CodeBlockCompletionItemProvider(),
		'`'
	)
	// Register slash command provider
	const slashCommandProvider = vscode.languages.registerCompletionItemProvider(
		[{ language: 'mdx', scheme: 'file' }, { language: 'markdown', scheme: 'file' }],
		new SlashCommandCompletionItemProvider(),
		'/'
	)
	return [completionProvider, cbCompletionProvider, slashCommandProvider];
}

// Export methods
export { createCompletionProviders };