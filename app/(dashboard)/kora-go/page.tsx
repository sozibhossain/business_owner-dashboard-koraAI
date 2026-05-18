/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { employeesApi, koraGoApi } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { getInitials, timeAgo } from "@/lib/utils";
import { toast } from "sonner";
import { Activity, Clock, Smartphone, Users } from "lucide-react";

const statusVariant: Record<string, any> = {
  active: "success",
  invited: "warning",
  disabled: "destructive",
};

export default function KoraGoPage() {
  const queryClient = useQueryClient();

  const { data: overviewResponse, isLoading: overviewLoading } = useQuery({
    queryKey: ["kora-go-overview"],
    queryFn: () => koraGoApi.getDashboard().then((response) => response.data),
  });

  const { data: activityResponse, isLoading: activityLoading } = useQuery({
    queryKey: ["kora-go-live-activity"],
    queryFn: () => koraGoApi.getLiveActivity().then((response) => response.data),
  });

  const { data: requestsResponse } = useQuery({
    queryKey: ["kora-go-app-requests"],
    queryFn: () => koraGoApi.getAppRequests({ limit: 20 }).then((response) => response.data),
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

  const overview = overviewResponse?.data || {};
  const summary = overview.summary || {};
  const accessEntries = useMemo(() => overview.employees || [], [overview.employees]);
  const liveActivity = activityResponse?.data?.currentlyActive || [];
  const appRequests = requestsResponse?.data || [];
  const settings = settingsResponse?.data || {};
  const employees = useMemo(() => employeesResponse?.data || [], [employeesResponse?.data]);

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
      label: "Employees With Access",
      value: summary.totalWithAccess || 0,
      helper: `${summary.pendingInvites || 0} invite(s) pending`,
      icon: Users,
      color: "bg-blue-600",
    },
    {
      label: "Active Now",
      value: summary.activeNow || 0,
      helper: `${activityResponse?.data?.activeInLastHour || 0} active in the last hour`,
      icon: Activity,
      color: "bg-emerald-600",
    },
    {
      label: "Activity Today",
      value: summary.appActivityToday || 0,
      helper: `${activityResponse?.data?.activeInLastDay || 0} active in the last 24h`,
      icon: Smartphone,
      color: "bg-purple-600",
    },
    {
      label: "Pending App Requests",
      value: appRequests.length,
      helper: "Requests submitted from the mobile app",
      icon: Clock,
      color: "bg-amber-600",
    },
  ];

  return (
    <div>
      <Header
        title="Kora Go"
        subtitle="Manage employee app access, live activity, and mobile requests using backend data."
      />
      <div className="p-6 space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {overviewLoading
            ? Array.from({ length: 4 }).map((_, index) => (
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
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Access Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {overviewLoading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-20 w-full" />
                  ))
                ) : accessEntries.length === 0 ? (
                  <p className="text-sm text-gray-500">No employees have Kora Go access yet.</p>
                ) : (
                  accessEntries.map((entry: any) => (
                    <div
                      key={entry._id}
                      className="rounded-xl border border-[#1e2d40] bg-[#0d1a2d] p-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback>
                              {getInitials(entry.old_employee_id?.name || "EM")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-100 truncate">
                              {entry.old_employee_id?.name || "Employee"}
                            </p>
                            <p className="text-xs text-gray-400 truncate">
                              {entry.old_employee_id?.email || "No email"}
                            </p>
                            <p className="text-[10px] text-gray-500">
                              {entry.role || entry.old_employee_id?.position || "Employee"}{" "}
                              {entry.appVersion ? `• app ${entry.appVersion}` : ""}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={statusVariant[entry.status] || "secondary"} className="text-[10px]">
                            {entry.status}
                          </Badge>
                          {entry.status !== "active" ? (
                            <Button
                              size="sm"
                              className="h-7 text-[10px]"
                              disabled={accessMutation.isPending}
                              onClick={() =>
                                accessMutation.mutate({ id: String(entry._id), status: "active" })
                              }
                            >
                              Enable
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px]"
                              disabled={accessMutation.isPending}
                              onClick={() =>
                                accessMutation.mutate({ id: String(entry._id), status: "disabled" })
                              }
                            >
                              Disable
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 text-xs">
                        <div className="rounded-lg bg-[#1e2d40] p-2">
                          <p className="text-[10px] text-gray-500">Last Active</p>
                          <p className="text-gray-200">
                            {entry.lastActive ? timeAgo(entry.lastActive) : "Never"}
                          </p>
                        </div>
                        <div className="rounded-lg bg-[#1e2d40] p-2">
                          <p className="text-[10px] text-gray-500">Activated</p>
                          <p className="text-gray-200">
                            {entry.activatedAt ? timeAgo(entry.activatedAt) : "Not activated"}
                          </p>
                        </div>
                        <div className="rounded-lg bg-[#1e2d40] p-2">
                          <p className="text-[10px] text-gray-500">Invite Expiry</p>
                          <p className="text-gray-200">
                            {entry.inviteTokenExpiry ? timeAgo(entry.inviteTokenExpiry) : "N/A"}
                          </p>
                        </div>
                        <div className="rounded-lg bg-[#1e2d40] p-2">
                          <p className="text-[10px] text-gray-500">Device</p>
                          <p className="text-gray-200">
                            {entry.deviceInfo?.platform || entry.deviceInfo?.deviceName || "Unknown"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Live App Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {activityLoading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={index} className="h-16 w-full" />
                  ))
                ) : liveActivity.length === 0 ? (
                  <p className="text-sm text-gray-500">No recent mobile activity found.</p>
                ) : (
                  liveActivity.map((activity: any) => (
                    <div key={activity.employee?.id || activity.lastActive} className="flex items-center gap-3 py-2 border-b border-[#1e2d40] last:border-0">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs">
                          {getInitials(activity.employee?.name || "EM")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-200">
                          {activity.employee?.name || "Employee"}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          {activity.employee?.position || "Employee"}{" "}
                          {activity.appVersion ? `• version ${activity.appVersion}` : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={statusVariant[activity.status] || "secondary"} className="text-[10px]">
                          {activity.status}
                        </Badge>
                        <p className="text-[10px] text-gray-500 mt-1">
                          {activity.lastActive ? timeAgo(activity.lastActive) : "Never"}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Invite Employees</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {employeesAvailableToInvite.slice(0, 5).map((employee: any) => (
                  <div key={employee._id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-200 truncate">
                        {employee.userId?.name || "Employee"}
                      </p>
                      <p className="text-[10px] text-gray-500 truncate">
                        {employee.position || "Employee"}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[10px]"
                      disabled={inviteMutation.isPending}
                      onClick={() => inviteMutation.mutate(String(employee._id))}
                    >
                      Invite
                    </Button>
                  </div>
                ))}
                {employeesAvailableToInvite.length === 0 ? (
                  <p className="text-sm text-gray-500">All employees already have Kora Go records.</p>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Pending App Requests</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {appRequests.length === 0 ? (
                  <p className="text-sm text-gray-500">No pending requests from the app.</p>
                ) : (
                  appRequests.slice(0, 6).map((request: any) => (
                    <div key={request._id} className="rounded-lg bg-[#1e2d40] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-gray-200">
                          {request.employees_id?.name || "Employee"}
                        </p>
                        <Badge variant="warning" className="text-[10px]">
                          {request.type}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1">
                        {request.reason || "No reason provided"}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">App Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-[#1e2d40]">
                  <span className="text-gray-500">App Version</span>
                  <span className="text-gray-200">{settings.appConfig?.version || "N/A"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#1e2d40]">
                  <span className="text-gray-500">Minimum Version</span>
                  <span className="text-gray-200">{settings.appConfig?.minVersion || "N/A"}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">Expired Invites</span>
                  <span className="text-gray-200">{settings.summary?.expiredInvites || 0}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
