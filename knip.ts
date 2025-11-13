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
    // Test fixtures and data
    "**/test/fixtures/**",
    "**/test/data/**",
    // Docker and scripts that are executed directly
    "scripts/docker/**",
    // Async rewriter3 has its own build system (Rust/WASM)
    "packages/async-rewriter3/**",
    // Configuration files
    ".evergreen/**",
    "config/**",
    "configs/**",
  ],

  // Ignore dependencies that are used in build processes or special contexts
  ignoreDependencies: [
    // Used in build scripts and webpack configs
    "terser-webpack-plugin",
    "webpack-bundle-analyzer",
    "webpack-cli",
    "webpack-merge",
    // Used in special build contexts
    "mongodb-runner",
    "mongodb-crypt-library-dummy",
    // Used in scripts
    "mongodb-sbom-tools",
    "@pkgjs/nv",
    // Used for husky git hooks
    "husky",
    // CLI tool
    "depcheck",
  ],

  // Ignore binaries that are used in scripts
  ignoreBinaries: ["depalign", "monorepo-where", "precommit"],

  // Global entry files at root level
  entry: ["scripts/**/*.{js,ts,mjs}", "testing/**/*.ts"],

  // Project files to analyze at root level
  project: [
    "scripts/**/*.{js,ts,mjs}",
    "testing/**/*.ts",
    "configs/**/*.{js,ts}",
  ],

  // Workspace-specific configurations
  workspaces: {
    ".": {
      // Root workspace configuration
      entry: ["scripts/**/*.{js,ts,mjs}", "testing/**/*.ts"],
    },

    // Config packages
    "configs/eslint-config-mongosh": {
      entry: ["index.js", "utils.js"],
    },

    "configs/tsconfig-mongosh": {
      entry: ["tsconfig.common.json"],
    },

    // Main packages
    "packages/*": {
      entry: ["src/index.ts", "src/index.tsx", "lib/index.js", "bin/**/*.js"],
      project: ["src/**/*.{ts,tsx}", "bin/**/*.js"],
    },

    // Special cases for packages with different entry points
    "packages/cli-repl": {
      entry: ["bin/mongosh.js", "src/run.ts", "dist/add-module-mapping.js"],
      project: ["src/**/*.ts", "bin/**/*.js"],
    },

    "packages/shell-api": {
      entry: ["src/api.ts"],
      project: ["src/**/*.ts"],
    },

    "packages/build": {
      entry: [
        "src/evergreen-release.ts",
        "src/release.ts",
        "src/update-cta.ts",
      ],
      project: ["src/**/*.ts"],
    },

    "packages/e2e-tests": {
      entry: ["test/**/*.ts"],
      project: ["test/**/*.ts"],
    },

    "packages/browser-repl": {
      entry: ["src/index.tsx"],
      project: ["src/**/*.{ts,tsx}"],
    },

    "packages/java-shell": {
      entry: [
        "src/main/kotlin/**/*.kt",
        "src/test/kotlin/**/*.kt",
        "gen-doc/**/*.js",
        "gen-kotlin/**/*.js",
      ],
      project: [
        "src/main/kotlin/**/*.kt",
        "gen-doc/**/*.js",
        "gen-kotlin/**/*.js",
      ],
    },

    "packages/connectivity-tests": {
      entry: ["index.js"],
      project: ["**/*.js"],
    },

    testing: {
      entry: [
        "eventually.ts",
        "fake-kms.ts",
        "integration-testing-hooks.ts",
        "disable-dns-srv.js",
      ],
      project: ["**/*.{ts,js}"],
    },

    "scripts/docker": {
      entry: ["**/*.js"],
      project: ["**/*.js"],
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
