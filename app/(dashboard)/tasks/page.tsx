/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { appointmentsApi, employeesApi } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, getInitials } from "@/lib/utils";
import { Calendar, Clock3, Users } from "lucide-react";

const startOfWeek = (date: Date) => {
  const next = new Date(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  next.setHours(0, 0, 0, 0);
  return next;
};

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getAppointmentGuestName = (appointment: any) =>
  appointment.customer?.name || appointment.client?.name || "Customer";

export default function TasksPage() {
  const [anchorDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(toDateKey(startOfWeek(anchorDate)));

  const weekDays = useMemo(() => {
    const start = startOfWeek(anchorDate);
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return day;
    });
  }, [anchorDate]);

  const { data: employeesResponse, isLoading: employeesLoading } = useQuery({
    queryKey: ["tasks-employees"],
    queryFn: () => employeesApi.getAll({ limit: 100 }).then((response) => response.data),
  });

  const { data: weeklyAppointmentsResponse, isLoading: appointmentsLoading } = useQuery({
    queryKey: ["tasks-weekly-appointments", weekDays.map(toDateKey).join(",")],
    queryFn: async () => {
      const responses = await Promise.all(
        weekDays.map((day) =>
          appointmentsApi
            .getAll({ date: toDateKey(day), limit: 200 })
            .then((response) => ({
              date: toDateKey(day),
              items: response.data.data || [],
            }))
        )
      );

      return responses;
    },
  });

  const employees = useMemo(() => employeesResponse?.data || [], [employeesResponse?.data]);
  const dailyAppointments = useMemo(
    () => weeklyAppointmentsResponse || [],
    [weeklyAppointmentsResponse]
  );

  const appointmentsByDay = useMemo(() => {
    return dailyAppointments.reduce((acc: Record<string, any[]>, item: any) => {
      acc[item.date] = item.items || [];
      return acc;
    }, {});
  }, [dailyAppointments]);

  const employeeSchedule = useMemo(() => {
    return employees.map((employee: any) => {
      const counts = weekDays.map((day) => {
        const key = toDateKey(day);
        const items = (appointmentsByDay[key] || []).filter(
          (appointment: any) => String(appointment.employee?._id) === String(employee.userId?._id)
        );

        return {
          date: key,
          count: items.length,
          appointments: items,
        };
      });

      return {
        employee,
        counts,
      };
    });
  }, [appointmentsByDay, employees, weekDays]);

  const selectedAppointments = appointmentsByDay[selectedDay] || [];
  const selectedDateObject = weekDays.find((day) => toDateKey(day) === selectedDay) || weekDays[0];

  const stats = [
    {
      label: "Employees Scheduled",
      value: employeeSchedule.filter((entry: any) => entry.counts.some((count: any) => count.count > 0)).length,
      helper: "At least one booking this week",
      icon: Users,
      color: "bg-blue-600",
    },
    {
      label: "Appointments This Week",
      value: dailyAppointments.reduce((sum: number, item: any) => sum + (item.items?.length || 0), 0),
      helper: "Weekly booking volume",
      icon: Calendar,
      color: "bg-emerald-600",
    },
    {
      label: "Selected Day",
      value: selectedAppointments.length,
      helper: formatDate(selectedDateObject),
      icon: Clock3,
      color: "bg-purple-600",
    },
  ];

  return (
    <div>
      <Header
        title="Weekly Tasks"
        subtitle="Live employee schedule coverage built from appointment and employee data."
      />
      <div className="p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(employeesLoading || appointmentsLoading)
            ? Array.from({ length: 3 }).map((_, index) => (
                <Card key={index}>
                  <CardContent className="pt-4">
                    <Skeleton className="h-12 w-full" />
                  </CardContent>
                </Card>
              ))
            : stats.map((item) => (
                <Card key={item.label}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-lg ${item.color} flex items-center justify-center flex-shrink-0`}
                      >
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
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm">Employee Capacity Board</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {employeesLoading || appointmentsLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full" />
                ))
              ) : employeeSchedule.length === 0 ? (
                <p className="text-sm text-gray-500">No employees found.</p>
              ) : (
                employeeSchedule.map((entry: any) => (
                  <div key={entry.employee._id} className="rounded-xl border border-[#1e2d40]">
                    <div className="px-4 py-3 border-b border-[#1e2d40] flex items-center gap-3">
                      <Avatar className="w-9 h-9">
                        <AvatarFallback className="text-xs">
                          {getInitials(entry.employee.userId?.name || "EM")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-gray-200">
                          {entry.employee.userId?.name || "Employee"}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          {entry.employee.position || "Employee"}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-7 gap-2 p-4">
                      {entry.counts.map((count: any) => (
                        <button
                          key={`${entry.employee._id}-${count.date}`}
                          type="button"
                          onClick={() => setSelectedDay(count.date)}
                          className={`rounded-lg border p-2 text-left transition-colors ${selectedDay === count.date ? "border-blue-500 bg-blue-600/10" : "border-[#1e2d40] bg-[#1e2d40]"}`}
                        >
                          <p className="text-[10px] text-gray-500">
                            {count.date.slice(5)}
                          </p>
                          <p className="text-sm font-bold text-white mt-1">{count.count}</p>
                          <p className="text-[10px] text-gray-400">appointments</p>
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Day Detail</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {weekDays.map((day) => {
                  const key = toDateKey(day);
                  return (
                    <Button
                      key={key}
                      variant={selectedDay === key ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-[10px]"
                      onClick={() => setSelectedDay(key)}
                    >
                      {day.toLocaleDateString("en-US", { weekday: "short" })}
                    </Button>
                  );
                })}
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-100">
                  {formatDate(selectedDateObject)}
                </p>
                <p className="text-[10px] text-gray-500">
                  {selectedAppointments.length} appointment(s) scheduled
                </p>
              </div>

              {selectedAppointments.length === 0 ? (
                <p className="text-sm text-gray-500">No appointments for this day.</p>
              ) : (
                selectedAppointments.map((appointment: any) => (
                  <div key={appointment._id} className="rounded-lg bg-[#1e2d40] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-gray-200">
                        {getAppointmentGuestName(appointment)}
                      </p>
                      <Badge variant="secondary" className="text-[10px]">
                        {appointment.status}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1">
                      {appointment.startTime} - {appointment.endTime}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      Assigned to {appointment.employee?.name || "Employee"}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
