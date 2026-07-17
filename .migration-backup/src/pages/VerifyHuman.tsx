import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Loader2, CheckCircle2, XCircle } from "lucide-react";

interface Challenge {
  id: string;
  question: string;
  status: string;
  attempts: number;
  expires_at: string;
}

export default function VerifyHuman() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("captcha_challenges_public" as any)
        .select("id, question, status, attempts, expires_at")
        .eq("target_user_id", user.id)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setChallenge((data as any) ?? null);
      setLoading(false);
    };
    load();
  }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challenge) return;
    setSubmitting(true);
    const { data, error } = await supabase.rpc("submit_captcha_answer" as any, {
      p_challenge_id: challenge.id,
      p_answer: answer,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    const r = data as any;
    if (r.passed) {
      toast({ title: "Verified!", description: "Thanks for confirming you're human." });
      setChallenge({ ...challenge, status: "passed" });
    } else if (r.status === "failed") {
      toast({ title: "Failed", description: "Too many wrong attempts.", variant: "destructive" });
      setChallenge({ ...challenge, status: "failed" });
    } else {
      toast({ title: "Wrong answer", description: `${r.attempts_remaining} attempts left.`, variant: "destructive" });
      setAnswer("");
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="p-6 max-w-md w-full">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="w-6 h-6 text-neon-purple" />
          <h1 className="text-xl font-orbitron font-bold">Human Verification</h1>
        </div>

        {!challenge ? (
          <p className="text-sm text-muted-foreground font-rajdhani">No pending verification challenge for your account.</p>
        ) : challenge.status === "passed" ? (
          <div className="text-center py-4">
            <CheckCircle2 className="w-12 h-12 text-neon-green mx-auto mb-2" />
            <p className="font-rajdhani">Verified successfully.</p>
          </div>
        ) : challenge.status === "failed" || challenge.status === "expired" ? (
          <div className="text-center py-4">
            <XCircle className="w-12 h-12 text-destructive mx-auto mb-2" />
            <p className="font-rajdhani">Challenge {challenge.status}.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <p className="text-sm text-muted-foreground font-rajdhani">
              An admin has asked you to verify you're a real person. Please answer the question below:
            </p>
            <div className="p-4 rounded-lg bg-muted/30 border border-border/40 font-orbitron text-lg text-center">
              {challenge.question}
            </div>
            <Input
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Your answer"
              required
              autoFocus
            />
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Submit
            </Button>
            <p className="text-xs text-muted-foreground text-center">3 attempts allowed. Expires in 15 min.</p>
          </form>
        )}
      </Card>
    </div>
  );
}
