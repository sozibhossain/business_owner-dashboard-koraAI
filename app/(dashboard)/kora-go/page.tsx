/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { employeesApi, koraGoApi, requestsApi } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { asArray, formatDate, getInitials, timeAgo } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowRight,
  BarChart3,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Coffee,
  Download,
  KeyRound,
  MessageCircle,
  MoreHorizontal,
  Plus,
  QrCode,
  Send,
  Settings,
  ShieldCheck,
  Smartphone,
  TrendingUp,
  Users,
  X,
} from "lucide-react";

const statusVariant: Record<string, any> = {
  active: "success",
  invited: "warning",
  disabled: "destructive",
  pending_verification: "secondary",
};

const requestLabels: Record<string, string> = {
  time_off: "Time Off Request",
  break_adjustment: "Break Adjustment",
  schedule_change: "Schedule Change",
  shift_swap: "Shift Swap",
};

const SparkLine = ({ color = "#0ea5e9" }: { color?: string }) => (
  <svg viewBox="0 0 96 36" className="h-10 w-20 shrink-0" preserveAspectRatio="none">
    <path
      d="M2 28 C10 21 15 22 22 16 S34 30 42 20 S55 4 64 16 S78 20 94 3"
      fill="none"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
    />
  </svg>
);

const MiniPhone = ({ requestsCount }: { requestsCount: number }) => (
  <div className="mx-auto w-[196px] rounded-[34px] border-[7px] border-black bg-[#07111f] p-3 shadow-[0_0_34px_rgba(37,99,235,0.22)]">
    <div className="mx-auto -mt-1 mb-3 h-4 w-20 rounded-b-2xl bg-black" />
    <div className="mb-5 flex items-start justify-between">
      <div>
        <p className="text-[10px] text-gray-300">Good morning,</p>
        <p className="text-lg font-bold leading-none text-white">Max!</p>
      </div>
      <Bell className="h-4 w-4 text-gray-300" />
    </div>
    <div className="rounded-xl border border-[#1e2d40] bg-[#0d1a2d] p-3">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[10px] font-semibold text-white">Today&apos;s Schedule</p>
        <p className="text-[9px] text-blue-400">{requestsCount || 3} Appointments</p>
      </div>
      {[
        ["10:00 AM", "Haircut", "John Doe"],
        ["11:30 AM", "Beard Trim", "Michael Smith"],
        ["1:00 PM", "Haircut", "David Johnson"],
      ].map((item) => (
        <div key={item[0]} className="mb-2 rounded-lg bg-[#07111f] px-2 py-2 last:mb-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[9px] font-medium text-gray-200">{item[0]}</p>
            <div className="min-w-0 text-right">
              <p className="truncate text-[9px] font-semibold text-gray-200">{item[1]}</p>
              <p className="truncate text-[8px] text-gray-500">{item[2]}</p>
            </div>
          </div>
        </div>
      ))}
      <button className="mt-2 w-full rounded-lg bg-[#101c31] py-2 text-[9px] text-gray-200">
        View full schedule
      </button>
    </div>
    <div className="mt-4">
      <p className="mb-2 text-[10px] font-semibold text-white">Quick Actions</p>
      <div className="grid grid-cols-4 gap-2">
        {[
          [MessageCircle, "Request", "bg-purple-500/20 text-purple-300"],
          [CalendarDays, "Calendar", "bg-blue-500/20 text-blue-300"],
          [ClipboardCheck, "Tasks", "bg-emerald-500/20 text-emerald-300"],
          [Bell, "Inbox", "bg-orange-500/20 text-orange-300"],
        ].map(([Icon, label, tone]) => (
          <div key={String(label)} className="flex flex-col items-center gap-1">
            <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${tone}`}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <span className="text-[8px] text-gray-400">{String(label)}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const QrPattern = () => (
  <div className="grid h-24 w-24 grid-cols-7 gap-1 rounded-xl border border-blue-400/50 bg-white p-2 shadow-[0_0_18px_rgba(59,130,246,0.35)]">
    {Array.from({ length: 49 }).map((_, index) => {
      const filled = [0, 1, 2, 4, 5, 6, 7, 14, 21, 28, 35, 42, 43, 44, 9, 10, 16, 17, 24, 30, 32, 33, 36, 38, 40, 45, 48].includes(index);
      return <span key={index} className={filled ? "rounded-sm bg-black" : "rounded-sm bg-white"} />;
    })}
  </div>
);

const normalizeEmployee = (entry: any) => entry.old_employee_id || {};
const employeeName = (entry: any) => normalizeEmployee(entry)?.name || "Employee";
const requestName = (request: any) => request.employees_id?.name || "Employee";

export default function KoraGoPage() {
  const queryClient = useQueryClient();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  const { data: overviewResponse, isLoading: overviewLoading } = useQuery({
    queryKey: ["kora-go-overview"],
    queryFn: () => koraGoApi.getDashboard().then((response) => response.data),
  });

  const { data: activityResponse, isLoading: activityLoading } = useQuery({
    queryKey: ["kora-go-live-activity"],
    queryFn: () => koraGoApi.getLiveActivity().then((response) => response.data),
    refetchInterval: 30000,
  });

  const { data: requestsResponse } = useQuery({
    queryKey: ["kora-go-app-requests"],
    queryFn: () => koraGoApi.getAppRequests({ limit: 20 }).then((response) => response.data),
    refetchInterval: 30000,
  });

  const { data: settingsResponse } = useQuery({
    queryKey: ["kora-go-settings"],
    queryFn: () => koraGoApi.getSettings().then((response) => response.data),
  });

  const { data: employeesResponse } = useQuery({
    queryKey: ["kora-go-employee-roster"],
    queryFn: () => employeesApi.getAll({ limit: 100 }).then((response) => response.data),
  });

  const inviteMutation = useMutation({
    mutationFn: (employeeId: string) => koraGoApi.inviteEmployee({ employee_id: employeeId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kora-go-overview"] });
      queryClient.invalidateQueries({ queryKey: ["kora-go-settings"] });
      setInviteModalOpen(false);
      toast.success("Invitation sent");
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message || "Failed to send invitation"),
  });

  const accessMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      koraGoApi.updateAccess(id, { status }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["kora-go-overview"] });
      queryClient.invalidateQueries({ queryKey: ["kora-go-settings"] });
      queryClient.invalidateQueries({ queryKey: ["kora-go-live-activity"] });
      toast.success(`Access marked ${variables.status}`);
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message || "Failed to update access"),
  });

  const requestMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "approve" | "reject" }) =>
      action === "approve" ? requestsApi.approve(id) : requestsApi.reject(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["kora-go-app-requests"] });
      toast.success(`Request ${variables.action === "approve" ? "approved" : "rejected"}`);
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message || "Failed to update request"),
  });

  const overview = overviewResponse?.data || {};
  const summary = overview.summary || {};
  const accessEntries = useMemo(() => {
    const settingsEntries = asArray(settingsResponse?.data?.employees);
    return settingsEntries.length ? settingsEntries : asArray(overview.employees);
  }, [overview.employees, settingsResponse?.data?.employees]);
  const liveActivity = asArray(activityResponse?.data?.currentlyActive);
  const appRequests = asArray(requestsResponse?.data);
  const employees = useMemo(() => asArray(employeesResponse?.data), [employeesResponse?.data]);
  const requestSummary = useMemo(
    () =>
      appRequests.reduce(
        (totals: Record<string, number>, request: any) => {
          const status = String(request.status || "pending").toLowerCase();
          totals[status] = (totals[status] || 0) + 1;
          return totals;
        },
        { pending: 0, approved: 0, rejected: 0 }
      ),
    [appRequests]
  );
  const accessStatusCounts = useMemo(
    () =>
      accessEntries.reduce(
        (totals: Record<string, number>, entry: any) => {
          const status = String(entry.status || "disabled").toLowerCase();
          totals[status] = (totals[status] || 0) + 1;
          return totals;
        },
        { active: 0, invited: 0, disabled: 0, pending_verification: 0 }
      ),
    [accessEntries]
  );

  const invitedUserIds = useMemo(
    () => new Set(accessEntries.map((entry: any) => String(entry.old_employee_id?._id || entry.old_employee_id))),
    [accessEntries]
  );

  const employeesAvailableToInvite = useMemo(
    () =>
      employees.filter((employee: any) => !invitedUserIds.has(String(employee.userId?._id))),
    [employees, invitedUserIds]
  );

  const stats = [
    {
      label: "Employees with App Access",
      value: summary.totalWithAccess || 0,
      helper: `${summary.activeEmployeesCount || 0} active users`,
      icon: Users,
      tone: "bg-purple-500/20 text-purple-300",
      spark: null,
    },
    {
      label: "Active Now",
      value: summary.activeNow || 0,
      helper: `${activityResponse?.data?.activeInLastHour || 0} active in the last hour`,
      icon: CheckCircle2,
      tone: "bg-emerald-500/20 text-emerald-300",
      spark: "#22c55e",
    },
    {
      label: "Pending Invites",
      value: summary.pendingInvites || 0,
      helper: "Send invitations",
      icon: Send,
      tone: "bg-orange-500/20 text-orange-300",
      spark: null,
    },
    {
      label: "App Activity Today",
      value: summary.appActivityToday || 0,
      helper: `${activityResponse?.data?.activeInLastDay || 0} active in 24h`,
      icon: TrendingUp,
      tone: "bg-blue-500/20 text-blue-300",
      spark: "#0ea5e9",
    },
  ];

  const shortcuts = [
    { icon: ShieldCheck, title: "Permissions", sub: "Control employee access", tone: "bg-blue-500/15 text-blue-400" },
    { icon: Bell, title: "Notifications", sub: "Push, request, schedule alerts", tone: "bg-red-500/15 text-red-400" },
    { icon: QrCode, title: "QR Onboarding", sub: "Share app download links", tone: "bg-emerald-500/15 text-emerald-400" },
    { icon: Settings, title: "App Settings", sub: "Visibility and controls", tone: "bg-sky-500/15 text-sky-400" },
  ];

  const analytics = [
    {
      label: "Daily Active Users",
      value: activityResponse?.data?.activeInLastDay || summary.activeNow || 0,
      helper: "Employees active today",
    },
    {
      label: "Weekly Active Users",
      value: activityResponse?.data?.activeInLastWeek || summary.activeEmployeesCount || 0,
      helper: "Rolling 7 day usage",
    },
    {
      label: "Requests Submitted",
      value: appRequests.length,
      helper: `${requestSummary.pending || 0} awaiting review`,
    },
    {
      label: "Adoption Rate",
      value: `${employees.length ? Math.round(((summary.totalWithAccess || 0) / employees.length) * 100) : 0}%`,
      helper: `${summary.totalWithAccess || 0} of ${employees.length || 0} employees`,
    },
  ];

  return (
    <div>
      <Header
        title="Kora Go"
        subtitle="Manage your mobile app, control access and monitor your team in real time."
      />
      <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
        <DialogContent className="max-w-3xl p-0">
          <DialogHeader className="border-b border-[#1e2d40] px-5 py-4">
            <DialogTitle className="text-base">Invite Employee</DialogTitle>
            <DialogDescription>
              Choose an employee to send a Kora Go mobile app invitation.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto px-5 pb-5">
            {employeesAvailableToInvite.length === 0 ? (
              <p className="rounded-xl border border-[#1e2d40] bg-[#07111f] py-10 text-center text-sm text-gray-500">
                All employees already have Kora Go records.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {employeesAvailableToInvite.map((employee: any) => (
                  <button
                    key={employee._id}
                    type="button"
                    disabled={inviteMutation.isPending}
                    onClick={() => inviteMutation.mutate(String(employee._id))}
                    className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-[#1e2d40] bg-[#0d1a2d] px-3 py-2.5 text-left transition-colors hover:border-blue-500/50 hover:bg-[#10213a] disabled:opacity-60"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold text-white">
                        {employee.userId?.name || employee.name || "Employee"}
                      </span>
                      <span className="block truncate text-[10px] text-gray-500">
                        {employee.position || employee.role || "Employee"}
                      </span>
                    </span>
                    <Send className="h-4 w-4 shrink-0 text-blue-400" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <div className="space-y-3 p-3 sm:p-4 lg:p-6">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_370px]">
          <div className="min-w-0 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {overviewLoading
                ? Array.from({ length: 4 }).map((_, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <Skeleton className="h-20 w-full" />
                      </CardContent>
                    </Card>
                  ))
                : stats.map((item) => (
                    <Card key={item.label} className="overflow-hidden bg-[#091526]">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${item.tone}`}>
                              <item.icon className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13px] font-semibold leading-snug text-gray-100">{item.label}</p>
                              <p className="mt-2 text-3xl font-bold leading-none text-white">{item.value}</p>
                              <p className="mt-2 text-[11px] text-gray-400">{item.helper}</p>
                            </div>
                          </div>
                          {item.spark ? <SparkLine color={item.spark} /> : null}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
            </div>

            <div className="grid grid-cols-1 gap-3 2xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
              <Card className="min-w-0 bg-[#091526]">
                <CardContent className="p-0">
                  <div className="flex flex-col gap-3 border-b border-[#1e2d40] p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-white">Access Management</h2>
                      <p className="mt-1 text-xs text-gray-400">Manage app access and permissions for your team.</p>
                    </div>
                    <Button
                      className="h-9 gap-2 rounded-lg bg-blue-600 px-4 text-xs hover:bg-blue-700"
                      onClick={() => setInviteModalOpen(true)}
                    >
                      <Plus className="h-4 w-4" />
                      Invite Employee
                    </Button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left">
                      <thead className="border-b border-[#1e2d40] text-[11px] uppercase text-gray-500">
                        <tr>
                          <th className="px-4 py-3 font-medium">Employee</th>
                          <th className="px-4 py-3 font-medium">Status</th>
                          <th className="px-4 py-3 font-medium">Role</th>
                          <th className="px-4 py-3 font-medium">Last Active</th>
                          <th className="px-4 py-3 text-right font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1e2d40]">
                        {overviewLoading
                          ? Array.from({ length: 5 }).map((_, index) => (
                              <tr key={index}>
                                <td colSpan={5} className="px-4 py-4">
                                  <Skeleton className="h-12 w-full" />
                                </td>
                              </tr>
                            ))
                          : accessEntries.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-500">
                                  No employees have Kora Go access yet.
                                </td>
                              </tr>
                            )
                          : accessEntries.slice(0, 5).map((entry: any) => {
                              const name = employeeName(entry);
                              const status = String(entry.status || "disabled").toLowerCase();
                              return (
                                <tr key={entry._id} className="hover:bg-[#0d1a2d]/60">
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                      <div className="relative">
                                        <Avatar className="h-10 w-10">
                                          <AvatarFallback className="text-xs">{getInitials(name)}</AvatarFallback>
                                        </Avatar>
                                        {status === "active" ? (
                                          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#091526] bg-emerald-400" />
                                        ) : null}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-gray-100">{name}</p>
                                        <p className="truncate text-[11px] text-gray-500">
                                          {normalizeEmployee(entry)?.email || "No email"}
                                        </p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <Badge variant={statusVariant[status] || "secondary"} className="capitalize">
                                      <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${status === "active" ? "bg-emerald-400" : status === "invited" ? "bg-amber-400" : "bg-red-400"}`} />
                                      {status}
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-300">
                                    {entry.role || normalizeEmployee(entry)?.position || "Employee"}
                                  </td>
                                  <td className="px-4 py-3">
                                    <p className={status === "invited" ? "text-sm text-amber-400" : "text-sm text-emerald-400"}>
                                      {status === "invited" ? "Invited" : entry.lastActive ? "Online" : "--"}
                                    </p>
                                    <p className="text-[11px] text-gray-500">
                                      {entry.lastActive ? timeAgo(entry.lastActive) : entry.inviteTokenExpiry ? `Expires ${formatDate(entry.inviteTokenExpiry)}` : "--"}
                                    </p>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        size="icon"
                                        variant="outline"
                                        className="h-8 w-8 rounded-lg"
                                        disabled={accessMutation.isPending}
                                        onClick={() =>
                                          accessMutation.mutate({
                                            id: String(entry._id),
                                            status: status === "active" ? "disabled" : "active",
                                          })
                                        }
                                        title={status === "active" ? "Disable access" : "Enable access"}
                                      >
                                        {status === "active" ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                                      </Button>
                                      <Button size="icon" variant="outline" className="h-8 w-8 rounded-lg" title="Access key">
                                        <KeyRound className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button size="icon" variant="outline" className="h-8 w-8 rounded-lg" title="More actions">
                                        <MoreHorizontal className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                      </tbody>
                    </table>
                  </div>
                  <div className="border-t border-[#1e2d40] px-4 py-3 text-center">
                    <button className="inline-flex items-center gap-2 text-xs font-medium text-blue-400 hover:text-blue-300">
                      View all employees <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#091526]">
                <CardContent className="p-0">
                  <div className="border-b border-[#1e2d40] p-4">
                    <h2 className="text-base font-semibold text-white">Live App Activity</h2>
                    <p className="mt-1 text-xs text-gray-400">Real-time app actions, refreshed automatically.</p>
                  </div>
                  <div className="divide-y divide-[#1e2d40] p-4 pt-2">
                    {activityLoading
                      ? Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="my-3 h-12 w-full" />)
                      : liveActivity.length === 0
                        ? <p className="py-8 text-center text-sm text-gray-500">No recent mobile activity found.</p>
                        : liveActivity.slice(0, 5).map((activity: any, index) => {
                            const Icon = [CheckCircle2, CalendarDays, ClipboardCheck, Coffee, CalendarDays][index % 5];
                            const tones = ["bg-emerald-500/15 text-emerald-400", "bg-purple-500/15 text-purple-400", "bg-blue-500/15 text-blue-400", "bg-orange-500/15 text-orange-400", "bg-purple-500/15 text-purple-400"];
                            return (
                              <div key={`${activity.employee?.id || index}-${activity.lastActive}`} className="flex items-center gap-3 py-3">
                                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${tones[index % tones.length]}`}>
                                  <Icon className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-semibold text-gray-100">{activity.employee?.name || "Employee"}</p>
                                  <p className="truncate text-[11px] text-gray-400">
                                    {index === 1 ? "Created request" : index === 2 ? "Completed task" : index === 3 ? "Started break" : "Checked in"}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[11px] text-gray-400">{activity.lastActive ? timeAgo(activity.lastActive) : "Never"}</p>
                                  <span className={`mt-1 inline-block h-1.5 w-1.5 rounded-full ${index % 3 === 0 ? "bg-emerald-400" : index % 3 === 1 ? "bg-purple-400" : "bg-blue-400"}`} />
                                </div>
                              </div>
                            );
                          })}
                  </div>
                  <div className="border-t border-[#1e2d40] px-4 py-3 text-center">
                    <button className="inline-flex items-center gap-2 text-xs font-medium text-blue-400 hover:text-blue-300">
                      View all activity <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-[#091526]">
              <CardContent className="p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-white">Requests from App</h2>
                    <p className="mt-1 text-xs text-gray-400">Manage requests submitted by your team.</p>
                  </div>
                  <button className="inline-flex items-center gap-2 text-xs font-medium text-blue-400 hover:text-blue-300">
                    View all requests <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mb-3 grid gap-2 sm:grid-cols-3">
                  {[
                    ["Pending", requestSummary.pending || 0, "text-amber-400"],
                    ["Approved", requestSummary.approved || 0, "text-emerald-400"],
                    ["Rejected", requestSummary.rejected || 0, "text-red-400"],
                  ].map(([label, value, tone]) => (
                    <div key={String(label)} className="rounded-xl border border-[#1e2d40] bg-[#07111f] px-3 py-2">
                      <p className={`text-lg font-bold ${tone}`}>{value}</p>
                      <p className="text-[11px] text-gray-500">{label}</p>
                    </div>
                  ))}
                </div>
                {appRequests.length === 0 ? (
                  <p className="rounded-xl border border-[#1e2d40] bg-[#07111f] py-10 text-center text-sm text-gray-500">
                    No pending requests from the app.
                  </p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-3">
                    {appRequests.slice(0, 3).map((request: any) => {
                      const requestStatus = String(request.status || "pending").toLowerCase();
                      return (
                      <div key={request._id} className="rounded-xl border border-[#1e2d40] bg-[#07111f] p-4">
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="text-xs">{getInitials(requestName(request))}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-gray-100">{requestName(request)}</p>
                              <p className="truncate text-[11px] text-gray-400">
                                {requestLabels[request.type] || String(request.type || "Request").replace(/_/g, " ")}
                              </p>
                            </div>
                          </div>
                          <Badge
                            variant={requestStatus === "approved" ? "success" : requestStatus === "rejected" ? "destructive" : "warning"}
                            className="shrink-0 text-[10px] capitalize"
                          >
                            {requestStatus}
                          </Badge>
                        </div>
                        <p className="min-h-10 text-xs leading-relaxed text-gray-400">
                          {request.reason || request.dateRange?.start
                            ? `${request.dateRange?.start ? formatDate(request.dateRange.start) : ""}${request.dateRange?.end ? ` - ${formatDate(request.dateRange.end)}` : ""}`
                            : "No additional details provided."}
                        </p>
                        <div className="mt-4 grid grid-cols-3 gap-2">
                          <Button variant="outline" className="h-8 rounded-lg text-[11px]">View</Button>
                          <Button
                            className="h-8 rounded-lg bg-emerald-600/15 text-[11px] text-emerald-400 hover:bg-emerald-600/25"
                            disabled={requestMutation.isPending || requestStatus !== "pending"}
                            onClick={() => requestMutation.mutate({ id: String(request._id), action: "approve" })}
                          >
                            Approve
                          </Button>
                          <Button
                            className="h-8 rounded-lg bg-red-600/15 text-[11px] text-red-400 hover:bg-red-600/25"
                            disabled={requestMutation.isPending || requestStatus !== "pending"}
                            onClick={() => requestMutation.mutate({ id: String(request._id), action: "reject" })}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-3">
            <Card className="bg-[#091526]">
              <CardContent className="p-4">
                <h2 className="text-base font-semibold text-white">Mobile App Preview</h2>
                <p className="mt-1 text-xs text-gray-400">See how your team experiences Kora Go.</p>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[
                    ["Active", accessStatusCounts.active || 0, "text-emerald-400"],
                    ["Invited", accessStatusCounts.invited || 0, "text-amber-400"],
                    ["Disabled", accessStatusCounts.disabled || 0, "text-red-400"],
                  ].map(([label, value, tone]) => (
                    <div key={String(label)} className="rounded-xl border border-[#1e2d40] bg-[#07111f] p-2 text-center">
                      <p className={`text-base font-bold ${tone}`}>{value}</p>
                      <p className="text-[10px] text-gray-500">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5">
                  <MiniPhone requestsCount={appRequests.length} />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#091526]">
              <CardContent className="p-4">
                <h2 className="text-base font-semibold text-white">App Administration</h2>
                <p className="mt-1 text-xs text-gray-400">Manage mobile app permissions and notifications.</p>
                <div className="grid grid-cols-2 gap-3">
                  {shortcuts.map((shortcut) => (
                    <button
                      key={shortcut.title}
                      className="flex items-center gap-3 rounded-xl border border-[#1e2d40] bg-[#07111f] p-3 text-left transition-colors hover:border-blue-500/40"
                    >
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${shortcut.tone}`}>
                        <shortcut.icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold text-gray-100">{shortcut.title}</span>
                        <span className="block truncate text-[10px] text-gray-500">{shortcut.sub}</span>
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-500" />
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#091526]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-white">Get the Kora Go App</h2>
                    <p className="mt-2 text-xs leading-relaxed text-gray-400">
                      Share the QR code or download links with employees.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <button className="inline-flex items-center gap-1.5 rounded-lg border border-[#1e2d40] bg-black px-3 py-2 text-[10px] font-semibold text-white transition-colors hover:border-blue-500/50">
                        <Smartphone className="h-3.5 w-3.5" />
                        App Store
                      </button>
                      <button className="inline-flex items-center gap-1.5 rounded-lg border border-[#1e2d40] bg-black px-3 py-2 text-[10px] font-semibold text-white transition-colors hover:border-blue-500/50">
                        <Download className="h-3.5 w-3.5" />
                        Google Play
                      </button>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {summary.totalWithAccess ? <QrPattern /> : <QrCode className="h-24 w-24 rounded-xl border border-[#1e2d40] p-5 text-blue-400" />}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#091526]">
              <CardContent className="p-4">
                <div className="mb-3 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-blue-400" />
                  <h2 className="text-base font-semibold text-white">Mobile Workforce Analytics</h2>
                </div>
                <div className="space-y-2">
                  {analytics.map((item) => (
                    <div key={item.label} className="rounded-xl border border-[#1e2d40] bg-[#07111f] p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold text-gray-200">{item.label}</p>
                        <p className="text-lg font-bold text-white">{item.value}</p>
                      </div>
                      <p className="mt-1 text-[11px] text-gray-500">{item.helper}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}
