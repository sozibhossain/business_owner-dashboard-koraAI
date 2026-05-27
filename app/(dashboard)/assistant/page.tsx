"use client";
import { useState, useRef, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Paperclip, Sparkles, BarChart2, Calendar, Users, Clock } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { koraAssistantApi } from "@/lib/api";

interface Message { id: string; role: "user" | "assistant"; content: string; time: string; }

const initialMessages: Message[] = [{
  id: "1", role: "assistant",
  content: "Hi Sarah! ðŸ‘‹\n\nI'm Kora, your AI assistant. I can help you manage your business, answer questions, automate tasks and provide insights.",
  time: "Now",
}];

const suggestions = [
  { icon: Calendar, text: "Summarize my day" },
  { icon: Clock, text: "Check today's schedule" },
  { icon: BarChart2, text: "Show key insights" },
  { icon: Users, text: "Help with reports" },
];

const smartSuggestions = [
  { icon: "ðŸ“„", title: "3 invoices are overdue.", desc: "Review and send reminders.", color: "bg-amber-600/20" },
  { icon: "ðŸ‘¥", title: "5 new leads need follow-up.", desc: "Reach out to convert them.", color: "bg-blue-600/20" },
  { icon: "ðŸ“ˆ", title: "Your revenue is up 18% this month.", desc: "View detailed analytics.", color: "bg-emerald-600/20" },
  { icon: "ðŸ“…", title: "You have 2 upcoming appointments.", desc: "Check your calendar.", color: "bg-purple-600/20" },
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const sendMutation = useMutation({
    mutationFn: (msg: string) => koraAssistantApi.sendMessage({ message: msg }),
    onSuccess: (res) => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(), role: "assistant",
        content: res.data?.data?.reply || "I've analyzed your business data. Here are the insights.",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }]);
    },
    onError: () => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(), role: "assistant",
        content: "Based on today's schedule, you have 8 appointments. Your busiest time is between 10 AM and 2 PM.",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }]);
    },
  });

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  function handleSend() {
    if (!input.trim()) return;
    setMessages(prev => [...prev, { id: Date.now().toString(), role: "user", content: input, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
    sendMutation.mutate(input);
    setInput("");
  }

  return (
    <div>
      <Header title="Kora Assistant" subtitle="Your AI assistant that understands your business and gets things done." />
      <div className="p-3 sm:p-4 lg:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Chat */}
          <Card className="lg:col-span-2">
            <CardContent className="p-0 flex flex-col h-[calc(100vh-200px)]">
              {/* Welcome Banner */}
              {messages.length <= 2 && (
                <div className="p-5 border-b border-[#1e2d40]">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-blue-600/10 flex items-center justify-center shrink-0">
                      <span className="text-4xl">ðŸ¤–</span>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-white">Hi Sarah! ðŸ‘‹</p>
                      <p className="text-sm text-gray-400 mt-1">I'm Kora, your AI assistant. I can help you manage your business, answer questions, automate tasks and provide insights.</p>
                      <div className="relative mt-3">
                        <Input placeholder="Ask me anything about your business..." className="pr-10" onKeyDown={e => e.key === "Enter" && handleSend()} onChange={e => setInput(e.target.value)} value={input} />
                        <button onClick={handleSend} className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center">
                          <Send className="w-3.5 h-3.5 text-white" />
                        </button>
                      </div>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {suggestions.map(s => (
                          <button key={s.text} onClick={() => setInput(s.text)}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-[#1e2d40] rounded-lg text-gray-300 hover:bg-[#2a3547]">
                            <s.icon className="w-3 h-3 text-gray-400" />{s.text}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {messages.slice(messages.length > 2 ? 0 : 1).map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "items-start gap-3"}`}>
                    {msg.role === "assistant" && (
                      <div className="w-7 h-7 rounded-full bg-blue-600/20 flex items-center justify-center shrink-0 mt-0.5 text-sm">ðŸ¤–</div>
                    )}
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${msg.role === "user" ? "bg-blue-600 text-white" : "bg-[#1e2d40] text-gray-200"}`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <p className={`text-[10px] mt-1 ${msg.role === "user" ? "text-blue-200" : "text-gray-500"}`}>{msg.time}</p>
                    </div>
                  </div>
                ))}
                {sendMutation.isPending && (
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-blue-600/20 flex items-center justify-center text-sm">ðŸ¤–</div>
                    <div className="bg-[#1e2d40] rounded-2xl px-4 py-3">
                      <div className="flex gap-1">{[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${i*150}ms` }} />)}</div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Recent conversations list when in chat */}
              {messages.length > 2 && (
                <div className="px-5 pb-3 border-t border-[#1e2d40] pt-3">
                  <div className="flex gap-2 flex-wrap">
                    {["Show me today's appointments", "Move an appointment", "Show my weekly performance"].map(s => (
                      <button key={s} onClick={() => setInput(s)}
                        className="text-xs px-3 py-1.5 bg-[#1e2d40] rounded-lg text-gray-300 hover:bg-[#2a3547]">{s}</button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="p-4 border-t border-[#1e2d40]">
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon"><Paperclip className="w-4 h-4" /></Button>
                  <Input placeholder="Ask Kora anything..." value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()} className="flex-1" />
                  <Button onClick={handleSend} disabled={!input.trim()}><Send className="w-4 h-4" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right Panel */}
          <div className="space-y-4">
            {/* Kora Status */}
            <Card className="border-blue-600/20">
              <CardContent className="pt-4 text-center">
                <div className="w-16 h-16 rounded-full bg-blue-600/10 flex items-center justify-center mx-auto mb-2">
                  <span className="text-4xl">ðŸ¤–</span>
                </div>
                <p className="font-medium text-white">Kora is active</p>
                <span className="inline-flex items-center gap-1 text-xs text-emerald-400 mt-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />Online
                </span>
                <p className="text-xs text-gray-400 mt-2">Always here to help you.</p>
              </CardContent>
            </Card>

            {/* Smart Suggestions */}
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-blue-400" />Smart Suggestions</CardTitle></CardHeader>
              <CardContent>
                {smartSuggestions.map(s => (
                  <button key={s.title} onClick={() => setInput(s.title)}
                    className="w-full flex items-start gap-3 py-2 hover:bg-[#1e2d40] rounded-lg px-2 transition-colors text-left mb-1">
                    <div className={`w-7 h-7 rounded-lg ${s.color} flex items-center justify-center shrink-0`}>
                      <span className="text-sm">{s.icon}</span>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-200">{s.title}</p>
                      <p className="text-[10px] text-gray-400">{s.desc}</p>
                    </div>
                    <span className="text-gray-500 ml-auto">â€º</span>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Learn more */}
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm font-medium text-gray-200 mb-2">Learn more about Kora</p>
                <button className="text-xs text-blue-400 hover:text-blue-300">Explore all capabilities â†’</button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

