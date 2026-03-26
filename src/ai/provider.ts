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
