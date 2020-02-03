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
  rules: {
    'valid-jsdoc': 0,
    'react/sort-comp': 0, // does not seem work as expected with typescript
    '@typescript-eslint/no-explicit-any': 0
  },
  overrides: [{
    files: ['**/*.js'],
    rules: ruleOverridesForJs
  }]
};
