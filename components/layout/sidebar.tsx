"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { signOut, useSession } from "next-auth/react";
import {
  Calendar,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Crown,
  DollarSign,
  LayoutDashboard,
  LogOut,
  Mail,
  Navigation,
  Radio,
  Scissors,
  Settings,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMobileNav } from "@/components/layout/mobile-nav-context";
import { inboxApi, requestsApi, userApi } from "@/lib/api";
import { useSocketEvent } from "@/lib/socket";
import { cn, getInitials } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    href: "/assistant",
    label: "Assistant",
    icon: Sparkles,
    staticBadge: "AI",
    badgeColor: "bg-blue-600 text-white",
  },
  { href: "/live-view", label: "Live View", icon: Radio, dot: true },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/inbox", label: "Inbox", icon: Mail, badgeKey: "inbox" as const },
  { href: "/employees", label: "Employees", icon: Users },
  {
    href: "/requests",
    label: "Requests",
    icon: ClipboardList,
    badgeKey: "requests" as const,
  },
  { href: "/accounting", label: "Accounting", icon: DollarSign },
  {
    href: "/kora-go",
    label: "Kora Go",
    icon: Navigation,
    staticBadge: "New",
    badgeColor:
      "bg-emerald-950/80 text-emerald-400 border border-emerald-500/30",
  },
  { href: "/services", label: "Services", icon: Scissors },
  // { href: "/subscription", label: "Subscription", icon: CreditCard },
  { href: "/website", label: "Website", icon: CreditCard }, // Replaced placeholder icon with correct matching sidebar icon
  { href: "/settings", label: "Settings", icon: Settings },
];

