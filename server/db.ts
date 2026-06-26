import { eq, and, desc, like, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users, cases, sessions, annotations,
  counselorGrowth, trainingRecords, InsertTrainingRecord,
  aiSupervisions, InsertAiSupervision
} from "../drizzle/schema";
import { ENV } from './_core/env';
import bcrypt from 'bcryptjs';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ========== User Helpers ==========

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod", "phone"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.passwordHash !== undefined) { values.passwordHash = user.passwordHash; updateSet.passwordHash = user.passwordHash; }
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    // 角色由业务逻辑或管理员手动设置，不再依赖 Manus ownerOpenId 自动提权
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByPhone(phone: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// 手机号+密码登录
export async function loginWithPhone(phone: string, password: string) {
  const user = await getUserByPhone(phone);
  if (!user || !user.passwordHash) return null;
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;
  return user;
}

// 创建咨询师账号（督导操作）
export async function createCounselorAccount(data: {
  name: string;
  phone: string;
  password: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // 检查手机号是否已存在
  const existing = await getUserByPhone(data.phone);
  if (existing) throw new Error("该手机号已注册");
  const passwordHash = await bcrypt.hash(data.password, 10);
  const openId = `phone_${data.phone}`;
  await db.insert(users).values({
    openId,
    name: data.name,
    phone: data.phone,
    passwordHash,
    loginMethod: 'phone',
    role: 'user',
    lastSignedIn: new Date(),
  });
  return getUserByPhone(data.phone);
}

// 修改密码
export async function changePassword(userId: number, newPassword: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
}

export async function getAllCounselors() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: users.id, name: users.name, email: users.email, phone: users.phone, role: users.role, createdAt: users.createdAt }).from(users);
}

// ========== Case Helpers ==========

