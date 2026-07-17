import { format } from "date-fns";
import { useState } from "react";
import { 
  Ticket, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useUserTickets, UserTicket } from "@/hooks/useUserTickets";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const issueTypeLabels: Record<string, string> = {
  banned: "Account Banned/Blocked",
  payment: "Payment Issue",
  tournament: "Tournament Problem",
  technical: "Technical Issue",
  other: "Other",
};

function getStatusConfig(status: string) {
  switch (status) {
    case 'resolved':
      return {
        icon: CheckCircle2,
        label: 'Resolved',
        className: 'bg-neon-green/20 text-neon-green border-neon-green/30',
      };
    case 'cancelled':
      return {
        icon: XCircle,
        label: 'Cancelled',
        className: 'bg-destructive/20 text-destructive border-destructive/30',
      };
    case 'in_progress':
      return {
        icon: AlertCircle,
        label: 'In Progress',
        className: 'bg-neon-orange/20 text-neon-orange border-neon-orange/30',
      };
    default:
      return {
        icon: Clock,
        label: 'Open',
        className: 'bg-primary/20 text-primary border-primary/30',
      };
  }
}

function TicketCard({ ticket }: { ticket: UserTicket }) {
  const [isOpen, setIsOpen] = useState(false);
  const statusConfig = getStatusConfig(ticket.status);
  const StatusIcon = statusConfig.icon;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-lg border border-border bg-background/50 overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors text-left">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Ticket className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-rajdhani font-medium text-foreground truncate">
                  {ticket.subject || issueTypeLabels[ticket.issue_type] || ticket.issue_type}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(ticket.created_at), 'MMM dd, yyyy • HH:mm')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={statusConfig.className}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {statusConfig.label}
              </Badge>
              {isOpen ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-2 border-t border-border space-y-4">
            {/* Issue Type */}
            <div>
              <p className="text-xs text-muted-foreground font-rajdhani mb-1">Issue Type</p>
              <p className="text-sm text-foreground font-rajdhani">
                {issueTypeLabels[ticket.issue_type] || ticket.issue_type}
              </p>
            </div>

            {/* Message */}
            <div>
              <p className="text-xs text-muted-foreground font-rajdhani mb-1">Your Message</p>
              <p className="text-sm text-foreground font-rajdhani whitespace-pre-wrap">
                {ticket.message}
              </p>
            </div>

            {/* Screenshots */}
            {ticket.screenshot_urls && ticket.screenshot_urls.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground font-rajdhani mb-2 flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" />
                  Attachments ({ticket.screenshot_urls.length})
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {ticket.screenshot_urls.map((url, index) => (
                    <a 
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="aspect-video rounded-lg overflow-hidden border border-border hover:border-primary transition-colors"
                    >
                      <img 
                        src={url} 
                        alt={`Attachment ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Admin Response */}
            {ticket.admin_notes && (
              <div className="p-3 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30">
                <p className="text-xs text-neon-cyan font-rajdhani mb-1">Admin Response</p>
                <p className="text-sm text-foreground font-rajdhani whitespace-pre-wrap">
                  {ticket.admin_notes}
                </p>
              </div>
            )}

            {/* Updated time */}
            {ticket.updated_at !== ticket.created_at && (
              <p className="text-xs text-muted-foreground">
                Last updated: {format(new Date(ticket.updated_at), 'MMM dd, yyyy • HH:mm')}
              </p>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function UserTicketsList() {
  const { data: tickets, isLoading, error } = useUserTickets();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="p-4 rounded-lg border border-border bg-background/50">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-lg" />
              <div className="flex-1">
                <Skeleton className="h-4 w-48 mb-2" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-muted-foreground font-rajdhani">
        Failed to load tickets. Please try again.
      </div>
    );
  }

  if (!tickets || tickets.length === 0) {
    return (
      <div className="text-center py-8">
        <Ticket className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
        <p className="text-muted-foreground font-rajdhani">
          You haven't submitted any tickets yet.
        </p>
      </div>
    );
  }

  // Count by status
  const openCount = tickets.filter(t => t.status === 'open').length;
  const resolvedCount = tickets.filter(t => t.status === 'resolved').length;
  const inProgressCount = tickets.filter(t => t.status === 'in_progress').length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 text-center">
          <p className="text-xl font-orbitron font-bold text-primary">{tickets.length}</p>
          <p className="text-xs text-muted-foreground font-rajdhani">Total</p>
        </div>
        <div className="p-3 rounded-lg bg-neon-orange/10 border border-neon-orange/30 text-center">
          <p className="text-xl font-orbitron font-bold text-neon-orange">{openCount + inProgressCount}</p>
          <p className="text-xs text-muted-foreground font-rajdhani">Pending</p>
        </div>
        <div className="p-3 rounded-lg bg-neon-green/10 border border-neon-green/30 text-center">
          <p className="text-xl font-orbitron font-bold text-neon-green">{resolvedCount}</p>
          <p className="text-xs text-muted-foreground font-rajdhani">Resolved</p>
        </div>
      </div>

      {/* Ticket List */}
      <div className="space-y-3">
        {tickets.map((ticket) => (
          <TicketCard key={ticket.id} ticket={ticket} />
        ))}
      </div>
    </div>
  );
}
