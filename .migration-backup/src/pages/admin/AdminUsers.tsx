import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminUsers } from "@/hooks/useAdmin";
import { useAuth } from "@/hooks/useAuth";
import { isUserOnline, getOnlineStatusText } from "@/hooks/usePresence";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Loader2, Search, Ban, CheckCircle, User, Shield, Crown, UserCheck, Eye, Mail, Circle, RefreshCw, BadgeCheck, ExternalLink, IndianRupee, Megaphone } from "lucide-react";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { CyberInput } from "@/components/ui/cyber-input";
import { CyberButton } from "@/components/ui/cyber-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BanReasonDialog } from "@/components/admin/BanReasonDialog";
import { UserDetailsDialog } from "@/components/admin/UserDetailsDialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type AppRole = 'admin' | 'moderator' | 'user';

export default function AdminUsers() {
  const navigate = useNavigate();
  const { data: users, isLoading, error, isFetching } = useAdminUsers();
  const { user: currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ userId: string; username: string; isBanned: boolean } | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [bulkRewardOpen, setBulkRewardOpen] = useState(false);
  const [bulkRewardAmount, setBulkRewardAmount] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId); else next.add(userId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!filteredUsers) return;
    if (selectedUserIds.size === filteredUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(filteredUsers.map(u => u.user_id)));
    }
  };

  const handleBulkBan = async () => {
    if (!currentUser || selectedUserIds.size === 0) return;
    if (!confirm(`Ban ${selectedUserIds.size} selected user(s)?`)) return;
    setBulkActionLoading(true);
    for (const uid of selectedUserIds) {
      if (uid === currentUser.id) continue;
      await supabase.from("profiles").update({ is_banned: true }).eq("user_id", uid);
      await supabase.from("ban_audit_log").insert({ user_id: uid, admin_id: currentUser.id, action: "ban", reason: "Bulk ban action" });
    }
    toast({ title: "Bulk Ban Complete", description: `${selectedUserIds.size} users banned.` });
    setSelectedUserIds(new Set());
    queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
    setBulkActionLoading(false);
  };

  const handleBulkReward = async () => {
    if (!currentUser || selectedUserIds.size === 0) return;
    const amount = parseFloat(bulkRewardAmount);
    if (isNaN(amount) || amount <= 0) { toast({ title: "Invalid amount", variant: "destructive" }); return; }
    setBulkActionLoading(true);
    for (const uid of selectedUserIds) {
      await supabase.from("wallet_transactions").insert({ user_id: uid, amount, type: "admin_credit", description: "Bulk admin reward" });
      const { data: w } = await supabase.from("wallets").select("balance").eq("user_id", uid).maybeSingle();
      if (w) await supabase.from("wallets").update({ balance: Number(w.balance) + amount }).eq("user_id", uid);
      await supabase.from("notifications").insert({ user_id: uid, type: "wallet", title: "Reward Received!", message: `₹${amount} has been credited to your wallet.` });
    }
    toast({ title: "Bulk Reward Sent", description: `₹${amount} credited to ${selectedUserIds.size} users.` });
    setSelectedUserIds(new Set());
    setBulkRewardOpen(false);
    setBulkRewardAmount("");
    setBulkActionLoading(false);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    toast({
      title: "Refreshing",
      description: "User list is being updated...",
    });
  };

  const filteredUsers = users?.filter(user => 
    user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.user_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openBanDialog = (userId: string, username: string, isBanned: boolean) => {
    setSelectedUser({ userId, username: username ?? 'Unknown', isBanned });
    setBanDialogOpen(true);
  };

  const openDetailsDialog = (userId: string) => {
    setSelectedUserId(userId);
    setDetailsDialogOpen(true);
  };

  const handleBanConfirm = async (reason: string) => {
    if (!selectedUser || !currentUser) return;
    
    const { userId, isBanned } = selectedUser;
    const newBannedState = !isBanned;
    
    setActionLoading(userId);
    
    // Update profile ban status
    const { error } = await supabase
      .from('profiles')
      .update({ is_banned: newBannedState })
      .eq('user_id', userId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setActionLoading(null);
      setBanDialogOpen(false);
      return;
    }

    // Record to audit log
    const { error: auditError } = await supabase
      .from('ban_audit_log')
      .insert({
        user_id: userId,
        admin_id: currentUser.id,
        action: newBannedState ? 'ban' : 'unban',
        reason: reason.trim() || null,
      });

    if (auditError) {
      console.error("Failed to record ban audit log:", auditError);
      // Don't block the ban action if audit log fails
    }

    // Send email notification (non-blocking)
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        await supabase.functions.invoke('send-ban-notification', {
          body: { userId, isBanned: newBannedState },
        });
      }
    } catch (notifyError) {
      console.error("Failed to send ban notification email:", notifyError);
    }

    toast({
      title: isBanned ? "User Unbanned" : "User Banned",
      description: `User has been ${isBanned ? 'unbanned' : 'banned'} successfully.`,
    });
    
    queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    queryClient.invalidateQueries({ queryKey: ['banAuditLog'] });
    
    setActionLoading(null);
    setBanDialogOpen(false);
    setSelectedUser(null);
  };

  const handleRoleChange = async (userId: string, currentRole: AppRole, newRole: AppRole) => {
    if (currentRole === newRole) return;
    
    // Prevent self-demotion
    if (userId === currentUser?.id && newRole !== 'admin') {
      toast({
        title: "Cannot Change Own Role",
        description: "You cannot demote yourself from admin",
        variant: "destructive",
      });
      return;
    }

    setActionLoading(userId);

    try {
      // First, delete existing roles for this user
      if (currentRole !== 'user') {
        const { error: deleteError } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId);

        if (deleteError) throw deleteError;
      }

      // Then insert new role if not 'user' (user is the default, no entry needed)
      if (newRole !== 'user') {
        const { error: insertError } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: newRole });

        if (insertError) throw insertError;
      }

      toast({
        title: "Role Updated",
        description: `User role changed to ${newRole}`,
      });
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
    
    setActionLoading(null);
  };

  const handleToggleVerified = async (userId: string, currentlyVerified: boolean) => {
    if (!currentUser) return;
    setActionLoading(userId);

    const updates: any = {
      is_verified: !currentlyVerified,
      verified_by: !currentlyVerified ? currentUser.id : null,
      verified_at: !currentlyVerified ? new Date().toISOString() : null,
    };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', userId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      // Send notification if verifying
      if (!currentlyVerified) {
        await supabase.from('notifications').insert({
          user_id: userId,
          type: 'verified',
          title: 'Account Verified ✓',
          message: 'You have been verified by the admin. Your profile now has a verified badge.',
        });
      }
      toast({
        title: !currentlyVerified ? "User Verified" : "Verification Removed",
        description: !currentlyVerified
          ? "User now has a verified badge."
          : "Verified badge has been removed.",
      });
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    }

    setActionLoading(null);
  };

  const getRoleBadge = (role: AppRole) => {
    switch (role) {
      case 'admin':
        return (
          <Badge className="bg-neon-pink/20 text-neon-pink border-neon-pink/30 font-rajdhani">
            <Crown className="w-3 h-3 mr-1" />
            Admin
          </Badge>
        );
      case 'moderator':
        return (
          <Badge className="bg-neon-cyan/20 text-neon-cyan border-neon-cyan/30 font-rajdhani">
            <Shield className="w-3 h-3 mr-1" />
            Moderator
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="font-rajdhani">
            <User className="w-3 h-3 mr-1" />
            User
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="User Management" description="Loading users...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="User Management" description="Error loading users">
        <div className="text-center text-destructive py-12">
          Failed to load users. Please try again.
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="User Management" description="View and manage all registered users">
      {/* Search and Refresh */}
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
          onClick={handleRefresh}
          disabled={isFetching}
          className="shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          {isFetching ? 'Refreshing...' : 'Refresh'}
        </CyberButton>
      </div>

      {/* Bulk Actions Bar */}
      {selectedUserIds.size > 0 && (
        <div className="mb-4 p-3 rounded-xl bg-primary/10 border border-primary/30 flex flex-wrap items-center gap-3">
          <span className="font-rajdhani font-semibold text-primary">{selectedUserIds.size} selected</span>
          <CyberButton size="sm" variant="destructive" onClick={handleBulkBan} disabled={bulkActionLoading}>
            <Ban className="w-4 h-4" /> Bulk Ban
          </CyberButton>
          <CyberButton size="sm" variant="outline" onClick={() => setBulkRewardOpen(true)} disabled={bulkActionLoading}>
            <IndianRupee className="w-4 h-4" /> Send Reward
          </CyberButton>
          <CyberButton size="sm" variant="outline" onClick={() => setSelectedUserIds(new Set())}>
            Clear
          </CyberButton>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-gradient-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="w-10">
                <Checkbox checked={filteredUsers && selectedUserIds.size === filteredUsers.length && filteredUsers.length > 0} onCheckedChange={toggleSelectAll} />
              </TableHead>
              <TableHead className="text-muted-foreground font-rajdhani">User</TableHead>
              <TableHead className="text-muted-foreground font-rajdhani">Role</TableHead>
              <TableHead className="text-muted-foreground font-rajdhani">Activity</TableHead>
              <TableHead className="text-muted-foreground font-rajdhani">Status</TableHead>
              <TableHead className="text-muted-foreground font-rajdhani text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers?.map((user) => (
                <TableRow key={user.id} className={`border-border ${selectedUserIds.has(user.user_id) ? "bg-primary/5" : ""}`}>
                  <TableCell>
                    <Checkbox checked={selectedUserIds.has(user.user_id)} onCheckedChange={() => toggleUserSelection(user.user_id)} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <span className="font-rajdhani font-medium text-foreground flex items-center gap-1">
                          {user.username ?? 'No username'}
                          {user.is_verified && <VerifiedBadge />}
                        </span>
                        {user.email && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </span>
                        )}
                        <span className="font-mono text-xs text-muted-foreground">
                          {user.user_id.slice(0, 8)}...
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          aria-label="Change role"
                          className="cursor-pointer hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed inline-flex"
                          disabled={actionLoading === user.user_id}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {actionLoading === user.user_id ? (
                            <Badge variant="secondary" className="font-rajdhani">
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              Updating...
                            </Badge>
                          ) : (
                            getRoleBadge(user.role)
                          )}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="bg-card border-border">
                        <DropdownMenuLabel className="text-muted-foreground font-rajdhani">
                          Change Role
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-border" />
                        <DropdownMenuItem
                          onClick={() => handleRoleChange(user.user_id, user.role, 'admin')}
                          disabled={user.role === 'admin' || user.user_id === currentUser?.id}
                          className="cursor-pointer"
                        >
                          <Crown className="w-4 h-4 mr-2 text-neon-pink" />
                          <span>Admin</span>
                          {user.role === 'admin' && <CheckCircle className="w-4 h-4 ml-auto text-neon-green" />}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleRoleChange(user.user_id, user.role, 'moderator')}
                          disabled={user.role === 'moderator'}
                          className="cursor-pointer"
                        >
                          <Shield className="w-4 h-4 mr-2 text-neon-cyan" />
                          <span>Moderator</span>
                          {user.role === 'moderator' && <CheckCircle className="w-4 h-4 ml-auto text-neon-green" />}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleRoleChange(user.user_id, user.role, 'user')}
                          disabled={user.role === 'user' || user.user_id === currentUser?.id}
                          className="cursor-pointer"
                        >
                          <UserCheck className="w-4 h-4 mr-2 text-muted-foreground" />
                          <span>User</span>
                          {user.role === 'user' && <CheckCircle className="w-4 h-4 ml-auto text-neon-green" />}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2">
                          <Circle 
                            className={`w-2.5 h-2.5 ${
                              isUserOnline(user.last_seen) 
                                ? 'fill-neon-green text-neon-green' 
                                : 'fill-muted-foreground/50 text-muted-foreground/50'
                            }`} 
                          />
                          <span className={`font-rajdhani text-sm ${
                            isUserOnline(user.last_seen) ? 'text-neon-green' : 'text-muted-foreground'
                          }`}>
                            {getOnlineStatusText(user.last_seen)}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-rajdhani">
                          {isUserOnline(user.last_seen) ? 'Currently online' : `Last seen: ${user.last_seen ? format(new Date(user.last_seen), 'MMM dd, yyyy HH:mm') : 'Never'}`}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    {user.is_banned ? (
                      <Badge variant="destructive" className="font-rajdhani">
                        Banned
                      </Badge>
                    ) : (
                      <Badge className="bg-neon-green/20 text-neon-green border-neon-green/30 font-rajdhani">
                        Active
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <CyberButton
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleVerified(user.user_id, user.is_verified ?? false)}
                        disabled={actionLoading === user.user_id}
                        className={user.is_verified ? "border-blue-500/30 text-blue-500" : ""}
                      >
                        <BadgeCheck className="w-4 h-4" />
                        {user.is_verified ? "Unverify" : "Verify"}
                      </CyberButton>
                      <CyberButton
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/admin/user-lookup?q=${encodeURIComponent(user.email || user.user_id)}`)}
                      >
                        <ExternalLink className="w-4 h-4" />
                        Lookup
                      </CyberButton>
                      <CyberButton
                        variant="outline"
                        size="sm"
                        onClick={() => openDetailsDialog(user.user_id)}
                      >
                        <Eye className="w-4 h-4" />
                        Details
                      </CyberButton>
                      <CyberButton
                        variant={user.is_banned ? "outline" : "destructive"}
                        size="sm"
                        onClick={() => openBanDialog(user.user_id, user.username ?? 'Unknown', user.is_banned ?? false)}
                        disabled={actionLoading === user.user_id || user.user_id === currentUser?.id}
                      >
                        {actionLoading === user.user_id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : user.is_banned ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Unban
                          </>
                        ) : (
                          <>
                            <Ban className="w-4 h-4" />
                            Ban
                          </>
                        )}
                      </CyberButton>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Ban Reason Dialog */}
      <BanReasonDialog
        open={banDialogOpen}
        onOpenChange={setBanDialogOpen}
        username={selectedUser?.username ?? ''}
        isBanning={!(selectedUser?.isBanned ?? false)}
        isLoading={actionLoading !== null}
        onConfirm={handleBanConfirm}
      />

      {/* User Details Dialog */}
      <UserDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        userId={selectedUserId}
      />

      {/* Bulk Reward Dialog */}
      <Dialog open={bulkRewardOpen} onOpenChange={setBulkRewardOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-orbitron">Send Bulk Reward</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground font-rajdhani">
              Credit ₹ to {selectedUserIds.size} selected user(s).
            </p>
            <div className="grid gap-2">
              <Label>Amount (₹)</Label>
              <Input type="number" min={1} value={bulkRewardAmount} onChange={(e) => setBulkRewardAmount(e.target.value)} placeholder="Enter amount" />
            </div>
          </div>
          <DialogFooter>
            <CyberButton variant="outline" onClick={() => setBulkRewardOpen(false)}>Cancel</CyberButton>
            <CyberButton onClick={handleBulkReward} disabled={bulkActionLoading || !bulkRewardAmount}>
              {bulkActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <IndianRupee className="w-4 h-4" />}
              Send Reward
            </CyberButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
