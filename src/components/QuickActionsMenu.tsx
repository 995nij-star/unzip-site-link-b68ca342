import { useNavigate } from "react-router-dom";
import { useConversations } from "@/hooks/useMessages";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CyberButton } from "@/components/ui/cyber-button";
import { MoreVertical, MessageCircle, Monitor, Film, Radio, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function QuickActionsMenu() {
  const navigate = useNavigate();
  const { conversations } = useConversations();

  // Count unread conversations
  const unreadCount = conversations.filter((c) => c.unread_count > 0).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <CyberButton variant="ghost" size="icon" className="relative">
          <MoreVertical className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-[9px] text-white font-bold flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </CyberButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 bg-card/95 backdrop-blur-xl border-primary/20">
        <DropdownMenuItem
          onClick={() => navigate("/messages")}
          className="flex items-center gap-3 cursor-pointer py-2.5"
        >
          <MessageCircle className="w-4 h-4 text-primary" />
          <span className="font-rajdhani font-medium flex-1">Messages</span>
          {unreadCount > 0 && (
            <Badge className="bg-destructive text-white border-none text-[10px] px-1.5 py-0">
              {unreadCount}
            </Badge>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => navigate("/clips")}
          className="flex items-center gap-3 cursor-pointer py-2.5"
        >
          <Film className="w-4 h-4 text-primary" />
          <span className="font-rajdhani font-medium">Clips</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => navigate("/streams")}
          className="flex items-center gap-3 cursor-pointer py-2.5"
        >
          <Radio className="w-4 h-4 text-primary" />
          <span className="font-rajdhani font-medium">Live Streams</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => navigate("/screen-record")}
          className="flex items-center gap-3 cursor-pointer py-2.5"
        >
          <Monitor className="w-4 h-4 text-primary" />
          <span className="font-rajdhani font-medium">Screen Record</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => navigate("/help")}
          className="flex items-center gap-3 cursor-pointer py-2.5"
        >
          <HelpCircle className="w-4 h-4 text-muted-foreground" />
          <span className="font-rajdhani font-medium">Help Center</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
