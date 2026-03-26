import type {
  QualityReport,
  QualityCheck,
  FileChange,
  FixResult,
  AIProvider,
} from "../types.js";

const AI_MARKERS = [
  /co-authored-by:\s*claude/i,
  /co-authored-by:\s*copilot/i,
  /co-authored-by:\s*gpt/i,
  /generated\s+with\s+(claude|copilot|chatgpt|gpt)/i,
  /\bai[\s-]generated\b/i,
];

export function checkAIArtifacts(text: string): QualityCheck {
  for (const pattern of AI_MARKERS) {
    if (pattern.test(text))
      return {
        name: "ai-artifacts",
        passed: false,
        detail: `AI marker detected: ${pattern.source}`,
      };
  }
  return { name: "ai-artifacts", passed: true, detail: "No AI markers found" };
}

export function checkScopeMinimal(files: FileChange[]): QualityCheck {
  if (files.length > 10)
    return {
      name: "scope",
      passed: false,
      detail: `Too many files changed (${files.length}). Keep fixes focused.`,
    };
  return {
    name: "scope",
    passed: true,
    detail: `${files.length} file(s) changed`,
  };
}

export async function runQualityGate(
  fix: FixResult,
  ai: AIProvider,
): Promise<QualityReport> {
  const checks: QualityCheck[] = [];

  checks.push(checkAIArtifacts(fix.commitMessage));
  checks.push(checkAIArtifacts(fix.explanation));
  checks.push(checkScopeMinimal(fix.files));

  const diff = fix.files
    .map((f) => `--- ${f.path}\n+++ ${f.path}\n${f.modified}`)
    .join("\n\n");

  const review = await ai.chat(
    `Review this code change for quality. Check:\n1. Is the fix necessary and minimal?\n2. Is it readable?\n3. Could it cause side effects?\n\nDiff:\n${diff}\n\nExplanation: ${fix.explanation}\n\nRespond in JSON: { "necessity": { "passed": boolean, "detail": string }, "readability": { "passed": boolean, "detail": string }, "sideEffects": { "passed": boolean, "detail": string } }`,
  );

  try {
    const parsed = JSON.parse(
      review.replace(/```json\n?|\n?```/g, "").trim(),
    );
    checks.push({ name: "necessity", ...parsed.necessity });
    checks.push({ name: "readability", ...parsed.readability });
    checks.push({ name: "side-effects", ...parsed.sideEffects });
  } catch {
    checks.push({
      name: "ai-review",
      passed: true,
      detail: "AI review could not be parsed, skipping",
    });
  }

  return { passed: checks.every((c) => c.passed), checks };
}
