import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { CyberInput } from "@/components/ui/cyber-input";
import { CyberButton } from "@/components/ui/cyber-button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Search, Loader2, User, Trophy, Wallet, Calendar, Hash, Gamepad2,
  Mail, Circle, Phone, MapPin, Shield, Ban, CheckCircle, XCircle,
  BadgeCheck, ArrowDownLeft, ArrowUpRight, Monitor, Globe, Clock,
  AlertTriangle, IndianRupee, Eye, KeyRound,
} from "lucide-react";
import { isUserOnline, getOnlineStatusText } from "@/hooks/usePresence";

interface FullUserData {
  profile: any;
  wallet: any;
  transactions: any[];
  tournaments: any[];
  wins: number;
  loginHistory: any[];
  reports: any[];
  suspiciousActivities: any[];
  role: string;
  totalDeposits: number;
  totalWithdrawals: number;
}

export default function AdminUserLookup() {
  const [searchParams] = useSearchParams();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState<FullUserData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

  // Admin action states
  const [actionLoading, setActionLoading] = useState(false);
  const [balanceDialogOpen, setBalanceDialogOpen] = useState(false);
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceType, setBalanceType] = useState<"credit" | "debit">("credit");
  const [balanceNote, setBalanceNote] = useState("");
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  // Auto-search from URL query param
  useEffect(() => {
    const q = searchParams.get("q");
    if (q && !initialLoaded) {
      setSearchQuery(q);
      setInitialLoaded(true);
      // Trigger search after state update
      setTimeout(() => {
        const searchBtn = document.getElementById("lookup-search-btn");
        searchBtn?.click();
      }, 100);
    }
  }, [searchParams, initialLoaded]);

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;

    setLoading(true);
    setNotFound(false);
    setUserData(null);

    // Search by email, username, uid, or user_id
    let profile: any = null;

    // Try email
    let { data } = await supabase.from("profiles").select("*").eq("email", q).maybeSingle();
    if (data) profile = data;

    // Try username
    if (!profile) {
      const res = await supabase.from("profiles").select("*").ilike("username", q).maybeSingle();
      if (res.data) profile = res.data;
    }

    // Try UID (10-digit)
    if (!profile) {
      const res = await supabase.from("profiles").select("*").eq("uid", q).maybeSingle();
      if (res.data) profile = res.data;
    }

    // Try user_id (UUID)
    if (!profile && q.includes("-")) {
      const res = await supabase.from("profiles").select("*").eq("user_id", q).maybeSingle();
      if (res.data) profile = res.data;
    }

    if (!profile) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const userId = profile.user_id;

    // Fetch all data in parallel
    const [walletRes, transactionsRes, tournamentsRes, loginHistoryRes, reportsRes, suspiciousRes, roleRes] =
      await Promise.all([
        supabase.from("wallets").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("wallet_transactions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
        supabase.from("tournament_participants").select("*, tournaments(id, title, game, entry_fee, prize_pool, status, start_time)").eq("user_id", userId).order("joined_at", { ascending: false }),
        supabase.from("login_history").select("*").eq("user_id", userId).order("logged_in_at", { ascending: false }).limit(20),
        Promise.resolve({ data: [] as any[] }),
        supabase.from("suspicious_activities").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
      ]);

    const transactions = transactionsRes.data || [];
    const totalDeposits = transactions.filter(t => t.type === "deposit" || t.type === "gift_code" || t.type === "admin_credit" || t.type === "prize").reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
    const totalWithdrawals = transactions.filter(t => t.type === "withdrawal" || t.type === "entry_fee" || t.type === "admin_debit").reduce((s, t) => s + Math.abs(Number(t.amount)), 0);

    const tournaments = tournamentsRes.data || [];
    const wins = tournaments.filter((t: any) => t.is_winner).length;

    setUserData({
      profile,
      wallet: walletRes.data,
      transactions,
      tournaments,
      wins,
      loginHistory: loginHistoryRes.data || [],
      reports: reportsRes.data || [],
      suspiciousActivities: suspiciousRes.data || [],
      role: roleRes.data?.role || "user",
      totalDeposits,
      totalWithdrawals,
    });

    setLoading(false);
  };

  const handleBanToggle = async () => {
    if (!userData || !currentUser) return;
    setActionLoading(true);

    const newBannedState = !userData.profile.is_banned;
    const { error } = await supabase.from("profiles").update({ is_banned: newBannedState }).eq("user_id", userData.profile.user_id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      await supabase.from("ban_audit_log").insert({
        user_id: userData.profile.user_id,
        admin_id: currentUser.id,
        action: newBannedState ? "ban" : "unban",
        reason: "Admin lookup action",
      });

      setUserData({ ...userData, profile: { ...userData.profile, is_banned: newBannedState } });
      toast({ title: newBannedState ? "User Banned" : "User Unbanned" });
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
    }
    setActionLoading(false);
  };

  const handleVerifyToggle = async () => {
    if (!userData || !currentUser) return;
    setActionLoading(true);

    const newVerified = !userData.profile.is_verified;
    const { error } = await supabase.from("profiles").update({
      is_verified: newVerified,
      verified_by: newVerified ? currentUser.id : null,
      verified_at: newVerified ? new Date().toISOString() : null,
    }).eq("user_id", userData.profile.user_id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      if (newVerified) {
        await supabase.from("notifications").insert({
          user_id: userData.profile.user_id,
          type: "verified",
          title: "Account Verified ✓",
          message: "You have been verified by the admin. Your profile now has a verified badge.",
        });
      }
      setUserData({ ...userData, profile: { ...userData.profile, is_verified: newVerified } });
      toast({ title: newVerified ? "User Verified" : "Verification Removed" });
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
    }
    setActionLoading(false);
  };

  const handleBalanceAdjust = async () => {
    if (!userData || !currentUser) return;
    const amount = parseFloat(balanceAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }

    setActionLoading(true);
    const signedAmount = balanceType === "credit" ? amount : -amount;

    const { error: txError } = await supabase.from("wallet_transactions").insert({
      user_id: userData.profile.user_id,
      amount: signedAmount,
      type: balanceType === "credit" ? "admin_credit" : "admin_debit",
      description: balanceNote.trim() || `Admin ${balanceType}`,
    });

    if (!txError) {
      await supabase.from("wallets").update({
        balance: (userData.wallet?.balance || 0) + signedAmount,
        updated_at: new Date().toISOString(),
      }).eq("user_id", userData.profile.user_id);

      await supabase.from("notifications").insert({
        user_id: userData.profile.user_id,
        type: "wallet",
        title: balanceType === "credit" ? "Wallet Credited" : "Wallet Debited",
        message: `₹${amount} has been ${balanceType === "credit" ? "added to" : "deducted from"} your wallet by admin.`,
      });

      setUserData({
        ...userData,
        wallet: { ...userData.wallet, balance: (userData.wallet?.balance || 0) + signedAmount },
      });
      toast({ title: "Balance Updated", description: `₹${amount} ${balanceType}ed successfully.` });
    } else {
      toast({ title: "Error", description: txError.message, variant: "destructive" });
    }

    setBalanceDialogOpen(false);
    setBalanceAmount("");
    setBalanceNote("");
    setActionLoading(false);
  };

  const handlePasswordReset = async () => {
    if (!userData || !currentUser || !newPassword.trim()) return;
    if (newPassword.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setActionLoading(true);

    const { data, error } = await supabase.functions.invoke("admin-reset-password", {
      body: { user_id: userData.profile.user_id, new_password: newPassword },
    });

    if (error || data?.error) {
      toast({ title: "Error", description: data?.error || error?.message, variant: "destructive" });
    } else {
      await supabase.from("notifications").insert({
        user_id: userData.profile.user_id,
        type: "security",
        title: "Password Reset",
        message: "Your password has been reset by an administrator. Please log in with your new password.",
      });
      toast({ title: "Password Reset", description: "Password has been reset successfully." });
    }

    setResetPasswordOpen(false);
    setNewPassword("");
    setActionLoading(false);
  };

  const getTransactionIcon = (type: string) => {
    if (["deposit", "gift_code", "admin_credit", "prize", "refund"].includes(type)) {
      return <ArrowDownLeft className="w-4 h-4 text-neon-green" />;
    }
    return <ArrowUpRight className="w-4 h-4 text-destructive" />;
  };

  return (
    <AdminLayout title="User Lookup" description="Search and view comprehensive user data">
      {/* Search */}
      <div className="mb-6 flex gap-3">
        <CyberInput
          placeholder="Search by email, username, UID, or user ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          icon={<Search className="w-5 h-5" />}
          className="flex-1 max-w-lg"
        />
        <CyberButton id="lookup-search-btn" onClick={handleSearch} disabled={loading || !searchQuery.trim()}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Search
        </CyberButton>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {notFound && (
        <div className="text-center py-16 text-muted-foreground font-rajdhani">
          <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg">No user found matching "{searchQuery}"</p>
          <p className="text-sm">Try searching by email, username, 10-digit UID, or full user ID</p>
        </div>
      )}

      {userData && (
        <div className="space-y-6">
          {/* Profile Card */}
          <div className="bg-gradient-card rounded-xl border border-border p-6">
            <div className="flex flex-col sm:flex-row gap-5">
              <Avatar className="w-20 h-20 border-2 border-primary/30 shrink-0">
                <AvatarImage src={userData.profile.avatar_url ?? undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                  {userData.profile.username?.[0]?.toUpperCase() ?? <User className="w-8 h-8" />}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-orbitron font-bold text-foreground">
                    {userData.profile.full_name || userData.profile.username || "No username"}
                  </h2>
                  {userData.profile.is_verified && <VerifiedBadge size="md" />}
                  {userData.profile.is_banned && <Badge variant="destructive" className="font-rajdhani">Banned</Badge>}
                  {userData.role !== "user" && (
                    <Badge className={`font-rajdhani ${userData.role === "admin" ? "bg-neon-pink/20 text-neon-pink border-neon-pink/30" : "bg-neon-cyan/20 text-neon-cyan border-neon-cyan/30"}`}>
                      {userData.role === "admin" ? <Shield className="w-3 h-3 mr-1" /> : <Shield className="w-3 h-3 mr-1" />}
                      {userData.role}
                    </Badge>
                  )}
                </div>

                {userData.profile.username && userData.profile.full_name && (
                  <p className="text-sm text-muted-foreground font-rajdhani">@{userData.profile.username}</p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm font-rajdhani">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Hash className="w-4 h-4 text-primary" />
                    <span className="font-mono text-primary font-semibold">{userData.profile.uid || "No UID"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4 text-neon-cyan" />
                    {userData.profile.email || "No email"}
                  </div>
                  {userData.profile.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-4 h-4 text-neon-green" />
                      {userData.profile.phone}
                    </div>
                  )}
                  {userData.profile.city && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4 text-neon-pink" />
                      {userData.profile.city}{userData.profile.country ? `, ${userData.profile.country}` : ""}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4 text-neon-orange" />
                    Joined {userData.profile.created_at ? format(new Date(userData.profile.created_at), "MMM d, yyyy") : "N/A"}
                  </div>
                  <div className="flex items-center gap-2">
                    <Circle className={`w-2.5 h-2.5 ${isUserOnline(userData.profile.last_seen) ? "fill-neon-green text-neon-green" : "fill-muted-foreground/50 text-muted-foreground/50"}`} />
                    <span className={`${isUserOnline(userData.profile.last_seen) ? "text-neon-green" : "text-muted-foreground"}`}>
                      {getOnlineStatusText(userData.profile.last_seen)}
                    </span>
                  </div>
                  {userData.profile.free_fire_uid && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Gamepad2 className="w-4 h-4 text-neon-orange" />
                      FF UID: <span className="text-neon-orange font-semibold">{userData.profile.free_fire_uid}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground font-mono text-xs">
                    UUID: {userData.profile.user_id}
                  </div>
                </div>
              </div>
            </div>

            {/* Admin Controls */}
            <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-border">
              <CyberButton
                variant={userData.profile.is_banned ? "outline" : "destructive"}
                size="sm"
                onClick={handleBanToggle}
                disabled={actionLoading || userData.profile.user_id === currentUser?.id}
              >
                {userData.profile.is_banned ? <><CheckCircle className="w-4 h-4" /> Unban</> : <><Ban className="w-4 h-4" /> Ban</>}
              </CyberButton>
              <CyberButton
                variant="outline"
                size="sm"
                onClick={handleVerifyToggle}
                disabled={actionLoading}
                className={userData.profile.is_verified ? "border-blue-500/30 text-blue-500" : ""}
              >
                <BadgeCheck className="w-4 h-4" />
                {userData.profile.is_verified ? "Remove Verified" : "Verify User"}
              </CyberButton>
              <CyberButton
                variant="outline"
                size="sm"
                onClick={() => setBalanceDialogOpen(true)}
              >
                <IndianRupee className="w-4 h-4" />
                Adjust Balance
              </CyberButton>
              <CyberButton
                variant="outline"
                size="sm"
                onClick={() => setResetPasswordOpen(true)}
                disabled={actionLoading || userData.profile.user_id === currentUser?.id}
              >
                <KeyRound className="w-4 h-4" />
                Reset Password
              </CyberButton>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-neon-green/10 border border-neon-green/30 text-center">
              <Wallet className="w-5 h-5 text-neon-green mx-auto mb-1" />
              <p className="text-xl font-orbitron font-bold text-foreground">₹{userData.wallet?.balance?.toFixed(2) || "0.00"}</p>
              <p className="text-xs text-muted-foreground font-rajdhani">Balance</p>
            </div>
            <div className="p-4 rounded-xl bg-neon-cyan/10 border border-neon-cyan/30 text-center">
              <ArrowDownLeft className="w-5 h-5 text-neon-cyan mx-auto mb-1" />
              <p className="text-xl font-orbitron font-bold text-foreground">₹{userData.totalDeposits.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground font-rajdhani">Total In</p>
            </div>
            <div className="p-4 rounded-xl bg-neon-orange/10 border border-neon-orange/30 text-center">
              <ArrowUpRight className="w-5 h-5 text-neon-orange mx-auto mb-1" />
              <p className="text-xl font-orbitron font-bold text-foreground">₹{userData.totalWithdrawals.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground font-rajdhani">Total Out</p>
            </div>
            <div className="p-4 rounded-xl bg-neon-pink/10 border border-neon-pink/30 text-center">
              <Trophy className="w-5 h-5 text-neon-pink mx-auto mb-1" />
              <p className="text-xl font-orbitron font-bold text-foreground">{userData.tournaments.length} / {userData.wins}</p>
              <p className="text-xs text-muted-foreground font-rajdhani">Played / Won</p>
            </div>
          </div>

          {/* Tabbed Content */}
          <Tabs defaultValue="wallet" className="w-full">
            <TabsList className="w-full grid grid-cols-4 bg-background/50 border border-border">
              <TabsTrigger value="wallet" className="font-rajdhani text-xs sm:text-sm gap-1.5 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
                <Wallet className="w-3.5 h-3.5" /> Wallet
              </TabsTrigger>
              <TabsTrigger value="tournaments" className="font-rajdhani text-xs sm:text-sm gap-1.5 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
                <Trophy className="w-3.5 h-3.5" /> Tournaments
              </TabsTrigger>
              <TabsTrigger value="security" className="font-rajdhani text-xs sm:text-sm gap-1.5 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
                <Shield className="w-3.5 h-3.5" /> Security
              </TabsTrigger>
              <TabsTrigger value="reports" className="font-rajdhani text-xs sm:text-sm gap-1.5 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
                <AlertTriangle className="w-3.5 h-3.5" /> Reports
              </TabsTrigger>
            </TabsList>

            {/* Wallet Tab */}
            <TabsContent value="wallet" className="mt-4">
              <div className="bg-gradient-card rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground font-rajdhani">Type</TableHead>
                      <TableHead className="text-muted-foreground font-rajdhani">Amount</TableHead>
                      <TableHead className="text-muted-foreground font-rajdhani">Description</TableHead>
                      <TableHead className="text-muted-foreground font-rajdhani">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userData.transactions.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No transactions</TableCell></TableRow>
                    ) : userData.transactions.map((tx) => (
                      <TableRow key={tx.id} className="border-border">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTransactionIcon(tx.type)}
                            <span className="font-rajdhani capitalize text-sm">{tx.type.replace("_", " ")}</span>
                          </div>
                        </TableCell>
                        <TableCell className={`font-orbitron text-sm ${Number(tx.amount) >= 0 ? "text-neon-green" : "text-destructive"}`}>
                          {Number(tx.amount) >= 0 ? "+" : ""}₹{Math.abs(Number(tx.amount)).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm font-rajdhani">{tx.description || "-"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm font-rajdhani">{format(new Date(tx.created_at), "MMM d, HH:mm")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Tournaments Tab */}
            <TabsContent value="tournaments" className="mt-4">
              <div className="bg-gradient-card rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground font-rajdhani">Tournament</TableHead>
                      <TableHead className="text-muted-foreground font-rajdhani">Entry Fee</TableHead>
                      <TableHead className="text-muted-foreground font-rajdhani">Status</TableHead>
                      <TableHead className="text-muted-foreground font-rajdhani">Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userData.tournaments.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No tournaments</TableCell></TableRow>
                    ) : userData.tournaments.map((tp: any) => (
                      <TableRow key={tp.id} className="border-border">
                        <TableCell>
                          <div>
                            <span className="font-rajdhani font-medium text-foreground">{tp.tournaments?.title || "Unknown"}</span>
                            <span className="block text-xs text-muted-foreground">{tp.tournaments?.game}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-rajdhani text-neon-orange">₹{tp.tournaments?.entry_fee || 0}</TableCell>
                        <TableCell>
                          {tp.is_winner ? (
                            <Badge className="bg-neon-gold/20 text-neon-gold border-neon-gold/30 font-rajdhani">Winner</Badge>
                          ) : (
                            <Badge variant="secondary" className="font-rajdhani capitalize">{tp.tournaments?.status || "unknown"}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm font-rajdhani">{format(new Date(tp.joined_at), "MMM d, yyyy")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="mt-4 space-y-4">
              <h3 className="text-sm font-rajdhani font-semibold text-muted-foreground flex items-center gap-2">
                <Monitor className="w-4 h-4" /> Login History ({userData.loginHistory.length})
              </h3>
              <div className="bg-gradient-card rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground font-rajdhani">Device</TableHead>
                      <TableHead className="text-muted-foreground font-rajdhani">IP</TableHead>
                      <TableHead className="text-muted-foreground font-rajdhani">Location</TableHead>
                      <TableHead className="text-muted-foreground font-rajdhani">Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userData.loginHistory.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No login history</TableCell></TableRow>
                    ) : userData.loginHistory.map((lh: any) => (
                      <TableRow key={lh.id} className="border-border">
                        <TableCell>
                          <div className="text-sm font-rajdhani">
                            <span className="text-foreground">{lh.browser || "Unknown"}</span>
                            <span className="block text-xs text-muted-foreground">{lh.os || "Unknown OS"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{lh.ip_address || "-"}</TableCell>
                        <TableCell className="text-sm font-rajdhani text-muted-foreground">
                          {[lh.city, lh.country].filter(Boolean).join(", ") || "-"}
                        </TableCell>
                        <TableCell className="text-sm font-rajdhani text-muted-foreground">{format(new Date(lh.logged_in_at), "MMM d, HH:mm")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {userData.suspiciousActivities.length > 0 && (
                <>
                  <h3 className="text-sm font-rajdhani font-semibold text-destructive flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Suspicious Activities ({userData.suspiciousActivities.length})
                  </h3>
                  <div className="space-y-2">
                    {userData.suspiciousActivities.map((sa: any) => (
                      <div key={sa.id} className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm font-rajdhani">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-medium text-foreground capitalize">{sa.activity_type}</span>
                            <p className="text-muted-foreground text-xs mt-1">{sa.description || "No details"}</p>
                          </div>
                          <Badge variant={sa.severity === "high" ? "destructive" : "secondary"} className="font-rajdhani capitalize">{sa.severity}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{format(new Date(sa.created_at), "MMM d, yyyy HH:mm")}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </TabsContent>

            {/* Reports Tab */}
            <TabsContent value="reports" className="mt-4">
              <div className="bg-gradient-card rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground font-rajdhani">Type</TableHead>
                      <TableHead className="text-muted-foreground font-rajdhani">Reason</TableHead>
                      <TableHead className="text-muted-foreground font-rajdhani">Status</TableHead>
                      <TableHead className="text-muted-foreground font-rajdhani">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userData.reports.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No reports against this user</TableCell></TableRow>
                    ) : userData.reports.map((r: any) => (
                      <TableRow key={r.id} className="border-border">
                        <TableCell className="font-rajdhani capitalize text-sm">{r.report_type}</TableCell>
                        <TableCell className="text-sm font-rajdhani text-muted-foreground">{r.reason || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={r.status === "resolved" ? "default" : "secondary"} className="font-rajdhani capitalize">{r.status}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm font-rajdhani">{format(new Date(r.created_at), "MMM d, yyyy")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Balance Adjustment Dialog */}
      <Dialog open={balanceDialogOpen} onOpenChange={setBalanceDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-orbitron">Adjust Wallet Balance</DialogTitle>
            <DialogDescription className="font-rajdhani">
              {userData?.profile?.username}'s current balance: ₹{userData?.wallet?.balance?.toFixed(2) || "0.00"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <CyberButton
                variant={balanceType === "credit" ? "default" : "outline"}
                onClick={() => setBalanceType("credit")}
                className="w-full"
              >
                <ArrowDownLeft className="w-4 h-4" /> Credit
              </CyberButton>
              <CyberButton
                variant={balanceType === "debit" ? "destructive" : "outline"}
                onClick={() => setBalanceType("debit")}
                className="w-full"
              >
                <ArrowUpRight className="w-4 h-4" /> Debit
              </CyberButton>
            </div>
            <CyberInput
              type="number"
              placeholder="Amount (₹)"
              value={balanceAmount}
              onChange={(e) => setBalanceAmount(e.target.value)}
              icon={<IndianRupee className="w-4 h-4" />}
            />
            <Textarea
              placeholder="Note (optional)..."
              value={balanceNote}
              onChange={(e) => setBalanceNote(e.target.value)}
              className="bg-background/50 border-border font-rajdhani"
              maxLength={200}
            />
          </div>
          <DialogFooter>
            <CyberButton variant="outline" onClick={() => setBalanceDialogOpen(false)}>Cancel</CyberButton>
            <CyberButton onClick={handleBalanceAdjust} disabled={actionLoading || !balanceAmount}>
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Confirm
            </CyberButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog open={resetPasswordOpen} onOpenChange={setResetPasswordOpen}>
        <DialogContent className="bg-card border-border font-rajdhani">
          <DialogHeader>
            <DialogTitle className="font-orbitron">Reset User Password</DialogTitle>
            <DialogDescription>
              Set a new password for <span className="text-primary font-semibold">{userData?.profile?.username || userData?.profile?.email}</span>. The user will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <CyberInput
              type="password"
              placeholder="New password (min 6 characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              icon={<KeyRound className="w-4 h-4" />}
            />
          </div>
          <DialogFooter>
            <CyberButton variant="outline" onClick={() => { setResetPasswordOpen(false); setNewPassword(""); }}>Cancel</CyberButton>
            <CyberButton onClick={handlePasswordReset} disabled={actionLoading || newPassword.length < 6}>
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              Reset Password
            </CyberButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
