import { Octokit } from "octokit";
import { parseIssueUrl, analyzeIssue } from "../../core/analyzer.js";
import { loadConfig } from "../../config.js";
import { createProvider } from "../../ai/provider.js";
import { startStep, succeedStep, failStep, info } from "../output.js";

export async function analyzeCommand(issueUrl: string, options: { model?: string }): Promise<void> {
  const config = loadConfig();
  if (options.model) config.model = options.model;
  const githubToken = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (!githubToken) { failStep("GITHUB_TOKEN or GH_TOKEN environment variable is required"); process.exit(1); }
  const ai = createProvider(config);
  const octokit = new Octokit({ auth: githubToken });
  const { owner, repo, number } = parseIssueUrl(issueUrl);
  startStep("Analyzing issue...");
  const result = await analyzeIssue(octokit, owner, repo, number, ai);
  succeedStep("Analysis complete");
  info(`Issue: #${result.issue.number} - ${result.issue.title}`);
  info(`Language: ${result.issue.language}`);
  info(`Difficulty: ${result.difficulty}`);
  info(`Can autofix: ${result.canAutofix ? "yes" : "no"}`);
  if (result.reason) info(`Reason: ${result.reason}`);
  if (result.suggestedApproach) info(`Approach: ${result.suggestedApproach}`);
}
