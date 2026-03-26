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
    baseUrl: parsed.base_url ?? parsed.baseUrl,
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
