import { describe, it, expect } from "vitest";
import {
  checkAIArtifacts,
  checkScopeMinimal,
} from "../../src/core/quality-gate.js";

describe("checkAIArtifacts", () => {
  it("detects Co-Authored-By marker", () => {
    const result = checkAIArtifacts(
      "feat: add feature\n\nCo-Authored-By: Claude",
    );
    expect(result.passed).toBe(false);
    expect(result.detail).toContain("AI marker");
  });

  it("detects Generated with Claude Code", () => {
    expect(
      checkAIArtifacts("Summary\n\nGenerated with Claude Code").passed,
    ).toBe(false);
  });

  it("passes clean text", () => {
    expect(checkAIArtifacts("fix: correct error message").passed).toBe(true);
  });
});

describe("checkScopeMinimal", () => {
  it("flags too many files", () => {
    const files = Array.from({ length: 15 }, (_, i) => ({
      path: `src/file${i}.ts`,
      original: "old",
      modified: "new",
    }));
    const result = checkScopeMinimal(files);
    expect(result.passed).toBe(false);
    expect(result.detail).toContain("15");
  });

  it("passes small change", () => {
    expect(
      checkScopeMinimal([
        { path: "src/error.ts", original: "old", modified: "new" },
      ]).passed,
    ).toBe(true);
  });
});
