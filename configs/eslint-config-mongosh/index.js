'use strict';

const shared = require('@mongodb-js/eslint-config-devtools');
const common = require('@mongodb-js/eslint-config-devtools/common');

const extraJSRules = {
  'jsx-a11y/no-autofocus': 1,
  'jsx-a11y/click-events-have-key-events': 1,
  'jsx-a11y/no-static-element-interactions': 1,
  'jsx-a11y/anchor-is-valid': 1,

  'mocha/no-exports': 1,
  'mocha/max-top-level-suites': 1,
  'mocha/no-sibling-hooks': 1,

  // this would disallow our locale files' filenames like de_DE.ts
  'filename-rules/match': 1,

  // TODO(MONGOSH-1580): re-enable this rule
  'no-case-declarations': 1,
};

// TODO(MONGOSH-1508) we need to turn these back into errors (and fix them) or ticket them
const tempTypescriptRules = {
  // this rule causes many false positives, so we leave it to just warn
  '@typescript-eslint/no-unnecessary-type-assertion': 1,

  '@typescript-eslint/restrict-plus-operands': 1,
  '@typescript-eslint/no-var-requires': 1,
  '@typescript-eslint/restrict-template-expressions': 1,
  '@typescript-eslint/no-empty-function': 1,
  '@typescript-eslint/no-misused-promises': 1,
  '@typescript-eslint/unbound-method': 1,
  '@typescript-eslint/no-implied-eval': 1,
  '@typescript-eslint/no-unused-vars': 1,
  '@typescript-eslint/prefer-regexp-exec': 1,
  '@typescript-eslint/ban-types': 1,
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
    {
      ...common.jsOverrides,
      rules: {
        ...common.jsRules,
        ...extraJSRules,
      },
    },
    {
      ...common.jsxOverrides,
      rules: {
        ...common.jsxRules,
        ...extraJSRules,
      },
    },
    {
      ...common.tsOverrides,
      rules: {
        ...common.tsRules,
        ...extraJSRules,
        ...tempTypescriptRules,
      },
    },
    {
      ...common.tsxOverrides,
      rules: {
        ...common.tsxRules,
        ...extraJSRules,
        ...tempTypescriptRules,
      },
    },
    {
      ...common.testOverrides,
      rules: {
        ...common.testRules,
        ...extraJSRules,
      },
    },
    {
      ...common.testOverrides,
      files: ['**/*.spec.ts', '**/*.spec.tsx', '**/*.test.tsx', '**/*.test.ts'],
      rules: {
        ...common.testRules,
        ...extraJSRules,
        ...tempTypescriptRules,
      },
    },
  ],
  settings: {
    ...shared.settings,
  },
};
