import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Brain, ChevronDown, ChevronUp, Trash2, Loader2, Sparkles, AlertTriangle, Lightbulb, Target, Zap } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

// ── 常量映射 ──────────────────────────────────────────────────────────────────
const OBSTACLE_LABELS: Record<string, { label: string; color: string }> = {
  external: { label: "外部压制", color: "bg-blue-100 text-blue-700 border-blue-200" },
  internal: { label: "内部未发育", color: "bg-purple-100 text-purple-700 border-purple-200" },
  mixed: { label: "混合型", color: "bg-amber-100 text-amber-700 border-amber-200" },
};
const ENERGY_LABELS: Record<string, { label: string; color: string }> = {
  high: { label: "能量高", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  medium: { label: "能量中", color: "bg-amber-100 text-amber-700 border-amber-200" },
  low: { label: "能量低", color: "bg-red-100 text-red-700 border-red-200" },
};
const SCOPE_LABELS: Record<string, string> = {
  case: "案例级督导",
  session: "会话级督导",
};

// ── 单条督导记录展示 ───────────────────────────────────────────────────────────
function SupervisionCard({
  record,
  onDelete,
  canDelete,
}: {
  record: any;
  onDelete: (id: number) => void;
  canDelete: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const obstacle = record.axisObstacleSource ? OBSTACLE_LABELS[record.axisObstacleSource] : null;
  const energy = record.axisEnergyLevel ? ENERGY_LABELS[record.axisEnergyLevel] : null;
  const techniques: string[] = Array.isArray(record.recommendedTechniques)
    ? record.recommendedTechniques
    : [];
  const hasRisk =
    record.riskAlert && record.riskAlert !== "暂无明显风险信号" && record.riskAlert.trim() !== "";

  return (
    <Card className={`border transition-shadow hover:shadow-sm ${hasRisk ? "border-red-200" : ""}`}>
      <CardContent className="pt-4 pb-3">
        {/* 头部 */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs font-medium gap-1">
              <Brain size={10} />
              {SCOPE_LABELS[record.scope] ?? record.scope}
            </Badge>
            {obstacle && (
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${obstacle.color}`}>
                轴1 {obstacle.label}
              </span>
            )}
            {energy && (
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${energy.color}`}>
                轴3 {energy.label}
              </span>
            )}
            {hasRisk && (
              <span className="text-xs px-2 py-0.5 rounded-full border font-medium bg-red-50 text-red-600 border-red-200 flex items-center gap-1">
                <AlertTriangle size={10} /> 风险提示
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground">
              {format(new Date(record.createdAt), "MM/dd HH:mm", { locale: zhCN })}
            </span>
            {canDelete && (
              <button
                onClick={() => onDelete(record.id)}
                className="text-muted-foreground hover:text-red-500 transition-colors"
              >
                <Trash2 size={13} />
              </button>
            )}
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          </div>
        </div>

        {/* 摘要：轴2需求 + 推荐技术 */}
        {record.axisNeedStructure && (
          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
            <span className="font-medium text-foreground">轴2 需求：</span>
            {record.axisNeedStructure}
          </p>
        )}
        {techniques.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {techniques.map((t, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 font-medium">
                {t}
              </span>
            ))}
          </div>
        )}

        {/* 展开详情 */}
        {expanded && (
          <div className="border-t pt-3 mt-2 space-y-4">
            {/* 三轴详情 */}
            <div className="grid grid-cols-1 gap-3">
              {record.axisObstacleSourceDetail && (
                <div className="bg-blue-50/60 rounded-lg p-3">
                  <p className="text-xs font-semibold text-blue-700 mb-1 flex items-center gap-1">
                    <Target size={11} /> 轴1 阻碍来源分析
                  </p>
                  <p className="text-sm text-foreground">{record.axisObstacleSourceDetail}</p>
                </div>
              )}
              {record.axisNeedStructure && (
                <div className="bg-purple-50/60 rounded-lg p-3">
                  <p className="text-xs font-semibold text-purple-700 mb-1 flex items-center gap-1">
                    <Lightbulb size={11} /> 轴2 需求结构分析
                  </p>
                  <p className="text-sm text-foreground">{record.axisNeedStructure}</p>
                </div>
              )}
              {record.axisEnergyDetail && (
                <div className="bg-amber-50/60 rounded-lg p-3">
                  <p className="text-xs font-semibold text-amber-700 mb-1 flex items-center gap-1">
                    <Zap size={11} /> 轴3 能量审计
                  </p>
                  <p className="text-sm text-foreground">{record.axisEnergyDetail}</p>
                </div>
              )}
            </div>

            {/* 技术理由 */}
            {record.techniqueRationale && (
              <div>
                <p className="text-xs font-semibold text-teal-700 mb-1">推荐技术理由</p>
                <p className="text-sm text-foreground">{record.techniqueRationale}</p>
              </div>
            )}

            <Separator />

            {/* 督导建议 */}
            {record.supervisionAdvice && (
              <div>
                <p className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1">
                  <Brain size={11} /> 督导建议
                </p>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {record.supervisionAdvice}
                </p>
              </div>
            )}

            {/* 下次建议 */}
            {record.nextSessionSuggestion && (
              <div>
                <p className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1">
                  <Sparkles size={11} /> 下次咨询建议
                </p>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {record.nextSessionSuggestion}
                </p>
              </div>
            )}

            {/* 风险提示 */}
            {hasRisk && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-red-700 mb-1 flex items-center gap-1">
                  <AlertTriangle size={11} /> 风险提示
                </p>
                <p className="text-sm text-red-800 leading-relaxed whitespace-pre-wrap">
                  {record.riskAlert}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── 主组件：案例级 AI 督导 Tab ────────────────────────────────────────────────
export default function AiSupervisionPanel({ caseId }: { caseId: number }) {
  const utils = trpc.useUtils();

  const { data: records, isLoading } = trpc.supervision.listByCase.useQuery({ caseId });

  const superviseCaseMutation = trpc.supervision.superviseCase.useMutation({
    onSuccess: () => {
      toast.success("AI 督导报告已生成并保存");
      utils.supervision.listByCase.invalidate({ caseId });
    },
    onError: (err) => toast.error(`生成失败：${err.message}`),
  });

  const deleteMutation = trpc.supervision.delete.useMutation({
    onSuccess: () => {
      toast.success("已删除");
      utils.supervision.listByCase.invalidate({ caseId });
    },
    onError: () => toast.error("删除失败"),
  });

  const handleGenerate = () => {
    superviseCaseMutation.mutate({ caseId });
  };

  const handleDelete = (id: number) => {
    if (confirm("确认删除这条 AI 督导记录？")) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <div className="space-y-4">
      {/* 操作区 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">AI 督导（案例级）</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            基于案例档案与全部历史咨询记录，运用三轴判断框架生成结构化督导报告
          </p>
        </div>
        <Button
          size="sm"
          onClick={handleGenerate}
          disabled={superviseCaseMutation.isPending}
          className="gap-1.5"
        >
          {superviseCaseMutation.isPending ? (
            <>
              <Loader2 size={13} className="animate-spin" /> 生成中…
            </>
          ) : (
            <>
              <Brain size={13} /> 生成 AI 督导
            </>
          )}
        </Button>
      </div>

      {/* 生成中提示 */}
      {superviseCaseMutation.isPending && (
        <Card className="border-dashed border-teal-300 bg-teal-50/40">
          <CardContent className="py-6 flex flex-col items-center gap-2 text-center">
            <Loader2 size={22} className="animate-spin text-teal-600" />
            <p className="text-sm font-medium text-teal-700">AI 督导生成中，通常需要 10-20 秒…</p>
            <p className="text-xs text-teal-600">正在调用 DeepSeek 分析案例数据，请稍候</p>
          </CardContent>
        </Card>
      )}

      {/* 历史记录 */}
      {isLoading ? (
        <div className="text-center py-8 text-sm text-muted-foreground">加载中…</div>
      ) : records && records.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">共 {records.length} 条历史督导记录（最新在前）</p>
          {records.map((r) => (
            <SupervisionCard
              key={r.id}
              record={r}
              onDelete={handleDelete}
              canDelete={true}
            />
          ))}
        </div>
      ) : (
        !superviseCaseMutation.isPending && (
          <div className="text-center py-12">
            <Brain size={32} className="mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground mb-1">暂无 AI 督导记录</p>
            <p className="text-xs text-muted-foreground">点击「生成 AI 督导」获取基于方法论的结构化督导建议</p>
          </div>
        )
      )}
    </div>
  );
}

// ── 会话级 AI 督导按钮（嵌入时间线） ─────────────────────────────────────────
export function SessionSupervisionButton({
  sessionId,
  caseId,
}: {
  sessionId: number;
  caseId: number;
}) {
  const [showResult, setShowResult] = useState(false);
  const utils = trpc.useUtils();

  const { data: records } = trpc.supervision.listBySession.useQuery({ sessionId });

  const superviseMutation = trpc.supervision.superviseSession.useMutation({
    onSuccess: () => {
      toast.success("会话督导已生成");
      utils.supervision.listBySession.invalidate({ sessionId });
      setShowResult(true);
    },
    onError: (err) => toast.error(`生成失败：${err.message}`),
  });

  const deleteMutation = trpc.supervision.delete.useMutation({
    onSuccess: () => utils.supervision.listBySession.invalidate({ sessionId }),
    onError: () => toast.error("删除失败"),
  });

  const latestRecord = records?.[0];

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs gap-1 border-teal-200 text-teal-700 hover:bg-teal-50"
        onClick={() => superviseMutation.mutate({ sessionId })}
        disabled={superviseMutation.isPending}
      >
        {superviseMutation.isPending ? (
          <><Loader2 size={11} className="animate-spin" /> AI 督导中…</>
        ) : (
          <><Brain size={11} /> AI 督导</>
        )}
      </Button>

      {latestRecord && (showResult || records!.length > 0) && (
        <div className="mt-2">
          <SupervisionCard
            record={latestRecord}
            onDelete={(id) => deleteMutation.mutate({ id })}
            canDelete={true}
          />
        </div>
      )}
    </div>
  );
}
