/**
 * Cross-platform paste helper for Windows and Linux.
 *
 * The macOS version (paste-helper.ts) shells out to `osascript` (AppleScript)
 * for a dozen different paste strategies tuned to specific macOS apps
 * (Notes.app, System Events focus quirks, etc.) — none of which exist on
 * Windows/Linux. This file implements the SAME exported function names that
 * processor.ts imports, so processor.ts only needs a one-line platform
 * switch on which module it imports, with zero other changes.
 *
 * The underlying strategy here is simple and works the same way on both
 * platforms: write the text to the OS clipboard, then simulate Ctrl+V via
 * `@nut-tree-fork/nut-js` (a maintained, cross-platform keyboard/mouse
 * automation library with prebuilt native binaries).
 *
 * All 12 "different methods" from the macOS file collapse into this single
 * real implementation here — they were mostly macOS-app-specific fallbacks
 * (e.g. Notes.app-only quirks) that have no Windows/Linux equivalent yet.
 *
 * NEEDS REAL-HARDWARE TESTING: I can't verify actual paste behavior across
 * different Windows/Linux apps (browsers, terminals, editors) without a
 * physical machine. If a particular app doesn't accept simulated Ctrl+V,
 * please report which app so a targeted fallback can be added.
 */

import { clipboard, Notification } from 'electron';
import { Logger } from '../core/logger';

async function pasteViaClipboardAndKeystroke(text: string): Promise<boolean> {
  try {
    clipboard.writeText(text);

    // Lazy-load nut-js so its native binary is only touched on this path.
    const { keyboard, Key } = eval('require')('@nut-tree-fork/nut-js');

    const pasteModifier = process.platform === 'darwin' ? Key.LeftSuper : Key.LeftControl;
    await keyboard.pressKey(pasteModifier, Key.V);
    await keyboard.releaseKey(pasteModifier, Key.V);

    return true;
  } catch (error) {
    Logger.error('❌ [CrossPlatformPaste] Failed to paste via clipboard+keystroke:', error);
    return false;
  }
}

export async function checkSystemPermissions(): Promise<boolean> {
  // Windows/Linux don't require an Accessibility-style grant for
  // clipboard + simulated keystrokes the way macOS does.
  return true;
}

export function forcePermissionRefresh(): void {
  // No-op cross-platform: nothing to refresh.
}

export function showFailureNotification(message: string): void {
  try {
    new Notification({ title: 'Jarvis', body: message }).show();
  } catch (error) {
    Logger.debug('[CrossPlatformPaste] Failed to show notification:', error);
  }
}

export function showSuccessNotification(message: string): void {
  try {
    new Notification({ title: 'Jarvis', body: message }).show();
  } catch (error) {
    Logger.debug('[CrossPlatformPaste] Failed to show notification:', error);
  }
}

export async function getActiveApp(): Promise<string | null> {
  // No cross-platform equivalent wired up yet (macOS uses System Events).
  // Returning null is handled gracefully by every caller in processor.ts.
  return null;
}

export async function fastPasteMethod(text: string): Promise<boolean> {
  return pasteViaClipboardAndKeystroke(text);
}

export async function pasteWithDirectKeystroke(text: string): Promise<boolean> {
  return pasteViaClipboardAndKeystroke(text);
}

export async function pasteWithFocusCheck(text: string): Promise<boolean> {
  return pasteViaClipboardAndKeystroke(text);
}

export async function pasteToNotesApp(text: string): Promise<boolean> {
  // Notes.app is macOS-only; just do the standard paste.
  return pasteViaClipboardAndKeystroke(text);
}

export async function pasteForWebApps(text: string): Promise<boolean> {
  return pasteViaClipboardAndKeystroke(text);
}

export async function directTypeMethod(text: string): Promise<boolean> {
  try {
    const { keyboard } = eval('require')('@nut-tree-fork/nut-js');
    await keyboard.type(text);
    return true;
  } catch (error) {
    Logger.error('❌ [CrossPlatformPaste] Direct type failed:', error);
    return false;
  }
}

export async function simpleFastPaste(text: string): Promise<boolean> {
  return pasteViaClipboardAndKeystroke(text);
}
