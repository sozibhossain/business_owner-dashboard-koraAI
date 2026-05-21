/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  appointmentsApi,
  calendarApi,
  customersApi,
  servicesApi,
} from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarDays,
  CalendarPlus,
  Check,
  Clock,
  DollarSign,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Scissors,
  User as UserIcon,
  X,
} from "lucide-react";
import { getInitials } from "@/lib/utils";
import { DatePickerPopover } from "@/components/date-picker-popover";
import { TimePickerPopover } from "@/components/time-picker-popover";

const STATUS_META: Record<string, { label: string; color: string; dot: string }> = {
  upcoming: { label: "Upcoming", color: "text-blue-400", dot: "bg-blue-400" },
  rescheduled: { label: "Rescheduled", color: "text-blue-400", dot: "bg-blue-400" },
  started: { label: "In Progress", color: "text-amber-400", dot: "bg-amber-400" },
  ongoing: { label: "In Progress", color: "text-amber-400", dot: "bg-amber-400" },
  completed: { label: "Completed", color: "text-emerald-400", dot: "bg-emerald-400" },
  cancelled: { label: "Cancelled", color: "text-red-400", dot: "bg-red-400" },
  no_show: { label: "No Show", color: "text-red-400", dot: "bg-red-400" },
};

const COLOR_SWATCHES = [
  "#2563eb",
  "#16a34a",
  "#7c3aed",
  "#ea580c",
  "#db2777",
  "#0891b2",
  "#6b7280",
];

const LOCATION_OPTIONS = [
  "Fade Masters Barbershop",
  "Downtown Salon",
  "Mobile Visit",
  "Customer Location",
];

