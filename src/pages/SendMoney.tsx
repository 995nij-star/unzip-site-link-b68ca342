import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Send, Loader2, Star, Trash2, Search, Filter,
  Shield, Fingerprint, ShieldCheck, AlertTriangle, CheckCircle2,
  Clock, XCircle, Sparkles, Wallet as WalletIcon, Globe2,
  User, Mail, Phone, Hash, MessageSquare, Repeat, Gamepad2, LogOut, Lock,
} from "lucide-react";
import { CyberButton } from "@/components/ui/cyber-button";
import { CyberInput } from "@/components/ui/cyber-input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { ProfileDropdown } from "@/components/ProfileDropdown";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import {
  COUNTRIES, CURRENCIES, PAYMENT_METHODS, TRANSFER_LIMITS,
  calculateFee, deleteRecipient, formatMoney, getExchangeRate,
  issueMockOtp, listRecipients, listTransfers, recordTransfer,
  saveRecipient, toggleFavorite,
  type Currency, type PaymentMethod, type Recipient, type Transfer,
  type TransferStatus,
} from "@/lib/moneyTransfer";
import { supabase } from "@/integrations/supabase/client";
import { usePaymentMethodLocks } from "@/hooks/usePaymentMethodLocks";
import { format } from "date-fns";
import { PaymentSuccessAnimation } from "@/components/wallet/PaymentSuccessAnimation";

const STATUS_STYLE: Record<TransferStatus, { label: string; icon: JSX.Element; className: string }> = {
  pending:    { label: "Pending",    icon: <Clock className="w-3 h-3" />,        className: "bg-neon-orange/15 text-neon-orange border-neon-orange/40" },
  processing: { label: "Processing", icon: <Loader2 className="w-3 h-3 animate-spin" />, className: "bg-neon-blue/15 text-neon-blue border-neon-blue/40" },
  completed:  { label: "Completed",  icon: <CheckCircle2 className="w-3 h-3" />, className: "bg-neon-green/15 text-neon-green border-neon-green/40" },
  failed:     { label: "Failed",     icon: <XCircle className="w-3 h-3" />,      className: "bg-destructive/20 text-destructive border-destructive/40" },
  cancelled:  { label: "Cancelled",  icon: <XCircle className="w-3 h-3" />,      className: "bg-muted text-muted-foreground border-border" },
};

