import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CMS_TOOLS = [
  {
    type: "function",
    function: {
      name: "get_all_content",
      description: "Get all editable website content organized by page.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_page_content",
      description: "Get content for a specific page (homepage, dashboard, login, signup, tournaments, clips, streams, wallet, help).",
      parameters: {
        type: "object",
        properties: {
          page_key: { type: "string", description: "Page identifier" },
        },
        required: ["page_key"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_content",
      description: "Update text/content for a specific page section. Content is JSON with keys like title, subtitle, cta_text, heading, items, etc.",
      parameters: {
        type: "object",
        properties: {
          page_key: { type: "string", description: "Page identifier e.g. 'homepage', 'login'" },
          section_key: { type: "string", description: "Section e.g. 'hero', 'features', 'header', 'page'" },
          content: { type: "object", description: "JSON content to set" },
        },
        required: ["page_key", "section_key", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_content_section",
      description: "Add a new content section to a page.",
      parameters: {
        type: "object",
        properties: {
          page_key: { type: "string" },
          section_key: { type: "string" },
          content: { type: "object" },
        },
        required: ["page_key", "section_key", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_content_section",
      description: "Delete a content section from a page.",
      parameters: {
        type: "object",
        properties: {
          page_key: { type: "string" },
          section_key: { type: "string" },
        },
        required: ["page_key", "section_key"],
      },
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
          type: { type: "string", enum: ["general", "tournament_result", "winner", "maintenance"] },
          is_published: { type: "boolean" },
        },
        required: ["title", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_announcement",
      description: "Update an existing announcement's title, content, type, or publish status.",
      parameters: {
        type: "object",
        properties: {
          announcement_id: { type: "string" },
          title: { type: "string" },
          content: { type: "string" },
          type: { type: "string" },
          is_published: { type: "boolean" },
        },
        required: ["announcement_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_announcements",
      description: "List all announcements with their details.",
      parameters: { type: "object", properties: { limit: { type: "number" } } },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_announcement",
      description: "Delete an announcement by ID.",
      parameters: {
        type: "object",
        properties: { announcement_id: { type: "string" } },
        required: ["announcement_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_site_setting",
      description: "Update a site setting (theme colors, payment settings, security settings, AI settings, etc).",
      parameters: {
        type: "object",
        properties: {
          key: { type: "string", description: "Setting key: 'theme', 'payment', 'security_settings', 'ai_settings', 'video_settings'" },
          value: { type: "object", description: "JSON value to set/merge" },
        },
        required: ["key", "value"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_site_settings",
      description: "Get all current site settings (theme, payment, security, etc).",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "update_theme",
      description: "Update theme settings like colors, fonts, dark mode. Keys: primaryColor, secondaryColor, backgroundColor, buttonColor, darkMode, headingFont, bodyFont.",
      parameters: {
        type: "object",
        properties: {
          primaryColor: { type: "string", description: "HSL values e.g. '210 100% 55%'" },
          secondaryColor: { type: "string" },
          backgroundColor: { type: "string" },
          buttonColor: { type: "string" },
          darkMode: { type: "boolean" },
          headingFont: { type: "string" },
          bodyFont: { type: "string" },
        },
      },
    },
  },
];

function getAdminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

async function executeTool(name: string, args: any, adminId: string): Promise<string> {
  const supabase = getAdminClient();

  switch (name) {
    case "get_all_content": {
      const { data, error } = await supabase.from("website_content").select("*").order("page_key");
      if (error) return `Error: ${error.message}`;
      const grouped: any = {};
      for (const row of data || []) {
        if (!grouped[row.page_key]) grouped[row.page_key] = {};
        grouped[row.page_key][row.section_key] = row.content;
      }
      return JSON.stringify(grouped, null, 2);
    }

    case "get_page_content": {
      const { data, error } = await supabase.from("website_content").select("*").eq("page_key", args.page_key);
      if (error) return `Error: ${error.message}`;
      const sections: any = {};
      for (const row of data || []) sections[row.section_key] = row.content;
      return JSON.stringify({ page: args.page_key, sections }, null, 2);
    }

    case "update_content": {
      const { data: existing } = await supabase.from("website_content")
        .select("id, content")
        .eq("page_key", args.page_key)
        .eq("section_key", args.section_key)
        .maybeSingle();

      if (existing) {
        const merged = { ...existing.content, ...args.content };
        const { error } = await supabase.from("website_content")
          .update({ content: merged, updated_at: new Date().toISOString(), updated_by: adminId })
          .eq("id", existing.id);
        if (error) return `Error: ${error.message}`;
        return `✅ Updated ${args.page_key}/${args.section_key}: ${JSON.stringify(merged)}`;
      } else {
        const { error } = await supabase.from("website_content")
          .insert({ page_key: args.page_key, section_key: args.section_key, content: args.content, updated_by: adminId });
        if (error) return `Error: ${error.message}`;
        return `✅ Created new section ${args.page_key}/${args.section_key}`;
      }
    }

    case "add_content_section": {
      const { error } = await supabase.from("website_content")
        .insert({ page_key: args.page_key, section_key: args.section_key, content: args.content, updated_by: adminId });
      if (error) return `Error: ${error.message}`;
      return `✅ Added section ${args.page_key}/${args.section_key}`;
    }

    case "delete_content_section": {
      const { error } = await supabase.from("website_content")
        .delete()
        .eq("page_key", args.page_key)
        .eq("section_key", args.section_key);
      if (error) return `Error: ${error.message}`;
      return `✅ Deleted section ${args.page_key}/${args.section_key}`;
    }

    case "create_announcement": {
      const { error } = await supabase.from("announcements").insert({
        title: args.title,
        content: args.content,
        type: args.type || "general",
        is_published: args.is_published !== false,
        created_by: adminId,
      });
      if (error) return `Error: ${error.message}`;
      return `✅ Announcement created: "${args.title}"`;
    }

    case "update_announcement": {
      const updates: any = {};
      if (args.title) updates.title = args.title;
      if (args.content) updates.content = args.content;
      if (args.type) updates.type = args.type;
      if (args.is_published !== undefined) updates.is_published = args.is_published;
      updates.updated_at = new Date().toISOString();

      const { error } = await supabase.from("announcements").update(updates).eq("id", args.announcement_id);
      if (error) return `Error: ${error.message}`;
      return `✅ Announcement updated`;
    }

    case "list_announcements": {
      const { data, error } = await supabase.from("announcements")
        .select("id, title, content, type, is_published, created_at")
        .order("created_at", { ascending: false })
        .limit(args.limit || 20);
      if (error) return `Error: ${error.message}`;
      return JSON.stringify(data, null, 2);
    }

    case "delete_announcement": {
      const { error } = await supabase.from("announcements").delete().eq("id", args.announcement_id);
      if (error) return `Error: ${error.message}`;
      return `✅ Announcement deleted`;
    }

    case "update_site_setting": {
      const { data: existing } = await supabase.from("site_settings")
        .select("id, value")
        .eq("key", args.key)
        .maybeSingle();

      if (existing) {
        const merged = { ...(existing.value as any), ...args.value };
        const { error } = await supabase.from("site_settings")
          .update({ value: merged, updated_at: new Date().toISOString(), updated_by: adminId })
          .eq("key", args.key);
        if (error) return `Error: ${error.message}`;
        return `✅ Updated setting "${args.key}": ${JSON.stringify(merged)}`;
      } else {
        const { error } = await supabase.from("site_settings")
          .insert({ key: args.key, value: args.value, updated_by: adminId });
        if (error) return `Error: ${error.message}`;
        return `✅ Created setting "${args.key}"`;
      }
    }

    case "get_site_settings": {
      const { data, error } = await supabase.from("site_settings").select("key, value, updated_at");
      if (error) return `Error: ${error.message}`;
      const settings: any = {};
      for (const row of data || []) settings[row.key] = row.value;
      return JSON.stringify(settings, null, 2);
    }

    case "update_theme": {
      const { data: existing } = await supabase.from("site_settings")
        .select("id, value")
        .eq("key", "theme")
        .maybeSingle();

      const currentTheme = (existing?.value as any) || {};
      const merged = { ...currentTheme };
      if (args.primaryColor) merged.primaryColor = args.primaryColor;
      if (args.secondaryColor) merged.secondaryColor = args.secondaryColor;
      if (args.backgroundColor) merged.backgroundColor = args.backgroundColor;
      if (args.buttonColor) merged.buttonColor = args.buttonColor;
      if (args.darkMode !== undefined) merged.darkMode = args.darkMode;
      if (args.headingFont) merged.headingFont = args.headingFont;
      if (args.bodyFont) merged.bodyFont = args.bodyFont;

      if (existing) {
        const { error } = await supabase.from("site_settings")
          .update({ value: merged, updated_at: new Date().toISOString(), updated_by: adminId })
          .eq("key", "theme");
        if (error) return `Error: ${error.message}`;
      } else {
        const { error } = await supabase.from("site_settings")
          .insert({ key: "theme", value: merged, updated_by: adminId });
        if (error) return `Error: ${error.message}`;
      }
      return `✅ Theme updated: ${JSON.stringify(merged)}`;
    }

    default:
      return `Unknown tool: ${name}`;
  }
}

const SYSTEM_PROMPT = `You are the **XT ESP Website Content Editor AI**. You help the admin edit ALL website content, announcements, banners, and settings by simple English commands.

## Your Capabilities:
1. **Website Text**: Edit any text on any page — titles, subtitles, descriptions, button labels, feature lists
2. **Announcements**: Create, edit, publish/unpublish, and delete platform announcements and banners
3. **Site Settings**: Change theme colors, fonts, dark/light mode, payment settings
4. **Page Sections**: Add new content sections or remove existing ones

## Available Pages:
- homepage (hero section, features section)
- dashboard (welcome section)
- login, signup (page text)
- tournaments, clips, streams, wallet, help (header text)

## How to respond:
- When the admin asks to change text, use update_content tool immediately
- When asked "show me all content", use get_all_content
- When asked to create an announcement, use create_announcement
- Always confirm what you changed after executing
- Be conversational and helpful
- If asked something you can't do, explain what you CAN do

## Examples:
- "Change homepage title to Gaming Arena" → update homepage/hero title
- "Create a maintenance announcement" → create_announcement
- "Change primary color to red" → update_theme
- "Show me all announcements" → list_announcements
- "Update login page subtitle to 'Enter your credentials'" → update login/page subtitle`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, stream = true } = await req.json();
    
    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");
    
    const token = authHeader.replace("Bearer ", "");
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) throw new Error("Not authenticated");

    const adminClient = getAdminClient();
    const { data: roleData } = await adminClient.from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "moderator"])
      .maybeSingle();
    
    if (!roleData) throw new Error("Unauthorized: admin access required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const apiMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ];

    // Call AI with tools
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: apiMessages,
        tools: CMS_TOOLS,
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      throw new Error("AI service error");
    }

    let result = await aiResponse.json();
    let choice = result.choices?.[0];
    let toolExecutions: any[] = [];

    // Process tool calls in a loop (max 5 iterations)
    let iterations = 0;
    const conversationMessages = [...apiMessages];

    while (choice?.finish_reason === "tool_calls" && choice?.message?.tool_calls && iterations < 5) {
      iterations++;
      const toolCalls = choice.message.tool_calls;
      
      conversationMessages.push(choice.message);

      for (const tc of toolCalls) {
        const args = typeof tc.function.arguments === "string" ? JSON.parse(tc.function.arguments) : tc.function.arguments;
        const toolResult = await executeTool(tc.function.name, args, user.id);
        
        toolExecutions.push({
          name: tc.function.name,
          args,
          result: toolResult,
        });

        conversationMessages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: toolResult,
        });
      }

      // Call AI again with tool results
      const nextResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: conversationMessages,
          tools: CMS_TOOLS,
          stream: false,
        }),
      });

      if (!nextResponse.ok) throw new Error("AI follow-up error");
      result = await nextResponse.json();
      choice = result.choices?.[0];
    }

    const finalContent = choice?.message?.content || "Done!";

    // Stream response via SSE
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      start(controller) {
        if (toolExecutions.length > 0) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "tool_executions", data: toolExecutions })}\n\n`));
        }
        
        // Send content in chunks for streaming feel
        const words = finalContent.split(" ");
        let chunk = "";
        for (let i = 0; i < words.length; i++) {
          chunk += (i > 0 ? " " : "") + words[i];
          if (chunk.length > 20 || i === words.length - 1) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "delta", content: chunk + (i < words.length - 1 ? " " : "") })}\n\n`));
            chunk = "";
          }
        }
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "complete", content: finalContent, tool_executions: toolExecutions })}\n\n`));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(readableStream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (e) {
    console.error("CMS AI error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
