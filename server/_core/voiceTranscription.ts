/**
 * 语音转写层 —— OpenAI Whisper API 直连实现
 *
 * 已移除对 Manus Forge 内部服务的所有依赖，改为直连 OpenAI 官方 Whisper API。
 * 也兼容任何 OpenAI API 兼容的语音转写服务（如 Groq、本地部署的 Whisper 等）。
 *
 * 所需环境变量（在 .env 中配置）：
 *   OPENAI_API_KEY          - OpenAI API 密钥（必填，用于语音转写功能）
 *   OPENAI_WHISPER_BASE_URL - （可选）自定义 API 端点，默认为 OpenAI 官方地址
 *                             例如使用 Groq: https://api.groq.com/openai/v1
 *
 * 前端使用示例：
 * ```tsx
 * const transcribeMutation = trpc.voice.transcribe.useMutation({
 *   onSuccess: (data) => {
 *     console.log(data.text);     // 完整转写文本
 *     console.log(data.language); // 检测到的语言
 *     console.log(data.segments); // 带时间戳的分段
 *   }
 * });
 *
 * transcribeMutation.mutate({
 *   audioUrl: uploadedAudioUrl,
 *   language: 'zh', // 可选，指定语言
 * });
 * ```
 */

export type TranscribeOptions = {
  audioUrl: string;  // 音频文件 URL（需后端可访问）
  language?: string; // 可选：语言代码，例如 "zh"、"en"
  prompt?: string;   // 可选：自定义提示词，有助于提升识别准确率
};

export type WhisperSegment = {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
};

export type WhisperResponse = {
  task: "transcribe";
  language: string;
  duration: number;
  text: string;
  segments: WhisperSegment[];
};

export type TranscriptionResponse = WhisperResponse;

export type TranscriptionError = {
  error: string;
  code: "FILE_TOO_LARGE" | "INVALID_FORMAT" | "TRANSCRIPTION_FAILED" | "UPLOAD_FAILED" | "SERVICE_ERROR";
  details?: string;
};

/**
 * 使用 OpenAI Whisper API 将音频转写为文字
 */
export async function transcribeAudio(
  options: TranscribeOptions
): Promise<TranscriptionResponse | TranscriptionError> {
  try {
    // 检查 API Key 配置
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        error: "语音转写服务未配置",
        code: "SERVICE_ERROR",
        details: "请在 .env 中设置 OPENAI_API_KEY",
      };
    }

    const baseUrl = (
      process.env.OPENAI_WHISPER_BASE_URL?.replace(/\/+$/, "") ||
      "https://api.openai.com/v1"
    );

    // 从 URL 下载音频文件
    let audioBuffer: Buffer;
    let mimeType: string;
    try {
      const response = await fetch(options.audioUrl);
      if (!response.ok) {
        return {
          error: "无法下载音频文件",
          code: "INVALID_FORMAT",
          details: `HTTP ${response.status}: ${response.statusText}`,
        };
      }
      audioBuffer = Buffer.from(await response.arrayBuffer());
      mimeType = response.headers.get("content-type") || "audio/mpeg";

      // Whisper API 限制 25MB
      const sizeMB = audioBuffer.length / (1024 * 1024);
      if (sizeMB > 25) {
        return {
          error: "音频文件超过大小限制",
          code: "FILE_TOO_LARGE",
          details: `文件大小 ${sizeMB.toFixed(2)}MB，最大允许 25MB`,
        };
      }
    } catch (error) {
      return {
        error: "获取音频文件失败",
        code: "SERVICE_ERROR",
        details: error instanceof Error ? error.message : "未知错误",
      };
    }

    // 构建 multipart/form-data 请求
    const formData = new FormData();
    const filename = `audio.${getFileExtension(mimeType)}`;
    const audioBlob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
    formData.append("file", audioBlob, filename);
    formData.append("model", "whisper-1");
    formData.append("response_format", "verbose_json");

    if (options.language) {
      formData.append("language", options.language);
    }

    const prompt =
      options.prompt ||
      (options.language === "zh"
        ? "以下是一段中文心理咨询录音，请准确转写。"
        : "Transcribe the following audio accurately.");
    formData.append("prompt", prompt);

    // 调用 OpenAI Whisper API
    const response = await fetch(`${baseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return {
        error: "语音转写请求失败",
        code: "TRANSCRIPTION_FAILED",
        details: `${response.status} ${response.statusText}${errorText ? `: ${errorText}` : ""}`,
      };
    }

    const whisperResponse = (await response.json()) as WhisperResponse;

    if (!whisperResponse.text || typeof whisperResponse.text !== "string") {
      return {
        error: "转写服务返回了无效的响应格式",
        code: "SERVICE_ERROR",
        details: JSON.stringify(whisperResponse),
      };
    }

    return whisperResponse;
  } catch (error) {
    return {
      error: "语音转写失败",
      code: "SERVICE_ERROR",
      details: error instanceof Error ? error.message : "发生了意外错误",
    };
  }
}

function getFileExtension(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    "audio/webm": "webm",
    "audio/mp3": "mp3",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/wave": "wav",
    "audio/ogg": "ogg",
    "audio/m4a": "m4a",
    "audio/mp4": "m4a",
  };
  return mimeToExt[mimeType] || "audio";
}

function getLanguageName(langCode: string): string {
  const langMap: Record<string, string> = {
    en: "English", es: "Spanish", fr: "French", de: "German",
    it: "Italian", pt: "Portuguese", ru: "Russian", ja: "Japanese",
    ko: "Korean", zh: "Chinese", ar: "Arabic", hi: "Hindi",
  };
  return langMap[langCode] || langCode;
}
