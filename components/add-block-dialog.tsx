/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { calendarApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CalendarDays, Clock, Coffee, StopCircle } from "lucide-react";
import { DatePickerPopover } from "@/components/date-picker-popover";
import { TimePickerPopover } from "@/components/time-picker-popover";

const BLOCK_PRESETS = ["Vacation", "Training", "Meeting", "Personal time"];
const BREAK_PRESETS = ["Lunch", "Coffee break", "Personal break"];

const BLOCK_COLOR = "#6b7280";
const BREAK_COLOR = "#f59e0b";

const toDateValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const format12Hour = (value: string) => {
  if (!value) return "--:--";
  const [hStr = "00", mStr = "00"] = value.split(":");
  let hours = Number(hStr);
  const minutes = Number(mStr);
  const meridiem = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${meridiem}`;
};

const formatDateOnlyLabel = (value: string) => {
  if (!value) return "Pick a date";
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  if (Number.isNaN(date.getTime())) return "Pick a date";
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const minutesBetween = (start: string, end: string) => {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return eh * 60 + em - (sh * 60 + sm);
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "block" | "break";
  defaultDate?: Date | null;
};

export function AddBlockDialog({ open, onOpenChange, type, defaultDate }: Props) {
  const queryClient = useQueryClient();
  const presets = type === "block" ? BLOCK_PRESETS : BREAK_PRESETS;
  const color = type === "block" ? BLOCK_COLOR : BREAK_COLOR;
  const Icon = type === "block" ? StopCircle : Coffee;
  const heading = type === "block" ? "Add Block" : "Add Break";

  const [title, setTitle] = useState(presets[0]);
  const [date, setDate] = useState(() => toDateValue(defaultDate || new Date()));
  const [allDay, setAllDay] = useState(false);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [notes, setNotes] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setTitle(presets[0]);
      setDate(toDateValue(defaultDate || new Date()));
      setAllDay(false);
      setStartTime(type === "break" ? "12:00" : "09:00");
      setEndTime(type === "break" ? "12:30" : "10:00");
      setNotes("");
    }
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      const [year, month, day] = date.split("-").map(Number);
      const start = new Date(year, (month || 1) - 1, day || 1);
      const end = new Date(year, (month || 1) - 1, day || 1);

      if (allDay) {
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
      } else {
        const [sh, sm] = startTime.split(":").map(Number);
        const [eh, em] = endTime.split(":").map(Number);
        start.setHours(sh || 0, sm || 0, 0, 0);
        end.setHours(eh || 0, em || 0, 0, 0);
      }

      return calendarApi.createEvent({
        title: title.trim() || heading,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        color,
        allDay,
        notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-blocks"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-insights"] });
      toast.success(`${heading} added`);
      onOpenChange(false);
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message || `Failed to add ${heading.toLowerCase()}`),
  });

  const canSubmit =
    Boolean(title.trim()) &&
    Boolean(date) &&
    (allDay || (Boolean(startTime) && Boolean(endTime) && minutesBetween(startTime, endTime) > 0)) &&
    !createMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/15 text-blue-400">
              <Icon className="h-5 w-5" />
            </div>
            <DialogTitle className="text-xl">{heading}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-300">Title</label>
            <Input
              value={title}
              maxLength={100}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={`e.g. ${presets[0]}`}
            />
            <div className="flex flex-wrap gap-1.5">
              {presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setTitle(preset)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                    title === preset
                      ? "border-blue-500 bg-blue-600/15 text-blue-300"
                      : "border-[#2a3547] text-gray-400 hover:text-gray-200"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-300">Date</label>
            <button
              type="button"
              onClick={() => setDatePickerOpen(true)}
              className="flex h-10 w-full items-center gap-2 rounded-lg border border-[#2a3547] bg-[#0d1526] px-3 text-left text-sm text-gray-200 hover:bg-[#162338] focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <CalendarDays className="h-3.5 w-3.5 text-gray-500" />
              <span>{formatDateOnlyLabel(date)}</span>
            </button>
          </div>

          {/* All day (block only) */}
          {type === "block" ? (
            <label className="flex items-center gap-1.5 text-xs text-gray-300">
              <input
                type="checkbox"
                checked={allDay}
                onChange={(event) => setAllDay(event.target.checked)}
                className="h-3.5 w-3.5 rounded border-[#2a3547] bg-[#0d1526]"
              />
              All day
            </label>
          ) : null}

          {/* Time */}
          {!allDay ? (
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-300">Time</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTimePickerOpen(true)}
                  className="flex h-10 flex-1 items-center gap-2 rounded-lg border border-[#2a3547] bg-[#0d1526] px-3 text-left text-sm text-gray-200 hover:bg-[#162338] focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <Clock className="h-3.5 w-3.5 text-gray-500" />
                  <span>{format12Hour(startTime)}</span>
                </button>
                <span className="text-xs text-gray-500">-</span>
                <button
                  type="button"
                  onClick={() => setTimePickerOpen(true)}
                  className="flex h-10 flex-1 items-center gap-2 rounded-lg border border-[#2a3547] bg-[#0d1526] px-3 text-left text-sm text-gray-200 hover:bg-[#162338] focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <Clock className="h-3.5 w-3.5 text-gray-500" />
                  <span>{format12Hour(endTime)}</span>
                </button>
              </div>
            </div>
          ) : null}

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-300">
              Notes <span className="text-gray-500">(Optional)</span>
            </label>
            <textarea
              value={notes}
              maxLength={300}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Add details..."
              className="min-h-20 w-full rounded-lg border border-[#2a3547] bg-[#0d1526] px-3 py-2 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2 border-t border-[#1e2d40] pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={createMutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => createMutation.mutate()} disabled={!canSubmit}>
            {createMutation.isPending ? "Saving..." : heading}
          </Button>
        </div>

        <DatePickerPopover open={datePickerOpen} onOpenChange={setDatePickerOpen} value={date} onChange={setDate} />

        <TimePickerPopover
          open={timePickerOpen}
          onOpenChange={setTimePickerOpen}
          startValue={startTime}
          endValue={endTime}
          onChange={(start, end) => {
            setStartTime(start);
            setEndTime(end);
          }}
          mode="12"
        />
      </DialogContent>
    </Dialog>
  );
}
