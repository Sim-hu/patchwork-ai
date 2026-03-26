import { describe, it, expect } from "vitest";
import { version } from "../src/index";

describe("Project Setup", () => {
  it("should have a version", () => {
    expect(version).toBe("0.1.0");
  });
});
