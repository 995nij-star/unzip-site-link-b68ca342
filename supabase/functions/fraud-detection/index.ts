import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: isAdmin } = await admin.rpc("is_admin", { _user_id: user.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || "scan";

    // ===== ADMIN ACTIONS =====
    if (action === "update_status") {
      const { alertId, status, notes } = body;
      const updateData: any = { status, updated_at: new Date().toISOString() };
      if (notes) updateData.admin_notes = notes;
      if (status === "resolved" || status === "dismissed") {
        updateData.resolved_by = user.id;
        updateData.resolved_at = new Date().toISOString();
      }
      const { error } = await admin.from("fraud_alerts").update(updateData).eq("id", alertId);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "ban_user" || action === "suspend_user" || action === "flag_user") {
      const { userId, reason } = body;
      if (action === "ban_user") {
        await admin.from("profiles").update({ is_banned: true }).eq("user_id", userId);
        await admin.from("ban_audit_log").insert({ user_id: userId, admin_id: user.id, action: "ban", reason: reason || "Fraud detected" });
      } else if (action === "suspend_user") {
        await admin.from("profiles").update({ is_shadow_banned: true }).eq("user_id", userId);
        await admin.from("ban_audit_log").insert({ user_id: userId, admin_id: user.id, action: "shadow_ban", reason: reason || "Fraud investigation" });
      } else {
        await admin.from("suspicious_activities").insert({
          user_id: userId, activity_type: "flagged_for_review", severity: "high",
          description: reason || "Flagged by admin from fraud monitor", status: "pending",
        });
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== FULL FRAUD SCAN =====
    const newAlerts: any[] = [];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600_000).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();
    const oneDayAgo = new Date(Date.now() - 24 * 3600_000).toISOString();

    // =============================================
    // 1. MULTI-ACCOUNT DETECTION — SAME DEVICE
    // =============================================
    const { data: loginHist } = await admin.from("login_history")
      .select("device_id, user_id, ip_address, logged_in_at")
      .not("device_id", "is", null)
      .gt("logged_in_at", thirtyDaysAgo)
      .order("logged_in_at", { ascending: false })
      .limit(1000);

    if (loginHist) {
      const deviceUsers: Record<string, Set<string>> = {};
      const ipUsers: Record<string, Set<string>> = {};

      for (const l of loginHist) {
        if (l.device_id) {
          if (!deviceUsers[l.device_id]) deviceUsers[l.device_id] = new Set();
          deviceUsers[l.device_id].add(l.user_id);
        }
        if (l.ip_address) {
          if (!ipUsers[l.ip_address]) ipUsers[l.ip_address] = new Set();
          ipUsers[l.ip_address].add(l.user_id);
        }
      }

      // Device-based multi-account
      for (const [deviceId, users] of Object.entries(deviceUsers)) {
        if (users.size >= 2) {
          const userIds = Array.from(users);
          const riskLevel = users.size >= 4 ? "high" : users.size >= 3 ? "medium" : "low";
          newAlerts.push({
            alert_type: "multi_account_device",
            risk_level: riskLevel,
            title: `Multi-account: ${users.size} accounts on same device`,
            description: `Device ${deviceId.substring(0, 12)}... is used by ${users.size} different accounts.`,
            affected_user_ids: userIds,
            device_id: deviceId,
            metadata: { user_count: users.size },
          });
        }
      }

      // IP-based multi-account (threshold higher since IPs can be shared)
      for (const [ip, users] of Object.entries(ipUsers)) {
        if (users.size >= 4) {
          const userIds = Array.from(users);
          const riskLevel = users.size >= 8 ? "high" : users.size >= 5 ? "medium" : "low";
          newAlerts.push({
            alert_type: "multi_account_ip",
            risk_level: riskLevel,
            title: `Multi-account: ${users.size} accounts from same IP`,
            description: `IP address ${ip} has been used by ${users.size} different accounts in the last 30 days.`,
            affected_user_ids: userIds,
            ip_address: ip,
            metadata: { user_count: users.size },
          });
        }
      }
    }

    // =============================================
    // 2. DUPLICATE TOURNAMENT ENTRY DETECTION
    // =============================================
    const { data: recentParticipants } = await admin.from("tournament_participants")
      .select("tournament_id, user_id, game_uid, phone_number")
      .gt("joined_at", thirtyDaysAgo);

    if (recentParticipants && loginHist) {
      // Build user -> device mapping
      const userDevice: Record<string, Set<string>> = {};
      for (const l of loginHist) {
        if (l.device_id) {
          if (!userDevice[l.user_id]) userDevice[l.user_id] = new Set();
          userDevice[l.user_id].add(l.device_id);
        }
      }

      // Group participants by tournament
      const tournamentPlayers: Record<string, any[]> = {};
      for (const p of recentParticipants) {
        if (!tournamentPlayers[p.tournament_id]) tournamentPlayers[p.tournament_id] = [];
        tournamentPlayers[p.tournament_id].push(p);
      }

      for (const [tournId, players] of Object.entries(tournamentPlayers)) {
        // Check for same device across different users in same tournament
        const devicePlayerMap: Record<string, string[]> = {};
        for (const p of players) {
          const devices = userDevice[p.user_id];
          if (devices) {
            for (const d of devices) {
              if (!devicePlayerMap[d]) devicePlayerMap[d] = [];
              devicePlayerMap[d].push(p.user_id);
            }
          }
        }

        for (const [deviceId, playerIds] of Object.entries(devicePlayerMap)) {
          const uniquePlayers = [...new Set(playerIds)];
          if (uniquePlayers.length >= 2) {
            newAlerts.push({
              alert_type: "duplicate_tournament_entry",
              risk_level: "high",
              title: `Duplicate tournament entry: ${uniquePlayers.length} accounts, same device`,
              description: `${uniquePlayers.length} accounts from device ${deviceId.substring(0, 12)}... joined the same tournament.`,
              affected_user_ids: uniquePlayers,
              device_id: deviceId,
              metadata: { tournament_id: tournId, player_count: uniquePlayers.length },
            });
          }
        }

        // Check for same game_uid used by different accounts
        const uidMap: Record<string, string[]> = {};
        for (const p of players) {
          if (p.game_uid) {
            if (!uidMap[p.game_uid]) uidMap[p.game_uid] = [];
            uidMap[p.game_uid].push(p.user_id);
          }
        }
        for (const [gameUid, playerIds] of Object.entries(uidMap)) {
          const unique = [...new Set(playerIds)];
          if (unique.length >= 2) {
            newAlerts.push({
              alert_type: "duplicate_tournament_entry",
              risk_level: "high",
              title: `Same game UID in tournament: ${unique.length} accounts`,
              description: `Game UID "${gameUid}" used by ${unique.length} different accounts in the same tournament.`,
              affected_user_ids: unique,
              metadata: { tournament_id: tournId, game_uid: gameUid },
            });
          }
        }
      }
    }

    // =============================================
    // 3. SUSPICIOUS LOGIN PATTERNS
    // =============================================

    // 3a. Brute force — 5+ failed attempts in 24h for same email
    const { data: failedLogins } = await admin.from("login_attempts")
      .select("email, ip_address, created_at")
      .eq("success", false)
      .gt("created_at", oneDayAgo);

    if (failedLogins) {
      const emailAttempts: Record<string, { count: number; ips: Set<string> }> = {};
      for (const l of failedLogins) {
        if (!emailAttempts[l.email]) emailAttempts[l.email] = { count: 0, ips: new Set() };
        emailAttempts[l.email].count++;
        if (l.ip_address) emailAttempts[l.email].ips.add(l.ip_address);
      }

      for (const [email, data] of Object.entries(emailAttempts)) {
        if (data.count >= 5) {
          newAlerts.push({
            alert_type: "brute_force",
            risk_level: data.count >= 15 ? "high" : "medium",
            title: `Brute force attack: ${email}`,
            description: `${data.count} failed login attempts in 24h from ${data.ips.size} IP(s).`,
            ip_address: Array.from(data.ips)[0] || null,
            metadata: { email, attempts: data.count, unique_ips: data.ips.size },
          });
        }
      }
    }

    // 3b. Unusual login locations — user logging in from many different cities
    if (loginHist) {
      const userCities: Record<string, Set<string>> = {};
      for (const l of loginHist) {
        // Need city data from login_history
      }
      // Query with city included
      const { data: loginWithCity } = await admin.from("login_history")
        .select("user_id, city, country")
        .not("city", "is", null)
        .gt("logged_in_at", sevenDaysAgo)
        .limit(1000);

      if (loginWithCity) {
        const userLocations: Record<string, Set<string>> = {};
        for (const l of loginWithCity) {
          if (!userLocations[l.user_id]) userLocations[l.user_id] = new Set();
          userLocations[l.user_id].add(`${l.city}, ${l.country || ""}`);
        }

        for (const [userId, locations] of Object.entries(userLocations)) {
          if (locations.size >= 4) {
            newAlerts.push({
              alert_type: "suspicious_login",
              risk_level: locations.size >= 7 ? "high" : "medium",
              title: `Unusual login locations: ${locations.size} different cities`,
              description: `User logged in from ${locations.size} different cities in the last 7 days: ${Array.from(locations).slice(0, 3).join(", ")}...`,
              affected_user_ids: [userId],
              metadata: { locations: Array.from(locations), count: locations.size },
            });
          }
        }
      }
    }

    // =============================================
    // 4. RAPID ACCOUNT CREATION
    // =============================================
    const { data: recentProfiles } = await admin.from("profiles")
      .select("user_id, created_at")
      .gt("created_at", oneDayAgo)
      .order("created_at", { ascending: true });

    if (recentProfiles && recentProfiles.length >= 5) {
      // Check if many accounts were created in a short burst
      for (let i = 0; i < recentProfiles.length - 4; i++) {
        const windowStart = new Date(recentProfiles[i].created_at).getTime();
        const windowEnd = new Date(recentProfiles[i + 4].created_at).getTime();
        const diffMinutes = (windowEnd - windowStart) / 60000;
        if (diffMinutes <= 10) {
          const burst = recentProfiles.slice(i, i + 5);
          newAlerts.push({
            alert_type: "rapid_account_creation",
            risk_level: "high",
            title: `Rapid account creation: 5+ accounts in ${Math.round(diffMinutes)} minutes`,
            description: `5 accounts were created within ${Math.round(diffMinutes)} minutes. Possible bot or mass registration.`,
            affected_user_ids: burst.map((p: any) => p.user_id),
            metadata: { accounts_in_burst: 5, time_window_minutes: Math.round(diffMinutes) },
          });
          break; // Only report once
        }
      }
    }

    // =============================================
    // 5. SUSPICIOUS WALLET ACTIVITY
    // =============================================

    // 5a. Users with unusually high transaction volume in 24h
    const { data: recentTxns } = await admin.from("wallet_transactions")
      .select("user_id, amount, type, created_at")
      .gt("created_at", oneDayAgo);

    if (recentTxns) {
      const userTxnCount: Record<string, { count: number; totalVolume: number }> = {};
      for (const t of recentTxns) {
        if (!userTxnCount[t.user_id]) userTxnCount[t.user_id] = { count: 0, totalVolume: 0 };
        userTxnCount[t.user_id].count++;
        userTxnCount[t.user_id].totalVolume += Math.abs(Number(t.amount));
      }

      for (const [userId, data] of Object.entries(userTxnCount)) {
        if (data.count >= 20 || data.totalVolume >= 50000) {
          newAlerts.push({
            alert_type: "suspicious_wallet",
            risk_level: data.totalVolume >= 100000 ? "high" : "medium",
            title: `Suspicious wallet activity: ${data.count} transactions in 24h`,
            description: `User performed ${data.count} transactions totaling ₹${data.totalVolume.toFixed(0)} in the last 24 hours.`,
            affected_user_ids: [userId],
            metadata: { transaction_count: data.count, total_volume: data.totalVolume },
          });
        }
      }

      // 5b. Gift code farming — user creating and redeeming many gift codes
      const giftTxns = recentTxns.filter((t: any) => t.type === "gift_code");
      const giftPerUser: Record<string, number> = {};
      for (const t of giftTxns) {
        giftPerUser[t.user_id] = (giftPerUser[t.user_id] || 0) + 1;
      }
      for (const [userId, count] of Object.entries(giftPerUser)) {
        if (count >= 5) {
          newAlerts.push({
            alert_type: "suspicious_wallet",
            risk_level: "medium",
            title: `Gift code farming: ${count} gift transactions in 24h`,
            description: `User has ${count} gift code transactions in 24 hours. Possible code farming.`,
            affected_user_ids: [userId],
            metadata: { gift_transactions: count },
          });
        }
      }
    }

    // =============================================
    // DEDUPLICATE & PERSIST NEW ALERTS
    // =============================================

    // Get existing open alerts to avoid duplicates
    const { data: existingAlerts } = await admin.from("fraud_alerts")
      .select("alert_type, device_id, ip_address, affected_user_ids")
      .in("status", ["open", "reviewing"]);

    const existingKeys = new Set(
      (existingAlerts || []).map((a: any) =>
        `${a.alert_type}|${a.device_id || ""}|${a.ip_address || ""}|${(a.affected_user_ids || []).sort().join(",")}`
      )
    );

    const uniqueNewAlerts = newAlerts.filter((a) => {
      const key = `${a.alert_type}|${a.device_id || ""}|${a.ip_address || ""}|${(a.affected_user_ids || []).sort().join(",")}`;
      return !existingKeys.has(key);
    });

    if (uniqueNewAlerts.length > 0) {
      const inserts = uniqueNewAlerts.map((a) => ({
        alert_type: a.alert_type,
        risk_level: a.risk_level,
        title: a.title,
        description: a.description,
        affected_user_ids: a.affected_user_ids || [],
        device_id: a.device_id || null,
        ip_address: a.ip_address || null,
        metadata: a.metadata || {},
        status: "open",
      }));
      await admin.from("fraud_alerts").insert(inserts);
    }

    // =============================================
    // RETURN ALL OPEN/REVIEWING ALERTS
    // =============================================
    const { data: allAlerts } = await admin.from("fraud_alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    // Fetch profile data for affected users
    const allUserIds = new Set<string>();
    for (const a of allAlerts || []) {
      for (const uid of a.affected_user_ids || []) {
        allUserIds.add(uid);
      }
    }

    const { data: profiles } = allUserIds.size > 0
      ? await admin.from("profiles").select("user_id, username, email, avatar_url, is_banned, is_shadow_banned, uid").in("user_id", Array.from(allUserIds))
      : { data: [] };

    const profileMap: Record<string, any> = {};
    for (const p of profiles || []) {
      profileMap[p.user_id] = p;
    }

    // Stats
    const openAlerts = (allAlerts || []).filter((a: any) => a.status === "open");
    const highRisk = openAlerts.filter((a: any) => a.risk_level === "high");

    const summary = {
      scanned_at: new Date().toISOString(),
      new_alerts_found: uniqueNewAlerts.length,
      total_open: openAlerts.length,
      total_high_risk: highRisk.length,
      stats: {
        multi_account_device: openAlerts.filter((a: any) => a.alert_type === "multi_account_device").length,
        multi_account_ip: openAlerts.filter((a: any) => a.alert_type === "multi_account_ip").length,
        duplicate_tournament: openAlerts.filter((a: any) => a.alert_type === "duplicate_tournament_entry").length,
        brute_force: openAlerts.filter((a: any) => a.alert_type === "brute_force").length,
        suspicious_login: openAlerts.filter((a: any) => a.alert_type === "suspicious_login").length,
        rapid_creation: openAlerts.filter((a: any) => a.alert_type === "rapid_account_creation").length,
        suspicious_wallet: openAlerts.filter((a: any) => a.alert_type === "suspicious_wallet").length,
      },
      alerts: allAlerts || [],
      profiles: profileMap,
    };

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Fraud detection error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Scan failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
