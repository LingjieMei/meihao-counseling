/**
 * AI 督导核心逻辑
 * ------------------------------------------------------------------
 * 负责：把案例信息 + 历史咨询记录组装成上下文，调用 DeepSeek 生成
 * 结构化督导报告，并规整结果。所有调用通过 server/deepseek.ts 直连 DeepSeek。
 */

import { invokeDeepSeekJSON } from "./deepseek";
import {
  CASE_SUPERVISION_SYSTEM_PROMPT,
  SESSION_SUPERVISION_SYSTEM_PROMPT,
  SUPERVISION_JSON_SPEC,
} from "./supervisionPrompts";

// 人格类型 / 阶梯 / 情绪基调 的中文映射（服务端独立维护，避免依赖前端常量）
const PERSONALITY_LABELS: Record<string, string> = {
  self_esteem: "自尊型（驱动力：自我价值感）",
  relational: "关系型（驱动力：人际归属感）",
  transactional: "交换型（驱动力：外在奖励）",
  self_driven: "自驱型（驱动力：内在兴趣）",
};
const LADDER_LABELS: Record<number, string> = {
  0: "Lv.0 完全退缩期", 1: "Lv.1 秩序重建期", 2: "Lv.2 兴趣萌芽期", 3: "Lv.3 外延探索期",
  4: "Lv.4 结构化学习期", 5: "Lv.5 校园边缘接触", 6: "Lv.6 部分融合期", 7: "Lv.7 稳定适应期",
};
const TONE_LABELS: Record<string, string> = {
  positive: "积极", neutral: "平稳", negative: "消极", mixed: "复杂",
};
const GENDER_LABELS: Record<string, string> = { male: "男", female: "女", other: "其他" };

export type SupervisionResult = {
  axisObstacleSource: "external" | "internal" | "mixed" | null;
  axisObstacleSourceDetail: string;
  axisNeedStructure: string;
  axisEnergyLevel: "high" | "medium" | "low" | null;
  axisEnergyDetail: string;
  recommendedTechniques: string[];
  techniqueRationale: string;
  supervisionAdvice: string;
  nextSessionSuggestion: string;
  riskAlert: string;
};

// 把任意一个 case 行对象格式化为可读文本
export function formatCaseInfo(c: any): string {
  const fs = c.familySystem ?? {};
  const internal = fs.internal ?? {};
  const external = fs.external ?? {};
  const dynamics = fs.dynamics ?? {};
  return `
【案例基本信息】
- 孩子姓名：${c.childName ?? "未填写"}
- 年龄：${c.age ?? "未填写"}　性别：${GENDER_LABELS[c.gender] ?? "未填写"}　年级：${c.grade ?? "未填写"}
- 人格类型：${PERSONALITY_LABELS[c.personalityType] ?? "未判定"}
- 初始行为阶梯：${LADDER_LABELS[c.initialLadderLevel ?? 0]}　当前行为阶梯：${LADDER_LABELS[c.currentLadderLevel ?? 0]}
- 初诊评估：${c.initialAssessment ?? "无"}
- 家庭系统：
  · 孩子问题点：${internal.childIssues ?? "无"}
  · 家长问题点：${internal.parentIssues ?? "无"}
  · 家长优势：${internal.parentStrengths ?? "无"}
  · 学校/老师：${external.schoolIssues ?? "无"}
  · 同伴关系：${external.peerIssues ?? "无"}
  · 主要冲突与动力：${dynamics.mainConflict ?? "无"}
  · 亲子关系：${dynamics.parentChildRelation ?? "无"}
- 备注：${c.notes ?? "无"}
`.trim();
}

