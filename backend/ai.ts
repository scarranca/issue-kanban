export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

/**
 * Minimal OpenAI-compatible chat-completions client (no SDK). Works with
 * OpenAI, Anthropic (compat layer), DeepSeek, OpenRouter, Gemini (openai
 * endpoint), and any self-hosted OpenAI-compatible server.
 */
export async function chatCompletion(
  cfg: LlmConfig,
  messages: ChatMessage[]
): Promise<string> {
  const base = cfg.baseUrl.replace(/\/+$/, '');
  const url = base + '/chat/completions';

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      messages,
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`LLM error ${res.status}: ${text.slice(0, 400)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('LLM returned no content');
  return content;
}

/**
 * Extract the first JSON object from an LLM response, tolerating fenced
 * code blocks and surrounding prose.
 */
export function extractJson<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('LLM response contained no JSON object');
  }
  return JSON.parse(candidate.slice(start, end + 1)) as T;
}
