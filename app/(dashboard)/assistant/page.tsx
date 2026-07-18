"use client";
import { useState } from "react";
import Image from "next/image";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  ArrowRight,
  BarChart2,
  Calendar,
  CalendarPlus2,
  CheckCircle2,
  Clock,
  Gift,
  MessageCircle,
  PlusCircle,
  Send,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { aiDataApi } from "@/lib/api";
import { useViewportPageSize } from "@/hooks/use-viewport-page-size";

interface Message { id: string; role: "user" | "assistant"; content: string; time: string; }
interface Conversation {
  _id?: string;
  userMessage?: string;
  aireplay?: string;
  createdAt?: string;
  time?: string;
}

const initialMessages: Message[] = [{
  id: "1", role: "assistant",
  content: "Hi Sarah!\n\nI'm Kora, your AI assistant. I can help you manage your business, answer questions, automate tasks and provide insights.",
  time: "Now",
}];

const suggestions = [
  { icon: Calendar, text: "Summarize my day" },
  { icon: Clock, text: "Check today's schedule" },
  { icon: BarChart2, text: "Show key insights" },
  { icon: Users, text: "Help with reports" },
];

const smartSuggestions = [
  { icon: CalendarPlus2, title: "3 invoices are overdue.", desc: "Review and send reminders.", color: "bg-blue-600/20 text-blue-400" },
  { icon: Users, title: "5 new leads need follow-up.", desc: "Reach out to convert them.", color: "bg-emerald-600/20 text-emerald-400" },
  { icon: TrendingUp, title: "Your revenue is up 18% this month.", desc: "View detailed analytics.", color: "bg-teal-600/20 text-teal-400" },
  { icon: Gift, title: "You have 2 upcoming appointments.", desc: "Check your calendar.", color: "bg-indigo-600/20 text-indigo-400" },
];

const fallbackConversations: Conversation[] = [
  {
    userMessage: "Show me this month's top customers by total spending.",
    aireplay: "Here's a summary of your top 5 customers by revenue.",
    time: "10:24 AM",
  },
  {
    userMessage: "What's the status of my open service requests?",
    aireplay: "You have 5 open requests, 2 are in progress and 3 are pending.",
    time: "Yesterday",
  },
  {
    userMessage: "How many new customers did we acquire this month?",
    aireplay: "You acquired 12 new customers in May. I can show you the details.",
    time: "May 27",
  },
  {
    userMessage: "Remind me to follow up with inactive customers.",
    aireplay: "I'll remind you to follow up with 15 inactive customers this week.",
    time: "May 26",
  },
];

