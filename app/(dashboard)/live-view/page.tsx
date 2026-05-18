/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { liveViewApi } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatTime, getInitials, timeAgo } from "@/lib/utils";
import { Activity, Calendar, MessageSquare, Users } from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const getHourLabel = (value: number) => `${String(value).padStart(2, "0")}:00`;

export default function LiveViewPage() {
  const { data: activityResponse, isLoading: activityLoading } = useQuery({
    queryKey: ["live-view-activity"],
    queryFn: () => liveViewApi.getActivity().then((response) => response.data),
  });

  const { data: appointmentsResponse, isLoading: appointmentsLoading } = useQuery({
    queryKey: ["live-view-appointments"],
    queryFn: () => liveViewApi.getAppointmentsToday().then((response) => response.data),
  });

  const { data: conversationsResponse, isLoading: conversationsLoading } = useQuery({
    queryKey: ["live-view-conversations"],
    queryFn: () => liveViewApi.getConversations().then((response) => response.data),
  });

  const activities = useMemo(() => activityResponse?.data || [], [activityResponse?.data]);
  const appointments = useMemo(
    () => appointmentsResponse?.data || [],
    [appointmentsResponse?.data]
  );
  const conversations = useMemo(
    () => conversationsResponse?.data || [],
    [conversationsResponse?.data]
  );

  const chartData = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, hour) => ({
      label: getHourLabel(hour),
      count: 0,
    }));

    appointments.forEach((appointment: any) => {
      if (!appointment.startTime) return;
      const hour = Number(String(appointment.startTime).split(":")[0]);
      if (!Number.isNaN(hour) && buckets[hour]) {
        buckets[hour].count += 1;
      }
    });

    return buckets;
  }, [appointments]);

  const activityByType = useMemo(() => {
    return activities.reduce((acc: Record<string, number>, item: any) => {
      const key = item.type || "other";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }, [activities]);

  const stats = [
    {
      label: "Activity Events",
      value: activities.length,
      helper: "Recent backend activity records",
      icon: Activity,
      color: "bg-blue-600",
    },
    {
      label: "Appointments Today",
      value: appointments.length,
      helper: "Fetched from appointments API",
      icon: Calendar,
      color: "bg-emerald-600",
    },
    {
      label: "Unread Conversations",
      value: conversations.reduce(
        (sum: number, conversation: any) => sum + (conversation.unreadCount || 0),
        0
      ),
      helper: `${conversations.length} active conversations`,
      icon: MessageSquare,
      color: "bg-purple-600",
    },
    {
      label: "Active Participants",
      value: new Set(
        activities
          .map((activity: any) => activity.user_id?._id)
          .filter(Boolean)
      ).size,
      helper: "Users found in the activity feed",
      icon: Users,
      color: "bg-amber-600",
    },
  ];

  return (
    <div>
      <Header
        title="Live View"
        subtitle="Real-time operational view using activity, appointments, and inbox data."
      />
      <div className="p-6 space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(activityLoading || appointmentsLoading || conversationsLoading)
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
                <CardTitle className="text-sm">Activity Feed</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {activityLoading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-16 w-full" />
                  ))
                ) : activities.length === 0 ? (
                  <p className="text-sm text-gray-500">No activity records found.</p>
                ) : (
                  activities.slice(0, 12).map((activity: any) => (
                    <div key={activity._id} className="flex items-start gap-3 py-2 border-b border-[#1e2d40] last:border-0">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs">
                          {getInitials(activity.user_id?.name || "SY")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs font-medium text-gray-200">
                            {activity.action || "Activity"}
                          </p>
                          <Badge variant="secondary" className="text-[10px] capitalize">
                            {activity.type || "other"}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1">
                          {activity.description || "No description"}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-1">
                          {activity.user_id?.name || "System"} • {timeAgo(activity.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Appointments Through The Day</CardTitle>
              </CardHeader>
              <CardContent>
                {appointmentsLoading ? (
                  <Skeleton className="h-44 w-full" />
                ) : appointments.length === 0 ? (
                  <p className="text-sm text-gray-500">No appointments scheduled for today.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="liveAppointments" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} interval={2} />
                      <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          background: "#0d1a2d",
                          border: "1px solid #1e2d40",
                          borderRadius: "8px",
                          fontSize: "11px",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#10b981"
                        fill="url(#liveAppointments)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Today&apos;s Appointments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {appointmentsLoading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-14 w-full" />
                  ))
                ) : appointments.length === 0 ? (
                  <p className="text-sm text-gray-500">No appointments found for today.</p>
                ) : (
                  appointments.slice(0, 8).map((appointment: any) => (
                    <div key={appointment._id} className="flex items-center gap-3 py-2 border-b border-[#1e2d40] last:border-0">
                      <div className="w-14 text-xs text-gray-500">{appointment.startTime}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-200">
                          {appointment.client?.name || "Customer"}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          {appointment.status} • {appointment.endTime}
                        </p>
                      </div>
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="text-[9px]">
                          {getInitials(appointment.client?.name || "CU")}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Inbox Conversations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {conversationsLoading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-14 w-full" />
                  ))
                ) : conversations.length === 0 ? (
                  <p className="text-sm text-gray-500">No conversations found.</p>
                ) : (
                  conversations.slice(0, 8).map((conversation: any) => (
                    <div key={conversation._id} className="rounded-lg bg-[#1e2d40] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-gray-200">
                          {conversation.groupName ||
                            conversation.participants
                              ?.map((participant: any) => participant.name)
                              .join(", ")}
                        </p>
                        <Badge variant={conversation.unreadCount > 0 ? "warning" : "secondary"} className="text-[10px]">
                          {conversation.unreadCount || 0} unread
                        </Badge>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1">
                        {conversation.lastMessage || "No messages yet"}
                      </p>
                      <p className="text-[10px] text-gray-500 mt-1">
                        {conversation.lastMessageAt
                          ? `${formatDate(conversation.lastMessageAt)} ${formatTime(conversation.lastMessageAt)}`
                          : "No activity yet"}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Activity Types</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(activityByType).length === 0 ? (
                  <p className="text-sm text-gray-500">No activity type data available.</p>
                ) : (
                  Object.entries(activityByType).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between text-xs">
                      <span className="text-gray-400 capitalize">{type}</span>
                      <span className="text-gray-200">{count}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
