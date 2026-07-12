import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { CyberButton } from "@/components/ui/cyber-button";
import { Ban, CheckCircle, Loader2 } from "lucide-react";

interface BanReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  username: string;
  isBanning: boolean;
  isLoading: boolean;
  onConfirm: (reason: string) => void;
}

export function BanReasonDialog({
  open,
  onOpenChange,
  username,
  isBanning,
  isLoading,
  onConfirm,
}: BanReasonDialogProps) {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    onConfirm(reason);
    setReason("");
  };

  const handleClose = () => {
    setReason("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-orbitron flex items-center gap-2">
            {isBanning ? (
              <>
                <Ban className="w-5 h-5 text-destructive" />
                Ban User
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5 text-neon-green" />
                Unban User
              </>
            )}
          </DialogTitle>
          <DialogDescription className="font-rajdhani">
            {isBanning
              ? `You are about to ban "${username}". They will be blocked from accessing the platform.`
              : `You are about to unban "${username}". They will regain access to the platform.`}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <label className="text-sm font-rajdhani text-muted-foreground mb-2 block">
            Reason (optional)
          </label>
          <Textarea
            placeholder={isBanning ? "Enter reason for ban..." : "Enter reason for unban..."}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="bg-background border-border font-rajdhani"
            rows={3}
          />
        </div>

        <DialogFooter>
          <CyberButton variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </CyberButton>
          <CyberButton
            variant={isBanning ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isBanning ? (
              <>
                <Ban className="w-4 h-4" />
                Confirm Ban
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Confirm Unban
              </>
            )}
          </CyberButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
