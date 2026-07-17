import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: user.id });
    if (!isAdmin) throw new Error("Only admins can send emergency notifications");

    const { activated } = await req.json();

    // Get all user emails from auth.users (paginate for large user bases)
    let allEmails: string[] = [];
    let page = 1;
    const perPage = 1000;
    let hasMore = true;
    
    while (hasMore) {
      const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers({ page, perPage });
      if (usersError) throw usersError;
      
      const emails = users?.map((u) => u.email).filter((e): e is string => !!e) || [];
      allEmails = allEmails.concat(emails);
      hasMore = users.length === perPage;
      page++;
    }

    const emails = allEmails;

    if (emails.length === 0) {
      return new Response(
        JSON.stringify({ success: true, emailsSent: 0, message: "No users to notify" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const subject = activated
      ? "🚨 xt eSports — Emergency Platform Lockdown"
      : "✅ xt eSports — Platform Services Restored";

    const htmlContent = activated
      ? `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #00f0ff; text-align: center;">xt eSports</h1>
          <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 10px;">
            <h2 style="color: #ef4444; text-align: center;">🚨 Emergency Lockdown Activated</h2>
            <p style="color: #ffffff;">Dear Player,</p>
            <p style="color: #a0a0a0;">The xt eSports platform has been placed under <strong style="color: #ef4444;">Emergency Lockdown</strong> due to a critical security measure.</p>
            <p style="color: #a0a0a0;">During this lockdown, the following services are temporarily <strong>disabled</strong>:</p>
            <ul style="color: #a0a0a0;">
              <li>💰 Wallet transactions (deposits, withdrawals, transfers)</li>
              <li>🏆 Tournament creation and joining</li>
              <li>📝 New user registrations</li>
              <li>💬 Chat and messaging</li>
            </ul>
            <p style="color: #a0a0a0;">Your account and funds remain safe. We are working to resolve the situation as quickly as possible.</p>
            <p style="color: #a0a0a0;">We will notify you again once services are restored. Thank you for your patience.</p>
          </div>
          <p style="color: #666; text-align: center; margin-top: 20px; font-size: 12px;">— The xt eSports Team</p>
        </div>
      `
      : `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #00f0ff; text-align: center;">xt eSports</h1>
          <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 10px;">
            <h2 style="color: #22c55e; text-align: center;">✅ Platform Services Restored</h2>
            <p style="color: #ffffff;">Dear Player,</p>
            <p style="color: #a0a0a0;">Great news! The xt eSports platform has been <strong style="color: #22c55e;">fully restored</strong> and all services are back online.</p>
            <p style="color: #a0a0a0;">You can now resume:</p>
            <ul style="color: #a0a0a0;">
              <li>💰 Wallet transactions</li>
              <li>🏆 Tournaments</li>
              <li>📝 Registrations</li>
              <li>💬 Chat and messaging</li>
            </ul>
            <p style="color: #a0a0a0;">Thank you for your patience during the lockdown. Game on! 🎮</p>
          </div>
          <p style="color: #666; text-align: center; margin-top: 20px; font-size: 12px;">— The xt eSports Team</p>
        </div>
      `;

    let emailsSent = 0;
    let emailErrors: string[] = [];

    if (!resendApiKey) {
      console.log("RESEND_API_KEY not configured, skipping emails");
      return new Response(
        JSON.stringify({ success: true, emailsSent: 0, message: "Email not configured (RESEND_API_KEY missing)" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send in batches of 50 (Resend batch limit)
    const batchSize = 50;
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      try {
        const emailResponse = await fetch("https://api.resend.com/emails/batch", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            batch.map((to) => ({
              from: "xt eSports <onboarding@resend.dev>",
              to: [to],
              subject,
              html: htmlContent,
            }))
          ),
        });

        if (emailResponse.ok) {
          emailsSent += batch.length;
        } else {
          const err = await emailResponse.json();
          console.warn("Batch email error:", JSON.stringify(err));
          emailErrors.push(err.message || "batch failed");
        }
      } catch (err) {
        console.warn("Email batch send error:", err);
        emailErrors.push(String(err));
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent,
        totalUsers: emails.length,
        errors: emailErrors.length > 0 ? emailErrors : undefined,
        message: `Notified ${emailsSent}/${emails.length} users`,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-emergency-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
