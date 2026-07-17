import { useState, useRef, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useAuth } from "@/hooks/useAuth";
import { useDirectMessages, useMessageActions, useConversations } from "@/hooks/useMessages";
import { useContentModeration } from "@/hooks/useContentModeration";
import { CyberButton } from "@/components/ui/cyber-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send, Loader2, Image, X, Play } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format, isToday, isYesterday } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMMM dd, yyyy");
}

export default function ConversationView() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { messages, isLoading } = useDirectMessages(id || "");
  const { sendMessage } = useMessageActions();
  const { conversations } = useConversations();
  const { checkContent } = useContentModeration();
  const [input, setInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const conversation = conversations.find(c => c.id === id);
  const otherUser = conversation?.other_user;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      toast({ title: "Invalid file", description: "Only images and videos are supported", variant: "destructive" });
      return;
    }

    // Validate size (20MB max)
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 20MB", variant: "destructive" });
      return;
    }

    setSelectedFile(file);
    if (isImage) {
      setFilePreview(URL.createObjectURL(file));
    } else {
      setFilePreview(null);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadFile = async (file: File): Promise<{ url: string; type: string }> => {
    const ext = file.name.split(".").pop();
    const path = `${user!.id}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("message-attachments")
      .upload(path, file);

    if (error) throw error;

    const { data: urlData, error: signedError } = await supabase.storage
      .from("message-attachments")
      .createSignedUrl(path, 60 * 60 * 24 * 7); // 7 day signed URL

    if (signedError || !urlData?.signedUrl) throw signedError || new Error("Failed to create signed URL");

    return {
      url: urlData.signedUrl,
      type: file.type.startsWith("image/") ? "image" : "video",
    };
  };

  const handleSend = async () => {
    if (!input.trim() && !selectedFile) return;
    if (!id) return;

    const msg = input.trim();

    // Moderate text content before sending
    if (msg && msg !== "📷 Photo" && msg !== "🎥 Video") {
      const isSafe = await checkContent(msg);
      if (!isSafe) return;
    }

    setInput("");
    setUploading(!!selectedFile);

    try {
      let attachmentUrl: string | undefined;
      let attachmentType: string | undefined;

      if (selectedFile) {
        const uploaded = await uploadFile(selectedFile);
        attachmentUrl = uploaded.url;
        attachmentType = uploaded.type;
        clearFile();
      }

      await sendMessage.mutateAsync({
        conversationId: id,
        content: msg || (attachmentType === "image" ? "📷 Photo" : "🎥 Video"),
        attachmentUrl,
        attachmentType,
      });
    } catch {
      toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
      setInput(msg);
    }
    setUploading(false);
  };

  // Group messages by date
  const groupedMessages: { date: string; msgs: typeof messages }[] = [];
  messages.forEach(msg => {
    const date = formatDate(msg.created_at);
    const lastGroup = groupedMessages[groupedMessages.length - 1];
    if (lastGroup?.date === date) {
      lastGroup.msgs.push(msg);
    } else {
      groupedMessages.push({ date, msgs: [msg] });
    }
  });

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="shrink-0 backdrop-blur-xl bg-background/90 border-b border-neon-blue/20 px-4 py-3">
        <div className="container mx-auto max-w-2xl flex items-center gap-3">
          <Link to="/messages"><ArrowLeft className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" /></Link>
          <Avatar className="w-9 h-9 border border-border">
            <AvatarImage src={otherUser?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/20 text-primary font-orbitron text-xs">
              {(otherUser?.username || "?").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-orbitron font-semibold text-foreground text-sm flex items-center gap-1">
              {otherUser?.username || "User"}
              {otherUser?.is_verified && <VerifiedBadge />}
            </p>
            {otherUser?.uid && <p className="text-xs text-muted-foreground font-rajdhani">UID: {otherUser.uid}</p>}
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="container mx-auto max-w-2xl">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-neon-blue" /></div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground font-rajdhani">No messages yet. Say hello! 👋</p>
            </div>
          ) : (
            groupedMessages.map((group) => (
              <div key={group.date}>
                <div className="flex justify-center my-4">
                  <span className="text-xs text-muted-foreground font-rajdhani bg-secondary px-3 py-1 rounded-full">
                    {group.date}
                  </span>
                </div>
                {group.msgs.map((msg) => {
                  const isMine = msg.sender_id === user?.id;
                  return (
                    <div key={msg.id} className={`flex mb-2 ${isMine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] rounded-2xl overflow-hidden ${
                        isMine
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-secondary text-secondary-foreground rounded-bl-md"
                      }`}>
                        {/* Attachment */}
                        {msg.attachment_url && msg.attachment_type === "image" && (
                          <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer">
                            <img
                              src={msg.attachment_url}
                              alt="Shared image"
                              className="w-full max-w-xs rounded-t-2xl object-cover cursor-pointer hover:opacity-90 transition-opacity"
                              loading="lazy"
                            />
                          </a>
                        )}
                        {msg.attachment_url && msg.attachment_type === "video" && (
                          <video
                            src={msg.attachment_url}
                            controls
                            className="w-full max-w-xs rounded-t-2xl"
                            preload="metadata"
                          />
                        )}

                        {/* Text content (hide if it's just the emoji placeholder for media) */}
                        {msg.content && !(msg.attachment_url && (msg.content === "📷 Photo" || msg.content === "🎥 Video")) && (
                          <div className="px-4 py-2.5">
                            <p className="text-sm font-rajdhani break-words">{msg.content}</p>
                          </div>
                        )}

                        <div className={`px-4 pb-2 ${!msg.content || (msg.attachment_url && (msg.content === "📷 Photo" || msg.content === "🎥 Video")) ? "pt-2" : ""}`}>
                          <p className={`text-[10px] ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                            {format(new Date(msg.created_at), "HH:mm")}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* File Preview */}
      {selectedFile && (
        <div className="shrink-0 border-t border-border bg-background/90 px-4 py-2">
          <div className="container mx-auto max-w-2xl flex items-center gap-3">
            {filePreview ? (
              <img src={filePreview} alt="Preview" className="w-16 h-16 rounded-lg object-cover border border-border" />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-secondary flex items-center justify-center border border-border">
                <Play className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground font-rajdhani truncate">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground font-rajdhani">
                {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
              </p>
            </div>
            <button onClick={clearFile} className="p-1.5 rounded-full hover:bg-destructive/10 transition-colors">
              <X className="w-4 h-4 text-destructive" />
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="shrink-0 border-t border-border bg-background/90 backdrop-blur-xl px-4 py-3">
        <div className="container mx-auto max-w-2xl flex gap-2 items-end">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*,video/*"
            onChange={handleFileSelect}
          />
          <CyberButton
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0"
            disabled={uploading}
          >
            <Image className="w-5 h-5 text-muted-foreground" />
          </CyberButton>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Type a message..."
            className="flex-1 bg-input border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground font-rajdhani focus:outline-none focus:border-neon-cyan/50 transition-colors"
            maxLength={1000}
            disabled={uploading}
          />
          <CyberButton
            onClick={handleSend}
            disabled={(!input.trim() && !selectedFile) || sendMessage.isPending || uploading}
            size="icon"
            className="shrink-0"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </CyberButton>
        </div>
      </div>
    </div>
  );
}
