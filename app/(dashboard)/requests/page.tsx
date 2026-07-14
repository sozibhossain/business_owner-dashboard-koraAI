/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requestsApi } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { asArray, getInitials } from "@/lib/utils";
import { toast } from "sonner";
import { useViewportPageSize } from "@/hooks/use-viewport-page-size";
import {
  CalendarDays,
  CalendarPlus,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Coffee,
  FileText,
  ExternalLink,
  Mail,
  MoreVertical,
  Paperclip,
  Plane,
  Search,
  SlidersHorizontal,
  Stethoscope,
  Wallet,
  X,
  XCircle,
} from "lucide-react";

/* ─────────────────────────  Helpers  ───────────────────────── */

const startOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const fmtDate = (value?: string | Date) =>
  value
    ? new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "—";

const fmtDateTime = (value?: string | Date) =>
  value
    ? new Date(value).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const TYPE_META: Record<string, { label: string; icon: any; cls: string }> = {
  time_off: { label: "Time Off Request", icon: CalendarDays, cls: "bg-purple-600/15 text-purple-300 border-purple-600/30" },
  break_adjustment: { label: "Break Adjustment", icon: Coffee, cls: "bg-amber-600/15 text-amber-300 border-amber-600/30" },
  schedule_change: { label: "Schedule Change", icon: Clock, cls: "bg-blue-600/15 text-blue-300 border-blue-600/30" },
  other: { label: "Custom Request", icon: FileText, cls: "bg-gray-600/20 text-gray-300 border-gray-600/30" },
};
const typeMeta = (t?: string) => TYPE_META[t || "other"] || TYPE_META.other;

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "bg-amber-600/15 text-amber-300 border-amber-600/30" },
  approved: { label: "Approved", cls: "bg-emerald-600/15 text-emerald-300 border-emerald-600/30" },
  rejected: { label: "Rejected", cls: "bg-red-600/15 text-red-300 border-red-600/30" },
};
const statusMeta = (s?: string) => STATUS_META[s || "pending"] || STATUS_META.pending;

const LEAVE_TYPE_META: Record<string, { icon: any; cls: string }> = {
  "Casual Leave": { icon: Plane, cls: "bg-purple-600/15 text-purple-300 border-purple-600/30" },
  "Sick Leave": { icon: Stethoscope, cls: "bg-rose-600/15 text-rose-300 border-rose-600/30" },
  "Leave Without Pay": { icon: Wallet, cls: "bg-gray-600/20 text-gray-300 border-gray-600/30" },
};

// Source-aware type display: a leave shows its leaveType, a request its category
const displayType = (item: any) => {
  if (item?.__source === "leave") {
    const m = LEAVE_TYPE_META[item.__leaveType] || { icon: CalendarDays, cls: TYPE_META.time_off.cls };
    return { label: item.__leaveType || "Leave", icon: m.icon, cls: m.cls };
  }
  return typeMeta(item?.type);
};

const requestDuration = (req: any) => {
  if (req?.__source === "leave" && typeof req.__totalDays === "number") {
    return `${req.__totalDays} day${req.__totalDays === 1 ? "" : "s"}`;
  }
  if (req?.type === "break_adjustment" && typeof req.durationMinutes === "number") {
    return `${req.durationMinutes > 0 ? "+" : ""}${req.durationMinutes} min`;
  }
  const from = req?.dateRange?.from ? new Date(req.dateRange.from) : null;
  const to = req?.dateRange?.to ? new Date(req.dateRange.to) : null;
  if (from && to) {
    const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1);
    return `${days} day${days === 1 ? "" : "s"}`;
  }
  if (typeof req?.durationMinutes === "number") return `${req.durationMinutes} min`;
  return "—";
};

const requestRange = (req: any) => {
  const from = req?.dateRange?.from;
  const to = req?.dateRange?.to;
  if (from && to) {
    const sameDay = isSameDay(new Date(from), new Date(to));
    return sameDay ? fmtDate(from) : `${fmtDate(from)} – ${fmtDate(to)}`;
  }
  if (from) return fmtDate(from);
  return "—";
};

const empName = (req: any) => req?.employees_id?.name || "Employee";
/* ─────────────────────────  Page  ───────────────────────── */

