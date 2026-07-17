import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getProfileTool from "./tools/get-profile";
import getWalletTool from "./tools/get-wallet";
import listTournamentsTool from "./tools/list-tournaments";
import listNotificationsTool from "./tools/list-notifications";

// The OAuth issuer must be the direct Supabase host, built from the project
// ref (not SUPABASE_URL, which on Cloud is a proxy). Inlined by Vite at build
// time so the module stays import-safe.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "xt-esports-mcp",
  title: "XT eSports",
  version: "0.1.0",
  instructions:
    "Tools for the XT eSports platform. Each tool acts as the signed-in user via Supabase RLS. Use `get_my_profile`, `get_my_wallet`, `list_my_notifications`, and `list_tournaments` to read the user's own data and public tournaments.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getProfileTool, getWalletTool, listTournamentsTool, listNotificationsTool],
});
