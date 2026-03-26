import { Octokit } from "octokit";
import type { AIProvider, PRInfo } from "../types.js";
import { parseIssueUrl, analyzeIssue } from "./analyzer.js";
import { setupRepo } from "./repo.js";
import { analyzeCodebase } from "./codebase.js";
import { generateFix } from "./fixer.js";
import { runQualityGate } from "./quality-gate.js";
import { runTests } from "./test-runner.js";
import { createPR } from "./pr-creator.js";

export enum PipelineStep {
  ANALYZE = "analyze",
  REPO_SETUP = "repo-setup",
  CODEBASE = "codebase",
  FIX = "fix",
  QUALITY_GATE = "quality-gate",
  TEST = "test",
  PR_CREATE = "pr-create",
}

export interface StepResult {
  step: string;
  success: boolean;
  detail: string;
}

export function formatStepResult(step: PipelineStep, success: boolean, detail: string): StepResult {
  return { step, success, detail };
}

export interface PipelineCallbacks {
  onStep?: (step: PipelineStep, message: string) => void;
  onComplete?: (pr: PRInfo) => void;
  onFail?: (step: PipelineStep, reason: string) => void;
}

export async function runPipeline(
  issueUrl: string,
  githubToken: string,
  ai: AIProvider,
  callbacks?: PipelineCallbacks
): Promise<PRInfo | null> {
  const octokit = new Octokit({ auth: githubToken });
  const { owner, repo, number } = parseIssueUrl(issueUrl);

  callbacks?.onStep?.(PipelineStep.ANALYZE, "Analyzing issue...");
  const analysis = await analyzeIssue(octokit, owner, repo, number, ai);
  if (!analysis.canAutofix) {
    callbacks?.onFail?.(PipelineStep.ANALYZE, analysis.reason ?? "Issue not suitable for autofix");
    return null;
  }

  callbacks?.onStep?.(PipelineStep.REPO_SETUP, "Setting up repository...");
  const repoCtx = await setupRepo(octokit, owner, repo, number, analysis.issue.title);

  callbacks?.onStep?.(PipelineStep.CODEBASE, "Analyzing codebase...");
  const codebase = await analyzeCodebase(repoCtx.localPath, analysis.issue, ai);

  callbacks?.onStep?.(PipelineStep.FIX, "Generating fix...");
  const fix = await generateFix(repoCtx.localPath, analysis.issue, codebase, ai);

  callbacks?.onStep?.(PipelineStep.QUALITY_GATE, "Running quality checks...");
  const quality = await runQualityGate(fix, ai);
  if (!quality.passed) {
    const failedChecks = quality.checks.filter((c) => !c.passed).map((c) => `${c.name}: ${c.detail}`).join("; ");
    callbacks?.onFail?.(PipelineStep.QUALITY_GATE, `Quality gate failed: ${failedChecks}`);
    return null;
  }

  callbacks?.onStep?.(PipelineStep.TEST, "Running tests...");
  const testResult = runTests(repoCtx.localPath, repoCtx.buildSystem, repoCtx.testFramework);
  if (!testResult.passed) {
    callbacks?.onFail?.(PipelineStep.TEST, `Tests failed: ${testResult.output.slice(0, 500)}`);
    return null;
  }

  callbacks?.onStep?.(PipelineStep.PR_CREATE, "Creating pull request...");
  const pr = await createPR(octokit, analysis.issue, repoCtx, fix, ai);
  callbacks?.onComplete?.(pr);
  return pr;
}
