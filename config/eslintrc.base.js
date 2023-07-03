'use strict';

const shared = require('@mongodb-js/eslint-config-devtools');
const common = require('@mongodb-js/eslint-config-devtools/common');

// TODO: this is temporary just so we can commit something for now
const tempRules = {
  'jsx-a11y/no-autofocus': 1,
  'jsx-a11y/click-events-have-key-events': 1,
  'jsx-a11y/no-static-element-interactions': 1,
  'jsx-a11y/anchor-is-valid': 1,

  'mocha/no-exports': 1,
  'mocha/max-top-level-suites': 1,
  'mocha/no-identical-title': 1,
  'mocha/no-sibling-hooks': 1,
  'mocha/no-nested-tests': 1,

  'filename-rules/match': 1,

  'no-useless-escape': 1,
  'no-undef': 1,
  'no-prototype-builtins': 1,
  'no-async-promise-executor': 1,
  'no-case-declarations': 1,
};

// TODO: this is temporary just so we can commit something for now
const tempTypescriptRules = {
  '@typescript-eslint/no-unnecessary-type-assertion': 1,
  '@typescript-eslint/restrict-plus-operands': 1,
  '@typescript-eslint/no-var-requires': 1,
  '@typescript-eslint/restrict-template-expressions': 1,
  '@typescript-eslint/no-empty-function': 1,
  '@typescript-eslint/no-misused-promises': 1,
  '@typescript-eslint/consistent-type-imports': 1,
  '@typescript-eslint/unbound-method': 1,
  '@typescript-eslint/no-implied-eval': 1,
  '@typescript-eslint/no-unused-vars': 1,
  '@typescript-eslint/prefer-regexp-exec': 1,
  '@typescript-eslint/ban-types': 1,
};

const jsOverrides = {
  ...common.jsOverrides,
  rules: {
    ...tempRules
  }
};

const jsxOverrides = {
  ...common.jsxOverrides,
  rules: {
    ...tempRules
  }
};

const tsOverrides = {
  ...common.tsOverrides,
  rules: {
    ...common.tsRules,
    ...tempRules,
    ...tempTypescriptRules
  },
};

const tsxOverrides = {
  ...common.tsxOverrides,
  rules: {
    ...common.tsxRules,
    ...tempRules,
    ...tempTypescriptRules
  },
};

const testOverrides = {
  ...common.testOverrides,
  rules: {
    ...common.testRules,
    ...tempRules,
    ...tempTypescriptRules
  },
};

module.exports = {
  plugins: [...shared.plugins],
  rules: {
    ...shared.rules,
  },
  env: {
    ...shared.env,
  },
  overrides: [
    jsOverrides,
    jsxOverrides,
    tsOverrides,
    tsxOverrides,
    testOverrides,
  ],
  settings: {
    ...shared.settings,
  },
};

/*
const typescriptEslintEslintPlugin = require('@typescript-eslint/eslint-plugin');

// ovrerrides do not work with extends
const ruleOverridesForJs = Object.keys(typescriptEslintEslintPlugin.rules).reduce(
  (overrides, rule) => ({ ...overrides, [`@typescript-eslint/${rule}`]: 0 }), {}
);

module.exports = {
  plugins: ['mocha'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.lint.json'
  },
  extends: [
    'eslint-config-mongodb-js/react',
    'plugin:@typescript-eslint/recommended'
  ],
  rules: {
    'object-curly-spacing': [2, 'always'],
    'no-empty-function': 0,
    'valid-jsdoc': 0,
    'react/sort-comp': 0, // does not seem work as expected with typescript
    'react/prop-types': 0,
    '@typescript-eslint/no-empty-function': 0,
    '@typescript-eslint/no-use-before-define': 0,
    '@typescript-eslint/no-explicit-any': 0,
    '@typescript-eslint/no-var-requires': 0, // seems necessary to import less files
    '@typescript-eslint/no-unused-vars': 2,
    '@typescript-eslint/no-floating-promises': 2,
    '@typescript-eslint/await-thenable': 2,
    '@typescript-eslint/require-await': 2,
    '@typescript-eslint/explicit-module-boundary-types': 0,
    '@typescript-eslint/ban-types': 0,
    'mocha/no-skipped-tests': 1,
    'mocha/no-exclusive-tests': 2,
    'semi': 0,
    '@typescript-eslint/semi': [2, 'always'],
    'no-console': [1, { allow: ['warn', 'error', 'info'] }],
    'no-shadow': 0,
    'no-use-before-define': 0,
    'no-cond-assign': [2, 'except-parens'],
    'no-multi-str': 0
  },
  overrides: [{
    files: ['**\/*.js'],
    rules: {
      ...ruleOverridesForJs,
      semi: [2, 'always']
    }
  }]
};
*/