"use strict";

// Takes cli-repl's single-file webpack build -- the same bundle the compiled mongosh binary is
// made from -- and puts it where this package's bin expects it. Everything the shell needs is
// inside that file except the native pieces webpack leaves external: @0q/embedded-mongodb,
// which is this package's one dependency, and the optional Kerberos and encryption addons,
// which are not shipped here.

const fs = require("fs");
const path = require("path");

const source = path.join(__dirname, "..", "..", "cli-repl", "dist");
const target = path.join(__dirname, "..", "dist");
fs.mkdirSync(target, { recursive: true });
for (const name of ["mongosh.js", "mongosh.js.LICENSE.txt"]) {
  const from = path.join(source, name);
  if (!fs.existsSync(from)) {
    throw new Error(
      `${from} is missing; run npm run webpack-build in packages/cli-repl first`
    );
  }
  fs.copyFileSync(from, path.join(target, name));
}
console.log(`bundled ${path.join(target, "mongosh.js")}`);
