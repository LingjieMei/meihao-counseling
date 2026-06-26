import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { LADDER_LEVELS, EMOTIONAL_TONES, SRS_ITEMS } from "@/lib/constants";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import AnnotationPanel from "@/components/AnnotationPanel";
import { SessionSupervisionButton } from "@/components/AiSupervisionPanel";
import { Brain } from "lucide-react";

interface Props { id: number; }

// 四维心理特质维度定义
const DIMENSIONS = [
  {
    key: 'selfAwareness',
    label: '自我认知',
    color: 'oklch(0.55 0.15 220)',
    subItems: ['自尊', '自信', '自驱力'],
  },
  {
    key: 'socialFunctioning',
    label: '社会功能',
    color: 'oklch(0.58 0.14 160)',
    subItems: ['情绪成熟度', '换位思考', '规则适应'],
  },
  {
    key: 'relationalSelf',
    label: '关系自我',
    color: 'oklch(0.65 0.15 30)',
    subItems: ['被爱感', '归属感', '亲子关系质量'],
  },
  {
    key: 'executiveSelf',
    label: '执行自我',
    color: 'oklch(0.60 0.15 280)',
    subItems: ['执行力', '计划性', '时间管理'],
  },
];

// 因子来源标签
const FACTOR_SOURCES: Record<string, string> = {
  family: '家庭',
  school: '学校',
  peers: '同伴',
};

