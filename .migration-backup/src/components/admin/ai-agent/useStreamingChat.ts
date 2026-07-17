import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Message, ToolExecution } from "./types";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-ai-chat`;
const STORAGE_KEY = "admin-ai-chat-history";

export function useStreamingChat() {
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<"auto" | "confirm">("auto");

  // Persist messages to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {}
  }, [messages]);

  const clearMessages = useCallback(() => setMessages([]), []);

  const sendMessage = useCallback(async (text?: string, inputRef?: React.MutableRefObject<string>) => {
    const messageText = text || inputRef?.current?.trim() || "";
    if (!messageText || isLoading) return;

    const userMsg: Message = { role: "user", content: messageText };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const apiMessages = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ messages: apiMessages, mode, stream: true }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `Error ${resp.status}`);
      }

      // Check if response is streaming (SSE) or JSON
      const contentType = resp.headers.get("content-type") || "";
      
      if (contentType.includes("text/event-stream") && resp.body) {
        // Streaming response
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let textBuffer = "";
        let toolExecutions: ToolExecution[] = [];
        let assistantContent = "";
        let detectedLang = "";

        // Add placeholder assistant message
        setMessages((prev) => [...prev, { role: "assistant", content: "", toolExecutions: [], lang: "" }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          textBuffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);

            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") break;

            try {
              const parsed = JSON.parse(jsonStr);

              if (parsed.type === "language") {
                detectedLang = parsed.lang || "";
                setMessages((prev) => {
                  const copy = [...prev];
                  const last = copy[copy.length - 1];
                  if (last?.role === "assistant") {
                    copy[copy.length - 1] = { ...last, lang: detectedLang };
                  }
                  return copy;
                });
              } else if (parsed.type === "tool_executions") {
                toolExecutions = parsed.data;
                setMessages((prev) => {
                  const copy = [...prev];
                  const last = copy[copy.length - 1];
                  if (last?.role === "assistant") {
                    copy[copy.length - 1] = { ...last, toolExecutions, lang: detectedLang };
                  }
                  return copy;
                });
              } else if (parsed.type === "delta") {
                assistantContent += parsed.content;
                const currentContent = assistantContent;
                const currentTools = toolExecutions;
                const currentLang = detectedLang;
                setMessages((prev) => {
                  const copy = [...prev];
                  const last = copy[copy.length - 1];
                  if (last?.role === "assistant") {
                    copy[copy.length - 1] = { ...last, content: currentContent, toolExecutions: currentTools, lang: currentLang };
                  }
                  return copy;
                });
              } else if (parsed.type === "complete") {
                assistantContent = parsed.content;
                toolExecutions = parsed.tool_executions || toolExecutions;
                detectedLang = parsed.lang || detectedLang;
                setMessages((prev) => {
                  const copy = [...prev];
                  const last = copy[copy.length - 1];
                  if (last?.role === "assistant") {
                    copy[copy.length - 1] = { ...last, content: assistantContent, toolExecutions, lang: detectedLang };
                  }
                  return copy;
                });
              }
            } catch {
              textBuffer = line + "\n" + textBuffer;
              break;
            }
          }
        }
      } else {
        // Fallback: JSON response (non-streaming)
        const data = await resp.json();
        const assistantMsg: Message = {
          role: "assistant",
          content: data.content || "Action completed.",
          toolExecutions: data.tool_executions,
          lang: data.lang || "",
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch (e: any) {
      console.error("AI chat error:", e);
      toast.error(e.message || "Failed to get AI response");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, mode]);

  return { messages, isLoading, mode, setMode, sendMessage, clearMessages };
}
