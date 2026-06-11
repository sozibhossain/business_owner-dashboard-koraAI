/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  appointmentsApi,
  customersApi,
  employeesApi,
  servicesApi,
} from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { asArray, getInitials } from "@/lib/utils";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRight,
  Ban,
  CalendarDays,
  CalendarPlus,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock3,
  Coffee,
  Copy,
  Filter,
  Move,
  MoreVertical,
  Plus,
  Scissors,
  Star,
  UserPlus,
  UserX,
  Users,
} from "lucide-react";

/* ─────────────────────────  Date helpers  ───────────────────────── */

const DAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

const startOfWeek = (date: Date) => {
  const next = new Date(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday as first day
  next.setDate(next.getDate() + diff);
  next.setHours(0, 0, 0, 0);
  return next;
};

const addDays = (date: Date, amount: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const buildWeek = (weekStart: Date) =>
  Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));

const formatWeekRange = (days: Date[]) => {
  if (days.length === 0) return "";
  const first = days[0];
  const last = days[days.length - 1];
  const left = first.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const right = last.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${left} – ${right}, ${last.getFullYear()}`;
};

const timeToMin = (time?: string) => {
  if (!time) return 0;
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

const minToTime = (mins: number) => {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, mins));
  const h = String(Math.floor(clamped / 60)).padStart(2, "0");
  const m = String(clamped % 60).padStart(2, "0");
  return `${h}:${m}`;
};

const formatDuration = (start?: string, end?: string) => {
  const mins = timeToMin(end) - timeToMin(start);
  if (mins <= 0) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m} min`;
};

const pctChange = (current: number, previous: number) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
};

/* ─────────────────────────  Status configs  ───────────────────────── */

const CAPACITY: Record<
  string,
  { label: string; dot: string; cell: string; label_text: string; num: string }
> = {
  free: {
    label: "Free Slots",
    dot: "bg-emerald-400",
    cell: "border-emerald-500/30 bg-emerald-500/[0.08] hover:bg-emerald-500/[0.14]",
    label_text: "text-emerald-400",
    num: "text-emerald-300",
  },
  busy: {
    label: "Busy",
    dot: "bg-blue-400",
    cell: "border-blue-500/30 bg-blue-500/[0.08] hover:bg-blue-500/[0.14]",
    label_text: "text-blue-400",
    num: "text-blue-200",
  },
  overbooked: {
    label: "Overbooked",
    dot: "bg-red-400",
    cell: "border-red-500/40 bg-red-500/[0.10] hover:bg-red-500/[0.16]",
    label_text: "text-red-400",
    num: "text-red-300",
  },
  off: {
    label: "Off",
    dot: "bg-gray-500",
    cell: "border-[#1b2940] bg-[#0a1322] hover:bg-[#0e1a2d]",
    label_text: "text-gray-500",
    num: "text-gray-500",
  },
};

const APPT_STATUS: Record<string, { label: string; cls: string; dot: string }> = {
  upcoming: {
    label: "Upcoming",
    cls: "bg-blue-600/15 text-blue-300 border-blue-600/30",
    dot: "bg-blue-400",
  },
  rescheduled: {
    label: "Rescheduled",
    cls: "bg-amber-600/15 text-amber-300 border-amber-600/30",
    dot: "bg-amber-400",
  },
  started: {
    label: "Started",
    cls: "bg-indigo-600/15 text-indigo-300 border-indigo-600/30",
    dot: "bg-indigo-400",
  },
  ongoing: {
    label: "In Progress",
    cls: "bg-amber-600/15 text-amber-300 border-amber-600/30",
    dot: "bg-amber-400",
  },
  completed: {
    label: "Completed",
    cls: "bg-emerald-600/15 text-emerald-300 border-emerald-600/30",
    dot: "bg-emerald-400",
  },
  cancelled: {
    label: "Cancelled",
    cls: "bg-red-600/15 text-red-300 border-red-600/30",
    dot: "bg-red-400",
  },
  no_show: {
    label: "No Show",
    cls: "bg-gray-600/20 text-gray-400 border-gray-600/30",
    dot: "bg-gray-400",
  },
};

const apptStatusMeta = (status?: string) =>
  APPT_STATUS[status || "upcoming"] || APPT_STATUS.upcoming;

const guestName = (appointment: any) =>
  appointment?.customer?.name || appointment?.client?.name || "Customer";

const guestPhone = (appointment: any) =>
  appointment?.customer?.phone || appointment?.client?.phoneNumber || "";

const isActiveAppt = (appointment: any) => appointment?.status !== "cancelled";

const groupByEmployee = (items: any[]) => {
  const map: Record<string, any[]> = {};
  items.forEach((item) => {
    const empId = String(item?.employee?._id || "");
    if (!empId) return;
    (map[empId] = map[empId] || []).push(item);
  });
  return map;
};

/* ─────────────────────────  Capacity engine  ───────────────────────── */

type CellInfo = {
  status: "free" | "busy" | "overbooked" | "off";
  count: number;
  capacity: number;
  remaining: number;
  ratio: number;
  display: number;
  appointments: any[];
};

const employeeCapacity = (
  employee: any,
  dateObj: Date,
  appointments: any[]
): CellInfo => {
  const dayKey = DAY_KEYS[dateObj.getDay()];
  const daysOff = (employee?.daysOff || []).map((d: string) =>
    String(d).toLowerCase()
  );

  const active = appointments.filter(isActiveAppt);
  const count = active.length;

  const wh = employee?.workingHours || {};
  let capacity = 8;
  if (wh.start && wh.end) {
    const span = timeToMin(wh.end) - timeToMin(wh.start);
    if (span > 0) capacity = Math.max(1, Math.round(span / 60));
  }

  const isOff = daysOff.includes(dayKey) || employee?.status === "on_leave";
  if (isOff) {
    return {
      status: "off",
      count: 0,
      capacity,
      remaining: 0,
      ratio: 0,
      display: 0,
      appointments: active,
    };
  }

  const remaining = Math.max(0, capacity - count);
  const ratio = capacity > 0 ? count / capacity : 0;

  let status: CellInfo["status"];
  let display: number;
  if (count > capacity) {
    status = "overbooked";
    display = count;
  } else if (ratio <= 0.6) {
    status = "free";
    display = remaining;
  } else {
    status = "busy";
    display = count;
  }

  return { status, count, capacity, remaining, ratio, display, appointments: active };
};

