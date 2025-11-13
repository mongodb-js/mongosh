import type { KnipConfig } from "knip";

const config: KnipConfig = {
  // Ignore patterns for files that should not be analyzed
  ignore: [
    // Build outputs
    "**/lib/**",
    "**/dist/**",
    "**/build/**",
    "**/coverage/**",
    "**/.nyc_output/**",
    // Generated files
    "**/tmp/**",
    "**/.sbom/**",
    "**/test/data/**",
    // Configuration files (from depcheck ignore-patterns)
    ".evergreen/**",
    "config/**",
    "configs/**",
    "**/.eslintrc.js",
    "testing/tsconfig.json",
  ],

  // Received from @mongodb-js/sbom-tools
  ignoreBinaries: ["mongodb-sbom-tools"],

  // Workspace-specific configurations
  workspaces: {
    // Root package (monorepo root, no entry file needed)
    ".": {
      entry: [],
      project: [],
    },

    // Config packages
    "configs/eslint-config-mongosh": {
      entry: ["utils.js"],
    },

    "configs/tsconfig-mongosh": {
      entry: ["tsconfig.common.json"],
    },

    // Special cases for packages with different entry points
    "packages/cli-repl": {
      entry: ["dist/add-module-mapping.js"],
      project: ["src/**/*.ts", "bin/**/*.js"],
      ignoreDependencies: [
        // Eagerly loaded startup snapshot dependencies
        "@mongodb-js/saslprep",
        "socks",
        "emphasize",
        "ipv6-normalize",
        "bindings",
        "system-ca",
        // Used for monkey-patching our s390x fix
        "@tootallnate/quickjs-emscripten",
      ],
    },

    "packages/shell-api": {
      entry: ["src/api.ts"],
    },

    "packages/mongosh": {
      project: ["bin/**/*.js"],
    },

    "packages/e2e-tests": {
      entry: ["test/**/*.ts", "test/fixtures/**/*"],
    },

    "packages/service-provider-node-driver": {
      ignoreDependencies: [
        // Used for MONGODB-AWS auth
        // See: https://github.com/mongodb-js/mongosh/pull/1149
        // See: https://jira.mongodb.org/browse/NODE-5005
        "aws4",
      ],
    },

    "packages/node-runtime-worker-thread": {
      ignoreDependencies: [
        // Used in worker thread context
        "system-ca",
      ],
      ignoreFiles: [
        // Used in package.json
        "tests/register-worker.js",
      ],
    },

    "packages/browser-repl": {
      project: ["src/**/*.{ts,tsx}"],
      ignoreDependencies: [
        // Babel plugins used by webpack config
        "@babel/plugin-proposal-class-properties",
        "@babel/preset-react",
        "@babel/preset-typescript",
        // Testing dependencies
        "@types/sinon-chai",
        "@wojtekmaj/enzyme-adapter-react-17",
        "enzyme",
        // Karma test runner plugins
        "karma-chrome-launcher",
        "karma-mocha",
        "karma-mocha-reporter",
        "karma-typescript",
        // Resolved as `<depname>/` so depcheck doesn't see it being used
        "buffer",
        "util",
      ],
    },

    "packages/java-shell": {
      project: ["src/main/js/**/*"],
      ignoreDependencies: [
        // Used in webpack and build scripts
        "bson",
        "tr46",
      ],
    },

    "packages/connectivity-tests": {
      // This package only contains bash test scripts
      ignoreDependencies: [
        // Used by test scripts
        "mongosh",
      ],
    },

    "packages/async-rewriter2": {
      entry: ["test/fixtures/**/*"],
      ignoreFiles: [
        // Used by make-runtime-support.js
        "src/runtime-support.nocov.js",
      ],
    },

    "packages/snippet-manager": {
      entry: ["test/fixtures/**/*"],
    },

    testing: {
      entry: [
        "eventually.ts",
        "fake-kms.ts",
        "integration-testing-hooks.ts",
        "disable-dns-srv.js",
      ],
      ignoreDependencies: [
        // Used in testing infrastructure
        "mongodb-connection-string-url",
        "@mongosh/build",
      ],
    },
  },

  // Mocha test files configuration
  mocha: {
    config: ["**/mocharc.{js,json,yml,yaml}", "**/.mocharc.{js,json,yml,yaml}"],
    entry: ["**/*.spec.{ts,tsx,js}", "**/*.test.{ts,tsx,js}"],
  },

  // TypeScript configuration
  typescript: {
    config: [
      "tsconfig.json",
      "tsconfig-lint.json",
      "**/tsconfig.json",
      "**/tsconfig-lint.json",
      "configs/tsconfig-mongosh/tsconfig.common.json",
    ],
  },

  // Webpack configuration
  webpack: {
    config: ["config/webpack.base.config.js", "**/webpack.config.js"],
  },

  // ESLint configuration
  eslint: {
    config: [
      "configs/eslint-config-mongosh/index.js",
      "**/.eslintrc.{js,json}",
    ],
  },

  // Prettier configuration
  prettier: {
    config: [
      ".prettierrc",
      ".prettierrc.{js,json,yml,yaml}",
      "prettier.config.js",
    ],
  },

  // Nyc (test coverage) configuration
  nyc: {
    config: [".nycrc", ".nycrc.{json,yml,yaml}", "nyc.config.js"],
  },
};

export default config;
