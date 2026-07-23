import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { CyberButton } from "@/components/ui/cyber-button";
import { CyberInput } from "@/components/ui/cyber-input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Gift,
  Plus,
  Loader2,
  Copy,
  Check,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Clock,
  Users,
  IndianRupee,
  History,
  Hash,
  Mail,
  User,
  Search,
  Pencil,
  Smartphone,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface GiftCode {
  id: string;
  code: string;
  amount: number;
  max_uses: number;
  used_count: number;
  expiry: string;
  is_active: boolean;
  created_at: string;
}

interface Redemption {
  id: string;
  user_id: string;
  gift_code_id: string;
  redeemed_at: string;
  gift_code: {
    code: string;
    amount: number;
  } | null;
  profile: {
    username: string | null;
    email: string | null;
    uid: string | null;
    avatar_url: string | null;
  } | null;
}

export default function AdminGiftCodes() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [newCode, setNewCode] = useState("");
  const [amount, setAmount] = useState("");
  const [maxUses, setMaxUses] = useState("1");
  const [expiry, setExpiry] = useState("");
  const [redemptionSearch, setRedemptionSearch] = useState("");
  const [redemptionCodeFilter, setRedemptionCodeFilter] = useState("all");

  // Edit state
  const [editingCard, setEditingCard] = useState<GiftCode | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editMaxUses, setEditMaxUses] = useState("");
  const [editExpiry, setEditExpiry] = useState("");
  const [editCode, setEditCode] = useState("");

  const { data: giftCodes = [], isLoading } = useQuery({
    queryKey: ["admin-gift-codes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gift_codes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as GiftCode[];
    },
  });

  const { data: redemptions = [], isLoading: redemptionsLoading } = useQuery({
    queryKey: ["admin-gift-code-redemptions"],
    queryFn: async () => {
      const { data: redemptionData, error: redemptionError } = await supabase
        .from("gift_code_redemptions")
        .select("*")
        .order("redeemed_at", { ascending: false })
        .limit(100);

      if (redemptionError) throw redemptionError;
      if (!redemptionData || redemptionData.length === 0) return [];

      const userIds = [...new Set(redemptionData.map((r: any) => r.user_id))];
      const codeIds = [...new Set(redemptionData.map((r: any) => r.gift_code_id))];

      const [profilesRes, codesRes] = await Promise.all([
        supabase.from("profiles").select("user_id, username, email, uid, avatar_url").in("user_id", userIds),
        supabase.from("gift_codes").select("id, code, amount").in("id", codeIds),
      ]);

      const profilesMap = new Map((profilesRes.data || []).map((p: any) => [p.user_id, p]));
      const codesMap = new Map((codesRes.data || []).map((c: any) => [c.id, c]));

      return redemptionData.map((r: any) => ({
        ...r,
        profile: profilesMap.get(r.user_id) || null,
        gift_code: codesMap.get(r.gift_code_id) || null,
      })) as Redemption[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("gift_codes").insert({
        code: newCode.toUpperCase().trim(),
        amount: parseFloat(amount),
        max_uses: parseInt(maxUses),
        expiry: new Date(expiry).toISOString(),
        created_by: (await supabase.auth.getUser()).data.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-gift-codes"] });
      toast({ title: "Gift card created!", description: `Code: ${newCode.toUpperCase()}` });
      setIsCreateOpen(false);
      setNewCode("");
      setAmount("");
      setMaxUses("1");
      setExpiry("");
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingCard) return;
      const updates: any = {};
      if (editCode && editCode !== editingCard.code) updates.code = editCode.toUpperCase().trim();
      if (editAmount && parseFloat(editAmount) !== editingCard.amount) updates.amount = parseFloat(editAmount);
      if (editMaxUses && parseInt(editMaxUses) !== editingCard.max_uses) updates.max_uses = parseInt(editMaxUses);
      if (editExpiry) updates.expiry = new Date(editExpiry).toISOString();

      if (Object.keys(updates).length === 0) return;

      const { error } = await supabase
        .from("gift_codes")
        .update(updates)
        .eq("id", editingCard.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-gift-codes"] });
      toast({ title: "Gift card updated!" });
      setEditingCard(null);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("gift_codes")
        .update({ is_active: !is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-gift-codes"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("gift_codes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-gift-codes"] });
      queryClient.invalidateQueries({ queryKey: ["admin-gift-code-redemptions"] });
      toast({ title: "Gift card deleted" });
    },
  });

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const generateRandomCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "XT-";
    for (let i = 0; i < 8; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    setNewCode(result);
  };

  const openEditDialog = (gc: GiftCode) => {
    setEditingCard(gc);
    setEditCode(gc.code);
    setEditAmount(String(gc.amount));
    setEditMaxUses(String(gc.max_uses));
    setEditExpiry(format(new Date(gc.expiry), "yyyy-MM-dd'T'HH:mm"));
  };

  const isExpired = (expiry: string) => new Date(expiry) < new Date();

  const uniqueCodes = [...new Set(redemptions.map(r => r.gift_code?.code).filter(Boolean))];

  const filteredRedemptions = redemptions.filter((r) => {
    const searchLower = redemptionSearch.toLowerCase();
    const matchesSearch = !redemptionSearch ||
      r.profile?.username?.toLowerCase().includes(searchLower) ||
      r.profile?.email?.toLowerCase().includes(searchLower) ||
      r.profile?.uid?.toLowerCase().includes(searchLower) ||
      r.gift_code?.code?.toLowerCase().includes(searchLower);
    const matchesCode = redemptionCodeFilter === "all" || r.gift_code?.code === redemptionCodeFilter;
    return matchesSearch && matchesCode;
  });

  return (
    <AdminLayout title="Play Store Gift Cards" description="Create, edit, and manage Play Store gift cards">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-end">
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <CyberButton className="golden-button">
                <Plus className="w-4 h-4 mr-2" />
                Create Gift Card
              </CyberButton>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="font-orbitron">Create Play Store Gift Card</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createMutation.mutate();
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-rajdhani text-muted-foreground mb-1">Code</label>
                  <div className="flex gap-2">
                    <CyberInput
                      value={newCode}
                      onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                      placeholder="e.g. XT-WELCOME"
                      className="flex-1 uppercase font-mono"
                      required
                    />
                    <CyberButton type="button" variant="outline" size="sm" onClick={generateRandomCode}>
                      Generate
                    </CyberButton>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-rajdhani text-muted-foreground mb-1">Amount (₹)</label>
                  <CyberInput
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="50"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-rajdhani text-muted-foreground mb-1">Max Uses</label>
                  <CyberInput
                    type="number"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    placeholder="1"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-rajdhani text-muted-foreground mb-1">Expiry Date</label>
                  <CyberInput
                    type="datetime-local"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    required
                  />
                </div>
                <CyberButton
                  type="submit"
                  className="w-full golden-button"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Smartphone className="w-4 h-4 mr-2" />
                  )}
                  Create Gift Card
                </CyberButton>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="premium-card p-4 rounded-xl">
            <Smartphone className="w-5 h-5 text-neon-gold mb-2" />
            <p className="text-2xl font-orbitron font-bold text-foreground">{giftCodes.length}</p>
            <p className="text-xs text-muted-foreground font-rajdhani">Total Cards</p>
          </div>
          <div className="premium-card p-4 rounded-xl">
            <Users className="w-5 h-5 text-neon-cyan mb-2" />
            <p className="text-2xl font-orbitron font-bold text-foreground">
              {giftCodes.reduce((sum, g) => sum + g.used_count, 0)}
            </p>
            <p className="text-xs text-muted-foreground font-rajdhani">Total Redemptions</p>
          </div>
          <div className="premium-card p-4 rounded-xl">
            <IndianRupee className="w-5 h-5 text-neon-green mb-2" />
            <p className="text-2xl font-orbitron font-bold text-foreground">
              ₹{giftCodes.reduce((sum, g) => sum + g.amount * g.used_count, 0).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground font-rajdhani">Total Given Away</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="codes" className="space-y-4">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="codes" className="font-rajdhani data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <Smartphone className="w-4 h-4 mr-2" />
              Gift Cards
            </TabsTrigger>
            <TabsTrigger value="redemptions" className="font-rajdhani data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <History className="w-4 h-4 mr-2" />
              Redemption History
            </TabsTrigger>
          </TabsList>

          {/* Gift Cards Tab */}
          <TabsContent value="codes">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-neon-gold" />
              </div>
            ) : giftCodes.length === 0 ? (
              <div className="text-center py-12 premium-card rounded-xl">
                <Smartphone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground font-rajdhani">No gift cards created yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {giftCodes.map((gc) => (
                  <div
                    key={gc.id}
                    className={`premium-card p-4 rounded-xl flex items-center justify-between ${
                      !gc.is_active || isExpired(gc.expiry) ? "opacity-60" : ""
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-neon-gold/10">
                        <Smartphone className="w-5 h-5 text-neon-gold" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-foreground tracking-wider">
                            {gc.code}
                          </span>
                          <button onClick={() => handleCopy(gc.code)} className="text-muted-foreground hover:text-foreground">
                            {copiedCode === gc.code ? (
                              <Check className="w-3.5 h-3.5 text-neon-green" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground font-rajdhani mt-1">
                          <span className="flex items-center gap-1">
                            <IndianRupee className="w-3 h-3" />₹{gc.amount}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {gc.used_count}/{gc.max_uses} used
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(gc.expiry), "MMM dd, yyyy")}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isExpired(gc.expiry) ? (
                        <Badge className="bg-destructive/20 text-destructive border-destructive/30">Expired</Badge>
                      ) : gc.is_active ? (
                        <Badge className="bg-neon-green/20 text-neon-green border-neon-green/30">Active</Badge>
                      ) : (
                        <Badge className="bg-muted text-muted-foreground border-border">Inactive</Badge>
                      )}
                      <CyberButton
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(gc)}
                        title="Edit gift card"
                      >
                        <Pencil className="w-4 h-4 text-neon-cyan" />
                      </CyberButton>
                      <CyberButton
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleMutation.mutate({ id: gc.id, is_active: gc.is_active })}
                      >
                        {gc.is_active ? (
                          <ToggleRight className="w-5 h-5 text-neon-green" />
                        ) : (
                          <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                        )}
                      </CyberButton>
                      <CyberButton
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("Delete this gift card?")) deleteMutation.mutate(gc.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </CyberButton>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Redemption History Tab */}
          <TabsContent value="redemptions" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <CyberInput
                  value={redemptionSearch}
                  onChange={(e) => setRedemptionSearch(e.target.value)}
                  placeholder="Search by username, email, UID, or code..."
                  className="pl-9"
                />
              </div>
              <Select value={redemptionCodeFilter} onValueChange={setRedemptionCodeFilter}>
                <SelectTrigger className="w-full sm:w-[200px] bg-card border-border font-rajdhani">
                  <SelectValue placeholder="Filter by code" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cards</SelectItem>
                  {uniqueCodes.map((code) => (
                    <SelectItem key={code} value={code!}>{code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {redemptionsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-neon-gold" />
              </div>
            ) : filteredRedemptions.length === 0 ? (
              <div className="text-center py-12 premium-card rounded-xl">
                <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground font-rajdhani">
                  {redemptions.length === 0 ? "No redemptions yet" : "No redemptions match your search"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRedemptions.map((r) => (
                  <div
                    key={r.id}
                    className="premium-card p-4 rounded-xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center overflow-hidden">
                        {r.profile?.avatar_url ? (
                          <img src={r.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-rajdhani font-semibold text-foreground">
                            {r.profile?.username || "Unknown User"}
                          </span>
                          {r.profile?.uid && (
                            <span className="flex items-center gap-0.5 text-xs text-muted-foreground font-mono">
                              <Hash className="w-3 h-3" />
                              {r.profile.uid}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground font-rajdhani mt-0.5">
                          {r.profile?.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {r.profile.email}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(r.redeemed_at), "MMM dd, yyyy HH:mm")}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      {r.gift_code && (
                        <>
                          <span className="font-mono font-bold text-neon-gold text-sm tracking-wider">
                            {r.gift_code.code}
                          </span>
                          <p className="text-sm font-orbitron font-bold text-neon-green">
                            +₹{r.gift_code.amount}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Gift Card Dialog */}
      <Dialog open={!!editingCard} onOpenChange={() => setEditingCard(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-orbitron">Edit Gift Card</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateMutation.mutate();
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-rajdhani text-muted-foreground mb-1">Code</label>
              <CyberInput
                value={editCode}
                onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                className="uppercase font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-rajdhani text-muted-foreground mb-1">Amount (₹)</label>
              <CyberInput
                type="number"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                min="1"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-rajdhani text-muted-foreground mb-1">Max Uses</label>
              <CyberInput
                type="number"
                value={editMaxUses}
                onChange={(e) => setEditMaxUses(e.target.value)}
                min="1"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-rajdhani text-muted-foreground mb-1">Expiry Date</label>
              <CyberInput
                type="datetime-local"
                value={editExpiry}
                onChange={(e) => setEditExpiry(e.target.value)}
                required
              />
            </div>
            <div className="flex gap-3">
              <CyberButton
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setEditingCard(null)}
              >
                Cancel
              </CyberButton>
              <CyberButton
                type="submit"
                className="flex-1 golden-button"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </CyberButton>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
