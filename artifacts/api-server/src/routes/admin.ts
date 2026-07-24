import { Router } from "express";
import { createClient } from "@supabase/supabase-js";

const router = Router();

/**
 * The only account allowed to use admin bootstrap.
 * This is the single source of truth for super-admin identity on the server.
 */
const SUPER_ADMIN_EMAIL = "aktershun38@gmail.com";

/**
 * POST /api/admin/bootstrap
 *
 * Grants admin + super_admin roles to the authenticated user.
 * RESTRICTED: Only the super-admin account (aktershun38@gmail.com) may call
 * this endpoint. All other authenticated users receive 403.
 *
 * Uses the service-role key server-side so it bypasses RLS — the key
 * is never exposed to the browser.
 *
 * Auth: Bearer <supabase-access-token>
 */
router.post("/admin/bootstrap", async (req, res) => {
  try {
    const authHeader = req.headers.authorization ?? "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      res.status(401).json({ error: "Missing bearer token" });
      return;
    }

    const supabaseUrl = process.env["VITE_SUPABASE_URL"];
    const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];

    if (!supabaseUrl || !serviceKey) {
      res
        .status(500)
        .json({ error: "Server not configured (missing Supabase env vars)" });
      return;
    }

    // Service-role client — bypasses RLS
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify the user's JWT
    const {
      data: { user },
      error: authError,
    } = await admin.auth.getUser(token);

    if (authError || !user) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    // ── AUTHORIZATION GATE ──────────────────────────────────────────────────
    // Only the super-admin email may bootstrap admin roles.
    // Any other account — regardless of their current DB roles — is rejected.
    if (user.email !== SUPER_ADMIN_EMAIL) {
      res.status(403).json({
        error:
          "Access denied. This endpoint is restricted to the super-admin account.",
      });
      return;
    }
    // ────────────────────────────────────────────────────────────────────────

    // Upsert admin + super_admin rows (safe to call multiple times)
    const roles = ["admin", "super_admin"] as const;
    for (const role of roles) {
      const { error } = await admin
        .from("user_roles")
        .upsert(
          { user_id: user.id, role },
          { onConflict: "user_id,role", ignoreDuplicates: true }
        );
      if (error) {
        res
          .status(500)
          .json({ error: `Failed to insert role '${role}': ${error.message}` });
        return;
      }
    }

    res.json({
      success: true,
      userId: user.id,
      email: user.email,
      rolesGranted: roles,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

export default router;
