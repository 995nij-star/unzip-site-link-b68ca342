import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Loader2, Search, CheckCircle, XCircle, Clock, RefreshCw, Eye } from "lucide-react";
import { CyberInput } from "@/components/ui/cyber-input";
import { CyberButton } from "@/components/ui/cyber-button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

interface ModApplication {
  id: string;
  user_id: string;
  username: string;
  email: string;
  reason: string;
  experience: string;
  gaming_knowledge: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_notes: string | null;
  created_at: string;
}

export default function AdminModApplications() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedApp, setSelectedApp] = useState<ModApplication | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const { data: applications, isLoading, isFetching } = useQuery({
    queryKey: ["modApplications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mod_applications" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any[]) as ModApplication[];
    },
  });

  const filtered = applications?.filter(
    (a) =>
      a.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.user_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAction = async (app: ModApplication, action: "approved" | "rejected") => {
    if (!currentUser) return;
    setActionLoading(true);

    // Update application status
    const { error } = await supabase
      .from("mod_applications" as any)
      .update({
        status: action,
        reviewed_by: currentUser.id,
        reviewed_at: new Date().toISOString(),
        admin_notes: adminNotes.trim() || null,
      } as any)
      .eq("id", app.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setActionLoading(false);
      return;
    }

    // If approved, grant moderator role
    if (action === "approved") {
      // Check if role already exists
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", app.user_id)
        .eq("role", "moderator")
        .maybeSingle();

      if (!existingRole) {
        await supabase.from("user_roles").insert({
          user_id: app.user_id,
          role: "moderator",
        });
      }
    }

    // Send notification
    await supabase.from("notifications").insert({
      user_id: app.user_id,
      type: action === "approved" ? "mod_approved" : "mod_rejected",
      title: action === "approved" ? "Moderator Application Approved ✓" : "Moderator Application Update",
      message:
        action === "approved"
          ? "Your moderator application has been approved. You now have moderator privileges."
          : "Your moderator application has been reviewed. Unfortunately, it was not approved at this time." +
            (adminNotes.trim() ? ` Admin notes: ${adminNotes.trim()}` : ""),
    });

    toast({
      title: action === "approved" ? "Application Approved" : "Application Rejected",
      description: `${app.username}'s application has been ${action}.`,
    });

    queryClient.invalidateQueries({ queryKey: ["modApplications"] });
    queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
    setSelectedApp(null);
    setAdminNotes("");
    setActionLoading(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-neon-green/20 text-neon-green border-neon-green/30 font-rajdhani"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive" className="font-rajdhani"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge className="bg-neon-orange/20 text-neon-orange border-neon-orange/30 font-rajdhani"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="Mod Applications" description="Loading...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Moderator Applications" description="Review and manage moderator applications">
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <CyberInput
          placeholder="Search by username, email or user ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          icon={<Search className="w-5 h-5" />}
          className="flex-1 max-w-md"
        />
        <CyberButton
          variant="outline"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["modApplications"] })}
          disabled={isFetching}
          className="shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </CyberButton>
      </div>

      <div className="bg-gradient-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground font-rajdhani">User</TableHead>
              <TableHead className="text-muted-foreground font-rajdhani">Knowledge</TableHead>
              <TableHead className="text-muted-foreground font-rajdhani">Date</TableHead>
              <TableHead className="text-muted-foreground font-rajdhani">Status</TableHead>
              <TableHead className="text-muted-foreground font-rajdhani text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                  No applications found
                </TableCell>
              </TableRow>
            ) : (
              filtered?.map((app) => (
                <TableRow key={app.id} className="border-border">
                  <TableCell>
                    <div>
                      <span className="font-rajdhani font-medium text-foreground">{app.username}</span>
                      <span className="block text-xs text-muted-foreground">{app.email}</span>
                      <span className="font-mono text-xs text-muted-foreground">{app.user_id.slice(0, 8)}...</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-rajdhani capitalize">{app.gaming_knowledge}</Badge>
                  </TableCell>
                  <TableCell className="text-sm font-rajdhani text-muted-foreground">
                    {format(new Date(app.created_at), "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell>{getStatusBadge(app.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <CyberButton variant="outline" size="sm" onClick={() => { setSelectedApp(app); setAdminNotes(app.admin_notes || ""); }}>
                        <Eye className="w-4 h-4" />
                        Review
                      </CyberButton>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Review Dialog */}
      <Dialog open={!!selectedApp} onOpenChange={(open) => { if (!open) { setSelectedApp(null); setAdminNotes(""); } }}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-orbitron">Review Application</DialogTitle>
            <DialogDescription className="font-rajdhani">
              {selectedApp?.username}'s moderator application
            </DialogDescription>
          </DialogHeader>

          {selectedApp && (
            <div className="space-y-4 font-rajdhani text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-muted-foreground">Username</span>
                  <p className="text-foreground font-medium">{selectedApp.username}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Email</span>
                  <p className="text-foreground">{selectedApp.email}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Gaming Knowledge</span>
                  <p className="text-foreground capitalize">{selectedApp.gaming_knowledge}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status</span>
                  <div className="mt-1">{getStatusBadge(selectedApp.status)}</div>
                </div>
              </div>

              <div>
                <span className="text-muted-foreground">Experience</span>
                <p className="text-foreground mt-1 bg-background/50 rounded-lg p-3 border border-border">
                  {selectedApp.experience}
                </p>
              </div>

              <div>
                <span className="text-muted-foreground">Reason for Applying</span>
                <p className="text-foreground mt-1 bg-background/50 rounded-lg p-3 border border-border">
                  {selectedApp.reason}
                </p>
              </div>

              <div>
                <span className="text-muted-foreground">Admin Notes</span>
                <Textarea
                  placeholder="Add notes (optional)..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="mt-1 bg-background/50 border-border font-rajdhani"
                  maxLength={500}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            {selectedApp?.status === "pending" && (
              <>
                <CyberButton
                  variant="destructive"
                  onClick={() => selectedApp && handleAction(selectedApp, "rejected")}
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  Reject
                </CyberButton>
                <CyberButton
                  onClick={() => selectedApp && handleAction(selectedApp, "approved")}
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Approve
                </CyberButton>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