type DaySummary = {
  count: number;
  capacity: number;
  free: number;
  ratio: number;
  status: "free" | "busy" | "overbooked";
};

const summarizeDay = (
  dateObj: Date,
  appointmentsByEmployee: Record<string, any[]>,
  employees: any[]
): DaySummary => {
  let count = 0;
  let capacity = 0;
  let free = 0;
  let anyOver = false;

  employees.forEach((employee) => {
    const empId = String(employee?.userId?._id || "");
    const cell = employeeCapacity(employee, dateObj, appointmentsByEmployee[empId] || []);
    if (cell.status === "off") return;
    count += cell.count;
    capacity += cell.capacity;
    free += cell.remaining;
    if (cell.status === "overbooked") anyOver = true;
  });

  const ratio = capacity > 0 ? count / capacity : 0;
  let status: DaySummary["status"] = "free";
  if (anyOver || ratio > 1) status = "overbooked";
  else if (ratio >= 0.7) status = "busy";

  return { count, capacity, free, ratio, status };
};

const computeMetrics = (
  days: Date[],
  byDay: Record<string, any[]>,
  employees: any[]
) => {
  let total = 0;
  let noShows = 0;
  let freeSlots = 0;
  let busyDays = 0;
  let overbookedDays = 0;
  const busyDayNames: string[] = [];
  let usedCapacityNum = 0;
  let usedCapacityDen = 0;

  days.forEach((day) => {
    const key = toDateKey(day);
    const items = byDay[key] || [];
    total += items.filter(isActiveAppt).length;
    noShows += items.filter((a: any) => a.status === "no_show").length;

    const summary = summarizeDay(day, groupByEmployee(items), employees);
    freeSlots += summary.free;
    usedCapacityNum += summary.count;
    usedCapacityDen += summary.capacity;

    if (summary.status === "overbooked") overbookedDays += 1;
    else if (summary.status === "busy") {
      busyDays += 1;
      busyDayNames.push(day.toLocaleDateString("en-US", { weekday: "long" }));
    }
  });

  const utilization =
    usedCapacityDen > 0 ? Math.round((usedCapacityNum / usedCapacityDen) * 100) : 0;

  return {
    total,
    noShows,
    freeSlots,
    busyDays,
    overbookedDays,
    busyDayNames,
    utilization,
  };
};

/* ─────────────────────────  Mini visuals  ───────────────────────── */

