import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { CyberButton } from "@/components/ui/cyber-button";
import { CyberInput } from "@/components/ui/cyber-input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search, 
  Eye, 
  Trash2, 
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Image as ImageIcon
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface SupportTicket {
  id: string;
  user_id: string | null;
  uid: string | null;
  email: string;
  issue_type: string;
  subject: string | null;
  message: string;
  status: string;
  admin_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  screenshot_urls: string[] | null;
  created_at: string;
  updated_at: string;
}

const issueTypeLabels: Record<string, string> = {
  banned: "Account Banned",
  payment: "Payment Issue",
  tournament: "Tournament Problem",
  technical: "Technical Issue",
  other: "Other",
};

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  open: { label: "Open", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: <Clock className="w-3 h-3" /> },
  in_progress: { label: "In Progress", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: <AlertTriangle className="w-3 h-3" /> },
  resolved: { label: "Resolved", color: "bg-green-500/20 text-green-400 border-green-500/30", icon: <CheckCircle className="w-3 h-3" /> },
  closed: { label: "Closed", color: "bg-gray-500/20 text-gray-400 border-gray-500/30", icon: <XCircle className="w-3 h-3" /> },
};

export default function AdminSupportTickets() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["admin-support-tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as SupportTicket[];
    },
  });

  const updateTicketMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes: string }) => {
      const updateData: {
        status: string;
        admin_notes: string;
        resolved_by?: string;
        resolved_at?: string;
      } = {
        status,
        admin_notes: notes,
      };

      if (status === "resolved" || status === "closed") {
        const { data: { user } } = await supabase.auth.getUser();
        updateData.resolved_by = user?.id;
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await (supabase as any)
        .from("support_tickets")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
      setSelectedTicket(null);
      toast({ title: "Ticket updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update ticket", variant: "destructive" });
    },
  });

  const deleteTicketMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("support_tickets")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
      toast({ title: "Ticket deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete ticket", variant: "destructive" });
    },
  });

  const filteredTickets = tickets?.filter((ticket) => {
    const matchesSearch =
      ticket.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.uid?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.message.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const openTicketDialog = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setAdminNotes(ticket.admin_notes || "");
    setNewStatus(ticket.status);
  };

  const handleUpdateTicket = () => {
    if (selectedTicket) {
      updateTicketMutation.mutate({
        id: selectedTicket.id,
        status: newStatus,
        notes: adminNotes,
      });
    }
  };

  const ticketCounts = {
    total: tickets?.length || 0,
    open: tickets?.filter((t) => t.status === "open").length || 0,
    in_progress: tickets?.filter((t) => t.status === "in_progress").length || 0,
    resolved: tickets?.filter((t) => t.status === "resolved").length || 0,
  };

  return (
    <AdminLayout title="Support Tickets" description="Manage Help Center submissions">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-gradient-card border border-border">
            <p className="text-2xl font-orbitron font-bold text-foreground">{ticketCounts.total}</p>
            <p className="text-sm text-muted-foreground font-rajdhani">Total Tickets</p>
          </div>
          <div className="p-4 rounded-lg bg-gradient-card border border-border">
            <p className="text-2xl font-orbitron font-bold text-primary">{ticketCounts.open}</p>
            <p className="text-sm text-muted-foreground font-rajdhani">Open</p>
          </div>
          <div className="p-4 rounded-lg bg-gradient-card border border-border">
            <p className="text-2xl font-orbitron font-bold text-accent">{ticketCounts.in_progress}</p>
            <p className="text-sm text-muted-foreground font-rajdhani">In Progress</p>
          </div>
          <div className="p-4 rounded-lg bg-gradient-card border border-border">
            <p className="text-2xl font-orbitron font-bold text-neon-green">{ticketCounts.resolved}</p>
            <p className="text-sm text-muted-foreground font-rajdhani">Resolved</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-gradient-card border border-border">
            <p className="text-2xl font-orbitron font-bold text-foreground">{ticketCounts.total}</p>
            <p className="text-sm text-muted-foreground font-rajdhani">Total Tickets</p>
          </div>
          <div className="p-4 rounded-lg bg-gradient-card border border-yellow-500/30">
            <p className="text-2xl font-orbitron font-bold text-yellow-400">{ticketCounts.open}</p>
            <p className="text-sm text-muted-foreground font-rajdhani">Open</p>
          </div>
          <div className="p-4 rounded-lg bg-gradient-card border border-blue-500/30">
            <p className="text-2xl font-orbitron font-bold text-blue-400">{ticketCounts.in_progress}</p>
            <p className="text-sm text-muted-foreground font-rajdhani">In Progress</p>
          </div>
          <div className="p-4 rounded-lg bg-gradient-card border border-green-500/30">
            <p className="text-2xl font-orbitron font-bold text-green-400">{ticketCounts.resolved}</p>
            <p className="text-sm text-muted-foreground font-rajdhani">Resolved</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <CyberInput
              placeholder="Search by email, UID, subject..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40 bg-secondary/50 border-border">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border bg-gradient-card overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredTickets?.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground font-rajdhani">No support tickets found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="font-rajdhani">Date</TableHead>
                  <TableHead className="font-rajdhani">Email</TableHead>
                  <TableHead className="font-rajdhani">UID</TableHead>
                  <TableHead className="font-rajdhani">Issue Type</TableHead>
                  <TableHead className="font-rajdhani">Subject</TableHead>
                  <TableHead className="font-rajdhani">Status</TableHead>
                  <TableHead className="font-rajdhani text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets?.map((ticket) => (
                  <TableRow key={ticket.id} className="border-border">
                    <TableCell className="font-rajdhani text-muted-foreground">
                      {format(new Date(ticket.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="font-rajdhani">{ticket.email}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {ticket.uid || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-rajdhani">
                        {issueTypeLabels[ticket.issue_type] || ticket.issue_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-rajdhani max-w-[200px] truncate">
                      {ticket.subject || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${statusConfig[ticket.status]?.color} border font-rajdhani`}>
                        <span className="flex items-center gap-1">
                          {statusConfig[ticket.status]?.icon}
                          {statusConfig[ticket.status]?.label}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <CyberButton
                          size="sm"
                          variant="outline"
                          onClick={() => openTicketDialog(ticket)}
                        >
                          <Eye className="w-4 h-4" />
                        </CyberButton>
                        <CyberButton
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteTicketMutation.mutate(ticket.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </CyberButton>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Ticket Details Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-2xl bg-background border-border">
          <DialogHeader>
            <DialogTitle className="font-orbitron">Ticket Details</DialogTitle>
          </DialogHeader>

          {selectedTicket && (
            <div className="space-y-4">
              {/* Ticket Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground font-rajdhani">Email</p>
                  <p className="font-medium">{selectedTicket.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground font-rajdhani">UID</p>
                  <p className="font-mono">{selectedTicket.uid || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground font-rajdhani">Issue Type</p>
                  <Badge variant="outline">
                    {issueTypeLabels[selectedTicket.issue_type] || selectedTicket.issue_type}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground font-rajdhani">Submitted</p>
                  <p>{format(new Date(selectedTicket.created_at), "MMM d, yyyy 'at' h:mm a")}</p>
                </div>
              </div>

              {/* Subject */}
              {selectedTicket.subject && (
                <div>
                  <p className="text-muted-foreground font-rajdhani text-sm mb-1">Subject</p>
                  <p className="font-medium">{selectedTicket.subject}</p>
                </div>
              )}

              {/* Message */}
              <div>
                <p className="text-muted-foreground font-rajdhani text-sm mb-1">Message</p>
                <div className="p-3 rounded-lg bg-secondary/30 border border-border">
                  <p className="whitespace-pre-wrap">{selectedTicket.message}</p>
                </div>
              </div>

              {/* Screenshots */}
              {selectedTicket.screenshot_urls && selectedTicket.screenshot_urls.length > 0 && (
                <div>
                  <p className="text-muted-foreground font-rajdhani text-sm mb-2 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Screenshots ({selectedTicket.screenshot_urls.length})
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedTicket.screenshot_urls.map((url, index) => (
                      <a
                        key={index}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block aspect-video rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-colors"
                      >
                        <img 
                          src={url} 
                          alt={`Screenshot ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Status Update */}
              <div>
                <p className="text-muted-foreground font-rajdhani text-sm mb-2">Update Status</p>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="bg-secondary/50 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Admin Notes */}
              <div>
                <p className="text-muted-foreground font-rajdhani text-sm mb-2">Admin Notes</p>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this ticket..."
                  className="bg-secondary/50 border-border resize-none"
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <CyberButton variant="outline" onClick={() => setSelectedTicket(null)}>
              Cancel
            </CyberButton>
            <CyberButton
              onClick={handleUpdateTicket}
              disabled={updateTicketMutation.isPending}
            >
              {updateTicketMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Save Changes"
              )}
            </CyberButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
