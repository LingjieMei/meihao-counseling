import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { sdk } from "./_core/sdk";
import {
  createAnnotation, createCase, createSession,
  deleteAnnotation, deleteCase, deleteSession,
  getAnnotationsByCaseId, getAnnotationsBySessionId,
  getCaseById, getCasesByFilter,
  getDashboardStats, getAllCounselors,
  getSessionById, getSessionsByCaseId,
  markAnnotationRead, updateCase, updateSession,
  loginWithPhone, createCounselorAccount, changePassword,
  getUserById,
  getCounselorGrowth, upsertCounselorGrowth, calculateCounselorRadar,
  createTrainingRecord, getTrainingRecordsByCounselor, deleteTrainingRecord,
} from "./db";
import { voiceRouter } from "./voice";
import { supervisionRouter } from "./supervisionRouter";

// ─── Auth Router ──────────────────────────────────────────────────────────────

const authRouter = router({
  me: publicProcedure.query(opts => opts.ctx.user),

  // 手机号+密码登录
  loginWithPhone: publicProcedure
    .input(z.object({
      phone: z.string().min(11).max(20),
      password: z.string().min(4),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await loginWithPhone(input.phone, input.password);
      if (!user) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: '手机号或密码错误' });
      }
      // 创建JWT session
      const openId = user.openId;
      const token = await sdk.createSessionToken(openId, { name: user.name ?? '' });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, {
        ...cookieOptions,
        maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
      });
      return { success: true, user };
    }),

  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true } as const;
  }),
});

// ─── Cases Router ─────────────────────────────────────────────────────────────

const casesRouter = router({
  list: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      personalityType: z.string().optional(),
      status: z.string().optional(),
      ladderLevel: z.number().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const isAdmin = ctx.user.role === 'admin';
      return getCasesByFilter({
        counselorId: ctx.user.id,
        isAdmin,
        search: input?.search,
        personalityType: input?.personalityType,
        status: input?.status,
        ladderLevel: input?.ladderLevel,
      });
    }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const c = await getCaseById(input.id);
      if (!c) throw new TRPCError({ code: 'NOT_FOUND' });
      if (ctx.user.role !== 'admin' && c.counselorId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      return c;
    }),

  create: protectedProcedure
    .input(z.object({
      childName: z.string().min(1),
      age: z.number().optional(),
      grade: z.string().optional(),
      gender: z.enum(['male', 'female', 'other']).optional(),
      personalityType: z.enum(['self_esteem', 'relational', 'transactional', 'self_driven']).optional(),
      initialAssessment: z.string().optional(),
      familySystem: z.any().optional(),
      initialLadderLevel: z.number().min(0).max(7).optional(),
      counselorId: z.number().optional(),
      notes: z.string().optional(),
      psychologicalAssessment: z.any().optional(),
      transcriptKey: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const counselorId = input.counselorId ?? ctx.user.id;
      const result = await createCase({
        ...input,
        counselorId,
        currentLadderLevel: input.initialLadderLevel ?? 0,
      });
      return result;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      childName: z.string().optional(),
      age: z.number().optional(),
      grade: z.string().optional(),
      gender: z.enum(['male', 'female', 'other']).optional(),
      personalityType: z.enum(['self_esteem', 'relational', 'transactional', 'self_driven']).optional(),
      initialAssessment: z.string().optional(),
      familySystem: z.any().optional(),
      currentLadderLevel: z.number().min(0).max(7).optional(),
      status: z.enum(['active', 'completed', 'paused']).optional(),
      notes: z.string().optional(),
      personalityProfile: z.any().optional(),
      psychologicalAssessment: z.any().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const c = await getCaseById(input.id);
      if (!c) throw new TRPCError({ code: 'NOT_FOUND' });
      if (ctx.user.role !== 'admin' && c.counselorId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      const { id, ...data } = input;
      await updateCase(id, data);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      await deleteCase(input.id);
      return { success: true };
    }),
});

