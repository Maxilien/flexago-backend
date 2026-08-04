// i18next-cli.config.js
module.exports = {
  input: [
    'src/**/*.{js,jsx,ts,tsx}',
    'routes/**/*.js',
    'controllers/**/*.js',
  ],
  output: '../Frontend/public/locales/$LOCALE/$NAMESPACE.json',
  locales: ['en', 'es', 'fr', 'pt', 'de', 'zh', 'ar'],
  defaultNamespace: 'common',
  defaultValue: '',     // leaves untranslated keys blank for auto-fill
  keepRemoved: false,   // auto-cleans deleted keys
  sort: true,
};
