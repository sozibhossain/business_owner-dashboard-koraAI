/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { employeesApi } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getInitials, formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import {
  Users,
  UserCheck,
  Clock,
  BarChart2,
  Search,
  MoreHorizontal,
  Plus,
  Filter,
  LayoutGrid,
  CalendarDays,
  Sparkles,
  Star,
  Pencil,
  Calendar,
  Clock4,
  MessageSquare,
  Eye,
  EyeOff,
} from "lucide-react";

const STATUS_OPTIONS = ["working", "on_break", "off", "on_leave"] as const;

const statusLabels: Record<string, { label: string; variant: any; dot: string }> = {
  working: { label: "Working", variant: "success", dot: "bg-emerald-400" },
  on_break: { label: "On Break", variant: "warning", dot: "bg-amber-400" },
  off: { label: "Off", variant: "secondary", dot: "bg-gray-400" },
  on_leave: { label: "On Leave", variant: "purple", dot: "bg-purple-400" },
};

type EmployeeForm = {
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
  position: string;
  workingHoursStart: string;
  workingHoursEnd: string;
  daysOff: string;
};

const emptyForm: EmployeeForm = {
  name: "",
  email: "",
  password: "",
  phoneNumber: "",
  position: "Barber",
  workingHoursStart: "09:00",
  workingHoursEnd: "18:00",
  daysOff: "sunday",
};

