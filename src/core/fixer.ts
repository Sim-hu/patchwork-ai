import fs from "node:fs";
import path from "node:path";
import type {
  FixResult,
  FileChange,
  IssueInfo,
  CodebaseAnalysis,
  AIProvider,
} from "../types.js";

export async function generateFix(
  repoPath: string,
  issue: IssueInfo,
  codebase: CodebaseAnalysis,
  ai: AIProvider,
): Promise<FixResult> {
  const response = await ai.chat(
    `Fix this issue with minimal code changes.\n\nIssue: #${issue.number} - ${issue.title}\nDescription: ${issue.body}\n\nRelevant code:\n${codebase.relatedCode}\n\nConventions: ${codebase.conventions.style}, ${codebase.conventions.commitFormat}\n\nRules: minimal change, follow existing style, no unnecessary comments, no refactoring, natural commit message.\n\nRespond in JSON:\n{ "files": [{ "path": "relative/path", "content": "full file content" }], "commitMessage": "feat: desc", "explanation": "brief explanation" }`,
  );

  try {
    const parsed = JSON.parse(
      response.replace(/```json\n?|\n?```/g, "").trim(),
    );
    const files: FileChange[] = [];

    for (const f of parsed.files ?? []) {
      const fullPath = path.join(repoPath, f.path);
      const original = fs.existsSync(fullPath)
        ? fs.readFileSync(fullPath, "utf-8")
        : "";
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, f.content);
      files.push({ path: f.path, original, modified: f.content });
    }

    return {
      files,
      commitMessage:
        parsed.commitMessage ?? `fix: address issue #${issue.number}`,
      explanation: parsed.explanation ?? "Automated fix",
    };
  } catch {
    throw new Error(
      "Failed to parse AI fix response. The issue may be too complex for automatic fixing.",
    );
  }
}
