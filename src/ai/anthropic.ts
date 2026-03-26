import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider, AITool, AIToolResponse, AIToolCall } from "../types.js";

export class AnthropicProvider implements AIProvider {
  private client: Anthropic;
  private defaultModel: string;
  private fastModel: string;

  constructor(apiKey: string, model: string, fastModel: string) {
    this.client = new Anthropic({ apiKey });
    this.defaultModel = model;
    this.fastModel = fastModel;
  }

  async chat(prompt: string, options?: { model?: string; fast?: boolean }): Promise<string> {
    const model = options?.model ?? (options?.fast ? this.fastModel : this.defaultModel);
    const response = await this.client.messages.create({
      model,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });
    const block = response.content[0];
    if (block.type === "text") return block.text;
    return "";
  }

  async chatWithTools(prompt: string, tools: AITool[], options?: { model?: string }): Promise<AIToolResponse> {
    const model = options?.model ?? this.defaultModel;
    const response = await this.client.messages.create({
      model,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters as Anthropic.Tool.InputSchema,
      })),
    });
    let content = "";
    const toolCalls: AIToolCall[] = [];
    for (const block of response.content) {
      if (block.type === "text") content += block.text;
      else if (block.type === "tool_use") toolCalls.push({ name: block.name, arguments: block.input as Record<string, unknown> });
    }
    return { content, toolCalls };
  }
}
