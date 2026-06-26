import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import { LADDER_LEVELS, EMOTIONAL_TONES, SRS_ITEMS } from "@/lib/constants";
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronUp, Upload, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { DimensionScores, Factor } from "@/lib/types";

interface Props { caseId: number; }

// 四维心理特质维度定义
const DIMENSIONS = [
  {
    key: 'selfAwareness' as const,
    label: '自我认知',
    color: 'oklch(0.55 0.15 220)',
    subItems: [
      { key: '自尊', desc: '对自身价值的认可程度' },
      { key: '自信', desc: '面对挑战时的信心水平' },
      { key: '自驱力', desc: '内在驱动与主动性' },
    ],
  },
  {
    key: 'socialFunctioning' as const,
    label: '社会功能',
    color: 'oklch(0.58 0.14 160)',
    subItems: [
      { key: '情绪成熟度', desc: '情绪识别与调节能力' },
      { key: '换位思考', desc: '理解他人视角的能力' },
      { key: '规则适应', desc: '对规则和边界的接受程度' },
    ],
  },
  {
    key: 'relationalSelf' as const,
    label: '关系自我',
    color: 'oklch(0.65 0.15 30)',
    subItems: [
      { key: '被爱感', desc: '感受到被爱和被重视的程度' },
      { key: '归属感', desc: '对家庭/群体的归属认同' },
      { key: '亲子关系质量', desc: '与父母关系的亲密度和安全感' },
    ],
  },
  {
    key: 'executiveSelf' as const,
    label: '执行自我',
    color: 'oklch(0.60 0.15 280)',
    subItems: [
      { key: '执行力', desc: '将计划付诸行动的能力' },
      { key: '计划性', desc: '目标设定与规划能力' },
      { key: '时间管理', desc: '时间分配与自律程度' },
    ],
  },
];

const FACTOR_SOURCES = [
  { value: 'family', label: '家庭' },
  { value: 'school', label: '学校' },
  { value: 'peers', label: '同伴' },
];

