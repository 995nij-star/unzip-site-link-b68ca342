import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Progressive lockout durations in minutes
const LOCKOUT_TIERS = [5, 15, 30, 60, 360, 720]; // 5m, 15m, 30m, 1h, 6h, 12h

function getLockoutMinutes(lockoutCount: number): number {
  const index = Math.min(lockoutCount, LOCKOUT_TIERS.length - 1);
  return LOCKOUT_TIERS[index];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, success } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ blocked: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const normalizedEmail = email.trim().toLowerCase();

    // SECURITY: A success=true call clears the caller's lockout counter.
    // Only trust it when accompanied by a valid Supabase JWT whose email
    // matches the reported one. Otherwise an unauthenticated attacker
    // could reset their own lockouts and continue brute-forcing.
    let verifiedSuccess = false;
    if (success === true) {
      const authHeader = req.headers.get("Authorization") || "";
      const token = authHeader.replace(/^Bearer\s+/i, "").trim();
      if (token) {
        try {
          const verifier = createClient(supabaseUrl, anonKey);
          const { data: userRes } = await verifier.auth.getUser(token);
          const jwtEmail = userRes?.user?.email?.trim().toLowerCase();
          if (jwtEmail && jwtEmail === normalizedEmail) verifiedSuccess = true;
        } catch (_e) {
          verifiedSuccess = false;
        }
      }
    }
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") || "unknown";

    // Check for admin manual lock first
    const { data: manualLock } = await supabase
      .from("account_locks")
      .select("*")
      .eq("email", normalizedEmail)
      .eq("is_locked", true)
      .eq("auto_locked", false)
      .maybeSingle();

    if (manualLock) {
      return new Response(
        JSON.stringify({
          blocked: true,
          remainingAttempts: 0,
          manualLock: true,
          message: manualLock.lock_reason
            ? `Account locked by admin: ${manualLock.lock_reason}`
            : "Your account has been locked by an administrator.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check existing auto-lock with progressive timeout
    const { data: autoLock } = await supabase
      .from("account_locks")
      .select("*")
      .eq("email", normalizedEmail)
      .eq("auto_locked", true)
      .maybeSingle();

    // Determine current lockout tier (how many times they've been locked out)
    const lockoutCount = autoLock?.failed_attempts
      ? Math.max(0, Math.floor((autoLock.failed_attempts - 5) / 5))
      : 0;
    const lockoutMinutes = autoLock ? getLockoutMinutes(lockoutCount) : LOCKOUT_TIERS[0];

    // If there's an active auto-lock, check if it's still within the lockout window
    if (autoLock?.is_locked) {
      const lockedAt = new Date(autoLock.locked_at).getTime();
      const lockoutMs = lockoutMinutes * 60 * 1000;
      const now = Date.now();

      if (now - lockedAt < lockoutMs) {
        const remainingMs = lockoutMs - (now - lockedAt);
        const remainingMin = Math.ceil(remainingMs / 60000);

        return new Response(
          JSON.stringify({
            blocked: true,
            remainingAttempts: 0,
            lockoutMinutes,
            remainingMinutes: remainingMin,
            message: `Too many failed attempts. Try again in ${remainingMin} minute${remainingMin !== 1 ? "s" : ""}.`,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        // Lockout expired — unlock so they can try again
        await supabase.from("account_locks")
          .update({
            is_locked: false,
            unlocked_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", autoLock.id);
      }
    }

    // Rate limit by IP: max 30 calls per 15 minutes
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    const { count: ipCallCount } = await supabase
      .from("login_attempts")
      .select("*", { count: "exact", head: true })
      .eq("ip_address", ip)
      .gte("created_at", fifteenMinAgo);

    if ((ipCallCount || 0) >= 30) {
      return new Response(
        JSON.stringify({
          blocked: true,
          remainingAttempts: 0,
          message: "Too many requests from this IP. Please try again later.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Record failed attempt
    if (success === false) {
      await supabase.from("login_attempts").insert({
        email: normalizedEmail,
        ip_address: ip,
        success: false,
      });
    }

    // Count recent failed attempts since last unlock/lock reset
    // Use the lockout window or 15 min, whichever is smaller for counting
    const windowAgo = new Date(Date.now() - Math.max(lockoutMinutes, 5) * 60 * 1000).toISOString();

    // SECURITY: Only count failed attempts that originated from the SAME IP
    // as the current caller. This prevents an unauthenticated attacker on
    // another network from injecting fake failures to lock a victim's account.
    const { count } = await supabase
      .from("login_attempts")
      .select("*", { count: "exact", head: true })
      .eq("email", normalizedEmail)
      .eq("ip_address", ip)
      .eq("success", false)
      .gte("created_at", windowAgo);

    const failedCount = count || 0;
    const isBlocked = failedCount >= 5;

    if (isBlocked) {
      // Calculate the new total failed attempts (cumulative for tier escalation)
      const prevTotal = autoLock?.failed_attempts || 0;
      const newTotal = Math.max(prevTotal + 1, failedCount);
      const newLockoutCount = Math.max(0, Math.floor((newTotal - 5) / 5));
      const newLockoutMinutes = getLockoutMinutes(newLockoutCount);

      if (!autoLock) {
        await supabase.from("account_locks").insert({
          email: normalizedEmail,
          is_locked: true,
          auto_locked: true,
          failed_attempts: newTotal,
          lock_reason: `Auto-locked: ${newTotal} failed attempts. Lockout: ${newLockoutMinutes} min.`,
        });
      } else {
        await supabase.from("account_locks")
          .update({
            is_locked: true,
            failed_attempts: newTotal,
            lock_reason: `Auto-locked: ${newTotal} failed attempts. Lockout: ${newLockoutMinutes} min.`,
            locked_at: new Date().toISOString(),
            unlocked_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", autoLock.id);
      }

      // Flag suspicious activity
      const { data: existing } = await supabase
        .from("suspicious_activities")
        .select("id")
        .eq("activity_type", "brute_force_login")
        .eq("ip_address", ip)
        .gte("created_at", fifteenMinAgo)
        .maybeSingle();

      if (!existing) {
        await supabase.from("suspicious_activities").insert({
          activity_type: "brute_force_login",
          description: `${newTotal} failed login attempts for ${normalizedEmail} from IP ${ip}. Lockout tier: ${newLockoutMinutes} min.`,
          ip_address: ip,
          severity: newLockoutMinutes >= 60 ? "critical" : "high",
        });
      }

      return new Response(
        JSON.stringify({
          blocked: true,
          remainingAttempts: 0,
          lockoutMinutes: newLockoutMinutes,
          remainingMinutes: newLockoutMinutes,
          message: `Too many failed attempts. Try again in ${newLockoutMinutes} minute${newLockoutMinutes !== 1 ? "s" : ""}.`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Record success
    if (verifiedSuccess) {
      await supabase.from("login_attempts").insert({
        email: normalizedEmail,
        ip_address: ip,
        success: true,
      });
      // Reset the auto-lock record on successful login
      if (autoLock) {
        await supabase.from("account_locks")
          .update({
            is_locked: false,
            failed_attempts: 0,
            unlocked_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", autoLock.id);
      }
    }

    return new Response(
      JSON.stringify({
        blocked: false,
        remainingAttempts: Math.max(0, 5 - failedCount),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Check login attempts error:", error);
    return new Response(
      JSON.stringify({ blocked: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
