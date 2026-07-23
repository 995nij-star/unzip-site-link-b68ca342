import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Loader2, Bot, Trash2, Mic, MicOff, Sparkles, ChevronDown, Volume2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useContentModeration } from "@/hooks/useContentModeration";

type Msg = { role: "user" | "assistant"; content: string; timestamp?: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/user-ai-chat`;

const SUGGESTIONS = [
  { text: "Tournament join nahi ho raha", icon: "🏆" },
  { text: "Wallet mein paise nahi aaye", icon: "💰" },
  { text: "Withdrawal pending hai", icon: "🏦" },
  { text: "Room ID kahan milega?", icon: "🔑" },
  { text: "Meri profile update karni hai", icon: "👤" },
  { text: "App install kaise karu?", icon: "📱" },
];

export default function AIChatWidget() {
  const { user } = useAuth();
  const { checkContent } = useContentModeration();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [dbLoaded, setDbLoaded] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [pulseBtn, setPulseBtn] = useState(true);
  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Stop pulse after first open
  useEffect(() => {
    if (open) setPulseBtn(false);
  }, [open]);

  // Load messages from DB
  useEffect(() => {
    if (!user) { setMessages([]); setDbLoaded(true); return; }
    const load = async () => {
      const { data } = await supabase
        .from("ai_chat_messages")
        .select("role, content, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(100);
      if (data) {
        setMessages(data.map((d: any) => ({ role: d.role, content: d.content, timestamp: d.created_at })));
      }
      setDbLoaded(true);
    };
    load();
  }, [user]);

  const saveMessageToDb = useCallback(async (role: "user" | "assistant", content: string) => {
    if (!user) return;
    await supabase.from("ai_chat_messages").insert({ user_id: user.id, role, content });
  }, [user]);

  const clearChat = useCallback(async () => {
    setMessages([]);
    if (user) await supabase.from("ai_chat_messages").delete().eq("user_id", user.id);
  }, [user]);

  const toggleVoice = useCallback(() => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Your browser doesn't support voice input."); return; }
    const recognition = new SR();
    recognition.lang = "hi-IN";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognitionRef.current = recognition;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results).map((r: any) => r[0].transcript).join("");
      setInput(transcript);
      if (event.results[0]?.isFinal) setIsListening(false);
    };
    recognition.start();
  }, [isListening]);

  // Scroll handling
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      setShowScrollBtn(!atBottom);
    };
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [open]);

  useEffect(() => {
    if (scrollRef.current && !showScrollBtn) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  const scrollToBottom = () => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  };

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const streamChat = useCallback(async (allMessages: Msg[]) => {
    setIsLoading(true);
    let assistantSoFar = "";

    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && !last.timestamp) {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      };
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({ messages: allMessages.map(m => ({ role: m.role, content: m.content })) }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `Error ${resp.status}`);
      }
      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsert(content);
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      if (buffer.trim()) {
        for (let raw of buffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsert(content);
          } catch {}
        }
      }

      if (assistantSoFar) await saveMessageToDb("assistant", assistantSoFar);
    } catch (e: any) {
      console.error("Chat error:", e);
      const errorMsg = "Maaf karo, abhi kuch problem aa rahi hai. Thodi der baad try karo! 🙏";
      upsert(errorMsg);
      await saveMessageToDb("assistant", errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [saveMessageToDb]);

  const sendMessage = useCallback(async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || isLoading) return;
    const isSafe = await checkContent(msg);
    if (!isSafe) return;
    const userMsg: Msg = { role: "user", content: msg, timestamp: new Date().toISOString() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    await saveMessageToDb("user", msg);
    streamChat(updated);
  }, [input, isLoading, messages, streamChat, saveMessageToDb, checkContent]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const formatTime = (ts?: string) => {
    if (!ts) return "";
    return new Date(ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <>
      {/* Floating Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className={`fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 group
            bg-gradient-to-br from-[hsl(var(--neon-blue))] to-[hsl(var(--neon-purple))] text-white
            hover:scale-110 hover:shadow-[0_0_30px_hsl(var(--neon-blue)/0.5)]
            animate-in fade-in slide-in-from-bottom-4
            ${pulseBtn ? "animate-pulse" : ""}`}
          aria-label="Open AI Chat"
        >
          <Sparkles className="w-5 h-5 absolute opacity-0 group-hover:opacity-100 transition-opacity -top-1 -right-1" />
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Chat Window */}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-6rem)] rounded-2xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300
          border border-[hsl(var(--neon-blue)/0.2)]
          bg-gradient-to-b from-card/95 to-card
          backdrop-blur-xl
          shadow-[0_0_40px_hsl(var(--neon-blue)/0.1),0_20px_60px_rgba(0,0,0,0.4)]">
          
          {/* Header */}
          <div className="relative px-4 py-3 border-b border-border/50">
            {/* Gradient line on top */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[hsl(var(--neon-blue))] via-[hsl(var(--neon-purple))] to-[hsl(var(--neon-blue))]" />
            
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(var(--neon-blue)/0.2)] to-[hsl(var(--neon-purple)/0.2)] flex items-center justify-center border border-[hsl(var(--neon-blue)/0.3)]">
                <Bot className="w-5 h-5 text-[hsl(var(--neon-blue))]" />
                {/* Online dot */}
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-card" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-orbitron font-bold text-foreground leading-tight flex items-center gap-1.5">
                  xt Support AI
                  <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-gradient-to-r from-[hsl(var(--neon-blue)/0.2)] to-[hsl(var(--neon-purple)/0.2)] text-[hsl(var(--neon-blue))] font-rajdhani font-semibold uppercase tracking-wider border border-[hsl(var(--neon-blue)/0.3)]">Ultra</span>
                </h3>
                <p className="text-[10px] font-rajdhani text-muted-foreground flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                  Online • Smart Problem Solver
                </p>
              </div>
              <div className="flex items-center gap-0.5">
                {messages.length > 0 && (
                  <button onClick={clearChat} className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors" title="Clear chat">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 relative scroll-smooth">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center pt-4 text-center">
                {/* Hero icon */}
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-[hsl(var(--neon-blue)/0.15)] to-[hsl(var(--neon-purple)/0.15)] flex items-center justify-center mb-4 border border-[hsl(var(--neon-blue)/0.2)]">
                  <Bot className="w-8 h-8 text-[hsl(var(--neon-blue))]" />
                  <Sparkles className="w-4 h-4 text-[hsl(var(--neon-purple))] absolute -top-1 -right-1" />
                </div>
                <h4 className="text-sm font-orbitron font-bold text-foreground mb-1">Hey! Kya help chahiye? 🛠️</h4>
                <p className="text-xs font-rajdhani text-muted-foreground mb-5 px-4 leading-relaxed">
                  Main aapka smart AI assistant hoon. Platform ke kisi bhi issue mein help karunga — tournaments, wallet, payments, sab kuch!
                </p>
                
                {/* Suggestion Grid */}
                <div className="grid grid-cols-2 gap-2 w-full px-1">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s.text}
                      onClick={() => sendMessage(s.text)}
                      className="group/s flex items-start gap-2 text-left px-3 py-2.5 rounded-xl
                        border border-border/60 bg-background/50
                        hover:bg-[hsl(var(--neon-blue)/0.05)] hover:border-[hsl(var(--neon-blue)/0.3)]
                        transition-all duration-200"
                    >
                      <span className="text-sm mt-0.5">{s.icon}</span>
                      <span className="text-[11px] font-rajdhani text-muted-foreground group-hover/s:text-foreground leading-tight">{s.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-200`}>
                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[hsl(var(--neon-blue)/0.15)] to-[hsl(var(--neon-purple)/0.15)] flex items-center justify-center flex-shrink-0 mt-0.5 border border-[hsl(var(--neon-blue)/0.2)]">
                      <Bot className="w-3.5 h-3.5 text-[hsl(var(--neon-blue))]" />
                    </div>
                  )}
                  <div className="flex flex-col gap-0.5 max-w-[78%]">
                    <div
                      className={`rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                        msg.role === "user"
                          ? "bg-gradient-to-br from-[hsl(var(--neon-blue))] to-[hsl(var(--neon-purple))] text-white rounded-br-md"
                          : "bg-muted/40 border border-border/50 text-foreground rounded-bl-md backdrop-blur-sm"
                      }`}
                    >
                      {msg.role === "assistant" ? (
                        <div className="prose prose-xs dark:prose-invert max-w-none font-rajdhani [&_p]:my-0.5 [&_ul]:my-0.5 [&_ol]:my-0.5 [&_li]:my-0 [&_strong]:text-[hsl(var(--neon-blue))] [&_code]:bg-primary/10 [&_code]:px-1 [&_code]:rounded">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="font-rajdhani">{msg.content}</p>
                      )}
                    </div>
                    {msg.timestamp && (
                      <span className={`text-[9px] font-rajdhani text-muted-foreground/60 ${msg.role === "user" ? "text-right" : "text-left"} px-1`}>
                        {formatTime(msg.timestamp)}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
            
            {/* Typing indicator */}
            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[hsl(var(--neon-blue)/0.15)] to-[hsl(var(--neon-purple)/0.15)] flex items-center justify-center flex-shrink-0 border border-[hsl(var(--neon-blue)/0.2)]">
                  <Bot className="w-3.5 h-3.5 text-[hsl(var(--neon-blue))]" />
                </div>
                <div className="bg-muted/40 border border-border/50 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-[hsl(var(--neon-blue))] animate-bounce [animation-delay:0ms]" />
                    <span className="w-2 h-2 rounded-full bg-[hsl(var(--neon-purple))] animate-bounce [animation-delay:150ms]" />
                    <span className="w-2 h-2 rounded-full bg-[hsl(var(--neon-blue))] animate-bounce [animation-delay:300ms]" />
                  </div>
                  <span className="text-[10px] font-rajdhani text-muted-foreground ml-1">Thinking...</span>
                </div>
              </div>
            )}

            {/* Scroll-to-bottom button */}
            {showScrollBtn && (
              <button
                onClick={scrollToBottom}
                className="sticky bottom-2 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-card border border-border shadow-lg flex items-center justify-center hover:bg-muted transition-colors z-10"
              >
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Input Area */}
          <div className="p-3 border-t border-border/50 bg-card/80 backdrop-blur-sm">
            {/* Voice indicator */}
            {isListening && (
              <div className="flex items-center gap-2 px-3 py-1.5 mb-2 rounded-lg bg-destructive/10 border border-destructive/20">
                <Volume2 className="w-3.5 h-3.5 text-destructive animate-pulse" />
                <span className="text-[10px] font-rajdhani text-destructive">Listening... bolo apna sawal</span>
              </div>
            )}
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Apna sawal type karo..."
                className={`flex-1 h-10 px-4 rounded-xl border bg-background/80 text-foreground text-xs font-rajdhani placeholder:text-muted-foreground/60 focus:outline-none transition-all duration-200
                  ${isListening 
                    ? "border-destructive ring-1 ring-destructive/30" 
                    : "border-border/60 focus:border-[hsl(var(--neon-blue)/0.5)] focus:ring-1 focus:ring-[hsl(var(--neon-blue)/0.2)]"}`}
              />
              <button
                onClick={toggleVoice}
                className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
                  isListening
                    ? "bg-destructive text-destructive-foreground shadow-[0_0_15px_hsl(var(--destructive)/0.3)]"
                    : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"}`}
                title={isListening ? "Stop listening" : "Voice input"}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
                className="h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-200
                  bg-gradient-to-br from-[hsl(var(--neon-blue))] to-[hsl(var(--neon-purple))] text-white
                  disabled:opacity-30 disabled:cursor-not-allowed
                  hover:shadow-[0_0_20px_hsl(var(--neon-blue)/0.4)] hover:scale-105
                  active:scale-95"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[8px] font-rajdhani text-muted-foreground/40 text-center mt-1.5">
              Powered by xt AI • Platform support only
            </p>
          </div>
        </div>
      )}
    </>
  );
}