const SparkLine = ({ seed, color }: { seed: number; color: string }) => {
  const points = Array.from({ length: 12 }, (_, i) => {
    const noise = ((seed * 9301 + i * 49297) % 233280) / 233280;
    return 8 + Math.round(noise * 16);
  });
  const path = points.map((v, i) => `${(i / 11) * 100},${24 - v}`).join(" ");
  return (
    <svg viewBox="0 0 100 24" className="h-7 w-16 shrink-0" preserveAspectRatio="none">
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

const KoraOrb = () => (
  <div className="relative h-[78px] w-[78px] shrink-0 select-none">
    <div className="absolute inset-0 rounded-full bg-blue-500/15 blur-lg animate-pulse" />
    <div
      className="absolute inset-[3px] rounded-full border-2 border-transparent"
      style={{
        borderTopColor: "rgba(59,130,246,0.7)",
        borderRightColor: "rgba(59,130,246,0.3)",
        animation: "spin 3s linear infinite",
      }}
    />
    <div className="absolute inset-[3px] rounded-full border border-blue-500/25" />
    <div className="absolute inset-[10px] rounded-full border border-blue-400/30 animate-pulse" />
    <div className="absolute inset-[6px] rounded-full bg-[#04091a]" />
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="mt-0.5 flex flex-col items-center gap-[5px]">
        <div className="flex gap-[7px]">
          <div className="h-[7px] w-[7px] rounded-full bg-white/90" />
          <div className="h-[7px] w-[7px] rounded-full bg-white/90" />
        </div>
        <svg width="18" height="8" viewBox="0 0 18 8">
          <path
            d="M2 2 Q9 8 16 2"
            stroke="white"
            strokeWidth="1.6"
            fill="none"
            strokeLinecap="round"
            opacity="0.9"
          />
        </svg>
      </div>
    </div>
  </div>
);

/* ─────────────────────────  Page  ───────────────────────── */

export default function TasksPage() {
  const queryClient = useQueryClient();

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selectedKey, setSelectedKey] = useState(() => toDateKey(new Date()));
  const [view, setView] = useState<"Week" | "List" | "Month">("Week");

  const weekDays = useMemo(() => buildWeek(weekStart), [weekStart]);
  const prevWeekDays = useMemo(
    () => buildWeek(addDays(weekStart, -7)),
    [weekStart]
  );

  /* ── Queries ── */

  const { data: employeesResponse, isLoading: employeesLoading } = useQuery({
    queryKey: ["tasks-employees"],
    queryFn: () => employeesApi.getAll({ limit: 100 }).then((r) => r.data),
  });

  const fetchWeek = (days: Date[]) =>
    Promise.all(
      days.map((day) =>
        appointmentsApi
          .getAll({ date: toDateKey(day), limit: 200 })
          .then((r) => ({ date: toDateKey(day), items: asArray(r.data?.data) }))
          .catch(() => ({ date: toDateKey(day), items: [] as any[] }))
      )
    );

  const { data: weekResponse, isLoading: weekLoading } = useQuery({
    queryKey: ["tasks-week", toDateKey(weekStart)],
    queryFn: () => fetchWeek(weekDays),
  });

  const { data: prevWeekResponse } = useQuery({
    queryKey: ["tasks-week-prev", toDateKey(weekStart)],
    queryFn: () => fetchWeek(prevWeekDays),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["tasks-customers"],
    queryFn: () => customersApi.getAll({ limit: 100 }).then((r) => asArray(r.data?.data)),
  });

  const { data: services = [] } = useQuery({
    queryKey: ["tasks-services"],
    queryFn: () =>
      servicesApi.getAll({ limit: 100 }).then((r) => asArray(r.data?.data)),
  });

  const employees: any[] = useMemo(
    () => asArray(employeesResponse?.data),
    [employeesResponse]
  );

  const appointmentsByDay = useMemo(() => {
    const map: Record<string, any[]> = {};
    asArray(weekResponse).forEach((entry: any) => {
      map[entry.date] = entry.items || [];
    });
    return map;
  }, [weekResponse]);

  const prevAppointmentsByDay = useMemo(() => {
    const map: Record<string, any[]> = {};
    asArray(prevWeekResponse).forEach((entry: any) => {
      map[entry.date] = entry.items || [];
    });
    return map;
  }, [prevWeekResponse]);

  /* ── Per-day, per-employee schedule ── */

  const employeeSchedule = useMemo(() => {
    return employees.map((employee) => {
      const empId = String(employee?.userId?._id || "");
      const cells = weekDays.map((day) => {
        const key = toDateKey(day);
        const dayItems = (appointmentsByDay[key] || []).filter(
          (a: any) => String(a?.employee?._id) === empId
        );
        return {
          date: key,
          dateObj: day,
          info: employeeCapacity(employee, day, dayItems),
        };
      });
      return { employee, cells };
    });
  }, [employees, weekDays, appointmentsByDay]);

  /* ── Weekly metrics ── */

  const metrics = useMemo(
    () => computeMetrics(weekDays, appointmentsByDay, employees),
    [weekDays, appointmentsByDay, employees]
  );

  const prevMetrics = useMemo(
    () => computeMetrics(prevWeekDays, prevAppointmentsByDay, employees),
    [prevWeekDays, prevAppointmentsByDay, employees]
  );

  /* ── Kora Insights ── */

  const insights = useMemo(() => {
    const daySummaries = weekDays.map((day) => ({
      day,
      summary: summarizeDay(day, groupByEmployee(appointmentsByDay[toDateKey(day)] || []), employees),
    }));

    const out: { icon: any; iconBg: string; iconColor: string; title: string; sub: string }[] = [];

    const busiest = [...daySummaries].sort((a, b) => b.summary.ratio - a.summary.ratio)[0];
    if (busiest && busiest.summary.count > 0) {
      out.push({
        icon: Star,
        iconBg: "bg-blue-600/20",
        iconColor: "text-blue-400",
        title: `${busiest.day.toLocaleDateString("en-US", { weekday: "long" })} is almost fully booked`,
        sub: `You have ${busiest.summary.count} appointment${busiest.summary.count === 1 ? "" : "s"}.`,
      });
    }

    const freest = [...daySummaries].sort((a, b) => b.summary.free - a.summary.free)[0];
    if (freest && freest.summary.free > 0) {
      out.push({
        icon: CalendarDays,
        iconBg: "bg-emerald-600/20",
        iconColor: "text-emerald-400",
        title: `You have ${freest.summary.free} free slots`,
        sub: `on ${freest.day.toLocaleDateString("en-US", { weekday: "long" })}.`,
      });
    }

    let overEntry: { name: string; weekday: string } | null = null;
    for (const { day } of daySummaries) {
      const key = toDateKey(day);
      for (const employee of employees) {
        const empId = String(employee?.userId?._id || "");
        const items = (appointmentsByDay[key] || []).filter(
          (a: any) => String(a?.employee?._id) === empId
        );
        if (employeeCapacity(employee, day, items).status === "overbooked") {
          overEntry = {
            name: (employee?.userId?.name || "An employee").split(" ")[0],
            weekday: day.toLocaleDateString("en-US", { weekday: "long" }),
          };
          break;
        }
      }
      if (overEntry) break;
    }
    if (overEntry) {
      out.push({
        icon: Users,
        iconBg: "bg-red-600/20",
        iconColor: "text-red-400",
        title: `${overEntry.name} is overbooked`,
        sub: `on ${overEntry.weekday}.`,
      });
    } else if (employees.length > 0) {
      out.push({
        icon: Users,
        iconBg: "bg-purple-600/20",
        iconColor: "text-purple-400",
        title: "Team capacity looks balanced",
        sub: "No overbooked employees this week.",
      });
    }

    const calmest = [...daySummaries]
      .filter((d) => d.summary.capacity > 0)
      .sort((a, b) => a.summary.ratio - b.summary.ratio)[0];
    if (calmest) {
      out.push({
        icon: Coffee,
        iconBg: "bg-amber-600/20",
        iconColor: "text-amber-400",
        title: "Consider a promo or break",
        sub: `${calmest.day.toLocaleDateString("en-US", { weekday: "long" })} is your quietest day.`,
      });
    }

    return out.slice(0, 4);
  }, [weekDays, appointmentsByDay, employees]);

  /* ── Selected day (right panel) ── */

  const selectedDate =
    weekDays.find((d) => toDateKey(d) === selectedKey) || weekDays[0];
  const selectedAppointments = useMemo(() => {
    const items = (appointmentsByDay[selectedKey] || []).filter(isActiveAppt);
    return [...items].sort((a, b) => timeToMin(a.startTime) - timeToMin(b.startTime));
  }, [appointmentsByDay, selectedKey]);

  const selectedSummary = useMemo(() => {
    const day = weekDays.find((d) => toDateKey(d) === selectedKey) || weekDays[0];
    return summarizeDay(
      day,
      groupByEmployee(appointmentsByDay[selectedKey] || []),
      employees
    );
  }, [weekDays, appointmentsByDay, selectedKey, employees]);

  /* ── Week navigation ── */

  const goWeek = (offset: number) => {
    const next = addDays(weekStart, offset * 7);
    setWeekStart(next);
    setSelectedKey(toDateKey(next));
  };
  const goToday = () => {
    const start = startOfWeek(new Date());
    setWeekStart(start);
    setSelectedKey(toDateKey(new Date()));
  };

  /* ── Modals ── */

  const [dayDetail, setDayDetail] = useState<{ employee: any; dateKey: string } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    customer: "",
    employee: "",
    service: "",
    date: "",
    startTime: "",
    endTime: "",
  });

  const openAddAppointment = (employeeUserId?: string, dateKey?: string) => {
    setForm({
      customer: "",
      employee: employeeUserId || "",
      service: "",
      date: dateKey || selectedKey,
      startTime: "09:00",
      endTime: "10:00",
    });
    setAddOpen(true);
  };

  const onServiceChange = (serviceId: string) => {
    const svc = services.find((s: any) => String(s._id) === serviceId);
    setForm((prev) => {
      const next = { ...prev, service: serviceId };
      if (svc?.duration && prev.startTime) {
        next.endTime = minToTime(timeToMin(prev.startTime) + Number(svc.duration));
      }
      return next;
    });
  };

  const onStartTimeChange = (startTime: string) => {
    setForm((prev) => {
      const next = { ...prev, startTime };
      const svc = services.find((s: any) => String(s._id) === prev.service);
      if (svc?.duration) {
        next.endTime = minToTime(timeToMin(startTime) + Number(svc.duration));
      }
      return next;
    });
  };

  const createMutation = useMutation({
    mutationFn: (payload: any) => appointmentsApi.create(payload),
    onSuccess: () => {
      toast.success("Appointment created");
      setAddOpen(false);
      queryClient.invalidateQueries({ queryKey: ["tasks-week"] });
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Could not create appointment"
      );
    },
  });

  const submitAppointment = () => {
    if (!form.customer) return toast.error("Select a customer");
    if (!form.employee) return toast.error("Select an employee");
    if (!form.date || !form.startTime || !form.endTime)
      return toast.error("Date and time are required");
    if (timeToMin(form.endTime) <= timeToMin(form.startTime))
      return toast.error("End time must be after start time");

    const svc = services.find((s: any) => String(s._id) === form.service);
    createMutation.mutate({
      customer: form.customer,
      employee: form.employee,
      appointmentDate: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      service: svc?.name || "",
      title: svc?.name || "Appointment",
    });
  };

  const isLoading = employeesLoading || weekLoading;

  /* ── Metric cards definition ── */

  const dayBadge = (status: "free" | "busy" | "overbooked") =>
    status === "overbooked"
      ? { label: "Overbooked", cls: "text-red-400", dot: "bg-red-400" }
      : status === "busy"
        ? { label: "Busy", cls: "text-blue-400", dot: "bg-blue-400" }
        : { label: "On Track", cls: "text-emerald-400", dot: "bg-emerald-400" };

  const metricCards = [
    {
      label: "Total Appointments",
      value: metrics.total,
      icon: CalendarDays,
      color: "bg-blue-600",
      spark: "#3b82f6",
      seed: 11,
      delta: pctChange(metrics.total, prevMetrics.total),
    },
    {
      label: "Free Slots",
      value: metrics.freeSlots,
      icon: CalendarRange,
      color: "bg-emerald-600",
      spark: "#10b981",
      seed: 7,
      delta: pctChange(metrics.freeSlots, prevMetrics.freeSlots),
    },
    {
      label: "Busy Days",
      value: metrics.busyDays,
      icon: Clock3,
      color: "bg-purple-600",
      spark: "#a855f7",
      seed: 23,
      subtext: metrics.busyDayNames.length
        ? metrics.busyDayNames.join(", ")
        : "No busy days yet",
    },
    {
      label: "Overbooked Days",
      value: metrics.overbookedDays,
      icon: AlertTriangle,
      color: "bg-red-600",
      spark: "#f97316",
      seed: 31,
      delta: pctChange(metrics.overbookedDays, prevMetrics.overbookedDays),
    },
    {
      label: "No Shows",
      value: metrics.noShows,
      icon: UserX,
      color: "bg-indigo-600",
      spark: "#6366f1",
      seed: 17,
      delta: pctChange(metrics.noShows, prevMetrics.noShows),
    },
  ];

  const quickActions = [
    {
      label: "Add\nAppointment",
      icon: CalendarPlus,
      color: "bg-blue-600/20 text-blue-400 border-blue-600/30",
      onClick: () => openAddAppointment(),
    },
    {
      label: "Add\nBlock",
      icon: Ban,
      color: "bg-amber-600/20 text-amber-400 border-amber-600/30",
      onClick: () => toast.info("Time blocking will be available soon"),
    },
    {
      label: "Assign\nTask",
      icon: ClipboardList,
      color: "bg-purple-600/20 text-purple-400 border-purple-600/30",
      onClick: () => toast.info("Task assignment will be available soon"),
    },
    {
      label: "Copy\nWeek",
      icon: Copy,
      color: "bg-emerald-600/20 text-emerald-400 border-emerald-600/30",
      onClick: () => toast.info("Copy week will be available soon"),
    },
  ];

  /* ── Day-detail derived data ── */

  const detailEmployee = dayDetail?.employee;
  const detailDateObj = dayDetail
    ? weekDays.find((d) => toDateKey(d) === dayDetail.dateKey) ||
      new Date(dayDetail.dateKey)
    : null;
  const detailAppointments = useMemo(() => {
    if (!dayDetail || !detailEmployee) return [];
    const empId = String(detailEmployee?.userId?._id || "");
    return (appointmentsByDay[dayDetail.dateKey] || [])
      .filter((a: any) => String(a?.employee?._id) === empId && isActiveAppt(a))
      .sort((a: any, b: any) => timeToMin(a.startTime) - timeToMin(b.startTime));
  }, [dayDetail, detailEmployee, appointmentsByDay]);
  const detailInfo =
    dayDetail && detailEmployee && detailDateObj
      ? employeeCapacity(
          detailEmployee,
          detailDateObj,
          (appointmentsByDay[dayDetail.dateKey] || []).filter(
            (a: any) => String(a?.employee?._id) === String(detailEmployee?.userId?._id)
          )
        )
      : null;

  /* ─────────────────────────  Render  ───────────────────────── */

  return (
    <div>
      <Header
        title="Tasks"
        subtitle="Weekly overview of all appointments and tasks. Plan smarter, stay ahead."
      />

      <div className="space-y-5 p-3 sm:p-4 lg:p-6">
        {/* ── Page heading ── */}
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[22px] font-bold text-white">Tasks</h2>
            <CalendarDays className="h-5 w-5 text-blue-400" />
          </div>
          <p className="mt-0.5 text-sm text-gray-400">
            Weekly overview of all appointments and tasks. Plan smarter, stay ahead.
          </p>
        </div>

        {/* ── Weekly Performance Overview ── */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
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
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex min-w-0 items-start gap-2.5">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.color}`}
                          >
                            <item.icon className="h-4 w-4 text-white" />
                          </div>
                          <div className="min-w-0">
                            <p className="mb-0.5 truncate text-[10px] leading-tight text-gray-400">
                              {item.label}
                            </p>
                            <p className="text-2xl font-extrabold leading-none text-white">
                              {item.value}
                            </p>
                            {"subtext" in item && item.subtext ? (
                              <p className="mt-1 truncate text-[10px] leading-tight text-gray-400">
                                {item.subtext}
                              </p>
                            ) : (
                              <p
                                className={`mt-1 flex items-center gap-0.5 text-[10px] leading-tight ${
                                  up ? "text-emerald-400" : "text-red-400"
                                }`}
                              >
                                <span>{up ? "↑" : "↓"}</span>
                                {Math.abs(item.delta ?? 0)}% vs last week
                              </p>
                            )}
                          </div>
                        </div>
                        <SparkLine seed={item.seed} color={item.spark} />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
        </div>

        {/* ── Kora Insights ── */}
        <Card className="bg-[#070f1c]">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <div className="flex shrink-0 items-center gap-3">
                <KoraOrb />
                <div>
                  <p className="text-sm font-semibold text-white">Kora Insights</p>
                  <p className="text-[11px] text-gray-500">AI-powered scheduling tips</p>
                </div>
              </div>

              <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {(insights.length ? insights : []).map((insight, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 rounded-xl border border-[#1e2d40] bg-[#0d1a2d] px-3 py-2.5"
                  >
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${insight.iconBg}`}
                    >
                      <insight.icon className={`h-3.5 w-3.5 ${insight.iconColor}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium leading-tight text-gray-200">
                        {insight.title}
                      </p>
                      <p className="truncate text-[10px] text-gray-500">{insight.sub}</p>
                    </div>
                  </div>
                ))}
                {!insights.length && (
                  <div className="col-span-full py-4 text-center text-xs text-gray-500">
                    Insights will appear once you have schedule data.
                  </div>
                )}
              </div>

              <button className="flex shrink-0 items-center gap-1.5 self-start whitespace-nowrap rounded-lg border border-[#1e2d40] px-3 py-2 text-xs text-blue-400 transition-colors hover:bg-[#1e2d40] lg:self-center">
                View all insights <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Left: toolbar + capacity planner */}
          <div className="space-y-5 lg:col-span-2">
            <Card>
              {/* Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1e2d40] p-4">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-semibold text-white">
                    {formatWeekRange(weekDays)}
                  </span>
                  <div className="ml-1 flex items-center gap-1">
                    <button
                      onClick={() => goWeek(-1)}
                      className="rounded-md border border-[#1e2d40] p-1 text-gray-400 transition-colors hover:bg-[#1e2d40] hover:text-gray-200"
                      aria-label="Previous week"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => goWeek(1)}
                      className="rounded-md border border-[#1e2d40] p-1 text-gray-400 transition-colors hover:bg-[#1e2d40] hover:text-gray-200"
                      aria-label="Next week"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    <button
                      onClick={goToday}
                      className="rounded-md border border-[#1e2d40] px-2.5 py-1 text-xs text-gray-300 transition-colors hover:bg-[#1e2d40]"
                    >
                      Today
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5 rounded-lg bg-[#0d1a2d] p-0.5">
                    {(["Week", "List", "Month"] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => setView(v)}
                        className={`rounded-md px-3 py-1 text-[11px] font-medium transition-colors ${
                          view === v
                            ? "bg-blue-600 text-white"
                            : "text-gray-400 hover:text-gray-200"
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                  <button className="flex items-center gap-1.5 rounded-lg border border-[#1e2d40] px-3 py-1.5 text-[11px] text-gray-300 transition-colors hover:bg-[#1e2d40]">
                    <Filter className="h-3.5 w-3.5" /> Filters
                  </button>
                </div>
              </div>

              {/* Body */}
              <CardContent className="p-4">
                {isLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-14 w-full" />
                    ))}
                  </div>
                ) : employees.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Users className="mb-2 h-9 w-9 text-gray-700" />
                    <p className="text-sm text-gray-400">No employees found.</p>
                    <p className="text-xs text-gray-600">
                      Add employees to start planning capacity.
                    </p>
                  </div>
                ) : view === "List" ? (
                  /* ── List view ── */
                  <ListView
                    weekDays={weekDays}
                    appointmentsByDay={appointmentsByDay}
                    onSelect={(key) => setSelectedKey(key)}
                  />
                ) : view === "Month" ? (
                  /* ── Month placeholder ── */
                  <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                    <CalendarDays className="h-10 w-10 text-gray-700" />
                    <div>
                      <p className="text-sm text-gray-300">Month view</p>
                      <p className="text-xs text-gray-500">
                        Open the full calendar for a complete month overview.
                      </p>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <a href="/calendar">Open Calendar</a>
                    </Button>
                  </div>
                ) : (
                  /* ── Week capacity grid ── */
                  <div className="overflow-x-auto">
                    <div className="min-w-180">
                      {/* Header row */}
                      <div
                        className="grid border-b border-[#1e2d40] pb-2"
                        style={{ gridTemplateColumns: "170px repeat(7, 1fr)" }}
                      >
                        <div className="px-1 text-[11px] font-medium text-gray-500">
                          Employees
                        </div>
                        {weekDays.map((day) => {
                          const key = toDateKey(day);
                          const isSelected = key === selectedKey;
                          return (
                            <button
                              key={key}
                              onClick={() => setSelectedKey(key)}
                              className={`px-1 text-center text-[11px] font-medium transition-colors ${
                                isSelected ? "text-blue-400" : "text-gray-500 hover:text-gray-300"
                              }`}
                            >
                              <div>{day.toLocaleDateString("en-US", { weekday: "short" })}</div>
                              <div className="text-gray-600">
                                {day.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Employee rows */}
                      <div className="divide-y divide-[#1e2d40]">
                        {employeeSchedule.map(({ employee, cells }) => (
                          <div
                            key={employee._id}
                            className="grid items-center py-2.5"
                            style={{ gridTemplateColumns: "170px repeat(7, 1fr)" }}
                          >
                            <div className="flex items-center gap-2.5 px-1 pr-2">
                              <Avatar className="h-8 w-8">
                                {employee?.userId?.profileImage?.url ? (
                                  <AvatarImage
                                    src={employee.userId.profileImage.url}
                                    alt={employee?.userId?.name}
                                  />
                                ) : null}
                                <AvatarFallback className="text-[10px]">
                                  {getInitials(employee?.userId?.name || "EM")}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="truncate text-xs font-medium text-gray-200">
                                  {employee?.userId?.name || "Employee"}
                                </p>
                                <p className="truncate text-[10px] text-gray-500">
                                  {employee?.position || "Employee"}
                                </p>
                              </div>
                            </div>

                            {cells.map((cell) => {
                              const cfg = CAPACITY[cell.info.status];
                              return (
                                <div key={cell.date} className="px-1">
                                  <div
                                    role="button"
                                    tabIndex={0}
                                    onClick={() =>
                                      setDayDetail({ employee, dateKey: cell.date })
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter")
                                        setDayDetail({ employee, dateKey: cell.date });
                                    }}
                                    className={`group relative cursor-pointer rounded-lg border p-2 transition-colors ${cfg.cell}`}
                                  >
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openAddAppointment(
                                          employee?.userId?._id,
                                          cell.date
                                        );
                                      }}
                                      className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded text-gray-500 opacity-0 transition-opacity hover:text-blue-400 group-hover:opacity-100"
                                      aria-label="Add appointment"
                                    >
                                      <Plus className="h-3.5 w-3.5" />
                                    </button>
                                    <p className={`text-base font-bold leading-none ${cfg.num}`}>
                                      {cell.info.status === "off" ? "—" : cell.info.display}
                                    </p>
                                    <p className={`mt-1 text-[10px] leading-tight ${cfg.label_text}`}>
                                      {cfg.label}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>

                      {/* Legend */}
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#1e2d40] pt-3">
                        <div className="flex flex-wrap items-center gap-4">
                          {(["free", "busy", "overbooked", "off"] as const).map((k) => (
                            <div key={k} className="flex items-center gap-1.5">
                              <span className={`h-2 w-2 rounded-full ${CAPACITY[k].dot}`} />
                              <span className="text-[11px] text-gray-400">
                                {CAPACITY[k].label}
                              </span>
                            </div>
                          ))}
                        </div>
                        <a
                          href="/employees"
                          className="flex items-center gap-1.5 text-xs text-blue-400 transition-colors hover:text-blue-300"
                        >
                          Manage schedule <ArrowRight className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: daily schedule + quick actions */}
          <div className="space-y-5">
            {/* Daily Schedule Overview */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">
                    {selectedDate.toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  {(() => {
                    const b = dayBadge(selectedSummary.status);
                    return (
                      <span className={`flex items-center gap-1.5 text-xs font-medium ${b.cls}`}>
                        <span className={`h-2 w-2 rounded-full ${b.dot}`} />
                        {b.label}
                      </span>
                    );
                  })()}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <p className="text-xs text-gray-400">
                    {selectedAppointments.length} Appointment
                    {selectedAppointments.length === 1 ? "" : "s"}
                  </p>
                  <p
                    className={`text-xs ${
                      selectedSummary.ratio > 1 ? "text-red-400" : "text-gray-400"
                    }`}
                  >
                    {Math.round(selectedSummary.ratio * 100)}% of capacity
                  </p>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#1e2d40]">
                  <div
                    className={`h-full rounded-full ${
                      selectedSummary.ratio > 1
                        ? "bg-red-500"
                        : selectedSummary.ratio >= 0.7
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(100, Math.round(selectedSummary.ratio * 100))}%` }}
                  />
                </div>

                <div className="mt-4 max-h-80 space-y-1 overflow-y-auto pr-1">
                  {selectedAppointments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <CalendarDays className="mb-2 h-8 w-8 text-gray-700" />
                      <p className="text-xs text-gray-500">No appointments this day.</p>
                    </div>
                  ) : (
                    selectedAppointments.map((appt) => {
                      const meta = apptStatusMeta(appt.status);
                      return (
                        <div
                          key={appt._id}
                          className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-[#0d1a2d]"
                        >
                          <span className="w-12 shrink-0 text-[11px] text-gray-500">
                            {appt.startTime}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-gray-200">
                              {guestName(appt)}
                            </p>
                            <p className="truncate text-[10px] text-gray-500">
                              {appt.service || "Appointment"}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold ${meta.cls}`}
                          >
                            {meta.label}
                          </span>
                          <Avatar className="h-6 w-6 shrink-0">
                            {appt?.employee?.profileImage?.url ? (
                              <AvatarImage src={appt.employee.profileImage.url} alt="" />
                            ) : null}
                            <AvatarFallback className="text-[8px]">
                              {getInitials(appt?.employee?.name || "EM")}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      );
                    })
                  )}
                </div>

                <button
                  onClick={() => {
                    const todayEmp = employees[0];
                    if (todayEmp) setDayDetail({ employee: todayEmp, dateKey: selectedKey });
                  }}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#1e2d40] py-2 text-xs text-blue-400 transition-colors hover:bg-[#1e2d40]"
                >
                  View full day <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardContent className="p-4">
                <p className="mb-3 text-sm font-semibold text-white">Quick Actions</p>
                <div className="grid grid-cols-4 gap-2">
                  {quickActions.map((action) => (
                    <button
                      key={action.label}
                      onClick={action.onClick}
                      className="flex flex-col items-center gap-2 rounded-xl border border-[#1e2d40] bg-[#0d1a2d] px-1 py-3 transition-colors hover:bg-[#1e2d40]"
                    >
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-xl border ${action.color}`}
                      >
                        <action.icon className="h-4 w-4" />
                      </div>
                      <span className="whitespace-pre-line text-center text-[10px] leading-tight text-gray-400">
                        {action.label}
                      </span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* ── Day Detail modal ── */}
      <Dialog open={!!dayDetail} onOpenChange={(open) => !open && setDayDetail(null)}>
        <DialogContent className="max-w-2xl p-0">
          {dayDetail && detailDateObj && (
            <div>
              <DialogHeader className="mb-0 space-y-0 border-b border-[#1e2d40] p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20">
                    <CalendarDays className="h-5 w-5 text-blue-400" />
                  </div>
                  <DialogTitle>
                    {detailDateObj.toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </DialogTitle>
                </div>
                <div className="flex items-center gap-3 pl-13 pt-2">
                  <Avatar className="h-8 w-8">
                    {detailEmployee?.userId?.profileImage?.url ? (
                      <AvatarImage
                        src={detailEmployee.userId.profileImage.url}
                        alt={detailEmployee?.userId?.name}
                      />
                    ) : null}
                    <AvatarFallback className="text-[10px]">
                      {getInitials(detailEmployee?.userId?.name || "EM")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-gray-200">
                      {detailEmployee?.userId?.name || "Employee"}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      {detailEmployee?.position || "Employee"}
                    </p>
                  </div>
                  {detailInfo && (
                    <span
                      className={`flex items-center gap-1.5 text-xs font-medium ${CAPACITY[detailInfo.status].label_text}`}
                    >
                      <span className={`h-2 w-2 rounded-full ${CAPACITY[detailInfo.status].dot}`} />
                      {CAPACITY[detailInfo.status].label}
                    </span>
                  )}
                  <span className="ml-auto text-xs text-gray-500">
                    {detailAppointments.length} Appointments
                  </span>
                </div>
              </DialogHeader>

              <div className="max-h-[50vh] overflow-y-auto p-5">
                {detailAppointments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <CalendarDays className="mb-2 h-8 w-8 text-gray-700" />
                    <p className="text-sm text-gray-400">No appointments scheduled.</p>
                  </div>
                ) : (
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-[#1e2d40] text-[11px] text-gray-500">
                        <th className="pb-2 font-medium">Time</th>
                        <th className="pb-2 font-medium">Customer</th>
                        <th className="pb-2 font-medium">Service</th>
                        <th className="pb-2 font-medium">Duration</th>
                        <th className="pb-2 font-medium">Status</th>
                        <th className="pb-2 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e2d40]">
                      {detailAppointments.map((appt: any) => {
                        const meta = apptStatusMeta(appt.status);
                        return (
                          <tr key={appt._id} className="text-xs">
                            <td className="py-3 pr-2 text-gray-400">
                              {appt.startTime}
                              <div className="text-[10px] text-gray-600">
                                – {appt.endTime}
                              </div>
                            </td>
                            <td className="py-3 pr-2">
                              <p className="font-medium text-gray-200">{guestName(appt)}</p>
                              {guestPhone(appt) ? (
                                <p className="text-[10px] text-gray-500">{guestPhone(appt)}</p>
                              ) : null}
                            </td>
                            <td className="py-3 pr-2">
                              <span className="flex items-center gap-1.5 text-gray-300">
                                <Scissors className="h-3 w-3 text-gray-500" />
                                {appt.service || "Appointment"}
                              </span>
                            </td>
                            <td className="py-3 pr-2 text-gray-400">
                              {formatDuration(appt.startTime, appt.endTime)}
                            </td>
                            <td className="py-3 pr-2">
                              <span
                                className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${meta.cls}`}
                              >
                                {meta.label}
                              </span>
                            </td>
                            <td className="py-3 text-right">
                              <button
                                onClick={() => toast.info("Appointment actions coming soon")}
                                className="rounded-md p-1 text-gray-500 transition-colors hover:bg-[#1e2d40] hover:text-gray-300"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}

                {/* Actions */}
                <button
                  onClick={() => {
                    openAddAppointment(detailEmployee?.userId?._id, dayDetail.dateKey);
                    setDayDetail(null);
                  }}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#2a3547] py-2.5 text-sm text-blue-400 transition-colors hover:bg-[#0d1a2d]"
                >
                  <Plus className="h-4 w-4" /> Add Appointment
                </button>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  {[
                    { label: "Block Time", icon: Ban },
                    { label: "Move Appointment", icon: Move },
                    { label: "Assign Employee", icon: UserPlus },
                  ].map((a) => (
                    <button
                      key={a.label}
                      onClick={() => toast.info(`${a.label} coming soon`)}
                      className="flex items-center justify-center gap-1.5 rounded-lg border border-[#1e2d40] py-2 text-xs text-gray-300 transition-colors hover:bg-[#0d1a2d]"
                    >
                      <a.icon className="h-3.5 w-3.5" /> {a.label}
                    </button>
                  ))}
                </div>

                {/* Footer summary */}
                <div className="mt-4 grid grid-cols-3 gap-3 border-t border-[#1e2d40] pt-4">
                  <div>
                    <p className="text-[10px] text-gray-500">Total Appointments</p>
                    <p className="text-sm font-semibold text-gray-200">
                      {detailAppointments.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500">Total Duration</p>
                    <p className="text-sm font-semibold text-gray-200">
                      {formatDuration(
                        "00:00",
                        minToTime(
                          detailAppointments.reduce(
                            (sum: number, a: any) =>
                              sum + Math.max(0, timeToMin(a.endTime) - timeToMin(a.startTime)),
                            0
                          )
                        )
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500">Day Status</p>
                    {detailInfo && (
                      <p
                        className={`flex items-center gap-1.5 text-sm font-semibold ${CAPACITY[detailInfo.status].label_text}`}
                      >
                        <span className={`h-2 w-2 rounded-full ${CAPACITY[detailInfo.status].dot}`} />
                        {CAPACITY[detailInfo.status].label}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Add Appointment modal ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Appointment</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Field label="Customer">
              <Select
                value={form.customer}
                onValueChange={(v) => setForm((p) => ({ ...p, customer: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-gray-500">No customers</div>
                  ) : (
                    customers.map((c: any) => (
                      <SelectItem key={c._id} value={String(c._id)}>
                        {c.name}
                        {c.phone ? ` · ${c.phone}` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Employee">
              <Select
                value={form.employee}
                onValueChange={(v) => setForm((p) => ({ ...p, employee: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-gray-500">No employees</div>
                  ) : (
                    employees.map((e: any) => (
                      <SelectItem key={e._id} value={String(e?.userId?._id)}>
                        {e?.userId?.name} · {e.position}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Service (optional)">
              <Select value={form.service} onValueChange={onServiceChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  {services.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-gray-500">No services</div>
                  ) : (
                    services.map((s: any) => (
                      <SelectItem key={s._id} value={String(s._id)}>
                        {s.name}
                        {s.duration ? ` · ${s.duration} min` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Date">
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Start time">
                <Input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => onStartTimeChange(e.target.value)}
                />
              </Field>
              <Field label="End time">
                <Input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))}
                />
              </Field>
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitAppointment} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create Appointment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─────────────────────────  Sub-components  ───────────────────────── */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-gray-400">{label}</label>
      {children}
    </div>
  );
}

function ListView({
  weekDays,
  appointmentsByDay,
  onSelect,
}: {
  weekDays: Date[];
  appointmentsByDay: Record<string, any[]>;
  onSelect: (key: string) => void;
}) {
  const rows = weekDays
    .map((day) => {
      const key = toDateKey(day);
      const items = (appointmentsByDay[key] || [])
        .filter(isActiveAppt)
        .sort((a: any, b: any) => timeToMin(a.startTime) - timeToMin(b.startTime));
      return { day, key, items };
    })
    .filter((r) => r.items.length > 0);

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CalendarDays className="mb-2 h-9 w-9 text-gray-700" />
        <p className="text-sm text-gray-400">No appointments this week.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {rows.map(({ day, key, items }) => (
        <div key={key}>
          <button
            onClick={() => onSelect(key)}
            className="mb-2 text-xs font-semibold text-gray-300 hover:text-blue-400"
          >
            {day.toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
            <span className="ml-2 font-normal text-gray-500">
              {items.length} appointment{items.length === 1 ? "" : "s"}
            </span>
          </button>
          <div className="space-y-1">
            {items.map((appt: any) => {
              const meta = apptStatusMeta(appt.status);
              return (
                <div
                  key={appt._id}
                  className="flex items-center gap-3 rounded-lg border border-[#1e2d40] bg-[#0d1a2d] px-3 py-2"
                >
                  <span className="w-20 shrink-0 text-[11px] text-gray-500">
                    {appt.startTime} – {appt.endTime}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-gray-200">
                      {guestName(appt)}
                    </p>
                    <p className="truncate text-[10px] text-gray-500">
                      {appt.service || "Appointment"} ·{" "}
                      {appt?.employee?.name || "Employee"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${meta.cls}`}
                  >
                    {meta.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
