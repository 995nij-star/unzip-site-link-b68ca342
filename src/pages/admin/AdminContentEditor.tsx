import { useState, useRef, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import {
  Pencil, Send, Trash2, Loader2, Sparkles, FileText, Megaphone,
  Palette, LayoutDashboard, Globe, BrainCircuit,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ToolExecution {
  name: string;
  args: any;
  result: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  toolExecutions?: ToolExecution[];
}

const CMS_CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cms-ai-chat`;
const STORAGE_KEY = "admin-cms-chat-history";

const QUICK_ACTIONS = [
  { icon: Globe, label: "Show all website content", prompt: "Show me all the current website content" },
  { icon: Megaphone, label: "Create announcement", prompt: "Create a new general announcement" },
  { icon: FileText, label: "Edit homepage text", prompt: "Show me the homepage content so I can edit it" },
  { icon: Palette, label: "Change theme colors", prompt: "Show me the current theme settings" },
  { icon: LayoutDashboard, label: "Edit dashboard text", prompt: "Show me the dashboard welcome section" },
  { icon: Megaphone, label: "List announcements", prompt: "List all current announcements" },
];

export default function AdminContentEditor() {
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); } catch {}
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const apiMessages = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));

      const resp = await fetch(CMS_CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ messages: apiMessages, stream: true }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `Error ${resp.status}`);
      }

      const contentType = resp.headers.get("content-type") || "";

      if (contentType.includes("text/event-stream") && resp.body) {
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let textBuffer = "";
        let toolExecutions: ToolExecution[] = [];
        let assistantContent = "";

        setMessages((prev) => [...prev, { role: "assistant", content: "", toolExecutions: [] }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          textBuffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") break;

            try {
              const parsed = JSON.parse(jsonStr);
              if (parsed.type === "tool_executions") {
                toolExecutions = parsed.data;
                setMessages((prev) => {
                  const copy = [...prev];
                  const last = copy[copy.length - 1];
                  if (last?.role === "assistant") copy[copy.length - 1] = { ...last, toolExecutions };
                  return copy;
                });
              } else if (parsed.type === "delta") {
                assistantContent += parsed.content;
                const cur = assistantContent;
                const tools = toolExecutions;
                setMessages((prev) => {
                  const copy = [...prev];
                  const last = copy[copy.length - 1];
                  if (last?.role === "assistant") copy[copy.length - 1] = { ...last, content: cur, toolExecutions: tools };
                  return copy;
                });
              } else if (parsed.type === "complete") {
                assistantContent = parsed.content;
                toolExecutions = parsed.tool_executions || toolExecutions;
                setMessages((prev) => {
                  const copy = [...prev];
                  const last = copy[copy.length - 1];
                  if (last?.role === "assistant") copy[copy.length - 1] = { ...last, content: assistantContent, toolExecutions };
                  return copy;
                });
              }
            } catch {
              textBuffer = line + "\n" + textBuffer;
              break;
            }
          }
        }
      } else {
        const data = await resp.json();
        setMessages((prev) => [...prev, { role: "assistant", content: data.content || "Done!", toolExecutions: data.tool_executions }]);
      }
    } catch (e: any) {
      console.error("CMS AI error:", e);
      toast.error(e.message || "Failed to get response");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading]);

  const handleSend = (text?: string) => {
    const msg = text || input.trim();
    if (!msg) return;
    setInput("");
    sendMessage(msg);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getToolIcon = (name: string) => {
    if (name.includes("content")) return "📝";
    if (name.includes("announcement")) return "📢";
    if (name.includes("theme") || name.includes("setting")) return "🎨";
    return "⚡";
  };

  return (
    <AdminLayout title="Content Editor AI" description="Edit website content, announcements & settings using AI">
      <div className="flex flex-col h-[calc(100vh-8rem)] max-h-[850px]">
        {/* Header badge */}
        <div className="flex items-center gap-2 mb-3 px-1">
          <Badge className="bg-neon-green/15 text-neon-green border-neon-green/30 font-rajdhani text-[11px] uppercase tracking-wider gap-1.5">
            <Sparkles className="w-3 h-3" />
            AI-Powered CMS
          </Badge>
          <span className="text-[10px] text-muted-foreground/60 font-rajdhani">
            Type in English to edit anything on the website
          </span>
          {messages.length > 0 && (
            <span className="text-[10px] text-muted-foreground/40 font-rajdhani ml-auto">
              💾 {messages.length} messages
            </span>
          )}
        </div>

        {/* Chat Area */}
        <div className="flex-1 min-h-0 relative">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-neon-green/5 via-transparent to-neon-cyan/5 pointer-events-none" />
          <ScrollArea className="h-full rounded-2xl border border-border/30 bg-card/20 backdrop-blur-sm" ref={scrollRef}>
            <div className="p-5 space-y-4">
              {messages.length === 0 ? (
                <div className="space-y-6">
                  <div className="text-center py-6">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-neon-green/15 to-neon-cyan/15 border border-neon-green/20 flex items-center justify-center">
                      <Pencil className="w-8 h-8 text-neon-green" />
                    </div>
                    <h3 className="text-lg font-orbitron font-bold text-foreground mb-1">Content Editor AI</h3>
                    <p className="text-sm text-muted-foreground font-rajdhani max-w-md mx-auto">
                      Edit website text, create announcements, change theme — all in plain English. Just type what you want to change!
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto">
                    {QUICK_ACTIONS.map((action, i) => (
                      <button
                        key={i}
                        onClick={() => handleSend(action.prompt)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border/30 bg-background/30 hover:bg-neon-green/5 hover:border-neon-green/20 transition-all text-left group"
                      >
                        <action.icon className="w-4 h-4 text-muted-foreground group-hover:text-neon-green transition-colors shrink-0" />
                        <span className="text-sm font-rajdhani text-muted-foreground group-hover:text-foreground transition-colors">
                          {action.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div key={i} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "")}>
                    {msg.role === "assistant" && (
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-neon-green/15 to-neon-cyan/15 border border-neon-green/20 flex items-center justify-center flex-shrink-0">
                        <BrainCircuit className="w-4 h-4 text-neon-green" />
                      </div>
                    )}
                    <div className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-3",
                      msg.role === "user"
                        ? "bg-primary/15 border border-primary/20 text-foreground"
                        : "bg-background/40 border border-neon-green/15"
                    )}>
                      {/* Tool executions */}
                      {msg.toolExecutions && msg.toolExecutions.length > 0 && (
                        <div className="mb-2 space-y-1">
                          {msg.toolExecutions.map((te, j) => (
                            <div key={j} className="flex items-center gap-2 text-[11px] font-rajdhani text-muted-foreground bg-muted/30 rounded-lg px-2.5 py-1.5">
                              <span>{getToolIcon(te.name)}</span>
                              <span className="font-medium text-foreground/70">{te.name.replace(/_/g, " ")}</span>
                              {te.result.startsWith("✅") && (
                                <Badge className="bg-neon-green/15 text-neon-green border-none text-[9px] py-0 px-1.5">Done</Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="prose prose-sm prose-invert max-w-none font-rajdhani text-sm">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ))
              )}

              {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-neon-green/15 to-neon-cyan/15 border border-neon-green/20 flex items-center justify-center flex-shrink-0">
                    <BrainCircuit className="w-4 h-4 text-neon-green" />
                  </div>
                  <div className="bg-background/40 border border-neon-green/15 rounded-2xl px-4 py-3 flex items-center gap-2.5">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
                      <div className="w-1.5 h-1.5 rounded-full bg-neon-green/70 animate-pulse [animation-delay:150ms]" />
                      <div className="w-1.5 h-1.5 rounded-full bg-neon-green/40 animate-pulse [animation-delay:300ms]" />
                    </div>
                    <span className="text-[11px] font-rajdhani text-muted-foreground">Editing content...</span>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Input */}
        <div className="mt-3 relative">
          <div className="flex gap-2 items-end">
            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                className="flex-shrink-0 w-10 h-10 rounded-xl border border-border/30 bg-background/30 hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive text-muted-foreground transition-all duration-200 flex items-center justify-center"
                title="Clear chat"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <div className="flex-1 relative group">
              <div className="absolute -inset-px rounded-xl bg-gradient-to-r from-neon-green/20 via-neon-cyan/20 to-neon-green/20 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 blur-sm pointer-events-none" />
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder='Type what to edit... e.g. "Change homepage title to Gaming Arena"'
                className="relative min-h-[44px] max-h-[120px] resize-none pr-12 font-rajdhani text-sm rounded-xl border-border/30 bg-background/40 backdrop-blur-sm focus:border-neon-green/30 placeholder:text-muted-foreground/40"
                rows={1}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className={cn(
                  "absolute right-2 bottom-2 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200",
                  input.trim() && !isLoading
                    ? "bg-neon-green/20 border border-neon-green/30 text-neon-green hover:bg-neon-green/30 shadow-[0_0_12px_-4px_hsl(var(--neon-green)/0.3)]"
                    : "bg-muted/20 border border-border/20 text-muted-foreground/30"
                )}
              >
                {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
