import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const normalizedEmail = email.trim().toLowerCase();

    // Generate 6-digit OTP using cryptographically secure random
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    const otp = (100000 + (array[0] % 900000)).toString();
    
    // Set expiry to 5 minutes from now
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Rate limit: max 3 OTP requests per email per 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from("login_otps")
      .select("*", { count: "exact", head: true })
      .eq("email", normalizedEmail)
      .gte("created_at", tenMinutesAgo);

    if (recentCount && recentCount >= 3) {
      return new Response(
        JSON.stringify({ success: false, error: "Too many requests. Please wait before requesting another code." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete any existing OTPs for this email
    await supabase
      .from("login_otps")
      .delete()
      .eq("email", normalizedEmail);

    // Insert new OTP
    const { error: insertError } = await supabase
      .from("login_otps")
      .insert({
        email: normalizedEmail,
        otp_code: otp,
        expires_at: expiresAt,
        verified: false,
      });

    if (insertError) {
      console.error("Failed to insert OTP:", insertError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to generate OTP" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send email via Resend
    if (resendApiKey) {
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #00f0ff; text-align: center;">xt eSports</h1>
          <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 10px; text-align: center;">
            <h2 style="color: #ffffff; margin-bottom: 10px;">Your Login Code</h2>
            <p style="color: #a0a0a0; margin-bottom: 20px;">Enter this code to sign in to your account:</p>
            <div style="background: #0f0f23; padding: 20px; border-radius: 8px; border: 2px solid #00f0ff;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #00f0ff;">${otp}</span>
            </div>
            <p style="color: #666; margin-top: 20px; font-size: 14px;">This code expires in 5 minutes.</p>
          </div>
          <p style="color: #666; text-align: center; margin-top: 20px; font-size: 12px;">
            If you didn't request this code, you can safely ignore this email.
          </p>
        </div>
      `;

      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "xt eSports <onboarding@resend.dev>",
          to: [normalizedEmail],
          subject: "Your Login Code - xt eSports",
          html: emailHtml,
        }),
      });

      const emailResult = await emailResponse.json();

      if (!emailResponse.ok) {
        const providerMessage =
          (typeof emailResult?.message === "string" && emailResult.message) ||
          "Email provider rejected the request";

        const isDomainVerificationIssue =
          providerMessage.includes("verify a domain") ||
          providerMessage.includes("testing emails to your own email address");

        if (isDomainVerificationIssue) {
          // Graceful fallback for development/testing:
          // keep OTP flow usable even when sender domain is not verified yet.
          console.error("Email domain not verified, falling back to test mode:", providerMessage);
          console.log("===========================================");
          console.log(`📧 OTP for ${normalizedEmail}: ${otp}`);
          console.log(`⏰ Expires at: ${expiresAt}`);
          console.log("🧪 Test mode fallback: sender domain not verified");
          console.log("===========================================");

          return new Response(
            JSON.stringify({
              success: true,
              message:
                "OTP generated in test mode because sender domain is not verified. Check function logs for the code.",
              code: "TEST_MODE_OTP_LOGGED",
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        console.error("Failed to send email:", emailResult);
        return new Response(
          JSON.stringify({
            success: false,
            error: "Email service is temporarily unavailable. Please try again.",
          }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Email sent successfully:", emailResult);

      return new Response(
        JSON.stringify({
          success: true,
          message: "OTP sent to your email"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // Fallback to test mode if no Resend API key - log only, never return OTP
      console.log("===========================================");
      console.log(`📧 OTP for ${normalizedEmail}: ${otp}`);
      console.log(`⏰ Expires at: ${expiresAt}`);
      console.log("===========================================");

      return new Response(
        JSON.stringify({
          success: true,
          message: "OTP sent successfully (test mode - check server logs)"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error) {
    console.error("Send OTP error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
