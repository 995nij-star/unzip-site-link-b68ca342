import * as React from "react";
import { cn } from "@/lib/utils";

export interface GlassInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

const GlassInput = React.forwardRef<HTMLInputElement, GlassInputProps>(
  ({ className, type, icon, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);

    return (
      <div className="relative group">
        {/* Focus glow ring */}
        <div
          className="absolute -inset-[1px] rounded-lg transition-opacity duration-300 pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, hsl(210 100% 55% / 0.4), hsl(270 100% 65% / 0.4), hsl(320 100% 60% / 0.3))',
            opacity: isFocused ? 1 : 0,
            filter: 'blur(3px)',
          }}
        />
        <input
          type={type}
          className={cn(
            "relative flex h-14 w-full rounded-lg px-5 py-3 text-base font-rajdhani font-medium text-foreground transition-all duration-300",
            "placeholder:text-muted-foreground/60",
            "focus:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
            icon && "pr-12",
            className
          )}
          style={{
            background: isFocused
              ? 'linear-gradient(135deg, hsl(220 25% 17% / 0.9) 0%, hsl(220 30% 12% / 0.95) 100%)'
              : 'linear-gradient(135deg, hsl(220 25% 15% / 0.8) 0%, hsl(220 30% 10% / 0.9) 100%)',
            border: isFocused
              ? '1px solid hsl(210 100% 55% / 0.5)'
              : '1px solid hsl(260 30% 25% / 0.5)',
            backdropFilter: 'blur(8px)',
            boxShadow: isFocused
              ? '0 0 20px hsl(210 100% 55% / 0.15), inset 0 1px 0 hsl(210 100% 70% / 0.05)'
              : 'inset 0 1px 0 hsl(210 100% 70% / 0.03)',
          }}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          ref={ref}
          {...props}
        />
        {icon && (
          <div
            className="absolute right-4 top-1/2 -translate-y-1/2 transition-all duration-300"
            style={{
              color: isFocused ? 'hsl(210 100% 55%)' : 'hsl(45 80% 55% / 0.6)',
              filter: isFocused ? 'drop-shadow(0 0 6px hsl(210 100% 55% / 0.4))' : 'none',
            }}
          >
            {icon}
          </div>
        )}
      </div>
    );
  }
);
GlassInput.displayName = "GlassInput";

export { GlassInput };