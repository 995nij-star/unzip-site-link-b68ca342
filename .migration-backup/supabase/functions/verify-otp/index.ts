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
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return new Response(
        JSON.stringify({ success: false, error: "Email and OTP are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedOtp = otp.trim();

    // Find the OTP record for this email (not matching OTP code yet - to track attempts)
    const { data: otpRecord, error: fetchError } = await supabase
      .from("login_otps")
      .select("*")
      .eq("email", normalizedEmail)
      .eq("verified", false)
      .maybeSingle();

    if (fetchError) {
      console.error("Failed to fetch OTP:", fetchError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to verify OTP" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!otpRecord) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid OTP" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if OTP is expired
    const expiresAt = new Date(otpRecord.expires_at);
    if (new Date() > expiresAt) {
      await supabase.from("login_otps").delete().eq("id", otpRecord.id);
      return new Response(
        JSON.stringify({ success: false, error: "OTP has expired" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check failed attempts - max 5 before lockout
    if (otpRecord.failed_attempts >= 5) {
      await supabase.from("login_otps").delete().eq("id", otpRecord.id);
      return new Response(
        JSON.stringify({ success: false, error: "Too many failed attempts. Please request a new code." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Now check if OTP code matches
    if (otpRecord.otp_code !== normalizedOtp) {
      // Increment failed attempts
      await supabase
        .from("login_otps")
        .update({ failed_attempts: (otpRecord.failed_attempts || 0) + 1 })
        .eq("id", otpRecord.id);

      return new Response(
        JSON.stringify({ success: false, error: "Invalid OTP" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark OTP as verified
    await supabase
      .from("login_otps")
      .update({ verified: true })
      .eq("id", otpRecord.id);

    // Check if user exists in auth.users
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const existingUser = authUsers?.users?.find(u => u.email === normalizedEmail);

    let session = null;
    let isNewUser = false;

    if (existingUser) {
      // Check if user is banned
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_banned")
        .eq("user_id", existingUser.id)
        .single();

      if (profile?.is_banned) {
        // Fetch the ban reason from audit log
        const { data: banLog } = await supabase
          .from("ban_audit_log")
          .select("reason")
          .eq("user_id", existingUser.id)
          .eq("action", "ban")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Delete the used OTP
        await supabase
          .from("login_otps")
          .delete()
          .eq("id", otpRecord.id);

        const reason = banLog?.reason ? `\n\nReason: ${banLog.reason}` : '';
        return new Response(
          JSON.stringify({ success: false, error: `Your account has been blocked.${reason}\n\nContact support for assistance.` }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate a magic link session for existing user
      const { data: signInData, error: signInError } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: normalizedEmail,
      });

      if (signInError) {
        console.error("Failed to generate session:", signInError);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to create session" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Return the magic link token for client to use
      session = signInData;
    } else {
      // Create new user
      const tempPassword = crypto.randomUUID();
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: normalizedEmail,
        password: tempPassword,
        email_confirm: true,
      });

      if (createError) {
        console.error("Failed to create user:", createError);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to create account" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      isNewUser = true;

      // Generate magic link for the new user
      const { data: signInData, error: signInError } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: normalizedEmail,
      });

      if (signInError) {
        console.error("Failed to generate session for new user:", signInError);
      }

      session = signInData;
    }

    // Delete the used OTP
    await supabase
      .from("login_otps")
      .delete()
      .eq("id", otpRecord.id);

    console.log(`✅ OTP verified for ${normalizedEmail}, isNewUser: ${isNewUser}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: isNewUser ? "Account created successfully" : "Login successful",
        isNewUser,
        // Return the hashed token for client verification
        token: session?.properties?.hashed_token,
        actionLink: session?.properties?.action_link,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Verify OTP error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
