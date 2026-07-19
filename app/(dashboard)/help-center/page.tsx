/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { aiDataApi } from "@/lib/api";
import {
  ArrowRight,
  Bot,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  FileText,
  Globe,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Settings,
  Smartphone,
  Users,
} from "lucide-react";
import { toast } from "sonner";

const helpTopics = [
  {
    title: "Getting Started",
    description: "Learn the basics and set up your business account for success.",
    articles: 8,
    icon: Users,
    tone: "bg-blue-600/20 text-blue-300",
  },
  {
    title: "Managing Employees",
    description: "Add, manage, schedule, and organize your team members.",
    articles: 12,
    icon: Users,
    tone: "bg-emerald-600/20 text-emerald-300",
  },
  {
    title: "Tasks & Calendar",
    description: "Stay organized with tasks, appointments, schedules, and reminders.",
    articles: 10,
    icon: CalendarDays,
    tone: "bg-purple-600/20 text-purple-300",
  },
  {
    title: "Accounting & Billing",
    description: "Manage invoices, payments, reports, and financial workflows.",
    articles: 9,
    icon: CreditCard,
    tone: "bg-amber-600/20 text-amber-300",
  },
  {
    title: "Website & Branding",
    description: "Build and manage your website, branding, pages, and domain.",
    articles: 7,
    icon: Globe,
    tone: "bg-cyan-600/20 text-cyan-300",
  },
  {
    title: "Kora Go",
    description: "Manage app access, mobile workforce activity, and employee requests.",
    articles: 6,
    icon: Smartphone,
    tone: "bg-sky-600/20 text-sky-300",
  },
  {
    title: "AI Assistant",
    description: "Use Kora to answer questions, summarize work, and automate tasks.",
    articles: 11,
    icon: Bot,
    tone: "bg-pink-600/20 text-pink-300",
  },
  {
    title: "Settings & Security",
    description: "Configure business settings, roles, notifications, and security.",
    articles: 8,
    icon: Settings,
    tone: "bg-slate-600/30 text-slate-200",
  },
];

const popularArticles = [
  { title: "How to add a new employee", category: "Managing Employees" },
  { title: "How to create and assign a task", category: "Tasks & Calendar" },
  { title: "How to send an invoice", category: "Accounting & Billing" },
  { title: "Connect your domain to your website", category: "Website & Branding" },
  { title: "How Kora Go mobile access works", category: "Kora Go" },
  { title: "How to customize Kora AI responses", category: "AI Assistant" },
];

const initialTickets = [
  {
    id: "HC-1024",
    subject: "Need help with employee permissions",
    category: "Team & Roles",
    priority: "Medium",
    status: "open",
    updated: "Today, 10:45 AM",
    description: "Manager role should access calendar but not accounting reports.",
  },
  {
    id: "HC-1023",
    subject: "Invoice export question",
    category: "Accounting",
    priority: "Low",
    status: "pending",
    updated: "Yesterday, 4:20 PM",
    description: "Need to confirm which fields are included in exported reports.",
  },
  {
    id: "HC-1019",
    subject: "Website domain connected",
    category: "Website",
    priority: "Low",
    status: "resolved",
    updated: "Jul 12, 2026",
    description: "Domain setup was completed and verified.",
  },
];

const statusVariant: Record<string, any> = {
  open: "default",
  pending: "warning",
  resolved: "success",
  closed: "secondary",
};

type AssistantMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  time: string;
};