export async function createCase(data: {
  childName: string;
  age?: number;
  grade?: string;
  gender?: 'male' | 'female' | 'other';
  personalityType?: 'self_esteem' | 'relational' | 'transactional' | 'self_driven';
  initialAssessment?: string;
  familySystem?: unknown;
  initialLadderLevel?: number;
  currentLadderLevel?: number;
  counselorId: number;
  notes?: string;
  psychologicalAssessment?: unknown;
  transcriptKey?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(cases).values({
    childName: data.childName,
    age: data.age,
    grade: data.grade,
    gender: data.gender,
    personalityType: data.personalityType,
    initialAssessment: data.initialAssessment,
    familySystem: data.familySystem,
    initialLadderLevel: data.initialLadderLevel ?? 0,
    currentLadderLevel: data.currentLadderLevel ?? data.initialLadderLevel ?? 0,
    counselorId: data.counselorId,
    status: 'active',
    notes: data.notes,
    psychologicalAssessment: data.psychologicalAssessment,
    transcriptKey: data.transcriptKey,
  });
}

export async function getCaseById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(cases).where(eq(cases.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getCasesByFilter(filters: {
  counselorId?: number;
  isAdmin?: boolean;
  search?: string;
  personalityType?: string;
  status?: string;
  ladderLevel?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  let query = db.select().from(cases).$dynamic();
  const conditions = [];
  if (!filters.isAdmin && filters.counselorId) {
    conditions.push(eq(cases.counselorId, filters.counselorId));
  }
  if (filters.search) conditions.push(like(cases.childName, `%${filters.search}%`));
  if (filters.personalityType && filters.personalityType !== 'all') {
    conditions.push(eq(cases.personalityType, filters.personalityType as any));
  }
  if (filters.status && filters.status !== 'all') {
    conditions.push(eq(cases.status, filters.status as any));
  }
  if (filters.ladderLevel !== undefined) {
    conditions.push(eq(cases.currentLadderLevel, filters.ladderLevel));
  }
  if (conditions.length > 0) query = query.where(and(...conditions));
  return query.orderBy(desc(cases.updatedAt));
}

export async function updateCase(id: number, data: Partial<{
  childName: string;
  age: number;
  grade: string;
  gender: 'male' | 'female' | 'other';
  personalityType: 'self_esteem' | 'relational' | 'transactional' | 'self_driven';
  initialAssessment: string;
  familySystem: unknown;
  currentLadderLevel: number;
  status: 'active' | 'completed' | 'paused';
  notes: string;
  personalityProfile: unknown;
  psychologicalAssessment: unknown;
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(cases).set(data as any).where(eq(cases.id, id));
}

export async function deleteCase(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(cases).where(eq(cases.id, id));
}

// ========== Session Helpers ==========

export async function createSession(data: {
  caseId: number;
  counselorId: number;
  sessionNumber: number;
  sessionDate: Date;
  emotionalState?: string;
  emotionalTone?: 'positive' | 'neutral' | 'negative' | 'mixed';
  parentFeedback?: string;
  interventionStrategies?: string;
  ladderLevel: number;
  dimensionScores?: unknown;
  factors?: unknown;
  keyEvents?: string;
  emotionalShifts?: string;
  strategyEvaluation?: string;
  nextSteps?: string;
  srsMethod?: number;
  srsGoals?: number;
  srsContent?: number;
  srsOverall?: number;
  additionalNotes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(sessions).values(data);
}

export async function getSessionById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getSessionsByCaseId(caseId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(sessions).where(eq(sessions.caseId, caseId)).orderBy(sessions.sessionNumber);
}

export async function updateSession(id: number, data: Partial<{
  sessionDate: Date;
  emotionalState: string;
  emotionalTone: 'positive' | 'neutral' | 'negative' | 'mixed';
  parentFeedback: string;
  interventionStrategies: string;
  ladderLevel: number;
  dimensionScores: unknown;
  factors: unknown;
  keyEvents: string;
  emotionalShifts: string;
  strategyEvaluation: string;
  nextSteps: string;
  srsMethod: number;
  srsGoals: number;
  srsContent: number;
  srsOverall: number;
  additionalNotes: string;
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(sessions).set(data as any).where(eq(sessions.id, id));
}

export async function deleteSession(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(sessions).where(eq(sessions.id, id));
}

// ========== Annotation Helpers ==========

export async function createAnnotation(data: {
  sessionId: number;
  caseId: number;
  supervisorId: number;
  content: string;
  annotationType: 'direction' | 'caution' | 'strategy' | 'praise' | 'question';
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(annotations).values({ ...data, isRead: 0 });
}

export async function getAnnotationsByCaseId(caseId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(annotations).where(eq(annotations.caseId, caseId)).orderBy(desc(annotations.createdAt));
}

export async function getAnnotationsBySessionId(sessionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(annotations).where(eq(annotations.sessionId, sessionId)).orderBy(desc(annotations.createdAt));
}

export async function markAnnotationRead(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(annotations).set({ isRead: 1 }).where(eq(annotations.id, id));
}

export async function deleteAnnotation(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(annotations).where(eq(annotations.id, id));
}

// ========== Counselor Growth Helpers ==========

export async function getCounselorGrowth(counselorId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(counselorGrowth).where(eq(counselorGrowth.counselorId, counselorId)).limit(1);
  return result[0] ?? null;
}

export async function upsertCounselorGrowth(counselorId: number, data: {
  styleQuadrant?: 'guardian' | 'lighthouse' | 'mirror' | 'navigator';
  radarData?: unknown;
  totalConsultHours?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(counselorGrowth).values({ counselorId, ...data }).onDuplicateKeyUpdate({ set: data as any });
}

// 计算咨询师五维雷达图数据（基于系统数据自动计算）
export async function calculateCounselorRadar(counselorId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 获取该咨询师的所有案例
  const myCases = await db.select().from(cases).where(eq(cases.counselorId, counselorId));
  const caseIds = myCases.map(c => c.id);

  if (caseIds.length === 0) {
    return { effect: 0, retention: 0, alliance: 0, productivity: 0, growth: 0 };
  }

  // 获取所有咨询记录
  const allSessions = caseIds.length > 0
    ? await db.select().from(sessions).where(
        caseIds.length === 1
          ? eq(sessions.caseId, caseIds[0])
          : eq(sessions.counselorId, counselorId)
      )
    : [];

  // 1. 效果维度（effect）：案例改善率（当前阶梯 > 初始阶梯的比例）
  const improved = myCases.filter(c => (c.currentLadderLevel ?? 0) > (c.initialLadderLevel ?? 0)).length;
  const effect = myCases.length > 0 ? Math.round((improved / myCases.length) * 100) : 0;

  // 2. 留存维度（retention）：完成案例比例（completed/total）
  const completed = myCases.filter(c => c.status === 'completed').length;
  const retention = myCases.length > 0 ? Math.round((completed / myCases.length) * 100) : 0;

  // 3. 联盟维度（alliance）：SRS平均分（0-28分，转换为0-100）
  const sessionsWithSrs = allSessions.filter(s => s.srsOverall !== null);
  const avgSrs = sessionsWithSrs.length > 0
    ? sessionsWithSrs.reduce((sum, s) => sum + (s.srsOverall ?? 0), 0) / sessionsWithSrs.length
    : 0;
  const alliance = Math.round((avgSrs / 7) * 100);

  // 4. 产能维度（productivity）：平均每月咨询次数（相对值）
  const totalSessions = allSessions.length;
  const productivity = Math.min(100, Math.round((totalSessions / Math.max(myCases.length, 1)) * 10));

  // 5. 成长维度（growth）：培训记录数量（每条记录+10分，上限100）
  const trainingData = await db.select({ cnt: count() }).from(trainingRecords).where(eq(trainingRecords.counselorId, counselorId));
  const trainingCount = trainingData[0]?.cnt ?? 0;
  const growth = Math.min(100, trainingCount * 10);

  return { effect, retention, alliance, productivity, growth };
}

// ========== Training Record Helpers ==========

export async function createTrainingRecord(data: InsertTrainingRecord) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(trainingRecords).values(data);
}

export async function getTrainingRecordsByCounselor(counselorId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(trainingRecords).where(eq(trainingRecords.counselorId, counselorId)).orderBy(desc(trainingRecords.createdAt));
}

export async function deleteTrainingRecord(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(trainingRecords).where(eq(trainingRecords.id, id));
}

// ========== Stats Helpers ==========

export async function getDashboardStats(isAdmin: boolean, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const allCases = isAdmin
    ? await db.select().from(cases)
    : await db.select().from(cases).where(eq(cases.counselorId, userId));

  const total = allCases.length;
  const active = allCases.filter(c => c.status === 'active').length;

  const byType = {
    self_esteem: allCases.filter(c => c.personalityType === 'self_esteem').length,
    relational: allCases.filter(c => c.personalityType === 'relational').length,
    transactional: allCases.filter(c => c.personalityType === 'transactional').length,
    self_driven: allCases.filter(c => c.personalityType === 'self_driven').length,
  };

  const sessionsData = await db.select({ cnt: count() }).from(sessions);
  const totalSessions = sessionsData[0]?.cnt ?? 0;
  const avgSessions = total > 0 ? Math.round(totalSessions / total) : 0;

  const improved = allCases.filter(c =>
    (c.currentLadderLevel ?? 0) > (c.initialLadderLevel ?? 0)
  ).length;
  const improvementRate = total > 0 ? Math.round((improved / total) * 100) : 0;

  const unreadData = await db.select({ cnt: count() }).from(annotations).where(eq(annotations.isRead, 0));
  const unreadAnnotations = unreadData[0]?.cnt ?? 0;

  return { total, active, byType, totalSessions, avgSessions, improvementRate, unreadAnnotations };
}


// ========== AI Supervision Helpers ==========

/** 保存一条 AI 督导记录 */
export async function createAiSupervision(data: InsertAiSupervision) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(aiSupervisions).values(data);
  return result;
}

/** 获取某案例的全部 AI 督导记录（按时间倒序） */
export async function getAiSupervisionsByCaseId(caseId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(aiSupervisions)
    .where(eq(aiSupervisions.caseId, caseId))
    .orderBy(desc(aiSupervisions.createdAt));
}

/** 获取某次咨询的 AI 督导记录（按时间倒序） */
export async function getAiSupervisionsBySessionId(sessionId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(aiSupervisions)
    .where(eq(aiSupervisions.sessionId, sessionId))
    .orderBy(desc(aiSupervisions.createdAt));
}

/** 获取单条 AI 督导记录 */
export async function getAiSupervisionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(aiSupervisions)
    .where(eq(aiSupervisions.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/** 删除一条 AI 督导记录 */
export async function deleteAiSupervision(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(aiSupervisions).where(eq(aiSupervisions.id, id));
}
