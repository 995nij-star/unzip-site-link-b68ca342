import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { LucideIcon } from "lucide-react";

interface SystemToggleCardProps {
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;
  enabled: boolean;
  loading: boolean;
  disabled: boolean;
  onToggle: (value: boolean) => void;
}

export function SystemToggleCard({
  label,
  description,
  icon: Icon,
  color,
  enabled,
  loading,
  disabled,
  onToggle,
}: SystemToggleCardProps) {
  return (
    <div
      className={`p-5 rounded-xl border transition-all duration-300 ${
        enabled
          ? "bg-card/80 border-border hover:border-primary/30 hover:shadow-[0_0_20px_-5px_hsl(var(--primary)/0.15)]"
          : "bg-destructive/5 border-destructive/30 hover:border-destructive/50"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className={`p-3 rounded-lg transition-colors duration-300 ${
              enabled ? "bg-primary/10" : "bg-destructive/10"
            }`}
          >
            <Icon
              className={`w-6 h-6 transition-colors duration-300 ${
                enabled ? color : "text-destructive"
              }`}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-orbitron font-bold text-foreground text-sm">
                {label}
              </h3>
              <Badge
                variant={enabled ? "default" : "destructive"}
                className="font-rajdhani text-xs"
              >
                {enabled ? "Active" : "Disabled"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground font-rajdhani mt-0.5">
              {description}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          <Switch
            checked={enabled}
            onCheckedChange={onToggle}
            disabled={loading || disabled}
          />
        </div>
      </div>
    </div>
  );
}
