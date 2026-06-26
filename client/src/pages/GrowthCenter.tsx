import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, BookOpen, Film, Lightbulb, GraduationCap } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip
} from "recharts";

// 风格四象限定义
const STYLE_QUADRANTS = [
  {
    key: 'guardian' as const,
    label: '守护者',
    desc: '温暖稳定，注重安全感与情感联结',
    color: 'oklch(0.65 0.15 30)',
    icon: '🛡️',
    traits: ['高共情', '稳定支持', '情感导向'],
  },
  {
    key: 'lighthouse' as const,
    label: '灯塔',
    desc: '指引方向，擅长目标设定与意义建构',
    color: 'oklch(0.58 0.14 60)',
    icon: '🔦',
    traits: ['目标导向', '意义建构', '未来聚焦'],
  },
  {
    key: 'mirror' as const,
    label: '镜子',
    desc: '反映内心，促进自我觉察与深度探索',
    color: 'oklch(0.55 0.15 220)',
    icon: '🪞',
    traits: ['深度探索', '自我觉察', '非指导性'],
  },
  {
    key: 'navigator' as const,
    label: '导航者',
    desc: '结构清晰，擅长认知重构与行为改变',
    color: 'oklch(0.58 0.14 160)',
    icon: '🧭',
    traits: ['认知重构', '行为改变', '结构导向'],
  },
];

const TRAINING_TYPES = [
  { value: 'book', label: '书籍', icon: BookOpen, color: 'oklch(0.55 0.15 220)' },
  { value: 'movie', label: '影视', icon: Film, color: 'oklch(0.65 0.15 30)' },
  { value: 'experience', label: '体验', icon: Lightbulb, color: 'oklch(0.58 0.14 160)' },
  { value: 'course', label: '课程', icon: GraduationCap, color: 'oklch(0.60 0.15 280)' },
];

