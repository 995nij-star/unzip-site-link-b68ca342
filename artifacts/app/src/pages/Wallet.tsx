import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { useWithdrawalRequests } from "@/hooks/useWithdrawalRequests";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate, Link } from "react-router-dom";
import { CyberButton } from "@/components/ui/cyber-button";
import { ProfileDropdown } from "@/components/ProfileDropdown";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { WithdrawDialog } from "@/components/wallet/WithdrawDialog";
import { RedeemGiftCode } from "@/components/wallet/RedeemGiftCode";
import { CreateGiftCode } from "@/components/wallet/CreateGiftCode";
import { MyGiftCodes } from "@/components/wallet/MyGiftCodes";
import { format } from 'date-fns';
import { 
  Gamepad2, 
  LogOut, 
  Wallet as WalletIcon,
  ArrowLeft,
  ArrowUpRight,
  ArrowDownLeft,
  Trophy,
  Gift,
  TicketCheck,
  PlusCircle,
  Library,
  Loader2,
  IndianRupee,
  Banknote,
  Clock,
  CheckCircle,
  XCircle,
  Send
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Wallet() {
  const { user, signOut } = useAuth();
  const { wallet, transactions, loading, balance } = useWallet();
  const { requests: withdrawalRequests } = useWithdrawalRequests();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownLeft className="w-4 h-4 text-neon-green" />;
      case 'withdrawal':
        return <ArrowUpRight className="w-4 h-4 text-destructive" />;
      case 'entry_fee':
        return <Trophy className="w-4 h-4 text-neon-orange" />;
      case 'prize':
        return <Gift className="w-4 h-4 text-neon-cyan" />;
      case 'gift_code':
        return <Gift className="w-4 h-4 text-neon-gold" />;
      case 'refund':
        return <ArrowDownLeft className="w-4 h-4 text-neon-green" />;
      default:
        return <WalletIcon className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getTransactionColor = (amount: number) => {
    return amount >= 0 ? 'text-neon-green' : 'text-destructive';
  };

  return (
    <div className="min-h-screen bg-background cyber-grid">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/90 border-b border-neon-blue/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/dashboard" className="flex items-center gap-3">
                <div className="relative">
                  <Gamepad2 className="w-8 h-8 text-neon-blue" />
                  <div className="absolute inset-0 bg-neon-blue/30 blur-lg rounded-full" />
                </div>
                <span className="text-xl font-orbitron font-bold text-gradient-neon">
                  Idexopn
                </span>
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <NotificationDropdown />
              <ProfileDropdown />
              <CyberButton 
                variant="ghost" 
                size="icon" 
                onClick={handleSignOut}
                className="text-muted-foreground hover:text-destructive"
              >
                <LogOut className="w-5 h-5" />
              </CyberButton>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Back Button & Title */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/dashboard">
            <CyberButton variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </CyberButton>
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <WalletIcon className="w-5 h-5 text-neon-green" />
              <span className="text-sm font-rajdhani font-semibold text-neon-green uppercase tracking-wider">
                {t("dashboard.yourFunds")}
              </span>
            </div>
            <h1 className="text-3xl font-orbitron font-bold text-foreground">
              {t("wallet.title")}
            </h1>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-neon-blue" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Balance Card */}
            <div className="relative p-8 rounded-2xl premium-card-featured overflow-hidden">
              <div className="absolute inset-0 opacity-30">
                <div className="absolute top-0 right-0 w-64 h-64 bg-neon-green/20 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-neon-cyan/20 rounded-full blur-3xl" />
              </div>
              
              <div className="relative z-10">
                <p className="text-sm font-rajdhani font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {t("wallet.availableBalance")}
                </p>
                <p className="text-5xl md:text-6xl font-orbitron font-bold text-gradient-neon mb-6">
                  ₹{balance.toFixed(2)}
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Link to="/wallet/add" className="w-full">
                    <CyberButton className="w-full golden-button">
                      <IndianRupee className="w-4 h-4 mr-2" />
                      {t("wallet.addMoney")}
                    </CyberButton>
                  </Link>
                  <Link to="/wallet/send" className="w-full">
                    <CyberButton variant="accent" className="w-full">
                      <Send className="w-4 h-4 mr-2" />
                      Send Money
                    </CyberButton>
                  </Link>
                  <CyberButton
                    variant="outline"
                    className="w-full"
                    onClick={() => setIsWithdrawOpen(true)}
                    disabled={balance < 100}
                  >
                    <Banknote className="w-4 h-4 mr-2" />
                    {t("wallet.withdraw")}
                  </CyberButton>
                </div>
              </div>
            </div>




            {/* Pending Withdrawals */}
            {withdrawalRequests.filter(r => r.status === 'pending').length > 0 && (
              <div>
                <h2 className="text-xl font-orbitron font-bold text-foreground mb-4">
                  {t("wallet.pendingWithdrawals")}
                </h2>
                <div className="space-y-3">
                  {withdrawalRequests
                    .filter(r => r.status === 'pending')
                    .map((request) => (
                      <div 
                        key={request.id}
                        className="flex items-center justify-between p-4 rounded-xl premium-card border-neon-orange/30"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2 rounded-lg bg-neon-orange/20">
                            <Clock className="w-4 h-4 text-neon-orange" />
                          </div>
                          <div>
                            <p className="font-rajdhani font-semibold text-foreground">
                              {t("wallet.withdrawalRequest")}
                            </p>
                            <p className="text-sm text-muted-foreground font-rajdhani">
                              To: {request.upi_id}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-orbitron font-bold text-neon-orange">
                            ₹{Number(request.amount).toLocaleString()}
                          </p>
                          <Badge className="bg-neon-orange/20 text-neon-orange border-neon-orange/30 text-xs">
                            {t("wallet.processing")}
                          </Badge>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Transactions */}
            <div>
              <h2 className="text-xl font-orbitron font-bold text-foreground mb-4">
                {t("wallet.transactionHistory")}
              </h2>

              {transactions.length === 0 ? (
                <div className="text-center py-12 rounded-xl premium-card">
                  <WalletIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground font-rajdhani">
                    {t("wallet.noTransactions")}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((transaction) => (
                    <div 
                      key={transaction.id}
                      className="flex items-center justify-between p-4 rounded-xl premium-card hover:border-neon-blue/40 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-background/50">
                          {getTransactionIcon(transaction.type)}
                        </div>
                        <div>
                          <p className="font-rajdhani font-semibold text-foreground capitalize">
                            {transaction.type.replace('_', ' ')}
                          </p>
                          <p className="text-sm text-muted-foreground font-rajdhani">
                            {transaction.description || format(new Date(transaction.created_at), 'MMM d, yyyy HH:mm')}
                          </p>
                        </div>
                      </div>
                      <p className={`font-orbitron font-bold ${getTransactionColor(transaction.amount)}`}>
                        {transaction.amount >= 0 ? '+' : ''}₹{Math.abs(transaction.amount).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <WithdrawDialog
        open={isWithdrawOpen}
        onOpenChange={setIsWithdrawOpen}
        walletBalance={balance}
      />
    </div>
  );
}
