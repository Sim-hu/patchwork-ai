import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig, saveConfig } from "../../src/config.js";
import { DEFAULT_CONFIG } from "../../src/types.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

describe("config", () => {
  const testDir = path.join(os.tmpdir(), "patchwork-ai-test-" + Date.now());

  beforeEach(() => { fs.mkdirSync(testDir, { recursive: true }); });
  afterEach(() => { fs.rmSync(testDir, { recursive: true, force: true }); });

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
