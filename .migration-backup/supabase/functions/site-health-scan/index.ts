import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Finding {
  id: string;
  category: "technical" | "database" | "security" | "payments" | "tournaments";
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  affected?: number;
  autoFixable?: boolean;
  fixAction?: string;
}

interface CategoryStatus {
  status: "ok" | "warning" | "critical";
  issues: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: isAdmin } = await adminClient.rpc("is_admin", { _user_id: user.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if this is an auto-fix request
    const body = await req.json().catch(() => ({}));
    if (body.action === "auto_fix") {
      return await handleAutoFix(adminClient, body.fixActions || []);
    }

    const findings: Finding[] = [];
    const startTime = Date.now();
    let findingId = 0;
    const nextId = () => `F-${++findingId}`;

    // ========================================================
    // TECHNICAL HEALTH SCAN
    // ========================================================

    // T1: Stale pending topup requests (>48h)
    const twoDaysAgo = new Date(Date.now() - 48 * 3600_000).toISOString();
    const { count: staleTopups } = await adminClient.from("topup_requests").select("*", { count: "exact", head: true }).eq("status", "pending").lt("created_at", twoDaysAgo);
    if (staleTopups && staleTopups > 0) {
      findings.push({ id: nextId(), category: "technical", severity: "warning", title: "Stale pending topup requests", description: `${staleTopups} topup request(s) pending for over 48 hours without admin action.`, affected: staleTopups });
    }

    // T2: Stale pending withdrawals (>48h)
    const { count: staleWithdrawals } = await adminClient.from("withdrawal_requests").select("*", { count: "exact", head: true }).eq("status", "pending").lt("created_at", twoDaysAgo);
    if (staleWithdrawals && staleWithdrawals > 0) {
      findings.push({ id: nextId(), category: "technical", severity: "warning", title: "Stale pending withdrawal requests", description: `${staleWithdrawals} withdrawal(s) pending over 48 hours.`, affected: staleWithdrawals });
    }

    // T3: High open support tickets
    const { count: openTickets } = await adminClient.from("support_tickets").select("*", { count: "exact", head: true }).eq("status", "open");
    if (openTickets && openTickets > 5) {
      findings.push({ id: nextId(), category: "technical", severity: openTickets > 20 ? "critical" : "warning", title: "High open support tickets", description: `${openTickets} support ticket(s) open and awaiting response.`, affected: openTickets });
    }

    // T4: Storage bucket check — public buckets that should be private
    // (message-attachments checked already in security hardening)

    // T5: Unresponsive edge functions check — measure our own response time
    const scanDuration = Date.now() - startTime; // we'll set this at the end

    // T6: Inactive users (no last_seen in 90 days but still have data)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 3600_000).toISOString();
    const { count: inactiveUsers } = await adminClient.from("profiles").select("*", { count: "exact", head: true }).lt("last_seen", ninetyDaysAgo).not("last_seen", "is", null);
    if (inactiveUsers && inactiveUsers > 50) {
      findings.push({ id: nextId(), category: "technical", severity: "info", title: "High number of inactive users", description: `${inactiveUsers} users haven't been active in 90+ days.`, affected: inactiveUsers });
    }

    // T7: Clips without thumbnails
    const { count: clipsNoThumb } = await adminClient.from("gaming_clips").select("*", { count: "exact", head: true }).is("thumbnail_url", null);
    if (clipsNoThumb && clipsNoThumb > 0) {
      findings.push({ id: nextId(), category: "technical", severity: "info", title: "Clips without thumbnails", description: `${clipsNoThumb} gaming clip(s) are missing thumbnail images.`, affected: clipsNoThumb });
    }

    // ========================================================
    // SECURITY SCAN
    // ========================================================

    // S1: Suspicious login attempts (failed attempts in last 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 3600_000).toISOString();
    const { data: recentFailedLogins } = await adminClient.from("login_attempts").select("email").eq("success", false).gt("created_at", oneDayAgo);
    if (recentFailedLogins && recentFailedLogins.length > 0) {
      // Group by email to detect brute force
      const emailCounts: Record<string, number> = {};
      for (const l of recentFailedLogins) {
        emailCounts[l.email] = (emailCounts[l.email] || 0) + 1;
      }
      const bruteForceTargets = Object.entries(emailCounts).filter(([, c]) => c >= 5);
      if (bruteForceTargets.length > 0) {
        findings.push({
          id: nextId(), category: "security", severity: "critical",
          title: "Possible brute force attacks detected",
          description: `${bruteForceTargets.length} email(s) received 5+ failed login attempts in the last 24 hours: ${bruteForceTargets.map(([e]) => e).slice(0, 3).join(", ")}${bruteForceTargets.length > 3 ? "..." : ""}`,
          affected: bruteForceTargets.length,
        });
      }
      if (recentFailedLogins.length >= 20) {
        findings.push({
          id: nextId(), category: "security", severity: "warning",
          title: "High volume of failed login attempts",
          description: `${recentFailedLogins.length} failed login attempts in the last 24 hours.`,
          affected: recentFailedLogins.length,
        });
      }
    }

    // S2: Users without roles
    const { data: allProfiles } = await adminClient.from("profiles").select("user_id");
    const { data: allRoles } = await adminClient.from("user_roles").select("user_id");
    const roledUserIds = new Set((allRoles || []).map((r: any) => r.user_id));
    const noRoleUsers = (allProfiles || []).filter((p: any) => !roledUserIds.has(p.user_id));
    if (noRoleUsers.length > 0) {
      findings.push({
        id: nextId(), category: "security", severity: noRoleUsers.length > 10 ? "warning" : "info",
        title: "Users without roles assigned",
        description: `${noRoleUsers.length} user(s) have no role in the system. They may have limited access.`,
        affected: noRoleUsers.length,
        autoFixable: true, fixAction: "assign_default_roles",
      });
    }

    // S3: Users with multiple roles
    const roleCounts: Record<string, number> = {};
    for (const r of allRoles || []) { roleCounts[r.user_id] = (roleCounts[r.user_id] || 0) + 1; }
    const multiRoleCount = Object.values(roleCounts).filter((c) => c > 1).length;
    if (multiRoleCount > 0) {
      findings.push({ id: nextId(), category: "security", severity: "info", title: "Users with multiple roles", description: `${multiRoleCount} user(s) have more than one role.`, affected: multiRoleCount });
    }

    // S4: Low trust score users
    const { data: lowTrustUsers } = await adminClient.from("profiles").select("user_id").lt("trust_score", 30);
    if (lowTrustUsers && lowTrustUsers.length > 0) {
      findings.push({ id: nextId(), category: "security", severity: "warning", title: "Low trust score users", description: `${lowTrustUsers.length} user(s) with trust scores below 30.`, affected: lowTrustUsers.length });
    }

    // S5: Banned users with recent activity
    const { data: bannedProfiles } = await adminClient.from("profiles").select("user_id").eq("is_banned", true);
    if (bannedProfiles && bannedProfiles.length > 0) {
      const bannedIds = bannedProfiles.map((p: any) => p.user_id);
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();
      const { data: bannedActivity } = await adminClient.from("tournament_participants").select("user_id").in("user_id", bannedIds).gt("joined_at", oneWeekAgo);
      if (bannedActivity && bannedActivity.length > 0) {
        findings.push({ id: nextId(), category: "security", severity: "critical", title: "Banned users with recent activity", description: `${bannedActivity.length} banned user(s) joined tournaments in the past week.`, affected: bannedActivity.length });
      }
    }

    // S6: Unreviewed suspicious activities
    const { count: unreviewedSuspicious } = await adminClient.from("suspicious_activities").select("*", { count: "exact", head: true }).eq("status", "pending");
    if (unreviewedSuspicious && unreviewedSuspicious > 0) {
      findings.push({ id: nextId(), category: "security", severity: unreviewedSuspicious > 10 ? "critical" : "warning", title: "Unreviewed suspicious activities", description: `${unreviewedSuspicious} suspicious activity report(s) pending review.`, affected: unreviewedSuspicious });
    }

    // S7: Unreviewed user reports
    const { count: unreviewedReports } = await adminClient.from("user_reports").select("*", { count: "exact", head: true }).eq("status", "pending");
    if (unreviewedReports && unreviewedReports > 0) {
      findings.push({ id: nextId(), category: "security", severity: "warning", title: "Unreviewed user reports", description: `${unreviewedReports} user report(s) pending review.`, affected: unreviewedReports });
    }

    // S8: Unreviewed clip reports
    const { count: unreviewedClips } = await adminClient.from("clip_reports").select("*", { count: "exact", head: true }).eq("status", "pending");
    if (unreviewedClips && unreviewedClips > 0) {
      findings.push({ id: nextId(), category: "security", severity: "warning", title: "Unreviewed clip reports", description: `${unreviewedClips} clip report(s) pending review.`, affected: unreviewedClips });
    }

    // S9: Multiple logins from same device (check login_history for same device_id with different user_ids)
    const { data: loginHistory } = await adminClient.from("login_history").select("device_id, user_id").not("device_id", "is", null).order("logged_in_at", { ascending: false }).limit(500);
    if (loginHistory) {
      const deviceUsers: Record<string, Set<string>> = {};
      for (const l of loginHistory) {
        if (l.device_id) {
          if (!deviceUsers[l.device_id]) deviceUsers[l.device_id] = new Set();
          deviceUsers[l.device_id].add(l.user_id);
        }
      }
      const sharedDevices = Object.entries(deviceUsers).filter(([, users]) => users.size >= 3);
      if (sharedDevices.length > 0) {
        findings.push({ id: nextId(), category: "security", severity: "warning", title: "Shared device logins detected", description: `${sharedDevices.length} device(s) used by 3+ different accounts. Possible account sharing or fraud.`, affected: sharedDevices.length });
      }
    }

    // ========================================================
    // DATABASE HEALTH SCAN
    // ========================================================

    // D1: Profiles without wallets
    const { count: totalProfiles } = await adminClient.from("profiles").select("*", { count: "exact", head: true });
    const { count: totalWallets } = await adminClient.from("wallets").select("*", { count: "exact", head: true });
    if (totalProfiles && totalWallets && totalProfiles > totalWallets) {
      const diff = totalProfiles - totalWallets;
      findings.push({ id: nextId(), category: "database", severity: "critical", title: "Users without wallets", description: `${diff} user(s) have profiles but no wallet record.`, affected: diff, autoFixable: true, fixAction: "create_missing_wallets" });
    }

    // D2: Profiles without usernames
    const { count: noUsername } = await adminClient.from("profiles").select("*", { count: "exact", head: true }).is("username", null);
    if (noUsername && noUsername > 0) {
      findings.push({ id: nextId(), category: "database", severity: "info", title: "Profiles without usernames", description: `${noUsername} profile(s) have no username set.`, affected: noUsername });
    }

    // D3: Profiles without email
    const { count: noEmail } = await adminClient.from("profiles").select("*", { count: "exact", head: true }).is("email", null);
    if (noEmail && noEmail > 0) {
      findings.push({ id: nextId(), category: "database", severity: "warning", title: "Profiles without email", description: `${noEmail} profile(s) have no email stored. This may prevent communication.`, affected: noEmail });
    }

    // D4: Orphaned tournament participants
    const { data: tournaments } = await adminClient.from("tournaments").select("id");
    const tournamentIds = new Set((tournaments || []).map((t: any) => t.id));
    const { data: participantTournaments } = await adminClient.from("tournament_participants").select("tournament_id");
    const orphanedP = (participantTournaments || []).filter((p: any) => !tournamentIds.has(p.tournament_id));
    if (orphanedP.length > 0) {
      findings.push({ id: nextId(), category: "database", severity: "warning", title: "Orphaned tournament participants", description: `${orphanedP.length} participant records reference non-existent tournaments.`, affected: orphanedP.length });
    }

    // D5: Orphaned conversation participants (conversations deleted)
    const { data: conversations } = await adminClient.from("conversations").select("id");
    const convIds = new Set((conversations || []).map((c: any) => c.id));
    const { data: convParticipants } = await adminClient.from("conversation_participants").select("conversation_id");
    const orphanedConv = (convParticipants || []).filter((cp: any) => !convIds.has(cp.conversation_id));
    if (orphanedConv.length > 0) {
      findings.push({ id: nextId(), category: "database", severity: "info", title: "Orphaned conversation participants", description: `${orphanedConv.length} conversation participant records reference deleted conversations.`, affected: orphanedConv.length });
    }

    // D6: Expired gift codes still active
    const now = new Date().toISOString();
    const { data: expiredActive } = await adminClient.from("gift_codes").select("id").eq("is_active", true).lt("expiry", now);
    if (expiredActive && expiredActive.length > 0) {
      findings.push({ id: nextId(), category: "database", severity: "warning", title: "Expired gift codes still active", description: `${expiredActive.length} gift code(s) expired but still marked active.`, affected: expiredActive.length, autoFixable: true, fixAction: "deactivate_expired_codes" });
    }

    // D7: Exhausted gift codes still active
    const { data: activeGiftCodes } = await adminClient.from("gift_codes").select("id, used_count, max_uses").eq("is_active", true);
    const exhaustedActive = (activeGiftCodes || []).filter((gc: any) => gc.used_count >= gc.max_uses);
    if (exhaustedActive.length > 0) {
      findings.push({ id: nextId(), category: "database", severity: "info", title: "Exhausted gift codes still active", description: `${exhaustedActive.length} gift code(s) reached max uses but still active.`, affected: exhaustedActive.length, autoFixable: true, fixAction: "deactivate_exhausted_codes" });
    }

    // D8: Duplicate wallet records
    const { data: walletData } = await adminClient.from("wallets").select("user_id");
    const walletUserCounts: Record<string, number> = {};
    for (const w of walletData || []) { walletUserCounts[w.user_id] = (walletUserCounts[w.user_id] || 0) + 1; }
    const duplicateWallets = Object.values(walletUserCounts).filter((c) => c > 1).length;
    if (duplicateWallets > 0) {
      findings.push({ id: nextId(), category: "database", severity: "critical", title: "Duplicate wallet records", description: `${duplicateWallets} user(s) have multiple wallet entries. This can cause balance inconsistencies.`, affected: duplicateWallets });
    }

    // ========================================================
    // PAYMENT & WALLET SCAN
    // ========================================================

    // P1: Negative wallet balances
    const { data: negativeWallets } = await adminClient.from("wallets").select("user_id, balance").lt("balance", 0);
    if (negativeWallets && negativeWallets.length > 0) {
      findings.push({ id: nextId(), category: "payments", severity: "critical", title: "Negative wallet balances", description: `${negativeWallets.length} wallet(s) have negative balances.`, affected: negativeWallets.length });
    }

    // P2: Wallet balance vs transaction ledger mismatch
    // Sample check on a few wallets
    const { data: sampleWallets } = await adminClient.from("wallets").select("user_id, balance").limit(50);
    let mismatchCount = 0;
    for (const w of sampleWallets || []) {
      const { data: txns } = await adminClient.from("wallet_transactions").select("amount").eq("user_id", w.user_id);
      if (txns) {
        const ledgerBalance = txns.reduce((sum: number, t: any) => sum + Number(t.amount), 0);
        // Allow small floating point difference
        if (Math.abs(Number(w.balance) - ledgerBalance) > 0.01) {
          mismatchCount++;
        }
      }
    }
    if (mismatchCount > 0) {
      findings.push({ id: nextId(), category: "payments", severity: "critical", title: "Wallet balance mismatch", description: `${mismatchCount} wallet(s) have balances that don't match their transaction ledger (sampled 50 wallets).`, affected: mismatchCount });
    }

    // P3: Failed/rejected payments in last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();
    const { count: rejectedTopups } = await adminClient.from("topup_requests").select("*", { count: "exact", head: true }).eq("status", "rejected").gt("created_at", sevenDaysAgo);
    const { count: rejectedWithdrawals } = await adminClient.from("withdrawal_requests").select("*", { count: "exact", head: true }).eq("status", "rejected").gt("created_at", sevenDaysAgo);
    const totalRejected = (rejectedTopups || 0) + (rejectedWithdrawals || 0);
    if (totalRejected > 5) {
      findings.push({ id: nextId(), category: "payments", severity: "warning", title: "High number of rejected transactions", description: `${totalRejected} topup/withdrawal requests rejected in the last 7 days.`, affected: totalRejected });
    }

    // P4: Duplicate UTR numbers in topup requests
    const { data: allTopups } = await adminClient.from("topup_requests").select("utr").eq("status", "approved");
    if (allTopups) {
      const utrCounts: Record<string, number> = {};
      for (const t of allTopups) { utrCounts[t.utr] = (utrCounts[t.utr] || 0) + 1; }
      const duplicateUtrs = Object.entries(utrCounts).filter(([, c]) => c > 1);
      if (duplicateUtrs.length > 0) {
        findings.push({ id: nextId(), category: "payments", severity: "critical", title: "Duplicate UTR numbers approved", description: `${duplicateUtrs.length} UTR number(s) appear in multiple approved topup requests. Possible fraud.`, affected: duplicateUtrs.length });
      }
    }

    // P5: Unusually large transactions
    const { data: largeTxns } = await adminClient.from("wallet_transactions").select("id, amount, user_id, type").gt("amount", 10000).order("created_at", { ascending: false }).limit(20);
    if (largeTxns && largeTxns.length > 0) {
      findings.push({ id: nextId(), category: "payments", severity: "info", title: "Large transactions detected", description: `${largeTxns.length} transaction(s) exceed ₹10,000. Verify they are legitimate.`, affected: largeTxns.length });
    }

    // ========================================================
    // TOURNAMENT SYSTEM SCAN
    // ========================================================

    // TR1: Live/upcoming tournaments without room IDs
    const { data: liveTournaments } = await adminClient.from("tournaments").select("id, title, status, room_id").in("status", ["live", "upcoming"]);
    const noRoomId = (liveTournaments || []).filter((t: any) => t.status === "live" && !t.room_id);
    if (noRoomId.length > 0) {
      findings.push({ id: nextId(), category: "tournaments", severity: "critical", title: "Live tournaments without room ID", description: `${noRoomId.length} live tournament(s) have no room ID set. Players cannot join matches.`, affected: noRoomId.length });
    }

    // TR2: Player count mismatch
    const { data: allTournaments } = await adminClient.from("tournaments").select("id, current_players, title, max_players, status");
    let playerMismatchCount = 0;
    for (const t of allTournaments || []) {
      const { count } = await adminClient.from("tournament_participants").select("*", { count: "exact", head: true }).eq("tournament_id", t.id);
      if (count !== null && count !== t.current_players) {
        playerMismatchCount++;
        findings.push({
          id: nextId(), category: "tournaments", severity: "warning",
          title: `Player count mismatch: "${t.title}"`,
          description: `Shows ${t.current_players} but actually has ${count} participants.`,
          affected: 1, autoFixable: true, fixAction: `fix_player_count:${t.id}:${count}`,
        });
      }
    }

    // TR3: Tournaments stuck in "live" for over 24 hours
    const { data: stuckLive } = await adminClient.from("tournaments").select("id, title").eq("status", "live").lt("start_time", oneDayAgo);
    if (stuckLive && stuckLive.length > 0) {
      findings.push({ id: nextId(), category: "tournaments", severity: "warning", title: "Tournaments stuck in live status", description: `${stuckLive.length} tournament(s) have been in 'live' status for over 24 hours without completing.`, affected: stuckLive.length });
    }

    // TR4: Overfilled tournaments
    const overfilledTournaments = (allTournaments || []).filter((t: any) => t.current_players > t.max_players);
    if (overfilledTournaments.length > 0) {
      findings.push({ id: nextId(), category: "tournaments", severity: "critical", title: "Overfilled tournaments", description: `${overfilledTournaments.length} tournament(s) have more players than max capacity.`, affected: overfilledTournaments.length });
    }

    // TR5: Upcoming tournaments with start time in the past
    const { data: pastUpcoming } = await adminClient.from("tournaments").select("id, title").eq("status", "upcoming").lt("start_time", now);
    if (pastUpcoming && pastUpcoming.length > 0) {
      findings.push({ id: nextId(), category: "tournaments", severity: "warning", title: "Upcoming tournaments past start time", description: `${pastUpcoming.length} tournament(s) are marked 'upcoming' but their start time has passed.`, affected: pastUpcoming.length });
    }

    // ========================================================
    // BUILD SUMMARY
    // ========================================================

    const totalScanTime = Date.now() - startTime;

    // Add scan performance finding
    if (totalScanTime > 15000) {
      findings.push({ id: nextId(), category: "technical", severity: "warning", title: "Slow scan performance", description: `System scan took ${(totalScanTime / 1000).toFixed(1)}s. This may indicate database performance issues.`, affected: 1 });
    }

    const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
    findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    const categories: Record<string, CategoryStatus> = {
      technical: { status: "ok", issues: 0 },
      security: { status: "ok", issues: 0 },
      database: { status: "ok", issues: 0 },
      payments: { status: "ok", issues: 0 },
      tournaments: { status: "ok", issues: 0 },
    };

    for (const f of findings) {
      categories[f.category].issues++;
      if (f.severity === "critical") categories[f.category].status = "critical";
      else if (f.severity === "warning" && categories[f.category].status !== "critical") categories[f.category].status = "warning";
    }

    const summary = {
      scanned_at: new Date().toISOString(),
      scan_duration_ms: totalScanTime,
      total_findings: findings.length,
      critical: findings.filter((f) => f.severity === "critical").length,
      warnings: findings.filter((f) => f.severity === "warning").length,
      info: findings.filter((f) => f.severity === "info").length,
      auto_fixable: findings.filter((f) => f.autoFixable).length,
      categories,
      findings,
    };

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Health scan error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Scan failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ========================================================
// AUTO-FIX HANDLER
// ========================================================
async function handleAutoFix(adminClient: any, fixActions: string[]) {
  const results: Array<{ action: string; success: boolean; message: string }> = [];

  for (const action of fixActions) {
    try {
      if (action === "deactivate_expired_codes") {
        const now = new Date().toISOString();
        const { count } = await adminClient.from("gift_codes").update({ is_active: false }).eq("is_active", true).lt("expiry", now);
        results.push({ action, success: true, message: `Deactivated expired gift codes.` });
      } else if (action === "deactivate_exhausted_codes") {
        const { data: codes } = await adminClient.from("gift_codes").select("id, used_count, max_uses").eq("is_active", true);
        const toDeactivate = (codes || []).filter((c: any) => c.used_count >= c.max_uses).map((c: any) => c.id);
        if (toDeactivate.length > 0) {
          await adminClient.from("gift_codes").update({ is_active: false }).in("id", toDeactivate);
        }
        results.push({ action, success: true, message: `Deactivated ${toDeactivate.length} exhausted gift code(s).` });
      } else if (action === "create_missing_wallets") {
        const { data: profiles } = await adminClient.from("profiles").select("user_id");
        const { data: wallets } = await adminClient.from("wallets").select("user_id");
        const walletUserIds = new Set((wallets || []).map((w: any) => w.user_id));
        const missing = (profiles || []).filter((p: any) => !walletUserIds.has(p.user_id));
        if (missing.length > 0) {
          const inserts = missing.map((p: any) => ({ user_id: p.user_id, balance: 0 }));
          await adminClient.from("wallets").insert(inserts);
        }
        results.push({ action, success: true, message: `Created ${missing.length} missing wallet(s).` });
      } else if (action === "assign_default_roles") {
        const { data: profiles } = await adminClient.from("profiles").select("user_id");
        const { data: roles } = await adminClient.from("user_roles").select("user_id");
        const roledIds = new Set((roles || []).map((r: any) => r.user_id));
        const missing = (profiles || []).filter((p: any) => !roledIds.has(p.user_id));
        if (missing.length > 0) {
          const inserts = missing.map((p: any) => ({ user_id: p.user_id, role: "user" }));
          await adminClient.from("user_roles").insert(inserts);
        }
        results.push({ action, success: true, message: `Assigned 'user' role to ${missing.length} user(s).` });
      } else if (action.startsWith("fix_player_count:")) {
        const parts = action.split(":");
        const tournamentId = parts[1];
        const actualCount = parseInt(parts[2], 10);
        await adminClient.from("tournaments").update({ current_players: actualCount }).eq("id", tournamentId);
        results.push({ action, success: true, message: `Fixed player count for tournament.` });
      } else {
        results.push({ action, success: false, message: "Unknown fix action." });
      }
    } catch (err: any) {
      results.push({ action, success: false, message: err.message || "Fix failed." });
    }
  }

  return new Response(JSON.stringify({ success: true, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
