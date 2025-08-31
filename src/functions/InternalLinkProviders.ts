/**
 * FlashMintlify - Internal link providers for markdown files
 *
 * @author Match-Yang(OliverYeung)
 * @email oliver.yeung.me@gmail.com
 * @license MIT
 */
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

const INTERNAL_LINK_MARKDOWN = /\[([^\]]*)\]\(([^)]+)\)/g; // allow empty text
const INTERNAL_ATTR = /(href|to)\s*=\s*["']([^"']+)["']/gi; // <a href> or <Link to|href>

function workspaceRoot(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}



function isInternalLink(link: string): boolean {
  // Internal links: /path/without/extension (no file extension)
  return link.startsWith('/') &&
         !link.includes('http') &&
         !path.extname(link); // no extension
}

function isAbsoluteFileLink(link: string): boolean {
  // Absolute file links: /images/file.png (with file extension)
  return link.startsWith('/') &&
         !link.includes('http') &&
         !!path.extname(link); // has extension
}

function resolveInternalLinkToFs(link: string): string | undefined {
  const root = workspaceRoot();
  if (!root) return undefined;
  if (!isInternalLink(link)) return undefined;

  const without = link.replace(/^\//, '');
  const base = path.join(root, without);

  const candidates = [
    `${base}.mdx`,
    `${base}.md`,
    path.join(base, 'index.mdx'),
    path.join(base, 'index.md')
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return undefined;
}

function resolveAbsoluteFileLink(link: string): boolean {
  const root = workspaceRoot();
  if (!root) return false;
  if (!isAbsoluteFileLink(link)) return false;

  const without = link.replace(/^\//, '');
  const fullPath = path.join(root, without);

  return fs.existsSync(fullPath);
}

export class InternalLinkCodeLensProvider implements vscode.CodeLensProvider {
  private onDidChangeCodeLensesEmitter = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses = this.onDidChangeCodeLensesEmitter.event;

  private statusBar: vscode.StatusBarItem;

  constructor(statusBar: vscode.StatusBarItem) {
    this.statusBar = statusBar;

    vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.languageId === 'markdown' || e.document.languageId === 'mdx') {
        this.onDidChangeCodeLensesEmitter.fire();
        this.updateStatusBar(e.document);
      }
    });

    vscode.window.onDidChangeActiveTextEditor((ed) => {
      if (ed && (ed.document.languageId === 'markdown' || ed.document.languageId === 'mdx')) {
        this.onDidChangeCodeLensesEmitter.fire();
        this.updateStatusBar(ed.document);
      } else {
        this.statusBar.hide();
      }
    });

    // Initialize status bar for current active editor
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor && (activeEditor.document.languageId === 'markdown' || activeEditor.document.languageId === 'mdx')) {
      this.updateStatusBar(activeEditor.document);
    }
  }

  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const lenses: vscode.CodeLens[] = [];
    if (!(document.languageId === 'markdown' || document.languageId === 'mdx')) return lenses;

    let invalidInternalCount = 0;
    let invalidAbsoluteCount = 0;

    const text = document.getText();

    // Markdown style links
    for (const match of text.matchAll(INTERNAL_LINK_MARKDOWN)) {
      const full = match[0];
      const idx = match.index ?? 0;
      const linkPath = match[2];
      if (linkPath && linkPath.startsWith('/') && !linkPath.includes('http')) {
        const start = document.positionAt(idx);
        const end = document.positionAt(idx + full.length);
        const range = new vscode.Range(start, end);

        if (isInternalLink(linkPath)) {
          // Handle internal links (no extension)
          const fsPath = resolveInternalLinkToFs(linkPath);
          if (!fsPath) {
            invalidInternalCount++;
            lenses.push(new vscode.CodeLens(range, {
              title: `❌ Invalid internal link: ${linkPath}`,
              command: ''
            }));
          } else {
            // Add "Open file" button for valid internal links
            lenses.push(new vscode.CodeLens(range, {
              title: `$(file-text) Open file`,
              command: 'vscode.open',
              arguments: [vscode.Uri.file(fsPath)]
            }));
          }
        } else if (isAbsoluteFileLink(linkPath)) {
          // Handle absolute file links (with extension)
          const exists = resolveAbsoluteFileLink(linkPath);
          if (!exists) {
            invalidAbsoluteCount++;
            lenses.push(new vscode.CodeLens(range, {
              title: `❌ Invalid absolute link: ${linkPath}`,
              command: ''
            }));
          }
          // No "Open file" button for absolute links, just validation
        }
      }
    }

    // Attribute style links (MDX/JSX)
    for (const match of text.matchAll(INTERNAL_ATTR)) {
      const full = match[0];
      const idx = match.index ?? 0;
      const url = match[2];
      if (url && url.startsWith('/') && !url.includes('http')) {
        const start = document.positionAt(idx);
        const end = document.positionAt(idx + full.length);
        const range = new vscode.Range(start, end);

        if (isInternalLink(url)) {
          // Handle internal links (no extension)
          const fsPath = resolveInternalLinkToFs(url);
          if (!fsPath) {
            invalidInternalCount++;
            lenses.push(new vscode.CodeLens(range, {
              title: `❌ Invalid internal link: ${url}`,
              command: ''
            }));
          } else {
            // Add "Open file" button for valid internal links
            lenses.push(new vscode.CodeLens(range, {
              title: `$(file-text) Open file`,
              command: 'vscode.open',
              arguments: [vscode.Uri.file(fsPath)]
            }));
          }
        } else if (isAbsoluteFileLink(url)) {
          // Handle absolute file links (with extension)
          const exists = resolveAbsoluteFileLink(url);
          if (!exists) {
            invalidAbsoluteCount++;
            lenses.push(new vscode.CodeLens(range, {
              title: `❌ Invalid absolute link: ${url}`,
              command: ''
            }));
          }
          // No "Open file" button for absolute links, just validation
        }
      }
    }

    // Update status bar for this document
    this.updateStatusBar(document, invalidInternalCount, invalidAbsoluteCount);

    return lenses;
  }

  private updateStatusBar(document: vscode.TextDocument, invalidInternalCount?: number, invalidAbsoluteCount?: number) {
    if (!(document.languageId === 'markdown' || document.languageId === 'mdx')) {
      this.statusBar.hide();
      return;
    }

    if (invalidInternalCount === undefined || invalidAbsoluteCount === undefined) {
      // re-scan quickly to count
      const text = document.getText();
      let internalCount = 0;
      let absoluteCount = 0;

      for (const m of text.matchAll(INTERNAL_LINK_MARKDOWN)) {
        const link = m[2];
        if (link && link.startsWith('/') && !link.includes('http')) {
          if (isInternalLink(link) && !resolveInternalLinkToFs(link)) {
            internalCount++;
          } else if (isAbsoluteFileLink(link) && !resolveAbsoluteFileLink(link)) {
            absoluteCount++;
          }
        }
      }

      for (const m of text.matchAll(INTERNAL_ATTR)) {
        const url = m[2];
        if (url && url.startsWith('/') && !url.includes('http')) {
          if (isInternalLink(url) && !resolveInternalLinkToFs(url)) {
            internalCount++;
          } else if (isAbsoluteFileLink(url) && !resolveAbsoluteFileLink(url)) {
            absoluteCount++;
          }
        }
      }

      invalidInternalCount = internalCount;
      invalidAbsoluteCount = absoluteCount;
    }

    const totalInvalid = invalidInternalCount + invalidAbsoluteCount;
    const parts = [];
    if (invalidInternalCount > 0) parts.push(`${invalidInternalCount} internal`);
    if (invalidAbsoluteCount > 0) parts.push(`${invalidAbsoluteCount} absolute`);

    if (totalInvalid > 0) {
      this.statusBar.text = `$(error) Invalid links: ${parts.join(', ')}`;
      this.statusBar.tooltip = `Invalid links in current file: ${invalidInternalCount} internal links, ${invalidAbsoluteCount} absolute links`;
    } else {
      this.statusBar.text = `$(check) All links valid`;
      this.statusBar.tooltip = 'All links in current file are valid';
    }

    this.statusBar.show();
  }
}


