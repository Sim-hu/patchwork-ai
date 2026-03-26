import { describe, it, expect } from "vitest";
import { PipelineStep, formatStepResult } from "../../src/core/pipeline.js";

describe("formatStepResult", () => {
  it("formats success step", () => {
    const result = formatStepResult(PipelineStep.ANALYZE, true, "Issue is suitable");
    expect(result.step).toBe("analyze");
    expect(result.success).toBe(true);
  });
  it("formats failure step", () => {
    const result = formatStepResult(PipelineStep.QUALITY_GATE, false, "Too many files");
    expect(result.success).toBe(false);
    expect(result.detail).toContain("Too many files");
  });
});
