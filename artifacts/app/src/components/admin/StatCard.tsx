import { ReactNode, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  accentColor?: string;
}

export const StatCard = forwardRef<HTMLDivElement, StatCardProps>(function StatCard({ title, value, icon, trend, className, accentColor = "primary" }, ref) {
  return (
    <div ref={ref} className={cn(
      "group relative rounded-2xl border border-border/40 p-5 overflow-hidden transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5",
      "bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm",
      className
    )}>
      {/* Top accent line */}
      <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />
      
      {/* Subtle glow on hover */}
      <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-primary/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-[11px] text-muted-foreground font-rajdhani uppercase tracking-[0.15em] font-semibold">
            {title}
          </p>
          <p className="text-2xl lg:text-3xl font-orbitron font-bold text-foreground tracking-tight">
            {value}
          </p>
          {trend && (
            <div className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold",
              trend.isPositive 
                ? "bg-neon-green/10 text-neon-green" 
                : "bg-destructive/10 text-destructive"
            )}>
              {trend.isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {trend.isPositive ? "+" : ""}{trend.value}%
            </div>
          )}
        </div>
        
        <div className="p-3 rounded-xl bg-primary/8 border border-primary/15 group-hover:bg-primary/12 transition-colors">
          {icon}
        </div>
      </div>
    </div>
  );
});
StatCard.displayName = "StatCard";
