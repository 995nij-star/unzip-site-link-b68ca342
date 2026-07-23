import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

const HEARTBEAT_INTERVAL = 30000; // 30 seconds

export function usePresence() {
  const { user } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user?.id) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const updatePresence = async () => {
      try {
        await (supabase as any)
          .from('profiles')
          .update({ last_seen: new Date().toISOString() })
          .eq('user_id', user.id);
      } catch (error) {
        console.error('Failed to update presence:', error);
      }
    };

    // Update immediately on mount
    updatePresence();

    // Set up interval for periodic updates
    intervalRef.current = setInterval(updatePresence, HEARTBEAT_INTERVAL);

    // Also update on visibility change (when user returns to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updatePresence();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.id]);
}

// Helper function to check if user is online (last seen within 2 minutes)
export function isUserOnline(lastSeen: string | null): boolean {
  if (!lastSeen) return false;
  const lastSeenDate = new Date(lastSeen);
  const now = new Date();
  const diffMs = now.getTime() - lastSeenDate.getTime();
  const diffMinutes = diffMs / (1000 * 60);
  return diffMinutes < 2;
}

// Helper to get online status text
export function getOnlineStatusText(lastSeen: string | null): string {
  if (!lastSeen) return 'Never';
  
  if (isUserOnline(lastSeen)) {
    return 'Online';
  }
  
  const lastSeenDate = new Date(lastSeen);
  const now = new Date();
  const diffMs = now.getTime() - lastSeenDate.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else {
    return `${diffDays}d ago`;
  }
}
