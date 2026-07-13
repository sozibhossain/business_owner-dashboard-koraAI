/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  appointmentsApi,
  calendarApi,
  customersApi,
  employeesApi,
  servicesApi,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
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
import { CalendarDays, Clock, Plus, User } from "lucide-react";
import { asArray } from "@/lib/utils";
import { DatePickerPopover } from "@/components/date-picker-popover";
import { TimePickerPopover } from "@/components/time-picker-popover";

const DEFAULT_LOCATION = "Fade Masters Barbershop";

const COLOR_SWATCHES = [
  "#2563eb",
  "#16a34a",
  "#7c3aed",
  "#ea580c",
  "#db2777",
  "#0891b2",
  "#6b7280",
];

const DURATION_OPTIONS = [
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "60 min", value: 60 },
  { label: "90 min", value: 90 },
  { label: "120 min", value: 120 },
];

const REPEAT_OPTIONS = [
  { label: "Does not repeat", value: "none" },
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
];

const LOCATION_OPTIONS = [
  "Fade Masters Barbershop",
  "Downtown Salon",
  "Mobile Visit",
  "Customer Location",
];

const toDateValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const buildLocalDateTime = (date: string, time: string) => {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  const value = new Date(year, (month || 1) - 1, day || 1);
  value.setHours(hours || 0, minutes || 0, 0, 0);
  return value;
};

const toTimeValue = (date: Date) => {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const addMinutes = (timeValue: string, minutes: number) => {
  const [hours, mins] = timeValue.split(":").map(Number);
  const total = hours * 60 + mins + minutes;
  const safeTotal = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const newHours = Math.floor(safeTotal / 60);
  const newMins = safeTotal % 60;
  return `${String(newHours).padStart(2, "0")}:${String(newMins).padStart(2, "0")}`;
};

const minutesBetween = (start: string, end: string) => {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return eh * 60 + em - (sh * 60 + sm);
};

const formatDateLabel = (date: Date) =>
  date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

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
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: "personal" | "team";
  showService?: boolean;
  defaultDate?: Date | null;
  onCreated?: () => void;
};

