import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  PERSONALITY_TYPES, LADDER_LEVELS, CASE_STATUS, GENDERS,
  EMOTIONAL_TONES, ANNOTATION_TYPES, SRS_ITEMS, PERSONALITY_PROFILES
} from "@/lib/constants";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart
} from "recharts";
import { ArrowLeft, Plus, MessageSquare, TrendingUp, Clock, User, ChevronDown, ChevronUp, Save, Brain, FileText } from "lucide-react";
import AnnotationPanel from "@/components/AnnotationPanel";
import AiSupervisionPanel, { SessionSupervisionButton } from "@/components/AiSupervisionPanel";
import FactorScatterPlot from "@/components/FactorScatterPlot";
import type { Factor } from "@/lib/types";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

interface Props { id: number; }

export default function CaseDetail({ id }: Props) {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const isAdmin = user?.role === 'admin';
  const [expandedSession, setExpandedSession] = useState<number | null>(null);
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    coreTraits: '',
    motivationPoints: '',
    effectiveStrategies: '',
    triggerPoints: '',
    parentDynamics: '',
    additionalNotes: '',
  });

  const { data: caseData, isLoading: caseLoading, refetch: refetchCase } = trpc.cases.get.useQuery({ id });
  const { data: sessions, isLoading: sessionsLoading } = trpc.sessions.listByCase.useQuery({ caseId: id });
  const { data: annotations } = trpc.annotations.listByCase.useQuery({ caseId: id });

  const utils = trpc.useUtils();
  const updateCaseMutation = trpc.cases.update.useMutation({
    onSuccess: () => {
      toast.success('人格画像已保存');
      setProfileEditing(false);
      utils.cases.get.invalidate({ id });
    },
    onError: () => toast.error('保存失败，请重试'),
  });

  // 从caseData加载已保存的人格画像
  useEffect(() => {
    if (caseData?.personalityProfile) {
      const saved = caseData.personalityProfile as typeof profileData;
      setProfileData(prev => ({ ...prev, ...saved }));
    }
  }, [caseData?.id]);

  if (caseLoading) return <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">加载中...</div>;
  if (!caseData) return <div className="p-6 text-sm text-muted-foreground">案例不存在</div>;

  const pType = caseData.personalityType ? PERSONALITY_TYPES[caseData.personalityType] : null;
  const status = CASE_STATUS[caseData.status];
  const improvement = (caseData.currentLadderLevel ?? 0) - (caseData.initialLadderLevel ?? 0);

  // 行为阶梯曲线数据
  const ladderChartData = sessions?.map(s => ({
    name: `第${s.sessionNumber}次`,
    level: s.ladderLevel,
    date: format(new Date(s.sessionDate), 'MM/dd', { locale: zhCN }),
  })) ?? [];

  const unreadCount = annotations?.filter(a => !a.isRead).length ?? 0;

  return (
    <div className="p-6 space-y-5 animate-fade-in-up">
      {/* 页头 */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/cases')} className="gap-1">
          <ArrowLeft size={14} /> 返回
        </Button>
      </div>

      {/* 案例概览卡片 */}
      <Card className="overflow-hidden">
        <div className="h-1.5" style={{ background: pType?.color ?? 'oklch(0.52 0.02 220)' }} />
        <CardContent className="pt-5 pb-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-semibold text-white shrink-0"
                style={{ background: pType?.color ?? 'oklch(0.52 0.02 220)' }}>
                {caseData.childName.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-xl font-semibold">{caseData.childName}</h1>
                  {caseData.gender && <span className="text-sm text-muted-foreground">{GENDERS[caseData.gender]}</span>}
                  {caseData.age && <span className="text-sm text-muted-foreground">{caseData.age}岁</span>}
                  {caseData.grade && <span className="text-sm text-muted-foreground">{caseData.grade}</span>}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {pType && <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${pType.badgeClass}`}>{pType.label}</span>}
                  <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${status.color}`}>{status.label}</span>
                  {unreadCount > 0 && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                      {unreadCount} 条未读批注
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6 shrink-0">
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: LADDER_LEVELS[caseData.initialLadderLevel ?? 0].color }}>
                  Lv.{caseData.initialLadderLevel ?? 0}
                </div>
                <div className="text-xs text-muted-foreground">初始阶梯</div>
              </div>
              <div className="text-muted-foreground">→</div>
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: LADDER_LEVELS[caseData.currentLadderLevel ?? 0].color }}>
                  Lv.{caseData.currentLadderLevel ?? 0}
                </div>
                <div className="text-xs text-muted-foreground">当前阶梯</div>
              </div>
              {improvement !== 0 && (
                <div className={`text-sm font-semibold ${improvement > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {improvement > 0 ? `↑+${improvement}` : `↓${improvement}`}
                </div>
              )}
              <Button size="sm" onClick={() => navigate(`/cases/${id}/sessions/new`)} className="gap-1.5">
                <Plus size={14} /> 新增咨询记录
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate(`/cases/${id}/report`)} className="gap-1.5">
                <FileText size={14} /> 家长报告
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 主内容区 Tabs */}
      <Tabs defaultValue="timeline">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="timeline">咨询时间线</TabsTrigger>
          <TabsTrigger value="progress">进展图表</TabsTrigger>
          <TabsTrigger value="factors">因子分析</TabsTrigger>
          <TabsTrigger value="profile">案例档案</TabsTrigger>
          <TabsTrigger value="annotations" className="relative">
            督导批注
            {unreadCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                {unreadCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="ai-supervision" className="gap-1">
            <Brain size={12} /> AI 督导
          </TabsTrigger>
        </TabsList>

        {/* 时间线 */}
        <TabsContent value="timeline" className="mt-4">
          {sessionsLoading ? (
            <div className="text-center py-8 text-sm text-muted-foreground">加载中...</div>
          ) : sessions?.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">📝</div>
              <p className="text-muted-foreground text-sm mb-4">暂无咨询记录</p>
              <Button size="sm" onClick={() => navigate(`/cases/${id}/sessions/new`)}>添加第一次咨询记录</Button>
            </div>
          ) : (
            <div className="relative space-y-0">
              {/* 时间线竖线 */}
              <div className="absolute left-[22px] top-4 bottom-4 w-0.5 bg-border" />
              {sessions?.map((session, idx) => {
                const sessionAnnotations = annotations?.filter(a => a.sessionId === session.id) ?? [];
                const isExpanded = expandedSession === session.id;
                const ladder = LADDER_LEVELS[session.ladderLevel];
                const tone = session.emotionalTone ? EMOTIONAL_TONES[session.emotionalTone] : null;
                const srsTotal = (session.srsMethod ?? 0) + (session.srsGoals ?? 0) + (session.srsContent ?? 0) + (session.srsOverall ?? 0);
                const hasSrs = session.srsMethod !== null;

                return (
                  <div key={session.id} className="relative pl-12 pb-6">
                    {/* 时间线节点 */}
                    <div className="absolute left-0 top-3 w-11 h-11 rounded-full flex items-center justify-center text-xs font-bold text-white z-10"
                      style={{ background: ladder.color }}>
                      #{session.sessionNumber}
                    </div>

                    <Card className="hover:shadow-sm transition-shadow">
                      <CardContent className="pt-4 pb-3">
                        {/* 记录头部 */}
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">第 {session.sessionNumber} 次咨询</span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(session.sessionDate), 'yyyy年MM月dd日', { locale: zhCN })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium text-white" style={{ background: ladder.color }}>
                                Lv.{session.ladderLevel} {ladder.label.split(' ').slice(1).join(' ')}
                              </span>
                              {tone && <span className={`text-xs ${tone.color}`}>{tone.label}</span>}
                              {hasSrs && (
                                <span className={`text-xs ${srsTotal < 25 ? 'text-red-500' : 'text-emerald-600'}`}>
                                  SRS: {srsTotal}/28
                                </span>
                              )}
                              {sessionAnnotations.length > 0 && (
                                <span className="text-xs text-amber-600 flex items-center gap-0.5">
                                  <MessageSquare size={10} /> {sessionAnnotations.length}条批注
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" className="h-7 text-xs"
                              onClick={() => navigate(`/sessions/${session.id}`)}>
                              查看详情
                            </Button>
                            <button onClick={() => setExpandedSession(isExpanded ? null : session.id)}
                              className="text-muted-foreground hover:text-foreground transition-colors">
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                          </div>
                        </div>

                        {/* 折叠内容 */}
                        {isExpanded && (
                          <div className="border-t pt-3 space-y-3">
                            {session.emotionalState && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">情绪状态</p>
                                <p className="text-sm">{session.emotionalState}</p>
                              </div>
                            )}
                            {session.keyEvents && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">关键事件</p>
                                <p className="text-sm">{session.keyEvents}</p>
                              </div>
                            )}
                            {session.nextSteps && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">下次计划</p>
                                <p className="text-sm">{session.nextSteps}</p>
                              </div>
                            )}
                            {/* 四维心理特质评估摘要 */}
                            {session.dimensionScores !== null && session.dimensionScores !== undefined && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-2">四维评估</p>
                                <p className="text-xs text-muted-foreground">已记录</p>
                              </div>
                            )}
                            {/* 批注 */}
                            {sessionAnnotations.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-2">督导批注</p>
                                <div className="space-y-2">
                                  {sessionAnnotations.map(a => {
                                    const aType = ANNOTATION_TYPES[a.annotationType];
                                    return (
                                      <div key={a.id} className={`p-3 rounded-lg text-sm ${aType.cssClass}`}>
                                        <div className="flex items-center gap-1.5 mb-1">
                                          <span className="text-xs font-medium">{aType.icon} {aType.label}</span>
                                        </div>
                                        <p>{a.content}</p>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          {/* 会话级 AI 督导 */}
                          <div className="pt-1">
                            <p className="text-xs font-medium text-muted-foreground mb-2">AI 督导</p>
                            <SessionSupervisionButton sessionId={session.id} caseId={id} />
                          </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* 进展图表 */}
        <TabsContent value="progress" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">行为阶梯变化曲线</CardTitle>
            </CardHeader>
            <CardContent>
              {ladderChartData.length < 2 ? (
                <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">至少需要2次咨询记录才能显示曲线</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={ladderChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="ladderGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="oklch(0.38 0.09 200)" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="oklch(0.38 0.09 200)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.004 286.32)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 7]} ticks={[0, 1, 2, 3, 4, 5, 6, 7]} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [`Lv.${v}`, '行为阶梯']} />
                    <Area type="monotone" dataKey="level" stroke="oklch(0.38 0.09 200)" strokeWidth={2.5}
                      fill="url(#ladderGrad)" dot={{ fill: 'oklch(0.38 0.09 200)', r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

        </TabsContent>

        {/* 因子分析 */}
        <TabsContent value="factors" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">正负因子三维分析</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">X轴：来源系统（家庭/学校/同伴）· Y轴：正负程度 · Z轴：影响强度</p>
            </CardHeader>
            <CardContent>
              <FactorScatterPlot
                factors={(sessions ?? []).flatMap(s => (s.factors as Factor[] | null) ?? [])}
                width={480}
                height={360}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* 案例档案 */}
        <TabsContent value="profile" className="mt-4 space-y-4">
          {/* 个性化人格画像 */}
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain size={16} className="text-primary" />
                  <CardTitle className="text-sm font-semibold">个性化人格画像</CardTitle>
                  {caseData.personalityType && (
                    <Badge variant="outline" className="text-xs">
                      {PERSONALITY_TYPES[caseData.personalityType]?.label}
                    </Badge>
                  )}
                </div>
                {!profileEditing ? (
                  <Button size="sm" variant="outline" onClick={() => setProfileEditing(true)} className="h-7 text-xs gap-1">
                    <Plus size={12} /> 编辑画像
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setProfileEditing(false)} className="h-7 text-xs">取消</Button>
                    <Button size="sm" onClick={() => updateCaseMutation.mutate({ id, personalityProfile: profileData })} disabled={updateCaseMutation.isPending} className="h-7 text-xs gap-1">
                      <Save size={12} /> 保存
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 参考类型通用特征 */}
              {caseData.personalityType && PERSONALITY_PROFILES[caseData.personalityType] && (
                <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground border border-dashed">
                  <p className="font-medium text-foreground/70 mb-1">📖 {PERSONALITY_PROFILES[caseData.personalityType].title}通用特征参考</p>
                  <p className="leading-relaxed">{PERSONALITY_PROFILES[caseData.personalityType].strategy}</p>
                </div>
              )}

              {/* 六个填写维度 */}
              {([
                { key: 'coreTraits', label: '核心性格特点', placeholder: '描述这个孩子最突出的性格特点，如：完美主义、敏感、好胜心强…' },
                { key: 'motivationPoints', label: '核心动力点', placeholder: '什么最能激励这个孩子？什么是他/她在乎的？' },
                { key: 'effectiveStrategies', label: '有效激励方式', placeholder: '哪些方法对这个孩子有效？如：游戏化、竞争、被认可…' },
                { key: 'triggerPoints', label: '触发点 / 雷区', placeholder: '什么容易让孩子情绪崩溃或退缩？需要特别注意的点…' },
                { key: 'parentDynamics', label: '家长互动特点', placeholder: '家长与孩子的互动模式、家长的配合度、关键家长角色…' },
                { key: 'additionalNotes', label: '其他重要观察', placeholder: '咨询师的其他重要发现和洞察…' },
              ] as const).map(({ key, label, placeholder }) => (
                <div key={key}>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">{label}</p>
                  {profileEditing ? (
                    <Textarea
                      value={profileData[key]}
                      onChange={e => setProfileData(prev => ({ ...prev, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="text-sm min-h-[72px] resize-none"
                    />
                  ) : (
                    profileData[key] ? (
                      <p className="text-sm leading-relaxed bg-muted/30 rounded-md p-2.5">{profileData[key]}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground/50 italic p-2.5">{placeholder}</p>
                    )
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 初诊评估 */}
          {caseData.initialAssessment && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">初诊评估记录</CardTitle></CardHeader>
              <CardContent><p className="text-sm leading-relaxed">{caseData.initialAssessment}</p></CardContent>
            </Card>
          )}

          {/* 家庭系统互动结构 */}
          {(caseData.familySystem as Record<string, unknown>) && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">家庭系统互动结构</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(caseData.familySystem as any).map(([section, data]: any) => (
                    <div key={section} className="space-y-2">
                      {Object.entries(data).map(([key, value]: any) => value && (
                        <div key={key}>
                          <p className="text-xs font-medium text-muted-foreground capitalize">{key}</p>
                          <p className="text-sm mt-0.5">{String(value)}</p>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {caseData.notes && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">备注</CardTitle></CardHeader>
              <CardContent><p className="text-sm">{caseData.notes}</p></CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 督导批注 */}
        <TabsContent value="annotations" className="mt-4">
          <AnnotationPanel caseId={id} sessions={sessions ?? []} annotations={annotations ?? []} isAdmin={isAdmin} />
        </TabsContent>

        {/* AI 督导 Tab */}
        <TabsContent value="ai-supervision" className="mt-4">
          <AiSupervisionPanel caseId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
