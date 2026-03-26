import { describe, it, expect } from "vitest";
import { createProvider } from "../../src/ai/provider.js";

describe("createProvider", () => {
  it("throws if no API key provided", () => {
    expect(() => createProvider({
      provider: "anthropic", apiKey: "", model: "claude-sonnet-4-6", fastModel: "claude-haiku-4-5-20251001",
    })).toThrow("API key is required");
  });

  it("throws for unsupported provider", () => {
    expect(() => createProvider({
      provider: "unknown" as any, apiKey: "key", model: "m", fastModel: "f",
    })).toThrow("Unsupported provider: unknown");
  });

  it("creates anthropic provider", () => {
    const provider = createProvider({
      provider: "anthropic", apiKey: "sk-ant-test", model: "claude-sonnet-4-6", fastModel: "claude-haiku-4-5-20251001",
    });
    expect(provider).toBeDefined();
    expect(provider.chat).toBeTypeOf("function");
  });

  it("creates openai provider", () => {
    const provider = createProvider({
      provider: "openai", apiKey: "sk-test", model: "gpt-4o", fastModel: "gpt-4o-mini",
    });
    expect(provider).toBeDefined();
    expect(provider.chat).toBeTypeOf("function");
  });
});
