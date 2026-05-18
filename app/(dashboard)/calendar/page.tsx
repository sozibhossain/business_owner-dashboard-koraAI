/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { calendarApi } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatTime, timeAgo } from "@/lib/utils";
import { toast } from "sonner";
import { CalendarDays, Clock3, Link2, Plus, RefreshCw } from "lucide-react";

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

const toDateTimeLocal = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const isSameDay = (first: Date, second: Date) =>
  first.getFullYear() === second.getFullYear() &&
  first.getMonth() === second.getMonth() &&
  first.getDate() === second.getDate();

export default function CalendarPage() {
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState(() => toDateTimeLocal(new Date()));
  const [endTime, setEndTime] = useState(() =>
    toDateTimeLocal(new Date(new Date().getTime() + 60 * 60 * 1000))
  );
  const [notes, setNotes] = useState("");

  const weekStart = useMemo(() => startOfWeek(selectedDate), [selectedDate]);
  const weekEnd = useMemo(() => endOfWeek(selectedDate), [selectedDate]);

  const { data: eventsResponse, isLoading: eventsLoading } = useQuery({
    queryKey: ["calendar-events", weekStart.toISOString(), weekEnd.toISOString()],
    queryFn: () =>
      calendarApi
        .getEvents({
          startDate: weekStart.toISOString(),
          endDate: weekEnd.toISOString(),
        })
        .then((response) => response.data),
  });

  const { data: insightsResponse, isLoading: insightsLoading } = useQuery({
    queryKey: ["calendar-insights"],
    queryFn: () => calendarApi.getInsights().then((response) => response.data),
  });

  const syncMutation = useMutation({
    mutationFn: () => calendarApi.sync(),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
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

  const createMutation = useMutation({
    mutationFn: () =>
      calendarApi.createEvent({
        title,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        notes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-insights"] });
      toast.success("Calendar event created");
      setShowCreateForm(false);
      setTitle("");
      setNotes("");
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message || "Failed to create event"),
  });

  const events = useMemo(() => eventsResponse?.data || [], [eventsResponse?.data]);
  const insights = useMemo(() => insightsResponse?.data || [], [insightsResponse?.data]);

  const selectedDayEvents = useMemo(
    () =>
      events
        .filter((event: any) => isSameDay(new Date(event.start_time), selectedDate))
        .sort(
          (first: any, second: any) =>
            new Date(first.start_time).getTime() - new Date(second.start_time).getTime()
        ),
    [events, selectedDate]
  );

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const current = new Date(weekStart);
        current.setDate(weekStart.getDate() + index);
        return current;
      }),
    [weekStart]
  );

  const stats = [
    {
      label: "Events This Week",
      value: events.length,
      helper: `${days.length} day window`,
      icon: CalendarDays,
      color: "bg-blue-600",
    },
    {
      label: "Today",
      value: events.filter((event: any) => isSameDay(new Date(event.start_time), new Date()))
        .length,
      helper: "Events scheduled today",
      icon: Clock3,
      color: "bg-emerald-600",
    },
    {
      label: "Appointment Sync",
      value: events.filter((event: any) => event.related_appointment_id).length,
      helper: "Linked to appointments",
      icon: Link2,
      color: "bg-amber-600",
    },
    {
      label: "Manual Events",
      value: events.filter((event: any) => !event.related_appointment_id).length,
      helper: "Created from dashboard",
      icon: Plus,
      color: "bg-purple-600",
    },
  ];

  return (
    <div>
      <Header
        title="Calendar"
        subtitle="Live calendar events, sync status, and schedule insights from your backend."
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              {syncMutation.isPending ? "Syncing..." : "Google Calendar Sync"}
            </Button>
            <Button size="sm" className="h-8 text-xs" onClick={() => setShowCreateForm(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              New Event
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((item) => (
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

        {showCreateForm && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Create Calendar Event</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Event title" />
              <Input
                type="datetime-local"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
              />
              <Input
                type="datetime-local"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
              />
              <Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Notes" />
              <div className="md:col-span-2 flex gap-2">
                <Button
                  className="text-xs"
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending || !title.trim()}
                >
                  {createMutation.isPending ? "Saving..." : "Save Event"}
                </Button>
                <Button
                  variant="outline"
                  className="text-xs"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  Week of {formatDate(weekStart)} to {formatDate(weekEnd)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {eventsLoading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-20 w-full" />
                  ))
                ) : events.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No events were found for this week. Run sync or create an event.
                  </p>
                ) : (
                  days.map((day) => {
                    const dayEvents = events.filter((event: any) =>
                      isSameDay(new Date(event.start_time), day)
                    );

                    return (
                      <div key={day.toISOString()} className="rounded-xl border border-[#1e2d40]">
                        <div className="px-4 py-3 border-b border-[#1e2d40] flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-200">{formatDate(day)}</p>
                            <p className="text-[10px] text-gray-500">{dayEvents.length} event(s)</p>
                          </div>
                          <Button
                            variant={isSameDay(day, selectedDate) ? "default" : "outline"}
                            size="sm"
                            className="h-7 text-[10px]"
                            onClick={() => setSelectedDate(day)}
                          >
                            View day
                          </Button>
                        </div>
                        <div className="p-4 space-y-2">
                          {dayEvents.length === 0 ? (
                            <p className="text-xs text-gray-500">No events scheduled.</p>
                          ) : (
                            dayEvents.map((event: any) => (
                              <div
                                key={event._id}
                                className="rounded-lg bg-[#1e2d40] p-3 border-l-4"
                                style={{ borderColor: event.color || "#2563eb" }}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-medium text-gray-100">{event.title}</p>
                                    <p className="text-[10px] text-gray-400">
                                      {formatTime(event.start_time)} - {formatTime(event.end_time)}
                                    </p>
                                  </div>
                                  <Badge variant={event.related_appointment_id ? "success" : "secondary"} className="text-[10px]">
                                    {event.related_appointment_id ? "Appointment" : "Manual"}
                                  </Badge>
                                </div>
                                {event.notes ? (
                                  <p className="text-xs text-gray-400 mt-2 whitespace-pre-wrap">
                                    {event.notes}
                                  </p>
                                ) : null}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Selected Day</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-gray-100">{formatDate(selectedDate)}</p>
                  <p className="text-[10px] text-gray-500">
                    {selectedDayEvents.length} event(s) on this day
                  </p>
                </div>
                {selectedDayEvents.length === 0 ? (
                  <p className="text-xs text-gray-500">No events for the selected day.</p>
                ) : (
                  selectedDayEvents.map((event: any) => (
                    <div key={event._id} className="flex items-start gap-3 py-2 border-b border-[#1e2d40] last:border-0">
                      <div
                        className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"
                        style={{ backgroundColor: event.color || "#2563eb" }}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-200">{event.title}</p>
                        <p className="text-[10px] text-gray-500">
                          {formatTime(event.start_time)} - {formatTime(event.end_time)}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          Updated {timeAgo(event.updatedAt || event.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Calendar Insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {insightsLoading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={index} className="h-16 w-full" />
                  ))
                ) : (
                  insights.map((insight: any, index: number) => (
                    <div key={`${insight.title}-${index}`} className="rounded-lg bg-[#1e2d40] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-gray-200">{insight.title}</p>
                        <Badge variant="secondary" className="text-[10px] capitalize">
                          {insight.type || "info"}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1">{insight.message}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Sync Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-gray-300">
                  Sync pulls appointment records into the calendar feed and keeps linked events current.
                </p>
                <Button
                  variant="outline"
                  className="w-full text-xs"
                  onClick={() => syncMutation.mutate()}
                  disabled={syncMutation.isPending}
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                  {syncMutation.isPending ? "Syncing..." : "Run Sync"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
