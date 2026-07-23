import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function detectLanguage(text: string): string {
  const bengaliRe = /[\u0980-\u09FF]/;
  const devanagariRe = /[\u0900-\u097F]/;
  // Romanized Hindi detection: common Hindi words in Latin script
  const hindiLatinWords = /\b(kya|hai|mujhe|sabhi|karo|dikhao|kitne|kaise|kaha|bhai|yaar|nahi|haan|aur|ka|ke|ki|ko|se|me|par|wala|log|sab|kar|de|le|ban|unban|dikha|batao|bata)\b/i;

  if (bengaliRe.test(text)) return "bn";
  if (devanagariRe.test(text)) return "hi";
  if (hindiLatinWords.test(text)) return "hi-Latn";
  return "en";
}

const ADMIN_TOOLS = [
  // ===== USER MANAGEMENT =====
  {
    type: "function",
    function: {
      name: "ban_user",
      description: "Ban a user by their email, username, or UID. Sets is_banned=true and logs the action.",
      parameters: {
        type: "object",
        properties: {
          identifier: { type: "string", description: "User email, username, or UID to ban" },
          reason: { type: "string", description: "Reason for banning" },
        },
        required: ["identifier", "reason"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "unban_user",
      description: "Unban a previously banned user by their email, username, or UID.",
      parameters: {
        type: "object",
        properties: {
          identifier: { type: "string", description: "User email, username, or UID to unban" },
        },
        required: ["identifier"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_user_details",
      description: "Get detailed info about a user including wallet balance, tournaments, transactions, reports, login history, roles.",
      parameters: {
        type: "object",
        properties: {
          identifier: { type: "string", description: "User email, username, or UID" },
        },
        required: ["identifier"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_user_data",
      description: "Delete a user's profile, wallet, transactions, and all associated data. DESTRUCTIVE - cannot be undone.",
      parameters: {
        type: "object",
        properties: {
          identifier: { type: "string", description: "User email, username, or UID to delete" },
          confirm: { type: "boolean", description: "Must be true to confirm deletion" },
        },
        required: ["identifier", "confirm"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_user_role",
      description: "Change a user's role (admin, moderator, or user).",
      parameters: {
        type: "object",
        properties: {
          identifier: { type: "string", description: "User email, username, or UID" },
          role: { type: "string", enum: ["admin", "moderator", "user"] },
        },
        required: ["identifier", "role"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "mass_ban_users",
      description: "Ban multiple users at once by their identifiers.",
      parameters: {
        type: "object",
        properties: {
          identifiers: { type: "array", items: { type: "string" }, description: "Array of user emails, usernames, or UIDs" },
          reason: { type: "string" },
        },
        required: ["identifiers", "reason"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_users",
      description: "List/search users with optional filters.",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string", description: "Search by username, email, or UID" },
          banned_only: { type: "boolean" },
          limit: { type: "number", description: "Max results (default 20)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "suspend_user",
      description: "Temporarily suspend/flag a user account as suspicious. Bans them with a 'suspended' reason for investigation.",
      parameters: {
        type: "object",
        properties: {
          identifier: { type: "string", description: "User email, username, or UID" },
          reason: { type: "string", description: "Reason for suspension" },
          notify: { type: "boolean", description: "Send notification to user about suspension" },
        },
        required: ["identifier", "reason"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "verify_user",
      description: "Verify a user by setting their role to 'user' (if not already set) and clearing any ban status. Useful for reinstating users after review.",
      parameters: {
        type: "object",
        properties: {
          identifier: { type: "string", description: "User email, username, or UID" },
        },
        required: ["identifier"],
      },
    },
  },
  // ===== FINANCIAL OPERATIONS =====
  {
    type: "function",
    function: {
      name: "approve_withdrawal",
      description: "Approve a pending withdrawal request by its ID.",
      parameters: {
        type: "object",
        properties: {
          withdrawal_id: { type: "string", description: "Withdrawal request UUID" },
          admin_notes: { type: "string", description: "Optional admin notes" },
        },
        required: ["withdrawal_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "reject_withdrawal",
      description: "Reject a pending withdrawal request by its ID.",
      parameters: {
        type: "object",
        properties: {
          withdrawal_id: { type: "string", description: "Withdrawal request UUID" },
          admin_notes: { type: "string", description: "Reason for rejection" },
        },
        required: ["withdrawal_id", "admin_notes"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "approve_topup",
      description: "Approve a pending topup/deposit request by its ID. Credits the user's wallet.",
      parameters: {
        type: "object",
        properties: {
          topup_id: { type: "string", description: "Topup request UUID" },
          admin_notes: { type: "string", description: "Optional admin notes" },
        },
        required: ["topup_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "reject_topup",
      description: "Reject a pending topup/deposit request by its ID.",
      parameters: {
        type: "object",
        properties: {
          topup_id: { type: "string", description: "Topup request UUID" },
          admin_notes: { type: "string", description: "Reason for rejection" },
        },
        required: ["topup_id", "admin_notes"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "bulk_approve_topups",
      description: "Approve ALL pending topup requests at once.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "bulk_approve_withdrawals",
      description: "Approve ALL pending withdrawal requests at once.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "credit_user_wallet",
      description: "Add money to a user's wallet (admin credit).",
      parameters: {
        type: "object",
        properties: {
          identifier: { type: "string", description: "User email, username, or UID" },
          amount: { type: "number", description: "Amount in ₹ to credit" },
          reason: { type: "string", description: "Reason for crediting" },
        },
        required: ["identifier", "amount", "reason"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "debit_user_wallet",
      description: "Deduct money from a user's wallet (admin debit).",
      parameters: {
        type: "object",
        properties: {
          identifier: { type: "string", description: "User email, username, or UID" },
          amount: { type: "number", description: "Amount in ₹ to debit" },
          reason: { type: "string", description: "Reason for debiting" },
        },
        required: ["identifier", "amount", "reason"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "refund_user",
      description: "Issue a refund to a user's wallet with a reason.",
      parameters: {
        type: "object",
        properties: {
          identifier: { type: "string", description: "User email, username, or UID" },
          amount: { type: "number" },
          reason: { type: "string" },
        },
        required: ["identifier", "amount", "reason"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_pending_withdrawals",
      description: "List all pending withdrawal requests.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "list_pending_topups",
      description: "List all pending topup/deposit requests.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_recent_transactions",
      description: "Get recent wallet transactions across all users for monitoring.",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["deposit", "withdrawal", "entry_fee", "prize", "refund", "gift_code", "admin_credit", "admin_debit"] },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_financial_report",
      description: "Generate a comprehensive financial report with deposits, withdrawals, entry fees, prizes, refunds, and net platform revenue over a time period.",
      parameters: {
        type: "object",
        properties: {
          days: { type: "number", description: "Number of days to look back (default 30)" },
        },
      },
    },
  },
  // ===== TOURNAMENT MANAGEMENT =====
  {
    type: "function",
    function: {
      name: "create_tournament",
      description: "Create a new tournament.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          game: { type: "string", description: "Game name e.g. Free Fire, BGMI" },
          entry_fee: { type: "number" },
          prize_pool: { type: "number" },
          max_players: { type: "number" },
          start_time: { type: "string", description: "ISO 8601 datetime" },
          description: { type: "string" },
        },
        required: ["title", "game", "entry_fee", "prize_pool", "max_players", "start_time"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_tournament",
      description: "Update a tournament's details (status, room credentials, etc).",
      parameters: {
        type: "object",
        properties: {
          tournament_id: { type: "string", description: "Tournament UUID" },
          status: { type: "string", enum: ["upcoming", "live", "completed", "cancelled"] },
          room_id: { type: "string" },
          room_password: { type: "string" },
          title: { type: "string" },
          prize_pool: { type: "number" },
          description: { type: "string" },
        },
        required: ["tournament_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_tournament",
      description: "Delete a tournament by ID. Refunds all participants if it had an entry fee.",
      parameters: {
        type: "object",
        properties: {
          tournament_id: { type: "string", description: "Tournament UUID" },
        },
        required: ["tournament_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_tournaments",
      description: "List tournaments with optional status filter.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["upcoming", "live", "completed", "cancelled"] },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "declare_tournament_winner",
      description: "Mark a participant as winner in a tournament and award prize money.",
      parameters: {
        type: "object",
        properties: {
          tournament_id: { type: "string" },
          winner_identifier: { type: "string", description: "Winner's email, username, or UID" },
          prize_amount: { type: "number", description: "Prize amount to award in ₹" },
        },
        required: ["tournament_id", "winner_identifier", "prize_amount"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_tournament_participants",
      description: "List all participants of a specific tournament.",
      parameters: {
        type: "object",
        properties: {
          tournament_id: { type: "string" },
        },
        required: ["tournament_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_tournament_analytics",
      description: "Get analytics for tournaments: fill rates, revenue, popular games, average prize pools, player engagement metrics.",
      parameters: {
        type: "object",
        properties: {
          days: { type: "number", description: "Number of days to analyze (default 30)" },
        },
      },
    },
  },
  // ===== GIFT CODES =====
  {
    type: "function",
    function: {
      name: "create_gift_code",
      description: "Create a new gift/promo code that users can redeem for wallet balance.",
      parameters: {
        type: "object",
        properties: {
          code: { type: "string", description: "The gift code string" },
          amount: { type: "number", description: "Amount in ₹" },
          max_uses: { type: "number", description: "Maximum redemptions allowed" },
          expiry_days: { type: "number", description: "Days until expiry from now" },
        },
        required: ["code", "amount", "max_uses", "expiry_days"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "toggle_gift_code",
      description: "Activate or deactivate a gift code.",
      parameters: {
        type: "object",
        properties: {
          code: { type: "string", description: "The gift code string" },
          is_active: { type: "boolean" },
        },
        required: ["code", "is_active"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_gift_codes",
      description: "List all gift codes with usage stats.",
      parameters: {
        type: "object",
        properties: {
          active_only: { type: "boolean" },
        },
      },
    },
  },
  // ===== SUPPORT & NOTIFICATIONS =====
  {
    type: "function",
    function: {
      name: "resolve_ticket",
      description: "Resolve/close a support ticket with admin notes.",
      parameters: {
        type: "object",
        properties: {
          ticket_id: { type: "string", description: "Support ticket UUID" },
          admin_notes: { type: "string", description: "Response/resolution notes" },
          status: { type: "string", enum: ["resolved", "closed", "in_progress"] },
        },
        required: ["ticket_id", "admin_notes"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_open_tickets",
      description: "List all open support tickets.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "create_announcement",
      description: "Create and publish a platform announcement.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          content: { type: "string" },
          type: { type: "string", enum: ["general", "tournament", "winner", "maintenance"] },
        },
        required: ["title", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_announcement",
      description: "Delete an announcement by ID.",
      parameters: {
        type: "object",
        properties: {
          announcement_id: { type: "string" },
        },
        required: ["announcement_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_announcements",
      description: "List all announcements.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_notification",
      description: "Send a notification to a specific user or all users.",
      parameters: {
        type: "object",
        properties: {
          target: { type: "string", description: "User identifier OR 'all' for everyone" },
          title: { type: "string" },
          message: { type: "string" },
          type: { type: "string", description: "Notification type e.g. 'admin', 'announcement', 'warning', 'security'" },
        },
        required: ["target", "title", "message"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_direct_message",
      description: "Send a personal direct message (DM) from the currently logged-in admin to a specific user, identified by their email/Gmail, username, or UID. The message appears in the user's chat inbox as a 1-on-1 conversation with the admin. Use this when the admin wants to personally message someone.",
      parameters: {
        type: "object",
        properties: {
          identifier: { type: "string", description: "Recipient's email/Gmail, username, or UID" },
          message: { type: "string", description: "The message content to send" },
        },
        required: ["identifier", "message"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "broadcast_maintenance",
      description: "Broadcast a maintenance/downtime announcement to all users with a scheduled time.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          message: { type: "string" },
          scheduled_time: { type: "string", description: "When maintenance starts (ISO 8601)" },
          duration_hours: { type: "number", description: "Expected duration in hours" },
        },
        required: ["title", "message"],
      },
    },
  },
  // ===== SECURITY & FRAUD =====
  {
    type: "function",
    function: {
      name: "detect_fraud",
      description: "Scan for suspicious activity: duplicate IPs, rapid topups, abnormal wallet balances, multiple accounts, suspicious withdrawal patterns, duplicate UTRs.",
      parameters: {
        type: "object",
        properties: {
          scan_type: {
            type: "string",
            enum: ["full", "wallets", "topups", "withdrawals", "logins", "duplicates", "financial_patterns", "anti_cheat"],
            description: "Type of fraud scan to perform",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "flag_suspicious_user",
      description: "Flag a user as suspicious and add them to watchlist by adding an admin note. Optionally ban them.",
      parameters: {
        type: "object",
        properties: {
          identifier: { type: "string", description: "User email, username, or UID" },
          reason: { type: "string", description: "Why this user is suspicious" },
          auto_ban: { type: "boolean", description: "Automatically ban the user" },
        },
        required: ["identifier", "reason"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_login_activity",
      description: "Monitor login activity patterns: recent logins, device diversity, geographic anomalies, login frequency.",
      parameters: {
        type: "object",
        properties: {
          identifier: { type: "string", description: "Optional: specific user to analyze. If omitted, analyzes platform-wide." },
          hours: { type: "number", description: "Hours to look back (default 24)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "detect_multi_accounts",
      description: "Advanced multi-account detection: shared IPs, similar usernames, same device fingerprints, rapid account creation patterns.",
      parameters: {
        type: "object",
        properties: {
          threshold: { type: "number", description: "Minimum shared IPs to flag (default 2)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_recent_signups",
      description: "List recently created accounts for monitoring bot/spam signups.",
      parameters: {
        type: "object",
        properties: {
          hours: { type: "number", description: "Hours to look back (default 24)" },
          limit: { type: "number" },
        },
      },
    },
  },
  // ===== REPORTS & AUDIT =====
  {
    type: "function",
    function: {
      name: "list_user_reports",
      description: "List user-submitted reports (cheating, abuse, etc) with optional status filter.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["pending", "reviewed", "dismissed"] },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "review_user_report",
      description: "Review and act on a user report.",
      parameters: {
        type: "object",
        properties: {
          report_id: { type: "string" },
          action: { type: "string", enum: ["reviewed", "dismissed"], description: "Review action" },
          admin_notes: { type: "string" },
          ban_reported_user: { type: "boolean", description: "Also ban the reported user" },
        },
        required: ["report_id", "action"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_ban_audit_log",
      description: "List recent ban/unban audit log entries.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number" },
        },
      },
    },
  },
  // ===== PLATFORM & ANALYTICS =====
  {
    type: "function",
    function: {
      name: "get_platform_stats",
      description: "Get comprehensive platform statistics: total users, revenue, balances, tournament counts, pending requests.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_platform_health",
      description: "Run a comprehensive platform health check: database table sizes, pending actions, error rates, stale data, system status overview.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "analyze_user_behavior",
      description: "Analyze user behavior patterns: most active users, engagement metrics, retention indicators, spending patterns.",
      parameters: {
        type: "object",
        properties: {
          days: { type: "number", description: "Days to analyze (default 7)" },
          focus: { type: "string", enum: ["spending", "engagement", "retention", "all"], description: "What aspect to focus on" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_user_risk_score",
      description: "Calculate a risk score for a user based on their activity patterns, transaction history, login anomalies, and reports against them.",
      parameters: {
        type: "object",
        properties: {
          identifier: { type: "string", description: "User email, username, or UID" },
        },
        required: ["identifier"],
      },
    },
  },
  // ===== SITE SETTINGS =====
  {
    type: "function",
    function: {
      name: "update_site_setting",
      description: "Update a site setting (UPI ID, QR code URL, 2FA toggle, etc).",
      parameters: {
        type: "object",
        properties: {
          key: { type: "string", description: "Setting key e.g. 'payment_settings', 'security_settings'" },
          value: { type: "object", description: "JSON value to set" },
        },
        required: ["key", "value"],
      },
    },
  },
  // ===== TRAFFIC & THREAT DETECTION =====
  {
    type: "function",
    function: {
      name: "get_traffic_analysis",
      description: "Analyze traffic patterns: login frequency per hour, suspicious IP clusters, geographic anomalies, potential DDoS indicators, unusual access patterns.",
      parameters: {
        type: "object",
        properties: {
          hours: { type: "number", description: "Hours to analyze (default 24)" },
          focus: { type: "string", enum: ["overview", "suspicious_ips", "geographic", "rate_limiting", "all"], description: "Focus area" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_system_health_deep",
      description: "Deep system health check: database table row counts, data freshness, stale records, orphaned data, storage usage estimates, configuration integrity.",
      parameters: { type: "object", properties: {} },
    },
  },
  // ===== ACTIVITY LOGGING & DIAGNOSTICS =====
  {
    type: "function",
    function: {
      name: "get_activity_log",
      description: "Get comprehensive activity log: recent user actions, admin actions, financial events, tournament events, system events. Secure audit trail.",
      parameters: {
        type: "object",
        properties: {
          hours: { type: "number", description: "Hours to look back (default 24)" },
          category: { type: "string", enum: ["all", "admin", "financial", "tournaments", "security", "users"], description: "Filter by category" },
          limit: { type: "number", description: "Max entries (default 50)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_platform_diagnostics",
      description: "Run platform diagnostics: check for data inconsistencies, orphaned records, wallet balance mismatches, tournament player count accuracy, expired gift codes still active, stale pending requests.",
      parameters: { type: "object", properties: {} },
    },
  },
  // ===== ADMIN ALERTS =====
  {
    type: "function",
    function: {
      name: "send_admin_alert",
      description: "Send a critical alert notification to all admin users about a security threat, system issue, or urgent matter.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Alert title" },
          message: { type: "string", description: "Alert message with details" },
          severity: { type: "string", enum: ["info", "warning", "critical"], description: "Alert severity level" },
        },
        required: ["title", "message", "severity"],
      },
    },
  },
  // ===== OPTIMIZATION =====
  {
    type: "function",
    function: {
      name: "get_optimization_report",
      description: "Analyze platform performance and generate optimization suggestions: underperforming tournaments, inactive users, wallet efficiency, notification effectiveness, gift code performance.",
      parameters: {
        type: "object",
        properties: {
          days: { type: "number", description: "Days to analyze (default 30)" },
        },
      },
    },
  },
  // ===== SMART RECOMMENDATIONS =====
  {
    type: "function",
    function: {
      name: "get_smart_recommendations",
      description: "Generate AI-powered recommendations: suggest tournament schedules based on player activity, recommend prize pools, identify peak hours, suggest engagement strategies, detect churn risk users.",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["tournaments", "engagement", "revenue", "retention", "all"], description: "Recommendation focus" },
          days: { type: "number", description: "Days of historical data to analyze (default 14)" },
        },
      },
    },
  },
  // ===== CONTENT MODERATION =====
  {
    type: "function",
    function: {
      name: "delete_clip",
      description: "Delete a gaming clip by ID. Removes the clip and all associated likes, comments, and reports.",
      parameters: {
        type: "object",
        properties: {
          clip_id: { type: "string", description: "Clip UUID to delete" },
          reason: { type: "string", description: "Reason for deletion" },
        },
        required: ["clip_id", "reason"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_clip_reports",
      description: "List reported gaming clips with reporter info and status.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["pending", "reviewed", "dismissed"] },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "review_clip_report",
      description: "Review a clip report - dismiss it or take action (delete clip, ban uploader).",
      parameters: {
        type: "object",
        properties: {
          report_id: { type: "string" },
          action: { type: "string", enum: ["reviewed", "dismissed"] },
          delete_clip: { type: "boolean", description: "Also delete the reported clip" },
          ban_uploader: { type: "boolean", description: "Also ban the clip uploader" },
          admin_notes: { type: "string" },
        },
        required: ["report_id", "action"],
      },
    },
  },
  // ===== USER PROFILE MANAGEMENT =====
  {
    type: "function",
    function: {
      name: "update_user_profile",
      description: "Update a user's profile fields: username, full_name, avatar_url, city, country, phone, free_fire_uid, gender, age.",
      parameters: {
        type: "object",
        properties: {
          identifier: { type: "string", description: "User email, username, or UID" },
          username: { type: "string" },
          full_name: { type: "string" },
          city: { type: "string" },
          country: { type: "string" },
          phone: { type: "string" },
          free_fire_uid: { type: "string" },
          gender: { type: "string" },
          age: { type: "number" },
        },
        required: ["identifier"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "shadow_ban_user",
      description: "Shadow ban a user - they can still use the platform but their content is hidden from others. Stealthier than a full ban.",
      parameters: {
        type: "object",
        properties: {
          identifier: { type: "string", description: "User email, username, or UID" },
          enable: { type: "boolean", description: "true to shadow ban, false to remove shadow ban" },
          reason: { type: "string" },
        },
        required: ["identifier", "enable"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "verify_user_badge",
      description: "Grant or revoke verified badge for a user profile.",
      parameters: {
        type: "object",
        properties: {
          identifier: { type: "string", description: "User email, username, or UID" },
          verified: { type: "boolean", description: "true to verify, false to unverify" },
        },
        required: ["identifier", "verified"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "reset_user_password",
      description: "Reset a user's password to a new value via Edge Function.",
      parameters: {
        type: "object",
        properties: {
          identifier: { type: "string", description: "User email, username, or UID" },
          new_password: { type: "string", description: "New password to set (min 6 chars)" },
        },
        required: ["identifier", "new_password"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "recalculate_trust_score",
      description: "Recalculate and update a user's trust score based on their activity.",
      parameters: {
        type: "object",
        properties: {
          identifier: { type: "string", description: "User email, username, or UID" },
        },
        required: ["identifier"],
      },
    },
  },
  // ===== MODERATOR MANAGEMENT =====
  {
    type: "function",
    function: {
      name: "list_mod_applications",
      description: "List moderator applications with optional status filter.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["pending", "approved", "rejected"] },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "review_mod_application",
      description: "Approve or reject a moderator application. Approving grants the moderator role.",
      parameters: {
        type: "object",
        properties: {
          application_id: { type: "string" },
          action: { type: "string", enum: ["approved", "rejected"] },
          admin_notes: { type: "string" },
        },
        required: ["application_id", "action"],
      },
    },
  },
  // ===== MASS OPERATIONS =====
  {
    type: "function",
    function: {
      name: "mass_credit_users",
      description: "Credit wallet balance to multiple users at once (e.g., reward active users, compensation).",
      parameters: {
        type: "object",
        properties: {
          identifiers: { type: "array", items: { type: "string" }, description: "Array of user emails, usernames, or UIDs" },
          amount: { type: "number", description: "Amount in ₹ to credit each" },
          reason: { type: "string" },
        },
        required: ["identifiers", "amount", "reason"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "mass_notify_users",
      description: "Send a notification to a specific list of users.",
      parameters: {
        type: "object",
        properties: {
          identifiers: { type: "array", items: { type: "string" }, description: "Array of user emails, usernames, or UIDs" },
          title: { type: "string" },
          message: { type: "string" },
          type: { type: "string" },
        },
        required: ["identifiers", "title", "message"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "refund_all_tournament_participants",
      description: "Refund entry fees to all participants of a tournament without deleting it.",
      parameters: {
        type: "object",
        properties: {
          tournament_id: { type: "string" },
          reason: { type: "string" },
        },
        required: ["tournament_id"],
      },
    },
  },
  // ===== SUSPICIOUS ACTIVITY =====
  {
    type: "function",
    function: {
      name: "list_suspicious_activities",
      description: "List flagged suspicious activities with optional severity/status filter.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["pending", "reviewed", "dismissed"] },
          severity: { type: "string", enum: ["low", "medium", "high"] },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "review_suspicious_activity",
      description: "Review a suspicious activity entry - mark as reviewed or dismissed, optionally ban the user.",
      parameters: {
        type: "object",
        properties: {
          activity_id: { type: "string" },
          action: { type: "string", enum: ["reviewed", "dismissed"] },
          ban_user: { type: "boolean", description: "Also ban the flagged user" },
        },
        required: ["activity_id", "action"],
      },
    },
  },
  // ===== CONVERSATIONS & MESSAGES =====
  {
    type: "function",
    function: {
      name: "get_user_conversations",
      description: "View a user's direct message conversations and recent messages for moderation.",
      parameters: {
        type: "object",
        properties: {
          identifier: { type: "string", description: "User email, username, or UID" },
          limit: { type: "number", description: "Max conversations (default 10)" },
        },
        required: ["identifier"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_messages",
      description: "Delete specific messages by IDs or all messages from a user in a conversation. For content moderation.",
      parameters: {
        type: "object",
        properties: {
          message_ids: { type: "array", items: { type: "string" }, description: "Array of message UUIDs to delete" },
        },
        required: ["message_ids"],
      },
    },
  },
  // ===== LIVE STREAMS =====
  {
    type: "function",
    function: {
      name: "list_live_streams",
      description: "List current and recent live streams.",
      parameters: {
        type: "object",
        properties: {
          live_only: { type: "boolean", description: "Only show currently live streams" },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "end_live_stream",
      description: "Force-end a live stream (e.g., for rule violations).",
      parameters: {
        type: "object",
        properties: {
          stream_id: { type: "string" },
          reason: { type: "string" },
        },
        required: ["stream_id"],
      },
    },
  },
  // ===== APK MANAGEMENT =====
  {
    type: "function",
    function: {
      name: "list_apk_releases",
      description: "List all APK releases with download stats.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "create_apk_release",
      description: "Create a new APK release record.",
      parameters: {
        type: "object",
        properties: {
          version: { type: "string", description: "Version string e.g. 2.1.0" },
          file_url: { type: "string", description: "URL to the APK file" },
          file_size: { type: "string", description: "File size e.g. '45 MB'" },
          release_notes: { type: "string" },
          min_android: { type: "string", description: "Minimum Android version e.g. 'Android 7.0+'" },
        },
        required: ["version", "file_url"],
      },
    },
  },
  // ===== AUTOMATION RULES =====
  {
    type: "function",
    function: {
      name: "list_automation_rules",
      description: "List all automation rules for trigger-based moderation.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "create_automation_rule",
      description: "Create a new automation rule (e.g., auto-ban after X reports).",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          trigger_type: { type: "string", description: "e.g. 'reports_count', 'failed_logins', 'suspicious_activity'" },
          trigger_threshold: { type: "number" },
          action_type: { type: "string", description: "e.g. 'ban', 'notify_admin', 'shadow_ban', 'suspend'" },
          action_duration_hours: { type: "number" },
        },
        required: ["name", "trigger_type", "trigger_threshold", "action_type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "toggle_automation_rule",
      description: "Enable or disable an automation rule.",
      parameters: {
        type: "object",
        properties: {
          rule_id: { type: "string" },
          is_active: { type: "boolean" },
        },
        required: ["rule_id", "is_active"],
      },
    },
  },
  // ===== DATA EXPORT & ANALYTICS =====
  {
    type: "function",
    function: {
      name: "export_data_csv",
      description: "Export platform data as CSV text. Supports: users, transactions, tournaments, withdrawals, topups, reports, tickets, gift_codes.",
      parameters: {
        type: "object",
        properties: {
          table: { type: "string", enum: ["users", "transactions", "tournaments", "withdrawals", "topups", "reports", "tickets", "gift_codes"], description: "Which data to export" },
          filters: { type: "object", description: "Optional filters like {status: 'pending', days: 30}" },
          limit: { type: "number", description: "Max rows (default 100, max 500)" },
        },
        required: ["table"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cross_table_analytics",
      description: "Run advanced cross-table analytics: correlate user behavior with spending, tournament participation with retention, fraud patterns across tables, revenue cohort analysis, user lifecycle analysis.",
      parameters: {
        type: "object",
        properties: {
          analysis_type: { type: "string", enum: ["revenue_cohort", "user_lifecycle", "spending_vs_activity", "fraud_correlation", "tournament_roi", "retention_analysis", "whale_analysis", "churn_prediction"], description: "Type of cross-table analysis" },
          days: { type: "number", description: "Days to analyze (default 30)" },
        },
        required: ["analysis_type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compare_periods",
      description: "Compare platform metrics between two time periods. Shows growth/decline in users, revenue, tournaments, engagement.",
      parameters: {
        type: "object",
        properties: {
          period1_days: { type: "number", description: "First period: last N days from today" },
          period2_days: { type: "number", description: "Second period: N days before the first period" },
        },
        required: ["period1_days"],
      },
    },
  },
  // ===== ADVANCED USER OPERATIONS =====
  {
    type: "function",
    function: {
      name: "find_users_by_criteria",
      description: "Find users matching complex criteria: balance range, join date range, tournament count, trust score range, location, activity level. Returns matching users for further action.",
      parameters: {
        type: "object",
        properties: {
          min_balance: { type: "number" },
          max_balance: { type: "number" },
          min_trust_score: { type: "number" },
          max_trust_score: { type: "number" },
          min_tournaments: { type: "number" },
          joined_after: { type: "string", description: "ISO date string" },
          joined_before: { type: "string", description: "ISO date string" },
          country: { type: "string" },
          city: { type: "string" },
          is_banned: { type: "boolean" },
          is_verified: { type: "boolean" },
          has_no_activity_days: { type: "number", description: "Users inactive for N+ days" },
          limit: { type: "number", description: "Max results (default 50)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "bulk_action",
      description: "Execute a bulk action on multiple users at once: ban, unban, credit, debit, notify, shadow_ban, verify, set_role.",
      parameters: {
        type: "object",
        properties: {
          user_ids: { type: "array", items: { type: "string" }, description: "Array of user_id UUIDs" },
          action: { type: "string", enum: ["ban", "unban", "credit", "debit", "notify", "shadow_ban", "unshadow_ban", "verify", "unverify", "set_role"], description: "Action to perform" },
          amount: { type: "number", description: "Amount for credit/debit actions" },
          reason: { type: "string", description: "Reason for the action" },
          role: { type: "string", enum: ["admin", "moderator", "user"], description: "Role for set_role action" },
          notification_title: { type: "string", description: "Title for notify action" },
          notification_message: { type: "string", description: "Message for notify action" },
        },
        required: ["user_ids", "action"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_user_timeline",
      description: "Get a complete timeline of all activity for a specific user: logins, transactions, tournaments, reports, bans, tickets, clips, messages - chronologically ordered.",
      parameters: {
        type: "object",
        properties: {
          identifier: { type: "string", description: "User email, username, or UID" },
          days: { type: "number", description: "Days to look back (default 30)" },
        },
        required: ["identifier"],
      },
    },
  },
  // ===== REVENUE & GROWTH =====
  {
    type: "function",
    function: {
      name: "get_revenue_breakdown",
      description: "Detailed revenue breakdown: entry fees by game, top spending users, revenue per tournament, daily/weekly/monthly trends, average revenue per user.",
      parameters: {
        type: "object",
        properties: {
          days: { type: "number", description: "Days to analyze (default 30)" },
          group_by: { type: "string", enum: ["daily", "weekly", "monthly"], description: "Group revenue data by period" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_growth_metrics",
      description: "Platform growth metrics: new user signups per day, user retention rate, DAU/MAU ratio, tournament frequency growth, revenue growth rate.",
      parameters: {
        type: "object",
        properties: {
          days: { type: "number", description: "Days to analyze (default 30)" },
        },
      },
    },
  },
  // ===== CLEANUP & MAINTENANCE =====
  {
    type: "function",
    function: {
      name: "cleanup_stale_data",
      description: "Find and optionally clean up stale data: expired gift codes, old pending requests, inactive accounts, orphaned records. Dry run by default.",
      parameters: {
        type: "object",
        properties: {
          target: { type: "string", enum: ["expired_gift_codes", "stale_topups", "stale_withdrawals", "inactive_users", "old_notifications", "all"], description: "What to clean up" },
          dry_run: { type: "boolean", description: "If true (default), only show what would be cleaned. Set false to actually delete." },
          older_than_days: { type: "number", description: "Clean items older than N days (default 90)" },
        },
        required: ["target"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_leaderboard_data",
      description: "Get leaderboard rankings: top earners, most tournament wins, most active players, highest trust scores, most followed users.",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["earnings", "wins", "tournaments_played", "trust_score", "followers", "clips_views", "wallet_balance"], description: "Leaderboard type" },
          limit: { type: "number", description: "Top N users (default 20)" },
        },
        required: ["type"],
      },
    },
  },
];

// Helper: find user by email, username, or UID
async function findUser(supabase: any, identifier: string) {
  let { data } = await supabase.from("profiles").select("*").eq("email", identifier).maybeSingle();
  if (data) return data;
  ({ data } = await supabase.from("profiles").select("*").eq("username", identifier).maybeSingle());
  if (data) return data;
  ({ data } = await supabase.from("profiles").select("*").eq("uid", identifier).maybeSingle());
  if (data) return data;
  ({ data } = await supabase.from("profiles").select("*").eq("user_id", identifier).maybeSingle());
  return data;
}

// Execute a tool call
async function executeTool(supabase: any, adminId: string, name: string, args: any): Promise<string> {
  try {
    switch (name) {
      case "ban_user": {
        const user = await findUser(supabase, args.identifier);
        if (!user) return JSON.stringify({ success: false, error: "User not found" });
        await supabase.from("profiles").update({ is_banned: true }).eq("user_id", user.user_id);
        await supabase.from("ban_audit_log").insert({ user_id: user.user_id, admin_id: adminId, action: "ban", reason: args.reason });
        return JSON.stringify({ success: true, message: `User ${user.username || user.email} has been banned. Reason: ${args.reason}` });
      }
      case "unban_user": {
        const user = await findUser(supabase, args.identifier);
        if (!user) return JSON.stringify({ success: false, error: "User not found" });
        await supabase.from("profiles").update({ is_banned: false }).eq("user_id", user.user_id);
        await supabase.from("ban_audit_log").insert({ user_id: user.user_id, admin_id: adminId, action: "unban", reason: "Unbanned via AI agent" });
        return JSON.stringify({ success: true, message: `User ${user.username || user.email} has been unbanned.` });
      }
      case "get_user_details": {
        const user = await findUser(supabase, args.identifier);
        if (!user) return JSON.stringify({ success: false, error: "User not found" });
        const [{ data: wallet }, { data: txns }, { data: tournaments }, { data: roles }, { data: reports }, { data: logins }] = await Promise.all([
          supabase.from("wallets").select("balance").eq("user_id", user.user_id).maybeSingle(),
          supabase.from("wallet_transactions").select("*").eq("user_id", user.user_id).order("created_at", { ascending: false }).limit(10),
          supabase.from("tournament_participants").select("tournament_id, joined_at, is_winner, player_name, game_uid").eq("user_id", user.user_id),
          supabase.from("user_roles").select("role").eq("user_id", user.user_id),
          supabase.from("user_reports").select("*").eq("reported_user_id", user.user_id).order("created_at", { ascending: false }).limit(5),
          supabase.from("login_history").select("logged_in_at, ip_address, city, country, browser, device_name").eq("user_id", user.user_id).order("logged_in_at", { ascending: false }).limit(5),
        ]);
        return JSON.stringify({ success: true, user, wallet, recent_transactions: txns, tournaments, roles, reports_against: reports, recent_logins: logins });
      }
      case "delete_user_data": {
        if (!args.confirm) return JSON.stringify({ success: false, error: "Deletion not confirmed. Set confirm=true to proceed." });
        const user = await findUser(supabase, args.identifier);
        if (!user) return JSON.stringify({ success: false, error: "User not found" });
        await Promise.all([
          supabase.from("wallet_transactions").delete().eq("user_id", user.user_id),
          supabase.from("wallets").delete().eq("user_id", user.user_id),
          supabase.from("tournament_participants").delete().eq("user_id", user.user_id),
          supabase.from("notifications").delete().eq("user_id", user.user_id),
          supabase.from("topup_requests").delete().eq("user_id", user.user_id),
          supabase.from("withdrawal_requests").delete().eq("user_id", user.user_id),
          supabase.from("support_tickets").delete().eq("user_id", user.user_id),
          supabase.from("user_roles").delete().eq("user_id", user.user_id),
          supabase.from("profile_likes").delete().eq("user_id", user.user_id),
          supabase.from("profile_likes").delete().eq("profile_user_id", user.user_id),
          supabase.from("ban_audit_log").insert({ user_id: user.user_id, admin_id: adminId, action: "delete", reason: "User data deleted via AI agent" }),
        ]);
        await supabase.from("profiles").delete().eq("user_id", user.user_id);
        return JSON.stringify({ success: true, message: `All data for ${user.username || user.email} has been deleted.` });
      }
      case "set_user_role": {
        const user = await findUser(supabase, args.identifier);
        if (!user) return JSON.stringify({ success: false, error: "User not found" });
        await supabase.from("user_roles").delete().eq("user_id", user.user_id);
        const { error } = await supabase.from("user_roles").insert({ user_id: user.user_id, role: args.role });
        if (error) return JSON.stringify({ success: false, error: error.message });
        return JSON.stringify({ success: true, message: `${user.username || user.email} role set to ${args.role}` });
      }
      case "mass_ban_users": {
        const results: string[] = [];
        for (const id of args.identifiers) {
          const user = await findUser(supabase, id);
          if (!user) { results.push(`❌ ${id}: not found`); continue; }
          await supabase.from("profiles").update({ is_banned: true }).eq("user_id", user.user_id);
          await supabase.from("ban_audit_log").insert({ user_id: user.user_id, admin_id: adminId, action: "ban", reason: args.reason });
          results.push(`✅ ${user.username || user.email}: banned`);
        }
        return JSON.stringify({ success: true, message: `Mass ban complete`, results });
      }
      case "list_users": {
        let query = supabase.from("profiles").select("username, email, uid, is_banned, created_at, last_seen, user_id");
        if (args.banned_only) query = query.eq("is_banned", true);
        if (args.search) query = query.or(`username.ilike.%${args.search}%,email.ilike.%${args.search}%,uid.ilike.%${args.search}%`);
        const { data } = await query.order("created_at", { ascending: false }).limit(args.limit || 20);
        return JSON.stringify({ success: true, users: data || [], count: data?.length || 0 });
      }
      case "suspend_user": {
        const user = await findUser(supabase, args.identifier);
        if (!user) return JSON.stringify({ success: false, error: "User not found" });
        await supabase.from("profiles").update({ is_banned: true }).eq("user_id", user.user_id);
        await supabase.from("ban_audit_log").insert({ user_id: user.user_id, admin_id: adminId, action: "suspend", reason: `Suspended: ${args.reason}` });
        if (args.notify) {
          await supabase.from("notifications").insert({ user_id: user.user_id, type: "security", title: "⚠️ Account Suspended", message: `Your account has been temporarily suspended for review. Reason: ${args.reason}` });
        }
        return JSON.stringify({ success: true, message: `User ${user.username || user.email} has been suspended. Reason: ${args.reason}` });
      }
      case "verify_user": {
        const user = await findUser(supabase, args.identifier);
        if (!user) return JSON.stringify({ success: false, error: "User not found" });
        await supabase.from("profiles").update({ is_banned: false }).eq("user_id", user.user_id);
        // Ensure they have a 'user' role
        const { data: existingRole } = await supabase.from("user_roles").select("id").eq("user_id", user.user_id).maybeSingle();
        if (!existingRole) {
          await supabase.from("user_roles").insert({ user_id: user.user_id, role: "user" });
        }
        await supabase.from("ban_audit_log").insert({ user_id: user.user_id, admin_id: adminId, action: "verify", reason: "User verified via AI agent" });
        return JSON.stringify({ success: true, message: `User ${user.username || user.email} has been verified and reinstated.` });
      }
      case "approve_withdrawal": {
        const { data: wr } = await supabase.from("withdrawal_requests").select("*").eq("id", args.withdrawal_id).eq("status", "pending").maybeSingle();
        if (!wr) return JSON.stringify({ success: false, error: "Pending withdrawal not found" });
        await supabase.from("withdrawal_requests").update({ status: "approved", processed_by: adminId, processed_at: new Date().toISOString(), admin_notes: args.admin_notes || "Approved via AI" }).eq("id", args.withdrawal_id);
        const { data: currentWallet } = await supabase.from("wallets").select("balance").eq("user_id", wr.user_id).maybeSingle();
        if (currentWallet) {
          await supabase.from("wallets").update({ balance: Number(currentWallet.balance) - Number(wr.amount) }).eq("user_id", wr.user_id);
        }
        await supabase.from("wallet_transactions").insert({ user_id: wr.user_id, amount: -Number(wr.amount), type: "withdrawal", description: `Withdrawal approved - UPI: ${wr.upi_id}` });
        return JSON.stringify({ success: true, message: `Withdrawal of ₹${wr.amount} approved for UPI ${wr.upi_id}` });
      }
      case "reject_withdrawal": {
        const { data: wr } = await supabase.from("withdrawal_requests").select("*").eq("id", args.withdrawal_id).eq("status", "pending").maybeSingle();
        if (!wr) return JSON.stringify({ success: false, error: "Pending withdrawal not found" });
        await supabase.from("withdrawal_requests").update({ status: "rejected", processed_by: adminId, processed_at: new Date().toISOString(), admin_notes: args.admin_notes }).eq("id", args.withdrawal_id);
        return JSON.stringify({ success: true, message: `Withdrawal of ₹${wr.amount} rejected. Reason: ${args.admin_notes}` });
      }
      case "approve_topup": {
        const { data: tr } = await supabase.from("topup_requests").select("*").eq("id", args.topup_id).eq("status", "pending").maybeSingle();
        if (!tr) return JSON.stringify({ success: false, error: "Pending topup not found" });
        await supabase.from("topup_requests").update({ status: "approved", approved_by: adminId, admin_notes: args.admin_notes || "Approved via AI" }).eq("id", args.topup_id);
        const { data: w } = await supabase.from("wallets").select("balance").eq("user_id", tr.user_id).maybeSingle();
        if (w) {
          await supabase.from("wallets").update({ balance: Number(w.balance) + Number(tr.amount) }).eq("user_id", tr.user_id);
        }
        await supabase.from("wallet_transactions").insert({ user_id: tr.user_id, amount: Number(tr.amount), type: "deposit", description: `Topup approved - UTR: ${tr.utr}` });
        return JSON.stringify({ success: true, message: `Topup of ₹${tr.amount} approved (UTR: ${tr.utr})` });
      }
      case "reject_topup": {
        const { data: tr } = await supabase.from("topup_requests").select("*").eq("id", args.topup_id).eq("status", "pending").maybeSingle();
        if (!tr) return JSON.stringify({ success: false, error: "Pending topup not found" });
        await supabase.from("topup_requests").update({ status: "rejected", approved_by: adminId, admin_notes: args.admin_notes }).eq("id", args.topup_id);
        return JSON.stringify({ success: true, message: `Topup of ₹${tr.amount} rejected. Reason: ${args.admin_notes}` });
      }
      case "bulk_approve_topups": {
        const { data: pending } = await supabase.from("topup_requests").select("*").eq("status", "pending");
        if (!pending || pending.length === 0) return JSON.stringify({ success: true, message: "No pending topup requests found." });
        let approved = 0;
        for (const tr of pending) {
          await supabase.from("topup_requests").update({ status: "approved", approved_by: adminId, admin_notes: "Bulk approved via AI" }).eq("id", tr.id);
          const { data: w } = await supabase.from("wallets").select("balance").eq("user_id", tr.user_id).maybeSingle();
          if (w) {
            await supabase.from("wallets").update({ balance: Number(w.balance) + Number(tr.amount) }).eq("user_id", tr.user_id);
          }
          await supabase.from("wallet_transactions").insert({ user_id: tr.user_id, amount: Number(tr.amount), type: "deposit", description: `Topup bulk approved - UTR: ${tr.utr}` });
          approved++;
        }
        return JSON.stringify({ success: true, message: `${approved} topup requests approved.` });
      }
      case "bulk_approve_withdrawals": {
        const { data: pending } = await supabase.from("withdrawal_requests").select("*").eq("status", "pending");
        if (!pending || pending.length === 0) return JSON.stringify({ success: true, message: "No pending withdrawal requests found." });
        let approved = 0;
        for (const wr of pending) {
          await supabase.from("withdrawal_requests").update({ status: "approved", processed_by: adminId, processed_at: new Date().toISOString(), admin_notes: "Bulk approved via AI" }).eq("id", wr.id);
          const { data: w } = await supabase.from("wallets").select("balance").eq("user_id", wr.user_id).maybeSingle();
          if (w) {
            await supabase.from("wallets").update({ balance: Number(w.balance) - Number(wr.amount) }).eq("user_id", wr.user_id);
          }
          await supabase.from("wallet_transactions").insert({ user_id: wr.user_id, amount: -Number(wr.amount), type: "withdrawal", description: `Withdrawal bulk approved - UPI: ${wr.upi_id}` });
          approved++;
        }
        return JSON.stringify({ success: true, message: `${approved} withdrawal requests approved.` });
      }
      case "credit_user_wallet": {
        const user = await findUser(supabase, args.identifier);
        if (!user) return JSON.stringify({ success: false, error: "User not found" });
        const { data: w } = await supabase.from("wallets").select("balance").eq("user_id", user.user_id).maybeSingle();
        if (!w) return JSON.stringify({ success: false, error: "Wallet not found" });
        await supabase.from("wallets").update({ balance: Number(w.balance) + Number(args.amount) }).eq("user_id", user.user_id);
        await supabase.from("wallet_transactions").insert({ user_id: user.user_id, amount: Number(args.amount), type: "admin_credit", description: args.reason });
        return JSON.stringify({ success: true, message: `₹${args.amount} credited to ${user.username || user.email}. New balance: ₹${(Number(w.balance) + Number(args.amount)).toFixed(2)}` });
      }
      case "debit_user_wallet": {
        const user = await findUser(supabase, args.identifier);
        if (!user) return JSON.stringify({ success: false, error: "User not found" });
        const { data: w } = await supabase.from("wallets").select("balance").eq("user_id", user.user_id).maybeSingle();
        if (!w) return JSON.stringify({ success: false, error: "Wallet not found" });
        if (Number(w.balance) < Number(args.amount)) return JSON.stringify({ success: false, error: `Insufficient balance. Current: ₹${w.balance}` });
        await supabase.from("wallets").update({ balance: Number(w.balance) - Number(args.amount) }).eq("user_id", user.user_id);
        await supabase.from("wallet_transactions").insert({ user_id: user.user_id, amount: -Number(args.amount), type: "admin_debit", description: args.reason });
        return JSON.stringify({ success: true, message: `₹${args.amount} debited from ${user.username || user.email}. New balance: ₹${(Number(w.balance) - Number(args.amount)).toFixed(2)}` });
      }
      case "refund_user": {
        const user = await findUser(supabase, args.identifier);
        if (!user) return JSON.stringify({ success: false, error: "User not found" });
        const { data: w } = await supabase.from("wallets").select("balance").eq("user_id", user.user_id).maybeSingle();
        if (!w) return JSON.stringify({ success: false, error: "Wallet not found" });
        await supabase.from("wallets").update({ balance: Number(w.balance) + Number(args.amount) }).eq("user_id", user.user_id);
        await supabase.from("wallet_transactions").insert({ user_id: user.user_id, amount: Number(args.amount), type: "refund", description: args.reason });
        return JSON.stringify({ success: true, message: `₹${args.amount} refunded to ${user.username || user.email}. Reason: ${args.reason}` });
      }
      case "list_pending_withdrawals": {
        const { data } = await supabase.from("withdrawal_requests").select("id, amount, upi_id, account_holder_name, user_id, created_at").eq("status", "pending").order("created_at", { ascending: false });
        if (data) {
          for (const w of data) {
            const { data: p } = await supabase.from("profiles").select("username, email").eq("user_id", w.user_id).maybeSingle();
            (w as any).username = p?.username; (w as any).email = p?.email;
          }
        }
        return JSON.stringify({ success: true, withdrawals: data || [], count: data?.length || 0 });
      }
      case "list_pending_topups": {
        const { data } = await supabase.from("topup_requests").select("id, amount, utr, user_id, created_at, screenshot_url").eq("status", "pending").order("created_at", { ascending: false });
        if (data) {
          for (const t of data) {
            const { data: p } = await supabase.from("profiles").select("username, email").eq("user_id", t.user_id).maybeSingle();
            (t as any).username = p?.username; (t as any).email = p?.email;
          }
        }
        return JSON.stringify({ success: true, topups: data || [], count: data?.length || 0 });
      }
      case "get_recent_transactions": {
        let query = supabase.from("wallet_transactions").select("id, user_id, amount, type, description, created_at");
        if (args.type) query = query.eq("type", args.type);
        const { data } = await query.order("created_at", { ascending: false }).limit(args.limit || 30);
        if (data) {
          for (const t of data) {
            const { data: p } = await supabase.from("profiles").select("username, email").eq("user_id", t.user_id).maybeSingle();
            (t as any).username = p?.username; (t as any).email = p?.email;
          }
        }
        return JSON.stringify({ success: true, transactions: data || [], count: data?.length || 0 });
      }
      case "get_financial_report": {
        const days = args.days || 30;
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        const { data: txns } = await supabase.from("wallet_transactions").select("amount, type, created_at").gte("created_at", since);
        const breakdown: Record<string, { count: number; total: number }> = {};
        for (const t of (txns || [])) {
          if (!breakdown[t.type]) breakdown[t.type] = { count: 0, total: 0 };
          breakdown[t.type].count++;
          breakdown[t.type].total += Number(t.amount);
        }
        const totalDeposits = breakdown["deposit"]?.total || 0;
        const totalWithdrawals = Math.abs(breakdown["withdrawal"]?.total || 0);
        const entryFees = Math.abs(breakdown["entry_fee"]?.total || 0);
        const prizes = breakdown["prize"]?.total || 0;
        const refunds = breakdown["refund"]?.total || 0;
        const netRevenue = entryFees - prizes - refunds;
        const { data: wallets } = await supabase.from("wallets").select("balance");
        const totalPlatformBalance = wallets?.reduce((s: number, w: any) => s + Number(w.balance), 0) || 0;
        return JSON.stringify({
          success: true,
          period: `Last ${days} days`,
          breakdown,
          summary: {
            total_deposits: totalDeposits,
            total_withdrawals: totalWithdrawals,
            entry_fee_revenue: entryFees,
            prizes_distributed: prizes,
            refunds_given: refunds,
            net_platform_revenue: netRevenue,
            current_platform_balance: totalPlatformBalance,
            total_transactions: txns?.length || 0,
          },
        });
      }
      case "create_tournament": {
        const { data, error } = await supabase.from("tournaments").insert({
          title: args.title, game: args.game, entry_fee: args.entry_fee, prize_pool: args.prize_pool,
          max_players: args.max_players, start_time: args.start_time, description: args.description || null,
        }).select().single();
        if (error) return JSON.stringify({ success: false, error: error.message });
        return JSON.stringify({ success: true, message: `Tournament "${args.title}" created`, tournament: data });
      }
      case "update_tournament": {
        const updates: any = {};
        if (args.status) updates.status = args.status;
        if (args.room_id) updates.room_id = args.room_id;
        if (args.room_password) updates.room_password = args.room_password;
        if (args.title) updates.title = args.title;
        if (args.prize_pool !== undefined) updates.prize_pool = args.prize_pool;
        if (args.description) updates.description = args.description;
        const { error } = await supabase.from("tournaments").update(updates).eq("id", args.tournament_id);
        if (error) return JSON.stringify({ success: false, error: error.message });
        return JSON.stringify({ success: true, message: `Tournament updated` });
      }
      case "delete_tournament": {
        const { data: participants } = await supabase.from("tournament_participants").select("user_id").eq("tournament_id", args.tournament_id);
        const { data: tournament } = await supabase.from("tournaments").select("entry_fee, title").eq("id", args.tournament_id).maybeSingle();
        if (tournament && participants && Number(tournament.entry_fee) > 0) {
          for (const p of participants) {
            const { data: w } = await supabase.from("wallets").select("balance").eq("user_id", p.user_id).maybeSingle();
            if (w) {
              await supabase.from("wallets").update({ balance: Number(w.balance) + Number(tournament.entry_fee) }).eq("user_id", p.user_id);
              await supabase.from("wallet_transactions").insert({ user_id: p.user_id, amount: Number(tournament.entry_fee), type: "refund", description: `Refund - Tournament "${tournament.title}" deleted` });
            }
          }
        }
        await supabase.from("tournament_participants").delete().eq("tournament_id", args.tournament_id);
        await supabase.from("tournaments").delete().eq("id", args.tournament_id);
        return JSON.stringify({ success: true, message: `Tournament deleted. ${participants?.length || 0} participants refunded.` });
      }
      case "list_tournaments": {
        let query = supabase.from("tournaments").select("id, title, game, status, current_players, max_players, prize_pool, entry_fee, start_time");
        if (args.status) query = query.eq("status", args.status);
        const { data } = await query.order("created_at", { ascending: false }).limit(args.limit || 20);
        return JSON.stringify({ success: true, tournaments: data || [] });
      }
      case "declare_tournament_winner": {
        const user = await findUser(supabase, args.winner_identifier);
        if (!user) return JSON.stringify({ success: false, error: "Winner user not found" });
        const { error: pErr } = await supabase.from("tournament_participants").update({ is_winner: true }).eq("tournament_id", args.tournament_id).eq("user_id", user.user_id);
        if (pErr) return JSON.stringify({ success: false, error: "User may not be a participant: " + pErr.message });
        const { data: w } = await supabase.from("wallets").select("balance").eq("user_id", user.user_id).maybeSingle();
        if (w) {
          await supabase.from("wallets").update({ balance: Number(w.balance) + Number(args.prize_amount) }).eq("user_id", user.user_id);
          await supabase.from("wallet_transactions").insert({ user_id: user.user_id, amount: Number(args.prize_amount), type: "prize", description: `Tournament prize`, reference_id: args.tournament_id });
        }
        await supabase.from("notifications").insert({ user_id: user.user_id, type: "tournament_winner", title: "🏆 You Won!", message: `Congratulations! You won ₹${args.prize_amount}!`, tournament_id: args.tournament_id });
        return JSON.stringify({ success: true, message: `${user.username || user.email} declared winner! ₹${args.prize_amount} awarded.` });
      }
      case "get_tournament_participants": {
        const { data } = await supabase.from("tournament_participants").select("user_id, player_name, game_uid, phone_number, joined_at, is_winner").eq("tournament_id", args.tournament_id);
        if (data) {
          for (const p of data) {
            const { data: profile } = await supabase.from("profiles").select("username, email").eq("user_id", p.user_id).maybeSingle();
            (p as any).username = profile?.username; (p as any).email = profile?.email;
          }
        }
        return JSON.stringify({ success: true, participants: data || [], count: data?.length || 0 });
      }
      case "get_tournament_analytics": {
        const days = args.days || 30;
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        const { data: tournaments } = await supabase.from("tournaments").select("*").gte("created_at", since);
        const { data: participants } = await supabase.from("tournament_participants").select("tournament_id, user_id").gte("joined_at", since);

        const totalTournaments = tournaments?.length || 0;
        const gameBreakdown: Record<string, number> = {};
        let totalPrize = 0, totalEntryRevenue = 0, totalPlayers = 0;
        for (const t of (tournaments || [])) {
          gameBreakdown[t.game] = (gameBreakdown[t.game] || 0) + 1;
          totalPrize += Number(t.prize_pool || 0);
          totalEntryRevenue += Number(t.entry_fee || 0) * Number(t.current_players || 0);
          totalPlayers += Number(t.current_players || 0);
        }
        const avgFillRate = totalTournaments > 0 
          ? (tournaments || []).reduce((s: number, t: any) => s + (t.current_players / t.max_players), 0) / totalTournaments * 100 
          : 0;
        const uniquePlayers = new Set(participants?.map((p: any) => p.user_id) || []).size;

        return JSON.stringify({
          success: true,
          period: `Last ${days} days`,
          total_tournaments: totalTournaments,
          game_breakdown: gameBreakdown,
          total_prize_distributed: totalPrize,
          total_entry_fee_revenue: totalEntryRevenue,
          total_participations: totalPlayers,
          unique_players: uniquePlayers,
          average_fill_rate: `${avgFillRate.toFixed(1)}%`,
          avg_players_per_tournament: totalTournaments > 0 ? (totalPlayers / totalTournaments).toFixed(1) : 0,
        });
      }
      case "create_gift_code": {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + (args.expiry_days || 30));
        const { error } = await supabase.from("gift_codes").insert({
          code: args.code.toUpperCase(), amount: args.amount, max_uses: args.max_uses, expiry: expiry.toISOString(), created_by: adminId,
        });
        if (error) return JSON.stringify({ success: false, error: error.message });
        return JSON.stringify({ success: true, message: `Gift code ${args.code.toUpperCase()} created: ₹${args.amount}, ${args.max_uses} uses, expires in ${args.expiry_days} days` });
      }
      case "toggle_gift_code": {
        const { error } = await supabase.from("gift_codes").update({ is_active: args.is_active }).eq("code", args.code.toUpperCase());
        if (error) return JSON.stringify({ success: false, error: error.message });
        return JSON.stringify({ success: true, message: `Gift code ${args.code.toUpperCase()} ${args.is_active ? "activated" : "deactivated"}` });
      }
      case "list_gift_codes": {
        let query = supabase.from("gift_codes").select("*");
        if (args.active_only) query = query.eq("is_active", true);
        const { data } = await query.order("created_at", { ascending: false });
        return JSON.stringify({ success: true, gift_codes: data || [], count: data?.length || 0 });
      }
      case "resolve_ticket": {
        const { error } = await supabase.from("support_tickets").update({
          status: args.status || "resolved", admin_notes: args.admin_notes, resolved_by: adminId, resolved_at: new Date().toISOString(),
        }).eq("id", args.ticket_id);
        if (error) return JSON.stringify({ success: false, error: error.message });
        return JSON.stringify({ success: true, message: `Ticket resolved` });
      }
      case "list_open_tickets": {
        const { data } = await supabase.from("support_tickets").select("*").in("status", ["open", "in_progress"]).order("created_at", { ascending: false });
        return JSON.stringify({ success: true, tickets: data || [], count: data?.length || 0 });
      }
      case "create_announcement": {
        const { error } = await supabase.from("announcements").insert({
          title: args.title, content: args.content, type: args.type || "general", created_by: adminId, is_published: true,
        });
        if (error) return JSON.stringify({ success: false, error: error.message });
        return JSON.stringify({ success: true, message: `Announcement "${args.title}" published` });
      }
      case "delete_announcement": {
        const { error } = await supabase.from("announcements").delete().eq("id", args.announcement_id);
        if (error) return JSON.stringify({ success: false, error: error.message });
        return JSON.stringify({ success: true, message: `Announcement deleted` });
      }
      case "list_announcements": {
        const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false }).limit(args.limit || 20);
        return JSON.stringify({ success: true, announcements: data || [] });
      }
      case "send_notification": {
        if (args.target === "all") {
          const { data: allUsers } = await supabase.from("profiles").select("user_id");
          if (allUsers) {
            const notifications = allUsers.map((u: any) => ({
              user_id: u.user_id, title: args.title, message: args.message, type: args.type || "admin",
            }));
            await supabase.from("notifications").insert(notifications);
          }
          return JSON.stringify({ success: true, message: `Notification sent to ${allUsers?.length || 0} users` });
        } else {
          const user = await findUser(supabase, args.target);
          if (!user) return JSON.stringify({ success: false, error: "User not found" });
          await supabase.from("notifications").insert({ user_id: user.user_id, title: args.title, message: args.message, type: args.type || "admin" });
          return JSON.stringify({ success: true, message: `Notification sent to ${user.username || user.email}` });
        }
      }
      case "send_direct_message": {
        const user = await findUser(supabase, args.identifier);
        if (!user) return JSON.stringify({ success: false, error: "Recipient not found" });
        if (user.user_id === adminId) return JSON.stringify({ success: false, error: "Cannot send a message to yourself" });
        if (!args.message || !String(args.message).trim()) {
          return JSON.stringify({ success: false, error: "Message content is required" });
        }

        // Find existing 1-on-1 conversation between admin and recipient
        const { data: adminConvs } = await supabase
          .from("conversation_participants")
          .select("conversation_id")
          .eq("user_id", adminId);
        const adminConvIds = (adminConvs || []).map((c: any) => c.conversation_id);

        let conversationId: string | null = null;
        if (adminConvIds.length > 0) {
          const { data: shared } = await supabase
            .from("conversation_participants")
            .select("conversation_id")
            .eq("user_id", user.user_id)
            .in("conversation_id", adminConvIds)
            .limit(1);
          if (shared && shared.length > 0) conversationId = shared[0].conversation_id;
        }

        if (!conversationId) {
          const { data: newConv, error: convErr } = await supabase
            .from("conversations").insert({}).select("id").single();
          if (convErr || !newConv) {
            return JSON.stringify({ success: false, error: "Failed to create conversation: " + (convErr?.message || "unknown") });
          }
          conversationId = newConv.id;
          const { error: partErr } = await supabase.from("conversation_participants").insert([
            { conversation_id: conversationId, user_id: adminId },
            { conversation_id: conversationId, user_id: user.user_id },
          ]);
          if (partErr) {
            return JSON.stringify({ success: false, error: "Failed to add participants: " + partErr.message });
          }
        }

        const { error: msgErr } = await supabase.from("direct_messages").insert({
          conversation_id: conversationId,
          sender_id: adminId,
          content: String(args.message),
        });
        if (msgErr) return JSON.stringify({ success: false, error: "Failed to send message: " + msgErr.message });

        await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);

        return JSON.stringify({
          success: true,
          message: `Direct message sent to ${user.username || user.email || user.uid}`,
          conversation_id: conversationId,
          recipient: { user_id: user.user_id, email: user.email, username: user.username, uid: user.uid },
        });
      }
      case "broadcast_maintenance": {
        // Create maintenance announcement
        await supabase.from("announcements").insert({
          title: args.title, content: `${args.message}${args.scheduled_time ? `\n\nScheduled: ${args.scheduled_time}` : ""}${args.duration_hours ? `\nEstimated duration: ${args.duration_hours} hours` : ""}`,
          type: "maintenance", created_by: adminId, is_published: true,
        });
        // Notify all users
        const { data: allUsers } = await supabase.from("profiles").select("user_id");
        if (allUsers) {
          const notifications = allUsers.map((u: any) => ({
            user_id: u.user_id, title: `🔧 ${args.title}`, message: args.message, type: "maintenance",
          }));
          await supabase.from("notifications").insert(notifications);
        }
        return JSON.stringify({ success: true, message: `Maintenance broadcast sent to ${allUsers?.length || 0} users` });
      }
      case "detect_fraud": {
        const scanType = args.scan_type || "full";
        const findings: string[] = [];

        if (scanType === "full" || scanType === "wallets") {
          const { data: highBalances } = await supabase.from("wallets").select("user_id, balance").gt("balance", 10000).order("balance", { ascending: false }).limit(10);
          if (highBalances?.length) {
            for (const hb of highBalances) {
              const { data: p } = await supabase.from("profiles").select("username, email").eq("user_id", hb.user_id).maybeSingle();
              findings.push(`⚠️ High balance: ${p?.username || p?.email || hb.user_id} has ₹${hb.balance}`);
            }
          }
        }

        if (scanType === "full" || scanType === "topups") {
          const { data: recentTopups } = await supabase.from("topup_requests").select("user_id, amount, created_at, utr").eq("status", "pending").order("created_at", { ascending: false }).limit(50);
          const userTopupCounts: Record<string, number> = {};
          recentTopups?.forEach((t: any) => { userTopupCounts[t.user_id] = (userTopupCounts[t.user_id] || 0) + 1; });
          for (const [uid, count] of Object.entries(userTopupCounts)) {
            if (count >= 3) {
              const { data: p } = await supabase.from("profiles").select("username, email").eq("user_id", uid).maybeSingle();
              findings.push(`⚠️ Rapid topups: ${p?.username || p?.email || uid} has ${count} pending topup requests`);
            }
          }
          const utrs = recentTopups?.map((t: any) => t.utr) || [];
          const dupeUtrs = utrs.filter((u: string, i: number) => utrs.indexOf(u) !== i);
          if (dupeUtrs.length) findings.push(`🚨 Duplicate UTRs detected: ${[...new Set(dupeUtrs)].join(", ")}`);
        }

        if (scanType === "full" || scanType === "withdrawals") {
          const { data: recentWd } = await supabase.from("withdrawal_requests").select("user_id, amount, created_at").eq("status", "pending").order("created_at", { ascending: false }).limit(50);
          const userWdCounts: Record<string, { count: number; total: number }> = {};
          recentWd?.forEach((w: any) => {
            if (!userWdCounts[w.user_id]) userWdCounts[w.user_id] = { count: 0, total: 0 };
            userWdCounts[w.user_id].count++;
            userWdCounts[w.user_id].total += Number(w.amount);
          });
          for (const [uid, stats] of Object.entries(userWdCounts)) {
            if (stats.count >= 3 || stats.total >= 5000) {
              const { data: p } = await supabase.from("profiles").select("username, email").eq("user_id", uid).maybeSingle();
              findings.push(`⚠️ Suspicious withdrawals: ${p?.username || p?.email || uid} - ${stats.count} pending totaling ₹${stats.total}`);
            }
          }
        }

        if (scanType === "full" || scanType === "logins") {
          const { data: recentLogins } = await supabase.from("login_history").select("user_id, ip_address").order("logged_in_at", { ascending: false }).limit(500);
          const ipUsers: Record<string, Set<string>> = {};
          recentLogins?.forEach((l: any) => {
            if (l.ip_address) {
              if (!ipUsers[l.ip_address]) ipUsers[l.ip_address] = new Set();
              ipUsers[l.ip_address].add(l.user_id);
            }
          });
          for (const [ip, users] of Object.entries(ipUsers)) {
            if (users.size >= 3) {
              findings.push(`🚨 Shared IP ${ip}: ${users.size} different accounts logged in from this IP`);
            }
          }
        }

        if (scanType === "full" || scanType === "duplicates") {
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
          const { count: recentSignups } = await supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", oneHourAgo);
          if ((recentSignups || 0) >= 5) {
            findings.push(`🚨 ${recentSignups} accounts created in the last hour - possible bot/spam activity`);
          }
        }

        if (scanType === "full" || scanType === "financial_patterns") {
          // Check for deposit-then-withdraw patterns (money laundering indicator)
          const { data: recentTxns } = await supabase.from("wallet_transactions").select("user_id, amount, type, created_at").order("created_at", { ascending: false }).limit(200);
          const userPatterns: Record<string, { deposits: number; withdrawals: number; timespan_hours: number }> = {};
          for (const t of (recentTxns || [])) {
            if (!userPatterns[t.user_id]) userPatterns[t.user_id] = { deposits: 0, withdrawals: 0, timespan_hours: 0 };
            if (t.type === "deposit") userPatterns[t.user_id].deposits += Number(t.amount);
            if (t.type === "withdrawal") userPatterns[t.user_id].withdrawals += Math.abs(Number(t.amount));
          }
          for (const [uid, pattern] of Object.entries(userPatterns)) {
            if (pattern.deposits > 0 && pattern.withdrawals > 0 && pattern.withdrawals >= pattern.deposits * 0.8) {
              const { data: p } = await supabase.from("profiles").select("username, email").eq("user_id", uid).maybeSingle();
              findings.push(`🚨 Deposit-withdraw pattern: ${p?.username || p?.email || uid} deposited ₹${pattern.deposits}, withdrew ₹${pattern.withdrawals}`);
            }
          }
        }

        if (scanType === "full" || scanType === "anti_cheat") {
          // Check for users winning too many tournaments
          const { data: winners } = await supabase.from("tournament_participants").select("user_id").eq("is_winner", true);
          const winCounts: Record<string, number> = {};
          winners?.forEach((w: any) => { winCounts[w.user_id] = (winCounts[w.user_id] || 0) + 1; });
          for (const [uid, count] of Object.entries(winCounts)) {
            if (count >= 5) {
              const { data: p } = await supabase.from("profiles").select("username, email").eq("user_id", uid).maybeSingle();
              findings.push(`🎮 Potential cheater: ${p?.username || p?.email || uid} won ${count} tournaments - review gameplay`);
            }
          }
          // Check for users joining with similar game UIDs
          const { data: recentParticipants } = await supabase.from("tournament_participants").select("user_id, game_uid, tournament_id").order("joined_at", { ascending: false }).limit(200);
          const gameUidCounts: Record<string, Set<string>> = {};
          recentParticipants?.forEach((p: any) => {
            if (p.game_uid) {
              if (!gameUidCounts[p.game_uid]) gameUidCounts[p.game_uid] = new Set();
              gameUidCounts[p.game_uid].add(p.user_id);
            }
          });
          for (const [uid, users] of Object.entries(gameUidCounts)) {
            if (users.size >= 2) {
              findings.push(`🎮 Shared game UID "${uid}": used by ${users.size} different accounts`);
            }
          }
        }

        if (findings.length === 0) findings.push("✅ No suspicious activity detected.");
        return JSON.stringify({ success: true, scan_type: scanType, findings, total_flags: findings.filter(f => f.startsWith("⚠️") || f.startsWith("🚨") || f.startsWith("🎮")).length });
      }
      case "flag_suspicious_user": {
        const user = await findUser(supabase, args.identifier);
        if (!user) return JSON.stringify({ success: false, error: "User not found" });
        if (args.auto_ban) {
          await supabase.from("profiles").update({ is_banned: true }).eq("user_id", user.user_id);
          await supabase.from("ban_audit_log").insert({ user_id: user.user_id, admin_id: adminId, action: "ban", reason: `Flagged & banned: ${args.reason}` });
        }
        // Log as a report-like entry
        await supabase.from("ban_audit_log").insert({ user_id: user.user_id, admin_id: adminId, action: "flag", reason: `FLAGGED: ${args.reason}` });
        await supabase.from("notifications").insert({ user_id: user.user_id, type: "security", title: "⚠️ Account Review", message: "Your account is under review. If you believe this is an error, contact support." });
        return JSON.stringify({ success: true, message: `User ${user.username || user.email} flagged${args.auto_ban ? " and banned" : ""}. Reason: ${args.reason}` });
      }
      case "get_login_activity": {
        const hours = args.hours || 24;
        const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

        if (args.identifier) {
          const user = await findUser(supabase, args.identifier);
          if (!user) return JSON.stringify({ success: false, error: "User not found" });
          const { data: logins } = await supabase.from("login_history").select("*").eq("user_id", user.user_id).gte("logged_in_at", since).order("logged_in_at", { ascending: false });
          const uniqueIPs = new Set(logins?.map((l: any) => l.ip_address).filter(Boolean));
          const uniqueDevices = new Set(logins?.map((l: any) => `${l.browser}-${l.os}`).filter(Boolean));
          const uniqueLocations = new Set(logins?.map((l: any) => `${l.city}, ${l.country}`).filter(Boolean));
          return JSON.stringify({
            success: true,
            user: user.username || user.email,
            period: `Last ${hours} hours`,
            total_logins: logins?.length || 0,
            unique_ips: [...uniqueIPs],
            unique_devices: [...uniqueDevices],
            unique_locations: [...uniqueLocations],
            logins: logins?.slice(0, 20) || [],
            anomalies: uniqueIPs.size >= 3 ? `⚠️ ${uniqueIPs.size} different IPs detected` : uniqueLocations.size >= 3 ? `⚠️ ${uniqueLocations.size} different locations detected` : "✅ Normal activity",
          });
        } else {
          const { data: logins } = await supabase.from("login_history").select("user_id, ip_address, city, country, browser, logged_in_at").gte("logged_in_at", since).order("logged_in_at", { ascending: false }).limit(200);
          const uniqueUsers = new Set(logins?.map((l: any) => l.user_id));
          const topIPs: Record<string, number> = {};
          logins?.forEach((l: any) => { if (l.ip_address) topIPs[l.ip_address] = (topIPs[l.ip_address] || 0) + 1; });
          const sortedIPs = Object.entries(topIPs).sort((a, b) => b[1] - a[1]).slice(0, 10);
          return JSON.stringify({
            success: true,
            period: `Last ${hours} hours`,
            total_logins: logins?.length || 0,
            unique_users: uniqueUsers.size,
            top_ips: sortedIPs.map(([ip, count]) => ({ ip, login_count: count })),
          });
        }
      }
      case "detect_multi_accounts": {
        const threshold = args.threshold || 2;
        const { data: logins } = await supabase.from("login_history").select("user_id, ip_address").order("logged_in_at", { ascending: false }).limit(1000);
        const ipUsers: Record<string, Set<string>> = {};
        logins?.forEach((l: any) => {
          if (l.ip_address) {
            if (!ipUsers[l.ip_address]) ipUsers[l.ip_address] = new Set();
            ipUsers[l.ip_address].add(l.user_id);
          }
        });
        const suspects: any[] = [];
        for (const [ip, userSet] of Object.entries(ipUsers)) {
          if (userSet.size >= threshold) {
            const users: any[] = [];
            for (const uid of userSet) {
              const { data: p } = await supabase.from("profiles").select("username, email, created_at").eq("user_id", uid).maybeSingle();
              users.push({ user_id: uid, username: p?.username, email: p?.email, created_at: p?.created_at });
            }
            suspects.push({ ip, account_count: userSet.size, users });
          }
        }
        // Also check for similar usernames
        const { data: profiles } = await supabase.from("profiles").select("username, user_id, email").order("created_at", { ascending: false }).limit(500);
        const similarNames: any[] = [];
        if (profiles) {
          const nameMap: Record<string, any[]> = {};
          for (const p of profiles) {
            if (!p.username) continue;
            const base = p.username.replace(/[0-9_\-]/g, "").toLowerCase();
            if (base.length >= 3) {
              if (!nameMap[base]) nameMap[base] = [];
              nameMap[base].push(p);
            }
          }
          for (const [base, users] of Object.entries(nameMap)) {
            if (users.length >= 2) {
              similarNames.push({ base_name: base, accounts: users.map((u: any) => ({ username: u.username, email: u.email })) });
            }
          }
        }
        return JSON.stringify({
          success: true,
          shared_ip_suspects: suspects,
          similar_username_suspects: similarNames.slice(0, 10),
          total_ip_flags: suspects.length,
          total_name_flags: similarNames.length,
        });
      }
      case "list_recent_signups": {
        const hours = args.hours || 24;
        const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
        const { data } = await supabase.from("profiles").select("username, email, uid, created_at, is_banned, user_id").gte("created_at", since).order("created_at", { ascending: false }).limit(args.limit || 50);
        return JSON.stringify({ success: true, period: `Last ${hours} hours`, signups: data || [], count: data?.length || 0 });
      }
      case "list_user_reports": {
        let query = supabase.from("user_reports").select("*");
        if (args.status) query = query.eq("status", args.status);
        const { data } = await query.order("created_at", { ascending: false }).limit(args.limit || 20);
        if (data) {
          for (const r of data) {
            const [{ data: reporter }, { data: reported }] = await Promise.all([
              supabase.from("profiles").select("username, email").eq("user_id", r.reporter_id).maybeSingle(),
              supabase.from("profiles").select("username, email").eq("user_id", r.reported_user_id).maybeSingle(),
            ]);
            (r as any).reporter_name = reporter?.username || reporter?.email;
            (r as any).reported_name = reported?.username || reported?.email;
          }
        }
        return JSON.stringify({ success: true, reports: data || [], count: data?.length || 0 });
      }
      case "review_user_report": {
        const updates: any = {
          status: args.action, admin_notes: args.admin_notes || null,
          reviewed_by: adminId, reviewed_at: new Date().toISOString(),
        };
        const { error } = await supabase.from("user_reports").update(updates).eq("id", args.report_id);
        if (error) return JSON.stringify({ success: false, error: error.message });
        if (args.ban_reported_user) {
          const { data: report } = await supabase.from("user_reports").select("reported_user_id").eq("id", args.report_id).maybeSingle();
          if (report) {
            await supabase.from("profiles").update({ is_banned: true }).eq("user_id", report.reported_user_id);
            await supabase.from("ban_audit_log").insert({ user_id: report.reported_user_id, admin_id: adminId, action: "ban", reason: `Banned via report review: ${args.admin_notes || "User report"}` });
          }
        }
        return JSON.stringify({ success: true, message: `Report ${args.action}${args.ban_reported_user ? " and user banned" : ""}` });
      }
      case "list_ban_audit_log": {
        const { data } = await supabase.from("ban_audit_log").select("*").order("created_at", { ascending: false }).limit(args.limit || 20);
        if (data) {
          for (const entry of data) {
            const [{ data: admin }, { data: target }] = await Promise.all([
              supabase.from("profiles").select("username, email").eq("user_id", entry.admin_id).maybeSingle(),
              supabase.from("profiles").select("username, email").eq("user_id", entry.user_id).maybeSingle(),
            ]);
            (entry as any).admin_name = admin?.username || admin?.email;
            (entry as any).target_name = target?.username || target?.email;
          }
        }
        return JSON.stringify({ success: true, log: data || [] });
      }
      case "get_platform_stats": {
        const [
          { count: totalUsers },
          { data: wallets },
          { data: tournaments },
          { count: pendingWithdrawals },
          { count: pendingTopups },
          { count: openTickets },
          { count: bannedUsers },
          { data: recentTxns },
          { count: totalReports },
        ] = await Promise.all([
          supabase.from("profiles").select("*", { count: "exact", head: true }),
          supabase.from("wallets").select("balance"),
          supabase.from("tournaments").select("status, prize_pool, current_players, entry_fee"),
          supabase.from("withdrawal_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("topup_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("support_tickets").select("*", { count: "exact", head: true }).in("status", ["open", "in_progress"]),
          supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_banned", true),
          supabase.from("wallet_transactions").select("amount, type").order("created_at", { ascending: false }).limit(200),
          supabase.from("user_reports").select("*", { count: "exact", head: true }).eq("status", "pending"),
        ]);
        const totalBalance = wallets?.reduce((s: number, w: any) => s + Number(w.balance || 0), 0) || 0;
        const totalDeposits = recentTxns?.filter((t: any) => t.type === "deposit").reduce((s: number, t: any) => s + Number(t.amount), 0) || 0;
        const totalWithdrawn = recentTxns?.filter((t: any) => t.type === "withdrawal").reduce((s: number, t: any) => s + Math.abs(Number(t.amount)), 0) || 0;
        const entryFeeRevenue = recentTxns?.filter((t: any) => t.type === "entry_fee").reduce((s: number, t: any) => s + Math.abs(Number(t.amount)), 0) || 0;
        return JSON.stringify({
          success: true,
          stats: {
            total_users: totalUsers || 0,
            banned_users: bannedUsers || 0,
            total_platform_balance: totalBalance,
            active_tournaments: tournaments?.filter((t: any) => t.status === "live" || t.status === "upcoming").length || 0,
            completed_tournaments: tournaments?.filter((t: any) => t.status === "completed").length || 0,
            total_prize_pools: tournaments?.reduce((s: number, t: any) => s + Number(t.prize_pool || 0), 0) || 0,
            entry_fee_revenue: entryFeeRevenue,
            pending_withdrawals: pendingWithdrawals || 0,
            pending_topups: pendingTopups || 0,
            open_tickets: openTickets || 0,
            pending_reports: totalReports || 0,
            recent_deposits: totalDeposits,
            recent_withdrawals: totalWithdrawn,
          },
        });
      }
      case "get_platform_health": {
        const [
          { count: totalUsers },
          { count: bannedUsers },
          { count: pendingTopups },
          { count: pendingWithdrawals },
          { count: openTickets },
          { count: pendingReports },
          { count: totalTournaments },
          { count: activeTournaments },
          { data: recentLogins },
          { count: totalGiftCodes },
          { count: totalAnnouncements },
        ] = await Promise.all([
          supabase.from("profiles").select("*", { count: "exact", head: true }),
          supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_banned", true),
          supabase.from("topup_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("withdrawal_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("support_tickets").select("*", { count: "exact", head: true }).in("status", ["open", "in_progress"]),
          supabase.from("user_reports").select("*", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("tournaments").select("*", { count: "exact", head: true }),
          supabase.from("tournaments").select("*", { count: "exact", head: true }).in("status", ["upcoming", "live"]),
          supabase.from("login_history").select("logged_in_at").order("logged_in_at", { ascending: false }).limit(1),
          supabase.from("gift_codes").select("*", { count: "exact", head: true }).eq("is_active", true),
          supabase.from("announcements").select("*", { count: "exact", head: true }).eq("is_published", true),
        ]);
        const lastLogin = recentLogins?.[0]?.logged_in_at || "N/A";
        const warnings: string[] = [];
        if ((pendingTopups || 0) >= 10) warnings.push(`⚠️ ${pendingTopups} pending topups need attention`);
        if ((pendingWithdrawals || 0) >= 5) warnings.push(`⚠️ ${pendingWithdrawals} pending withdrawals need processing`);
        if ((openTickets || 0) >= 5) warnings.push(`⚠️ ${openTickets} open support tickets`);
        if ((pendingReports || 0) >= 3) warnings.push(`⚠️ ${pendingReports} pending user reports`);
        if ((bannedUsers || 0) / (totalUsers || 1) > 0.1) warnings.push(`🚨 High ban rate: ${bannedUsers}/${totalUsers} users banned`);
        if (warnings.length === 0) warnings.push("✅ Platform is healthy - no urgent issues");

        return JSON.stringify({
          success: true,
          health: {
            status: warnings.some(w => w.startsWith("🚨")) ? "critical" : warnings.some(w => w.startsWith("⚠️")) ? "warning" : "healthy",
            total_users: totalUsers || 0,
            banned_users: bannedUsers || 0,
            pending_topups: pendingTopups || 0,
            pending_withdrawals: pendingWithdrawals || 0,
            open_tickets: openTickets || 0,
            pending_reports: pendingReports || 0,
            total_tournaments: totalTournaments || 0,
            active_tournaments: activeTournaments || 0,
            active_gift_codes: totalGiftCodes || 0,
            published_announcements: totalAnnouncements || 0,
            last_user_login: lastLogin,
            warnings,
          },
        });
      }
      case "analyze_user_behavior": {
        const days = args.days || 7;
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        const focus = args.focus || "all";
        const result: any = { success: true, period: `Last ${days} days` };

        if (focus === "all" || focus === "spending") {
          const { data: txns } = await supabase.from("wallet_transactions").select("user_id, amount, type").gte("created_at", since);
          const userSpending: Record<string, number> = {};
          txns?.forEach((t: any) => {
            if (t.type === "entry_fee") {
              userSpending[t.user_id] = (userSpending[t.user_id] || 0) + Math.abs(Number(t.amount));
            }
          });
          const topSpenders = Object.entries(userSpending).sort((a, b) => b[1] - a[1]).slice(0, 10);
          const enrichedSpenders = [];
          for (const [uid, amount] of topSpenders) {
            const { data: p } = await supabase.from("profiles").select("username, email").eq("user_id", uid).maybeSingle();
            enrichedSpenders.push({ user: p?.username || p?.email || uid, total_spent: amount });
          }
          result.top_spenders = enrichedSpenders;
          result.total_spending = Object.values(userSpending).reduce((s, v) => s + v, 0);
        }

        if (focus === "all" || focus === "engagement") {
          const { data: logins } = await supabase.from("login_history").select("user_id").gte("logged_in_at", since);
          const userLoginCounts: Record<string, number> = {};
          logins?.forEach((l: any) => { userLoginCounts[l.user_id] = (userLoginCounts[l.user_id] || 0) + 1; });
          const topActive = Object.entries(userLoginCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
          const enrichedActive = [];
          for (const [uid, count] of topActive) {
            const { data: p } = await supabase.from("profiles").select("username, email").eq("user_id", uid).maybeSingle();
            enrichedActive.push({ user: p?.username || p?.email || uid, login_count: count });
          }
          result.most_active_users = enrichedActive;
          result.total_active_users = Object.keys(userLoginCounts).length;
          result.total_logins = logins?.length || 0;
        }

        if (focus === "all" || focus === "retention") {
          const { count: totalUsers } = await supabase.from("profiles").select("*", { count: "exact", head: true });
          const { data: activeUsers } = await supabase.from("login_history").select("user_id").gte("logged_in_at", since);
          const uniqueActive = new Set(activeUsers?.map((l: any) => l.user_id)).size;
          result.retention = {
            total_users: totalUsers || 0,
            active_in_period: uniqueActive,
            retention_rate: totalUsers ? `${((uniqueActive / totalUsers) * 100).toFixed(1)}%` : "0%",
          };
        }

        return JSON.stringify(result);
      }
      case "get_user_risk_score": {
        const user = await findUser(supabase, args.identifier);
        if (!user) return JSON.stringify({ success: false, error: "User not found" });
        let riskScore = 0;
        const riskFactors: string[] = [];

        // Check ban status
        if (user.is_banned) { riskScore += 30; riskFactors.push("Currently banned (+30)"); }

        // Check reports against them
        const { count: reportCount } = await supabase.from("user_reports").select("*", { count: "exact", head: true }).eq("reported_user_id", user.user_id);
        if ((reportCount || 0) >= 3) { riskScore += 20; riskFactors.push(`${reportCount} reports filed against them (+20)`); }
        else if ((reportCount || 0) >= 1) { riskScore += 10; riskFactors.push(`${reportCount} report(s) filed against them (+10)`); }

        // Check for multiple IPs
        const { data: logins } = await supabase.from("login_history").select("ip_address").eq("user_id", user.user_id).order("logged_in_at", { ascending: false }).limit(50);
        const uniqueIPs = new Set(logins?.map((l: any) => l.ip_address).filter(Boolean)).size;
        if (uniqueIPs >= 5) { riskScore += 15; riskFactors.push(`${uniqueIPs} different IPs used (+15)`); }

        // Check transaction patterns
        const { data: txns } = await supabase.from("wallet_transactions").select("amount, type").eq("user_id", user.user_id);
        const deposits = txns?.filter((t: any) => t.type === "deposit").reduce((s: number, t: any) => s + Number(t.amount), 0) || 0;
        const withdrawals = Math.abs(txns?.filter((t: any) => t.type === "withdrawal").reduce((s: number, t: any) => s + Number(t.amount), 0) || 0);
        if (deposits > 0 && withdrawals >= deposits * 0.9) { riskScore += 20; riskFactors.push(`High withdrawal ratio: deposited ₹${deposits}, withdrew ₹${withdrawals} (+20)`); }

        // Check account age
        const accountAge = (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24);
        if (accountAge < 1) { riskScore += 10; riskFactors.push("Account less than 24 hours old (+10)"); }

        // Check wins
        const { count: wins } = await supabase.from("tournament_participants").select("*", { count: "exact", head: true }).eq("user_id", user.user_id).eq("is_winner", true);
        const { count: played } = await supabase.from("tournament_participants").select("*", { count: "exact", head: true }).eq("user_id", user.user_id);
        if ((played || 0) > 0 && (wins || 0) / (played || 1) > 0.7 && (played || 0) >= 5) {
          riskScore += 15; riskFactors.push(`Abnormal win rate: ${wins}/${played} (${((wins || 0) / (played || 1) * 100).toFixed(0)}%) (+15)`);
        }

        const riskLevel = riskScore >= 50 ? "HIGH" : riskScore >= 25 ? "MEDIUM" : "LOW";
        if (riskFactors.length === 0) riskFactors.push("No risk factors detected");

        return JSON.stringify({
          success: true,
          user: user.username || user.email,
          risk_score: riskScore,
          risk_level: riskLevel,
          max_score: 100,
          factors: riskFactors,
          recommendation: riskLevel === "HIGH" ? "⚠️ Recommend immediate review and possible suspension" : riskLevel === "MEDIUM" ? "👀 Monitor this user closely" : "✅ User appears safe",
        });
      }
      case "update_site_setting": {
        const { data: existing } = await supabase.from("site_settings").select("id").eq("key", args.key).maybeSingle();
        if (existing) {
          await supabase.from("site_settings").update({ value: args.value, updated_by: adminId }).eq("key", args.key);
        } else {
          await supabase.from("site_settings").insert({ key: args.key, value: args.value, updated_by: adminId });
        }
        return JSON.stringify({ success: true, message: `Setting "${args.key}" updated` });
      }
      case "get_traffic_analysis": {
        const hours = args.hours || 24;
        const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
        const focus = args.focus || "all";
        const result: any = { success: true, period: `Last ${hours} hours` };

        const { data: logins } = await supabase.from("login_history").select("user_id, ip_address, city, country, browser, os, logged_in_at").gte("logged_in_at", since).order("logged_in_at", { ascending: false }).limit(1000);

        if (focus === "all" || focus === "overview") {
          // Hourly distribution
          const hourly: Record<string, number> = {};
          logins?.forEach((l: any) => {
            const hour = new Date(l.logged_in_at).getHours();
            const key = `${hour}:00`;
            hourly[key] = (hourly[key] || 0) + 1;
          });
          result.hourly_distribution = hourly;
          result.total_requests = logins?.length || 0;
          result.unique_users = new Set(logins?.map((l: any) => l.user_id)).size;
          result.unique_ips = new Set(logins?.map((l: any) => l.ip_address).filter(Boolean)).size;
          const peakHour = Object.entries(hourly).sort((a, b) => b[1] - a[1])[0];
          result.peak_hour = peakHour ? `${peakHour[0]} (${peakHour[1]} logins)` : "N/A";
        }

        if (focus === "all" || focus === "suspicious_ips") {
          const ipCounts: Record<string, { count: number; users: Set<string> }> = {};
          logins?.forEach((l: any) => {
            if (l.ip_address) {
              if (!ipCounts[l.ip_address]) ipCounts[l.ip_address] = { count: 0, users: new Set() };
              ipCounts[l.ip_address].count++;
              ipCounts[l.ip_address].users.add(l.user_id);
            }
          });
          const suspicious = Object.entries(ipCounts)
            .filter(([_, v]) => v.count >= 10 || v.users.size >= 3)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 15)
            .map(([ip, v]) => ({ ip, login_count: v.count, unique_accounts: v.users.size, threat: v.users.size >= 3 ? "MULTI_ACCOUNT" : v.count >= 20 ? "POSSIBLE_BRUTE_FORCE" : "HIGH_FREQUENCY" }));
          result.suspicious_ips = suspicious;
          result.total_suspicious = suspicious.length;
        }

        if (focus === "all" || focus === "geographic") {
          const countries: Record<string, number> = {};
          const cities: Record<string, number> = {};
          logins?.forEach((l: any) => {
            if (l.country) countries[l.country] = (countries[l.country] || 0) + 1;
            if (l.city) cities[l.city] = (cities[l.city] || 0) + 1;
          });
          result.country_distribution = Object.entries(countries).sort((a, b) => b[1] - a[1]).slice(0, 10);
          result.top_cities = Object.entries(cities).sort((a, b) => b[1] - a[1]).slice(0, 10);
          // Users from multiple countries in short period = anomaly
          const userCountries: Record<string, Set<string>> = {};
          logins?.forEach((l: any) => {
            if (l.country) {
              if (!userCountries[l.user_id]) userCountries[l.user_id] = new Set();
              userCountries[l.user_id].add(l.country);
            }
          });
          const geoAnomalies: any[] = [];
          for (const [uid, cs] of Object.entries(userCountries)) {
            if (cs.size >= 2) {
              const { data: p } = await supabase.from("profiles").select("username, email").eq("user_id", uid).maybeSingle();
              geoAnomalies.push({ user: p?.username || p?.email || uid, countries: [...cs] });
            }
          }
          result.geographic_anomalies = geoAnomalies;
        }

        if (focus === "all" || focus === "rate_limiting") {
          // Users with excessive logins (possible automated)
          const userLoginCounts: Record<string, number> = {};
          logins?.forEach((l: any) => { userLoginCounts[l.user_id] = (userLoginCounts[l.user_id] || 0) + 1; });
          const heavyUsers = Object.entries(userLoginCounts)
            .filter(([_, c]) => c >= 10)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
          const enriched = [];
          for (const [uid, count] of heavyUsers) {
            const { data: p } = await supabase.from("profiles").select("username, email").eq("user_id", uid).maybeSingle();
            enriched.push({ user: p?.username || p?.email || uid, login_count: count, recommendation: count >= 30 ? "🚨 Rate limit recommended" : "⚠️ Monitor" });
          }
          result.rate_limit_candidates = enriched;
        }

        return JSON.stringify(result);
      }
      case "get_system_health_deep": {
        const [
          { count: profiles }, { count: wallets }, { count: tournaments },
          { count: participants }, { count: transactions }, { count: topups },
          { count: withdrawals }, { count: tickets }, { count: notifications },
          { count: reports }, { count: banLog }, { count: giftCodes },
          { count: loginHistory }, { count: announcements }, { count: otps },
          { count: likes }, { count: redemptions }, { count: roles }, { count: settings },
        ] = await Promise.all([
          supabase.from("profiles").select("*", { count: "exact", head: true }),
          supabase.from("wallets").select("*", { count: "exact", head: true }),
          supabase.from("tournaments").select("*", { count: "exact", head: true }),
          supabase.from("tournament_participants").select("*", { count: "exact", head: true }),
          supabase.from("wallet_transactions").select("*", { count: "exact", head: true }),
          supabase.from("topup_requests").select("*", { count: "exact", head: true }),
          supabase.from("withdrawal_requests").select("*", { count: "exact", head: true }),
          supabase.from("support_tickets").select("*", { count: "exact", head: true }),
          supabase.from("notifications").select("*", { count: "exact", head: true }),
          supabase.from("user_reports").select("*", { count: "exact", head: true }),
          supabase.from("ban_audit_log").select("*", { count: "exact", head: true }),
          supabase.from("gift_codes").select("*", { count: "exact", head: true }),
          supabase.from("login_history").select("*", { count: "exact", head: true }),
          supabase.from("announcements").select("*", { count: "exact", head: true }),
          supabase.from("login_otps").select("*", { count: "exact", head: true }),
          supabase.from("profile_likes").select("*", { count: "exact", head: true }),
          supabase.from("gift_code_redemptions").select("*", { count: "exact", head: true }),
          supabase.from("user_roles").select("*", { count: "exact", head: true }),
          supabase.from("site_settings").select("*", { count: "exact", head: true }),
        ]);

        const issues: string[] = [];

        // Check wallet-profile parity
        if ((wallets || 0) < (profiles || 0)) issues.push(`⚠️ ${(profiles || 0) - (wallets || 0)} users missing wallets`);

        // Stale OTPs
        const { count: staleOtps } = await supabase.from("login_otps").select("*", { count: "exact", head: true }).lt("expires_at", new Date().toISOString()).eq("verified", false);
        if ((staleOtps || 0) > 50) issues.push(`⚠️ ${staleOtps} expired unverified OTPs (can be cleaned)`);

        // Old pending requests
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
        const { count: staleTopups } = await supabase.from("topup_requests").select("*", { count: "exact", head: true }).eq("status", "pending").lt("created_at", threeDaysAgo);
        const { count: staleWithdrawals } = await supabase.from("withdrawal_requests").select("*", { count: "exact", head: true }).eq("status", "pending").lt("created_at", threeDaysAgo);
        if ((staleTopups || 0) > 0) issues.push(`🚨 ${staleTopups} topup requests pending 3+ days`);
        if ((staleWithdrawals || 0) > 0) issues.push(`🚨 ${staleWithdrawals} withdrawal requests pending 3+ days`);

        // Expired active gift codes
        const { count: expiredActive } = await supabase.from("gift_codes").select("*", { count: "exact", head: true }).eq("is_active", true).lt("expiry", new Date().toISOString());
        if ((expiredActive || 0) > 0) issues.push(`⚠️ ${expiredActive} expired gift codes still marked active`);

        // Freshness check
        const { data: latestLogin } = await supabase.from("login_history").select("logged_in_at").order("logged_in_at", { ascending: false }).limit(1);
        const { data: latestTxn } = await supabase.from("wallet_transactions").select("created_at").order("created_at", { ascending: false }).limit(1);

        if (issues.length === 0) issues.push("✅ All systems nominal - no issues detected");

        return JSON.stringify({
          success: true,
          table_sizes: {
            profiles, wallets, tournaments, tournament_participants: participants,
            wallet_transactions: transactions, topup_requests: topups, withdrawal_requests: withdrawals,
            support_tickets: tickets, notifications, user_reports: reports, ban_audit_log: banLog,
            gift_codes: giftCodes, login_history: loginHistory, announcements, login_otps: otps,
            profile_likes: likes, gift_code_redemptions: redemptions, user_roles: roles, site_settings: settings,
          },
          data_freshness: {
            last_login: latestLogin?.[0]?.logged_in_at || "N/A",
            last_transaction: latestTxn?.[0]?.created_at || "N/A",
          },
          issues,
          total_issues: issues.filter(i => !i.startsWith("✅")).length,
        });
      }
      case "get_activity_log": {
        const hours = args.hours || 24;
        const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
        const category = args.category || "all";
        const limit = args.limit || 50;
        const activities: any[] = [];

        if (category === "all" || category === "admin") {
          const { data: bans } = await supabase.from("ban_audit_log").select("*").gte("created_at", since).order("created_at", { ascending: false }).limit(limit);
          for (const b of (bans || [])) {
            const { data: admin } = await supabase.from("profiles").select("username").eq("user_id", b.admin_id).maybeSingle();
            const { data: target } = await supabase.from("profiles").select("username").eq("user_id", b.user_id).maybeSingle();
            activities.push({ time: b.created_at, category: "admin", action: b.action, by: admin?.username || b.admin_id, target: target?.username || b.user_id, reason: b.reason });
          }
        }

        if (category === "all" || category === "financial") {
          const { data: txns } = await supabase.from("wallet_transactions").select("user_id, amount, type, description, created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(limit);
          for (const t of (txns || [])) {
            const { data: p } = await supabase.from("profiles").select("username").eq("user_id", t.user_id).maybeSingle();
            activities.push({ time: t.created_at, category: "financial", action: t.type, user: p?.username || t.user_id, amount: t.amount, description: t.description });
          }
        }

        if (category === "all" || category === "tournaments") {
          const { data: joins } = await supabase.from("tournament_participants").select("user_id, tournament_id, joined_at").gte("joined_at", since).order("joined_at", { ascending: false }).limit(limit);
          for (const j of (joins || [])) {
            const { data: p } = await supabase.from("profiles").select("username").eq("user_id", j.user_id).maybeSingle();
            const { data: t } = await supabase.from("tournaments").select("title").eq("id", j.tournament_id).maybeSingle();
            activities.push({ time: j.joined_at, category: "tournament", action: "joined", user: p?.username || j.user_id, tournament: t?.title || j.tournament_id });
          }
        }

        if (category === "all" || category === "security") {
          const { data: logins } = await supabase.from("login_history").select("user_id, ip_address, city, country, logged_in_at").gte("logged_in_at", since).order("logged_in_at", { ascending: false }).limit(limit);
          for (const l of (logins || [])) {
            const { data: p } = await supabase.from("profiles").select("username").eq("user_id", l.user_id).maybeSingle();
            activities.push({ time: l.logged_in_at, category: "security", action: "login", user: p?.username || l.user_id, ip: l.ip_address, location: `${l.city || "?"}, ${l.country || "?"}` });
          }
        }

        if (category === "all" || category === "users") {
          const { data: newUsers } = await supabase.from("profiles").select("username, email, created_at, user_id").gte("created_at", since).order("created_at", { ascending: false }).limit(limit);
          for (const u of (newUsers || [])) {
            activities.push({ time: u.created_at, category: "users", action: "signup", user: u.username || u.email });
          }
        }

        // Sort by time descending
        activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

        return JSON.stringify({ success: true, period: `Last ${hours} hours`, activities: activities.slice(0, limit), total: activities.length });
      }
      case "get_platform_diagnostics": {
        const issues: { severity: string; area: string; description: string; recommendation: string }[] = [];

        // 1. Wallet-profile mismatch
        const { count: profileCount } = await supabase.from("profiles").select("*", { count: "exact", head: true });
        const { count: walletCount } = await supabase.from("wallets").select("*", { count: "exact", head: true });
        if ((profileCount || 0) !== (walletCount || 0)) {
          issues.push({ severity: "warning", area: "wallets", description: `${(profileCount || 0) - (walletCount || 0)} users without wallets`, recommendation: "Run wallet creation for missing users" });
        }

        // 2. Tournament player count accuracy
        const { data: tournaments } = await supabase.from("tournaments").select("id, title, current_players").in("status", ["upcoming", "live"]);
        for (const t of (tournaments || [])) {
          const { count: actual } = await supabase.from("tournament_participants").select("*", { count: "exact", head: true }).eq("tournament_id", t.id);
          if ((actual || 0) !== t.current_players) {
            issues.push({ severity: "critical", area: "tournaments", description: `"${t.title}" shows ${t.current_players} players but has ${actual} participants`, recommendation: `Update current_players to ${actual}` });
          }
        }

        // 3. Negative wallet balances
        const { data: negWallets } = await supabase.from("wallets").select("user_id, balance").lt("balance", 0);
        if (negWallets?.length) {
          for (const w of negWallets) {
            const { data: p } = await supabase.from("profiles").select("username, email").eq("user_id", w.user_id).maybeSingle();
            issues.push({ severity: "critical", area: "wallets", description: `${p?.username || p?.email} has negative balance: ₹${w.balance}`, recommendation: "Investigate and correct balance" });
          }
        }

        // 4. Expired active gift codes
        const { data: expiredCodes } = await supabase.from("gift_codes").select("code, expiry").eq("is_active", true).lt("expiry", new Date().toISOString());
        if (expiredCodes?.length) {
          issues.push({ severity: "warning", area: "gift_codes", description: `${expiredCodes.length} expired gift codes still active: ${expiredCodes.map(c => c.code).join(", ")}`, recommendation: "Deactivate expired codes" });
        }

        // 5. Stale pending requests (>7 days)
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { count: staleTopups } = await supabase.from("topup_requests").select("*", { count: "exact", head: true }).eq("status", "pending").lt("created_at", weekAgo);
        const { count: staleWd } = await supabase.from("withdrawal_requests").select("*", { count: "exact", head: true }).eq("status", "pending").lt("created_at", weekAgo);
        if ((staleTopups || 0) > 0) issues.push({ severity: "warning", area: "topups", description: `${staleTopups} topup requests pending 7+ days`, recommendation: "Review and process or reject" });
        if ((staleWd || 0) > 0) issues.push({ severity: "critical", area: "withdrawals", description: `${staleWd} withdrawal requests pending 7+ days`, recommendation: "Process urgently - users waiting for money" });

        // 6. Users without roles
        const { data: profilesAll } = await supabase.from("profiles").select("user_id").limit(500);
        const { data: rolesAll } = await supabase.from("user_roles").select("user_id").limit(500);
        const roleUserIds = new Set(rolesAll?.map(r => r.user_id));
        const noRole = profilesAll?.filter(p => !roleUserIds.has(p.user_id)).length || 0;
        if (noRole > 0) issues.push({ severity: "info", area: "roles", description: `${noRole} users without assigned roles`, recommendation: "Assign default 'user' role" });

        if (issues.length === 0) issues.push({ severity: "ok", area: "system", description: "All diagnostics passed - no issues found", recommendation: "System is healthy" });

        return JSON.stringify({
          success: true,
          diagnostics: issues,
          critical_count: issues.filter(i => i.severity === "critical").length,
          warning_count: issues.filter(i => i.severity === "warning").length,
          info_count: issues.filter(i => i.severity === "info").length,
        });
      }
      case "send_admin_alert": {
        const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
        if (!admins?.length) return JSON.stringify({ success: false, error: "No admin users found" });
        const emoji = args.severity === "critical" ? "🚨" : args.severity === "warning" ? "⚠️" : "ℹ️";
        const notifications = admins.map((a: any) => ({
          user_id: a.user_id, type: "security", title: `${emoji} ${args.title}`, message: args.message,
        }));
        await supabase.from("notifications").insert(notifications);
        return JSON.stringify({ success: true, message: `${args.severity.toUpperCase()} alert sent to ${admins.length} admin(s): ${args.title}` });
      }
      case "get_optimization_report": {
        const days = args.days || 30;
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        const suggestions: { area: string; insight: string; action: string; impact: string }[] = [];

        // Tournament optimization
        const { data: allTournaments } = await supabase.from("tournaments").select("*").gte("created_at", since);
        const lowFill = allTournaments?.filter((t: any) => t.status === "completed" && t.current_players / t.max_players < 0.3) || [];
        if (lowFill.length > 0) {
          suggestions.push({ area: "Tournaments", insight: `${lowFill.length} tournaments had <30% fill rate`, action: "Reduce max_players or increase promotion for low-fill games", impact: "Higher engagement" });
        }
        const gamePopularity: Record<string, { count: number; players: number }> = {};
        allTournaments?.forEach((t: any) => {
          if (!gamePopularity[t.game]) gamePopularity[t.game] = { count: 0, players: 0 };
          gamePopularity[t.game].count++;
          gamePopularity[t.game].players += t.current_players || 0;
        });
        const topGame = Object.entries(gamePopularity).sort((a, b) => b[1].players - a[1].players)[0];
        if (topGame) suggestions.push({ area: "Tournaments", insight: `${topGame[0]} is most popular (${topGame[1].players} total players)`, action: `Create more ${topGame[0]} tournaments with higher prize pools`, impact: "Increased revenue" });

        // Inactive users
        const { data: allProfiles } = await supabase.from("profiles").select("user_id, last_seen, username").order("last_seen", { ascending: true }).limit(100);
        const weekAgoDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const inactive = allProfiles?.filter((p: any) => !p.last_seen || p.last_seen < weekAgoDate) || [];
        if (inactive.length > 10) {
          suggestions.push({ area: "Retention", insight: `${inactive.length} users inactive 7+ days`, action: "Send re-engagement notifications or gift codes to inactive users", impact: "Improved retention" });
        }

        // Gift code performance
        const { data: codes } = await supabase.from("gift_codes").select("code, amount, max_uses, used_count").eq("is_active", true);
        const unusedCodes = codes?.filter((c: any) => c.used_count === 0) || [];
        if (unusedCodes.length > 0) {
          suggestions.push({ area: "Gift Codes", insight: `${unusedCodes.length} active gift codes with 0 redemptions`, action: "Promote unused codes or increase their value", impact: "Better ROI on promotions" });
        }

        // Wallet efficiency
        const { data: wallets } = await supabase.from("wallets").select("balance").gt("balance", 500);
        if (wallets && wallets.length > 5) {
          suggestions.push({ area: "Wallets", insight: `${wallets.length} users have 500+ balance sitting idle`, action: "Create exclusive high-entry tournaments to engage high-balance users", impact: "Increased platform activity" });
        }

        // Support efficiency
        const { data: resolvedTickets } = await supabase.from("support_tickets").select("created_at, resolved_at").eq("status", "resolved").gte("created_at", since);
        if (resolvedTickets?.length) {
          const avgResolutionHours = resolvedTickets.reduce((s: number, t: any) => {
            if (!t.resolved_at) return s;
            return s + (new Date(t.resolved_at).getTime() - new Date(t.created_at).getTime()) / (1000 * 60 * 60);
          }, 0) / resolvedTickets.length;
          if (avgResolutionHours > 48) {
            suggestions.push({ area: "Support", insight: `Average ticket resolution: ${avgResolutionHours.toFixed(1)} hours`, action: "Prioritize faster ticket responses to improve user satisfaction", impact: "Better user trust" });
          }
        }

        if (suggestions.length === 0) suggestions.push({ area: "Overall", insight: "Platform is well-optimized", action: "Continue monitoring", impact: "Stable performance" });

        return JSON.stringify({ success: true, period: `Last ${days} days`, suggestions, total_suggestions: suggestions.length });
      }
      case "get_smart_recommendations": {
        const type = args.type || "all";
        const days = args.days || 14;
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        const recommendations: { category: string; title: string; detail: string; priority: string }[] = [];

        if (type === "all" || type === "tournaments") {
          // Best times to schedule
          const { data: joins } = await supabase.from("tournament_participants").select("joined_at").gte("joined_at", since);
          const hourCounts: Record<number, number> = {};
          joins?.forEach((j: any) => { const h = new Date(j.joined_at).getHours(); hourCounts[h] = (hourCounts[h] || 0) + 1; });
          const peakHours = Object.entries(hourCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([h]) => `${h}:00`);
          if (peakHours.length) recommendations.push({ category: "Tournaments", title: "Optimal Schedule Times", detail: `Peak join hours: ${peakHours.join(", ")}. Schedule tournaments to start 1-2 hours after these peaks.`, priority: "high" });

          // Prize pool analysis
          const { data: completedT } = await supabase.from("tournaments").select("prize_pool, current_players, max_players, entry_fee, game").eq("status", "completed").gte("created_at", since);
          if (completedT?.length) {
            const highFill = completedT.filter((t: any) => t.current_players / t.max_players > 0.7);
            const avgPrize = highFill.length ? highFill.reduce((s: number, t: any) => s + Number(t.prize_pool), 0) / highFill.length : 0;
            const avgFee = highFill.length ? highFill.reduce((s: number, t: any) => s + Number(t.entry_fee), 0) / highFill.length : 0;
            if (avgPrize > 0) recommendations.push({ category: "Tournaments", title: "Optimal Prize Pool", detail: `High-fill tournaments average ₹${avgPrize.toFixed(0)} prize pool with ₹${avgFee.toFixed(0)} entry fee. Use this as baseline.`, priority: "medium" });
          }
        }

        if (type === "all" || type === "engagement") {
          // Churn risk users
          const { data: allUsers } = await supabase.from("profiles").select("user_id, username, last_seen").order("last_seen", { ascending: true }).limit(200);
          const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
          const atRisk = allUsers?.filter((u: any) => u.last_seen && u.last_seen < threeDaysAgo && u.last_seen > new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()) || [];
          if (atRisk.length > 0) {
            recommendations.push({ category: "Engagement", title: "Churn Risk Users", detail: `${atRisk.length} users inactive 3-14 days. Send personalized re-engagement: ${atRisk.slice(0, 5).map((u: any) => u.username || "Unknown").join(", ")}${atRisk.length > 5 ? "..." : ""}`, priority: "high" });
          }

          // Top spenders not playing recently
          const { data: spenderTxns } = await supabase.from("wallet_transactions").select("user_id, amount").eq("type", "entry_fee").gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
          const spendMap: Record<string, number> = {};
          spenderTxns?.forEach((t: any) => { spendMap[t.user_id] = (spendMap[t.user_id] || 0) + Math.abs(Number(t.amount)); });
          const topSpenderIds = Object.entries(spendMap).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([uid]) => uid);
          const inactiveSpenders = [];
          for (const uid of topSpenderIds) {
            const { data: p } = await supabase.from("profiles").select("username, last_seen").eq("user_id", uid).maybeSingle();
            if (p?.last_seen && p.last_seen < threeDaysAgo) inactiveSpenders.push(p.username || uid);
          }
          if (inactiveSpenders.length > 0) {
            recommendations.push({ category: "Engagement", title: "VIP Re-engagement Needed", detail: `Top spenders going inactive: ${inactiveSpenders.join(", ")}. Offer exclusive tournaments or bonuses.`, priority: "critical" });
          }
        }

        if (type === "all" || type === "revenue") {
          const { data: txns } = await supabase.from("wallet_transactions").select("amount, type, created_at").gte("created_at", since);
          const dailyRevenue: Record<string, number> = {};
          txns?.forEach((t: any) => {
            if (t.type === "entry_fee") {
              const day = new Date(t.created_at).toISOString().split("T")[0];
              dailyRevenue[day] = (dailyRevenue[day] || 0) + Math.abs(Number(t.amount));
            }
          });
          const values = Object.values(dailyRevenue);
          const avgDaily = values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
          const trend = values.length >= 7 ? (values.slice(-3).reduce((s, v) => s + v, 0) / 3 > avgDaily ? "📈 Growing" : "📉 Declining") : "📊 Insufficient data";
          recommendations.push({ category: "Revenue", title: "Revenue Trend", detail: `Average daily revenue: ₹${avgDaily.toFixed(0)}. Trend: ${trend}`, priority: trend.includes("Declining") ? "high" : "medium" });
        }

        if (type === "all" || type === "retention") {
          const { count: totalUsers } = await supabase.from("profiles").select("*", { count: "exact", head: true });
          const { data: activeLogins } = await supabase.from("login_history").select("user_id").gte("logged_in_at", since);
          const activeSet = new Set(activeLogins?.map((l: any) => l.user_id));
          const retentionRate = totalUsers ? (activeSet.size / totalUsers) * 100 : 0;
          recommendations.push({ category: "Retention", title: "Retention Analysis", detail: `${retentionRate.toFixed(1)}% of users active in last ${days} days (${activeSet.size}/${totalUsers}). ${retentionRate < 30 ? "Consider push notifications and daily rewards." : retentionRate < 60 ? "Good retention. Maintain with consistent tournaments." : "Excellent retention!"}`, priority: retentionRate < 30 ? "critical" : "medium" });
        }

        if (recommendations.length === 0) recommendations.push({ category: "General", title: "All Good", detail: "No specific recommendations at this time", priority: "low" });

        return JSON.stringify({ success: true, period: `Last ${days} days`, recommendations, total: recommendations.length });
      }
      // ===== NEW TOOLS IMPLEMENTATIONS =====
      case "delete_clip": {
        const { data: clip } = await supabase.from("gaming_clips").select("id, user_id, title").eq("id", args.clip_id).maybeSingle();
        if (!clip) return JSON.stringify({ success: false, error: "Clip not found" });
        await Promise.all([
          supabase.from("clip_likes").delete().eq("clip_id", args.clip_id),
          supabase.from("clip_comments").delete().eq("clip_id", args.clip_id),
          supabase.from("clip_reports").delete().eq("clip_id", args.clip_id),
        ]);
        await supabase.from("gaming_clips").delete().eq("id", args.clip_id);
        await supabase.from("admin_audit_log").insert({ admin_id: adminId, action: "delete_clip", target_type: "clip", target_id: args.clip_id, details: { title: clip.title, reason: args.reason } });
        return JSON.stringify({ success: true, message: `Clip "${clip.title}" deleted. Reason: ${args.reason}` });
      }
      case "list_clip_reports": {
        let query = supabase.from("clip_reports").select("*, gaming_clips(title, user_id, video_url)");
        if (args.status) query = query.eq("status", args.status);
        const { data } = await query.order("created_at", { ascending: false }).limit(args.limit || 20);
        if (data) {
          for (const r of data) {
            const { data: reporter } = await supabase.from("profiles").select("username").eq("user_id", r.reporter_id).maybeSingle();
            (r as any).reporter_name = reporter?.username;
          }
        }
        return JSON.stringify({ success: true, reports: data || [], count: data?.length || 0 });
      }
      case "review_clip_report": {
        const { error } = await supabase.from("clip_reports").update({ status: args.action, admin_notes: args.admin_notes || null, reviewed_by: adminId, reviewed_at: new Date().toISOString() }).eq("id", args.report_id);
        if (error) return JSON.stringify({ success: false, error: error.message });
        if (args.delete_clip) {
          const { data: report } = await supabase.from("clip_reports").select("clip_id").eq("id", args.report_id).maybeSingle();
          if (report) {
            await Promise.all([
              supabase.from("clip_likes").delete().eq("clip_id", report.clip_id),
              supabase.from("clip_comments").delete().eq("clip_id", report.clip_id),
            ]);
            await supabase.from("gaming_clips").delete().eq("id", report.clip_id);
          }
        }
        if (args.ban_uploader) {
          const { data: report } = await supabase.from("clip_reports").select("gaming_clips(user_id)").eq("id", args.report_id).maybeSingle();
          const uploaderId = (report as any)?.gaming_clips?.user_id;
          if (uploaderId) {
            await supabase.from("profiles").update({ is_banned: true }).eq("user_id", uploaderId);
            await supabase.from("ban_audit_log").insert({ user_id: uploaderId, admin_id: adminId, action: "ban", reason: `Banned via clip report review` });
          }
        }
        return JSON.stringify({ success: true, message: `Clip report ${args.action}${args.delete_clip ? " + clip deleted" : ""}${args.ban_uploader ? " + uploader banned" : ""}` });
      }
      case "update_user_profile": {
        const user = await findUser(supabase, args.identifier);
        if (!user) return JSON.stringify({ success: false, error: "User not found" });
        const updates: any = {};
        if (args.username) updates.username = args.username;
        if (args.full_name) updates.full_name = args.full_name;
        if (args.city) updates.city = args.city;
        if (args.country) updates.country = args.country;
        if (args.phone) updates.phone = args.phone;
        if (args.free_fire_uid) updates.free_fire_uid = args.free_fire_uid;
        if (args.gender) updates.gender = args.gender;
        if (args.age !== undefined) updates.age = args.age;
        if (Object.keys(updates).length === 0) return JSON.stringify({ success: false, error: "No fields to update" });
        const { error } = await supabase.from("profiles").update(updates).eq("user_id", user.user_id);
        if (error) return JSON.stringify({ success: false, error: error.message });
        return JSON.stringify({ success: true, message: `Profile updated for ${user.username || user.email}: ${Object.keys(updates).join(", ")}` });
      }
      case "shadow_ban_user": {
        const user = await findUser(supabase, args.identifier);
        if (!user) return JSON.stringify({ success: false, error: "User not found" });
        await supabase.from("profiles").update({ is_shadow_banned: args.enable }).eq("user_id", user.user_id);
        await supabase.from("ban_audit_log").insert({ user_id: user.user_id, admin_id: adminId, action: args.enable ? "shadow_ban" : "unshadow_ban", reason: args.reason || "Shadow ban via AI agent" });
        return JSON.stringify({ success: true, message: `${user.username || user.email} ${args.enable ? "shadow banned" : "shadow ban removed"}` });
      }
      case "verify_user_badge": {
        const user = await findUser(supabase, args.identifier);
        if (!user) return JSON.stringify({ success: false, error: "User not found" });
        const updates: any = { is_verified: args.verified };
        if (args.verified) { updates.verified_by = adminId; updates.verified_at = new Date().toISOString(); }
        else { updates.verified_by = null; updates.verified_at = null; }
        await supabase.from("profiles").update(updates).eq("user_id", user.user_id);
        return JSON.stringify({ success: true, message: `${user.username || user.email} ${args.verified ? "verified ✓" : "unverified"}` });
      }
      case "reset_user_password": {
        const user = await findUser(supabase, args.identifier);
        if (!user) return JSON.stringify({ success: false, error: "User not found" });
        if (args.new_password.length < 6) return JSON.stringify({ success: false, error: "Password must be at least 6 characters" });
        const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        const { error } = await adminClient.auth.admin.updateUserById(user.user_id, { password: args.new_password });
        if (error) return JSON.stringify({ success: false, error: error.message });
        await supabase.from("notifications").insert({ user_id: user.user_id, type: "security", title: "Password Changed", message: "Your password has been reset by an administrator. If you did not request this, contact support immediately." });
        return JSON.stringify({ success: true, message: `Password reset for ${user.username || user.email}` });
      }
      case "recalculate_trust_score": {
        const user = await findUser(supabase, args.identifier);
        if (!user) return JSON.stringify({ success: false, error: "User not found" });
        const { data: score } = await supabase.rpc("calculate_trust_score", { _user_id: user.user_id });
        await supabase.from("profiles").update({ trust_score: score }).eq("user_id", user.user_id);
        return JSON.stringify({ success: true, message: `Trust score for ${user.username || user.email}: ${score}/100`, score });
      }
      case "list_mod_applications": {
        let query = supabase.from("mod_applications").select("*");
        if (args.status) query = query.eq("status", args.status);
        const { data } = await query.order("created_at", { ascending: false }).limit(20);
        return JSON.stringify({ success: true, applications: data || [], count: data?.length || 0 });
      }
      case "review_mod_application": {
        const { data: app } = await supabase.from("mod_applications").select("user_id, username").eq("id", args.application_id).maybeSingle();
        if (!app) return JSON.stringify({ success: false, error: "Application not found" });
        await supabase.from("mod_applications").update({ status: args.action, admin_notes: args.admin_notes || null, reviewed_by: adminId, reviewed_at: new Date().toISOString() }).eq("id", args.application_id);
        if (args.action === "approved") {
          await supabase.from("user_roles").delete().eq("user_id", app.user_id);
          await supabase.from("user_roles").insert({ user_id: app.user_id, role: "moderator" });
          await supabase.from("notifications").insert({ user_id: app.user_id, type: "admin", title: "🎉 Moderator Application Approved!", message: "Congratulations! You are now a moderator." });
        } else {
          await supabase.from("notifications").insert({ user_id: app.user_id, type: "admin", title: "Moderator Application Update", message: "Your moderator application has been reviewed. Unfortunately, it was not approved at this time." });
        }
        return JSON.stringify({ success: true, message: `Application ${args.action} for ${app.username}${args.action === "approved" ? " - moderator role granted" : ""}` });
      }
      case "mass_credit_users": {
        const results: string[] = [];
        for (const id of args.identifiers) {
          const user = await findUser(supabase, id);
          if (!user) { results.push(`❌ ${id}: not found`); continue; }
          const { data: w } = await supabase.from("wallets").select("balance").eq("user_id", user.user_id).maybeSingle();
          if (!w) { results.push(`❌ ${user.username}: no wallet`); continue; }
          await supabase.from("wallets").update({ balance: Number(w.balance) + Number(args.amount) }).eq("user_id", user.user_id);
          await supabase.from("wallet_transactions").insert({ user_id: user.user_id, amount: Number(args.amount), type: "admin_credit", description: args.reason });
          results.push(`✅ ${user.username || user.email}: +₹${args.amount}`);
        }
        return JSON.stringify({ success: true, message: `Mass credit complete`, results });
      }
      case "mass_notify_users": {
        const results: string[] = [];
        for (const id of args.identifiers) {
          const user = await findUser(supabase, id);
          if (!user) { results.push(`❌ ${id}: not found`); continue; }
          await supabase.from("notifications").insert({ user_id: user.user_id, title: args.title, message: args.message, type: args.type || "admin" });
          results.push(`✅ ${user.username || user.email}: notified`);
        }
        return JSON.stringify({ success: true, message: `Notifications sent`, results });
      }
      case "refund_all_tournament_participants": {
        const { data: tournament } = await supabase.from("tournaments").select("entry_fee, title").eq("id", args.tournament_id).maybeSingle();
        if (!tournament) return JSON.stringify({ success: false, error: "Tournament not found" });
        const { data: participants } = await supabase.from("tournament_participants").select("user_id").eq("tournament_id", args.tournament_id);
        if (!participants?.length) return JSON.stringify({ success: true, message: "No participants to refund" });
        let refunded = 0;
        for (const p of participants) {
          const { data: w } = await supabase.from("wallets").select("balance").eq("user_id", p.user_id).maybeSingle();
          if (w) {
            await supabase.from("wallets").update({ balance: Number(w.balance) + Number(tournament.entry_fee) }).eq("user_id", p.user_id);
            await supabase.from("wallet_transactions").insert({ user_id: p.user_id, amount: Number(tournament.entry_fee), type: "refund", description: `Refund: ${args.reason || tournament.title}`, reference_id: args.tournament_id });
            refunded++;
          }
        }
        return JSON.stringify({ success: true, message: `₹${tournament.entry_fee} refunded to ${refunded} participants of "${tournament.title}"` });
      }
      case "list_suspicious_activities": {
        let query = supabase.from("suspicious_activities").select("*");
        if (args.status) query = query.eq("status", args.status);
        if (args.severity) query = query.eq("severity", args.severity);
        const { data } = await query.order("created_at", { ascending: false }).limit(args.limit || 30);
        if (data) {
          for (const a of data) {
            if (a.user_id) {
              const { data: p } = await supabase.from("profiles").select("username, email").eq("user_id", a.user_id).maybeSingle();
              (a as any).username = p?.username || p?.email;
            }
          }
        }
        return JSON.stringify({ success: true, activities: data || [], count: data?.length || 0 });
      }
      case "review_suspicious_activity": {
        const { data: activity } = await supabase.from("suspicious_activities").select("user_id").eq("id", args.activity_id).maybeSingle();
        if (!activity) return JSON.stringify({ success: false, error: "Activity not found" });
        await supabase.from("suspicious_activities").update({ status: args.action, reviewed_by: adminId, reviewed_at: new Date().toISOString() }).eq("id", args.activity_id);
        if (args.ban_user && activity.user_id) {
          await supabase.from("profiles").update({ is_banned: true }).eq("user_id", activity.user_id);
          await supabase.from("ban_audit_log").insert({ user_id: activity.user_id, admin_id: adminId, action: "ban", reason: "Banned via suspicious activity review" });
        }
        return JSON.stringify({ success: true, message: `Activity ${args.action}${args.ban_user ? " + user banned" : ""}` });
      }
      case "get_user_conversations": {
        const user = await findUser(supabase, args.identifier);
        if (!user) return JSON.stringify({ success: false, error: "User not found" });
        const { data: participations } = await supabase.from("conversation_participants").select("conversation_id").eq("user_id", user.user_id).limit(args.limit || 10);
        const conversations: any[] = [];
        for (const p of (participations || [])) {
          const { data: messages } = await supabase.from("direct_messages").select("content, sender_id, created_at").eq("conversation_id", p.conversation_id).order("created_at", { ascending: false }).limit(5);
          const { data: participants } = await supabase.from("conversation_participants").select("user_id").eq("conversation_id", p.conversation_id).neq("user_id", user.user_id);
          let otherUser = null;
          if (participants?.[0]) {
            const { data: prof } = await supabase.from("profiles").select("username, email").eq("user_id", participants[0].user_id).maybeSingle();
            otherUser = prof?.username || prof?.email;
          }
          conversations.push({ conversation_id: p.conversation_id, with_user: otherUser, recent_messages: messages || [] });
        }
        return JSON.stringify({ success: true, user: user.username || user.email, conversations, count: conversations.length });
      }
      case "delete_messages": {
        let deleted = 0;
        for (const msgId of args.message_ids) {
          const { error } = await supabase.from("direct_messages").delete().eq("id", msgId);
          if (!error) deleted++;
        }
        return JSON.stringify({ success: true, message: `${deleted}/${args.message_ids.length} messages deleted` });
      }
      case "list_live_streams": {
        let query = supabase.from("live_streams").select("id, title, user_id, platform, viewer_count, is_live, created_at");
        if (args.live_only) query = query.eq("is_live", true);
        const { data } = await query.order("created_at", { ascending: false }).limit(args.limit || 20);
        if (data) {
          for (const s of data) {
            const { data: p } = await supabase.from("profiles").select("username").eq("user_id", s.user_id).maybeSingle();
            (s as any).streamer = p?.username;
          }
        }
        return JSON.stringify({ success: true, streams: data || [], count: data?.length || 0 });
      }
      case "end_live_stream": {
        const { error } = await supabase.from("live_streams").update({ is_live: false, ended_at: new Date().toISOString() }).eq("id", args.stream_id);
        if (error) return JSON.stringify({ success: false, error: error.message });
        const { data: stream } = await supabase.from("live_streams").select("user_id, title").eq("id", args.stream_id).maybeSingle();
        if (stream) {
          await supabase.from("notifications").insert({ user_id: stream.user_id, type: "admin", title: "Stream Ended", message: `Your stream "${stream.title}" was ended by an admin. ${args.reason ? `Reason: ${args.reason}` : ""}` });
        }
        return JSON.stringify({ success: true, message: `Stream force-ended${args.reason ? `. Reason: ${args.reason}` : ""}` });
      }
      case "list_apk_releases": {
        const { data } = await supabase.from("apk_releases").select("*").order("created_at", { ascending: false });
        return JSON.stringify({ success: true, releases: data || [], count: data?.length || 0 });
      }
      case "create_apk_release": {
        const { error } = await supabase.from("apk_releases").insert({
          version: args.version, file_url: args.file_url, file_size: args.file_size || "Unknown",
          release_notes: args.release_notes || null, min_android: args.min_android || "Android 7.0+", uploaded_by: adminId,
        });
        if (error) return JSON.stringify({ success: false, error: error.message });
        return JSON.stringify({ success: true, message: `APK v${args.version} release created` });
      }
      case "list_automation_rules": {
        const { data } = await supabase.from("automation_rules").select("*").order("created_at", { ascending: false });
        return JSON.stringify({ success: true, rules: data || [], count: data?.length || 0 });
      }
      case "create_automation_rule": {
        const { error } = await supabase.from("automation_rules").insert({
          name: args.name, trigger_type: args.trigger_type, trigger_threshold: args.trigger_threshold,
          action_type: args.action_type, action_duration_hours: args.action_duration_hours || null, created_by: adminId,
        });
        if (error) return JSON.stringify({ success: false, error: error.message });
        return JSON.stringify({ success: true, message: `Automation rule "${args.name}" created` });
      }
      case "toggle_automation_rule": {
        const { error } = await supabase.from("automation_rules").update({ is_active: args.is_active }).eq("id", args.rule_id);
        if (error) return JSON.stringify({ success: false, error: error.message });
        return JSON.stringify({ success: true, message: `Automation rule ${args.is_active ? "enabled" : "disabled"}` });
      }
      // ===== NEW ADVANCED TOOLS =====
      case "export_data_csv": {
        const limit = Math.min(args.limit || 100, 500);
        const days = args.filters?.days || 9999;
        const since = new Date(Date.now() - days * 86400000).toISOString();
        let csvData = "";
        
        switch (args.table) {
          case "users": {
            let q = supabase.from("profiles").select("username, email, uid, is_banned, is_verified, trust_score, city, country, created_at, last_seen, user_id");
            if (args.filters?.is_banned !== undefined) q = q.eq("is_banned", args.filters.is_banned);
            const { data } = await q.order("created_at", { ascending: false }).limit(limit);
            if (data?.length) {
              csvData = Object.keys(data[0]).join(",") + "\n" + data.map(r => Object.values(r).map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
            }
            break;
          }
          case "transactions": {
            const { data } = await supabase.from("wallet_transactions").select("user_id, amount, type, description, created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(limit);
            if (data?.length) {
              csvData = "user_id,amount,type,description,created_at\n" + data.map(r => `"${r.user_id}",${r.amount},"${r.type}","${(r.description||"").replace(/"/g,'""')}","${r.created_at}"`).join("\n");
            }
            break;
          }
          case "tournaments": {
            const { data } = await supabase.from("tournaments").select("id, title, game, entry_fee, prize_pool, max_players, current_players, status, start_time, created_at").order("created_at", { ascending: false }).limit(limit);
            if (data?.length) {
              csvData = Object.keys(data[0]).join(",") + "\n" + data.map(r => Object.values(r).map(v => `"${String(v ?? "")}"`).join(",")).join("\n");
            }
            break;
          }
          case "withdrawals": {
            let q = supabase.from("withdrawal_requests").select("id, user_id, amount, upi_id, status, created_at, admin_notes");
            if (args.filters?.status) q = q.eq("status", args.filters.status);
            const { data } = await q.order("created_at", { ascending: false }).limit(limit);
            if (data?.length) {
              csvData = Object.keys(data[0]).join(",") + "\n" + data.map(r => Object.values(r).map(v => `"${String(v ?? "")}"`).join(",")).join("\n");
            }
            break;
          }
          case "topups": {
            let q = supabase.from("topup_requests").select("id, user_id, amount, utr, status, created_at");
            if (args.filters?.status) q = q.eq("status", args.filters.status);
            const { data } = await q.order("created_at", { ascending: false }).limit(limit);
            if (data?.length) {
              csvData = Object.keys(data[0]).join(",") + "\n" + data.map(r => Object.values(r).map(v => `"${String(v ?? "")}"`).join(",")).join("\n");
            }
            break;
          }
          case "reports": {
            const { data } = await supabase.from("user_reports").select("id, reporter_id, reported_user_id, report_type, reason, status, created_at").order("created_at", { ascending: false }).limit(limit);
            if (data?.length) {
              csvData = Object.keys(data[0]).join(",") + "\n" + data.map(r => Object.values(r).map(v => `"${String(v ?? "")}"`).join(",")).join("\n");
            }
            break;
          }
          case "tickets": {
            const { data } = await supabase.from("support_tickets").select("id, email, issue_type, subject, status, created_at").order("created_at", { ascending: false }).limit(limit);
            if (data?.length) {
              csvData = Object.keys(data[0]).join(",") + "\n" + data.map(r => Object.values(r).map(v => `"${String(v ?? "")}"`).join(",")).join("\n");
            }
            break;
          }
          case "gift_codes": {
            const { data } = await supabase.from("gift_codes").select("code, amount, max_uses, used_count, is_active, expiry, created_at").order("created_at", { ascending: false }).limit(limit);
            if (data?.length) {
              csvData = Object.keys(data[0]).join(",") + "\n" + data.map(r => Object.values(r).map(v => `"${String(v ?? "")}"`).join(",")).join("\n");
            }
            break;
          }
        }
        return JSON.stringify({ success: true, table: args.table, rows: csvData.split("\n").length - 1, csv: csvData || "No data found" });
      }
      case "cross_table_analytics": {
        const days = args.days || 30;
        const since = new Date(Date.now() - days * 86400000).toISOString();
        
        switch (args.analysis_type) {
          case "revenue_cohort": {
            const { data: txns } = await supabase.from("wallet_transactions").select("user_id, amount, type, created_at").in("type", ["entry_fee", "deposit", "prize", "withdrawal"]).gte("created_at", since);
            const cohorts: Record<string, { users: Set<string>; revenue: number; prizes: number }> = {};
            for (const t of txns || []) {
              const week = `Week ${Math.ceil((Date.now() - new Date(t.created_at).getTime()) / (7 * 86400000))}`;
              if (!cohorts[week]) cohorts[week] = { users: new Set(), revenue: 0, prizes: 0 };
              cohorts[week].users.add(t.user_id);
              if (t.type === "entry_fee") cohorts[week].revenue += Math.abs(Number(t.amount));
              if (t.type === "prize") cohorts[week].prizes += Number(t.amount);
            }
            const result = Object.entries(cohorts).map(([week, d]) => ({ week, unique_users: d.users.size, revenue: d.revenue, prizes_paid: d.prizes, net: d.revenue - d.prizes }));
            return JSON.stringify({ success: true, analysis: "revenue_cohort", data: result });
          }
          case "whale_analysis": {
            const { data: wallets } = await supabase.from("wallets").select("user_id, balance").order("balance", { ascending: false }).limit(20);
            const whales: any[] = [];
            for (const w of wallets || []) {
              const [{ data: profile }, { data: txns }, { data: tournaments }] = await Promise.all([
                supabase.from("profiles").select("username, email, trust_score, created_at").eq("user_id", w.user_id).maybeSingle(),
                supabase.from("wallet_transactions").select("amount, type").eq("user_id", w.user_id),
                supabase.from("tournament_participants").select("id").eq("user_id", w.user_id),
              ]);
              const totalSpent = (txns || []).filter(t => Number(t.amount) < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
              const totalEarned = (txns || []).filter(t => Number(t.amount) > 0).reduce((s, t) => s + Number(t.amount), 0);
              whales.push({ ...profile, balance: w.balance, total_spent: totalSpent, total_earned: totalEarned, tournaments: tournaments?.length || 0 });
            }
            return JSON.stringify({ success: true, analysis: "whale_analysis", data: whales });
          }
          case "churn_prediction": {
            const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
            const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000).toISOString();
            const { data: activeUsers } = await supabase.from("profiles").select("user_id, username, last_seen, trust_score, created_at").lt("last_seen", thirtyDaysAgo).gt("last_seen", sixtyDaysAgo).limit(50);
            const atRisk: any[] = [];
            for (const u of activeUsers || []) {
              const { data: wallet } = await supabase.from("wallets").select("balance").eq("user_id", u.user_id).maybeSingle();
              const { data: tournaments } = await supabase.from("tournament_participants").select("id").eq("user_id", u.user_id);
              const daysSinceActive = Math.floor((Date.now() - new Date(u.last_seen || "").getTime()) / 86400000);
              atRisk.push({ username: u.username, days_inactive: daysSinceActive, balance: wallet?.balance || 0, tournaments_played: tournaments?.length || 0, trust_score: u.trust_score, risk_level: daysSinceActive > 45 ? "high" : "medium" });
            }
            return JSON.stringify({ success: true, analysis: "churn_prediction", at_risk_users: atRisk.sort((a, b) => b.days_inactive - a.days_inactive), count: atRisk.length });
          }
          case "tournament_roi": {
            const { data: tournaments } = await supabase.from("tournaments").select("id, title, game, entry_fee, prize_pool, current_players, status").gte("created_at", since);
            const analysis = (tournaments || []).map(t => {
              const revenue = Number(t.entry_fee) * t.current_players;
              const profit = revenue - Number(t.prize_pool);
              return { title: t.title, game: t.game, players: t.current_players, revenue, prize_pool: Number(t.prize_pool), profit, roi_pct: revenue > 0 ? ((profit / revenue) * 100).toFixed(1) + "%" : "N/A", status: t.status };
            });
            return JSON.stringify({ success: true, analysis: "tournament_roi", data: analysis.sort((a, b) => b.profit - a.profit) });
          }
          default: {
            const { data: users } = await supabase.from("profiles").select("user_id, created_at, last_seen, trust_score").gte("created_at", since);
            const { data: txns } = await supabase.from("wallet_transactions").select("user_id, amount, type").gte("created_at", since);
            const { data: parts } = await supabase.from("tournament_participants").select("user_id").gte("joined_at", since);
            const userCount = users?.length || 0;
            const activeSpenders = new Set((txns || []).map(t => t.user_id)).size;
            const tournamentPlayers = new Set((parts || []).map(p => p.user_id)).size;
            return JSON.stringify({ success: true, analysis: args.analysis_type, summary: { total_users: userCount, active_spenders: activeSpenders, tournament_participants: tournamentPlayers, engagement_rate: userCount ? ((tournamentPlayers / userCount) * 100).toFixed(1) + "%" : "0%" } });
          }
        }
      }
      case "compare_periods": {
        const p1Days = args.period1_days || 7;
        const p2Days = args.period2_days || p1Days;
        const now = Date.now();
        const p1Start = new Date(now - p1Days * 86400000).toISOString();
        const p2Start = new Date(now - (p1Days + p2Days) * 86400000).toISOString();
        const p2End = new Date(now - p1Days * 86400000).toISOString();

        const [{ count: p1Users }, { count: p2Users }, { data: p1Txns }, { data: p2Txns }, { count: p1Tournaments }, { count: p2Tournaments }] = await Promise.all([
          supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", p1Start),
          supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", p2Start).lt("created_at", p2End),
          supabase.from("wallet_transactions").select("amount, type").gte("created_at", p1Start),
          supabase.from("wallet_transactions").select("amount, type").gte("created_at", p2Start).lt("created_at", p2End),
          supabase.from("tournaments").select("*", { count: "exact", head: true }).gte("created_at", p1Start),
          supabase.from("tournaments").select("*", { count: "exact", head: true }).gte("created_at", p2Start).lt("created_at", p2End),
        ]);

        const calcRevenue = (txns: any[]) => (txns || []).filter(t => t.type === "entry_fee").reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
        const p1Revenue = calcRevenue(p1Txns || []);
        const p2Revenue = calcRevenue(p2Txns || []);
        const pctChange = (a: number, b: number) => b === 0 ? (a > 0 ? "+∞" : "0%") : ((a - b) / b * 100).toFixed(1) + "%";

        return JSON.stringify({
          success: true,
          period1: { label: `Last ${p1Days} days`, new_users: p1Users, revenue: p1Revenue, tournaments: p1Tournaments },
          period2: { label: `Previous ${p2Days} days`, new_users: p2Users, revenue: p2Revenue, tournaments: p2Tournaments },
          changes: { users: pctChange(p1Users || 0, p2Users || 0), revenue: pctChange(p1Revenue, p2Revenue), tournaments: pctChange(p1Tournaments || 0, p2Tournaments || 0) },
        });
      }
      case "find_users_by_criteria": {
        let query = supabase.from("profiles").select("user_id, username, email, uid, is_banned, is_verified, trust_score, city, country, created_at, last_seen");
        if (args.min_trust_score !== undefined) query = query.gte("trust_score", args.min_trust_score);
        if (args.max_trust_score !== undefined) query = query.lte("trust_score", args.max_trust_score);
        if (args.is_banned !== undefined) query = query.eq("is_banned", args.is_banned);
        if (args.is_verified !== undefined) query = query.eq("is_verified", args.is_verified);
        if (args.country) query = query.ilike("country", `%${args.country}%`);
        if (args.city) query = query.ilike("city", `%${args.city}%`);
        if (args.joined_after) query = query.gte("created_at", args.joined_after);
        if (args.joined_before) query = query.lte("created_at", args.joined_before);
        if (args.has_no_activity_days) {
          const cutoff = new Date(Date.now() - args.has_no_activity_days * 86400000).toISOString();
          query = query.lt("last_seen", cutoff);
        }
        const { data } = await query.order("created_at", { ascending: false }).limit(args.limit || 50);
        
        const enriched: any[] = [];
        for (const u of (data || []).slice(0, 20)) {
          const [{ data: wallet }, { count: tournamentCount }] = await Promise.all([
            supabase.from("wallets").select("balance").eq("user_id", u.user_id).maybeSingle(),
            supabase.from("tournament_participants").select("*", { count: "exact", head: true }).eq("user_id", u.user_id),
          ]);
          const balance = wallet?.balance || 0;
          if (args.min_balance !== undefined && balance < args.min_balance) continue;
          if (args.max_balance !== undefined && balance > args.max_balance) continue;
          if (args.min_tournaments !== undefined && (tournamentCount || 0) < args.min_tournaments) continue;
          enriched.push({ ...u, balance, tournaments: tournamentCount || 0 });
        }
        return JSON.stringify({ success: true, users: enriched, count: enriched.length, note: "Use bulk_action with the user_ids to perform actions on these users" });
      }
      case "bulk_action": {
        const results: string[] = [];
        for (const userId of args.user_ids) {
          try {
            switch (args.action) {
              case "ban":
                await supabase.from("profiles").update({ is_banned: true }).eq("user_id", userId);
                await supabase.from("ban_audit_log").insert({ user_id: userId, admin_id: adminId, action: "ban", reason: args.reason || "Bulk action" });
                results.push(`✅ ${userId}: banned`);
                break;
              case "unban":
                await supabase.from("profiles").update({ is_banned: false }).eq("user_id", userId);
                results.push(`✅ ${userId}: unbanned`);
                break;
              case "credit":
                await supabase.from("wallets").update({ balance: supabase.raw(`balance + ${args.amount}`) }).eq("user_id", userId);
                await supabase.from("wallet_transactions").insert({ user_id: userId, amount: args.amount, type: "admin_credit", description: args.reason || "Bulk credit" });
                results.push(`✅ ${userId}: credited ₹${args.amount}`);
                break;
              case "notify":
                await supabase.from("notifications").insert({ user_id: userId, type: "admin", title: args.notification_title || "Admin Notice", message: args.notification_message || args.reason || "You have a notification" });
                results.push(`✅ ${userId}: notified`);
                break;
              case "shadow_ban":
                await supabase.from("profiles").update({ is_shadow_banned: true }).eq("user_id", userId);
                results.push(`✅ ${userId}: shadow banned`);
                break;
              case "verify":
                await supabase.from("profiles").update({ is_verified: true, verified_by: adminId, verified_at: new Date().toISOString() }).eq("user_id", userId);
                results.push(`✅ ${userId}: verified`);
                break;
              case "set_role":
                await supabase.from("user_roles").delete().eq("user_id", userId);
                await supabase.from("user_roles").insert({ user_id: userId, role: args.role || "user" });
                results.push(`✅ ${userId}: role set to ${args.role}`);
                break;
              default:
                results.push(`⚠️ ${userId}: action '${args.action}' not implemented in bulk`);
            }
          } catch (e: any) {
            results.push(`❌ ${userId}: ${e.message}`);
          }
        }
        return JSON.stringify({ success: true, action: args.action, total: args.user_ids.length, results });
      }
      case "get_user_timeline": {
        const user = await findUser(supabase, args.identifier);
        if (!user) return JSON.stringify({ success: false, error: "User not found" });
        const since = new Date(Date.now() - (args.days || 30) * 86400000).toISOString();
        const [{ data: logins }, { data: txns }, { data: tournaments }, { data: reports }, { data: bans }, { data: tickets }, { data: clips }] = await Promise.all([
          supabase.from("login_history").select("logged_in_at, ip_address, city, browser").eq("user_id", user.user_id).gte("logged_in_at", since).order("logged_in_at", { ascending: false }).limit(20),
          supabase.from("wallet_transactions").select("amount, type, description, created_at").eq("user_id", user.user_id).gte("created_at", since).order("created_at", { ascending: false }).limit(20),
          supabase.from("tournament_participants").select("tournament_id, joined_at, is_winner").eq("user_id", user.user_id).gte("joined_at", since),
          supabase.from("user_reports").select("report_type, reason, status, created_at").eq("reported_user_id", user.user_id).gte("created_at", since),
          supabase.from("ban_audit_log").select("action, reason, created_at").eq("user_id", user.user_id).gte("created_at", since),
          supabase.from("support_tickets").select("issue_type, subject, status, created_at").eq("user_id", user.user_id).gte("created_at", since),
          supabase.from("gaming_clips").select("title, views, created_at").eq("user_id", user.user_id).gte("created_at", since),
        ]);
        const timeline: any[] = [];
        for (const l of logins || []) timeline.push({ type: "login", time: l.logged_in_at, details: `${l.browser} from ${l.city || l.ip_address}` });
        for (const t of txns || []) timeline.push({ type: "transaction", time: t.created_at, details: `${t.type}: ₹${t.amount} - ${t.description}` });
        for (const t of tournaments || []) timeline.push({ type: "tournament", time: t.joined_at, details: `Joined tournament${t.is_winner ? " 🏆 WINNER" : ""}` });
        for (const r of reports || []) timeline.push({ type: "report", time: r.created_at, details: `Reported for ${r.report_type}: ${r.reason} [${r.status}]` });
        for (const b of bans || []) timeline.push({ type: "ban_action", time: b.created_at, details: `${b.action}: ${b.reason}` });
        for (const t of tickets || []) timeline.push({ type: "ticket", time: t.created_at, details: `${t.issue_type}: ${t.subject} [${t.status}]` });
        for (const c of clips || []) timeline.push({ type: "clip", time: c.created_at, details: `Uploaded "${c.title}" (${c.views} views)` });
        timeline.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        return JSON.stringify({ success: true, user: user.username || user.email, timeline, event_count: timeline.length });
      }
      case "get_revenue_breakdown": {
        const days = args.days || 30;
        const since = new Date(Date.now() - days * 86400000).toISOString();
        const { data: txns } = await supabase.from("wallet_transactions").select("user_id, amount, type, created_at").gte("created_at", since);
        const byType: Record<string, number> = {};
        const dailyRevenue: Record<string, number> = {};
        const userSpending: Record<string, number> = {};
        for (const t of txns || []) {
          byType[t.type] = (byType[t.type] || 0) + Number(t.amount);
          const day = t.created_at.slice(0, 10);
          if (t.type === "entry_fee") {
            dailyRevenue[day] = (dailyRevenue[day] || 0) + Math.abs(Number(t.amount));
            userSpending[t.user_id] = (userSpending[t.user_id] || 0) + Math.abs(Number(t.amount));
          }
        }
        const topSpenders = Object.entries(userSpending).sort((a, b) => b[1] - a[1]).slice(0, 10);
        const topSpenderDetails: any[] = [];
        for (const [uid, spent] of topSpenders) {
          const { data: p } = await supabase.from("profiles").select("username, email").eq("user_id", uid).maybeSingle();
          topSpenderDetails.push({ user: p?.username || p?.email || uid, total_spent: spent });
        }
        return JSON.stringify({ success: true, period_days: days, revenue_by_type: byType, daily_revenue: dailyRevenue, top_spenders: topSpenderDetails, total_entry_fees: Object.values(dailyRevenue).reduce((s, v) => s + v, 0) });
      }
      case "get_growth_metrics": {
        const days = args.days || 30;
        const dailySignups: Record<string, number> = {};
        const { data: profiles } = await supabase.from("profiles").select("created_at").gte("created_at", new Date(Date.now() - days * 86400000).toISOString());
        for (const p of profiles || []) {
          const day = p.created_at.slice(0, 10);
          dailySignups[day] = (dailySignups[day] || 0) + 1;
        }
        const { count: totalUsers } = await supabase.from("profiles").select("*", { count: "exact", head: true });
        const { count: recentActive } = await supabase.from("profiles").select("*", { count: "exact", head: true }).gte("last_seen", new Date(Date.now() - 7 * 86400000).toISOString());
        const { count: monthlyActive } = await supabase.from("profiles").select("*", { count: "exact", head: true }).gte("last_seen", new Date(Date.now() - 30 * 86400000).toISOString());
        return JSON.stringify({
          success: true, period_days: days, total_users: totalUsers, daily_signups: dailySignups,
          wau: recentActive, mau: monthlyActive,
          dau_mau_ratio: monthlyActive ? ((recentActive || 0) / (monthlyActive || 1) * 100).toFixed(1) + "%" : "N/A",
          avg_daily_signups: (Object.values(dailySignups).reduce((s, v) => s + v, 0) / Math.max(Object.keys(dailySignups).length, 1)).toFixed(1),
        });
      }
      case "cleanup_stale_data": {
        const olderThan = args.older_than_days || 90;
        const cutoff = new Date(Date.now() - olderThan * 86400000).toISOString();
        const dryRun = args.dry_run !== false;
        const results: any = {};

        if (args.target === "expired_gift_codes" || args.target === "all") {
          const { data, count } = await supabase.from("gift_codes").select("code, expiry", { count: "exact" }).lt("expiry", new Date().toISOString()).eq("is_active", true);
          results.expired_gift_codes = { count: count || 0, items: (data || []).slice(0, 5) };
          if (!dryRun && data?.length) {
            await supabase.from("gift_codes").update({ is_active: false }).lt("expiry", new Date().toISOString());
            results.expired_gift_codes.action = "deactivated";
          }
        }
        if (args.target === "stale_topups" || args.target === "all") {
          const { count } = await supabase.from("topup_requests").select("*", { count: "exact", head: true }).eq("status", "pending").lt("created_at", cutoff);
          results.stale_topups = { count: count || 0, older_than_days: olderThan };
          if (!dryRun) {
            await supabase.from("topup_requests").update({ status: "rejected", admin_notes: "Auto-rejected: stale request" }).eq("status", "pending").lt("created_at", cutoff);
            results.stale_topups.action = "rejected";
          }
        }
        if (args.target === "old_notifications" || args.target === "all") {
          const { count } = await supabase.from("notifications").select("*", { count: "exact", head: true }).eq("is_read", true).lt("created_at", cutoff);
          results.old_notifications = { count: count || 0, older_than_days: olderThan };
          if (!dryRun) {
            await supabase.from("notifications").delete().eq("is_read", true).lt("created_at", cutoff);
            results.old_notifications.action = "deleted";
          }
        }
        return JSON.stringify({ success: true, dry_run: dryRun, results, note: dryRun ? "This was a dry run. Set dry_run=false to execute." : "Actions executed." });
      }
      case "get_leaderboard_data": {
        const limit = args.limit || 20;
        switch (args.type) {
          case "earnings": {
            const { data } = await supabase.from("player_leaderboard").select("*").order("total_earnings", { ascending: false }).limit(limit);
            return JSON.stringify({ success: true, type: "earnings", leaderboard: data || [] });
          }
          case "wins": {
            const { data } = await supabase.from("player_leaderboard").select("*").order("wins", { ascending: false }).limit(limit);
            return JSON.stringify({ success: true, type: "wins", leaderboard: data || [] });
          }
          case "tournaments_played": {
            const { data } = await supabase.from("player_leaderboard").select("*").order("tournaments_played", { ascending: false }).limit(limit);
            return JSON.stringify({ success: true, type: "tournaments_played", leaderboard: data || [] });
          }
          case "trust_score": {
            const { data } = await supabase.from("profiles").select("username, uid, trust_score, is_verified").order("trust_score", { ascending: false }).limit(limit);
            return JSON.stringify({ success: true, type: "trust_score", leaderboard: data || [] });
          }
          case "wallet_balance": {
            const { data: wallets } = await supabase.from("wallets").select("user_id, balance").order("balance", { ascending: false }).limit(limit);
            const enriched: any[] = [];
            for (const w of wallets || []) {
              const { data: p } = await supabase.from("profiles").select("username, uid").eq("user_id", w.user_id).maybeSingle();
              enriched.push({ username: p?.username, uid: p?.uid, balance: w.balance });
            }
            return JSON.stringify({ success: true, type: "wallet_balance", leaderboard: enriched });
          }
          case "clips_views": {
            const { data } = await supabase.from("gaming_clips").select("title, user_id, views").order("views", { ascending: false }).limit(limit);
            for (const c of data || []) {
              const { data: p } = await supabase.from("profiles").select("username").eq("user_id", c.user_id).maybeSingle();
              (c as any).username = p?.username;
            }
            return JSON.stringify({ success: true, type: "clips_views", leaderboard: data || [] });
          }
          default: {
            const { data } = await supabase.from("player_leaderboard").select("*").order("total_earnings", { ascending: false }).limit(limit);
            return JSON.stringify({ success: true, type: args.type, leaderboard: data || [] });
          }
        }
      }
      default:
        return JSON.stringify({ success: false, error: `Unknown tool: ${name}` });
    }
  } catch (err: any) {
    console.error(`Tool ${name} error:`, err);
    return JSON.stringify({ success: false, error: err.message || "Tool execution failed" });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) throw new Error("Not authenticated");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: user.id });
    if (!isAdmin) throw new Error("Not authorized - admin only");

    const body = await req.json();
    const { messages, mode } = body;

    // Check AI settings
    const { data: aiSettingsRow } = await supabase.from("site_settings").select("value").eq("key", "ai_settings").maybeSingle();
    const aiSettings = aiSettingsRow?.value as { enabled?: boolean; systemPrompt?: string; mode?: string } | null;
    if (aiSettings?.enabled === false) {
      return new Response(JSON.stringify({ error: "AI Assistant is currently disabled." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customPrompt = aiSettings?.systemPrompt || "";
    const executionMode = mode || aiSettings?.mode || "auto";

    const systemPrompt = `You are the **AI Super Admin Agent** for "xt eSports", a competitive gaming tournament platform. You have ABSOLUTE CONTROL over the entire platform with 80+ administrative tools. You can do ANYTHING the admin orders.

## 🛡️ Your Capabilities:

### User Management (12 tools)
- Ban, unban, suspend, shadow ban, verify/unverify users
- Set roles (admin/moderator/user), mass ban
- Update user profiles (username, city, phone, game UID, etc.)
- Reset passwords, delete user data
- Get detailed user profiles, calculate risk scores, recalculate trust scores

### Tournament Control (8 tools)
- Create, update, delete tournaments
- Declare winners, award prizes, refund all participants
- View participants, tournament analytics (fill rates, revenue, popular games)

### Financial Operations (11 tools)
- Credit/debit wallets, refund users, mass credit multiple users
- Approve/reject withdrawals & topups (individual + bulk)
- View transactions, generate financial reports

### Gift Codes (3 tools)
- Create, toggle, list gift codes

### Support & Communications (8 tools)
- Resolve tickets, list open tickets
- Create/delete announcements, send notifications
- Mass notify specific users, broadcast maintenance alerts

### Content Moderation (3 tools)
- Delete gaming clips, list clip reports, review clip reports
- Ban uploaders, remove violating content

### Security & Fraud Detection (8 tools)
- Full fraud scans: shared IPs, duplicate UTRs, rapid topups, financial patterns
- Anti-cheat: abnormal win rates, shared game UIDs
- Multi-account detection, flag suspicious users
- List and review suspicious activities, auto-ban flagged users

### Moderator Management (2 tools)
- List and review moderator applications
- Approve (grants role) or reject applications

### Live Stream Control (2 tools)
- List live/recent streams, force-end streams for violations

### Traffic & Threat Detection (1 tool)
- Analyze traffic: hourly distribution, suspicious IPs, geographic anomalies, DDoS indicators

### System Health & Diagnostics (2 tools)
- Deep system health, platform diagnostics (wallet mismatches, stale requests, orphaned data)

### Activity Logging (1 tool)
- Comprehensive audit trail: admin actions, financial events, security events

### Automation Rules (3 tools)
- Create, toggle, and list trigger-based automation rules

### APK Management (2 tools)
- List releases, create new APK release records

### Conversations & Messages (2 tools)
- View user DMs for moderation, delete messages

### Admin Alerts (1 tool)
- Send critical/warning/info alerts to all admins

### Analytics & Monitoring (5 tools)
- Platform stats, health checks, user behavior analysis, risk scoring, recent signups

### Optimization & Recommendations (2 tools)
- Performance optimization engine, AI-powered smart recommendations

### Platform Settings (1 tool)
- Update any site setting (payment, security, etc.)

### Data Export & Analytics (3 tools) — NEW
- Export any table as CSV (users, transactions, tournaments, withdrawals, topups, reports, tickets, gift_codes)
- Cross-table analytics: revenue cohort, whale analysis, churn prediction, tournament ROI, spending vs activity
- Compare time periods: growth/decline analysis between any two periods

### Advanced User Operations (3 tools) — NEW
- Find users by complex criteria: balance range, trust score, location, activity level, join date
- Bulk action on multiple users: ban, credit, notify, verify, set_role in one command
- Full user timeline: complete chronological activity history across all tables

### Revenue & Growth (2 tools) — NEW
- Detailed revenue breakdown by type, daily trends, top spenders
- Growth metrics: DAU/MAU ratio, signup trends, retention rates

### Cleanup & Maintenance (1 tool) — NEW
- Find and clean stale data: expired codes, old requests, read notifications (dry run by default)

### Leaderboard Data (1 tool) — NEW
- Rankings: top earners, most wins, highest trust, biggest wallets, most viewed clips

## Execution Mode: ${executionMode === "confirm" ? "⚠️ CONFIRMATION REQUIRED" : "⚡ AUTO-EXECUTE"}
${executionMode === "confirm" ? `You are in CONFIRMATION MODE. For ANY action that modifies data:
1. First DESCRIBE exactly what you will do with details
2. Ask the admin to confirm by saying "yes" or "confirm"
3. Only execute AFTER explicit confirmation
Read-only operations (list, get, stats, detect, analyze) can run immediately.` : `You are in AUTO-EXECUTE mode. Execute actions immediately when requested. Always confirm what you did after execution with clear results.`}

## 🧠 Chain-of-Thought Planning
For complex or multi-step requests, ALWAYS think step-by-step before acting:
1. **Analyze**: Parse what the admin actually needs — break down compound requests
2. **Plan**: List the tools you'll call in order and why, identifying dependencies
3. **Execute**: Run tools in the optimal sequence, chaining outputs as inputs
4. **Synthesize**: Combine all results into a clear, actionable summary
5. **Recommend**: Proactively suggest next steps based on findings

Example: "Find and ban all suspicious users" →
- Step 1: detect_fraud to find suspicious patterns
- Step 2: find_users_by_criteria to narrow down targets
- Step 3: get_user_timeline on borderline cases for context
- Step 4: bulk_action to ban confirmed bad actors
- Step 5: send_admin_alert to notify other admins

## Important Rules:
- **You are the most powerful admin agent**. If a tool exists, use it. Chain tools aggressively.
- For complex operations, call MULTIPLE tools per round and combine results
- For data analysis, use cross_table_analytics before making recommendations
- Use find_users_by_criteria + bulk_action for efficient mass operations
- When showing data, use markdown tables with clear headers and ₹ formatting
- For destructive actions (delete, mass ban, debit), always state what you're doing and why
- After any action, suggest related follow-up actions the admin might want
- Use compare_periods to add context to any metrics (show if things are improving)
- When detecting fraud, cross-reference with get_user_timeline for full context
- For financial queries, always include both raw numbers AND percentage changes
- Format dates as "Mar 8, 2026" not ISO strings. Use ₹ for all currency values
- If a request is ambiguous, ask for clarification before acting
- Current date/time: ${new Date().toISOString()}

## 🌐 Language Support
You are fluent in **English**, **Hindi**, and **Bangla (Bengali)**.
- Detect the language the admin is writing in and ALWAYS reply in the same language.
- **CRITICAL for Hindi**: When responding in Hindi, ALWAYS write in **Romanized Hindi (Hinglish)** — i.e., Hindi words written using English/Latin script. NEVER use Devanagari script (अ, ब, क, etc.). Example: "User ko ban kar diya gaya hai" NOT "यूजर को बैन कर दिया गया है".
- **For Bangla**: Respond in standard Bengali script (বাংলা).
- **For English**: Respond normally in English.
- Tool calls, table headers, and technical identifiers (emails, UIDs, amounts) should remain in English regardless of language.
- If the admin switches language mid-conversation, switch with them immediately.
${customPrompt ? `\n## Custom Admin Instructions:\n${customPrompt}` : ""}`;

    const enableStreaming = body.stream === true;

    let conversationMessages: any[] = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    const MAX_TOOL_ROUNDS = 25;
    let toolRound = 0;
    let finalContent = "";
    const toolExecutions: { tool: string; args: any; result: string }[] = [];

    // Tool execution loop (non-streaming)
    while (toolRound < MAX_TOOL_ROUNDS) {
      toolRound++;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: conversationMessages,
          tools: ADMIN_TOOLS,
          stream: false,
        }),
      });

      if (!aiResponse.ok) {
        if (aiResponse.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (aiResponse.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const t = await aiResponse.text();
        console.error("AI gateway error:", aiResponse.status, t);
        return new Response(JSON.stringify({ error: "AI service error" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = await aiResponse.json();
      const choice = result.choices?.[0];
      
      if (!choice) {
        finalContent = "I couldn't generate a response. Please try again.";
        break;
      }

      const assistantMsg = choice.message;
      // Normalize: assistant messages with tool_calls must have string content (not null)
      if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
        assistantMsg.content = assistantMsg.content ?? "";
      }
      conversationMessages.push(assistantMsg);

      if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
        for (const toolCall of assistantMsg.tool_calls) {
          const toolName = toolCall.function.name;
          let toolArgs: any = {};
          try { toolArgs = JSON.parse(toolCall.function.arguments); } catch {}

          console.log(`Executing tool: ${toolName}`, toolArgs);
          const toolResult = await executeTool(supabase, user.id, toolName, toolArgs);
          toolExecutions.push({ tool: toolName, args: toolArgs, result: toolResult });

          conversationMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: toolResult,
          });
        }
        continue;
      }

      // Final text response — stream the existing content (no second AI call!)
      // This avoids content drift, hallucination, and silent model failures.
      finalContent = assistantMsg.content || "";

      // Detect language from the last user message
      const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user")?.content || "";
      const detectedLang = detectLanguage(lastUserMsg);

      if (enableStreaming) {
        const encoder = new TextEncoder();
        const contentToStream = finalContent;
        const execs = toolExecutions;
        const lang = detectedLang;
        const stream = new ReadableStream({
          async start(controller) {
            // Send detected language first
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "language", lang })}\n\n`));
            if (execs.length > 0) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "tool_executions", data: execs })}\n\n`));
            }
            const CHUNK = 20;
            for (let i = 0; i < contentToStream.length; i += CHUNK) {
              const piece = contentToStream.slice(i, i + CHUNK);
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "delta", content: piece })}\n\n`));
              await new Promise((r) => setTimeout(r, 8));
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "complete", content: contentToStream, tool_executions: execs, lang })}\n\n`));
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          },
        });

        return new Response(stream, {
          headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
        });
      }

      break;
    }

    // Safety: if we exhausted tool rounds without final text
    if (!finalContent && toolExecutions.length > 0) {
      finalContent = `Executed ${toolExecutions.length} action(s) successfully. Tools used: ${toolExecutions.map((t) => t.tool).join(", ")}.`;
    }

    // Detect language for non-streaming too
    const lastUserMsgNS = [...messages].reverse().find((m: any) => m.role === "user")?.content || "";
    const detectedLangNS = detectLanguage(lastUserMsgNS);

    // Non-streaming fallback
    return new Response(JSON.stringify({
      content: finalContent,
      tool_executions: toolExecutions.length > 0 ? toolExecutions : undefined,
      lang: detectedLangNS,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("admin-ai-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
