---
name: UID auto-assignment fix
description: Two DB-level bugs that silently prevented the frontend from auto-assigning UIDs to users who had none.
---

## Bug 1 — Missing GRANT on generate_unique_uid()

`generate_unique_uid()` was defined with `SECURITY DEFINER` but never granted `EXECUTE` to `authenticated`. Every `supabase.rpc("generate_unique_uid")` call from the frontend silently failed.

**Fix:** `GRANT EXECUTE ON FUNCTION public.generate_unique_uid() TO authenticated;`

## Bug 2 — protect_profile_fields trigger blocks initial uid write

The trigger at `supabase/migrations/20260308102637_c9afab3f-...sql` (function `protect_profile_fields`) always reverts `NEW.uid := OLD.uid` for non-admin users — even when OLD.uid IS NULL. So even if the RPC call returned a uid and the frontend tried to UPDATE profiles SET uid = ..., the trigger silently rolled it back.

**Fix:** Change the uid protection line to only guard when OLD.uid IS NOT NULL:
```sql
IF OLD.uid IS NOT NULL THEN
  NEW.uid := OLD.uid;
END IF;
```

This allows the first-time assignment (NULL → value) while still preventing non-admins from changing an existing uid.

**How to apply:** Both fixes are in `supabase/migrations/20260724000000_fix_uid_8_digits.sql` which must be applied to the live Supabase project via `supabase db push` or the dashboard SQL editor.

## Frontend (useProfile.tsx)

After applying the migration, the existing RPC + UPDATE pattern in `useProfile.tsx` works correctly. The `update()` call now logs its own error so silent failures are visible.
