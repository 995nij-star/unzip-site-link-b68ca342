import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface Profile {
  id: string;
  user_id: string;
  username: string | null;
  uid: string | null;
  avatar_url: string | null;
  free_fire_uid: string | null;
  gender: string | null;
  country: string | null;
  is_banned: boolean | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error || !data) {
      setLoading(false);
      return;
    }

    // If the profile has no UID, generate one now via the DB function and save it.
    if (!data.uid) {
      const { data: newUid, error: rpcError } = await supabase.rpc(
        "generate_unique_uid"
      );
      if (!rpcError && newUid) {
        await supabase
          .from("profiles")
          .update({ uid: newUid } as any)
          .eq("user_id", user.id);
        data.uid = newUid as string;
      }
    }

    setProfile(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const refetch = () => {
    fetchProfile();
  };

  return { profile, loading, refetch };
}
