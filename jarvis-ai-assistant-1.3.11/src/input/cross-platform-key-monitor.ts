/**
 * Cross-platform global key monitor for Windows and Linux.
 *
 * The macOS build uses a native Objective-C++ addon (universal_key_monitor.mm)
 * linked against Carbon/Cocoa, which only exists on macOS. This module is the
 * Windows/Linux equivalent, built on `uiohook-napi` — a maintained library
 * that ships prebuilt binaries for win32/linux/darwin (no compiler needed).
 *
 * It intentionally implements the SAME public shape as the native macOS
 * module (startMonitoring / stopMonitoring / checkAccessibilityPermissions /
 * getSupportedKeys) so that UniversalKeyService can swap between the two
 * without any change to its own logic.
 *
 * KNOWN LIMITATION / NEEDS REAL-HARDWARE TESTING:
 * uiohook-napi has no concept of a macOS-style "Fn" key on most keyboards —
 * many Windows/Linux keyboards don't expose Fn as a normal scancode at all
 * (it's often hardware-trapped by the keyboard controller). We map "fn" to
 * a sensible, commonly-available substitute (Right Alt / AltGr) by default,
 * and support common alternatives (Right Ctrl, Right Shift, etc.) so the
 * user can pick whichever key their keyboard actually reports.
 * I have not been able to verify actual key-hold timing/feel on real
 * Windows or Linux hardware — please test and tell me if the debounce
 * values or default key choice need adjusting.
 */

import { UiohookKey, uIOhook } from 'uiohook-napi';

type KeyEventCallback = (event: string) => void;

// Map friendly key names -> uiohook keycodes.
// "fn" has no standard scancode on most non-Mac keyboards, so it's aliased
// to Right Alt (AltGr) by default — the closest "modifier held alone" key
// available cross-platform. Users can pick a different key from
// getSupportedKeys() if Right Alt doesn't work well on their layout.
const KEY_MAP: Record<string, number> = {
  fn: UiohookKey.AltRight,
  option: UiohookKey.AltRight,
  alt: UiohookKey.Alt,
  altright: UiohookKey.AltRight,
  control: UiohookKey.Ctrl,
  ctrlright: UiohookKey.CtrlRight,
  shift: UiohookKey.Shift,
  shiftright: UiohookKey.ShiftRight,
  capslock: UiohookKey.CapsLock,
};

export class CrossPlatformKeyMonitor {
  private isMonitoring = false;
  private currentKeycode: number | null = null;
  private currentKeyName = '';
  private isKeyDown = false;
  private callback: KeyEventCallback | null = null;
  private keydownHandler = (e: { keycode: number }) => this.handleKeyDown(e);
  private keyupHandler = (e: { keycode: number }) => this.handleKeyUp(e);
  private hookStarted = false;

  /**
   * Windows/Linux don't use macOS "Accessibility" permissions for global
   * key listening the way macOS does. uiohook-napi works without any
   * special OS permission grant on Windows. On Linux (X11) it generally
   * works out of the box for the logged-in user session; on Wayland,
   * global key hooking can be restricted by the compositor — if that's
   * the case for a user, this will simply fail to receive events, which
   * we can't detect ahead of time from here.
   */
  checkAccessibilityPermissions(): boolean {
    return true;
  }

  getSupportedKeys(): string[] {
    return Object.keys(KEY_MAP);
  }

  startMonitoring(keyName: string, callback: KeyEventCallback): boolean {
    const normalized = keyName.toLowerCase();
    const keycode = KEY_MAP[normalized];

    if (keycode === undefined) {
      console.error(
        `[CrossPlatformKeyMonitor] Unsupported key "${keyName}". ` +
        `Supported: ${this.getSupportedKeys().join(', ')}`
      );
      return false;
    }

    this.currentKeycode = keycode;
    this.currentKeyName = normalized;
    this.callback = callback;

    try {
      if (!this.hookStarted) {
        uIOhook.on('keydown', this.keydownHandler);
        uIOhook.on('keyup', this.keyupHandler);
        uIOhook.start();
        this.hookStarted = true;
      }
      this.isMonitoring = true;
      console.log(
        `[CrossPlatformKeyMonitor] Monitoring started for "${keyName}" ` +
        `(mapped to keycode ${keycode})`
      );
      return true;
    } catch (error) {
      console.error('[CrossPlatformKeyMonitor] Failed to start uiohook:', error);
      return false;
    }
  }

  stopMonitoring(): boolean {
    if (!this.isMonitoring) return true;

    try {
      uIOhook.removeListener('keydown', this.keydownHandler);
      uIOhook.removeListener('keyup', this.keyupHandler);
      uIOhook.stop();
      this.hookStarted = false;
      this.isMonitoring = false;
      this.isKeyDown = false;
      this.callback = null;
      console.log('[CrossPlatformKeyMonitor] Monitoring stopped');
      return true;
    } catch (error) {
      console.error('[CrossPlatformKeyMonitor] Error stopping uiohook:', error);
      return false;
    }
  }

  private handleKeyDown(e: { keycode: number }): void {
    if (!this.isMonitoring || this.currentKeycode === null) return;
    if (e.keycode !== this.currentKeycode) return;
    if (this.isKeyDown) return; // ignore OS key-repeat

    this.isKeyDown = true;
    this.callback?.(`${this.currentKeyName.toUpperCase()}_KEY_DOWN`);
  }

  private handleKeyUp(e: { keycode: number }): void {
    if (!this.isMonitoring || this.currentKeycode === null) return;
    if (e.keycode !== this.currentKeycode) return;

    this.isKeyDown = false;
    this.callback?.(`${this.currentKeyName.toUpperCase()}_KEY_UP`);
  }
}
