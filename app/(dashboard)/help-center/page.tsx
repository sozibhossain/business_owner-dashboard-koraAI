/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
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
import {
  ArrowRight,
  BookOpen,
  Bot,
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Globe,
  HelpCircle,
  MessageCircle,
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

const supportStatsConfig: Array<[string, keyof ReturnType<typeof getTicketStats>, LucideIcon, string]> = [
  ["Open", "open", HelpCircle, "text-blue-400"],
  ["Pending", "pending", Clock, "text-amber-400"],
  ["Resolved", "resolved", CheckCircle2, "text-emerald-400"],
  ["Total", "total", BookOpen, "text-gray-300"],
];

function getTicketStats() {
  return { total: 0, open: 0, pending: 0, resolved: 0 };
}

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

  const ticketStats = useMemo(
    () =>
      tickets.reduce(
        (stats, ticket) => {
          if (ticket.status === "resolved" || ticket.status === "closed") stats.resolved += 1;
          else if (ticket.status === "pending") stats.pending += 1;
          else stats.open += 1;
          stats.total += 1;
          return stats;
        },
        getTicketStats()
      ),
    [tickets]
  );

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
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
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

            <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
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
          </div>

          <div className="space-y-5">
            <KoraAssistantCard />
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Support Overview</CardTitle>
                <p className="text-xs text-gray-500">Open and historical support cases.</p>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2">
                {supportStatsConfig.map(([label, key, Icon, tone]) => (
                  <div key={String(label)} className="rounded-xl border border-[#1e2d40] bg-[#07111f] p-3">
                    <div className="flex items-center justify-between">
                      <Icon className={`h-4 w-4 ${tone}`} />
                      <span className={`text-lg font-bold ${tone}`}>{String(ticketStats[key])}</span>
                    </div>
                    <p className="mt-2 text-[11px] text-gray-500">{String(label)} tickets</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

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

      <CreateTicketDialog open={createOpen} onOpenChange={setCreateOpen} onCreate={createTicket} />
    </div>
  );
}

function KoraAssistantCard() {
  return (
    <Card className="bg-[radial-gradient(circle_at_0%_0%,rgba(37,99,235,0.22),transparent_42%),#091526]">
      <CardContent className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-blue-400" />
            <p className="text-sm font-semibold text-white">Kora Assistant</p>
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-xs text-emerald-400">Online</span>
          </div>
        </div>
        <div className="rounded-xl border border-[#1e2d40] bg-[#07111f] p-4">
          <p className="text-sm text-gray-200">Hi! I can help you find guides or create a support request.</p>
        </div>
        <div className="mt-3 space-y-2">
          {["How do I add a new employee?", "How do I create an invoice?", "How do I manage Kora Go access?"].map((question) => (
            <button
              key={question}
              type="button"
              className="flex w-full items-center justify-between rounded-lg border border-[#1e2d40] bg-[#07111f] px-3 py-2 text-left text-xs text-gray-300 hover:bg-[#0d1a2d]"
            >
              {question}
              <ArrowRight className="h-3.5 w-3.5 text-gray-500" />
            </button>
          ))}
        </div>
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
