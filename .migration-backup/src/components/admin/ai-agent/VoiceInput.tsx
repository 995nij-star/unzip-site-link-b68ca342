import { useState, useRef, useCallback } from "react";
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export function VoiceInput({ onTranscript, disabled }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const toggleListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Voice input not supported in this browser");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onTranscript(transcript);
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "not-allowed") {
        toast.error("Microphone access denied");
      } else {
        toast.error("Voice input failed: " + event.error);
      }
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening, onTranscript]);

  return (
    <button
      onClick={toggleListening}
      disabled={disabled}
      className={cn(
        "flex-shrink-0 w-10 h-10 rounded-xl border flex items-center justify-center transition-all duration-200",
        isListening
          ? "bg-neon-red/15 border-neon-red/40 text-neon-red animate-pulse shadow-[0_0_16px_-4px_hsl(var(--neon-red)/0.4)]"
          : "border-border/30 bg-background/30 hover:bg-neon-purple/10 hover:border-neon-purple/30 text-muted-foreground hover:text-neon-purple"
      )}
      title={isListening ? "Stop listening" : "Voice input"}
    >
      {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
    </button>
  );
}