export default function SendMoney() {
  const { signOut, user } = useAuth();
  const { balance, refetch: refetchWallet } = useWallet();
  const navigate = useNavigate();
  const { isEnabled: isPaymentEnabled } = usePaymentMethodLocks();

  // ---- Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [walletId, setWalletId] = useState("");
  const [countryCode, setCountryCode] = useState<string>("IN");
  const country = useMemo(() => COUNTRIES.find(c => c.code === countryCode)!, [countryCode]);

  const [sendCurrency, setSendCurrency] = useState<Currency>("USD");
  const [receiveCurrency, setReceiveCurrency] = useState<Currency>("INR");
  const [amount, setAmount] = useState<string>("");
  const [message, setMessage] = useState("");
  const [payment, setPayment] = useState<PaymentMethod>("wallet");
  const [saveRecip, setSaveRecip] = useState(false);
  const [markFavorite, setMarkFavorite] = useState(false);

  // ---- Persistent lists
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const refresh = () => {
    setRecipients(listRecipients(user?.id));
    setTransfers(listTransfers(user?.id));
  };
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 2000); // pick up simulated status progression
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);


  // Whenever recipient country changes, default receive currency
  useEffect(() => { setReceiveCurrency(country.currency); }, [country]);

  // ---- Live conversion
  const numericAmount = Number(amount) || 0;
  const rate = useMemo(() => getExchangeRate(sendCurrency, receiveCurrency), [sendCurrency, receiveCurrency]);
  const crossBorder = sendCurrency !== receiveCurrency;
  const fee = useMemo(() => calculateFee(numericAmount, payment, crossBorder), [numericAmount, payment, crossBorder]);
  const receiveAmount = Number((numericAmount * rate).toFixed(2));
  const totalDebit = Number((numericAmount + fee).toFixed(2));

  // ---- Security (OTP flow)
  const [otpOpen, setOtpOpen] = useState(false);
  const [issuedOtp, setIssuedOtp] = useState<string>("");
  const [otpInput, setOtpInput] = useState("");
  const [require2FA, setRequire2FA] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ reference: string; amountLabel: string } | null>(null);

  // ---- Filters
  const [filterStatus, setFilterStatus] = useState<TransferStatus | "all">("all");
  const [filterCountry, setFilterCountry] = useState<string>("all");
  const [filterCurrency, setFilterCurrency] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<string>(""); // yyyy-mm-dd
  const [filterMinAmount, setFilterMinAmount] = useState<string>("");
  const [recipSearch, setRecipSearch] = useState("");

  const filteredTransfers = transfers.filter(t => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterCountry !== "all" && t.recipient.countryCode !== filterCountry) return false;
    if (filterCurrency !== "all" && t.receiveCurrency !== filterCurrency && t.sendCurrency !== filterCurrency) return false;
    if (filterDate && !t.createdAt.startsWith(filterDate)) return false;
    if (filterMinAmount && t.sendAmount < Number(filterMinAmount)) return false;
    return true;
  });

  const filteredRecipients = recipients.filter(r => {
    if (!recipSearch) return true;
    const q = recipSearch.toLowerCase();
    return r.name.toLowerCase().includes(q)
      || (r.email ?? "").toLowerCase().includes(q)
      || (r.phone ?? "").toLowerCase().includes(q)
      || (r.walletId ?? "").toLowerCase().includes(q);
  });

  // ---- Validation
  const walletDebitInInr = useMemo(
    () => Number((totalDebit * getExchangeRate(sendCurrency, "INR")).toFixed(2)),
    [totalDebit, sendCurrency]
  );

  function validate(): string | null {
    if (!name.trim()) return "Recipient name is required.";
    if (!email && !phone && !walletId) return "Provide at least one of email, phone, or wallet ID.";
    if (numericAmount <= 0) return "Enter an amount greater than zero.";
    if (numericAmount > TRANSFER_LIMITS.perTransaction) {
      return `Per-transaction limit is ${formatMoney(TRANSFER_LIMITS.perTransaction, sendCurrency)}.`;
    }
    if (payment === "wallet" && walletDebitInInr > balance) {
      return `Insufficient wallet balance. Need ${formatMoney(walletDebitInInr, "INR")}.`;
    }
    // Simple fraud heuristic: high value + brand-new recipient + crypto payout
    if (numericAmount > 5000 && payment.startsWith("crypto")) {
      return "Fraud check: high-value crypto transfers require manual review. Please contact support.";
    }
    return null;
  }

  function loadRecipient(r: Recipient) {
    setName(r.name);
    setEmail(r.email ?? "");
    setPhone(r.phone ?? "");
    setWalletId(r.walletId ?? "");
    setCountryCode(r.countryCode);
    setReceiveCurrency(r.currency);
    toast({ title: "Recipient loaded", description: r.name });
  }

  // ---- Submit flow
  function beginTransfer() {
    const err = validate();
    if (err) { toast({ title: "Cannot send", description: err, variant: "destructive" }); return; }
    if (require2FA) {
      const code = issueMockOtp();
      setIssuedOtp(code);
      setOtpInput("");
      setOtpOpen(true);
      toast({
        title: "Verification code sent",
        description: `Enter code ${code} to confirm this transfer.`,
      });
    } else {
      finalizeTransfer();
    }
  }

  async function finalizeTransfer() {
    setSubmitting(true);
    try {
      const recipientPayload = {
        id: crypto.randomUUID(),
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        walletId: walletId.trim() || undefined,
        countryCode,
        currency: receiveCurrency,
      };

      const transfer = recordTransfer({
        recipient: recipientPayload,
        sendAmount: numericAmount,
        sendCurrency,
        receiveAmount,
        receiveCurrency,
        exchangeRate: rate,
        fee,
        totalDebit,
        paymentMethod: payment,
        message: message.trim() || undefined,
      }, user?.id);


      // If paying from wallet, hold the funds server-side (INR-equivalent).
      if (payment === "wallet") {
        const { error } = await supabase.rpc("wallet_hold_transfer", {
          _amount: walletDebitInInr,
          _ref: transfer.reference,
        });
        if (error) {
          toast({ title: "Hold failed", description: error.message, variant: "destructive" });
          return;
        }
        refetchWallet();
      }

      if (saveRecip) {
        saveRecipient({
          name: recipientPayload.name,
          email: recipientPayload.email,
          phone: recipientPayload.phone,
          walletId: recipientPayload.walletId,
          countryCode,
          currency: receiveCurrency,
          favorite: markFavorite,
        });
      }

      // Close OTP dialog and show the premium success animation.
      setOtpOpen(false);
      setSuccessInfo({
        reference: transfer.reference,
        amountLabel: `${formatMoney(numericAmount, sendCurrency)} → ${formatMoney(receiveAmount, receiveCurrency)}`,
      });
      setSuccessOpen(true);

      // Reset amount + message; keep recipient
      setAmount(""); setMessage("");
      refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background cyber-grid">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/90 border-b border-neon-blue/20">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="relative">
              <Gamepad2 className="w-8 h-8 text-neon-blue" />
              <div className="absolute inset-0 bg-neon-blue/30 blur-lg rounded-full" />
            </div>
            <span className="text-xl font-orbitron font-bold text-gradient-neon">Idexopn</span>
          </Link>
          <div className="flex items-center gap-3">
            <NotificationDropdown />
            <ProfileDropdown />
            <CyberButton
              variant="ghost" size="icon"
              onClick={async () => { await signOut(); navigate("/login"); }}
              className="text-muted-foreground hover:text-destructive"
            >
              <LogOut className="w-5 h-5" />
            </CyberButton>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 md:py-8">
        <div className="flex items-center gap-4 mb-6 md:mb-8">
          <Link to="/wallet">
            <CyberButton variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></CyberButton>
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Globe2 className="w-5 h-5 text-neon-cyan" />
              <span className="text-sm font-rajdhani font-semibold text-neon-cyan uppercase tracking-wider">
                Global Money Transfer
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-orbitron font-bold text-foreground">
              Send Money Worldwide
            </h1>
          </div>
        </div>


        <Tabs defaultValue="send" className="w-full">
          <TabsList className="grid grid-cols-3 w-full max-w-md mb-6 bg-secondary/50">
            <TabsTrigger value="send">Send</TabsTrigger>
            <TabsTrigger value="recipients">Recipients</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* ============ SEND TAB ============ */}
          <TabsContent value="send" className="mt-0">
            <div className="grid lg:grid-cols-[1fr,380px] gap-6">
              {/* Form */}
              <div className="space-y-6">
                {/* Recipient */}
                <section className="p-5 md:p-6 rounded-2xl premium-card">
                  <h2 className="text-lg font-orbitron font-bold text-foreground mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-neon-blue" /> Recipient
                  </h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    <CyberInput placeholder="Recipient full name" icon={<User className="w-4 h-4" />}
                      value={name} onChange={e => setName(e.target.value)} />
                    <CyberInput type="email" placeholder="Email address" icon={<Mail className="w-4 h-4" />}
                      value={email} onChange={e => setEmail(e.target.value)} />
                    <CyberInput placeholder={`Phone ${country.dialCode}`} icon={<Phone className="w-4 h-4" />}
                      value={phone} onChange={e => setPhone(e.target.value)} />
                    <CyberInput placeholder="Wallet ID (10 digits)" icon={<Hash className="w-4 h-4" />}
                      value={walletId} onChange={e => setWalletId(e.target.value)} />
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Country</Label>
                      <Select value={countryCode} onValueChange={setCountryCode}>
                        <SelectTrigger className="h-12 bg-secondary/50 border-2 border-border"><SelectValue /></SelectTrigger>
                        <SelectContent className="max-h-72">
                          {COUNTRIES.map(c => (
                            <SelectItem key={c.code} value={c.code}>
                              <span className="mr-2">{c.flag}</span>{c.name}{" "}
                              <span className="text-muted-foreground">· {c.currency}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Receive currency</Label>
                      <Select value={receiveCurrency} onValueChange={(v) => setReceiveCurrency(v as Currency)}>
                        <SelectTrigger className="h-12 bg-secondary/50 border-2 border-border"><SelectValue /></SelectTrigger>
                        <SelectContent className="max-h-72">
                          {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </section>

                {/* Amount */}
                <section className="p-5 md:p-6 rounded-2xl premium-card">
                  <h2 className="text-lg font-orbitron font-bold text-foreground mb-4 flex items-center gap-2">
                    <Repeat className="w-5 h-5 text-neon-cyan" /> Amount & Currency
                  </h2>
                  <div className="grid md:grid-cols-[1fr,auto,1fr] items-end gap-3">
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">You send</Label>
                      <div className="flex gap-2">
                        <Select value={sendCurrency} onValueChange={v => setSendCurrency(v as Currency)}>
                          <SelectTrigger className="h-14 w-28 bg-secondary/50 border-2 border-border font-orbitron"><SelectValue /></SelectTrigger>
                          <SelectContent className="max-h-72">
                            {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <CyberInput type="number" inputMode="decimal" min={0} placeholder="0.00"
                          value={amount} onChange={e => setAmount(e.target.value)} className="text-lg font-orbitron" />
                      </div>
                    </div>
                    <div className="hidden md:flex items-center justify-center h-14 w-10 rounded-lg bg-neon-blue/10 border border-neon-blue/30">
                      <Repeat className="w-4 h-4 text-neon-blue" />
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">They receive</Label>
                      <div className="flex gap-2">
                        <div className="h-14 w-28 rounded-lg border-2 border-border bg-secondary/30 flex items-center justify-center font-orbitron font-bold text-neon-cyan">
                          {receiveCurrency}
                        </div>
                        <div className="h-14 flex-1 rounded-lg border-2 border-border bg-secondary/30 flex items-center justify-end px-4 font-orbitron text-lg text-neon-green">
                          {receiveAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-3 rounded-lg bg-secondary/30 border border-neon-cyan/20 text-sm font-rajdhani text-muted-foreground flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-neon-cyan" /> Live rate
                    </span>
                    <span className="font-orbitron text-foreground">
                      1 {sendCurrency} = {rate.toLocaleString(undefined, { maximumFractionDigits: 4 })} {receiveCurrency}
                    </span>
                  </div>
                </section>

                {/* Payment method */}
                <section className="p-5 md:p-6 rounded-2xl premium-card">
                  <h2 className="text-lg font-orbitron font-bold text-foreground mb-4 flex items-center gap-2">
                    <WalletIcon className="w-5 h-5 text-neon-purple" /> Payment Method
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {PAYMENT_METHODS.map(pm => {
                      const active = payment === pm.id;
                      const locked = !isPaymentEnabled(pm.id);
                      return (
                        <button
                          key={pm.id}
                          type="button"
                          disabled={locked}
                          aria-disabled={locked}
                          onClick={() => {
                            if (locked) return;
                            setPayment(pm.id);
                          }}
                          className={`relative text-left p-3 rounded-xl border-2 transition-all ${
                            locked
                              ? "border-border/50 bg-secondary/10 opacity-60 cursor-not-allowed"
                              : active
                                ? "border-neon-blue bg-neon-blue/10 shadow-neon"
                                : "border-border bg-secondary/30 hover:border-neon-blue/50"
                          }`}
                        >
                          {locked && (
                            <span className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-destructive/20 text-destructive text-[9px] font-bold uppercase tracking-wider">
                              <Lock className="w-3 h-3" /> Locked
                            </span>
                          )}
                          <div className="text-2xl mb-1">{pm.icon}</div>
                          <div className="font-rajdhani font-semibold text-sm text-foreground flex items-center gap-1">
                            {pm.label}
                          </div>
                          <div className="text-[11px] text-muted-foreground leading-tight mt-1">
                            {locked ? "Disabled by admin" : pm.description}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* Message + save */}
                <section className="p-5 md:p-6 rounded-2xl premium-card space-y-4">
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" /> Message (optional)
                    </Label>
                    <Textarea value={message} onChange={e => setMessage(e.target.value)} maxLength={200}
                      placeholder="Add a note for the recipient…" className="bg-secondary/40 border-2 border-border" />
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <Switch checked={saveRecip} onCheckedChange={setSaveRecip} />
                      <span className="font-rajdhani text-sm">Save recipient</span>
                    </label>
                    <label className={`flex items-center gap-3 ${saveRecip ? "" : "opacity-40 pointer-events-none"}`}>
                      <Switch checked={markFavorite} onCheckedChange={setMarkFavorite} />
                      <span className="font-rajdhani text-sm">Mark favorite</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer sm:ml-auto">
                      <Switch checked={require2FA} onCheckedChange={setRequire2FA} />
                      <span className="font-rajdhani text-sm flex items-center gap-1">
                        <ShieldCheck className="w-4 h-4 text-neon-green" /> Require 2FA
                      </span>
                    </label>
                  </div>
                </section>
              </div>

              {/* Summary sidebar */}
              <aside className="lg:sticky lg:top-24 h-fit space-y-4">
                <div className="p-6 rounded-2xl premium-card-featured relative overflow-hidden">
                  <div className="absolute inset-0 opacity-25">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-neon-cyan/25 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-40 h-40 bg-neon-purple/25 rounded-full blur-3xl" />
                  </div>
                  <div className="relative z-10 space-y-4">
                    <h3 className="font-orbitron font-bold text-lg text-foreground">Transfer Summary</h3>
                    <Row label="You send"  value={formatMoney(numericAmount, sendCurrency)} />
                    <Row label="Exchange rate" value={`1 ${sendCurrency} = ${rate.toFixed(4)} ${receiveCurrency}`} />
                    <Row label="Transfer fee" value={formatMoney(fee, sendCurrency)} />
                    <div className="h-px bg-border/60" />
                    <Row label="Recipient gets" value={formatMoney(receiveAmount, receiveCurrency)} accent />
                    <Row label="Total to pay"   value={formatMoney(totalDebit, sendCurrency)} bold />

                    <div className="pt-2 space-y-2 text-xs font-rajdhani text-muted-foreground">
                      <div className="flex items-center gap-2"><Shield className="w-3.5 h-3.5 text-neon-green" /> Fraud detection active</div>
                      <div className="flex items-center gap-2"><Fingerprint className="w-3.5 h-3.5 text-neon-cyan" /> Device verified</div>
                      <div className="flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-neon-purple" /> Per-txn limit {formatMoney(TRANSFER_LIMITS.perTransaction, sendCurrency)}</div>
                    </div>

                    <CyberButton className="w-full" onClick={beginTransfer} disabled={submitting}>
                      {submitting
                        ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…</>
                        : <><Send className="w-4 h-4 mr-2" /> Send Money</>}
                    </CyberButton>
                  </div>
                </div>
              </aside>
            </div>
          </TabsContent>

          {/* ============ RECIPIENTS TAB ============ */}
          <TabsContent value="recipients" className="mt-0 space-y-4">
            <div className="flex gap-3 items-center">
              <CyberInput icon={<Search className="w-4 h-4" />} placeholder="Search recipients…"
                value={recipSearch} onChange={e => setRecipSearch(e.target.value)} />
            </div>

            {filteredRecipients.length === 0 ? (
              <EmptyState icon={<User className="w-10 h-10" />} title="No saved recipients"
                sub="Enable “Save recipient” when sending money to build your list." />
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRecipients.map(r => {
                  const c = COUNTRIES.find(x => x.code === r.countryCode);
                  return (
                    <div key={r.id} className="p-4 rounded-xl premium-card hover:border-neon-blue/50 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-orbitron font-bold text-foreground flex items-center gap-2">
                            {r.name}
                            {r.favorite && <Star className="w-4 h-4 text-neon-gold fill-neon-gold" />}
                          </p>
                          <p className="text-xs text-muted-foreground font-rajdhani">
                            {c?.flag} {c?.name} · {r.currency}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <CyberButton size="icon" variant="ghost"
                            onClick={() => { toggleFavorite(r.id); refresh(); }}>
                            <Star className={`w-4 h-4 ${r.favorite ? "text-neon-gold fill-neon-gold" : "text-muted-foreground"}`} />
                          </CyberButton>
                          <CyberButton size="icon" variant="ghost"
                            onClick={() => { deleteRecipient(r.id); refresh(); }}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </CyberButton>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground font-rajdhani space-y-0.5 mb-3">
                        {r.email && <div className="truncate">✉ {r.email}</div>}
                        {r.phone && <div>☎ {r.phone}</div>}
                        {r.walletId && <div>ID · {r.walletId}</div>}
                      </div>
                      <CyberButton size="sm" variant="outline" className="w-full"
                        onClick={() => loadRecipient(r)}>
                        <Send className="w-3 h-3 mr-2" /> Send again
                      </CyberButton>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ============ HISTORY TAB ============ */}
          <TabsContent value="history" className="mt-0 space-y-4">
            <div className="p-4 rounded-xl premium-card grid grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <Label className="text-[10px] uppercase text-muted-foreground">Status</Label>
                <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
                  <SelectTrigger className="h-10 bg-secondary/50 border border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {(["pending","processing","completed","failed","cancelled"] as TransferStatus[]).map(s =>
                      <SelectItem key={s} value={s}>{STATUS_STYLE[s].label}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] uppercase text-muted-foreground">Country</Label>
                <Select value={filterCountry} onValueChange={setFilterCountry}>
                  <SelectTrigger className="h-10 bg-secondary/50 border border-border"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value="all">All</SelectItem>
                    {COUNTRIES.map(c => <SelectItem key={c.code} value={c.code}>{c.flag} {c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] uppercase text-muted-foreground">Currency</Label>
                <Select value={filterCurrency} onValueChange={setFilterCurrency}>
                  <SelectTrigger className="h-10 bg-secondary/50 border border-border"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value="all">All</SelectItem>
                    {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] uppercase text-muted-foreground">Date</Label>
                <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
                  className="w-full h-10 rounded-md bg-secondary/50 border border-border px-3 text-sm font-rajdhani text-foreground" />
              </div>
              <div>
                <Label className="text-[10px] uppercase text-muted-foreground">Min amount</Label>
                <input type="number" min={0} value={filterMinAmount} onChange={e => setFilterMinAmount(e.target.value)}
                  placeholder="0"
                  className="w-full h-10 rounded-md bg-secondary/50 border border-border px-3 text-sm font-rajdhani text-foreground" />
              </div>
            </div>

            {filteredTransfers.length === 0 ? (
              <EmptyState icon={<Filter className="w-10 h-10" />} title="No transfers match"
                sub="Adjust filters or send your first transfer." />
            ) : (
              <div className="space-y-3">
                {filteredTransfers.map(t => {
                  const c = COUNTRIES.find(x => x.code === t.recipient.countryCode);
                  const s = STATUS_STYLE[t.status];
                  return (
                    <div key={t.id} className="p-4 rounded-xl premium-card hover:border-neon-blue/40 transition-colors">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-orbitron font-bold text-foreground truncate">{t.recipient.name}</p>
                            <Badge className={`gap-1 border ${s.className}`}>{s.icon} {s.label}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground font-rajdhani mt-1">
                            {c?.flag} {c?.name} · {format(new Date(t.createdAt), "MMM d, yyyy HH:mm")} · Ref {t.reference}
                          </p>
                          {t.message && <p className="text-xs text-muted-foreground mt-1 italic">“{t.message}”</p>}
                        </div>
                        <div className="text-right">
                          <p className="font-orbitron font-bold text-neon-green">
                            {formatMoney(t.receiveAmount, t.receiveCurrency)}
                          </p>
                          <p className="text-xs text-muted-foreground font-rajdhani">
                            from {formatMoney(t.sendAmount, t.sendCurrency)} · fee {formatMoney(t.fee, t.sendCurrency)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* OTP dialog */}
      <Dialog open={otpOpen} onOpenChange={setOtpOpen}>
        <DialogContent className="border-neon-blue/40" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="font-orbitron flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-neon-green" /> Two-Factor Verification
            </DialogTitle>
            <DialogDescription>
              Enter the 6-digit code sent to your device to confirm this transfer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-neon-blue/10 border border-neon-blue/30 text-sm font-rajdhani">
              Your code: <span className="font-orbitron text-neon-cyan tracking-widest">{issuedOtp}</span>
            </div>
            <CyberInput placeholder="Enter 6-digit code" inputMode="numeric" maxLength={6}
              value={otpInput} onChange={e => setOtpInput(e.target.value.replace(/\D/g, ""))} />
          </div>
          <DialogFooter>
            <CyberButton variant="ghost" onClick={() => setOtpOpen(false)}>Cancel</CyberButton>
            <CyberButton
              onClick={() => {
                if (otpInput !== issuedOtp) {
                  toast({ title: "Invalid code", description: "Please try again.", variant: "destructive" });
                  return;
                }
                finalizeTransfer();
              }}
              disabled={otpInput.length !== 6 || submitting}
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Confirm & Send
            </CyberButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PaymentSuccessAnimation
        open={successOpen}
        reference={successInfo?.reference}
        amountLabel={successInfo?.amountLabel}
        onDone={() => {
          setSuccessOpen(false);
          toast({
            title: "Payment request submitted",
            description:
              "Your payment request has been submitted successfully and is waiting for admin approval.",
          });
        }}
      />
    </div>
  );
}

function Row({ label, value, accent, bold }: { label: string; value: string; accent?: boolean; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm font-rajdhani">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-orbitron ${bold ? "text-lg text-foreground" : accent ? "text-neon-cyan" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}

function EmptyState({ icon, title, sub }: { icon: JSX.Element; title: string; sub: string }) {
  return (
    <div className="text-center py-16 rounded-xl premium-card">
      <div className="mx-auto mb-4 text-muted-foreground w-fit">{icon}</div>
      <p className="font-orbitron font-bold text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground font-rajdhani mt-1">{sub}</p>
    </div>
  );
}
