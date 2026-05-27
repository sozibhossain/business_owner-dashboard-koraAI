/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { accountingApi } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatCurrency, formatDate, getInitials } from "@/lib/utils";
import { toast } from "sonner";
import {
  AlertTriangle,
  Download,
  DollarSign,
  Search,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const formatRevenuePoint = (entry: any) => {
  if (entry?._id?.day) {
    return `${String(entry._id.month).padStart(2, "0")}/${String(entry._id.day).padStart(2, "0")}`;
  }

  if (entry?._id?.week) {
    return `W${entry._id.week}`;
  }

  if (entry?._id?.month) {
    return `${String(entry._id.month).padStart(2, "0")}/${entry._id.year}`;
  }

  return "N/A";
};

const statusVariant: Record<string, any> = {
  paid: "success",
  pending: "warning",
  overdue: "destructive",
  cancelled: "secondary",
};

const formatTooltipCurrency = (value: unknown) => {
  const numericValue =
    typeof value === "number"
      ? value
      : Array.isArray(value)
        ? Number(value[0] ?? 0)
        : Number(value ?? 0);

  return formatCurrency(Number.isFinite(numericValue) ? numericValue : 0);
};

export default function AccountingPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [period, setPeriod] = useState("month");

  const { data: dashboardResponse, isLoading: dashboardLoading } = useQuery({
    queryKey: ["accounting-dashboard"],
    queryFn: () => accountingApi.getDashboard().then((response) => response.data),
  });

  const { data: revenueResponse, isLoading: revenueLoading } = useQuery({
    queryKey: ["accounting-revenue", period],
    queryFn: () => accountingApi.getRevenue({ period }).then((response) => response.data),
  });

  const { data: invoicesResponse, isLoading: invoicesLoading } = useQuery({
    queryKey: ["accounting-invoices", page, search, statusFilter],
    queryFn: () =>
      accountingApi
        .getAll({
          page,
          limit: 10,
          search: search || undefined,
          status: statusFilter === "all" ? undefined : statusFilter,
        })
        .then((response) => response.data),
  });

  const recordPaymentMutation = useMutation({
    mutationFn: (id: string) => accountingApi.recordPayment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounting-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["accounting-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["accounting-revenue"] });
      toast.success("Payment recorded successfully");
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message || "Failed to record payment"),
  });

  const dashboard = dashboardResponse?.data || {};
  const invoices = invoicesResponse?.data || [];
  const meta = invoicesResponse?.meta || {};

  const chartData = useMemo(
    () =>
      (revenueResponse?.data || []).map((entry: any) => ({
        label: formatRevenuePoint(entry),
        revenue: entry.revenue || 0,
      })),
    [revenueResponse?.data]
  );

  const breakdownMap = useMemo(() => {
    return (dashboard.paymentBreakdown || []).reduce((acc: Record<string, number>, item: any) => {
      acc[item._id] = item.total || 0;
      return acc;
    }, {});
  }, [dashboard.paymentBreakdown]);

  const stats = [
    {
      label: "Revenue Today",
      value: formatCurrency(dashboard.revenueToday || 0),
      helper: "Paid transactions today",
      icon: DollarSign,
      color: "bg-emerald-600",
    },
    {
      label: "Revenue This Week",
      value: formatCurrency(dashboard.revenueWeek || 0),
      helper: "Last 7 days",
      icon: TrendingUp,
      color: "bg-blue-600",
    },
    {
      label: "Revenue This Month",
      value: formatCurrency(dashboard.revenueMonth || 0),
      helper: "Current month",
      icon: TrendingUp,
      color: "bg-purple-600",
    },
    {
      label: "Outstanding",
      value: formatCurrency(dashboard.outstandingAmount || 0),
      helper: `${dashboard.outstandingCount || 0} invoice(s) pending or overdue`,
      icon: AlertTriangle,
      color: "bg-amber-600",
    },
  ];

  return (
    <div>
      <Header
        title="Accounting"
        subtitle="Live revenue, invoice, and payment data from your backend."
        action={
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => toast.info("CSV export is available from the backend endpoint.")}
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            Export
          </Button>
        }
      />

      <div className="space-y-5 p-3 sm:p-4 lg:p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {dashboardLoading
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
                        <p className="text-base font-bold text-white">{item.value}</p>
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
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-sm">Revenue Overview</CardTitle>
                  <div className="flex gap-1 bg-[#0d1a2d] p-1 rounded-lg">
                    {["day", "week", "month"].map((value) => (
                      <button
                        key={value}
                        onClick={() => setPeriod(value)}
                        className={`px-3 py-1 rounded-md text-xs font-medium ${period === value ? "bg-blue-600 text-white" : "text-gray-400"}`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {revenueLoading ? (
                  <Skeleton className="h-44 w-full" />
                ) : chartData.length === 0 ? (
                  <p className="text-sm text-gray-500">No paid revenue data available for this period.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="accountingRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                      <Tooltip
                        formatter={(value) => formatTooltipCurrency(value)}
                        contentStyle={{
                          background: "#0d1a2d",
                          border: "1px solid #1e2d40",
                          borderRadius: "8px",
                          fontSize: "11px",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#3b82f6"
                        fill="url(#accountingRevenue)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex gap-1 bg-[#0d1a2d] p-1 rounded-lg">
                    {["all", "paid", "pending", "overdue"].map((value) => (
                      <button
                        key={value}
                        onClick={() => {
                          setPage(1);
                          setStatusFilter(value);
                        }}
                        className={`px-3 py-1 rounded-md text-xs font-medium ${statusFilter === value ? "bg-blue-600 text-white" : "text-gray-400"}`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                    <Input
                      placeholder="Search invoices, descriptions, or customers..."
                      value={search}
                      onChange={(event) => {
                        setPage(1);
                        setSearch(event.target.value);
                      }}
                      className="pl-8 h-8 text-xs"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {invoicesLoading ? (
                  <div className="p-4 space-y-3">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <Skeleton key={index} className="h-16 w-full" />
                    ))}
                  </div>
                ) : invoices.length === 0 ? (
                  <div className="p-4">
                    <p className="text-sm text-gray-500">No invoices found for this filter.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#1e2d40]">
                        {["Invoice", "Customer", "Due", "Amount", "Status", "Action"].map((heading) => (
                          <th
                            key={heading}
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap"
                          >
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((invoice: any) => (
                        <tr key={invoice._id} className="border-b border-[#1e2d40] hover:bg-[#0d1a2d]">
                          <td className="px-4 py-3">
                            <p className="text-xs font-medium text-blue-400">{invoice.transaction_id}</p>
                            <p className="text-[10px] text-gray-500">{invoice.description || "No description"}</p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Avatar className="w-7 h-7">
                                <AvatarFallback className="text-[9px]">
                                  {getInitials(invoice.customer_id?.name || "NA")}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-xs text-gray-200">
                                  {invoice.customer_id?.name || "No customer linked"}
                                </p>
                                <p className="text-[10px] text-gray-500">
                                  {invoice.customer_id?.email || invoice.type}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400">
                            {invoice.dueDate ? formatDate(invoice.dueDate) : "No due date"}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-200">
                            {formatCurrency(invoice.amount || 0)}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={statusVariant[invoice.status] || "secondary"} className="text-[10px]">
                              {invoice.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px]"
                              disabled={invoice.status === "paid" || recordPaymentMutation.isPending}
                              onClick={() => recordPaymentMutation.mutate(String(invoice._id))}
                            >
                              Mark paid
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                )}

                <div className="flex items-center justify-between px-4 py-3 border-t border-[#1e2d40]">
                  <p className="text-xs text-gray-500">
                    Page {meta.page || page} of {Math.max(1, Math.ceil((meta.total || 0) / (meta.limit || 10)))}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[10px]"
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[10px]"
                      onClick={() => setPage((current) => current + 1)}
                      disabled={(meta.total || 0) <= page * (meta.limit || 10)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Payment Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {["paid", "pending", "overdue", "cancelled"].map((status) => (
                  <div key={status} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-gray-400 capitalize">{status}</span>
                    </div>
                    <span className="text-gray-200">{formatCurrency(breakdownMap[status] || 0)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Outstanding Queue</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {invoices
                  .filter((invoice: any) => ["pending", "overdue"].includes(invoice.status))
                  .slice(0, 5)
                  .map((invoice: any) => (
                    <div key={invoice._id} className="rounded-lg bg-[#1e2d40] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-gray-200">{invoice.transaction_id}</p>
                        <Badge variant={statusVariant[invoice.status] || "secondary"} className="text-[10px]">
                          {invoice.status}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1">
                        {invoice.customer_id?.name || "No customer linked"}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        {invoice.dueDate ? `Due ${formatDate(invoice.dueDate)}` : "No due date"}
                      </p>
                      <p className="text-xs text-gray-200 mt-1">{formatCurrency(invoice.amount || 0)}</p>
                    </div>
                  ))}
                {invoices.filter((invoice: any) => ["pending", "overdue"].includes(invoice.status)).length === 0 ? (
                  <p className="text-sm text-gray-500">No pending or overdue invoices in the current result set.</p>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
