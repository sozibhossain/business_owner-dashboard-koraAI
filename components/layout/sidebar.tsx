"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn, getInitials } from "@/lib/utils";
import {
  LayoutDashboard, Sparkles, Radio, CheckSquare, Calendar,
  Mail, Users, ClipboardList, DollarSign, Navigation, Settings,
  LogOut, ChevronLeft, ChevronRight
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/assistant", label: "Assistant", icon: Sparkles },
  { href: "/live-view", label: "Live View", icon: Radio, dot: true },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/inbox", label: "Inbox", icon: Mail, badge: "3" },
  { href: "/employees", label: "Employees", icon: Users },
  { href: "/requests", label: "Requests", icon: ClipboardList, badge: "3" },
  { href: "/accounting", label: "Accounting", icon: DollarSign },
  { href: "/kora-go", label: "Kora Go", icon: Navigation },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={cn("flex flex-col h-screen bg-[#070f1c] border-r border-[#1e2d40] transition-all duration-300 z-40", collapsed ? "w-16" : "w-60")}>
      <div className={cn("flex items-center gap-2 px-4 py-5 border-b border-[#1e2d40]", collapsed && "justify-center px-2")}>
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div>
            <span className="font-bold text-white text-sm">KoraAI</span>
            <p className="text-[10px] text-gray-500">Client Dashboard</p>
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)} className={cn("ml-auto text-gray-500 hover:text-gray-300", collapsed && "ml-0")}>
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 py-3 overflow-y-auto scrollbar-none">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href}
              className={cn("flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm transition-all mb-0.5",
                active ? "bg-blue-600/20 text-blue-400 border border-blue-600/20" : "text-gray-500 hover:text-gray-200 hover:bg-[#1e2d40]",
                collapsed && "justify-center px-2")}
              title={collapsed ? item.label : undefined}>
              <div className="relative flex-shrink-0">
                <Icon className="w-4 h-4" />
                {item.dot && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-400 rounded-full" />}
              </div>
              {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
              {!collapsed && item.badge && (
                <span className="text-[10px] bg-blue-600/30 text-blue-400 px-1.5 py-0.5 rounded-full font-semibold">{item.badge}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[#1e2d40] p-3 space-y-2">
        {!collapsed && (
          <div className="mx-2 p-2 rounded-lg bg-blue-600/10 border border-blue-600/20">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#1e2d40] flex items-center justify-center flex-shrink-0">
                <span className="text-xs">🏠</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-200 truncate">{session?.user?.name || "Fade Masters"}</p>
                <p className="text-[10px] text-gray-500">Barbershop</p>
              </div>
              <span className="text-gray-500 ml-auto">▾</span>
            </div>
          </div>
        )}
        <div className={cn("flex items-center gap-2 rounded-lg p-2", collapsed && "justify-center")}>
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarFallback>{getInitials(session?.user?.name || "BO")}</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-200 truncate">{session?.user?.name || "Business Owner"}</p>
                <p className="text-[10px] text-gray-500">Barbershop</p>
              </div>
              <button onClick={() => signOut({ callbackUrl: "/login" })} className="text-gray-500 hover:text-red-400 transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
        {!collapsed && (
          <Link href="/settings" className="flex items-center gap-2 mx-2 px-3 py-2 rounded-lg text-xs text-blue-400 border border-blue-600/20 hover:bg-blue-600/10 transition-colors">
            <span>🔄</span> Upgrade Plan
          </Link>
        )}
      </div>
    </aside>
  );
}
