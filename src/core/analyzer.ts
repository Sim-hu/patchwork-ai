import type { IssueInfo, IssueComment, AnalysisResult, AIProvider } from "../types.js";

export function parseIssueUrl(url: string): { owner: string; repo: string; number: number } {
  const match = url.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/);
  if (!match) throw new Error(`Invalid GitHub issue URL: ${url}`);
  return { owner: match[1], repo: match[2], number: parseInt(match[3], 10) };
}

const CLAIM_PATTERNS = [
  /i'?ll\s+(work|take|tackle|fix|handle)\s+(on\s+)?this/i,
  /\bwip\b/i,
  /working\s+on\s+(a\s+)?(fix|this|it|pr)/i,
  /i'?m\s+on\s+(it|this)/i,
  /claimed/i,
  /assigned\s+to\s+me/i,
];

export function checkClaimed(comments: IssueComment[]): boolean {
  return comments.some((c) => CLAIM_PATTERNS.some((pattern) => pattern.test(c.body)));
}

export async function analyzeIssue(
  octokit: any,
  owner: string,
  repo: string,
  number: number,
  ai: AIProvider,
): Promise<AnalysisResult> {
  const { data: issue } = await octokit.rest.issues.get({ owner, repo, issue_number: number });
  const { data: comments } = await octokit.rest.issues.listComments({ owner, repo, issue_number: number });
  const { data: prs } = await octokit.rest.pulls.list({ owner, repo, state: "open" });

  const issueComments: IssueComment[] = comments.map((c: any) => ({
    author: c.user?.login ?? "unknown",
    body: c.body ?? "",
    createdAt: c.created_at,
  }));

  const hasExistingPR = prs.some(
    (pr: any) => pr.body?.includes(`#${number}`) || pr.title?.includes(`#${number}`),
  );
  const isClaimed = checkClaimed(issueComments);
  const repoData = await octokit.rest.repos.get({ owner, repo });

  const issueInfo: IssueInfo = {
    owner,
    repo,
    number,
    title: issue.title,
    body: issue.body ?? "",
    labels: (issue.labels as any[]).map((l: any) => (typeof l === "string" ? l : l.name ?? "")),
    comments: issueComments,
    language: repoData.data.language,
    hasExistingPR,
    isClaimed,
  };

  if (hasExistingPR) {
    return {
      issue: issueInfo,
      canAutofix: false,
      reason: "An open PR already addresses this issue",
      difficulty: "medium",
      suggestedApproach: null,
    };
  }

  if (isClaimed) {
    return {
      issue: issueInfo,
      canAutofix: false,
      reason: "Someone has already claimed this issue",
      difficulty: "medium",
      suggestedApproach: null,
    };
  }

  const prompt = [
    "Analyze this GitHub issue and assess if it can be automatically fixed.",
    "",
    `Issue #${number}: ${issue.title}`,
    `Body: ${issue.body ?? "(empty)"}`,
    `Labels: ${issueInfo.labels.join(", ")}`,
    `Language: ${repoData.data.language}`,
    "",
    'Respond in JSON: { "canAutofix": boolean, "difficulty": "easy"|"medium"|"hard", "reason": string|null, "suggestedApproach": string }',
  ].join("\n");

  const assessment = await ai.chat(prompt, { fast: true });

  try {
    const parsed = JSON.parse(assessment.replace(/```json\n?|\n?```/g, "").trim());
    return {
      issue: issueInfo,
      canAutofix: parsed.canAutofix ?? true,
      reason: parsed.reason ?? null,
      difficulty: parsed.difficulty ?? "medium",
      suggestedApproach: parsed.suggestedApproach ?? null,
    };
  } catch {
    return {
      issue: issueInfo,
      canAutofix: true,
      reason: null,
      difficulty: "medium",
      suggestedApproach: null,
    };
  }
}
