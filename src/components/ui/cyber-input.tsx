import * as React from "react";
import { cn } from "@/lib/utils";

export interface CyberInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

const CyberInput = React.forwardRef<HTMLInputElement, CyberInputProps>(
  ({ className, type, icon, ...props }, ref) => {
    return (
      <div className="relative group">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
            {icon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            "flex h-14 w-full rounded-lg border-2 border-border bg-secondary/50 px-4 py-3 text-base font-rajdhani font-medium text-foreground transition-all duration-300",
            "placeholder:text-muted-foreground/60",
            "focus:outline-none focus:border-primary focus:bg-secondary focus:shadow-neon",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "hover:border-primary/50 hover:bg-secondary/70",
            icon && "pl-12",
            className
          )}
          ref={ref}
          {...props}
        />
        <div className="absolute inset-0 rounded-lg pointer-events-none opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-neon-blue/5 to-neon-cyan/5" />
      </div>
    );
  }
);
CyberInput.displayName = "CyberInput";

export { CyberInput };
