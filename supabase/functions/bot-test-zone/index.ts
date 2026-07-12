// Test Zone: gather signals, run AI analysis, optionally issue CAPTCHA challenge
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

interface AnalyzePayload {
  action: "analyze" | "issue_captcha" | "save_verdict";
  target_user_id: string;
  // analyze inputs
  // save_verdict inputs:
  verdict?: "human" | "bot" | "inconclusive";
  confidence?: number;
  signal_score?: number;
  ai_verdict?: string;
  ai_reasoning?: string;
  signals?: Record<string, unknown>;
  captcha_challenge_id?: string;
  notes?: string;
}

function generateMathChallenge() {
  const a = Math.floor(Math.random() * 12) + 3;
  const b = Math.floor(Math.random() * 12) + 3;
  const op = Math.random() > 0.5 ? "+" : "*";
  const answer = op === "+" ? a + b : a * b;
  return { question: `What is ${a} ${op} ${b}? (numbers only)`, answer: String(answer) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const adminId = userData?.user?.id;
    if (!adminId) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: isAdmin } = await admin.rpc("is_admin", { _user_id: adminId });
    if (!isAdmin) return json({ error: "Admin only" }, 403);

    const body = (await req.json()) as AnalyzePayload;
    const targetId = body.target_user_id;
    if (!targetId) return json({ error: "target_user_id required" }, 400);

    if (body.action === "issue_captcha") {
      const { question, answer } = generateMathChallenge();
      const { data, error } = await admin
        .from("captcha_challenges")
        .insert({ target_user_id: targetId, admin_id: adminId, question, expected_answer: answer })
        .select("id, question, expires_at")
        .single();
      if (error) return json({ error: error.message }, 500);
      // Notify the user
      await admin.from("notifications").insert({
        user_id: targetId,
        type: "captcha_challenge",
        title: "Verification Required",
        message: "An admin has sent you a quick human-verification challenge. Open /verify-human to respond.",
      });
      return json({ success: true, challenge: data });
    }

    if (body.action === "save_verdict") {
      const { data, error } = await admin.from("bot_checks").insert({
        target_user_id: targetId,
        admin_id: adminId,
        verdict: body.verdict ?? "inconclusive",
        confidence: body.confidence ?? 0,
        signal_score: body.signal_score ?? 0,
        ai_verdict: body.ai_verdict,
        ai_reasoning: body.ai_reasoning,
        signals: body.signals ?? {},
        captcha_challenge_id: body.captcha_challenge_id,
        notes: body.notes,
      }).select().single();
      if (error) return json({ error: error.message }, 500);
      return json({ success: true, check: data });
    }

    // ===== analyze =====
    const [{ data: profile }, { data: logins }, { data: clips }, { data: tournaments }, { data: messages }, { data: reports }, { data: suspicious }, { data: lastCaptcha }] =
      await Promise.all([
        admin.from("profiles").select("user_id, username, uid, created_at, last_seen, trust_score, is_verified, is_premium, is_banned, is_shadow_banned, country, city").eq("user_id", targetId).maybeSingle(),
        admin.from("login_history").select("device_id, device_type, ip_address, logged_in_at, country").eq("user_id", targetId).order("logged_in_at", { ascending: false }).limit(20),
        admin.from("gaming_clips").select("id, created_at").eq("user_id", targetId).limit(50),
        admin.from("tournament_participants").select("tournament_id, joined_at").eq("user_id", targetId).limit(50),
        admin.from("direct_messages").select("id, content, created_at").eq("sender_id", targetId).order("created_at", { ascending: false }).limit(30),
        admin.from("clip_reports").select("id").eq("reporter_id", targetId).limit(20),
        admin.from("suspicious_activities").select("id, activity_type, severity").eq("user_id", targetId).limit(20),
        admin.from("captcha_challenges").select("id, status, attempts, answered_at").eq("target_user_id", targetId).order("created_at", { ascending: false }).limit(1),
      ]);

    if (!profile) return json({ error: "User not found" }, 404);

    // Heuristic signals
    const accountAgeDays = Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86400000);
    const uniqueDevices = new Set((logins ?? []).map((l) => l.device_id).filter(Boolean)).size;
    const uniqueIPs = new Set((logins ?? []).map((l) => l.ip_address).filter(Boolean)).size;
    const totalLogins = logins?.length ?? 0;
    const tournamentCount = tournaments?.length ?? 0;
    const clipCount = clips?.length ?? 0;
    const messageCount = messages?.length ?? 0;

    // Message repetition ratio (simple bot tell)
    const msgContents = (messages ?? []).map((m) => (m.content || "").trim().toLowerCase());
    const uniqueMsgs = new Set(msgContents).size;
    const repetitionRatio = msgContents.length > 0 ? 1 - uniqueMsgs / msgContents.length : 0;

    // Score: higher = more bot-like
    let score = 0;
    if (accountAgeDays < 1) score += 20;
    else if (accountAgeDays < 7) score += 10;
    if (uniqueDevices > 5) score += 15;
    if (uniqueIPs > 8) score += 15;
    if (totalLogins > 50 && accountAgeDays < 7) score += 15;
    if (repetitionRatio > 0.6) score += 20;
    if (clipCount === 0 && tournamentCount === 0 && messageCount > 30) score += 15;
    if ((suspicious?.length ?? 0) > 3) score += 10;
    if (profile.trust_score < 50) score += 10;
    if (profile.is_verified) score -= 15;
    if (profile.is_premium) score -= 5;
    if (tournamentCount > 5) score -= 10;
    score = Math.max(0, Math.min(100, score));

    const signals = {
      accountAgeDays,
      uniqueDevices,
      uniqueIPs,
      totalLogins,
      tournamentCount,
      clipCount,
      messageCount,
      repetitionRatio: Number(repetitionRatio.toFixed(2)),
      suspiciousCount: suspicious?.length ?? 0,
      reportsFiled: reports?.length ?? 0,
      trustScore: profile.trust_score,
      isVerified: profile.is_verified,
      isPremium: profile.is_premium,
      isBanned: profile.is_banned,
      country: profile.country,
      city: profile.city,
      lastCaptcha: lastCaptcha?.[0] ?? null,
    };

    // AI analysis via Lovable AI Gateway
    let aiVerdict = "inconclusive";
    let aiReasoning = "AI analysis unavailable.";
    let aiConfidence = 0;
    try {
      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You are a bot-detection analyst. Output only JSON: {verdict:'human'|'bot'|'inconclusive', confidence:0-100, reasoning:string}. Be concise (<60 words reasoning)." },
            { role: "user", content: `Analyze this user for bot vs human behavior.\nProfile & signals:\n${JSON.stringify({ profile, signals }, null, 2)}\n\nRecent message samples (lowercased):\n${msgContents.slice(0, 10).join("\n") || "(none)"}` },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (aiRes.ok) {
        const j = await aiRes.json();
        const txt = j.choices?.[0]?.message?.content ?? "{}";
        const parsed = JSON.parse(txt);
        aiVerdict = parsed.verdict ?? "inconclusive";
        aiConfidence = Math.max(0, Math.min(100, Number(parsed.confidence) || 0));
        aiReasoning = String(parsed.reasoning ?? "");
      } else {
        aiReasoning = `AI gateway error ${aiRes.status}`;
      }
    } catch (e) {
      aiReasoning = `AI error: ${(e as Error).message}`;
    }

    // Combined verdict (weighted: AI 60%, signals 40%)
    const heuristicBotProb = score; // 0-100
    const aiBotProb = aiVerdict === "bot" ? aiConfidence : aiVerdict === "human" ? 100 - aiConfidence : 50;
    const combined = Math.round(aiBotProb * 0.6 + heuristicBotProb * 0.4);
    const finalVerdict: "human" | "bot" | "inconclusive" =
      combined >= 65 ? "bot" : combined <= 35 ? "human" : "inconclusive";
    const finalConfidence = finalVerdict === "human" ? 100 - combined : combined;

    return json({
      success: true,
      profile,
      signals,
      signal_score: score,
      ai: { verdict: aiVerdict, confidence: aiConfidence, reasoning: aiReasoning },
      verdict: finalVerdict,
      confidence: finalConfidence,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
