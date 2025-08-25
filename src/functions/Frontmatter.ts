import * as vscode from 'vscode'
import * as path from 'path'

function createFrontmatterProvider() {
	const provider = vscode.commands.registerCommand('flashMintlify.basic.frontmatter', async () => {

		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}

		// 获取当前文件名（不包含扩展名）作为默认标题
		const fileName = path.basename(editor.document.fileName, path.extname(editor.document.fileName));
		const defaultTitle = fileName.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

		let options = [
			{ label: 'Page metadata' , kind: vscode.QuickPickItemKind.Separator },
			{ label: 'title', picked: true, default: defaultTitle, type: 'string', description: "The title of your page that appears in navigation and browser tabs." },
			{ label: 'description', picked: false, default: "", type: 'string', description: "A brief description of what this page covers. Appears under the title and improves SEO." },
			{ label: 'sidebarTitle', picked: false, default: "", type: 'string', description: "A short title that displays in the sidebar navigation." },
			{ label: 'icon', picked: false, default: "", type: 'string', description: "The icon to display." },
			{ label: 'iconType', picked: false, default: "solid", type: 'string', description: "The Font Awesome icon style. Only used with Font Awesome icons." },
			{ label: 'tag', picked: false, default: "", type: 'string', description: "A tag that appears next to your page title in the sidebar." },
			{ label: 'Page mode' , kind: vscode.QuickPickItemKind.Separator },
			{ label: "mode: 'center'", picked: false, isComplete: true, description: "Center mode removes the sidebar and table of contents, centering the content. This is useful for changelogs or other pages where you want to emphasize the content." },
			{ label: "mode: 'wide'", picked: false, isComplete: true, description: "Wide mode hides the table of contents. This is useful for pages that do not have any headings or if you prefer to use the extra horizontal space." },
			{ label: "mode: 'custom'", picked: false, isComplete: true, description: "Custom mode provides a minimalist layout that removes all elements except for the top navbar. Custom mode is a blank canvas to create landing pages or any other unique layouts that you want to have minimal navigation elements for." },
			{ label: 'API pages' , kind: vscode.QuickPickItemKind.Separator },
			{ label: 'openapi', picked: false, default: "GET /endpoint", type: 'string', description: "Create interactive API playgrounds by adding an API specification to your frontmatter, api or openapi." },
			{ label: 'Internal search keywords' , kind: vscode.QuickPickItemKind.Separator },
			{ label: 'keywords', picked: false, default: "['configuration', 'setup', 'getting started']", type: 'array', description: "Enhance a specific page's discoverability in the built-in search by providing keywords in your metadata. These keywords won't appear as part of the page content or in search results, but users that search for them will be shown the page as a result." },
			{ label: 'SEO - Basic meta tags' , kind: vscode.QuickPickItemKind.Separator },
			{ label: "'robots'", picked: false, default: "index, follow", type: 'string', description: "Tells search engines how to crawl and index the page" },
			{ label: "'charset'", picked: false, default: "UTF-8", type: 'string', description: "Character encoding for the HTML document" },
			{ label: "'viewport'", picked: false, default: "width=device-width, initial-scale=1.0", type: 'string', description: "Controls the viewport settings for responsive design" },
			{ label: "'description'", picked: false, default: "Page description", type: 'string', description: "Meta description for SEO" },
			{ label: "'keywords'", picked: false, default: "keyword1, keyword2, keyword3", type: 'string', description: "SEO keywords for the page" },
			{ label: "'author'", picked: false, default: "Author Name", type: 'string', description: "Author of the content" },
			{ label: "'googlebot'", picked: false, default: "index, follow", type: 'string', description: "Specific instructions for Google's crawler" },
			{ label: "'google'", picked: false, default: "notranslate", type: 'string', description: "Google-specific meta tag" },
			{ label: "'google-site-verification'", picked: false, default: "verification_token", type: 'string', description: "Google Search Console verification" },
			{ label: "'generator'", picked: false, default: "Mintlify", type: 'string', description: "Tool used to generate the page" },
			{ label: "'theme-color'", picked: false, default: "#000000", type: 'string', description: "Browser theme color" },
			{ label: "'color-scheme'", picked: false, default: "light dark", type: 'string', description: "Supported color schemes" },
			{ label: "'format-detection'", picked: false, default: "telephone=no", type: 'string', description: "Controls automatic format detection" },
			{ label: "'referrer'", picked: false, default: "origin", type: 'string', description: "Referrer policy" },
			{ label: "'refresh'", picked: false, default: "30", type: 'string', description: "Auto-refresh interval in seconds" },
			{ label: "'rating'", picked: false, default: "general", type: 'string', description: "Content rating" },
			{ label: "'revisit-after'", picked: false, default: "7 days", type: 'string', description: "How often search engines should revisit" },
			{ label: "'language'", picked: false, default: "en", type: 'string', description: "Page language" },
			{ label: "'copyright'", picked: false, default: "Copyright 2024", type: 'string', description: "Copyright information" },
			{ label: "'reply-to'", picked: false, default: "email@example.com", type: 'string', description: "Reply-to email address" },
			{ label: "'distribution'", picked: false, default: "global", type: 'string', description: "Content distribution scope" },
			{ label: "'coverage'", picked: false, default: "Worldwide", type: 'string', description: "Geographic coverage" },
			{ label: "'category'", picked: false, default: "Technology", type: 'string', description: "Content category" },
			{ label: "'target'", picked: false, default: "all", type: 'string', description: "Target audience" },
			{ label: 'SEO - Mobile optimization' , kind: vscode.QuickPickItemKind.Separator },
			{ label: "'HandheldFriendly'", picked: false, default: "True", type: 'string', description: "Indicates mobile-friendly content" },
			{ label: "'MobileOptimized'", picked: false, default: "320", type: 'string', description: "Optimal mobile width" },
			{ label: "'apple-mobile-web-app-capable'", picked: false, default: "yes", type: 'string', description: "iOS web app capability" },
			{ label: "'apple-mobile-web-app-status-bar-style'", picked: false, default: "black", type: 'string', description: "iOS status bar style" },
			{ label: "'apple-mobile-web-app-title'", picked: false, default: "App Title", type: 'string', description: "iOS app title" },
			{ label: "'application-name'", picked: false, default: "App Name", type: 'string', description: "Application name" },
			{ label: "'msapplication-TileColor'", picked: false, default: "#000000", type: 'string', description: "Windows tile color" },
			{ label: "'msapplication-TileImage'", picked: false, default: "path/to/tile.png", type: 'string', description: "Windows tile image path" },
			{ label: "'msapplication-config'", picked: false, default: "path/to/browserconfig.xml", type: 'string', description: "Windows config file path" },
			{ label: 'SEO - Open Graph' , kind: vscode.QuickPickItemKind.Separator },
			{ label: "'og:title'", picked: false, default: "Open Graph Title", type: 'string', description: "Open Graph title" },
			{ label: "'og:type'", picked: false, default: "website", type: 'string', description: "Open Graph content type" },
			{ label: "'og:url'", picked: false, default: "https://example.com", type: 'string', description: "Open Graph URL" },
			{ label: "'og:image'", picked: false, default: "https://example.com/image.jpg", type: 'string', description: "Open Graph image" },
			{ label: "'og:description'", picked: false, default: "Open Graph Description", type: 'string', description: "Open Graph description" },
			{ label: "'og:site_name'", picked: false, default: "Site Name", type: 'string', description: "Open Graph site name" },
			{ label: "'og:locale'", picked: false, default: "en_US", type: 'string', description: "Open Graph locale" },
			{ label: "'og:video'", picked: false, default: "https://example.com/video.mp4", type: 'string', description: "Open Graph video" },
			{ label: "'og:audio'", picked: false, default: "https://example.com/audio.mp3", type: 'string', description: "Open Graph audio" },
			{ label: 'SEO - Twitter Cards' , kind: vscode.QuickPickItemKind.Separator },
			{ label: "'twitter:card'", picked: false, default: "summary", type: 'string', description: "Twitter card type" },
			{ label: "'twitter:site'", picked: false, default: "@username", type: 'string', description: "Twitter site username" },
			{ label: "'twitter:creator'", picked: false, default: "@username", type: 'string', description: "Twitter creator username" },
			{ label: "'twitter:title'", picked: false, default: "Twitter Title", type: 'string', description: "Twitter card title" },
			{ label: "'twitter:description'", picked: false, default: "Twitter Description", type: 'string', description: "Twitter card description" },
			{ label: "'twitter:image'", picked: false, default: "https://example.com/image.jpg", type: 'string', description: "Twitter card image" },
			{ label: "'twitter:image:alt'", picked: false, default: "Image Description", type: 'string', description: "Twitter image alt text" },
			{ label: "'twitter:player'", picked: false, default: "https://example.com/player", type: 'string', description: "Twitter player URL" },
			{ label: "'twitter:player:width'", picked: false, default: "480", type: 'string', description: "Twitter player width" },
			{ label: "'twitter:player:height'", picked: false, default: "480", type: 'string', description: "Twitter player height" },
			{ label: "'twitter:app:name:iphone'", picked: false, default: "App Name", type: 'string', description: "iPhone app name" },
			{ label: "'twitter:app:id:iphone'", picked: false, default: "12345", type: 'string', description: "iPhone app ID" },
			{ label: "'twitter:app:url:iphone'", picked: false, default: "app://", type: 'string', description: "iPhone app URL" },
			{ label: 'SEO - Article metadata' , kind: vscode.QuickPickItemKind.Separator },
			{ label: "'article:published_time'", picked: false, default: "2024-01-01T00:00:00+00:00", type: 'string', description: "Article publish time" },
			{ label: "'article:modified_time'", picked: false, default: "2024-01-02T00:00:00+00:00", type: 'string', description: "Article modification time" },
			{ label: "'article:expiration_time'", picked: false, default: "2024-12-31T00:00:00+00:00", type: 'string', description: "Article expiration time" },
			{ label: "'article:author'", picked: false, default: "Author Name", type: 'string', description: "Article author" },
			{ label: "'article:section'", picked: false, default: "Technology", type: 'string', description: "Article section" },
			{ label: "'article:tag'", picked: false, default: "tag1, tag2, tag3", type: 'string', description: "Article tags" },
			{ label: 'SEO - Additional metadata' , kind: vscode.QuickPickItemKind.Separator },
			{ label: "'book:author'", picked: false, default: "Author Name", type: 'string', description: "Book author" },
			{ label: "'book:isbn'", picked: false, default: "1234567890", type: 'string', description: "Book ISBN" },
			{ label: "'book:release_date'", picked: false, default: "2024-01-01", type: 'string', description: "Book release date" },
			{ label: "'book:tag'", picked: false, default: "tag1, tag2, tag3", type: 'string', description: "Book tags" },
			{ label: "'profile:first_name'", picked: false, default: "John", type: 'string', description: "Profile first name" },
			{ label: "'profile:last_name'", picked: false, default: "Doe", type: 'string', description: "Profile last name" },
			{ label: "'profile:username'", picked: false, default: "johndoe", type: 'string', description: "Profile username" },
			{ label: "'profile:gender'", picked: false, default: "male", type: 'string', description: "Profile gender" },
			{ label: "'music:duration'", picked: false, default: "205", type: 'string', description: "Music duration in seconds" },
			{ label: "'music:album'", picked: false, default: "Album Name", type: 'string', description: "Music album name" },
			{ label: "'music:album:disc'", picked: false, default: "1", type: 'string', description: "Music album disc number" },
			{ label: "'music:album:track'", picked: false, default: "1", type: 'string', description: "Music album track number" },
			{ label: "'music:musician'", picked: false, default: "Artist Name", type: 'string', description: "Musician name" },
			{ label: "'music:song'", picked: false, default: "Song Name", type: 'string', description: "Song name" },
			{ label: "'music:song:disc'", picked: false, default: "1", type: 'string', description: "Song disc number" },
			{ label: "'music:song:track'", picked: false, default: "1", type: 'string', description: "Song track number" },
			{ label: "'video:actor'", picked: false, default: "Actor Name", type: 'string', description: "Video actor name" },
			{ label: "'video:actor:role'", picked: false, default: "Role Name", type: 'string', description: "Video actor role" },
			{ label: "'video:director'", picked: false, default: "Director Name", type: 'string', description: "Video director" },
			{ label: "'video:writer'", picked: false, default: "Writer Name", type: 'string', description: "Video writer" },
			{ label: "'video:duration'", picked: false, default: "120", type: 'string', description: "Video duration in seconds" },
			{ label: "'video:release_date'", picked: false, default: "2024-01-01", type: 'string', description: "Video release date" },
			{ label: "'video:tag'", picked: false, default: "tag1, tag2, tag3", type: 'string', description: "Video tags" },
			{ label: "'video:series'", picked: false, default: "Series Name", type: 'string', description: "Video series name" }
		];

		let selectedOptions = await vscode.window.showQuickPick(options, {
			canPickMany: true,
			placeHolder: 'Select the item to insert'
		});


		if (selectedOptions?.length  == 0) {
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
				if (option.kind !== vscode.QuickPickItemKind.Separator) {
					if (option.isComplete) {
						// 对于完整格式（如 mode: center），检查字段名是否已存在
						const fieldName = option.label.split(':')[0];
						if (!selectedText.includes(fieldName + ':')) {
							newFrontmatter += option.label + "\n";
						}
					} else {
						// 对于普通字段，检查字段是否已存在
						if (!selectedText.includes(option.label + ':')) {
							let defaultValue = option.default || "";
							// 如果是string类型且默认值不为空，用单引号包围
							if (option.type === 'string' && defaultValue) {
								defaultValue = `'${defaultValue}'`;
							}
							newFrontmatter += option.label + ": " + defaultValue + "\n";
						}
					}
				}
			});
			editor.edit(editBuilder => {
				editBuilder.replace(editor.selection, newFrontmatter);
			})

		} else {
			newFrontmatter += "---\n";
			if (selectedOptions) {
				selectedOptions.forEach(option => {
					if (option.kind !== vscode.QuickPickItemKind.Separator) {
						if (option.isComplete) {
							// 完整格式直接输出
							newFrontmatter += option.label + "\n";
						} else {
							// 普通字段加上默认值
							let defaultValue = option.default || "";
							// 如果是string类型且默认值不为空，用单引号包围
							if (option.type === 'string' && defaultValue) {
								defaultValue = `'${defaultValue}'`;
							}
							newFrontmatter += option.label + ": " + defaultValue + "\n";
						}
					}
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