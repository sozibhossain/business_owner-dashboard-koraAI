/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { inboxApi } from "@/lib/api";
import { useInboxSocket } from "@/lib/socket";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate, formatTime, getInitials, timeAgo } from "@/lib/utils";
import { toast } from "sonner";
import { ChevronLeft, Edit, Plus, Search, Send } from "lucide-react";

const getOtherParticipant = (conversation: any, currentUserId?: string) => {
  if (!conversation) return null;
  return (conversation.participants || []).find(
    (participant: any) => String(participant._id) !== String(currentUserId)
  );
};

const getConversationName = (conversation: any, currentUserId?: string) => {
  if (conversation?.groupName) return conversation.groupName;
  return getOtherParticipant(conversation, currentUserId)?.name || "Conversation";
};

const formatLastTime = (value?: string | Date | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  if (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  ) {
    return formatTime(date);
  }
  return formatDate(date);
};

export default function InboxPage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?._id;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [draft, setDraft] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const { data: conversationsResponse, isLoading: conversationsLoading } = useQuery({
    queryKey: ["inbox-conversations"],
    queryFn: () => inboxApi.getChats().then((response) => response.data),
  });

  const conversations: any[] = useMemo(
    () => conversationsResponse?.data || [],
    [conversationsResponse?.data]
  );

  const filteredConversations = useMemo(() => {
    const term = search.trim().toLowerCase();
    return conversations.filter((conversation) => {
      if (tab === "unread" && (conversation.unreadCount || 0) === 0) return false;
      if (!term) return true;
      const name = getConversationName(conversation, currentUserId).toLowerCase();
      const lastMessage = String(conversation.lastMessage || "").toLowerCase();
      return name.includes(term) || lastMessage.includes(term);
    });
  }, [conversations, currentUserId, search, tab]);

  useEffect(() => {
    if (!selectedId && filteredConversations.length > 0) {
      setSelectedId(String(filteredConversations[0]._id));
    }
  }, [filteredConversations, selectedId]);

  const selectedConversation = conversations.find(
    (conversation) => String(conversation._id) === selectedId
  );

  const { data: threadResponse, isLoading: threadLoading } = useQuery({
    queryKey: ["inbox-conversation", selectedId],
    enabled: Boolean(selectedId) && !String(selectedId).startsWith("pending-"),
    queryFn: () =>
      inboxApi.getChatById(String(selectedId)).then((response) => response.data),
  });

  const thread = threadResponse?.data;
  const messages: any[] = thread?.messages || (selectedConversation as any)?.messages || [];
  const recipient = getOtherParticipant(selectedConversation, currentUserId);

  const sendMutation = useMutation({
    mutationFn: () =>
      inboxApi.sendMessage({
        recipientId: String(recipient?._id),
        content: draft.trim(),
      }),
    onSuccess: (response) => {
      const realId = response.data?.data?.conversationId;
      queryClient.invalidateQueries({ queryKey: ["inbox-conversations"] });
      if (realId) {
        setSelectedId(String(realId));
        queryClient.invalidateQueries({ queryKey: ["inbox-conversation", String(realId)] });
      }
      setDraft("");
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message || "Failed to send"),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => inboxApi.markRead(id),
  });

  useEffect(() => {
    if (!selectedId || !thread || String(selectedId).startsWith("pending-")) return;
    const unread = (thread.messages || []).some(
      (message: any) =>
        String(message.sender_id) !== String(currentUserId) && !message.isRead
    );
    if (unread) {
      markReadMutation.mutate(selectedId, {
        onSuccess: () =>
          queryClient.invalidateQueries({ queryKey: ["inbox-conversations"] }),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, thread?._id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useInboxSocket(selectedId, {
    onNewMessage: (payload: any) => {
      const conversationId = String(payload.conversationId);
      queryClient.invalidateQueries({ queryKey: ["inbox-conversations"] });
      if (selectedId && conversationId === selectedId) {
        queryClient.setQueryData(
          ["inbox-conversation", selectedId],
          (current: any) => {
            if (!current?.data) return current;
            const exists = current.data.messages?.some(
              (m: any) => String(m._id) === String(payload.message?._id)
            );
            if (exists) return current;
            return {
              ...current,
              data: {
                ...current.data,
                messages: [...(current.data.messages || []), payload.message],
                lastMessage: payload.lastMessage,
                lastMessageAt: payload.lastMessageAt,
              },
            };
          }
        );
      }
    },
    onMessageRead: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox-conversations"] });
      if (selectedId) {
        queryClient.invalidateQueries({ queryKey: ["inbox-conversation", selectedId] });
      }
    },
    onNewConversation: () =>
      queryClient.invalidateQueries({ queryKey: ["inbox-conversations"] }),
  });

  const totalUnread = conversations.reduce(
    (sum, conversation) => sum + (conversation.unreadCount || 0),
    0
  );

  const canSend = Boolean(recipient?._id) && draft.trim().length > 0 && !sendMutation.isPending;

  const handleStartConversation = (peer: any) => {
    setComposerOpen(false);
    const existing = conversations.find((conversation) => {
      if (conversation.isGroup) return false;
      return (conversation.participants || []).some(
        (participant: any) => String(participant._id) === String(peer._id)
      );
    });

    if (existing) {
      setSelectedId(String(existing._id));
      return;
    }

    const placeholderId = `pending-${peer._id}`;
    queryClient.setQueryData(["inbox-conversations"], (current: any) => {
      const list = current?.data || [];
      if (list.some((c: any) => String(c._id) === placeholderId)) return current;
      const placeholder = {
        _id: placeholderId,
        participants: [
          { _id: currentUserId, name: session?.user?.name },
          peer,
        ],
        messages: [],
        lastMessage: "",
        lastMessageAt: null,
        unreadCount: 0,
        isGroup: false,
        __pending: true,
      };
      return { ...(current || {}), data: [placeholder, ...list] };
    });
    setSelectedId(placeholderId);
  };

  return (
    <div>
      <Header
        title="Inbox"
        subtitle="Live chat with your employees."
        action={
          <Button size="sm" onClick={() => setComposerOpen(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Message Employee
          </Button>
        }
      />
      <div className="p-3 sm:p-4 lg:p-6">
        <div
          className="grid grid-cols-1 gap-0 overflow-hidden rounded-xl border border-[#1e2d40] lg:grid-cols-3 xl:grid-cols-4"
          style={{ height: "calc(100vh - 200px)", minHeight: 480 }}
        >
          <div
            className={`${mobileView === "list" ? "flex" : "hidden"} flex-col border-r border-[#1e2d40] bg-[#0a1628] lg:flex`}
          >
            <div className="border-b border-[#1e2d40] p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-200">Conversations</h3>
                <button
                  onClick={() => setComposerOpen(true)}
                  className="text-gray-500 hover:text-gray-300"
                  aria-label="New conversation"
                >
                  <Edit className="h-4 w-4" />
                </button>
              </div>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
                <Input
                  placeholder="Search conversations..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="h-8 pl-8 text-xs"
                />
              </div>
              <div className="flex gap-1">
                {[
                  { id: "all" as const, label: "All", count: conversations.length },
                  { id: "unread" as const, label: "Unread", count: totalUnread },
                ].map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setTab(option.id)}
                    className={`rounded-lg px-3 py-1 text-xs transition-colors ${
                      tab === option.id
                        ? "bg-blue-600 text-white"
                        : "text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    {option.label} <span className="opacity-70">{option.count}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {conversationsLoading ? (
                <div className="space-y-3 p-3">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={index} className="h-14 w-full" />
                  ))}
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-500">
                  {search || tab === "unread"
                    ? "No conversations match your filter."
                    : "No conversations yet. Click + to message one of your employees."}
                </div>
              ) : (
                filteredConversations.map((conversation) => {
                  const peer = getOtherParticipant(conversation, currentUserId);
                  return (
                    <button
                      key={conversation._id}
                      onClick={() => {
                        setSelectedId(String(conversation._id));
                        setMobileView("chat");
                      }}
                      className={`flex w-full items-center gap-3 border-b border-[#1e2d40] px-4 py-3 text-left transition-colors ${
                        String(selectedId) === String(conversation._id)
                          ? "bg-blue-600/10"
                          : "hover:bg-[#0d1a2d]"
                      }`}
                    >
                      <Avatar className="h-9 w-9">
                        {peer?.profileImage?.url ? (
                          <AvatarImage src={peer.profileImage.url} alt={peer.name} />
                        ) : (
                          <AvatarFallback className="text-xs">
                            {getInitials(getConversationName(conversation, currentUserId))}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="truncate text-xs font-medium text-gray-200">
                            {getConversationName(conversation, currentUserId)}
                          </p>
                          <span className="ml-1 shrink-0 text-[10px] text-gray-500">
                            {formatLastTime(conversation.lastMessageAt)}
                          </span>
                        </div>
                        <p className="truncate text-[11px] text-gray-500">
                          {conversation.lastMessage || "No messages yet"}
                        </p>
                      </div>
                      {conversation.unreadCount > 0 ? (
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">
                          {conversation.unreadCount}
                        </span>
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div
            className={`${mobileView === "chat" ? "flex" : "hidden"} flex-col border-r border-[#1e2d40] bg-[#070f1c] lg:col-span-2 lg:flex`}
          >
            <div className="flex items-center justify-between border-b border-[#1e2d40] px-3 py-3 sm:px-5">
              {selectedConversation ? (
                <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setMobileView("list")}
                    className="-ml-1 rounded-lg p-1.5 text-gray-300 hover:bg-[#1e2d40] lg:hidden"
                    aria-label="Back"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <Avatar className="h-9 w-9">
                    {recipient?.profileImage?.url ? (
                      <AvatarImage src={recipient.profileImage.url} alt={recipient.name} />
                    ) : (
                      <AvatarFallback className="text-xs">
                        {getInitials(getConversationName(selectedConversation, currentUserId))}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-gray-200">
                      {getConversationName(selectedConversation, currentUserId)}
                    </p>
                    <p className="text-[10px] text-gray-500">{recipient?.role || "Direct chat"}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Select a conversation</p>
              )}
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {!selectedConversation ? (
                <p className="text-center text-xs text-gray-500">
                  Pick a conversation or start a new one.
                </p>
              ) : threadLoading && !(selectedConversation as any).__pending ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 w-full" />
                ))
              ) : messages.length === 0 ? (
                <p className="text-center text-xs text-gray-500">
                  No messages yet. Send the first one below.
                </p>
              ) : (
                messages.map((message: any) => {
                  const isMe = String(message.sender_id) === String(currentUserId);
                  return (
                    <div
                      key={message._id}
                      className={`flex ${isMe ? "justify-end" : "items-end gap-2"}`}
                    >
                      {!isMe ? (
                        <Avatar className="h-7 w-7 shrink-0">
                          {recipient?.profileImage?.url ? (
                            <AvatarImage src={recipient.profileImage.url} alt="" />
                          ) : (
                            <AvatarFallback className="text-[9px]">
                              {getInitials(recipient?.name || "")}
                            </AvatarFallback>
                          )}
                        </Avatar>
                      ) : null}
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                          isMe
                            ? "rounded-br-sm bg-blue-600 text-white"
                            : "rounded-bl-sm bg-[#1e2d40] text-gray-200"
                        }`}
                      >
                        <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                        <p
                          className={`mt-1 text-[10px] ${
                            isMe ? "text-blue-200" : "text-gray-500"
                          }`}
                        >
                          {timeAgo(message.sentAt || message.createdAt)}
                          {isMe && message.isRead ? " ✓✓" : isMe ? " ✓" : ""}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-[#1e2d40] px-5 py-3">
              <div className="flex items-center gap-2">
                <Input
                  placeholder={recipient ? `Message ${recipient.name}...` : "Select a conversation first"}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey && canSend) {
                      event.preventDefault();
                      sendMutation.mutate();
                    }
                  }}
                  disabled={!recipient}
                  className="flex-1"
                />
                <Button
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  disabled={!canSend}
                  onClick={() => sendMutation.mutate()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="hidden space-y-4 overflow-y-auto bg-[#0a1628] p-4 xl:block">
            <h3 className="text-sm font-semibold text-gray-200">Contact Details</h3>
            {recipient ? (
              <>
                <div className="text-center">
                  <Avatar className="mx-auto mb-2 h-14 w-14">
                    {recipient.profileImage?.url ? (
                      <AvatarImage src={recipient.profileImage.url} alt={recipient.name} />
                    ) : (
                      <AvatarFallback>{getInitials(recipient.name || "U")}</AvatarFallback>
                    )}
                  </Avatar>
                  <p className="font-semibold text-gray-100">{recipient.name}</p>
                  <p className="text-xs text-gray-400">{recipient.role}</p>
                </div>
                <div className="space-y-1.5 text-xs">
                  <Row label="Email">{recipient.email || "—"}</Row>
                  <Row label="Role">{recipient.role || "—"}</Row>
                  {selectedConversation ? (
                    <Row label="Conversation since">
                      {selectedConversation.createdAt
                        ? formatDate(selectedConversation.createdAt)
                        : "—"}
                    </Row>
                  ) : null}
                </div>
              </>
            ) : (
              <p className="text-xs text-gray-500">
                Select a conversation to see contact details.
              </p>
            )}
          </div>
        </div>
      </div>

      <NewConversationDialog
        open={composerOpen}
        onOpenChange={setComposerOpen}
        onSelectPeer={handleStartConversation}
      />
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between border-b border-[#1e2d40] py-1.5 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="max-w-35 truncate text-right text-gray-200">{children}</span>
    </div>
  );
}

function NewConversationDialog({
  open,
  onOpenChange,
  onSelectPeer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectPeer: (peer: any) => void;
}) {
  const [query, setQuery] = useState("");

  const { data: recipientsResponse, isLoading } = useQuery({
    queryKey: ["inbox-recipients", query],
    queryFn: () =>
      inboxApi
        .getRecipients(query ? { q: query } : undefined)
        .then((response) => response.data),
    enabled: open,
  });

  const recipients: any[] = recipientsResponse?.data || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Message an employee</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder="Search employees..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-9 pl-8"
          />
        </div>
        <div className="max-h-100 space-y-1 overflow-y-auto">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))
          ) : recipients.length === 0 ? (
            <p className="py-6 text-center text-xs text-gray-500">
              You have no employees yet.
            </p>
          ) : (
            recipients.map((person) => (
              <button
                key={person._id}
                onClick={() => onSelectPeer(person)}
                className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-[#1e2d40]"
              >
                <Avatar className="h-8 w-8">
                  {person.profileImage?.url ? (
                    <AvatarImage src={person.profileImage.url} alt={person.name} />
                  ) : (
                    <AvatarFallback className="text-xs">
                      {getInitials(person.name || "U")}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-gray-200">{person.name}</p>
                  <p className="truncate text-[11px] text-gray-500">{person.email}</p>
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  Employee
                </Badge>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
