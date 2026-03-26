import { describe, it, expect } from "vitest";
import { parseIssueUrl, checkClaimed } from "../../src/core/analyzer.js";

describe("parseIssueUrl", () => {
  it("parses a valid GitHub issue URL", () => {
    const result = parseIssueUrl("https://github.com/owner/repo/issues/123");
    expect(result).toEqual({ owner: "owner", repo: "repo", number: 123 });
  });

  it("throws on invalid URL", () => {
    expect(() => parseIssueUrl("https://google.com")).toThrow("Invalid GitHub issue URL");
  });

  it("throws on PR URL", () => {
    expect(() => parseIssueUrl("https://github.com/owner/repo/pull/123")).toThrow("Invalid GitHub issue URL");
  });
});

describe("checkClaimed", () => {
  it("detects claim in comments", () => {
    expect(checkClaimed([
      { author: "dev1", body: "I'll work on this", createdAt: "2026-01-01" },
    ])).toBe(true);
  });

  it("returns false when no claim", () => {
    expect(checkClaimed([
      { author: "user", body: "This is a great idea!", createdAt: "2026-01-01" },
    ])).toBe(false);
  });

  it("detects WIP claim", () => {
    expect(checkClaimed([
      { author: "dev", body: "WIP: started working on a fix", createdAt: "2026-01-01" },
    ])).toBe(true);
  });
});
