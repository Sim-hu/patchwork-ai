import simpleGit from "simple-git";
import type {
  PRInfo,
  FixResult,
  IssueInfo,
  RepoContext,
  AIProvider,
} from "../types.js";

export function generatePRTitle(
  issueTitle: string,
  issueNumber: number,
): string {
  const lower = issueTitle.toLowerCase();
  const prefix =
    lower.startsWith("fix") || lower.startsWith("bug") ? "fix" : "feat";
  const clean = issueTitle
    .replace(/^\[.*?\]\s*/, "")
    .replace(/^(fix|feat|bug|enhancement):\s*/i, "");
  const title = `${prefix}: ${clean}`;
  return title.length > 72 ? title.slice(0, 69) + "..." : title;
}

const AI_LINE_PATTERNS = [
  /^co-authored-by:\s*(claude|copilot|gpt|ai).*/im,
  /generated\s+with\s+(claude|copilot|chatgpt).*/i,
  /🤖.*/,
];

export function sanitizePRBody(body: string): string {
  let result = body;
  for (const pattern of AI_LINE_PATTERNS) {
    result = result.replace(new RegExp(pattern.source, "gim"), "");
  }
  return result.replace(/\n{3,}/g, "\n\n").trim();
}

export async function createPR(
  octokit: any,
  issue: IssueInfo,
  repoCtx: RepoContext,
  fix: FixResult,
  ai: AIProvider,
): Promise<PRInfo> {
  const git = simpleGit(repoCtx.localPath);

  for (const file of fix.files) await git.add(file.path);
  await git.commit(fix.commitMessage);
  await git.push("origin", repoCtx.branch, ["--set-upstream"]);

  const bodyDraft = await ai.chat(
    `Write a concise PR description. Be natural.\nIssue: #${issue.number} - ${issue.title}\nFix: ${fix.explanation}\nFiles: ${fix.files.map((f) => f.path).join(", ")}\n\n2-3 sentences. End with "Fixes #${issue.number}". No AI markers.`,
  );

  const title = generatePRTitle(issue.title, issue.number);
  const body = sanitizePRBody(bodyDraft);

  const { data: me } = await octokit.rest.users.getAuthenticated();
  const { data: pr } = await octokit.rest.pulls.create({
    owner: issue.owner,
    repo: issue.repo,
    title,
    body: body + `\n\nFixes #${issue.number}`,
    head: `${me.login}:${repoCtx.branch}`,
    base: repoCtx.defaultBranch,
  });

  return {
    url: pr.html_url,
    title: pr.title,
    body: pr.body ?? "",
    branch: repoCtx.branch,
  };
}
