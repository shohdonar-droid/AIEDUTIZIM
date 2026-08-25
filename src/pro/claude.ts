import Anthropic from "@anthropic-ai/sdk";
import { config, type Effort } from "./config";

let client: Anthropic | null = null;

/**
 * Lazily constructed so a missing ANTHROPIC_API_KEY surfaces when someone
 * actually presses a Pro button, rather than crashing the server at import.
 */
export function anthropic(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: config.anthropic.apiKey, maxRetries: 3 });
  }
  return client;
}

/**
 * One streamed completion returning plain text.
 * Streaming keeps long generations from hitting the SDK's HTTP timeout.
 */
export async function completeText(args: {
  system: string;
  prompt: string;
  maxTokens?: number;
  effort?: Effort;
}): Promise<string> {
  const stream = anthropic().messages.stream({
    model: config.anthropic.model,
    max_tokens: args.maxTokens ?? 16000,
    system: [{ type: "text", text: args.system, cache_control: { type: "ephemeral" } }],
    output_config: { effort: args.effort ?? config.anthropic.effort },
    messages: [{ role: "user", content: args.prompt }],
  });

  const message = await stream.finalMessage();

  if (message.stop_reason === "refusal") {
    throw new Error(
      `Model declined the request (${message.stop_details?.category ?? "unknown"})`,
    );
  }

  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

/**
 * One completion constrained to a JSON schema. Returns the parsed object.
 */
export async function completeJson<T>(args: {
  system: string;
  prompt: string;
  schema: Record<string, unknown>;
  maxTokens?: number;
  effort?: Effort;
}): Promise<T> {
  const stream = anthropic().messages.stream({
    model: config.anthropic.model,
    max_tokens: args.maxTokens ?? 16000,
    system: [{ type: "text", text: args.system, cache_control: { type: "ephemeral" } }],
    output_config: {
      effort: args.effort ?? config.anthropic.effort,
      format: { type: "json_schema", schema: args.schema },
    },
    messages: [{ role: "user", content: args.prompt }],
  });

  const message = await stream.finalMessage();

  if (message.stop_reason === "refusal") {
    throw new Error(
      `Model declined the request (${message.stop_details?.category ?? "unknown"})`,
    );
  }
  if (message.stop_reason === "max_tokens") {
    throw new Error("Response was cut off before the JSON was complete");
  }

  const text = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  return JSON.parse(text) as T;
}

/** Run async jobs with a bounded number in flight, preserving input order. */
export async function mapLimit<TIn, TOut>(
  items: TIn[],
  limit: number,
  fn: (item: TIn, index: number) => Promise<TOut>,
): Promise<TOut[]> {
  const results = new Array<TOut>(items.length);
  let cursor = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await fn(items[index], index);
    }
  });

  await Promise.all(workers);
  return results;
}
