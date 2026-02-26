#!/usr/bin/env node

const fs = require("fs").promises;
const path = require("path");
const util = require("util");
const exec = util.promisify(require("child_process").exec);

process.on("unhandledRejection", (err) => {
  console.error();
  console.error(err?.stack || err?.message || err);
  process.exitCode = 1;
});

async function main() {
  if (process.env.CI) return;

  const monorepoRoot = path.resolve(__dirname, "..");

  // Get sorted packages from lerna
  const { stdout } = await exec("pnpm dlx lerna ls --all --toposort --json");
  const packages = JSON.parse(stdout);

  // Update package.json
  const packageJSON = JSON.parse(
    await fs.readFile(path.join(monorepoRoot, "package.json"), "utf8")
  );

  packageJSON.workspaces = packages.map(({ location }) =>
    path.relative(monorepoRoot, location)
  );

  await fs.writeFile(
    path.join(monorepoRoot, "package.json"),
    JSON.stringify(packageJSON, null, 2) + "\n",
    "utf8"
  );

  // Update mongosh.code-workspace
  const workspaceFile = path.join(monorepoRoot, "mongosh.code-workspace");
  const workspace = JSON.parse(await fs.readFile(workspaceFile, "utf8"));

  // Keep the root folder and regenerate package folders in topological order
  workspace.folders = [
    {
      name: "mongosh",
      path: ".",
    },
    ...packages.map(({ name, location }) => ({
      name: `📦 ${name}`,
      path: path.relative(monorepoRoot, location),
    })),
  ];

  await fs.writeFile(
    workspaceFile,
    JSON.stringify(workspace, null, 2) + "\n",
    "utf8"
  );
}

main().catch((err) =>
  process.nextTick(() => {
    throw err;
  })
);
