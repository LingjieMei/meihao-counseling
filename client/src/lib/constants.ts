// 人格类型
export const PERSONALITY_TYPES = {
  self_esteem: { label: '自尊型', badgeClass: 'badge-self-esteem', color: 'oklch(0.65 0.15 30)', desc: '驱动力：自我价值感，害怕失败，完美主义倾向' },
  relational: { label: '关系型', badgeClass: 'badge-relational', color: 'oklch(0.58 0.14 160)', desc: '驱动力：人际归属感，学习动力来源于人际关系' },
  transactional: { label: '交换型', badgeClass: 'badge-transactional', color: 'oklch(0.60 0.14 260)', desc: '驱动力：外在奖励，学习行为依赖物质或精神奖励' },
  self_driven: { label: '自驱型', badgeClass: 'badge-self-driven', color: 'oklch(0.55 0.15 220)', desc: '驱动力：内在兴趣，对感兴趣领域投入极大' },
} as const;

// 行为阶梯
export const LADDER_LEVELS = [
  { level: 0, label: 'Lv.0 完全退缩期', desc: '待在房间，昼夜颠倒，回避外界与学习刺激', color: '#e05a3a' },
  { level: 1, label: 'Lv.1 秩序重建期', desc: '恢复规律作息，走出房门，参与家庭日常', color: '#e07a3a' },
  { level: 2, label: 'Lv.2 兴趣萌芽期', desc: '对非学业领域（游戏/动漫）表现出持续兴趣', color: '#d4a020' },
  { level: 3, label: 'Lv.3 外延探索期', desc: '将兴趣延伸到相关知识领域（如研究历史/绘画）', color: '#b8b820' },
  { level: 4, label: 'Lv.4 结构化学习期', desc: '尝试短时间、结构化的非学校学习任务', color: '#60b840' },
  { level: 5, label: 'Lv.5 校园边缘接触', desc: '走出家门，去学校附近或见个别老师/同学', color: '#40a870' },
  { level: 6, label: 'Lv.6 部分融合期', desc: '特定条件下回校（如半天/喜欢的课/家长陪同）', color: '#3090a0' },
  { level: 7, label: 'Lv.7 稳定适应期', desc: '独立、全天、稳定在校，能自我调节情绪', color: '#2870a0' },
] as const;

// 情绪基调
export const EMOTIONAL_TONES = {
  positive: { label: '积极', color: 'text-emerald-600' },
  neutral: { label: '平稳', color: 'text-blue-600' },
  negative: { label: '消极', color: 'text-red-600' },
  mixed: { label: '复杂', color: 'text-amber-600' },
} as const;

// 批注类型
export const ANNOTATION_TYPES = {
  direction: { label: '方向确认', icon: '→', cssClass: 'annotation-direction', color: 'oklch(0.55 0.15 220)' },
  caution: { label: '注意事项', icon: '⚠', cssClass: 'annotation-caution', color: 'oklch(0.65 0.15 50)' },
  strategy: { label: '策略调整', icon: '⚙', cssClass: 'annotation-strategy', color: 'oklch(0.58 0.14 160)' },
  praise: { label: '肯定鼓励', icon: '✓', cssClass: 'annotation-praise', color: 'oklch(0.60 0.14 130)' },
  question: { label: '提出疑问', icon: '?', cssClass: 'annotation-question', color: 'oklch(0.60 0.14 290)' },
} as const;

// 案例状态
export const CASE_STATUS = {
  active: { label: '进行中', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  completed: { label: '已完成', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  paused: { label: '暂停中', color: 'text-amber-600 bg-amber-50 border-amber-200' },
} as const;

// 性别
export const GENDERS = {
  male: '男',
  female: '女',
  other: '其他',
} as const;

// SRS量表说明
export const SRS_ITEMS = [
  { key: 'srsMethod', label: '会谈的方式方法', desc: '咨询师使用的方法是否适合你？' },
  { key: 'srsGoals', label: '会谈的目标', desc: '我们是否聚焦于你最关心的问题？' },
  { key: 'srsContent', label: '会谈的内容', desc: '讨论的内容是否与你相关且有帮助？' },
  { key: 'srsOverall', label: '整体感受', desc: '整体而言，这次会谈对你有帮助吗？' },
] as const;

// 人格类型画像详细描述
export const PERSONALITY_PROFILES = {
  self_esteem: {
    title: '自尊型',
    subtitle: '驱动力：自我价值感',
    characteristics: [
      '害怕失败，完美主义倾向',
      '一旦成绩下滑容易全面否定自己',
      '表面自信但内心极度脆弱',
      '不允许自己失败，一旦受挫容易全面崩溃',
      '抗拒求助，认为求助是软弱',
    ],
    strategy: '需要重建自我效能感，关注其自我价值感的重建，避免与其他孩子做比较',
    triggerPoints: ['成绩下滑', '被批评', '比较失败', '公开出错'],
    interventions: ['成功体验积累', '自我效能感重建', '认知重构', '焦点解决'],
  },
  relational: {
    title: '关系型',
    subtitle: '驱动力：人际归属感',
    characteristics: [
      '学习动力来源于人际关系',
      '师生关系、同伴关系出问题时，学习动力会急剧下降',
      '在学校遭遇社交排斥容易厌学',
      '对人际关系变化极度敏感',
      '需要被接纳和认可',
    ],
    strategy: '通过关系修复激发学习动力，先建立安全感，再探索问题',
    triggerPoints: ['同伴排斥', '师生冲突', '友谊破裂', '社交孤立'],
    interventions: ['关系修复', '社交技能训练', '归属感建立', '同伴支持'],
  },
  transactional: {
    title: '交换型',
    subtitle: '驱动力：外在奖励',
    characteristics: [
      '学习行为依赖物质或精神奖励',
      '一旦奖励消失，动力随之消失',
      '需要给个"胡萝卜"才往前走',
      '对奖励规则非常敏感',
      '内在动机较弱',
    ],
    strategy: '需引导从外在激励过渡到内在动机，逐步内化学习价值',
    triggerPoints: ['奖励消失', '规则改变', '付出无回报', '目标不明确'],
    interventions: ['动机内化', '价值观澄清', '渐进式自主', '意义感建立'],
  },
  self_driven: {
    title: '自驱型',
    subtitle: '驱动力：内在兴趣',
    characteristics: [
      '对感兴趣的领域投入极大',
      '可能严重偏科',
      '对不感兴趣的科目完全放弃',
      '自主性强但缺乏全面规划',
      '需要帮助建立全面的学习规划',
    ],
    strategy: '帮助建立全面的学习规划与目标管理，利用兴趣点作为桥梁',
    triggerPoints: ['被强迫学不感兴趣的内容', '失去自主权', '兴趣被否定'],
    interventions: ['兴趣延伸', '目标管理', '学习规划', '自主性培养'],
  },
} as const;

// 家庭系统互动结构默认模板
export const FAMILY_SYSTEM_TEMPLATE = {
  internal: {
    child: { role: '孩子', issues: [], strengths: [] },
    parent: { role: '家长', issues: [], strengths: [], mainCaregiver: '' },
  },
  external: {
    school: { role: '学校/老师', issues: [], support: [] },
    peers: { role: '同学', issues: [], support: [] },
  },
  dynamics: {
    parentChildRelation: '',
    schoolRelation: '',
    peerRelation: '',
    mainConflict: '',
  },
};
