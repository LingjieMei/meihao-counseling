import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import { PERSONALITY_TYPES, LADDER_LEVELS, PERSONALITY_PROFILES } from "@/lib/constants";
import { ArrowLeft, ChevronRight, Sparkles, Upload, FileText, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useRef } from "react";

export default function CaseCreate() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const [form, setForm] = useState({
    childName: "",
    age: "",
    grade: "",
    gender: "" as "male" | "female" | "other" | "",
    personalityType: "" as keyof typeof PERSONALITY_TYPES | "",
    initialAssessment: "",
    initialLadderLevel: "0",
    notes: "",
    familySystem: {
      internal: { childIssues: "", parentIssues: "", parentStrengths: "" },
      external: { schoolIssues: "", peerIssues: "" },
      dynamics: { mainConflict: "", parentChildRelation: "" },
    },
  });

  // 逐字稿上传与 AI 解析状态
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [transcriptKey, setTranscriptKey] = useState<string | null>(null);

  const analyzeCaseMutation = trpc.voice.uploadAndAnalyzeCaseTranscript.useMutation({
    onSuccess: (data) => {
      setForm(f => ({
        ...f,
        childName: data.childName || f.childName,
        age: data.age ? String(data.age) : f.age,
        grade: data.grade || f.grade,
        gender: (data.gender as any) || f.gender,
        personalityType: (data.personalityType as any) || f.personalityType,
        initialAssessment: data.initialAssessment || f.initialAssessment,
        initialLadderLevel: String(data.initialLadderLevel ?? f.initialLadderLevel),
        familySystem: {
          internal: {
            childIssues: data.familySystem?.internal?.childIssues || f.familySystem.internal.childIssues,
            parentIssues: data.familySystem?.internal?.parentIssues || f.familySystem.internal.parentIssues,
            parentStrengths: data.familySystem?.internal?.parentStrengths || f.familySystem.internal.parentStrengths,
          },
          external: {
            schoolIssues: data.familySystem?.external?.schoolIssues || f.familySystem.external.schoolIssues,
            peerIssues: data.familySystem?.external?.peerIssues || f.familySystem.external.peerIssues,
          },
          dynamics: {
            mainConflict: data.familySystem?.dynamics?.mainConflict || f.familySystem.dynamics.mainConflict,
            parentChildRelation: data.familySystem?.dynamics?.parentChildRelation || f.familySystem.dynamics.parentChildRelation,
          },
        },
      }));
      setTranscriptKey(data.transcriptKey ?? null);
      toast.success("AI 已自动填写案例信息，请核对后提交");
    },
    onError: (e) => toast.error(e.message || "AI 解析失败，请重试"),
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text || !text.trim()) {
        toast.error("文件内容为空");
        return;
      }
      setUploadedFileName(file.name);
      analyzeCaseMutation.mutate({ text, fileName: file.name });
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const createCase = trpc.cases.create.useMutation({
    onSuccess: () => {
      utils.cases.list.invalidate();
      toast.success("案例创建成功");
      navigate("/cases");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.childName.trim()) { toast.error("请填写孩子姓名"); return; }
    createCase.mutate({
      childName: form.childName,
      age: form.age ? Number(form.age) : undefined,
      grade: form.grade || undefined,
      gender: form.gender || undefined,
      personalityType: form.personalityType || undefined,
      initialAssessment: form.initialAssessment || undefined,
      initialLadderLevel: Number(form.initialLadderLevel),
      notes: form.notes || undefined,
      familySystem: form.familySystem,
      transcriptKey: transcriptKey || undefined,
    });
  };

  const selectedProfile = form.personalityType ? PERSONALITY_PROFILES[form.personalityType] : null;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 animate-fade-in-up">
      {/* 页头 */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/cases')} className="gap-1">
          <ArrowLeft size={14} /> 返回
        </Button>
        <div>
          <h1 className="text-xl font-light" style={{ fontFamily: "'Noto Serif SC', serif" }}>新建案例档案</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* AI 上传逐字稿自动填写 */}
        <div
          className="rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-5 transition-colors hover:border-primary/60"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles size={20} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" style={{ fontFamily: "'Noto Serif SC', serif" }}>
                上传初诊逐字稿，AI 自动建档
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                上传初诊访谈的文字记录（.txt 文本），AI 将自动识别孩子信息、人格类型、行为阶梯及家庭系统结构并填入下方表单，您核对后即可提交。
              </p>

              {uploadedFileName && !analyzeCaseMutation.isPending && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600">
                  <CheckCircle2 size={14} />
                  <span className="truncate">已解析：{uploadedFileName}</span>
                </div>
              )}

              <div className="mt-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,text/plain"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="default"
                  disabled={analyzeCaseMutation.isPending}
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-1.5"
                >
                  {analyzeCaseMutation.isPending ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> AI 解析中...
                    </>
                  ) : (
                    <>
                      <Upload size={14} /> {uploadedFileName ? "重新上传" : "选择逐字稿文件"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* 基本信息 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm">孩子姓名 <span className="text-destructive">*</span></Label>
                <Input placeholder="请输入姓名" value={form.childName}
                  onChange={e => setForm(f => ({ ...f, childName: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">性别</Label>
                <Select value={form.gender} onValueChange={v => setForm(f => ({ ...f, gender: v as any }))}>
                  <SelectTrigger><SelectValue placeholder="选择性别" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">男</SelectItem>
                    <SelectItem value="female">女</SelectItem>
                    <SelectItem value="other">其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">年龄</Label>
                <Input type="number" placeholder="岁" min={3} max={25} value={form.age}
                  onChange={e => setForm(f => ({ ...f, age: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">年级</Label>
                <Input placeholder="如：初二、高一" value={form.grade}
                  onChange={e => setForm(f => ({ ...f, grade: e.target.value }))} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 人格类型评估 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">人格类型诊断</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(PERSONALITY_TYPES).map(([k, v]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, personalityType: k as any }))}
                  className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                    form.personalityType === k ? 'border-current shadow-sm' : 'border-border hover:border-muted-foreground/30'
                  }`}
                  style={form.personalityType === k ? { borderColor: v.color, background: `${v.color}08` } : {}}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${v.badgeClass}`}>{v.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{v.desc}</p>
                </button>
              ))}
            </div>

            {selectedProfile && (
              <div className="p-4 rounded-xl bg-muted/50 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">典型特征参考</p>
                <ul className="space-y-1">
                  {selectedProfile.characteristics.slice(0, 3).map((c, i) => (
                    <li key={i} className="text-xs text-foreground flex items-start gap-1.5">
                      <span className="text-muted-foreground mt-0.5">·</span> {c}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground border-t pt-2 mt-2">
                  <span className="font-medium">干预策略：</span>{selectedProfile.strategy}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 初始行为阶梯 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">初始行为阶梯评估</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {LADDER_LEVELS.map((l) => (
                <button
                  key={l.level}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, initialLadderLevel: String(l.level) }))}
                  className={`w-full p-3 rounded-lg border text-left transition-all duration-150 flex items-center gap-3 ${
                    form.initialLadderLevel === String(l.level) ? 'border-2' : 'border hover:bg-muted/30'
                  }`}
                  style={form.initialLadderLevel === String(l.level) ? { borderColor: l.color, background: `${l.color}10` } : {}}
                >
                  <span className="text-sm font-semibold w-8 shrink-0" style={{ color: l.color }}>Lv.{l.level}</span>
                  <div>
                    <p className="text-sm font-medium">{l.label.split(' ').slice(1).join(' ')}</p>
                    <p className="text-xs text-muted-foreground">{l.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 初诊评估 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">初诊评估记录</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm">初诊评估摘要</Label>
              <Textarea
                placeholder="记录初诊时对孩子情况的综合评估，包括主诉问题、行为表现、情绪状态等..."
                value={form.initialAssessment}
                onChange={e => setForm(f => ({ ...f, initialAssessment: e.target.value }))}
                rows={4}
                className="text-sm resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* 家庭系统互动结构 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">家庭系统互动结构</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm">内部系统 · 孩子问题点</Label>
                <Textarea placeholder="孩子自身的主要问题和困境..." rows={3} className="text-sm resize-none"
                  value={form.familySystem.internal.childIssues}
                  onChange={e => setForm(f => ({ ...f, familySystem: { ...f.familySystem, internal: { ...f.familySystem.internal, childIssues: e.target.value } } }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">内部系统 · 家长问题点</Label>
                <Textarea placeholder="家长的养育方式、情绪状态、配合度..." rows={3} className="text-sm resize-none"
                  value={form.familySystem.internal.parentIssues}
                  onChange={e => setForm(f => ({ ...f, familySystem: { ...f.familySystem, internal: { ...f.familySystem.internal, parentIssues: e.target.value } } }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">外部系统 · 学校/老师</Label>
                <Textarea placeholder="学校环境、师生关系、学业压力..." rows={3} className="text-sm resize-none"
                  value={form.familySystem.external.schoolIssues}
                  onChange={e => setForm(f => ({ ...f, familySystem: { ...f.familySystem, external: { ...f.familySystem.external, schoolIssues: e.target.value } } }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">外部系统 · 同学关系</Label>
                <Textarea placeholder="同伴关系、社交状况、是否有排斥..." rows={3} className="text-sm resize-none"
                  value={form.familySystem.external.peerIssues}
                  onChange={e => setForm(f => ({ ...f, familySystem: { ...f.familySystem, external: { ...f.familySystem.external, peerIssues: e.target.value } } }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">主要冲突与动力分析</Label>
              <Textarea placeholder="系统间的主要矛盾、冲突点，以及可利用的积极资源..." rows={3} className="text-sm resize-none"
                value={form.familySystem.dynamics.mainConflict}
                onChange={e => setForm(f => ({ ...f, familySystem: { ...f.familySystem, dynamics: { ...f.familySystem.dynamics, mainConflict: e.target.value } } }))} />
            </div>
          </CardContent>
        </Card>

        {/* 备注 */}
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-1.5">
              <Label className="text-sm">其他备注</Label>
              <Textarea placeholder="其他需要记录的信息..." rows={2} className="text-sm resize-none"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </CardContent>
        </Card>

        {/* 提交 */}
        <div className="flex gap-3 justify-end pb-6">
          <Button type="button" variant="outline" onClick={() => navigate('/cases')}>取消</Button>
          <Button type="submit" disabled={createCase.isPending} className="px-8">
            {createCase.isPending ? '创建中...' : '创建案例'}
          </Button>
        </div>
      </form>
    </div>
  );
}
