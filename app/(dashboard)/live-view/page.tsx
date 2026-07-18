/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  appointmentsApi,
  liveViewApi,
} from "@/lib/api";
import { useSocketEvent } from "@/lib/socket";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { getInitials, asArray } from "@/lib/utils";
import Link from "next/link";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  ArrowRight,
  Bot,
  Calendar,
  CalendarPlus,
  CalendarX,
  ChevronDown,
  Globe,
  MessageCircle,
  MessageSquare,
  Phone,
  PhoneIncoming,
  PhoneMissed,
  Users,
} from "lucide-react";

/* ─────────────────────────  Helpers  ───────────────────────── */

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const isSameLocalDay = (value: string | Date | undefined, ref: Date) => {
  if (!value) return false;
  const d = new Date(value);
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  );
};

const timeToMin = (time?: string) => {
  if (!time) return 0;
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

const pctChange = (current: number, previous: number) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
};

const shortTime = (value?: string | Date) => {
  if (!value) return "";
  return new Date(value).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const fmtDuration = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

/* Appointment status → badge */
const APPT_BADGE: Record<string, { label: string; cls: string; bar: string }> = {
  upcoming: { label: "Upcoming", cls: "bg-blue-600/15 text-blue-300 border-blue-600/30", bar: "bg-blue-500" },
  rescheduled: { label: "Rescheduled", cls: "bg-amber-600/15 text-amber-300 border-amber-600/30", bar: "bg-amber-500" },
  started: { label: "In Progress", cls: "bg-amber-600/15 text-amber-300 border-amber-600/30", bar: "bg-amber-500" },
  ongoing: { label: "In Progress", cls: "bg-amber-600/15 text-amber-300 border-amber-600/30", bar: "bg-amber-500" },
  completed: { label: "Completed", cls: "bg-emerald-600/15 text-emerald-300 border-emerald-600/30", bar: "bg-emerald-500" },
  cancelled: { label: "Cancelled", cls: "bg-red-600/15 text-red-300 border-red-600/30", bar: "bg-red-500" },
  no_show: { label: "No Show", cls: "bg-gray-600/20 text-gray-400 border-gray-600/30", bar: "bg-gray-500" },
};
const apptBadge = (status?: string) => APPT_BADGE[status || "upcoming"] || APPT_BADGE.upcoming;

const guestName = (a: any) => a?.customer?.name || a?.client?.name || "Customer";

/* Activity feed item → icon + accent + status, derived from free-form type/action */
const classifyActivity = (item: any) => {
  const text = `${item?.type || ""} ${item?.action || ""} ${item?.description || ""}`.toLowerCase();

  let icon = Activity;
  let accent = "text-gray-300 bg-gray-600/15";
  if (text.includes("missed")) {
    icon = PhoneMissed;
    accent = "text-amber-300 bg-amber-600/15";
  } else if (text.includes("call")) {
    icon = PhoneIncoming;
    accent = "text-emerald-300 bg-emerald-600/15";
  } else if (text.includes("whatsapp")) {
    icon = MessageCircle;
    accent = "text-emerald-300 bg-emerald-600/15";
  } else if (text.includes("website") || text.includes("chat")) {
    icon = Globe;
    accent = "text-orange-300 bg-orange-600/15";
  } else if (text.includes("ai") || text.includes("kora")) {
    icon = Bot;
    accent = "text-blue-300 bg-blue-600/15";
  } else if (text.includes("appointment") || text.includes("booking") || text.includes("booked")) {
    icon = text.includes("cancel") ? CalendarX : CalendarPlus;
    accent = text.includes("cancel")
      ? "text-red-300 bg-red-600/15"
      : "text-blue-300 bg-blue-600/15";
  } else if (text.includes("message") || text.includes("inbox") || text.includes("request")) {
    icon = MessageSquare;
    accent = "text-purple-300 bg-purple-600/15";
  }

  let status: { label: string; cls: string } | null = null;
  if (text.includes("missed")) status = { label: "Missed", cls: "text-amber-400" };
  else if (text.includes("cancel")) status = { label: "Cancelled", cls: "text-red-400" };
  else if (text.includes("complete") || text.includes("handled") || text.includes("booked") || text.includes("resolved"))
    status = { label: "Completed", cls: "text-emerald-400" };
  else if (text.includes("confirm")) status = { label: "Confirmed", cls: "text-emerald-400" };
  else if (text.includes("active") || text.includes("start")) status = { label: "Active", cls: "text-blue-400" };
  else if (text.includes("new") || text.includes("incoming") || text.includes("received") || text.includes("created") || text.includes("submitted"))
    status = { label: "New", cls: "text-blue-400" };

  return { icon, accent, status };
};

/* ─────────────────────────  Mini visuals  ───────────────────────── */

const SparkLine = ({ seed, color }: { seed: number; color: string }) => {
  const points = Array.from({ length: 14 }, (_, i) => {
    const noise = ((seed * 9301 + i * 49297) % 233280) / 233280;
    return 6 + Math.round(noise * 18);
  });
  const path = points.map((v, i) => `${(i / 13) * 100},${24 - v}`).join(" ");
  return (
    <svg viewBox="0 0 100 24" className="h-9 w-20 shrink-0" preserveAspectRatio="none">
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

/* ─────────────────────────  Page  ───────────────────────── */

export default function LiveViewPage() {
  const queryClient = useQueryClient();
  const [now, setNow] = useState(() => new Date());
  const [filterType, setFilterType] = useState<string>("all");

  // Live clock for active-call durations (1s tick)
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const todayKey = toDateKey(now);
  const yesterdayKey = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return toDateKey(d);
  }, []);

  /* ── Queries (polled so the board stays live) ── */
  const POLL = 25_000;

  const { data: activityResp, isLoading: activityLoading } = useQuery({
    queryKey: ["live-view-activity"],
    queryFn: () => liveViewApi.getActivity({ limit: 25 }).then((r) => r.data),
    refetchInterval: POLL,
  });

  const { data: apptResp, isLoading: apptLoading } = useQuery({
    queryKey: ["live-view-appointments", todayKey],
    queryFn: () => appointmentsApi.getAll({ date: todayKey, limit: 200 }).then((r) => r.data),
    refetchInterval: POLL,
  });

  const { data: yApptResp } = useQuery({
    queryKey: ["live-view-appointments-prev", yesterdayKey],
    queryFn: () => appointmentsApi.getAll({ date: yesterdayKey, limit: 200 }).then((r) => r.data),
  });

  const { data: convResp, isLoading: convLoading } = useQuery({
    queryKey: ["live-view-conversations"],
    queryFn: () => liveViewApi.getConversations().then((r) => r.data),
    refetchInterval: POLL,
  });

  const { data: callResp, isLoading: callLoading } = useQuery({
    queryKey: ["live-view-calls"],
    queryFn: () => liveViewApi.getCalls().then((r) => r.data).catch(() => ({ data: [] })),
    refetchInterval: POLL,
  });

  /* ── Real-time: refresh on socket events ── */
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["live-view-activity"] });
    queryClient.invalidateQueries({ queryKey: ["live-view-conversations"] });
    queryClient.invalidateQueries({ queryKey: ["live-view-calls"] });
    queryClient.invalidateQueries({ queryKey: ["live-view-appointments", todayKey] });
  };
  useSocketEvent("notification:new", refresh);
  useSocketEvent("inbox:new-message", refresh);
  useSocketEvent("inbox:new-conversation", refresh);
  useSocketEvent("incoming-call", refresh);
  useSocketEvent("call-ended", refresh);
  useSocketEvent("call-accepted", refresh);

  /* ── Derived data ── */
  const activities: any[] = useMemo(() => asArray(activityResp?.data), [activityResp]);
  const appointments: any[] = useMemo(() => asArray(apptResp?.data), [apptResp]);
  const yAppointments: any[] = useMemo(() => asArray(yApptResp?.data), [yApptResp]);
  const conversations: any[] = useMemo(() => asArray(convResp?.data), [convResp]);
  const calls: any[] = useMemo(() => asArray(callResp?.data), [callResp]);
  const activeAppts = appointments.filter((a) => a.status !== "cancelled");
  const inShop = activeAppts.filter((a) => ["started", "ongoing"].includes(a.status));

  const todayCalls = calls.filter((c) => isSameLocalDay(c.createdAt, now));
  const missedToday = todayCalls.filter((c) => c.status === "missed").length;
  const missedYesterday = calls.filter(
    (c) => c.status === "missed" && isSameLocalDay(c.createdAt, new Date(yesterdayKey))
  ).length;
  const activeCalls = calls.filter((c) => ["ringing", "accepted"].includes(c.status));

  const activeConversations = conversations.filter(
    (c) => isSameLocalDay(c.lastMessageAt, now) || (c.unreadCount || 0) > 0
  );
  const liveConvoCount = activeConversations.length + activeCalls.length;

  const filteredActivities = useMemo(() => {
    if (filterType === "all") return activities;
    return activities.filter((a) =>
      `${a.type || ""} ${a.action || ""}`.toLowerCase().includes(filterType)
    );
  }, [activities, filterType]);

  const chartData = useMemo(() => {
    const buckets = Array.from({ length: 13 }, (_, i) => ({
      label: `${String(i * 2).padStart(2, "0")}:00`,
      hourStart: i * 2,
      count: 0,
    }));
    activeAppts.forEach((a) => {
      const hour = timeToMin(a.startTime) / 60;
      const idx = Math.min(12, Math.floor(hour / 2));
      if (buckets[idx]) buckets[idx].count += 1;
    });
    return buckets;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apptResp]);

  /* Today's appointments timeline (sorted), with a "Next" marker */
  const timeline = useMemo(() => {
    const sorted = [...activeAppts].sort(
      (a, b) => timeToMin(a.startTime) - timeToMin(b.startTime)
    );
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const nextId = sorted.find(
      (a) => ["upcoming", "rescheduled"].includes(a.status) && timeToMin(a.startTime) >= nowMin
    )?._id;
    return { sorted, nextId };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apptResp, now]);

  const metricCards = [
    {
      label: "Active Conversations",
      value: liveConvoCount,
      icon: MessageCircle,
      color: "bg-blue-600",
      spark: "#3b82f6",
      seed: 11,
      helper: "Live communication",
    },
    {
      label: "Appointments Today",
      value: activeAppts.length,
      icon: Calendar,
      color: "bg-emerald-600",
      spark: "#10b981",
      seed: 23,
      delta: pctChange(activeAppts.length, yAppointments.filter((a) => a.status !== "cancelled").length),
    },
    {
      label: "Clients in Shop",
      value: inShop.length,
      icon: Users,
      color: "bg-purple-600",
      spark: "#a855f7",
      seed: 7,
      helper: "Right now",
    },
    {
      label: "Missed Calls Today",
      value: missedToday,
      icon: PhoneMissed,
      color: "bg-orange-600",
      spark: "#f97316",
      seed: 31,
      delta: pctChange(missedToday, missedYesterday),
    },
  ];

  const isLoading = activityLoading || apptLoading || convLoading || callLoading;

  return (
    <div className="dashboard-page flex flex-col">
      <Header
        title="Live View"
        subtitle="Real-time activity from all channels. See everything happening right now."
      />

      <div className="dashboard-content flex flex-col gap-3 2xl:gap-4">
        {/* ── Metric cards ── */}
        <div className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="px-4 pb-3 pt-4">
                    <Skeleton className="h-14 w-full" />
                  </CardContent>
                </Card>
              ))
            : metricCards.map((item) => {
                const up = (item.delta ?? 0) >= 0;
                return (
                  <Card key={item.label}>
                    <CardContent className="px-4 pb-3 pt-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="mb-2 flex items-center gap-2">
                            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.color}`}>
                              <item.icon className="h-4 w-4 text-white" />
                            </div>
                            <p className="truncate text-[11px] text-gray-400">{item.label}</p>
                          </div>
                          <p className="text-2xl font-extrabold leading-none text-white">{item.value}</p>
                          {"delta" in item ? (
                            <p className={`mt-1.5 flex items-center gap-0.5 text-[10px] ${up ? "text-emerald-400" : "text-red-400"}`}>
                              <span>{up ? "+" : "-"}</span>
                              {Math.abs(item.delta ?? 0)}% vs yesterday
                            </p>
                          ) : (
                            <p className="mt-1.5 flex items-center gap-1 text-[10px] text-gray-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              {item.helper}
                            </p>
                          )}
                        </div>
                        <SparkLine seed={item.seed} color={item.spark} />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
        </div>

        {/* ── Main grid ── */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden lg:grid-cols-3 2xl:gap-4">
          {/* Left column */}
          <div className="flex min-h-0 flex-col gap-3 lg:col-span-2 2xl:gap-4">
            {/* Live Activity Feed */}
            <Card className="flex min-h-0 flex-1 flex-col">
              <CardContent className="flex min-h-0 flex-1 flex-col p-4">
                <div className="mb-3 flex shrink-0 items-center justify-between">
                  <p className="text-sm font-semibold text-white">Live Activity Feed</p>
                  <div className="relative">
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="appearance-none rounded-lg border border-[#1e2d40] bg-[#0d1a2d] py-1 pl-3 pr-7 text-[11px] text-gray-300 focus:outline-none"
                    >
                      <option value="all">Filter</option>
                      <option value="call">Calls</option>
                      <option value="message">Messages</option>
                      <option value="appointment">Appointments</option>
                      <option value="ai">AI Actions</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
                  </div>
                </div>

                <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
                  {activityLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))
                  ) : filteredActivities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <Activity className="mb-2 h-9 w-9 text-gray-700" />
                      <p className="text-sm text-gray-400">No activity yet.</p>
                      <p className="text-xs text-gray-600">New events appear here in real time.</p>
                    </div>
                  ) : (
                    filteredActivities.slice(0, 10).map((item) => {
                      const c = classifyActivity(item);
                      return (
                        <div
                          key={item._id}
                          className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-[#0d1a2d]"
                        >
                          <span className="w-11 shrink-0 text-[11px] text-gray-500">
                            {shortTime(item.timestamp || item.createdAt)}
                          </span>
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${c.accent}`}>
                            <c.icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-gray-200">
                              {item.action || "Activity"}
                            </p>
                            <p className="truncate text-[10px] text-gray-500">
                              {item.description || item.user_id?.name || "-"}
                            </p>
                          </div>
                          {c.status && (
                            <span className={`flex shrink-0 items-center gap-1 text-[10px] font-medium ${c.status.cls}`}>
                              <span className="h-1.5 w-1.5 rounded-full bg-current" />
                              {c.status.label}
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                <button className="mt-3 flex w-full shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[#1e2d40] py-2 text-xs text-blue-400 transition-colors hover:bg-[#1e2d40]">
                  View all activity <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </CardContent>
            </Card>

            {/* Appointments Today chart */}
            <Card className="flex min-h-0 flex-1 flex-col">
              <CardContent className="flex min-h-0 flex-1 flex-col p-4">
                <div className="mb-1 flex shrink-0 items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">Appointments Today</p>
                    <p className="mt-1 text-2xl font-extrabold leading-none text-white">
                      {activeAppts.length}
                    </p>
                    {(() => {
                      const d = pctChange(activeAppts.length, yAppointments.filter((a) => a.status !== "cancelled").length);
                      return (
                        <p className={`mt-1 text-[10px] ${d >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {d >= 0 ? "+" : "-"} {Math.abs(d)}% vs yesterday
                        </p>
                      );
                    })()}
                  </div>
                  <span className="flex items-center gap-1 rounded-lg border border-[#1e2d40] px-2.5 py-1 text-[11px] text-gray-300">
                    Today <ChevronDown className="h-3.5 w-3.5" />
                  </span>
                </div>
                {apptLoading ? (
                  <Skeleton className="min-h-0 flex-1 w-full" />
                ) : (
                  <div className="min-h-0 flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="liveAppts" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} interval={1} />
                        <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{
                            background: "#0d1a2d",
                            border: "1px solid #1e2d40",
                            borderRadius: "8px",
                            fontSize: "11px",
                          }}
                          labelStyle={{ color: "#94a3b8" }}
                        />
                        <Area type="monotone" dataKey="count" name="Appointments" stroke="#3b82f6" fill="url(#liveAppts)" strokeWidth={2} dot={{ r: 2, fill: "#3b82f6" }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right column */}
          <div className="flex min-h-0 flex-col gap-3 overflow-hidden 2xl:gap-4">
            {/* Active Conversations */}
            <Card className="flex min-h-0 flex-1 flex-col">
              <CardContent className="flex min-h-0 flex-1 flex-col p-4">
                <div className="mb-3 flex shrink-0 items-center justify-between">
                  <p className="text-sm font-semibold text-white">Active Conversations</p>
                  <Link href="/inbox" className="text-xs text-blue-400 hover:text-blue-300">
                    View all
                  </Link>
                </div>

                <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
                  {callLoading || convLoading ? (
                    Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
                  ) : activeCalls.length === 0 && activeConversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <MessageSquare className="mb-2 h-8 w-8 text-gray-700" />
                      <p className="text-xs text-gray-500">No active conversations.</p>
                    </div>
                  ) : (
                    <>
                      {activeCalls.slice(0, 3).map((call) => {
                        const live = call.status === "accepted";
                        const dur = call.startedAt
                          ? (now.getTime() - new Date(call.startedAt).getTime()) / 1000
                          : 0;
                        return (
                          <div key={call._id} className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-[#0d1a2d]">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600/15 text-emerald-300">
                              <Phone className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-medium text-gray-200">
                                Call with {call.caller?.name || call.receiver?.name || "Unknown"}
                              </p>
                              <p className="truncate text-[10px] text-gray-500">{call.type === "video" ? "Video call" : "Voice call"}</p>
                            </div>
                            <span className="shrink-0 text-[10px] text-gray-400">{live ? fmtDuration(dur) : "Ringing"}</span>
                            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold ${live ? "bg-emerald-600/15 text-emerald-300 border-emerald-600/30" : "bg-amber-600/15 text-amber-300 border-amber-600/30"}`}>
                              {live ? "In Progress" : "Ringing"}
                            </span>
                          </div>
                        );
                      })}
                      {activeConversations.slice(0, 4).map((conv) => {
                        const other = conv.isGroup
                          ? conv.groupName
                          : conv.participants?.[0]?.name || "Conversation";
                        return (
                          <Link
                            key={conv._id}
                            href="/inbox"
                            className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-[#0d1a2d]"
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-600/15 text-purple-300">
                              <MessageSquare className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-medium text-gray-200">{other}</p>
                              <p className="truncate text-[10px] text-gray-500">
                                {conv.lastMessage || "No messages yet"}
                              </p>
                            </div>
                            {conv.unreadCount > 0 ? (
                              <span className="shrink-0 rounded-full bg-blue-600 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                                {conv.unreadCount} unread
                              </span>
                            ) : (
                              <span className="shrink-0 rounded-full border border-blue-600/30 bg-blue-600/15 px-2 py-0.5 text-[9px] font-semibold text-blue-300">
                                Active
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </>
                  )}
                </div>

                <Link
                  href="/inbox"
                  className="mt-3 flex w-full shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[#1e2d40] py-2 text-xs text-blue-400 transition-colors hover:bg-[#1e2d40]"
                >
                  Go to inbox <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </CardContent>
            </Card>

            {/* Today's Appointments */}
            <Card className="flex min-h-0 flex-1 flex-col">
              <CardContent className="flex min-h-0 flex-1 flex-col p-4">
                <div className="mb-3 flex shrink-0 items-center justify-between">
                  <p className="text-sm font-semibold text-white">Today&apos;s Appointments</p>
                  <Link href="/calendar" className="text-xs text-blue-400 hover:text-blue-300">
                    View full schedule
                  </Link>
                </div>

                <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
                  {apptLoading ? (
                    Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
                  ) : timeline.sorted.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Calendar className="mb-2 h-8 w-8 text-gray-700" />
                      <p className="text-xs text-gray-500">No appointments today.</p>
                    </div>
                  ) : (
                    timeline.sorted.slice(0, 6).map((a) => {
                      const badge = a._id === timeline.nextId
                        ? { label: "Next", cls: "bg-blue-600/15 text-blue-300 border-blue-600/30", bar: "bg-blue-500" }
                        : apptBadge(a.status);
                      return (
                        <div key={a._id} className="flex items-center gap-3 rounded-lg px-1 py-2">
                          <span className={`h-9 w-1 shrink-0 rounded-full ${badge.bar}`} />
                          <span className="w-12 shrink-0 text-[11px] text-gray-500">{a.startTime}</span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-gray-200">{guestName(a)}</p>
                            <p className="truncate text-[10px] text-gray-500">{a.service || "Appointment"}</p>
                          </div>
                          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold ${badge.cls}`}>
                            {badge.label}
                          </span>
                          <Avatar className="h-6 w-6 shrink-0">
                            {a?.employee?.profileImage?.url ? (
                              <AvatarImage src={a.employee.profileImage.url} alt="" />
                            ) : null}
                            <AvatarFallback className="text-[8px]">
                              {getInitials(a?.employee?.name || "EM")}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      );
                    })
                  )}
                </div>

                <Link
                  href="/calendar"
                  className="mt-3 flex w-full shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[#1e2d40] py-2 text-xs text-blue-400 transition-colors hover:bg-[#1e2d40]"
                >
                  View full schedule <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
