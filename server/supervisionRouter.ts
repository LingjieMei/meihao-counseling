import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import {
  getCaseById, getSessionById, getSessionsByCaseId,
  createAiSupervision, getAiSupervisionsByCaseId,
  getAiSupervisionsBySessionId, getAiSupervisionById, deleteAiSupervision,
} from "./db";
import { superviseCase, superviseSession } from "./supervision";

// 权限校验：非管理员只能访问自己负责的案例
function assertCaseAccess(c: any, user: { id: number; role: string }) {
  if (!c) throw new TRPCError({ code: "NOT_FOUND", message: "案例不存在" });
  if (user.role !== "admin" && c.counselorId !== user.id) {
    throw new TRPCError({ code: "FORBIDDEN", message: "无权访问该案例" });
  }
}

export const supervisionRouter = router({
  // 案例级 AI 督导：基于案例 + 全部历史咨询记录，生成并保存
  superviseCase: protectedProcedure
    .input(z.object({ caseId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const c = await getCaseById(input.caseId);
      assertCaseAccess(c, ctx.user);

      const sessionRows = await getSessionsByCaseId(input.caseId);
      const { result, source } = await superviseCase(c, sessionRows);

      await createAiSupervision({
        caseId: input.caseId,
        sessionId: null,
        scope: "case",
        counselorId: ctx.user.id,
        axisObstacleSource: result.axisObstacleSource ?? undefined,
        axisObstacleSourceDetail: result.axisObstacleSourceDetail,
        axisNeedStructure: result.axisNeedStructure,
        axisEnergyLevel: result.axisEnergyLevel ?? undefined,
        axisEnergyDetail: result.axisEnergyDetail,
        recommendedTechniques: result.recommendedTechniques,
        supervisionAdvice: result.supervisionAdvice,
        nextSessionSuggestion: result.nextSessionSuggestion,
        riskAlert: result.riskAlert,
        rawResult: result,
        modelSource: source,
      });

      return { ...result, modelSource: source };
    }),

  // 会话级 AI 督导：基于案例背景 + 单次咨询记录，生成并保存
  superviseSession: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const s = await getSessionById(input.sessionId);
      if (!s) throw new TRPCError({ code: "NOT_FOUND", message: "咨询记录不存在" });
      const c = await getCaseById(s.caseId);
      assertCaseAccess(c, ctx.user);

      const { result, source } = await superviseSession(c, s);

      await createAiSupervision({
        caseId: s.caseId,
        sessionId: input.sessionId,
        scope: "session",
        counselorId: ctx.user.id,
        axisObstacleSource: result.axisObstacleSource ?? undefined,
        axisObstacleSourceDetail: result.axisObstacleSourceDetail,
        axisNeedStructure: result.axisNeedStructure,
        axisEnergyLevel: result.axisEnergyLevel ?? undefined,
        axisEnergyDetail: result.axisEnergyDetail,
        recommendedTechniques: result.recommendedTechniques,
        supervisionAdvice: result.supervisionAdvice,
        nextSessionSuggestion: result.nextSessionSuggestion,
        riskAlert: result.riskAlert,
        rawResult: result,
        modelSource: source,
      });

      return { ...result, modelSource: source };
    }),

  // 历史记录：某案例的全部 AI 督导记录
  listByCase: protectedProcedure
    .input(z.object({ caseId: z.number() }))
    .query(async ({ ctx, input }) => {
      const c = await getCaseById(input.caseId);
      assertCaseAccess(c, ctx.user);
      return getAiSupervisionsByCaseId(input.caseId);
    }),

  // 历史记录：某次咨询的 AI 督导记录
  listBySession: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ ctx, input }) => {
      const s = await getSessionById(input.sessionId);
      if (!s) throw new TRPCError({ code: "NOT_FOUND" });
      const c = await getCaseById(s.caseId);
      assertCaseAccess(c, ctx.user);
      return getAiSupervisionsBySessionId(input.sessionId);
    }),

  // 删除一条 AI 督导记录
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const record = await getAiSupervisionById(input.id);
      if (!record) throw new TRPCError({ code: "NOT_FOUND" });
      const c = await getCaseById(record.caseId);
      assertCaseAccess(c, ctx.user);
      await deleteAiSupervision(input.id);
      return { success: true };
    }),
});
