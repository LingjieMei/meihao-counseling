import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { PERSONALITY_TYPES, LADDER_LEVELS, CASE_STATUS, GENDERS } from "@/lib/constants";
import { Plus, Search, Filter, ChevronRight } from "lucide-react";

export default function CaseList() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterLadder, setFilterLadder] = useState<string>("");

  const { data: cases, isLoading } = trpc.cases.list.useQuery({
    search: search || undefined,
    personalityType: filterType || undefined,
    status: filterStatus || undefined,
    ladderLevel: filterLadder ? Number(filterLadder) : undefined,
  });

  const isAdmin = user?.role === 'admin';

  return (
    <div className="p-6 space-y-5 animate-fade-in-up">
      {/* 页头 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light" style={{ fontFamily: "'Noto Serif SC', serif" }}>案例管理</h1>
          <p className="text-sm text-muted-foreground mt-1">共 {cases?.length ?? 0} 个案例</p>
        </div>
        <Button onClick={() => navigate('/cases/new')} className="gap-2">
          <Plus size={16} />
          新建案例
        </Button>
      </div>

      {/* 搜索和筛选 */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索孩子姓名..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-36 h-9 text-sm">
                <SelectValue placeholder="人格类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                {Object.entries(PERSONALITY_TYPES).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32 h-9 text-sm">
                <SelectValue placeholder="案例状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                {Object.entries(CASE_STATUS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterLadder} onValueChange={setFilterLadder}>
              <SelectTrigger className="w-36 h-9 text-sm">
                <SelectValue placeholder="行为阶梯" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部等级</SelectItem>
                {LADDER_LEVELS.map(l => (
                  <SelectItem key={l.level} value={String(l.level)}>Lv.{l.level} {l.label.split(' ')[1]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(filterType || filterStatus || filterLadder) && (
              <Button variant="ghost" size="sm" className="h-9 text-xs text-muted-foreground"
                onClick={() => { setFilterType(""); setFilterStatus(""); setFilterLadder(""); }}>
                清除筛选
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 案例列表 */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">加载中...</div>
      ) : cases?.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-4">📋</div>
          <p className="text-muted-foreground text-sm mb-4">暂无案例</p>
          <Button onClick={() => navigate('/cases/new')} variant="outline">创建第一个案例</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {cases?.map((c) => {
            const pType = c.personalityType ? PERSONALITY_TYPES[c.personalityType] : null;
            const status = CASE_STATUS[c.status];
            const ladder = LADDER_LEVELS[c.currentLadderLevel ?? 0];
            const improvement = (c.currentLadderLevel ?? 0) - (c.initialLadderLevel ?? 0);
            return (
              <Card
                key={c.id}
                className="cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
                onClick={() => navigate(`/cases/${c.id}`)}
              >
                <CardContent className="py-4 px-5">
                  <div className="flex items-center gap-4">
                    {/* 头像 */}
                    <div className="w-11 h-11 rounded-full flex items-center justify-center text-base font-semibold text-white shrink-0"
                      style={{ background: pType?.color ?? 'oklch(0.52 0.02 220)' }}>
                      {c.childName.charAt(0)}
                    </div>

                    {/* 基本信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{c.childName}</span>
                        {c.gender && <span className="text-xs text-muted-foreground">{GENDERS[c.gender]}</span>}
                        {c.age && <span className="text-xs text-muted-foreground">{c.age}岁</span>}
                        {c.grade && <span className="text-xs text-muted-foreground">{c.grade}</span>}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {pType && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pType.badgeClass}`}>
                            {pType.label}
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                    </div>

                    {/* 行为阶梯 */}
                    <div className="text-center shrink-0">
                      <div className="text-lg font-semibold" style={{ color: ladder.color }}>
                        Lv.{c.currentLadderLevel ?? 0}
                      </div>
                      <div className="text-xs text-muted-foreground">当前阶梯</div>
                      {improvement > 0 && (
                        <div className="text-xs text-emerald-600 mt-0.5">↑+{improvement}</div>
                      )}
                    </div>

                    <ChevronRight size={16} className="text-muted-foreground shrink-0" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
