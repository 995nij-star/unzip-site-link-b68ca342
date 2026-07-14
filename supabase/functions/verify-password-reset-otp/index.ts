import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email, otp, newPassword } = await req.json();
    if (!email || !otp) {
      return json({ success: false, error: "Email and code are required" }, 400);
    }
    if (newPassword !== undefined && (typeof newPassword !== "string" || newPassword.length < 6)) {
      return json({ success: false, error: "Password must be at least 6 characters" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedOtp = String(otp).trim();

    const { data: record, error: fetchError } = await supabase
      .from("password_reset_otps")
      .select("*")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (fetchError) {
      console.error("Fetch OTP failed", fetchError);
      return json({ success: false, error: "Failed to verify code" }, 500);
    }
    if (!record) return json({ success: false, error: "Invalid or expired code" }, 400);

    if (new Date() > new Date(record.expires_at)) {
      await supabase.from("password_reset_otps").delete().eq("id", record.id);
      return json({ success: false, error: "Code has expired" }, 400);
    }
    if ((record.failed_attempts ?? 0) >= 5) {
      await supabase.from("password_reset_otps").delete().eq("id", record.id);
      return json({ success: false, error: "Too many failed attempts. Request a new code." }, 429);
    }
    if (record.otp_code !== normalizedOtp) {
      await supabase
        .from("password_reset_otps")
        .update({ failed_attempts: (record.failed_attempts ?? 0) + 1 })
        .eq("id", record.id);
      return json({ success: false, error: "Invalid code" }, 400);
    }

    // Step 1: verify only
    if (!newPassword) {
      await supabase
        .from("password_reset_otps")
        .update({ verified: true })
        .eq("id", record.id);
      return json({ success: true, verified: true });
    }

    // Step 2: reset password (requires verified OR matching OTP - both hold here)
    const { data: users } = await supabase.auth.admin.listUsers();
    const user = users?.users?.find((u) => u.email === normalizedEmail);
    if (!user) {
      await supabase.from("password_reset_otps").delete().eq("id", record.id);
      return json({ success: false, error: "Account not found" }, 404);
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });
    if (updateError) {
      console.error("Password update failed", updateError);
      return json({ success: false, error: updateError.message }, 500);
    }

    await supabase.from("password_reset_otps").delete().eq("id", record.id);
    return json({ success: true, message: "Password updated" });
  } catch (e) {
    console.error("verify-password-reset-otp error", e);
    return json({ success: false, error: "Internal server error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
