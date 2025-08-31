/**
 * FlashMintlify - Setting change listener provider
 *
 * @author Match-Yang(OliverYeung)
 * @email oliver.yeung.me@gmail.com
 * @license MIT
 */
import * as vscode from "vscode";

export function createSettingChangedListenerProvider() {
  return vscode.workspace.onDidChangeConfiguration(() => {
    // 目前不需要监听任何配置变化
  });
}