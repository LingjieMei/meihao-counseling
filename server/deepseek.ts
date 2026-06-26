/**
 * DeepSeek 直连调用层
 * ------------------------------------------------------------------
 * 最高优先级约束：
 *   所有 AI 调用必须直连 DeepSeek 官方 API 端点，不经过任何平台或
 *   Manus 内置网关，以保证 Manus 账号失效后系统的 AI 能力仍可持续运行。
 *   本文件不引用、不调用任何内置网关（已移除 fallback）。
 *
 * 说明：
 *   - DeepSeek API 兼容 OpenAI 的 /chat/completions 接口。
 *   - DeepSeek 使用 response_format = { type: "json_object" } 的 JSON 模式，
 *     调用方需在 prompt 中描述好 JSON 字段结构。
 *   - DeepSeek 调用失败时直接抛出错误，不做任何内置网关兜底。
 */

import type { Message } from "./_core/llm";

// ── 硬编码的 DeepSeek 配置（直连，不走任何内置网关） ──────────────────────
// 允许通过环境变量覆盖，但默认硬编码为官方端点与用户提供的密钥。
const DEEPSEEK_API_URL =
  process.env.DEEPSEEK_API_URL?.trim() || "https://api.deepseek.com/chat/completions";
const DEEPSEEK_API_KEY =
  process.env.DEEPSEEK_API_KEY?.trim() || "";
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL?.trim() || "deepseek-chat";

export type DeepSeekResult = {
  content: string;
};

type DeepSeekInvokeOptions = {
  messages: Message[];
  /** 是否要求 JSON 输出（使用 DeepSeek 的 json_object 模式） */
  json?: boolean;
  maxTokens?: number;
  temperature?: number;
};

// 将内部 Message[] 规整为 DeepSeek/OpenAI 接受的纯文本消息体。
function normalizeMessagesForDeepSeek(messages: Message[]) {
  return messages.map(m => {
    let content: string;
    if (typeof m.content === "string") {
      content = m.content;
    } else if (Array.isArray(m.content)) {
      content = m.content
        .map((part: any) => (typeof part === "string" ? part : "text" in part ? part.text : ""))
        .join("\n");
    } else {
      content = "";
    }
    return { role: m.role, content };
  });
}

const RETRY_MAX = 2;
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

/**
 * 直连 DeepSeek 进行一次对话补全。
 * 失败时重试最多 RETRY_MAX 次，全部失败则直接抛出错误（不做任何内置网关兜底）。
 */
export async function invokeDeepSeek(opts: DeepSeekInvokeOptions): Promise<DeepSeekResult> {
  const { messages, json = false, maxTokens, temperature } = opts;

  if (!DEEPSEEK_API_KEY) {
    throw new Error("AI 督导功能未配置：请在 .env 中设置 DEEPSEEK_API_KEY");
  }

  const payload: Record<string, unknown> = {
    model: DEEPSEEK_MODEL,
    messages: normalizeMessagesForDeepSeek(messages),
  };
  if (json) {
    payload.response_format = { type: "json_object" };
  }
  if (typeof maxTokens === "number") {
    payload.max_tokens = maxTokens;
  }
  if (typeof temperature === "number") {
    payload.temperature = temperature;
  }

  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_MAX; attempt++) {
    try {
      const response = await fetch(DEEPSEEK_API_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        throw new Error(`DeepSeek API ${response.status} ${response.statusText} – ${errText}`);
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content ?? "";
      if (!content) throw new Error("DeepSeek 返回空内容");

      return { content };
    } catch (error) {
      lastError = error;
      console.warn(`DeepSeek 调用失败（第 ${attempt + 1}/${RETRY_MAX + 1} 次）:`, error);
      if (attempt < RETRY_MAX) {
        await sleep(600 * (attempt + 1));
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("DeepSeek 调用失败，请检查 API Key 或网络连接");
}

/**
 * 便捷封装：直连 DeepSeek 并解析为 JSON 对象。
 * 自动剥离可能存在的 ```json ... ``` 代码块包裹。
 */
export async function invokeDeepSeekJSON<T = any>(
  opts: Omit<DeepSeekInvokeOptions, "json">
): Promise<{ data: T; source: "deepseek" }> {
  const { content } = await invokeDeepSeek({ ...opts, json: true });
  const cleaned = stripCodeFence(content);
  const data = JSON.parse(cleaned) as T;
  return { data, source: "deepseek" };
}

function stripCodeFence(text: string): string {
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```[a-zA-Z]*\s*/, "").replace(/```\s*$/, "").trim();
  }
  return t;
}