// ─── Sessions Router ──────────────────────────────────────────────────────────

const sessionsRouter = router({
  listByCase: protectedProcedure
    .input(z.object({ caseId: z.number() }))
    .query(async ({ ctx, input }) => {
      const c = await getCaseById(input.caseId);
      if (!c) throw new TRPCError({ code: 'NOT_FOUND' });
      if (ctx.user.role !== 'admin' && c.counselorId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      return getSessionsByCaseId(input.caseId);
    }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const s = await getSessionById(input.id);
      if (!s) throw new TRPCError({ code: 'NOT_FOUND' });
      const c = await getCaseById(s.caseId);
      if (!c) throw new TRPCError({ code: 'NOT_FOUND' });
      if (ctx.user.role !== 'admin' && c.counselorId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      return s;
    }),

  create: protectedProcedure
    .input(z.object({
      caseId: z.number(),
      sessionDate: z.date(),
      emotionalState: z.string().optional(),
      emotionalTone: z.enum(['positive', 'neutral', 'negative', 'mixed']).optional(),
      parentFeedback: z.string().optional(),
      interventionStrategies: z.string().optional(),
      ladderLevel: z.number().min(0).max(7),
      dimensionScores: z.any().optional(),
      factors: z.any().optional(),
      keyEvents: z.string().optional(),
      emotionalShifts: z.string().optional(),
      strategyEvaluation: z.string().optional(),
      nextSteps: z.string().optional(),
      srsMethod: z.number().min(0).max(7).optional(),
      srsGoals: z.number().min(0).max(7).optional(),
      srsContent: z.number().min(0).max(7).optional(),
      srsOverall: z.number().min(0).max(7).optional(),
      additionalNotes: z.string().optional(),
      transcriptKey: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const c = await getCaseById(input.caseId);
      if (!c) throw new TRPCError({ code: 'NOT_FOUND' });
      if (ctx.user.role !== 'admin' && c.counselorId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      const existingSessions = await getSessionsByCaseId(input.caseId);
      const sessionNumber = existingSessions.length + 1;
      await createSession({ ...input, counselorId: ctx.user.id, sessionNumber });
      // Update case current ladder level
      await updateCase(input.caseId, { currentLadderLevel: input.ladderLevel });
      return { success: true };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      sessionDate: z.date().optional(),
      emotionalState: z.string().optional(),
      emotionalTone: z.enum(['positive', 'neutral', 'negative', 'mixed']).optional(),
      parentFeedback: z.string().optional(),
      interventionStrategies: z.string().optional(),
      ladderLevel: z.number().min(0).max(7).optional(),
      dimensionScores: z.any().optional(),
      factors: z.any().optional(),
      keyEvents: z.string().optional(),
      emotionalShifts: z.string().optional(),
      strategyEvaluation: z.string().optional(),
      nextSteps: z.string().optional(),
      srsMethod: z.number().min(0).max(7).optional(),
      srsGoals: z.number().min(0).max(7).optional(),
      srsContent: z.number().min(0).max(7).optional(),
      srsOverall: z.number().min(0).max(7).optional(),
      additionalNotes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const s = await getSessionById(input.id);
      if (!s) throw new TRPCError({ code: 'NOT_FOUND' });
      const c = await getCaseById(s.caseId);
      if (!c) throw new TRPCError({ code: 'NOT_FOUND' });
      if (ctx.user.role !== 'admin' && c.counselorId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      const { id, ...data } = input;
      await updateSession(id, data);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const s = await getSessionById(input.id);
      if (!s) throw new TRPCError({ code: 'NOT_FOUND' });
      const c = await getCaseById(s.caseId);
      if (!c) throw new TRPCError({ code: 'NOT_FOUND' });
      if (ctx.user.role !== 'admin' && c.counselorId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      await deleteSession(input.id);
      return { success: true };
    }),
});

// ─── Annotations Router ───────────────────────────────────────────────────────

const annotationsRouter = router({
  listBySession: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ ctx, input }) => {
      return getAnnotationsBySessionId(input.sessionId);
    }),

  listByCase: protectedProcedure
    .input(z.object({ caseId: z.number() }))
    .query(async ({ ctx, input }) => {
      return getAnnotationsByCaseId(input.caseId);
    }),

  create: protectedProcedure
    .input(z.object({
      sessionId: z.number(),
      caseId: z.number(),
      content: z.string().min(1),
      annotationType: z.enum(['direction', 'caution', 'strategy', 'praise', 'question']).default('direction'),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: '只有督导可以添加批注' });
      await createAnnotation({ ...input, supervisorId: ctx.user.id });
      return { success: true };
    }),

  markRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await markAnnotationRead(input.id);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      await deleteAnnotation(input.id);
      return { success: true };
    }),
});

