import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type LocationPermission = "prompt" | "granted" | "denied" | "unsupported";

async function reverseGeocode(lat: number, lng: number) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=10&accept-language=en`
    );
    if (!res.ok) return {};
    const data = await res.json();
    const a = data.address || {};
    return {
      city: a.city || a.town || a.village || a.county || null,
      region: a.state || a.region || null,
      country: a.country || null,
    };
  } catch {
    return {};
  }
}

export function useLocationTracker() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<LocationPermission>("prompt");
  const [loading, setLoading] = useState(false);

  const persist = useCallback(
    async (status: LocationPermission, coords?: GeolocationCoordinates) => {
      if (!user) return;
      const base: any = {
        user_id: user.id,
        permission_status: status,
        permission_asked_at: new Date().toISOString(),
        last_updated_at: new Date().toISOString(),
      };
      if (coords) {
        base.latitude = coords.latitude;
        base.longitude = coords.longitude;
        base.accuracy = coords.accuracy;
        const geo = await reverseGeocode(coords.latitude, coords.longitude);
        Object.assign(base, geo);
      }
      await supabase.from("user_locations").upsert(base, { onConflict: "user_id" });
    },
    [user]
  );

  const requestLocation = useCallback(async () => {
    if (!("geolocation" in navigator)) {
      setPermission("unsupported");
      await persist("unsupported");
      return false;
    }
    setLoading(true);
    return new Promise<boolean>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          setPermission("granted");
          await persist("granted", pos.coords);
          setLoading(false);
          resolve(true);
        },
        async (err) => {
          const denied = err.code === err.PERMISSION_DENIED;
          setPermission(denied ? "denied" : "prompt");
          await persist(denied ? "denied" : "prompt");
          setLoading(false);
          resolve(false);
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
      );
    });
  }, [persist]);

  // On mount: check current permission state without prompting
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      if (!("geolocation" in navigator)) {
        setPermission("unsupported");
        return;
      }
      try {
        const status = await (navigator.permissions as any)?.query?.({ name: "geolocation" });
        if (cancelled) return;
        if (status?.state === "granted") {
          setPermission("granted");
          // silently refresh location
          navigator.geolocation.getCurrentPosition(
            (pos) => persist("granted", pos.coords),
            () => {}
          );
        } else if (status?.state === "denied") {
          setPermission("denied");
          await persist("denied");
        } else {
          setPermission("prompt");
        }
      } catch {
        setPermission("prompt");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, persist]);

  return { permission, loading, requestLocation };
}