function ScoreButton({ value, selected, color, onClick }: { value: number; selected: boolean; color: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
        selected ? 'text-white shadow-sm' : 'border hover:bg-muted/50 text-foreground'
      }`}
      style={selected ? { background: color } : {}}
    >
      {value}
    </button>
  );
}

export default function SessionCreate({ caseId }: Props) {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const { data: caseData } = trpc.cases.get.useQuery({ id: caseId });

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [transcriptKey, setTranscriptKey] = useState<string | null>(null);

  const uploadAndAnalyzeMutation = trpc.voice.uploadAndAnalyzeTranscript.useMutation({
    onSuccess: (data) => {
      setForm(prev => ({
        ...prev,
        emotionalState: data.emotionalState || prev.emotionalState,
        emotionalTone: data.emotionalTone || prev.emotionalTone,
        ladderLevel: data.ladderLevel ?? prev.ladderLevel,
        keyEvents: data.keyEvents || prev.keyEvents,
        emotionalShifts: data.emotionalShifts || prev.emotionalShifts,
        strategyEvaluation: data.strategyEvaluation || prev.strategyEvaluation,
        nextSteps: data.nextSteps || prev.nextSteps,
      }));
      if (data.dimensionScores) {
        setDimensionScores(data.dimensionScores);
      }
      if (data.transcriptKey) {
        setTranscriptKey(data.transcriptKey);
      }
      toast.success("咨询记录分析完成，已自动填充内容");
      setIsAnalyzing(false);
    },
    onError: (err) => {
      toast.error("分析失败: " + err.message);
      setIsAnalyzing(false);
    }
  });

  const [form, setForm] = useState({
    sessionDate: new Date().toISOString().split('T')[0],
    emotionalState: "",
    emotionalTone: "" as "positive" | "neutral" | "negative" | "mixed" | "",
    parentFeedback: "",
    interventionStrategies: "",
    ladderLevel: 0,
    keyEvents: "",
    emotionalShifts: "",
    strategyEvaluation: "",
    nextSteps: "",
    srsMethod: 0,
    srsGoals: 0,
    srsContent: 0,
    srsOverall: 0,
    additionalNotes: "",
  });

  // 四维心理特质评分
  const [dimensionScores, setDimensionScores] = useState<DimensionScores>({});
  const [expandedDims, setExpandedDims] = useState<Set<string>>(new Set(['selfAwareness']));

  // 正负因子
  const [factors, setFactors] = useState<Factor[]>([]);
  const [newFactor, setNewFactor] = useState<Partial<Factor>>({
    source: 'family',
    positivity: 0,
    impact: 5,
  });

  const createSession = trpc.sessions.create.useMutation({
    onSuccess: () => {
      utils.sessions.listByCase.invalidate({ caseId });
      utils.cases.get.invalidate({ id: caseId });
      toast.success("咨询记录已保存");
      navigate(`/cases/${caseId}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createSession.mutate({
      caseId,
      sessionDate: new Date(form.sessionDate),
      emotionalState: form.emotionalState || undefined,
      emotionalTone: form.emotionalTone || undefined,
      parentFeedback: form.parentFeedback || undefined,
      interventionStrategies: form.interventionStrategies || undefined,
      ladderLevel: form.ladderLevel,
      dimensionScores: Object.keys(dimensionScores).length > 0 ? dimensionScores : undefined,
      factors: factors.length > 0 ? factors : undefined,
      keyEvents: form.keyEvents || undefined,
      emotionalShifts: form.emotionalShifts || undefined,
      strategyEvaluation: form.strategyEvaluation || undefined,
      nextSteps: form.nextSteps || undefined,
      srsMethod: form.srsMethod || undefined,
      srsGoals: form.srsGoals || undefined,
      srsContent: form.srsContent || undefined,
      srsOverall: form.srsOverall || undefined,
      additionalNotes: form.additionalNotes || undefined,
      transcriptKey: transcriptKey || undefined,
    });
  };

  const setSubScore = (dimKey: keyof DimensionScores, subKey: string, value: number) => {
    setDimensionScores(prev => ({
      ...prev,
      [dimKey]: {
        ...(prev[dimKey] ?? {}),
        [subKey]: value,
      },
    }));
  };

  const getSubScore = (dimKey: keyof DimensionScores, subKey: string): number => {
    return (dimensionScores[dimKey] as Record<string, number> | undefined)?.[subKey] ?? 0;
  };

  const addFactor = () => {
    if (!newFactor.name?.trim()) { toast.error("请输入因子名称"); return; }
    setFactors(prev => [...prev, {
      name: newFactor.name!,
      source: newFactor.source as 'family' | 'school' | 'peers',
      positivity: newFactor.positivity ?? 0,
      impact: newFactor.impact ?? 5,
    }]);
    setNewFactor({ source: 'family', positivity: 0, impact: 5 });
  };

  const removeFactor = (index: number) => {
    setFactors(prev => prev.filter((_, i) => i !== index));
  };

  const srsTotal = form.srsMethod + form.srsGoals + form.srsContent + form.srsOverall;
  const hasSrs = form.srsMethod > 0 || form.srsGoals > 0 || form.srsContent > 0 || form.srsOverall > 0;

  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const handleFileUploadWithName = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      setIsAnalyzing(true);
      uploadAndAnalyzeMutation.mutate({ text, fileName: file.name });
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5 animate-fade-in-up">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/cases/${caseId}`)} className="gap-1">
          <ArrowLeft size={14} /> 返回
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-light" style={{ fontFamily: "'Noto Serif SC', serif" }}>
            新增咨询记录
          </h1>
          {caseData && <p className="text-sm text-muted-foreground">案例：{caseData.childName}</p>}
        </div>
      </div>

      {/* 逐字稿上传区域 - 醒目卡片 */}
      <Card className="border-2 border-dashed border-primary/30 bg-primary/5 hover:border-primary/50 transition-colors">
        <CardContent className="p-5">
          <input
            type="file"
            id="transcript-upload"
            className="hidden"
            accept=".txt,.md,.json"
            onChange={handleFileUploadWithName}
            disabled={isAnalyzing}
          />
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              {isAnalyzing
                ? <Loader2 size={22} className="animate-spin text-primary" />
                : <Sparkles size={22} className="text-primary" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                {isAnalyzing ? 'AI 正在分析逐字稿…' : '上传咨询逐字稿，AI 自动填写记录'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {uploadedFileName && !isAnalyzing
                  ? <span className="text-primary font-medium">✓ 已上传：{uploadedFileName}，表单已自动填充</span>
                  : '支持 .txt / .md 格式，上传后 AI 将自动解析并填写下方所有字段'}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                type="button"
                variant="default"
                size="sm"
                className="gap-2"
                onClick={() => document.getElementById('transcript-upload')?.click()}
                disabled={isAnalyzing}
              >
                <Upload size={14} />
                {uploadedFileName ? '重新上传' : '选择文件'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 基本信息 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm">咨询日期</Label>
              <Input type="date" value={form.sessionDate}
                onChange={e => setForm(f => ({ ...f, sessionDate: e.target.value }))} className="w-48" />
            </div>
          </CardContent>
        </Card>

        {/* 行为阶梯评估 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">行为阶梯评估（0-7级）</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {LADDER_LEVELS.map((l) => (
                <button
                  key={l.level}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, ladderLevel: l.level }))}
                  className={`w-full p-3 rounded-lg border text-left transition-all duration-150 flex items-center gap-3 ${
                    form.ladderLevel === l.level ? 'border-2' : 'border hover:bg-muted/30'
                  }`}
                  style={form.ladderLevel === l.level ? { borderColor: l.color, background: `${l.color}10` } : {}}
                >
                  <span className="text-sm font-bold w-8 shrink-0" style={{ color: l.color }}>Lv.{l.level}</span>
                  <div>
                    <p className="text-sm font-medium">{l.label.split(' ').slice(1).join(' ')}</p>
                    <p className="text-xs text-muted-foreground">{l.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 情绪状态 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">情绪状态记录</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm">情绪基调</Label>
              <div className="flex gap-2">
                {Object.entries(EMOTIONAL_TONES).map(([k, v]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, emotionalTone: k as any }))}
                    className={`px-4 py-2 rounded-lg border text-sm transition-all ${
                      form.emotionalTone === k ? 'border-primary bg-primary/5 font-medium' : 'hover:bg-muted/30'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">情绪状态描述</Label>
              <Textarea placeholder="描述孩子本次咨询的情绪状态、情绪波动触发点、情绪调节方式..."
                value={form.emotionalState}
                onChange={e => setForm(f => ({ ...f, emotionalState: e.target.value }))}
                rows={3} className="text-sm resize-none" />
            </div>
          </CardContent>
        </Card>

        {/* 四维心理特质评估 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">四维心理特质评估</CardTitle>
              <span className="text-xs text-muted-foreground">1-5分，可选填</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {DIMENSIONS.map(dim => {
              const isExpanded = expandedDims.has(dim.key);
              return (
                <div key={dim.key} className="rounded-lg border overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedDims(prev => {
                      const next = new Set(prev);
                      if (next.has(dim.key)) next.delete(dim.key);
                      else next.add(dim.key);
                      return next;
                    })}
                    className="w-full flex items-center justify-between p-3 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: dim.color }} />
                      <span className="text-sm font-medium">{dim.label}</span>
                    </div>
                    {isExpanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                  </button>
                  {isExpanded && (
                    <div className="px-3 pb-3 space-y-3 border-t bg-muted/10">
                      {dim.subItems.map(sub => {
                        const score = getSubScore(dim.key, sub.key);
                        return (
                          <div key={sub.key} className="pt-3">
                            <div className="flex items-center justify-between mb-1.5">
                              <div>
                                <span className="text-sm font-medium">{sub.key}</span>
                                <p className="text-xs text-muted-foreground">{sub.desc}</p>
                              </div>
                              {score > 0 && (
                                <button type="button" onClick={() => setSubScore(dim.key, sub.key, 0)}
                                  className="text-xs text-muted-foreground hover:text-foreground">清除</button>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-muted-foreground w-8">弱</span>
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map(v => (
                                  <ScoreButton
                                    key={v}
                                    value={v}
                                    selected={score === v}
                                    color={dim.color}
                                    onClick={() => setSubScore(dim.key, sub.key, v)}
                                  />
                                ))}
                              </div>
                              <span className="text-xs text-muted-foreground">强</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* 正负因子录入 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">正负因子记录</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">记录影响孩子的正向/负向因素，来源于家庭、学校或同伴系统</p>

            {/* 已添加的因子 */}
            {factors.length > 0 && (
              <div className="space-y-2">
                {factors.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30 border">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${f.positivity > 0 ? 'bg-emerald-500' : f.positivity < 0 ? 'bg-red-400' : 'bg-gray-400'}`} />
                    <span className="text-sm flex-1 font-medium">{f.name}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {FACTOR_SOURCES.find(s => s.value === f.source)?.label}
                    </span>
                    <span className="text-xs font-medium w-8 text-center" style={{ color: f.positivity > 0 ? 'oklch(0.55 0.15 160)' : 'oklch(0.55 0.20 25)' }}>
                      {f.positivity > 0 ? '+' : ''}{f.positivity}
                    </span>
                    <span className="text-xs text-muted-foreground w-12">强度:{f.impact}</span>
                    <button type="button" onClick={() => removeFactor(i)}
                      className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* 添加新因子 */}
            <div className="rounded-lg border p-3 space-y-3">
              <p className="text-xs font-medium text-muted-foreground">添加新因子</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">因子名称</Label>
                  <Input
                    placeholder="例：父母争吵、老师表扬"
                    value={newFactor.name ?? ''}
                    onChange={e => setNewFactor(f => ({ ...f, name: e.target.value }))}
                    className="text-sm h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">来源系统</Label>
                  <div className="flex gap-1.5">
                    {FACTOR_SOURCES.map(s => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setNewFactor(f => ({ ...f, source: s.value as any }))}
                        className={`flex-1 py-1.5 rounded text-xs border transition-all ${
                          newFactor.source === s.value ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted/30'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">正负程度（-5 到 +5）</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-8">负向</span>
                    <input
                      type="range"
                      min={-5}
                      max={5}
                      step={1}
                      value={newFactor.positivity ?? 0}
                      onChange={e => setNewFactor(f => ({ ...f, positivity: Number(e.target.value) }))}
                      className="flex-1"
                    />
                    <span className="text-xs text-muted-foreground w-8">正向</span>
                    <span className="text-sm font-medium w-6 text-center"
                      style={{ color: (newFactor.positivity ?? 0) > 0 ? 'oklch(0.55 0.15 160)' : (newFactor.positivity ?? 0) < 0 ? 'oklch(0.55 0.20 25)' : undefined }}>
                      {(newFactor.positivity ?? 0) > 0 ? '+' : ''}{newFactor.positivity ?? 0}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">影响强度（1-10）</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-4">弱</span>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      step={1}
                      value={newFactor.impact ?? 5}
                      onChange={e => setNewFactor(f => ({ ...f, impact: Number(e.target.value) }))}
                      className="flex-1"
                    />
                    <span className="text-xs text-muted-foreground w-4">强</span>
                    <span className="text-sm font-medium w-4 text-center">{newFactor.impact ?? 5}</span>
                  </div>
                </div>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addFactor} className="gap-1.5 text-xs">
                <Plus size={12} /> 添加因子
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 复盘四要素 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">复盘评估（定性四要素）</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: 'keyEvents', label: '关键事件', placeholder: '咨询中的转折点、突破点或僵局。来访者说了什么让你印象最深的话？' },
              { key: 'emotionalShifts', label: '情绪变化', placeholder: '捕捉情绪的起伏与流动。何时兴奋？何时沉默？何时流泪？' },
              { key: 'strategyEvaluation', label: '策略评估', placeholder: '使用的干预技术是否有效？为何有效/无效？' },
              { key: 'nextSteps', label: '下次计划', placeholder: '基于本次反馈，下次咨询需要调整什么？需要准备什么？' },
            ].map(({ key, label, placeholder }) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-sm">{label}</Label>
                <Textarea placeholder={placeholder}
                  value={form[key as keyof typeof form] as string}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  rows={3} className="text-sm resize-none" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 家长反馈 & 干预策略 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">家长反馈与干预策略</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm">家长反馈</Label>
              <Textarea placeholder="家长对孩子本周状态的反馈、家长自身的情绪和配合度..."
                value={form.parentFeedback}
                onChange={e => setForm(f => ({ ...f, parentFeedback: e.target.value }))}
                rows={3} className="text-sm resize-none" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">本次使用的干预策略</Label>
              <Textarea placeholder="使用了哪些具体技术？如：空椅子、奇迹提问、例外探索、认知重构..."
                value={form.interventionStrategies}
                onChange={e => setForm(f => ({ ...f, interventionStrategies: e.target.value }))}
                rows={3} className="text-sm resize-none" />
            </div>
          </CardContent>
        </Card>

        {/* SRS量表 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">SRS 会谈满意度量表</CardTitle>
              <span className="text-xs text-muted-foreground">每项 0-7 分，满分 28 分</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {SRS_ITEMS.map((item) => (
              <div key={item.key} className="space-y-2">
                <div>
                  <Label className="text-sm">{item.label}</Label>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground w-12">不适合</span>
                  <div className="flex gap-1">
                    {[0, 1, 2, 3, 4, 5, 6, 7].map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, [item.key]: v }))}
                        className={`w-8 h-8 rounded text-xs font-medium transition-all ${
                          form[item.key as keyof typeof form] === v
                            ? 'text-white shadow-sm'
                            : 'border hover:bg-muted/50'
                        }`}
                        style={form[item.key as keyof typeof form] === v ? { background: 'oklch(0.38 0.09 200)' } : {}}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">非常适合</span>
                </div>
              </div>
            ))}
            {hasSrs && (
              <div className={`p-3 rounded-lg text-sm font-medium ${srsTotal < 25 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                总分：{srsTotal}/28
                {srsTotal < 25 && ' ⚠️ 低于预警线（25分），需在下次会谈开始时探讨'}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 其他备注 */}
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-1.5">
              <Label className="text-sm">其他备注</Label>
              <Textarea placeholder="其他需要记录的信息..."
                value={form.additionalNotes}
                onChange={e => setForm(f => ({ ...f, additionalNotes: e.target.value }))}
                rows={2} className="text-sm resize-none" />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end pb-6">
          <Button type="button" variant="outline" onClick={() => navigate(`/cases/${caseId}`)}>取消</Button>
          <Button type="submit" disabled={createSession.isPending} className="px-8">
            {createSession.isPending ? '保存中...' : '保存记录'}
          </Button>
        </div>
      </form>
    </div>
  );
}
