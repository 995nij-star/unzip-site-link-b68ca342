export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      account_locks: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          locked_by: string | null
          locked_until: string | null
          reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          locked_by?: string | null
          locked_until?: string | null
          reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          locked_by?: string | null
          locked_until?: string | null
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      ai_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          scope: string
          session_id: string
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          scope?: string
          session_id?: string
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          scope?: string
          session_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      announcements: {
        Row: {
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          is_active: boolean
          message: string | null
          starts_at: string | null
          title: string
          tournament_id: string | null
          type: string
          updated_at: string
          winner_user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          message?: string | null
          starts_at?: string | null
          title: string
          tournament_id?: string | null
          type?: string
          updated_at?: string
          winner_user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          message?: string | null
          starts_at?: string | null
          title?: string
          tournament_id?: string | null
          type?: string
          updated_at?: string
          winner_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcements_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      apk_releases: {
        Row: {
          build_number: number | null
          changelog: string | null
          created_at: string
          created_by: string | null
          download_url: string
          file_size: number | null
          id: string
          is_active: boolean
          is_mandatory: boolean
          version: string
        }
        Insert: {
          build_number?: number | null
          changelog?: string | null
          created_at?: string
          created_by?: string | null
          download_url: string
          file_size?: number | null
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          version: string
        }
        Update: {
          build_number?: number | null
          changelog?: string | null
          created_at?: string
          created_by?: string | null
          download_url?: string
          file_size?: number | null
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          version?: string
        }
        Relationships: []
      }
      automation_rules: {
        Row: {
          actions: Json
          conditions: Json
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          trigger_type: string
          updated_at: string
        }
        Insert: {
          actions?: Json
          conditions?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          trigger_type: string
          updated_at?: string
        }
        Update: {
          actions?: Json
          conditions?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          trigger_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      ban_audit_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      bot_checks: {
        Row: {
          created_at: string
          id: string
          ip_address: string | null
          passed: boolean | null
          score: number | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: string | null
          passed?: boolean | null
          score?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string | null
          passed?: boolean | null
          score?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      captcha_challenges: {
        Row: {
          answer: string
          challenge: string
          created_at: string
          expires_at: string
          id: string
          solved: boolean
          token: string
          user_id: string | null
        }
        Insert: {
          answer: string
          challenge: string
          created_at?: string
          expires_at?: string
          id?: string
          solved?: boolean
          token: string
          user_id?: string | null
        }
        Update: {
          answer?: string
          challenge?: string
          created_at?: string
          expires_at?: string
          id?: string
          solved?: boolean
          token?: string
          user_id?: string | null
        }
        Relationships: []
      }
      clip_comments: {
        Row: {
          clip_id: string
          content: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          clip_id: string
          content: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          clip_id?: string
          content?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clip_comments_clip_id_fkey"
            columns: ["clip_id"]
            isOneToOne: false
            referencedRelation: "gaming_clips"
            referencedColumns: ["id"]
          },
        ]
      }
      clip_likes: {
        Row: {
          clip_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          clip_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          clip_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clip_likes_clip_id_fkey"
            columns: ["clip_id"]
            isOneToOne: false
            referencedRelation: "gaming_clips"
            referencedColumns: ["id"]
          },
        ]
      }
      clip_reports: {
        Row: {
          clip_id: string
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string
          status: string
        }
        Insert: {
          clip_id: string
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id: string
          status?: string
        }
        Update: {
          clip_id?: string
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "clip_reports_clip_id_fkey"
            columns: ["clip_id"]
            isOneToOne: false
            referencedRelation: "gaming_clips"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      detection_events: {
        Row: {
          created_at: string
          details: Json | null
          event_type: string
          id: string
          severity: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event_type: string
          id?: string
          severity?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          severity?: string
          user_id?: string | null
        }
        Relationships: []
      }
      developer_api_keys: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          scopes: string[]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          scopes?: string[]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          scopes?: string[]
          user_id?: string
        }
        Relationships: []
      }
      direct_messages: {
        Row: {
          attachment_type: string | null
          attachment_url: string | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean
          sender_id: string
        }
        Insert: {
          attachment_type?: string | null
          attachment_url?: string | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id: string
        }
        Update: {
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      gaming_clips: {
        Row: {
          created_at: string
          description: string | null
          duration: number
          id: string
          is_hidden: boolean
          short_code: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          user_id: string
          video_url: string
          views: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration?: number
          id?: string
          is_hidden?: boolean
          short_code?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          user_id: string
          video_url: string
          views?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          duration?: number
          id?: string
          is_hidden?: boolean
          short_code?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          video_url?: string
          views?: number
        }
        Relationships: []
      }
      gift_code_redemptions: {
        Row: {
          amount: number
          code_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          amount: number
          code_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          amount?: number
          code_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_code_redemptions_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "gift_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_codes: {
        Row: {
          amount: number
          code: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number
          uses: number
        }
        Insert: {
          amount: number
          code: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number
          uses?: number
        }
        Update: {
          amount?: number
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number
          uses?: number
        }
        Relationships: []
      }
      kyc_verifications: {
        Row: {
          ai_notes: string | null
          ai_score: number | null
          created_at: string
          document_back_url: string | null
          document_front_url: string | null
          document_number: string | null
          document_type: string | null
          full_name: string | null
          id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          selfie_url: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_notes?: string | null
          ai_score?: number | null
          created_at?: string
          document_back_url?: string | null
          document_front_url?: string | null
          document_number?: string | null
          document_type?: string | null
          full_name?: string | null
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_notes?: string | null
          ai_score?: number | null
          created_at?: string
          document_back_url?: string | null
          document_front_url?: string | null
          document_number?: string | null
          document_type?: string | null
          full_name?: string | null
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      live_streams: {
        Row: {
          created_at: string
          description: string | null
          ended_at: string | null
          game: string | null
          id: string
          is_live: boolean
          started_at: string | null
          stream_url: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          user_id: string
          viewer_count: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          ended_at?: string | null
          game?: string | null
          id?: string
          is_live?: boolean
          started_at?: string | null
          stream_url?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          user_id: string
          viewer_count?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          ended_at?: string | null
          game?: string | null
          id?: string
          is_live?: boolean
          started_at?: string | null
          stream_url?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          viewer_count?: number
        }
        Relationships: []
      }
      login_history: {
        Row: {
          browser: string | null
          city: string | null
          country: string | null
          device_name: string | null
          device_type: string | null
          id: string
          ip_address: string | null
          logged_in_at: string
          os: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          city?: string | null
          country?: string | null
          device_name?: string | null
          device_type?: string | null
          id?: string
          ip_address?: string | null
          logged_in_at?: string
          os?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          city?: string | null
          country?: string | null
          device_name?: string | null
          device_type?: string | null
          id?: string
          ip_address?: string | null
          logged_in_at?: string
          os?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mod_applications: {
        Row: {
          admin_notes: string | null
          availability: string | null
          created_at: string
          experience: string | null
          id: string
          reason: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          availability?: string | null
          created_at?: string
          experience?: string | null
          id?: string
          reason: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          availability?: string | null
          created_at?: string
          experience?: string | null
          id?: string
          reason?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      moderator_permissions: {
        Row: {
          created_at: string
          duties: string | null
          granted_by: string | null
          id: string
          permissions: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duties?: string | null
          granted_by?: string | null
          id?: string
          permissions?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duties?: string | null
          granted_by?: string | null
          id?: string
          permissions?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          title: string
          tournament_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          title: string
          tournament_id?: string | null
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          title?: string
          tournament_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_method_locks: {
        Row: {
          enabled: boolean
          label: string
          method_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          enabled?: boolean
          label: string
          method_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          enabled?: boolean
          label?: string
          method_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      profile_likes: {
        Row: {
          created_at: string
          id: string
          liker_id: string
          profile_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          liker_id: string
          profile_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          liker_id?: string
          profile_user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          ban_reason: string | null
          bio: string | null
          country: string | null
          created_at: string
          email: string | null
          free_fire_uid: string | null
          gender: string | null
          id: string
          is_banned: boolean | null
          is_premium: boolean
          is_verified: boolean
          premium_until: string | null
          uid: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          ban_reason?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          free_fire_uid?: string | null
          gender?: string | null
          id?: string
          is_banned?: boolean | null
          is_premium?: boolean
          is_verified?: boolean
          premium_until?: string | null
          uid?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          ban_reason?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          free_fire_uid?: string | null
          gender?: string | null
          id?: string
          is_banned?: boolean | null
          is_premium?: boolean
          is_verified?: boolean
          premium_until?: string | null
          uid?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string | null
          created_at: string
          endpoint: string
          id: string
          p256dh: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth?: string | null
          created_at?: string
          endpoint: string
          id?: string
          p256dh?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string | null
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      redeem_attempts: {
        Row: {
          code: string
          created_at: string
          error: string | null
          id: string
          success: boolean
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          error?: string | null
          id?: string
          success?: boolean
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          error?: string | null
          id?: string
          success?: boolean
          user_id?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: string
          is_public: boolean
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          id?: string
          is_public?: boolean
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          id?: string
          is_public?: boolean
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      stream_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          stream_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          stream_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          stream_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stream_messages_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      stream_reactions: {
        Row: {
          created_at: string
          id: string
          reaction: string
          stream_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reaction: string
          stream_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reaction?: string
          stream_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stream_reactions_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          admin_notes: string | null
          assigned_to: string | null
          created_at: string
          id: string
          issue_type: string
          message: string
          screenshot_urls: string[] | null
          status: string
          subject: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          assigned_to?: string | null
          created_at?: string
          id?: string
          issue_type: string
          message: string
          screenshot_urls?: string[] | null
          status?: string
          subject?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          assigned_to?: string | null
          created_at?: string
          id?: string
          issue_type?: string
          message?: string
          screenshot_urls?: string[] | null
          status?: string
          subject?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suspicious_activities: {
        Row: {
          activity_type: string
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          reviewed: boolean
          severity: string
          user_id: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          reviewed?: boolean
          severity?: string
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          reviewed?: boolean
          severity?: string
          user_id?: string | null
        }
        Relationships: []
      }
      topup_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          id: string
          method: string
          processed_at: string | null
          processed_by: string | null
          screenshot_url: string | null
          status: string
          updated_at: string
          user_id: string
          utr: string | null
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          id?: string
          method: string
          processed_at?: string | null
          processed_by?: string | null
          screenshot_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
          utr?: string | null
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          id?: string
          method?: string
          processed_at?: string | null
          processed_by?: string | null
          screenshot_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          utr?: string | null
        }
        Relationships: []
      }
      tournament_participants: {
        Row: {
          game_uid: string | null
          id: string
          joined_at: string
          phone_number: string | null
          player_name: string | null
          tournament_id: string
          user_id: string
        }
        Insert: {
          game_uid?: string | null
          id?: string
          joined_at?: string
          phone_number?: string | null
          player_name?: string | null
          tournament_id: string
          user_id: string
        }
        Update: {
          game_uid?: string | null
          id?: string
          joined_at?: string
          phone_number?: string | null
          player_name?: string | null
          tournament_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_participants_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_participants_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          banner_url: string | null
          created_at: string
          created_by: string | null
          current_players: number
          description: string | null
          entry_fee: number
          game: string
          id: string
          max_players: number
          prize_pool: number
          room_id: string | null
          room_password: string | null
          rules: string | null
          start_time: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          banner_url?: string | null
          created_at?: string
          created_by?: string | null
          current_players?: number
          description?: string | null
          entry_fee?: number
          game?: string
          id?: string
          max_players?: number
          prize_pool?: number
          room_id?: string | null
          room_password?: string | null
          rules?: string | null
          start_time?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          banner_url?: string | null
          created_at?: string
          created_by?: string | null
          current_players?: number
          description?: string | null
          entry_fee?: number
          game?: string
          id?: string
          max_players?: number
          prize_pool?: number
          room_id?: string | null
          room_password?: string | null
          rules?: string | null
          start_time?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      user_locations: {
        Row: {
          accuracy: number | null
          city: string | null
          country: string | null
          created_at: string
          id: string
          ip_address: string | null
          latitude: number | null
          longitude: number | null
          region: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          latitude?: number | null
          longitude?: number | null
          region?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accuracy?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          latitude?: number | null
          longitude?: number | null
          region?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          reference_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          account_details: Json | null
          admin_notes: string | null
          amount: number
          created_at: string
          id: string
          method: string
          processed_at: string | null
          processed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_details?: Json | null
          admin_notes?: string | null
          amount: number
          created_at?: string
          id?: string
          method: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_details?: Json | null
          admin_notes?: string | null
          amount?: number
          created_at?: string
          id?: string
          method?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      captcha_challenges_public: {
        Row: {
          challenge: string | null
          created_at: string | null
          expires_at: string | null
          id: string | null
          solved: boolean | null
          token: string | null
        }
        Insert: {
          challenge?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string | null
          solved?: boolean | null
          token?: string | null
        }
        Update: {
          challenge?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string | null
          solved?: boolean | null
          token?: string | null
        }
        Relationships: []
      }
      player_leaderboard: {
        Row: {
          avatar_url: string | null
          total_winnings: number | null
          tournaments_joined: number | null
          uid: string | null
          user_id: string | null
          username: string | null
        }
        Relationships: []
      }
      profiles_public: {
        Row: {
          avatar_url: string | null
          bio: string | null
          country: string | null
          created_at: string | null
          gender: string | null
          id: string | null
          is_premium: boolean | null
          is_verified: boolean | null
          uid: string | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string | null
          gender?: string | null
          id?: string | null
          is_premium?: boolean | null
          is_verified?: boolean | null
          uid?: string | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string | null
          gender?: string | null
          id?: string | null
          is_premium?: boolean | null
          is_verified?: boolean | null
          uid?: string | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
      site_settings_public: {
        Row: {
          id: string | null
          key: string | null
          updated_at: string | null
          value: Json | null
        }
        Insert: {
          id?: string | null
          key?: string | null
          updated_at?: string | null
          value?: Json | null
        }
        Update: {
          id?: string | null
          key?: string | null
          updated_at?: string | null
          value?: Json | null
        }
        Relationships: []
      }
      tournaments_safe: {
        Row: {
          banner_url: string | null
          created_at: string | null
          current_players: number | null
          description: string | null
          entry_fee: number | null
          game: string | null
          id: string | null
          max_players: number | null
          prize_pool: number | null
          room_id: string | null
          room_password: string | null
          rules: string | null
          start_time: string | null
          status: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          banner_url?: string | null
          created_at?: string | null
          current_players?: number | null
          description?: string | null
          entry_fee?: number | null
          game?: string | null
          id?: string | null
          max_players?: number | null
          prize_pool?: number | null
          room_id?: string | null
          room_password?: never
          rules?: string | null
          start_time?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          banner_url?: string | null
          created_at?: string | null
          current_players?: number | null
          description?: string | null
          entry_fee?: number | null
          game?: string | null
          id?: string | null
          max_players?: number | null
          prize_pool?: number | null
          room_id?: string | null
          room_password?: never
          rules?: string | null
          start_time?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_conversation_participant: {
        Args: { _conv: string; _user: string }
        Returns: boolean
      }
      join_tournament: {
        Args: {
          p_game_uid?: string
          p_phone_number?: string
          p_player_name?: string
          p_tournament_id: string
        }
        Returns: Json
      }
      set_payment_method_enabled: {
        Args: { _enabled: boolean; _method_id: string }
        Returns: {
          enabled: boolean
          label: string
          method_id: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "payment_method_locks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "super_admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user", "super_admin"],
    },
  },
} as const
