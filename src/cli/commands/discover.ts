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
  const labels = ["good first issue", "help wanted", "bug"].join(",");
  const { data: issues } = await octokit.rest.issues.listForRepo({ owner, repo, labels, state: "open", per_page: limit, sort: "updated", direction: "desc" });
  succeedStep(`Found ${issues.length} potential issues`);
  for (const issue of issues) {
    if (issue.pull_request) continue;
    const labelNames = (issue.labels as any[]).map((l: any) => (typeof l === "string" ? l : l.name)).join(", ");
    info(`#${issue.number} - ${issue.title} [${labelNames}]`);
  }
}
