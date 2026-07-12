import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Convert VAPID key from URL-safe base64 to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Import the ECDSA key for signing
async function importVapidKey(privateKeyBase64: string): Promise<CryptoKey> {
  const rawKey = urlBase64ToUint8Array(privateKeyBase64);
  // VAPID private key is 32 bytes raw, need to convert to JWK for P-256
  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    d: privateKeyBase64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
    x: '', // Will be filled
    y: '', // Will be filled
  };
  
  // For simplicity, we'll use a JWT-based VAPID approach
  return await crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
}

// Simple web push using fetch - sends notification via push service endpoint
async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<boolean> {
  try {
    // For web push, we need to encrypt the payload and sign with VAPID
    // Using a simplified approach - send to the push service endpoint
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'TTL': '86400',
      },
      body: payload,
    });
    
    return response.ok || response.status === 201;
  } catch (error) {
    console.error('Push send error:', error);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claims, error: claimsError } = await supabase.auth.getClaims(
      authHeader.replace('Bearer ', '')
    );
    if (claimsError || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Require admin/moderator role — only privileged users may send push notifications
    const callerId = (claims.claims as any).sub;
    const { data: isPrivileged } = await supabaseAdmin.rpc('is_admin_or_moderator', { _user_id: callerId });
    if (!isPrivileged) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { user_ids, title, body, data: notifData, url } = await req.json();

    if (!user_ids || !title || !body) {
      return new Response(JSON.stringify({ error: 'Missing required fields: user_ids, title, body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch push subscriptions for the target users
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .in('user_id', user_ids);

    if (subError) {
      throw subError;
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: '/pwa-icon-192.png',
      badge: '/pwa-icon-192.png',
      data: { url: url || '/', ...notifData },
    });

    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!;
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;

    let sent = 0;
    let failed = 0;
    const failedEndpoints: string[] = [];

    for (const sub of subscriptions || []) {
      const success = await sendWebPush(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        payload,
        vapidPublicKey,
        vapidPrivateKey
      );
      if (success) {
        sent++;
      } else {
        failed++;
        failedEndpoints.push(sub.endpoint);
      }
    }

    // Clean up failed/expired subscriptions
    if (failedEndpoints.length > 0) {
      await supabaseAdmin
        .from('push_subscriptions')
        .delete()
        .in('endpoint', failedEndpoints);
    }

    return new Response(
      JSON.stringify({ success: true, sent, failed, total: (subscriptions || []).length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Push notification error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
