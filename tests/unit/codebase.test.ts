import { describe, it, expect } from "vitest";
import { listFiles } from "../../src/core/codebase.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

describe("listFiles", () => {
  const tmpDir = path.join(os.tmpdir(), "patchwork-ai-test-listfiles");

  function setup() {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, "node_modules", "dep"), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, ".git"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, "README.md"), "hello");
    fs.writeFileSync(path.join(tmpDir, "src", "index.ts"), "code");
    fs.writeFileSync(path.join(tmpDir, "node_modules", "dep", "index.js"), "dep");
    fs.writeFileSync(path.join(tmpDir, ".git", "config"), "git");
  }

  it("lists files recursively", () => {
    setup();
    const files = listFiles(tmpDir);
    expect(files).toContain("README.md");
    expect(files).toContain("src/index.ts");
  });

  it("excludes node_modules and hidden dirs", () => {
    setup();
    const files = listFiles(tmpDir);
    expect(files.some((f) => f.includes("node_modules"))).toBe(false);
    expect(files.some((f) => f.includes(".git"))).toBe(false);
  });

  it("respects maxDepth", () => {
    setup();
    const shallow = listFiles(tmpDir, 1);
    expect(shallow).toContain("README.md");
    expect(shallow.some((f) => f.includes("/"))).toBe(false);
  });
});
