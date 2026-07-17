// Placeholder Money Transfer service.
// NOTE: This does NOT process real financial transactions. All data is stored
// in localStorage. Integrate a licensed provider (Stripe, PayPal, Wise, etc.)
// before enabling real transfers.

export type Currency =
  | "USD" | "INR" | "EUR" | "GBP" | "AED" | "SAR" | "JPY"
  | "AUD" | "CAD" | "SGD" | "CHF" | "CNY" | "HKD" | "NZD"
  | "ZAR" | "BRL" | "MXN" | "TRY" | "THB" | "MYR" | "IDR"
  | "PHP" | "KRW" | "RUB" | "NGN" | "PKR" | "BDT" | "LKR";

export type PaymentMethod =
  | "wallet"
  | "bank_transfer"
  | "card"
  | "upi"
  | "paypal"
  | "apple_pay"
  | "google_pay"
  | "crypto_usdt"
  | "crypto_btc"
  | "crypto_eth";

export type TransferStatus =
  | "pending" | "processing" | "completed" | "failed" | "cancelled";

export interface Country {
  code: string;
  name: string;
  flag: string;
  currency: Currency;
  dialCode: string;
}

export interface Recipient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  walletId?: string;
  countryCode: string;
  currency: Currency;
  favorite: boolean;
  createdAt: string;
  ownerUserId?: string;
}

export interface Transfer {
  id: string;
  recipient: Omit<Recipient, "favorite" | "createdAt"> & { favorite?: boolean };
  sendAmount: number;
  sendCurrency: Currency;
  receiveAmount: number;
  receiveCurrency: Currency;
  exchangeRate: number;
  fee: number;
  totalDebit: number;
  paymentMethod: PaymentMethod;
  message?: string;
  status: TransferStatus;
  createdAt: string;
  updatedAt: string;
  reference: string;
  senderUserId?: string;
}


// ---- Static data ----

