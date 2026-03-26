# patchwork-ai Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a CLI tool that takes a GitHub issue URL and automates the full contribution flow: analyze, fork, fix, test, PR.

**Architecture:** TypeScript CLI with a core library layer. AI provider abstraction supports Claude (primary) and OpenAI. Each pipeline step (analyze, repo setup, codebase understanding, fix generation, quality gate, test, PR creation) is a separate module in `src/core/`. CLI is a thin wrapper using `commander`.

**Tech Stack:** TypeScript, Node.js >=20, vitest, commander, octokit, simple-git, @anthropic-ai/sdk, openai

---

## File Structure

```
patchwork-ai/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── bin/
│   └── patchwork-ai.ts          # CLI entrypoint (hashbang + commander)
├── src/
│   ├── types.ts                  # Shared types and interfaces
│   ├── config.ts                 # Config loading/saving (~/.patchwork-ai/config.yaml)
│   ├── core/
│   │   ├── analyzer.ts           # Issue analysis (fetch, check PRs, assess difficulty)
│   │   ├── repo.ts               # Fork, clone, branch operations
│   │   ├── codebase.ts           # Project structure analysis, file identification
│   │   ├── fixer.ts              # Fix generation via AI
│   │   ├── quality-gate.ts       # Self-review of generated fix
│   │   ├── test-runner.ts        # Detect and run test suite
│   │   ├── pr-creator.ts         # Create PR with natural description
│   │   └── pipeline.ts           # Orchestrates all steps
│   ├── ai/
│   │   ├── provider.ts           # AIProvider interface
│   │   ├── anthropic.ts          # Claude implementation
│   │   └── openai.ts             # OpenAI implementation
│   └── cli/
│       ├── commands/
│       │   ├── fix.ts            # fix command
│       │   ├── analyze.ts        # analyze command
│       │   ├── discover.ts       # discover command
│       │   └── config.ts         # config command
│       └── output.ts             # Terminal output formatting (spinner, colors)
├── tests/
│   ├── unit/
│   │   ├── analyzer.test.ts
│   │   ├── repo.test.ts
│   │   ├── codebase.test.ts
│   │   ├── quality-gate.test.ts
│   │   ├── test-runner.test.ts
│   │   ├── pr-creator.test.ts
│   │   ├── config.test.ts
│   │   ├── provider.test.ts
│   │   └── pipeline.test.ts
│   └── fixtures/
│       ├── issue-simple.json
│       ├── issue-claimed.json
│       └── issue-with-pr.json
└── README.md
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.gitignore`

- [ ] **Step 1: Initialize package.json**

```json
{
  "name": "patchwork-ai",
  "version": "0.1.0",
  "description": "AI-powered CLI that automates OSS contributions",
  "type": "module",
  "bin": {
    "patchwork-ai": "./dist/bin/patchwork-ai.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "tsc --noEmit"
  },
  "keywords": ["oss", "github", "ai", "automation", "contributions"],
  "license": "MIT",
  "engines": {
    "node": ">=20"
  }
}
```

- [ ] **Step 2: Install dependencies**

```bash
cd /home/pr/patchwork-ai
npm install typescript @types/node vitest commander octokit simple-git yaml @anthropic-ai/sdk openai ora chalk
npm install -D @types/node
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./dist",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "sourceMap": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*", "bin/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 4: Create vitest.config.ts**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["tests/**/*.test.ts"],
  },
});
```

- [ ] **Step 5: Create .gitignore**

```
node_modules/
dist/
*.tgz
.env
```

- [ ] **Step 6: Verify setup**

Run: `npx tsc --noEmit`
Expected: No errors (no source files yet, clean exit)

Run: `npx vitest run`
Expected: No test suites found (clean exit)

- [ ] **Step 7: Commit**

```bash
git add package.json tsconfig.json vitest.config.ts .gitignore package-lock.json
git commit -m "feat: initialize project with TypeScript, vitest, and dependencies"
```

---

### Task 2: Types and Config

**Files:**
- Create: `src/types.ts`
- Create: `src/config.ts`
- Create: `tests/unit/config.test.ts`
- Create: `tests/fixtures/issue-simple.json`
- Create: `tests/fixtures/issue-claimed.json`
- Create: `tests/fixtures/issue-with-pr.json`

- [ ] **Step 1: Write types**

```typescript
// src/types.ts

export interface IssueInfo {
  owner: string;
  repo: string;
  number: number;
  title: string;
  body: string;
  labels: string[];
  comments: IssueComment[];
  language: string | null;
  hasExistingPR: boolean;
  isClaimed: boolean;
}

export interface IssueComment {
  author: string;
  body: string;
  createdAt: string;
}

export interface AnalysisResult {
  issue: IssueInfo;
  canAutofix: boolean;
  reason: string | null;
  difficulty: "easy" | "medium" | "hard";
  suggestedApproach: string | null;
}

export interface RepoContext {
  localPath: string;
  branch: string;
  defaultBranch: string;
  language: string;
  buildSystem: string | null;
  testFramework: string | null;
  hasCI: boolean;
}

export interface CodebaseAnalysis {
  relevantFiles: string[];
  conventions: {
    style: string;
    commitFormat: string;
    testPattern: string;
  };
  relatedCode: string;
}

export interface FixResult {
  files: FileChange[];
  commitMessage: string;
  explanation: string;
}

export interface FileChange {
  path: string;
  original: string;
  modified: string;
}

export interface QualityReport {
  passed: boolean;
  checks: QualityCheck[];
}

export interface QualityCheck {
  name: string;
  passed: boolean;
  detail: string;
}

export interface PRInfo {
  url: string;
  title: string;
  body: string;
  branch: string;
}

export interface PatchworkConfig {
  provider: "anthropic" | "openai" | "google";
  apiKey: string;
  model: string;
  fastModel: string;
}

export const DEFAULT_CONFIG: PatchworkConfig = {
  provider: "anthropic",
  apiKey: "",
  model: "claude-sonnet-4-6",
  fastModel: "claude-haiku-4-5-20251001",
};

export interface AIProvider {
  chat(prompt: string, options?: { model?: string; fast?: boolean }): Promise<string>;
  chatWithTools(
    prompt: string,
    tools: AITool[],
    options?: { model?: string }
  ): Promise<AIToolResponse>;
}

export interface AITool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface AIToolResponse {
  content: string;
  toolCalls: AIToolCall[];
}

export interface AIToolCall {
  name: string;
  arguments: Record<string, unknown>;
}
```

