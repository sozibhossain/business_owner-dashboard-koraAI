"use client";
import { useState } from "react";
import Image from "next/image";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
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
  const recentPageSize = useViewportPageSize({
    rowHeight: 68,
    reservedHeight: 430,
    min: 2,
    max: 5,
  });
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
    setMessages(prev => [...prev, { id: Date.now().toString(), role: "user", content: message, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
    sendMutation.mutate(message);
    setInput("");
  }

  return (
    <div className="dashboard-page flex flex-col">
      <Header
        title="Kora Assistant"
        subtitle="Your AI assistant that understands your business and gets things done."
      />
      <div className="dashboard-content">
        <div className="grid h-full min-h-0 grid-cols-1 gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(280px,0.85fr)]">
          <div className="flex min-h-0 flex-col gap-3">
            <Card className="overflow-hidden border-blue-600/20 bg-[#091526]">
              <CardContent className="p-0">
                <div className="flex min-h-[224px] flex-col gap-5 p-5 sm:flex-row sm:items-center">
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

            <Card className="bg-[#091526]">
              <CardHeader className="border-b border-[#1e2d40] pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Recent Conversations</CardTitle>
                  <button className="text-sm font-medium text-cyan-400 hover:text-cyan-300">
                    View all
                  </button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-[#1e2d40] px-5">
                  {recentConversations.slice(0, recentPageSize).map((conversation, index) => (
                    <button
                      key={conversation._id || conversation.userMessage || index}
                      type="button"
                      onClick={() => handleSend(conversation.userMessage || "Continue this conversation")}
                      disabled={sendMutation.isPending}
                      className="flex w-full items-start gap-4 py-4 text-left"
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
                        {conversation.time ||
                          (conversation.createdAt
                            ? new Date(conversation.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })
                            : "")}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="border-t border-[#1e2d40] py-5 text-center">
                  <Button
                    variant="outline"
                    className="h-9 gap-2 rounded-lg px-5 text-xs"
                    onClick={() => {
                      setMessages(initialMessages);
                      setInput("");
                    }}
                  >
                    <PlusCircle className="h-4 w-4" />
                    Start new conversation
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="dashboard-secondary space-y-3">
            <Card className="border-blue-600/20 bg-[#091526]">
              <CardContent className="p-5">
                <div className="mb-4 flex items-center gap-2 text-sm text-gray-200">
                  <span className="h-2 w-2 rounded-full bg-cyan-400" />
                  Kora is active
                </div>
                <div className="flex justify-center py-1">
                  <Image
                    src="/kora.png"
                    alt="Kora"
                    width={162}
                    height={162}
                    unoptimized
                    className="kora-image h-[162px] w-[162px] object-contain"
                  />
                </div>
                <p className="mt-4 text-center text-sm text-gray-400">
                  Always here to help you
                </p>
                <div className="mt-3 flex justify-center">
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-4 py-2 text-xs text-emerald-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    Online
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#091526]">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Sparkles className="h-4 w-4 text-blue-400" />
                  Smart Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
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

            <Card className="bg-[#091526]">
              <CardContent className="p-5">
                <p className="text-base font-semibold text-gray-100">Learn more about Kora</p>
                <button type="button" className="mt-4 flex w-full items-center justify-between rounded-xl bg-[#0d1a2d] px-4 py-3 text-sm text-gray-200 transition-colors hover:bg-[#1e2d40]">
                  Explore all capabilities
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </button>
              </CardContent>
            </Card>

            {messages.length > 1 ? (
              <Card className="bg-[#091526]">
                <CardContent className="space-y-3 p-4">
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
