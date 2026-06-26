# 美好心理 · 咨询督导系统 — TODO

## 源码迁移（保留全部已有功能）
- [x] 迁移 pages（Dashboard/CaseList/CaseDetail/CaseCreate/SessionCreate/SessionDetail/GrowthCenter/AdminManage/ParentReport/PersonalityProfiles/Home/NotFound/ComponentShowcase）
- [x] 迁移 components（DashboardLayout/AnnotationPanel/FactorScatterPlot）
- [x] 迁移 lib（constants/types）与 contexts（ThemeContext）
- [x] 迁移 server 业务（db/routers/prompts/storage/voice + 测试）
- [x] 迁移 schema 与 shared
- [x] 安装缺失依赖 bcryptjs / three
- [x] 创建全部数据库表（含 phone/passwordHash）
- [x] 首页渲染验证通过

## AI 调用层改造为 DeepSeek 直连（最高优先级约束）
- [x] 新建 server/deepseek.ts：硬编码直连 DeepSeek API 端点，不经任何内置网关
- [x] 改造 voice.ts 记录分析（analyzeTranscript / uploadAndAnalyzeTranscript）走 DeepSeek
- [x] 改造 voice.ts 初诊建档解析（uploadAndAnalyzeCaseTranscript）走 DeepSeek
- [x] 保留 Manus 网关作为兜底回退（DeepSeek 失败时）

## AI 督导功能
- [x] aiSupervisions 数据表（已建）+ db.ts 助手函数
- [x] server/supervisionPrompts.ts：注入完整方法论（三轴/6需求/8技术/9案例）
- [x] supervision 路由：案例级督导 superviseCase
- [x] supervision 路由：会话级督导 superviseSession
- [x] supervision 路由：历史记录 listByCase
- [x] CaseDetail 新增「AI督导」Tab：案例级生成 + 历史列表
- [x] SessionDetail / 时间线 新增会话级「AI督导」按鈕
- [x] 结构化结果展示（三轴/技术/建议/风险）

## 测试与交付
- [x] vitest 测试 DeepSeek 直连与督导逻辑（24个测试全部通过）
- [x] 登录验证（13800000000 / admin123）
- [x] 全功能回归
- [x] 保存检查点并交付
