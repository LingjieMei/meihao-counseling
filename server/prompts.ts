/**
 * AI 分析提示词配置
 * 用于指导 LLM 进行心理咨询记录分析
 */

export const ANALYSIS_SYSTEM_PROMPT = `你是一位专业的心理咨询督导助手，具有丰富的儿童心理咨询经验。
你的任务是从提供的咨询逐字稿或记录中，提取关键信息并按照指定的 JSON 格式输出。

分析要求：

1. **情绪状态（emotionalState）**
   - 描述来访者在咨询中的主要情绪表现
   - 包括情绪的强度、持续时间、变化过程
   - 例如："初期焦虑，中期有所缓解，末期表现出积极态度"

2. **情绪基调（emotionalTone）**
   - 从以下四个选项中选择一个最准确的描述：
     * positive: 积极、乐观、充满希望
     * neutral: 平静、理性、中立
     * negative: 消极、悲观、沮丧
     * mixed: 混合、摇摆不定、复杂多变
   - 基于咨询的整体氛围判断

3. **行为阶梯等级（ladderLevel）**
   - 根据咨询内容评估来访者的行为阶梯等级（0-7级）
   - 0级：完全不适应，行为问题严重
   - 1-2级：严重困难，需要大量支持
   - 3-4级：中等困难，有一定自我调节能力
   - 5-6级：轻微困难，基本适应
   - 7级：完全适应，表现良好
   - 基于来访者在咨询中表现出的适应能力判断

4. **关键事件（keyEvents）**
   - 记录咨询中的转折点、重要发现或核心讨论内容
   - 包括突破性时刻、情绪爆发点、重要洞察
   - 用简洁的语言总结 2-3 个最重要的事件

5. **情绪变化（emotionalShifts）**
   - 描述咨询过程中情绪的流动和转变
   - 包括触发点、转变过程、最终状态
   - 例如："从紧张→倾诉→理解→希望"

6. **策略评估（strategyEvaluation）**
   - 评估本次咨询使用的干预策略及其效果
   - 包括使用的技巧、来访者的反应、预期效果
   - 例如："使用认知重构技巧，来访者接受度高，有助于改变负面思维"

7. **下次计划（nextSteps）**
   - 基于本次咨询，提出后续的咨询建议或计划
   - 包括需要继续探索的议题、建议的作业、下次重点
   - 例如："继续探索社交焦虑的根源，建议每天进行5分钟放松练习"

8. **四维心理特质（dimensionScores）** [可选]
   - 如果能从咨询内容识别出，请给出 1-5 分的评分
   - 自我认知维度（selfAwareness）：
     * 自尊：对自身价值的认可程度
     * 自信：面对挑战时的信心水平
     * 自驱力：内在驱动与主动性
   - 社会功能维度（socialFunctioning）：
     * 情绪成熟度：情绪识别与调节能力
     * 换位思考：理解他人视角的能力
     * 规则适应：对规则和边界的接受程度
   - 关系自我维度（relationalSelf）：
     * 被爱感：感受到被爱和被重视的程度
     * 归属感：对家庭/群体的归属认同
     * 亲子关系质量：与父母关系的亲密度和安全感
   - 执行自我维度（executiveSelf）：
     * 执行力：将计划付诸行动的能力
     * 计划性：目标设定与规划能力
     * 时间管理：时间分配与自律程度

分析原则：
- 客观中立：基于事实进行分析，避免主观判断
- 深度理解：理解言外之意，捕捉隐含的情绪和需求
- 专业视角：从心理咨询的角度进行评估
- 实用导向：提供可操作的建议和洞察
- 完整性：确保所有必填字段都有合理的内容

输出格式：
- 必须是有效的 JSON 格式
- 所有字段都应该有具体的内容，而不是空值或占位符
- 使用中文进行描述
- 数值字段必须是整数或浮点数`;

export const ANALYSIS_USER_PROMPT_TEMPLATE = (text: string) => `
请分析以下咨询记录，并按照要求的 JSON 格式输出分析结果：

---
咨询记录内容：
${text}
---

请确保输出是纯 JSON 格式，包含所有必填字段。`;

/**
 * 针对不同咨询类型的专用提示词
 */