// ─── Stats Router ─────────────────────────────────────────────────────────────

const statsRouter = router({
  dashboard: protectedProcedure.query(async ({ ctx }) => {
    const isAdmin = ctx.user.role === 'admin';
    return getDashboardStats(isAdmin, ctx.user.id);
  }),
  counselors: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
    return getAllCounselors();
  }),
});

// ─── Counselor Management Router ──────────────────────────────────────────────

const counselorRouter = router({
  // 督导创建咨询师账号
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      phone: z.string().min(11).max(20),
      password: z.string().min(6),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: '只有督导可以创建咨询师账号' });
      const user = await createCounselorAccount(input);
      return { success: true, user };
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
    return getAllCounselors();
  }),

  changePassword: protectedProcedure
    .input(z.object({
      newPassword: z.string().min(6),
      targetUserId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const targetId = input.targetUserId ?? ctx.user.id;
      // 只有管理员可以修改他人密码
      if (targetId !== ctx.user.id && ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      await changePassword(targetId, input.newPassword);
      return { success: true };
    }),
});

// ─── Growth Router ────────────────────────────────────────────────────────────

const growthRouter = router({
  // 获取咨询师成长数据
  get: protectedProcedure
    .input(z.object({ counselorId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const counselorId = input.counselorId ?? ctx.user.id;
      if (counselorId !== ctx.user.id && ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      const growth = await getCounselorGrowth(counselorId);
      const radar = await calculateCounselorRadar(counselorId);
      return { growth, radar };
    }),

  // 更新风格四象限
  updateStyle: protectedProcedure
    .input(z.object({
      styleQuadrant: z.enum(['guardian', 'lighthouse', 'mirror', 'navigator']),
      counselorId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const counselorId = input.counselorId ?? ctx.user.id;
      if (counselorId !== ctx.user.id && ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      await upsertCounselorGrowth(counselorId, { styleQuadrant: input.styleQuadrant });
      return { success: true };
    }),

  // 培训记录
  addTraining: protectedProcedure
    .input(z.object({
      trainingType: z.enum(['book', 'movie', 'experience', 'course']),
      title: z.string().min(1),
      description: z.string().optional(),
      insights: z.string().optional(),
      completedAt: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await createTrainingRecord({
        counselorId: ctx.user.id,
        ...input,
      });
      return { success: true };
    }),

  listTraining: protectedProcedure
    .input(z.object({ counselorId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const counselorId = input.counselorId ?? ctx.user.id;
      if (counselorId !== ctx.user.id && ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      return getTrainingRecordsByCounselor(counselorId);
    }),

  deleteTraining: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteTrainingRecord(input.id);
      return { success: true };
    }),
});

// ─── App Router ───────────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  cases: casesRouter,
  sessions: sessionsRouter,
  annotations: annotationsRouter,
  stats: statsRouter,
  counselor: counselorRouter,
  growth: growthRouter,
  voice: voiceRouter,
  supervision: supervisionRouter,
});

export type AppRouter = typeof appRouter;
