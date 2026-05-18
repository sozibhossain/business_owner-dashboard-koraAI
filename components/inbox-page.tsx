/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { inboxApi } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatTime, getInitials } from "@/lib/utils";
import { toast } from "sonner";
import { Paperclip, Search, Send } from "lucide-react";

const getConversationName = (conversation: any, currentUserId?: string) => {
  if (conversation.groupName) {
    return conversation.groupName;
  }

  const otherParticipant = (conversation.participants || []).find(
    (participant: any) => String(participant._id) !== String(currentUserId)
  );

  return otherParticipant?.name || "Conversation";
};

const getConversationMeta = (conversation: any, currentUserId?: string) => {
  if (conversation.groupName) {
    return `${conversation.participants?.length || 0} participants`;
  }

  const otherParticipant = (conversation.participants || []).find(
    (participant: any) => String(participant._id) !== String(currentUserId)
  );

  return otherParticipant?.email || "Direct chat";
};

export default function InboxPage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const currentUserId = session?.user?._id;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  const { data: conversationsResponse, isLoading: conversationsLoading } = useQuery({
    queryKey: ["inbox-conversations"],
    queryFn: () => inboxApi.getChats().then((response) => response.data),
  });

  const conversations = useMemo(
    () => conversationsResponse?.data || [],
    [conversationsResponse?.data]
  );

  const filteredConversations = useMemo(() => {
    return conversations.filter((conversation: any) => {
      const name = getConversationName(conversation, currentUserId).toLowerCase();
      const lastMessage = String(conversation.lastMessage || "").toLowerCase();
      const query = search.trim().toLowerCase();
      return !query || name.includes(query) || lastMessage.includes(query);
    });
  }, [conversations, currentUserId, search]);

  const activeSelectedId = selectedId || filteredConversations[0]?._id?.toString() || null;

  const selectedConversation = filteredConversations.find(
    (conversation: any) => String(conversation._id) === activeSelectedId
  );

  const { data: threadResponse, isLoading: threadLoading } = useQuery({
    queryKey: ["inbox-conversation", activeSelectedId],
    enabled: Boolean(activeSelectedId),
    queryFn: () =>
      inboxApi.getChatById(String(activeSelectedId)).then((response) => response.data),
  });

  const thread = threadResponse?.data;
  const messages = thread?.messages || [];
  const selectedRecipient = useMemo(() => {
    if (!selectedConversation || selectedConversation.isGroup) return null;
    return (selectedConversation.participants || []).find(
      (participant: any) => String(participant._id) !== String(currentUserId)
    );
  }, [currentUserId, selectedConversation]);

  const sendMutation = useMutation({
    mutationFn: () =>
      inboxApi.sendMessage({
        recipientId: String(selectedRecipient?._id),
        content: message.trim(),
      }),
    onSuccess: (response) => {
      const conversationId = response.data?.data?.conversationId;
      queryClient.invalidateQueries({ queryKey: ["inbox-conversations"] });
      if (conversationId) {
        setSelectedId(String(conversationId));
        queryClient.invalidateQueries({ queryKey: ["inbox-conversation", String(conversationId)] });
      } else if (activeSelectedId) {
        queryClient.invalidateQueries({ queryKey: ["inbox-conversation", activeSelectedId] });
      }
      setMessage("");
      toast.success("Message sent");
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message || "Failed to send message"),
  });

  const canSend = Boolean(selectedRecipient?._id) && message.trim().length > 0;

  return (
    <div>
      <Header
        title="Inbox"
        subtitle="Live team conversations from the backend inbox service."
      />
      <div className="p-6">
        <div
          className="grid grid-cols-1 lg:grid-cols-4 gap-0 rounded-xl border border-[#1e2d40] overflow-hidden"
          style={{ height: "calc(100vh - 220px)", minHeight: 560 }}
        >
          <div className="border-r border-[#1e2d40] flex flex-col bg-[#0a1628]">
            <div className="p-4 border-b border-[#1e2d40]">
              <h3 className="text-sm font-semibold text-gray-200 mb-3">Conversations</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                <Input
                  placeholder="Search conversations..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {conversationsLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={index} className="h-14 w-full" />
                  ))}
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-4">
                  <p className="text-sm text-gray-500">No conversations match your search.</p>
                </div>
              ) : (
                filteredConversations.map((conversation: any) => (
                  <button
                    key={conversation._id}
                    type="button"
                    onClick={() => setSelectedId(String(conversation._id))}
                    className={`w-full text-left px-4 py-3 border-b border-[#1e2d40] transition-colors ${activeSelectedId === String(conversation._id) ? "bg-blue-600/10" : "hover:bg-[#0d1a2d]"}`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="w-9 h-9">
                        <AvatarFallback className="text-xs">
                          {getInitials(getConversationName(conversation, currentUserId))}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-medium text-gray-200 truncate">
                            {getConversationName(conversation, currentUserId)}
                          </p>
                          {conversation.unreadCount > 0 ? (
                            <Badge variant="warning" className="text-[10px]">
                              {conversation.unreadCount}
                            </Badge>
                          ) : null}
                        </div>
                        <p className="text-[10px] text-gray-500 truncate">
                          {conversation.lastMessage || "No messages yet"}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-1">
                          {conversation.lastMessageAt
                            ? `${formatDate(conversation.lastMessageAt)} ${formatTime(conversation.lastMessageAt)}`
                            : "No activity yet"}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="lg:col-span-2 flex flex-col bg-[#070f1c] border-r border-[#1e2d40]">
            <div className="px-5 py-3 border-b border-[#1e2d40]">
              {selectedConversation ? (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-200">
                      {getConversationName(selectedConversation, currentUserId)}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      {getConversationMeta(selectedConversation, currentUserId)}
                    </p>
                  </div>
                  {selectedConversation.isGroup ? (
                    <Badge variant="secondary" className="text-[10px]">
                      Group chat
                    </Badge>
                  ) : (
                    <Badge variant="success" className="text-[10px]">
                      Direct chat
                    </Badge>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Select a conversation to view messages.</p>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {threadLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full" />
                ))
              ) : !selectedConversation ? (
                <p className="text-sm text-gray-500">No conversation selected.</p>
              ) : messages.length === 0 ? (
                <p className="text-sm text-gray-500">No messages in this conversation yet.</p>
              ) : (
                messages.map((item: any) => {
                  const isCurrentUser = String(item.sender_id) === String(currentUserId);
                  return (
                    <div
                      key={item._id}
                      className={`flex ${isCurrentUser ? "justify-end" : "items-end gap-2"}`}
                    >
                      {!isCurrentUser ? (
                        <Avatar className="w-7 h-7 flex-shrink-0">
                          <AvatarFallback className="text-[9px]">
                            {getInitials(getConversationName(selectedConversation, currentUserId))}
                          </AvatarFallback>
                        </Avatar>
                      ) : null}
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2 ${isCurrentUser ? "bg-blue-600 text-white rounded-br-sm" : "bg-[#1e2d40] text-gray-200 rounded-bl-sm"}`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{item.content}</p>
                        <p className={`text-[10px] mt-1 ${isCurrentUser ? "text-blue-100" : "text-gray-500"}`}>
                          {item.sentAt ? `${formatDate(item.sentAt)} ${formatTime(item.sentAt)}` : ""}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="px-5 py-3 border-t border-[#1e2d40]">
              {selectedConversation?.isGroup ? (
                <p className="text-xs text-gray-500">
                  Group conversations can be viewed here, but this backend currently only exposes direct-message send actions.
                </p>
              ) : (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <Input
                    placeholder="Type a message..."
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && canSend) {
                        sendMutation.mutate();
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    disabled={!canSend || sendMutation.isPending}
                    onClick={() => sendMutation.mutate()}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-[#0a1628] overflow-y-auto p-4">
            <h3 className="text-sm font-semibold text-gray-200 mb-4">Conversation Details</h3>
            {selectedConversation ? (
              <div className="space-y-4">
                <div className="text-center">
                  <Avatar className="w-14 h-14 mx-auto mb-2">
                    <AvatarFallback>
                      {getInitials(getConversationName(selectedConversation, currentUserId))}
                    </AvatarFallback>
                  </Avatar>
                  <p className="font-semibold text-gray-100">
                    {getConversationName(selectedConversation, currentUserId)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {getConversationMeta(selectedConversation, currentUserId)}
                  </p>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-[#1e2d40]">
                    <span className="text-gray-500">Type</span>
                    <span className="text-gray-200">
                      {selectedConversation.isGroup ? "Group" : "Direct"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#1e2d40]">
                    <span className="text-gray-500">Unread</span>
                    <span className="text-gray-200">{selectedConversation.unreadCount || 0}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#1e2d40]">
                    <span className="text-gray-500">Participants</span>
                    <span className="text-gray-200">
                      {selectedConversation.participants?.length || 0}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-gray-500">Last Update</span>
                    <span className="text-gray-200">
                      {selectedConversation.lastMessageAt
                        ? `${formatDate(selectedConversation.lastMessageAt)} ${formatTime(selectedConversation.lastMessageAt)}`
                        : "N/A"}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-300 mb-2">Participants</p>
                  <div className="space-y-2">
                    {(selectedConversation.participants || []).map((participant: any) => (
                      <div key={participant._id} className="flex items-center gap-2 rounded-lg bg-[#1e2d40] p-2">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-[9px]">
                            {getInitials(participant.name || "NA")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-xs text-gray-200 truncate">{participant.name}</p>
                          <p className="text-[10px] text-gray-500 truncate">
                            {participant.email || participant.role || ""}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Select a conversation to see details.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
