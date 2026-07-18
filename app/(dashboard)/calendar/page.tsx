/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { appointmentsApi, calendarApi, employeesApi } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { asArray, getInitials } from "@/lib/utils";
import { toast } from "sonner";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Coffee,
  Eye,
  Filter,
  Globe2,
  Palette,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Settings2,
  ShieldCheck,
  StopCircle,
  User,
  X,
} from "lucide-react";
import { CreateAppointmentDialog } from "@/components/create-appointment-dialog";
import { AppointmentDetailsDialog } from "@/components/appointment-details-dialog";
import { AddBlockDialog } from "@/components/add-block-dialog";

const VIEWS = ["Day", "Week", "Month", "Agenda"] as const;
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 12 }, (_, index) => 8 + index); // 08 → 19

const TEAM_COLOR_POOL = [
  "#3b82f6",
  "#22c55e",
  "#a855f7",
  "#f59e0b",
  "#ec4899",
  "#06b6d4",
  "#ef4444",
  "#10b981",
];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  upcoming: { label: "Upcoming", color: "text-gray-400" },
  rescheduled: { label: "Upcoming", color: "text-gray-400" },
  started: { label: "In Progress", color: "text-amber-400" },
  ongoing: { label: "In Progress", color: "text-amber-400" },
  completed: { label: "Completed", color: "text-emerald-400" },
  cancelled: { label: "Cancelled", color: "text-red-400" },
  no_show: { label: "No Show", color: "text-red-400" },
};

const STATUS_FILTER_OPTIONS = [
  { value: "upcoming", label: "Upcoming" },
  { value: "started", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show", label: "No Show" },
];

const APPOINTMENT_TYPE_PRESETS = [
  { name: "Customer Appointment", color: "#2563eb", duration: "60 min", visibility: "Customer" },
  { name: "Service Consultation", color: "#16a34a", duration: "45 min", visibility: "Customer" },
  { name: "Employee Shift", color: "#7c3aed", duration: "All day", visibility: "Team" },
  { name: "Business Review", color: "#f97316", duration: "60 min", visibility: "Owner" },
  { name: "Break", color: "#f59e0b", duration: "30 min", visibility: "Team" },
];
const startOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const endOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};

