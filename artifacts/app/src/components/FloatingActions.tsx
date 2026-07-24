import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Plus, Send, Wallet as WalletIcon, Command, X, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdmin } from "@/hooks/useAdmin";

/**
 * Floating quick-action dial. Pure presentational — routes users to
 * existing wallet/transfer flows. Hidden on auth & admin routes to
 * avoid cluttering those surfaces.
 *
 * Admin Panel button is only shown when useAdmin().isAdmin is true,
 * which requires either the super-admin email or a DB role grant.
 */
export function FloatingActions() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { isAdmin } = useAdmin();

  const hidden =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/clone/admin") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/forgot") ||
    pathname.startsWith("/reset") ||
    pathname.startsWith("/verify-human");

  if (hidden) return null;

  const actions = [
    ...(isAdmin
      ? [{ label: "Admin Panel", icon: Shield, path: "/admin", highlight: true }]
      : []),
    { label: "Send Money", icon: Send, path: "/wallet/send" },
    { label: "Add Money", icon: Plus, path: "/wallet/add" },
    { label: "Wallet", icon: WalletIcon, path: "/wallet" },
    {
      label: "Command (⌘K)",
      icon: Command,
      onClick: () => {
        window.dispatchEvent(
          new KeyboardEvent("keydown", { key: "k", metaKey: true }),
        );
      },
    },
  ];

  return (
    <div className="fixed bottom-24 right-4 sm:bottom-6 sm:right-6 z-40 flex flex-col items-end gap-3 print:hidden">
      {/* Radial items */}
      <div
        className={cn(
          "flex flex-col items-end gap-2 transition-all duration-300",
          open
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-3 pointer-events-none",
        )}
      >
        {actions.map((a) => (
          <button
            key={a.label}
            aria-label={a.label}
            onClick={() => {
              setOpen(false);
              if ("onClick" in a && a.onClick) a.onClick();
              else if ("path" in a && a.path) navigate(a.path);
            }}
            className={cn(
              "group flex items-center gap-3 pl-4 pr-3 py-2 rounded-full glass-luxury-strong hover:border-primary/40 transition-all hover:-translate-y-0.5",
              "highlight" in a && a.highlight && "border border-[hsl(var(--neon-purple)/0.4)] hover:border-[hsl(var(--neon-purple)/0.7)]",
            )}
          >
            <span className={cn(
              "text-xs font-medium text-foreground/90 whitespace-nowrap",
              "highlight" in a && a.highlight && "text-[hsl(var(--neon-purple))]",
            )}>
              {a.label}
            </span>
            <span className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center shadow-lg",
              "highlight" in a && a.highlight
                ? "bg-[hsl(var(--neon-purple)/0.15)] border border-[hsl(var(--neon-purple)/0.4)] shadow-[hsl(var(--neon-purple)/0.3)]"
                : "gradient-flow text-white shadow-primary/30",
            )}>
              <a.icon className={cn(
                "w-4 h-4",
                "highlight" in a && a.highlight && "text-[hsl(var(--neon-purple))]",
              )} />
            </span>
          </button>
        ))}
      </div>

      {/* Main FAB */}
      <button
        aria-label={open ? "Close quick actions" : "Open quick actions"}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "relative w-14 h-14 rounded-full flex items-center justify-center text-white",
          "gradient-flow shadow-[0_10px_40px_-8px_hsl(217_91%_60%/0.6)]",
          "transition-transform duration-300 hover:scale-105 active:scale-95",
          "ring-1 ring-white/10",
        )}
      >
        <span className="absolute inset-0 rounded-full opacity-40 blur-xl bg-primary" />
        {open ? (
          <X className="w-6 h-6 relative" />
        ) : (
          <Plus className="w-6 h-6 relative" />
        )}
      </button>
    </div>
  );
}