function formatBadge(count: number | undefined) {
  if (!count || count <= 0) return null;
  return count > 99 ? "99+" : String(count);
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { isOpen, setIsOpen } = useMobileNav();
  const [collapsed, setCollapsed] = useState(false);

  const { data: profileResponse } = useQuery({
    queryKey: ["user-profile"],
    queryFn: () => userApi.getProfile().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const profileData = profileResponse?.data;
  const sessionUser = session?.user as
    | { name?: string; role?: string; profileImage?: { url?: string } }
    | undefined;

  const displayName =
    profileData?.name || sessionUser?.name || "Business Owner";
  const displayImage =
    profileData?.profileImage?.url || sessionUser?.profileImage?.url || "";
  const displayRole =
    profileData?.role || sessionUser?.role || "business_owner";
  const roleLabel =
    displayRole === "business_owner"
      ? "Business Owner"
      : displayRole === "employee"
        ? "Employee"
        : String(displayRole).replace(/_/g, " ");
  const accountTitle = profileData?.businessName || displayName;
  const accountSubtitle =
    profileData?.businessType || profileData?.category || roleLabel;

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const { data: inboxData, refetch: refetchInbox } = useQuery({
    queryKey: ["sidebar-inbox-summary"],
    queryFn: () => inboxApi.getChats().then((response) => response.data),
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
  });

  const { data: requestsData } = useQuery({
    queryKey: ["sidebar-requests-pending"],
    queryFn: () =>
      requestsApi
        .getAll({ status: "pending", limit: 1 })
        .then((response) => response.data),
    refetchInterval: 120000,
    refetchOnWindowFocus: true,
  });

  useSocketEvent("inbox:new-message", () => refetchInbox());
  useSocketEvent("inbox:read", () => refetchInbox());

  const inboxUnread: number = inboxData?.meta?.summary?.unreadTotal ?? 0;
  const pendingRequests: number = requestsData?.meta?.total ?? 0;

  const badgeFor = (key?: "inbox" | "requests") => {
    if (key === "inbox") return formatBadge(inboxUnread);
    if (key === "requests") return formatBadge(pendingRequests);
    return null;
  };

  return (
    <>
      {isOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden
        />
      ) : null}

      <aside
        className={cn(
          "z-50 flex h-screen flex-col border-r border-[#152233] bg-[#030914] transition-[transform,width] duration-300 rounded-r-3xl",
          collapsed ? "w-16" : "w-64",
          "fixed inset-y-0 left-0 lg:relative lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Header section */}
        <div
          className={cn(
            "flex items-center gap-3 px-5 py-6",
            collapsed && "justify-center px-2",
          )}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)]">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <div className="flex-1">
              <span className="text-base font-bold tracking-wide text-white">
                KoraAI
              </span>
            </div>
          )}
          <button
            onClick={() => setIsOpen(false)}
            className={cn(
              "ml-auto text-gray-500 hover:text-gray-300 lg:hidden",
              collapsed && "ml-0",
            )}
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "ml-auto hidden h-7 w-7 items-center justify-center rounded-full bg-[#111c2e] text-gray-400 hover:text-gray-200 lg:inline-flex",
              collapsed && "ml-0",
            )}
            aria-label={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="scrollbar-none flex-1 overflow-y-auto px-3 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const dynamicBadge = badgeFor(
              "badgeKey" in item ? item.badgeKey : undefined,
            );

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "mb-1 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-gradient-to-r from-blue-600/30 to-blue-600/5 text-blue-400 border border-blue-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                    : "text-gray-400 hover:bg-[#111c2e]/60 hover:text-gray-100",
                  collapsed && "justify-center px-2",
                )}
                title={collapsed ? item.label : undefined}
              >
                <div className="relative shrink-0">
                  <Icon
                    className={cn(
                      "h-[18px] w-[18px]",
                      active ? "text-blue-400" : "text-gray-400",
                    )}
                  />
                  {item.dot ? (
                    <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  ) : null}
                </div>
                {!collapsed && (
                  <span className="flex-1 truncate">{item.label}</span>
                )}

                {/* Custom/Static Badges or Dynamic Count Badges */}
                {!collapsed && item.staticBadge ? (
                  <span
                    className={cn(
                      "rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-wider uppercase",
                      item.badgeColor,
                    )}
                  >
                    {item.staticBadge}
                  </span>
                ) : !collapsed && dynamicBadge ? (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white px-1">
                    {dynamicBadge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        {/* Footer Profile Section */}
        <div>
          {collapsed ? (
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-10 w-10 shrink-0 ring-2 ring-blue-500/20">
                {displayImage ? (
                  <AvatarImage src={displayImage} alt={displayName} />
                ) : null}
                <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
              </Avatar>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-[#111d2f] hover:text-red-400"
                aria-label="Logout"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <div className=" p-3.5 pb-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <div className="border border-[#1a293d] px-3 rounded-xl bg-[#0b1a2c] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                <div className="flex items-center gap-3 pt-2">
                  <Avatar className="h-11 w-11 shrink-0 border border-blue-400/20 rounded-xl">
                    {displayImage ? (
                      <AvatarImage src={displayImage} alt={displayName} />
                    ) : null}
                    <AvatarFallback>{getInitials(accountTitle)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">
                      {accountTitle}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-gray-400 font-medium">
                      {accountSubtitle}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
                </div>

                <Link
                  href="/subscription"
                  className="-mx-3.5 mt-5 flex h-12 items-center justify-center gap-3 rounded-xl border border-[#0758ba] bg-[#012758] px-4 text-sm font-bold text-white shadow-[0_0_18px_rgba(1,39,88,0.55)] transition-colors hover:bg-[#06366f] active:scale-[0.99]"
                >
                  <Crown className="h-5 w-5 text-cyan-300" strokeWidth={2} />
                  Upgrade Plan
                </Link>
              </div>

              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="mt-10 flex w-full items-center gap-4 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-gray-100 transition-colors hover:bg-[#111d2f]/70 hover:text-red-300"
              >
                <LogOut
                  className="h-5 w-5 shrink-0 text-gray-200"
                  strokeWidth={2}
                />
                Logout
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
