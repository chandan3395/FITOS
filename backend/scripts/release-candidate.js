"use strict";
// Inventory the dirty candidate without reading secrets or generated artifacts.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "../..");
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" });
const sha = value => crypto.createHash("sha256").update(value).digest("hex");
const names = [...new Set(git("ls-files", "-c", "-o", "--exclude-standard", "-z").split("\0"))]
  .filter(name => name && !name.startsWith("docs/") && !/\.md$/i.test(name) &&
    !/(^|\/)\.env(?:[./]|$)/.test(name) && !/(^|\/)(node_modules|dist|coverage)\//.test(name))
  .sort();
const files = names.map(file => ({ file,
  sha256: fs.existsSync(path.join(root, file)) ? sha(fs.readFileSync(path.join(root, file))) : null }));
const evidence = { recordedAt: new Date().toISOString(), branch: git("branch", "--show-current").trim(),
  commit: git("rev-parse", "HEAD").trim(), node: process.version, platform: process.platform,
  architecture: process.arch, workingTree: git("status", "--short").trimEnd().split("\n"),
  excludes: "Documentation, .env files, ignored/generated output. No secret values are read.",
  files, digest: sha(JSON.stringify(files)) };
const output = path.join(root, "docs/byot-release/evidence/candidate-final.json");
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(evidence, null, 2) + "\n");
console.log(JSON.stringify({ branch: evidence.branch, commit: evidence.commit, files: files.length, digest: evidence.digest }));
