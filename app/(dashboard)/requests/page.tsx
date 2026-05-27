/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requestsApi } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { getInitials, formatDate, timeAgo } from "@/lib/utils";
import { toast } from "sonner";
import { Check, X, Clock, CheckSquare, ListFilter } from "lucide-react";

const statusVariant: Record<string, any> = {
  pending: "warning",
  approved: "success",
  rejected: "destructive",
};

const requestTypeLabels: Record<string, string> = {
  time_off: "Time Off",
  break_adjustment: "Break Adjustment",
  schedule_change: "Schedule Change",
  other: "Other",
};

const formatRequestDateRange = (request: any) => {
  const from = request?.dateRange?.from;
  const to = request?.dateRange?.to;
  if (!from && !to) return "No date range provided";
  if (from && to) return `${formatDate(from)} – ${formatDate(to)}`;
  return formatDate(from || to);
};

export default function RequestsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["requests", statusFilter],
    queryFn: () =>
      requestsApi
        .getAll({
          status: statusFilter === "all" ? undefined : statusFilter,
          limit: 100,
        })
        .then((response) => response.data),
  });

  const requests = data?.data || [];

  useEffect(() => {
    if (!selectedId && requests.length > 0) {
      setSelectedId(String(requests[0]._id));
    }
  }, [requests, selectedId]);

  const selectedRequest = useMemo(
    () =>
      requests.find((request: any) => String(request._id) === selectedId) || null,
    [requests, selectedId]
  );

  const approveMutation = useMutation({
    mutationFn: (id: string) => requestsApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      toast.success("Request approved");
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message || "Failed to approve request"),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => requestsApi.reject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      toast.success("Request rejected");
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message || "Failed to reject request"),
  });

  const allRequests = data?.data || [];
  const counts = {
    all: allRequests.length,
    pending: allRequests.filter((r: any) => r.status === "pending").length,
    approved: allRequests.filter((r: any) => r.status === "approved").length,
    rejected: allRequests.filter((r: any) => r.status === "rejected").length,
  };

  const stats = [
    {
      label: "Pending",
      value: counts.pending,
      helper: "Needs review",
      icon: Clock,
      color: "bg-amber-600",
    },
    {
      label: "Approved",
      value: counts.approved,
      helper: "Resolved",
      icon: Check,
      color: "bg-emerald-600",
    },
    {
      label: "Rejected",
      value: counts.rejected,
      helper: "Closed",
      icon: X,
      color: "bg-red-600",
    },
    {
      label: "Total Requests",
      value: counts.all,
      helper: "All records",
      icon: CheckSquare,
      color: "bg-blue-600",
    },
  ];

  const tabs = [
    { label: "All Requests", value: "all", count: counts.all },
    { label: "Pending", value: "pending", count: counts.pending },
    { label: "Approved", value: "approved", count: counts.approved },
    { label: "Rejected", value: "rejected", count: counts.rejected },
  ];

  return (
    <div>
      <Header
        title="Requests"
        subtitle="Approve or reject employee requests."
        action={
          <Button variant="outline" size="sm" className="h-8 text-xs">
            <ListFilter className="w-3.5 h-3.5 mr-1" />
            Filter
          </Button>
        }
      />
      <div className="space-y-5 p-3 sm:p-4 lg:p-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map((item) => (
            <Card key={item.label}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg ${item.color} flex items-center justify-center shrink-0`}
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

        {/* Status tabs */}
        <div className="flex flex-wrap gap-1 bg-[#0d1a2d] p-1 rounded-lg w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                statusFilter === tab.value
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span
                  className={`text-[9px] rounded-full px-1.5 py-0.5 ${
                    statusFilter === tab.value
                      ? "bg-white/20 text-white"
                      : "bg-[#1e2d40] text-gray-400"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Request list */}
          <div className="lg:col-span-2 space-y-3">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <Card key={index}>
                  <CardContent className="pt-4">
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))
            ) : requests.length === 0 ? (
              <Card>
                <CardContent className="pt-8 pb-8 text-center">
                  <CheckSquare className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No requests found.</p>
                </CardContent>
              </Card>
            ) : (
              requests.map((request: any) => (
                <Card
                  key={request._id}
                  className={`cursor-pointer transition-colors ${
                    selectedId === String(request._id)
                      ? "border-blue-600/30 bg-blue-600/5"
                      : "hover:border-blue-600/20"
                  }`}
                  onClick={() => setSelectedId(String(request._id))}
                >
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-start gap-3">
                      <Avatar className="w-9 h-9 shrink-0">
                        <AvatarFallback className="text-xs">
                          {getInitials(request.employees_id?.name || "EM")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <p className="text-sm font-medium text-gray-200 truncate">
                            {request.employees_id?.name || "Employee"}
                          </p>
                          <span className="text-[10px] text-gray-500 shrink-0">
                            {timeAgo(request.createdAt)}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400">
                          {request.employees_id?.email || "No email"}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <Badge
                            variant="secondary"
                            className="text-[9px] bg-[#1e2d40] text-gray-300"
                          >
                            {requestTypeLabels[request.type] || request.type}
                          </Badge>
                          <span className="text-[10px] text-gray-500">
                            {formatRequestDateRange(request)}
                          </span>
                        </div>
                        {request.reason && (
                          <p className="text-xs text-gray-400 mt-1.5 line-clamp-2">
                            {request.reason}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <Badge
                          variant={statusVariant[request.status] || "secondary"}
                          className="text-[10px]"
                        >
                          {request.status}
                        </Badge>
                        {request.status === "pending" && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="success"
                              className="h-7 px-2 text-[10px]"
                              onClick={(event) => {
                                event.stopPropagation();
                                approveMutation.mutate(String(request._id));
                              }}
                              disabled={approveMutation.isPending}
                            >
                              <Check className="w-3 h-3 mr-1" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 px-2 text-[10px]"
                              onClick={(event) => {
                                event.stopPropagation();
                                rejectMutation.mutate(String(request._id));
                              }}
                              disabled={rejectMutation.isPending}
                            >
                              <X className="w-3 h-3 mr-1" /> Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Request detail panel */}
          <div>
            {selectedRequest ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Request Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback>
                        {getInitials(selectedRequest.employees_id?.name || "EM")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold text-gray-100">
                        {selectedRequest.employees_id?.name || "Employee"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {selectedRequest.employees_id?.email}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-0 text-xs">
                    {[
                      {
                        label: "Request Type",
                        value:
                          requestTypeLabels[selectedRequest.type] || selectedRequest.type,
                      },
                      { label: "Status", value: selectedRequest.status },
                      {
                        label: "Date Range",
                        value: formatRequestDateRange(selectedRequest),
                      },
                      {
                        label: "Duration",
                        value: selectedRequest.durationMinutes
                          ? `${selectedRequest.durationMinutes} mins`
                          : "Not specified",
                      },
                      {
                        label: "Requested On",
                        value: formatDate(selectedRequest.createdAt),
                      },
                    ].map((row) => (
                      <div
                        key={row.label}
                        className="flex justify-between py-2 border-b border-[#1e2d40] last:border-0"
                      >
                        <span className="text-gray-500">{row.label}</span>
                        <span className="text-gray-200 text-right max-w-[55%] truncate capitalize">
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  {selectedRequest.reason && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Reason</p>
                      <p className="text-xs text-gray-300 bg-[#1e2d40] rounded-lg p-3 leading-relaxed">
                        {selectedRequest.reason}
                      </p>
                    </div>
                  )}

                  {selectedRequest.adminNote && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Admin Note</p>
                      <p className="text-xs text-gray-300 bg-[#1e2d40] rounded-lg p-3 leading-relaxed">
                        {selectedRequest.adminNote}
                      </p>
                    </div>
                  )}

                  {selectedRequest.status === "pending" && (
                    <div className="space-y-2">
                      <Button
                        className="w-full text-xs"
                        onClick={() =>
                          approveMutation.mutate(String(selectedRequest._id))
                        }
                        disabled={approveMutation.isPending}
                      >
                        <Check className="w-3.5 h-3.5 mr-1" />
                        Approve Request
                      </Button>
                      <Button
                        variant="destructive"
                        className="w-full text-xs"
                        onClick={() =>
                          rejectMutation.mutate(String(selectedRequest._id))
                        }
                        disabled={rejectMutation.isPending}
                      >
                        <X className="w-3.5 h-3.5 mr-1" />
                        Reject Request
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-8 pb-8 text-center">
                  <CheckSquare className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">
                    Select a request to view details.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
