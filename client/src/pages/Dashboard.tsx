import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { PERSONALITY_TYPES, LADDER_LEVELS, CASE_STATUS } from "@/lib/constants";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { Users, BookOpen, TrendingUp, Bell, Plus, ArrowRight } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { data: stats, isLoading } = trpc.stats.dashboard.useQuery();
  const { data: cases } = trpc.cases.list.useQuery({});

  const isAdmin = user?.role === 'admin';

  const typeChartData = stats ? [
    { name: '自尊型', value: stats.byType.self_esteem, color: 'oklch(0.65 0.15 30)' },
    { name: '关系型', value: stats.byType.relational, color: 'oklch(0.58 0.14 160)' },
    { name: '交换型', value: stats.byType.transactional, color: 'oklch(0.60 0.14 260)' },
    { name: '自驱型', value: stats.byType.self_driven, color: 'oklch(0.55 0.15 220)' },
  ] : [];

  // 行为阶梯分布
  const ladderDist = cases ? LADDER_LEVELS.map(l => ({
    name: `Lv.${l.level}`,
    count: cases.filter(c => c.currentLadderLevel === l.level).length,
    color: l.color,
  })) : [];

  const recentCases = cases?.slice(0, 5) ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground text-sm">加载中...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in-up">
      {/* 欢迎语 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light" style={{ fontFamily: "'Noto Serif SC', serif" }}>
            {isAdmin ? '督导工作台' : '咨询师工作台'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            欢迎回来，{user?.name ?? '用户'}
          </p>
        </div>
        <Button onClick={() => navigate('/cases/new')} className="gap-2">
          <Plus size={16} />
          新建案例
        </Button>
      </div>

      {/* 核心指标卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users size={20} />}
          label="案例总数"
          value={stats?.total ?? 0}
          sub={`进行中 ${stats?.active ?? 0}`}
          color="oklch(0.38 0.09 200)"
        />
        <StatCard
          icon={<BookOpen size={20} />}
          label="咨询总次数"
          value={stats?.totalSessions ?? 0}
          sub={`平均 ${stats?.avgSessions ?? 0} 次/案例`}
          color="oklch(0.58 0.14 160)"
        />
        <StatCard
          icon={<TrendingUp size={20} />}
          label="阶梯改善率"
          value={`${stats?.improvementRate ?? 0}%`}
          sub="行为阶梯有所提升"
          color="oklch(0.60 0.14 130)"
        />
        <StatCard
          icon={<Bell size={20} />}
          label="未读批注"
          value={stats?.unreadAnnotations ?? 0}
          sub="待查看的督导反馈"
          color="oklch(0.65 0.15 50)"
          highlight={(stats?.unreadAnnotations ?? 0) > 0}
        />
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 人格类型分布 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">人格类型分布</CardTitle>
          </CardHeader>
          <CardContent>
            {typeChartData.every(d => d.value === 0) ? (
              <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">暂无数据</div>
            ) : (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={typeChartData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                      {typeChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, n]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 flex-1">
                  {typeChartData.map((d) => (
                    <div key={d.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                        <span className="text-muted-foreground">{d.name}</span>
                      </div>
                      <span className="font-medium">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 行为阶梯分布 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">行为阶梯分布</CardTitle>
          </CardHeader>
          <CardContent>
            {ladderDist.every(d => d.count === 0) ? (
              <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">暂无数据</div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={ladderDist} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.004 286.32)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" name="案例数" radius={[3, 3, 0, 0]}>
                    {ladderDist.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 最近案例 */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">最近案例</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/cases')} className="gap-1 text-xs text-muted-foreground">
              查看全部 <ArrowRight size={12} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentCases.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <p>暂无案例</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate('/cases/new')}>
                创建第一个案例
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {recentCases.map((c) => {
                const pType = c.personalityType ? PERSONALITY_TYPES[c.personalityType] : null;
                const status = CASE_STATUS[c.status];
                const ladder = LADDER_LEVELS[c.currentLadderLevel ?? 0];
                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/cases/${c.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium"
                        style={{ background: pType?.color ?? 'oklch(0.90 0.01 220)', color: 'white' }}>
                        {c.childName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{c.childName}</p>
                        <p className="text-xs text-muted-foreground">{c.grade ?? '未填写年级'} · {c.age ? `${c.age}岁` : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {pType && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pType.badgeClass}`}>
                          {pType.label}
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${status.color}`}>
                        {status.label}
                      </span>
                      <span className="text-xs text-muted-foreground">Lv.{c.currentLadderLevel ?? 0}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color, highlight }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub: string;
  color: string;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? 'ring-2 ring-amber-300' : ''}>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className="text-2xl font-semibold" style={{ color }}>{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{sub}</p>
          </div>
          <div className="p-2 rounded-lg" style={{ background: `${color}15`, color }}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
