import fs from "node:fs";
import path from "node:path";
import type { CodebaseAnalysis, AIProvider, IssueInfo } from "../types.js";

export function listFiles(
  dir: string,
  maxDepth: number = 3,
  prefix: string = "",
): string[] {
  const results: string[] = [];
  if (maxDepth <= 0) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (
      entry.name.startsWith(".") ||
      ["node_modules", "dist", "target", "__pycache__"].includes(entry.name)
    )
      continue;

    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory())
      results.push(
        ...listFiles(path.join(dir, entry.name), maxDepth - 1, rel),
      );
    else results.push(rel);
  }
  return results;
}

export async function analyzeCodebase(
  repoPath: string,
  issue: IssueInfo,
  ai: AIProvider,
): Promise<CodebaseAnalysis> {
  const files = listFiles(repoPath);
  const tree = files.join("\n");

  const response = await ai.chat(
    `Given this file tree and issue, identify relevant files.\n\nIssue: #${issue.number} - ${issue.title}\nDescription: ${issue.body}\n\nFile tree:\n${tree}\n\nRespond in JSON: { "relevantFiles": ["path1"], "conventions": { "style": "desc", "commitFormat": "conventional|freeform", "testPattern": "desc" } }`,
  );

  try {
    const parsed = JSON.parse(
      response.replace(/```json\n?|\n?```/g, "").trim(),
    );
    const relevantFiles = (parsed.relevantFiles ?? []).filter((f: string) =>
      files.includes(f),
    );

    let relatedCode = "";
    for (const f of relevantFiles.slice(0, 5)) {
      const fullPath = path.join(repoPath, f);
      if (fs.existsSync(fullPath))
        relatedCode += `\n--- ${f} ---\n${fs.readFileSync(fullPath, "utf-8").slice(0, 3000)}\n`;
    }

    return {
      relevantFiles,
      conventions: parsed.conventions ?? {
        style: "unknown",
        commitFormat: "conventional",
        testPattern: "unknown",
      },
      relatedCode,
    };
  } catch {
    return {
      relevantFiles: [],
      conventions: {
        style: "unknown",
        commitFormat: "conventional",
        testPattern: "unknown",
      },
      relatedCode: "",
    };
  }
}
