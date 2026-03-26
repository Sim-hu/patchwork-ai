import simpleGit, { type SimpleGit } from "simple-git";
import type { RepoContext } from "../types.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export function branchName(issueNumber: number, title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40)
    .replace(/-$/, "");
  return `fix/${issueNumber}-${slug}`;
}

export function detectBuildSystem(files: string[]): string | null {
  const names = files.map((f) => path.basename(f));
  if (names.includes("Cargo.toml")) return "cargo";
  if (names.some((n) => n.startsWith("build.gradle"))) return "gradle";
  if (names.includes("CMakeLists.txt")) return "cmake";
  if (names.includes("go.mod")) return "go";
  if (names.includes("package.json")) return "npm";
  if (names.includes("pyproject.toml") || names.includes("setup.py")) return "pip";
  return null;
}

export function detectTestFramework(files: string[]): string | null {
  const names = files.map((f) => path.basename(f));
  const allPaths = files.join(" ");
  if (names.some((n) => n.startsWith("vitest.config"))) return "vitest";
  if (names.some((n) => n.startsWith("jest.config"))) return "jest";
  if (
    names.includes("pytest.ini") ||
    names.includes("conftest.py") ||
    allPaths.includes("pytest")
  )
    return "pytest";
  if (names.includes("Cargo.toml")) return "cargo-test";
  if (names.includes("go.mod")) return "go-test";
  return null;
}

export async function setupRepo(
  octokit: any,
  owner: string,
  repo: string,
  issueNumber: number,
  issueTitle: string,
): Promise<RepoContext> {
  const workDir = path.join(os.tmpdir(), "patchwork-ai", `${owner}-${repo}`);

  try {
    await octokit.rest.repos.createFork({ owner, repo });
  } catch {}

  const { data: me } = await octokit.rest.users.getAuthenticated();
  const forkUrl = `https://github.com/${me.login}/${repo}.git`;

  if (fs.existsSync(workDir)) {
    const git = simpleGit(workDir);
    await git.fetch("origin");
  } else {
    fs.mkdirSync(path.dirname(workDir), { recursive: true });
    await simpleGit().clone(forkUrl, workDir);
  }

  const git: SimpleGit = simpleGit(workDir);
  await git
    .addRemote("upstream", `https://github.com/${owner}/${repo}.git`)
    .catch(() => {});
  await git.fetch("upstream");

  const branches = await git.branch();
  const defaultBranch = branches.all.includes("main") ? "main" : "master";
  const branch = branchName(issueNumber, issueTitle);
  await git.checkoutBranch(branch, `upstream/${defaultBranch}`);

  const topFiles = fs.readdirSync(workDir);
  const repoData = await octokit.rest.repos.get({ owner, repo });

  return {
    localPath: workDir,
    branch,
    defaultBranch,
    language: repoData.data.language ?? "unknown",
    buildSystem: detectBuildSystem(topFiles),
    testFramework: detectTestFramework(topFiles),
    hasCI: fs.existsSync(path.join(workDir, ".github", "workflows")),
  };
}
