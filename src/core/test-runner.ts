import { execFileSync } from "node:child_process";

export interface TestResult {
  passed: boolean;
  output: string;
  command: string;
}

export function buildTestCommand(
  buildSystem: string | null,
  testFramework: string | null,
): string | null {
  if (buildSystem === "cargo" || testFramework === "cargo-test")
    return "cargo test";
  if (buildSystem === "go" || testFramework === "go-test")
    return "go test ./...";
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
  testFramework: string | null,
): TestResult {
  const command = buildTestCommand(buildSystem, testFramework);
  if (!command)
    return {
      passed: true,
      output: "No test framework detected, skipping tests",
      command: "none",
    };

  const parts = command.split(" ");
  try {
    const output = execFileSync(parts[0], parts.slice(1), {
      cwd: workDir,
      encoding: "utf-8",
      timeout: 300_000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { passed: true, output, command };
  } catch (err: any) {
    return {
      passed: false,
      output:
        (err.stdout?.toString() ?? "") +
        "\n" +
        (err.stderr?.toString() ?? ""),
      command,
    };
  }
}
