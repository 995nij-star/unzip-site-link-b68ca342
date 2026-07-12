import { useState } from "react";
import { useClipActions } from "@/hooks/useClips";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CyberButton } from "@/components/ui/cyber-button";
import { toast } from "@/hooks/use-toast";
import { Flag, Loader2 } from "lucide-react";

const REPORT_REASONS = [
  "Inappropriate content",
  "Spam or misleading",
  "Harassment or bullying",
  "Violence or harmful acts",
  "Copyright violation",
  "Other",
];

export function ReportClipDialog({ clipId, open, onOpenChange }: {
  clipId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { reportClip } = useClipActions();
  const [selectedReason, setSelectedReason] = useState("");

  const handleSubmit = async () => {
    if (!selectedReason) return;
    try {
      await reportClip.mutateAsync({ clipId, reason: selectedReason });
      toast({ title: "Report submitted", description: "Thank you for helping keep our community safe." });
      onOpenChange(false);
      setSelectedReason("");
    } catch (err: any) {
      if (err.message?.includes("duplicate") || err.message?.includes("unique")) {
        toast({ title: "Already reported", description: "You have already reported this clip.", variant: "destructive" });
      } else {
        toast({ title: "Error", description: "Failed to submit report", variant: "destructive" });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-destructive/30">
        <DialogHeader>
          <DialogTitle className="font-orbitron flex items-center gap-2">
            <Flag className="w-5 h-5 text-destructive" />
            Report Clip
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground font-rajdhani">Why are you reporting this clip?</p>
          <div className="space-y-2">
            {REPORT_REASONS.map((reason) => (
              <button
                key={reason}
                onClick={() => setSelectedReason(reason)}
                className={`w-full text-left px-4 py-3 rounded-lg border text-sm font-rajdhani transition-colors ${
                  selectedReason === reason
                    ? "border-destructive bg-destructive/10 text-foreground"
                    : "border-border bg-secondary/50 text-muted-foreground hover:border-muted-foreground"
                }`}
              >
                {reason}
              </button>
            ))}
          </div>
          <CyberButton
            onClick={handleSubmit}
            className="w-full"
            disabled={!selectedReason || reportClip.isPending}
          >
            {reportClip.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Flag className="w-4 h-4 mr-2" />}
            Submit Report
          </CyberButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
