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
import { Check, X, Clock, CheckSquare } from "lucide-react";

const statusStyles: Record<string, any> = {
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
  if (from && to) return `${formatDate(from)} - ${formatDate(to)}`;
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
        .getAll({ status: statusFilter === "all" ? undefined : statusFilter, limit: 100 })
        .then((response) => response.data),
  });

  const requests = data?.data || [];

  useEffect(() => {
    if (!selectedId && requests.length > 0) {
      setSelectedId(String(requests[0]._id));
    }
  }, [requests, selectedId]);

  const selectedRequest = useMemo(
    () => requests.find((request: any) => String(request._id) === selectedId) || null,
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

  const counts = {
    all: requests.length,
    pending: requests.filter((request: any) => request.status === "pending").length,
    approved: requests.filter((request: any) => request.status === "approved").length,
    rejected: requests.filter((request: any) => request.status === "rejected").length,
  };

  const stats = [
    {
      label: "Pending Requests",
      value: counts.pending,
      helper: "Needs review",
      icon: Clock,
      color: "bg-blue-600",
    },
    {
      label: "Approved",
      value: counts.approved,
      helper: "Resolved successfully",
      icon: Check,
      color: "bg-emerald-600",
    },
    {
      label: "Rejected",
      value: counts.rejected,
      helper: "Closed requests",
      icon: X,
      color: "bg-red-600",
    },
    {
      label: "Total Requests",
      value: counts.all,
      helper: "Live backend records",
      icon: CheckSquare,
      color: "bg-purple-600",
    },
  ];

  return (
    <div>
      <Header
        title="Requests"
        subtitle="Approve or reject employee requests using live backend data."
      />
      <div className="space-y-5 p-3 sm:p-4 lg:p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((item) => (
            <Card key={item.label}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg ${item.color} flex items-center justify-center flex-shrink-0`}>
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

        <div className="flex flex-wrap gap-1 bg-[#0d1a2d] p-1 rounded-lg w-fit">
          {[
            { label: "All", value: "all" },
            { label: "Pending", value: "pending" },
            { label: "Approved", value: "approved" },
            { label: "Rejected", value: "rejected" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium ${statusFilter === tab.value ? "bg-blue-600 text-white" : "text-gray-400 hover:text-gray-200"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
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
                <CardContent className="pt-6">
                  <p className="text-sm text-gray-500">No requests found for this filter.</p>
                </CardContent>
              </Card>
            ) : (
              requests.map((request: any) => (
                <Card
                  key={request._id}
                  className={`cursor-pointer transition-colors ${selectedId === String(request._id) ? "border-blue-600/30 bg-blue-600/5" : "hover:border-blue-600/20"}`}
                  onClick={() => setSelectedId(String(request._id))}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="w-9 h-9 flex-shrink-0">
                        <AvatarFallback className="text-xs">
                          {getInitials(request.employees_id?.name || "EM")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-gray-200 truncate">
                            {request.employees_id?.name || "Employee"}
                          </p>
                          <span className="text-[10px] text-gray-500">
                            {timeAgo(request.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400">
                          {request.employees_id?.email || "No email available"}
                        </p>
                        <p className="text-xs text-gray-300 mt-2">
                          {requestTypeLabels[request.type] || request.type}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          {formatRequestDateRange(request)}
                        </p>
                        {request.reason && (
                          <p className="text-xs text-gray-400 mt-2 line-clamp-2">{request.reason}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant={statusStyles[request.status] || "secondary"} className="text-[10px]">
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
                            >
                              <Check className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 px-2 text-[10px]"
                              onClick={(event) => {
                                event.stopPropagation();
                                rejectMutation.mutate(String(request._id));
                              }}
                            >
                              <X className="w-3 h-3" />
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

          <div className="space-y-4">
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

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-[#1e2d40]">
                      <span className="text-gray-500">Request Type</span>
                      <span className="text-gray-200">
                        {requestTypeLabels[selectedRequest.type] || selectedRequest.type}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-[#1e2d40]">
                      <span className="text-gray-500">Status</span>
                      <span className="text-gray-200">{selectedRequest.status}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-[#1e2d40]">
                      <span className="text-gray-500">Date Range</span>
                      <span className="text-gray-200">{formatRequestDateRange(selectedRequest)}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-[#1e2d40]">
                      <span className="text-gray-500">Duration</span>
                      <span className="text-gray-200">
                        {selectedRequest.durationMinutes
                          ? `${selectedRequest.durationMinutes} mins`
                          : "Not specified"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-gray-500">Requested On</span>
                      <span className="text-gray-200">{formatDate(selectedRequest.createdAt)}</span>
                    </div>
                  </div>

                  {selectedRequest.reason && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Reason</p>
                      <p className="text-xs text-gray-300 bg-[#1e2d40] rounded-lg p-3">
                        {selectedRequest.reason}
                      </p>
                    </div>
                  )}

                  {selectedRequest.adminNote && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Admin Note</p>
                      <p className="text-xs text-gray-300 bg-[#1e2d40] rounded-lg p-3">
                        {selectedRequest.adminNote}
                      </p>
                    </div>
                  )}

                  {selectedRequest.status === "pending" && (
                    <div className="space-y-2">
                      <Button
                        className="w-full text-xs"
                        onClick={() => approveMutation.mutate(String(selectedRequest._id))}
                      >
                        <Check className="w-3.5 h-3.5 mr-1" />
                        Approve Request
                      </Button>
                      <Button
                        variant="destructive"
                        className="w-full text-xs"
                        onClick={() => rejectMutation.mutate(String(selectedRequest._id))}
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
                <CardContent className="pt-6">
                  <p className="text-sm text-gray-500">Select a request to view details.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
