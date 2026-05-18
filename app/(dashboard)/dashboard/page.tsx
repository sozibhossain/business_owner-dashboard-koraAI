"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { accountingApi, appointmentsApi, employeesApi, requestsApi } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getInitials, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { Calendar, Users, DollarSign, Clock, Send } from "lucide-react";

const today = new Date().toISOString().split("T")[0];

const quickActions = [
  { label: "New Appointment", icon: "Calendar" },
  { label: "Create Invoice", icon: "Billing" },
  { label: "Send Message", icon: "Inbox" },
  { label: "Manage Employees", icon: "Team" },
];

export default function BusinessOwnerDashboard() {
  const [koraInput, setKoraInput] = useState("");
  const [koraMessages, setKoraMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([{ role: "assistant", content: "Ask about appointments, requests, or revenue and I’ll help you navigate the data." }]);

  const { data: appointmentsData } = useQuery({
    queryKey: ["dashboard-appointments", today],
    queryFn: () =>
      appointmentsApi.getAll({ date: today, limit: 8 }).then((response) => response.data),
  });

  const { data: employeesData } = useQuery({
    queryKey: ["dashboard-employees"],
    queryFn: () => employeesApi.getAll({ limit: 100 }).then((response) => response.data),
  });

  const { data: requestsData } = useQuery({
    queryKey: ["dashboard-requests"],
    queryFn: () =>
      requestsApi.getAll({ status: "pending", limit: 20 }).then((response) => response.data),
  });

  const { data: accountingData } = useQuery({
    queryKey: ["dashboard-accounting"],
    queryFn: () => accountingApi.getDashboard().then((response) => response.data.data),
  });

  const appointments = appointmentsData?.data || [];
  const employees = employeesData?.data || [];
  const pendingRequests = requestsData?.data || [];
  const activeEmployees = employees.filter((employee: any) =>
    ["working", "on_break"].includes(employee.status)
  );

  const insightCards = useMemo(
    () => [
      {
        title: "Outstanding payments",
        description:
          accountingData?.outstandingCount > 0
            ? `${accountingData.outstandingCount} invoices still need payment.`
            : "No outstanding invoices right now.",
      },
      {
        title: "Pending team requests",
        description:
          pendingRequests.length > 0
            ? `${pendingRequests.length} employee request(s) need your approval.`
            : "No pending employee requests.",
      },
      {
        title: "Team coverage",
        description:
          activeEmployees.length > 0
            ? `${activeEmployees.length} employee(s) are available today.`
            : "No employees are marked active right now.",
      },
    ],
    [accountingData?.outstandingCount, activeEmployees.length, pendingRequests.length]
  );

  const stats = [
    {
      label: "Today's Appointments",
      value: appointments.length,
      helper: appointments.length ? "Live from today’s booking feed" : "No bookings yet today",
      icon: Calendar,
      color: "bg-blue-600",
    },
    {
      label: "Active Employees",
      value: activeEmployees.length,
      helper: `${employees.length} total team members`,
      icon: Users,
      color: "bg-emerald-600",
    },
    {
      label: "Revenue This Month",
      value: formatCurrency(accountingData?.revenueMonth || 0),
      helper: formatCurrency(accountingData?.revenueWeek || 0) + " this week",
      icon: DollarSign,
      color: "bg-amber-600",
    },
    {
      label: "Pending Requests",
      value: pendingRequests.length,
      helper: "Awaiting review",
      icon: Clock,
      color: "bg-purple-600",
    },
  ];

  const sendKoraMessage = () => {
    if (!koraInput.trim()) return;

    setKoraMessages((current) => [
      ...current,
      { role: "user", content: koraInput },
      {
        role: "assistant",
        content:
          "This dashboard is now using live backend data. Open Calendar, Requests, Employees, or Accounting for the underlying records.",
      },
    ]);
    setKoraInput("");
  };

  return (
    <div>
      <Header
        title="Business Overview"
        subtitle="Live booking, team, request, and revenue data from your backend."
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
                  <div className="min-w-0">
                    <p className="text-xl font-bold text-white truncate">{item.value}</p>
                    <p className="text-[10px] text-gray-400">{item.label}</p>
                    <p className="text-[10px] text-emerald-400">{item.helper}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Today's Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              {appointments.length === 0 ? (
                <p className="text-sm text-gray-500">No appointments scheduled for today.</p>
              ) : (
                <div className="space-y-0">
                  {appointments.map((appointment: any) => (
                    <div
                      key={appointment._id}
                      className="flex items-center gap-4 py-2.5 border-b border-[#1e2d40] last:border-0"
                    >
                      <div className="w-16 flex-shrink-0">
                        <p className="text-xs font-medium text-gray-300">
                          {appointment.startTime}
                        </p>
                      </div>
                      <div className="flex-1 flex items-center gap-3 min-w-0">
                        <div className="w-1 h-8 bg-blue-500 rounded-full flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-200 truncate">
                            {appointment.client?.name || "Customer"}
                          </p>
                          <p className="text-xs text-gray-400 capitalize">
                            {String(appointment.status || "upcoming").replace("_", " ")}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">
                        {appointment.startTime} - {appointment.endTime}
                      </span>
                      <Avatar className="w-7 h-7 flex-shrink-0">
                        <AvatarFallback className="text-[9px]">
                          {getInitials(appointment.client?.name || "CU")}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-blue-600/20 bg-gradient-to-br from-[#0d1a2d] to-[#0a1628]">
            <CardHeader>
              <CardTitle className="text-sm">Kora Assistant</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-3 max-h-44 overflow-y-auto">
                {koraMessages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={`flex ${message.role === "user" ? "justify-end" : "items-start gap-2"}`}
                  >
                    {message.role === "assistant" && (
                      <div className="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0 mt-0.5 text-sm">
                        AI
                      </div>
                    )}
                    <div
                      className={`rounded-xl px-3 py-2 max-w-[85%] ${message.role === "user" ? "bg-blue-600 text-white" : "bg-[#1e2d40] text-gray-200"}`}
                    >
                      <p className="text-xs">{message.content}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={koraInput}
                  onChange={(event) => setKoraInput(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && sendKoraMessage()}
                  placeholder="Ask about live dashboard data..."
                  className="flex-1 text-xs bg-[#1e2d40] border border-[#2a3547] rounded-lg px-3 py-2 text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <Button size="icon" className="h-9 w-9 rounded-full" onClick={sendKoraMessage}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => toast.info(action.label)}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl bg-[#1e2d40] hover:bg-[#2a3547] transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#0d1a2d] flex items-center justify-center text-xs text-gray-300">
                    {action.icon}
                  </div>
                  <span className="text-[10px] text-gray-300 text-center leading-tight">
                    {action.label}
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Business Signals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {insightCards.map((item) => (
                <div key={item.title} className="p-3 rounded-xl bg-[#1e2d40]">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-gray-200">{item.title}</p>
                    <Badge variant="secondary" className="text-[9px]">
                      Live
                    </Badge>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">{item.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
