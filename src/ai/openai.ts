import OpenAI from "openai";
import type { AIProvider, AITool, AIToolResponse, AIToolCall } from "../types.js";

export class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  private defaultModel: string;
  private fastModel: string;

  constructor(apiKey: string, model: string, fastModel: string, baseURL?: string) {
    this.client = new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) });
    this.defaultModel = model;
    this.fastModel = fastModel;
  }

  async chat(prompt: string, options?: { model?: string; fast?: boolean }): Promise<string> {
    const model = options?.model ?? (options?.fast ? this.fastModel : this.defaultModel);
    const response = await this.client.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
    });
    return response.choices[0]?.message?.content ?? "";
  }

  async chatWithTools(prompt: string, tools: AITool[], options?: { model?: string }): Promise<AIToolResponse> {
    const model = options?.model ?? this.defaultModel;
    const response = await this.client.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      tools: tools.map((t) => ({
        type: "function" as const,
        function: { name: t.name, description: t.description, parameters: t.parameters },
      })),
    });
    const msg = response.choices[0]?.message;
    const content = msg?.content ?? "";
    const toolCalls: AIToolCall[] = (msg?.tool_calls ?? [])
      .filter((tc): tc is Extract<typeof tc, { type: "function" }> => tc.type === "function")
      .map((tc) => ({
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments),
      }));
    return { content, toolCalls };
  }
}
