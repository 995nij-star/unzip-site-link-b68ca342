import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface VerifiedBadgeProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function VerifiedBadge({ className, size = "sm" }: VerifiedBadgeProps) {
  const sizeClass = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  }[size];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cn(sizeClass, "inline-block shrink-0", className)}
        >
          {/* Star/seal shape */}
          <path
            d="M12 1.5l2.09 3.36 3.91.85-2.55 3.16.38 3.99L12 11.24 8.17 12.86l.38-3.99L6 5.71l3.91-.85L12 1.5z"
            fill="#1D9BF0"
            transform="scale(1.15) translate(-1.1, -0.5)"
          />
          <path
            d="M12 2l2.39 3.19L18 6.1l-2.12 3.24.5 3.86L12 11.38 7.62 13.2l.5-3.86L6 6.1l3.61-.91L12 2z"
            fill="#1D9BF0"
            transform="rotate(36 12 12) scale(1.15) translate(-1.1, -0.5)"
          />
          <circle cx="12" cy="12" r="7.5" fill="#1D9BF0" />
          {/* White checkmark */}
          <path
            d="M8.5 12.5l2 2 5-5"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-rajdhani text-xs">Verified User</p>
      </TooltipContent>
    </Tooltip>
  );
}