// 把一条 session 行对象格式化为可读文本
export function formatSessionInfo(s: any, withHeader = true): string {
  const header = withHeader ? `【第 ${s.sessionNumber} 次咨询】（${new Date(s.sessionDate).toLocaleDateString("zh-CN")}）\n` : "";
  return `${header}- 行为阶梯：${LADDER_LABELS[s.ladderLevel] ?? s.ladderLevel}
- 情绪状态：${s.emotionalState ?? "无"}（基调：${TONE_LABELS[s.emotionalTone] ?? "未标注"}）
- 干预策略：${s.interventionStrategies ?? "无"}
- 关键事件：${s.keyEvents ?? "无"}
- 情绪变化：${s.emotionalShifts ?? "无"}
- 策略评估：${s.strategyEvaluation ?? "无"}
- 下次计划：${s.nextSteps ?? "无"}
- 家长反馈：${s.parentFeedback ?? "无"}
- 其他备注：${s.additionalNotes ?? "无"}`.trim();
}

function normalizeResult(raw: any): SupervisionResult {
  const validSource = ["external", "internal", "mixed"];
  const validEnergy = ["high", "medium", "low"];
  let techniques = raw?.recommendedTechniques;
  if (typeof techniques === "string") techniques = [techniques];
  if (!Array.isArray(techniques)) techniques = [];

  return {
    axisObstacleSource: validSource.includes(raw?.axisObstacleSource) ? raw.axisObstacleSource : null,
    axisObstacleSourceDetail: typeof raw?.axisObstacleSourceDetail === "string" ? raw.axisObstacleSourceDetail : "",
    axisNeedStructure: typeof raw?.axisNeedStructure === "string" ? raw.axisNeedStructure : "",
    axisEnergyLevel: validEnergy.includes(raw?.axisEnergyLevel) ? raw.axisEnergyLevel : null,
    axisEnergyDetail: typeof raw?.axisEnergyDetail === "string" ? raw.axisEnergyDetail : "",
    recommendedTechniques: techniques.filter((t: any) => typeof t === "string"),
    techniqueRationale: typeof raw?.techniqueRationale === "string" ? raw.techniqueRationale : "",
    supervisionAdvice: typeof raw?.supervisionAdvice === "string" ? raw.supervisionAdvice : "",
    nextSessionSuggestion: typeof raw?.nextSessionSuggestion === "string" ? raw.nextSessionSuggestion : "",
    riskAlert: typeof raw?.riskAlert === "string" ? raw.riskAlert : "暂无明显风险信号",
  };
}

/** 案例级 AI 督导：基于案例信息 + 全部历史咨询记录 */
export async function superviseCase(
  caseRow: any,
  sessionRows: any[]
): Promise<{ result: SupervisionResult; source: "deepseek" | "fallback" }> {
  const caseInfo = formatCaseInfo(caseRow);
  const sessionsText = sessionRows.length
    ? sessionRows.map(s => formatSessionInfo(s)).join("\n\n")
    : "（暂无历史咨询记录）";

  const userPrompt = `${caseInfo}

【全部历史咨询记录】（共 ${sessionRows.length} 次）
${sessionsText}

请基于以上信息，运用方法论输出案例级督导报告。
${SUPERVISION_JSON_SPEC}`;

  const { data, source } = await invokeDeepSeekJSON({
    messages: [
      { role: "system", content: CASE_SUPERVISION_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    maxTokens: 3000,
    temperature: 0.4,
  });

  return { result: normalizeResult(data), source };
}

/** 会话级 AI 督导：基于案例背景 + 单次咨询记录 */
export async function superviseSession(
  caseRow: any,
  sessionRow: any
): Promise<{ result: SupervisionResult; source: "deepseek" | "fallback" }> {
  const caseInfo = formatCaseInfo(caseRow);
  const sessionInfo = formatSessionInfo(sessionRow);

  const userPrompt = `${caseInfo}

【本次咨询记录详情】
${sessionInfo}

请基于以上信息，运用方法论对这一次咨询进行督导点评，并给出下次咨询建议。
${SUPERVISION_JSON_SPEC}`;

  const { data, source } = await invokeDeepSeekJSON({
    messages: [
      { role: "system", content: SESSION_SUPERVISION_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    maxTokens: 3000,
    temperature: 0.4,
  });

  return { result: normalizeResult(data), source };
}
