/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { accountingApi } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { asArray, formatCurrency, formatDate, getInitials } from "@/lib/utils";
import { toast } from "sonner";
import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  CreditCard,
  Download,
  DollarSign,
  Eye,
  Search,
  TrendingUp,
  Sparkles,
  Receipt,
  Send,
  FileText,
  MoreHorizontal,
  Plus,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const formatRevenuePoint = (entry: any) => {
  if (entry?._id?.day) {
    return `${String(entry._id.month).padStart(2, "0")}/${String(entry._id.day).padStart(2, "0")}`;
  }
  if (entry?._id?.week) return `W${entry._id.week}`;
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

const sparklineFor = (seed: number, color: string) => {
  const points = Array.from({ length: 12 }, (_, index) => {
    const noise = ((seed * 9301 + index * 49297) % 233280) / 233280;
    return 8 + Math.round(noise * 16);
  });
  const path = points
    .map((value, index) => `${(index / (points.length - 1)) * 100},${24 - value}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 24" className="h-6 w-16 shrink-0" preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={path}
      />
    </svg>
  );
};

const PIE_COLORS: Record<string, string> = {
  paid: "#10b981",
  pending: "#f59e0b",
  overdue: "#ef4444",
  cancelled: "#6b7280",
};

export default function AccountingPage() {
  const queryClient = useQueryClient();
  const headerActionRef = useRef<HTMLDivElement>(null);
  const tableActionRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [period, setPeriod] = useState("month");
  const [createOpen, setCreateOpen] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [tableActionOpen, setTableActionOpen] = useState(false);
  const [createType, setCreateType] = useState("invoice");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [invoiceForm, setInvoiceForm] = useState({
    amount: "",
    dueDate: "",
    description: "",
    type: "invoice",
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("create") !== "invoice") return;

    const openTimer = window.setTimeout(() => {
      setCreateOpen(true);
      params.delete("create");
      const query = params.toString();
      window.history.replaceState(null, "", query ? `/accounting?${query}` : "/accounting");
    }, 0);
    return () => window.clearTimeout(openTimer);
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      const isHeaderAction = headerActionRef.current?.contains(target);
      const isTableAction = tableActionRef.current?.contains(target);

      if (!isHeaderAction) {
        setActionOpen(false);
      }
      if (!isTableAction) {
        setTableActionOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const openCreateDialog = (type = "invoice") => {
    setCreateType(type);
    setInvoiceForm((current) => ({ ...current, type }));
    setCreateOpen(true);
    setActionOpen(false);
    setTableActionOpen(false);
  };

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

  const { data: selectedInvoiceResponse, isLoading: selectedInvoiceLoading } = useQuery({
    queryKey: ["accounting-invoice-detail", selectedInvoiceId],
    queryFn: () => accountingApi.getById(String(selectedInvoiceId)).then((response) => response.data),
    enabled: Boolean(selectedInvoiceId),
  });

  const createTypeLabel =
    {
      invoice: "Invoice",
      quote: "Quote",
      expense: "Expense",
      credit_note: "Credit Note",
    }[createType] || "Invoice";

  const createInvoiceMutation = useMutation({
    mutationFn: () =>
      accountingApi.create({
        amount: Number(invoiceForm.amount),
        dueDate: invoiceForm.dueDate || undefined,
        description: invoiceForm.description || undefined,
        type: createType || invoiceForm.type || "invoice",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounting-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["accounting-invoices"] });
      setCreateOpen(false);
      setCreateType("invoice");
      setInvoiceForm({ amount: "", dueDate: "", description: "", type: "invoice" });
      toast.success(`${createTypeLabel} created`);
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message || `Failed to create ${createTypeLabel.toLowerCase()}`),
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

  const exportInvoices = async () => {
    try {
      const response = await accountingApi.export();
      const blob = new Blob([response.data], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "invoices.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to export invoices");
    }
  };

  const dashboard = dashboardResponse?.data || {};
  const invoices = asArray(invoicesResponse?.data);
  const meta = invoicesResponse?.meta || {};
  const selectedInvoice = selectedInvoiceResponse?.data;

  const chartData = useMemo(
    () =>
      asArray(revenueResponse?.data).map((entry: any) => ({
        label: formatRevenuePoint(entry),
        revenue: entry.revenue || 0,
      })),
    [revenueResponse?.data]
  );

  const breakdownMap = useMemo(
    () =>
      asArray(dashboard.paymentBreakdown).reduce(
        (acc: Record<string, number>, item: any) => {
          acc[item._id] = item.total || 0;
          return acc;
        },
        {}
      ),
    [dashboard.paymentBreakdown]
  );

  const pieData = useMemo(
    () =>
      ["paid", "pending", "overdue", "cancelled"]
        .map((key) => ({ name: key, value: breakdownMap[key] || 0 }))
        .filter((d) => d.value > 0),
    [breakdownMap]
  );

  const stats = [
    {
      label: "Revenue Today",
      value: formatCurrency(dashboard.revenueToday || 0),
      helper: "18% vs yesterday",
      icon: DollarSign,
      color: "bg-emerald-600",
      spark: "#10b981",
      seed: 13,
    },
    {
      label: "Revenue This Week",
      value: formatCurrency(dashboard.revenueWeek || 0),
      helper: "12% vs last week",
      icon: TrendingUp,
      color: "bg-blue-600",
      spark: "#3b82f6",
      seed: 27,
    },
    {
      label: "Revenue This Month",
      value: formatCurrency(dashboard.revenueMonth || 0),
      helper: "24% vs last month",
      icon: TrendingUp,
      color: "bg-purple-600",
      spark: "#a855f7",
      seed: 5,
    },
    {
      label: "Outstanding Payments",
      value: formatCurrency(dashboard.outstandingAmount || 0),
      helper: `${dashboard.outstandingCount || 0} invoices pending`,
      icon: AlertTriangle,
      color: "bg-amber-600",
      spark: "#f59e0b",
      seed: 19,
    },
  ];

  const koraInsights = useMemo(() => {
    const items: { icon: any; title: string; sub: string; color: string }[] = [];
    if ((dashboard.outstandingCount || 0) > 0) {
      items.push({
        icon: AlertTriangle,
        title: `${dashboard.outstandingCount} outstanding invoices`,
        sub: `${formatCurrency(dashboard.outstandingAmount || 0)} awaiting payment`,
        color: "bg-amber-600/15 text-amber-300",
      });
    }
    if (chartData.length > 1) {
      const last = chartData[chartData.length - 1]?.revenue || 0;
      const prev = chartData[chartData.length - 2]?.revenue || 0;
      if (last > prev) {
        items.push({
          icon: TrendingUp,
          title: "Revenue trending up",
          sub: "Latest period shows growth",
          color: "bg-emerald-600/15 text-emerald-300",
        });
      }
    }
    if (items.length === 0) {
      items.push({
        icon: Sparkles,
        title: "Finances on track",
        sub: "No anomalies detected",
        color: "bg-emerald-600/15 text-emerald-300",
      });
    }
    return items;
  }, [dashboard.outstandingCount, dashboard.outstandingAmount, chartData]);

  const accountingActions = [
    { label: "Create Invoice", description: "Create a customer invoice", icon: Receipt, onClick: () => openCreateDialog("invoice") },
    {
      label: "Record Payment",
      description: "Review pending invoices to mark paid",
      icon: CreditCard,
      onClick: () => {
        setStatusFilter("pending");
        setPage(1);
        setActionOpen(false);
        setTableActionOpen(false);
        toast.info("Select a pending invoice and use the payment action.");
      },
    },
    { label: "Create Quote", description: "Create an estimate before invoicing", icon: FileText, onClick: () => openCreateDialog("quote") },
    { label: "Create Expense", description: "Add a business expense", icon: DollarSign, onClick: () => openCreateDialog("expense") },
    { label: "Create Credit Note", description: "Issue a refund or correction", icon: Receipt, onClick: () => openCreateDialog("credit_note") },
    { label: "Export Report", description: "Download accounting report data", icon: Download, onClick: () => { setActionOpen(false); setTableActionOpen(false); exportInvoices(); } },
  ];

  return (
    <div>
      <Header
        title="Accounting"
        subtitle="Track your finances, manage invoices and grow your business."
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={exportInvoices}>
              <Download className="w-3.5 h-3.5 mr-1" />
              Export
            </Button>
            <div ref={headerActionRef} className="relative">
              <Button
                size="sm"
                className="h-8 bg-blue-600 text-xs hover:bg-blue-700"
                onClick={() => {
                  setActionOpen((current) => !current);
                  setTableActionOpen(false);
                }}
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                New Action
                <ChevronDown className="ml-1 h-3.5 w-3.5" />
              </Button>
              {actionOpen ? (
                <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-lg border border-[#1e2d40] bg-[#0d1a2d] shadow-xl">
                  {accountingActions.map((action) => (
                    <button
                      key={action.label}
                      type="button"
                      onClick={action.onClick}
                      className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[#1e2d40]"
                    >
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600/15 text-blue-300">
                        <action.icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs font-medium text-gray-100">{action.label}</span>
                        <span className="block text-[10px] leading-4 text-gray-500">{action.description}</span>
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        }
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create {createTypeLabel}</DialogTitle>
            <DialogDescription>
              {createType === "expense"
                ? "Add a business expense for operational tracking."
                : createType === "quote"
                  ? "Create an estimate that can later be converted to an invoice."
                  : createType === "credit_note"
                    ? "Create a correction or refund document."
                    : "Create a new invoice through your accounting system."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-gray-400">Amount</label>
              <Input
                type="number"
                min="0"
                value={invoiceForm.amount}
                onChange={(event) => setInvoiceForm((current) => ({ ...current, amount: event.target.value }))}
                placeholder="120.00"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">Due date</label>
              <Input
                type="date"
                value={invoiceForm.dueDate}
                onChange={(event) => setInvoiceForm((current) => ({ ...current, dueDate: event.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">Description</label>
              <Input
                value={invoiceForm.description}
                onChange={(event) => setInvoiceForm((current) => ({ ...current, description: event.target.value }))}
                placeholder={createType === "expense" ? "Expense notes or vendor" : `${createTypeLabel} description`}
              />
            </div>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={!Number(invoiceForm.amount) || createInvoiceMutation.isPending}
              onClick={() => createInvoiceMutation.mutate()}
            >
              Create {createTypeLabel}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedInvoiceId)} onOpenChange={(open) => !open && setSelectedInvoiceId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invoice Detail</DialogTitle>
            <DialogDescription>Fetched from /api/v1/accounting/:id.</DialogDescription>
          </DialogHeader>
          {selectedInvoiceLoading ? (
            <Skeleton className="h-36 w-full" />
          ) : selectedInvoice ? (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-[#1e2d40] pb-2">
                <span className="text-gray-500">Invoice</span>
                <span className="font-medium text-gray-100">{selectedInvoice.transaction_id}</span>
              </div>
              <div className="flex justify-between border-b border-[#1e2d40] pb-2">
                <span className="text-gray-500">Client</span>
                <span className="text-gray-100">{selectedInvoice.customer_id?.name || "No customer"}</span>
              </div>
              <div className="flex justify-between border-b border-[#1e2d40] pb-2">
                <span className="text-gray-500">Amount</span>
                <span className="text-gray-100">{formatCurrency(selectedInvoice.amount || 0)}</span>
              </div>
              <div className="flex justify-between border-b border-[#1e2d40] pb-2">
                <span className="text-gray-500">Status</span>
                <Badge variant={statusVariant[selectedInvoice.status] || "secondary"}>{selectedInvoice.status}</Badge>
              </div>
              <p className="text-xs text-gray-400">{selectedInvoice.description || "No description provided."}</p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <div className="p-3 sm:p-4 lg:p-6">
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_272px]">
          <div className="min-w-0 space-y-4">
        {/* Stats with sparklines */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
          {dashboardLoading
            ? Array.from({ length: 4 }).map((_, index) => (
                <Card key={index} className="border-[#173050] bg-[radial-gradient(circle_at_100%_0%,rgba(37,99,235,0.12),transparent_34%),linear-gradient(135deg,#071321,#0b1a2f)]">
                  <CardContent className="min-h-[110px] pt-4">
                    <Skeleton className="h-14 w-full" />
                  </CardContent>
                </Card>
              ))
            : stats.map((item) => (
                <Card key={item.label} className="overflow-hidden border-[#173050] bg-[radial-gradient(circle_at_100%_0%,rgba(37,99,235,0.14),transparent_34%),linear-gradient(135deg,#071321,#0b1a2f)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <CardContent className="min-h-[110px] px-4 py-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center shrink-0 shadow-[0_0_22px_rgba(59,130,246,0.18)]`}
                        >
                          <item.icon className="w-4 h-4 text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-medium text-gray-300">{item.label}</p>
                          <p className="mt-2 text-2xl font-bold leading-none text-white">{item.value}</p>
                          <p className="mt-2 truncate text-[11px] text-emerald-400">{item.helper}</p>
                        </div>
                      </div>
                      {sparklineFor(item.seed, item.spark)}
                    </div>
                  </CardContent>
                </Card>
              ))}
        </div>

            {/* Revenue chart */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <CardTitle className="text-sm">Revenue Overview</CardTitle>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1 bg-[#0d1a2d] p-1 rounded-lg">
                      {["day", "week", "month", "year"].map((value) => (
                        <button
                          key={value}
                          onClick={() => setPeriod(value)}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize ${period === value ? "bg-blue-600 text-white" : "text-gray-400 hover:text-gray-200"}`}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                    <button className="hidden h-9 items-center gap-2 rounded-lg border border-[#1e2d40] bg-[#0d1a2d] px-3 text-xs text-gray-300 sm:flex">
                      <CalendarDays className="h-3.5 w-3.5" />
                      This Month
                      <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {revenueLoading ? (
                  <Skeleton className="h-44 w-full" />
                ) : chartData.length === 0 ? (
                  <p className="text-sm text-gray-500 py-8 text-center">
                    No revenue data available for this period.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={210}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="accountingRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10, fill: "#64748b" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "#64748b" }}
                        axisLine={false}
                        tickLine={false}
                      />
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

            {/* Invoices */}
            <Card>
              <CardHeader>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-sm">Invoices</CardTitle>
                    <div className="flex items-center gap-2">
                      <div className="relative hidden sm:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                        <Input
                          placeholder="Search invoices..."
                          value={search}
                          onChange={(event) => {
                            setPage(1);
                            setSearch(event.target.value);
                          }}
                          className="h-9 w-72 pl-8 text-xs"
                        />
                      </div>
                      <div ref={tableActionRef} className="relative">
                        <Button
                          className="h-9 gap-2 bg-blue-600 text-xs hover:bg-blue-700"
                          onClick={() => {
                            setTableActionOpen((current) => !current);
                            setActionOpen(false);
                          }}
                        >
                          <Plus className="h-4 w-4" />
                          Create Invoice
                          <ChevronDown className="h-4 w-4 border-l border-blue-400/30 pl-1" />
                        </Button>
                        {tableActionOpen ? (
                          <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-lg border border-[#1e2d40] bg-[#0d1a2d] shadow-xl">
                            {accountingActions.map((action) => (
                              <button
                                key={action.label}
                                type="button"
                                onClick={action.onClick}
                                className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[#1e2d40]"
                              >
                                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600/15 text-blue-300">
                                  <action.icon className="h-4 w-4" />
                                </span>
                                <span className="min-w-0">
                                  <span className="block text-xs font-medium text-gray-100">{action.label}</span>
                                  <span className="block text-[10px] leading-4 text-gray-500">{action.description}</span>
                                </span>
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 bg-[#0d1a2d] p-1 rounded-lg flex-wrap w-fit">
                    {["all", "paid", "pending", "overdue"].map((value) => (
                      <button
                        key={value}
                        onClick={() => {
                          setPage(1);
                          setStatusFilter(value);
                        }}
                        className={`px-3 py-1 rounded-md text-xs font-medium capitalize ${statusFilter === value ? "bg-blue-600 text-white" : "text-gray-400 hover:text-gray-200"}`}
                      >
                        {value}
                      </button>
                    ))}
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
                    <p className="text-sm text-gray-500">No invoices found.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[#1e2d40]">
                          {["Invoice", "Client", "Date", "Due Date", "Amount", "Status", "Actions"].map(
                            (heading) => (
                              <th
                                key={heading}
                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap"
                              >
                                {heading}
                              </th>
                            )
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map((invoice: any) => (
                          <tr
                            key={invoice._id}
                            className="border-b border-[#1e2d40] hover:bg-[#0d1a2d]"
                          >
                            <td className="px-4 py-3">
                              <p className="text-xs font-medium text-blue-400">
                                {invoice.transaction_id}
                              </p>
                              <p className="text-[10px] text-gray-500">
                                {invoice.description || "No description"}
                              </p>
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
                                    {invoice.customer_id?.name || "No customer"}
                                  </p>
                                  <p className="text-[10px] text-gray-500">
                                    {invoice.customer_id?.email || invoice.type}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                              {invoice.transaction_date
                                ? formatDate(invoice.transaction_date)
                                : invoice.createdAt
                                  ? formatDate(invoice.createdAt)
                                  : "—"}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                              {invoice.dueDate ? formatDate(invoice.dueDate) : "—"}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-200 whitespace-nowrap">
                              {formatCurrency(invoice.amount || 0)}
                            </td>
                            <td className="px-4 py-3">
                              <Badge
                                variant={statusVariant[invoice.status] || "secondary"}
                                className="text-[10px]"
                              >
                                {invoice.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-8 w-8 rounded-lg"
                                  onClick={() => setSelectedInvoiceId(String(invoice._id))}
                                  title="Invoice detail"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-8 w-8 rounded-lg"
                                  disabled={invoice.status === "paid" || recordPaymentMutation.isPending}
                                  onClick={() => recordPaymentMutation.mutate(String(invoice._id))}
                                  title="Record payment"
                                >
                                  <Send className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="icon" variant="outline" className="h-8 w-8 rounded-lg" title="More actions">
                                  <MoreHorizontal className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="flex items-center justify-between px-4 py-3 border-t border-[#1e2d40]">
                  <p className="text-xs text-gray-500">
                    Page {meta.page || page} of{" "}
                    {Math.max(1, Math.ceil((meta.total || 0) / (meta.limit || 10)))}
                  </p>
                  <button
                    className="hidden items-center gap-2 text-xs text-blue-400 hover:text-blue-300 sm:inline-flex"
                    onClick={() => setPage((current) => current + 1)}
                    disabled={(meta.total || 0) <= page * (meta.limit || 10)}
                  >
                    View all invoices <Send className="h-3.5 w-3.5" />
                  </button>
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

          {/* Right panel */}
          <div className="space-y-4">
            <Card className="overflow-hidden border-[#173050] bg-[radial-gradient(circle_at_50%_18%,rgba(37,99,235,0.28),transparent_34%),linear-gradient(135deg,#071321,#0b1a2f)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <CardContent className="px-4 py-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">Kora Insights</span>
                  <Sparkles className="h-4 w-4 text-blue-400" />
                </div>
                <div className="mx-auto mb-4 flex h-28 w-28 items-center justify-center rounded-full bg-blue-600/10 shadow-[0_0_42px_rgba(37,99,235,0.45)]">
                  <Image src="/kora.png" alt="Kora" width={112} height={112} className="h-28 w-28 object-contain" priority />
                </div>
                <div className="space-y-2">
                  {koraInsights.slice(0, 3).map((insight) => {
                    const InsightIcon = insight.icon;
                    return (
                      <div
                        key={insight.title}
                        className={`flex min-h-[62px] items-start gap-3 rounded-lg border border-[#1e2d40] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] ${insight.color}`}
                      >
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0d1a2d]/70">
                          <InsightIcon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-xs font-medium text-gray-100">{insight.title}</p>
                          <p className="mt-1 line-clamp-2 text-[11px] opacity-75">{insight.sub}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4 h-9 w-full border-blue-500/50 bg-blue-600/20 text-xs text-blue-100 hover:bg-blue-600/30"
                  onClick={() => toast.info("Kora financial assistant is ready.")}
                >
                  <Sparkles className="mr-2 h-3.5 w-3.5" />
                  Ask Kora anything...
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Payments Overview</CardTitle>
              </CardHeader>
              <CardContent>
                {pieData.length === 0 ? (
                  <p className="text-xs text-gray-500">No payment data yet.</p>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={132}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={36}
                          outerRadius={56}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {pieData.map((entry) => (
                            <Cell
                              key={entry.name}
                              fill={PIE_COLORS[entry.name] || "#6b7280"}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => formatTooltipCurrency(value)}
                          contentStyle={{
                            background: "#0d1a2d",
                            border: "1px solid #1e2d40",
                            borderRadius: "8px",
                            fontSize: "11px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1.5">
                      {pieData.map((entry) => (
                        <div
                          key={entry.name}
                          className="flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ background: PIE_COLORS[entry.name] || "#6b7280" }}
                            />
                            <span className="text-gray-400 capitalize">{entry.name}</span>
                          </div>
                          <span className="text-gray-200">{formatCurrency(entry.value)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => openCreateDialog("invoice")}
                    className="flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-lg border border-[#1e2d40] bg-[#0d1a2d] px-2 py-3 text-center text-[11px] text-gray-200 transition-colors hover:bg-[#10213a]"
                  >
                    <Receipt className="h-5 w-5 text-blue-400" />
                    Create Invoice
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter("pending");
                      setPage(1);
                      toast.info("Select a pending invoice and use the payment action.");
                    }}
                    className="flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-lg border border-[#1e2d40] bg-[#0d1a2d] px-2 py-3 text-center text-[11px] text-gray-200 transition-colors hover:bg-[#10213a]"
                  >
                    <CreditCard className="h-5 w-5 text-blue-400" />
                    Record Payment
                  </button>
                  <button
                    type="button"
                    onClick={exportInvoices}
                    className="flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-lg border border-[#1e2d40] bg-[#0d1a2d] px-2 py-3 text-center text-[11px] text-gray-200 transition-colors hover:bg-[#10213a]"
                  >
                    <Download className="h-5 w-5 text-blue-400" />
                    Add Report
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

