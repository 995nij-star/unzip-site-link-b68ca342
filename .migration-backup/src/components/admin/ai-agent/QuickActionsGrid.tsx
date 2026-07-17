import { useState } from "react";
import { ChevronDown, ChevronRight, BrainCircuit, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { QUICK_PROMPT_CATEGORIES } from "./constants";

interface QuickActionsGridProps {
  onSend: (prompt: string) => void;
}

export function QuickActionsGrid({ onSend }: QuickActionsGridProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    Object.fromEntries(QUICK_PROMPT_CATEGORIES.map((c) => [c.name, true]))
  );

  const toggle = (name: string) =>
    setExpanded((prev) => ({ ...prev, [name]: !prev[name] }));

  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      {/* Agent Avatar */}
      <div className="relative mb-5">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-neon-purple/15 to-neon-blue/15 border border-neon-purple/20 flex items-center justify-center shadow-[0_0_30px_-8px_hsl(var(--neon-purple)/0.25)]">
          <BrainCircuit className="w-10 h-10 text-neon-purple" />
        </div>
        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-neon-green/20 border border-neon-green/40 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
        </div>
        <Sparkles className="w-4 h-4 text-neon-gold absolute -bottom-1 -left-1 animate-pulse" />
      </div>

      <h3 className="text-lg font-orbitron font-bold text-foreground mb-1 tracking-wide">
        Super Admin Agent
      </h3>
      <p className="text-xs text-muted-foreground font-rajdhani max-w-sm mb-5 leading-relaxed">
        <span className="text-neon-purple font-semibold">80+ tools</span> — absolute platform control with streaming responses & voice input.
      </p>

      {/* Categorized Quick Prompts */}
      <div className="w-full max-w-2xl space-y-2 text-left">
        {QUICK_PROMPT_CATEGORIES.map(({ name, prompts }) => (
          <div key={name} className="rounded-xl border border-border/20 bg-background/20 overflow-hidden">
            <button
              onClick={() => toggle(name)}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/10 transition-colors"
            >
              <span className="text-[12px] font-rajdhani font-bold text-foreground/80">
                {name}
              </span>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground/50 font-rajdhani">
                  {prompts.length}
                </span>
                {expanded[name] ? (
                  <ChevronDown className="w-3 h-3 text-muted-foreground/50" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
                )}
              </div>
            </button>
            {expanded[name] && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 px-2 pb-2">
                {prompts.map(({ label, icon: Icon, prompt }) => (
                  <button
                    key={prompt}
                    onClick={() => onSend(prompt)}
                    className="group relative flex items-center gap-2 px-2.5 py-2 rounded-lg border border-border/20 bg-background/20 hover:bg-neon-purple/[0.06] hover:border-neon-purple/25 transition-all duration-200 text-left overflow-hidden"
                  >
                    <Icon className="w-3 h-3 text-muted-foreground/50 group-hover:text-neon-purple/70 transition-colors shrink-0" />
                    <span className="text-[10px] font-rajdhani font-semibold text-muted-foreground group-hover:text-foreground transition-colors truncate">
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
