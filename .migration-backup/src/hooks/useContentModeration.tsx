import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const MODERATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/moderate-content`;

export function useContentModeration() {
  const checkContent = useCallback(async (content: string): Promise<boolean> => {
    if (!content.trim() || content.trim().length < 2) return true;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      };
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const resp = await fetch(MODERATE_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({ content }),
      });

      if (!resp.ok) return true; // fail-open

      const result = await resp.json();
      if (!result.safe) {
        toast({
          title: "Content Blocked 🚫",
          description: result.reason || "Your message was blocked for violating community guidelines.",
          variant: "destructive",
        });
        return false;
      }
      return true;
    } catch {
      // fail-open on error
      return true;
    }
  }, []);

  return { checkContent };
}
