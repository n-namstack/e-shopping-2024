// Polyfill for Array.prototype.toReversed (needed for Node.js < 20)
if (!Array.prototype.toReversed) {
  Array.prototype.toReversed = function () {
    return this.slice().reverse();
  };
}

const { getDefaultConfig } = require('@expo/metro-config');

/** @type {import('@expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Keep package exports disabled — several packages (e.g. color-convert) use
// internal imports not listed in their exports map and break with it enabled.
// Instead, explicitly alias the React 19 JSX runtime paths that Metro can't
// find via filesystem resolution alone.
config.resolver.unstable_enablePackageExports = false;
config.resolver.extraNodeModules = {
  'react/jsx-dev-runtime': require.resolve('react/jsx-dev-runtime'),
  'react/jsx-runtime': require.resolve('react/jsx-runtime'),
};

module.exports = config; 