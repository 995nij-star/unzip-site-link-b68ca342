import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Globe2, DollarSign, Activity, CheckCircle2, XCircle, Snowflake, RotateCcw,
  Download, Bell, TrendingUp, AlertTriangle, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  COUNTRIES, CURRENCIES, formatMoney, adminListAllTransfers,
  approveTransfer, rejectTransfer, freezeTransfer, issueRefund, listRefunds,
  getAdminSettings, saveAdminSettings, getRateOverrides, setRateOverride,
  getDisabledCountries, toggleCountry, getDisabledCurrencies, toggleCurrency,
  computeAnalytics, transfersToCsv, downloadCsv, getEffectiveUsdRate,
  getExchangeRate,
  type Transfer, type Currency, type TransferStatus, type AdminSettings,
} from "@/lib/moneyTransfer";
import { supabase } from "@/integrations/supabase/client";

async function refundWalletIfNeeded(t: Transfer | undefined) {
  if (!t || t.paymentMethod !== "wallet") return;
  const inr = Number((t.totalDebit * getExchangeRate(t.sendCurrency, "INR")).toFixed(2));
  if (inr <= 0) return;
  const { error } = await supabase.rpc("wallet_refund_transfer", { _amount: inr, _ref: t.reference });
  if (error) toast.error(`Wallet refund failed: ${error.message}`);
}

const STATUS_STYLES: Record<TransferStatus, string> = {
  pending: "bg-neon-orange/15 text-neon-orange border-neon-orange/30",
  processing: "bg-neon-blue/15 text-neon-blue border-neon-blue/30",
  completed: "bg-neon-green/15 text-neon-green border-neon-green/30",
  failed: "bg-destructive/15 text-destructive border-destructive/30",
  cancelled: "bg-muted text-muted-foreground border-border/40",
};

