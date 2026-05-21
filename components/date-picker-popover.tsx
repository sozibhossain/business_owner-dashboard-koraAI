/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CalendarDays, ChevronLeft } from "lucide-react";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

const parseISO = (value: string): { year: number; month: number; day: number } | null => {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]) - 1,
    day: Number(match[3]),
  };
};

const toISO = (year: number, month: number, day: number) => {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
};

const daysInMonth = (year: number, month: number) =>
  new Date(year, month + 1, 0).getDate();

const firstDayOffset = (year: number, month: number) =>
  new Date(year, month, 1).getDay(); // 0 = Sunday

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
};

export function DatePickerPopover({ open, onOpenChange, value, onChange }: Props) {
  const today = useMemo(() => new Date(), []);
  const parsed = parseISO(value) || {
    year: today.getFullYear(),
    month: today.getMonth(),
    day: today.getDate(),
  };

  const [view, setView] = useState<"months" | "calendar">("months");
  const [activeYear, setActiveYear] = useState(parsed.year);
  const [activeMonth, setActiveMonth] = useState(parsed.month);

  useEffect(() => {
    if (open) {
      const next = parseISO(value);
      if (next) {
        setActiveYear(next.year);
        setActiveMonth(next.month);
      }
      setView("months");
    }
  }, [open, value]);

  const yearList = useMemo(() => {
    const base = today.getFullYear();
    return [base, base + 1];
  }, [today]);

  const openCalendar = (year: number, month: number) => {
    setActiveYear(year);
    setActiveMonth(month);
    setView("calendar");
  };

  const handleSelectDay = (day: number) => {
    onChange(toISO(activeYear, activeMonth, day));
    onOpenChange(false);
  };

  const renderMonths = () => (
    <div className="space-y-5">
      {yearList.map((year) => (
        <div key={year} className="rounded-2xl bg-[#0d1526] p-4">
          <p className="mb-3 text-sm font-semibold text-gray-200">{year}</p>
          <div className="grid grid-cols-6 gap-2">
            {MONTH_NAMES.map((_, monthIndex) => {
              const isCurrentSelected =
                parsed.year === year && parsed.month === monthIndex;
              return (
                <button
                  key={monthIndex}
                  type="button"
                  onClick={() => openCalendar(year, monthIndex)}
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm transition-colors ${
                    isCurrentSelected
                      ? "bg-blue-600 text-white"
                      : "bg-[#1e2d40] text-gray-200 hover:bg-[#2a3547]"
                  }`}
                >
                  {monthIndex + 1}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  const renderCalendar = () => {
    const total = daysInMonth(activeYear, activeMonth);
    const offset = firstDayOffset(activeYear, activeMonth);

    const cells: (number | null)[] = [];
    for (let index = 0; index < offset; index++) cells.push(null);
    for (let day = 1; day <= total; day++) cells.push(day);

    const isSelected = (day: number) =>
      parsed.year === activeYear &&
      parsed.month === activeMonth &&
      parsed.day === day;

    return (
      <div className="rounded-2xl bg-[#0d1526] p-4">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setView("months")}
            className="flex items-center gap-1 text-sm text-gray-300 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
            {MONTH_NAMES[activeMonth]}
          </button>
          <span className="text-xs text-gray-500">{activeYear}</span>
        </div>
        <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] text-gray-500">
          {DAY_LABELS.map((label, index) => (
            <span key={`${label}-${index}`}>{label}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, index) => (
            <div key={index} className="flex h-9 items-center justify-center">
              {day === null ? (
                <span />
              ) : (
                <button
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm transition-colors ${
                    isSelected(day)
                      ? "bg-blue-600 text-white"
                      : "text-gray-200 hover:bg-[#1e2d40]"
                  }`}
                >
                  {day}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4 text-blue-400" />
            Choose a date
          </DialogTitle>
        </DialogHeader>

        {view === "months" ? renderMonths() : renderCalendar()}

        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Cancel
          </Button>
          {view === "calendar" ? (
            <Button
              size="sm"
              onClick={() => handleSelectDay(parsed.day)}
              className="text-xs"
            >
              Done
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
