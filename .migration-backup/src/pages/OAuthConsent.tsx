import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ShieldCheck, XCircle } from "lucide-react";

// Local typed wrapper for the beta supabase.auth.oauth namespace.
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
};
const oauth = () => (supabase.auth as any).oauth as OAuthApi;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("Missing authorization_id");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/login?next=" + encodeURIComponent(next);
        return;
      }
      try {
        const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
        if (!active) return;
        if (error) return setError(error.message ?? "Could not load authorization");
        const immediate = data?.redirect_url ?? data?.redirect_to;
        if (immediate && !data?.client) {
          window.location.href = immediate;
          return;
        }
        setDetails(data);
      } catch (e: any) {
        setError(e?.message ?? "Could not load authorization");
      }
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    try {
      const { data, error } = approve
        ? await oauth().approveAuthorization(authorizationId)
        : await oauth().denyAuthorization(authorizationId);
      if (error) {
        setBusy(false);
        return setError(error.message ?? "Authorization failed");
      }
      const target = data?.redirect_url ?? data?.redirect_to;
      if (!target) {
        setBusy(false);
        return setError("No redirect returned by the authorization server.");
      }
      window.location.href = target;
    } catch (e: any) {
      setBusy(false);
      setError(e?.message ?? "Authorization failed");
    }
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-border/40 bg-card/40 backdrop-blur-xl p-8 shadow-2xl">
        {error ? (
          <div className="text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center">
              <XCircle className="w-7 h-7 text-destructive" />
            </div>
            <h1 className="text-xl font-orbitron font-bold">Authorization error</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        ) : !details ? (
          <div className="flex flex-col items-center gap-3 py-10">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading authorization…</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center space-y-3">
              <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                <ShieldCheck className="w-7 h-7 text-primary" />
              </div>
              <h1 className="text-xl font-orbitron font-bold">
                Connect {details.client?.name ?? "an app"} to your account
              </h1>
              <p className="text-sm text-muted-foreground">
                This lets {details.client?.name ?? "the client"} use XT eSports as you while
                you are signed in.
              </p>
            </div>

            <div className="rounded-xl border border-border/40 bg-background/40 p-4 text-sm space-y-2">
              {details.client?.redirect_uri && (
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Redirect</span>
                  <span className="truncate font-mono text-xs">
                    {details.client.redirect_uri}
                  </span>
                </div>
              )}
              {details.scope && (
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Scope</span>
                  <span className="font-mono text-xs">{details.scope}</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground pt-2 border-t border-border/40">
                This does not bypass RLS or account policies — the client only sees data your
                account can see.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                disabled={busy}
                onClick={() => decide(false)}
                className="flex-1 h-11 rounded-xl border border-border/40 bg-background/40 hover:bg-background/60 text-sm font-semibold transition disabled:opacity-50"
              >
                Cancel connection
              </button>
              <button
                disabled={busy}
                onClick={() => decide(true)}
                className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-semibold transition disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                Approve
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