function StatCard({ label, value, hint, icon: Icon, tone = "text-neon-blue" }: {
  label: string; value: string; hint?: string; icon: any; tone?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-rajdhani">{label}</p>
            <p className="text-2xl font-orbitron font-bold mt-1">{value}</p>
            {hint && <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>}
          </div>
          <div className={`w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center ${tone}`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminMoneyTransfers() {
  const [tick, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);
  useEffect(() => {
    const settings = getAdminSettings();
    if (!settings.realtimeAlerts) return;
    const i = setInterval(refresh, 5000);
    return () => clearInterval(i);
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const transfers = useMemo(() => adminListAllTransfers(), [tick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const analytics = useMemo(() => computeAnalytics(), [tick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const refunds = useMemo(() => listRefunds(), [tick]);

  // Transactions tab state
  const [statusFilter, setStatusFilter] = useState<TransferStatus | "all">("all");
  const [q, setQ] = useState("");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const filtered = useMemo(() => transfers.filter(t => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (countryFilter !== "all" && t.recipient.countryCode !== countryFilter) return false;
    if (q) {
      const s = q.toLowerCase();
      if (!(t.reference.toLowerCase().includes(s) ||
            t.recipient.name.toLowerCase().includes(s) ||
            (t.recipient.email ?? "").toLowerCase().includes(s) ||
            (t.recipient.walletId ?? "").toLowerCase().includes(s))) return false;
    }
    return true;
  }), [transfers, statusFilter, countryFilter, q]);

  // Details modal
  const [detail, setDetail] = useState<Transfer | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [refundId, setRefundId] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState("");

  // Settings state
  const [settings, setSettings] = useState<AdminSettings>(getAdminSettings());
  const patch = (p: Partial<AdminSettings>) => {
    const next = { ...settings, ...p };
    setSettings(next);
    saveAdminSettings(p);
  };

  const disabledCountries = new Set(getDisabledCountries());
  const disabledCurrencies = new Set(getDisabledCurrencies());
  const overrides = getRateOverrides();

  const exportCsv = () => {
    downloadCsv(`transfers-${new Date().toISOString().slice(0, 10)}.csv`, transfersToCsv(filtered));
    toast.success(`Exported ${filtered.length} transfers`);
  };

  return (
    <AdminLayout title="Global Money Transfers" description="Manage international transfers, rates, fees, limits and analytics">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="live">Live Monitor</TabsTrigger>
          <TabsTrigger value="refunds">Refunds</TabsTrigger>
          <TabsTrigger value="countries">Countries</TabsTrigger>
          <TabsTrigger value="currencies">Currencies</TabsTrigger>
          <TabsTrigger value="rates">Rates & Fees</TabsTrigger>
          <TabsTrigger value="limits">Limits & Security</TabsTrigger>
        </TabsList>

        {/* OVERVIEW / ANALYTICS */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total Volume" value={`$${analytics.totalVolumeUsd.toFixed(2)}`} hint={`${analytics.totalCount} transfers`} icon={DollarSign} tone="text-neon-green" />
            <StatCard label="Success Rate" value={`${analytics.successRate.toFixed(1)}%`} hint={`${analytics.completed} completed`} icon={CheckCircle2} tone="text-neon-blue" />
            <StatCard label="Pending" value={String(analytics.pending + analytics.processing)} hint="Awaiting settlement" icon={Activity} tone="text-neon-orange" />
            <StatCard label="Failed" value={String(analytics.failed + analytics.cancelled)} hint="Failed or cancelled" icon={AlertTriangle} tone="text-destructive" />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4 text-neon-blue" /> Top Corridors</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {analytics.topCorridors.length === 0 && <p className="text-sm text-muted-foreground">No transfers yet.</p>}
                {analytics.topCorridors.map(c => (
                  <div key={c.pair} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-border/30">
                    <div>
                      <p className="font-rajdhani font-bold">{c.pair}</p>
                      <p className="text-xs text-muted-foreground">{c.count} transfers</p>
                    </div>
                    <p className="text-neon-green font-orbitron">${c.volumeUsd.toFixed(2)}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Volume · Last 14 days</CardTitle></CardHeader>
              <CardContent>
                {analytics.volumeByDay.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No data yet.</p>
                ) : (
                  <div className="flex items-end gap-1 h-32">
                    {analytics.volumeByDay.map(d => {
                      const max = Math.max(...analytics.volumeByDay.map(x => x.volumeUsd), 1);
                      const h = (d.volumeUsd / max) * 100;
                      return (
                        <div key={d.date} className="flex-1 flex flex-col items-center gap-1" title={`${d.date}: $${d.volumeUsd.toFixed(2)} · ${d.count}`}>
                          <div className="w-full rounded-t bg-gradient-to-t from-primary to-neon-purple" style={{ height: `${h}%` }} />
                          <span className="text-[9px] text-muted-foreground">{d.date.slice(5)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TRANSACTIONS */}
        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardContent className="p-4 flex flex-wrap gap-2 items-end">
              <div className="flex-1 min-w-[180px]">
                <Label className="text-xs">Search</Label>
                <Input placeholder="Reference, name, email, wallet…" value={q} onChange={e => setQ(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={statusFilter} onValueChange={v => setStatusFilter(v as any)}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Country</Label>
                <Select value={countryFilter} onValueChange={setCountryFilter}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value="all">All</SelectItem>
                    {COUNTRIES.map(c => <SelectItem key={c.code} value={c.code}>{c.flag} {c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" onClick={refresh}><RefreshCw className="w-4 h-4 mr-1" />Refresh</Button>
              <Button onClick={exportCsv}><Download className="w-4 h-4 mr-1" />Export CSV</Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No transfers found.</TableCell></TableRow>
                  )}
                  {filtered.map(t => {
                    const country = COUNTRIES.find(c => c.code === t.recipient.countryCode);
                    return (
                      <TableRow key={t.id} className="cursor-pointer" onClick={() => setDetail(t)}>
                        <TableCell className="font-mono text-xs">{t.reference}</TableCell>
                        <TableCell>
                          <p className="font-medium">{t.recipient.name}</p>
                          <p className="text-xs text-muted-foreground">{t.recipient.email || t.recipient.phone || t.recipient.walletId}</p>
                        </TableCell>
                        <TableCell className="text-xs">{country?.flag} {t.sendCurrency}→{t.receiveCurrency}</TableCell>
                        <TableCell className="font-semibold">{formatMoney(t.sendAmount, t.sendCurrency)}</TableCell>
                        <TableCell><Badge variant="outline" className={STATUS_STYLES[t.status]}>{t.status}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleString()}</TableCell>
                        <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            {t.status === "pending" && (
                              <>
                                <Button size="sm" variant="outline" className="h-7 px-2 text-neon-green" onClick={() => { approveTransfer(t.id); toast.success("Approved"); refresh(); }}>
                                  <CheckCircle2 className="w-3 h-3" />
                                </Button>
                                <Button size="sm" variant="outline" className="h-7 px-2 text-destructive" onClick={() => { setRejectId(t.id); setRejectReason(""); }}>
                                  <XCircle className="w-3 h-3" />
                                </Button>
                              </>
                            )}
                            {(t.status === "pending" || t.status === "processing") && (
                              <Button size="sm" variant="outline" className="h-7 px-2 text-neon-blue" onClick={async () => { await refundWalletIfNeeded(t); freezeTransfer(t.id, "manual"); toast.warning("Frozen & refunded"); refresh(); }}>
                                <Snowflake className="w-3 h-3" />
                              </Button>
                            )}
                            {t.status === "completed" && (
                              <Button size="sm" variant="outline" className="h-7 px-2 text-neon-orange" onClick={() => { setRefundId(t.id); setRefundReason(""); }}>
                                <RotateCcw className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LIVE MONITOR */}
        <TabsContent value="live" className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse" /> Live Transactions
              </CardTitle>
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-muted-foreground" />
                <Switch checked={settings.realtimeAlerts} onCheckedChange={v => patch({ realtimeAlerts: v })} />
                <span className="text-xs text-muted-foreground">Real-time alerts</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {transfers.slice(0, 8).map(t => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border border-border/30 bg-white/[0.02]">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${t.status === "processing" ? "bg-neon-blue animate-pulse" : t.status === "pending" ? "bg-neon-orange" : t.status === "completed" ? "bg-neon-green" : "bg-destructive"}`} />
                    <div>
                      <p className="text-sm font-medium">{t.recipient.name} · <span className="font-mono text-xs text-muted-foreground">{t.reference}</span></p>
                      <p className="text-xs text-muted-foreground">{formatMoney(t.sendAmount, t.sendCurrency)} → {formatMoney(t.receiveAmount, t.receiveCurrency)}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={STATUS_STYLES[t.status]}>{t.status}</Badge>
                </div>
              ))}
              {transfers.length === 0 && <p className="text-sm text-muted-foreground">Waiting for transfers…</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2 text-destructive"><AlertTriangle className="w-4 h-4" /> Failed Transactions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {transfers.filter(t => t.status === "failed").slice(0, 10).map(t => (
                <div key={t.id} className="p-2 rounded border border-destructive/30 bg-destructive/5 text-xs">
                  <p className="font-mono">{t.reference}</p>
                  <p className="text-muted-foreground">{t.recipient.name} · {formatMoney(t.sendAmount, t.sendCurrency)} · {t.message}</p>
                </div>
              ))}
              {transfers.filter(t => t.status === "failed").length === 0 && <p className="text-sm text-muted-foreground">No failed transactions.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* REFUNDS */}
        <TabsContent value="refunds">
          <Card>
            <CardHeader><CardTitle className="text-base">Refund History</CardTitle></CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Refund ID</TableHead><TableHead>Transfer</TableHead>
                  <TableHead>Amount</TableHead><TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead><TableHead>Date</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {refunds.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No refunds issued yet.</TableCell></TableRow>}
                  {refunds.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.id.slice(0, 8)}</TableCell>
                      <TableCell className="font-mono text-xs">{r.transferId.slice(0, 8)}</TableCell>
                      <TableCell>{formatMoney(r.amount, r.currency)}</TableCell>
                      <TableCell className="text-xs">{r.reason}</TableCell>
                      <TableCell><Badge variant="outline" className="bg-neon-green/15 text-neon-green border-neon-green/30">{r.status}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* COUNTRIES */}
        <TabsContent value="countries">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Globe2 className="w-4 h-4" /> Supported Countries ({COUNTRIES.length - disabledCountries.size}/{COUNTRIES.length})</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {COUNTRIES.map(c => {
                const disabled = disabledCountries.has(c.code);
                return (
                  <div key={c.code} className={`flex items-center justify-between p-2 rounded-lg border ${disabled ? "border-border/30 bg-muted/20 opacity-60" : "border-primary/20 bg-primary/5"}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xl">{c.flag}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground">{c.currency} · {c.dialCode}</p>
                      </div>
                    </div>
                    <Switch checked={!disabled} onCheckedChange={() => { toggleCountry(c.code); refresh(); }} />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CURRENCIES */}
        <TabsContent value="currencies">
          <Card>
            <CardHeader><CardTitle className="text-base">Supported Currencies</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {CURRENCIES.map(c => {
                const disabled = disabledCurrencies.has(c);
                return (
                  <div key={c} className={`flex items-center justify-between p-2 rounded-lg border ${disabled ? "border-border/30 opacity-60" : "border-primary/20 bg-primary/5"}`}>
                    <span className="font-orbitron font-bold">{c}</span>
                    <Switch checked={!disabled} onCheckedChange={() => { toggleCurrency(c); refresh(); }} />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* RATES & FEES */}
        <TabsContent value="rates" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Transfer Fees</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>Base fee (%)</Label>
                <Input type="number" step="0.1" value={settings.baseFeePct} onChange={e => patch({ baseFeePct: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Cross-border fee (%)</Label>
                <Input type="number" step="0.1" value={settings.crossBorderFeePct} onChange={e => patch({ crossBorderFeePct: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Flat fee (USD)</Label>
                <Input type="number" step="0.05" value={settings.flatFee} onChange={e => patch({ flatFee: Number(e.target.value) })} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Exchange Rate Overrides (per 1 USD)</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {CURRENCIES.map(c => (
                <div key={c}>
                  <Label className="text-xs">{c} <span className="text-muted-foreground">({getEffectiveUsdRate(c)})</span></Label>
                  <Input
                    type="number" step="0.0001"
                    placeholder={String(getEffectiveUsdRate(c))}
                    defaultValue={overrides[c] ?? ""}
                    onBlur={e => {
                      const v = e.target.value.trim();
                      setRateOverride(c, v === "" ? null : Number(v));
                      toast.success(`Rate for ${c} updated`);
                      refresh();
                    }}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* LIMITS & SECURITY */}
        <TabsContent value="limits">
          <Card>
            <CardHeader><CardTitle className="text-base">Transfer Limits & Security</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Minimum transfer (USD)</Label>
                <Input type="number" value={settings.minTransfer} onChange={e => patch({ minTransfer: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Maximum per transaction (USD)</Label>
                <Input type="number" value={settings.maxTransfer} onChange={e => patch({ maxTransfer: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Daily limit (USD)</Label>
                <Input type="number" value={settings.dailyLimit} onChange={e => patch({ dailyLimit: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Monthly limit (USD)</Label>
                <Input type="number" value={settings.monthlyLimit} onChange={e => patch({ monthlyLimit: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Auto-approve transfers under (USD)</Label>
                <Input type="number" value={settings.autoApproveUnder} onChange={e => patch({ autoApproveUnder: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Auto-freeze fraud threshold (USD)</Label>
                <Input type="number" value={settings.fraudFreezeOver} onChange={e => patch({ fraudFreezeOver: Number(e.target.value) })} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Details modal */}
      <Dialog open={!!detail} onOpenChange={o => !o && setDetail(null)}>
        <DialogContent aria-describedby={undefined} className="max-w-lg">
          <DialogHeader><DialogTitle>Transfer Details</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Reference</span><span className="font-mono">{detail.reference}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge variant="outline" className={STATUS_STYLES[detail.status]}>{detail.status}</Badge></div>
              <hr className="border-border/30" />
              <div>
                <p className="text-muted-foreground text-xs uppercase mb-1">Recipient</p>
                <p className="font-medium">{detail.recipient.name}</p>
                <p className="text-xs">{detail.recipient.email} · {detail.recipient.phone}</p>
                <p className="text-xs text-muted-foreground">Wallet: {detail.recipient.walletId || "—"} · {COUNTRIES.find(c => c.code === detail.recipient.countryCode)?.name}</p>
              </div>
              <hr className="border-border/30" />
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">Send</span><p>{formatMoney(detail.sendAmount, detail.sendCurrency)}</p></div>
                <div><span className="text-muted-foreground">Receive</span><p>{formatMoney(detail.receiveAmount, detail.receiveCurrency)}</p></div>
                <div><span className="text-muted-foreground">Rate</span><p>{detail.exchangeRate}</p></div>
                <div><span className="text-muted-foreground">Fee</span><p>{formatMoney(detail.fee, detail.sendCurrency)}</p></div>
                <div><span className="text-muted-foreground">Method</span><p>{detail.paymentMethod}</p></div>
                <div><span className="text-muted-foreground">Total debit</span><p>{formatMoney(detail.totalDebit, detail.sendCurrency)}</p></div>
              </div>
              {detail.message && <p className="text-xs text-muted-foreground italic">"{detail.message}"</p>}
              <p className="text-[10px] text-muted-foreground">Created {new Date(detail.createdAt).toLocaleString()} · Updated {new Date(detail.updatedAt).toLocaleString()}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject modal */}
      <Dialog open={!!rejectId} onOpenChange={o => !o && setRejectId(null)}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Reject Transfer</DialogTitle></DialogHeader>
          <Label>Reason</Label>
          <Input value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Insufficient KYC / suspected fraud…" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={async () => {
              if (rejectId) {
                await refundWalletIfNeeded(transfers.find(x => x.id === rejectId));
                rejectTransfer(rejectId, rejectReason || "no reason");
                toast.success("Transfer rejected & wallet refunded");
                setRejectId(null); refresh();
              }
            }}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund modal */}
      <Dialog open={!!refundId} onOpenChange={o => !o && setRefundId(null)}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Issue Refund</DialogTitle></DialogHeader>
          <Label>Reason</Label>
          <Input value={refundReason} onChange={e => setRefundReason(e.target.value)} placeholder="Customer request / chargeback…" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRefundId(null)}>Cancel</Button>
            <Button onClick={async () => {
              if (refundId) {
                await refundWalletIfNeeded(transfers.find(x => x.id === refundId));
                const r = issueRefund(refundId, refundReason || "customer request");
                if (r) toast.success(`Refund of ${formatMoney(r.amount, r.currency)} issued`);
                setRefundId(null); refresh();
              }
            }}>Issue Refund</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
