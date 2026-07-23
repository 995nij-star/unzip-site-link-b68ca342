import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CyberButton } from "@/components/ui/cyber-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Shield, Search, Crown, UserCog, Users, ClipboardList, Trash2, Copy } from "lucide-react";
import { ModeratorDutiesDialog } from "@/components/admin/ModeratorDutiesDialog";
import { CopyModeratorDutiesDialog } from "@/components/admin/CopyModeratorDutiesDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface UserWithRole {
  user_id: string;
  username: string | null;
  email: string | null;
  avatar_url: string | null;
  role: string;
  role_id: string | null;
}

export default function AdminRolesManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [updating, setUpdating] = useState<string | null>(null);
  const [dutiesFor, setDutiesFor] = useState<UserWithRole | null>(null);
  const [dutyCounts, setDutyCounts] = useState<Record<string, number>>({});
  const [clearing, setClearing] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState<UserWithRole | null>(null);
  const [copyFrom, setCopyFrom] = useState<UserWithRole | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchDutyCounts = async () => {
    const { data } = await supabase.from("moderator_permissions").select("moderator_id");
    const counts: Record<string, number> = {};
    data?.forEach((r: any) => { counts[r.moderator_id] = (counts[r.moderator_id] || 0) + 1; });
    setDutyCounts(counts);
  };

  const fetchUsers = async () => {
    setLoading(true);
    const { data: profiles } = await supabase.from("profiles").select("user_id, username, email, avatar_url");
    const { data: roles } = await supabase.from("user_roles").select("id, user_id, role");

    const roleMap = new Map<string, { role: string; role_id: string }>();
    roles?.forEach(r => {
      const existing = roleMap.get(r.user_id);
      // Keep highest role
      const priority: Record<string, number> = { admin: 3, moderator: 2, user: 1 };
      if (!existing || priority[r.role] > priority[existing.role]) {
        roleMap.set(r.user_id, { role: r.role, role_id: r.id });
      }
    });

    const merged: UserWithRole[] = (profiles || []).map(p => ({
      ...p,
      role: roleMap.get(p.user_id)?.role || "user",
      role_id: roleMap.get(p.user_id)?.role_id || null,
    }));

    // Sort: admin first, then mod, then user
    merged.sort((a, b) => {
      const p: Record<string, number> = { admin: 0, moderator: 1, user: 2 };
      return (p[a.role] ?? 2) - (p[b.role] ?? 2);
    });

    setUsers(merged);
    await fetchDutyCounts();
    setLoading(false);
  };

  const handleClearDuties = async (target: UserWithRole) => {
    if (!user) return;
    setClearing(target.user_id);
    try {
      const { error } = await (supabase as any)
        .from("moderator_permissions")
        .delete()
        .eq("moderator_id", target.user_id);
      if (error) throw error;
      await supabase.from("admin_audit_log").insert({
        admin_id: user.id,
        action: "moderator_duties_cleared",
        target_type: "user",
        target_id: target.user_id,
        details: {} as any,
      });
      toast({ title: "🗑️ Duties Removed", description: `All duties cleared for ${target.username || "moderator"}.` });
      await fetchDutyCounts();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setClearing(null);
    setConfirmClear(null);
  };

  const handleRoleChange = async (targetUserId: string, newRole: string) => {
    if (!user || targetUserId === user.id) {
      toast({ title: "Error", description: "You cannot change your own role.", variant: "destructive" });
      return;
    }
    setUpdating(targetUserId);

    try {
      // Delete existing roles for this user
      await supabase.from("user_roles").delete().eq("user_id", targetUserId);

      // Insert new role
      if (newRole !== "user") {
        await supabase.from("user_roles").insert({ user_id: targetUserId, role: newRole as any });
      }

      // Audit log
      await supabase.from("admin_audit_log").insert({
        admin_id: user.id,
        action: "role_change",
        target_type: "user",
        target_id: targetUserId,
        details: { new_role: newRole } as any,
      });

      toast({ title: "✅ Role Updated", description: `User role changed to ${newRole}.` });
      await fetchUsers();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setUpdating(null);
  };

  const filtered = users.filter(u => {
    const matchSearch = !search || u.username?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === "all" || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const roleCounts = { admin: users.filter(u => u.role === "admin").length, moderator: users.filter(u => u.role === "moderator").length, user: users.filter(u => u.role === "user").length };

  const roleColor = (role: string) => {
    switch (role) {
      case "admin": return "bg-destructive/20 text-destructive border-destructive/30";
      case "moderator": return "bg-primary/20 text-primary border-primary/30";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Roles & Permissions" description="Loading...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Roles & Permissions" description="Manage user roles and access levels across the platform">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Admins", count: roleCounts.admin, icon: Crown, color: "text-destructive" },
          { label: "Moderators", count: roleCounts.moderator, icon: Shield, color: "text-primary" },
          { label: "Users", count: roleCounts.user, icon: Users, color: "text-muted-foreground" },
        ].map(s => (
          <Card key={s.label} className="p-4 bg-card/60 border-border/50 flex items-center gap-3">
            <s.icon className={`w-5 h-5 ${s.color}`} />
            <div>
              <p className="text-xl font-orbitron font-bold text-foreground">{s.count}</p>
              <p className="text-xs text-muted-foreground font-rajdhani">{s.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by username or email..." className="pl-9 bg-background/50" />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-40 bg-background/50"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="moderator">Moderator</SelectItem>
            <SelectItem value="user">User</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="bg-card/60 border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50">
              <TableHead className="font-rajdhani">User</TableHead>
              <TableHead className="font-rajdhani">Email</TableHead>
              <TableHead className="font-rajdhani">Current Role</TableHead>
              <TableHead className="font-rajdhani text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.slice(0, 50).map(u => (
              <TableRow key={u.user_id} className="border-border/30">
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={u.avatar_url || ""} />
                      <AvatarFallback className="text-xs bg-muted">{(u.username || "?")[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="font-rajdhani font-medium text-foreground text-sm">{u.username || "Unnamed"}</span>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{u.email || "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-xs ${roleColor(u.role)}`}>{u.role}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {u.role === "moderator" && u.user_id !== user?.id && (
                      <>
                        {dutyCounts[u.user_id] > 0 && (
                          <Badge variant="outline" className="text-[10px] bg-primary/10 border-primary/30 text-primary font-rajdhani">
                            {dutyCounts[u.user_id]} {dutyCounts[u.user_id] === 1 ? "duty" : "duties"}
                          </Badge>
                        )}
                        <CyberButton
                          variant="secondary"
                          size="sm"
                          onClick={() => setDutiesFor(u)}
                          className="h-8 px-2 text-xs gap-1"
                          title={dutyCounts[u.user_id] > 0 ? "Edit duties" : "Assign duties"}
                        >
                          <ClipboardList className="w-3.5 h-3.5" />
                          {dutyCounts[u.user_id] > 0 ? "Edit" : "Assign"}
                        </CyberButton>
                        {dutyCounts[u.user_id] > 0 && (
                          <>
                            <CyberButton
                              variant="secondary"
                              size="sm"
                              onClick={() => setCopyFrom(u)}
                              className="h-8 w-8 p-0"
                              title="Copy these duties to another moderator"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </CyberButton>
                            <CyberButton
                              variant="destructive"
                              size="sm"
                              onClick={() => setConfirmClear(u)}
                              disabled={clearing === u.user_id}
                              className="h-8 w-8 p-0"
                              title="Remove all duties"
                            >
                              {clearing === u.user_id
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <Trash2 className="w-3.5 h-3.5" />}
                            </CyberButton>
                          </>
                        )}
                      </>
                    )}
                    {u.user_id === user?.id ? (
                      <span className="text-xs text-muted-foreground font-rajdhani">You</span>
                    ) : (
                      <Select value={u.role} onValueChange={v => handleRoleChange(u.user_id, v)} disabled={updating === u.user_id}>
                        <SelectTrigger className="w-32 h-8 text-xs bg-background/50">
                          {updating === u.user_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <SelectValue />}
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="moderator">Moderator</SelectItem>
                          <SelectItem value="user">User</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-muted-foreground text-sm font-rajdhani">No users found</div>
        )}
        {filtered.length > 50 && (
          <div className="p-3 text-center text-xs text-muted-foreground border-t border-border/30">
            Showing 50 of {filtered.length} users. Use search to narrow results.
          </div>
        )}
      </Card>

      {dutiesFor && (
        <ModeratorDutiesDialog
          open={!!dutiesFor}
          onOpenChange={(v) => { if (!v) { setDutiesFor(null); fetchDutyCounts(); } }}
          moderatorId={dutiesFor.user_id}
          moderatorName={dutiesFor.username || dutiesFor.email || "Moderator"}
        />
      )}

      {copyFrom && (
        <CopyModeratorDutiesDialog
          open={!!copyFrom}
          onOpenChange={(v) => { if (!v) { setCopyFrom(null); fetchDutyCounts(); } }}
          sourceModeratorId={copyFrom.user_id}
          sourceModeratorName={copyFrom.username || copyFrom.email || "Moderator"}
          onCopied={fetchDutyCounts}
        />
      )}

      <AlertDialog open={!!confirmClear} onOpenChange={(v) => !v && setConfirmClear(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove all duties?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear every assigned responsibility for{" "}
              <strong>{confirmClear?.username || confirmClear?.email || "this moderator"}</strong>.
              Their moderator role stays intact — only the duty assignments are removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmClear && handleClearDuties(confirmClear)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
