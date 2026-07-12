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
          auto_locked: boolean
          created_at: string
          email: string
          failed_attempts: number
          id: string
          is_locked: boolean
          lock_reason: string | null
          locked_at: string
          locked_by: string | null
          unlocked_at: string | null
          unlocked_by: string | null
          updated_at: string
        }
        Insert: {
          auto_locked?: boolean
          created_at?: string
          email: string
          failed_attempts?: number
          id?: string
          is_locked?: boolean
          lock_reason?: string | null
          locked_at?: string
          locked_by?: string | null
          unlocked_at?: string | null
          unlocked_by?: string | null
          updated_at?: string
        }
        Update: {
          auto_locked?: boolean
          created_at?: string
          email?: string
          failed_attempts?: number
          id?: string
          is_locked?: boolean
          lock_reason?: string | null
          locked_at?: string
          locked_by?: string | null
          unlocked_at?: string | null
          unlocked_by?: string | null
          updated_at?: string
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
          target_type: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      ai_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          is_published: boolean
          prize_amount: number | null
          title: string
          tournament_id: string | null
          type: string
          updated_at: string
          winner_user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          id?: string
          is_published?: boolean
          prize_amount?: number | null
          title: string
          tournament_id?: string | null
          type?: string
          updated_at?: string
          winner_user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          is_published?: boolean
          prize_amount?: number | null
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
        ]
      }
      apk_releases: {
        Row: {
          created_at: string
          download_count: number
          file_size: string
          file_url: string | null
          id: string
          min_android: string
          release_notes: string | null
          updated_at: string
          uploaded_by: string | null
          version: string
        }
        Insert: {
          created_at?: string
          download_count?: number
          file_size?: string
          file_url?: string | null
          id?: string
          min_android?: string
          release_notes?: string | null
          updated_at?: string
          uploaded_by?: string | null
          version?: string
        }
        Update: {
          created_at?: string
          download_count?: number
          file_size?: string
          file_url?: string | null
          id?: string
          min_android?: string
          release_notes?: string | null
          updated_at?: string
          uploaded_by?: string | null
          version?: string
        }
        Relationships: []
      }
      automation_rules: {
        Row: {
          action_duration_hours: number | null
          action_type: string
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          name: string
          trigger_threshold: number
          trigger_type: string
          updated_at: string
        }
        Insert: {
          action_duration_hours?: number | null
          action_type: string
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          name: string
          trigger_threshold?: number
          trigger_type: string
          updated_at?: string
        }
        Update: {
          action_duration_hours?: number | null
          action_type?: string
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          name?: string
          trigger_threshold?: number
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
          admin_id: string
          ai_reasoning: string | null
          ai_verdict: string | null
          captcha_challenge_id: string | null
          confidence: number
          created_at: string
          id: string
          notes: string | null
          signal_score: number
          signals: Json
          target_user_id: string
          verdict: string
        }
        Insert: {
          admin_id: string
          ai_reasoning?: string | null
          ai_verdict?: string | null
          captcha_challenge_id?: string | null
          confidence?: number
          created_at?: string
          id?: string
          notes?: string | null
          signal_score?: number
          signals?: Json
          target_user_id: string
          verdict: string
        }
        Update: {
          admin_id?: string
          ai_reasoning?: string | null
          ai_verdict?: string | null
          captcha_challenge_id?: string | null
          confidence?: number
          created_at?: string
          id?: string
          notes?: string | null
          signal_score?: number
          signals?: Json
          target_user_id?: string
          verdict?: string
        }
        Relationships: []
      }
      captcha_challenges: {
        Row: {
          admin_id: string
          answered_at: string | null
          attempts: number
          created_at: string
          expected_answer: string
          expires_at: string
          id: string
          question: string
          status: string
          target_user_id: string
          user_answer: string | null
        }
        Insert: {
          admin_id: string
          answered_at?: string | null
          attempts?: number
          created_at?: string
          expected_answer: string
          expires_at?: string
          id?: string
          question: string
          status?: string
          target_user_id: string
          user_answer?: string | null
        }
        Update: {
          admin_id?: string
          answered_at?: string | null
          attempts?: number
          created_at?: string
          expected_answer?: string
          expires_at?: string
          id?: string
          question?: string
          status?: string
          target_user_id?: string
          user_answer?: string | null
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
          admin_notes: string | null
          clip_id: string
          created_at: string
          id: string
          reason: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          admin_notes?: string | null
          clip_id: string
          created_at?: string
          id?: string
          reason: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          admin_notes?: string | null
          clip_id?: string
          created_at?: string
          id?: string
          reason?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
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
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string
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
          affected_resource_id: string | null
          affected_resource_type: string | null
          affected_user_id: string | null
          auto_action_taken: string | null
          category: string
          created_at: string
          description: string
          details: Json | null
          id: string
          resolved_at: string | null
          resolved_by: string | null
          resolver_notes: string | null
          rule_id: string | null
          severity: string
          source: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          affected_resource_id?: string | null
          affected_resource_type?: string | null
          affected_user_id?: string | null
          auto_action_taken?: string | null
          category: string
          created_at?: string
          description: string
          details?: Json | null
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          resolver_notes?: string | null
          rule_id?: string | null
          severity?: string
          source?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          affected_resource_id?: string | null
          affected_resource_type?: string | null
          affected_user_id?: string | null
          auto_action_taken?: string | null
          category?: string
          created_at?: string
          description?: string
          details?: Json | null
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          resolver_notes?: string | null
          rule_id?: string | null
          severity?: string
          source?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "detection_events_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      developer_api_keys: {
        Row: {
          api_key: string
          api_secret_hash: string
          application_name: string
          company: string | null
          created_at: string
          developer_name: string
          email: string
          expected_monthly_requests: number | null
          id: string
          permissions: string[]
          purpose: string
          status: string
          terms_accepted: boolean
          updated_at: string
          user_id: string
          website_url: string | null
        }
        Insert: {
          api_key: string
          api_secret_hash: string
          application_name: string
          company?: string | null
          created_at?: string
          developer_name: string
          email: string
          expected_monthly_requests?: number | null
          id?: string
          permissions?: string[]
          purpose: string
          status?: string
          terms_accepted?: boolean
          updated_at?: string
          user_id: string
          website_url?: string | null
        }
        Update: {
          api_key?: string
          api_secret_hash?: string
          application_name?: string
          company?: string | null
          created_at?: string
          developer_name?: string
          email?: string
          expected_monthly_requests?: number | null
          id?: string
          permissions?: string[]
          purpose?: string
          status?: string
          terms_accepted?: boolean
          updated_at?: string
          user_id?: string
          website_url?: string | null
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
      fraud_alerts: {
        Row: {
          admin_notes: string | null
          affected_user_ids: string[] | null
          alert_type: string
          created_at: string
          description: string
          device_id: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          resolved_at: string | null
          resolved_by: string | null
          risk_level: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          affected_user_ids?: string[] | null
          alert_type: string
          created_at?: string
          description: string
          device_id?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          risk_level?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          affected_user_ids?: string[] | null
          alert_type?: string
          created_at?: string
          description?: string
          device_id?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          risk_level?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      gaming_clips: {
        Row: {
          created_at: string
          description: string | null
          duration: number
          id: string
          short_code: string | null
          thumbnail_url: string | null
          title: string
          user_id: string
          video_url: string
          views: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration?: number
          id?: string
          short_code?: string | null
          thumbnail_url?: string | null
          title: string
          user_id: string
          video_url: string
          views?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          duration?: number
          id?: string
          short_code?: string | null
          thumbnail_url?: string | null
          title?: string
          user_id?: string
          video_url?: string
          views?: number
        }
        Relationships: []
      }
      gift_code_redemptions: {
        Row: {
          gift_code_id: string
          id: string
          redeemed_at: string
          user_id: string
        }
        Insert: {
          gift_code_id: string
          id?: string
          redeemed_at?: string
          user_id: string
        }
        Update: {
          gift_code_id?: string
          id?: string
          redeemed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_code_redemptions_gift_code_id_fkey"
            columns: ["gift_code_id"]
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
          created_by: string
          expiry: string
          id: string
          is_active: boolean
          max_uses: number
          used_count: number
        }
        Insert: {
          amount: number
          code: string
          created_at?: string
          created_by: string
          expiry: string
          id?: string
          is_active?: boolean
          max_uses?: number
          used_count?: number
        }
        Update: {
          amount?: number
          code?: string
          created_at?: string
          created_by?: string
          expiry?: string
          id?: string
          is_active?: boolean
          max_uses?: number
          used_count?: number
        }
        Relationships: []
      }
      kyc_verifications: {
        Row: {
          ai_notes: string | null
          document_number: string | null
          document_type: string
          document_url: string
          full_name: string | null
          id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          selfie_url: string
          status: string
          submitted_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_notes?: string | null
          document_number?: string | null
          document_type: string
          document_url: string
          full_name?: string | null
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url: string
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_notes?: string | null
          document_number?: string | null
          document_type?: string
          document_url?: string
          full_name?: string | null
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string
          status?: string
          submitted_at?: string
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
          id: string
          is_live: boolean
          platform: string
          stream_url: string
          thumbnail_url: string | null
          title: string
          user_id: string
          viewer_count: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          ended_at?: string | null
          id?: string
          is_live?: boolean
          platform?: string
          stream_url: string
          thumbnail_url?: string | null
          title: string
          user_id: string
          viewer_count?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          ended_at?: string | null
          id?: string
          is_live?: boolean
          platform?: string
          stream_url?: string
          thumbnail_url?: string | null
          title?: string
          user_id?: string
          viewer_count?: number
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          created_at: string
          email: string
          id: string
          ip_address: string | null
          success: boolean
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          ip_address?: string | null
          success?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          ip_address?: string | null
          success?: boolean
        }
        Relationships: []
      }
      login_history: {
        Row: {
          browser: string | null
          city: string | null
          country: string | null
          device_id: string | null
          device_name: string | null
          device_type: string | null
          id: string
          ip_address: string | null
          is_trusted: boolean
          logged_in_at: string
          os: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          city?: string | null
          country?: string | null
          device_id?: string | null
          device_name?: string | null
          device_type?: string | null
          id?: string
          ip_address?: string | null
          is_trusted?: boolean
          logged_in_at?: string
          os?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          city?: string | null
          country?: string | null
          device_id?: string | null
          device_name?: string | null
          device_type?: string | null
          id?: string
          ip_address?: string | null
          is_trusted?: boolean
          logged_in_at?: string
          os?: string | null
          user_id?: string
        }
        Relationships: []
      }
      login_otps: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          failed_attempts: number
          id: string
          otp_code: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          failed_attempts?: number
          id?: string
          otp_code: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          failed_attempts?: number
          id?: string
          otp_code?: string
          verified?: boolean
        }
        Relationships: []
      }
      mod_applications: {
        Row: {
          admin_notes: string | null
          created_at: string
          email: string
          experience: string
          gaming_knowledge: string
          id: string
          reason: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          email: string
          experience: string
          gaming_knowledge?: string
          id?: string
          reason: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          email?: string
          experience?: string
          gaming_knowledge?: string
          id?: string
          reason?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      moderator_permissions: {
        Row: {
          assigned_by: string | null
          created_at: string
          id: string
          moderator_id: string
          notes: string | null
          permission: string
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          moderator_id: string
          notes?: string | null
          permission: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          moderator_id?: string
          notes?: string | null
          permission?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
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
          title: string
          tournament_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          tournament_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
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
          profile_user_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile_user_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_user_id?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          avatar_url: string | null
          city: string | null
          country: string | null
          created_at: string
          email: string | null
          free_fire_uid: string | null
          full_name: string | null
          gender: string | null
          id: string
          is_banned: boolean | null
          is_premium: boolean
          is_shadow_banned: boolean
          is_verified: boolean
          last_seen: string | null
          phone: string | null
          trust_score: number
          uid: string | null
          updated_at: string
          user_id: string
          username: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          free_fire_uid?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          is_banned?: boolean | null
          is_premium?: boolean
          is_shadow_banned?: boolean
          is_verified?: boolean
          last_seen?: string | null
          phone?: string | null
          trust_score?: number
          uid?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          free_fire_uid?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          is_banned?: boolean | null
          is_premium?: boolean
          is_shadow_banned?: boolean
          is_verified?: boolean
          last_seen?: string | null
          phone?: string | null
          trust_score?: number
          uid?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      redeem_attempts: {
        Row: {
          attempted_code: string
          created_at: string
          id: string
          success: boolean
          user_id: string
        }
        Insert: {
          attempted_code: string
          created_at?: string
          id?: string
          success?: boolean
          user_id: string
        }
        Update: {
          attempted_code?: string
          created_at?: string
          id?: string
          success?: boolean
          user_id?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      stream_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          stream_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          stream_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
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
          emoji: string
          id: string
          stream_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji?: string
          id?: string
          stream_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
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
          created_at: string
          email: string
          id: string
          issue_type: string
          message: string
          resolved_at: string | null
          resolved_by: string | null
          screenshot_urls: string[] | null
          status: string
          subject: string | null
          uid: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          email: string
          id?: string
          issue_type: string
          message: string
          resolved_at?: string | null
          resolved_by?: string | null
          screenshot_urls?: string[] | null
          status?: string
          subject?: string | null
          uid?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          email?: string
          id?: string
          issue_type?: string
          message?: string
          resolved_at?: string | null
          resolved_by?: string | null
          screenshot_urls?: string[] | null
          status?: string
          subject?: string | null
          uid?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      suspicious_activities: {
        Row: {
          activity_type: string
          created_at: string
          description: string | null
          device_info: string | null
          id: string
          ip_address: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          severity: string
          status: string
          user_id: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string
          description?: string | null
          device_info?: string | null
          id?: string
          ip_address?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          status?: string
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string | null
          device_info?: string | null
          id?: string
          ip_address?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      topup_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          approved_by: string | null
          created_at: string
          id: string
          screenshot_url: string | null
          status: string
          updated_at: string
          user_id: string
          utr: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          approved_by?: string | null
          created_at?: string
          id?: string
          screenshot_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
          utr: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          approved_by?: string | null
          created_at?: string
          id?: string
          screenshot_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          utr?: string
        }
        Relationships: []
      }
      tournament_participants: {
        Row: {
          game_uid: string | null
          id: string
          is_winner: boolean | null
          joined_at: string
          phone_number: string | null
          player_name: string | null
          tournament_id: string
          user_id: string
        }
        Insert: {
          game_uid?: string | null
          id?: string
          is_winner?: boolean | null
          joined_at?: string
          phone_number?: string | null
          player_name?: string | null
          tournament_id: string
          user_id: string
        }
        Update: {
          game_uid?: string | null
          id?: string
          is_winner?: boolean | null
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
        ]
      }
      tournaments: {
        Row: {
          created_at: string
          current_players: number
          description: string | null
          entry_fee: number
          game: string
          id: string
          image_url: string | null
          max_players: number
          prize_pool: number
          room_id: string | null
          room_password: string | null
          start_time: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_players?: number
          description?: string | null
          entry_fee?: number
          game: string
          id?: string
          image_url?: string | null
          max_players?: number
          prize_pool?: number
          room_id?: string | null
          room_password?: string | null
          start_time: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_players?: number
          description?: string | null
          entry_fee?: number
          game?: string
          id?: string
          image_url?: string | null
          max_players?: number
          prize_pool?: number
          room_id?: string | null
          room_password?: string | null
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
          last_updated_at: string
          latitude: number | null
          longitude: number | null
          permission_asked_at: string | null
          permission_status: string
          region: string | null
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          last_updated_at?: string
          latitude?: number | null
          longitude?: number | null
          permission_asked_at?: string | null
          permission_status?: string
          region?: string | null
          user_id: string
        }
        Update: {
          accuracy?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          last_updated_at?: string
          latitude?: number | null
          longitude?: number | null
          permission_asked_at?: string | null
          permission_status?: string
          region?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_reports: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          reason: string
          reported_user_id: string
          reporter_id: string
          status: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          reason: string
          reported_user_id: string
          reporter_id: string
          status?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          reason?: string
          reported_user_id?: string
          reporter_id?: string
          status?: string
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
          role?: Database["public"]["Enums"]["app_role"]
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
      website_content: {
        Row: {
          content: Json
          id: string
          page_key: string
          section_key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content?: Json
          id?: string
          page_key: string
          section_key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: Json
          id?: string
          page_key?: string
          section_key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          account_holder_name: string | null
          admin_notes: string | null
          amount: number
          created_at: string
          id: string
          processed_at: string | null
          processed_by: string | null
          status: string
          updated_at: string
          upi_id: string
          user_id: string
        }
        Insert: {
          account_holder_name?: string | null
          admin_notes?: string | null
          amount: number
          created_at?: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
          upi_id: string
          user_id: string
        }
        Update: {
          account_holder_name?: string | null
          admin_notes?: string | null
          amount?: number
          created_at?: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
          upi_id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      player_leaderboard: {
        Row: {
          avatar_url: string | null
          likes_count: number | null
          total_earnings: number | null
          tournaments_played: number | null
          uid: string | null
          user_id: string | null
          username: string | null
          wins: number | null
        }
        Relationships: []
      }
      profiles_public: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          free_fire_uid: string | null
          id: string | null
          is_verified: boolean | null
          last_seen: string | null
          uid: string | null
          updated_at: string | null
          user_id: string | null
          username: string | null
          verified_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          free_fire_uid?: string | null
          id?: string | null
          is_verified?: boolean | null
          last_seen?: string | null
          uid?: string | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
          verified_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          free_fire_uid?: string | null
          id?: string | null
          is_verified?: boolean | null
          last_seen?: string | null
          uid?: string | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
          verified_at?: string | null
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
    }
    Functions: {
      create_user_gift_code: {
        Args: { p_amount: number; p_max_uses?: number }
        Returns: Json
      }
      generate_unique_uid: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_admin_or_moderator: { Args: { _user_id: string }; Returns: boolean }
      is_conversation_participant: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      is_premium: { Args: { _user_id: string }; Returns: boolean }
      join_tournament: { Args: { p_tournament_id: string }; Returns: Json }
      redeem_gift_code: { Args: { p_code: string }; Returns: Json }
      start_conversation: { Args: { p_other_user_id: string }; Returns: string }
      submit_captcha_answer: {
        Args: { p_answer: string; p_challenge_id: string }
        Returns: Json
      }
      wallet_hold_transfer: {
        Args: { _amount: number; _ref: string }
        Returns: undefined
      }
      wallet_refund_transfer: {
        Args: { _amount: number; _ref: string }
        Returns: undefined
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
