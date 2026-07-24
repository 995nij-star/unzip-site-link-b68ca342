import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  Wallet as WalletIcon,
  Send,
  Trophy,
  Video,
  Users,
  Bell,
  ShieldCheck,
  LifeBuoy,
  Search as SearchIcon,
  Sparkles,
} from "lucide-react";

type Cmd = {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  group: "Navigate" | "Money" | "Account";
  keywords?: string;
};

const COMMANDS: Cmd[] = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard, group: "Navigate" },
  { label: "Tournaments", path: "/tournaments", icon: Trophy, group: "Navigate" },
  { label: "Live Streams", path: "/streams", icon: Video, group: "Navigate" },
  { label: "Clips", path: "/clips", icon: Sparkles, group: "Navigate" },
  { label: "Discover", path: "/discover", icon: Users, group: "Navigate" },
  { label: "Leaderboard", path: "/leaderboard", icon: Trophy, group: "Navigate" },
  { label: "Search", path: "/search", icon: SearchIcon, group: "Navigate" },

  { label: "Wallet", path: "/wallet", icon: WalletIcon, group: "Money" },
  { label: "Add Money", path: "/wallet/add", icon: WalletIcon, group: "Money" },
  { label: "Send Money", path: "/wallet/send", icon: Send, group: "Money", keywords: "transfer international" },

  { label: "Notifications", path: "/notifications", icon: Bell, group: "Account" },
  { label: "Help Center", path: "/help", icon: LifeBuoy, group: "Account" },
  { label: "Sessions", path: "/sessions", icon: ShieldCheck, group: "Account" },
  { label: "KYC Verification", path: "/kyc", icon: ShieldCheck, group: "Account" },

];

/**
 * Global command palette (⌘K / Ctrl+K).
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const groups: ("Navigate" | "Money" | "Account")[] = ["Navigate", "Money", "Account"];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search commands, pages, or actions…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {groups.map((g, i) => {
          const items = COMMANDS.filter((c) => c.group === g);
          if (!items.length) return null;
          return (
            <div key={g}>
              {i > 0 && <CommandSeparator />}
              <CommandGroup heading={g}>
                {items.map((c) => (
                  <CommandItem
                    key={c.path}
                    value={`${c.label} ${c.keywords ?? ""}`}
                    onSelect={() => {
                      setOpen(false);
                      navigate(c.path);
                    }}
                  >
                    <c.icon className="mr-2 h-4 w-4 text-primary" />
                    <span>{c.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </div>
          );
        })}
      </CommandList>
    </CommandDialog>
  );
}
