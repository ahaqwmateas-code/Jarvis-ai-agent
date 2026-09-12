#!/usr/bin/env node
/**
 * Builds the macOS native addons (Fn key monitor, audio capture, typing
 * monitor, etc.) via node-gyp — but ONLY on macOS.
 *
 * These addons are Objective-C++ linked against Carbon/Cocoa/AppKit/
 * AVFoundation and cannot be compiled on Windows or Linux. On those
 * platforms the app uses the cross-platform fallbacks in
 * src/input/cross-platform-key-monitor.ts and
 * src/audio/cross-platform-audio-recorder.ts instead, so skipping the
 * native build here is expected behavior, not an error.
 */
const { execSync } = require('child_process');

if (process.platform !== 'darwin') {
  console.log(
    `[build-native] Skipping node-gyp rebuild on ${process.platform} — ` +
    `macOS-only native modules are not needed here. Cross-platform ` +
    `fallbacks (uiohook-napi / naudiodon2) will be used instead.`
  );
  process.exit(0);
}

try {
  execSync('node-gyp rebuild', { stdio: 'inherit' });
} catch (err) {
  console.error('[build-native] node-gyp rebuild failed on macOS:', err.message);
  process.exit(1);
}