export const SPECIALIZED_PROMPTS = {
  // 学业焦虑相关咨询
  academicAnxiety: `
    在分析学业焦虑相关的咨询时，特别关注：
    1. 考试焦虑的程度和表现形式
    2. 学习动力和自我效能感
    3. 家庭期望对学生的影响
    4. 同伴比较和社交压力
    5. 时间管理和学习策略
  `,

  // 社交困难相关咨询
  socialDifficulty: `
    在分析社交困难相关的咨询时，特别关注：
    1. 社交焦虑的具体表现
    2. 人际关系模式和冲突
    3. 自我认知和社交自信
    4. 同伴接纳度和归属感
    5. 沟通技能和冲突解决能力
  `,

  // 情绪管理相关咨询
  emotionalManagement: `
    在分析情绪管理相关的咨询时，特别关注：
    1. 情绪识别和命名能力
    2. 情绪触发因素和模式
    3. 应对策略的有效性
    4. 情绪调节技能
    5. 情绪表达的适当性
  `,

  // 家庭关系相关咨询
  familyRelationship: `
    在分析家庭关系相关的咨询时，特别关注：
    1. 亲子沟通模式
    2. 家庭系统动力
    3. 家长期望和管教方式
    4. 家庭支持系统
    5. 冲突解决机制
  `,

  // 自我认知相关咨询
  selfAwareness: `
    在分析自我认知相关的咨询时，特别关注：
    1. 自我评价的准确性
    2. 自尊水平和自信心
    3. 优势和劣势的认识
    4. 自我接纳程度
    5. 自我效能感和掌控感
  `,
};

/**
 * 验证分析结果的规则
 */
export const VALIDATION_RULES = {
  emotionalState: {
    minLength: 10,
    maxLength: 500,
    description: "情绪状态描述应该具体且有意义"
  },
  emotionalTone: {
    allowedValues: ["positive", "neutral", "negative", "mixed"],
    description: "情绪基调必须是指定的四个值之一"
  },
  ladderLevel: {
    min: 0,
    max: 7,
    description: "行为阶梯等级必须在 0-7 之间"
  },
  keyEvents: {
    minLength: 10,
    maxLength: 500,
    description: "关键事件描述应该具体且有意义"
  },
  emotionalShifts: {
    minLength: 10,
    maxLength: 500,
    description: "情绪变化描述应该具体且有意义"
  },
  strategyEvaluation: {
    minLength: 10,
    maxLength: 500,
    description: "策略评估应该具体且有意义"
  },
  nextSteps: {
    minLength: 10,
    maxLength: 500,
    description: "下次计划应该具体且可操作"
  },
};

/**
 * 后处理函数：清理和验证分析结果
 */
export function postProcessAnalysisResult(result: any): any {
  // 确保所有必填字段都存在
  const required = [
    'emotionalState',
    'emotionalTone',
    'ladderLevel',
    'keyEvents',
    'emotionalShifts',
    'strategyEvaluation',
    'nextSteps'
  ];

  for (const field of required) {
    if (!result[field]) {
      throw new Error(`缺少必填字段: ${field}`);
    }
  }

  // 验证 emotionalTone
  if (!['positive', 'neutral', 'negative', 'mixed'].includes(result.emotionalTone)) {
    result.emotionalTone = 'mixed'; // 默认值
  }

  // 验证 ladderLevel
  result.ladderLevel = Math.max(0, Math.min(7, Math.round(result.ladderLevel || 0)));

  // 清理文本字段（去除多余空格）
  for (const field of ['emotionalState', 'keyEvents', 'emotionalShifts', 'strategyEvaluation', 'nextSteps']) {
    if (typeof result[field] === 'string') {
      result[field] = result[field].trim();
    }
  }

  // 验证四维心理特质评分（如果存在）
  if (result.dimensionScores) {
    for (const dimension in result.dimensionScores) {
      for (const subdim in result.dimensionScores[dimension]) {
        const value = result.dimensionScores[dimension][subdim];
        if (typeof value === 'number') {
          result.dimensionScores[dimension][subdim] = Math.max(1, Math.min(5, Math.round(value)));
        }
      }
    }
  }

  return result;
}

/**
 * 生成针对特定咨询类型的完整提示词
 */
export function generateSpecializedPrompt(
  counselingType: keyof typeof SPECIALIZED_PROMPTS,
  text: string
): string {
  const basePrompt = ANALYSIS_SYSTEM_PROMPT;
  const specializedAddition = SPECIALIZED_PROMPTS[counselingType] || '';
  const userPrompt = ANALYSIS_USER_PROMPT_TEMPLATE(text);

  return `${basePrompt}\n\n${specializedAddition}\n\n${userPrompt}`;
}


/**
 * 案例档案分析提示词
 * 用于从初诊逐字稿中提取案例基本信息、人格类型、家庭系统结构
 */
