/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { appointmentsApi, calendarApi, employeesApi } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { toast } from "sonner";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Coffee,
  Filter,
  Plus,
  RefreshCw,
  Settings,
  Settings2,
  Sparkles,
  StopCircle,
  User,
} from "lucide-react";
import { CreateAppointmentDialog } from "@/components/create-appointment-dialog";
import { AppointmentDetailsDialog } from "@/components/appointment-details-dialog";

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

const isSameDay = (first: Date, second: Date) =>
  first.getFullYear() === second.getFullYear() &&
  first.getMonth() === second.getMonth() &&
  first.getDate() === second.getDate();

const formatMonthDay = (date: Date) =>
  date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

const formatHourLabel = (hour: number) => `${String(hour).padStart(2, "0")}:00`;

const formatRange = (start: string, end: string) => {
  if (!start || !end) return "";
  return `${start.slice(0, 5)} – ${end.slice(0, 5)}`;
};

export default function CalendarPage() {
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [view, setView] = useState<(typeof VIEWS)[number]>("Week");
  const [weekAnchor, setWeekAnchor] = useState(() => startOfWeek(new Date()));
  const [showInsights] = useState(true);
  const [showSync, setShowSync] = useState(true);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(
    new Set()
  );

  const weekStart = weekAnchor;
  const weekEnd = useMemo(() => endOfWeek(weekStart), [weekStart]);

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const current = new Date(weekStart);
        current.setDate(weekStart.getDate() + index);
        return current;
      }),
    [weekStart]
  );

  // ---- Data ----
  const { data: appointmentsResponse, isLoading: appointmentsLoading } = useQuery({
    queryKey: ["calendar-appointments", weekStart.toISOString(), weekEnd.toISOString()],
    queryFn: () =>
      appointmentsApi
        .getAll({
          startDate: weekStart.toISOString(),
          endDate: weekEnd.toISOString(),
          limit: 200,
        })
        .then((response) => response.data),
  });

  const { data: insightsResponse } = useQuery({
    queryKey: ["calendar-insights"],
    queryFn: () => calendarApi.getInsights().then((response) => response.data),
  });

  const { data: employeesResponse } = useQuery({
    queryKey: ["calendar-team"],
    queryFn: () => employeesApi.getAll({ limit: 50 }).then((response) => response.data),
  });

  const syncMutation = useMutation({
    mutationFn: () => calendarApi.sync(),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["calendar-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-insights"] });
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

  const appointments: any[] = appointmentsResponse?.data || [];
  const insights: any[] = insightsResponse?.data || [];
  const employees: any[] = employeesResponse?.data || [];

  const teamMembers = useMemo(() => {
    if (!employees.length) {
      return [{ id: "me", name: "Me", color: TEAM_COLOR_POOL[0], imageUrl: "" }];
    }
    return employees.slice(0, 6).map((employee, index) => ({
      id: String(employee.userId?._id || employee._id || index),
      name: employee.userId?.name || "Employee",
      imageUrl: employee.userId?.profileImage?.url || "",
      color: TEAM_COLOR_POOL[index % TEAM_COLOR_POOL.length],
    }));
  }, [employees]);

  const memberColorMap = useMemo(() => {
    const map = new Map<string, string>();
    teamMembers.forEach((member) => map.set(member.id, member.color));
    return map;
  }, [teamMembers]);

  const filteredAppointments = useMemo(() => {
    if (selectedEmployees.size === 0) return appointments;
    return appointments.filter((appointment) => {
      const employeeId = String(appointment.employee?._id || appointment.employee || "");
      return selectedEmployees.has(employeeId);
    });
  }, [appointments, selectedEmployees]);

  const dayBuckets = useMemo(() => {
    return days.map((day) => {
      const dayAppointments = filteredAppointments.filter((appointment) => {
        const dateValue = new Date(appointment.appointmentDate);
        return isSameDay(dateValue, day);
      });

      return {
        day,
        appointments: dayAppointments,
        capacity: Math.min(
          120,
          Math.round((dayAppointments.length / 8) * 100)
        ),
      };
    });
  }, [days, filteredAppointments]);

  const selectedDay = useMemo(() => {
    if (selectedDayIndex === null) {
      // Default to the day with the highest capacity (or today)
      const todayIndex = dayBuckets.findIndex((bucket) =>
        isSameDay(bucket.day, new Date())
      );
      if (todayIndex >= 0) return dayBuckets[todayIndex];
      return dayBuckets[0] || null;
    }
    return dayBuckets[selectedDayIndex] || null;
  }, [dayBuckets, selectedDayIndex]);

  const navigateWeek = (delta: number) => {
    setWeekAnchor((current) => {
      const next = new Date(current);
      next.setDate(next.getDate() + delta * 7);
      return startOfWeek(next);
    });
  };

  const toggleMember = (id: string) => {
    setSelectedEmployees((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const employeeColor = (appointment: any) => {
    if (appointment.color) return appointment.color;
    const employeeId = String(appointment.employee?._id || "");
    return memberColorMap.get(employeeId) || TEAM_COLOR_POOL[0];
  };

  return (
    <div>
      <Header
        title="Calendar"
        subtitle="Manage appointments across your team. Stay organized, save time."
        action={
          <div className="flex items-center gap-1 rounded-lg bg-blue-600 pr-1">
            <Button
              size="sm"
              className="h-8 rounded-l-lg rounded-r-none bg-blue-600 text-xs hover:bg-blue-700"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Create Appointment
            </Button>
            <button
              className="rounded-md p-1 text-white hover:bg-blue-700"
              onClick={() => setShowCreateDialog(true)}
              aria-label="More"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        }
      />

      <div className="space-y-4 p-6">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 rounded-lg bg-[#0d1a2d] p-1">
            {VIEWS.map((option) => (
              <button
                key={option}
                onClick={() => setView(option)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  view === option
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          <button
            onClick={() => navigateWeek(-1)}
            className="rounded-md p-1 text-gray-400 hover:bg-[#1e2d40] hover:text-gray-200"
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium text-gray-200">
            {formatMonthDay(weekStart)} – {formatMonthDay(weekEnd)},{" "}
            {weekEnd.getFullYear()}
          </span>
          <button
            onClick={() => navigateWeek(1)}
            className="rounded-md p-1 text-gray-400 hover:bg-[#1e2d40] hover:text-gray-200"
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => setWeekAnchor(startOfWeek(new Date()))}
          >
            Today
          </Button>

          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-8 text-xs">
              <Filter className="mr-1 h-3.5 w-3.5" />
              Filters
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Calendar settings">
              <Settings className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
          <div className="space-y-4 xl:col-span-3">
            {/* Team Calendars */}
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#1e2d40] bg-[#0d1a2d] p-3">
              <span className="text-xs text-gray-400">Team Calendars</span>
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#1e2d40] text-[9px] text-gray-500">
                ?
              </span>
              {teamMembers.map((member) => {
                const isActive =
                  selectedEmployees.size === 0 || selectedEmployees.has(member.id);
                return (
                  <button
                    key={member.id}
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
              <button
                className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1e2d40] text-gray-400 hover:text-white"
                aria-label="Add calendar"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Kora Insights */}
            {showInsights ? (
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#1e2d40] bg-[#0d1a2d] p-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600/15 text-2xl">
                  <span className="relative inline-block">
                    <span className="absolute inset-0 animate-pulse rounded-full bg-blue-400/30 blur-md" />
                    <Sparkles className="relative h-5 w-5 text-blue-300" />
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-blue-400" />
                  <span className="text-xs font-medium text-gray-300">Kora Insights</span>
                </div>
                <div className="flex flex-1 flex-wrap items-center gap-2">
                  {(insights.length > 0
                    ? insights
                    : [
                        {
                          title: "Friday is almost fully booked",
                          message: "You have 2 free slots left",
                        },
                        {
                          title: "You have 8 free slots",
                          message: "on Tuesday",
                        },
                        {
                          title: "Wednesday is your",
                          message: "lightest day",
                        },
                      ]
                  )
                    .slice(0, 3)
                    .map((insight: any, index: number) => (
                      <div
                        key={`${insight.title}-${index}`}
                        className="flex items-center gap-2 rounded-lg bg-[#1e2d40] px-3 py-1.5"
                      >
                        <span className="text-base">
                          {index === 0 ? "📅" : index === 1 ? "🟢" : "⭐"}
                        </span>
                        <div className="leading-tight">
                          <p className="text-xs text-gray-200">{insight.title}</p>
                          <p className="text-[10px] text-gray-500">
                            {insight.message}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
                <button className="whitespace-nowrap text-xs text-blue-400 hover:text-blue-300">
                  View all insights →
                </button>
              </div>
            ) : null}

            {/* Week Grid */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <div className="min-w-[860px]">
                    {/* Day Header */}
                    <div className="grid grid-cols-[60px_repeat(7,minmax(0,1fr))] border-b border-[#1e2d40]">
                      <div className="px-2 py-3 text-[10px] text-gray-500">GMT+1</div>
                      {dayBuckets.map((bucket, index) => {
                        const isToday = isSameDay(bucket.day, new Date());
                        return (
                          <div
                            key={index}
                            className="border-l border-[#1e2d40] px-2 py-2 text-center"
                          >
                            <p className="text-[11px] text-gray-400">
                              {DAY_LABELS[index]} {bucket.day.getDate()}
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
                          </div>
                        );
                      })}
                    </div>

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
                          className="grid min-h-[68px] grid-cols-[60px_repeat(7,minmax(0,1fr))] border-b border-[#1e2d40]"
                        >
                          <div className="px-2 py-1 text-[10px] text-gray-500">
                            {formatHourLabel(hour)}
                          </div>
                          {dayBuckets.map((bucket, dayIndex) => {
                            const slotAppointments = bucket.appointments.filter(
                              (appointment: any) => {
                                const startHour = parseInt(
                                  (appointment.startTime || "00:00").slice(0, 2),
                                  10
                                );
                                return startHour === hour;
                              }
                            );

                            return (
                              <div
                                key={dayIndex}
                                className="group relative border-l border-[#1e2d40] px-1 py-1"
                                onClick={() => setSelectedDayIndex(dayIndex)}
                              >
                                {slotAppointments.length === 0 ? (
                                  <button
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setShowCreateDialog(true);
                                    }}
                                    className="absolute right-1 top-1 hidden h-5 w-5 items-center justify-center rounded-md bg-[#1e2d40] text-gray-400 group-hover:flex hover:text-blue-400"
                                    aria-label="Add appointment"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                ) : null}

                                {slotAppointments.map((appointment: any) => {
                                  const color = employeeColor(appointment);
                                  const guestName =
                                    appointment.customer?.name ||
                                    appointment.client?.name ||
                                    appointment.title ||
                                    "Customer";
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
                                      <p
                                        className="truncate text-[9px] font-medium"
                                        style={{ color }}
                                      >
                                        {formatRange(
                                          appointment.startTime,
                                          appointment.endTime
                                        )}
                                      </p>
                                      <p className="flex items-center gap-1 truncate text-[10px] text-gray-100">
                                        {guestName}
                                        <User className="h-2.5 w-2.5 text-gray-500" />
                                      </p>
                                      <p className="truncate text-[9px] text-gray-400">
                                        {appointment.service || "Service"}
                                      </p>
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
                <div className="flex flex-wrap items-center gap-3 border-t border-[#1e2d40] px-4 py-2">
                  {teamMembers.map((member) => (
                    <div key={member.id} className="flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: member.color }}
                      />
                      <span className="text-[10px] text-gray-400">{member.name}</span>
                    </div>
                  ))}
                  <button className="ml-auto flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-300">
                    <Settings2 className="h-3 w-3" />
                    Manage calendars
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="space-y-4">
            {/* Selected day panel */}
            {selectedDay ? (
              <Card>
                <CardContent className="space-y-3 pt-4">
                  <div className="flex items-start justify-between">
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

                  <div>
                    <div className="mb-1 flex justify-between text-[10px]">
                      <span className="text-gray-400">
                        {selectedDay.appointments.length} Appointments
                      </span>
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

                  <div className="space-y-2">
                    {selectedDay.appointments.length === 0 ? (
                      <p className="text-xs text-gray-500">
                        No appointments scheduled.
                      </p>
                    ) : (
                      selectedDay.appointments
                        .sort((a, b) =>
                          (a.startTime || "").localeCompare(b.startTime || "")
                        )
                        .slice(0, 6)
                        .map((appointment) => {
                          const guestName =
                            appointment.customer?.name ||
                            appointment.client?.name ||
                            "Customer";
                          const statusInfo =
                            STATUS_LABELS[appointment.status] || {
                              label: appointment.status || "Upcoming",
                              color: "text-gray-400",
                            };
                          const employeeImg =
                            appointment.employee?.profileImage?.url || "";
                          const employeeName =
                            appointment.employee?.name || "Employee";
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
                                <p className="truncate text-xs text-gray-100">
                                  {guestName}
                                </p>
                                <p className="truncate text-[10px] text-gray-500">
                                  {appointment.service || "Service"}
                                </p>
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

                  <button className="flex w-full items-center justify-center gap-1 text-xs text-blue-400 hover:text-blue-300">
                    View full day →
                  </button>
                </CardContent>
              </Card>
            ) : null}

            {/* Quick Actions */}
            <Card>
              <CardContent className="pt-4">
                <p className="mb-3 text-xs font-medium text-gray-300">Quick Actions</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      label: "Add Appointment",
                      icon: Plus,
                      action: () => setShowCreateDialog(true),
                    },
                    { label: "Add Block", icon: StopCircle },
                    { label: "Add Break", icon: Coffee },
                    { label: "Appointment Types", icon: Settings2 },
                    { label: "Calendar Settings", icon: Settings },
                  ].map((action) => (
                    <button
                      key={action.label}
                      onClick={() =>
                        action.action
                          ? action.action()
                          : toast.info(`${action.label} coming soon`)
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
            <Card>
              <CardContent className="pt-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-medium text-gray-300">Calendar Sync</p>
                  <button
                    onClick={() => setShowSync((value) => !value)}
                    className="text-gray-400 hover:text-gray-200"
                    aria-label="Toggle sync details"
                  >
                    {showSync ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
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
                      onClick={() => syncMutation.mutate()}
                      disabled={syncMutation.isPending}
                    >
                      <RefreshCw className="mr-1 h-3 w-3" />
                      {syncMutation.isPending ? "Syncing..." : "Sync Settings"}
                    </Button>
                  </>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <CreateAppointmentDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        showService
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