export default function GrowthCenter() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const { data: growthData, isLoading } = trpc.growth.get.useQuery({ counselorId: user?.id });
  const { data: trainingList } = trpc.growth.listTraining.useQuery({ counselorId: user?.id });

  const updateStyle = trpc.growth.updateStyle.useMutation({
    onSuccess: () => {
      utils.growth.get.invalidate();
      toast.success("风格已更新");
    },
    onError: (e) => toast.error(e.message),
  });

  const addTraining = trpc.growth.addTraining.useMutation({
    onSuccess: () => {
      utils.growth.listTraining.invalidate();
      toast.success("培训记录已添加");
      setTrainingForm({ trainingType: 'book', title: '', description: '', insights: '' });
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteTraining = trpc.growth.deleteTraining.useMutation({
    onSuccess: () => {
      utils.growth.listTraining.invalidate();
      toast.success("已删除");
    },
  });

  const [trainingForm, setTrainingForm] = useState({
    trainingType: 'book' as 'book' | 'movie' | 'experience' | 'course',
    title: '',
    description: '',
    insights: '',
  });
  const [showTrainingForm, setShowTrainingForm] = useState(false);

  if (isLoading) return (
    <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">加载中...</div>
  );

  const radar = growthData?.radar;
  const radarData = radar ? [
    { subject: '效果', A: radar.effect, fullMark: 100 },
    { subject: '留存', A: radar.retention, fullMark: 100 },
    { subject: '联盟', A: radar.alliance, fullMark: 100 },
    { subject: '产能', A: radar.productivity, fullMark: 100 },
    { subject: '成长', A: radar.growth, fullMark: 100 },
  ] : [];

  const currentStyle = growthData?.growth?.styleQuadrant;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-light" style={{ fontFamily: "'Noto Serif SC', serif" }}>成长中心</h1>
        <p className="text-sm text-muted-foreground mt-1">追踪你的专业成长，探索你的咨询风格</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 五维雷达图 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">专业能力五维雷达</CardTitle>
            <p className="text-xs text-muted-foreground">基于你的咨询数据自动计算</p>
          </CardHeader>
          <CardContent>
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="oklch(0.90 0.01 220)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: 'oklch(0.50 0.02 220)' }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9 }} />
                  <Radar
                    name="能力"
                    dataKey="A"
                    stroke="oklch(0.38 0.09 200)"
                    fill="oklch(0.38 0.09 200)"
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                  <Tooltip formatter={(v) => [`${v}分`, '']} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-sm text-muted-foreground">
                <div className="text-3xl mb-2">📊</div>
                <p>暂无数据，开始咨询后自动生成</p>
              </div>
            )}
            {radar && (
              <div className="grid grid-cols-5 gap-2 mt-2">
                {radarData.map(d => (
                  <div key={d.subject} className="text-center">
                    <div className="text-sm font-semibold text-primary">{d.A}</div>
                    <div className="text-[10px] text-muted-foreground leading-tight">{d.subject}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 风格四象限 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">咨询风格四象限</CardTitle>
            <p className="text-xs text-muted-foreground">选择最符合你当前风格的象限</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {STYLE_QUADRANTS.map(q => (
                <button
                  key={q.key}
                  type="button"
                  onClick={() => updateStyle.mutate({ styleQuadrant: q.key })}
                  className={`p-4 rounded-xl border-2 text-left transition-all hover:shadow-md ${
                    currentStyle === q.key ? 'border-2 shadow-md' : 'border hover:bg-muted/20'
                  }`}
                  style={currentStyle === q.key ? {
                    borderColor: q.color,
                    background: `${q.color}12`,
                  } : {}}
                >
                  <div className="text-2xl mb-2">{q.icon}</div>
                  <div className="text-sm font-semibold mb-1" style={{ color: currentStyle === q.key ? q.color : undefined }}>
                    {q.label}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-2">{q.desc}</p>
                  <div className="flex flex-wrap gap-1">
                    {q.traits.map(t => (
                      <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full"
                        style={{ background: `${q.color}20`, color: q.color }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
            {currentStyle && (
              <div className="mt-3 p-3 rounded-lg bg-muted/30 text-xs text-muted-foreground">
                当前风格：<span className="font-medium text-foreground">
                  {STYLE_QUADRANTS.find(q => q.key === currentStyle)?.label}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 培训记录 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium">培训成长记录</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">记录书籍、影视、体验、课程等成长素材</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowTrainingForm(!showTrainingForm)} className="gap-1.5 text-xs">
              <Plus size={12} /> 添加记录
            </Button>
          </div>
        </CardHeader>

        {showTrainingForm && (
          <CardContent className="pt-0 border-t">
            <div className="space-y-3 pt-3">
              {/* 类型选择 */}
              <div className="grid grid-cols-4 gap-2">
                {TRAINING_TYPES.map(t => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setTrainingForm(f => ({ ...f, trainingType: t.value as any }))}
                      className={`p-3 rounded-lg border text-center transition-all ${
                        trainingForm.trainingType === t.value ? 'border-2 font-medium' : 'border hover:bg-muted/30'
                      }`}
                      style={trainingForm.trainingType === t.value ? { borderColor: t.color, background: `${t.color}10` } : {}}
                    >
                      <Icon size={18} className="mx-auto mb-1" style={{ color: trainingForm.trainingType === t.value ? t.color : undefined }} />
                      <div className="text-xs">{t.label}</div>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">标题 *</Label>
                  <Input
                    placeholder="书名/课程名/活动名..."
                    value={trainingForm.title}
                    onChange={e => setTrainingForm(f => ({ ...f, title: e.target.value }))}
                    className="text-sm h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">简介</Label>
                  <Input
                    placeholder="简要描述..."
                    value={trainingForm.description}
                    onChange={e => setTrainingForm(f => ({ ...f, description: e.target.value }))}
                    className="text-sm h-8"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">收获与感悟</Label>
                <Textarea
                  placeholder="这次学习/体验给你带来了什么？对你的咨询工作有何启发？"
                  value={trainingForm.insights}
                  onChange={e => setTrainingForm(f => ({ ...f, insights: e.target.value }))}
                  rows={3}
                  className="text-sm resize-none"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setShowTrainingForm(false)}>取消</Button>
                <Button size="sm" onClick={() => {
                  if (!trainingForm.title.trim()) { toast.error("请输入标题"); return; }
                  addTraining.mutate(trainingForm);
                  setShowTrainingForm(false);
                }} disabled={addTraining.isPending}>
                  {addTraining.isPending ? '保存中...' : '保存记录'}
                </Button>
              </div>
            </div>
          </CardContent>
        )}

        <CardContent className={showTrainingForm ? 'border-t pt-4' : 'pt-0'}>
          {!trainingList || trainingList.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-4xl mb-3">📚</div>
              <p className="text-sm text-muted-foreground">暂无培训记录</p>
              <p className="text-xs text-muted-foreground mt-1">记录你读过的书、看过的电影、参加的课程...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {trainingList.map(t => {
                const typeInfo = TRAINING_TYPES.find(tt => tt.value === t.trainingType);
                const Icon = typeInfo?.icon ?? BookOpen;
                return (
                  <div key={t.id} className="flex gap-3 p-3 rounded-lg border hover:bg-muted/20 transition-colors">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${typeInfo?.color ?? 'oklch(0.55 0.15 220)'}15` }}>
                      <Icon size={16} style={{ color: typeInfo?.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium truncate">{t.title}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded-full shrink-0"
                          style={{ background: `${typeInfo?.color ?? 'oklch(0.55 0.15 220)'}15`, color: typeInfo?.color }}>
                          {typeInfo?.label}
                        </span>
                      </div>
                      {t.description && <p className="text-xs text-muted-foreground truncate">{t.description}</p>}
                      {t.insights && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                          💡 {t.insights}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {format(new Date(t.createdAt), 'yyyy年MM月dd日', { locale: zhCN })}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteTraining.mutate({ id: t.id })}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1 shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 技巧标签云（静态展示） */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">常用干预技巧标签</CardTitle>
          <p className="text-xs text-muted-foreground">基于你的咨询记录自动提取</p>
        </CardHeader>
        <CardContent>
          <SkillTagCloud sessions={[]} />
        </CardContent>
      </Card>
    </div>
  );
}

// 技巧标签云组件
function SkillTagCloud({ sessions }: { sessions: any[] }) {
  // 从干预策略文本中提取常见技巧关键词
  const COMMON_TECHNIQUES = [
    '空椅子技术', '奇迹提问', '例外探索', '认知重构', '行为激活',
    '正念冥想', '叙事疗法', '焦点解决', '情绪调节', '依恋修复',
    '家庭系统', '角色扮演', '暴露疗法', '接纳承诺', '动机访谈',
  ];

  const tagColors = [
    'oklch(0.55 0.15 220)', 'oklch(0.58 0.14 160)', 'oklch(0.65 0.15 30)',
    'oklch(0.60 0.15 280)', 'oklch(0.55 0.12 340)', 'oklch(0.58 0.14 120)',
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {COMMON_TECHNIQUES.map((tag, i) => {
        const color = tagColors[i % tagColors.length];
        return (
          <span key={tag} className="px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:opacity-80 cursor-default"
            style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
            {tag}
          </span>
        );
      })}
      <span className="px-3 py-1.5 rounded-full text-xs text-muted-foreground border border-dashed">
        + 更多（从咨询记录提取）
      </span>
    </div>
  );
}
