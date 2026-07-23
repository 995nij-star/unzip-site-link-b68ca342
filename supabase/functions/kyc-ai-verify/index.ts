// AI-powered KYC verification (Aadhaar / govt ID + selfie)
// Uses Lovable AI Gateway (Gemini multimodal) to inspect documents and auto-approve when confidence is high.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SYSTEM_PROMPT = `You are an expert KYC verification AI for an Indian gaming platform. You will receive two images:
1. A government ID document (Aadhaar/PAN/Driving Licence/Passport/Voter ID)
2. A live selfie of the applicant

Your job:
- Confirm the document is a legitimate, clearly readable government ID (not a screenshot of a screenshot, not edited, not a printout of a printout, not a sample/specimen)
- For Aadhaar: verify it shows the Aadhaar logo, a 12-digit number pattern (XXXX XXXX XXXX), name, DOB/YOB, gender, and a photo
- Confirm the photo on the document and the selfie appear to be the SAME PERSON (face match)
- Confirm the name typed by the user matches the name printed on the document (allow minor spelling/case variations and middle-name differences)
- Detect obvious fraud: cut-and-paste faces, watermark "SAMPLE", blurry illegible IDs, mismatched documents, AI-generated faces, hand-drawn IDs

Respond with STRICT JSON only — no prose, no markdown fences:
{
  "decision": "approve" | "reject" | "manual_review",
  "confidence": 0-100,
  "document_valid": boolean,
  "face_match": boolean,
  "name_match": boolean,
  "detected_doc_type": "aadhar" | "pan" | "driving_license" | "passport" | "voter_id" | "unknown",
  "detected_name": string | null,
  "detected_number_masked": string | null,
  "issues": string[],
  "reason": string
}

Rules:
- "approve" ONLY when document_valid && face_match && name_match && confidence >= 85 && no critical issues
- "reject" when document is clearly fake, illegible, mismatched person, or watermarked sample
- "manual_review" for borderline cases (confidence 60-84, partial match, unusual angles)
- Never approve if you cannot clearly see both faces
- Be strict but fair. False approvals are worse than false rejections.`;

async function signedUrl(supabase: any, path: string) {
  const { data, error } = await supabase.storage.from("kyc-documents").createSignedUrl(path, 300);
  if (error) throw error;
  return data.signedUrl;
}

async function fetchAsDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  const ct = res.headers.get("content-type") || "image/jpeg";
  const buf = new Uint8Array(await res.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  return `data:${ct};base64,${btoa(bin)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await supabaseUser.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Load the user's latest KYC submission
    const { data: kyc, error: kycErr } = await admin
      .from("kyc_verifications")
      .select("*")
      .eq("user_id", user.id)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (kycErr) throw kycErr;
    if (!kyc) {
      return new Response(JSON.stringify({ error: "No KYC submission found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (kyc.status === "approved") {
      return new Response(JSON.stringify({ decision: "approve", already: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Skip PDFs — only handle images for AI vision
    if (kyc.document_url.toLowerCase().endsWith(".pdf")) {
      return new Response(JSON.stringify({ decision: "manual_review", reason: "PDF documents require manual review" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [docSigned, selfieSigned] = await Promise.all([
      signedUrl(admin, kyc.document_url),
      signedUrl(admin, kyc.selfie_url),
    ]);
    const [docDataUrl, selfieDataUrl] = await Promise.all([
      fetchAsDataUrl(docSigned),
      fetchAsDataUrl(selfieSigned),
    ]);

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": LOVABLE_API_KEY,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: `User-provided name: "${kyc.full_name}"\nClaimed document type: ${kyc.document_type}\n\nImage 1 = government ID document.\nImage 2 = live selfie.\nVerify and respond with strict JSON only.` },
              { type: "image_url", image_url: { url: docDataUrl } },
              { type: "image_url", image_url: { url: selfieDataUrl } },
            ],
          },
        ],
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ decision: "manual_review", reason: "AI service busy, manual review queued" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ decision: "manual_review", reason: "AI credits exhausted, manual review queued" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) {
      const txt = await aiRes.text();
      console.error("AI gateway error", aiRes.status, txt);
      return new Response(JSON.stringify({ decision: "manual_review", reason: "AI verification failed, manual review queued" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const raw: string = aiJson.choices?.[0]?.message?.content ?? "";
    const cleaned = raw.replace(/```json\s*|\s*```/g, "").trim();
    let verdict: any;
    try {
      verdict = JSON.parse(cleaned);
    } catch {
      const m = cleaned.match(/\{[\s\S]*\}/);
      verdict = m ? JSON.parse(m[0]) : { decision: "manual_review", reason: "Could not parse AI response" };
    }

    const decision = verdict.decision as "approve" | "reject" | "manual_review";
    const now = new Date().toISOString();
    const update: any = {
      updated_at: now,
      reviewed_at: now,
    };

    if (decision === "approve") {
      update.status = "approved";
      update.rejection_reason = null;
      update.ai_notes = null;
    } else if (decision === "reject") {
      update.status = "rejected";
      update.rejection_reason = `AI verification failed: ${verdict.reason || "Document could not be verified"}. ${(verdict.issues || []).join("; ")}`.slice(0, 500);
      update.ai_notes = null;
    } else {
      update.status = "pending"; // keep pending for admin
      update.ai_notes = `AI sent to manual review: ${verdict.reason || "Borderline confidence or partial match"}. Issues: ${(verdict.issues || []).join("; ") || "None listed"}`.slice(0, 500);
    }

    await admin.from("kyc_verifications").update(update).eq("id", kyc.id);

    // Optionally log to admin_audit_log
    await admin.from("admin_audit_log").insert({
      admin_id: user.id,
      action: `kyc_ai_${decision}`,
      target_type: "kyc_verification",
      target_id: kyc.id,
      details: verdict,
    }).then(() => {}, () => {});

    return new Response(JSON.stringify({ decision, verdict }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("kyc-ai-verify error", e);
    return new Response(JSON.stringify({ error: e.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
