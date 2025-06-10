module.exports = function(api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo', 
        { 
          unstable_transformImportMeta: true 
        }
      ]
    ],
    plugins: [
      'nativewind/babel',
      ['@babel/plugin-transform-runtime', {
        regenerator: true
      }]
    ],
  };
};
