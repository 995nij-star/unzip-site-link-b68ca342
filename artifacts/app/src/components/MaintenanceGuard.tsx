import { ReactNode, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Wrench, Clock } from "lucide-react";

interface MaintenanceConfig {
  enabled: boolean;
  title: string;
  message: string;
  estimated_end: string;
  allow_admins: boolean;
}

export function MaintenanceGuard({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [config, setConfig] = useState<MaintenanceConfig | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const check = async () => {
      // Fetch maintenance config from public view
      const { data } = await supabase
        .from("site_settings_public" as any)
        .select("value")
        .eq("key", "maintenance_mode")
        .maybeSingle();

      const cfg = (data as any)?.value as MaintenanceConfig | null;
      setConfig(cfg?.enabled ? cfg : null);

      // Check if current user is admin
      if (user && cfg?.enabled && cfg?.allow_admins) {
        const { data: isAdminResult } = await (supabase as any).rpc("is_admin", { _user_id: user.id });
        setIsAdmin(!!isAdminResult);
      }

      setChecked(true);
    };
    check();
  }, [user]);

  if (!checked) return null;

  // Show maintenance page if enabled and user is not an allowed admin
  if (config?.enabled && !(config.allow_admins && isAdmin)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center max-w-md space-y-6">
          <div className="relative inline-block">
            <Wrench className="w-20 h-20 text-primary animate-pulse" />
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
          </div>
          <h1 className="text-3xl md:text-4xl font-orbitron font-bold text-foreground">
            {config.title || "Under Maintenance"}
          </h1>
          <p className="text-muted-foreground font-rajdhani text-lg">
            {config.message || "We'll be back soon."}
          </p>
          {config.estimated_end && (
            <div className="flex items-center justify-center gap-2 text-primary font-rajdhani">
              <Clock className="w-4 h-4" />
              <span>Estimated return: {new Date(config.estimated_end).toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