- [ ] **Step 2: Write test fixtures**

```json
// tests/fixtures/issue-simple.json
{
  "number": 123,
  "title": "Fix typo in error message",
  "body": "The error message in `src/error.rs` says 'per-document' but should say 'per-index'.",
  "labels": [{ "name": "bug" }, { "name": "good first issue" }],
  "user": { "login": "reporter" },
  "comments": 0,
  "pull_request": null
}
```

```json
// tests/fixtures/issue-claimed.json
{
  "number": 456,
  "title": "Add pagination support",
  "body": "We need pagination for the list endpoint.",
  "labels": [{ "name": "enhancement" }],
  "user": { "login": "reporter" },
  "comments": 2
}
```

```json
// tests/fixtures/issue-with-pr.json
{
  "number": 789,
  "title": "Fix memory leak in connection pool",
  "body": "Connections are not being released properly.",
  "labels": [{ "name": "bug" }],
  "user": { "login": "reporter" },
  "comments": 1,
  "pull_request": { "url": "https://api.github.com/repos/owner/repo/pulls/790" }
}
```

- [ ] **Step 3: Write config tests**

```typescript
// tests/unit/config.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig, saveConfig, getConfigPath } from "../../src/config.js";
import { DEFAULT_CONFIG } from "../../src/types.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

describe("config", () => {
  const testDir = path.join(os.tmpdir(), "patchwork-ai-test-" + Date.now());

  beforeEach(() => {
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it("returns default config when no file exists", () => {
    const config = loadConfig(path.join(testDir, "config.yaml"));
    expect(config.provider).toBe("anthropic");
    expect(config.model).toBe("claude-sonnet-4-6");
  });

  it("saves and loads config", () => {
    const configPath = path.join(testDir, "config.yaml");
    const custom = { ...DEFAULT_CONFIG, apiKey: "sk-test-123", model: "gpt-4o" };
    saveConfig(configPath, custom);
    const loaded = loadConfig(configPath);
    expect(loaded.apiKey).toBe("sk-test-123");
    expect(loaded.model).toBe("gpt-4o");
  });

  it("merges partial config with defaults", () => {
    const configPath = path.join(testDir, "config.yaml");
    fs.writeFileSync(configPath, "provider: openai\napi_key: sk-test\n");
    const loaded = loadConfig(configPath);
    expect(loaded.provider).toBe("openai");
    expect(loaded.model).toBe("claude-sonnet-4-6");
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `npx vitest run tests/unit/config.test.ts`
Expected: FAIL — `loadConfig` not found

- [ ] **Step 5: Implement config module**

```typescript
// src/config.ts
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { parse, stringify } from "yaml";
import { DEFAULT_CONFIG, type PatchworkConfig } from "./types.js";

export function getConfigPath(): string {
  return path.join(os.homedir(), ".patchwork-ai", "config.yaml");
}

export function loadConfig(configPath?: string): PatchworkConfig {
  const filePath = configPath ?? getConfigPath();
  if (!fs.existsSync(filePath)) {
    return { ...DEFAULT_CONFIG };
  }
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = parse(raw) ?? {};
  return {
    provider: parsed.provider ?? DEFAULT_CONFIG.provider,
    apiKey: parsed.api_key ?? parsed.apiKey ?? DEFAULT_CONFIG.apiKey,
    model: parsed.model ?? DEFAULT_CONFIG.model,
    fastModel: parsed.fast_model ?? parsed.fastModel ?? DEFAULT_CONFIG.fastModel,
  };
}

