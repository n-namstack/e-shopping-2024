// Polyfill for Array.prototype.toReversed (needed for Node.js < 20)
if (!Array.prototype.toReversed) {
  Array.prototype.toReversed = function () {
    return this.slice().reverse();
  };
}

const { getDefaultConfig } = require('@expo/metro-config');

/** @type {import('@expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Disable package.json exports resolution to fix Node.js standard library import issues
config.resolver.unstable_enablePackageExports = false;

module.exports = config; 