import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock DeepSeek 调用，避免测试时真实调用 API ──────────────────────────────
vi.mock("./deepseek", () => ({
  invokeDeepSeekJSON: vi.fn().mockResolvedValue({
    data: {
      axisObstacleSource: "mixed",
      axisObstacleSourceDetail: "外部压制：网暴和丧友；内部未发育：意义感断裂",
      axisNeedStructure: "被精细看见 + 被提供安全感底线",
      axisEnergyLevel: "medium",
      axisEnergyDetail: "仍在练琴，自愈能力在线，能量中等",
      recommendedTechniques: ["意义修复", "关系整合"],
      techniqueRationale: "意义修复回应意义感断裂；关系整合修复亲子关系",
      supervisionAdvice: "优先做意义修复，不急于推动学业恢复",
      nextSessionSuggestion: "探索大提琴对他的意义，布置与母亲的低冲突对话作业",
      riskAlert: "存在存在性危机表达，需评估自杀风险",
    },
    source: "deepseek" as const,
  }),
}));

import { formatCaseInfo, formatSessionInfo, superviseCase, superviseSession } from "./supervision";

const mockCase = {
  childName: "安同学",
  age: 17,
  grade: "高二",
  gender: "male",
  personalityType: "self_driven",
  initialLadderLevel: 2,
  currentLadderLevel: 3,
  initialAssessment: "美高安多福高二男生，双触发摆烂",
  familySystem: {
    internal: { childIssues: "意义感断裂", parentIssues: "沟通困难", parentStrengths: "妈妈关心孩子" },
    external: { schoolIssues: "网暴", peerIssues: "社交退缩" },
    dynamics: { mainConflict: "亲子沟通模式不匹配", parentChildRelation: "紧张" },
  },
  notes: "外源性触发，预后较好",
};

const mockSession = {
  sessionNumber: 1,
  sessionDate: new Date("2026-06-01"),
  ladderLevel: 3,
  emotionalState: "低落迷茫",
  emotionalTone: "negative",
  interventionStrategies: "共情 + 意义探索",
  keyEvents: "谈及网暴和丧友",
  emotionalShifts: "从无力到表达渴望意义感",
  strategyEvaluation: "共情有效，建立信任",
  nextSteps: "探索意义感",
  parentFeedback: "妈妈反映孩子不愿沟通",
  additionalNotes: "",
};

describe("supervision utils", () => {
  it("formatCaseInfo 包含案例基本信息", () => {
    const text = formatCaseInfo(mockCase);
    expect(text).toContain("安同学");
    expect(text).toContain("高二");
    expect(text).toContain("意义感断裂");
    expect(text).toContain("Lv.2");
    expect(text).toContain("Lv.3");
  });

  it("formatSessionInfo 包含会话关键字段", () => {
    const text = formatSessionInfo(mockSession);
    expect(text).toContain("第 1 次咨询");
    expect(text).toContain("低落迷茫");
    expect(text).toContain("网暴和丧友");
  });

  it("superviseCase 返回正确结构化结果", async () => {
    const { result, source } = await superviseCase(mockCase, [mockSession]);
    expect(source).toBe("deepseek");
    expect(result.axisObstacleSource).toBe("mixed");
    expect(result.axisEnergyLevel).toBe("medium");
    expect(result.recommendedTechniques).toContain("意义修复");
    expect(result.supervisionAdvice).toBeTruthy();
    expect(result.riskAlert).toBeTruthy();
  });

  it("superviseSession 返回正确结构化结果", async () => {
    const { result, source } = await superviseSession(mockCase, mockSession);
    expect(source).toBe("deepseek");
    expect(result.axisObstacleSource).toBe("mixed");
    expect(result.nextSessionSuggestion).toBeTruthy();
  });

  it("normalizeResult 容错处理：recommendedTechniques 为字符串时转为数组", async () => {
    const { invokeDeepSeekJSON } = await import("./deepseek");
    vi.mocked(invokeDeepSeekJSON).mockResolvedValueOnce({
      data: {
        axisObstacleSource: "external",
        axisObstacleSourceDetail: "test",
        axisNeedStructure: "被接住",
        axisEnergyLevel: "low",
        axisEnergyDetail: "test",
        recommendedTechniques: "意义修复", // 字符串而非数组
        techniqueRationale: "test",
        supervisionAdvice: "test advice",
        nextSessionSuggestion: "test next",
        riskAlert: "暂无明显风险信号",
      },
      source: "deepseek" as const,
    });
    const { result } = await superviseCase(mockCase, []);
    expect(Array.isArray(result.recommendedTechniques)).toBe(true);
    expect(result.recommendedTechniques).toContain("意义修复");
  });
});
