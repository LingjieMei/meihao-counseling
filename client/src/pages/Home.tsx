import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, Phone, Lock } from "lucide-react";

export default function Home() {
  const { isAuthenticated, loading, refresh } = useAuth();
  const [, navigate] = useLocation();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, loading, navigate]);

  const loginMutation = trpc.auth.loginWithPhone.useMutation({
    onSuccess: async () => {
      await refresh();
      navigate("/dashboard");
    },
    onError: (e) => {
      toast.error(e.message || "手机号或密码错误");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) { toast.error("请输入手机号"); return; }
    if (!password.trim()) { toast.error("请输入密码"); return; }
    loginMutation.mutate({ phone: phone.trim(), password });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, oklch(0.20 0.025 230) 0%, oklch(0.28 0.04 210) 50%, oklch(0.22 0.03 240) 100%)' }}>
        <div className="text-white/50 text-sm">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, oklch(0.20 0.025 230) 0%, oklch(0.28 0.04 210) 50%, oklch(0.22 0.03 240) 100%)' }}>

      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, oklch(0.70 0.08 200), transparent)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full opacity-8"
          style={{ background: 'radial-gradient(circle, oklch(0.65 0.10 180), transparent)' }} />
      </div>

      <div className="relative z-10 w-full max-w-sm px-6">
        {/* Logo 区域 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: 'oklch(0.38 0.09 200)', boxShadow: '0 8px 32px oklch(0.38 0.09 200 / 0.4)' }}>
            <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 6C12.268 6 6 12.268 6 20s6.268 14 14 14 14-6.268 14-14S27.732 6 20 6z" fill="white" fillOpacity="0.2"/>
              <path d="M14 20c0-3.314 2.686-6 6-6s6 2.686 6 6-2.686 6-6 6-6-2.686-6-6z" fill="white"/>
              <path d="M20 10v4M20 26v4M10 20h4M26 20h4" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="text-3xl font-light tracking-wide mb-1"
            style={{ color: 'oklch(0.95 0.01 220)', fontFamily: "'Noto Serif SC', serif" }}>
            美好心理
          </h1>
          <p className="text-sm font-light" style={{ color: 'oklch(0.65 0.03 220)' }}>
            咨询督导管理系统
          </p>
        </div>

        {/* 登录表单卡片 */}
        <div className="rounded-2xl p-6 shadow-2xl"
          style={{ background: 'oklch(0.98 0.005 220 / 0.08)', backdropFilter: 'blur(20px)', border: '1px solid oklch(1 0 0 / 0.10)' }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 手机号 */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium" style={{ color: 'oklch(0.75 0.03 220)' }}>
                手机号
              </Label>
              <div className="relative">
                <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'oklch(0.55 0.04 220)' }} />
                <Input
                  type="tel"
                  placeholder="请输入手机号"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  maxLength={11}
                  autoComplete="tel"
                  className="pl-9 h-11 text-sm border-0"
                  style={{
                    background: 'oklch(1 0 0 / 0.08)',
                    color: 'oklch(0.95 0.01 220)',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* 密码 */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium" style={{ color: 'oklch(0.75 0.03 220)' }}>
                密码
              </Label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'oklch(0.55 0.04 220)' }} />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="请输入密码"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="pl-9 pr-10 h-11 text-sm border-0"
                  style={{
                    background: 'oklch(1 0 0 / 0.08)',
                    color: 'oklch(0.95 0.01 220)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-80"
                  style={{ color: 'oklch(0.55 0.04 220)' }}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* 登录按钮 */}
            <Button
              type="submit"
              className="w-full h-11 text-sm font-medium rounded-xl mt-2"
              disabled={loginMutation.isPending}
              style={{
                background: 'oklch(0.38 0.09 200)',
                color: 'white',
                boxShadow: '0 4px 20px oklch(0.38 0.09 200 / 0.4)',
              }}
            >
              {loginMutation.isPending ? "登录中..." : "登录系统"}
            </Button>
          </form>
        </div>

        <p className="text-center mt-6 text-xs" style={{ color: 'oklch(0.45 0.02 220)' }}>
          真实 · 温暖 · 有效
        </p>
      </div>
    </div>
  );
}
