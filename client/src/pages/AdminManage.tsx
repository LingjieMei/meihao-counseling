import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, KeyRound, FolderOpen, Eye, EyeOff, Users, ShieldCheck, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { useLocation } from "wouter";

export default function AdminManage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  // 只有督导可以访问
  if (user?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-sm text-muted-foreground gap-2">
        <ShieldCheck size={32} className="text-muted-foreground/30" />
        <p>仅督导可访问此页面</p>
      </div>
    );
  }

  const { data: counselors, isLoading } = trpc.counselor.list.useQuery();
  const { data: allCases } = trpc.cases.list.useQuery(undefined);

  // 创建账号弹窗
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', phone: '', password: '' });
  const [showCreatePwd, setShowCreatePwd] = useState(false);

  // 重置密码弹窗
  const [resetTarget, setResetTarget] = useState<{ id: number; name: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPwd, setShowNewPwd] = useState(false);

  const createMutation = trpc.counselor.create.useMutation({
    onSuccess: () => {
      utils.counselor.list.invalidate();
      toast.success("咨询师账号已创建");
      setShowCreate(false);
      setCreateForm({ name: '', phone: '', password: '' });
    },
    onError: (e) => toast.error(e.message),
  });

  const resetPasswordMutation = trpc.counselor.changePassword.useMutation({
    onSuccess: () => {
      toast.success("密码已重置");
      setResetTarget(null);
      setNewPassword('');
    },
    onError: (e) => toast.error(e.message),
  });

  // 按咨询师统计案例数
  const caseCountByCounselor = (counselorId: number) =>
    (allCases ?? []).filter(c => c.counselorId === counselorId).length;

  const activeCaseCount = (counselorId: number) =>
    (allCases ?? []).filter(c => c.counselorId === counselorId && c.status === 'active').length;

  const avgLadder = (counselorId: number) => {
    const myCases = (allCases ?? []).filter(c => c.counselorId === counselorId);
    if (myCases.length === 0) return null;
    const improved = myCases.filter(c => (c.currentLadderLevel ?? 0) > (c.initialLadderLevel ?? 0)).length;
    return Math.round((improved / myCases.length) * 100);
  };

  // 只显示咨询师（非admin）
  const counselorList = (counselors ?? []).filter(c => c.role !== 'admin');
  const adminList = (counselors ?? []).filter(c => c.role === 'admin');

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* 页头 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light" style={{ fontFamily: "'Noto Serif SC', serif" }}>
            团队管理
          </h1>
          <p className="text-sm text-muted-foreground mt-1">管理咨询师账号，查看团队整体运营情况</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-1.5">
          <Plus size={14} /> 添加咨询师
        </Button>
      </div>

      {/* 团队概览数字 */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: '咨询师人数', value: counselorList.length, icon: Users, color: 'oklch(0.55 0.15 220)' },
          { label: '进行中案例', value: (allCases ?? []).filter(c => c.status === 'active').length, icon: FolderOpen, color: 'oklch(0.58 0.14 160)' },
          { label: '总案例数', value: (allCases ?? []).length, icon: TrendingUp, color: 'oklch(0.65 0.15 30)' },
          {
            label: '整体改善率',
            value: (() => {
              const total = (allCases ?? []).length;
              if (total === 0) return '—';
              const improved = (allCases ?? []).filter(c => (c.currentLadderLevel ?? 0) > (c.initialLadderLevel ?? 0)).length;
              return `${Math.round((improved / total) * 100)}%`;
            })(),
            icon: TrendingUp,
            color: 'oklch(0.60 0.15 280)',
          },
        ].map(item => {
          const Icon = item.icon;
          return (
            <Card key={item.label}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${item.color}15` }}>
                    <Icon size={16} style={{ color: item.color }} />
                  </div>
                  <div>
                    <div className="text-xl font-semibold leading-none">{item.value}</div>
                    <div className="text-xs text-muted-foreground mt-1">{item.label}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 咨询师列表 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users size={14} />
            咨询师列表
            <Badge variant="secondary" className="text-xs">{counselorList.length} 人</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-sm text-muted-foreground">加载中...</div>
          ) : counselorList.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">👥</div>
              <p className="text-sm text-muted-foreground">暂无咨询师账号</p>
              <p className="text-xs text-muted-foreground mt-1">点击右上角"添加咨询师"创建第一个账号</p>
              <Button className="mt-4 gap-1.5" size="sm" onClick={() => setShowCreate(true)}>
                <Plus size={12} /> 添加咨询师
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {counselorList.map(c => {
                const total = caseCountByCounselor(c.id);
                const active = activeCaseCount(c.id);
                const improvement = avgLadder(c.id);
                return (
                  <div key={c.id}
                    className="flex items-center gap-4 p-4 rounded-xl border hover:bg-muted/30 transition-colors">
                    {/* 头像 */}
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback className="text-sm font-medium text-white"
                        style={{ background: 'oklch(0.55 0.15 220)' }}>
                        {c.name?.charAt(0) ?? '?'}
                      </AvatarFallback>
                    </Avatar>

                    {/* 基本信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium">{c.name ?? '未命名'}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">咨询师</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {c.phone ?? '未设置手机号'} · 加入于 {format(new Date(c.createdAt), 'yyyy年MM月', { locale: zhCN })}
                      </div>
                    </div>

                    {/* 案例统计 */}
                    <div className="flex items-center gap-6 shrink-0">
                      <div className="text-center">
                        <div className="text-lg font-semibold">{total}</div>
                        <div className="text-[10px] text-muted-foreground">总案例</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-emerald-600">{active}</div>
                        <div className="text-[10px] text-muted-foreground">进行中</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold" style={{ color: 'oklch(0.55 0.15 220)' }}>
                          {improvement !== null ? `${improvement}%` : '—'}
                        </div>
                        <div className="text-[10px] text-muted-foreground">改善率</div>
                      </div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-xs h-8"
                        onClick={() => navigate(`/cases?counselorId=${c.id}`)}
                      >
                        <FolderOpen size={12} /> 查看案例
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-xs h-8"
                        onClick={() => { setResetTarget({ id: c.id, name: c.name ?? '咨询师' }); setNewPassword(''); }}
                      >
                        <KeyRound size={12} /> 重置密码
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 督导账号列表 */}
      {adminList.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShieldCheck size={14} />
              督导账号
              <Badge variant="secondary" className="text-xs">{adminList.length} 人</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {adminList.map(a => (
                <div key={a.id} className="flex items-center gap-4 p-4 rounded-xl border bg-muted/20">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback className="text-sm font-medium text-white"
                      style={{ background: 'oklch(0.38 0.09 200)' }}>
                      {a.name?.charAt(0) ?? '督'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium">{a.name ?? '督导'}</span>
                      <Badge className="text-[10px] px-1.5 py-0 text-white"
                        style={{ background: 'oklch(0.38 0.09 200)' }}>督导</Badge>
                      {a.id === user?.id && (
                        <span className="text-[10px] text-muted-foreground">（当前账号）</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {a.phone ?? '未设置手机号'}
                    </div>
                  </div>
                  {a.id !== user?.id && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 text-xs h-8 shrink-0"
                      onClick={() => { setResetTarget({ id: a.id, name: a.name ?? '督导' }); setNewPassword(''); }}
                    >
                      <KeyRound size={12} /> 重置密码
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 创建咨询师账号弹窗 */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>添加咨询师账号</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">姓名 *</Label>
              <Input
                placeholder="咨询师姓名"
                value={createForm.name}
                onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">手机号 *（用于登录）</Label>
              <Input
                type="tel"
                placeholder="11位手机号"
                value={createForm.phone}
                onChange={e => setCreateForm(f => ({ ...f, phone: e.target.value }))}
                maxLength={11}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">初始密码 *（至少6位）</Label>
              <div className="relative">
                <Input
                  type={showCreatePwd ? "text" : "password"}
                  placeholder="设置初始密码"
                  value={createForm.password}
                  onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                  className="h-9 text-sm pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowCreatePwd(!showCreatePwd)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCreatePwd ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                请将手机号和密码告知咨询师，他们登录后可自行修改密码
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>取消</Button>
            <Button
              size="sm"
              disabled={createMutation.isPending}
              onClick={() => {
                if (!createForm.name.trim()) { toast.error("请输入姓名"); return; }
                if (!createForm.phone.trim() || createForm.phone.length < 11) { toast.error("请输入正确的手机号"); return; }
                if (!createForm.password.trim() || createForm.password.length < 6) { toast.error("密码至少6位"); return; }
                createMutation.mutate(createForm);
              }}
            >
              {createMutation.isPending ? '创建中...' : '创建账号'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 重置密码弹窗 */}
      <Dialog open={!!resetTarget} onOpenChange={(open) => { if (!open) setResetTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>重置密码</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              为 <span className="font-medium text-foreground">{resetTarget?.name}</span> 设置新密码
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs">新密码（至少6位）</Label>
              <div className="relative">
                <Input
                  type={showNewPwd ? "text" : "password"}
                  placeholder="输入新密码"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="h-9 text-sm pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPwd(!showNewPwd)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPwd ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setResetTarget(null)}>取消</Button>
            <Button
              size="sm"
              disabled={resetPasswordMutation.isPending}
              onClick={() => {
                if (!newPassword || newPassword.length < 6) { toast.error("密码至少6位"); return; }
                resetPasswordMutation.mutate({ targetUserId: resetTarget!.id, newPassword });
              }}
            >
              {resetPasswordMutation.isPending ? '重置中...' : '确认重置'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
