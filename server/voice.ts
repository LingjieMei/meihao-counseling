import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { transcribeAudio } from "./_core/voiceTranscription";
import { TRPCError } from "@trpc/server";
import {
  ANALYSIS_SYSTEM_PROMPT,
  ANALYSIS_USER_PROMPT_TEMPLATE,
  postProcessAnalysisResult,
  CASE_ANALYSIS_SYSTEM_PROMPT,
  CASE_ANALYSIS_USER_PROMPT_TEMPLATE,
  postProcessCaseAnalysisResult,
} from "./prompts";
import { storagePut } from "./storage";
import { invokeDeepSeekJSON } from "./deepseek";

// ── 会话分析的 JSON 字段约束（注入 prompt，因 DeepSeek 用 json_object 模式） ──
export const SESSION_JSON_SPEC = `
请严格输出如下结构的 JSON 对象（不要包含任何额外文字、不要使用 markdown 代码块）：
{
  "emotionalState": "字符串，孩子情绪状态描述",
  "emotionalTone": "枚举值，必须是 positive / neutral / negative / mixed 之一",
  "ladderLevel": 0到7之间的整数,
  "keyEvents": "字符串，关键事件",
  "emotionalShifts": "字符串，情绪变化",
  "strategyEvaluation": "字符串，策略评估",
  "nextSteps": "字符串，下次计划",
  "dimensionScores": {
    "selfAwareness": { "自尊": 1到5整数, "自信": 1到5整数, "自驱力": 1到5整数 },
    "socialFunctioning": { "情绪成熟度": 1到5整数, "换位思考": 1到5整数, "规则适应": 1到5整数 },
    "relationalSelf": { "被爱感": 1到5整数, "归属感": 1到5整数, "亲子关系质量": 1到5整数 },
    "executiveSelf": { "执行力": 1到5整数, "计划性": 1到5整数, "时间管理": 1到5整数 }
  }
}
其中 emotionalState、emotionalTone、ladderLevel、keyEvents、emotionalShifts、strategyEvaluation、nextSteps 为必填字段，dimensionScores 可选。`;

// ── 案例建档解析的 JSON 字段约束 ──
export const CASE_JSON_SPEC = `
请严格输出如下结构的 JSON 对象（不要包含任何额外文字、不要使用 markdown 代码块）：
{
  "childName": "字符串，孩子姓名，无法确定则空字符串",
  "age": 整数，未提及则 0,
  "grade": "字符串，年级，未提及则空字符串",
  "gender": "枚举值，必须是 male / female / other 之一",
  "personalityType": "枚举值，必须是 self_esteem / relational / transactional / self_driven 之一",
  "initialLadderLevel": 0到7之间的整数,
  "initialAssessment": "字符串，初诊评估摘要",
  "familySystem": {
    "internal": { "childIssues": "字符串", "parentIssues": "字符串", "parentStrengths": "字符串" },
    "external": { "schoolIssues": "字符串", "peerIssues": "字符串" },
    "dynamics": { "mainConflict": "字符串", "parentChildRelation": "字符串" }
  }
}
其中 childName、age、grade、gender、personalityType、initialLadderLevel、initialAssessment 为必填字段。`;

export async function analyzeSessionText(text: string) {
  const userPrompt = ANALYSIS_USER_PROMPT_TEMPLATE(text);
  const { data } = await invokeDeepSeekJSON({
    messages: [
      { role: "system", content: ANALYSIS_SYSTEM_PROMPT + "\n\n" + SESSION_JSON_SPEC },
      { role: "user", content: userPrompt },
    ],
    maxTokens: 2000,
    temperature: 0.3,
  });
  return postProcessAnalysisResult(data);
}