export function saveConfig(configPath: string, config: PatchworkConfig): void {
  const dir = path.dirname(configPath);
  fs.mkdirSync(dir, { recursive: true });
  const data = {
    provider: config.provider,
    api_key: config.apiKey,
    model: config.model,
    fast_model: config.fastModel,
  };
  fs.writeFileSync(configPath, stringify(data));
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run tests/unit/config.test.ts`
Expected: 3 tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/types.ts src/config.ts tests/unit/config.test.ts tests/fixtures/
git commit -m "feat: add types and config module"
```

---

### Task 3: AI Provider Abstraction

**Files:**
- Create: `src/ai/provider.ts`
- Create: `src/ai/anthropic.ts`
- Create: `src/ai/openai.ts`
- Create: `tests/unit/provider.test.ts`

- [ ] **Step 1: Write provider tests**

```typescript
// tests/unit/provider.test.ts
import { describe, it, expect } from "vitest";
import { createProvider } from "../../src/ai/provider.js";

describe("createProvider", () => {
  it("throws if no API key provided", () => {
    expect(() => createProvider({ provider: "anthropic", apiKey: "", model: "claude-sonnet-4-6", fastModel: "claude-haiku-4-5-20251001" }))
      .toThrow("API key is required");
  });

  it("throws for unsupported provider", () => {
    expect(() => createProvider({ provider: "unknown" as any, apiKey: "key", model: "m", fastModel: "f" }))
      .toThrow("Unsupported provider: unknown");
  });

  it("creates anthropic provider", () => {
    const provider = createProvider({ provider: "anthropic", apiKey: "sk-ant-test", model: "claude-sonnet-4-6", fastModel: "claude-haiku-4-5-20251001" });
    expect(provider).toBeDefined();
    expect(provider.chat).toBeTypeOf("function");
  });

  it("creates openai provider", () => {
    const provider = createProvider({ provider: "openai", apiKey: "sk-test", model: "gpt-4o", fastModel: "gpt-4o-mini" });
    expect(provider).toBeDefined();
    expect(provider.chat).toBeTypeOf("function");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/provider.test.ts`
Expected: FAIL — `createProvider` not found

- [ ] **Step 3: Implement provider factory and providers**

```typescript
// src/ai/provider.ts
import type { AIProvider, PatchworkConfig } from "../types.js";
import { AnthropicProvider } from "./anthropic.js";
import { OpenAIProvider } from "./openai.js";

export function createProvider(config: PatchworkConfig): AIProvider {
  if (!config.apiKey) {
    throw new Error("API key is required. Run: patchwork-ai config set api-key <your-key>");
  }
  switch (config.provider) {
    case "anthropic":
      return new AnthropicProvider(config.apiKey, config.model, config.fastModel);
    case "openai":
      return new OpenAIProvider(config.apiKey, config.model, config.fastModel);
    default:
      throw new Error(`Unsupported provider: ${config.provider}`);
  }
}
```

```typescript
// src/ai/anthropic.ts
import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider, AITool, AIToolResponse, AIToolCall } from "../types.js";

export class AnthropicProvider implements AIProvider {
  private client: Anthropic;
  private defaultModel: string;
  private fastModel: string;

  constructor(apiKey: string, model: string, fastModel: string) {
    this.client = new Anthropic({ apiKey });
    this.defaultModel = model;
    this.fastModel = fastModel;
  }

  async chat(prompt: string, options?: { model?: string; fast?: boolean }): Promise<string> {
    const model = options?.model ?? (options?.fast ? this.fastModel : this.defaultModel);
    const response = await this.client.messages.create({
      model,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });
    const block = response.content[0];
    if (block.type === "text") {
      return block.text;
    }
    return "";
  }

  async chatWithTools(
    prompt: string,
    tools: AITool[],
    options?: { model?: string }
  ): Promise<AIToolResponse> {
    const model = options?.model ?? this.defaultModel;
    const response = await this.client.messages.create({
      model,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters as Anthropic.Tool.InputSchema,
      })),
    });

    let content = "";
    const toolCalls: AIToolCall[] = [];
    for (const block of response.content) {
      if (block.type === "text") {
        content += block.text;
      } else if (block.type === "tool_use") {
        toolCalls.push({
          name: block.name,
          arguments: block.input as Record<string, unknown>,
        });
      }
    }
    return { content, toolCalls };
  }
}
```

```typescript
// src/ai/openai.ts
import OpenAI from "openai";
import type { AIProvider, AITool, AIToolResponse, AIToolCall } from "../types.js";

export class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  private defaultModel: string;
  private fastModel: string;

  constructor(apiKey: string, model: string, fastModel: string) {
    this.client = new OpenAI({ apiKey });
    this.defaultModel = model;
    this.fastModel = fastModel;
  }

  async chat(prompt: string, options?: { model?: string; fast?: boolean }): Promise<string> {
    const model = options?.model ?? (options?.fast ? this.fastModel : this.defaultModel);
    const response = await this.client.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
    });
    return response.choices[0]?.message?.content ?? "";
  }

  async chatWithTools(
    prompt: string,
    tools: AITool[],
    options?: { model?: string }
  ): Promise<AIToolResponse> {
    const model = options?.model ?? this.defaultModel;
    const response = await this.client.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      tools: tools.map((t) => ({
        type: "function" as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      })),
    });

    const msg = response.choices[0]?.message;
    const content = msg?.content ?? "";
    const toolCalls: AIToolCall[] = (msg?.tool_calls ?? []).map((tc) => ({
      name: tc.function.name,
      arguments: JSON.parse(tc.function.arguments),
    }));
    return { content, toolCalls };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/provider.test.ts`
Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/ai/ tests/unit/provider.test.ts
git commit -m "feat: add AI provider abstraction with Anthropic and OpenAI"
```

---

### Task 4: Issue Analyzer

**Files:**
- Create: `src/core/analyzer.ts`
- Create: `tests/unit/analyzer.test.ts`

- [ ] **Step 1: Write analyzer tests**

```typescript
// tests/unit/analyzer.test.ts
import { describe, it, expect } from "vitest";
import { parseIssueUrl, checkClaimed } from "../../src/core/analyzer.js";

describe("parseIssueUrl", () => {
  it("parses a valid GitHub issue URL", () => {
    const result = parseIssueUrl("https://github.com/owner/repo/issues/123");
    expect(result).toEqual({ owner: "owner", repo: "repo", number: 123 });
  });

  it("throws on invalid URL", () => {
    expect(() => parseIssueUrl("https://google.com")).toThrow("Invalid GitHub issue URL");
  });

  it("throws on PR URL", () => {
    expect(() => parseIssueUrl("https://github.com/owner/repo/pull/123")).toThrow("Invalid GitHub issue URL");
  });
});

describe("checkClaimed", () => {
  it("detects claim in comments", () => {
    const comments = [
      { author: "dev1", body: "I'll work on this", createdAt: "2026-01-01" },
    ];
    expect(checkClaimed(comments)).toBe(true);
  });

  it("returns false when no claim", () => {
    const comments = [
      { author: "user", body: "This is a great idea!", createdAt: "2026-01-01" },
    ];
    expect(checkClaimed(comments)).toBe(false);
  });

  it("detects WIP claim", () => {
    const comments = [
      { author: "dev", body: "WIP: started working on a fix", createdAt: "2026-01-01" },
    ];
    expect(checkClaimed(comments)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/analyzer.test.ts`
Expected: FAIL — modules not found

- [ ] **Step 3: Implement analyzer**

```typescript
// src/core/analyzer.ts
import type { IssueInfo, IssueComment, AnalysisResult, AIProvider } from "../types.js";

export function parseIssueUrl(url: string): { owner: string; repo: string; number: number } {
  const match = url.match(
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/
  );
  if (!match) {
    throw new Error(`Invalid GitHub issue URL: ${url}`);
  }
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
  return comments.some((c) =>
    CLAIM_PATTERNS.some((pattern) => pattern.test(c.body))
  );
}

export async function analyzeIssue(
  octokit: any,
  owner: string,
  repo: string,
  number: number,
  ai: AIProvider
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
    (pr: any) => pr.body?.includes(`#${number}`) || pr.title?.includes(`#${number}`)
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
    return { issue: issueInfo, canAutofix: false, reason: "An open PR already addresses this issue", difficulty: "medium", suggestedApproach: null };
  }
  if (isClaimed) {
    return { issue: issueInfo, canAutofix: false, reason: "Someone has already claimed this issue", difficulty: "medium", suggestedApproach: null };
  }

  const assessment = await ai.chat(
    `Analyze this GitHub issue and assess if it can be automatically fixed by an AI.

Issue #${number}: ${issue.title}
Body: ${issue.body ?? "(empty)"}
Labels: ${issueInfo.labels.join(", ")}
Language: ${repoData.data.language}

Respond in JSON: { "canAutofix": boolean, "difficulty": "easy"|"medium"|"hard", "reason": string|null, "suggestedApproach": string }`,
    { fast: true }
  );

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
    return { issue: issueInfo, canAutofix: true, reason: null, difficulty: "medium", suggestedApproach: null };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/analyzer.test.ts`
Expected: 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/analyzer.ts tests/unit/analyzer.test.ts
git commit -m "feat: add issue analyzer with URL parsing and claim detection"
```

---

### Task 5: Repository Operations

**Files:**
- Create: `src/core/repo.ts`
- Create: `tests/unit/repo.test.ts`

- [ ] **Step 1: Write repo tests**

```typescript
// tests/unit/repo.test.ts
import { describe, it, expect } from "vitest";
import { detectBuildSystem, detectTestFramework, branchName } from "../../src/core/repo.js";

describe("branchName", () => {
  it("generates branch name from issue number and title", () => {
    const result = branchName(123, "Fix typo in error message");
    expect(result).toBe("fix/123-fix-typo-in-error-message");
  });

  it("truncates long titles", () => {
    const result = branchName(456, "A very long issue title that should be truncated because it exceeds the maximum length");
    expect(result.length).toBeLessThanOrEqual(60);
  });

  it("sanitizes special characters", () => {
    const result = branchName(789, "Fix: [bug] Can't parse @mentions");
    expect(result).toMatch(/^fix\/789-[a-z0-9-]+$/);
  });
});

describe("detectBuildSystem", () => {
  it("detects npm from package.json", () => {
    expect(detectBuildSystem(["package.json", "src/index.ts"])).toBe("npm");
  });

  it("detects cargo from Cargo.toml", () => {
    expect(detectBuildSystem(["Cargo.toml", "src/main.rs"])).toBe("cargo");
  });

  it("detects gradle", () => {
    expect(detectBuildSystem(["build.gradle.kts", "src/main/kotlin/Main.kt"])).toBe("gradle");
  });

  it("returns null for unknown", () => {
    expect(detectBuildSystem(["README.md"])).toBeNull();
  });
});

describe("detectTestFramework", () => {
  it("detects vitest from config", () => {
    expect(detectTestFramework(["vitest.config.ts", "package.json"])).toBe("vitest");
  });

  it("detects pytest", () => {
    expect(detectTestFramework(["pytest.ini", "tests/test_main.py"])).toBe("pytest");
  });

  it("returns null for unknown", () => {
    expect(detectTestFramework(["README.md"])).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/repo.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement repo operations**

```typescript
// src/core/repo.ts
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
  if (names.includes("pytest.ini") || names.includes("conftest.py") || allPaths.includes("pytest")) return "pytest";
  if (names.includes("Cargo.toml")) return "cargo-test";
  if (names.includes("go.mod")) return "go-test";
  return null;
}

export async function setupRepo(
  octokit: any,
  owner: string,
  repo: string,
  issueNumber: number,
  issueTitle: string
): Promise<RepoContext> {
  const workDir = path.join(os.tmpdir(), "patchwork-ai", `${owner}-${repo}`);

  // Fork
  try {
    await octokit.rest.repos.createFork({ owner, repo });
  } catch {
    // Already forked
  }
  const { data: me } = await octokit.rest.users.getAuthenticated();
  const forkUrl = `https://github.com/${me.login}/${repo}.git`;

  // Clone
  if (fs.existsSync(workDir)) {
    const git = simpleGit(workDir);
    await git.fetch("origin");
  } else {
    fs.mkdirSync(path.dirname(workDir), { recursive: true });
    await simpleGit().clone(forkUrl, workDir);
  }

  const git: SimpleGit = simpleGit(workDir);
  await git.addRemote("upstream", `https://github.com/${owner}/${repo}.git`).catch(() => {});
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/repo.test.ts`
Expected: 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/repo.ts tests/unit/repo.test.ts
git commit -m "feat: add repo operations with build/test detection"
```

---

### Task 6: Quality Gate

**Files:**
- Create: `src/core/quality-gate.ts`
- Create: `tests/unit/quality-gate.test.ts`

- [ ] **Step 1: Write quality gate tests**

```typescript
// tests/unit/quality-gate.test.ts
import { describe, it, expect } from "vitest";
import { checkAIArtifacts, checkScopeMinimal } from "../../src/core/quality-gate.js";

describe("checkAIArtifacts", () => {
  it("detects Co-Authored-By marker", () => {
    const result = checkAIArtifacts("feat: add feature\n\nCo-Authored-By: Claude");
    expect(result.passed).toBe(false);
    expect(result.detail).toContain("AI marker");
  });

  it("detects Generated with Claude Code", () => {
    const result = checkAIArtifacts("Summary\n\nGenerated with Claude Code");
    expect(result.passed).toBe(false);
  });

  it("passes clean text", () => {
    const result = checkAIArtifacts("fix: correct error message in validation");
    expect(result.passed).toBe(true);
  });
});

describe("checkScopeMinimal", () => {
  it("flags too many files changed", () => {
    const files = Array.from({ length: 15 }, (_, i) => ({
      path: `src/file${i}.ts`,
      original: "old",
      modified: "new",
    }));
    const result = checkScopeMinimal(files);
    expect(result.passed).toBe(false);
    expect(result.detail).toContain("15 files");
  });

  it("passes small change", () => {
    const files = [{ path: "src/error.ts", original: "old text", modified: "new text" }];
    const result = checkScopeMinimal(files);
    expect(result.passed).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/quality-gate.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement quality gate**

```typescript
// src/core/quality-gate.ts
import type { QualityReport, QualityCheck, FileChange, FixResult, AIProvider } from "../types.js";

const AI_MARKERS = [
  /co-authored-by:\s*claude/i,
  /co-authored-by:\s*copilot/i,
  /co-authored-by:\s*gpt/i,
  /generated\s+with\s+(claude|copilot|chatgpt|gpt)/i,
  /\bai[\s-]generated\b/i,
];

export function checkAIArtifacts(text: string): QualityCheck {
  for (const pattern of AI_MARKERS) {
    if (pattern.test(text)) {
      return { name: "ai-artifacts", passed: false, detail: `AI marker detected: ${pattern.source}` };
    }
  }
  return { name: "ai-artifacts", passed: true, detail: "No AI markers found" };
}

export function checkScopeMinimal(files: FileChange[]): QualityCheck {
  if (files.length > 10) {
    return {
      name: "scope",
      passed: false,
      detail: `Too many files changed (${files.length}). Keep fixes focused.`,
    };
  }
  return { name: "scope", passed: true, detail: `${files.length} file(s) changed` };
}

export async function runQualityGate(fix: FixResult, ai: AIProvider): Promise<QualityReport> {
  const checks: QualityCheck[] = [];

  checks.push(checkAIArtifacts(fix.commitMessage));
  checks.push(checkAIArtifacts(fix.explanation));
  checks.push(checkScopeMinimal(fix.files));

  const diff = fix.files
    .map((f) => `--- ${f.path}\n+++ ${f.path}\n${f.modified}`)
    .join("\n\n");

  const review = await ai.chat(
    `Review this code change for quality. Check:
1. Is the fix necessary and minimal?
2. Is it readable and follows good practices?
3. Could it cause side effects?

Diff:
${diff}

Explanation: ${fix.explanation}

Respond in JSON: { "necessity": { "passed": boolean, "detail": string }, "readability": { "passed": boolean, "detail": string }, "sideEffects": { "passed": boolean, "detail": string } }`
  );

  try {
    const parsed = JSON.parse(review.replace(/```json\n?|\n?```/g, "").trim());
    checks.push({ name: "necessity", ...parsed.necessity });
    checks.push({ name: "readability", ...parsed.readability });
    checks.push({ name: "side-effects", ...parsed.sideEffects });
  } catch {
    checks.push({ name: "ai-review", passed: true, detail: "AI review could not be parsed, skipping" });
  }

  return {
    passed: checks.every((c) => c.passed),
    checks,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/quality-gate.test.ts`
Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/quality-gate.ts tests/unit/quality-gate.test.ts
git commit -m "feat: add quality gate with AI artifact detection and scope check"
```

---

### Task 7: Test Runner

**Files:**
- Create: `src/core/test-runner.ts`
- Create: `tests/unit/test-runner.test.ts`

- [ ] **Step 1: Write test runner tests**

```typescript
// tests/unit/test-runner.test.ts
import { describe, it, expect } from "vitest";
import { buildTestCommand } from "../../src/core/test-runner.js";

describe("buildTestCommand", () => {
  it("builds npm test command", () => {
    expect(buildTestCommand("npm", "vitest")).toBe("npm test");
  });

  it("builds cargo test command", () => {
    expect(buildTestCommand("cargo", "cargo-test")).toBe("cargo test");
  });

  it("builds go test command", () => {
    expect(buildTestCommand("go", "go-test")).toBe("go test ./...");
  });

  it("builds pytest command", () => {
    expect(buildTestCommand("pip", "pytest")).toBe("python -m pytest");
  });

  it("builds gradle test command", () => {
    expect(buildTestCommand("gradle", null)).toBe("./gradlew test");
  });

  it("returns null for unknown", () => {
    expect(buildTestCommand(null, null)).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/test-runner.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement test runner**

```typescript
// src/core/test-runner.ts
import { execFileSync } from "node:child_process";

export interface TestResult {
  passed: boolean;
  output: string;
  command: string;
}

export function buildTestCommand(
  buildSystem: string | null,
  testFramework: string | null
): string | null {
  if (buildSystem === "cargo" || testFramework === "cargo-test") return "cargo test";
  if (buildSystem === "go" || testFramework === "go-test") return "go test ./...";
  if (testFramework === "pytest") return "python -m pytest";
  if (buildSystem === "gradle") return "./gradlew test";
  if (buildSystem === "npm") return "npm test";
  if (testFramework === "vitest") return "npx vitest run";
  if (testFramework === "jest") return "npx jest";
  return null;
}

export function runTests(
  workDir: string,
  buildSystem: string | null,
  testFramework: string | null
): TestResult {
  const command = buildTestCommand(buildSystem, testFramework);
  if (!command) {
    return { passed: true, output: "No test framework detected, skipping tests", command: "none" };
  }

  const parts = command.split(" ");
  const bin = parts[0];
  const args = parts.slice(1);

  try {
    const output = execFileSync(bin, args, {
      cwd: workDir,
      encoding: "utf-8",
      timeout: 300_000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { passed: true, output, command };
  } catch (err: any) {
    return {
      passed: false,
      output: (err.stdout?.toString() ?? "") + "\n" + (err.stderr?.toString() ?? ""),
      command,
    };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/test-runner.test.ts`
Expected: 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/test-runner.ts tests/unit/test-runner.test.ts
git commit -m "feat: add test runner with multi-framework detection"
```

---

### Task 8: PR Creator

**Files:**
- Create: `src/core/pr-creator.ts`
- Create: `tests/unit/pr-creator.test.ts`

- [ ] **Step 1: Write PR creator tests**

```typescript
// tests/unit/pr-creator.test.ts
import { describe, it, expect } from "vitest";
import { generatePRTitle, sanitizePRBody } from "../../src/core/pr-creator.js";

describe("generatePRTitle", () => {
  it("generates title from issue", () => {
    const title = generatePRTitle("Fix typo in error message", 123);
    expect(title).toContain("fix");
    expect(title.length).toBeLessThanOrEqual(72);
  });
});

describe("sanitizePRBody", () => {
  it("removes AI markers from body", () => {
    const body = "Fixes the bug.\n\nGenerated with Claude Code";
    const result = sanitizePRBody(body);
    expect(result).not.toContain("Generated with");
  });

  it("removes Co-Authored-By lines", () => {
    const body = "Fix applied.\n\nCo-Authored-By: Claude <noreply@anthropic.com>";
    const result = sanitizePRBody(body);
    expect(result).not.toContain("Co-Authored-By");
  });

  it("preserves clean content", () => {
    const body = "This fixes the error message.\n\nCloses #123";
    const result = sanitizePRBody(body);
    expect(result).toBe(body);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/pr-creator.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement PR creator**

```typescript
// src/core/pr-creator.ts
import simpleGit from "simple-git";
import type { PRInfo, FixResult, IssueInfo, RepoContext, AIProvider } from "../types.js";

export function generatePRTitle(issueTitle: string, issueNumber: number): string {
  const lower = issueTitle.toLowerCase();
  const prefix = lower.startsWith("fix") || lower.startsWith("bug") ? "fix" : "feat";
  const clean = issueTitle.replace(/^\[.*?\]\s*/, "").replace(/^(fix|feat|bug|enhancement):\s*/i, "");
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
  ai: AIProvider
): Promise<PRInfo> {
  const git = simpleGit(repoCtx.localPath);

  for (const file of fix.files) {
    await git.add(file.path);
  }
  await git.commit(fix.commitMessage);
  await git.push("origin", repoCtx.branch, ["--set-upstream"]);

  const bodyDraft = await ai.chat(
    `Write a concise PR description for this fix. Be natural and casual.
Issue: #${issue.number} - ${issue.title}
Fix explanation: ${fix.explanation}
Files changed: ${fix.files.map((f) => f.path).join(", ")}

Write 2-3 sentences max. End with "Fixes #${issue.number}". No AI markers.`
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/pr-creator.test.ts`
Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/pr-creator.ts tests/unit/pr-creator.test.ts
git commit -m "feat: add PR creator with AI marker sanitization"
```

---

### Task 9: Codebase Analyzer and Fixer

**Files:**
- Create: `src/core/codebase.ts`
- Create: `src/core/fixer.ts`

- [ ] **Step 1: Implement codebase analyzer**

```typescript
// src/core/codebase.ts
import fs from "node:fs";
import path from "node:path";
import type { CodebaseAnalysis, AIProvider, IssueInfo } from "../types.js";

export function listFiles(dir: string, maxDepth: number = 3, prefix: string = ""): string[] {
  const results: string[] = [];
  if (maxDepth <= 0) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "dist" || entry.name === "target" || entry.name === "__pycache__") {
      continue;
    }
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      results.push(...listFiles(path.join(dir, entry.name), maxDepth - 1, rel));
    } else {
      results.push(rel);
    }
  }
  return results;
}

export async function analyzeCodebase(
  repoPath: string,
  issue: IssueInfo,
  ai: AIProvider
): Promise<CodebaseAnalysis> {
  const files = listFiles(repoPath);
  const tree = files.join("\n");

  const response = await ai.chat(
    `Given this repository file tree and issue, identify which files are most relevant to the fix.

Issue: #${issue.number} - ${issue.title}
Description: ${issue.body}

File tree:
${tree}

Respond in JSON: { "relevantFiles": ["path/to/file1", "path/to/file2"], "conventions": { "style": "description", "commitFormat": "conventional|freeform", "testPattern": "description" } }`
  );

  try {
    const parsed = JSON.parse(response.replace(/```json\n?|\n?```/g, "").trim());
    const relevantFiles = (parsed.relevantFiles ?? []).filter((f: string) => files.includes(f));

    let relatedCode = "";
    for (const f of relevantFiles.slice(0, 5)) {
      const fullPath = path.join(repoPath, f);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, "utf-8");
        relatedCode += `\n--- ${f} ---\n${content.slice(0, 3000)}\n`;
      }
    }

    return {
      relevantFiles,
      conventions: parsed.conventions ?? { style: "unknown", commitFormat: "conventional", testPattern: "unknown" },
      relatedCode,
    };
  } catch {
    return { relevantFiles: [], conventions: { style: "unknown", commitFormat: "conventional", testPattern: "unknown" }, relatedCode: "" };
  }
}
```

- [ ] **Step 2: Implement fixer**

```typescript
// src/core/fixer.ts
import fs from "node:fs";
import path from "node:path";
import type { FixResult, FileChange, IssueInfo, CodebaseAnalysis, AIProvider } from "../types.js";

export async function generateFix(
  repoPath: string,
  issue: IssueInfo,
  codebase: CodebaseAnalysis,
  ai: AIProvider
): Promise<FixResult> {
  const response = await ai.chat(
    `Fix this GitHub issue by modifying the minimum necessary code.

Issue: #${issue.number} - ${issue.title}
Description: ${issue.body}

Relevant code:
${codebase.relatedCode}

Conventions:
- Style: ${codebase.conventions.style}
- Commit format: ${codebase.conventions.commitFormat}

Rules:
- Make the MINIMAL change needed
- Follow the existing code style exactly
- Do NOT add unnecessary comments or docstrings
- Do NOT refactor unrelated code
- Write a natural commit message (no AI markers)

Respond in JSON:
{
  "files": [{ "path": "relative/path", "content": "full file content after fix" }],
  "commitMessage": "feat: description",
  "explanation": "brief explanation of what was changed and why"
}`
  );

  try {
    const parsed = JSON.parse(response.replace(/```json\n?|\n?```/g, "").trim());
    const files: FileChange[] = [];

    for (const f of parsed.files ?? []) {
      const fullPath = path.join(repoPath, f.path);
      const original = fs.existsSync(fullPath)
        ? fs.readFileSync(fullPath, "utf-8")
        : "";

      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, f.content);

      files.push({ path: f.path, original, modified: f.content });
    }

    return {
      files,
      commitMessage: parsed.commitMessage ?? `fix: address issue #${issue.number}`,
      explanation: parsed.explanation ?? "Automated fix",
    };
  } catch {
    throw new Error("Failed to parse AI fix response. The issue may be too complex for automatic fixing.");
  }
}
```

- [ ] **Step 3: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/core/codebase.ts src/core/fixer.ts
git commit -m "feat: add codebase analyzer and fix generator"
```

---

### Task 10: Pipeline Orchestrator

**Files:**
- Create: `src/core/pipeline.ts`
- Create: `tests/unit/pipeline.test.ts`

- [ ] **Step 1: Write pipeline test**

```typescript
// tests/unit/pipeline.test.ts
import { describe, it, expect } from "vitest";
import { PipelineStep, formatStepResult } from "../../src/core/pipeline.js";

describe("formatStepResult", () => {
  it("formats success step", () => {
    const result = formatStepResult(PipelineStep.ANALYZE, true, "Issue is suitable for autofix");
    expect(result.step).toBe("analyze");
    expect(result.success).toBe(true);
  });

  it("formats failure step", () => {
    const result = formatStepResult(PipelineStep.QUALITY_GATE, false, "Too many files changed");
    expect(result.success).toBe(false);
    expect(result.detail).toContain("Too many files");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/pipeline.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement pipeline**

```typescript
// src/core/pipeline.ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/pipeline.test.ts`
Expected: 2 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/pipeline.ts tests/unit/pipeline.test.ts
git commit -m "feat: add pipeline orchestrator for full fix flow"
```

---

### Task 11: CLI Commands

**Files:**
- Create: `src/cli/output.ts`
- Create: `src/cli/commands/fix.ts`
- Create: `src/cli/commands/analyze.ts`
- Create: `src/cli/commands/discover.ts`
- Create: `src/cli/commands/config.ts`
- Create: `bin/patchwork-ai.ts`

- [ ] **Step 1: Implement CLI output helper**

```typescript
// src/cli/output.ts
import ora, { type Ora } from "ora";
import chalk from "chalk";

let spinner: Ora | null = null;

export function startStep(message: string): void {
  spinner = ora(message).start();
}

export function succeedStep(message?: string): void {
  spinner?.succeed(message);
}

export function failStep(message: string): void {
  spinner?.fail(message);
}

export function info(message: string): void {
  console.log(chalk.blue("i"), message);
}

export function success(message: string): void {
  console.log(chalk.green("v"), message);
}

export function error(message: string): void {
  console.error(chalk.red("x"), message);
}

export function warn(message: string): void {
  console.log(chalk.yellow("!"), message);
}
```

- [ ] **Step 2: Implement fix command**

```typescript
// src/cli/commands/fix.ts
import { runPipeline, PipelineStep } from "../../core/pipeline.js";
import { loadConfig } from "../../config.js";
import { createProvider } from "../../ai/provider.js";
import { startStep, succeedStep, failStep, success, error } from "../output.js";

export async function fixCommand(issueUrl: string, options: { model?: string }): Promise<void> {
  const config = loadConfig();
  if (options.model) config.model = options.model;

  const githubToken = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (!githubToken) {
    error("GITHUB_TOKEN or GH_TOKEN environment variable is required");
    process.exit(1);
  }

  if (!config.apiKey) {
    error("API key not configured. Run: patchwork-ai config set api-key <key>");
    process.exit(1);
  }

  const ai = createProvider(config);

  const result = await runPipeline(issueUrl, githubToken, ai, {
    onStep: (_step, message) => startStep(message),
    onComplete: (pr) => {
      succeedStep("Pull request created!");
      success(`PR: ${pr.url}`);
    },
    onFail: (_step, reason) => {
      failStep(reason);
      process.exit(1);
    },
  });

  if (!result) {
    process.exit(1);
  }
}
```

- [ ] **Step 3: Implement analyze command**

```typescript
// src/cli/commands/analyze.ts
import { Octokit } from "octokit";
import { parseIssueUrl, analyzeIssue } from "../../core/analyzer.js";
import { loadConfig } from "../../config.js";
import { createProvider } from "../../ai/provider.js";
import { startStep, succeedStep, failStep, info } from "../output.js";

export async function analyzeCommand(issueUrl: string, options: { model?: string }): Promise<void> {
  const config = loadConfig();
  if (options.model) config.model = options.model;

  const githubToken = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (!githubToken) {
    failStep("GITHUB_TOKEN or GH_TOKEN environment variable is required");
    process.exit(1);
  }

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
  if (result.issue.hasExistingPR) info("Warning: An existing PR may address this issue");
  if (result.issue.isClaimed) info("Warning: Someone has claimed this issue");
}
```

- [ ] **Step 4: Implement discover command**

```typescript
// src/cli/commands/discover.ts
import { Octokit } from "octokit";
import { info, startStep, succeedStep } from "../output.js";

export async function discoverCommand(
  repoUrl: string,
  options: { language?: string; difficulty?: string; limit?: string }
): Promise<void> {
  const githubToken = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (!githubToken) {
    console.error("GITHUB_TOKEN or GH_TOKEN environment variable is required");
    process.exit(1);
  }

  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) {
    console.error("Invalid GitHub repository URL");
    process.exit(1);
  }
  const [, owner, repo] = match;

  const octokit = new Octokit({ auth: githubToken });
  const limit = parseInt(options.limit ?? "10", 10);

  startStep("Searching for issues...");

  const labels = ["good first issue", "help wanted", "bug"].join(",");
  const { data: issues } = await octokit.rest.issues.listForRepo({
    owner,
    repo,
    labels,
    state: "open",
    per_page: limit,
    sort: "updated",
    direction: "desc",
  });

  succeedStep(`Found ${issues.length} potential issues`);

  for (const issue of issues) {
    if (issue.pull_request) continue;
    const labelNames = (issue.labels as any[])
      .map((l: any) => (typeof l === "string" ? l : l.name))
      .join(", ");
    info(`#${issue.number} - ${issue.title} [${labelNames}]`);
  }
}
```

- [ ] **Step 5: Implement config command**

```typescript
// src/cli/commands/config.ts
import { loadConfig, saveConfig, getConfigPath } from "../../config.js";
import { success, info, error } from "../output.js";

export function configCommand(action: string, key?: string, value?: string): void {
  const configPath = getConfigPath();

  if (action === "set") {
    if (!key || !value) {
      error("Usage: patchwork-ai config set <key> <value>");
      process.exit(1);
    }
    const config = loadConfig();
    const keyMap: Record<string, string> = {
      "api-key": "apiKey",
      provider: "provider",
      model: "model",
      "fast-model": "fastModel",
    };
    const field = keyMap[key];
    if (!field) {
      error(`Unknown config key: ${key}. Valid keys: ${Object.keys(keyMap).join(", ")}`);
      process.exit(1);
    }
    (config as any)[field] = value;
    saveConfig(configPath, config);
    success(`Set ${key} = ${key === "api-key" ? "***" : value}`);
  } else if (action === "get") {
    const config = loadConfig();
    if (key) {
      info(`${key}: ${key === "api-key" ? "***" : (config as any)[key] ?? "not set"}`);
    } else {
      info(`Provider: ${config.provider}`);
      info(`Model: ${config.model}`);
      info(`Fast model: ${config.fastModel}`);
      info(`API key: ${config.apiKey ? "***" : "not set"}`);
      info(`Config path: ${configPath}`);
    }
  } else {
    error("Usage: patchwork-ai config <set|get> [key] [value]");
    process.exit(1);
  }
}
```

- [ ] **Step 6: Implement CLI entrypoint**

```typescript
// bin/patchwork-ai.ts
#!/usr/bin/env node
import { Command } from "commander";
import { fixCommand } from "../src/cli/commands/fix.js";
import { analyzeCommand } from "../src/cli/commands/analyze.js";
import { discoverCommand } from "../src/cli/commands/discover.js";
import { configCommand } from "../src/cli/commands/config.js";

const program = new Command();

program
  .name("patchwork-ai")
  .description("AI-powered CLI that automates OSS contributions")
  .version("0.1.0");

program
  .command("fix <issue-url>")
  .description("Analyze an issue, generate a fix, and create a PR")
  .option("--model <model>", "Override AI model")
  .action(fixCommand);

program
  .command("analyze <issue-url>")
  .description("Analyze an issue without making changes (dry run)")
  .option("--model <model>", "Override AI model")
  .action(analyzeCommand);

program
  .command("discover <repo-url>")
  .description("Find issues suitable for contribution")
  .option("--language <lang>", "Filter by language")
  .option("--difficulty <level>", "Filter by difficulty (easy, medium, hard)")
  .option("--limit <n>", "Max results", "10")
  .action(discoverCommand);

program
  .command("config <action> [key] [value]")
  .description("Manage configuration (set/get)")
  .action(configCommand);

program.parse();
```

- [ ] **Step 7: Verify build**

Run: `npx tsc`
Expected: Compiles without errors

Run: `node dist/bin/patchwork-ai.js --help`
Expected: Shows help text with fix, analyze, discover, config commands

- [ ] **Step 8: Commit**

```bash
git add bin/ src/cli/
git commit -m "feat: add CLI with fix, analyze, discover, and config commands"
```

---

### Task 12: README and Final Polish

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Write README**

Write a README.md with: project description, install instructions (`npx patchwork-ai`), setup (config API key + GITHUB_TOKEN), usage examples for all 4 commands (fix, analyze, discover, config), quality gate explanation, supported AI providers table, and MIT license note.

- [ ] **Step 2: Verify full test suite**

Run: `npx vitest run`
Expected: All tests pass

Run: `npx tsc`
Expected: Compiles without errors

- [ ] **Step 3: Commit and push**

```bash
git add README.md
git commit -m "docs: add README with usage instructions"
git push origin main
```
