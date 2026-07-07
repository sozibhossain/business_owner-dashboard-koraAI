/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { appointmentsApi, employeesApi } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getInitials, formatCurrency, formatDate, asArray } from "@/lib/utils";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Filter,
  LayoutGrid,
  LogIn,
  LogOut,
  Mail,
  MoreVertical,
  Phone,
  Plus,
  Search,
  Star,
  Trash2,
  TrendingUp,
  UserMinus,
  Users,
  UserX,
} from "lucide-react";

/* ─────────────────────────  Helpers  ───────────────────────── */

const toDateKey = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const timeToMin = (t?: string) => {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

const shortTime = (value?: string | Date | null) =>
  value
    ? new Date(value).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
    : "";

/* Attendance presentation from a team-attendance record */
const attendanceMeta = (att: any) => {
  if (!att || !att.checkInTime) {
    return { state: "none" as const, dot: "bg-gray-600", text: "text-gray-500", label: "Not checked in", pulse: false };
  }
  if (att.isActiveSession) {
    return { state: "in" as const, dot: "bg-emerald-500", text: "text-emerald-400", label: `In · ${shortTime(att.checkInTime)}`, pulse: true };
  }
  return { state: "out" as const, dot: "bg-gray-500", text: "text-gray-400", label: `Out · ${att.totalWorkedTime || ""}`.trim(), pulse: false };
};

const STATUS: Record<string, { label: string; dot: string; text: string; chip: string }> = {
  working: { label: "Working", dot: "bg-emerald-500", text: "text-emerald-400", chip: "bg-emerald-600/15 text-emerald-300 border-emerald-600/30" },
  on_break: { label: "On Break", dot: "bg-amber-500", text: "text-amber-400", chip: "bg-amber-600/15 text-amber-300 border-amber-600/30" },
  on_leave: { label: "On Leave", dot: "bg-blue-500", text: "text-blue-400", chip: "bg-blue-600/15 text-blue-300 border-blue-600/30" },
  off: { label: "Off", dot: "bg-gray-500", text: "text-gray-400", chip: "bg-gray-600/20 text-gray-400 border-gray-600/30" },
};
const statusMeta = (s?: string) => STATUS[s || "off"] || STATUS.off;

const utilColor = (u: number) =>
  u > 100 ? "text-red-400" : u >= 50 ? "text-emerald-400" : u > 0 ? "text-amber-400" : "text-gray-500";
const utilBar = (u: number) =>
  u > 100 ? "bg-red-500" : u >= 50 ? "bg-emerald-500" : u > 0 ? "bg-amber-500" : "bg-gray-600";

const APPT_BADGE: Record<string, { label: string; cls: string }> = {
  upcoming: { label: "Upcoming", cls: "bg-blue-600/15 text-blue-300 border-blue-600/30" },
  rescheduled: { label: "Rescheduled", cls: "bg-amber-600/15 text-amber-300 border-amber-600/30" },
  started: { label: "In Progress", cls: "bg-amber-600/15 text-amber-300 border-amber-600/30" },
  ongoing: { label: "In Progress", cls: "bg-amber-600/15 text-amber-300 border-amber-600/30" },
  completed: { label: "Completed", cls: "bg-emerald-600/15 text-emerald-300 border-emerald-600/30" },
  cancelled: { label: "Cancelled", cls: "bg-red-600/15 text-red-300 border-red-600/30" },
  no_show: { label: "No Show", cls: "bg-gray-600/20 text-gray-400 border-gray-600/30" },
};
const apptBadge = (s?: string) => APPT_BADGE[s || "upcoming"] || APPT_BADGE.upcoming;

const SparkLine = ({ seed, color }: { seed: number; color: string }) => {
  const pts = Array.from({ length: 12 }, (_, i) => {
    const n = ((seed * 9301 + i * 49297) % 233280) / 233280;
    return 6 + Math.round(n * 16);
  });
  const path = pts.map((v, i) => `${(i / 11) * 100},${24 - v}`).join(" ");
  return (
    <svg viewBox="0 0 100 24" className="h-8 w-16 shrink-0" preserveAspectRatio="none">
      <polyline fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" points={path} />
    </svg>
  );
};

const empName = (e: any) => e?.userId?.name || "Employee";

/* ─────────────────────────  Page  ───────────────────────── */

export default function EmployeesPage() {
  const queryClient = useQueryClient();
  const todayKey = toDateKey(new Date());

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [view, setView] = useState<"cards" | "schedule">("cards");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<"overview" | "schedule" | "performance" | "settings">("overview");

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [attendanceOpen, setAttendanceOpen] = useState(false);

  /* ── Queries ── */
  const { data: resp, isLoading } = useQuery({
    queryKey: ["employees-all"],
    queryFn: () => employeesApi.getAll({ limit: 100 }).then((r) => r.data),
  });

  const { data: todayResp } = useQuery({
    queryKey: ["employees-today-appts", todayKey],
    queryFn: () => appointmentsApi.getAll({ date: todayKey, limit: 300 }).then((r) => r.data),
  });

  // Live team attendance — refreshes so employee check-ins appear without a manual reload
  const { data: attendanceResp } = useQuery({
    queryKey: ["employees-attendance"],
    queryFn: () => employeesApi.getTeamAttendance().then((r) => r.data).catch(() => ({ data: [], meta: {} })),
    refetchInterval: 30_000,
  });

  const employees: any[] = useMemo(() => asArray(resp?.data), [resp]);
  const summary = resp?.meta?.summary || {};
  const todayAppts: any[] = useMemo(() => asArray(todayResp?.data), [todayResp]);

  const attendanceByUser = useMemo(() => {
    const map: Record<string, any> = {};
    asArray(attendanceResp?.data).forEach((row: any) => {
      if (row.userId) map[String(row.userId)] = row.attendance;
    });
    return map;
  }, [attendanceResp]);
  const checkedInCount = attendanceResp?.meta?.checkedIn ?? 0;

  const todayCountByUser = useMemo(() => {
    const map: Record<string, number> = {};
    todayAppts.forEach((a) => {
      if (a.status === "cancelled") return;
      const id = String(a?.employee?._id || "");
      if (id) map[id] = (map[id] || 0) + 1;
    });
    return map;
  }, [todayAppts]);

  const selected = useMemo(
    () => employees.find((e) => e._id === selectedId) || employees[0] || null,
    [employees, selectedId]
  );
  const selectedEmployeeId = selected?._id || null;

  /* selected employee detail queries */
  const { data: perfResp } = useQuery({
    queryKey: ["employee-perf", selectedEmployeeId],
    queryFn: () => employeesApi.getPerformance(selectedEmployeeId as string).then((r) => r.data.data),
    enabled: !!selectedEmployeeId && (tab === "overview" || tab === "performance"),
  });

  const { data: schedResp } = useQuery({
    queryKey: ["employee-schedule", selectedEmployeeId],
    queryFn: () => employeesApi.getSchedule(selectedEmployeeId as string).then((r) => r.data.data),
    enabled: !!selectedEmployeeId && (tab === "overview" || tab === "schedule"),
  });

  /* ── Metrics ── */
  const total = summary.totalEmployees ?? employees.length;
  const activeToday = employees.filter((e) => ["working", "on_break"].includes(e.status)).length;
  const onLeave = employees.filter((e) => e.status === "on_leave").length;
  const avgUtil = employees.length
    ? Math.round(employees.reduce((s, e) => s + (e.utilizationRate || 0), 0) / employees.length)
    : 0;

  const metricCards = [
    { label: "Total Employees", value: total, icon: Users, color: "bg-purple-600", spark: "#a855f7", seed: 11, helper: "Across your team" },
    { label: "Active Today", value: activeToday, icon: Users, color: "bg-emerald-600", spark: "#10b981", seed: 7, helper: `${checkedInCount} checked in today` },
    { label: "On Leave", value: onLeave, icon: UserMinus, color: "bg-orange-600", spark: "#f97316", seed: 23, helper: "Out today" },
    { label: "Avg. Utilization", value: `${avgUtil}%`, icon: TrendingUp, color: "bg-blue-600", spark: "#3b82f6", seed: 31, helper: "Team average" },
  ];

  /* ── Kora Insights ── */
  const insights = useMemo(() => {
    const out: { icon: any; tint: string; title: string; sub: string }[] = [];
    const over = [...employees].sort((a, b) => (b.utilizationRate || 0) - (a.utilizationRate || 0))[0];
    if (over && (over.utilizationRate || 0) > 100) {
      out.push({ icon: Users, tint: "bg-red-600/15 text-red-400", title: `${empName(over).split(" ")[0]} is overbooked today`, sub: `${over.utilizationRate}% of capacity` });
    }
    const free = [...employees]
      .filter((e) => e.status === "working")
      .sort((a, b) => (a.utilizationRate || 0) - (b.utilizationRate || 0))[0];
    if (free) {
      out.push({ icon: Users, tint: "bg-emerald-600/15 text-emerald-400", title: `${empName(free).split(" ")[0]} has free availability`, sub: `${free.utilizationRate || 0}% utilization` });
    }
    const low = [...employees].sort((a, b) => (a.utilizationRate || 0) - (b.utilizationRate || 0))[0];
    if (low && (low.utilizationRate || 0) < 50) {
      out.push({ icon: TrendingUp, tint: "bg-blue-600/15 text-blue-400", title: `${empName(low).split(" ")[0]} has low utilization`, sub: `${low.utilizationRate || 0}% this week` });
    }
    return out.slice(0, 3);
  }, [employees]);

  /* ── Directory filtering ── */
  const roles = useMemo(
    () => Array.from(new Set(employees.map((e) => e.position).filter(Boolean))),
    [employees]
  );

  const filtered = useMemo(() => {
    return employees.filter((e) => {
      if (roleFilter !== "all" && e.position !== roleFilter) return false;
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const hit = `${empName(e)} ${e.position || ""} ${e.userId?.email || ""}`.toLowerCase();
        if (!hit.includes(q)) return false;
      }
      return true;
    });
  }, [employees, roleFilter, statusFilter, search]);

  /* ── Mutations ── */
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["employees-all"] });
    queryClient.invalidateQueries({ queryKey: ["employee-perf", selectedEmployeeId] });
    queryClient.invalidateQueries({ queryKey: ["employee-schedule", selectedEmployeeId] });
  };

  const createMutation = useMutation({
    mutationFn: (data: any) => employeesApi.create(data),
    onSuccess: () => {
      toast.success("Employee created — credentials emailed");
      setAddOpen(false);
      invalidate();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Could not create employee"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => employeesApi.update(id, data),
    onSuccess: () => {
      toast.success("Employee updated");
      setEditOpen(false);
      invalidate();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Could not update employee"),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => employeesApi.toggleStatus(id, { status }),
    onSuccess: (r: any) => {
      toast.success(r?.data?.message || "Status updated");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Could not update status"),
  });

  const scheduleMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => employeesApi.updateSchedule(id, data),
    onSuccess: () => {
      toast.success("Schedule updated");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Could not update schedule"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => employeesApi.delete(id),
    onSuccess: () => {
      toast.success("Employee removed");
      setSelectedId(null);
      invalidate();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Could not remove employee"),
  });

  return (
    <div>
      <Header
        title="Employees"
        subtitle="Manage your team, track performance and optimize schedules."
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setAttendanceOpen(true)} className="hidden h-9 gap-1.5 sm:flex">
              <CalendarCheck className="h-4 w-4" /> Attendance
            </Button>
            <div className="flex overflow-hidden rounded-lg shadow-[0_0_18px_rgba(37,99,235,0.35)]">
              <Button onClick={() => setAddOpen(true)} className="h-9 rounded-r-none gap-1.5">
                <Plus className="h-4 w-4" /> Add Employee
              </Button>
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="flex h-9 w-10 items-center justify-center border-l border-blue-400/30 bg-blue-600 text-white hover:bg-blue-700"
                aria-label="Add employee options"
              >
                <ChevronRight className="h-4 w-4 rotate-90" />
              </button>
            </div>
          </div>
        }
      />

      <div className="space-y-5 p-3 sm:p-4 lg:p-6">
        {/* ── Heading + Add ── */}
        {/* ── Metric cards ── */}
        <div className={`grid grid-cols-1 gap-5 ${selected ? "xl:grid-cols-[minmax(0,1fr)_430px]" : ""}`}>
          <div className="min-w-0 space-y-5">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}><CardContent className="p-4"><Skeleton className="h-14 w-full" /></CardContent></Card>
              ))
            : metricCards.map((m) => (
                <Card key={m.label} className="overflow-hidden border-[#173050] bg-gradient-to-br from-[#0c1c31] to-[#071321] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                  <CardContent className="p-4">
                    <div className="flex min-h-[94px] items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="mb-2 flex items-center gap-2">
                          <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${m.color} shadow-[0_0_24px_rgba(37,99,235,0.28)]`}>
                            <m.icon className="h-5 w-5 text-white" />
                          </div>
                          <p className="truncate text-xs font-medium text-gray-300">{m.label}</p>
                        </div>
                        <p className="text-3xl font-semibold leading-none text-white">{m.value}</p>
                        <p className="mt-3 text-[11px] text-emerald-400">{m.helper}</p>
                      </div>
                      <SparkLine seed={m.seed} color={m.spark} />
                    </div>
                  </CardContent>
                </Card>
              ))}
        </div>

        {/* ── Kora Insights ── */}
        <Card className="overflow-hidden border-[#173050] bg-[radial-gradient(circle_at_4%_50%,rgba(37,99,235,0.24),transparent_13%),linear-gradient(135deg,#071321,#0b1a2f)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <div className="flex h-[104px] w-[104px] shrink-0 items-center justify-center">
                <Image
                  src="/kora.png"
                  alt="Kora"
                  width={104}
                  height={104}
                  unoptimized
                  className="kora-image h-[104px] w-[104px] object-contain drop-shadow-[0_0_24px_rgba(59,130,246,0.45)]"
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="mb-3 text-lg font-semibold leading-none text-white">Kora Insights</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {insights.length ? (
                    insights.map((ins, i) => (
                      <button key={i} className="flex min-h-[62px] items-center gap-3 rounded-lg border border-[#1e2d40] bg-[#0d1a2d]/85 px-3 py-2.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-colors hover:bg-[#122238]">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${ins.tint}`}>
                        <ins.icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-gray-200">{ins.title}</p>
                        <p className="mt-1 truncate text-[11px] text-gray-500">{ins.sub}</p>
                      </div>
                    </button>
                    ))
                  ) : (
                    <p className="col-span-full py-4 text-center text-xs text-gray-500">No insights yet.</p>
                  )}
                </div>
              </div>

              <button className="flex shrink-0 items-center gap-2 self-start whitespace-nowrap rounded-lg border border-[#1e2d40] bg-[#0d1a2d]/70 px-4 py-2.5 text-sm text-gray-200 transition-colors hover:bg-[#1e2d40] lg:self-end">
                View all insights <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* ── Toolbar ── */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-60 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employees..." className="h-10 rounded-lg border-[#1e2d40] bg-[#0d1526] pl-9 text-sm" />
          </div>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="h-10 rounded-lg border border-[#1e2d40] bg-[#0d1526] px-4 text-xs text-gray-300 focus:outline-none">
            <option value="all">All Roles</option>
            {roles.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-lg border border-[#1e2d40] bg-[#0d1526] px-4 text-xs text-gray-300 focus:outline-none">
            <option value="all">All Status</option>
            <option value="working">Working</option>
            <option value="on_break">On Break</option>
            <option value="on_leave">On Leave</option>
            <option value="off">Off</option>
          </select>
          <button className="flex h-10 items-center gap-1.5 rounded-lg border border-[#1e2d40] bg-[#0d1526] px-4 text-xs text-gray-300 hover:bg-[#1e2d40]">
            <Filter className="h-3.5 w-3.5" /> Filters
          </button>
          <div className="ml-auto flex h-10 items-center gap-0.5 rounded-lg bg-[#0d1a2d] p-0.5">
            <button onClick={() => setView("cards")} className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-[11px] font-medium transition-colors ${view === "cards" ? "bg-blue-600 text-white shadow-[0_0_14px_rgba(37,99,235,0.45)]" : "text-gray-400"}`}>
              <LayoutGrid className="h-3.5 w-3.5" /> Cards View
            </button>
            <button onClick={() => setView("schedule")} className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-[11px] font-medium transition-colors ${view === "schedule" ? "bg-blue-600 text-white shadow-[0_0_14px_rgba(37,99,235,0.45)]" : "text-gray-400"}`}>
              <CalendarClock className="h-3.5 w-3.5" /> Schedule View
            </button>
          </div>
        </div>

        {/* ── Main grid ── */}
        <div>
          {/* Directory */}
          <div className="min-w-0">
            {isLoading ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 w-full" />)}
              </div>
            ) : filtered.length === 0 ? (
              <Card><CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Users className="mb-2 h-10 w-10 text-gray-700" />
                <p className="text-sm text-gray-400">No employees match your filters.</p>
              </CardContent></Card>
            ) : view === "schedule" ? (
              /* Schedule view */
              <Card><CardContent className="p-0">
                <div className="divide-y divide-[#1e2d40]">
                  {filtered.map((e) => {
                    const sm = statusMeta(e.status);
                    const count = todayCountByUser[String(e.userId?._id)] || 0;
                    const am = attendanceMeta(attendanceByUser[String(e.userId?._id)]);
                    return (
                      <button key={e._id} onClick={() => setSelectedId(e._id)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#0d1a2d]">
                        <Avatar className="h-9 w-9">
                          {e.userId?.profileImage?.url ? <AvatarImage src={e.userId.profileImage.url} alt={empName(e)} /> : null}
                          <AvatarFallback className="text-[10px]">{getInitials(empName(e))}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-200">{empName(e)}</p>
                          <p className="truncate text-[11px] text-gray-500">{e.position}</p>
                        </div>
                        <span className={`hidden w-28 items-center gap-1.5 text-[11px] sm:flex ${am.text}`}><span className={`h-2 w-2 rounded-full ${am.dot}`} />{am.label}</span>
                        <span className={`flex items-center gap-1.5 text-[11px] ${sm.text}`}><span className={`h-2 w-2 rounded-full ${sm.dot}`} />{sm.label}</span>
                        <span className="w-24 text-right text-[11px] text-gray-400">{count} appt{count === 1 ? "" : "s"} today</span>
                        <span className={`w-16 text-right text-xs font-semibold ${utilColor(e.utilizationRate || 0)}`}>{e.utilizationRate || 0}%</span>
                      </button>
                    );
                  })}
                </div>
              </CardContent></Card>
            ) : (
              /* Cards view */
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {filtered.map((e) => {
                  const sm = statusMeta(e.status);
                  const util = e.utilizationRate || 0;
                  const count = todayCountByUser[String(e.userId?._id)] || 0;
                  const att = attendanceByUser[String(e.userId?._id)];
                  const am = attendanceMeta(att);
                  const active = selected?._id === e._id;
                  return (
                    <Card
                      key={e._id}
                      onClick={() => { setSelectedId(e._id); setTab("overview"); }}
                      className={`cursor-pointer overflow-hidden border-[#173050] bg-[#0b1728] transition-colors hover:border-blue-500/50 ${active ? "border-blue-500 shadow-[0_0_22px_rgba(37,99,235,0.25)]" : ""}`}
                    >
                      <CardContent className="p-3.5">
                        <div className="flex items-start gap-3">
                          <div className="relative shrink-0">
                            <Avatar className="h-12 w-12 ring-1 ring-white/10">
                              {e.userId?.profileImage?.url ? <AvatarImage src={e.userId.profileImage.url} alt={empName(e)} /> : null}
                              <AvatarFallback>{getInitials(empName(e))}</AvatarFallback>
                            </Avatar>
                            {am.state === "in" && (
                              <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-[#0d1a2d] bg-emerald-500">
                                <span className="h-1.5 w-1.5 animate-ping rounded-full bg-white/80" />
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[15px] font-semibold text-gray-100">{empName(e)}</p>
                            <p className="truncate text-[11px] text-gray-500">{e.position}</p>
                            <p className={`mt-0.5 flex items-center gap-1.5 text-[11px] ${sm.text}`}><span className={`h-2 w-2 rounded-full ${sm.dot}`} />{sm.label}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1.5">
                            <MoreVertical className="h-4 w-4 shrink-0 text-gray-600" />
                            {am.state !== "none" && (
                              <span className={`flex items-center gap-1 whitespace-nowrap rounded-full border border-[#1e2d40] px-1.5 py-0.5 text-[9px] font-medium ${am.text}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${am.dot}`} />
                                {am.label}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[#173050] pt-3">
                          <div className="min-w-0">
                            <p className="truncate text-[10px] text-gray-500">Today&apos;s Appts</p>
                            <p className="mt-1 text-lg font-semibold leading-none text-white">{count}</p>
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[10px] text-gray-500">Utilization</p>
                            <p className={`mt-1 text-lg font-semibold leading-none ${utilColor(util)}`}>{util}%</p>
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[10px] text-gray-500">Rating</p>
                            <p className="mt-1 flex items-center gap-0.5 text-lg font-semibold leading-none text-white">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />{(e.avgRating || 0).toFixed(1)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#14243a]">
                          <div className={`h-full rounded-full ${utilBar(util)}`} style={{ width: `${Math.min(100, util)}%` }} />
                        </div>

                        <button onClick={(event) => { event.stopPropagation(); setSelectedId(e._id); setTab("overview"); }} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#173050] bg-[#0a1525] py-2 text-xs text-gray-300 transition-colors hover:border-blue-500/50 hover:text-blue-300">
                          View Profile <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            <p className="mt-4 text-center text-xs text-gray-500">
              Showing {filtered.length} of {employees.length} employees
            </p>
          </div>
          </div>
          </div>

          {/* Profile panel */}
          {selected && (
            <ProfilePanel
              employee={selected}
              perf={perfResp}
              schedule={schedResp}
              attendance={attendanceByUser[String(selected.userId?._id)]}
              tab={tab}
              setTab={setTab}
              onClose={() => setSelectedId(null)}
              onEdit={() => setEditOpen(true)}
              onStatus={(status: string) => statusMutation.mutate({ id: selected._id, status })}
              onSchedule={(data: any) => scheduleMutation.mutate({ id: selected._id, data })}
              onDelete={() => deleteMutation.mutate(selected._id)}
              savingSchedule={scheduleMutation.isPending}
              deleting={deleteMutation.isPending}
            />
          )}
        </div>
      </div>

      {/* ── Add Employee modal ── */}
      <AddEmployeeModal
        open={addOpen}
        onOpenChange={setAddOpen}
        onSubmit={(data: any) => createMutation.mutate(data)}
        pending={createMutation.isPending}
      />

      {/* ── Edit Employee modal ── */}
      <EditEmployeeModal
        open={editOpen}
        onOpenChange={setEditOpen}
        employee={selected}
        onSubmit={(data: any) => selected && updateMutation.mutate({ id: selected._id, data })}
        pending={updateMutation.isPending}
      />

      {/* ── All Attendance modal ── */}
      <AttendanceModal open={attendanceOpen} onOpenChange={setAttendanceOpen} />
    </div>
  );
}

/* ─────────────────────────  Profile panel  ───────────────────────── */

function ProfilePanel({
  employee, perf, schedule, attendance, tab, setTab, onClose, onEdit, onStatus, onSchedule, onDelete, savingSchedule, deleting,
}: any) {
  const sm = statusMeta(employee.status);
  const am = attendanceMeta(attendance);
  const util = employee.utilizationRate || 0;
  const tabs = ["overview", "schedule", "performance", "settings"] as const;

  const attendanceDetail = !attendance || !attendance.checkInTime
    ? "Not checked in today"
    : attendance.isActiveSession
      ? `Checked in ${shortTime(attendance.checkInTime)} · Active`
      : `${shortTime(attendance.checkInTime)} – ${shortTime(attendance.checkOutTime)} · ${attendance.totalWorkedTime || ""}`.trim();

  const [start, setStart] = useState(employee.workingHours?.start || "09:00");
  const [end, setEnd] = useState(employee.workingHours?.end || "18:00");

  const perfStats = [
    { label: "Appointments", value: perf?.monthlyPerformance?.appointments ?? employee.totalAppointments ?? 0, cls: "text-emerald-400" },
    { label: "Utilization", value: `${util}%`, cls: utilColor(util) },
    { label: "Revenue", value: formatCurrency(employee.totalRevenue || 0), cls: "text-emerald-400" },
    { label: "No Shows", value: employee.noShows ?? 0, cls: "text-red-400" },
  ];

  return (
    <Card className="min-h-[calc(100vh-7.5rem)] self-start overflow-hidden border-[#173050] bg-gradient-to-br from-[#071321] to-[#0b1a2f] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] xl:sticky xl:top-20">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Avatar className="h-20 w-20 ring-1 ring-white/10">
            {employee.userId?.profileImage?.url ? <AvatarImage src={employee.userId.profileImage.url} alt={empName(employee)} /> : null}
            <AvatarFallback className="text-lg">{getInitials(empName(employee))}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 pt-2">
            <div className="flex items-center gap-2">
              <p className="truncate text-xl font-semibold text-white">{empName(employee)}</p>
              <span className={`rounded-md border px-2 py-0.5 text-[10px] font-medium ${sm.chip}`}>{sm.label}</span>
            </div>
            <p className="text-xs text-gray-500">{employee.position}</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
              {employee.userId?.email ? <p className="flex items-center gap-1 text-[11px] text-blue-400"><Mail className="h-3 w-3" />{employee.userId.email}</p> : null}
              {employee.userId?.phoneNumber ? <p className="flex items-center gap-1 text-[11px] text-gray-400"><Phone className="h-3 w-3" />{employee.userId.phoneNumber}</p> : null}
            </div>
          </div>
          <button onClick={onClose} className="rounded-full bg-[#102036] p-2 text-gray-500 hover:bg-[#1e2d40] hover:text-gray-200"><UserX className="h-4 w-4" /></button>
        </div>

        {/* Tabs */}
        <div className="mt-5 flex gap-0 rounded-lg border border-[#173050] bg-[#071321] p-0.5">
          {tabs.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 rounded-md px-2 py-2 text-[11px] font-medium capitalize transition-colors ${tab === t ? "bg-blue-600 text-white shadow-[0_0_14px_rgba(37,99,235,0.38)]" : "text-gray-400 hover:text-gray-200"}`}>{t}</button>
          ))}
        </div>

        {/* Overview */}
        {tab === "overview" && (
          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-[#173050] bg-[#0b1728] p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-200">About</p>
                <button onClick={onEdit} className="text-[11px] text-blue-400 hover:text-blue-300">Edit</button>
              </div>
              <div className="space-y-2 text-xs">
                <Row label="Role"><span className="text-gray-200">{employee.position}</span></Row>
                <Row label="Employee Since"><span className="text-gray-200">{formatDate(employee.createdAt)}</span></Row>
                <Row label="Status"><span className={sm.text}>{sm.label}</span></Row>
                <Row label="Working Hours"><span className="text-gray-200">{employee.workingHours?.start} - {employee.workingHours?.end}</span></Row>
                <Row label="Attendance">
                  <span className={`flex items-center gap-1.5 ${am.text}`}>
                    <span className={`h-2 w-2 rounded-full ${am.dot}`} />
                    {attendanceDetail}
                  </span>
                </Row>
              </div>
            </div>

            <div className="rounded-xl border border-[#173050] bg-[#0b1728] p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-200">Performance <span className="font-normal text-gray-500">(This Month)</span></p>
                <button className="rounded-md border border-[#173050] px-2 py-1 text-[10px] text-gray-400">This Week</button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {perfStats.map((s) => (
                  <div key={s.label} className="rounded-lg border border-[#173050] bg-[#0d1a2d] p-3">
                    <p className="text-[10px] text-gray-500">{s.label}</p>
                    <p className={`mt-1 text-xl font-semibold leading-none ${s.cls}`}>{s.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-[#173050] bg-[#0b1728] p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-200">Today&apos;s Schedule</p>
                <button onClick={() => setTab("schedule")} className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300">
                  View full day <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              <ScheduleList schedule={schedule} todayOnly />
            </div>

          </div>
        )}

        {/* Schedule */}
        {tab === "schedule" && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold text-gray-300">Upcoming Schedule</p>
            <ScheduleList schedule={schedule} />
          </div>
        )}

        {/* Performance */}
        {tab === "performance" && (
          <div className="mt-4 space-y-4">
            {!perf ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <Stat label="Total Appointments" value={perf.lifetimeStats?.totalAppointments ?? 0} />
                  <Stat label="Completed" value={perf.lifetimeStats?.completedAppointments ?? 0} />
                  <Stat label="Total Revenue" value={formatCurrency(perf.lifetimeStats?.totalRevenue || 0)} />
                  <Stat label="Cancelled" value={perf.lifetimeStats?.cancelledAppointments ?? 0} />
                  <Stat label="Upcoming" value={perf.lifetimeStats?.upcomingAppointments ?? 0} />
                  <Stat label="No Shows" value={perf.lifetimeStats?.noShows ?? 0} />
                  <Stat label="Avg Rating" value={(perf.lifetimeStats?.averageRating || 0).toFixed(1)} />
                  <Stat label="Utilization" value={`${perf.lifetimeStats?.utilizationRate ?? 0}%`} />
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold text-gray-300">{perf.monthlyPerformance?.month} Performance</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Stat label="Appointments" value={perf.monthlyPerformance?.appointments ?? 0} />
                    <Stat label="Revenue" value={formatCurrency(perf.monthlyPerformance?.revenue || 0)} />
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Settings */}
        {tab === "settings" && (
          <div className="mt-4 space-y-5">
            <div>
              <p className="mb-2 text-xs font-semibold text-gray-300">Status</p>
              <div className="grid grid-cols-2 gap-2">
                {(["working", "on_break", "on_leave", "off"] as const).map((s) => {
                  const m = statusMeta(s);
                  return (
                    <button key={s} onClick={() => onStatus(s)} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${employee.status === s ? m.chip : "border-[#1e2d40] text-gray-400 hover:bg-[#1e2d40]"}`}>
                      <span className={`h-2 w-2 rounded-full ${m.dot}`} />{m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold text-gray-300">Working Hours</p>
              <div className="flex items-center gap-2">
                <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="h-9" />
                <span className="text-gray-500">–</span>
                <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="h-9" />
              </div>
              <Button size="sm" className="mt-2 w-full" disabled={savingSchedule} onClick={() => onSchedule({ workingHours: { start, end } })}>
                {savingSchedule ? "Saving…" : "Save Working Hours"}
              </Button>
            </div>

            <div className="border-t border-[#1e2d40] pt-4">
              <button onClick={onDelete} disabled={deleting} className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-600/40 bg-red-600/10 py-2 text-xs font-medium text-red-300 transition-colors hover:bg-red-600/20 disabled:opacity-50">
                <Trash2 className="h-3.5 w-3.5" /> {deleting ? "Removing…" : "Remove Employee"}
              </button>
              <p className="mt-1.5 flex items-center justify-center gap-1 text-[10px] text-gray-600">
                <AlertTriangle className="h-3 w-3" /> Fails if the employee has upcoming appointments.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ScheduleList({ schedule, todayOnly }: { schedule: any; todayOnly?: boolean }) {
  const todayKey = toDateKey(new Date());
  let items: any[] = asArray(schedule?.schedule);
  if (todayOnly) items = items.filter((a) => toDateKey(new Date(a.date)) === todayKey);
  items = [...items].sort((a, b) => {
    const d = new Date(a.date).getTime() - new Date(b.date).getTime();
    return d !== 0 ? d : timeToMin(a.startTime) - timeToMin(b.startTime);
  });

  if (!schedule) return <Skeleton className="h-24 w-full" />;
  if (items.length === 0) return <p className="py-4 text-center text-xs text-gray-500">No appointments.</p>;

  return (
    <div className="space-y-1">
      {items.slice(0, 8).map((a) => {
        const badge = apptBadge(a.status);
        return (
          <div key={a.id} className="flex items-center gap-3 rounded-lg border border-[#1e2d40] bg-[#0d1a2d] px-3 py-2">
            <span className="w-12 shrink-0 text-[11px] text-gray-500">{a.startTime}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-gray-200">{a.customer?.name || "Customer"}</p>
              <p className="truncate text-[10px] text-gray-500">
                {a.service || "Appointment"}{!todayOnly ? ` · ${formatDate(a.date)}` : ""}
              </p>
            </div>
            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold ${badge.cls}`}>{badge.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-gray-500">{label}</span>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-lg border border-[#1e2d40] bg-[#0d1a2d] p-2.5">
      <p className="text-[10px] text-gray-500">{label}</p>
      <p className="text-sm font-bold text-gray-100">{value}</p>
    </div>
  );
}

/* ─────────────────────────  Modals  ───────────────────────── */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-gray-400">{label}</label>
      {children}
    </div>
  );
}

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

function AddEmployeeModal({ open, onOpenChange, onSubmit, pending }: any) {
  const [form, setForm] = useState({
    name: "", email: "", password: "", phoneNumber: "", position: "Barber",
    start: "09:00", end: "18:00", daysOff: ["sunday"] as string[],
  });

  const reset = () => setForm({ name: "", email: "", password: "", phoneNumber: "", position: "Barber", start: "09:00", end: "18:00", daysOff: ["sunday"] });

  const submit = () => {
    if (!form.name || !form.email || !form.password || !form.phoneNumber) {
      toast.error("Name, email, password and phone are required");
      return;
    }
    onSubmit({
      name: form.name, email: form.email, password: form.password, phoneNumber: form.phoneNumber,
      position: form.position, workingHours: { start: form.start, end: form.end }, daysOff: form.daysOff,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o: boolean) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Employee</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Field label="Full name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Doe" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@shop.com" /></Field>
            <Field label="Phone"><Input value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} placeholder="+49…" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Temporary password"><Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="min 6 chars" /></Field>
            <Field label="Position"><Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="Barber" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start time"><Input type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} /></Field>
            <Field label="End time"><Input type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} /></Field>
          </div>
          <Field label="Days off">
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map((d) => {
                const on = form.daysOff.includes(d);
                return (
                  <button key={d} type="button" onClick={() => setForm({ ...form, daysOff: on ? form.daysOff.filter((x) => x !== d) : [...form.daysOff, d] })}
                    className={`rounded-md border px-2 py-1 text-[10px] capitalize transition-colors ${on ? "border-blue-600 bg-blue-600/15 text-blue-300" : "border-[#1e2d40] text-gray-400 hover:bg-[#1e2d40]"}`}>
                    {d.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          </Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={pending}>{pending ? "Creating…" : "Create Employee"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditEmployeeModal({ open, onOpenChange, employee, onSubmit, pending }: any) {
  const [form, setForm] = useState({ name: "", phoneNumber: "", position: "" });

  // Sync when a different employee is opened
  const key = employee?._id;
  const [lastKey, setLastKey] = useState<string | null>(null);
  if (open && key && key !== lastKey) {
    setLastKey(key);
    setForm({
      name: employee.userId?.name || "",
      phoneNumber: employee.userId?.phoneNumber || "",
      position: employee.position || "",
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit Employee</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Field label="Full name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Phone"><Input value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} /></Field>
          <Field label="Position"><Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} /></Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onSubmit(form)} disabled={pending}>{pending ? "Saving…" : "Save Changes"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────────  All-attendance modal  ───────────────────────── */

function SummaryRow({ label, value, dot }: { label: string; value: number; dot: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[#1e2d40] bg-[#0d1a2d] px-3 py-2">
      <span className="flex items-center gap-2 text-xs text-gray-400"><span className={`h-2 w-2 rounded-full ${dot}`} />{label}</span>
      <span className="text-sm font-bold text-white">{value}</span>
    </div>
  );
}

function AttendanceModal({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const todayKey = toDateKey(new Date());
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: resp, isLoading } = useQuery({
    queryKey: ["team-attendance", selectedDate],
    queryFn: () =>
      employeesApi.getTeamAttendance({ date: selectedDate }).then((r) => r.data).catch(() => ({ data: [] })),
    enabled: open,
  });

  const rows: any[] = asArray(resp?.data);

  const stateOf = (att: any) =>
    !att || !att.checkInTime ? "absent" : att.isActiveSession ? "active" : "checked_out";

  const filtered = rows.filter((r) => {
    if (statusFilter !== "all" && statusFilter !== stateOf(r.attendance)) return false;
    if (search && !`${r.name} ${r.position || ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const present = rows.filter((r) => r.attendance?.checkInTime).length;
  const active = rows.filter((r) => r.attendance?.isActiveSession).length;

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const startWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];
  const endOfToday = new Date(new Date().setHours(23, 59, 59, 999));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0">
        <DialogHeader className="mb-0 space-y-0 border-b border-[#1e2d40] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20">
              <CalendarCheck className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <DialogTitle>Attendance</DialogTitle>
              <p className="text-[11px] text-gray-500">
                {new Date(selectedDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="grid max-h-[70vh] grid-cols-1 overflow-hidden lg:grid-cols-[260px_1fr]">
          {/* Calendar + summary */}
          <div className="border-b border-[#1e2d40] p-4 lg:border-b-0 lg:border-r">
            <div className="mb-3 flex items-center justify-between">
              <button onClick={() => setViewMonth(new Date(year, month - 1, 1))} className="rounded-md p-1 text-gray-400 hover:bg-[#1e2d40]"><ChevronLeft className="h-4 w-4" /></button>
              <span className="text-sm font-semibold text-white">{viewMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
              <button onClick={() => setViewMonth(new Date(year, month + 1, 1))} className="rounded-md p-1 text-gray-400 hover:bg-[#1e2d40]"><ChevronRight className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => <div key={d} className="text-[10px] text-gray-600">{d}</div>)}
              {cells.map((day, i) => {
                if (!day) return <div key={i} />;
                const key = toDateKey(day);
                const isSel = key === selectedDate;
                const isToday = key === todayKey;
                const isFuture = day > endOfToday;
                return (
                  <button key={i} disabled={isFuture} onClick={() => setSelectedDate(key)}
                    className={`flex h-8 items-center justify-center rounded-md text-xs transition-colors ${isSel ? "bg-blue-600 text-white" : isToday ? "border border-blue-500/40 text-blue-300" : "text-gray-300 hover:bg-[#1e2d40]"} ${isFuture ? "cursor-not-allowed opacity-30" : ""}`}>
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => { const t = new Date(); t.setDate(1); t.setHours(0, 0, 0, 0); setViewMonth(t); setSelectedDate(todayKey); }}
              className="mt-3 w-full rounded-lg border border-[#1e2d40] py-1.5 text-xs text-gray-300 hover:bg-[#1e2d40]"
            >
              Today
            </button>

            <div className="mt-4 space-y-2">
              <SummaryRow label="Present" value={present} dot="bg-emerald-500" />
              <SummaryRow label="Active now" value={active} dot="bg-blue-500" />
              <SummaryRow label="Absent" value={Math.max(0, rows.length - present)} dot="bg-gray-500" />
              <SummaryRow label="Total" value={rows.length} dot="bg-purple-500" />
            </div>
          </div>

          {/* Records */}
          <div className="flex min-h-0 flex-col">
            <div className="flex flex-wrap items-center gap-2 border-b border-[#1e2d40] p-4">
              <div className="relative min-w-40 flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employee..." className="h-9 pl-9" />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 rounded-lg border border-[#2a3547] bg-[#0d1526] px-3 text-xs text-gray-300 focus:outline-none">
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="checked_out">Checked out</option>
                <option value="absent">Absent</option>
              </select>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {isLoading ? (
                <div className="space-y-2 p-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <CalendarDays className="mb-2 h-10 w-10 text-gray-700" />
                  <p className="text-sm text-gray-400">No records for this filter.</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wide text-gray-500">
                      <th className="px-2 py-2 font-medium">Employee</th>
                      <th className="px-2 py-2 font-medium">Check In</th>
                      <th className="px-2 py-2 font-medium">Check Out</th>
                      <th className="px-2 py-2 font-medium">Worked</th>
                      <th className="px-2 py-2 text-right font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e2d40]">
                    {filtered.map((r) => {
                      const att = r.attendance;
                      const st = stateOf(att);
                      const badge = st === "active"
                        ? { label: "Active", cls: "bg-emerald-600/15 text-emerald-300 border-emerald-600/30" }
                        : st === "checked_out"
                          ? { label: "Checked out", cls: "bg-gray-600/20 text-gray-300 border-gray-600/30" }
                          : { label: "Absent", cls: "bg-red-600/15 text-red-300 border-red-600/30" };
                      return (
                        <tr key={r.employeeId} className="text-xs">
                          <td className="px-2 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <Avatar className="h-8 w-8">
                                {r.profileImage?.url ? <AvatarImage src={r.profileImage.url} alt={r.name} /> : null}
                                <AvatarFallback className="text-[10px]">{getInitials(r.name)}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="truncate font-medium text-gray-200">{r.name}</p>
                                <p className="truncate text-[10px] text-gray-500">{r.position}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-2 py-2.5 text-gray-300">
                            {att?.checkInTime ? <span className="flex items-center gap-1"><LogIn className="h-3 w-3 text-emerald-400" />{shortTime(att.checkInTime)}</span> : "—"}
                          </td>
                          <td className="px-2 py-2.5 text-gray-300">
                            {att?.checkOutTime ? <span className="flex items-center gap-1"><LogOut className="h-3 w-3 text-gray-400" />{shortTime(att.checkOutTime)}</span> : "—"}
                          </td>
                          <td className="px-2 py-2.5 text-gray-400">{att?.totalWorkedTime || "—"}</td>
                          <td className="px-2 py-2.5 text-right">
                            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badge.cls}`}>{badge.label}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
