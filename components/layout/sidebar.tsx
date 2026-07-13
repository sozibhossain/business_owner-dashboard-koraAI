"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { signOut, useSession } from "next-auth/react";
import {
  Calendar,
  CalendarCheck,
  CalendarPlus2,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Crown,
  DollarSign,
  Euro,
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
  { href: "/tasks", label: "Tasks", icon: CalendarPlus2 },
  { href: "/calendar", label: "Calendar", icon: CalendarPlus2 },
  { href: "/inbox", label: "Inbox", icon: Mail, badgeKey: "inbox" as const },
  { href: "/employees", label: "Employees", icon: Users },
  {
    href: "/requests",
    label: "Requests",
    icon: CalendarCheck,
    badgeKey: "requests" as const,
  },
  { href: "/accounting", label: "Accounting", icon: Euro },
  {
    href: "/kora-go",
    label: "Kora Go",
    icon: Navigation,
    staticBadge: "New",
    badgeColor:
      "bg-emerald-950/80 text-emerald-400 border border-emerald-500/30",
  },
  { href: "/services", label: "Services", icon: Scissors },
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
          "z-50 flex h-dvh flex-col border-r border-[#14304c] bg-[#061326] transition-[transform,width] duration-300",
          collapsed ? "w-16" : "w-[264px]",
          "fixed inset-y-0 left-0 lg:relative lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div
          className={cn(
            "flex items-center gap-3 px-6 py-[clamp(0.75rem,2.4dvh,1.5rem)]",
            collapsed && "justify-center px-2",
          )}
        >
          <div className="relative flex h-[clamp(2rem,4dvh,2.5rem)] w-[clamp(2rem,4dvh,2.5rem)] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#071321] shadow-[0_0_18px_rgba(0,183,255,0.35)] ring-1 ring-cyan-400/25">
            <Image
              src="/kora-logo.png"
              alt="KoraAI"
              width={40}
              height={40}
              className="h-full w-full object-cover"
              priority
            />
          </div>
          {!collapsed && (
            <div>
              <span className="text-[clamp(1.1rem,2.6dvh,1.75rem)] font-semibold leading-none text-white">KoraAI</span>
              <p className="mt-1 text-[14px] text-[#a8b5c6]">Business Owner Dashboard</p>
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
              "ml-auto hidden h-8 w-8 items-center justify-center rounded-full border border-[#14304c] text-[#8fa0b6] transition-colors hover:text-gray-300 lg:inline-flex",
              collapsed && "ml-0",
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        <nav className="scrollbar-none min-h-0 flex-1 overflow-y-auto px-3 py-2">
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
                  "mx-2 mb-0.5 flex items-center gap-3 rounded-lg px-3 py-[clamp(0.45rem,1.25dvh,0.625rem)] text-[clamp(0.75rem,1.45dvh,0.875rem)] transition-all",
                  active
                    ? "border border-[#126dff] bg-[#07337a] text-[#d9ecff] shadow-[inset_0_0_24px_rgba(17,104,255,0.22)]"
                    : "text-[#c4ccda] hover:bg-[#0b1e36] hover:text-gray-100",
                  collapsed && "justify-center px-2",
                )}
                title={collapsed ? item.label : undefined}
              >
                <div className="relative shrink-0">
                  <Icon
                    className={cn(
                      "h-[clamp(1rem,2.2dvh,1.5rem)] w-[clamp(1rem,2.2dvh,1.5rem)]",
                      active ? "text-[#d9ecff]" : "text-[#c4ccda]",
                    )}
                  />
                  {item.dot ? (
                    <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  ) : null}
                </div>
                {!collapsed && (
                  <span className="flex-1 truncate text-[clamp(0.82rem,1.55dvh,1rem)]">{item.label}</span>
                )}

                {/* Custom/Static Badges or Dynamic Count Badges */}
                {!collapsed && item.staticBadge ? (
                  <span
                    className={cn(
                      "rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase",
                      item.badgeColor,
                    )}
                  >
                    {item.staticBadge}
                  </span>
                ) : !collapsed && dynamicBadge ? (
                  <span className="rounded-full bg-blue-600/30 px-1.5 py-0.5 text-[10px] font-semibold text-blue-400">
                    {dynamicBadge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div>
          {collapsed ? (
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-[clamp(2rem,4dvh,2.5rem)] w-[clamp(2rem,4dvh,2.5rem)] shrink-0 ring-2 ring-blue-500/20">
                {displayImage ? (
                  <AvatarImage src={displayImage} alt={displayName} />
                ) : null}
                <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
              </Avatar>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-[#c7d0df] transition-colors hover:bg-[#0b1e36] hover:text-red-300"
                aria-label="Logout"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <div className="p-[clamp(0.75rem,2.4dvh,1.5rem)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <div className="rounded-lg border border-[#14304c] bg-[#071a31] px-3 shadow-[inset_0_0_20px_rgba(17,104,255,0.12)]">
                <div className="flex items-center gap-3 pt-2">
                  <Avatar className="h-[clamp(2rem,4.6dvh,2.75rem)] w-[clamp(2rem,4.6dvh,2.75rem)] shrink-0 border border-blue-400/20 rounded-xl">
                    {displayImage ? (
                      <AvatarImage src={displayImage} alt={displayName} />
                    ) : null}
                    <AvatarFallback>{getInitials(accountTitle)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[clamp(0.82rem,1.55dvh,1rem)] font-semibold text-white">
                      {accountTitle}
                    </p>
                    <p className="mt-0.5 truncate text-[12px] font-medium text-[#a8b5c6]">
                      {accountSubtitle}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 shrink-0 text-[#8fa0b6]" />
                </div>

                <Link
                  href="/subscription"
                  className="-mx-3 mt-[clamp(0.75rem,2.2dvh,1.25rem)] flex h-[clamp(2.25rem,5dvh,3rem)] items-center justify-center gap-3 rounded-lg border border-[#126dff] bg-[#07337a] px-4 text-[clamp(0.82rem,1.55dvh,1rem)] font-semibold text-[#d9ecff] shadow-[inset_0_0_24px_rgba(17,104,255,0.22)] transition-colors hover:bg-[#0b438d] active:scale-[0.99]"
                >
                  <Crown className="h-5 w-5 text-cyan-300" strokeWidth={2} />
                  Upgrade Plan
                </Link>
              </div>

              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="mt-[clamp(0.75rem,4dvh,2.5rem)] flex w-full items-center gap-4 rounded-lg px-3 py-2.5 text-left text-[clamp(0.82rem,1.55dvh,1rem)] font-semibold text-[#c7d0df] transition-colors hover:bg-[#0b1e36] hover:text-red-300"
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