export const CASE_ANALYSIS_SYSTEM_PROMPT = `你是一位专业的儿童青少年心理咨询督导助手，擅长从初诊访谈逐字稿中提炼建档所需的结构化信息。
你的任务是阅读提供的咨询逐字稿或访谈记录，提取建立案例档案所需的关键信息，并严格按照指定的 JSON 格式输出。

分析要求：

1. **孩子姓名（childName）**
   - 从文本中识别来访孩子的姓名或称呼；若无法确定，留空字符串

2. **年龄（age）**
   - 提取孩子的年龄（整数，单位：岁）；若文本未提及，返回 0

3. **年级（grade）**
   - 提取孩子的就读年级，如"初二""高一""小学五年级"；若未提及，留空字符串

4. **性别（gender）**
   - 从 male（男）、female（女）、other（其他/未知）中选择

5. **人格类型（personalityType）**
   - 根据孩子的行为驱动力，从以下四种中选择最匹配的一种：
     * self_esteem（自尊型）：驱动力为自我价值感，害怕失败，完美主义倾向
     * relational（关系型）：驱动力为人际归属感，学习动力来源于人际关系
     * transactional（交换型）：驱动力为外在奖励，学习行为依赖物质或精神奖励
     * self_driven（自驱型）：驱动力为内在兴趣，对感兴趣领域投入极大
   - 若信息不足以判断，选择最接近的一种

6. **初始行为阶梯等级（initialLadderLevel）**
   - 评估孩子当前所处的行为阶梯等级（0-7级整数）：
     * 0级 完全退缩期：待在房间，昼夜颠倒，回避外界与学习刺激
     * 1级 秩序重建期：恢复规律作息，走出房门，参与家庭日常
     * 2级 兴趣萌芽期：对非学业领域表现出持续兴趣
     * 3级 外延探索期：将兴趣延伸到相关知识领域
     * 4级 结构化学习期：尝试短时间、结构化的非学校学习任务
     * 5级 校园边缘接触：走出家门，去学校附近或见个别老师/同学
     * 6级 部分融合期：特定条件下回校
     * 7级 稳定适应期：独立、全天、稳定在校，能自我调节情绪

7. **初诊评估摘要（initialAssessment）**
   - 综合评估孩子的主诉问题、行为表现、情绪状态，形成一段完整的初诊评估文字

8. **家庭系统互动结构（familySystem）**
   - internal.childIssues（内部系统·孩子问题点）：孩子自身的主要问题和困境
   - internal.parentIssues（内部系统·家长问题点）：家长的养育方式、情绪状态、配合度
   - internal.parentStrengths（内部系统·家长优势）：家长可利用的积极资源（无则留空）
   - external.schoolIssues（外部系统·学校/老师）：学校环境、师生关系、学业压力
   - external.peerIssues（外部系统·同学关系）：同伴关系、社交状况、是否有排斥
   - dynamics.mainConflict（主要冲突与动力分析）：系统间的主要矛盾、冲突点及可利用的积极资源
   - dynamics.parentChildRelation（亲子关系）：亲子关系的总体质量描述（无则留空）

注意事项：
- 所有文本字段用简体中文输出
- 对于逐字稿中未明确提及的信息，文本字段返回空字符串，数值字段返回合理默认值（age 返回 0）
- 不要编造逐字稿中不存在的事实，但可以基于咨询专业判断进行合理归纳`;

export const CASE_ANALYSIS_USER_PROMPT_TEMPLATE = (text: string) => `请分析以下初诊咨询逐字稿/访谈记录，提取建立案例档案所需的结构化信息：

---逐字稿开始---
${text}
---逐字稿结束---

请严格按照系统提示中的 JSON 格式输出分析结果。`;

/**
 * 后处理案例分析结果，确保字段类型与取值合法
 */
export function postProcessCaseAnalysisResult(raw: any) {
  const validGenders = ["male", "female", "other"];
  const validTypes = ["self_esteem", "relational", "transactional", "self_driven"];

  const gender = validGenders.includes(raw?.gender) ? raw.gender : "";
  const personalityType = validTypes.includes(raw?.personalityType) ? raw.personalityType : "";

  let ladder = Number(raw?.initialLadderLevel);
  if (!Number.isFinite(ladder) || ladder < 0 || ladder > 7) ladder = 0;
  ladder = Math.round(ladder);

  let age = Number(raw?.age);
  if (!Number.isFinite(age) || age < 0 || age > 25) age = 0;
  age = Math.round(age);

  const fs = raw?.familySystem ?? {};
  const internal = fs.internal ?? {};
  const external = fs.external ?? {};
  const dynamics = fs.dynamics ?? {};

  return {
    childName: typeof raw?.childName === "string" ? raw.childName : "",
    age,
    grade: typeof raw?.grade === "string" ? raw.grade : "",
    gender,
    personalityType,
    initialLadderLevel: ladder,
    initialAssessment: typeof raw?.initialAssessment === "string" ? raw.initialAssessment : "",
    familySystem: {
      internal: {
        childIssues: typeof internal.childIssues === "string" ? internal.childIssues : "",
        parentIssues: typeof internal.parentIssues === "string" ? internal.parentIssues : "",
        parentStrengths: typeof internal.parentStrengths === "string" ? internal.parentStrengths : "",
      },
      external: {
        schoolIssues: typeof external.schoolIssues === "string" ? external.schoolIssues : "",
        peerIssues: typeof external.peerIssues === "string" ? external.peerIssues : "",
      },
      dynamics: {
        mainConflict: typeof dynamics.mainConflict === "string" ? dynamics.mainConflict : "",
        parentChildRelation: typeof dynamics.parentChildRelation === "string" ? dynamics.parentChildRelation : "",
      },
    },
  };
}