export default function AssistantPage() {
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [showAllConversations, setShowAllConversations] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const smartSuggestionPageSize = useViewportPageSize({
    rowHeight: 72,
    reservedHeight: 360,
    min: 2,
    max: 4,
  });

  const { data: historyResponse } = useQuery({
    queryKey: ["ai-data-history"],
    queryFn: () => aiDataApi.getAll().then((response) => response.data),
  });

  const persistedConversations: Conversation[] = Array.isArray(historyResponse?.data)
    ? historyResponse.data
    : [];
  const recentConversations = persistedConversations.length
    ? persistedConversations
    : fallbackConversations;

  const sendMutation = useMutation({
    mutationFn: (msg: string) => aiDataApi.create({ message: msg }),
    onSuccess: (res) => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(), role: "assistant",
        content: res.data?.data?.aireplay || "I've analyzed your business data. Here are the insights.",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }]);
      queryClient.invalidateQueries({ queryKey: ["ai-data-history"] });
    },
    onError: () => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(), role: "assistant",
        content: "Based on today's schedule, you have 8 appointments. Your busiest time is between 10 AM and 2 PM.",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }]);
    },
  });

  function handleSend(text?: string) {
    const message = (text ?? input).trim();
    if (!message || sendMutation.isPending) return;
    setChatOpen(true);
    setMessages(prev => [...prev, { id: Date.now().toString(), role: "user", content: message, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
    sendMutation.mutate(message);
    setInput("");
  }

  function openConversation(conversation: Conversation) {
    const time = formatConversationDate(conversation) || "Now";
    const conversationKey =
      conversation._id ||
      conversation.userMessage ||
      conversation.aireplay ||
      "conversation";
    setMessages([
      initialMessages[0],
      {
        id: `user-${conversationKey}`,
        role: "user",
        content: conversation.userMessage || "Continue this conversation",
        time,
      },
      {
        id: `assistant-${conversationKey}`,
        role: "assistant",
        content: conversation.aireplay || "Kora is ready to continue this conversation.",
        time,
      },
    ]);
    setInput("");
    setChatOpen(true);
    setShowAllConversations(false);
  }

  const formatConversationDate = (conversation: Conversation) =>
    conversation.time ||
    (conversation.createdAt
      ? new Date(conversation.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      : "");

  if (showAllConversations) {
    return (
      <div className="dashboard-page flex flex-col">
        <Header
          title="Recent Conversations"
          subtitle="Review your full Kora Assistant conversation history."
        />
        <div className="dashboard-content flex flex-col">
          <Card className="flex min-h-0 flex-1 flex-col bg-[#091526]">
            <CardHeader className="border-b border-[#1e2d40] pb-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0 rounded-lg"
                    onClick={() => setShowAllConversations(false)}
                    aria-label="Back to assistant"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <CardTitle className="truncate text-lg">
                    All Conversations
                  </CardTitle>
                </div>
                <span className="shrink-0 text-xs text-gray-400">
                  {recentConversations.length} total
                </span>
              </div>
            </CardHeader>
            <CardContent className="scrollbar-blue min-h-0 flex-1 overflow-y-auto p-0">
              <div className="divide-y divide-[#1e2d40] px-5 pr-3">
                {recentConversations.map((conversation, index) => (
                  <button
                    key={conversation._id || conversation.userMessage || index}
                    type="button"
                    onClick={() => openConversation(conversation)}
                    disabled={sendMutation.isPending}
                    className="flex w-full items-start gap-4 py-4 text-left transition-colors hover:bg-[#0d1a2d]/60 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-gray-300" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-100">
                        {conversation.userMessage || "Conversation"}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                        {conversation.aireplay ||
                          "Kora is ready to continue this conversation."}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-gray-400">
                      {formatConversationDate(conversation)}
                    </span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page flex flex-col">
      <Header
        title="Kora Assistant"
        subtitle="Your AI assistant that understands your business and gets things done."
      />
      <div className="dashboard-content flex flex-col">
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(280px,0.85fr)]">
          <div className="flex min-h-0 flex-col gap-3">
            <Card className="h-[min(30dvh,256px)] min-h-[224px] shrink-0 overflow-hidden border-blue-600/20 bg-[#091526]">
              <CardContent className="h-full p-0">
                <div className="flex h-full flex-col gap-5 p-5 sm:flex-row sm:items-center">
                  <div className="flex justify-center sm:w-[180px]">
                    <Image
                      src="/kora.png"
                      alt="Kora"
                      width={162}
                      height={162}
                      unoptimized
                      priority
                      className="kora-image h-[162px] w-[162px] object-contain"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-2xl font-semibold text-white">Hi Sarah!</h2>
                    <p className="mt-3 max-w-xl text-sm leading-6 text-gray-300">
                      I&apos;m Kora, your AI assistant. I can help you manage your business,
                      answer questions, automate tasks and provide insights.
                    </p>
                    <div className="relative mt-5 max-w-xl">
                      <Input
                        placeholder="Ask me anything about your business..."
                        className="h-12 rounded-xl border-[#1e2d40] bg-[#0d1a2d] pr-12 text-sm"
                        onKeyDown={(event) => event.key === "Enter" && handleSend()}
                        onChange={(event) => setInput(event.target.value)}
                        value={input}
                      />
                      <button
                        type="button"
                        onClick={() => handleSend()}
                        disabled={!input.trim() || sendMutation.isPending}
                        className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-blue-600 text-white disabled:opacity-50"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {suggestions.map((suggestion) => (
                        <button
                          key={suggestion.text}
                          type="button"
                          onClick={() => handleSend(suggestion.text)}
                          disabled={sendMutation.isPending}
                          className="flex items-center gap-1.5 rounded-lg border border-[#1e2d40] bg-[#0d1a2d] px-3 py-2 text-[11px] text-gray-300 transition-colors hover:bg-[#1e2d40]"
                        >
                          <suggestion.icon className="h-3.5 w-3.5 text-gray-400" />
                          {suggestion.text}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="flex min-h-0 flex-1 flex-col overflow-hidden border-blue-600/20 bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,0.08),transparent_32%),linear-gradient(180deg,#091526,#071321)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <CardHeader className="shrink-0 border-b border-[#1e2d40] pb-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    {chatOpen ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shrink-0 rounded-lg"
                        onClick={() => setChatOpen(false)}
                        aria-label="Back to recent conversations"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                    ) : null}
                    <CardTitle className="truncate text-lg">
                      {chatOpen ? "Kora Chat" : "Recent Conversations"}
                    </CardTitle>
                  </div>
                  {chatOpen ? (
                    <Button
                      variant="outline"
                      className="h-8 gap-2 rounded-lg px-3 text-xs"
                      onClick={() => {
                        setMessages(initialMessages);
                        setInput("");
                      }}
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      New chat
                    </Button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowAllConversations(true)}
                      className="shrink-0 text-sm font-medium text-cyan-400 hover:text-cyan-300"
                    >
                      View all
                    </button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex min-h-0 flex-1 flex-col p-0">
                {chatOpen ? (
                  <>
                    <div className="scrollbar-blue min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 pr-3">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          {message.role === "assistant" ? (
                            <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-500/10 shadow-[0_0_20px_rgba(34,211,238,0.22)]">
                              <Image
                                src="/kora.png"
                                alt="Kora"
                                width={32}
                                height={32}
                                unoptimized
                                className="h-8 w-8 object-contain"
                              />
                            </div>
                          ) : null}
                          <div
                            className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                              message.role === "user"
                                ? "bg-blue-600 text-white shadow-[0_10px_26px_rgba(37,99,235,0.24)]"
                                : "border border-[#1e2d40] bg-[#0d1a2d] text-gray-200"
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{message.content}</p>
                            <p className={`mt-2 text-right text-[10px] ${message.role === "user" ? "text-blue-100/75" : "text-gray-500"}`}>
                              {message.time}
                            </p>
                          </div>
                        </div>
                      ))}
                      {sendMutation.isPending ? (
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-500/10">
                            <Image src="/kora.png" alt="Kora" width={32} height={32} unoptimized className="h-8 w-8 object-contain" />
                          </div>
                          Kora is thinking...
                        </div>
                      ) : null}
                    </div>
                    <div className="shrink-0 border-t border-[#1e2d40] p-4">
                      <div className="relative">
                        <Input
                          placeholder="Ask Kora anything..."
                          className="h-12 rounded-xl border-[#1e2d40] bg-[#0d1a2d] pr-12 text-sm"
                          onKeyDown={(event) => event.key === "Enter" && handleSend()}
                          onChange={(event) => setInput(event.target.value)}
                          value={input}
                        />
                        <button
                          type="button"
                          onClick={() => handleSend()}
                          disabled={!input.trim() || sendMutation.isPending}
                          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-blue-600 text-white disabled:opacity-50"
                          aria-label="Send message"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="scrollbar-blue min-h-0 flex-1 divide-y divide-[#1e2d40] overflow-y-auto px-5 pr-3">
                      {recentConversations.map((conversation, index) => (
                        <button
                          key={conversation._id || conversation.userMessage || index}
                          type="button"
                          onClick={() => openConversation(conversation)}
                          disabled={sendMutation.isPending}
                          className="flex w-full items-start gap-4 rounded-xl px-2 py-4 text-left transition-colors hover:bg-[#0d1a2d]/80 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-gray-300" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-gray-100">
                              {conversation.userMessage || "Conversation"}
                            </p>
                            <p className="mt-1 truncate text-xs text-gray-500">
                              {conversation.aireplay || "Kora is ready to continue this conversation."}
                            </p>
                          </div>
                          <span className="shrink-0 text-xs text-gray-400">
                            {formatConversationDate(conversation)}
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="shrink-0 border-t border-[#1e2d40] py-5 text-center">
                      <Button
                        variant="outline"
                        className="h-9 gap-2 rounded-lg px-5 text-xs"
                        onClick={() => {
                          setMessages(initialMessages);
                          setInput("");
                          setChatOpen(true);
                        }}
                      >
                        <PlusCircle className="h-4 w-4" />
                        Start new conversation
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="dashboard-secondary flex min-h-0 flex-col gap-3 overflow-hidden">
            <Card className="h-[min(30dvh,256px)] min-h-[224px] shrink-0 overflow-hidden border-blue-600/20 bg-[#091526]">
              <CardContent className="flex h-full flex-col p-5">
                <div className="flex shrink-0 items-center gap-2 text-sm text-gray-200">
                  <span className="h-2 w-2 rounded-full bg-cyan-400" />
                  Kora is active
                </div>
                <div className="flex min-h-0 flex-1 items-center justify-center py-2">
                  <Image
                    src="/kora.png"
                    alt="Kora"
                    width={162}
                    height={162}
                    unoptimized
                    className="kora-image h-[clamp(112px,13dvh,142px)] w-[clamp(112px,13dvh,142px)] object-contain"
                  />
                </div>
                <div className="flex shrink-0 items-center justify-center gap-3">
                  <p className="text-sm leading-none text-gray-400">
                    Always here to help you
                  </p>
                  <span className="inline-flex h-7 items-center gap-2 rounded-full bg-emerald-500/15 px-3 text-xs text-emerald-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    Online
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="flex min-h-0 flex-1 flex-col bg-[#091526]">
              <CardHeader className="shrink-0 pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Sparkles className="h-4 w-4 text-blue-400" />
                  Smart Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent className="scrollbar-blue min-h-0 flex-1 space-y-2 overflow-y-auto pr-3">
                {smartSuggestions.slice(0, smartSuggestionPageSize).map((suggestion) => (
                  <button
                    type="button"
                    key={suggestion.title}
                    onClick={() => handleSend(suggestion.title)}
                    disabled={sendMutation.isPending}
                    className="flex w-full items-center gap-3 rounded-xl bg-[#0d1a2d] p-3 text-left transition-colors hover:bg-[#1e2d40]"
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${suggestion.color}`}>
                      <suggestion.icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-100">{suggestion.title}</p>
                      <p className="mt-1 text-[11px] text-gray-500">{suggestion.desc}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-gray-500" />
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className="shrink-0 bg-[#091526]">
              <CardContent className="p-5">
                <p className="text-base font-semibold text-gray-100">Learn more about Kora</p>
                <button type="button" className="mt-4 flex w-full items-center justify-between rounded-xl bg-[#0d1a2d] px-4 py-3 text-sm text-gray-200 transition-colors hover:bg-[#1e2d40]">
                  Explore all capabilities
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </button>
              </CardContent>
            </Card>

            {messages.length > 1 ? (
              <Card className="flex min-h-0 flex-1 flex-col bg-[#091526]">
                <CardContent className="scrollbar-blue min-h-0 flex-1 space-y-3 overflow-y-auto p-4 pr-3">
                  {messages.slice(-2).map((message) => (
                    <div key={message.id} className="rounded-xl bg-[#0d1a2d] p-3">
                      <div className="mb-1 flex items-center gap-2 text-[11px] text-gray-500">
                        {message.role === "assistant" ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" />
                        ) : (
                          <MessageCircle className="h-3.5 w-3.5 text-cyan-400" />
                        )}
                        {message.role === "assistant" ? "Kora" : "You"} - {message.time}
                      </div>
                      <p className="line-clamp-3 text-xs text-gray-300">{message.content}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
