import { describe, it, expect } from "vitest";
import { buildTestCommand } from "../../src/core/test-runner.js";

describe("buildTestCommand", () => {
  it("builds npm test", () => {
    expect(buildTestCommand("npm", "vitest")).toBe("npm test");
  });
  it("builds cargo test", () => {
    expect(buildTestCommand("cargo", "cargo-test")).toBe("cargo test");
  });
  it("builds go test", () => {
    expect(buildTestCommand("go", "go-test")).toBe("go test ./...");
  });
  it("builds pytest", () => {
    expect(buildTestCommand("pip", "pytest")).toBe("python -m pytest");
  });
  it("builds gradle test", () => {
    expect(buildTestCommand("gradle", null)).toBe("./gradlew test");
  });
  it("returns null for unknown", () => {
    expect(buildTestCommand(null, null)).toBeNull();
  });
});
