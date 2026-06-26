import { useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Printer, Download } from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { LADDER_LEVELS, PERSONALITY_TYPES } from "@/lib/constants";
import type { Factor, DimensionScores } from "@/lib/types";

interface Props { caseId: number; }

// 四维维度标签
const DIMENSION_LABELS: Record<string, string> = {
  selfAwareness: '自我认知',
  socialFunctioning: '社会功能',
  relationalSelf: '关系自我',
  executiveSelf: '执行自我',
};

// 计算某维度的平均分
function calcDimAvg(scores: Record<string, number>): number {
  const vals = Object.values(scores).filter(v => v > 0);
  if (vals.length === 0) return 0;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

// 阶梯进展描述
function ladderProgressText(initial: number, current: number): string {
  const diff = current - initial;
  if (diff > 2) return `显著进步（提升 ${diff} 级）`;
  if (diff > 0) return `稳步进步（提升 ${diff} 级）`;
  if (diff === 0) return '保持稳定';
  return `需要关注（下降 ${Math.abs(diff)} 级）`;
}

// 生成家长友好的进展描述
function generateProgressSummary(sessions: any[]): string {
  if (sessions.length === 0) return '暂无咨询记录。';
  const latest = sessions[sessions.length - 1];
  const first = sessions[0];
  const ladderChange = latest.ladderLevel - first.ladderLevel;
  const parts: string[] = [];

  if (ladderChange > 0) {
    parts.push(`经过 ${sessions.length} 次咨询，孩子的行为表现有明显改善，整体进步了 ${ladderChange} 个层级。`);
  } else if (ladderChange === 0) {
    parts.push(`经过 ${sessions.length} 次咨询，孩子的状态保持稳定。`);
  } else {
    parts.push(`经过 ${sessions.length} 次咨询，孩子目前处于调整阶段，需要持续关注和支持。`);
  }

  if (latest.nextSteps) {
    parts.push(`下一阶段重点：${latest.nextSteps}`);
  }

  return parts.join(' ');
}

export default function ParentReport({ caseId }: Props) {
  const [, navigate] = useLocation();
  const printRef = useRef<HTMLDivElement>(null);

  const { data: caseData, isLoading: caseLoading } = trpc.cases.get.useQuery({ id: caseId });
  const { data: sessions, isLoading: sessionsLoading } = trpc.sessions.listByCase.useQuery({ caseId });

  const handlePrint = () => {
    window.print();
  };

  if (caseLoading || sessionsLoading) {
    return <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">生成报告中...</div>;
  }

  if (!caseData) return <div className="p-6 text-sm text-muted-foreground">案例不存在</div>;

  const pType = caseData.personalityType ? PERSONALITY_TYPES[caseData.personalityType] : null;
  const initialLevel = caseData.initialLadderLevel ?? 0;
  const currentLevel = caseData.currentLadderLevel ?? 0;
  const initialLadder = LADDER_LEVELS[initialLevel];
  const currentLadder = LADDER_LEVELS[currentLevel];
  const progressText = ladderProgressText(initialLevel, currentLevel);
  const progressSummary = generateProgressSummary(sessions ?? []);

  // 聚合所有因子
  const allFactors: Factor[] = (sessions ?? []).flatMap(s => (s.factors as Factor[] | null) ?? []);
  const posFactors = allFactors.filter(f => f.positivity > 0);
  const negFactors = allFactors.filter(f => f.positivity < 0);

  // 最新一次四维评分
  const latestSession = sessions && sessions.length > 0 ? sessions[sessions.length - 1] : null;
  const dimScores = latestSession?.dimensionScores as DimensionScores | null;

  // 报告日期
  const reportDate = format(new Date(), 'yyyy年MM月dd日', { locale: zhCN });

  return (
    <div>
      {/* 打印控制栏（不打印） */}
      <div className="no-print p-4 border-b flex items-center gap-3 bg-background sticky top-0 z-10">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/cases/${caseId}`)} className="gap-1">
          <ArrowLeft size={14} /> 返回案例
        </Button>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
          <Printer size={14} /> 打印 / 导出PDF
        </Button>
      </div>

      {/* 报告正文 */}
      <div ref={printRef} className="report-container max-w-2xl mx-auto p-8 space-y-8">
        {/* 页眉 */}
        <div className="flex items-start justify-between border-b pb-6">
          <div>
            <div className="text-2xl font-semibold" style={{ fontFamily: "'Noto Serif SC', serif", color: 'oklch(0.38 0.09 200)' }}>
              美好心理
            </div>
            <div className="text-sm text-gray-500 mt-1">专业儿童心理咨询 · 成长陪伴</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-gray-700">成长报告</div>
            <div className="text-xs text-gray-400 mt-1">{reportDate}</div>
          </div>
        </div>

        {/* 孩子信息（脱敏：只显示年龄、年级，不显示姓名） */}
        <div>
          <h2 className="text-base font-semibold text-gray-800 mb-3">基本信息</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-400 mb-1">年龄</div>
              <div className="text-sm font-medium">{caseData.age ? `${caseData.age}岁` : '未记录'}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-400 mb-1">年级</div>
              <div className="text-sm font-medium">{caseData.grade ?? '未记录'}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-400 mb-1">咨询次数</div>
              <div className="text-sm font-medium">{sessions?.length ?? 0}次</div>
            </div>
          </div>
        </div>

        {/* 行为阶梯进展 */}
        <div>
          <h2 className="text-base font-semibold text-gray-800 mb-3">行为成长进展</h2>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 rounded-lg p-4 text-center border"
              style={{ borderColor: `${initialLadder.color}40`, background: `${initialLadder.color}08` }}>
              <div className="text-xs text-gray-400 mb-1">初始状态</div>
              <div className="text-lg font-bold" style={{ color: initialLadder.color }}>Lv.{initialLevel}</div>
              <div className="text-xs text-gray-600 mt-1">{initialLadder.label}</div>
            </div>
            <div className="text-2xl text-gray-300">→</div>
            <div className="flex-1 rounded-lg p-4 text-center border"
              style={{ borderColor: `${currentLadder.color}40`, background: `${currentLadder.color}08` }}>
              <div className="text-xs text-gray-400 mb-1">当前状态</div>
              <div className="text-lg font-bold" style={{ color: currentLadder.color }}>Lv.{currentLevel}</div>
              <div className="text-xs text-gray-600 mt-1">{currentLadder.label}</div>
            </div>
          </div>
          <div className="rounded-lg p-3 text-sm text-center font-medium"
            style={{
              background: currentLevel >= initialLevel ? 'oklch(0.97 0.03 160)' : 'oklch(0.97 0.02 25)',
              color: currentLevel >= initialLevel ? 'oklch(0.45 0.15 160)' : 'oklch(0.50 0.18 25)',
            }}>
            {progressText}
          </div>
        </div>

        {/* 综合进展描述 */}
        <div>
          <h2 className="text-base font-semibold text-gray-800 mb-3">咨询总结</h2>
          <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-lg p-4">
            {progressSummary}
          </p>
        </div>

        {/* 四维心理特质（最新评估） */}
        {dimScores && Object.keys(dimScores).length > 0 && (
          <div>
            <h2 className="text-base font-semibold text-gray-800 mb-3">心理特质评估（最新）</h2>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(dimScores).map(([dimKey, subScores]) => {
                if (!subScores || typeof subScores !== 'object') return null;
                const avg = calcDimAvg(subScores as Record<string, number>);
                if (avg === 0) return null;
                return (
                  <div key={dimKey} className="rounded-lg p-3 border bg-gray-50">
                    <div className="text-xs font-semibold text-gray-500 mb-2">
                      {DIMENSION_LABELS[dimKey] ?? dimKey}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(v => (
                          <div key={v} className="w-4 h-4 rounded-sm"
                            style={{ background: v <= avg ? 'oklch(0.38 0.09 200)' : 'oklch(0.90 0.01 220)' }} />
                        ))}
                      </div>
                      <span className="text-sm font-medium">{avg}/5</span>
                    </div>
                    <div className="mt-2 space-y-0.5">
                      {Object.entries(subScores as Record<string, number>).map(([sub, score]) => (
                        <div key={sub} className="flex justify-between text-xs text-gray-500">
                          <span>{sub}</span>
                          <span className="font-medium">{score}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 正向因子 */}
        {posFactors.length > 0 && (
          <div>
            <h2 className="text-base font-semibold text-gray-800 mb-3">正向支持因素</h2>
            <p className="text-xs text-gray-400 mb-2">以下因素对孩子的成长有积极影响，请继续保持和强化：</p>
            <div className="space-y-2">
              {posFactors.slice(0, 5).map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-gray-700">{f.name}</span>
                  <span className="text-xs text-gray-400 ml-auto">
                    {f.source === 'family' ? '家庭' : f.source === 'school' ? '学校' : '同伴'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 需关注因子 */}
        {negFactors.length > 0 && (
          <div>
            <h2 className="text-base font-semibold text-gray-800 mb-3">需要关注的因素</h2>
            <p className="text-xs text-gray-400 mb-2">以下因素可能对孩子造成一定压力，建议家长重点关注：</p>
            <div className="space-y-2">
              {negFactors.slice(0, 5).map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  <span className="text-gray-700">{f.name}</span>
                  <span className="text-xs text-gray-400 ml-auto">
                    {f.source === 'family' ? '家庭' : f.source === 'school' ? '学校' : '同伴'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 家长建议 */}
        <div>
          <h2 className="text-base font-semibold text-gray-800 mb-3">家长配合建议</h2>
          <div className="space-y-2">
            {[
              '保持规律的家庭作息，为孩子提供稳定的生活环境',
              '多给予孩子正向反馈，关注进步而非只关注问题',
              '保持与咨询师的沟通，及时反馈孩子在家的变化',
              '避免在孩子面前讨论咨询内容，保护孩子的隐私',
              '如发现孩子情绪有明显波动，请及时联系咨询师',
            ].map((tip, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-gray-300 shrink-0 mt-0.5">{i + 1}.</span>
                <span>{tip}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 页脚 */}
        <div className="border-t pt-6 flex items-center justify-between text-xs text-gray-400">
          <span>美好心理 · 专业儿童心理咨询</span>
          <span>本报告仅供家长参考，请勿对外传播</span>
        </div>
      </div>

      {/* 打印样式 */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .report-container { max-width: 100% !important; padding: 20px !important; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}
