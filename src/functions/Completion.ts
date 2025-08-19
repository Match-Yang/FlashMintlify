import * as vscode from 'vscode';




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
	return [completionProvider, cbCompletionProvider];
}

// 导出方法
export { createCompletionProviders };