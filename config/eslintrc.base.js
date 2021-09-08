const jsRules = {
  'object-curly-spacing': [2, 'always'],
  'no-empty-function': 0,
  'valid-jsdoc': 0,
  'react/sort-comp': 0, // does not seem work as expected with typescript
  'mocha/no-skipped-tests': 1,
  'mocha/no-exclusive-tests': 2,
  'semi': [2, 'always'],
  'no-console': [1, { allow: ['warn', 'error', 'info'] }],
  'no-shadow': 0,
  'no-use-before-define': 0,
  'no-cond-assign': [2, 'except-parens']
}

const tsRules = {
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
  'semi': 0,
  '@typescript-eslint/semi': [2, 'always']
};

module.exports = {
  plugins: ['mocha'],
  overrides: [{
    files: ['**/*.js', '**/*.jsx'],
    extends: [
      'eslint-config-mongodb-js/react'
    ],
    rules: {
      ...jsRules
    }
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    parser: '@typescript-eslint/parser',
    extends: [
      'eslint-config-mongodb-js/react',
      'plugin:@typescript-eslint/recommended'
    ],
    rules: {
      ...jsRules,
      ...tsRules
    }
  }]
};
