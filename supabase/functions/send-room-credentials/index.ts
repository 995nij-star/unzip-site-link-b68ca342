import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ParticipantData {
  phone_number: string;
  player_name: string;
}

interface RequestBody {
  tournament_id: string;
  tournament_title: string;
  room_id: string;
  room_password: string;
  participants: ParticipantData[];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Authentication & Admin Authorization ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Not authenticated" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid authentication" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userId = claimsData.claims.sub;

    // Check admin role using service role client
    const supabaseService = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: roleData } = await supabaseService
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["admin", "moderator"])
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized — admin/moderator only" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    // --- End Auth ---

    const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
    const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");

    if (!WHATSAPP_PHONE_NUMBER_ID) {
      throw new Error("WHATSAPP_PHONE_NUMBER_ID is not configured");
    }
    if (!WHATSAPP_ACCESS_TOKEN) {
      throw new Error("WHATSAPP_ACCESS_TOKEN is not configured");
    }

    const { tournament_id, tournament_title, room_id, room_password, participants }: RequestBody = await req.json();

    if (!tournament_id || !room_id || !room_password || !participants?.length) {
      throw new Error("Missing required fields");
    }

    console.log(`Sending room credentials for tournament: ${tournament_title} to ${participants.length} participants`);

    const results = await Promise.allSettled(
      participants.map(async (participant) => {
        let phoneNumber = participant.phone_number.replace(/\s+/g, "").replace(/[^\d+]/g, "");
        if (phoneNumber.startsWith("+")) {
          phoneNumber = phoneNumber.substring(1);
        }
        if (phoneNumber.startsWith("0")) {
          phoneNumber = "91" + phoneNumber.substring(1);
        }
        if (phoneNumber.length === 10) {
          phoneNumber = "91" + phoneNumber;
        }

        const response = await fetch(
          `https://graph.facebook.com/v17.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: phoneNumber,
              type: "template",
              template: {
                name: "room_details",
                language: { code: "en" },
                components: [
                  {
                    type: "body",
                    parameters: [
                      { type: "text", text: participant.player_name || "Player" },
                      { type: "text", text: tournament_title },
                      { type: "text", text: room_id },
                      { type: "text", text: room_password },
                    ],
                  },
                ],
              },
            }),
          }
        );

        const responseText = await response.text();

        if (!response.ok) {
          console.error(`Failed to send to ${phoneNumber}:`, responseText);
          throw new Error(`WhatsApp API error [${response.status}]: ${responseText}`);
        }

        console.log(`Successfully sent to ${phoneNumber}`);
        return { phone: phoneNumber, success: true };
      })
    );

    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    console.log(`Sent: ${successful}, Failed: ${failed}`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: successful,
        failed: failed,
        tournament_id,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    console.error("Error sending room credentials:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
