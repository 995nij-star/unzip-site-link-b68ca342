import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { CyberButton } from "@/components/ui/cyber-button";
import { CyberInput } from "@/components/ui/cyber-input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Gamepad2, 
  ArrowLeft, 
  HelpCircle, 
  Mail, 
  MessageSquare,
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  ImagePlus,
  X,
  Loader2,
  Ticket,
  Send,
  BookOpen,
  MessageCircle,
  Clock,
  Headphones
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { UserTicketsList } from "@/components/help/UserTicketsList";
import { FAQSection } from "@/components/help/FAQSection";

const issueTypes = [
  { value: "banned", label: "Account Banned/Blocked", icon: ShieldAlert },
  { value: "payment", label: "Payment Issue", icon: AlertTriangle },
  { value: "tournament", label: "Tournament Problem", icon: Gamepad2 },
  { value: "technical", label: "Technical Issue", icon: AlertTriangle },
  { value: "other", label: "Other", icon: HelpCircle },
];

const MAX_FILES = 3;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function HelpCenter() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    uid: "",
    email: "",
    issueType: "",
    subject: "",
    message: "",
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (screenshots.length + files.length > MAX_FILES) {
      toast({
        title: "Too many files",
        description: `You can upload up to ${MAX_FILES} screenshots.`,
        variant: "destructive",
      });
      return;
    }

    const validFiles: File[] = [];
    const newPreviewUrls: string[] = [];

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please upload only image files.",
          variant: "destructive",
        });
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "File too large",
          description: "Each file must be under 5MB.",
          variant: "destructive",
        });
        continue;
      }

      validFiles.push(file);
      newPreviewUrls.push(URL.createObjectURL(file));
    }

    setScreenshots(prev => [...prev, ...validFiles]);
    setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeScreenshot = (index: number) => {
    URL.revokeObjectURL(previewUrls[index]);
    setScreenshots(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const uploadScreenshots = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];

    for (const file of screenshots) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `tickets/${fileName}`;

      const { error } = await supabase.storage
        .from('support-attachments')
        .upload(filePath, file);

      if (error) {
        console.error('Upload error:', error);
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('support-attachments')
        .getPublicUrl(filePath);

      uploadedUrls.push(publicUrl);
    }

    return uploadedUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.issueType || !formData.message) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const screenshotUrls = await uploadScreenshots();

      const { error } = await supabase
        .from("support_tickets")
        .insert({
          user_id: user?.id || null,
          uid: formData.uid || null,
          email: formData.email.trim(),
          issue_type: formData.issueType,
          subject: formData.subject || null,
          message: formData.message.trim(),
          screenshot_urls: screenshotUrls,
        });

      if (error) throw error;

      previewUrls.forEach(url => URL.revokeObjectURL(url));
      
      setSubmitted(true);
      toast({
        title: "Request Submitted",
        description: "We'll get back to you as soon as possible.",
      });
    } catch (error) {
      toast({
        title: "Failed to submit",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background cyber-grid flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="relative mb-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-neon-green/20 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-neon-green" />
            </div>
            <div className="absolute inset-0 bg-neon-green/20 blur-3xl rounded-full" />
          </div>
          
          <h1 className="text-2xl font-orbitron font-bold text-foreground mb-4">
            Request Submitted
          </h1>
          <p className="text-muted-foreground font-rajdhani mb-8">
            Thank you for contacting us. Our support team will review your request and get back to you within 24-48 hours.
          </p>
          
          <div className="flex flex-col gap-3">
            <CyberButton onClick={() => {
              setSubmitted(false);
              setFormData({ uid: "", email: "", issueType: "", subject: "", message: "" });
              setScreenshots([]);
              setPreviewUrls([]);
            }}>
              Submit Another Request
            </CyberButton>
            <CyberButton variant="outline" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </CyberButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background cyber-grid">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Gamepad2 className="w-8 h-8 text-primary" />
                <div className="absolute inset-0 bg-primary/30 blur-lg rounded-full" />
              </div>
              <span className="text-xl font-orbitron font-bold text-gradient-neon">
                Idexopn
              </span>
            </div>
            
            <CyberButton variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4" />
              Back
            </CyberButton>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Hero Section */}
        <div className="relative text-center mb-10 p-8 rounded-2xl bg-gradient-to-br from-primary/10 via-neon-cyan/5 to-neon-pink/10 border border-primary/20 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.15),transparent_70%)]" />
          <div className="relative z-10">
            <div className="relative inline-block mb-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30">
                <Headphones className="w-8 h-8 text-primary" />
              </div>
              <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
            </div>
            <h1 className="text-3xl md:text-4xl font-orbitron font-bold text-foreground mb-3">
              Help Center
            </h1>
            <p className="text-muted-foreground font-rajdhani text-lg max-w-md mx-auto">
              {user ? "View your tickets, browse FAQs, or submit a new request." : "Having trouble? We're here to help you 24/7."}
            </p>
          </div>
        </div>

        {/* Quick Action Cards */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 text-center group hover:border-primary/40 transition-colors">
            <MessageCircle className="w-6 h-6 mx-auto mb-2 text-primary group-hover:scale-110 transition-transform" />
            <p className="text-xs font-rajdhani font-medium text-foreground">AI Chat</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Instant help</p>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-neon-cyan/10 to-neon-cyan/5 border border-neon-cyan/20 text-center group hover:border-neon-cyan/40 transition-colors">
            <Clock className="w-6 h-6 mx-auto mb-2 text-neon-cyan group-hover:scale-110 transition-transform" />
            <p className="text-xs font-rajdhani font-medium text-foreground">Response</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Under 24hrs</p>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-neon-green/10 to-neon-green/5 border border-neon-green/20 text-center group hover:border-neon-green/40 transition-colors">
            <Mail className="w-6 h-6 mx-auto mb-2 text-neon-green group-hover:scale-110 transition-transform" />
            <p className="text-xs font-rajdhani font-medium text-foreground">Email</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">support@xt</p>
          </div>
        </div>

        {/* Main Content - Tabs */}
        {user ? (
          <Tabs defaultValue="faq" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 bg-secondary/50 h-12">
              <TabsTrigger value="faq" className="font-rajdhani data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <BookOpen className="w-4 h-4 mr-2" />
                FAQ
              </TabsTrigger>
              <TabsTrigger value="tickets" className="font-rajdhani data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Ticket className="w-4 h-4 mr-2" />
                My Tickets
              </TabsTrigger>
              <TabsTrigger value="new" className="font-rajdhani data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Send className="w-4 h-4 mr-2" />
                New Request
              </TabsTrigger>
            </TabsList>

            <TabsContent value="faq">
              <FAQSection />
            </TabsContent>

            <TabsContent value="tickets">
              <UserTicketsList />
            </TabsContent>

            <TabsContent value="new">
              <ContactForm
                formData={formData}
                setFormData={setFormData}
                isSubmitting={isSubmitting}
                handleSubmit={handleSubmit}
                previewUrls={previewUrls}
                screenshots={screenshots}
                removeScreenshot={removeScreenshot}
                fileInputRef={fileInputRef}
                handleFileSelect={handleFileSelect}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-8">
            <FAQSection />
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-4 text-muted-foreground font-rajdhani">
                  Or submit a request
                </span>
              </div>
            </div>

            <ContactForm
              formData={formData}
              setFormData={setFormData}
              isSubmitting={isSubmitting}
              handleSubmit={handleSubmit}
              previewUrls={previewUrls}
              screenshots={screenshots}
              removeScreenshot={removeScreenshot}
              fileInputRef={fileInputRef}
              handleFileSelect={handleFileSelect}
            />
          </div>
        )}

        {/* Live Chat Nudge */}
        <div className="mt-8 p-4 rounded-xl bg-gradient-to-r from-neon-pink/10 via-primary/10 to-neon-cyan/10 border border-primary/20 text-center">
          <MessageCircle className="w-6 h-6 mx-auto mb-2 text-primary" />
          <p className="text-sm font-rajdhani font-medium text-foreground mb-1">
            Need instant help?
          </p>
          <p className="text-xs text-muted-foreground font-rajdhani">
            Use the AI Chat Assistant in the bottom-right corner for quick answers!
          </p>
        </div>
      </main>
    </div>
  );
}

// Extracted Contact Form Component
interface ContactFormProps {
  formData: {
    uid: string;
    email: string;
    issueType: string;
    subject: string;
    message: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<{
    uid: string;
    email: string;
    issueType: string;
    subject: string;
    message: string;
  }>>;
  isSubmitting: boolean;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  previewUrls: string[];
  screenshots: File[];
  removeScreenshot: (index: number) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function ContactForm({
  formData,
  setFormData,
  isSubmitting,
  handleSubmit,
  previewUrls,
  screenshots,
  removeScreenshot,
  fileInputRef,
  handleFileSelect,
}: ContactFormProps) {
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-6 rounded-xl bg-gradient-card border border-border space-y-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Send className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-orbitron font-bold text-foreground">
              Submit a Request
            </h2>
            <p className="text-sm text-muted-foreground font-rajdhani">
              Fill out the form and we'll respond within 24 hours
            </p>
          </div>
        </div>

        {/* UID Field */}
        <div className="space-y-2">
          <Label htmlFor="uid" className="text-foreground font-rajdhani">
            Your UID <span className="text-muted-foreground">(Optional)</span>
          </Label>
          <CyberInput
            id="uid"
            placeholder="Enter your account UID"
            value={formData.uid}
            onChange={(e) => setFormData({ ...formData, uid: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            If you know your UID, please provide it for faster assistance.
          </p>
        </div>

        {/* Email Field */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-foreground font-rajdhani">
            Email Address <span className="text-destructive">*</span>
          </Label>
          <CyberInput
            id="email"
            type="email"
            placeholder="your@email.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
        </div>

        {/* Issue Type & Subject in grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-foreground font-rajdhani">
              Issue Type <span className="text-destructive">*</span>
            </Label>
            <Select 
              value={formData.issueType} 
              onValueChange={(value) => setFormData({ ...formData, issueType: value })}
            >
              <SelectTrigger className="bg-secondary/50 border-border">
                <SelectValue placeholder="Select issue type" />
              </SelectTrigger>
              <SelectContent>
                {issueTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <type.icon className="w-4 h-4" />
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject" className="text-foreground font-rajdhani">
              Subject <span className="text-muted-foreground">(Optional)</span>
            </Label>
            <CyberInput
              id="subject"
              placeholder="Brief description"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            />
          </div>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <Label htmlFor="message" className="text-foreground font-rajdhani">
            Message <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="message"
            placeholder="Please describe your issue in detail..."
            rows={5}
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            className="bg-secondary/50 border-border resize-none"
            required
          />
          <p className="text-xs text-muted-foreground text-right">
            {formData.message.length}/1000
          </p>
        </div>

        {/* Screenshot Upload */}
        <div className="space-y-3">
          <Label className="text-foreground font-rajdhani">
            Screenshots <span className="text-muted-foreground">(Optional, max 3)</span>
          </Label>
          
          {previewUrls.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {previewUrls.map((url, index) => (
                <div key={index} className="relative group aspect-video rounded-lg overflow-hidden border border-border">
                  <img 
                    src={url} 
                    alt={`Screenshot ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeScreenshot(index)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {screenshots.length < MAX_FILES && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
            >
              <ImagePlus className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground font-rajdhani">
                Click to upload screenshots
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PNG, JPG up to 5MB each
              </p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </div>

      {/* Submit Button */}
      <CyberButton type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <MessageSquare className="w-4 h-4" />
            Submit Request
          </>
        )}
      </CyberButton>

      {/* Contact Info */}
      <div className="text-center p-4 rounded-lg bg-secondary/30 border border-border">
        <p className="text-sm text-muted-foreground font-rajdhani">
          <Mail className="w-4 h-4 inline mr-2" />
          You can also reach us at: <span className="text-primary">support@xtesports.com</span>
        </p>
      </div>
    </form>
  );
}
