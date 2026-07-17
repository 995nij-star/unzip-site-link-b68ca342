import { Link } from "react-router-dom";
import { ArrowLeft, Crown, Shield, Trophy, Wallet, Video, Sparkles, Check, Loader2 } from "lucide-react";
import { CyberButton } from "@/components/ui/cyber-button";
import { Card, CardContent } from "@/components/ui/card";
import { usePremium } from "@/hooks/usePremium";
import { cn } from "@/lib/utils";

const PERKS = [
  {
    icon: Shield,
    title: "Verified Premium Badge",
    desc: "Stand out with a glowing premium star and exclusive profile theme.",
  },
  {
    icon: Trophy,
    title: "Priority Tournament Entry",
    desc: "Skip queues and enjoy reduced entry fees on every match.",
  },
  {
    icon: Wallet,
    title: "Higher Withdrawal Limits",
    desc: "Faster processing and larger payouts straight to your UPI.",
  },
  {
    icon: Video,
    title: "Exclusive Clip Features",
    desc: "Upload longer 4K clips and unlock pro creator tools.",
  },
];

export default function Premium() {
  const { isPremium, loading } = usePremium();

  return (
    <div className="min-h-screen bg-background cyber-grid">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/80 border-b border-neon-purple/20">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/dashboard">
            <CyberButton variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </CyberButton>
          </Link>
          <div className="flex items-center gap-2">
            <Crown className="w-6 h-6 text-neon-purple" />
            <span className="font-orbitron font-bold text-lg text-gradient-neon">Premium</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl premium-card-featured p-8 md:p-12 mb-8 text-center">
          <div className="absolute inset-0 opacity-40 pointer-events-none">
            <div className="absolute top-0 left-1/4 w-72 h-72 bg-neon-purple/30 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-neon-blue/20 rounded-full blur-3xl" />
          </div>
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-neon-purple/40 bg-neon-purple/10 mb-4">
              <Sparkles className="w-4 h-4 text-neon-purple" />
              <span className="font-rajdhani text-xs uppercase tracking-widest text-neon-purple">
                Elite Tier
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-orbitron font-bold text-foreground mb-3">
              Unlock <span className="text-gradient-neon">Premium</span>
            </h1>
            <p className="text-muted-foreground font-rajdhani text-lg max-w-xl mx-auto mb-6">
              Get the badge, the perks, the edge. Premium access is granted by the Idexopn team.
            </p>

            {loading ? (
              <div className="inline-flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Checking status…
              </div>
            ) : isPremium ? (
              <div className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-neon-purple/15 border border-neon-purple/50 shadow-purple">
                <Crown className="w-5 h-5 text-neon-purple" />
                <span className="font-orbitron font-semibold text-foreground">
                  You're Premium
                </span>
              </div>
            ) : (
              <Link to="/help">
                <CyberButton variant="neon" size="lg">
                  <Crown className="w-5 h-5" />
                  Request Premium Access
                </CyberButton>
              </Link>
            )}
          </div>
        </div>

        {/* Perks grid */}
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          {PERKS.map((p) => {
            const Icon = p.icon;
            return (
              <Card
                key={p.title}
                className={cn(
                  "transition-all",
                  isPremium && "border-neon-purple/40 shadow-purple",
                )}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 w-10 h-10 rounded-lg bg-neon-purple/10 border border-neon-purple/30 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-neon-purple" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-orbitron font-semibold text-foreground">
                          {p.title}
                        </h3>
                        {isPremium && (
                          <Check className="w-4 h-4 text-neon-green" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground font-rajdhani mt-1">
                        {p.desc}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {!isPremium && !loading && (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="font-rajdhani text-muted-foreground">
                Premium is currently invite-based. Reach out via the Help Center to request
                an upgrade.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
