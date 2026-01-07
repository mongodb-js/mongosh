import type { KnipConfig } from "knip";
import fs from "fs";

// Create an empty file to satisfy the knip rule for async-rewriter2
fs.writeFileSync(
  "packages/async-rewriter2/src/runtime-support.out.nocov.ts",
  ""
);

const config: KnipConfig = {
  rules: {
    // Disable checking for unused exports, unused exported types, and duplicate dependencies.
    exports: "off",
    types: "off",
    duplicates: "off",
  },
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
    // Configuration files
    ".evergreen/**",
    "config/**",
    "configs/**",
    "**/.eslintrc.js",
  ],

  // Received from @mongodb-js/sbom-tools
  ignoreBinaries: ["mongodb-sbom-tools"],

  // Workspace-specific configurations
  workspaces: {
    // Root package (monorepo root, no entry file needed)
    ".": {
      entry: ["scripts/*.ts"],
      project: [],
      ignoreBinaries: [
        // Lerna is listed as an optional dependency.
        "lerna",
      ],
      ignoreDependencies: [
        // Shared lint and build-related dependencies
        "@mongodb-js/eslint-config-mongosh",
        "@mongodb-js/tsconfig-mongosh",
      ],
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
      project: ["src/**/*.ts!", "bin/**/*.js", "test/**/*.ts"],
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
      entry: ["src/api.ts!", "scripts/*.ts", "test/*.ts"],
    },

    "packages/mongosh": {
      project: ["bin/**/*.js"],
    },

    "packages/e2e-tests": {
      entry: ["test/**/*.ts", "test/fixtures/**/*"],
      ignoreDependencies: [
        // This is used for version check. TODO: Consider changing that test.
        "@mongosh/cli-repl",
      ],
    },

    "scripts/docker": {
      ignoreDependencies: [
        // Used by build.sh script.
        "mongodb-crypt-library-version",
      ],
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

    "packages/errors": {
      entry: ["src/index.ts!", "scripts/*.ts"],
    },

    "packages/browser-repl": {
      entry: ["src/index.tsx!", "config/*.js"],
      project: ["src/**/*.{ts,tsx}!"],
      ignoreDependencies: [
        "@wojtekmaj/enzyme-adapter-react-17",
        "enzyme",
        // Karma test runner plugins
        "karma-chrome-launcher",
        "karma-mocha",
        "karma-mocha-reporter",
        "karma-typescript",
        // Resolved as `<depname>/`
        "buffer",
        "util",
      ],
    },

    "packages/java-shell": {
      entry: ["src/test/js/run-tests.ts"],
      project: ["src/main/js/**/*"],
      ignoreDependencies: [
        // Used in webpack and build scripts
        "tr46",
        "assert",
        "buffer",
        "util",
        // Needed to run tests
        "@mongosh/cli-repl",
      ],
    },

    "packages/connectivity-tests": {
      entry: ["scripts/disable-dns-srv.js"],
      // This package only contains bash test scripts
      ignoreDependencies: [
        // Used by test scripts
        "mongosh",
      ],
    },

    "packages/async-rewriter2": {
      entry: [
        "src/index.ts!",
        "bin/*.js!",
        "test/fixtures/**/*",
        "scripts/*.js",
        "benchmark/index.ts",
      ],
      ignoreFiles: [
        // Used by make-runtime-support.js
        "src/runtime-support.nocov.js",
      ],
    },

    "packages/snippet-manager": {
      entry: ["test/fixtures/**/*"],
    },

    testing: {
      entry: ["src/**/*.ts"],
      project: ["src/**/*.ts"],
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
    config: [
      "config/webpack.base.config.js",
      "**/webpack.config.js",
      "**/webpack.config.*.js",
    ],
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
