/**
 * ⚠️ PLACEHOLDER — this file was missing from the project zip you gave me
 * (likely because your real .gitignore only allows scripts/notarization/
 * through, and this file lives elsewhere in your actual git history, or is
 * tracked but wasn't included in this particular export).
 *
 * electron-builder's `afterSign` config points at this exact path, and it
 * hard-fails the build on ALL platforms if the file doesn't exist at all —
 * so this stub exists only to keep the build from crashing while you
 * restore your real notarization/signing logic here.
 *
 * ACTION NEEDED: replace this file with your actual after-sign.js from
 * your GitHub repo before pushing. If you don't have one and this is
 * genuinely a new gap, this no-op is safe to keep for unsigned Windows/
 * Linux builds, but macOS release builds should be signed/notarized.
 */
module.exports = async function afterSign(context) {
  if (context.electronPlatformName !== 'darwin') {
    // No-op on Windows/Linux — signing/notarization here is macOS-specific.
    return;
  }

  console.log(
    '[after-sign] ⚠️ Placeholder afterSign hook running — no notarization ' +
    'performed. Replace scripts/after-sign.js with your real implementation.'
  );
};
