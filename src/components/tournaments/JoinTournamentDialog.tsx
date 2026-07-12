import { useState } from "react";
import { Loader2, Gamepad2, User, Hash, Phone, Crown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CyberInput } from "@/components/ui/cyber-input";
import { CyberButton } from "@/components/ui/cyber-button";
import { Label } from "@/components/ui/label";
import { usePremium } from "@/hooks/usePremium";

interface JoinTournamentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournament: {
    id: string;
    title: string;
    game: string;
    entry_fee: number;
  } | null;
  isJoining: boolean;
  onJoin: (playerName: string, gameUid: string, phoneNumber: string) => void;
}

export function JoinTournamentDialog({
  open,
  onOpenChange,
  tournament,
  isJoining,
  onJoin,
}: JoinTournamentDialogProps) {
  const [playerName, setPlayerName] = useState("");
  const [gameUid, setGameUid] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const { isPremium } = usePremium();

  const baseFee = tournament?.entry_fee ?? 0;
  const discount = isPremium ? Math.round(baseFee * 0.1 * 100) / 100 : 0;
  const chargedFee = Math.max(0, baseFee - discount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || !gameUid.trim() || !phoneNumber.trim()) return;
    // Format phone number with +91 prefix
    let formattedPhone = phoneNumber.trim().replace(/\s+/g, "");
    if (!formattedPhone.startsWith("+")) {
      formattedPhone = "+91" + formattedPhone;
    } else if (!formattedPhone.startsWith("+91")) {
      formattedPhone = "+91" + formattedPhone.replace(/^\+/, "");
    }
    onJoin(playerName.trim(), gameUid.trim(), formattedPhone);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setPlayerName("");
      setGameUid("");
      setPhoneNumber("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-orbitron text-xl flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-primary" />
            Join Tournament
          </DialogTitle>
          <DialogDescription className="font-rajdhani">
            Enter your in-game details to join <span className="text-primary font-semibold">{tournament?.title}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="playerName" className="font-rajdhani text-sm text-muted-foreground">
              In-Game Name
            </Label>
            <CyberInput
              id="playerName"
              placeholder="Enter your in-game name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              icon={<User className="w-5 h-5" />}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gameUid" className="font-rajdhani text-sm text-muted-foreground">
              Free Fire UID
            </Label>
            <CyberInput
              id="gameUid"
              placeholder="Enter your Free Fire UID"
              value={gameUid}
              onChange={(e) => setGameUid(e.target.value)}
              icon={<Hash className="w-5 h-5" />}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber" className="font-rajdhani text-sm text-muted-foreground">
              WhatsApp Number
            </Label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors flex items-center gap-1">
                <Phone className="w-5 h-5" />
                <span className="font-rajdhani font-medium text-sm">+91</span>
              </div>
              <input
                id="phoneNumber"
                type="tel"
                placeholder="9876543210"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                className="flex h-14 w-full rounded-lg border-2 border-border bg-secondary/50 pl-24 pr-4 py-3 text-base font-rajdhani font-medium text-foreground transition-all duration-300 placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:bg-secondary focus:shadow-neon disabled:cursor-not-allowed disabled:opacity-50 hover:border-primary/50 hover:bg-secondary/70"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground font-rajdhani">
              Room credentials will be sent to this number
            </p>
          </div>

          <div className="p-3 rounded-lg bg-neon-orange/10 border border-neon-orange/30 space-y-1">
            {isPremium ? (
              <>
                <p className="text-sm font-rajdhani text-muted-foreground flex items-center gap-2">
                  <Crown className="w-4 h-4 text-neon-purple" />
                  Premium discount applied (10% off)
                </p>
                <p className="text-sm font-rajdhani text-muted-foreground">
                  Entry Fee:{" "}
                  <span className="line-through text-muted-foreground/60">₹{baseFee}</span>{" "}
                  <span className="text-neon-orange font-bold">₹{chargedFee}</span>
                </p>
                <p className="text-xs font-rajdhani text-neon-purple/80">
                  Premium also reserves a slot if the tournament fills up.
                </p>
              </>
            ) : (
              <p className="text-sm font-rajdhani text-muted-foreground">
                Entry Fee: <span className="text-neon-orange font-bold">₹{baseFee}</span>
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <CyberButton
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="flex-1"
              disabled={isJoining}
            >
              Cancel
            </CyberButton>
            <CyberButton
              type="submit"
              className="flex-1"
              disabled={isJoining || !playerName.trim() || !gameUid.trim() || phoneNumber.length !== 10}
            >
              {isJoining ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Joining...
                </>
              ) : (
                `Pay ₹${chargedFee} & Join`
              )}
            </CyberButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
