const typescriptEslintEslintPlugin = require('@typescript-eslint/eslint-plugin');

// ovrerrides do not work with extends
const ruleOverridesForJs = Object.keys(typescriptEslintEslintPlugin.rules).reduce(
  (overrides, rule) => ({...overrides, [`@typescript-eslint/${rule}`]: 0}), {}
);

module.exports = {
  extends: [
    'eslint-config-mongodb-js/react',
    'plugin:@typescript-eslint/recommended'
  ],
  overrides: [{
    files: ['**/*.js'],
    rules: ruleOverridesForJs
  }]
};
