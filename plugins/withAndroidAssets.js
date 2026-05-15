const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withAndroidAssets(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const assetsDir = path.join(
        config.modRequest.platformProjectRoot,
        'app', 'src', 'main', 'assets'
      );
      fs.mkdirSync(assetsDir, { recursive: true });

      const srcDir = path.join(config.modRequest.projectRoot, 'android-assets');
      if (fs.existsSync(srcDir)) {
        for (const file of fs.readdirSync(srcDir)) {
          fs.copyFileSync(
            path.join(srcDir, file),
            path.join(assetsDir, file)
          );
        }
      }
      return config;
    },
  ]);
};
