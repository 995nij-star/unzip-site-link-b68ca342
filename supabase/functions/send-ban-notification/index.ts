import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BanNotificationRequest {
  userId: string;
  isBanned: boolean;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the request is from an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: requestingUser }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !requestingUser) {
      throw new Error("Unauthorized");
    }

    // Check if requesting user is admin
    const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: requestingUser.id });
    if (!isAdmin) {
      throw new Error("Only admins can send ban notifications");
    }

    const { userId, isBanned }: BanNotificationRequest = await req.json();

    if (!userId) {
      throw new Error("Missing userId");
    }

    // Get the banned user's email from auth.users
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    if (usersError) throw usersError;

    const bannedUser = users?.find(u => u.id === userId);
    if (!bannedUser?.email) {
      throw new Error("User email not found");
    }

    // Get username from profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("user_id", userId)
      .single();

    const username = profile?.username || "User";
    const subject = isBanned 
      ? "Your xt eSports Account Has Been Suspended" 
      : "Your xt eSports Account Has Been Reinstated";

    const htmlContent = isBanned
      ? `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #00f0ff; text-align: center;">xt eSports</h1>
          <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 10px;">
            <h2 style="color: #ef4444; text-align: center;">Account Suspended</h2>
            <p style="color: #ffffff;">Hello ${username},</p>
            <p style="color: #a0a0a0;">Your xt eSports account has been suspended due to a violation of our terms of service or community guidelines.</p>
            <p style="color: #a0a0a0;">While suspended, you will not be able to:</p>
            <ul style="color: #a0a0a0;">
              <li>Access tournaments</li>
              <li>Use your wallet</li>
              <li>Participate in any platform activities</li>
            </ul>
            <p style="color: #a0a0a0;">If you believe this was done in error, please contact our support team for assistance.</p>
          </div>
          <p style="color: #666; text-align: center; margin-top: 20px; font-size: 12px;">
            - The xt eSports Team
          </p>
        </div>
      `
      : `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #00f0ff; text-align: center;">xt eSports</h1>
          <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 10px;">
            <h2 style="color: #22c55e; text-align: center;">Account Reinstated</h2>
            <p style="color: #ffffff;">Hello ${username},</p>
            <p style="color: #a0a0a0;">Good news! Your xt eSports account has been reinstated and you now have full access to the platform again.</p>
            <p style="color: #a0a0a0;">You can now:</p>
            <ul style="color: #a0a0a0;">
              <li>Join and participate in tournaments</li>
              <li>Access your wallet</li>
              <li>Use all platform features</li>
            </ul>
            <p style="color: #a0a0a0;">We appreciate your patience and look forward to seeing you compete!</p>
          </div>
          <p style="color: #666; text-align: center; margin-top: 20px; font-size: 12px;">
            - The xt eSports Team
          </p>
        </div>
      `;

    // Send email via Resend API
    let emailSent = false;
    let emailError = null;
    
    if (resendApiKey) {
      try {
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "xt eSports <onboarding@resend.dev>",
            to: [bannedUser.email],
            subject: subject,
            html: htmlContent,
          }),
        });

        if (!emailResponse.ok) {
          const errorData = await emailResponse.json();
          console.warn("Resend API warning:", JSON.stringify(errorData));
          emailError = errorData.message || "Email delivery failed";
        } else {
          const emailData = await emailResponse.json();
          console.log("Ban notification email sent:", emailData);
          emailSent = true;
        }
      } catch (err) {
        console.warn("Email send error:", err);
        emailError = "Email service unavailable";
      }
    } else {
      console.log("RESEND_API_KEY not configured, skipping email");
      emailError = "Email not configured";
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailSent,
        message: emailSent ? "Notification sent" : `Ban applied (email skipped: ${emailError})`
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-ban-notification:", error);

    // Email delivery should never block the admin ban/unban flow.
    // If something bubbled up as an email-related error, return 200 and report it as skipped.
    const message = String(error?.message ?? "Unknown error");
    const lower = message.toLowerCase();
    if (lower.includes("failed to send email") || lower.includes("resend")) {
      return new Response(
        JSON.stringify({
          success: true,
          emailSent: false,
          message: `Ban applied (email skipped: ${message})`,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
