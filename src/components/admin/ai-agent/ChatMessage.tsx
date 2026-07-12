import { BrainCircuit, CheckCircle2, XCircle, Wrench, Globe } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { TOOL_LABELS } from "./constants";
import type { Message } from "./types";

const LANG_LABELS: Record<string, { label: string; flag: string }> = {
  en: { label: "English", flag: "🇬🇧" },
  hi: { label: "Hindi (Devanagari)", flag: "🇮🇳" },
  "hi-Latn": { label: "Hindi (Latin)", flag: "🇮🇳" },
  bn: { label: "Bangla", flag: "🇧🇩" },
};

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const langInfo = message.lang ? LANG_LABELS[message.lang] : null;

  return (
    <div className={cn("flex gap-3", message.role === "user" ? "justify-end" : "justify-start")}>
      {message.role === "assistant" && (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-neon-purple/15 to-neon-blue/15 border border-neon-purple/20 flex items-center justify-center flex-shrink-0 mt-1">
          <BrainCircuit className="w-4 h-4 text-neon-purple" />
        </div>
      )}
      <div className="max-w-[85%] space-y-2">
        {/* Language badge for assistant messages */}
        {message.role === "assistant" && langInfo && (
          <div className="flex items-center gap-1.5 mb-1">
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-rajdhani font-bold uppercase tracking-wider border bg-neon-cyan/8 border-neon-cyan/25 text-neon-cyan backdrop-blur-sm">
              <Globe className="w-2.5 h-2.5" />
              {langInfo.flag} {langInfo.label}
            </div>
          </div>
        )}
        {/* Tool execution badges */}
        {message.toolExecutions && message.toolExecutions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {message.toolExecutions.map((te, j) => {
              let parsed: any = {};
              try { parsed = JSON.parse(te.result); } catch {}
              const success = parsed.success !== false;
              return (
                <div
                  key={j}
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-rajdhani font-bold uppercase tracking-wider border backdrop-blur-sm",
                    success
                      ? "bg-neon-green/8 border-neon-green/25 text-neon-green"
                      : "bg-neon-red/8 border-neon-red/25 text-neon-red"
                  )}
                >
                  {success ? <CheckCircle2 className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
                  <Wrench className="w-2.5 h-2.5" />
                  {TOOL_LABELS[te.tool] || te.tool}
                </div>
              );
            })}
          </div>
        )}
        {/* Message bubble */}
        <div
          className={cn(
            "rounded-2xl px-4 py-3",
            message.role === "user"
              ? "bg-gradient-to-br from-neon-purple/20 to-neon-blue/20 border border-neon-purple/20 text-foreground"
              : "bg-background/40 border border-border/30 text-foreground"
          )}
        >
          {message.role === "assistant" ? (
            <div className="prose prose-sm dark:prose-invert max-w-none font-rajdhani text-[13px] leading-relaxed [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_h1]:font-orbitron [&_h2]:font-orbitron [&_h3]:font-orbitron [&_strong]:text-neon-purple [&_table]:text-xs [&_th]:px-2 [&_td]:px-2 [&_code]:bg-muted/50 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md [&_code]:text-neon-cyan [&_code]:text-[11px]">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          ) : (
            <p className="font-rajdhani text-sm">{message.content}</p>
          )}
        </div>
      </div>
    </div>
  );
}
