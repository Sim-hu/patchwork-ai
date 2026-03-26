import { describe, it, expect, vi } from "vitest";
import { generateFix } from "../../src/core/fixer.js";
import type { AIProvider, IssueInfo, CodebaseAnalysis } from "../../src/types.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const tmpDir = path.join(os.tmpdir(), "patchwork-ai-test-fixer");

function mockAI(response: string): AIProvider {
  return {
    chat: vi.fn().mockResolvedValue(response),
    chatWithTools: vi.fn().mockResolvedValue({ content: "", toolCalls: [] }),
  };
}

const issue: IssueInfo = {
  owner: "test",
  repo: "repo",
  number: 1,
  title: "Fix bug",
  body: "Something is broken",
  labels: [],
  comments: [],
  language: "TypeScript",
  hasExistingPR: false,
  isClaimed: false,
};

const codebase: CodebaseAnalysis = {
  relevantFiles: ["src/index.ts"],
  conventions: { style: "standard", commitFormat: "conventional", testPattern: "vitest" },
  relatedCode: "--- src/index.ts ---\nconsole.log('hello');\n",
};

describe("generateFix", () => {
  it("parses AI response and writes files", async () => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    fs.mkdirSync(tmpDir, { recursive: true });

    const ai = mockAI(
      JSON.stringify({
        files: [{ path: "src/index.ts", content: "console.log('fixed');\n" }],
        commitMessage: "fix: correct output",
        explanation: "Fixed the bug",
      }),
    );

    const result = await generateFix(tmpDir, issue, codebase, ai);
    expect(result.files).toHaveLength(1);
    expect(result.commitMessage).toBe("fix: correct output");
    expect(result.explanation).toBe("Fixed the bug");
    expect(fs.readFileSync(path.join(tmpDir, "src/index.ts"), "utf-8")).toBe(
      "console.log('fixed');\n",
    );
  });

  it("throws on unparseable AI response", async () => {
    const ai = mockAI("This is not JSON at all");
    await expect(generateFix(tmpDir, issue, codebase, ai)).rejects.toThrow(
      "Failed to parse AI fix response",
    );
  });
});