export default function SessionDetail({ id }: Props) {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const isAdmin = user?.role === 'admin';

  const { data: session, isLoading } = trpc.sessions.get.useQuery({ id });
  const { data: annotations } = trpc.annotations.listBySession.useQuery({ sessionId: id });

  if (isLoading) return <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">加载中...</div>;
  if (!session) return <div className="p-6 text-sm text-muted-foreground">记录不存在</div>;

  const ladder = LADDER_LEVELS[session.ladderLevel];
  const tone = session.emotionalTone ? EMOTIONAL_TONES[session.emotionalTone as keyof typeof EMOTIONAL_TONES] : null;
  const srsTotal = (session.srsMethod ?? 0) + (session.srsGoals ?? 0) + (session.srsContent ?? 0) + (session.srsOverall ?? 0);
  const hasSrs = session.srsMethod !== null && session.srsMethod !== undefined;

  // 四维评分数据
  const dimensionScores = session.dimensionScores as Record<string, Record<string, number>> | null;

  // 因子数据
  const factors = session.factors as Array<{
    name: string;
    source: string;
    positivity: number;
    impact: number;
  }> | null;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5 animate-fade-in-up">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/cases/${session.caseId}`)} className="gap-1">
          <ArrowLeft size={14} /> 返回案例
        </Button>
      </div>

      {/* 头部信息 */}
      <Card className="overflow-hidden">
        <div className="h-1.5" style={{ background: ladder.color }} />
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold mb-1">第 {session.sessionNumber} 次咨询记录</h1>
              <p className="text-sm text-muted-foreground">
                {format(new Date(session.sessionDate), 'yyyy年MM月dd日', { locale: zhCN })}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: ladder.color }}>Lv.{session.ladderLevel}</div>
                <div className="text-xs text-muted-foreground">行为阶梯</div>
              </div>
              {tone && (
                <div className="text-center">
                  <div className={`text-lg font-semibold ${tone.color}`}>{tone.label}</div>
                  <div className="text-xs text-muted-foreground">情绪基调</div>
                </div>
              )}
              {hasSrs && (
                <div className="text-center">
                  <div className={`text-2xl font-bold ${srsTotal < 25 ? 'text-red-500' : 'text-emerald-600'}`}>{srsTotal}</div>
                  <div className="text-xs text-muted-foreground">SRS总分</div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 四维心理特质评估 */}
      {dimensionScores && Object.keys(dimensionScores).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">四维心理特质评估</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {DIMENSIONS.map(dim => {
                const scores = dimensionScores[dim.key] ?? {};
                const hasScores = Object.keys(scores).length > 0;
                if (!hasScores) return null;
                return (
                  <div key={dim.key} className="rounded-lg p-3" style={{ background: `${dim.color}10`, border: `1px solid ${dim.color}30` }}>
                    <div className="text-xs font-semibold mb-2" style={{ color: dim.color }}>{dim.label}</div>
                    <div className="space-y-1.5">
                      {dim.subItems.map(sub => {
                        const score = scores[sub];
                        if (score === undefined) return null;
                        return (
                          <div key={sub} className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">{sub}</span>
                            <div className="flex items-center gap-1">
                              <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map(v => (
                                  <div key={v} className="w-2.5 h-2.5 rounded-sm"
                                    style={{ background: v <= score ? dim.color : 'oklch(0.90 0.01 220)' }} />
                                ))}
                              </div>
                              <span className="text-xs font-medium w-3 text-right">{score}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 正负因子 */}
      {factors && factors.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">正负因子记录</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {factors.map((factor, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${factor.positivity > 0 ? 'bg-emerald-500' : 'bg-red-400'}`} />
                  <span className="text-sm flex-1">{factor.name}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {FACTOR_SOURCES[factor.source] ?? factor.source}
                  </span>
                  <span className="text-xs font-medium" style={{ color: factor.positivity > 0 ? 'oklch(0.55 0.15 160)' : 'oklch(0.55 0.20 25)' }}>
                    {factor.positivity > 0 ? '+' : ''}{factor.positivity}
                  </span>
                  <span className="text-xs text-muted-foreground">强度:{factor.impact}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 复盘四要素 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">复盘评估</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { label: '情绪状态', value: session.emotionalState },
            { label: '关键事件', value: session.keyEvents },
            { label: '情绪变化', value: session.emotionalShifts },
            { label: '策略评估', value: session.strategyEvaluation },
            { label: '下次计划', value: session.nextSteps },
          ].filter(item => item.value).map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
              <p className="text-sm leading-relaxed">{value}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 家长反馈 & 干预策略 */}
      {(session.parentFeedback || session.interventionStrategies) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">家长反馈与干预策略</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {session.parentFeedback && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">家长反馈</p>
                <p className="text-sm leading-relaxed">{session.parentFeedback}</p>
              </div>
            )}
            {session.interventionStrategies && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">干预策略</p>
                <p className="text-sm leading-relaxed">{session.interventionStrategies}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* SRS量表 */}
      {hasSrs && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">SRS 会谈满意度量表</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {SRS_ITEMS.map(item => {
              const score = session[item.key as keyof typeof session] as number | null;
              return (
                <div key={item.key} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {[0, 1, 2, 3, 4, 5, 6, 7].map(v => (
                        <div key={v} className="w-4 h-4 rounded-sm"
                          style={{ background: score !== null && v <= (score ?? 0) ? 'oklch(0.38 0.09 200)' : 'oklch(0.90 0.01 220)' }} />
                      ))}
                    </div>
                    <span className="text-sm font-medium w-4">{score ?? '-'}</span>
                  </div>
                </div>
              );
            })}
            <div className={`p-2 rounded-lg text-sm font-medium text-center ${srsTotal < 25 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
              总分：{srsTotal}/28 {srsTotal < 25 ? '⚠️ 低于预警线' : '✓ 良好'}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 督导批注 */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">督导批注</CardTitle>
            {annotations && annotations.length > 0 && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{annotations.length}条</span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <AnnotationPanel
            caseId={session.caseId}
            sessions={[session as any]}
            annotations={annotations ?? []}
            isAdmin={isAdmin}
          />
        </CardContent>
      </Card>

      {/* 会话级 AI 督导 */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <Brain size={14} className="text-teal-600" /> AI 督导
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            基于案例背景与本次和询记录，运用方法论进行策略点评并给出下次建议
          </p>
          <SessionSupervisionButton sessionId={id} caseId={session.caseId} />
        </CardContent>
      </Card>
    </div>
  );
}
