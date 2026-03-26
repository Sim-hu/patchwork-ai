import { Octokit } from "octokit";
import { info, startStep, succeedStep } from "../output.js";

export async function discoverCommand(repoUrl: string, options: { language?: string; difficulty?: string; limit?: string }): Promise<void> {
  const githubToken = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (!githubToken) { console.error("GITHUB_TOKEN or GH_TOKEN environment variable is required"); process.exit(1); }
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) { console.error("Invalid GitHub repository URL"); process.exit(1); }
  const [, owner, repo] = match;
  const octokit = new Octokit({ auth: githubToken });
  const limit = parseInt(options.limit ?? "10", 10);
  startStep("Searching for issues...");
  const targetLabels = ["good first issue", "help wanted", "bug"];
  const seen = new Set<number>();
  const allIssues: any[] = [];
  for (const label of targetLabels) {
    const { data } = await octokit.rest.issues.listForRepo({ owner, repo, labels: label, state: "open", per_page: limit, sort: "updated", direction: "desc" });
    for (const issue of data) {
      if (!issue.pull_request && !seen.has(issue.number)) {
        seen.add(issue.number);
        allIssues.push(issue);
      }
    }
  }
  allIssues.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  const results = allIssues.slice(0, limit);
  succeedStep(`Found ${results.length} potential issues`);
  for (const issue of results) {
    const labelNames = (issue.labels as any[]).map((l: any) => (typeof l === "string" ? l : l.name)).join(", ");
    info(`#${issue.number} - ${issue.title} [${labelNames}]`);
  }
}
