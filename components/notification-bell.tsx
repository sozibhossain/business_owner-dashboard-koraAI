/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, CheckCheck, Mail } from "lucide-react";
import { toast } from "sonner";
import { notificationsApi } from "@/lib/api";
import { useSocketEvent } from "@/lib/socket";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { getInitials, timeAgo } from "@/lib/utils";

const TYPE_ICON: Record<string, string> = {
  message: "💬",
  mail: "📧",
  appointment: "📅",
  leave: "🏖️",
  call: "📞",
  system: "🔔",
};

export function NotificationBell() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEscape);
    };
  }, [isOpen]);

  const { data: countResponse } = useQuery({
    queryKey: ["notifications-unread-count"],
    queryFn: () =>
      notificationsApi.getUnreadCount().then((response) => response.data?.data),
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
  });

  const { data: listResponse, isLoading: listLoading } = useQuery({
    queryKey: ["notifications-list"],
    queryFn: () =>
      notificationsApi
        .getAll({ page: 1, limit: 15 })
        .then((response) => response.data?.data),
    enabled: isOpen,
  });

  const unreadCount: number = countResponse?.unreadCount ?? 0;
  const notifications: any[] = listResponse?.notifications || [];

  useSocketEvent<{ unreadCount: number }>("notification:unread-count", (payload) => {
    queryClient.setQueryData(
      ["notifications-unread-count"],
      (current: any) => ({ ...(current || {}), unreadCount: payload.unreadCount })
    );
    queryClient.invalidateQueries({ queryKey: ["notifications-list"] });
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-list"] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-list"] });
      toast.success("All notifications marked as read");
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message || "Failed to mark all read"),
  });

  const handleItemClick = (notification: any) => {
    if (!notification.isRead) {
      markReadMutation.mutate(notification._id);
    }
    if (notification.link) {
      setIsOpen(false);
    }
  };

  const badgeLabel = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <div className="relative" ref={containerRef}>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsOpen((value) => !value)}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
            {badgeLabel}
          </span>
        ) : null}
      </Button>

      {isOpen ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-[#1e2d40] bg-[#0a1628] shadow-2xl sm:w-96">
          <div className="flex items-center justify-between border-b border-[#1e2d40] px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-gray-100">Notifications</p>
              <p className="text-[10px] text-gray-500">
                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
              </p>
            </div>
            {unreadCount > 0 ? (
              <button
                onClick={() => markAllMutation.mutate()}
                disabled={markAllMutation.isPending}
                className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 disabled:opacity-50"
              >
                <CheckCheck className="h-3 w-3" />
                Mark all read
              </button>
            ) : null}
          </div>

          <div className="max-h-[440px] overflow-y-auto">
            {listLoading ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-14 w-full" />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
                <Mail className="mb-2 h-8 w-8 text-gray-600" />
                <p className="text-xs text-gray-500">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => {
                const inner = (
                  <div
                    className={`flex items-start gap-2.5 border-b border-[#1e2d40] px-4 py-3 transition-colors hover:bg-[#0d1a2d] ${
                      notification.isRead ? "" : "bg-blue-600/5"
                    }`}
                  >
                    <div className="relative shrink-0">
                      <Avatar className="h-8 w-8">
                        {notification.sender?.profileImage?.url ? (
                          <AvatarImage
                            src={notification.sender.profileImage.url}
                            alt={notification.sender?.name}
                          />
                        ) : (
                          <AvatarFallback className="text-[10px]">
                            {getInitials(notification.sender?.name || "System")}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-[#0a1628] text-xs leading-none">
                        {TYPE_ICON[notification.type] || "🔔"}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-xs font-medium text-gray-100">
                          {notification.title}
                        </p>
                        {!notification.isRead ? (
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                        ) : null}
                      </div>
                      {notification.body ? (
                        <p className="line-clamp-2 text-[11px] text-gray-400">
                          {notification.body}
                        </p>
                      ) : null}
                      <p className="mt-1 text-[10px] text-gray-500">
                        {timeAgo(notification.createdAt)}
                        {notification.sender?.name ? ` · ${notification.sender.name}` : ""}
                      </p>
                    </div>
                    {!notification.isRead ? (
                      <button
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          markReadMutation.mutate(notification._id);
                        }}
                        className="shrink-0 rounded p-1 text-gray-500 hover:bg-[#1e2d40] hover:text-blue-400"
                        title="Mark as read"
                        aria-label="Mark as read"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                    ) : null}
                  </div>
                );

                if (notification.link) {
                  return (
                    <Link
                      key={notification._id}
                      href={notification.link}
                      onClick={() => handleItemClick(notification)}
                      className="block"
                    >
                      {inner}
                    </Link>
                  );
                }

                return (
                  <button
                    key={notification._id}
                    onClick={() => handleItemClick(notification)}
                    className="block w-full text-left"
                  >
                    {inner}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
