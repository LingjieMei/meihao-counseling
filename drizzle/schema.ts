import {
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * 用户表（咨询师 + 督导）
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  // 手机号（用于手机号+密码登录）
  phone: varchar("phone", { length: 20 }),
  // 密码哈希（bcrypt）
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * 案例档案表
 */
export const cases = mysqlTable("cases", {
  id: int("id").autoincrement().primaryKey(),
  // 基本信息
  childName: varchar("childName", { length: 64 }).notNull(),
  age: int("age"),
  grade: varchar("grade", { length: 32 }),
  gender: mysqlEnum("gender", ["male", "female", "other"]),
  // 人格类型（4种严格执行）
  personalityType: mysqlEnum("personalityType", [
    "self_esteem",   // 自尊型
    "relational",    // 关系型
    "transactional", // 交换型
    "self_driven",   // 自驱型
  ]),
  // 初诊评估
  initialAssessment: text("initialAssessment"),
  // 家庭系统互动结构（JSON存储）
  familySystem: json("familySystem"),
  // 厌学行为阶梯初始等级 0-7
  initialLadderLevel: int("initialLadderLevel").default(0),
  // 当前行为阶梯等级
  currentLadderLevel: int("currentLadderLevel").default(0),
  // 负责咨询师
  counselorId: int("counselorId").notNull(),
  // 督导（创始人）
  supervisorId: int("supervisorId"),
  // 案例状态
  status: mysqlEnum("status", ["active", "completed", "paused"]).default("active").notNull(),
  // 个性化人格画像（JSON存储：核心特征、动力点、激励方式等）
  personalityProfile: json("personalityProfile"),
  // 四维心理特质评估（JSON存储）
  psychologicalAssessment: json("psychologicalAssessment"),
    // 备注
  notes: text("notes"),
  // 初诊逐字稿在 S3 的存储 key
  transcriptKey: varchar("transcriptKey", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Case = typeof cases.$inferSelect;
export type InsertCase = typeof cases.$inferInsert;

/**
 * 咨询记录表
 */
export const sessions = mysqlTable("sessions", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("caseId").notNull(),
  counselorId: int("counselorId").notNull(),
  sessionNumber: int("sessionNumber").notNull(),
  sessionDate: timestamp("sessionDate").notNull(),
  // 孩子情绪状态
  emotionalState: text("emotionalState"),
  // 情绪基调
  emotionalTone: mysqlEnum("emotionalTone", ["positive", "neutral", "negative", "mixed"]),
  // 家长反馈
  parentFeedback: text("parentFeedback"),
  // 使用的干预策略
  interventionStrategies: text("interventionStrategies"),
  // 行为阶梯等级 0-7
  ladderLevel: int("ladderLevel").notNull().default(0),
  // 四维心理特质本次评估（JSON存储）
  dimensionScores: json("dimensionScores"),
  // 正负因子记录（JSON存储，含3D散点图数据）
  factors: json("factors"),
  // 复盘四要素
  keyEvents: text("keyEvents"),
  emotionalShifts: text("emotionalShifts"),
  strategyEvaluation: text("strategyEvaluation"),
  nextSteps: text("nextSteps"),
  // SRS会谈满意度量表（每项0-7分，满分28）
  srsMethod: int("srsMethod"),
  srsGoals: int("srsGoals"),
  srsContent: int("srsContent"),
  srsOverall: int("srsOverall"),
  // 逐字稿存储 key（S3）
  transcriptKey: varchar("transcriptKey", { length: 500 }),
  // 其他备注
  additionalNotes: text("additionalNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Session = typeof sessions.$inferSelect;
export type InsertSession = typeof sessions.$inferInsert;

/**
 * 督导批注表
 */
export const annotations = mysqlTable("annotations", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  caseId: int("caseId").notNull(),
  supervisorId: int("supervisorId").notNull(),
  content: text("content").notNull(),
  annotationType: mysqlEnum("annotationType", [
    "direction",
    "caution",
    "strategy",
    "praise",
    "question",
  ]).default("direction").notNull(),
  isRead: int("isRead").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Annotation = typeof annotations.$inferSelect;
export type InsertAnnotation = typeof annotations.$inferInsert;

/**
 * 咨询师成长记录表（五维雷达图数据 + 风格四象限）
 */
export const counselorGrowth = mysqlTable("counselorGrowth", {
  id: int("id").autoincrement().primaryKey(),
  counselorId: int("counselorId").notNull().unique(),
  styleQuadrant: mysqlEnum("styleQuadrant", [
    "guardian",
    "lighthouse",
    "mirror",
    "navigator",
  ]),
  radarData: json("radarData"),
  totalConsultHours: int("totalConsultHours").default(0),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CounselorGrowth = typeof counselorGrowth.$inferSelect;

/**
 * 培训记录表（书籍/电影/个人经历/课程）
 */
export const trainingRecords = mysqlTable("trainingRecords", {
  id: int("id").autoincrement().primaryKey(),
  counselorId: int("counselorId").notNull(),
  trainingType: mysqlEnum("trainingType", [
    "book",
    "movie",
    "experience",
    "course",
  ]).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  insights: text("insights"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TrainingRecord = typeof trainingRecords.$inferSelect;
export type InsertTrainingRecord = typeof trainingRecords.$inferInsert;

/**
 * AI 督导记录表
 * 保存每一次 AI 督导生成的结构化结果（案例级 / 会话级）
 */
export const aiSupervisions = mysqlTable("aiSupervisions", {
  id: int("id").autoincrement().primaryKey(),
  // 关联案例（必填）
  caseId: int("caseId").notNull(),
  // 关联咨询记录（会话级督导时填写；案例级督导为 null）
  sessionId: int("sessionId"),
  // 督导范围：case=案例级，session=会话级
  scope: mysqlEnum("scope", ["case", "session"]).notNull().default("case"),
  // 发起督导的用户
  counselorId: int("counselorId").notNull(),
  // ── 三轴判断结果 ──
  // 轴1 阻碍来源：external=外部压制 / internal=内部未发育 / mixed=混合型
  axisObstacleSource: mysqlEnum("axisObstacleSource", ["external", "internal", "mixed"]),
  axisObstacleSourceDetail: text("axisObstacleSourceDetail"),
  // 轴2 需求结构（6种类型之一，存文本以兼容组合描述）
  axisNeedStructure: text("axisNeedStructure"),
  // 轴3 能量审计：high=能量高 / medium=能量中 / low=能量低
  axisEnergyLevel: mysqlEnum("axisEnergyLevel", ["high", "medium", "low"]),
  axisEnergyDetail: text("axisEnergyDetail"),
  // 推荐干预技术（JSON 数组）
  recommendedTechniques: json("recommendedTechniques"),
  // 督导建议正文
  supervisionAdvice: text("supervisionAdvice"),
  // 下次咨询建议（会话级督导侧重）
  nextSessionSuggestion: text("nextSessionSuggestion"),
  // 风险提示
  riskAlert: text("riskAlert"),
  // AI 原始完整输出（JSON，便于回溯与展示）
  rawResult: json("rawResult"),
  // 使用的模型来源标识（deepseek / fallback）
  modelSource: varchar("modelSource", { length: 32 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AiSupervision = typeof aiSupervisions.$inferSelect;
export type InsertAiSupervision = typeof aiSupervisions.$inferInsert;
