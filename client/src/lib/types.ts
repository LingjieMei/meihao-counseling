// 前端使用的类型定义（与后端schema对应）

export interface CaseRecord {
  id: number;
  childName: string;
  age: number | null;
  grade: string | null;
  gender: 'male' | 'female' | 'other' | null;
  personalityType: 'self_esteem' | 'relational' | 'transactional' | 'self_driven' | null;
  initialAssessment: string | null;
  familySystem: unknown;
  initialLadderLevel: number | null;
  currentLadderLevel: number | null;
  counselorId: number;
  supervisorId: number | null;
  status: 'active' | 'completed' | 'paused';
  notes: string | null;
  personalityProfile: unknown;
  psychologicalAssessment: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionRecord {
  id: number;
  caseId: number;
  counselorId: number;
  sessionNumber: number;
  sessionDate: Date;
  emotionalState: string | null;
  emotionalTone: 'positive' | 'neutral' | 'negative' | 'mixed' | null;
  parentFeedback: string | null;
  interventionStrategies: string | null;
  ladderLevel: number;
  // 四维心理特质评分（JSON）
  dimensionScores: unknown;
  // 正负因子（JSON）
  factors: unknown;
  keyEvents: string | null;
  emotionalShifts: string | null;
  strategyEvaluation: string | null;
  nextSteps: string | null;
  srsMethod: number | null;
  srsGoals: number | null;
  srsContent: number | null;
  srsOverall: number | null;
  additionalNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AnnotationRecord {
  id: number;
  sessionId: number;
  caseId: number;
  supervisorId: number;
  content: string;
  annotationType: 'direction' | 'caution' | 'strategy' | 'praise' | 'question';
  isRead: number;
  createdAt: Date;
  updatedAt: Date;
}

// 四维心理特质维度
export interface DimensionScores {
  selfAwareness?: {
    '自尊'?: number;
    '自信'?: number;
    '自驱力'?: number;
  };
  socialFunctioning?: {
    '情绪成熟度'?: number;
    '换位思考'?: number;
    '规则适应'?: number;
  };
  relationalSelf?: {
    '被爱感'?: number;
    '归属感'?: number;
    '亲子关系质量'?: number;
  };
  executiveSelf?: {
    '执行力'?: number;
    '计划性'?: number;
    '时间管理'?: number;
  };
}

// 正负因子
export interface Factor {
  name: string;
  source: 'family' | 'school' | 'peers'; // X轴：系统来源
  positivity: number; // Y轴：正负程度 -5 到 +5
  impact: number; // Z轴：影响强度 1-10
}