export async function analyzeCaseText(text: string) {
  const userPrompt = CASE_ANALYSIS_USER_PROMPT_TEMPLATE(text);
  const { data } = await invokeDeepSeekJSON({
    messages: [
      { role: "system", content: CASE_ANALYSIS_SYSTEM_PROMPT + "\n\n" + CASE_JSON_SPEC },
      { role: "user", content: userPrompt },
    ],
    maxTokens: 2000,
    temperature: 0.3,
  });
  return postProcessCaseAnalysisResult(data);
}

export const voiceRouter = router({
  // 分析文本记录（如腾讯会议逐字稿文本）—— DeepSeek 直连
  analyzeTranscript: protectedProcedure
    .input(z.object({
      text: z.string(),
      counselingType: z.enum([
        'academicAnxiety', 'socialDifficulty', 'emotionalManagement',
        'familyRelationship', 'selfAwareness', 'general',
      ]).optional().default('general'),
    }))
    .mutation(async ({ input }) => {
      try {
        return await analyzeSessionText(input.text);
      } catch (error) {
        console.error("DeepSeek 会话分析失败:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "分析咨询记录失败，请稍后重试" });
      }
    }),

  // 上传逐字稿到 S3 并分析（存储 + DeepSeek 解析）
  uploadAndAnalyzeTranscript: protectedProcedure
    .input(z.object({
      text: z.string().min(1, "逐字稿内容不能为空"),
      fileName: z.string().optional().default("transcript.txt"),
      counselingType: z.enum([
        'academicAnxiety', 'socialDifficulty', 'emotionalManagement',
        'familyRelationship', 'selfAwareness', 'general',
      ]).optional().default('general'),
    }))
    .mutation(async ({ ctx, input }) => {
      const { text, fileName } = input;

      // 1. 上传逐字稿文本到 S3
      const timestamp = Date.now();
      const storageKey = `transcripts/${ctx.user.id}/${timestamp}_${fileName}`;
      let transcriptKey: string | null = null;
      try {
        const { key } = await storagePut(storageKey, text, "text/plain; charset=utf-8");
        transcriptKey = key;
      } catch (storageError) {
        console.error("Failed to upload transcript to S3:", storageError);
      }

      // 2. DeepSeek 直连分析
      try {
        const processedResult = await analyzeSessionText(text);
        return { ...processedResult, transcriptKey };
      } catch (error) {
        console.error("DeepSeek 会话分析失败:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "分析咨询记录失败，请稍后重试" });
      }
    }),

  // 上传初诊逐字稿并解析为案例档案（存储 + DeepSeek 解析）
  uploadAndAnalyzeCaseTranscript: protectedProcedure
    .input(z.object({
      text: z.string().min(1, "逐字稿内容不能为空"),
      fileName: z.string().optional().default("case-transcript.txt"),
    }))
    .mutation(async ({ ctx, input }) => {
      const { text, fileName } = input;

      const timestamp = Date.now();
      const storageKey = `case-transcripts/${ctx.user.id}/${timestamp}_${fileName}`;
      let transcriptKey: string | null = null;
      try {
        const { key } = await storagePut(storageKey, text, "text/plain; charset=utf-8");
        transcriptKey = key;
      } catch (storageError) {
        console.error("Failed to upload case transcript to S3:", storageError);
      }

      try {
        const processedResult = await analyzeCaseText(text);
        return { ...processedResult, transcriptKey };
      } catch (error) {
        console.error("DeepSeek 案例解析失败:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "解析案例逐字稿失败，请稍后重试" });
      }
    }),

  // 转录并分析音频文件（音频转录走平台转录服务，分析部分走 DeepSeek）
  transcribeAndAnalyze: protectedProcedure
    .input(z.object({ audioUrl: z.string() }))
    .mutation(async ({ input }) => {
      const transcription = await transcribeAudio({ audioUrl: input.audioUrl });
      if ('error' in transcription) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `语音转录失败: ${transcription.error}` });
      }
      return {
        text: transcription.text,
        language: transcription.language,
        duration: transcription.duration,
      };
    }),
});
