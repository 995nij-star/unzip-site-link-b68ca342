import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return json({ success: false, error: "Email is required" }, 400);
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return json({ success: false, error: "Invalid email format" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const normalizedEmail = email.trim().toLowerCase();

    // Verify user exists (don't reveal to client either way for security)
    const { data: users } = await supabase.auth.admin.listUsers();
    const userExists = users?.users?.some((u) => u.email === normalizedEmail);

    // Rate limit
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("password_reset_otps")
      .select("*", { count: "exact", head: true })
      .eq("email", normalizedEmail)
      .gte("created_at", tenMinAgo);
    if (count && count >= 3) {
      return json({ success: false, error: "Too many requests. Please wait and try again." }, 429);
    }

    if (userExists) {
      const array = new Uint32Array(1);
      crypto.getRandomValues(array);
      const otp = (100000 + (array[0] % 900000)).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      await supabase.from("password_reset_otps").delete().eq("email", normalizedEmail);
      const { error: insertError } = await supabase.from("password_reset_otps").insert({
        email: normalizedEmail,
        otp_code: otp,
        expires_at: expiresAt,
        verified: false,
      });
      if (insertError) {
        console.error("Insert OTP failed", insertError);
        return json({ success: false, error: "Failed to generate OTP" }, 500);
      }

      if (resendApiKey) {
        const html = `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
            <h1 style="color:#00f0ff;text-align:center">Password Reset Code</h1>
            <div style="background:linear-gradient(135deg,#1a1a2e,#16213e);padding:30px;border-radius:10px;text-align:center">
              <p style="color:#a0a0a0">Use this code to reset your password:</p>
              <div style="background:#0f0f23;padding:20px;border-radius:8px;border:2px solid #00f0ff">
                <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#00f0ff">${otp}</span>
              </div>
              <p style="color:#666;margin-top:20px;font-size:14px">This code expires in 10 minutes.</p>
              <p style="color:#666;font-size:12px">If you didn't request this, ignore this email.</p>
            </div>
          </div>`;
        const resp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "noreply@resend.dev",
            to: normalizedEmail,
            subject: "Your password reset code",
            html,
          }),
        });
        if (!resp.ok) {
          const t = await resp.text();
          console.error("Resend failed", resp.status, t);
        }
      } else {
        console.warn("RESEND_API_KEY not set; OTP for", normalizedEmail, "is", otp);
      }
    }

    // Always return success to not leak account existence
    return json({ success: true, message: "If an account exists, a code has been sent." });
  } catch (e) {
    console.error("send-password-reset-otp error", e);
    return json({ success: false, error: "Internal server error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
