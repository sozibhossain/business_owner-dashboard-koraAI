"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { employeesApi } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { getInitials, formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import {
  Users,
  UserCheck,
  Clock,
  BarChart2,
  Search,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const STATUS_OPTIONS = ["working", "on_break", "off", "on_leave"] as const;

const statusLabels: Record<string, { label: string; variant: any }> = {
  working: { label: "Working", variant: "success" },
  on_break: { label: "On Break", variant: "warning" },
  off: { label: "Off", variant: "secondary" },
  on_leave: { label: "On Leave", variant: "purple" },
};

export default function EmployeesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["employees", search],
    queryFn: () =>
      employeesApi.getAll({ limit: 100, search: search || undefined }).then((response) => response.data),
  });

  const employees = data?.data || [];
  const summary = data?.meta?.summary;

  useEffect(() => {
    if (!selectedId && employees.length > 0) {
      setSelectedId(String(employees[0]._id));
    }
  }, [employees, selectedId]);

  const selectedEmployee = useMemo(
    () => employees.find((employee: any) => String(employee._id) === selectedId) || null,
    [employees, selectedId]
  );

  const { data: scheduleData, isLoading: scheduleLoading } = useQuery({
    queryKey: ["employee-schedule", selectedId],
    enabled: Boolean(selectedId),
    queryFn: () => employeesApi.getSchedule(String(selectedId)).then((response) => response.data.data),
  });

  const { data: performanceData } = useQuery({
    queryKey: ["employee-performance", selectedId],
    enabled: Boolean(selectedId),
    queryFn: () => employeesApi.getPerformance(String(selectedId)).then((response) => response.data.data),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      employeesApi.toggleStatus(id, { status }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["employee-performance", variables.id] });
      toast.success(`Employee marked ${statusLabels[variables.status]?.label || variables.status}`);
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message || "Failed to update employee status"),
  });

  const stats = [
    {
      label: "Total Employees",
      value: summary?.totalEmployees || employees.length,
      helper: "Live backend count",
      icon: Users,
      color: "bg-blue-600",
    },
    {
      label: "Active Today",
      value: summary?.activeEmployees || employees.filter((item: any) => ["working", "on_break"].includes(item.status)).length,
      helper: "Working or on break",
      icon: UserCheck,
      color: "bg-emerald-600",
    },
    {
      label: "On Leave",
      value: employees.filter((item: any) => item.status === "on_leave").length,
      helper: "Current leave status",
      icon: Clock,
      color: "bg-amber-600",
    },
    {
      label: "Appointments Logged",
      value: summary?.totalAppointments || 0,
      helper: "From employee records",
      icon: BarChart2,
      color: "bg-purple-600",
    },
  ];

  return (
    <div>
      <Header
        title="Employees"
        subtitle="Live employee roster, schedule, and performance data from your backend."
      />
      <div className="p-6 space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((item) => (
            <Card key={item.label}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg ${item.color} flex items-center justify-center flex-shrink-0`}>
                    <item.icon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-white">{item.value}</p>
                    <p className="text-[10px] text-gray-400">{item.label}</p>
                    <p className="text-[10px] text-emerald-400">{item.helper}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <Input
                placeholder="Search employees..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-8"
              />
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Card key={index}>
                    <CardContent className="pt-4 space-y-3">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : employees.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-gray-500">No employees found.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {employees.map((employee: any) => {
                  const statusMeta = statusLabels[employee.status] || {
                    label: employee.status,
                    variant: "secondary",
                  };

                  return (
                    <Card
                      key={employee._id}
                      className={`cursor-pointer transition-colors ${selectedId === String(employee._id) ? "border-blue-600/40 bg-blue-600/5" : "hover:border-blue-600/20"}`}
                      onClick={() => setSelectedId(String(employee._id))}
                    >
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar className="w-10 h-10">
                              <AvatarFallback>
                                {getInitials(employee.userId?.name || employee.position || "EM")}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-200 truncate">
                                {employee.userId?.name || "Employee"}
                              </p>
                              <p className="text-xs text-gray-400 truncate">
                                {employee.position || "Employee"}
                              </p>
                              <Badge variant={statusMeta.variant} className="mt-1 text-[10px]">
                                {statusMeta.label}
                              </Badge>
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
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {STATUS_OPTIONS.map((status) => (
                                <DropdownMenuItem
                                  key={status}
                                  onClick={() =>
                                    toggleMutation.mutate({ id: String(employee._id), status })
                                  }
                                >
                                  Mark {statusLabels[status].label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center text-xs mt-4">
                          <div>
                            <p className="font-bold text-white">
                              {employee.totalAppointments || 0}
                            </p>
                            <p className="text-[10px] text-gray-500">Appointments</p>
                          </div>
                          <div>
                            <p className="font-bold text-white">
                              {employee.utilizationRate || 0}%
                            </p>
                            <p className="text-[10px] text-gray-500">Utilization</p>
                          </div>
                          <div>
                            <p className="font-bold text-white">
                              {employee.avgRating || 0}
                            </p>
                            <p className="text-[10px] text-gray-500">Rating</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-4">
            {selectedEmployee ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Employee Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback>
                          {getInitials(selectedEmployee.userId?.name || "EM")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-gray-100">
                          {selectedEmployee.userId?.name || "Employee"}
                        </p>
                        <p className="text-xs text-gray-400">{selectedEmployee.position}</p>
                        <p className="text-xs text-blue-400">{selectedEmployee.userId?.email}</p>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between py-1.5 border-b border-[#1e2d40]">
                        <span className="text-gray-500">Status</span>
                        <span className="text-gray-200">
                          {statusLabels[selectedEmployee.status]?.label || selectedEmployee.status}
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-[#1e2d40]">
                        <span className="text-gray-500">Working Hours</span>
                        <span className="text-gray-200">
                          {selectedEmployee.workingHours?.start || "--"} -{" "}
                          {selectedEmployee.workingHours?.end || "--"}
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-[#1e2d40]">
                        <span className="text-gray-500">Days Off</span>
                        <span className="text-gray-200">
                          {(selectedEmployee.daysOff || []).join(", ") || "None"}
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-gray-500">Total Revenue</span>
                        <span className="text-gray-200">
                          {formatCurrency(selectedEmployee.totalRevenue || 0)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Performance</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-2">
                    {[
                      {
                        label: "Completed",
                        value: performanceData?.lifetimeStats?.completedAppointments || 0,
                      },
                      {
                        label: "Upcoming",
                        value: performanceData?.lifetimeStats?.upcomingAppointments || 0,
                      },
                      {
                        label: "No Shows",
                        value: performanceData?.lifetimeStats?.noShows || 0,
                      },
                      {
                        label: "Rating",
                        value: performanceData?.lifetimeStats?.averageRating || 0,
                      },
                    ].map((item) => (
                      <div key={item.label} className="bg-[#1e2d40] rounded-lg p-3">
                        <p className="text-sm font-bold text-white">{item.value}</p>
                        <p className="text-[10px] text-gray-400">{item.label}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Upcoming Schedule</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {scheduleLoading ? (
                      <div className="space-y-2">
                        {Array.from({ length: 3 }).map((_, index) => (
                          <Skeleton key={index} className="h-12 w-full" />
                        ))}
                      </div>
                    ) : scheduleData?.schedule?.length ? (
                      <div className="space-y-2">
                        {scheduleData.schedule.slice(0, 5).map((item: any) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 py-2 border-b border-[#1e2d40] last:border-0"
                          >
                            <div className="w-16 flex-shrink-0">
                              <p className="text-[10px] text-gray-500">
                                {formatDate(item.date)}
                              </p>
                              <p className="text-xs text-gray-300">{item.startTime}</p>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-gray-200 truncate">
                                {item.customer?.name || "Customer"}
                              </p>
                              <p className="text-[10px] text-gray-500 capitalize">
                                {String(item.status).replace("_", " ")}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No scheduled appointments found.</p>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-gray-500">Select an employee to view details.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
