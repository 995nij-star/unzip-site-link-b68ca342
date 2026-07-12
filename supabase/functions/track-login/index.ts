import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const userAgent = body.userAgent || "";
    const deviceId = body.deviceId || null;

    const browser = parseBrowser(userAgent);
    const os = parseOS(userAgent);
    const deviceType = detectDeviceType(userAgent);
    const deviceName = `${browser} on ${os}`;

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";

    let city = "Unknown";
    let country = "Unknown";

    if (ip && ip !== "unknown" && ip !== "127.0.0.1") {
      try {
        const geoRes = await fetch(`https://ipapi.co/${ip}/json/`);
        if (geoRes.ok) {
          const geo = await geoRes.json();
          city = geo.city || "Unknown";
          country = geo.country_name || "Unknown";
        }
      } catch {
        // Geolocation failed
      }
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check if this device/IP combo is known for this user
    const { data: knownDevices } = await adminClient
      .from("login_history")
      .select("device_id, ip_address, is_trusted")
      .eq("user_id", user.id)
      .order("logged_in_at", { ascending: false })
      .limit(50);

    const isKnownDevice = knownDevices?.some(
      (d) => d.device_id === deviceId && d.is_trusted
    );
    const isKnownIP = knownDevices?.some((d) => d.ip_address === ip);
    const isFirstLogin = !knownDevices || knownDevices.length === 0;

    // Insert login record
    const { error: insertError } = await adminClient
      .from("login_history")
      .insert({
        user_id: user.id,
        browser,
        os,
        device_name: deviceName,
        device_type: deviceType,
        ip_address: ip,
        city,
        country,
        device_id: deviceId,
        is_trusted: isFirstLogin || isKnownDevice,
      });

    if (insertError) {
      console.error("Insert error:", insertError);
    }

    // Log successful login attempt
    await adminClient.from("login_attempts").insert({
      email: user.email,
      ip_address: ip,
      success: true,
    });

    // --- FRAUD DETECTION ---

    // 1. Check for multiple accounts from same IP (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: ipLogins } = await adminClient
      .from("login_history")
      .select("user_id")
      .eq("ip_address", ip)
      .gte("logged_in_at", oneDayAgo);

    if (ipLogins) {
      const uniqueUsers = new Set(ipLogins.map((l) => l.user_id));
      if (uniqueUsers.size >= 3) {
        // Flag: multiple accounts from same IP
        await adminClient.from("suspicious_activities").insert({
          user_id: user.id,
          activity_type: "multiple_accounts_same_ip",
          description: `${uniqueUsers.size} different accounts logged in from IP ${ip} in 24h`,
          ip_address: ip,
          device_info: deviceName,
          severity: uniqueUsers.size >= 5 ? "high" : "medium",
        });
      }
    }

    // 2. Check for new device login
    if (!isFirstLogin && !isKnownDevice && deviceId) {
      await adminClient.from("suspicious_activities").insert({
        user_id: user.id,
        activity_type: "new_device_login",
        description: `Login from new device: ${deviceName} (IP: ${ip}, ${city}, ${country})`,
        ip_address: ip,
        device_info: deviceId,
        severity: "low",
      });
    }

    // 3. Detect duplicate device IDs across different accounts
    if (deviceId) {
      const { data: deviceUsers } = await adminClient
        .from("login_history")
        .select("user_id")
        .eq("device_id", deviceId)
        .neq("user_id", user.id)
        .limit(5);

      if (deviceUsers && deviceUsers.length > 0) {
        const uniqueOtherUsers = new Set(deviceUsers.map((d) => d.user_id));
        await adminClient.from("suspicious_activities").insert({
          user_id: user.id,
          activity_type: "duplicate_device",
          description: `Same device used by ${uniqueOtherUsers.size + 1} accounts (device: ${deviceId})`,
          ip_address: ip,
          device_info: deviceId,
          severity: "high",
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        isNewDevice: !isFirstLogin && !isKnownDevice,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function parseBrowser(ua: string): string {
  if (ua.includes("Edg/")) return "Edge";
  if (ua.includes("OPR/") || ua.includes("Opera")) return "Opera";
  if (ua.includes("Chrome/") && !ua.includes("Edg/")) return "Chrome";
  if (ua.includes("Safari/") && !ua.includes("Chrome")) return "Safari";
  if (ua.includes("Firefox/")) return "Firefox";
  return "Unknown Browser";
}

function parseOS(ua: string): string {
  if (ua.includes("iPhone")) return "iPhone";
  if (ua.includes("iPad")) return "iPad";
  if (ua.includes("Android")) {
    const match = ua.match(/Android\s[\d.]+;\s([^)]+)\)/);
    if (match) {
      const device = match[1].split(" Build")[0].trim();
      return `Android (${device})`;
    }
    return "Android";
  }
  if (ua.includes("Windows NT 10")) return "Windows 10/11";
  if (ua.includes("Windows NT")) return "Windows";
  if (ua.includes("Mac OS X")) return "macOS";
  if (ua.includes("Linux")) return "Linux";
  return "Unknown OS";
}

function detectDeviceType(ua: string): string {
  const lower = ua.toLowerCase();
  if (lower.includes("ipad") || (lower.includes("android") && !lower.includes("mobile"))) return "tablet";
  if (lower.includes("iphone") || lower.includes("android") || lower.includes("mobile") || lower.includes("opera mini") || lower.includes("opera mobi")) return "mobile";
  return "desktop";
}
