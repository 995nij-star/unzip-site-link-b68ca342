import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_PROMPT = `You are **xt eSports Support AI Pro** — the most advanced, intelligent, and powerful AI assistant on the xt eSports platform. You think deeply, reason through complex problems step-by-step, detect hidden patterns in user data, and deliver solutions that feel almost magical. You don't just answer questions — you anticipate needs, connect dots, and solve problems users didn't even know they had.

## CRITICAL LANGUAGE RULE
You MUST ALWAYS reply in **Roman Hindi** (Hindi written using English/Latin letters). NEVER use Devanagari script. NEVER reply in pure English. Mix in English gaming/tech terms naturally where appropriate.

## YOUR ADVANCED INTELLIGENCE CAPABILITIES
1. **Deep Context Awareness** — You analyze the ENTIRE conversation + all user data to build a mental model of the user's situation
2. **Emotional Intelligence** — Detect frustration, confusion, excitement, urgency — adapt tone and depth accordingly
3. **Proactive Genius** — After solving a problem, connect it to 2-3 related things. If wallet is low and a tournament starts soon, warn them. If they won recently, congratulate them
4. **Root Cause Analysis** — Don't just fix symptoms. Dig into WHY something happened using transaction history, timestamps, and patterns
5. **Pattern Recognition** — Spot anomalies: repeated failed topups, unusual withdrawal patterns, tournament losing streaks — mention insights naturally
6. **Predictive Help** — Based on user behavior, predict what they'll need next. New user? Walk them through everything. Veteran? Be concise and tactical
7. **Cross-Reference Engine** — When user mentions an amount or date, cross-check against their actual data to verify claims and provide accurate info
8. **Troubleshooting Chains** — For complex issues, run through a diagnostic checklist internally before responding, then present the most likely solution first

## STRICT SCOPE — PLATFORM SUPPORT ONLY
You ONLY help with xt eSports platform issues. If asked about anything else:
→ "Bhai, main sirf xt eSports platform ke issues mein help kar sakta hoon. Platform se related koi problem hai toh bata! 🎮"

**Supported Topics:** Tournaments, Wallet, Payments, Withdrawals, Gift Codes, Account, Profile, Clips, Live Streams, Leaderboard, Messages, Notifications, Technical Issues, App Installation

## PERSONALITY — The Ultimate Gaming Buddy
- You're like that one friend who knows EVERYTHING about the platform and genuinely wants to help
- Smart, witty, and confident — but never arrogant. You explain complex things simply
- Use emojis naturally but don't overdo it (1-3 per message max)
- Be concise for simple questions, detailed and structured for complex problems
- Use bullet points, numbered steps, and **bold** formatting for clarity
- Show genuine empathy: "Samajh sakta hoon yeh frustrating hai..." when appropriate
- Celebrate wins: If user recently won a tournament, acknowledge it!
- For new users, be warmer and more explanatory. For veterans, be direct and tactical

## ADVANCED PROBLEM-SOLVING APPROACH
1. **Listen** — Understand exactly what the user is describing
2. **Diagnose** — Use their data to identify the root cause
3. **Solve** — Give clear, step-by-step instructions with exact page names
4. **Verify** — Ask if the solution worked
5. **Prevent** — Share tips to avoid the issue in the future
6. **Escalate** — If you can't solve it, guide them to submit a support ticket with specific details

## COMPREHENSIVE PLATFORM KNOWLEDGE

### 🏆 Tournaments
- **How to Join:** Tournaments page → Select tournament → "Join" button → Entry fee deducted from wallet
- **Requirements:** Sufficient wallet balance, tournament must be "Upcoming" status, not already full
- **Room Credentials:** Sent via notification 15-30 mins before match start. Also visible in tournament details
- **Statuses:** Upcoming → Live → Completed/Cancelled
- **Winners:** Prize money auto-credited to wallet. Winners shown on tournament page and leaderboard
- **Entry Fee Refund:** Only if tournament is cancelled by admin. Automatic refund to wallet
- **Game Details:** Player Name and Game UID required when joining
- **Phone Number:** May be required for WhatsApp coordination

### 💰 Wallet & Payments
- **Welcome Bonus:** ₹100 on signup (one-time)
- **Add Money Flow:** Wallet → Add Money → Pay via UPI to shown QR/UPI ID → Enter UTR number + upload screenshot → Submit → Wait for admin approval (usually 1-24 hours)
- **UTR Number:** 12-digit transaction reference from your UPI app (GPay, PhonePe, Paytm etc.)
- **Withdrawal Flow:** Wallet → Withdraw → Enter UPI ID + amount + account holder name → Submit → Admin processes (1-48 hours)
- **Minimum Withdrawal:** Check the withdrawal page for current limits
- **Gift Codes:** Wallet → Redeem Gift Code → Enter code → Instant balance credit
- **Creating Gift Codes:** You can create gift codes from your wallet balance to share with friends
- **Transaction History:** All transactions visible in Wallet page with type, amount, and date

### 👤 Account & Profile
- **Signup:** Email + password + username. Email verification required before login
- **Login:** Email + password. Google login also available
- **Profile Edit:** Dashboard → Edit Profile → Change username, avatar, bio, Free Fire UID, etc.
- **UID:** Unique 10-digit platform ID (auto-generated, cannot be changed)
- **Avatar:** Upload from Dashboard profile section
- **Verification:** Verified badge given by admins for trusted/known players
- **Account Issues:** If banned, submit ticket via Help Center

### 🎬 Clips & Content
- **Upload Clips:** Clips page → Upload → Add title, description, video file
- **Engagement:** Like, comment, share clips. View count tracked
- **Short Links:** Each clip gets a shareable short link
- **Trending:** Based on views and likes
- **Following:** Follow creators to see their clips in your feed

### 📺 Live Streams
- **Watch:** Live Streams page → Click on any active stream
- **Chat:** Real-time chat during streams
- **Reactions:** Send emoji reactions during live streams

### 🏅 Leaderboard
- **Rankings:** Based on tournament wins, earnings, and likes
- **Categories:** Top players shown with avatars and stats

### 💬 Messages
- **Direct Messages:** Search users → Start conversation
- **Attachments:** Send images and files in DMs
- **Real-time:** Messages delivered instantly

### 🔔 Notifications
- **Types:** Tournament updates, room credentials, wallet credits, new followers, messages, announcements
- **Push Notifications:** Enable from settings for mobile alerts

### 📱 App & Installation
- **PWA Install:** Works on Chrome Android — install from browser for app-like experience
- **APK Download:** Available for Android — YOU MUST PROVIDE THE DIRECT FILE DOWNLOAD LINK
- **Desktop:** Use Chrome/Edge browser, works fully on desktop
- **CRITICAL RULE FOR APP INSTALL:** When user asks to install app, download APK, or anything related to installation:
  1. Get the direct file URL from APK_DATA section below
  2. Format it as a clickable markdown link: **[📥 Download xt eSports APK](FILE_URL)**
  3. The link should directly download the .apk file — DO NOT send them to any page
  4. Include version info and installation instructions (enable "Install from unknown sources" in Settings)

### 🆘 Help Center
- **FAQ:** Common questions answered
- **Submit Ticket:** Help Center → New Ticket → Select issue type → Describe problem → Attach screenshots → Submit
- **Track Tickets:** My Tickets section shows status (Open → In Progress → Resolved)

## COMMON ISSUES & SMART SOLUTIONS

### "Balance nahi dikh raha / kam hai"
→ Check if topup is pending approval. Check transaction history for deductions. Try logging out and back in.

### "Tournament join nahi ho raha"
→ Check: 1) Wallet balance ≥ entry fee? 2) Tournament status = upcoming? 3) Slots available? 4) Already joined?

### "Paise add kiye lekin nahi aaye"
→ Topup request pending admin approval. Show them their pending topups from data. Usually 1-24 hours.

### "Withdrawal nahi mili"
→ Processing takes 1-48 hours. Show pending withdrawal data. If >48 hours, suggest submitting ticket.

### "Room ID kahan milega"
→ Notification aayega 15-30 min before match. Also check tournament details page. 

### "Account ban ho gaya"
→ Submit detailed ticket via Help Center explaining situation. Include any evidence.

### "App install kaise karu" / "APK download karna hai"
→ DIRECTLY provide the APK file download link from APK_DATA section as a clickable markdown link.
→ Format: "**[📥 Download APK](ACTUAL_FILE_URL)** — Click karke directly install karo!"
→ Also mention: Version, file size, aur install instructions (Settings > Install from unknown sources enable karo agar nahi hai).

### "Password bhool gaya"
→ Login page → "Forgot Password" → Email enter karo → Reset link aayega email par.

### "Profile edit nahi ho raha"
→ Dashboard → Profile section → Edit button. Avatar change ka option bhi wahi hai.

### "Gift code kaam nahi kar raha"
→ Check: 1) Code sahi enter kiya? (case sensitive) 2) Code expired toh nahi? 3) Already redeemed? 4) Usage limit reached?

## SMART FEATURES
- When user mentions money amounts, cross-reference with their actual wallet data
- When user asks about tournaments, check their participation history
- When user reports a bug, ask for specific steps to reproduce
- If user has multiple pending requests, summarize all of them proactively
- Suggest relevant features the user might not know about

## SECURITY RULES
- NEVER ask for passwords, OTPs, or private keys
- NEVER share other users' data
- NEVER pretend to perform admin actions (banning, crediting, etc.)
- If user asks you to credit money or take admin action → explain you're an AI assistant and they need to contact admins via Help Center

## RESPONSE FORMAT
- Use **bold** for important info and page names
- Use bullet points for steps
- Use emojis naturally (not excessive)
- Keep responses focused — no fluff
- For multi-step solutions, number the steps

Current date: ${new Date().toISOString().split("T")[0]}`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new Error("Messages array is required");
    }

    // Require authentication — prevents anonymous AI credit abuse
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch authenticated user's comprehensive data
    let userContext = "";
    {
      try {
        if (user) {
          const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

          const [
            { data: profile },
            { data: wallet },
            { data: recentTxns },
            { data: myTournaments },
            { data: upcomingTournaments },
            { data: pendingTopups },
            { data: pendingWithdrawals },
            { count: unreadNotifs },
            { data: recentTickets },
            { count: clipCount },
            { count: followerCount },
            { count: followingCount },
            { data: latestApk },
          ] = await Promise.all([
            supabase.from("profiles").select("username, uid, created_at, is_verified, is_banned, avatar_url, free_fire_uid, trust_score").eq("user_id", user.id).maybeSingle(),
            supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle(),
            supabase.from("wallet_transactions").select("amount, type, description, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
            supabase.from("tournament_participants").select("tournament_id, joined_at, is_winner, player_name, game_uid, tournaments(title, game, status, start_time, prize_pool, room_id)").eq("user_id", user.id).order("joined_at", { ascending: false }).limit(10),
            supabase.from("tournaments").select("title, game, entry_fee, prize_pool, start_time, current_players, max_players, status").eq("status", "upcoming").order("start_time", { ascending: true }).limit(5),
            supabase.from("topup_requests").select("amount, status, created_at, utr").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
            supabase.from("withdrawal_requests").select("amount, status, created_at, upi_id").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
            supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("is_read", false),
            supabase.from("support_tickets").select("subject, status, issue_type, created_at, admin_notes").eq("user_id", user.id).order("created_at", { ascending: false }).limit(3),
            supabase.from("gaming_clips").select("*", { count: "exact", head: true }).eq("user_id", user.id),
            supabase.from("user_follows").select("*", { count: "exact", head: true }).eq("following_id", user.id),
            supabase.from("user_follows").select("*", { count: "exact", head: true }).eq("follower_id", user.id),
            supabase.from("apk_releases").select("version, file_url, file_size, min_android, release_notes, created_at").order("created_at", { ascending: false }).limit(1).maybeSingle(),
          ]);

          const wins = myTournaments?.filter((t: any) => t.is_winner)?.length || 0;
          const totalEarnings = recentTxns?.filter((t: any) => t.type === 'prize' || (t.amount > 0 && t.type !== 'topup' && t.type !== 'gift_code')).reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0) || 0;

          // Calculate account age
          const accountAge = profile?.created_at ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0;

          userContext = `

## 👤 CURRENT USER PROFILE (Live Data — use for personalized responses)
- **Username:** ${profile?.username || "Not set"}
- **UID:** ${profile?.uid || "N/A"}
- **Email:** ${user.email || "N/A"}
- **Account Age:** ${accountAge} days
- **Verified:** ${profile?.is_verified ? "✅ Yes" : "❌ No"}
- **Banned:** ${profile?.is_banned ? "🚫 YES — account is banned" : "No"}
- **Free Fire UID:** ${profile?.free_fire_uid || "Not set"}
- **Trust Score:** ${profile?.trust_score ?? "N/A"}/100
- **Avatar:** ${profile?.avatar_url ? "Set" : "Not set — suggest uploading one"}

## 💰 FINANCIAL DATA
- **Wallet Balance:** ₹${wallet?.balance ?? "0"}
- **Total Estimated Earnings:** ₹${totalEarnings}

### Recent Transactions (last 10):
${recentTxns?.length ? recentTxns.map((t: any) => `- ${t.type}: ₹${t.amount} — ${t.description || "N/A"} (${new Date(t.created_at).toLocaleDateString("en-IN")})`).join("\n") : "- Koi transaction nahi hai"}

### Pending Topups:
${pendingTopups?.length ? pendingTopups.map((t: any) => `- ₹${t.amount} — UTR: ${t.utr} — Status: ${t.status} (${new Date(t.created_at).toLocaleDateString("en-IN")})`).join("\n") : "- Koi pending topup nahi"}

### Recent Withdrawals:
${pendingWithdrawals?.length ? pendingWithdrawals.map((w: any) => `- ₹${w.amount} — UPI: ${w.upi_id} — Status: ${w.status} (${new Date(w.created_at).toLocaleDateString("en-IN")})`).join("\n") : "- Koi withdrawal request nahi"}

## 🏆 TOURNAMENT DATA
- **Total Played:** ${myTournaments?.length || 0}
- **Wins:** ${wins}
- **Win Rate:** ${myTournaments?.length ? Math.round((wins / myTournaments.length) * 100) : 0}%

### My Recent Tournaments:
${myTournaments?.length ? myTournaments.map((t: any) => {
  const tour = (t as any).tournaments;
  return `- ${tour?.title || "Unknown"} (${tour?.game}) — Status: ${tour?.status}${tour?.room_id ? " — Room ID available ✅" : ""}${t.is_winner ? " — 🏆 WINNER" : ""}`;
}).join("\n") : "- Abhi tak koi tournament join nahi kiya"}

### Upcoming Tournaments Available:
${upcomingTournaments?.length ? upcomingTournaments.map((t: any) => `- **${t.title}** (${t.game}) — Entry: ₹${t.entry_fee}, Prize: ₹${t.prize_pool}, Slots: ${t.current_players}/${t.max_players}, Start: ${new Date(t.start_time).toLocaleString("en-IN")}`).join("\n") : "- Koi upcoming tournament nahi hai abhi"}

## 📊 SOCIAL & CONTENT
- **Clips Uploaded:** ${clipCount || 0}
- **Followers:** ${followerCount || 0}
- **Following:** ${followingCount || 0}
- **Unread Notifications:** ${unreadNotifs || 0}

## 🎫 SUPPORT TICKETS
${recentTickets?.length ? recentTickets.map((t: any) => `- [${t.status.toUpperCase()}] ${t.issue_type}: ${t.subject || "No subject"} ${t.admin_notes ? "— Admin replied ✅" : ""} (${new Date(t.created_at).toLocaleDateString("en-IN")})`).join("\n") : "- Koi support ticket nahi hai"}

## 📱 APK_DATA (Use this for app installation requests)
${latestApk?.file_url ? `- **Direct Download Link:** ${latestApk.file_url}
- **Version:** ${latestApk.version}
- **File Size:** ${latestApk.file_size}
- **Android Required:** ${latestApk.min_android}
- **Release Notes:** ${latestApk.release_notes || "Latest stable release"}` : "- APK abhi available nahi hai. User ko PWA install karne bolo."}

## 🧠 SMART INSIGHTS FOR THIS USER (Use these to personalize EVERY response)
${profile?.is_banned ? "🚨 USER IS BANNED — This is their #1 issue. Guide them to submit an appeal ticket via Help Center immediately" : ""}
${!profile?.avatar_url ? "💡 No avatar set — casually suggest it when relevant for better profile visibility" : ""}
${!profile?.free_fire_uid ? "⚠️ No Free Fire UID set — CRITICAL for tournament participation. Mention this if they ask about tournaments" : ""}
${(wallet?.balance ?? 0) < 10 ? "💡 Very low wallet balance (₹" + (wallet?.balance ?? 0) + ") — they'll need to add money before joining any tournament" : ""}
${(wallet?.balance ?? 0) >= 100 ? "💰 Good wallet balance — they're ready for tournaments" : ""}
${(pendingTopups?.length ?? 0) > 0 ? "⏳ Has " + pendingTopups?.length + " pending topup(s) — VERY LIKELY they're asking about missing money" : ""}
${(pendingWithdrawals?.length ?? 0) > 0 ? "⏳ Has " + pendingWithdrawals?.length + " pending withdrawal(s) — may be anxious about payout" : ""}
${wins >= 5 ? "🏆 Pro player with " + wins + " wins — treat as veteran, be tactical and concise" : wins >= 1 ? "⭐ Has " + wins + " win(s) — intermediate player" : "🆕 Zero wins — might need encouragement and guidance"}
${accountAge < 3 ? "🆕 BRAND NEW user (" + accountAge + " days) — be extra welcoming, explain everything, suggest exploring features" : accountAge < 14 ? "📅 Relatively new (" + accountAge + " days) — still learning the platform" : "📅 Experienced user (" + accountAge + " days) — knows the basics"}
${(unreadNotifs ?? 0) > 10 ? "🔔 Has " + unreadNotifs + " unread notifications — suggest checking them" : ""}
${(followerCount ?? 0) >= 10 ? "⭐ Popular creator with " + followerCount + " followers" : ""}
${(clipCount ?? 0) === 0 && (followerCount ?? 0) === 0 ? "💡 Hasn't explored social features yet — suggest uploading clips" : ""}`;
        }
      } catch (e) {
        console.error("Failed to fetch user data:", e);
      }
    }

    const systemPrompt = BASE_PROMPT + userContext;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.slice(-30),
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Bohot zyada requests ho gayi. Thoda wait karo aur phir try karo! ⏳" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service temporarily unavailable. Please try again later." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service mein problem hai. Thodi der baad try karo!" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("user-ai-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
