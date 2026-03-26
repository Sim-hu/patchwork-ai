import { loadConfig, saveConfig, getConfigPath } from "../../config.js";
import { success, info, error } from "../output.js";

export function configCommand(action: string, key?: string, value?: string): void {
  const configPath = getConfigPath();
  if (action === "set") {
    if (!key || !value) { error("Usage: patchwork-ai config set <key> <value>"); process.exit(1); }
    const config = loadConfig();
    const keyMap: Record<string, string> = { "api-key": "apiKey", provider: "provider", model: "model", "fast-model": "fastModel", "base-url": "baseUrl" };
    const field = keyMap[key];
    if (!field) { error(`Unknown config key: ${key}. Valid: ${Object.keys(keyMap).join(", ")}`); process.exit(1); }
    (config as any)[field] = value;
    saveConfig(configPath, config);
    success(`Set ${key} = ${key === "api-key" ? "***" : value}`);
  } else if (action === "get") {
    const config = loadConfig();
    if (key) { info(`${key}: ${key === "api-key" ? "***" : (config as any)[key] ?? "not set"}`); }
    else {
      info(`Provider: ${config.provider}`);
      info(`Model: ${config.model}`);
      info(`Fast model: ${config.fastModel}`);
      info(`API key: ${config.apiKey ? "***" : "not set"}`);
      info(`Config path: ${configPath}`);
    }
  } else { error("Usage: patchwork-ai config <set|get> [key] [value]"); process.exit(1); }
}
