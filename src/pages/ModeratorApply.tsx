import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, Link } from "react-router-dom";
import { CyberButton } from "@/components/ui/cyber-button";
import { CyberInput } from "@/components/ui/cyber-input";
import { ProfileDropdown } from "@/components/ProfileDropdown";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Gamepad2,
  LogOut,
  ArrowLeft,
  Shield,
  Send,
  Loader2,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";

export default function ModeratorApply() {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [reason, setReason] = useState("");
  const [experience, setExperience] = useState("");
  const [gamingKnowledge, setGamingKnowledge] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [existingApp, setExistingApp] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchExisting = async () => {
      const { data } = await supabase
        .from("mod_applications" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);
      if (data && (data as any[]).length > 0) {
        setExistingApp((data as any[])[0]);
      }
      setLoading(false);
    };
    fetchExisting();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    if (!reason.trim() || !experience.trim() || !gamingKnowledge) {
      toast({ title: "Missing fields", description: "Please fill in all fields.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("mod_applications" as any).insert({
      user_id: user.id,
      username: profile.username || "Unknown",
      email: user.email || "",
      reason: reason.trim(),
      experience: experience.trim(),
      gaming_knowledge: gamingKnowledge,
    } as any);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Application Submitted!", description: "Your moderator application is now under review." });
      // Refetch
      const { data } = await supabase
        .from("mod_applications" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);
      if (data && (data as any[]).length > 0) setExistingApp((data as any[])[0]);
    }
    setSubmitting(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-neon-green/20 text-neon-green border-neon-green/30 font-rajdhani"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive" className="font-rajdhani"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge className="bg-neon-orange/20 text-neon-orange border-neon-orange/30 font-rajdhani"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard">
              <Gamepad2 className="w-8 h-8 text-primary" />
            </Link>
            <h1 className="text-xl font-orbitron font-bold text-foreground hidden sm:block">
              Moderator Application
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <NotificationDropdown />
            <ProfileDropdown />
            <CyberButton variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4" />
            </CyberButton>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <CyberButton variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </CyberButton>

        {/* Hero */}
        <div className="bg-gradient-card rounded-xl border border-border p-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 border border-primary/30 mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-orbitron font-bold text-foreground mb-2">
            Become a Moderator
          </h2>
          <p className="text-muted-foreground font-rajdhani max-w-md mx-auto">
            Help keep the community safe by moderating chats, managing tournaments, and assisting fellow gamers.
          </p>
        </div>

        {/* Moderator Perks */}
        <div className="bg-gradient-card rounded-xl border border-border p-5">
          <h3 className="text-lg font-orbitron font-bold text-foreground mb-3">Moderator Privileges</h3>
          <ul className="premium-list has-custom-marker font-rajdhani text-sm text-muted-foreground">
            <li><CheckCircle className="w-4 h-4 text-neon-green shrink-0 mt-0.5" /> Moderate chat messages</li>
            <li><CheckCircle className="w-4 h-4 text-neon-green shrink-0 mt-0.5" /> Report suspicious users</li>
            <li><CheckCircle className="w-4 h-4 text-neon-green shrink-0 mt-0.5" /> Help manage tournaments</li>
            <li><CheckCircle className="w-4 h-4 text-neon-green shrink-0 mt-0.5" /> Assist users with issues</li>
          </ul>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : existingApp ? (
          /* Existing Application Status */
          <div className="bg-gradient-card rounded-xl border border-border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-orbitron font-bold text-foreground">Your Application</h3>
              {getStatusBadge(existingApp.status)}
            </div>
            <div className="space-y-3 font-rajdhani text-sm">
              <div>
                <span className="text-muted-foreground">Submitted:</span>
                <span className="ml-2 text-foreground">{new Date(existingApp.created_at).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Reason:</span>
                <p className="text-foreground mt-1">{existingApp.reason}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Experience:</span>
                <p className="text-foreground mt-1">{existingApp.experience}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Gaming Knowledge:</span>
                <span className="ml-2 text-foreground capitalize">{existingApp.gaming_knowledge}</span>
              </div>
              {existingApp.admin_notes && (
                <div className="bg-background/50 rounded-lg p-3 border border-border">
                  <span className="text-muted-foreground">Admin Notes:</span>
                  <p className="text-foreground mt-1">{existingApp.admin_notes}</p>
                </div>
              )}
            </div>
            {existingApp.status === "rejected" && (
              <CyberButton
                className="w-full"
                onClick={() => setExistingApp(null)}
              >
                <Send className="w-4 h-4 mr-2" />
                Apply Again
              </CyberButton>
            )}
          </div>
        ) : (
          /* Application Form */
          <form onSubmit={handleSubmit} className="bg-gradient-card rounded-xl border border-border p-6 space-y-5">
            <h3 className="text-lg font-orbitron font-bold text-foreground">Application Form</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-rajdhani text-muted-foreground mb-1 block">Username</label>
                <CyberInput value={profile?.username || ""} disabled />
              </div>
              <div>
                <label className="text-sm font-rajdhani text-muted-foreground mb-1 block">Email</label>
                <CyberInput value={user?.email || ""} disabled />
              </div>
            </div>

            <div>
              <label className="text-sm font-rajdhani text-muted-foreground mb-1 block">Gaming Knowledge Level</label>
              <Select value={gamingKnowledge} onValueChange={setGamingKnowledge}>
                <SelectTrigger className="bg-background/50 border-border font-rajdhani">
                  <SelectValue placeholder="Select your level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                  <SelectItem value="expert">Expert</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-rajdhani text-muted-foreground mb-1 block">Moderation Experience</label>
              <Textarea
                placeholder="Describe any previous moderation experience (Discord servers, gaming communities, etc.)"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                className="bg-background/50 border-border font-rajdhani min-h-[100px]"
                maxLength={1000}
              />
            </div>

            <div>
              <label className="text-sm font-rajdhani text-muted-foreground mb-1 block">Why do you want to be a moderator?</label>
              <Textarea
                placeholder="Tell us why you'd be a great moderator for this community..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="bg-background/50 border-border font-rajdhani min-h-[100px]"
                maxLength={1000}
              />
            </div>

            <CyberButton type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
              ) : (
                <><Send className="w-4 h-4 mr-2" /> Submit Application</>
              )}
            </CyberButton>
          </form>
        )}
      </main>
    </div>
  );
}
