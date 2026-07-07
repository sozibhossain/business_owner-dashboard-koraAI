/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
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
import { getInitials, formatCurrency, asArray } from "@/lib/utils";
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
  Scissors,
  Zap,
  ChevronRight,
  CalendarPlus2,
  ArrowRight,
} from "lucide-react";

const today = new Date().toISOString().split("T")[0];

/* ── Sparkline mini-chart ── */
const SparkLine = ({ seed, color }: { seed: number; color: string }) => {
  const points = Array.from({ length: 12 }, (_, i) => {
    const noise = ((seed * 9301 + i * 49297) % 233280) / 233280;
    return 8 + Math.round(noise * 16);
  });
  const path = points.map((v, i) => `${(i / 11) * 100},${24 - v}`).join(" ");
  return (
    <svg
      viewBox="0 0 100 24"
      className="h-7 w-20 shrink-0"
      preserveAspectRatio="none"
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={path}
      />
    </svg>
  );
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

const koraSuggestionChips = [
  { icon: CalendarDays, label: "Show me today's appointments" },
  { icon: ArrowRight, label: "Move an appointment" },
  { icon: BarChart3, label: "Show my weekly performance" },
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
  const router = useRouter();
  const [koraInput, setKoraInput] = useState("");
  const [scheduleView, setScheduleView] = useState<"Day" | "Week" | "Month">(
    "Day",
  );
  const [koraMessages, setKoraMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([]);

  // Time-based greeting must be computed after mount, otherwise the server
  // (UTC) and the browser (local time) can render different text and trigger a
  // hydration mismatch (React error #418) in the production build.
  const [greeting, setGreeting] = useState("Welcome");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGreeting(getGreeting());
  }, []);

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

  const appointments = asArray<DashboardAppointment>(appointmentsData?.data);
  const employees = asArray<any>(employeesData?.data);
  const pendingRequests = asArray<any>(requestsData?.data);
  const activeEmployees = employees.filter((e: DashboardEmployee) =>
    ["working", "on_break"].includes(e.status || ""),
  );

  const dashboardName =
    profileData?.businessName?.trim() ||
    profileData?.name?.trim() ||
    "there";
  const websiteUrl = profileData?.website?.trim();

  const quickActions = [
    {
      label: "New\nAppointment",
      icon: CalendarDays,
      onClick: () => router.push("/calendar?create=appointment"),
    },
    {
      label: "Create\nInvoice",
      icon: Receipt,
      onClick: () => router.push("/accounting?create=invoice"),
    },
    {
      label: "Send\nMessage",
      icon: MessageSquare,
      onClick: () => router.push("/inbox"),
    },
    {
      label: "Manage\nEmployees",
      icon: Users,
      onClick: () => router.push("/employees"),
    },
    {
      label: "Manage\nServices",
      icon: Scissors,
      onClick: () => router.push("/services"),
    },
    {
      label: "Create\nTask",
      icon: ListTodo,
      onClick: () => router.push("/tasks"),
    },
    {
      label: "Settings",
      icon: Settings,
      onClick: () => router.push("/settings"),
    },
    {
      label: "Open\nWebsite",
      icon: Globe,
      onClick: () => {
        if (!websiteUrl) {
          toast.info("Add your website in Settings first.");
          return;
        }
        const normalizedUrl = /^https?:\/\//i.test(websiteUrl)
          ? websiteUrl
          : `https://${websiteUrl}`;
        window.open(normalizedUrl, "_blank", "noopener,noreferrer");
      },
    },
  ];

  const stats = [
    {
      label: "Today's Appointments",
      value: appointments.length,
      compare: "25% vs yesterday",
      icon: CalendarPlus2,
      color:
        "border-[#1b5fa5]/50 bg-[#1b5fa5] text-[#d7ecff] shadow-[0_0_22px_rgba(27,95,165,0.45)]",
      spark: "#79C1EC",
      seed: 11,
      positive: true,
    },
    {
      label: "This Week",
      value: accountingData?.appointmentsWeek ?? appointments.length,
      compare: "18% vs last week",
      icon: CalendarPlus2,
      color:
        "border-[#0f30d9]/50 bg-[#0f30d9] text-[#dce4ff] shadow-[0_0_22px_rgba(15,48,217,0.45)]",
      spark: "#79C1EC",
      seed: 23,
      positive: true,
    },
    {
      label: "Active Employees",
      value: activeEmployees.length,
      compare: "No change",
      icon: Users,
      color:
        "border-[#037a52]/50 bg-[#037a52] text-[#d7fff0] shadow-[0_0_22px_rgba(3,122,82,0.45)]",
      spark: "#10b981",
      seed: 7,
      positive: false,
    },
    {
      label: "Revenue (This Month)",
      value: formatCurrency(accountingData?.revenueMonth || 0),
      compare: "32% vs last month",
      icon: DollarSign,
      color:
        "border-[#1f63ac]/50 bg-[#1f63ac] text-[#d7ecff] shadow-[0_0_22px_rgba(31,99,172,0.45)]",
      spark: "#79C1EC",
      seed: 31,
      positive: true,
    },
  ];

  const koraSuggestions = useMemo(
    () => [
      {
        icon: BarChart3,
        iconBg: "bg-blue-600/20",
        iconColor: "text-[#79C1EC]",
        title: "Increase prices on weekends?",
        sub: "You could earn more per week.",
        color: "border-[#1e2d40]",
      },
      {
        icon: MessageSquare,
        iconBg: "bg-indigo-600/20",
        iconColor: "text-[#79C1EC]",
        title: `${pendingRequests.length || 2} messages need a reply`,
        sub: "Average response time: 2h 15m",
        color: "border-[#1e2d40]",
      },
      {
        icon: Sparkles,
        iconBg: "bg-emerald-600/20",
        iconColor: "text-emerald-300",
        title: "Check your SEO",
        sub: "Reward clients after 5 visits.",
        color: "border-[#1e2d40]",
      },
      {
        icon: CalendarDays,
        iconBg: "bg-amber-600/20",
        iconColor: "text-amber-300",
        title: "Slow day this Thursday",
        sub: "Add a promo to fill your schedule.",
        color: "border-[#1e2d40]",
      },
    ],
    [pendingRequests.length],
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
            {greeting}, {dashboardName}!
          </h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Here&apos;s what&apos;s happening with your business today.
          </p>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((item) => (
            <Card
              key={item.label}
              className="bg-gradient-to-br from-[#0c1b2e] to-[#071321]"
            >
              <CardContent className="min-h-[130px] px-5 py-5">
                <div className="flex h-full items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${item.color}`}
                    >
                      <item.icon className="h-6 w-6" strokeWidth={1.9} />
                    </div>
                    <div className="min-w-0">
                      <p className="mb-3 text-sm font-medium leading-tight text-gray-100">
                        {item.label}
                      </p>
                      <p className="text-3xl font-semibold leading-none text-white">
                        {item.value}
                      </p>
                      <p
                        className={`mt-4 flex items-center gap-1 text-xs leading-tight ${item.positive ? "text-emerald-400" : "text-gray-400"}`}
                      >
                        <span>{item.positive ? "+" : "-"}</span>
                        {item.compare}
                      </p>
                    </div>
                  </div>
                  <div className="mt-auto pb-1">
                    <SparkLine seed={item.seed} color={item.spark} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Today's Schedule + Kora Assistant ── */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Today's Schedule */}
          <Card className="bg-gradient-to-br from-[#071321] to-[#09192b]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-gray-200" />
                  <CardTitle className="text-lg font-semibold text-white">
                    Today&apos;s Schedule
                  </CardTitle>
                </div>
                <div className="flex overflow-hidden rounded-lg border border-[#15263a] bg-[#06111f]/90 p-0.5">
                  {(["Day", "Week", "Month"] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setScheduleView(v)}
                      className={`min-w-16 rounded-md px-4 py-1.5 text-xs font-medium transition-colors ${
                        scheduleView === v
                          ? "bg-gradient-to-b from-[#116fd8] to-[#063f92] text-white shadow-[0_0_16px_rgba(37,99,235,0.5)]"
                          : "text-gray-400 hover:text-gray-200"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              {appointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Calendar className="w-9 h-9 text-gray-700 mb-2" />
                  <p className="text-sm text-gray-500">
                    No appointments today.
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    {appointments.map((apt, idx) => {
                      const hour = apt.startTime?.slice(0, 5) || "--:--";
                      const isLast = idx === appointments.length - 1;
                      return (
                        <div key={apt._id} className="flex gap-4">
                          {/* Time */}
                          <div className="w-12 shrink-0 pt-3 text-right">
                            <span className="text-sm text-gray-100">
                              {hour}
                            </span>
                          </div>
                          {/* Timeline */}
                          <div className="flex flex-col items-center">
                            <div className="mt-4 h-3 w-3 shrink-0 rounded-full bg-[#38bdf8] ring-2 ring-[#38bdf8]/20" />
                            {!isLast && (
                              <div className="my-1 w-px flex-1 bg-[#0ea5e9]/70" />
                            )}
                          </div>
                          {/* Card */}
                          <div
                            className={`flex flex-1 items-center justify-between gap-3 rounded-lg border-l-2 border-[#1fe2d0] bg-[#0d1a2d]/90 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] ${!isLast ? "mb-1" : ""}`}
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-gray-100">
                                {getGuestName(apt)}
                              </p>
                              <p className="truncate text-xs text-gray-400">
                                {apt.service ||
                                  String(apt.status || "Appointment").replace(
                                    /_/g,
                                    " ",
                                  )}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="whitespace-nowrap text-xs text-gray-400">
                                {apt.startTime?.slice(0, 5)} –{" "}
                                {apt.endTime?.slice(0, 5)}
                              </span>
                              <Avatar className="h-7 w-7">
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
                  <button className="mx-auto mt-4 flex h-10 w-fit items-center justify-center gap-2 rounded-lg bg-[#0d1a2d] px-8 text-sm font-medium text-white transition-colors hover:bg-[#122238]">
                    View full calendar <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Kora Assistant */}
          <Card className="border-blue-600/20 bg-gradient-to-br from-[#071321] to-[#081a2c]">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <Sparkles className="h-6 w-6 text-[#79C1EC] drop-shadow-[0_0_10px_rgba(121,193,236,0.6)]" />
                <CardTitle className="text-lg font-semibold text-white">
                  Kora Assistant
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid min-h-[286px] grid-cols-1 gap-5 sm:grid-cols-[minmax(0,1fr)_220px]">
                {/* Chat + chips */}
                <div className="flex min-w-0 flex-col">
                  {showChips ? (
                    <>
                      <p className="mb-5 w-fit rounded-xl border border-[#1e2d40] bg-[#0d1a2d] px-4 py-3 text-base text-gray-300">
                        Hi {dashboardName}! How can I help you today?
                      </p>
                      <p className="mb-4 text-sm font-medium text-gray-100">
                        Here are some suggestions:
                      </p>
                      <div className="mb-5 space-y-3">
                        {koraSuggestionChips.map((chip) => (
                          <button
                            key={chip.label}
                            onClick={() => sendKoraMessage(chip.label)}
                            className="flex w-full items-center gap-3 rounded-xl border border-[#1e2d40] bg-[#0d1a2d] px-4 py-3 text-left transition-all hover:border-blue-600/30 hover:bg-[#122238]"
                          >
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#101f35]">
                              <chip.icon className="h-4 w-4 text-gray-200" />
                            </div>
                            <span className="text-sm text-gray-100">
                              {chip.label}
                            </span>
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

                  <div className="mt-auto flex gap-2">
                    <input
                      value={koraInput}
                      onChange={(e) => setKoraInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendKoraMessage()}
                      placeholder="Ask Kora anything..."
                      className="min-h-12 flex-1 rounded-xl border border-[#1e2d40] bg-[#0d1a2d] px-4 text-sm text-gray-200 placeholder:text-gray-500 transition-colors focus:border-blue-500 focus:outline-none"
                    />
                    <Button
                      size="icon"
                      className="h-12 w-12 rounded-full bg-blue-600 hover:bg-blue-700"
                      onClick={() => sendKoraMessage()}
                    >
                      <Send className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                {/* AI Orb */}
                <div className="hidden w-50 shrink-0 items-center justify-center sm:flex">
                  <Image
                    src="/kora.png"
                    alt="Kora"
                    width={200}
                    height={200}
                    unoptimized
                    priority
                    className="kora-image h-[200px] w-[200px] object-contain"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Quick Actions ── */}
        <Card className="bg-gradient-to-br from-[#071321] to-[#09192b]">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-[#79C1EC] drop-shadow-[0_0_6px_rgba(121,193,236,0.55)]" />
              <CardTitle className="text-lg font-semibold text-white">
                Quick Actions
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-0">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 xl:grid-cols-8">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onClick}
                  className="group flex min-h-[132px] flex-col items-center justify-center gap-3 rounded-lg border border-[#1c2c43] bg-[#0d1a2d]/90 px-3 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-colors hover:border-[#79C1EC]/45 hover:bg-[#122238]"
                >
                  <action.icon
                    className="h-11 w-11 text-[#79C1EC] drop-shadow-[0_0_9px_rgba(121,193,236,0.45)] transition-transform group-hover:scale-105"
                    strokeWidth={1.9}
                  />
                  <span className="whitespace-pre-line text-center text-base font-medium leading-tight text-gray-100">
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
              <h3 className="text-sm font-semibold text-gray-200">
                Kora Suggestions
              </h3>
            </div>
            <button className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1">
              View all <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {koraSuggestions.map((s) => {
              const SuggestionIcon = s.icon;
              return (
                <div
                  key={s.title}
                  className={`rounded-xl border ${s.color} bg-[#0d1a2d] p-4 cursor-pointer hover:bg-[#1e2d40] transition-colors`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className={`w-9 h-9 rounded-xl ${s.iconBg} flex items-center justify-center shrink-0`}
                    >
                      <SuggestionIcon
                        className={`h-4.5 w-4.5 ${s.iconColor}`}
                        strokeWidth={1.9}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-100 leading-tight">
                        {s.title}
                      </p>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        {s.sub}
                      </p>
                    </div>
                  </div>
                  <button className="text-[11px] text-blue-400 flex items-center gap-1 hover:gap-1.5 transition-all font-medium">
                    Take action <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
