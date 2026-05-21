/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, Delete } from "lucide-react";

type Mode = "12" | "24";
type Slot = "startH1" | "startH2" | "startM1" | "startM2" | "endH1" | "endH2" | "endM1" | "endM2";

const ORDER: Slot[] = [
  "startH1",
  "startH2",
  "startM1",
  "startM2",
  "endH1",
  "endH2",
  "endM1",
  "endM2",
];

const to24 = (
  h1: string,
  h2: string,
  m1: string,
  m2: string,
  meridiem: "AM" | "PM" | null
): string => {
  let hours = Number(`${h1 || 0}${h2 || 0}`);
  let minutes = Number(`${m1 || 0}${m2 || 0}`);
  if (meridiem) {
    // 12-hour input → clamp to 1..12 then convert
    if (hours < 1) hours = 12;
    if (hours > 12) hours = 12;
    if (meridiem === "PM" && hours !== 12) hours += 12;
    if (meridiem === "AM" && hours === 12) hours = 0;
  } else {
    if (hours > 23) hours = 23;
    if (hours < 0) hours = 0;
  }
  if (minutes > 59) minutes = 59;
  if (minutes < 0) minutes = 0;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

const from24 = (value: string, mode: Mode) => {
  const [hStr = "00", mStr = "00"] = (value || "00:00").split(":");
  let hours = Number(hStr);
  const minutes = Number(mStr);
  let meridiem: "AM" | "PM" | null = null;

  if (mode === "12") {
    meridiem = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    if (hours === 0) hours = 12;
  }

  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  return {
    h1: hh[0],
    h2: hh[1],
    m1: mm[0],
    m2: mm[1],
    meridiem,
  };
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  startValue: string; // "HH:mm" 24-hour
  endValue: string; // "HH:mm" 24-hour
  onChange: (start: string, end: string) => void;
  mode?: Mode; // "12" or "24"
};

export function TimePickerPopover({
  open,
  onOpenChange,
  startValue,
  endValue,
  onChange,
  mode = "12",
}: Props) {
  const [startDigits, setStartDigits] = useState({
    h1: "0",
    h2: "9",
    m1: "0",
    m2: "0",
  });
  const [endDigits, setEndDigits] = useState({
    h1: "1",
    h2: "0",
    m1: "0",
    m2: "0",
  });
  const [startMeridiem, setStartMeridiem] = useState<"AM" | "PM">("AM");
  const [endMeridiem, setEndMeridiem] = useState<"AM" | "PM">("AM");
  const [activeSlot, setActiveSlot] = useState<Slot>("startH1");

  useEffect(() => {
    if (!open) return;
    const start = from24(startValue, mode);
    const end = from24(endValue, mode);
    setStartDigits({ h1: start.h1, h2: start.h2, m1: start.m1, m2: start.m2 });
    setEndDigits({ h1: end.h1, h2: end.h2, m1: end.m1, m2: end.m2 });
    if (start.meridiem) setStartMeridiem(start.meridiem);
    if (end.meridiem) setEndMeridiem(end.meridiem);
    setActiveSlot("startH1");
  }, [open, startValue, endValue, mode]);

  const getDigit = (slot: Slot) => {
    const target = slot.startsWith("start") ? startDigits : endDigits;
    if (slot.endsWith("H1")) return target.h1;
    if (slot.endsWith("H2")) return target.h2;
    if (slot.endsWith("M1")) return target.m1;
    return target.m2;
  };

  const isDigitValidForSlot = (slot: Slot, digit: string) => {
    const target = slot.startsWith("start") ? startDigits : endDigits;

    if (slot.endsWith("H1")) {
      // 12-hour: H1 ∈ {0, 1}. 24-hour: H1 ∈ {0, 1, 2}.
      return mode === "12"
        ? digit === "0" || digit === "1"
        : ["0", "1", "2"].includes(digit);
    }

    if (slot.endsWith("H2")) {
      if (mode === "12") {
        // 12-hour clock: combined HH must be 01..12
        if (target.h1 === "1") return ["0", "1", "2"].includes(digit);
        // h1 = "0" → H2 ∈ 1..9 (00 not allowed)
        return digit !== "0";
      }
      // 24-hour: if H1=2, H2 ∈ 0..3, else any digit
      if (target.h1 === "2") return ["0", "1", "2", "3"].includes(digit);
      return true;
    }

    if (slot.endsWith("M1")) {
      // Minutes tens: 0..5
      return ["0", "1", "2", "3", "4", "5"].includes(digit);
    }

    // M2: 0..9
    return true;
  };

  const setDigit = (slot: Slot, digit: string) => {
    if (slot.startsWith("start")) {
      setStartDigits((current) => {
        const next = { ...current };
        if (slot.endsWith("H1")) next.h1 = digit;
        else if (slot.endsWith("H2")) next.h2 = digit;
        else if (slot.endsWith("M1")) next.m1 = digit;
        else next.m2 = digit;
        return next;
      });
    } else {
      setEndDigits((current) => {
        const next = { ...current };
        if (slot.endsWith("H1")) next.h1 = digit;
        else if (slot.endsWith("H2")) next.h2 = digit;
        else if (slot.endsWith("M1")) next.m1 = digit;
        else next.m2 = digit;
        return next;
      });
    }
  };

  const advance = () => {
    const currentIndex = ORDER.indexOf(activeSlot);
    if (currentIndex < ORDER.length - 1) {
      setActiveSlot(ORDER[currentIndex + 1]);
    }
  };

  const retreat = () => {
    const currentIndex = ORDER.indexOf(activeSlot);
    if (currentIndex > 0) {
      setActiveSlot(ORDER[currentIndex - 1]);
    }
  };

  const handleNumberTap = (digit: string) => {
    if (!isDigitValidForSlot(activeSlot, digit)) return;
    setDigit(activeSlot, digit);
    advance();
  };

  const numberDisabled = (digit: string) =>
    !isDigitValidForSlot(activeSlot, digit);

  const handleBackspace = () => {
    setDigit(activeSlot, "0");
    retreat();
  };

  const handleDone = () => {
    const start = to24(
      startDigits.h1,
      startDigits.h2,
      startDigits.m1,
      startDigits.m2,
      mode === "12" ? startMeridiem : null
    );
    const end = to24(
      endDigits.h1,
      endDigits.h2,
      endDigits.m1,
      endDigits.m2,
      mode === "12" ? endMeridiem : null
    );
    onChange(start, end);
    onOpenChange(false);
  };

  const renderColumn = (
    label: string,
    slots: [Slot, Slot, Slot, Slot],
    meridiem: "AM" | "PM",
    onMeridiemChange: (value: "AM" | "PM") => void
  ) => (
    <div className="flex-1 rounded-2xl bg-[#0d1526] p-4">
      <p className="mb-3 text-center text-xs font-medium text-gray-300">{label}</p>
      <div className="mb-3 flex items-center justify-center gap-1.5">
        {slots.map((slot, index) => (
          <div key={slot} className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveSlot(slot)}
              className={`flex h-9 w-9 items-center justify-center rounded-full text-sm transition-colors ${
                activeSlot === slot
                  ? "bg-blue-600 text-white"
                  : "bg-[#1e2d40] text-gray-200 hover:bg-[#2a3547]"
              }`}
            >
              {getDigit(slot)}
            </button>
            {index === 1 ? <span className="text-gray-400">:</span> : null}
          </div>
        ))}
      </div>
      {mode === "12" ? (
        <div className="flex justify-center gap-1">
          {(["AM", "PM"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onMeridiemChange(value)}
              className={`rounded-md px-3 py-1 text-[10px] font-medium ${
                meridiem === value
                  ? "bg-blue-600 text-white"
                  : "bg-[#1e2d40] text-gray-300 hover:bg-[#2a3547]"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-blue-400" />
            Set Time
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-3">
          {renderColumn(
            "Start Time",
            ["startH1", "startH2", "startM1", "startM2"],
            startMeridiem,
            setStartMeridiem
          )}
          {renderColumn(
            "End Time",
            ["endH1", "endH2", "endM1", "endM2"],
            endMeridiem,
            setEndMeridiem
          )}
        </div>

        <div className="mt-4 rounded-2xl bg-[#0d1526] p-4">
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => {
              const disabled = numberDisabled(String(digit));
              return (
                <button
                  key={digit}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleNumberTap(String(digit))}
                  className="flex h-12 items-center justify-center rounded-full bg-[#1e2d40] text-base font-medium text-gray-100 transition-colors hover:bg-[#2a3547] disabled:cursor-not-allowed disabled:bg-[#0d1526] disabled:text-gray-600 disabled:hover:bg-[#0d1526]"
                >
                  {digit}
                </button>
              );
            })}
            <div />
            <button
              type="button"
              disabled={numberDisabled("0")}
              onClick={() => handleNumberTap("0")}
              className="flex h-12 items-center justify-center rounded-full bg-[#1e2d40] text-base font-medium text-gray-100 transition-colors hover:bg-[#2a3547] disabled:cursor-not-allowed disabled:bg-[#0d1526] disabled:text-gray-600 disabled:hover:bg-[#0d1526]"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="flex h-12 items-center justify-center rounded-full bg-[#1e2d40] text-gray-300 transition-colors hover:bg-[#2a3547]"
              aria-label="Backspace"
            >
              <Delete className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button size="sm" onClick={handleDone} className="text-xs">
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
