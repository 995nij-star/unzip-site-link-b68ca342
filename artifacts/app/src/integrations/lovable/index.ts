// Lovable cloud-auth removed — using Supabase auth directly on Replit.
// Stub so existing imports don't break.

import { supabase } from "../supabase/client";

type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

export const lovable = {
  auth: {
    signInWithOAuth: async (
      provider: "google" | "apple" | "microsoft" | "lovable",
      opts?: SignInOptions,
    ) => {
      // Delegate to Supabase OAuth directly
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: (provider === "lovable" ? "google" : provider) as any,
        options: {
          redirectTo: opts?.redirect_uri,
          queryParams: opts?.extraParams,
        },
      });
      if (error) return { error };
      return { redirected: !!data.url };
    },
  },
};