const format12 = (value: string) => {
  if (!value) return "--:--";
  const [hStr = "00", mStr = "00"] = value.split(":");
  let hours = Number(hStr);
  const minutes = Number(mStr);
  const meridiem = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${meridiem}`;
};

const toISODate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateLong = (value: any) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatDateTime = (value: any) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const computeDuration = (start: string, end: string) => {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return eh * 60 + em - (sh * 60 + sm);
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string | null;
};

export function AppointmentDetailsDialog({ open, onOpenChange, appointmentId }: Props) {
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<"view" | "edit">("view");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);

  const [editTitle, setEditTitle] = useState("");
  const [editService, setEditService] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editColor, setEditColor] = useState(COLOR_SWATCHES[0]);
  const [editNotes, setEditNotes] = useState("");

  const { data: appointmentResponse, isLoading } = useQuery({
    queryKey: ["appointment-detail", appointmentId],
    queryFn: () =>
      appointmentsApi
        .getById(String(appointmentId))
        .then((response) => response.data?.data),
    enabled: Boolean(appointmentId) && open,
  });

  const appointment: any = appointmentResponse;

  const { data: servicesResponse } = useQuery({
    queryKey: ["appointment-detail-services"],
    queryFn: () =>
      servicesApi
        .getAll({ limit: 100, isActive: true })
        .then((response) => response.data),
    enabled: open && mode === "edit",
  });

  const services = useMemo(() => servicesResponse?.data || [], [
    servicesResponse?.data,
  ]);

  const customerId = appointment?.customer?._id || appointment?.client?._id;

  const { data: historyResponse } = useQuery({
    queryKey: ["customer-history", customerId],
    queryFn: () =>
      customersApi
        .getHistory(String(customerId))
        .then((response) => response.data),
    enabled: Boolean(customerId) && open,
  });

  const history: any[] = useMemo(() => {
    const payload = historyResponse?.data;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.appointments?.items)) return payload.appointments.items;
    if (Array.isArray(payload?.history)) return payload.history;
    return [];
  }, [historyResponse?.data]);

  useEffect(() => {
    if (!open) {
      setMode("view");
      return;
    }
    if (appointment) {
      setEditTitle(appointment.title || "");
      setEditService(appointment.service || "");
      const date = new Date(appointment.appointmentDate);
      setEditDate(toISODate(date));
      setEditStartTime(appointment.startTime || "09:00");
      setEditEndTime(appointment.endTime || "10:00");
      setEditLocation(appointment.location || LOCATION_OPTIONS[0]);
      setEditColor(appointment.color || COLOR_SWATCHES[0]);
      setEditNotes(appointment.bookingNotes || "");
    }
  }, [open, appointment]);

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await appointmentsApi.update(String(appointmentId), payload);
      try {
        await calendarApi.sync();
      } catch {
        // sync is best-effort
      }
      return response.data;
    },
    onSuccess: (_data, variables: any) => {
      queryClient.invalidateQueries({ queryKey: ["appointment-detail", appointmentId] });
      queryClient.invalidateQueries({ queryKey: ["calendar-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      if (variables?.status === "cancelled") {
        toast.success("Appointment cancelled");
        onOpenChange(false);
      } else {
        toast.success("Appointment updated");
        setMode("view");
      }
    },
    onError: (error: any) =>
      toast.error(
        error?.response?.data?.message || error?.message || "Failed to update appointment"
      ),
  });

  const handleSave = () => {
    if (!appointment) return;
    const original = appointment;

    const payload: any = {};
    if (editTitle !== (original.title || "")) payload.title = editTitle;

    const selectedService = services.find((item: any) => item._id === editService);
    const serviceName = selectedService?.name ?? editService;
    if (serviceName !== (original.service || "")) payload.service = serviceName;

    if (editLocation !== (original.location || "")) payload.location = editLocation;
    if (editColor !== (original.color || "")) payload.color = editColor;
    if (editNotes !== (original.bookingNotes || "")) payload.bookingNotes = editNotes;

    const originalISO = toISODate(new Date(original.appointmentDate));
    const dateChanged = editDate !== originalISO;
    const startChanged = editStartTime !== (original.startTime || "");
    const endChanged = editEndTime !== (original.endTime || "");

    if (dateChanged || startChanged || endChanged) {
      payload.appointmentDate = editDate;
      payload.startTime = editStartTime;
      payload.endTime = editEndTime;
    }

    if (Object.keys(payload).length === 0) {
      toast.info("Nothing to update");
      return;
    }

    updateMutation.mutate(payload);
  };

  const handleReschedule = () => {
    setMode("edit");
    setTimePickerOpen(true);
  };

  const handleCancelAppointment = () => {
    if (!appointment) return;
    if (!confirm("Cancel this appointment?")) return;
    updateMutation.mutate({ status: "cancelled" });
  };

  if (!appointment && !isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">Loading appointment...</p>
        </DialogContent>
      </Dialog>
    );
  }

  const status = appointment?.status || "upcoming";
  const statusMeta = STATUS_META[status] || STATUS_META.upcoming;
  const customer = appointment?.customer || appointment?.client;
  const employee = appointment?.employee;
  const duration = computeDuration(
    appointment?.startTime || "",
    appointment?.endTime || ""
  );

  const isTerminal = ["completed", "cancelled", "no_show"].includes(status);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/15 text-blue-400">
                <CalendarPlus className="h-5 w-5" />
              </div>
              <DialogTitle className="text-xl">Appointment Details</DialogTitle>
            </div>
          </DialogHeader>

          {isLoading ? (
            <p className="text-sm text-gray-500">Loading appointment...</p>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {/* LEFT */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className={`flex items-center gap-1.5 rounded-full bg-[#1e2d40] px-2.5 py-1 text-[11px] ${statusMeta.color}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`} />
                    {statusMeta.label}
                  </span>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-[#1e2d40] bg-[#0d1526] p-3">
                  <Avatar className="h-12 w-12">
                    {customer?.profileImage?.url ? (
                      <AvatarImage src={customer.profileImage.url} alt={customer?.name} />
                    ) : (
                      <AvatarFallback>{getInitials(customer?.name || "")}</AvatarFallback>
                    )}
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-100">
                      {customer?.name || "Customer"}
                    </p>
                    <p className="truncate text-xs text-gray-400">
                      {customer?.phone || customer?.phoneNumber || customer?.email || "—"}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1e2d40] text-gray-300 hover:text-blue-400"
                      aria-label="Call"
                      onClick={() => toast.info("Call action — not wired yet")}
                    >
                      <Phone className="h-3.5 w-3.5" />
                    </button>
                    <button
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1e2d40] text-gray-300 hover:text-blue-400"
                      aria-label="Message"
                      onClick={() => toast.info("Message action — not wired yet")}
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                    </button>
                    <button
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1e2d40] text-gray-300 hover:text-blue-400"
                      aria-label="Email"
                      onClick={() => toast.info("Email action — not wired yet")}
                    >
                      <Mail className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 rounded-xl border border-[#1e2d40] bg-[#0d1526] p-3">
                  {/* Service */}
                  <Row label="Service" icon={<Scissors className="h-3.5 w-3.5 text-gray-500" />}>
                    {mode === "edit" ? (
                      <Select value={editService} onValueChange={setEditService}>
                        <SelectTrigger className="h-8 w-44 text-xs">
                          <SelectValue placeholder={appointment.service || "Select"} />
                        </SelectTrigger>
                        <SelectContent>
                          {services.map((item: any) => (
                            <SelectItem key={item._id} value={item._id}>
                              {item.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-sm text-gray-100">
                        {appointment.service || "—"}
                      </span>
                    )}
                  </Row>

                  {/* Employee */}
                  <Row label="Employee" icon={<UserIcon className="h-3.5 w-3.5 text-gray-500" />}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        {employee?.profileImage?.url ? (
                          <AvatarImage src={employee.profileImage.url} alt={employee.name} />
                        ) : (
                          <AvatarFallback className="text-[9px]">
                            {getInitials(employee?.name || "")}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <span className="text-sm text-gray-100">
                        {employee?.name || "—"}
                      </span>
                    </div>
                  </Row>

                  {/* Date */}
                  <Row label="Date" icon={<CalendarDays className="h-3.5 w-3.5 text-gray-500" />}>
                    {mode === "edit" ? (
                      <button
                        type="button"
                        onClick={() => setDatePickerOpen(true)}
                        className="flex h-8 items-center gap-1.5 rounded-md border border-[#2a3547] bg-[#0a1628] px-2 text-xs text-gray-200 hover:bg-[#162338]"
                      >
                        <CalendarDays className="h-3 w-3 text-gray-500" />
                        {formatDateLong(editDate)}
                      </button>
                    ) : (
                      <span className="text-sm text-gray-100">
                        {formatDateLong(appointment.appointmentDate)}
                      </span>
                    )}
                  </Row>

                  {/* Time */}
                  <Row label="Time" icon={<Clock className="h-3.5 w-3.5 text-gray-500" />}>
                    {mode === "edit" ? (
                      <button
                        type="button"
                        onClick={() => setTimePickerOpen(true)}
                        className="flex h-8 items-center gap-1.5 rounded-md border border-[#2a3547] bg-[#0a1628] px-2 text-xs text-gray-200 hover:bg-[#162338]"
                      >
                        <Clock className="h-3 w-3 text-gray-500" />
                        {format12(editStartTime)} – {format12(editEndTime)} (
                        {computeDuration(editStartTime, editEndTime)} min)
                      </button>
                    ) : (
                      <span className="text-sm text-gray-100">
                        {(appointment.startTime || "").slice(0, 5)} –{" "}
                        {(appointment.endTime || "").slice(0, 5)} ({duration} min)
                      </span>
                    )}
                  </Row>

                  {/* Location */}
                  <Row label="Location" icon={<MapPin className="h-3.5 w-3.5 text-gray-500" />}>
                    {mode === "edit" ? (
                      <Select value={editLocation} onValueChange={setEditLocation}>
                        <SelectTrigger className="h-8 w-44 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LOCATION_OPTIONS.map((value) => (
                            <SelectItem key={value} value={value}>
                              {value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-sm text-gray-100">
                        {appointment.location || "—"}
                      </span>
                    )}
                  </Row>

                  {/* Price (from service) */}
                  <Row label="Price" icon={<DollarSign className="h-3.5 w-3.5 text-gray-500" />}>
                    <span className="text-sm text-gray-100">
                      {(() => {
                        const matched = services.find(
                          (item: any) =>
                            item._id === editService || item.name === appointment.service
                        );
                        if (matched?.price) return `$${Number(matched.price).toFixed(2)}`;
                        return "—";
                      })()}
                    </span>
                  </Row>

                  {/* Status */}
                  <Row label="Status">
                    <span className={`flex items-center gap-1.5 text-sm ${statusMeta.color}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`} />
                      {statusMeta.label}
                    </span>
                  </Row>

                  {mode === "edit" ? (
                    <div className="space-y-2 border-t border-[#1e2d40] pt-2">
                      <div>
                        <p className="mb-1 text-[10px] uppercase tracking-wide text-gray-500">Title</p>
                        <Input
                          value={editTitle}
                          onChange={(event) => setEditTitle(event.target.value)}
                          placeholder="Add a title"
                          className="h-8 text-xs"
                          maxLength={100}
                        />
                      </div>
                      <div>
                        <p className="mb-1 text-[10px] uppercase tracking-wide text-gray-500">Color</p>
                        <div className="flex flex-wrap gap-2">
                          {COLOR_SWATCHES.map((swatch) => (
                            <button
                              key={swatch}
                              type="button"
                              onClick={() => setEditColor(swatch)}
                              className={`h-6 w-6 rounded-full border-2 ${
                                editColor === swatch
                                  ? "border-white"
                                  : "border-transparent"
                              }`}
                              style={{ backgroundColor: swatch }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-1 rounded-xl border border-[#1e2d40] bg-[#0d1526] p-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Created</span>
                    <span className="text-gray-300">{formatDateTime(appointment.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Last Updated</span>
                    <span className="text-gray-300">{formatDateTime(appointment.updatedAt)}</span>
                  </div>
                </div>
              </div>

              {/* RIGHT */}
              <div className="space-y-4">
                {/* Notes */}
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-xs font-medium text-gray-300">Notes</p>
                    <span className="text-[10px] text-gray-500">
                      {(mode === "edit" ? editNotes : appointment.bookingNotes || "").length}/500
                    </span>
                  </div>
                  {mode === "edit" ? (
                    <textarea
                      value={editNotes}
                      maxLength={500}
                      onChange={(event) => setEditNotes(event.target.value)}
                      className="min-h-[100px] w-full rounded-lg border border-[#2a3547] bg-[#0d1526] px-3 py-2 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Add notes about this appointment..."
                    />
                  ) : (
                    <div className="min-h-[100px] whitespace-pre-wrap rounded-lg border border-[#2a3547] bg-[#0d1526] px-3 py-2 text-sm text-gray-200">
                      {appointment.bookingNotes || (
                        <span className="text-gray-500">No notes added.</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Customer History */}
                <div>
                  <p className="mb-2 text-xs font-medium text-gray-300">Customer History</p>
                  <div className="space-y-1 rounded-xl border border-[#1e2d40] bg-[#0d1526] p-3">
                    {history.length === 0 ? (
                      <p className="text-xs text-gray-500">No prior appointments.</p>
                    ) : (
                      history.slice(0, 4).map((item: any, index: number) => (
                        <div
                          key={item._id || index}
                          className="flex items-center justify-between border-b border-[#1e2d40] py-1.5 text-xs last:border-0"
                        >
                          <span className="text-gray-400">
                            {formatDateLong(item.appointmentDate || item.date)}
                          </span>
                          <span className="text-gray-200">
                            {item.service || item.title || "Service"}
                          </span>
                          <span className="text-gray-400">
                            {item.price ? `$${Number(item.price).toFixed(2)}` : "—"}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                  {history.length > 4 ? (
                    <button className="mt-2 w-full rounded-lg bg-[#1e2d40] py-1.5 text-center text-xs text-gray-300 hover:bg-[#2a3547]">
                      View full history
                    </button>
                  ) : null}
                </div>

                {/* Reminders */}
                <div>
                  <p className="mb-2 text-xs font-medium text-gray-300">Reminders</p>
                  <div className="space-y-1 rounded-xl border border-[#1e2d40] bg-[#0d1526] p-3">
                    {[
                      { label: "Email Reminder", note: "24 hours before" },
                      { label: "SMS Reminder", note: "2 hours before" },
                    ].map((reminder) => (
                      <div
                        key={reminder.label}
                        className="flex items-center justify-between border-b border-[#1e2d40] py-1.5 text-xs last:border-0"
                      >
                        <span className="text-gray-200">{reminder.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">{reminder.note}</span>
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FOOTER */}
          <div className="mt-4 flex flex-wrap gap-2 border-t border-[#1e2d40] pt-4">
            {mode === "view" ? (
              <>
                <Button
                  variant="outline"
                  className="h-9 text-xs"
                  onClick={() => setMode("edit")}
                  disabled={isTerminal}
                >
                  <Pencil className="mr-1 h-3.5 w-3.5" />
                  Edit Appointment
                </Button>
                <Button
                  variant="outline"
                  className="h-9 text-xs"
                  onClick={handleReschedule}
                  disabled={isTerminal}
                >
                  <CalendarDays className="mr-1 h-3.5 w-3.5" />
                  Reschedule
                </Button>
                <Button
                  variant="outline"
                  className="h-9 text-xs text-red-400 hover:text-red-300"
                  onClick={handleCancelAppointment}
                  disabled={isTerminal || updateMutation.isPending}
                >
                  <X className="mr-1 h-3.5 w-3.5" />
                  Cancel Appointment
                </Button>
                <Button className="ml-auto h-9 text-xs" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="h-9 text-xs"
                  onClick={() => setMode("view")}
                  disabled={updateMutation.isPending}
                >
                  Discard
                </Button>
                <Button
                  className="ml-auto h-9 text-xs"
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? "Saving..." : "Save changes"}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <DatePickerPopover
        open={datePickerOpen}
        onOpenChange={setDatePickerOpen}
        value={editDate}
        onChange={setEditDate}
      />

      <TimePickerPopover
        open={timePickerOpen}
        onOpenChange={setTimePickerOpen}
        startValue={editStartTime}
        endValue={editEndTime}
        onChange={(start, end) => {
          setEditStartTime(start);
          setEditEndTime(end);
        }}
        mode="12"
      />
    </>
  );
}

function Row({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="flex items-center gap-1.5 text-xs text-gray-500">
        {icon}
        {label}
      </span>
      <div className="text-right">{children}</div>
    </div>
  );
}
