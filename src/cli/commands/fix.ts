import { runPipeline } from "../../core/pipeline.js";
import { loadConfig } from "../../config.js";
import { createProvider } from "../../ai/provider.js";
import { startStep, succeedStep, failStep, success, error } from "../output.js";

export async function fixCommand(issueUrl: string, options: { model?: string }): Promise<void> {
  const config = loadConfig();
  if (options.model) config.model = options.model;
  const githubToken = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (!githubToken) { error("GITHUB_TOKEN or GH_TOKEN environment variable is required"); process.exit(1); }
  if (!config.apiKey) { error("API key not configured. Run: patchwork-ai config set api-key <key>"); process.exit(1); }
  const ai = createProvider(config);
  const result = await runPipeline(issueUrl, githubToken, ai, {
    onStep: (_step, message) => startStep(message),
    onComplete: (pr) => { succeedStep("Pull request created!"); success(`PR: ${pr.url}`); },
    onFail: (_step, reason) => { failStep(reason); process.exit(1); },
  });
  if (!result) process.exit(1);
}