const startOfWeek = (date: Date) => {
  const next = new Date(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  next.setHours(0, 0, 0, 0);
  return next;
};

const endOfWeek = (date: Date) => {
  const next = startOfWeek(date);
  next.setDate(next.getDate() + 6);
  next.setHours(23, 59, 59, 999);
  return next;
};

const startOfMonth = (date: Date) => {
  const next = new Date(date.getFullYear(), date.getMonth(), 1);
  next.setHours(0, 0, 0, 0);
  return next;
};

const endOfMonth = (date: Date) => {
  const next = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  next.setHours(23, 59, 59, 999);
  return next;
};

const addDays = (date: Date, amount: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};

const isSameDay = (first: Date, second: Date) =>
  first.getFullYear() === second.getFullYear() &&
  first.getMonth() === second.getMonth() &&
  first.getDate() === second.getDate();

const formatMonthDay = (date: Date) =>
  date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

const formatWeekday = (date: Date) => date.toLocaleDateString("en-US", { weekday: "short" });

const formatFullDate = (date: Date) =>
  date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const formatMonthYear = (date: Date) =>
  date.toLocaleDateString("en-US", { month: "long", year: "numeric" });

const formatHourLabel = (hour: number) => `${String(hour).padStart(2, "0")}:00`;

const formatRange = (start: string, end: string) => {
  if (!start || !end) return "";
  return `${start.slice(0, 5)} – ${end.slice(0, 5)}`;
};

const BREAK_COLOR = "#f59e0b";

const formatTimeOnly = (iso: string) => {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

const formatBlockRange = (block: any) => {
  if (block.allDay) return "All day";
  return formatRange(formatTimeOnly(block.start_time), formatTimeOnly(block.end_time));
};

const getBlockIcon = (block: any) => (block.color === BREAK_COLOR ? Coffee : StopCircle);

const readId = (value: any) =>
  value ? String(value._id || value.id || value.userId?._id || value.userId || value) : "";

const appointmentEmployeeIds = (appointment: any) => {
  const employee = appointment?.employee;
  return new Set(
    [
      employee?._id,
      employee?.id,
      employee?.userId?._id,
      employee?.userId,
      typeof employee === "string" ? employee : "",
    ]
      .filter(Boolean)
      .map(String),
  );
};

const hasTeamAppointmentFields = (appointment: any) =>
  Boolean(appointment?.employee || appointment?.customer || appointment?.client);

const getAppointmentName = (appointment: any) =>
  appointment.customer?.name || appointment.client?.name || appointment.title || "Appointment";

const getAppointmentMeta = (appointment: any) => {
  const serviceName =
    typeof appointment.service === "string" ? appointment.service : appointment.service?.name;
  return serviceName || appointment.bookingNotes || appointment.notes || "Personal appointment";
};

export default function CalendarPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: session } = useSession();
  const sessionUser = session?.user as { _id?: string; id?: string } | undefined;
  const currentUserId = String(sessionUser?._id || sessionUser?.id || "");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAppointmentTypesDialog, setShowAppointmentTypesDialog] = useState(false);
  const [showCalendarSettingsDialog, setShowCalendarSettingsDialog] = useState(false);
  const [appointmentTypes, setAppointmentTypes] = useState(APPOINTMENT_TYPE_PRESETS);
  const [newAppointmentType, setNewAppointmentType] = useState("");
  const [newAppointmentTypeDuration, setNewAppointmentTypeDuration] = useState("60 min");
  const [newAppointmentTypeVisibility, setNewAppointmentTypeVisibility] = useState("Customer");
  const [newAppointmentTypeColor, setNewAppointmentTypeColor] = useState("#2563eb");
  const [createDialogMode, setCreateDialogMode] = useState<"personal" | "team">("personal");
  const [appointmentDefaultDate, setAppointmentDefaultDate] = useState<Date | null>(null);
  const [calendarScope, setCalendarScope] = useState<"team" | "my">("team");
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [view, setView] = useState<(typeof VIEWS)[number]>("Week");
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showSync, setShowSync] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showEmployeeSearch, setShowEmployeeSearch] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(new Set());
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [blockDialogType, setBlockDialogType] = useState<"block" | "break" | null>(null);
  const [calendarSettings, setCalendarSettings] = useState({
    defaultView: "Week",
    timeZone: "Asia/Dhaka",
    weekStartsOn: "Monday",
    workingStart: "09:00",
    workingEnd: "18:00",
    defaultDuration: "60",
    reminder: "15",
    eventDensity: "Comfortable",
    syncGoogle: true,
    showWeekends: true,
    showDeclined: false,
    publicBooking: true,
    employeeCanEdit: true,
    requireCustomer: true,
  });
  const employeeSearchRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("create") !== "appointment") return;

    const openTimer = window.setTimeout(() => {
      setCreateDialogMode("personal");
      setShowCreateDialog(true);
      params.delete("create");
      const query = params.toString();
      router.replace(query ? `/calendar?${query}` : "/calendar", { scroll: false });
    }, 0);
    return () => window.clearTimeout(openTimer);
  }, [router]);

  useEffect(() => {
    if (!showEmployeeSearch) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!employeeSearchRef.current?.contains(event.target as Node)) {
        setShowEmployeeSearch(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [showEmployeeSearch]);

  const openPersonalAppointmentDialog = (date?: Date | null) => {
    setShowCreateDialog(false);
    setAppointmentDefaultDate(date || selectedDate || null);
    setCreateDialogMode("personal");
    window.setTimeout(() => setShowCreateDialog(true), 0);
  };

  const openTeamAppointmentDialog = (date?: Date | null) => {
    setShowCreateDialog(false);
    setAppointmentDefaultDate(date || selectedDate || null);
    setCreateDialogMode("team");
    window.setTimeout(() => setShowCreateDialog(true), 0);
  };

  const openScopedAppointmentDialog = (date?: Date | null) => {
    const targetDate = date || selectedDate || null;
    if (calendarScope === "team") {
      openTeamAppointmentDialog(targetDate);
      return;
    }

    openPersonalAppointmentDialog(targetDate);
  };

  const { rangeStart, rangeEnd } = useMemo(() => {
    switch (view) {
      case "Day":
        return { rangeStart: startOfDay(anchorDate), rangeEnd: endOfDay(anchorDate) };
      case "Month": {
        const monthStart = startOfMonth(anchorDate);
        const monthEnd = endOfMonth(anchorDate);
        return { rangeStart: startOfWeek(monthStart), rangeEnd: endOfWeek(monthEnd) };
      }
      case "Agenda":
        return { rangeStart: startOfDay(anchorDate), rangeEnd: endOfDay(addDays(anchorDate, 13)) };
      case "Week":
      default:
        return { rangeStart: startOfWeek(anchorDate), rangeEnd: endOfWeek(anchorDate) };
    }
  }, [view, anchorDate]);

  const days = useMemo(() => {
    const result: Date[] = [];
    const cursor = startOfDay(rangeStart);
    const last = startOfDay(rangeEnd);
    while (cursor <= last) {
      result.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return result;
  }, [rangeStart, rangeEnd]);

  const rangeLabel = useMemo(() => {
    if (view === "Day") return formatFullDate(anchorDate);
    if (view === "Month") return formatMonthYear(anchorDate);
    return `${formatMonthDay(rangeStart)} – ${formatMonthDay(rangeEnd)}, ${rangeEnd.getFullYear()}`;
  }, [view, anchorDate, rangeStart, rangeEnd]);

  // ---- Data ----
  const { data: appointmentsResponse, isLoading: appointmentsLoading } = useQuery({
    queryKey: ["calendar-appointments", view, rangeStart.toISOString(), rangeEnd.toISOString()],
    queryFn: () =>
      appointmentsApi
        .getAll({
          startDate: rangeStart.toISOString(),
          endDate: rangeEnd.toISOString(),
          limit: 200,
        })
        .then((response) => response.data),
  });

  const { data: blocksResponse } = useQuery({
    queryKey: ["calendar-blocks", rangeStart.toISOString(), rangeEnd.toISOString()],
    queryFn: () =>
      calendarApi
        .getEvents({ startDate: rangeStart.toISOString(), endDate: rangeEnd.toISOString() })
        .then((response) => response.data),
  });

  const { data: employeesResponse } = useQuery({
    queryKey: ["calendar-team"],
    queryFn: () => employeesApi.getAll({ limit: 50 }).then((response) => response.data),
  });

  const syncMutation = useMutation({
    mutationFn: () => calendarApi.sync(),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["calendar-appointments"] });
      const result = response.data?.data;
      toast.success(
        result
          ? `Sync complete: ${result.eventsAdded} added, ${result.eventsUpdated} updated`
          : "Calendar synced successfully"
      );
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message || "Failed to sync calendar"),
  });

  const deleteBlockMutation = useMutation({
    mutationFn: (id: string) => calendarApi.deleteEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-blocks"] });
      toast.success("Removed from calendar");
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message || "Failed to remove"),
  });

  const appointments: any[] = asArray(
    appointmentsResponse?.data?.appointments ||
      appointmentsResponse?.data?.data?.appointments ||
      appointmentsResponse?.data,
  );
  const employees: any[] = asArray(employeesResponse?.data);
  const blocks: any[] = useMemo(
    () =>
      calendarScope === "my"
        ? asArray(blocksResponse?.data).filter((event: any) => !event.related_appointment_id)
        : [],
    [blocksResponse?.data, calendarScope]
  );

  const teamMembers = useMemo(() => {
    if (!employees.length) {
      return [{ id: "me", ids: ["me"], name: "Me", color: TEAM_COLOR_POOL[0], imageUrl: "" }];
    }
    return employees.map((employee, index) => {
      const employeeId = readId(employee);
      const userId = readId(employee.userId);
      const ids = Array.from(new Set([employeeId, userId].filter(Boolean)));
      return {
        id: userId || employeeId || String(index),
        ids,
        name: employee.userId?.name || employee.name || "Employee",
        imageUrl: employee.userId?.profileImage?.url || employee.profileImage?.url || "",
        color: TEAM_COLOR_POOL[index % TEAM_COLOR_POOL.length],
      };
    });
  }, [employees]);

  const visibleTeamMembers = useMemo(() => {
    const selected = teamMembers.filter((member) => selectedEmployees.has(member.id));
    const starter = teamMembers.slice(0, 6);
    const merged = [...selected, ...starter];
    return merged.filter(
      (member, index) => merged.findIndex((candidate) => candidate.id === member.id) === index,
    );
  }, [selectedEmployees, teamMembers]);

  const employeeSearchResults = useMemo(() => {
    const term = employeeSearch.trim().toLowerCase();
    const source = term
      ? teamMembers.filter((member) => member.name.toLowerCase().includes(term))
      : teamMembers;
    return source.slice(0, 8);
  }, [employeeSearch, teamMembers]);

  const memberColorMap = useMemo(() => {
    const map = new Map<string, string>();
    teamMembers.forEach((member) => {
      member.ids.forEach((id) => map.set(id, member.color));
    });
    return map;
  }, [teamMembers]);

  const isMyAppointment = useCallback(
    (appointment: any) => {
      const employeeIds = appointmentEmployeeIds(appointment);

      if (currentUserId) {
        if (employeeIds.has(currentUserId)) return true;
      }

      return !hasTeamAppointmentFields(appointment);
    },
    [currentUserId],
  );

  const scopedAppointments = useMemo(() => {
    if (calendarScope === "my") {
      return appointments.filter(isMyAppointment);
    }
    return appointments.filter((appointment) => hasTeamAppointmentFields(appointment));
  }, [appointments, calendarScope, isMyAppointment]);

  const serviceOptions = useMemo(() => {
    const set = new Set<string>();
    scopedAppointments.forEach((appointment) => {
      const name =
        typeof appointment.service === "string" ? appointment.service : appointment.service?.name;
      if (name) set.add(name);
    });
    return Array.from(set).sort();
  }, [scopedAppointments]);

  const filteredAppointments = useMemo(() => {
    return scopedAppointments.filter((appointment) => {
      if (calendarScope === "team" && selectedEmployees.size > 0) {
        const employeeIds = appointmentEmployeeIds(appointment);
        const selectedMemberIds = teamMembers
          .filter((member) => selectedEmployees.has(member.id))
          .flatMap((member) => member.ids);
        const matchesEmployee = selectedMemberIds.some((id) => employeeIds.has(id));
        if (!matchesEmployee) return false;
      }
      if (selectedStatuses.size > 0 && !selectedStatuses.has(appointment.status)) {
        return false;
      }
      if (selectedServices.size > 0) {
        const name =
          typeof appointment.service === "string" ? appointment.service : appointment.service?.name;
        if (!selectedServices.has(name || "")) return false;
      }
      return true;
    });
  }, [
    calendarScope,
    scopedAppointments,
    selectedEmployees,
    selectedStatuses,
    selectedServices,
    teamMembers,
  ]);

  const dayBuckets = useMemo(() => {
    return days.map((day) => {
      const dayAppointments = filteredAppointments.filter((appointment) => {
        const dateValue = new Date(appointment.appointmentDate);
        return isSameDay(dateValue, day);
      });

      const dayBlocks = blocks.filter((block) => isSameDay(new Date(block.start_time), day));

      return {
        day,
        appointments: dayAppointments,
        blocks: dayBlocks,
        capacity: Math.min(120, Math.round((dayAppointments.length / 8) * 100)),
      };
    });
  }, [days, filteredAppointments, blocks]);

  const selectedDay = useMemo(() => {
    if (selectedDate) {
      const match = dayBuckets.find((bucket) => isSameDay(bucket.day, selectedDate));
      if (match) return match;
    }
    const todayBucket = dayBuckets.find((bucket) => isSameDay(bucket.day, new Date()));
    return todayBucket || dayBuckets[0] || null;
  }, [dayBuckets, selectedDate]);

  const activeFilterCount =
    selectedStatuses.size +
    selectedServices.size +
    (calendarScope === "team" ? selectedEmployees.size : 0);

  const changeCalendarScope = (scope: "team" | "my") => {
    setCalendarScope(scope);
    setSelectedDate(null);
    setSelectedStatuses(new Set());
    setSelectedServices(new Set());
    if (scope === "my") {
      setSelectedEmployees(new Set());
    }
  };

  const navigate = (delta: number) => {
    setAnchorDate((current) => {
      const next = new Date(current);
      if (view === "Day") {
        next.setDate(next.getDate() + delta);
      } else if (view === "Month") {
        next.setDate(1);
        next.setMonth(next.getMonth() + delta);
      } else if (view === "Agenda") {
        next.setDate(next.getDate() + delta * 14);
      } else {
        next.setDate(next.getDate() + delta * 7);
      }
      return next;
    });
  };

  const goToday = () => {
    setAnchorDate(new Date());
    setSelectedDate(null);
  };

  const changeView = (next: (typeof VIEWS)[number]) => {
    if (selectedDate) setAnchorDate(new Date(selectedDate));
    setView(next);
  };

  const toggleMember = (id: string) => {
    setSelectedEmployees((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectEmployeeCalendar = (id: string) => {
    setCalendarScope("team");
    setSelectedEmployees(new Set([id]));
    setEmployeeSearch("");
    setShowEmployeeSearch(false);
  };

  const toggleStatus = (value: string) => {
    setSelectedStatuses((current) => {
      const next = new Set(current);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const toggleService = (value: string) => {
    setSelectedServices((current) => {
      const next = new Set(current);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const clearFilters = () => {
    setSelectedEmployees(new Set());
    setSelectedStatuses(new Set());
    setSelectedServices(new Set());
  };

  const employeeColor = (appointment: any) => {
    if (appointment.color) return appointment.color;
    const match = Array.from(appointmentEmployeeIds(appointment)).find((id) =>
      memberColorMap.has(id),
    );
    return (match && memberColorMap.get(match)) || TEAM_COLOR_POOL[0];
  };

  const viewFullDay = () => {
    if (!selectedDay) return;
    setAnchorDate(new Date(selectedDay.day));
    setSelectedDate(new Date(selectedDay.day));
    setView("Day");
  };

  const handleDeleteBlock = (block: any) => {
    if (confirm(`Remove "${block.title}" from your calendar?`)) {
      deleteBlockMutation.mutate(block._id);
    }
  };

  const gridTemplateColumns = `60px repeat(${days.length}, minmax(0, 1fr))`;

  const renderGridView = () => (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden">
      <CardContent className="flex min-h-0 flex-1 flex-col p-0">
        <div className="min-h-0 flex-1 overflow-auto">
          <div style={{ minWidth: days.length > 1 ? 860 : undefined }}>
            {/* Day Header */}
            <div className="grid border-b border-[#1e2d40]" style={{ gridTemplateColumns }}>
              <div className="px-2 py-3 text-[10px] text-gray-500">GMT+1</div>
              {dayBuckets.map((bucket, index) => {
                const isToday = isSameDay(bucket.day, new Date());
                return (
                  <button
                    key={index}
                    onClick={() => setSelectedDate(bucket.day)}
                    className="border-l border-[#1e2d40] px-2 py-2 text-center transition-colors hover:bg-[#0f1d30]"
                  >
                    <p className="text-[11px] text-gray-400">
                      {formatWeekday(bucket.day)} {bucket.day.getDate()}
                    </p>
                    {bucket.capacity > 70 ? (
                      <p
                        className={`mt-0.5 text-[10px] ${
                          bucket.capacity >= 100
                            ? "text-red-400"
                            : bucket.capacity >= 90
                            ? "text-amber-400"
                            : "text-emerald-400"
                        }`}
                      >
                        ◆ {bucket.capacity}%
                      </p>
                    ) : null}
                    {isToday ? (
                      <span className="mt-0.5 inline-block h-1 w-1 rounded-full bg-blue-400" />
                    ) : null}
                  </button>
                );
              })}
            </div>

            {/* All-day blocks */}
            {dayBuckets.some((bucket) => bucket.blocks.some((block: any) => block.allDay)) ? (
              <div className="grid border-b border-[#1e2d40]" style={{ gridTemplateColumns }}>
                <div className="px-2 py-1 text-[10px] text-gray-500">All day</div>
                {dayBuckets.map((bucket, index) => (
                  <div key={index} className="space-y-1 border-l border-[#1e2d40] px-1 py-1">
                    {bucket.blocks
                      .filter((block: any) => block.allDay)
                      .map((block: any) => {
                        const color = block.color || "#6b7280";
                        const Icon = getBlockIcon(block);
                        return (
                          <div
                            key={block._id}
                            onClick={() => handleDeleteBlock(block)}
                            title="Click to remove"
                            className="flex cursor-pointer items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-[9px] transition-opacity hover:opacity-80"
                            style={{ backgroundColor: `${color}25`, color }}
                          >
                            <Icon className="h-2.5 w-2.5 shrink-0" />
                            <span className="truncate">{block.title}</span>
                          </div>
                        );
                      })}
                  </div>
                ))}
              </div>
            ) : null}

            {/* Time rows */}
            {appointmentsLoading ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 8 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              HOURS.map((hour) => (
                <div
                  key={hour}
                  className="grid min-h-[68px] border-b border-[#1e2d40]"
                  style={{ gridTemplateColumns }}
                >
                  <div className="px-2 py-1 text-[10px] text-gray-500">{formatHourLabel(hour)}</div>
                  {dayBuckets.map((bucket, dayIndex) => {
                    const slotAppointments = bucket.appointments.filter((appointment: any) => {
                      const startHour = parseInt((appointment.startTime || "00:00").slice(0, 2), 10);
                      return startHour === hour;
                    });

                    const slotBlocks = bucket.blocks.filter((block: any) => {
                      if (block.allDay) return false;
                      return new Date(block.start_time).getHours() === hour;
                    });

                    return (
                      <div
                        key={dayIndex}
                        className="group relative border-l border-[#1e2d40] px-1 py-1"
                        onClick={() => setSelectedDate(bucket.day)}
                      >
                        {slotAppointments.length === 0 && slotBlocks.length === 0 ? (
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedDate(bucket.day);
                              openScopedAppointmentDialog(bucket.day);
                            }}
                            className="absolute right-1 top-1 hidden h-5 w-5 items-center justify-center rounded-md bg-[#1e2d40] text-gray-400 group-hover:flex hover:text-blue-400"
                            aria-label="Add appointment"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        ) : null}

                        {slotBlocks.map((block: any) => {
                          const color = block.color || "#6b7280";
                          const Icon = getBlockIcon(block);
                          return (
                            <div
                              key={block._id}
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDeleteBlock(block);
                              }}
                              title="Click to remove"
                              className="mb-1 cursor-pointer rounded-md border border-dashed px-1.5 py-1 text-left transition-opacity hover:opacity-80"
                              style={{
                                backgroundColor: `${color}15`,
                                borderColor: `${color}66`,
                              }}
                            >
                              <p className="flex items-center gap-1 truncate text-[9px] font-medium" style={{ color }}>
                                <Icon className="h-2.5 w-2.5 shrink-0" />
                                {formatBlockRange(block)}
                              </p>
                              <p className="truncate text-[10px] text-gray-300">{block.title}</p>
                            </div>
                          );
                        })}

                        {slotAppointments.map((appointment: any) => {
                          const color = employeeColor(appointment);
                          const appointmentName = getAppointmentName(appointment);
                          const appointmentMeta = getAppointmentMeta(appointment);
                          return (
                            <div
                              key={appointment._id}
                              onClick={(event) => {
                                event.stopPropagation();
                                setDetailsId(String(appointment._id));
                              }}
                              className="mb-1 cursor-pointer rounded-md border-l-2 px-1.5 py-1 text-left transition-opacity hover:opacity-90"
                              style={{
                                backgroundColor: `${color}25`,
                                borderColor: color,
                              }}
                            >
                              <p className="truncate text-[9px] font-medium" style={{ color }}>
                                {formatRange(appointment.startTime, appointment.endTime)}
                              </p>
                              <p className="flex items-center gap-1 truncate text-[10px] text-gray-100">
                                {appointmentName}
                                <User className="h-2.5 w-2.5 text-gray-500" />
                              </p>
                              <p className="truncate text-[9px] text-gray-400">{appointmentMeta}</p>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex shrink-0 flex-wrap items-center gap-3 border-t border-[#1e2d40] px-4 py-2">
          {calendarScope === "team" ? (
            teamMembers.map((member) => (
              <div key={member.id} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: member.color }} />
                <span className="text-[10px] text-gray-400">{member.name}</span>
              </div>
            ))
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="text-[10px] text-gray-400">My appointments</span>
            </div>
          )}
          <button
            onClick={() => (calendarScope === "team" ? router.push("/employees") : openPersonalAppointmentDialog())}
            className="ml-auto flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-300"
          >
            {calendarScope === "team" ? (
              <>
                <Settings2 className="h-3 w-3" />
                Manage calendars
              </>
            ) : (
              <>
                <Plus className="h-3 w-3" />
                Add personal appointment
              </>
            )}
          </button>
        </div>
      </CardContent>
    </Card>
  );

  const renderMonthView = () => (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden">
      <CardContent className="flex min-h-0 flex-1 flex-col p-0">
        <div className="grid shrink-0 grid-cols-7 border-b border-[#1e2d40]">
          {DAY_LABELS.map((label) => (
            <div key={label} className="px-2 py-2 text-center text-[11px] text-gray-400">
              {label}
            </div>
          ))}
        </div>
        {appointmentsLoading ? (
          <div className="grid min-h-0 flex-1 grid-cols-7 gap-px overflow-y-auto p-2">
            {Array.from({ length: 35 }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-7 overflow-y-auto">
            {dayBuckets.map((bucket, index) => {
              const inMonth = bucket.day.getMonth() === anchorDate.getMonth();
              const isToday = isSameDay(bucket.day, new Date());
              const isSelected = selectedDate && isSameDay(bucket.day, selectedDate);
              const visible = bucket.appointments
                .slice()
                .sort((a: any, b: any) => (a.startTime || "").localeCompare(b.startTime || ""))
                .slice(0, 3);
              const extra = bucket.appointments.length - visible.length;
              const visibleBlocks = bucket.blocks.slice(0, 2);
              const extraBlocks = bucket.blocks.length - visibleBlocks.length;
              return (
                <button
                  key={index}
                  onClick={() => setSelectedDate(bucket.day)}
                  className={`min-h-[96px] border-b border-l border-[#1e2d40] p-1.5 text-left transition-colors hover:bg-[#0f1d30] [&:nth-child(7n+1)]:border-l-0 ${
                    inMonth ? "" : "opacity-40"
                  } ${isSelected ? "bg-[#11233a]" : ""}`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                        isToday ? "bg-blue-600 text-white" : "text-gray-300"
                      }`}
                    >
                      {bucket.day.getDate()}
                    </span>
                    {bucket.capacity > 70 ? (
                      <span
                        className={`text-[9px] ${
                          bucket.capacity >= 100
                            ? "text-red-400"
                            : bucket.capacity >= 90
                            ? "text-amber-400"
                            : "text-emerald-400"
                        }`}
                      >
                        ◆ {bucket.capacity}%
                      </span>
                    ) : null}
                  </div>
                  <div className="space-y-0.5">
                    {visible.map((appointment: any) => {
                      const color = employeeColor(appointment);
                      const appointmentName = getAppointmentName(appointment);
                      return (
                        <div
                          key={appointment._id}
                          className="truncate rounded px-1 py-0.5 text-[9px]"
                          style={{ backgroundColor: `${color}25`, color }}
                        >
                          {(appointment.startTime || "").slice(0, 5)} {appointmentName}
                        </div>
                      );
                    })}
                    {extra > 0 ? <p className="px-1 text-[9px] text-gray-500">+{extra} more</p> : null}
                    {visibleBlocks.map((block: any) => {
                      const color = block.color || "#6b7280";
                      const Icon = getBlockIcon(block);
                      return (
                        <div
                          key={block._id}
                          className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-[9px]"
                          style={{ backgroundColor: `${color}20`, color }}
                        >
                          <Icon className="h-2.5 w-2.5 shrink-0" />
                          <span className="truncate">{block.title}</span>
                        </div>
                      );
                    })}
                    {extraBlocks > 0 ? (
                      <p className="px-1 text-[9px] text-gray-500">+{extraBlocks} more blocked</p>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderAgendaView = () => (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden">
      <CardContent className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {appointmentsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </div>
        ) : dayBuckets.every((bucket) => bucket.appointments.length === 0 && bucket.blocks.length === 0) ? (
          <p className="py-10 text-center text-sm text-gray-500">
            No appointments scheduled in this period.
          </p>
        ) : (
          dayBuckets
            .filter((bucket) => bucket.appointments.length > 0 || bucket.blocks.length > 0)
            .map((bucket) => (
              <div key={bucket.day.toISOString()}>
                <div className="mb-2 flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-100">
                    {bucket.day.toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  {isSameDay(bucket.day, new Date()) ? (
                    <span className="rounded-full bg-blue-600/15 px-2 py-0.5 text-[10px] text-blue-300">
                      Today
                    </span>
                  ) : null}
                  <span className="text-[11px] text-gray-500">
                    {bucket.appointments.length} appointment{bucket.appointments.length === 1 ? "" : "s"}
                    {bucket.blocks.length > 0
                      ? ` · ${bucket.blocks.length} blocked`
                      : ""}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {bucket.appointments
                    .slice()
                    .sort((a: any, b: any) => (a.startTime || "").localeCompare(b.startTime || ""))
                    .map((appointment: any) => {
                      const color = employeeColor(appointment);
                      const appointmentName = getAppointmentName(appointment);
                      const appointmentMeta = getAppointmentMeta(appointment);
                      const statusInfo = STATUS_LABELS[appointment.status] || {
                        label: appointment.status || "Upcoming",
                        color: "text-gray-400",
                      };
                      const employeeImg = appointment.employee?.profileImage?.url || "";
                      const employeeName = appointment.employee?.name || "Employee";
                      return (
                        <div
                          key={appointment._id}
                          onClick={() => setDetailsId(String(appointment._id))}
                          className="flex cursor-pointer items-center gap-3 rounded-lg border-l-2 bg-[#0d1a2d] px-3 py-2 transition-colors hover:bg-[#142235]"
                          style={{ borderColor: color }}
                        >
                          <span className="w-20 shrink-0 text-xs text-gray-400">
                            {formatRange(appointment.startTime, appointment.endTime)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-gray-100">{appointmentName}</p>
                            <p className="truncate text-xs text-gray-500">{appointmentMeta}</p>
                          </div>
                          <Avatar className="h-6 w-6 shrink-0">
                            {employeeImg ? (
                              <AvatarImage src={employeeImg} alt={employeeName} />
                            ) : (
                              <AvatarFallback className="text-[9px]">
                                {getInitials(employeeName)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <span className={`shrink-0 text-[10px] font-medium ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                      );
                    })}
                  {bucket.blocks.map((block: any) => {
                    const color = block.color || "#6b7280";
                    const Icon = getBlockIcon(block);
                    return (
                      <div
                        key={block._id}
                        onClick={() => handleDeleteBlock(block)}
                        title="Click to remove"
                        className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed px-3 py-2 transition-colors hover:opacity-80"
                        style={{ borderColor: `${color}66`, backgroundColor: `${color}10` }}
                      >
                        <span className="w-20 shrink-0 text-xs text-gray-400">
                          {formatBlockRange(block)}
                        </span>
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <Icon className="h-3.5 w-3.5 shrink-0" style={{ color }} />
                          <p className="truncate text-sm text-gray-200">{block.title}</p>
                        </div>
                        <span className="shrink-0 text-[10px] text-gray-500">Remove</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
        )}
      </CardContent>
    </Card>
  );

  const updateCalendarSetting = (key: keyof typeof calendarSettings, value: string | boolean) => {
    setCalendarSettings((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="dashboard-page flex flex-col">
      <Header
        title="Calendar"
        subtitle="Manage appointments across your team. Stay organized, save time."
        action={
          <div className="flex items-center gap-1 rounded-lg bg-blue-600 pr-1">
            <Button
              size="sm"
              className="h-8 rounded-l-lg rounded-r-none bg-blue-600 text-xs hover:bg-blue-700"
              onClick={() => openScopedAppointmentDialog()}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Create Appointment
            </Button>
            <button
              className="rounded-md p-1 text-white hover:bg-blue-700"
              onClick={() => openScopedAppointmentDialog()}
              aria-label="More"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        }
      />

      <div className="dashboard-content flex flex-col gap-3 2xl:gap-4">
        {/* Toolbar */}
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <div className="flex gap-1 rounded-lg bg-[#0d1a2d] p-1">
            {VIEWS.map((option) => (
              <button
                key={option}
                onClick={() => changeView(option)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  view === option ? "bg-blue-600 text-white" : "text-gray-400 hover:text-gray-200"
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          <button
            onClick={() => navigate(-1)}
            className="rounded-md p-1 text-gray-400 hover:bg-[#1e2d40] hover:text-gray-200"
            aria-label={`Previous ${view.toLowerCase()}`}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium text-gray-200">{rangeLabel}</span>
          <button
            onClick={() => navigate(1)}
            className="rounded-md p-1 text-gray-400 hover:bg-[#1e2d40] hover:text-gray-200"
            aria-label={`Next ${view.toLowerCase()}`}
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={goToday}>
            Today
          </Button>

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant={showFilters || activeFilterCount > 0 ? "secondary" : "ghost"}
              size="sm"
              className="h-8 text-xs"
              onClick={() => setShowFilters((value) => !value)}
            >
              <Filter className="mr-1 h-3.5 w-3.5" />
              Filters
              {activeFilterCount > 0 ? (
                <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[9px] text-white">
                  {activeFilterCount}
                </span>
              ) : null}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Calendar settings"
              onClick={() => router.push("/settings")}
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Filters panel */}
        {showFilters ? (
          <div className="flex shrink-0 flex-wrap items-center gap-4 rounded-2xl border border-[#1e2d40] bg-[#0d1a2d] p-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[11px] text-gray-500">Status</span>
              {STATUS_FILTER_OPTIONS.map((option) => {
                const isActive = selectedStatuses.has(option.value);
                return (
                  <button
                    key={option.value}
                    onClick={() => toggleStatus(option.value)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                      isActive
                        ? "border-blue-500 bg-blue-600/15 text-blue-300"
                        : "border-[#1e2d40] text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            {serviceOptions.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[11px] text-gray-500">Service</span>
                {serviceOptions.map((name) => {
                  const isActive = selectedServices.has(name);
                  return (
                    <button
                      key={name}
                      onClick={() => toggleService(name)}
                      className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                        isActive
                          ? "border-blue-500 bg-blue-600/15 text-blue-300"
                          : "border-[#1e2d40] text-gray-400 hover:text-gray-200"
                      }`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {activeFilterCount > 0 ? (
              <button
                onClick={clearFilters}
                className="ml-auto flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-300"
              >
                <X className="h-3 w-3" />
                Clear filters
              </button>
            ) : null}
          </div>
        ) : null}

        {/* Main grid */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden xl:grid-cols-4 2xl:gap-4">
          <div className="flex min-h-0 flex-col gap-3 overflow-hidden xl:col-span-3 2xl:gap-4">
            {/* Calendar scope */}
            <div className="flex shrink-0 flex-wrap items-center gap-2 rounded-2xl border border-[#1e2d40] bg-[#0d1a2d] p-2">
              <div className="flex rounded-xl bg-[#071321] p-1">
                {[
                  { value: "my" as const, label: "My Calendar" },
                  { value: "team" as const, label: "Team Calendars" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => changeCalendarScope(option.value)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      calendarScope === option.value
                        ? "bg-blue-600 text-white shadow-[0_0_14px_rgba(37,99,235,0.35)]"
                        : "text-gray-400 hover:text-gray-100"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {calendarScope === "team" ? (
                <>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1e2d40] text-[10px] text-gray-500">
                    {teamMembers.length}
                  </span>
                  {visibleTeamMembers.map((member) => {
                    const isActive =
                      selectedEmployees.size === 0 || selectedEmployees.has(member.id);
                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => toggleMember(member.id)}
                        className={`flex items-center gap-2 rounded-full border px-2 py-1 transition-colors ${
                          isActive
                            ? "border-[#2a3547] bg-[#1e2d40]"
                            : "border-[#1e2d40] bg-transparent opacity-50"
                        }`}
                        style={isActive ? { borderColor: `${member.color}55` } : undefined}
                      >
                        <Avatar className="h-5 w-5">
                          {member.imageUrl ? (
                            <AvatarImage src={member.imageUrl} alt={member.name} />
                          ) : (
                            <AvatarFallback
                              className="text-[9px]"
                              style={{
                                backgroundColor: `${member.color}33`,
                                color: member.color,
                              }}
                            >
                              {getInitials(member.name)}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <span className="text-xs text-gray-200">{member.name}</span>
                      </button>
                    );
                  })}
                  <div ref={employeeSearchRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setShowEmployeeSearch((value) => !value)}
                      className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
                        showEmployeeSearch
                          ? "bg-blue-600 text-white"
                          : "bg-[#1e2d40] text-gray-400 hover:text-white"
                      }`}
                      aria-label="Search employee calendar"
                      title="Search employee calendar"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>

                    {showEmployeeSearch ? (
                      <div className="absolute left-0 top-9 z-30 w-72 rounded-xl border border-[#1e2d40] bg-[#071321] p-2 shadow-2xl shadow-black/40">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
                          <Input
                            autoFocus
                            value={employeeSearch}
                            onChange={(event) => setEmployeeSearch(event.target.value)}
                            placeholder="Search employee..."
                            className="h-9 border-[#1e2d40] bg-[#0d1a2d] pl-8 text-xs"
                          />
                        </div>

                        <div className="mt-2 max-h-64 overflow-y-auto pr-1 scrollbar-blue">
                          {employeeSearchResults.length > 0 ? (
                            employeeSearchResults.map((member) => {
                              const isSelected = selectedEmployees.has(member.id);
                              return (
                                <button
                                  key={member.id}
                                  type="button"
                                  onClick={() => selectEmployeeCalendar(member.id)}
                                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors ${
                                    isSelected ? "bg-blue-600/20" : "hover:bg-[#0d1a2d]"
                                  }`}
                                >
                                  <Avatar className="h-7 w-7">
                                    {member.imageUrl ? (
                                      <AvatarImage src={member.imageUrl} alt={member.name} />
                                    ) : (
                                      <AvatarFallback
                                        className="text-[10px]"
                                        style={{
                                          backgroundColor: `${member.color}33`,
                                          color: member.color,
                                        }}
                                      >
                                        {getInitials(member.name)}
                                      </AvatarFallback>
                                    )}
                                  </Avatar>
                                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-gray-200">
                                    {member.name}
                                  </span>
                                  {isSelected ? (
                                    <span className="rounded-full bg-blue-600/25 px-2 py-0.5 text-[10px] text-blue-200">
                                      Selected
                                    </span>
                                  ) : null}
                                </button>
                              );
                            })
                          ) : (
                            <div className="px-2 py-5 text-center text-xs text-gray-500">
                              No employee found.
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-600/10 px-3 py-1.5">
                    <User className="h-3.5 w-3.5 text-blue-300" />
                    <span className="text-xs font-medium text-gray-100">Personal schedule</span>
                    <span className="rounded-full bg-[#1e2d40] px-1.5 py-0.5 text-[10px] text-gray-400">
                      {scopedAppointments.length}
                    </span>
                  </div>
                  <button
                    onClick={() => openPersonalAppointmentDialog(selectedDate)}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600/20 text-blue-300 hover:bg-blue-600 hover:text-white"
                    aria-label="Create personal appointment"
                    title="Create personal appointment"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>

            {/* Calendar grid / month / agenda */}
            <div className="min-h-0 flex-1 overflow-hidden">
              {view === "Month"
                ? renderMonthView()
                : view === "Agenda"
                ? renderAgendaView()
                : renderGridView()}
            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="flex min-h-0 flex-col gap-3 overflow-hidden 2xl:gap-4">
            {/* Selected day panel */}
            {selectedDay ? (
              <Card className="flex min-h-0 flex-1 flex-col">
                <CardContent className="flex min-h-0 flex-1 flex-col pt-4">
                  <div className="flex shrink-0 items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-100">
                        {selectedDay.day.toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            selectedDay.capacity >= 100
                              ? "bg-red-400"
                              : selectedDay.capacity >= 80
                              ? "bg-amber-400"
                              : "bg-emerald-400"
                          }`}
                        />
                        <span
                          className={`text-[11px] font-medium ${
                            selectedDay.capacity >= 100
                              ? "text-red-400"
                              : selectedDay.capacity >= 80
                              ? "text-amber-400"
                              : "text-emerald-400"
                          }`}
                        >
                          {selectedDay.capacity >= 100
                            ? "Overbooked"
                            : selectedDay.capacity >= 80
                            ? "Almost Full"
                            : "Available"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <div className="mb-1 flex justify-between text-[10px]">
                      <span className="text-gray-400">{selectedDay.appointments.length} Appointments</span>
                      <span
                        className={
                          selectedDay.capacity >= 100
                            ? "text-red-400"
                            : selectedDay.capacity >= 80
                            ? "text-amber-400"
                            : "text-emerald-400"
                        }
                      >
                        {selectedDay.capacity}% of capacity
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#1e2d40]">
                      <div
                        className={`h-full transition-all ${
                          selectedDay.capacity >= 100
                            ? "bg-red-500"
                            : selectedDay.capacity >= 80
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${Math.min(selectedDay.capacity, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                    {selectedDay.appointments.length === 0 ? (
                      <p className="text-xs text-gray-500">No appointments scheduled.</p>
                    ) : (
                      selectedDay.appointments
                        .slice()
                        .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""))
                        .slice(0, 6)
                        .map((appointment) => {
                          const appointmentName = getAppointmentName(appointment);
                          const appointmentMeta = getAppointmentMeta(appointment);
                          const statusInfo = STATUS_LABELS[appointment.status] || {
                            label: appointment.status || "Upcoming",
                            color: "text-gray-400",
                          };
                          const employeeImg = appointment.employee?.profileImage?.url || "";
                          const employeeName = appointment.employee?.name || "Employee";
                          return (
                            <div
                              key={appointment._id}
                              onClick={() => setDetailsId(String(appointment._id))}
                              className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 hover:bg-[#1e2d40]"
                            >
                              <span className="w-10 shrink-0 text-[10px] text-gray-500">
                                {(appointment.startTime || "").slice(0, 5)}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs text-gray-100">{appointmentName}</p>
                                <p className="truncate text-[10px] text-gray-500">{appointmentMeta}</p>
                              </div>
                              <Avatar className="h-5 w-5 shrink-0">
                                {employeeImg ? (
                                  <AvatarImage src={employeeImg} alt={employeeName} />
                                ) : (
                                  <AvatarFallback className="text-[8px]">
                                    {getInitials(employeeName)}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                              <span
                                className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${statusInfo.color}`}
                              >
                                {statusInfo.label}
                              </span>
                            </div>
                          );
                        })
                    )}
                  </div>

                  <button
                    onClick={viewFullDay}
                    className="mt-3 flex w-full shrink-0 items-center justify-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                  >
                    View full day →
                  </button>
                </CardContent>
              </Card>
            ) : null}

            {/* Quick Actions */}
            <Card className="shrink-0">
              <CardContent className="pt-4">
                <p className="mb-3 text-xs font-medium text-gray-300">Quick Actions</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      label: "Add Appointment",
                      icon: Plus,
                      action: openScopedAppointmentDialog,
                    },
                    {
                      label: "Add Block",
                      icon: StopCircle,
                      action: () => setBlockDialogType("block"),
                    },
                    {
                      label: "Add Break",
                      icon: Coffee,
                      action: () => setBlockDialogType("break"),
                    },
                    {
                      label: "Appointment Types",
                      icon: Settings2,
                      action: () => setShowAppointmentTypesDialog(true),
                    },
                    {
                      label: "Calendar Settings",
                      icon: Settings,
                      action: () => setShowCalendarSettingsDialog(true),
                    },
                  ].map((action) => (
                    <button
                      key={action.label}
                      onClick={() =>
                        action.action ? action.action() : toast.info(`${action.label} coming soon`)
                      }
                      className="flex flex-col items-center gap-1.5 rounded-lg bg-[#1e2d40] p-3 transition-colors hover:bg-[#2a3547]"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600/15">
                        <action.icon className="h-3.5 w-3.5 text-blue-400" />
                      </div>
                      <span className="text-center text-[10px] leading-tight text-gray-300">
                        {action.label}
                      </span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Calendar Sync */}
            <Card className="shrink-0">
              <CardContent className="pt-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-medium text-gray-300">Calendar Sync</p>
                  <button
                    onClick={() => setShowSync((value) => !value)}
                    className="text-gray-400 hover:text-gray-200"
                    aria-label="Toggle sync details"
                  >
                    {showSync ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                </div>
                {showSync ? (
                  <>
                    <div className="mb-3 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      <span className="text-[11px] text-emerald-400">Connected</span>
                    </div>
                    <div className="mb-3 flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1e2d40]">
                        <CalendarDays className="h-3.5 w-3.5 text-blue-400" />
                      </div>
                      <span className="text-xs text-gray-200">Google Calendar</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-full text-xs"
                      onClick={() => setShowCalendarSettingsDialog(true)}
                    >
                      <RefreshCw className="mr-1 h-3 w-3" />
                      Sync Settings
                    </Button>
                  </>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={showAppointmentTypesDialog} onOpenChange={setShowAppointmentTypesDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/15 text-blue-400">
                <Settings2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Appointment Types</DialogTitle>
                <p className="mt-1 text-xs text-gray-500">
                  Define service, customer, and team calendar types for this business.
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-[minmax(0,1.2fr)_90px_90px_100px] gap-2 px-2 text-[10px] font-medium uppercase tracking-wide text-gray-500">
              <span>Type</span>
              <span>Duration</span>
              <span>Visible To</span>
              <span>Color</span>
            </div>
            <div className="space-y-2">
              {appointmentTypes.map((type) => (
                <div key={type.name} className="grid grid-cols-[minmax(0,1.2fr)_90px_90px_100px] items-center gap-2 rounded-lg border border-[#1e2d40] bg-[#0d1a2d] p-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-100">{type.name}</p>
                    <p className="truncate text-[11px] text-gray-500">Used for booking forms, filters, and color rules.</p>
                  </div>
                  <span className="text-xs text-gray-300">{type.duration}</span>
                  <span className="text-xs text-gray-300">{type.visibility}</span>
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full border border-white/20" style={{ backgroundColor: type.color }} />
                    <span className="text-[10px] text-gray-500">{type.color}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid gap-3 rounded-lg border border-dashed border-[#24405f] bg-[#071321] p-3 md:grid-cols-[minmax(0,1fr)_110px_110px_84px]">
              <Input value={newAppointmentType} onChange={(event) => setNewAppointmentType(event.target.value)} placeholder="New type name" />
              <select value={newAppointmentTypeDuration} onChange={(event) => setNewAppointmentTypeDuration(event.target.value)} className="h-10 rounded-lg border border-[#2a3547] bg-[#0d1526] px-3 text-xs text-gray-200 outline-none focus:ring-2 focus:ring-blue-500">
                <option>30 min</option>
                <option>45 min</option>
                <option>60 min</option>
                <option>90 min</option>
                <option>All day</option>
              </select>
              <select value={newAppointmentTypeVisibility} onChange={(event) => setNewAppointmentTypeVisibility(event.target.value)} className="h-10 rounded-lg border border-[#2a3547] bg-[#0d1526] px-3 text-xs text-gray-200 outline-none focus:ring-2 focus:ring-blue-500">
                <option>Customer</option>
                <option>Team</option>
                <option>Owner</option>
              </select>
              <Button
                onClick={() => {
                  if (!newAppointmentType.trim()) {
                    toast.error("Type name is required");
                    return;
                  }
                  setAppointmentTypes((current) => [
                    ...current,
                    {
                      name: newAppointmentType.trim(),
                      duration: newAppointmentTypeDuration,
                      visibility: newAppointmentTypeVisibility,
                      color: newAppointmentTypeColor,
                    },
                  ]);
                  setNewAppointmentType("");
                  toast.success("Appointment type added");
                }}
                className="h-10 text-xs"
              >
                Add
              </Button>
            </div>
            <div className="flex items-center justify-between border-t border-[#1e2d40] pt-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">New type color</span>
                <input type="color" value={newAppointmentTypeColor} onChange={(event) => setNewAppointmentTypeColor(event.target.value)} className="h-8 w-12 rounded border border-[#2a3547] bg-[#0d1526]" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowAppointmentTypesDialog(false)}>Cancel</Button>
                <Button
                  onClick={() => {
                    window.localStorage.setItem("business-owner-calendar-appointment-types", JSON.stringify(appointmentTypes));
                    toast.success("Appointment type settings saved");
                    setShowAppointmentTypesDialog(false);
                  }}
                >
                  Save Types
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCalendarSettingsDialog} onOpenChange={setShowCalendarSettingsDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/15 text-blue-400">
                <Settings className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Calendar Settings</DialogTitle>
                <p className="mt-1 text-xs text-gray-500">
                  Configure team availability, customer booking, Google sync, and appointment defaults.
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="space-y-3 rounded-xl border border-[#1e2d40] bg-[#0d1a2d] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-100">
                <CalendarDays className="h-4 w-4 text-blue-400" />
                Calendar Display
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-xs text-gray-400">Default view</span>
                  <select value={calendarSettings.defaultView} onChange={(event) => updateCalendarSetting("defaultView", event.target.value)} className="h-10 w-full rounded-lg border border-[#2a3547] bg-[#0d1526] px-3 text-sm text-gray-200 outline-none focus:ring-2 focus:ring-blue-500">
                    {VIEWS.map((option) => <option key={option}>{option}</option>)}
                  </select>
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs text-gray-400">Event density</span>
                  <select value={calendarSettings.eventDensity} onChange={(event) => updateCalendarSetting("eventDensity", event.target.value)} className="h-10 w-full rounded-lg border border-[#2a3547] bg-[#0d1526] px-3 text-sm text-gray-200 outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Compact</option><option>Comfortable</option><option>Detailed</option>
                  </select>
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs text-gray-400">Week starts on</span>
                  <select value={calendarSettings.weekStartsOn} onChange={(event) => updateCalendarSetting("weekStartsOn", event.target.value)} className="h-10 w-full rounded-lg border border-[#2a3547] bg-[#0d1526] px-3 text-sm text-gray-200 outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Monday</option><option>Sunday</option><option>Saturday</option>
                  </select>
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs text-gray-400">Timezone</span>
                  <select value={calendarSettings.timeZone} onChange={(event) => updateCalendarSetting("timeZone", event.target.value)} className="h-10 w-full rounded-lg border border-[#2a3547] bg-[#0d1526] px-3 text-sm text-gray-200 outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Asia/Dhaka</option><option>America/New_York</option><option>Europe/London</option><option>UTC</option>
                  </select>
                </label>
              </div>
              <label className="flex items-center justify-between rounded-lg border border-[#203651] bg-[#071321] px-3 py-2">
                <span className="text-xs text-gray-300">Show weekends</span>
                <input type="checkbox" checked={calendarSettings.showWeekends} onChange={(event) => updateCalendarSetting("showWeekends", event.target.checked)} className="h-4 w-4 rounded border-[#2a3547] bg-[#0d1526]" />
              </label>
            </div>

            <div className="space-y-3 rounded-xl border border-[#1e2d40] bg-[#0d1a2d] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-100">
                <Bell className="h-4 w-4 text-blue-400" />
                Scheduling Defaults
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="space-y-1.5"><span className="text-xs text-gray-400">Working start</span><Input type="time" value={calendarSettings.workingStart} onChange={(event) => updateCalendarSetting("workingStart", event.target.value)} /></label>
                <label className="space-y-1.5"><span className="text-xs text-gray-400">Working end</span><Input type="time" value={calendarSettings.workingEnd} onChange={(event) => updateCalendarSetting("workingEnd", event.target.value)} /></label>
                <label className="space-y-1.5">
                  <span className="text-xs text-gray-400">Default duration</span>
                  <select value={calendarSettings.defaultDuration} onChange={(event) => updateCalendarSetting("defaultDuration", event.target.value)} className="h-10 w-full rounded-lg border border-[#2a3547] bg-[#0d1526] px-3 text-sm text-gray-200 outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="30">30 min</option><option value="45">45 min</option><option value="60">60 min</option><option value="90">90 min</option>
                  </select>
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs text-gray-400">Default reminder</span>
                  <select value={calendarSettings.reminder} onChange={(event) => updateCalendarSetting("reminder", event.target.value)} className="h-10 w-full rounded-lg border border-[#2a3547] bg-[#0d1526] px-3 text-sm text-gray-200 outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="5">5 min before</option><option value="15">15 min before</option><option value="30">30 min before</option><option value="60">1 hour before</option>
                  </select>
                </label>
              </div>
              <label className="flex items-center justify-between rounded-lg border border-[#203651] bg-[#071321] px-3 py-2">
                <span className="text-xs text-gray-300">Require customer for team appointments</span>
                <input type="checkbox" checked={calendarSettings.requireCustomer} onChange={(event) => updateCalendarSetting("requireCustomer", event.target.checked)} className="h-4 w-4 rounded border-[#2a3547] bg-[#0d1526]" />
              </label>
            </div>

            <div className="space-y-3 rounded-xl border border-[#1e2d40] bg-[#0d1a2d] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-100">
                <Globe2 className="h-4 w-4 text-blue-400" />
                Google Calendar Sync
              </div>
              <label className="flex items-center justify-between rounded-lg border border-[#203651] bg-[#071321] px-3 py-2">
                <span className="text-xs text-gray-300">Two-way Google sync</span>
                <input type="checkbox" checked={calendarSettings.syncGoogle} onChange={(event) => updateCalendarSetting("syncGoogle", event.target.checked)} className="h-4 w-4 rounded border-[#2a3547] bg-[#0d1526]" />
              </label>
              <label className="flex items-center justify-between rounded-lg border border-[#203651] bg-[#071321] px-3 py-2">
                <span className="text-xs text-gray-300">Show declined or cancelled appointments</span>
                <input type="checkbox" checked={calendarSettings.showDeclined} onChange={(event) => updateCalendarSetting("showDeclined", event.target.checked)} className="h-4 w-4 rounded border-[#2a3547] bg-[#0d1526]" />
              </label>
              <div className="flex items-center gap-2 rounded-lg border border-[#203651] bg-[#071321] px-3 py-2 text-xs text-gray-400">
                <Palette className="h-3.5 w-3.5 text-blue-400" />
                Match Google event colors with appointment type colors.
              </div>
              <Button variant="outline" size="sm" className="h-9 w-full text-xs" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
                <RefreshCw className="mr-1 h-3.5 w-3.5" />
                {syncMutation.isPending ? "Syncing..." : "Sync Google Calendar Now"}
              </Button>
            </div>

            <div className="space-y-3 rounded-xl border border-[#1e2d40] bg-[#0d1a2d] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-100">
                <ShieldCheck className="h-4 w-4 text-blue-400" />
                Access and Booking
              </div>
              <label className="flex items-center justify-between rounded-lg border border-[#203651] bg-[#071321] px-3 py-2">
                <span className="text-xs text-gray-300">Public booking link enabled</span>
                <input type="checkbox" checked={calendarSettings.publicBooking} onChange={(event) => updateCalendarSetting("publicBooking", event.target.checked)} className="h-4 w-4 rounded border-[#2a3547] bg-[#0d1526]" />
              </label>
              <label className="flex items-center justify-between rounded-lg border border-[#203651] bg-[#071321] px-3 py-2">
                <span className="text-xs text-gray-300">Employees can edit their assigned appointments</span>
                <input type="checkbox" checked={calendarSettings.employeeCanEdit} onChange={(event) => updateCalendarSetting("employeeCanEdit", event.target.checked)} className="h-4 w-4 rounded border-[#2a3547] bg-[#0d1526]" />
              </label>
              <div className="flex items-center gap-2 rounded-lg border border-[#203651] bg-[#071321] px-3 py-2 text-xs text-gray-400">
                <Eye className="h-3.5 w-3.5 text-blue-400" />
                Owner can manage team calendars, personal events, blocks, and breaks.
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-[#1e2d40] pt-4">
            <p className="text-[11px] text-gray-500">These settings define calendar behavior for the Business Owner dashboard.</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowCalendarSettingsDialog(false)}>Cancel</Button>
              <Button
                onClick={() => {
                  window.localStorage.setItem("business-owner-calendar-settings", JSON.stringify(calendarSettings));
                  toast.success("Calendar settings saved");
                  setShowCalendarSettingsDialog(false);
                }}
              >
                Save Settings
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <CreateAppointmentDialog
        key={`${createDialogMode}-${appointmentDefaultDate?.toISOString() || "today"}`}
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        mode={createDialogMode}
        defaultDate={appointmentDefaultDate}
        showService
      />

      <AddBlockDialog
        open={blockDialogType !== null}
        onOpenChange={(open) => {
          if (!open) setBlockDialogType(null);
        }}
        type={blockDialogType || "block"}
        defaultDate={selectedDay?.day || null}
      />

      <AppointmentDetailsDialog
        open={Boolean(detailsId)}
        onOpenChange={(open) => {
          if (!open) setDetailsId(null);
        }}
        appointmentId={detailsId}
      />
    </div>
  );
}
