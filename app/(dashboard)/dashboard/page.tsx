/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  accountingApi,
  appointmentsApi,
  employeesApi,
  requestsApi,
  userApi,
} from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import {
  Calendar,
  Users,
  DollarSign,
  TrendingUp,
  Send,
  Sparkles,
  CalendarDays,
  Receipt,
  MessageSquare,
  Settings,
  Globe,
  ListTodo,
  BarChart3,
  Zap,
  ChevronRight,
  ArrowRight,
} from "lucide-react";

const today = new Date().toISOString().split("T")[0];

/* ── Sparkline mini-chart ── */
const SparkLine = ({ seed, color }: { seed: number; color: string }) => {
  const points = Array.from({ length: 12 }, (_, i) => {
    const noise = ((seed * 9301 + i * 49297) % 233280) / 233280;
    return 8 + Math.round(noise * 16);
  });
  const path = points
    .map((v, i) => `${(i / 11) * 100},${24 - v}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 24" className="h-7 w-20 shrink-0" preserveAspectRatio="none">
      <polyline fill="none" stroke={color} strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" points={path} />
    </svg>
  );
};

/* ── Kora AI Orb ── */
const KoraOrb = () => (
  <div className="relative w-[88px] h-[88px] shrink-0 select-none">
    {/* Outer ambient glow */}
    <div className="absolute inset-0 rounded-full bg-blue-500/15 blur-lg animate-pulse" />
    {/* Rotating ring */}
    <div
      className="absolute inset-[3px] rounded-full border-2 border-transparent"
      style={{
        borderTopColor: "rgba(59,130,246,0.7)",
        borderRightColor: "rgba(59,130,246,0.3)",
        animation: "spin 3s linear infinite",
      }}
    />
    {/* Static outer ring */}
    <div className="absolute inset-[3px] rounded-full border border-blue-500/25" />
    {/* Inner glow ring */}
    <div className="absolute inset-[10px] rounded-full border border-blue-400/30 animate-pulse" />
    {/* Dark core */}
    <div className="absolute inset-[6px] rounded-full bg-[#04091a]" />
    {/* Face */}
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="flex flex-col items-center gap-[5px] mt-0.5">
        <div className="flex gap-[7px]">
          <div className="w-[7px] h-[7px] rounded-full bg-white/90" />
          <div className="w-[7px] h-[7px] rounded-full bg-white/90" />
        </div>
        <svg width="18" height="8" viewBox="0 0 18 8">
          <path d="M2 2 Q9 8 16 2" stroke="white" strokeWidth="1.6"
            fill="none" strokeLinecap="round" opacity="0.9" />
        </svg>
      </div>
    </div>
    {/* Floating particles */}
    <div className="absolute top-1 right-3 w-1 h-1 rounded-full bg-blue-300/70 animate-ping"
      style={{ animationDuration: "2s", animationDelay: "0s" }} />
    <div className="absolute bottom-2 left-2 w-1 h-1 rounded-full bg-blue-400/50 animate-ping"
      style={{ animationDuration: "2.5s", animationDelay: "0.8s" }} />
    <div className="absolute top-4 left-0 w-0.5 h-0.5 rounded-full bg-blue-300/60 animate-ping"
      style={{ animationDuration: "3s", animationDelay: "1.5s" }} />
  </div>
);

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

const quickActions = [
  { label: "New\nAppointment", icon: CalendarDays, color: "bg-blue-600/20 text-blue-400", border: "border-blue-600/20" },
  { label: "Create\nInvoice",     icon: Receipt,      color: "bg-emerald-600/20 text-emerald-400", border: "border-emerald-600/20" },
  { label: "Send\nMessage",       icon: MessageSquare, color: "bg-purple-600/20 text-purple-400", border: "border-purple-600/20" },
  { label: "Manage\nEmployees",   icon: Users,        color: "bg-amber-600/20 text-amber-400",  border: "border-amber-600/20" },
  { label: "Manage\nServices",    icon: BarChart3,    color: "bg-cyan-600/20 text-cyan-400",    border: "border-cyan-600/20" },
  { label: "Create\nTask",        icon: ListTodo,     color: "bg-rose-600/20 text-rose-400",    border: "border-rose-600/20" },
  { label: "Settings",            icon: Settings,     color: "bg-gray-600/20 text-gray-400",    border: "border-gray-600/20" },
  { label: "Open\nWebsite",       icon: Globe,        color: "bg-indigo-600/20 text-indigo-400", border: "border-indigo-600/20" },
];

const koraSuggestionChips = [
  { icon: CalendarDays, label: "Show me today's appointments" },
  { icon: ArrowRight,   label: "Move an appointment" },
  { icon: BarChart3,    label: "Show my weekly performance" },
];

type DashboardEmployee = { status?: string };
type DashboardAppointment = {
  _id: string;
  startTime?: string;
  endTime?: string;
  status?: string;
  service?: string;
  customer?: { name?: string };
  client?: { name?: string };
};

export default function BusinessOwnerDashboard() {
  const [koraInput, setKoraInput] = useState("");
  const [scheduleView, setScheduleView] = useState<"Day" | "Week" | "Month">("Day");
  const [koraMessages, setKoraMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([]);

  const { data: profileData } = useQuery({
    queryKey: ["user-profile-dashboard"],
    queryFn: () => userApi.getProfile().then((r) => r.data.data),
  });

  const { data: appointmentsData } = useQuery({
    queryKey: ["dashboard-appointments", today],
    queryFn: () =>
      appointmentsApi.getAll({ date: today, limit: 8 }).then((r) => r.data),
  });

  const { data: employeesData } = useQuery({
    queryKey: ["dashboard-employees"],
    queryFn: () => employeesApi.getAll({ limit: 100 }).then((r) => r.data),
  });

  const { data: requestsData } = useQuery({
    queryKey: ["dashboard-requests"],
    queryFn: () =>
      requestsApi.getAll({ status: "pending", limit: 20 }).then((r) => r.data),
  });

  const { data: accountingData } = useQuery({
    queryKey: ["dashboard-accounting"],
    queryFn: () => accountingApi.getDashboard().then((r) => r.data.data),
  });

  const appointments: DashboardAppointment[] = appointmentsData?.data || [];
  const employees: any[]     = employeesData?.data || [];
  const pendingRequests: any[] = requestsData?.data || [];
  const activeEmployees = employees.filter((e: DashboardEmployee) =>
    ["working", "on_break"].includes(e.status || "")
  );

  const userName = profileData?.name?.split(" ")[0] || "there";

  const stats = [
    {
      label: "Today's Appointments",
      value: appointments.length,
      compare: "vs yesterday",
      icon: Calendar,
      color: "bg-blue-600",
      spark: "#3b82f6",
      seed: 11,
    },
    {
      label: "This Week",
      value: accountingData?.appointmentsWeek ?? appointments.length,
      compare: "vs last week",
      icon: TrendingUp,
      color: "bg-purple-600",
      spark: "#a855f7",
      seed: 23,
    },
    {
      label: "Active Employees",
      value: activeEmployees.length,
      compare: `${employees.length} total`,
      icon: Users,
      color: "bg-emerald-600",
      spark: "#10b981",
      seed: 7,
    },
    {
      label: "Revenue (This Month)",
      value: formatCurrency(accountingData?.revenueMonth || 0),
      compare: "vs last month",
      icon: DollarSign,
      color: "bg-amber-600",
      spark: "#f59e0b",
      seed: 31,
    },
  ];

  const koraSuggestions = useMemo(
    () => [
      {
        icon: "📈",
        iconBg: "bg-blue-600/20",
        title: "Increase prices on weekends?",
        sub: "You could earn €230 more per week.",
        color: "border-[#1e2d40]",
      },
      {
        icon: "💬",
        iconBg: "bg-indigo-600/20",
        title: `${pendingRequests.length || 2} messages need a reply`,
        sub: "Average response time: 2h 15m",
        color: "border-[#1e2d40]",
      },
      {
        icon: "🎁",
        iconBg: "bg-emerald-600/20",
        title: "Loyalty program idea",
        sub: "Reward clients after 5 visits.",
        color: "border-[#1e2d40]",
      },
      {
        icon: "📅",
        iconBg: "bg-amber-600/20",
        title: "Slow day this Thursday",
        sub: "Add a promo to fill your schedule.",
        color: "border-[#1e2d40]",
      },
    ],
    [pendingRequests.length]
  );

  const getGuestName = (a: DashboardAppointment) =>
    a.customer?.name || a.client?.name || "Customer";

  const sendKoraMessage = (text?: string) => {
    const content = (text || koraInput).trim();
    if (!content) return;
    setKoraMessages((cur) => [
      ...cur,
      { role: "user", content },
      {
        role: "assistant",
        content:
          "I'm checking your live data. Open Calendar, Employees, Requests, or Accounting for full details.",
      },
    ]);
    setKoraInput("");
  };

  const showChips = koraMessages.length === 0;

  return (
    <div>
      <Header
        title="Business Overview"
        subtitle="Live booking, team, request, and revenue data."
      />
      <div className="space-y-5 p-3 sm:p-4 lg:p-6">

        {/* ── Greeting ── */}
        <div>
          <h2 className="text-[22px] font-bold text-white">
            {getGreeting()}, {userName}! 👋
          </h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Here&apos;s what&apos;s happening with your business today.
          </p>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map((item) => (
            <Card key={item.label}>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-start justify-between gap-1">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center shrink-0`}>
                      <item.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-gray-400 leading-tight mb-0.5">{item.label}</p>
                      <p className="text-2xl font-extrabold text-white leading-none">{item.value}</p>
                      <p className="text-[10px] text-emerald-400 mt-1 leading-tight flex items-center gap-0.5">
                        <span className="text-emerald-400">↑</span>
                        {item.compare}
                      </p>
                    </div>
                  </div>
                  <SparkLine seed={item.seed} color={item.spark} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Today's Schedule + Kora Assistant ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Today's Schedule */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-gray-400" />
                  <CardTitle className="text-sm">Today&apos;s Schedule</CardTitle>
                </div>
                <div className="flex gap-0.5 bg-[#0d1a2d] p-0.5 rounded-lg">
                  {(["Day", "Week", "Month"] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setScheduleView(v)}
                      className={`px-3 py-1 rounded-md text-[11px] font-medium transition-colors ${
                        scheduleView === v
                          ? "bg-blue-600 text-white"
                          : "text-gray-400 hover:text-gray-200"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-3">
              {appointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Calendar className="w-9 h-9 text-gray-700 mb-2" />
                  <p className="text-sm text-gray-500">No appointments today.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-0">
                    {appointments.map((apt, idx) => {
                      const hour = apt.startTime?.slice(0, 5) || "--:--";
                      const isLast = idx === appointments.length - 1;
                      return (
                        <div key={apt._id} className="flex gap-3">
                          {/* Time */}
                          <div className="w-12 shrink-0 pt-1 text-right">
                            <span className="text-[10px] text-gray-500">{hour}</span>
                          </div>
                          {/* Timeline */}
                          <div className="flex flex-col items-center">
                            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0 mt-1.5 ring-2 ring-blue-500/20" />
                            {!isLast && (
                              <div className="w-px flex-1 bg-[#1e2d40] my-1" />
                            )}
                          </div>
                          {/* Card */}
                          <div className={`flex-1 flex items-start justify-between gap-2 ${!isLast ? "pb-3" : "pb-1"}`}>
                            <div className="min-w-0">
                              <p className="text-[13px] font-semibold text-gray-100 truncate">
                                {getGuestName(apt)}
                              </p>
                              <p className="text-[11px] text-gray-400 truncate">
                                {apt.service || String(apt.status || "Appointment").replace(/_/g, " ")}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] text-gray-500 whitespace-nowrap">
                                {apt.startTime?.slice(0, 5)} – {apt.endTime?.slice(0, 5)}
                              </span>
                              <Avatar className="w-6 h-6">
                                <AvatarFallback className="text-[8px]">
                                  {getInitials(getGuestName(apt))}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <button className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors">
                    View full calendar <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Kora Assistant */}
          <Card className="border-blue-600/20 bg-[#070f1c]">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <CardTitle className="text-sm">Kora Assistant</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex gap-4">
                {/* Chat + chips */}
                <div className="flex-1 min-w-0">
                  {showChips ? (
                    <>
                      <p className="text-[13px] text-gray-200 mb-1">
                        Hi {userName}! How can I help you today?
                      </p>
                      <p className="text-[11px] text-gray-500 mb-3">
                        Here are some suggestions:
                      </p>
                      <div className="space-y-2 mb-4">
                        {koraSuggestionChips.map((chip) => (
                          <button
                            key={chip.label}
                            onClick={() => sendKoraMessage(chip.label)}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[#0d1a2d] hover:bg-[#1e2d40] border border-[#1e2d40] hover:border-blue-600/30 transition-all text-left"
                          >
                            <div className="w-6 h-6 rounded-lg bg-[#1e2d40] flex items-center justify-center shrink-0">
                              <chip.icon className="w-3.5 h-3.5 text-blue-400" />
                            </div>
                            <span className="text-xs text-gray-300">{chip.label}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                      {koraMessages.map((msg, i) => (
                        <div
                          key={i}
                          className={`flex ${msg.role === "user" ? "justify-end" : "items-start gap-2"}`}
                        >
                          {msg.role === "assistant" && (
                            <div className="w-5 h-5 rounded-full bg-blue-600/20 flex items-center justify-center shrink-0 mt-0.5">
                              <Sparkles className="w-3 h-3 text-blue-400" />
                            </div>
                          )}
                          <div
                            className={`rounded-xl px-3 py-2 max-w-[85%] ${
                              msg.role === "user"
                                ? "bg-blue-600 text-white"
                                : "bg-[#1e2d40] text-gray-200"
                            }`}
                          >
                            <p className="text-xs">{msg.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <input
                      value={koraInput}
                      onChange={(e) => setKoraInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendKoraMessage()}
                      placeholder="Ask Kora anything..."
                      className="flex-1 text-xs bg-[#0d1a2d] border border-[#1e2d40] rounded-xl px-3 py-2.5 text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    <Button
                      size="icon"
                      className="h-9 w-9 rounded-full bg-blue-600 hover:bg-blue-700"
                      onClick={() => sendKoraMessage()}
                    >
                      <Send className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* AI Orb */}
                <div className="hidden sm:flex items-center justify-center">
                  <KoraOrb />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Quick Actions ── */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-400" />
              <CardTitle className="text-sm">Quick Actions</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => toast.info(action.label.replace("\n", " "))}
                  className={`flex flex-col items-center gap-2 py-4 px-2 rounded-xl border ${action.border} bg-[#0d1a2d] hover:bg-[#1e2d40] transition-colors`}
                >
                  <div className={`w-10 h-10 rounded-xl border ${action.border} ${action.color} flex items-center justify-center`}>
                    <action.icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] text-gray-400 text-center leading-tight whitespace-pre-line">
                    {action.label}
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Kora Suggestions ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-gray-200">Kora Suggestions</h3>
            </div>
            <button className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1">
              View all <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {koraSuggestions.map((s) => (
              <div
                key={s.title}
                className={`rounded-xl border ${s.color} bg-[#0d1a2d] p-4 cursor-pointer hover:bg-[#1e2d40] transition-colors`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-9 h-9 rounded-xl ${s.iconBg} flex items-center justify-center shrink-0 text-lg leading-none`}>
                    {s.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-100 leading-tight">{s.title}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{s.sub}</p>
                  </div>
                </div>
                <button className="text-[11px] text-blue-400 flex items-center gap-1 hover:gap-1.5 transition-all font-medium">
                  Take action <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