export const COUNTRIES: Country[] = [
  { code: "US", name: "United States", flag: "🇺🇸", currency: "USD", dialCode: "+1" },
  { code: "IN", name: "India", flag: "🇮🇳", currency: "INR", dialCode: "+91" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", currency: "GBP", dialCode: "+44" },
  { code: "DE", name: "Germany", flag: "🇩🇪", currency: "EUR", dialCode: "+49" },
  { code: "FR", name: "France", flag: "🇫🇷", currency: "EUR", dialCode: "+33" },
  { code: "ES", name: "Spain", flag: "🇪🇸", currency: "EUR", dialCode: "+34" },
  { code: "IT", name: "Italy", flag: "🇮🇹", currency: "EUR", dialCode: "+39" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱", currency: "EUR", dialCode: "+31" },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪", currency: "AED", dialCode: "+971" },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦", currency: "SAR", dialCode: "+966" },
  { code: "JP", name: "Japan", flag: "🇯🇵", currency: "JPY", dialCode: "+81" },
  { code: "AU", name: "Australia", flag: "🇦🇺", currency: "AUD", dialCode: "+61" },
  { code: "CA", name: "Canada", flag: "🇨🇦", currency: "CAD", dialCode: "+1" },
  { code: "SG", name: "Singapore", flag: "🇸🇬", currency: "SGD", dialCode: "+65" },
  { code: "CH", name: "Switzerland", flag: "🇨🇭", currency: "CHF", dialCode: "+41" },
  { code: "CN", name: "China", flag: "🇨🇳", currency: "CNY", dialCode: "+86" },
  { code: "HK", name: "Hong Kong", flag: "🇭🇰", currency: "HKD", dialCode: "+852" },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿", currency: "NZD", dialCode: "+64" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦", currency: "ZAR", dialCode: "+27" },
  { code: "BR", name: "Brazil", flag: "🇧🇷", currency: "BRL", dialCode: "+55" },
  { code: "MX", name: "Mexico", flag: "🇲🇽", currency: "MXN", dialCode: "+52" },
  { code: "TR", name: "Türkiye", flag: "🇹🇷", currency: "TRY", dialCode: "+90" },
  { code: "TH", name: "Thailand", flag: "🇹🇭", currency: "THB", dialCode: "+66" },
  { code: "MY", name: "Malaysia", flag: "🇲🇾", currency: "MYR", dialCode: "+60" },
  { code: "ID", name: "Indonesia", flag: "🇮🇩", currency: "IDR", dialCode: "+62" },
  { code: "PH", name: "Philippines", flag: "🇵🇭", currency: "PHP", dialCode: "+63" },
  { code: "KR", name: "South Korea", flag: "🇰🇷", currency: "KRW", dialCode: "+82" },
  { code: "RU", name: "Russia", flag: "🇷🇺", currency: "RUB", dialCode: "+7" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬", currency: "NGN", dialCode: "+234" },
  { code: "PK", name: "Pakistan", flag: "🇵🇰", currency: "PKR", dialCode: "+92" },
  { code: "BD", name: "Bangladesh", flag: "🇧🇩", currency: "BDT", dialCode: "+880" },
  { code: "LK", name: "Sri Lanka", flag: "🇱🇰", currency: "LKR", dialCode: "+94" },
];

// Static reference rates vs 1 USD (placeholder — replace with live FX API).
const USD_RATES: Record<Currency, number> = {
  USD: 1, INR: 83.2, EUR: 0.92, GBP: 0.79, AED: 3.67, SAR: 3.75, JPY: 149.5,
  AUD: 1.52, CAD: 1.36, SGD: 1.34, CHF: 0.88, CNY: 7.24, HKD: 7.81, NZD: 1.64,
  ZAR: 18.4, BRL: 4.98, MXN: 17.1, TRY: 32.5, THB: 35.6, MYR: 4.72, IDR: 15650,
  PHP: 56.2, KRW: 1330, RUB: 92.5, NGN: 1580, PKR: 278, BDT: 110, LKR: 302,
};

export const CURRENCIES: Currency[] = Object.keys(USD_RATES) as Currency[];

export const PAYMENT_METHODS: {
  id: PaymentMethod; label: string; icon: string; description: string;
}[] = [
  { id: "wallet", label: "Wallet Balance", icon: "💠", description: "Instant · from your Idexopn wallet" },
  { id: "bank_transfer", label: "Bank Transfer", icon: "🏦", description: "1–3 business days · low fee" },
  { id: "card", label: "Debit / Credit Card", icon: "💳", description: "Instant · Visa, Mastercard, Amex" },
  { id: "upi", label: "UPI", icon: "🇮🇳", description: "Instant · India only" },
  { id: "paypal", label: "PayPal", icon: "🅿️", description: "Instant · Global" },
  { id: "apple_pay", label: "Apple Pay", icon: "", description: "Instant · iOS / Safari" },
  { id: "google_pay", label: "Google Pay", icon: "🇬", description: "Instant · Android / Chrome" },
  { id: "crypto_usdt", label: "USDT", icon: "₮", description: "Crypto · Tether (TRC-20)" },
  { id: "crypto_btc", label: "Bitcoin", icon: "₿", description: "Crypto · BTC network" },
  { id: "crypto_eth", label: "Ethereum", icon: "Ξ", description: "Crypto · ERC-20" },
];

// ---- FX & fees ----

export function getExchangeRate(from: Currency, to: Currency): number {
  if (from === to) return 1;
  // convert via USD
  const rate = USD_RATES[to] / USD_RATES[from];
  return Number(rate.toFixed(6));
}

export function calculateFee(
  amount: number,
  method: PaymentMethod,
  crossBorder: boolean
): number {
  const base = crossBorder ? amount * 0.015 : amount * 0.005;
  const methodMultiplier: Record<PaymentMethod, number> = {
    wallet: 0, bank_transfer: 1, card: 1.6, upi: 0.4,
    paypal: 1.8, apple_pay: 1.4, google_pay: 1.4,
    crypto_usdt: 0.6, crypto_btc: 0.9, crypto_eth: 0.9,
  };
  return Number((base * methodMultiplier[method] + (method === "wallet" ? 0 : 0.25)).toFixed(2));
}

export const TRANSFER_LIMITS = {
  perTransaction: 10000,
  daily: 25000,
  monthly: 100000,
};

// ---- localStorage-backed persistence ----

const RECIPIENTS_KEY = "idx.moneyTransfer.recipients";
const TRANSFERS_KEY = "idx.moneyTransfer.transfers";

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function listRecipients(userId?: string): Recipient[] {
  const all = readJSON<Recipient[]>(RECIPIENTS_KEY, []);
  const scoped = userId ? all.filter(r => (r.ownerUserId ?? null) === userId) : all;
  return scoped.sort(
    (a, b) => Number(b.favorite) - Number(a.favorite) ||
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function saveRecipient(
  r: Omit<Recipient, "id" | "createdAt" | "favorite"> & { favorite?: boolean },
  userId?: string
): Recipient {
  const all = readJSON<Recipient[]>(RECIPIENTS_KEY, []);
  const rec: Recipient = {
    ...r,
    favorite: r.favorite ?? false,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ownerUserId: userId ?? r.ownerUserId,
  };
  writeJSON(RECIPIENTS_KEY, [rec, ...all]);
  return rec;
}

export function toggleFavorite(id: string) {
  const all = readJSON<Recipient[]>(RECIPIENTS_KEY, []).map(r => r.id === id ? { ...r, favorite: !r.favorite } : r);
  writeJSON(RECIPIENTS_KEY, all);
}

export function deleteRecipient(id: string) {
  writeJSON(RECIPIENTS_KEY, readJSON<Recipient[]>(RECIPIENTS_KEY, []).filter(r => r.id !== id));
}

export function listTransfers(userId?: string): Transfer[] {
  const all = readJSON<Transfer[]>(TRANSFERS_KEY, []);
  const scoped = userId ? all.filter(t => (t.senderUserId ?? null) === userId) : all;
  return scoped.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function recordTransfer(
  t: Omit<Transfer, "id" | "createdAt" | "updatedAt" | "status" | "reference">,
  userId?: string
): Transfer {
  const all = readJSON<Transfer[]>(TRANSFERS_KEY, []);
  const now = new Date().toISOString();
  const transfer: Transfer = {
    ...t,
    id: crypto.randomUUID(),
    reference: "IDX-" + Math.random().toString(36).slice(2, 10).toUpperCase(),
    status: "pending",
    createdAt: now,
    updatedAt: now,
    senderUserId: userId ?? t.senderUserId,
  };
  writeJSON(TRANSFERS_KEY, [transfer, ...all]);
  return transfer;
}

export function updateTransferStatus(id: string, status: TransferStatus, note?: string) {
  const all = readJSON<Transfer[]>(TRANSFERS_KEY, []).map(t =>
    t.id === id
      ? { ...t, status, updatedAt: new Date().toISOString(), message: note ? `${t.message ? t.message + " · " : ""}[admin] ${note}` : t.message }
      : t
  );
  writeJSON(TRANSFERS_KEY, all);
}


// ================= ADMIN CONTROL PLANE =================
// Placeholder admin surface backed by localStorage. Replace with server APIs
// once a licensed payment provider is wired in.

const ADMIN_SETTINGS_KEY = "idx.moneyTransfer.adminSettings";
const ADMIN_RATE_OVERRIDES_KEY = "idx.moneyTransfer.rateOverrides";
const ADMIN_DISABLED_COUNTRIES_KEY = "idx.moneyTransfer.disabledCountries";
const ADMIN_DISABLED_CURRENCIES_KEY = "idx.moneyTransfer.disabledCurrencies";
const ADMIN_REFUNDS_KEY = "idx.moneyTransfer.refunds";

export interface AdminSettings {
  baseFeePct: number;
  crossBorderFeePct: number;
  flatFee: number;
  minTransfer: number;
  maxTransfer: number;
  dailyLimit: number;
  monthlyLimit: number;
  autoApproveUnder: number;
  fraudFreezeOver: number;
  realtimeAlerts: boolean;
}

const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  baseFeePct: 0.5,
  crossBorderFeePct: 1.5,
  flatFee: 0.25,
  minTransfer: 1,
  maxTransfer: 10000,
  dailyLimit: 25000,
  monthlyLimit: 100000,
  autoApproveUnder: 500,
  fraudFreezeOver: 5000,
  realtimeAlerts: true,
};

export function getAdminSettings(): AdminSettings {
  return { ...DEFAULT_ADMIN_SETTINGS, ...readJSON<Partial<AdminSettings>>(ADMIN_SETTINGS_KEY, {}) };
}

export function saveAdminSettings(patch: Partial<AdminSettings>) {
  writeJSON(ADMIN_SETTINGS_KEY, { ...getAdminSettings(), ...patch });
}

export function getRateOverrides(): Partial<Record<Currency, number>> {
  return readJSON<Partial<Record<Currency, number>>>(ADMIN_RATE_OVERRIDES_KEY, {});
}

export function setRateOverride(currency: Currency, rate: number | null) {
  const cur = getRateOverrides();
  if (rate === null || Number.isNaN(rate)) delete cur[currency];
  else cur[currency] = rate;
  writeJSON(ADMIN_RATE_OVERRIDES_KEY, cur);
}

export function getEffectiveUsdRate(currency: Currency): number {
  return getRateOverrides()[currency] ?? USD_RATES[currency];
}

export function getDisabledCountries(): string[] {
  return readJSON<string[]>(ADMIN_DISABLED_COUNTRIES_KEY, []);
}

export function toggleCountry(code: string) {
  const cur = new Set(getDisabledCountries());
  if (cur.has(code)) cur.delete(code); else cur.add(code);
  writeJSON(ADMIN_DISABLED_COUNTRIES_KEY, [...cur]);
}

export function getDisabledCurrencies(): Currency[] {
  return readJSON<Currency[]>(ADMIN_DISABLED_CURRENCIES_KEY, []);
}

export function toggleCurrency(c: Currency) {
  const cur = new Set(getDisabledCurrencies());
  if (cur.has(c)) cur.delete(c); else cur.add(c);
  writeJSON(ADMIN_DISABLED_CURRENCIES_KEY, [...cur] as Currency[]);
}

export function adminListAllTransfers(): Transfer[] {
  return listTransfers();
}

export function approveTransfer(id: string) {
  updateTransferStatus(id, "processing", "approved");
  setTimeout(() => updateTransferStatus(id, "completed", "settled"), 1500);
}

export function rejectTransfer(id: string, reason: string) {
  updateTransferStatus(id, "cancelled", `rejected: ${reason}`);
}

export function freezeTransfer(id: string, reason: string) {
  updateTransferStatus(id, "failed", `frozen: ${reason}`);
}

export interface RefundRecord {
  id: string;
  transferId: string;
  amount: number;
  currency: Currency;
  reason: string;
  createdAt: string;
  status: "pending" | "issued";
}

export function listRefunds(): RefundRecord[] {
  return readJSON<RefundRecord[]>(ADMIN_REFUNDS_KEY, []).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function issueRefund(transferId: string, reason: string): RefundRecord | null {
  const t = listTransfers().find(x => x.id === transferId);
  if (!t) return null;
  const rec: RefundRecord = {
    id: crypto.randomUUID(),
    transferId,
    amount: t.totalDebit,
    currency: t.sendCurrency,
    reason,
    createdAt: new Date().toISOString(),
    status: "issued",
  };
  writeJSON(ADMIN_REFUNDS_KEY, [rec, ...listRefunds()]);
  updateTransferStatus(transferId, "cancelled", `refunded: ${reason}`);
  return rec;
}

export interface TransferAnalytics {
  totalCount: number;
  totalVolumeUsd: number;
  completed: number;
  pending: number;
  processing: number;
  failed: number;
  cancelled: number;
  successRate: number;
  avgTicketUsd: number;
  topCorridors: { pair: string; count: number; volumeUsd: number }[];
  volumeByDay: { date: string; volumeUsd: number; count: number }[];
}

export function computeAnalytics(): TransferAnalytics {
  const all = listTransfers();
  const toUsd = (amt: number, cur: Currency) => amt / getEffectiveUsdRate(cur);
  const byStatus = { completed: 0, pending: 0, processing: 0, failed: 0, cancelled: 0 };
  let volumeUsd = 0;
  const corridorMap = new Map<string, { count: number; volumeUsd: number }>();
  const dayMap = new Map<string, { volumeUsd: number; count: number }>();

  for (const t of all) {
    byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;
    const usd = toUsd(t.sendAmount, t.sendCurrency);
    volumeUsd += usd;
    const pair = `${t.sendCurrency} → ${t.receiveCurrency}`;
    const cur = corridorMap.get(pair) ?? { count: 0, volumeUsd: 0 };
    corridorMap.set(pair, { count: cur.count + 1, volumeUsd: cur.volumeUsd + usd });
    const day = t.createdAt.slice(0, 10);
    const d = dayMap.get(day) ?? { volumeUsd: 0, count: 0 };
    dayMap.set(day, { volumeUsd: d.volumeUsd + usd, count: d.count + 1 });
  }

  const totalCount = all.length;
  const successRate = totalCount ? (byStatus.completed / totalCount) * 100 : 0;
  return {
    totalCount,
    totalVolumeUsd: volumeUsd,
    ...byStatus,
    successRate,
    avgTicketUsd: totalCount ? volumeUsd / totalCount : 0,
    topCorridors: [...corridorMap.entries()]
      .map(([pair, v]) => ({ pair, ...v }))
      .sort((a, b) => b.volumeUsd - a.volumeUsd)
      .slice(0, 5),
    volumeByDay: [...dayMap.entries()]
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14),
  };
}

export function transfersToCsv(rows: Transfer[]): string {
  const headers = [
    "reference","createdAt","updatedAt","status","recipient","email","phone",
    "walletId","country","sendAmount","sendCurrency","receiveAmount",
    "receiveCurrency","exchangeRate","fee","totalDebit","paymentMethod","message",
  ];
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(",")];
  for (const t of rows) {
    lines.push([
      t.reference, t.createdAt, t.updatedAt, t.status,
      t.recipient.name, t.recipient.email ?? "", t.recipient.phone ?? "",
      t.recipient.walletId ?? "", t.recipient.countryCode,
      t.sendAmount, t.sendCurrency, t.receiveAmount, t.receiveCurrency,
      t.exchangeRate, t.fee, t.totalDebit, t.paymentMethod, t.message ?? "",
    ].map(escape).join(","));
  }
  return lines.join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Placeholder "processing pipeline" — simulates status progression.
export function simulateTransferProgress(id: string) {
  setTimeout(() => updateTransferStatus(id, "processing"), 1500);
  setTimeout(() => {
    // Small chance of simulated failure for fraud/limits demo
    const outcome: TransferStatus = Math.random() < 0.08 ? "failed" : "completed";
    updateTransferStatus(id, outcome);
  }, 4500);
}

// Placeholder OTP generator (returns the code so UI can display it).
// Real integration should send via SMS/email through a licensed provider.
export function issueMockOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function formatMoney(amount: number, currency: Currency): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "JPY" || currency === "KRW" || currency === "IDR" ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
