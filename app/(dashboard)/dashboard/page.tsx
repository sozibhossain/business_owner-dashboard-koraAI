/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  accountingApi,
  appointmentsApi,
  aiDataApi,
  employeesApi,
  userApi,
} from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials, formatCurrency, asArray } from "@/lib/utils";
import { toast } from "sonner";
import { useViewportPageSize } from "@/hooks/use-viewport-page-size";
import {
  Calendar,
  Clock,
  Users,
  DollarSign,
  Send,
  CalendarPlus2,
  Settings,
  Globe,
  BarChart3,
  Scissors,
  Zap,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  FileSliders,
  SquareCheckBig,
  Maximize2,
} from "lucide-react";

const today = new Date().toISOString().split("T")[0];
const QUICK_ACTIONS_PAGE_SIZE = 8;

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
  { icon: CalendarPlus2, label: "Show me today's appointments" },
  { icon: Clock, label: "Move an appointment" },
  { icon: BarChart3, label: "Show my weekly performance" },
];

const paginate = <T,>(items: T[], page: number, pageSize: number) =>
  items.slice(page * pageSize, page * pageSize + pageSize);

const getPageCount = (count: number, pageSize: number) =>
  Math.max(1, Math.ceil(count / pageSize));

const PaginationControls = ({
  page,
  pageCount,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}) => {
  if (pageCount <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8 rounded-md"
        disabled={page === 0}
        onClick={() => onPageChange(Math.max(0, page - 1))}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="min-w-16 text-center text-xs font-medium text-gray-400">
        {page + 1} / {pageCount}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8 rounded-md"
        disabled={page >= pageCount - 1}
        onClick={() => onPageChange(Math.min(pageCount - 1, page + 1))}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

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
  const queryClient = useQueryClient();
  const [koraInput, setKoraInput] = useState("");
  const [scheduleView, setScheduleView] = useState<"Day" | "Week" | "Month">(
    "Day",
  );
  const [schedulePage, setSchedulePage] = useState(0);
  const [quickActionsPage, setQuickActionsPage] = useState(0);
  const [quickActionsPageSize, setQuickActionsPageSize] = useState(
    QUICK_ACTIONS_PAGE_SIZE,
  );
  const [koraMessages, setKoraMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([]);
  const schedulePageSize = useViewportPageSize({
    rowHeight: 58,
    reservedHeight: 460,
    min: 2,
    max: 8,
  });

  // Time-based greeting must be computed after mount, otherwise the server
  // (UTC) and the browser (local time) can render different text and trigger a
  // hydration mismatch (React error #418) in the production build.
  const [greeting, setGreeting] = useState("Welcome");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGreeting(getGreeting());
  }, []);

  useEffect(() => {
    const updatePageSizes = () => {
      const isMobile = window.innerWidth < 640;
      setQuickActionsPageSize(isMobile ? 4 : QUICK_ACTIONS_PAGE_SIZE);
    };

    updatePageSizes();
    window.addEventListener("resize", updatePageSizes);
    return () => window.removeEventListener("resize", updatePageSizes);
  }, []);

  const { data: profileData } = useQuery({
    queryKey: ["user-profile-dashboard"],
    queryFn: () => userApi.getProfile().then((r) => r.data.data),
  });

  const { data: appointmentsData } = useQuery({
    queryKey: ["dashboard-appointments", today],
    queryFn: () =>
      appointmentsApi.getAll({ date: today, limit: 20 }).then((r) => r.data),
  });

  const { data: employeesData } = useQuery({
    queryKey: ["dashboard-employees"],
    queryFn: () => employeesApi.getAll({ limit: 100 }).then((r) => r.data),
  });

  const { data: accountingData } = useQuery({
    queryKey: ["dashboard-accounting"],
    queryFn: () => accountingApi.getDashboard().then((r) => r.data.data),
  });

  const appointments = asArray<DashboardAppointment>(appointmentsData?.data);
  const employees = asArray<any>(employeesData?.data);
  const activeEmployees = employees.filter((e: DashboardEmployee) =>
    ["working", "on_break"].includes(e.status || ""),
  );

  const dashboardName =
    profileData?.name?.trim() || profileData?.businessName?.trim() || "there";
  const websiteUrl = profileData?.website?.trim();

  const quickActions = [
    {
      label: "New\nAppointment",
      icon: CalendarPlus2,
      onClick: () => router.push("/calendar?create=appointment"),
    },
    {
      label: "Create\nInvoice",
      icon: FileSliders,
      onClick: () => router.push("/accounting?create=invoice"),
    },
    {
      label: "Send\nMessage",
      icon: Send,
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
      icon: SquareCheckBig,
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

  const schedulePageCount = getPageCount(appointments.length, schedulePageSize);
  const quickActionsPageCount = getPageCount(
    quickActions.length,
    quickActionsPageSize,
  );
  const safeSchedulePage = Math.min(schedulePage, schedulePageCount - 1);
  const safeQuickActionsPage = Math.min(
    quickActionsPage,
    quickActionsPageCount - 1,
  );
  const visibleAppointments = paginate(
    appointments,
    safeSchedulePage,
    schedulePageSize,
  );
  const visibleQuickActions = paginate(
    quickActions,
    safeQuickActionsPage,
    quickActionsPageSize,
  );

  const getGuestName = (a: DashboardAppointment) =>
    a.customer?.name || a.client?.name || "Customer";

  const sendKoraMutation = useMutation({
    mutationFn: (message: string) => aiDataApi.create({ message }),
    onSuccess: (res) => {
      setKoraMessages((cur) => [
        ...cur,
        {
          role: "assistant",
          content:
            res.data?.data?.aireplay ||
            "I've analyzed your business data. Here are the insights.",
        },
      ]);
      queryClient.invalidateQueries({ queryKey: ["ai-data-history"] });
    },
    onError: () => {
      setKoraMessages((cur) => [
        ...cur,
        {
          role: "assistant",
          content:
            "Based on today's schedule, I can help review appointments, employees, reports and business insights once the assistant service is available.",
        },
      ]);
      toast.error("Kora Assistant could not respond right now.");
    },
  });

  const sendKoraMessage = (text?: string) => {
    const content = (text || koraInput).trim();
    if (!content || sendKoraMutation.isPending) return;
    setKoraMessages((cur) => [
      ...cur,
      { role: "user", content },
    ]);
    sendKoraMutation.mutate(content);
    setKoraInput("");
  };

  const showChips = koraMessages.length === 0;

  return (
    <div className="dashboard-page flex flex-col">
      <Header
        title={`${greeting}, ${dashboardName}!`}
        subtitle="Here's what's happening with your business today."
      />
      <div className="dashboard-content flex flex-col gap-3 2xl:gap-4">
        {/* ── Stat cards ── */}
        <div className="dashboard-kpi-grid">
          {stats.map((item) => (
            <Card
              key={item.label}
              className="bg-gradient-to-br from-[#0c1b2e] to-[#071321]"
            >
              <CardContent className="min-h-0 px-4 py-4 2xl:px-5 2xl:py-5">
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
                      <p className="dashboard-fluid-value font-semibold text-white">
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
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-2">
          {/* Today's Schedule */}
          <Card className="flex min-h-0 flex-col bg-gradient-to-br from-[#071321] to-[#09192b]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarPlus2 className="h-5 w-5 text-gray-200" />
                  <CardTitle className="text-lg font-semibold text-white">
                    Today&apos;s Schedule
                  </CardTitle>
                </div>
                <div className="flex overflow-hidden rounded-lg border border-[#15263a] bg-[#06111f]/90 p-0.5">
                  {(["Day", "Week", "Month"] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => {
                        setScheduleView(v);
                        setSchedulePage(0);
                      }}
                      className={`min-w-12 rounded-md px-2 py-1.5 text-xs font-medium transition-colors sm:min-w-16 sm:px-4 ${
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
            <CardContent className="flex min-h-0 flex-1 flex-col pb-4">
              {appointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Calendar className="w-9 h-9 text-gray-700 mb-2" />
                  <p className="text-sm text-gray-500">
                    No appointments today.
                  </p>
                </div>
              ) : (
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
                    {visibleAppointments.map((apt, idx) => {
                      const hour = apt.startTime?.slice(0, 5) || "--:--";
                      const isLast = idx === visibleAppointments.length - 1;
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
                                {apt.startTime?.slice(0, 5)} -{" "}
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
                  <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
                    <PaginationControls
                      page={safeSchedulePage}
                      pageCount={schedulePageCount}
                      onPageChange={setSchedulePage}
                    />
                    <button
                      type="button"
                      onClick={() => router.push("/calendar")}
                      className="flex h-10 w-fit items-center justify-center gap-2 rounded-lg bg-[#0d1a2d] px-6 text-sm font-medium text-white transition-colors hover:bg-[#122238]"
                    >
                      View full calendar <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Kora Assistant */}
          <Card className="relative flex min-h-0 flex-col overflow-hidden border-[#173050] bg-[radial-gradient(circle_at_76%_34%,rgba(0,127,255,0.2),transparent_26%),linear-gradient(135deg,#071321,#061326_58%,#081a2c)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_0_34px_rgba(2,132,199,0.08)]">
            <CardHeader className="relative z-10 pb-2">
              <div className="flex min-w-0 items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#071321] shadow-[0_0_18px_rgba(0,183,255,0.35)] ring-1 ring-cyan-400/25">
                    <Image
                      src="/kora-logo.png"
                      alt="KoraAI"
                      width={36}
                      height={36}
                      className="h-full w-full object-cover"
                      priority
                    />
                  </div>
                  <CardTitle className="truncate text-lg font-semibold text-white">
                    Kora Assistant
                  </CardTitle>
                </div>
                <button
                  type="button"
                  onClick={() => router.push("/assistant")}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-[#0d1a2d] hover:text-gray-200"
                  aria-label="Open Kora Assistant full page"
                >
                  <Maximize2 className="h-[18px] w-[18px]" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="relative z-10 flex min-h-0 flex-1 flex-col">
              <div className="grid min-h-0 w-full flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(11rem,0.72fr)]">
                <div className="flex min-h-0 flex-col overflow-hidden">
                  {showChips ? (
                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                      <p className="mb-4 max-w-full rounded-xl border border-[#1e2d40] bg-[#0d1a2d]/85 px-4 py-3 text-sm text-gray-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                        Hi {dashboardName}! How can I help you today?
                      </p>
                      <p className="mb-3 text-sm font-semibold text-gray-100">
                        Here are some suggestions:
                      </p>
                      <div className="scrollbar-none min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                        {koraSuggestionChips.map((chip) => (
                          <button
                            key={chip.label}
                            onClick={() => sendKoraMessage(chip.label)}
                            disabled={sendKoraMutation.isPending}
                            className="flex min-h-14 w-full min-w-0 items-center gap-4 rounded-xl border border-[#1e2d40] bg-[#0d1a2d]/90 px-4 py-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-all hover:border-[#79C1EC]/45 hover:bg-[#122238] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <chip.icon className="h-5 w-5 shrink-0 text-gray-200" />
                            <span className="min-w-0 truncate text-sm font-medium text-gray-100">
                              {chip.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="scrollbar-none min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                      {koraMessages.map((msg, i) => (
                        <div
                          key={i}
                          className={`flex ${msg.role === "user" ? "justify-end" : "items-start gap-2"}`}
                        >
                          {msg.role === "assistant" && (
                            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-600/20">
                              <Image
                                src="/kora.png"
                                alt=""
                                width={24}
                                height={24}
                                unoptimized
                                className="h-full w-full object-cover"
                              />
                            </div>
                          )}
                          <div
                            className={`max-w-[85%] rounded-xl px-3 py-2 ${
                              msg.role === "user"
                                ? "bg-blue-600 text-white"
                                : "bg-[#1e2d40] text-gray-200"
                            }`}
                          >
                            <p className="text-xs">{msg.content}</p>
                          </div>
                        </div>
                      ))}
                      {sendKoraMutation.isPending && (
                        <div className="flex items-start gap-2">
                          <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-600/20">
                            <Image
                              src="/kora.png"
                              alt=""
                              width={24}
                              height={24}
                              unoptimized
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="rounded-xl bg-[#1e2d40] px-3 py-2 text-gray-300">
                            <p className="text-xs">Kora is thinking...</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="relative hidden min-h-0 items-center justify-center lg:flex">
                  <div className="flex w-[clamp(8rem,12vw,10rem)] justify-center">
                    <Image
                      src="/kora.png"
                      alt="Kora"
                      width={150}
                      height={150}
                      unoptimized
                      priority
                      className="kora-image h-[clamp(7.5rem,11vw,9.5rem)] w-[clamp(7.5rem,11vw,9.5rem)] object-contain drop-shadow-[0_0_24px_rgba(59,130,246,0.45)]"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-auto flex shrink-0 gap-2 pt-4">
                <input
                  value={koraInput}
                  onChange={(e) => setKoraInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendKoraMessage()}
                  disabled={sendKoraMutation.isPending}
                  placeholder="Ask Kora anything..."
                  className="min-h-12 flex-1 rounded-xl border border-[#1e2d40] bg-[#0d1a2d]/90 px-4 text-sm text-gray-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] placeholder:text-gray-500 transition-colors focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                />
                <Button
                  size="icon"
                  className="h-12 w-12 shrink-0 rounded-full bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.45)] hover:bg-blue-700"
                  disabled={!koraInput.trim() || sendKoraMutation.isPending}
                  onClick={() => sendKoraMessage()}
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Quick Actions ── */}
        <Card className="dashboard-secondary bg-gradient-to-br from-[#071321] to-[#09192b]">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-[#79C1EC] drop-shadow-[0_0_6px_rgba(121,193,236,0.55)]" />
              <CardTitle className="text-lg font-semibold text-white">
                Quick Actions
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0 2xl:px-5 2xl:pb-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
              {visibleQuickActions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onClick}
                  className="group flex min-h-[104px] flex-col items-center justify-center gap-2 rounded-lg border border-[#1c2c43] bg-[#0d1a2d]/90 px-3 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-colors hover:border-[#79C1EC]/45 hover:bg-[#122238] 2xl:min-h-[132px] 2xl:gap-3 2xl:py-5"
                >
                  <action.icon
                    className="h-8 w-8 text-[#79C1EC] drop-shadow-[0_0_9px_rgba(121,193,236,0.45)] transition-transform group-hover:scale-105 2xl:h-11 2xl:w-11"
                    strokeWidth={1.9}
                  />
                  <span className="whitespace-pre-line text-center text-sm font-medium leading-tight text-gray-100 2xl:text-base">
                    {action.label}
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-4">
              <PaginationControls
                page={safeQuickActionsPage}
                pageCount={quickActionsPageCount}
                onPageChange={setQuickActionsPage}
              />
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
