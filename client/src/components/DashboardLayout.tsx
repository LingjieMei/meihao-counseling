import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import {
  LayoutDashboard,
  FolderOpen,
  Brain,
  LogOut,
  PanelLeft,
  ShieldCheck,
  TrendingUp,
  Users,
  Settings,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { trpc } from "@/lib/trpc";

const menuItems = [
  { icon: LayoutDashboard, label: "数据看板", subtitle: "案例总览与统计", path: "/dashboard" },
  { icon: FolderOpen, label: "案例管理", subtitle: "案例与咨询记录", path: "/cases" },
  { icon: TrendingUp, label: "成长中心", subtitle: "雷达图与风格四象限", path: "/growth" },
  { icon: Brain, label: "类型参考", subtitle: "四种人格类型指南", path: "/personality-profiles" },
];

const adminMenuItems = [
  { icon: Users, label: "团队管理", subtitle: "咨询师账号与统计", path: "/admin" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 240;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-2xl font-semibold tracking-tight text-center" style={{ fontFamily: "'Noto Serif SC', serif" }}>
              美好心理 · 咨询督导系统
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              请先登录以访问系统
            </p>
          </div>
          <Button
            onClick={() => { window.location.href = getLoginUrl(); }}
            size="lg"
            className="w-full"
            style={{ background: 'oklch(0.38 0.09 200)' }}
          >
            登录系统
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({ children, setSidebarWidth }: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const isAdmin = user?.role === 'admin';

  // 未读批注数
  const { data: stats } = trpc.stats.dashboard.useQuery();
  const unreadCount = stats?.unreadAnnotations ?? 0;

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r" disableTransition={isResizing}>
          <SidebarHeader className="h-16 justify-center border-b">
            <div className="flex items-center gap-3 px-2 w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed && (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold text-sm truncate" style={{ fontFamily: "'Noto Serif SC', serif" }}>
                    美好心理
                  </span>
                  {isAdmin && (
                    <span className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full text-white"
                      style={{ background: 'oklch(0.38 0.09 200)', fontSize: '10px' }}>
                      <ShieldCheck size={10} /> 督导
                    </span>
                  )}
                </div>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 pt-2">
            <SidebarMenu className="px-2 py-1">
              {menuItems.map(item => {
                const isActive = location.startsWith(item.path) ||
                  (item.path === '/cases' && location.startsWith('/cases') && !location.startsWith('/cases/new'));
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className="h-10 transition-all font-normal"
                    >
                      <item.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : ""}`} />
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm leading-tight">{item.label}</span>
                        {'subtitle' in item && item.subtitle && !isCollapsed && (
                          <span className="text-[10px] leading-tight text-muted-foreground/70 truncate">{item.subtitle}</span>
                        )}
                      </div>
                      {item.path === '/dashboard' && unreadCount > 0 && !isCollapsed && (
                        <span className="ml-auto text-xs px-1.5 py-0.5 rounded-full text-white min-w-5 text-center"
                          style={{ background: 'oklch(0.55 0.20 25)', fontSize: '10px' }}>
                          {unreadCount}
                        </span>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>

            {/* 督导专属菜单 */}
            {isAdmin && (
              <>
                <div className="px-4 pt-3 pb-1">
                  <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">
                    {!isCollapsed ? '督导专区' : '·'}
                  </span>
                </div>
                <SidebarMenu className="px-2 py-1">
                  {adminMenuItems.map(item => {
                    const isActive = location.startsWith(item.path);
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => setLocation(item.path)}
                          tooltip={item.label}
                          className="h-10 transition-all font-normal"
                        >
                          <item.icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-primary' : ''}`} />
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm leading-tight">{item.label}</span>
                            {item.subtitle && !isCollapsed && (
                              <span className="text-[10px] leading-tight text-muted-foreground/70 truncate">{item.subtitle}</span>
                            )}
                          </div>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </>
            )}
          </SidebarContent>

          <SidebarFooter className="p-3 border-t">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-8 w-8 border shrink-0">
                    <AvatarFallback className="text-xs font-medium" style={{ background: 'oklch(0.38 0.09 200)', color: 'white' }}>
                      {user?.name?.charAt(0).toUpperCase() ?? 'U'}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate leading-none">{user?.name || "用户"}</p>
                      <p className="text-xs text-muted-foreground truncate mt-1">{isAdmin ? '督导' : '咨询师'}</p>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>退出登录</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => { if (!isCollapsed) setIsResizing(true); }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <span className="text-sm font-medium">美好心理</span>
            </div>
          </div>
        )}
        <main className="flex-1 overflow-auto">{children}</main>
      </SidebarInset>
    </>
  );
}
