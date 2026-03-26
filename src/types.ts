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
  provider: "anthropic" | "openai" | "openrouter" | "google";
  apiKey: string;
  model: string;
  fastModel: string;
  baseUrl?: string;
}

export const DEFAULT_CONFIG: PatchworkConfig = {
  provider: "anthropic",
  apiKey: "",
  model: "claude-sonnet-4-6",
  fastModel: "claude-haiku-4-5-20251001",
};

export interface AIProvider {
  chat(prompt: string, options?: { model?: string; fast?: boolean }): Promise<string>;
  chatWithTools(prompt: string, tools: AITool[], options?: { model?: string }): Promise<AIToolResponse>;
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