const sparklineFor = (seed: number, color: string) => {
  // deterministic mini-spark line based on a numeric seed
  const points = Array.from({ length: 12 }, (_, index) => {
    const noise = ((seed * 9301 + index * 49297) % 233280) / 233280;
    return 8 + Math.round(noise * 16);
  });
  const path = points
    .map((value, index) => `${(index / (points.length - 1)) * 100},${24 - value}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 24" className="h-6 w-20" preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={path}
      />
    </svg>
  );
};

const utilizationColor = (utilization: number) => {
  if (utilization >= 100) return "bg-red-500";
  if (utilization >= 80) return "bg-emerald-500";
  if (utilization >= 50) return "bg-amber-500";
  if (utilization > 0) return "bg-blue-500";
  return "bg-gray-600";
};

export default function EmployeesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [view, setView] = useState<"cards" | "schedule">("cards");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<EmployeeForm>(emptyForm);
  const [showPassword, setShowPassword] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["employees", search],
    queryFn: () =>
      employeesApi
        .getAll({ limit: 100, search: search || undefined })
        .then((response) => response.data),
  });

  const allEmployees: any[] = data?.data || [];
  const summary = data?.meta?.summary;

  const employees = useMemo(() => {
    return allEmployees.filter((employee: any) => {
      const matchesRole =
        roleFilter === "all" ||
        (employee.position || "").toLowerCase() === roleFilter.toLowerCase();
      const matchesStatus =
        statusFilter === "all" || employee.status === statusFilter;
      return matchesRole && matchesStatus;
    });
  }, [allEmployees, roleFilter, statusFilter]);

  useEffect(() => {
    if (!selectedId && employees.length > 0) {
      setSelectedId(String(employees[0]._id));
    } else if (
      selectedId &&
      !employees.find((employee: any) => String(employee._id) === selectedId)
    ) {
      setSelectedId(employees[0] ? String(employees[0]._id) : null);
    }
  }, [employees, selectedId]);

  const selectedEmployee = useMemo(
    () =>
      employees.find((employee: any) => String(employee._id) === selectedId) ||
      null,
    [employees, selectedId]
  );

  const { data: scheduleData, isLoading: scheduleLoading } = useQuery({
    queryKey: ["employee-schedule", selectedId],
    enabled: Boolean(selectedId),
    queryFn: () =>
      employeesApi
        .getSchedule(String(selectedId))
        .then((response) => response.data.data),
  });

  const { data: performanceData } = useQuery({
    queryKey: ["employee-performance", selectedId],
    enabled: Boolean(selectedId),
    queryFn: () =>
      employeesApi
        .getPerformance(String(selectedId))
        .then((response) => response.data.data),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      employeesApi.toggleStatus(id, { status }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({
        queryKey: ["employee-performance", variables.id],
      });
      toast.success(
        `Employee marked ${statusLabels[variables.status]?.label || variables.status}`
      );
    },
    onError: (error: any) =>
      toast.error(
        error?.response?.data?.message || "Failed to update employee status"
      ),
  });

  const createMutation = useMutation({
    mutationFn: () => {
      if (!form.name.trim() || !form.email.trim() || !form.password.trim() || !form.phoneNumber.trim()) {
        throw new Error("Name, email, password and phone are required");
      }
      const daysOff = form.daysOff
        .split(",")
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);

      return employeesApi.create({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        phoneNumber: form.phoneNumber.trim(),
        position: form.position.trim() || "Barber",
        workingHours: {
          start: form.workingHoursStart,
          end: form.workingHoursEnd,
        },
        daysOff: daysOff.length > 0 ? daysOff : ["sunday"],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Employee added");
      setCreateOpen(false);
      setForm(emptyForm);
    },
    onError: (error: any) =>
      toast.error(
        error?.response?.data?.message || error?.message || "Failed to add employee"
      ),
  });

  useEffect(() => {
    if (!createOpen) {
      setForm(emptyForm);
      setShowPassword(false);
    }
  }, [createOpen]);

  const totalEmployees = summary?.totalEmployees || allEmployees.length;
  const activeEmployees =
    summary?.activeEmployees ||
    allEmployees.filter((item: any) =>
      ["working", "on_break"].includes(item.status)
    ).length;
  const onLeaveCount = allEmployees.filter(
    (item: any) => item.status === "on_leave"
  ).length;
  const avgUtilization = allEmployees.length
    ? Math.round(
        allEmployees.reduce(
          (sum: number, item: any) => sum + (item.utilizationRate || 0),
          0
        ) / allEmployees.length
      )
    : 0;

  const stats = [
    {
      label: "Total Employees",
      value: totalEmployees,
      helper: "On the team roster",
      icon: Users,
      color: "bg-blue-600",
      spark: "#3b82f6",
      seed: 11,
    },
    {
      label: "Active Today",
      value: activeEmployees,
      helper: `${Math.round(((activeEmployees || 0) / Math.max(totalEmployees, 1)) * 100)}% of team`,
      icon: UserCheck,
      color: "bg-emerald-600",
      spark: "#10b981",
      seed: 23,
    },
    {
      label: "On Leave",
      value: onLeaveCount,
      helper: "Current leave status",
      icon: Clock,
      color: "bg-amber-600",
      spark: "#f59e0b",
      seed: 7,
    },
    {
      label: "Avg. Utilization",
      value: `${avgUtilization}%`,
      helper: "Across active team",
      icon: BarChart2,
      color: "bg-purple-600",
      spark: "#a855f7",
      seed: 31,
    },
  ];

  const insights = useMemo(() => {
    const items: { title: string; sub: string; color: string; icon: string }[] = [];

    const overbooked = allEmployees.find(
      (item: any) => (item.utilizationRate || 0) >= 100
    );
    if (overbooked) {
      items.push({
        title: `${overbooked.userId?.name || "An employee"} is overbooked`,
        sub: `${overbooked.utilizationRate}% of capacity`,
        color: "bg-red-600/15 text-red-300",
        icon: "👤",
      });
    }

    const underused = allEmployees
      .filter(
        (item: any) =>
          (item.utilizationRate ?? 100) < 50 && item.status === "working"
      )
      .sort(
        (a: any, b: any) => (a.utilizationRate || 0) - (b.utilizationRate || 0)
      )[0];
    if (underused) {
      items.push({
        title: `${underused.userId?.name || "An employee"} has low utilization`,
        sub: `${underused.utilizationRate || 0}% this week`,
        color: "bg-amber-600/15 text-amber-300",
        icon: "⚠️",
      });
    }

    if (onLeaveCount > 0) {
      items.push({
        title: `${onLeaveCount} on leave`,
        sub: "Adjust schedules accordingly",
        color: "bg-blue-600/15 text-blue-300",
        icon: "📆",
      });
    }

    if (items.length === 0) {
      items.push({
        title: "Team running smoothly",
        sub: "No anomalies detected",
        color: "bg-emerald-600/15 text-emerald-300",
        icon: "✓",
      });
    }

    return items;
  }, [allEmployees, onLeaveCount]);

  const roleOptions = useMemo(() => {
    const set = new Set<string>();
    allEmployees.forEach((employee: any) => {
      if (employee.position) set.add(employee.position);
    });
    return ["all", ...Array.from(set)];
  }, [allEmployees]);

  return (
    <div>
      <Header
        title="Employees"
        subtitle="Manage your team, track performance and optimize schedules."
        action={
          <Button size="sm" className="h-8 text-xs" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add Employee
          </Button>
        }
      />

      <div className="space-y-5 p-3 sm:p-4 lg:p-6">
        {/* STATS */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map((item) => (
            <Card key={item.label}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${item.color}`}
                    >
                      <item.icon className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400">{item.label}</p>
                      <p className="text-xl font-bold text-white">{item.value}</p>
                      <p className="text-[10px] text-emerald-400">{item.helper}</p>
                    </div>
                  </div>
                  {sparklineFor(item.seed, item.spark)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* KORA INSIGHTS */}
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 pt-4">
            <div className="flex shrink-0 items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600/15">
                <Sparkles className="h-4 w-4 text-blue-400" />
              </div>
              <span className="text-xs font-medium text-gray-300">Kora Insights</span>
            </div>
            <div className="flex flex-1 flex-wrap items-center gap-2">
              {insights.map((insight) => (
                <div
                  key={insight.title}
                  className={`flex items-center gap-2 rounded-lg px-3 py-1.5 ${insight.color}`}
                >
                  <span>{insight.icon}</span>
                  <div className="text-[10px] leading-tight">
                    <p className="text-xs text-gray-100">{insight.title}</p>
                    <p className="text-[10px] opacity-75">{insight.sub}</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="ml-auto whitespace-nowrap text-xs text-blue-400 hover:text-blue-300">
              View all insights →
            </button>
          </CardContent>
        </Card>

        {/* FILTERS */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search employees..."
                className="pl-9"
              />
            </div>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="h-10 w-32">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option === "all" ? "All Roles" : option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 w-32">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {statusLabels[option]?.label || option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" className="h-10 text-xs">
              <Filter className="mr-1 h-3.5 w-3.5" />
              Filters
            </Button>
          </div>

          <div className="flex gap-1 rounded-lg bg-[#0d1a2d] p-1">
            <button
              onClick={() => setView("cards")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs ${view === "cards" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-gray-200"}`}
            >
              <LayoutGrid className="h-3 w-3" /> Cards View
            </button>
            <button
              onClick={() => setView("schedule")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs ${view === "schedule" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-gray-200"}`}
            >
              <CalendarDays className="h-3 w-3" /> Schedule View
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          {/* CARDS COLUMN */}
          <div className="xl:col-span-2">
            {isLoading ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Card key={index}>
                    <CardContent className="space-y-3 pt-4">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : employees.length === 0 ? (
              <Card>
                <CardContent className="pt-10 pb-10 text-center">
                  <Users className="mx-auto mb-2 h-8 w-8 text-gray-600" />
                  <p className="text-sm font-medium text-gray-300">No employees found.</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Click <span className="text-blue-400">Add Employee</span> to bring your first teammate aboard.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {employees.map((employee: any) => {
                  const statusMeta =
                    statusLabels[employee.status] || {
                      label: employee.status,
                      variant: "secondary",
                      dot: "bg-gray-400",
                    };
                  const utilization = employee.utilizationRate || 0;

                  return (
                    <Card
                      key={employee._id}
                      className={`cursor-pointer transition-colors ${
                        selectedId === String(employee._id)
                          ? "border-blue-600/40 bg-blue-600/5"
                          : "hover:border-blue-600/20"
                      }`}
                      onClick={() => setSelectedId(String(employee._id))}
                    >
                      <CardContent className="space-y-3 pt-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback>
                                {getInitials(
                                  employee.userId?.name || employee.position || "EM"
                                )}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-gray-100">
                                {employee.userId?.name || "Employee"}
                              </p>
                              <p className="truncate text-[11px] text-gray-400">
                                {employee.position || "Employee"}
                              </p>
                              <div className="mt-1 flex items-center gap-1.5">
                                <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`} />
                                <span className="text-[10px] text-gray-400">
                                  {statusMeta.label}
                                </span>
                              </div>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {STATUS_OPTIONS.map((status) => (
                                <DropdownMenuItem
                                  key={status}
                                  onClick={() =>
                                    toggleMutation.mutate({
                                      id: String(employee._id),
                                      status,
                                    })
                                  }
                                >
                                  Mark {statusLabels[status].label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div>
                            <p className="text-[10px] text-gray-500">Today&apos;s Appts</p>
                            <p className="font-bold text-white">
                              {employee.totalAppointments || 0}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-500">Utilization</p>
                            <p className="font-bold text-white">{utilization}%</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-500">Rating</p>
                            <p className="flex items-center justify-center gap-0.5 font-bold text-white">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                              {employee.avgRating || 0}
                            </p>
                          </div>
                        </div>

                        <div className="h-1.5 overflow-hidden rounded-full bg-[#1e2d40]">
                          <div
                            className={`h-full ${utilizationColor(utilization)}`}
                            style={{ width: `${Math.min(utilization, 100)}%` }}
                          />
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-full text-xs"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedId(String(employee._id));
                          }}
                        >
                          View Profile →
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            <p className="mt-4 text-center text-[11px] text-gray-500">
              Showing {employees.length} of {allEmployees.length} employees
            </p>
          </div>

          {/* DETAIL PANEL */}
          <div>
            {selectedEmployee ? (
              <Card>
                <CardContent className="space-y-4 pt-4">
                  {/* Header */}
                  <div className="flex items-start gap-3">
                    <Avatar className="h-14 w-14">
                      <AvatarFallback className="text-base">
                        {getInitials(selectedEmployee.userId?.name || "EM")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold text-gray-100">
                          {selectedEmployee.userId?.name || "Employee"}
                        </p>
                        <Badge
                          variant={
                            statusLabels[selectedEmployee.status]?.variant || "secondary"
                          }
                          className="text-[10px]"
                        >
                          {statusLabels[selectedEmployee.status]?.label ||
                            selectedEmployee.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-400">{selectedEmployee.position}</p>
                      {selectedEmployee.userId?.email ? (
                        <p className="truncate text-[11px] text-blue-400">
                          ✉ {selectedEmployee.userId.email}
                        </p>
                      ) : null}
                      {selectedEmployee.userId?.phoneNumber ? (
                        <p className="text-[11px] text-gray-400">
                          ☎ {selectedEmployee.userId.phoneNumber}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="overview" className="text-xs">
                        Overview
                      </TabsTrigger>
                      <TabsTrigger value="schedule" className="text-xs">
                        Schedule
                      </TabsTrigger>
                      <TabsTrigger value="performance" className="text-xs">
                        Performance
                      </TabsTrigger>
                      <TabsTrigger value="settings" className="text-xs">
                        Settings
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-3">
                      <div>
                        <div className="mb-1 flex items-center justify-between">
                          <p className="text-xs font-medium text-gray-300">About</p>
                          <button className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300">
                            <Pencil className="h-3 w-3" /> Edit
                          </button>
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between border-b border-[#1e2d40] py-1.5">
                            <span className="text-gray-500">Role</span>
                            <span className="text-gray-200">
                              {selectedEmployee.position}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-[#1e2d40] py-1.5">
                            <span className="text-gray-500">Employee Since</span>
                            <span className="text-gray-200">
                              {selectedEmployee.createdAt
                                ? formatDate(selectedEmployee.createdAt)
                                : "—"}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-[#1e2d40] py-1.5">
                            <span className="text-gray-500">Status</span>
                            <span className="text-gray-200">
                              {statusLabels[selectedEmployee.status]?.label ||
                                selectedEmployee.status}
                            </span>
                          </div>
                          <div className="flex justify-between py-1.5">
                            <span className="text-gray-500">Working Hours</span>
                            <span className="text-gray-200">
                              {selectedEmployee.workingHours?.start || "--"} -{" "}
                              {selectedEmployee.workingHours?.end || "--"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className="mb-1 text-xs font-medium text-gray-300">
                          Performance (This Week)
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            {
                              label: "Appointments",
                              value:
                                performanceData?.lifetimeStats?.completedAppointments ||
                                selectedEmployee.totalAppointments ||
                                0,
                              helper: "↗ 15%",
                            },
                            {
                              label: "Utilization",
                              value: `${selectedEmployee.utilizationRate || 0}%`,
                              helper: "↗ 22%",
                            },
                            {
                              label: "Revenue",
                              value: formatCurrency(selectedEmployee.totalRevenue || 0),
                              helper: "↗ 18%",
                            },
                            {
                              label: "No Shows",
                              value:
                                performanceData?.lifetimeStats?.noShows ||
                                selectedEmployee.noShows ||
                                0,
                              helper: "↘ 50%",
                            },
                          ].map((stat) => (
                            <div
                              key={stat.label}
                              className="rounded-lg bg-[#1e2d40] p-2.5"
                            >
                              <p className="text-[10px] text-gray-500">{stat.label}</p>
                              <p className="text-sm font-bold text-white">{stat.value}</p>
                              <p className="text-[9px] text-emerald-400">{stat.helper}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="mb-1 flex items-center justify-between">
                          <p className="text-xs font-medium text-gray-300">
                            Today&apos;s Schedule
                          </p>
                          <button className="text-[10px] text-blue-400 hover:text-blue-300">
                            View full day →
                          </button>
                        </div>
                        {scheduleLoading ? (
                          <div className="space-y-2">
                            {Array.from({ length: 3 }).map((_, index) => (
                              <Skeleton key={index} className="h-10 w-full" />
                            ))}
                          </div>
                        ) : scheduleData?.schedule?.length ? (
                          <div className="space-y-1">
                            {scheduleData.schedule.slice(0, 4).map((item: any) => (
                              <div
                                key={item.id}
                                className="flex items-center gap-2 border-b border-[#1e2d40] py-1.5 last:border-0"
                              >
                                <span className="w-14 shrink-0 text-[10px] text-gray-500">
                                  {item.startTime || "--"}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs text-gray-200">
                                    {item.customer?.name || "Customer"}
                                  </p>
                                  <p className="truncate text-[10px] text-gray-500">
                                    {item.service || item.title || "Service"}
                                  </p>
                                </div>
                                <Badge variant="secondary" className="text-[9px] capitalize">
                                  {String(item.status || "upcoming").replace("_", " ")}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500">
                            No scheduled appointments today.
                          </p>
                        )}
                      </div>

                      <div>
                        <p className="mb-1 text-xs font-medium text-gray-300">Quick Actions</p>
                        <div className="grid grid-cols-5 gap-1.5">
                          {[
                            { label: "Edit Profile", icon: Pencil },
                            { label: "Set Schedule", icon: Calendar },
                            { label: "Add Time Off", icon: Clock4 },
                            { label: "View Calendar", icon: Eye },
                            { label: "Send Message", icon: MessageSquare },
                          ].map((action) => (
                            <button
                              key={action.label}
                              onClick={() => toast.info(action.label)}
                              className="flex flex-col items-center gap-1 rounded-lg bg-[#1e2d40] p-2 transition-colors hover:bg-[#2a3547]"
                              title={action.label}
                            >
                              <action.icon className="h-3.5 w-3.5 text-blue-400" />
                              <span className="text-center text-[9px] leading-tight text-gray-400">
                                {action.label.split(" ")[0]}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="schedule">
                      {scheduleLoading ? (
                        <div className="space-y-2">
                          {Array.from({ length: 4 }).map((_, index) => (
                            <Skeleton key={index} className="h-12 w-full" />
                          ))}
                        </div>
                      ) : scheduleData?.schedule?.length ? (
                        <div className="space-y-2">
                          {scheduleData.schedule.map((item: any) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-3 border-b border-[#1e2d40] py-2 last:border-0"
                            >
                              <div className="w-16 shrink-0">
                                <p className="text-[10px] text-gray-500">
                                  {formatDate(item.date)}
                                </p>
                                <p className="text-xs text-gray-300">{item.startTime}</p>
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs text-gray-200">
                                  {item.customer?.name || "Customer"}
                                </p>
                                <p className="truncate text-[10px] text-gray-500">
                                  {item.service || item.title || "Service"}
                                </p>
                              </div>
                              <Badge variant="secondary" className="text-[9px] capitalize">
                                {String(item.status || "upcoming").replace("_", " ")}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500">
                          No upcoming appointments.
                        </p>
                      )}
                    </TabsContent>

                    <TabsContent value="performance">
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          {
                            label: "Completed",
                            value:
                              performanceData?.lifetimeStats?.completedAppointments || 0,
                          },
                          {
                            label: "Upcoming",
                            value:
                              performanceData?.lifetimeStats?.upcomingAppointments || 0,
                          },
                          {
                            label: "No Shows",
                            value: performanceData?.lifetimeStats?.noShows || 0,
                          },
                          {
                            label: "Avg Rating",
                            value:
                              performanceData?.lifetimeStats?.averageRating ||
                              selectedEmployee.avgRating ||
                              0,
                          },
                        ].map((item) => (
                          <div key={item.label} className="rounded-lg bg-[#1e2d40] p-3">
                            <p className="text-sm font-bold text-white">{item.value}</p>
                            <p className="text-[10px] text-gray-400">{item.label}</p>
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="settings">
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between border-b border-[#1e2d40] py-1.5">
                          <span className="text-gray-500">Working Hours</span>
                          <span className="text-gray-200">
                            {selectedEmployee.workingHours?.start || "--"} -{" "}
                            {selectedEmployee.workingHours?.end || "--"}
                          </span>
                        </div>
                        <div className="flex justify-between border-b border-[#1e2d40] py-1.5">
                          <span className="text-gray-500">Days Off</span>
                          <span className="text-gray-200">
                            {(selectedEmployee.daysOff || []).join(", ") || "None"}
                          </span>
                        </div>
                        <div className="flex justify-between py-1.5">
                          <span className="text-gray-500">Kora Go Access</span>
                          <span className="text-gray-200">
                            {selectedEmployee.koraGoAccess ? "Enabled" : "Disabled"}
                          </span>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-gray-500">
                    Select an employee to view details.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* ADD EMPLOYEE MODAL */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Employee</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-300">Full name</label>
                <Input
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="Sarah Taylor"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-300">Role / Position</label>
                <Input
                  value={form.position}
                  onChange={(event) => setForm({ ...form, position: event.target.value })}
                  placeholder="Barber"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-300">Email</label>
              <Input
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                placeholder="sarah@fademasters.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-300">Phone</label>
                <Input
                  value={form.phoneNumber}
                  onChange={(event) =>
                    setForm({ ...form, phoneNumber: event.target.value })
                  }
                  placeholder="+49 176 12345678"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-300">Temporary password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(event) => setForm({ ...form, password: event.target.value })}
                    placeholder="Min. 6 characters"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-300">Shift start</label>
                <Input
                  type="time"
                  value={form.workingHoursStart}
                  onChange={(event) =>
                    setForm({ ...form, workingHoursStart: event.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-300">Shift end</label>
                <Input
                  type="time"
                  value={form.workingHoursEnd}
                  onChange={(event) =>
                    setForm({ ...form, workingHoursEnd: event.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-300">
                Days off <span className="text-gray-500">(comma separated)</span>
              </label>
              <Input
                value={form.daysOff}
                onChange={(event) => setForm({ ...form, daysOff: event.target.value })}
                placeholder="sunday, saturday"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Adding..." : "Add employee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
