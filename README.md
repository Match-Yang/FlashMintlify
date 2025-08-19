# FlashMintlify

> **The ultimate VS Code extension for Mintlify documentation development**

Fast and powerful Mintlify documentation development with intelligent component completion, automatic file reference tracking, smart link validation, and enhanced MDX editing experience.

## ✨ Key Features

### 🚀 Intelligent Component Completion
Smart autocompletion for all Mintlify components with live preview and documentation:

- **Callouts**: Note, Tip, Warning, Info, Check, Caution
- **Layout**: Accordion, AccordionGroup, Card, CardGroup, Tabs, Steps
- **Code**: CodeGroup with syntax highlighting and multiple language support
- **Media**: Frame for images and videos with captions
- **API Documentation**: ParamField, ResponseField, Expandable
- **Interactive**: Tooltip, Icon, Panel, Update changelog
- **Advanced**: Custom components with prop suggestions

### 🔗 Smart Link Management & Validation
Real-time link validation and automatic updates:

- **Internal Link Validation**: Validates Mintlify internal links (`/path/to/page`)
- **Absolute Link Validation**: Checks file existence for absolute paths (`/images/logo.png`)
- **CodeLens Integration**: Shows "Open file" buttons for valid internal links
- **Status Bar Indicators**: Real-time count of invalid links in current file
- **Auto-Resolution**: Automatically tries `.mdx`, `.md`, `index.mdx`, `index.md` extensions

### 📁 Advanced File Reference Tracking
Intelligent language service that automatically maintains file references:

- **Auto-Update Imports**: Updates MDX imports when files are moved or renamed
- **Auto-Update Links**: Updates internal links when files are moved or renamed
- **Bulk Operations**: Handles folder renames with automatic reference updates
- **Navigation Sync**: Updates `mint.json` navigation when files are moved
- **Real-time Analysis**: Tracks file dependencies across your documentation

### 🎯 Enhanced Developer Experience
Productivity features designed for documentation teams:

- **Context Menu Actions**: Right-click to copy internal links or import statements
- **CodeLens Actions**: Quick actions for headings, tables, and content
- **Frontmatter Support**: Easy metadata editing with templates
- **File Import Provider**: Visual file reference management
- **Progress Reporting**: Real-time feedback during bulk operations

## 🚀 Quick Start

1. **Install** the extension from VS Code Marketplace
2. **Open** your Mintlify project folder in VS Code
3. **Start typing** `<` in any `.md` or `.mdx` file to trigger component completion
4. **Use** `Ctrl+Shift+P` to access FlashMintlify commands

## 📋 Component Snippets

| Component | Trigger | Description |
|-----------|---------|-------------|
| `<Note>` | `Mintlify: Callout - Note` | Insert informational callout |
| `<Tip>` | `Mintlify: Callout - Tip` | Insert helpful tip callout |
| `<Warning>` | `Mintlify: Callout - Warning` | Insert warning callout |
| `<Info>` | `Mintlify: Callout - Info` | Insert info callout |
| `<Check>` | `Mintlify: Callout - Check` | Insert success callout |
| `<Accordion>` | `Mintlify: Accordion` | Create collapsible content |
| `<AccordionGroup>` | `Mintlify: AccordionGroup` | Group multiple accordions |
| `<CodeGroup>` | `Mintlify: CodeGroup` | Group multiple code blocks |
| `<Tabs>` | `Mintlify: Tabs` | Create tabbed content |
| `<Card>` | `Mintlify: Card` | Insert clickable card |
| `<CardGroup>` | `Mintlify: CardGroup` | Group multiple cards |
| `<Frame>` | `Mintlify: Frame` | Add image/video with caption |
| `<ParamField>` | `Mintlify: ParamField` | Document API parameters |
| `<ResponseField>` | `Mintlify: ResponseField` | Document API responses |

## 🎮 Commands & Actions

### Editor Commands
- **Insert Frontmatter**: Add Mintlify frontmatter template
- **Calculate Import References**: Analyze file dependencies

### Context Menu (Right-click on files)
- **Copy Internal Link**: Generate Mintlify internal link format `[Title](/path)`
- **Copy Import Command**: Generate MDX import statement with props

### Language Service Commands
- **Analyze References**: Debug file reference tracking
- **Reload Language Service**: Restart the language service
- **Handle Folder Rename**: Manually trigger folder rename handling

## ⚙️ Configuration

```json
{
  "flashMintlify.enableLanguageService": true
}
```

### Settings
- `flashMintlify.enableLanguageService`: Enable/disable automatic file reference tracking and updates

## 🔍 Link Validation Features

### Real-time Validation
- ✅ **Valid Internal Links**: Shows "📄 Open file" CodeLens button
- ❌ **Invalid Internal Links**: Shows "❌ Invalid internal link" warning
- ❌ **Invalid Absolute Links**: Shows "❌ Invalid absolute link" warning
- 📊 **Status Bar**: Displays count of invalid links in current file

### Link Types Supported
- **Internal Links**: `/api-reference/authentication` (Mintlify routing)
- **Absolute File Links**: `/images/logo.png` (workspace files)
- **Markdown Links**: `[text](/path)` and `[](/path)` (empty text supported)
- **MDX/JSX Links**: `<a href="/path">` and `<Link to="/path">`

## 🛠️ System Requirements

- **VS Code**: 1.73.0 or higher
- **Project Structure**: Mintlify project with `mint.json` configuration
- **File Types**: `.md`, `.mdx`, `.json`, `.yaml`, `.yml` files

## 🤝 Contributing

We welcome contributions! This extension is open source and available on GitHub.

- 🐛 **Report Issues**: Found a bug? Let us know!
- 💡 **Feature Requests**: Have an idea? We'd love to hear it!
- 🔧 **Pull Requests**: Want to contribute code? Awesome!

## 📄 License

MIT License - see LICENSE file for details.

---

**Made with ❤️ for the Mintlify community**