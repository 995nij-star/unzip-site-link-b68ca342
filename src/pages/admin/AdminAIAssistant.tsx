import { useState, useRef, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAISettings } from "@/hooks/useAISettings";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, Trash2, Loader2, Zap, ShieldCheck, BrainCircuit } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuickActionsGrid } from "@/components/admin/ai-agent/QuickActionsGrid";
import { ChatMessage } from "@/components/admin/ai-agent/ChatMessage";
import { VoiceInput } from "@/components/admin/ai-agent/VoiceInput";
import { useStreamingChat } from "@/components/admin/ai-agent/useStreamingChat";

export default function AdminAIAssistant() {
  const { aiSettings } = useAISettings();
  const { messages, isLoading, mode, setMode, sendMessage, clearMessages } = useStreamingChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;
    setInput("");
    sendMessage(messageText);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!aiSettings.enabled) {
    return (
      <AdminLayout title="AI Super Agent" description="AI Agent is currently disabled">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 rounded-2xl bg-muted/30 border border-border/40 flex items-center justify-center">
            <Bot className="w-10 h-10 text-muted-foreground/50" />
          </div>
          <h3 className="text-xl font-orbitron font-bold text-foreground mt-6 mb-2">Agent Offline</h3>
          <p className="text-muted-foreground font-rajdhani max-w-md">
            Enable AI Super Agent from Admin Settings to activate.
          </p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="" description="">
      <div className="flex flex-col h-[calc(100vh-8rem)] max-h-[850px]">
        {/* Mode Toggle Bar */}
        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-background/50 border border-border/40 backdrop-blur-md">
            <button
              onClick={() => setMode("auto")}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-rajdhani font-bold uppercase tracking-wider transition-all duration-200",
                mode === "auto"
                  ? "bg-neon-green/15 border border-neon-green/30 text-neon-green shadow-[0_0_12px_-4px_hsl(var(--neon-green)/0.3)]"
                  : "text-muted-foreground hover:text-foreground border border-transparent"
              )}
            >
              <Zap className="w-3 h-3" />
              Auto
            </button>
            <button
              onClick={() => setMode("confirm")}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-rajdhani font-bold uppercase tracking-wider transition-all duration-200",
                mode === "confirm"
                  ? "bg-neon-orange/15 border border-neon-orange/30 text-neon-orange shadow-[0_0_12px_-4px_hsl(var(--neon-orange)/0.3)]"
                  : "text-muted-foreground hover:text-foreground border border-transparent"
              )}
            >
              <ShieldCheck className="w-3 h-3" />
              Confirm
            </button>
          </div>
          <span className="text-[10px] text-muted-foreground/60 font-rajdhani ml-1 hidden sm:inline">
            {mode === "auto" ? "Actions execute immediately" : "Confirms before executing"}
          </span>
          {messages.length > 0 && (
            <span className="text-[10px] text-muted-foreground/40 font-rajdhani ml-auto hidden sm:inline">
              💾 Chat saved • {messages.length} messages
            </span>
          )}
        </div>

        {/* Chat Area */}
        <div className="flex-1 min-h-0 relative">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-neon-purple/5 via-transparent to-neon-blue/5 pointer-events-none" />
          <ScrollArea className="h-full rounded-2xl border border-border/30 bg-card/20 backdrop-blur-sm" ref={scrollRef}>
            <div className="p-5 space-y-4">
              {messages.length === 0 ? (
                <QuickActionsGrid onSend={handleSend} />
              ) : (
                messages.map((msg, i) => <ChatMessage key={i} message={msg} />)
              )}

              {/* Loading indicator */}
              {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-neon-purple/15 to-neon-blue/15 border border-neon-purple/20 flex items-center justify-center flex-shrink-0">
                    <BrainCircuit className="w-4 h-4 text-neon-purple" />
                  </div>
                  <div className="bg-background/40 border border-neon-purple/15 rounded-2xl px-4 py-3 flex items-center gap-2.5">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-neon-purple animate-pulse" />
                      <div className="w-1.5 h-1.5 rounded-full bg-neon-purple/70 animate-pulse [animation-delay:150ms]" />
                      <div className="w-1.5 h-1.5 rounded-full bg-neon-purple/40 animate-pulse [animation-delay:300ms]" />
                    </div>
                    <span className="text-[11px] font-rajdhani text-muted-foreground">Executing...</span>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Input Area */}
        <div className="mt-3 relative">
          <div className="flex gap-2 items-end">
            {messages.length > 0 && (
              <button
                onClick={clearMessages}
                className="flex-shrink-0 w-10 h-10 rounded-xl border border-border/30 bg-background/30 hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive text-muted-foreground transition-all duration-200 flex items-center justify-center"
                title="Clear chat"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <VoiceInput
              onTranscript={(text) => {
                setInput(text);
                // Auto-send after voice input
                setTimeout(() => handleSend(text), 100);
              }}
              disabled={isLoading}
            />
            <div className="flex-1 relative group">
              <div className="absolute -inset-px rounded-xl bg-gradient-to-r from-neon-purple/20 via-neon-blue/20 to-neon-purple/20 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 blur-sm pointer-events-none" />
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Command the agent... or use 🎤 voice input"
                className="relative min-h-[44px] max-h-[120px] resize-none pr-12 font-rajdhani text-sm rounded-xl border-border/30 bg-background/40 backdrop-blur-sm focus:border-neon-purple/30 placeholder:text-muted-foreground/40"
                rows={1}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className={cn(
                  "absolute right-2 bottom-2 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200",
                  input.trim() && !isLoading
                    ? "bg-neon-purple/20 border border-neon-purple/30 text-neon-purple hover:bg-neon-purple/30 shadow-[0_0_12px_-4px_hsl(var(--neon-purple)/0.3)]"
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
