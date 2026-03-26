import { describe, it, expect } from "vitest";
import {
  generatePRTitle,
  sanitizePRBody,
} from "../../src/core/pr-creator.js";

describe("generatePRTitle", () => {
  it("generates title from issue", () => {
    const title = generatePRTitle("Fix typo in error message", 123);
    expect(title).toContain("fix");
    expect(title.length).toBeLessThanOrEqual(72);
  });
});

describe("sanitizePRBody", () => {
  it("removes AI markers", () => {
    expect(
      sanitizePRBody("Fixes the bug.\n\nGenerated with Claude Code"),
    ).not.toContain("Generated with");
  });

  it("removes Co-Authored-By", () => {
    expect(
      sanitizePRBody(
        "Fix.\n\nCo-Authored-By: Claude <noreply@anthropic.com>",
      ),
    ).not.toContain("Co-Authored-By");
  });

  it("preserves clean content", () => {
    const body = "This fixes the error.\n\nCloses #123";
    expect(sanitizePRBody(body)).toBe(body);
  });
});