export default function HelpCenterPage() {
  const [articleSearch, setArticleSearch] = useState("");
  const [ticketSearch, setTicketSearch] = useState("");
  const [tickets, setTickets] = useState(initialTickets);
  const [selectedTicketId, setSelectedTicketId] = useState(initialTickets[0]?.id || "");
  const [createOpen, setCreateOpen] = useState(false);
  const selectedTicket = tickets.find((ticket) => ticket.id === selectedTicketId) || tickets[0];

  const filteredTopics = useMemo(() => {
    if (!articleSearch.trim()) return helpTopics;
    const term = articleSearch.toLowerCase();
    return helpTopics.filter(
      (topic) =>
        topic.title.toLowerCase().includes(term) ||
        topic.description.toLowerCase().includes(term)
    );
  }, [articleSearch]);

  const filteredArticles = useMemo(() => {
    if (!articleSearch.trim()) return popularArticles;
    const term = articleSearch.toLowerCase();
    return popularArticles.filter(
      (article) =>
        article.title.toLowerCase().includes(term) ||
        article.category.toLowerCase().includes(term)
    );
  }, [articleSearch]);

  const filteredTickets = useMemo(() => {
    if (!ticketSearch.trim()) return tickets;
    const term = ticketSearch.toLowerCase();
    return tickets.filter(
      (ticket) =>
        ticket.subject.toLowerCase().includes(term) ||
        ticket.category.toLowerCase().includes(term) ||
        ticket.id.toLowerCase().includes(term)
    );
  }, [ticketSearch, tickets]);

  const createTicket = (ticket: Omit<(typeof initialTickets)[number], "id" | "updated" | "status">) => {
    const next = {
      ...ticket,
      id: `HC-${1025 + tickets.length}`,
      status: "open",
      updated: "Just now",
    };
    setTickets((current) => [next, ...current]);
    setSelectedTicketId(next.id);
    setCreateOpen(false);
    toast.success("Support request created");
  };

  return (
    <div>
      <Header
        title="Help Center"
        subtitle="Find answers, guides, and support requests for your business."
        action={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Create Ticket
          </Button>
        }
      />

      <div className="space-y-5 p-3 sm:p-4 lg:p-6">
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(310px,344px)]">
          <div className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <Input
                  placeholder="Search for help articles..."
                  value={articleSearch}
                  onChange={(event) => setArticleSearch(event.target.value)}
                  className="h-11 pl-10 text-sm"
                />
              </div>
              <Select defaultValue="popular">
                <SelectTrigger className="h-11 w-full sm:w-52">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popular">Popular topics</SelectItem>
                  <SelectItem value="recent">Recently updated</SelectItem>
                  <SelectItem value="tickets">Ticket help</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
              {filteredTopics.map((topic) => {
                const Icon = topic.icon;
                return (
                  <button
                    key={topic.title}
                    type="button"
                    className="min-h-[188px] rounded-xl border border-[#1e2d40] bg-[radial-gradient(circle_at_0%_0%,rgba(37,99,235,0.16),transparent_34%),#091526] p-5 text-left transition-colors hover:border-blue-500/50"
                  >
                    <span className={`mb-4 flex h-14 w-14 items-center justify-center rounded-xl ${topic.tone}`}>
                      <Icon className="h-6 w-6" />
                    </span>
                    <p className="text-base font-semibold text-white">{topic.title}</p>
                    <p className="mt-2 min-h-12 text-sm leading-6 text-gray-400">{topic.description}</p>
                    <p className="mt-4 text-xs text-gray-500">{topic.articles} articles</p>
                  </button>
                );
              })}
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm">Popular Articles</CardTitle>
                  <p className="mt-1 text-xs text-gray-500">Frequently accessed guides and onboarding answers.</p>
                </div>
                <button className="hidden items-center gap-1 text-xs text-blue-400 hover:text-blue-300 sm:inline-flex">
                  View all articles <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </CardHeader>
              <CardContent className="p-0">
                {(filteredArticles.length ? filteredArticles : popularArticles).map((article) => (
                  <button
                    key={article.title}
                    type="button"
                    className="flex w-full items-center justify-between gap-3 border-t border-[#1e2d40] px-4 py-3 text-left transition-colors hover:bg-[#0d1a2d]"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                      <span className="truncate text-sm text-gray-200">{article.title}</span>
                    </span>
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      {article.category}
                    </Badge>
                  </button>
                ))}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[390px_minmax(0,1fr)]">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-sm">Support Ticket Center</CardTitle>
                      <p className="mt-1 text-xs text-gray-500">Create, review, and track support requests.</p>
                    </div>
                    <Button size="sm" onClick={() => setCreateOpen(true)}>
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      New
                    </Button>
                  </div>
                  <div className="relative mt-3">
                    <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
                    <Input
                      placeholder="Search tickets..."
                      value={ticketSearch}
                      onChange={(event) => setTicketSearch(event.target.value)}
                      className="h-9 pl-8 text-xs"
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {filteredTickets.map((ticket) => (
                    <button
                      key={ticket.id}
                      type="button"
                      onClick={() => setSelectedTicketId(ticket.id)}
                      className={`flex w-full items-start gap-3 border-t border-[#1e2d40] p-4 text-left transition-colors ${
                        selectedTicket?.id === ticket.id ? "bg-blue-600/10" : "hover:bg-[#0d1a2d]"
                      }`}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1e2d40] text-[10px] font-bold text-gray-300">
                        {ticket.id.slice(-3)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-xs font-medium text-gray-200">{ticket.subject}</p>
                          <Badge variant={statusVariant[ticket.status] || "default"} className="shrink-0 text-[9px]">
                            {ticket.status}
                          </Badge>
                        </div>
                        <p className="mt-1 text-[10px] text-gray-500">{ticket.id} - {ticket.priority}</p>
                        <p className="text-[10px] text-gray-500">{ticket.updated}</p>
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="flex min-h-[360px] flex-col p-0">
                  {selectedTicket ? (
                    <>
                      <div className="flex items-center justify-between gap-3 border-b border-[#1e2d40] p-4">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-100">{selectedTicket.subject}</p>
                          <p className="mt-1 text-xs text-gray-500">{selectedTicket.id} - {selectedTicket.category}</p>
                        </div>
                        <Badge variant={statusVariant[selectedTicket.status] || "default"} className="capitalize">
                          {selectedTicket.status}
                        </Badge>
                      </div>
                      <div className="flex-1 space-y-4 p-4">
                        <div className="rounded-xl border border-[#1e2d40] bg-[#07111f] p-4">
                          <p className="text-xs uppercase tracking-wide text-gray-500">Request details</p>
                          <p className="mt-2 text-sm leading-6 text-gray-300">{selectedTicket.description}</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600/20">
                            <MessageCircle className="h-4 w-4 text-blue-300" />
                          </div>
                          <div className="rounded-xl bg-[#1e2d40] px-4 py-3">
                            <p className="text-xs font-medium text-gray-200">KoraAI Support</p>
                            <p className="mt-1 text-xs leading-5 text-gray-400">
                              We received your request. Our team will update this thread when more information is available.
                            </p>
                          </div>
                        </div>
                      </div>
                      {selectedTicket.status !== "resolved" && selectedTicket.status !== "closed" ? (
                        <div className="border-t border-[#1e2d40] p-3">
                          <div className="flex gap-2">
                            <Input placeholder="Type your message..." className="flex-1" />
                            <Button size="sm" onClick={() => toast.success("Message sent")}>
                              <Send className="mr-1 h-3 w-3" />
                              Send
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="border-t border-[#1e2d40] p-3 text-center text-xs text-gray-500">
                          This ticket is resolved.
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-1 items-center justify-center text-sm text-gray-500">Select a ticket</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <aside className="space-y-5 xl:sticky xl:top-[calc(var(--dashboard-header-height,4rem)+1.5rem)] xl:flex xl:h-[calc(100dvh-var(--dashboard-header-height,4rem)-1.5rem)] xl:flex-col xl:self-start">
            <KoraAssistantCard />
            <SystemStatusCard />
          </aside>
        </div>
      </div>

      <CreateTicketDialog open={createOpen} onOpenChange={setCreateOpen} onCreate={createTicket} />
    </div>
  );
}

function KoraAssistantCard() {
  const queryClient = useQueryClient();
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([
    {
      id: "sample-user",
      role: "user",
      content: "How can I customize my website?",
      time: "10:45 AM",
    },
    {
      id: "sample-assistant",
      role: "assistant",
      content:
        "You can customize your website design, colors, pages and content from the Website section.\n\nWould you like me to start a guide for you?",
      time: "10:45 AM",
    },
  ]);
  const suggestions = [
    {
      question: "How do I add a new employee?",
      answer: "I'll guide you step by step",
      tone: "text-blue-400",
    },
    {
      question: "How do I create an invoice?",
      answer: "I can show you how",
      tone: "text-cyan-400",
    },
    {
      question: "How do I track deliveries?",
      answer: "Let me explain Kora Go",
      tone: "text-purple-400",
    },
  ];

  const formatTime = () =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const sendMutation = useMutation({
    mutationFn: (message: string) => aiDataApi.create({ message }),
    onSuccess: (res) => {
      setAssistantMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content:
            res.data?.data?.aireplay ||
            "I've analyzed your business data. Here are the insights.",
          time: formatTime(),
        },
      ]);
      queryClient.invalidateQueries({ queryKey: ["ai-data-history"] });
    },
    onError: () => {
      setAssistantMessages((current) => [
        ...current,
        {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          content:
            "Kora Assistant could not respond right now. Please try again in a moment.",
          time: formatTime(),
        },
      ]);
      toast.error("Kora Assistant could not respond right now.");
    },
  });

  function handleAssistantSend(text?: string) {
    const message = (text ?? assistantInput).trim();
    if (!message || sendMutation.isPending) return;
    setAssistantMessages((current) => [
      ...current,
      {
        id: `user-${Date.now()}`,
        role: "user",
        content: message,
        time: formatTime(),
      },
    ]);
    sendMutation.mutate(message);
    setAssistantInput("");
  }

  return (
    <Card className="min-h-0 overflow-hidden bg-[radial-gradient(circle_at_10%_0%,rgba(14,165,233,0.18),transparent_38%),linear-gradient(180deg,#0b1b30_0%,#081424_100%)] xl:flex-1">
      <CardContent className="flex h-full min-h-0 flex-col overflow-y-auto p-3">
        <div className="flex items-center justify-between px-1 py-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
            <p className="truncate text-sm font-semibold text-white">Kora Assistant</p>
            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
            <span className="shrink-0 text-xs text-emerald-400">Online</span>
          </div>
          <button
            type="button"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-white/5 hover:text-gray-200"
            aria-label="Assistant options"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex items-start gap-3">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-600/20 ring-1 ring-cyan-300/40 shadow-[0_0_28px_rgba(14,165,233,0.45)]">
            <Image
              src="/kora.png"
              alt=""
              width={64}
              height={64}
              unoptimized
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0 flex-1 rounded-xl border border-[#1e2d40] bg-[#0d1a2d]/80 px-4 py-3 shadow-lg shadow-black/10">
            <p className="text-sm font-medium leading-5 text-gray-100">Hi James!</p>
            <p className="mt-1 text-xs leading-5 text-gray-400">
              I&apos;m here to help you manage your business better.
            </p>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {suggestions.map((item) => (
            <button
              key={item.question}
              type="button"
              onClick={() => handleAssistantSend(item.question)}
              disabled={sendMutation.isPending}
              className="group flex w-full items-center gap-3 rounded-lg border border-[#1e2d40] bg-[#0a1728] px-3 py-2 text-left transition-colors hover:border-blue-500/40 hover:bg-[#0d1f36]"
            >
              <Bot className={`h-4 w-4 shrink-0 ${item.tone}`} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-gray-200">{item.question}</span>
                <span className="block truncate text-[11px] text-gray-500">{item.answer}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-gray-500 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-300" />
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleAssistantSend("Show me more help suggestions.")}
            disabled={sendMutation.isPending}
            className="group flex w-full items-center gap-3 rounded-lg border border-[#1e2d40] bg-[#0a1728] px-3 py-2 text-left transition-colors hover:border-blue-500/40 hover:bg-[#0d1f36]"
          >
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-white/5 text-[10px] text-gray-400">
              4
            </span>
            <span className="min-w-0 flex-1 truncate text-xs font-medium text-gray-200">See more suggestions</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-gray-500 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-300" />
          </button>
        </div>

        <div className="mt-auto space-y-3 pt-3">
          {assistantMessages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-2 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" ? (
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-600/20">
                  <Image
                    src="/kora.png"
                    alt=""
                    width={24}
                    height={24}
                    unoptimized
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : null}
              <div
                className={`max-w-[82%] rounded-xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-blue-600 text-right shadow-lg shadow-blue-950/30"
                    : "bg-[#0d1a2d]"
                }`}
              >
                <p className="whitespace-pre-wrap text-xs leading-5 text-white">
                  {message.content}
                </p>
                <p
                  className={`mt-1 text-right text-[10px] ${
                    message.role === "user" ? "text-blue-100/80" : "text-gray-500"
                  }`}
                >
                  {message.time}
                </p>
              </div>
            </div>
          ))}
          {sendMutation.isPending ? (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-600/20">
                <Image
                  src="/kora.png"
                  alt=""
                  width={24}
                  height={24}
                  unoptimized
                  className="h-full w-full object-cover"
                />
              </div>
              Kora is thinking...
            </div>
          ) : null}
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-lg border border-[#1e2d40] bg-[#07111f] p-2">
          <Input
            placeholder="Type your message..."
            value={assistantInput}
            onChange={(event) => setAssistantInput(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && handleAssistantSend()}
            className="h-8 min-w-0 flex-1 border-0 bg-transparent px-2 text-xs focus-visible:ring-0"
          />
          <Button
            size="icon"
            className="h-8 w-8 shrink-0 rounded-lg"
            aria-label="Send assistant message"
            onClick={() => handleAssistantSend()}
            disabled={!assistantInput.trim() || sendMutation.isPending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SystemStatusCard() {
  return (
    <Card className="shrink-0 bg-[#0d1a2d]">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <CardTitle className="text-sm">System Status</CardTitle>
            </div>
            <div className="mt-4 space-y-2">
              <p className="flex items-center gap-2 text-xs font-medium text-gray-200">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                All systems operational
              </p>
              <p className="pl-4 text-xs text-gray-500">Everything is running smoothly.</p>
            </div>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-emerald-500/60 bg-emerald-500/10">
            <CheckCircle2 className="h-6 w-6 text-emerald-400" />
          </div>
        </div>
        <button
          type="button"
          className="mt-5 inline-flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300"
        >
          View status page
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </CardContent>
    </Card>
  );
}

function CreateTicketDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (ticket: Omit<(typeof initialTickets)[number], "id" | "updated" | "status">) => void;
}) {
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("General");
  const [priority, setPriority] = useState("Medium");
  const [description, setDescription] = useState("");

  const reset = () => {
    setSubject("");
    setCategory("General");
    setPriority("Medium");
    setDescription("");
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!subject.trim()) {
      toast.error("Subject is required");
      return;
    }
    onCreate({ subject, category, priority, description });
    reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) reset();
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Support Request</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ticket-subject">Subject</Label>
            <Input id="ticket-subject" value={subject} onChange={(event) => setSubject(event.target.value)} required />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["General", "Employees", "Calendar", "Accounting", "Website", "Kora Go", "AI Assistant"].map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Low", "Medium", "High", "Urgent"].map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ticket-description">Description</Label>
            <textarea
              id="ticket-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={5}
              placeholder="Describe what you need help with..."
              className="w-full rounded-lg border border-[#2a3547] bg-[#0d1526] px-3 py-2 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end gap-2 border-t border-[#1e2d40] pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit">Create ticket</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
