import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Require an authenticated caller to prevent anonymous AI credit abuse
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { content } = await req.json();
    if (!content || typeof content !== "string") {
      return new Response(JSON.stringify({ safe: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Skip moderation for very short content
    if (content.trim().length < 2) {
      return new Response(JSON.stringify({ safe: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are a content moderation system for a gaming esports platform used by teenagers and young adults in India. Analyze the given text and determine if it violates community guidelines.

BLOCK content that contains:
- Hate speech, slurs, or discrimination (including in Hindi/Roman Hindi/Hinglish)
- Sexual or explicit content
- Threats of violence or harm
- Severe bullying or harassment
- Spam or scam links
- Personal information sharing (phone numbers, addresses)
- Drug/substance promotion

ALLOW content that contains:
- Normal gaming trash talk (mild competitive banter)
- General conversation
- Emoji usage
- Gaming terminology
- Mild frustration expressions
- Questions and help requests

Respond with ONLY a JSON object: {"safe": true} or {"safe": false, "reason": "brief reason in English"}
Do NOT include any other text, markdown, or formatting.`,
          },
          { role: "user", content },
        ],
        temperature: 0,
        max_tokens: 80,
      }),
    });

    if (!response.ok) {
      // If moderation fails, allow content through (fail-open for UX)
      console.error("Moderation API error:", response.status);
      return new Response(JSON.stringify({ safe: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content?.trim() || "";

    try {
      // Try to parse JSON from the response, handling potential markdown wrapping
      const cleaned = aiResponse.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const result = JSON.parse(cleaned);
      return new Response(JSON.stringify({ safe: !!result.safe, reason: result.reason || null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch {
      // If parsing fails, allow content (fail-open)
      console.error("Failed to parse moderation response:", aiResponse);
      return new Response(JSON.stringify({ safe: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    console.error("moderate-content error:", e);
    // Fail-open: allow content if moderation errors
    return new Response(JSON.stringify({ safe: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
