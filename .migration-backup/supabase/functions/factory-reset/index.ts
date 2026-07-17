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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized — admin only" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { confirmCode } = await req.json();
    if (confirmCode !== "RESET-ALL") {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid confirmation code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminId = user.id;
    const log: string[] = [];

    // 1. Delete notifications
    const { error: e1 } = await supabase.from("notifications").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    log.push(e1 ? `notifications: ${e1.message}` : "notifications: cleared");

    // 2. Delete support tickets
    const { error: e2 } = await supabase.from("support_tickets").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    log.push(e2 ? `support_tickets: ${e2.message}` : "support_tickets: cleared");

    // 3. Delete ban audit log
    const { error: e3 } = await supabase.from("ban_audit_log").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    log.push(e3 ? `ban_audit_log: ${e3.message}` : "ban_audit_log: cleared");

    // 4. Delete login history
    const { error: e4 } = await supabase.from("login_history").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    log.push(e4 ? `login_history: ${e4.message}` : "login_history: cleared");

    // 5. Delete login OTPs
    const { error: e5 } = await supabase.from("login_otps").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    log.push(e5 ? `login_otps: ${e5.message}` : "login_otps: cleared");

    // 6. Delete user reports
    const { error: e6 } = await supabase.from("user_reports").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    log.push(e6 ? `user_reports: ${e6.message}` : "user_reports: cleared");

    // 7. Delete profile likes
    const { error: e7 } = await supabase.from("profile_likes").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    log.push(e7 ? `profile_likes: ${e7.message}` : "profile_likes: cleared");

    // 8. Delete gift code redemptions
    const { error: e8 } = await supabase.from("gift_code_redemptions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    log.push(e8 ? `gift_code_redemptions: ${e8.message}` : "gift_code_redemptions: cleared");

    // 9. Delete gift codes
    const { error: e9 } = await supabase.from("gift_codes").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    log.push(e9 ? `gift_codes: ${e9.message}` : "gift_codes: cleared");

    // 10. Delete tournament participants
    const { error: e10 } = await supabase.from("tournament_participants").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    log.push(e10 ? `tournament_participants: ${e10.message}` : "tournament_participants: cleared");

    // 11. Delete announcements
    const { error: e11 } = await supabase.from("announcements").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    log.push(e11 ? `announcements: ${e11.message}` : "announcements: cleared");

    // 12. Delete tournaments
    const { error: e12 } = await supabase.from("tournaments").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    log.push(e12 ? `tournaments: ${e12.message}` : "tournaments: cleared");

    // 13. Delete wallet transactions
    const { error: e13 } = await supabase.from("wallet_transactions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    log.push(e13 ? `wallet_transactions: ${e13.message}` : "wallet_transactions: cleared");

    // 14. Delete topup requests
    const { error: e14 } = await supabase.from("topup_requests").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    log.push(e14 ? `topup_requests: ${e14.message}` : "topup_requests: cleared");

    // 15. Delete withdrawal requests
    const { error: e15 } = await supabase.from("withdrawal_requests").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    log.push(e15 ? `withdrawal_requests: ${e15.message}` : "withdrawal_requests: cleared");

    // 16. Delete wallets (except admin)
    const { error: e16 } = await supabase.from("wallets").delete().neq("user_id", adminId);
    log.push(e16 ? `wallets (non-admin): ${e16.message}` : "wallets (non-admin): cleared");

    // 17. Reset admin wallet to 0
    const { error: e16b } = await supabase.from("wallets").update({ balance: 0, updated_at: new Date().toISOString() }).eq("user_id", adminId);
    log.push(e16b ? `admin wallet reset: ${e16b.message}` : "admin wallet: reset to ₹0");

    // 18. Delete non-admin user roles
    const { error: e17 } = await supabase.from("user_roles").delete().neq("user_id", adminId);
    log.push(e17 ? `user_roles: ${e17.message}` : "user_roles (non-admin): cleared");

    // 19. Delete non-admin profiles
    const { error: e18 } = await supabase.from("profiles").delete().neq("user_id", adminId);
    log.push(e18 ? `profiles: ${e18.message}` : "profiles (non-admin): cleared");

    // 20. Delete non-admin auth users via admin API
    const { data: { users: allUsers }, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (listError) {
      log.push(`list users error: ${listError.message}`);
    } else {
      const nonAdminUsers = allUsers.filter(u => u.id !== adminId);
      let deletedCount = 0;
      for (const u of nonAdminUsers) {
        const { error: delErr } = await supabase.auth.admin.deleteUser(u.id);
        if (delErr) {
          log.push(`delete user ${u.email}: ${delErr.message}`);
        } else {
          deletedCount++;
        }
      }
      log.push(`auth users: deleted ${deletedCount}/${nonAdminUsers.length}`);
    }

    console.log("Factory reset completed:", log);

    return new Response(
      JSON.stringify({ success: true, message: "Factory reset completed", log }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Factory reset error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
