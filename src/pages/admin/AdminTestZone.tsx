import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Bot, Search, Send, Save, Loader2, CheckCircle2, XCircle, AlertTriangle, ShieldQuestion, History, RefreshCw, Radio, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

interface Profile {
  user_id: string;
  username: string | null;
  uid: string | null;
  email?: string | null;
  avatar_url?: string | null;
}

interface AnalysisResult {
  profile: any;
  signals: Record<string, any>;
  signal_score: number;
  ai: { verdict: string; confidence: number; reasoning: string };
  verdict: "human" | "bot" | "inconclusive";
  confidence: number;
}

export default function AdminTestZone() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [matches, setMatches] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Profile | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [issuingCaptcha, setIssuingCaptcha] = useState(false);
  const [lastChallenge, setLastChallenge] = useState<{ id: string; question: string } | null>(null);
  const [challengeStatus, setChallengeStatus] = useState<{ status: string; attempts: number; user_answer?: string | null; answered_at?: string | null; expires_at?: string | null } | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const progressRef = useRef<number | null>(null);

  const { data: history, refetch: refetchHistory } = useQuery({
    queryKey: ["bot_checks", selected?.user_id],
    queryFn: async () => {
      if (!selected) return [];
      const { data } = await supabase
        .from("bot_checks" as any)
        .select("*")
        .eq("target_user_id", selected.user_id)
        .order("created_at", { ascending: false })
        .limit(10);
      return (data ?? []) as any[];
    },
    enabled: !!selected,
  });

  // Realtime: bot_checks history for selected user
  useEffect(() => {
    if (!selected) return;
    const channel = supabase
      .channel(`tz-bot-checks-${selected.user_id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bot_checks", filter: `target_user_id=eq.${selected.user_id}` },
        () => {
          refetchHistory();
          setLastUpdatedAt(new Date());
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selected?.user_id, refetchHistory]);

  // Realtime: live status of issued CAPTCHA challenge
  useEffect(() => {
    if (!lastChallenge?.id) {
      setChallengeStatus(null);
      return;
    }
    let cancelled = false;
    // Initial fetch
    supabase
      .from("captcha_challenges" as any)
      .select("status, attempts, user_answer, answered_at, expires_at")
      .eq("id", lastChallenge.id)
      .maybeSingle()
      .then(({ data }: any) => {
        if (!cancelled && data) setChallengeStatus(data);
      });
    const channel = supabase
      .channel(`tz-captcha-${lastChallenge.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "captcha_challenges", filter: `id=eq.${lastChallenge.id}` },
        (payload) => {
          const n: any = payload.new;
          setChallengeStatus({
            status: n.status,
            attempts: n.attempts,
            user_answer: n.user_answer,
            answered_at: n.answered_at,
            expires_at: n.expires_at,
          });
          setLastUpdatedAt(new Date());
          if (n.status === "passed") {
            toast({ title: "User passed CAPTCHA", description: "Verified human via challenge." });
          } else if (n.status === "failed") {
            toast({ title: "User failed CAPTCHA", description: "Max attempts exceeded.", variant: "destructive" });
          }
        },
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [lastChallenge?.id, toast]);

  // Animated progress bar while analyzing
  useEffect(() => {
    if (analyzing) {
      setAnalysisProgress(5);
      progressRef.current = window.setInterval(() => {
        setAnalysisProgress((p) => (p < 90 ? p + Math.max(1, Math.round((92 - p) * 0.08)) : p));
      }, 250) as unknown as number;
    } else {
      if (progressRef.current) {
        clearInterval(progressRef.current);
        progressRef.current = null;
      }
      if (analysisProgress > 0) setAnalysisProgress(100);
      const t = window.setTimeout(() => setAnalysisProgress(0), 600);
      return () => clearTimeout(t);
    }
    return () => {
      if (progressRef.current) {
        clearInterval(progressRef.current);
        progressRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analyzing]);

  // Auto-refresh signals while a challenge is pending
  useEffect(() => {
    if (!autoRefresh || !selected || !result) return;
    if (challengeStatus && challengeStatus.status !== "pending") return;
    if (!challengeStatus && !lastChallenge) return;
    const id = window.setInterval(() => {
      runAnalysis();
    }, 20000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, selected?.user_id, challengeStatus?.status, lastChallenge?.id]);


  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = search.trim();
    if (!q) return;
    setSearching(true);
    setMatches([]);
    let query = supabase.from("profiles").select("user_id, username, uid, email, avatar_url").limit(10);
    if (/^\d{10}$/.test(q)) query = query.eq("uid", q);
    else query = query.or(`username.ilike.%${q}%,email.ilike.%${q}%,uid.ilike.%${q}%`);
    const { data, error } = await query;
    setSearching(false);
    if (error) {
      toast({ title: "Search failed", description: error.message, variant: "destructive" });
      return;
    }
    setMatches((data ?? []) as Profile[]);
    if ((data ?? []).length === 0) toast({ title: "No matches", description: "No user found." });
  };

  const selectUser = (p: Profile) => {
    setSelected(p);
    setMatches([]);
    setSearch("");
    setResult(null);
    setLastChallenge(null);
    setChallengeStatus(null);
    setNotes("");
    setLastUpdatedAt(null);
  };

  const callFn = async (action: string, extra: Record<string, any> = {}) => {
    return supabase.functions.invoke("bot-test-zone", {
      body: { action, target_user_id: selected!.user_id, ...extra },
    });
  };

  const runAnalysis = async () => {
    if (!selected) return;
    setAnalyzing(true);
    const { data, error } = await callFn("analyze");
    setAnalyzing(false);
    if (error || (data as any)?.error) {
      toast({ title: "Analysis failed", description: error?.message || (data as any)?.error, variant: "destructive" });
      return;
    }
    setResult(data as AnalysisResult);
    setLastUpdatedAt(new Date());
  };

  const issueCaptcha = async () => {
    if (!selected) return;
    setIssuingCaptcha(true);
    const { data, error } = await callFn("issue_captcha");
    setIssuingCaptcha(false);
    if (error || (data as any)?.error) {
      toast({ title: "Failed to send challenge", description: error?.message || (data as any)?.error, variant: "destructive" });
      return;
    }
    const ch = (data as any).challenge;
    setLastChallenge({ id: ch.id, question: ch.question });
    setChallengeStatus({ status: "pending", attempts: 0, expires_at: ch.expires_at });
    setLastUpdatedAt(new Date());
    toast({ title: "Challenge sent", description: "User has been notified. Live status will update here." });
  };


  const saveVerdict = async () => {
    if (!selected || !result) return;
    setSaving(true);
    const { error } = await callFn("save_verdict", {
      verdict: result.verdict,
      confidence: result.confidence,
      signal_score: result.signal_score,
      ai_verdict: result.ai.verdict,
      ai_reasoning: result.ai.reasoning,
      signals: result.signals,
      captcha_challenge_id: lastChallenge?.id,
      notes,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Verdict saved", description: "Audit record created." });
    refetchHistory();
  };

  const verdictBadge = (v: string) => {
    const cls = v === "bot" ? "bg-destructive/15 text-destructive border-destructive/30"
      : v === "human" ? "bg-neon-green/15 text-neon-green border-neon-green/30"
      : "bg-neon-orange/15 text-neon-orange border-neon-orange/30";
    const Icon = v === "bot" ? XCircle : v === "human" ? CheckCircle2 : AlertTriangle;
    return (
      <Badge variant="outline" className={`${cls} font-orbitron uppercase gap-1`}>
        <Icon className="w-3 h-3" /> {v}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-neon-purple/15 border border-neon-purple/30">
          <Bot className="w-6 h-6 text-neon-purple" />
        </div>
        <div>
          <h1 className="text-2xl font-orbitron font-bold">Test Zone</h1>
          <p className="text-sm text-muted-foreground font-rajdhani">
            Pick one user. Run signal + AI analysis. Optionally challenge them with a CAPTCHA.
          </p>
        </div>
      </div>

      {/* Search */}
      <Card className="p-4 mb-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by username, email, or 10-digit UID"
          />
          <Button type="submit" disabled={searching}>
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span className="ml-2">Search</span>
          </Button>
        </form>
        {matches.length > 0 && (
          <div className="mt-3 space-y-1">
            {matches.map((m) => (
              <button
                key={m.user_id}
                onClick={() => selectUser(m)}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted/40 transition flex items-center justify-between"
              >
                <span className="font-rajdhani font-semibold">{m.username || "(no name)"}</span>
                <span className="text-xs text-muted-foreground">UID {m.uid}</span>
              </button>
            ))}
          </div>
        )}
      </Card>

      {!selected ? (
        <Card className="p-10 text-center text-muted-foreground">
          <ShieldQuestion className="w-10 h-10 mx-auto mb-3 opacity-50" />
          Search and select a user to begin.
        </Card>
      ) : (
        <>
          {/* Selected user header */}
          <Card className="p-4 mb-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Target</p>
                <p className="font-orbitron font-bold">{selected.username || "(no name)"}</p>
                <p className="text-xs text-muted-foreground">UID {selected.uid} · {selected.email}</p>
              </div>
              <div className="flex gap-2 items-center">
                <button
                  type="button"
                  onClick={() => setAutoRefresh((v) => !v)}
                  className={`text-xs px-2 py-1 rounded border font-rajdhani flex items-center gap-1 transition ${
                    autoRefresh
                      ? "bg-neon-green/15 border-neon-green/30 text-neon-green"
                      : "bg-muted/30 border-border/40 text-muted-foreground"
                  }`}
                  title="Toggle auto-refresh"
                >
                  <Radio className={`w-3 h-3 ${autoRefresh ? "animate-pulse" : ""}`} />
                  Live {autoRefresh ? "On" : "Off"}
                </button>
                <Button variant="outline" onClick={() => setSelected(null)}>Change</Button>
                <Button onClick={runAnalysis} disabled={analyzing}>
                  {analyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Bot className="w-4 h-4 mr-2" />}
                  {result ? "Re-run Analysis" : "Run Analysis"}
                </Button>
              </div>
            </div>
            {(analyzing || analysisProgress > 0) && (
              <div className="mt-3 space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-rajdhani">
                  <span className="flex items-center gap-1">
                    <Loader2 className={`w-3 h-3 ${analyzing ? "animate-spin" : ""}`} />
                    {analyzing ? "Gathering signals & running AI…" : "Done"}
                  </span>
                  <span>{analysisProgress}%</span>
                </div>
                <Progress value={analysisProgress} className="h-1.5" />
              </div>
            )}
            {lastUpdatedAt && (
              <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Last updated {lastUpdatedAt.toLocaleTimeString()}
              </p>
            )}
          </Card>


          {/* Results */}
          {result && (
            <Card className="p-4 mb-4 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">Combined verdict:</span>
                  {verdictBadge(result.verdict)}
                  <span className="text-sm font-orbitron font-bold">{result.confidence}%</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Signal score: <b className="text-foreground">{result.signal_score}</b>/100</span>
                  <span>·</span>
                  <span>AI: {result.ai.verdict} ({result.ai.confidence}%)</span>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">AI reasoning</p>
                <p className="text-sm font-rajdhani p-3 rounded-lg bg-muted/30 border border-border/40">{result.ai.reasoning}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-2">Signals</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-rajdhani">
                  {Object.entries(result.signals).filter(([k]) => k !== "lastCaptcha").map(([k, v]) => (
                    <div key={k} className="px-2 py-1 rounded bg-muted/20 border border-border/30 flex justify-between gap-2">
                      <span className="text-muted-foreground truncate">{k}</span>
                      <span className="font-bold truncate">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button variant="secondary" onClick={issueCaptcha} disabled={issuingCaptcha || (challengeStatus?.status === "pending")}>
                  {issuingCaptcha ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                  {challengeStatus?.status === "pending" ? "Challenge Pending…" : "Send CAPTCHA Challenge"}
                </Button>
                <Button variant="ghost" size="sm" onClick={runAnalysis} disabled={analyzing} className="self-center">
                  <RefreshCw className={`w-3 h-3 mr-1 ${analyzing ? "animate-spin" : ""}`} /> Refresh signals
                </Button>
              </div>

              {lastChallenge && (
                <div className="rounded-lg border border-border/40 bg-muted/20 p-3 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <p className="text-xs font-orbitron uppercase text-muted-foreground flex items-center gap-1">
                      <Radio className={`w-3 h-3 ${challengeStatus?.status === "pending" ? "text-neon-orange animate-pulse" : "text-muted-foreground"}`} />
                      Live Challenge Status
                    </p>
                    {(() => {
                      const s = challengeStatus?.status ?? "pending";
                      const cls =
                        s === "passed" ? "bg-neon-green/15 text-neon-green border-neon-green/30"
                        : s === "failed" || s === "expired" ? "bg-destructive/15 text-destructive border-destructive/30"
                        : "bg-neon-orange/15 text-neon-orange border-neon-orange/30";
                      return <Badge variant="outline" className={`${cls} font-orbitron uppercase`}>{s}</Badge>;
                    })()}
                  </div>
                  <p className="text-xs font-rajdhani"><span className="text-muted-foreground">Question:</span> "{lastChallenge.question}"</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-rajdhani">
                    <div className="px-2 py-1 rounded bg-muted/20 border border-border/30 flex justify-between gap-2">
                      <span className="text-muted-foreground">Attempts</span>
                      <span className="font-bold">{challengeStatus?.attempts ?? 0} / 3</span>
                    </div>
                    <div className="px-2 py-1 rounded bg-muted/20 border border-border/30 flex justify-between gap-2">
                      <span className="text-muted-foreground">Answered</span>
                      <span className="font-bold">{challengeStatus?.answered_at ? new Date(challengeStatus.answered_at).toLocaleTimeString() : "—"}</span>
                    </div>
                    <div className="px-2 py-1 rounded bg-muted/20 border border-border/30 flex justify-between gap-2">
                      <span className="text-muted-foreground">User answer</span>
                      <span className="font-bold truncate">{challengeStatus?.user_answer ?? "—"}</span>
                    </div>
                  </div>
                </div>
              )}


              <div className="space-y-2">
                <Textarea placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
                <Button onClick={saveVerdict} disabled={saving} className="w-full">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Verdict to Audit Log
                </Button>
              </div>
            </Card>
          )}

          {/* History */}
          {history && history.length > 0 && (
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <History className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-orbitron font-bold">Past checks for this user</h3>
              </div>
              <div className="space-y-2">
                {history.map((h: any) => (
                  <div key={h.id} className="p-3 rounded-lg bg-muted/20 border border-border/30 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {verdictBadge(h.verdict)}
                        <span className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString()}</span>
                      </div>
                      <span className="text-xs">conf {h.confidence}% · score {h.signal_score}</span>
                    </div>
                    {h.ai_reasoning && <p className="text-xs text-muted-foreground">{h.ai_reasoning}</p>}
                    {h.notes && <p className="text-xs italic mt-1">"{h.notes}"</p>}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
