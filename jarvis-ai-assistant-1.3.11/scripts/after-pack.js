/**
 * ⚠️ PLACEHOLDER — see scripts/after-sign.js for why this exists. This file
 * was also missing from the project zip. electron-builder's `afterPack`
 * config points at this exact path and hard-fails on ALL platforms
 * (including macOS) if it's missing entirely.
 *
 * ACTION NEEDED: replace this file with your actual after-pack.js from
 * your GitHub repo before pushing.
 */
module.exports = async function afterPack(context) {
  console.log(
    `[after-pack] ⚠️ Placeholder afterPack hook running for ` +
    `${context.electronPlatformName}. Replace scripts/after-pack.js with ` +
    `your real implementation.`
  );
};
