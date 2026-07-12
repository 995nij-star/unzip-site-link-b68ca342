import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const cyberButtonVariants = cva(
  "sheen relative inline-flex items-center justify-center gap-2 whitespace-nowrap font-orbitron font-semibold uppercase tracking-wider transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-neon hover:shadow-[0_0_30px_hsl(var(--neon-blue)/0.6)] hover:scale-[1.02] active:scale-[0.98]",
        secondary:
          "bg-secondary border-2 border-neon-blue/30 text-foreground hover:bg-neon-blue/10 hover:border-neon-blue/60 hover:shadow-neon",
        outline:
          "border-2 border-neon-blue/50 bg-transparent text-neon-cyan hover:bg-neon-blue/10 hover:border-neon-blue animate-glow-border",
        ghost:
          "text-foreground hover:bg-neon-blue/10 hover:text-neon-cyan",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        accent:
          "bg-accent text-accent-foreground shadow-glow hover:shadow-[0_0_30px_hsl(var(--neon-cyan)/0.6)]",
        neon:
          "bg-transparent border-2 border-neon-purple text-neon-purple shadow-purple hover:bg-neon-purple/10 animate-pulse-neon",
      },
      size: {
        default: "h-12 px-6 py-3 text-sm rounded-lg",
        sm: "h-10 px-4 py-2 text-xs rounded-md",
        lg: "h-14 px-8 py-4 text-base rounded-lg",
        xl: "h-16 px-10 py-5 text-lg rounded-xl",
        icon: "h-12 w-12 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface CyberButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof cyberButtonVariants> {
  asChild?: boolean;
}

const CyberButton = React.forwardRef<HTMLButtonElement, CyberButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(cyberButtonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
CyberButton.displayName = "CyberButton";

export { CyberButton, cyberButtonVariants };
