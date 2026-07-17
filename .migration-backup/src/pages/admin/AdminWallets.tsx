import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminWallets, useAdminTransactions } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Loader2, Search, Wallet, Plus, Minus, User } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function AdminWallets() {
  const { data: wallets, isLoading: walletsLoading } = useAdminWallets();
  const { data: transactions, isLoading: transactionsLoading } = useAdminTransactions();
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<any>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustLoading, setAdjustLoading] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const filteredWallets = wallets?.filter(w => 
    w.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.user_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTransactions = transactions?.filter(t =>
    t.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openAdjustDialog = (wallet: any) => {
    setSelectedWallet(wallet);
    setAdjustAmount("");
    setAdjustReason("");
    setIsAdjustDialogOpen(true);
  };

  const handleAdjustBalance = async (type: 'add' | 'deduct') => {
    const amount = parseFloat(adjustAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid positive amount",
        variant: "destructive",
      });
      return;
    }

    if (!adjustReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for this adjustment",
        variant: "destructive",
      });
      return;
    }

    setAdjustLoading(true);

    const finalAmount = type === 'add' ? amount : -amount;
    const newBalance = Number(selectedWallet.balance) + finalAmount;

    if (newBalance < 0) {
      toast({
        title: "Insufficient Balance",
        description: "Cannot deduct more than the current balance",
        variant: "destructive",
      });
      setAdjustLoading(false);
      return;
    }

    // Update wallet balance
    const { error: walletError } = await supabase
      .from('wallets')
      .update({ balance: newBalance })
      .eq('id', selectedWallet.id);

    if (walletError) {
      toast({
        title: "Error",
        description: walletError.message,
        variant: "destructive",
      });
      setAdjustLoading(false);
      return;
    }

    // Create transaction record
    const { error: txError } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id: selectedWallet.user_id,
        amount: finalAmount,
        type: type === 'add' ? 'admin_credit' : 'admin_debit',
        description: adjustReason,
      });

    if (txError) {
      toast({
        title: "Warning",
        description: "Balance updated but transaction record failed",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Balance Adjusted",
        description: `₹${amount} ${type === 'add' ? 'added to' : 'deducted from'} ${selectedWallet.username}'s wallet`,
      });
    }

    setIsAdjustDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['adminWallets'] });
    queryClient.invalidateQueries({ queryKey: ['adminTransactions'] });
    setAdjustLoading(false);
  };

  const getTransactionBadge = (type: string) => {
    switch (type) {
      case "deposit":
      case "prize":
      case "refund":
      case "admin_credit":
        return <Badge className="bg-neon-green/20 text-neon-green border-neon-green/30 capitalize">{type.replace('_', ' ')}</Badge>;
      case "entry_fee":
      case "withdrawal":
      case "admin_debit":
        return <Badge className="bg-destructive/20 text-destructive border-destructive/30 capitalize">{type.replace('_', ' ')}</Badge>;
      default:
        return <Badge variant="secondary" className="capitalize">{type.replace('_', ' ')}</Badge>;
    }
  };

  const isLoading = walletsLoading || transactionsLoading;

  if (isLoading) {
    return (
      <AdminLayout title="Wallet Management" description="Loading wallets...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Wallet Management" description="View and manage user wallets and transactions">
      {/* Search */}
      <div className="mb-6">
        <CyberInput
          placeholder="Search by username..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          icon={<Search className="w-5 h-5" />}
          className="max-w-md"
        />
      </div>

      <Tabs defaultValue="wallets" className="space-y-6">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="wallets" className="font-rajdhani">Wallets</TabsTrigger>
          <TabsTrigger value="transactions" className="font-rajdhani">Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="wallets">
          <div className="bg-gradient-card rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-rajdhani">User</TableHead>
                  <TableHead className="text-muted-foreground font-rajdhani">Balance</TableHead>
                  <TableHead className="text-muted-foreground font-rajdhani">Last Updated</TableHead>
                  <TableHead className="text-muted-foreground font-rajdhani text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWallets?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
                      No wallets found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredWallets?.map((wallet) => (
                    <TableRow key={wallet.id} className="border-border">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                            <User className="w-5 h-5 text-primary" />
                          </div>
                          <span className="font-rajdhani font-medium text-foreground">
                            {wallet.username}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-orbitron text-lg text-foreground">
                          ₹{Number(wallet.balance).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-rajdhani">
                        {format(new Date(wallet.updated_at), 'MMM dd, yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="text-right">
                        <CyberButton
                          variant="outline"
                          size="sm"
                          onClick={() => openAdjustDialog(wallet)}
                        >
                          <Wallet className="w-4 h-4" />
                          Adjust
                        </CyberButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="transactions">
          <div className="bg-gradient-card rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-rajdhani">User</TableHead>
                  <TableHead className="text-muted-foreground font-rajdhani">Type</TableHead>
                  <TableHead className="text-muted-foreground font-rajdhani">Amount</TableHead>
                  <TableHead className="text-muted-foreground font-rajdhani">Description</TableHead>
                  <TableHead className="text-muted-foreground font-rajdhani">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                      No transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions?.map((tx) => (
                    <TableRow key={tx.id} className="border-border">
                      <TableCell className="font-rajdhani text-foreground">
                        {tx.username}
                      </TableCell>
                      <TableCell>{getTransactionBadge(tx.type)}</TableCell>
                      <TableCell>
                        <span className={`font-orbitron ${Number(tx.amount) >= 0 ? 'text-neon-green' : 'text-destructive'}`}>
                          {Number(tx.amount) >= 0 ? '+' : ''}₹{Math.abs(Number(tx.amount))}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-rajdhani max-w-xs truncate">
                        {tx.description || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground font-rajdhani">
                        {format(new Date(tx.created_at), 'MMM dd, HH:mm')}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Adjust Balance Dialog */}
      <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-orbitron text-foreground">
              Adjust Balance
            </DialogTitle>
            <DialogDescription>
              Adjust wallet balance for {selectedWallet?.username}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="text-center p-4 bg-secondary/30 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Current Balance</p>
              <p className="text-2xl font-orbitron text-foreground">
                ₹{Number(selectedWallet?.balance ?? 0).toLocaleString()}
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input
                id="amount"
                type="number"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                placeholder="Enter amount"
                min="0"
                step="0.01"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="Why are you adjusting this balance?"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <CyberButton
              variant="outline"
              onClick={() => setIsAdjustDialogOpen(false)}
              disabled={adjustLoading}
            >
              Cancel
            </CyberButton>
            <CyberButton
              variant="destructive"
              onClick={() => handleAdjustBalance('deduct')}
              disabled={adjustLoading || !adjustAmount}
            >
              {adjustLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Minus className="w-4 h-4" />}
              Deduct
            </CyberButton>
            <CyberButton
              onClick={() => handleAdjustBalance('add')}
              disabled={adjustLoading || !adjustAmount}
            >
              {adjustLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add
            </CyberButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