export default function RequestsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [requestPage, setRequestPage] = useState(1);
  const requestPageSize = useViewportPageSize({
    rowHeight: 78,
    reservedHeight: 470,
    min: 3,
    max: 7,
  });

  const { data: resp, isLoading } = useQuery({
    queryKey: ["requests-all"],
    queryFn: () => requestsApi.getAll({ limit: 200 }).then((r) => r.data),
  });

  // Employee leave requests live in a separate Leave model — pull them in and merge
  const { data: leaveResp, isLoading: leavesLoading } = useQuery({
    queryKey: ["requests-leaves"],
    queryFn: () => requestsApi.getLeaves().then((r) => r.data).catch(() => ({ data: [] })),
  });

  const rawRequests: any[] = useMemo(() => asArray(resp?.data), [resp]);
  const rawLeaves: any[] = useMemo(() => asArray(leaveResp?.data), [leaveResp]);

  // Normalize both sources into one unified list
  const requests: any[] = useMemo(() => {
    const reqItems = rawRequests.map((r) => ({ ...r, __source: "request" }));
    const leaveItems = rawLeaves.map((l) => ({
      _id: l._id,
      __source: "leave",
      __leaveType: l.leaveType,
      __totalDays: l.totalDays,
      employees_id: { ...(l.user || {}), position: l.position },
      type: "leave",
      status: String(l.status || "pending").toLowerCase(),
      dateRange: { from: l.startDate, to: l.endDate },
      durationMinutes: null,
      reason: l.reason,
      adminNote: l.reviewNote,
      attachments: l.attachments,
      createdAt: l.createdAt,
      updatedAt: l.updatedAt,
    }));
    return [...reqItems, ...leaveItems];
  }, [rawRequests, rawLeaves]);

  /* ── Metrics (computed client-side; no backend stats endpoint) ── */
  const metrics = useMemo(() => {
    const now = new Date();
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const weekStart = startOfWeek(now);
    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(weekStart.getDate() - 7);

    let pending = 0;
    let approvedToday = 0;
    let approvedYesterday = 0;
    let approvedThisWeek = 0;
    let approvedLastWeek = 0;
    let rejectedThisWeek = 0;
    let rejectedTotal = 0;

    requests.forEach((r) => {
      const updated = new Date(r.updatedAt || r.createdAt);
      if (r.status === "pending") pending += 1;
      if (r.status === "approved") {
        if (isSameDay(updated, now)) approvedToday += 1;
        if (isSameDay(updated, yesterday)) approvedYesterday += 1;
        if (updated >= weekStart) approvedThisWeek += 1;
        else if (updated >= lastWeekStart && updated < weekStart) approvedLastWeek += 1;
      }
      if (r.status === "rejected") {
        rejectedTotal += 1;
        if (updated >= weekStart) rejectedThisWeek += 1;
      }
    });

    const pct = (cur: number, prev: number) =>
      prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 100);

    return {
      pending,
      approvedToday,
      approvedThisWeek,
      rejectedThisWeek,
      rejectedTotal,
      approvedTodayDelta: pct(approvedToday, approvedYesterday),
      approvedWeekDelta: pct(approvedThisWeek, approvedLastWeek),
    };
  }, [requests]);

  const counts = useMemo(
    () => ({
      all: requests.length,
      pending: requests.filter((r) => r.status === "pending").length,
      approved: requests.filter((r) => r.status === "approved").length,
      rejected: requests.filter((r) => r.status === "rejected").length,
    }),
    [requests]
  );

  const employeeOptions = useMemo(
    () => Array.from(new Set(requests.map((r) => empName(r)).filter(Boolean))).sort(),
    [requests]
  );

  const typeOptions = useMemo(
    () =>
      Array.from(
        new Map(
          requests.map((r) => {
            const meta = displayType(r);
            return [r.__source === "leave" ? `leave:${r.__leaveType || "Leave"}` : r.type || "other", meta.label];
          })
        )
      ).sort((a, b) => a[1].localeCompare(b[1])),
    [requests]
  );

  const visible = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const list = (tab === "all" ? requests : requests.filter((r) => r.status === tab)).filter((r) => {
      const meta = displayType(r);
      const typeKey = r.__source === "leave" ? `leave:${r.__leaveType || "Leave"}` : r.type || "other";
      if (employeeFilter !== "all" && empName(r) !== employeeFilter) return false;
      if (typeFilter !== "all" && typeKey !== typeFilter) return false;
      if (dateFilter !== "all") {
        const created = new Date(r.createdAt);
        if (dateFilter === "today" && !isSameDay(created, now)) return false;
        if (dateFilter === "week" && created < weekStart) return false;
        if (dateFilter === "month" && created < monthStart) return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const haystack = [
          empName(r),
          r.employees_id?.position,
          r.employees_id?.email,
          meta.label,
          requestRange(r),
          requestDuration(r),
          r.reason,
          r.adminNote,
          r.status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    return [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [dateFilter, employeeFilter, requests, search, tab, typeFilter]);

  const requestPageCount = Math.max(1, Math.ceil(visible.length / requestPageSize));
  const pagedRequests = useMemo(() => {
    const safePage = Math.min(requestPage, requestPageCount);
    const start = (safePage - 1) * requestPageSize;
    return visible.slice(start, start + requestPageSize);
  }, [requestPage, requestPageCount, requestPageSize, visible]);

  const selected = useMemo(
    () =>
      selectedId === "__closed"
        ? null
        : requests.find((r) => r._id === selectedId) || visible[0] || null,
    [requests, selectedId, visible]
  );

  const loading = isLoading || leavesLoading;

  /* ── Unified approve/reject (routes to the right backend per source) ── */
  const decideMutation = useMutation({
    mutationFn: ({ item, action, adminNote }: { item: any; action: "approve" | "reject"; adminNote?: string }) => {
      if (item.__source === "leave") {
        return requestsApi.leaveAction(item._id, {
          status: action === "approve" ? "Approved" : "Rejected",
          reviewNote: adminNote || undefined,
        });
      }
      return action === "approve"
        ? requestsApi.approve(item._id, adminNote ? { adminNote } : undefined)
        : requestsApi.reject(item._id, adminNote ? { adminNote } : undefined);
    },
    onSuccess: (_data, vars) => {
      toast.success(vars.action === "approve" ? "Request approved" : "Request rejected");
      setNote("");
      queryClient.invalidateQueries({ queryKey: ["requests-all"] });
      queryClient.invalidateQueries({ queryKey: ["requests-leaves"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Action failed"),
  });

  const busy = decideMutation.isPending;
  const selectTab = (nextTab: typeof tab) => {
    setRequestPage(1);
    setTab(nextTab);
  };
  const clearFilters = () => {
    setSearch("");
    setEmployeeFilter("all");
    setTypeFilter("all");
    setDateFilter("all");
    setRequestPage(1);
  };

  const metricCards = [
    {
      label: "Pending Requests",
      value: metrics.pending,
      icon: CalendarPlus,
      tint: "bg-blue-600/15 text-blue-400",
      sub: "Requires your action",
      onClick: () => selectTab("pending"),
    },
    {
      label: "Approved Today",
      value: metrics.approvedToday,
      icon: CheckCircle2,
      tint: "bg-emerald-600/15 text-emerald-400",
      delta: metrics.approvedTodayDelta,
      deltaLabel: "vs yesterday",
    },
    {
      label: "Approved This Week",
      value: metrics.approvedThisWeek,
      icon: Clock,
      tint: "bg-purple-600/15 text-purple-400",
      delta: metrics.approvedWeekDelta,
      deltaLabel: "vs last week",
    },
    {
      label: "Rejected",
      value: metrics.rejectedTotal,
      icon: XCircle,
      tint: "bg-red-600/15 text-red-400",
      sub: `${metrics.rejectedThisWeek} this week`,
      onClick: () => selectTab("rejected"),
    },
  ];

  const tabs: { key: typeof tab; label: string; count: number }[] = [
    { key: "all", label: "All Requests", count: counts.all },
    { key: "pending", label: "Pending", count: counts.pending },
    { key: "approved", label: "Approved", count: counts.approved },
    { key: "rejected", label: "Rejected", count: counts.rejected },
  ];

  return (
    <div className="dashboard-page flex flex-col">
      <Header title="Requests" subtitle="Review and manage all employee requests in one place." />

      <div className="dashboard-content flex flex-col gap-3">
        {/* ── Metric cards ── */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-4">
        <div className="dashboard-kpi-grid">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="overflow-hidden border-[#173050] bg-gradient-to-br from-[#0c1c31] to-[#071321]">
                  <CardContent className="p-4">
                    <Skeleton className="h-14 w-full" />
                  </CardContent>
                </Card>
              ))
            : metricCards.map((m) => {
                const up = (m.delta ?? 0) >= 0;
                return (
                  <Card
                    key={m.label}
                    className={`overflow-hidden border-[#173050] bg-[radial-gradient(circle_at_100%_0%,rgba(37,99,235,0.16),transparent_35%),linear-gradient(135deg,#0b1a2d,#071321)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${m.onClick ? "cursor-pointer transition-colors hover:border-blue-500/40" : ""}`}
                  >
                    <CardContent className="min-h-0 p-4" onClick={m.onClick}>
                      <div className="flex items-start gap-3">
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-[0_0_22px_rgba(59,130,246,0.22)] ${m.tint}`}>
                          <m.icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="dashboard-fluid-value font-semibold text-white">{m.value}</p>
                          <p className="mt-1 text-sm text-gray-200">{m.label}</p>
                          {"delta" in m ? (
                            <p className={`mt-2 text-[11px] ${up ? "text-emerald-400" : "text-red-400"}`}>
                              {up ? "↑" : "↓"} {Math.abs(m.delta ?? 0)}% {m.deltaLabel}
                            </p>
                          ) : (
                            <p className="mt-2 flex items-center gap-1 text-[11px] text-gray-400">
                              {m.sub} →
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
        </div>

        {/* ── Tabs ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#173050] bg-[#071321] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="flex flex-wrap items-center gap-2">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => selectTab(t.key)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  tab === t.key
                    ? "border-blue-600 bg-blue-600/25 text-blue-200 shadow-[0_0_14px_rgba(37,99,235,0.28)]"
                    : "border-[#1e2d40] bg-[#0d1a2d]/60 text-gray-400 hover:bg-[#1e2d40]"
                }`}
              >
                {t.label}
                <span className={`rounded-full px-1.5 text-[10px] ${tab === t.key ? "bg-blue-600 text-white" : "bg-[#1e2d40] text-gray-400"}`}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFiltersOpen((current) => !current)}
              className="flex items-center gap-1.5 rounded-lg border border-[#1e2d40] bg-[#0d1a2d]/60 px-3 py-1.5 text-xs text-gray-300 hover:bg-[#1e2d40]"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" /> Filters <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
          {filtersOpen ? (
            <div className="grid w-full grid-cols-1 gap-2 border-t border-[#173050] pt-2 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(9rem,1fr))_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setRequestPage(1);
                  }}
                  placeholder="Search requests, employees, reasons..."
                  className="h-10 w-full rounded-lg border border-[#1e2d40] bg-[#0d1526] pl-9 pr-3 text-sm text-gray-200 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <select
                value={employeeFilter}
                onChange={(event) => {
                  setEmployeeFilter(event.target.value);
                  setRequestPage(1);
                }}
                className="h-10 rounded-lg border border-[#1e2d40] bg-[#0d1526] px-3 text-xs text-gray-300 focus:outline-none"
              >
                <option value="all">All Employees</option>
                {employeeOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <select
                value={typeFilter}
                onChange={(event) => {
                  setTypeFilter(event.target.value);
                  setRequestPage(1);
                }}
                className="h-10 rounded-lg border border-[#1e2d40] bg-[#0d1526] px-3 text-xs text-gray-300 focus:outline-none"
              >
                <option value="all">All Request Types</option>
                {typeOptions.map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                value={dateFilter}
                onChange={(event) => {
                  setDateFilter(event.target.value);
                  setRequestPage(1);
                }}
                className="h-10 rounded-lg border border-[#1e2d40] bg-[#0d1526] px-3 text-xs text-gray-300 focus:outline-none"
              >
                <option value="all">All Dates</option>
                <option value="today">Submitted Today</option>
                <option value="week">Submitted This Week</option>
                <option value="month">Submitted This Month</option>
              </select>
              <button
                type="button"
                onClick={clearFilters}
                className="h-10 rounded-lg border border-[#1e2d40] bg-[#0d1a2d]/60 px-4 text-xs font-medium text-gray-300 hover:bg-[#1e2d40]"
              >
                Clear
              </button>
            </div>
          ) : null}
        </div>

        {/* ── Main grid ── */}
          {/* Request list */}
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)
            ) : visible.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-14 text-center">
                  <CalendarPlus className="mb-2 h-10 w-10 text-gray-700" />
                  <p className="text-sm text-gray-400">No {tab === "all" ? "" : tab} requests.</p>
                </CardContent>
              </Card>
            ) : (
              pagedRequests.map((req) => {
                const tm = displayType(req);
                const sm = statusMeta(req.status);
                const isPending = req.status === "pending";
                return (
                  <Card
                    key={req._id}
                    onClick={() => {
                      setSelectedId(req._id);
                      setNote("");
                    }}
                    className={`cursor-pointer overflow-hidden border-[#173050] bg-[linear-gradient(135deg,#071321,#0a182a)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-colors ${
                      selected?._id === req._id ? "border-blue-600 shadow-[0_0_18px_rgba(37,99,235,0.18)]" : "hover:border-[#2a3b54]"
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="grid gap-4 xl:grid-cols-[190px_190px_minmax(0,1fr)_170px] xl:items-center">
                        {/* Employee */}
                        <div className="flex items-center gap-3">
                          <Avatar className="h-11 w-11">
                            {req.employees_id?.profileImage?.url ? (
                              <AvatarImage src={req.employees_id.profileImage.url} alt={empName(req)} />
                            ) : null}
                            <AvatarFallback className="text-xs">{getInitials(empName(req))}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-100">{empName(req)}</p>
                            <p className="truncate text-[11px] text-gray-500">{req.employees_id?.position || "Employee"}</p>
                            <p className="mt-1 text-[10px] text-gray-600">Requested on {fmtDate(req.createdAt)}</p>
                          </div>
                        </div>

                        {/* Type + dates */}
                        <div className="min-w-0 border-[#173050] xl:border-l xl:pl-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium ${tm.cls}`}>
                            <tm.icon className="h-3.5 w-3.5" /> {tm.label}
                          </span>
                          <p className="mt-1.5 text-xs text-gray-300">{requestRange(req)}</p>
                          <p className="flex items-center gap-1.5 text-[11px] text-gray-500">
                            {requestDuration(req)}
                            {req.attachments?.length > 0 ? (
                              <span className="inline-flex items-center gap-0.5 text-gray-400">
                                <Paperclip className="h-3 w-3" />{req.attachments.length}
                              </span>
                            ) : null}
                          </p>
                        </div>

                        {/* Reason */}
                        <div className="min-w-0 border-[#173050] xl:border-l xl:pl-4">
                          <p className="line-clamp-3 text-xs text-gray-400">{req.reason || "No reason provided."}</p>
                        </div>

                        {/* Status + actions */}
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${sm.cls}`}>
                              {sm.label}
                            </span>
                            <button
                              onClick={(e) => e.stopPropagation()}
                              className="rounded-md p-1 text-gray-500 hover:bg-[#1e2d40] hover:text-gray-300"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </div>

                          {isPending ? (
                            <div className="flex gap-2">
                              <button
                                disabled={busy}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  decideMutation.mutate({ item: req, action: "approve" });
                                }}
                                className="flex items-center gap-1.5 rounded-lg border border-emerald-600/40 bg-emerald-600/10 px-3 py-1.5 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-600/20 disabled:opacity-50"
                              >
                                <Check className="h-3.5 w-3.5" /> Approve
                              </button>
                              <button
                                disabled={busy}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  decideMutation.mutate({ item: req, action: "reject" });
                                }}
                                className="flex items-center gap-1.5 rounded-lg border border-red-600/40 bg-red-600/10 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-600/20 disabled:opacity-50"
                              >
                                <X className="h-3.5 w-3.5" /> Reject
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                              {req.status === "approved" ? (
                                <Check className="h-3.5 w-3.5 text-emerald-400" />
                              ) : (
                                <X className="h-3.5 w-3.5 text-red-400" />
                              )}
                              {req.status === "approved" ? "Approved" : "Rejected"} by you
                              <span className="text-gray-600">· {fmtDate(req.updatedAt)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
            {!loading && visible.length > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#173050] pt-3">
                <p className="text-xs text-gray-500">
                  Showing {(Math.min(requestPage, requestPageCount) - 1) * requestPageSize + 1}
                  -{Math.min(Math.min(requestPage, requestPageCount) * requestPageSize, visible.length)} of {visible.length} requests
                </p>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded-lg border border-[#1e2d40] px-3 py-1.5 text-xs text-gray-300 disabled:opacity-40"
                    disabled={requestPage <= 1}
                    onClick={() => setRequestPage((current) => Math.max(1, current - 1))}
                  >
                    Previous
                  </button>
                  <span className="text-xs text-gray-500">Page {Math.min(requestPage, requestPageCount)} of {requestPageCount}</span>
                  <button
                    className="rounded-lg border border-[#1e2d40] px-3 py-1.5 text-xs text-gray-300 disabled:opacity-40"
                    disabled={requestPage >= requestPageCount}
                    onClick={() => setRequestPage((current) => Math.min(requestPageCount, current + 1))}
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </div>
          </div>

          {/* Request details panel */}
          <Card className="max-h-[calc(100dvh-7.5rem)] min-h-0 overflow-hidden border-[#173050] bg-[linear-gradient(135deg,#071321,#0a182a)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] xl:sticky xl:top-20 xl:self-start">
            <CardContent className="max-h-[calc(100dvh-7.5rem)] overflow-y-auto p-5">
              {!selected ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <FileText className="mb-2 h-10 w-10 text-gray-700" />
                  <p className="text-sm text-gray-400">Select a request</p>
                  <p className="text-xs text-gray-600">Choose a request to see full details.</p>
                </div>
              ) : (
                (() => {
                  const tm = displayType(selected);
                  const sm = statusMeta(selected.status);
                  const isPending = selected.status === "pending";
                  return (
                    <div>
                      <div className="mb-4 flex items-center justify-between">
                        <p className="text-lg font-semibold text-white">Request Details</p>
                        <button onClick={() => setSelectedId("__closed")} className="rounded-md p-1 text-gray-400 hover:bg-[#1e2d40]">
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Employee */}
                      <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16 ring-1 ring-white/10">
                          {selected.employees_id?.profileImage?.url ? (
                            <AvatarImage src={selected.employees_id.profileImage.url} alt={empName(selected)} />
                          ) : null}
                          <AvatarFallback>{getInitials(empName(selected))}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-lg font-semibold text-gray-100">{empName(selected)}</p>
                          <p className="truncate text-sm text-gray-400">{selected.employees_id?.position || "Employee"}</p>
                          {selected.employees_id?.email ? (
                            <p className="mt-2 flex items-center gap-1 truncate text-xs text-blue-400">
                              <Mail className="h-3 w-3" /> {selected.employees_id.email}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="mt-5 border-t border-[#1e2d40] pt-4">
                        <p className="mb-4 text-sm font-semibold text-gray-200">Request Information</p>
                        <div className="space-y-3 text-sm">
                          <Row label="Request Type">
                            <span className={`rounded-md border px-2 py-0.5 text-[10px] font-medium ${tm.cls}`}>{tm.label}</span>
                          </Row>
                          <Row label="Date Range"><span className="text-gray-200">{requestRange(selected)}</span></Row>
                          <Row label="Duration"><span className="text-gray-200">{requestDuration(selected)}</span></Row>
                          <Row label="Requested On"><span className="text-gray-200">{fmtDateTime(selected.createdAt)}</span></Row>
                          <div>
                            <p className="text-gray-500">Reason</p>
                            <p className="mt-1 text-gray-200">{selected.reason || "No reason provided."}</p>
                          </div>
                          {selected.adminNote ? (
                            <div>
                              <p className="text-gray-500">Manager Note</p>
                              <p className="mt-1 text-gray-200">{selected.adminNote}</p>
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {/* History */}
                      <div className="mt-5 border-t border-[#1e2d40] pt-4">
                        <p className="mb-4 text-sm font-semibold text-gray-200">History</p>
                        <div className="space-y-3">
                          <div className="flex items-start gap-2.5">
                            <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-blue-600/30 bg-blue-600/15 text-blue-300">
                              <Clock className="h-3 w-3" />
                            </span>
                            <div>
                              <p className="text-xs font-medium text-gray-200">Submitted</p>
                              <p className="text-[10px] text-gray-500">{fmtDateTime(selected.createdAt)}</p>
                              <p className="text-[10px] text-gray-500">Request entered the approval queue</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2.5">
                            <span className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border ${sm.cls}`}>
                              {selected.status === "approved" ? (
                                <Check className="h-3 w-3" />
                              ) : selected.status === "rejected" ? (
                                <X className="h-3 w-3" />
                              ) : (
                                <Clock className="h-3 w-3" />
                              )}
                            </span>
                            <div>
                              <p className="text-xs font-medium text-gray-200">{sm.label}</p>
                              <p className="text-[10px] text-gray-500">{fmtDateTime(selected.updatedAt || selected.createdAt)}</p>
                              <p className="text-[10px] text-gray-500">
                                {isPending ? "Waiting for owner review" : `${sm.label} by you`}
                              </p>
                            </div>
                          </div>
                          {selected.adminNote ? (
                            <div className="flex items-start gap-2.5">
                              <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-[#1e2d40] bg-[#0d1a2d] text-gray-400">
                                <FileText className="h-3 w-3" />
                              </span>
                              <div>
                                <p className="text-xs font-medium text-gray-200">Manager note added</p>
                                <p className="text-[10px] text-gray-500">{selected.adminNote}</p>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {/* Attachments */}
                      {selected.attachments?.length > 0 && (
                        <div className="mt-5 border-t border-[#1e2d40] pt-4">
                          <p className="mb-3 text-xs font-semibold text-gray-300">
                            Attachments <span className="font-normal text-gray-500">({selected.attachments.length})</span>
                          </p>
                          <div className="space-y-2">
                            {selected.attachments.map((att: any, i: number) => {
                              const url: string = att?.url || "";
                              const ext = url.includes(".") ? (url.split(".").pop() || "").split("?")[0].toUpperCase() : "FILE";
                              const isImage = ["PNG", "JPG", "JPEG", "GIF", "WEBP"].includes(ext);
                              return (
                                <a
                                  key={att?.public_id || i}
                                  href={url || "#"}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-3 rounded-lg border border-[#1e2d40] bg-[#0d1a2d] p-2.5 transition-colors hover:border-blue-600/40"
                                >
                                  {isImage && url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={url} alt="attachment" className="h-9 w-9 rounded object-cover" />
                                  ) : (
                                    <div className="flex h-9 w-9 items-center justify-center rounded bg-blue-600/15 text-blue-300">
                                      <Paperclip className="h-4 w-4" />
                                    </div>
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-medium text-gray-200">Attachment {i + 1}</p>
                                    <p className="text-[10px] text-gray-500">{ext} file</p>
                                  </div>
                                  <ExternalLink className="h-4 w-4 shrink-0 text-gray-500" />
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      {isPending && (
                        <div className="mt-5 border-t border-[#1e2d40] pt-4">
                          <p className="mb-2 text-xs font-semibold text-gray-300">
                            Add Note <span className="font-normal text-gray-500">(Optional)</span>
                          </p>
                          <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Add a note for this request..."
                            rows={3}
                            className="w-full resize-none rounded-lg border border-[#2a3547] bg-[#0d1526] px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:border-blue-500 focus:outline-none"
                          />
                          <div className="mt-3 space-y-2">
                            <button
                              disabled={busy}
                              onClick={() => decideMutation.mutate({ item: selected, action: "approve", adminNote: note })}
                              className="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-600/40 bg-emerald-600/15 py-2.5 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-600/25 disabled:opacity-50"
                            >
                              <Check className="h-4 w-4" /> Approve Request
                            </button>
                            <button
                              disabled={busy}
                              onClick={() => decideMutation.mutate({ item: selected, action: "reject", adminNote: note })}
                              className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-600/40 bg-red-600/15 py-2.5 text-sm font-medium text-red-300 transition-colors hover:bg-red-600/25 disabled:opacity-50"
                            >
                              <X className="h-4 w-4" /> Reject Request
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}
            </CardContent>
          </Card>
        </div>
      </div>
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
