// Polyfill for Array.prototype.toReversed (needed for Node.js < 20)
if (!Array.prototype.toReversed) {
  Array.prototype.toReversed = function () {
    return this.slice().reverse();
  };
}

const { getDefaultConfig } = require('@expo/metro-config');

/** @type {import('@expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// React 19 requires package exports to resolve jsx-dev-runtime and jsx-runtime.
// Keep enabled; Node.js stdlib conflicts are handled by react-native-url-polyfill.
config.resolver.unstable_enablePackageExports = true;

module.exports = config; 