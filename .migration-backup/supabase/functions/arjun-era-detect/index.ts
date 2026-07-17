import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify caller is admin (hard require)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: user.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const scanType = body.scan_type || "full"; // full, security, fraud, content, health

    const results: { category: string; events: any[] }[] = [];

    // ========== SECURITY DETECTION ==========
    if (scanType === "full" || scanType === "security") {
      const secEvents: any[] = [];

      // 1. Brute force detection - multiple failed logins
      const { data: failedLogins } = await supabase
        .from("login_attempts")
        .select("email, ip_address, created_at")
        .eq("success", false)
        .gte("created_at", new Date(Date.now() - 3600000).toISOString())
        .order("created_at", { ascending: false });

      if (failedLogins) {
        const emailCounts = new Map<string, number>();
        const ipCounts = new Map<string, { count: number; emails: Set<string> }>();

        for (const attempt of failedLogins) {
          emailCounts.set(attempt.email, (emailCounts.get(attempt.email) || 0) + 1);
          if (attempt.ip_address) {
            const ipData = ipCounts.get(attempt.ip_address) || { count: 0, emails: new Set<string>() };
            ipData.count++;
            ipData.emails.add(attempt.email);
            ipCounts.set(attempt.ip_address, ipData);
          }
        }

        for (const [email, count] of emailCounts) {
          if (count >= 5) {
            secEvents.push({
              category: "security",
              severity: count >= 10 ? "critical" : "high",
              title: `Brute force attack detected on ${email}`,
              description: `${count} failed login attempts in the last hour for ${email}`,
              details: { email, attempt_count: count, timeframe: "1 hour" },
              source: "ai",
            });
          }
        }

        for (const [ip, data] of ipCounts) {
          if (data.emails.size >= 3) {
            secEvents.push({
              category: "security",
              severity: "critical",
              title: `IP ${ip} targeting multiple accounts`,
              description: `Single IP attempted login on ${data.emails.size} different accounts`,
              details: { ip_address: ip, target_count: data.emails.size, emails: [...data.emails] },
              source: "ai",
            });
          }
        }
      }

      // 2. Locked accounts check
      const { data: lockedAccounts } = await supabase
        .from("account_locks")
        .select("*")
        .eq("is_locked", true)
        .eq("auto_locked", true)
        .gte("created_at", new Date(Date.now() - 86400000).toISOString());

      if (lockedAccounts && lockedAccounts.length > 0) {
        secEvents.push({
          category: "security",
          severity: "medium",
          title: `${lockedAccounts.length} accounts auto-locked today`,
          description: `Accounts automatically locked due to suspicious activity in the last 24 hours`,
          details: { count: lockedAccounts.length, emails: lockedAccounts.map((a: any) => a.email) },
          source: "system",
        });
      }

      results.push({ category: "security", events: secEvents });
    }

    // ========== FRAUD DETECTION ==========
    if (scanType === "full" || scanType === "fraud") {
      const fraudEvents: any[] = [];

      // 1. Duplicate UTR detection
      const { data: recentTopups } = await supabase
        .from("topup_requests")
        .select("utr, user_id, amount, created_at")
        .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString());

      if (recentTopups) {
        const utrCounts = new Map<string, any[]>();
        for (const t of recentTopups) {
          const list = utrCounts.get(t.utr) || [];
          list.push(t);
          utrCounts.set(t.utr, list);
        }
        for (const [utr, entries] of utrCounts) {
          if (entries.length > 1) {
            const uniqueUsers = new Set(entries.map((e: any) => e.user_id));
            fraudEvents.push({
              category: "fraud",
              severity: uniqueUsers.size > 1 ? "critical" : "high",
              title: `Duplicate UTR: ${utr}`,
              description: `UTR ${utr} used ${entries.length} times by ${uniqueUsers.size} user(s)`,
              details: { utr, submissions: entries.length, unique_users: uniqueUsers.size },
              source: "ai",
            });
          }
        }
      }

      // 2. Rapid withdrawal detection
      const { data: recentWithdrawals } = await supabase
        .from("withdrawal_requests")
        .select("user_id, amount, created_at")
        .gte("created_at", new Date(Date.now() - 86400000).toISOString())
        .eq("status", "pending");

      if (recentWithdrawals) {
        const userWithdrawals = new Map<string, { count: number; total: number }>();
        for (const w of recentWithdrawals) {
          const data = userWithdrawals.get(w.user_id) || { count: 0, total: 0 };
          data.count++;
          data.total += Number(w.amount);
          userWithdrawals.set(w.user_id, data);
        }
        for (const [userId, data] of userWithdrawals) {
          if (data.count >= 3 || data.total >= 5000) {
            fraudEvents.push({
              category: "fraud",
              severity: data.total >= 10000 ? "critical" : "high",
              title: `Suspicious withdrawal pattern`,
              description: `User made ${data.count} withdrawal requests totaling ₹${data.total} in 24 hours`,
              details: { user_id: userId, request_count: data.count, total_amount: data.total },
              affected_user_id: userId,
              source: "ai",
            });
          }
        }
      }

      // 3. Multi-account detection via login history
      const { data: recentLogins } = await supabase
        .from("login_history")
        .select("user_id, device_id, ip_address")
        .gte("logged_in_at", new Date(Date.now() - 7 * 86400000).toISOString());

      if (recentLogins) {
        const deviceUsers = new Map<string, Set<string>>();
        for (const l of recentLogins) {
          if (l.device_id) {
            const users = deviceUsers.get(l.device_id) || new Set<string>();
            users.add(l.user_id);
            deviceUsers.set(l.device_id, users);
          }
        }
        for (const [deviceId, users] of deviceUsers) {
          if (users.size >= 3) {
            fraudEvents.push({
              category: "fraud",
              severity: users.size >= 5 ? "critical" : "high",
              title: `Multi-account device detected`,
              description: `${users.size} different accounts logged in from the same device`,
              details: { device_id: deviceId, account_count: users.size, user_ids: [...users] },
              source: "ai",
            });
          }
        }
      }

      results.push({ category: "fraud", events: fraudEvents });
    }

    // ========== CONTENT DETECTION ==========
    if (scanType === "full" || scanType === "content") {
      const contentEvents: any[] = [];

      // Pending clip reports
      const { data: pendingReports, count: reportCount } = await supabase
        .from("clip_reports")
        .select("*", { count: "exact", head: false })
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(10);

      if (reportCount && reportCount > 0) {
        contentEvents.push({
          category: "content",
          severity: reportCount >= 10 ? "high" : "medium",
          title: `${reportCount} pending clip reports`,
          description: `${reportCount} clip reports awaiting review from users`,
          details: { count: reportCount, recent: pendingReports?.slice(0, 5) },
          source: "system",
        });
      }

      // Pending user reports
      const { count: userReportCount } = await supabase
        .from("user_reports")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      if (userReportCount && userReportCount > 0) {
        contentEvents.push({
          category: "content",
          severity: userReportCount >= 5 ? "high" : "medium",
          title: `${userReportCount} pending user reports`,
          description: `${userReportCount} user reports need admin review`,
          details: { count: userReportCount },
          source: "system",
        });
      }

      results.push({ category: "content", events: contentEvents });
    }

    // ========== HEALTH DETECTION ==========
    if (scanType === "full" || scanType === "health") {
      const healthEvents: any[] = [];

      // Pending support tickets
      const { count: ticketCount } = await supabase
        .from("support_tickets")
        .select("*", { count: "exact", head: true })
        .eq("status", "open");

      if (ticketCount && ticketCount >= 10) {
        healthEvents.push({
          category: "health",
          severity: ticketCount >= 50 ? "high" : "medium",
          title: `${ticketCount} unresolved support tickets`,
          description: `Users waiting for support responses`,
          details: { open_tickets: ticketCount },
          source: "system",
        });
      }

      // Pending topup requests
      const { count: topupCount } = await supabase
        .from("topup_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      if (topupCount && topupCount >= 5) {
        healthEvents.push({
          category: "health",
          severity: topupCount >= 20 ? "high" : "medium",
          title: `${topupCount} pending top-up requests`,
          description: `Users waiting for wallet top-up approvals`,
          details: { pending_count: topupCount },
          source: "system",
        });
      }

      // Pending withdrawal requests
      const { count: withdrawCount } = await supabase
        .from("withdrawal_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      if (withdrawCount && withdrawCount >= 5) {
        healthEvents.push({
          category: "health",
          severity: withdrawCount >= 15 ? "high" : "medium",
          title: `${withdrawCount} pending withdrawals`,
          description: `Withdrawal requests awaiting processing`,
          details: { pending_count: withdrawCount },
          source: "system",
        });
      }

      results.push({ category: "health", events: healthEvents });
    }

    // Save all detected events to database
    const allEvents = results.flatMap(r => r.events);
    if (allEvents.length > 0) {
      const { error: insertError } = await supabase
        .from("detection_events")
        .insert(allEvents.map(e => ({
          category: e.category,
          severity: e.severity,
          title: e.title,
          description: e.description,
          details: e.details || {},
          affected_user_id: e.affected_user_id || null,
          source: e.source || "system",
          status: "open",
        })));

      if (insertError) console.error("Insert error:", insertError);
    }

    // Apply auto-actions based on automation_rules
    const { data: activeRules } = await supabase
      .from("automation_rules")
      .select("*")
      .eq("is_active", true);

    let autoActionsApplied = 0;
    if (activeRules) {
      for (const rule of activeRules) {
        if (rule.trigger_type === "failed_logins") {
          const { data: failedLogins } = await supabase
            .from("login_attempts")
            .select("email")
            .eq("success", false)
            .gte("created_at", new Date(Date.now() - 3600000).toISOString());

          if (failedLogins) {
            const emailCounts = new Map<string, number>();
            for (const l of failedLogins) emailCounts.set(l.email, (emailCounts.get(l.email) || 0) + 1);
            
            for (const [email, count] of emailCounts) {
              if (count >= rule.trigger_threshold && rule.action_type === "lock_account") {
                const { data: existing } = await supabase
                  .from("account_locks")
                  .select("id")
                  .eq("email", email)
                  .eq("is_locked", true)
                  .single();

                if (!existing) {
                  await supabase.from("account_locks").insert({
                    email,
                    is_locked: true,
                    auto_locked: true,
                    lock_reason: `Auto-locked: ${count} failed login attempts (Rule: ${rule.name})`,
                    failed_attempts: count,
                  });
                  autoActionsApplied++;
                }
              }
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        scan_type: scanType,
        timestamp: new Date().toISOString(),
        summary: {
          total_events: allEvents.length,
          by_category: Object.fromEntries(results.map(r => [r.category, r.events.length])),
          by_severity: {
            critical: allEvents.filter(e => e.severity === "critical").length,
            high: allEvents.filter(e => e.severity === "high").length,
            medium: allEvents.filter(e => e.severity === "medium").length,
            low: allEvents.filter(e => e.severity === "low").length,
          },
          auto_actions_applied: autoActionsApplied,
        },
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Detection error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Detection scan failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
