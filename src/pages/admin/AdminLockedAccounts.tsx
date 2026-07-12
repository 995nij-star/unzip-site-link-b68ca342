import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Lock, Unlock, ShieldAlert, Search, RefreshCw, Clock,
  AlertTriangle, Shield, User, Loader2,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

interface AccountLock {
  id: string;
  email: string;
  is_locked: boolean;
  locked_by: string | null;
  lock_reason: string | null;
  auto_locked: boolean;
  failed_attempts: number;
  locked_at: string;
  unlocked_at: string | null;
  unlocked_by: string | null;
  created_at: string;
  updated_at: string;
}

export default function AdminLockedAccounts() {
  const [locks, setLocks] = useState<AccountLock[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "locked" | "unlocked">("all");
  const { user } = useAuth();
  const { toast } = useToast();

  // Manual lock dialog
  const [showLockDialog, setShowLockDialog] = useState(false);
  const [lockEmail, setLockEmail] = useState("");
  const [lockReason, setLockReason] = useState("");
  const [lockingAction, setLockingAction] = useState(false);

  // Unlock confirm
  const [unlockTarget, setUnlockTarget] = useState<AccountLock | null>(null);

  const fetchLocks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("account_locks")
      .select("*")
      .order("locked_at", { ascending: false });

    if (!error && data) {
      setLocks(data as AccountLock[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLocks();
  }, []);

  const handleUnlock = async (lock: AccountLock) => {
    const { error } = await supabase
      .from("account_locks")
      .update({
        is_locked: false,
        unlocked_at: new Date().toISOString(),
        unlocked_by: user?.id || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", lock.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Account Unlocked", description: `${lock.email} has been unlocked.` });
      fetchLocks();
    }
    setUnlockTarget(null);
  };

  const handleRelock = async (lock: AccountLock) => {
    const { error } = await supabase
      .from("account_locks")
      .update({
        is_locked: true,
        locked_by: user?.id || null,
        auto_locked: false,
        locked_at: new Date().toISOString(),
        unlocked_at: null,
        unlocked_by: null,
        lock_reason: "Re-locked by admin",
        updated_at: new Date().toISOString(),
      })
      .eq("id", lock.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Account Re-locked", description: `${lock.email} has been locked again.` });
      fetchLocks();
    }
  };

  const handleManualLock = async () => {
    if (!lockEmail.trim()) return;
    setLockingAction(true);

    const normalizedEmail = lockEmail.trim().toLowerCase();

    // Check if already exists
    const { data: existing } = await supabase
      .from("account_locks")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    let error;
    if (existing) {
      ({ error } = await supabase
        .from("account_locks")
        .update({
          is_locked: true,
          locked_by: user?.id || null,
          auto_locked: false,
          lock_reason: lockReason || "Manually locked by admin",
          locked_at: new Date().toISOString(),
          unlocked_at: null,
          unlocked_by: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id));
    } else {
      ({ error } = await supabase.from("account_locks").insert({
        email: normalizedEmail,
        is_locked: true,
        locked_by: user?.id || null,
        auto_locked: false,
        lock_reason: lockReason || "Manually locked by admin",
        failed_attempts: 0,
      }));
    }

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Account Locked", description: `${normalizedEmail} has been locked.` });
      setShowLockDialog(false);
      setLockEmail("");
      setLockReason("");
      fetchLocks();
    }
    setLockingAction(false);
  };

  const filtered = locks.filter((l) => {
    const matchesSearch = l.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filter === "all" ? true : filter === "locked" ? l.is_locked : !l.is_locked;
    return matchesSearch && matchesFilter;
  });

  const lockedCount = locks.filter((l) => l.is_locked).length;
  const autoLockedCount = locks.filter((l) => l.is_locked && l.auto_locked).length;
  const manualLockedCount = locks.filter((l) => l.is_locked && !l.auto_locked).length;

  return (
    <AdminLayout title="Locked Accounts" description="Monitor and manage locked user accounts">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-orbitron font-bold text-foreground flex items-center gap-2">
              <ShieldAlert className="w-7 h-7 text-destructive" />
              Locked Accounts
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Monitor and manage accounts locked due to failed login attempts
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchLocks} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setShowLockDialog(true)}>
              <Lock className="w-4 h-4 mr-1" />
              Lock Account
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <Lock className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{lockedCount}</p>
                <p className="text-xs text-muted-foreground">Currently Locked</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-orange-500/30 bg-orange-500/5">
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{autoLockedCount}</p>
                <p className="text-xs text-muted-foreground">Auto-Locked (Brute Force)</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{manualLockedCount}</p>
                <p className="text-xs text-muted-foreground">Manually Locked</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            {(["all", "locked", "unlocked"] as const).map((f) => (
              <Button
                key={f}
                variant={filter === f ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f)}
                className="capitalize"
              >
                {f}
              </Button>
            ))}
          </div>
        </div>

        {/* Accounts List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Shield className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No locked accounts found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((lock) => (
              <Card
                key={lock.id}
                className={`transition-all ${
                  lock.is_locked
                    ? "border-destructive/30 bg-destructive/5"
                    : "border-green-500/30 bg-green-500/5"
                }`}
              >
                <CardContent className="py-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                          lock.is_locked ? "bg-destructive/20" : "bg-green-500/20"
                        }`}
                      >
                        {lock.is_locked ? (
                          <Lock className="w-5 h-5 text-destructive" />
                        ) : (
                          <Unlock className="w-5 h-5 text-green-500" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-mono text-sm text-foreground truncate">
                            {lock.email}
                          </p>
                          <Badge
                            variant={lock.is_locked ? "destructive" : "outline"}
                            className="text-xs"
                          >
                            {lock.is_locked ? "LOCKED" : "UNLOCKED"}
                          </Badge>
                          {lock.auto_locked && lock.is_locked && (
                            <Badge variant="outline" className="text-xs border-orange-500/50 text-orange-500">
                              Auto
                            </Badge>
                          )}
                          {!lock.auto_locked && lock.is_locked && (
                            <Badge variant="outline" className="text-xs border-primary/50 text-primary">
                              Manual
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                          {lock.lock_reason && (
                            <span className="truncate max-w-xs">{lock.lock_reason}</span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(lock.locked_at).toLocaleString()}
                          </span>
                          {lock.failed_attempts > 0 && (
                            <span className="text-destructive">
                              {lock.failed_attempts} failed attempts
                            </span>
                          )}
                        </div>
                        {lock.unlocked_at && (
                          <p className="text-xs text-green-500 mt-1">
                            Unlocked: {new Date(lock.unlocked_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {lock.is_locked ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-green-500/50 text-green-500 hover:bg-green-500/10"
                          onClick={() => setUnlockTarget(lock)}
                        >
                          <Unlock className="w-4 h-4 mr-1" />
                          Unlock
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-destructive/50 text-destructive hover:bg-destructive/10"
                          onClick={() => handleRelock(lock)}
                        >
                          <Lock className="w-4 h-4 mr-1" />
                          Re-lock
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Unlock Confirm Dialog */}
      <Dialog open={!!unlockTarget} onOpenChange={() => setUnlockTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unlock Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to unlock <strong>{unlockTarget?.email}</strong>? They will be
              able to log in again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnlockTarget(null)}>
              Cancel
            </Button>
            <Button onClick={() => unlockTarget && handleUnlock(unlockTarget)}>
              <Unlock className="w-4 h-4 mr-1" />
              Unlock Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Lock Dialog */}
      <Dialog open={showLockDialog} onOpenChange={setShowLockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-destructive" />
              Lock an Account
            </DialogTitle>
            <DialogDescription>
              Manually lock a user account to prevent them from logging in.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground">Email Address</label>
              <Input
                placeholder="user@example.com"
                value={lockEmail}
                onChange={(e) => setLockEmail(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Reason (optional)</label>
              <Textarea
                placeholder="Suspicious activity, policy violation, etc."
                value={lockReason}
                onChange={(e) => setLockReason(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLockDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleManualLock}
              disabled={!lockEmail.trim() || lockingAction}
            >
              {lockingAction ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Lock className="w-4 h-4 mr-1" />
              )}
              Lock Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