export function CreateAppointmentDialog({
  open,
  onOpenChange,
  mode = "team",
  showService = true,
  defaultDate = null,
  onCreated,
}: Props) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const isTeamMode = mode === "team";
  const showTeamService = isTeamMode && showService;

  const now = useMemo(() => new Date(), []);
  const oneHourLater = useMemo(() => {
    const current = new Date();
    return new Date(current.getTime() + 60 * 60 * 1000);
  }, []);
  const defaultDateValue = useMemo(
    () => toDateValue(defaultDate || now),
    [defaultDate, now]
  );

  const [customerId, setCustomerId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [service, setService] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDateValue);
  const [startTime, setStartTime] = useState(toTimeValue(now));
  const [endTime, setEndTime] = useState(toTimeValue(oneHourLater));
  const [duration, setDuration] = useState(60);
  const [allDay, setAllDay] = useState(false);
  const [repeat, setRepeat] = useState("none");
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [notes, setNotes] = useState("");
  const [color, setColor] = useState(COLOR_SWATCHES[0]);

  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");

  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data: customersResponse } = useQuery({
    queryKey: ["appointment-customers"],
    queryFn: () =>
      customersApi.getAll({ limit: 100 }).then((response) => response.data),
    enabled: open && isTeamMode,
  });

  const { data: employeesResponse } = useQuery({
    queryKey: ["appointment-employees"],
    queryFn: () =>
      employeesApi.getAll({ limit: 100 }).then((response) => response.data),
    enabled: open && isTeamMode,
  });

  const { data: servicesResponse } = useQuery({
    queryKey: ["appointment-services"],
    queryFn: () =>
      servicesApi
        .getAll({ limit: 100, isActive: true })
        .then((response) => response.data),
    enabled: open && showTeamService,
  });

  const customers = useMemo(
    () => asArray(customersResponse?.data || customersResponse?.data?.customers),
    [customersResponse?.data]
  );
  const employees = useMemo(
    () => asArray(employeesResponse?.data),
    [employeesResponse?.data]
  );
  const services = useMemo(
    () => asArray(servicesResponse?.data),
    [servicesResponse?.data]
  );

  const resetForm = () => {
    const current = new Date();
    const later = new Date(current.getTime() + 60 * 60 * 1000);
    setCustomerId("");
    setEmployeeId("");
    setService("");
    setTitle("");
    setDate(defaultDateValue);
    setStartTime(toTimeValue(current));
    setEndTime(toTimeValue(later));
    setDuration(60);
    setAllDay(false);
    setRepeat("none");
    setLocation(DEFAULT_LOCATION);
    setNotes("");
    setColor(COLOR_SWATCHES[0]);
    setShowAddCustomer(false);
    setNewCustomerName("");
    setNewCustomerEmail("");
    setNewCustomerPhone("");
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
      setSubmitError(null);
    }
    onOpenChange(nextOpen);
  };

  const handleDurationChange = (value: number) => {
    setDuration(value);
    setEndTime(addMinutes(startTime, value));
  };

  const createCustomerMutation = useMutation({
    mutationFn: async () => {
      if (!newCustomerName.trim() || !newCustomerEmail.trim() || !newCustomerPhone.trim()) {
        throw new Error("Name, email and phone are required");
      }
      const response = await customersApi.create({
        name: newCustomerName.trim(),
        email: newCustomerEmail.trim(),
        phone: newCustomerPhone.trim(),
      });
      return response.data?.data;
    },
    onSuccess: (created: any) => {
      queryClient.invalidateQueries({ queryKey: ["appointment-customers"] });
      if (created?._id) setCustomerId(created._id);
      toast.success("Customer added");
      setShowAddCustomer(false);
      setNewCustomerName("");
      setNewCustomerEmail("");
      setNewCustomerPhone("");
    },
    onError: (error: any) =>
      toast.error(
        error?.response?.data?.message || error?.message || "Failed to add customer"
      ),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      setSubmitError(null);
      const selectedService = isTeamMode
        ? services.find((item: any) => item._id === service)
        : null;
      const finalService = selectedService?.name || "";
      const effectiveStart = allDay ? "08:00" : startTime;
      const effectiveEnd = allDay ? "17:00" : endTime;

      if (!isTeamMode) {
        const start = allDay ? buildLocalDateTime(date, "00:00") : buildLocalDateTime(date, effectiveStart);
        const end = allDay ? buildLocalDateTime(date, "23:59") : buildLocalDateTime(date, effectiveEnd);

        const response = await calendarApi.createEvent({
          title: title.trim(),
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          color,
          allDay,
          notes,
          location,
        });

        return response.data;
      }

      const payload: Record<string, any> = {
        appointmentDate: date,
        startTime: effectiveStart,
        endTime: effectiveEnd,
        bookingNotes: notes,
        title,
        location,
        color,
      };

      if (isTeamMode) {
        payload.customer = customerId;
        payload.employee = employeeId;
        payload.service = finalService;
      }

      const response = await appointmentsApi.create(payload);

      try {
        await calendarApi.sync();
      } catch {
        // sync is best-effort
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-blocks"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-insights"] });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-appointments"] });
      toast.success("Appointment created");
      setSubmitError(null);
      handleDialogOpenChange(false);
      onCreated?.();
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || error?.message || "Failed to create appointment";
      setSubmitError(message);
      toast.error(message);
    },
  });

  const canSubmit =
    (!isTeamMode || (Boolean(customerId) && Boolean(employeeId))) &&
    (isTeamMode || Boolean(title.trim())) &&
    Boolean(date) &&
    (allDay || (Boolean(startTime) && Boolean(endTime) && minutesBetween(startTime, endTime) > 0)) &&
    !createMutation.isPending;

  const selectedCustomer = customers.find((item: any) => item._id === customerId);
  const selectedEmployee = employees.find(
    (item: any) => (item.userId?._id || item._id) === employeeId
  );

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/15 text-blue-400">
              <CalendarDays className="h-5 w-5" />
            </div>
            <DialogTitle className="text-xl">Create Appointment</DialogTitle>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* LEFT COLUMN */}
          <div className="space-y-4">
            {isTeamMode ? (
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-300">Customer</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select value={customerId} onValueChange={setCustomerId}>
                      <SelectTrigger>
                        <div className="flex items-center gap-2 truncate">
                          <User className="h-3.5 w-3.5 text-gray-500" />
                          <SelectValue placeholder="Select or search customer..." />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {customers.length === 0 ? (
                          <div className="px-3 py-2 text-xs text-gray-500">
                            No customers found
                          </div>
                        ) : (
                          customers.map((customer: any) => (
                            <SelectItem key={customer._id} value={customer._id}>
                              {customer.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddCustomer((value) => !value)}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#2a3547] bg-[#0d1526] text-blue-400 hover:bg-[#162338]"
                    aria-label="Add new customer"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                {showAddCustomer ? (
                  <div className="space-y-2 rounded-lg border border-[#2a3547] bg-[#0d1526] p-3">
                    <Input
                      value={newCustomerName}
                      onChange={(event) => setNewCustomerName(event.target.value)}
                      placeholder="Name"
                    />
                    <Input
                      value={newCustomerEmail}
                      onChange={(event) => setNewCustomerEmail(event.target.value)}
                      placeholder="Email"
                      type="email"
                    />
                    <Input
                      value={newCustomerPhone}
                      onChange={(event) => setNewCustomerPhone(event.target.value)}
                      placeholder="Phone"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAddCustomer(false)}
                        className="h-8 text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => createCustomerMutation.mutate()}
                        disabled={createCustomerMutation.isPending}
                        className="h-8 text-xs"
                      >
                        {createCustomerMutation.isPending ? "Adding..." : "Add customer"}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* Service */}
            {showTeamService ? (
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-300">Service</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select value={service} onValueChange={setService}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select service..." />
                      </SelectTrigger>
                      <SelectContent>
                        {services.length === 0 ? (
                          <div className="px-3 py-2 text-xs text-gray-500">
                            No services yet. Click + to add one.
                          </div>
                        ) : (
                          services.map((item: any) => (
                            <SelectItem key={item._id} value={item._id}>
                              <div className="flex items-center justify-between gap-3">
                                <span>{item.name}</span>
                                <span className="text-[10px] text-gray-500">
                                  {item.duration} min · ${Number(item.price || 0).toFixed(0)}
                                </span>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleDialogOpenChange(false);
                      router.push("/services");
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#2a3547] bg-[#0d1526] text-blue-400 hover:bg-[#162338]"
                    aria-label="Open services page"
                    title="Go to Services"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : null}

            {isTeamMode ? (
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-300">Employee</label>
                <Select value={employeeId} onValueChange={setEmployeeId}>
                  <SelectTrigger>
                    <div className="flex items-center gap-2 truncate">
                      {selectedEmployee?.userId?.profileImage?.url ? (
                        <Image
                          src={selectedEmployee.userId.profileImage.url}
                          alt={selectedEmployee.userId?.name || "Employee"}
                          width={20}
                          height={20}
                          unoptimized
                          className="h-5 w-5 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-3.5 w-3.5 text-gray-500" />
                      )}
                      <SelectValue placeholder="Select employee..." />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {employees.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-gray-500">
                        No employees found
                      </div>
                    ) : (
                      employees.map((employee: any) => {
                        const id = employee.userId?._id || employee._id;
                        const name = employee.userId?.name || "Employee";
                        const imageUrl = employee.userId?.profileImage?.url || "";
                        const initials = name
                          .split(" ")
                          .map((part: string) => part[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase();
                        return (
                          <SelectItem key={id} value={id}>
                            <div className="flex items-center gap-2">
                              {imageUrl ? (
                                <Image
                                  src={imageUrl}
                                  alt={name}
                                  width={24}
                                  height={24}
                                  unoptimized
                                  className="h-6 w-6 rounded-full object-cover"
                                />
                              ) : (
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600/20 text-[10px] font-medium text-blue-300">
                                  {initials || "EM"}
                                </span>
                              )}
                              <span>{name}</span>
                            </div>
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

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
              <p className="text-[10px] text-gray-500">
                {formatDateLabel(new Date(date))}
              </p>
            </div>

            {/* Time */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-300">Time</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => !allDay && setTimePickerOpen(true)}
                  disabled={allDay}
                  className="flex h-10 flex-1 items-center gap-2 rounded-lg border border-[#2a3547] bg-[#0d1526] px-3 text-left text-sm text-gray-200 hover:bg-[#162338] disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <Clock className="h-3.5 w-3.5 text-gray-500" />
                  <span>{format12Hour(startTime)}</span>
                </button>
                <span className="text-xs text-gray-500">-</span>
                <button
                  type="button"
                  onClick={() => !allDay && setTimePickerOpen(true)}
                  disabled={allDay}
                  className="flex h-10 flex-1 items-center gap-2 rounded-lg border border-[#2a3547] bg-[#0d1526] px-3 text-left text-sm text-gray-200 hover:bg-[#162338] disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <Clock className="h-3.5 w-3.5 text-gray-500" />
                  <span>{format12Hour(endTime)}</span>
                </button>
                <label className="flex shrink-0 items-center gap-1.5 text-xs text-gray-300">
                  <input
                    type="checkbox"
                    checked={allDay}
                    onChange={(event) => {
                      const next = event.target.checked;
                      setAllDay(next);
                      if (next) {
                        setStartTime("08:00");
                        setEndTime("17:00");
                        setDuration(540);
                      }
                    }}
                    className="h-3.5 w-3.5 rounded border-[#2a3547] bg-[#0d1526]"
                  />
                  All day
                </label>
              </div>
            </div>

            {/* Repeat */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-300">
                Repeat <span className="text-gray-500">(Optional)</span>
              </label>
              <Select value={repeat} onValueChange={setRepeat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPEAT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <label className="flex items-center justify-between text-xs font-medium text-gray-300">
                <span>Title</span>
                <span className="text-[10px] text-gray-500">
                  {title.length}/100
                </span>
              </label>
              <Input
                value={title}
                maxLength={100}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Add a title for this appointment..."
              />
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-300">Duration</label>
              <Select
                value={String(duration)}
                onValueChange={(value) => handleDurationChange(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={`${duration} min`} />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.every((option) => option.value !== duration) ? (
                    <SelectItem value={String(duration)}>
                      {duration} min
                    </SelectItem>
                  ) : null}
                  {DURATION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-300">Location</label>
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOCATION_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="flex items-center justify-between text-xs font-medium text-gray-300">
                <span>
                  Notes <span className="text-gray-500">(Optional)</span>
                </span>
                <span className="text-[10px] text-gray-500">
                  {notes.length}/500
                </span>
              </label>
              <textarea
                value={notes}
                maxLength={500}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Add notes about this appointment..."
                className="min-h-[120px] w-full rounded-lg border border-[#2a3547] bg-[#0d1526] px-3 py-2 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Color */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-300">Color</label>
              <div className="flex flex-wrap gap-3">
                {COLOR_SWATCHES.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    onClick={() => setColor(swatch)}
                    className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-transform ${
                      color === swatch
                        ? "scale-105 border-white"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: swatch }}
                  >
                    {color === swatch ? (
                      <span className="h-2 w-2 rounded-full bg-white" />
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {submitError ? (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            <span className="mt-0.5 inline-block h-4 w-4 shrink-0 rounded-full bg-red-500/30 text-center text-[10px] leading-4 text-red-200">
              !
            </span>
            <span>{submitError}</span>
          </div>
        ) : null}

        <div className="mt-4 flex flex-col gap-3 border-t border-[#1e2d40] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-[11px] text-gray-500">
            {isTeamMode
              ? selectedCustomer
                ? `Booking for ${selectedCustomer.name}`
                : "Select a customer to proceed"
              : title
                ? `Booking: ${title}`
                : "Add a title to proceed"}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleDialogOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!canSubmit}
            >
              {createMutation.isPending ? "Creating..." : "Create Appointment"}
            </Button>
          </div>
        </div>

        <DatePickerPopover
          open={datePickerOpen}
          onOpenChange={setDatePickerOpen}
          value={date}
          onChange={setDate}
        />

        <TimePickerPopover
          open={timePickerOpen}
          onOpenChange={setTimePickerOpen}
          startValue={startTime}
          endValue={endTime}
          onChange={(start, end) => {
            setStartTime(start);
            setEndTime(end);
            const diff = minutesBetween(start, end);
            if (diff > 0) setDuration(diff);
          }}
          mode="12"
        />
      </DialogContent>
    </Dialog>
  );
}
