"use strict";

const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { describe, it } = require("node:test");

const bin = path.join(__dirname, "..", "bin", "mongosh.js");

function mongosh(...args) {
  return execFileSync(process.execPath, [bin, ...args], {
    encoding: "utf8",
    timeout: 120_000,
  }).trim();
}

describe("@0q/mongosh", () => {
  it("reports its version", () => {
    assert.match(mongosh("--version"), /^\d+\.\d+\.\d+/);
  });

  it("opens an embedded directory and keeps the data for the next run", () => {
    const directory = fs.mkdtempSync(
      path.join(os.tmpdir(), "embedded-mongosh-")
    );
    try {
      const uri = `mongodb_embedded://${directory}`;
      mongosh(uri, "--quiet", "--eval", "db.items.insertOne({ n: 1 })");
      assert.equal(
        mongosh(uri, "--quiet", "--eval", "db.items.countDocuments()"),
        "1"
      );
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
});
