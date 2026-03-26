import { describe, it, expect } from "vitest";
import {
  detectBuildSystem,
  detectTestFramework,
  branchName,
} from "../../src/core/repo.js";

describe("branchName", () => {
  it("generates branch name from issue number and title", () => {
    expect(branchName(123, "Fix typo in error message")).toBe(
      "fix/123-fix-typo-in-error-message",
    );
  });

  it("truncates long titles", () => {
    const result = branchName(
      456,
      "A very long issue title that should be truncated because it exceeds the maximum length",
    );
    expect(result.length).toBeLessThanOrEqual(60);
  });

  it("sanitizes special characters", () => {
    expect(branchName(789, "Fix: [bug] Can't parse @mentions")).toMatch(
      /^fix\/789-[a-z0-9-]+$/,
    );
  });
});

describe("detectBuildSystem", () => {
  it("detects npm", () => {
    expect(detectBuildSystem(["package.json", "src/index.ts"])).toBe("npm");
  });
  it("detects cargo", () => {
    expect(detectBuildSystem(["Cargo.toml", "src/main.rs"])).toBe("cargo");
  });
  it("detects gradle", () => {
    expect(detectBuildSystem(["build.gradle.kts"])).toBe("gradle");
  });
  it("returns null for unknown", () => {
    expect(detectBuildSystem(["README.md"])).toBeNull();
  });
});

describe("detectTestFramework", () => {
  it("detects vitest", () => {
    expect(detectTestFramework(["vitest.config.ts"])).toBe("vitest");
  });
  it("detects pytest", () => {
    expect(detectTestFramework(["pytest.ini"])).toBe("pytest");
  });
  it("returns null for unknown", () => {
    expect(detectTestFramework(["README.md"])).toBeNull();
  });
});
