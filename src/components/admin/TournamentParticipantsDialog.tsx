import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Loader2, Trophy, User, Hash, CheckCircle, Circle, Crown } from "lucide-react";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CyberButton } from "@/components/ui/cyber-button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Participant {
  id: string;
  user_id: string;
  player_name: string | null;
  game_uid: string | null;
  is_winner: boolean;
  joined_at: string;
  profiles: {
    username: string | null;
    uid: string | null;
    is_verified: boolean;
  } | null;
}

interface TournamentParticipantsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournament: {
    id: string;
    title: string;
  } | null;
}

export function TournamentParticipantsDialog({
  open,
  onOpenChange,
  tournament,
}: TournamentParticipantsDialogProps) {
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [updating, setUpdating] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (!open || !tournament) {
      setParticipants([]);
      return;
    }

    const fetchParticipants = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('tournament_participants')
        .select(`
          id,
          user_id,
          player_name,
          game_uid,
          is_winner,
          joined_at,
          profiles!tournament_participants_user_id_fkey (
            username,
            uid,
            is_verified
          )
        `)
        .eq('tournament_id', tournament.id)
        .order('joined_at', { ascending: true });

      if (!error && data) {
        setParticipants(data as unknown as Participant[]);
      }
      setLoading(false);
    };

    fetchParticipants();
  }, [open, tournament]);

  const toggleWinner = async (participantId: string, currentStatus: boolean) => {
    setUpdating(participantId);

    const { error } = await supabase
      .from('tournament_participants')
      .update({ is_winner: !currentStatus })
      .eq('id', participantId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setParticipants(prev =>
        prev.map(p =>
          p.id === participantId ? { ...p, is_winner: !currentStatus } : p
        )
      );
      toast({
        title: currentStatus ? "Winner Removed" : "Winner Marked",
        description: currentStatus
          ? "Player removed from winners"
          : "Player marked as winner!",
      });
    }

    setUpdating(null);
  };

  const winnerCount = participants.filter(p => p.is_winner).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-orbitron text-xl flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            {tournament?.title} - Participants
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-4 mb-4">
          <Badge className="bg-primary/20 text-primary border-primary/30 font-rajdhani">
            {participants.length} Participants
          </Badge>
          {winnerCount > 0 && (
            <Badge className="bg-neon-orange/20 text-neon-orange border-neon-orange/30 font-rajdhani">
              <Crown className="w-3 h-3 mr-1" />
              {winnerCount} Winner{winnerCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : participants.length === 0 ? (
          <p className="text-center text-muted-foreground py-12 font-rajdhani">
            No participants yet
          </p>
        ) : (
          <div className="overflow-auto flex-1">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-rajdhani">#</TableHead>
                  <TableHead className="text-muted-foreground font-rajdhani">Platform User</TableHead>
                  <TableHead className="text-muted-foreground font-rajdhani">In-Game Name</TableHead>
                  <TableHead className="text-muted-foreground font-rajdhani">Free Fire UID</TableHead>
                  <TableHead className="text-muted-foreground font-rajdhani">Joined</TableHead>
                  <TableHead className="text-muted-foreground font-rajdhani text-right">Winner</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {participants.map((participant, index) => (
                  <TableRow key={participant.id} className={`border-border ${participant.is_winner ? 'bg-neon-orange/5' : ''}`}>
                    <TableCell className="font-rajdhani text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-primary" />
                        <div>
                          <p className="font-rajdhani font-medium text-foreground text-sm flex items-center gap-1">
                            {participant.profiles?.username ?? 'Unknown'}
                            {participant.profiles?.is_verified && <VerifiedBadge />}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            #{participant.profiles?.uid ?? 'N/A'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-rajdhani text-foreground">
                        {participant.player_name ?? '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Hash className="w-3 h-3 text-neon-cyan" />
                        <span className="font-mono text-sm text-neon-cyan">
                          {participant.game_uid ?? '-'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-rajdhani text-sm">
                      {format(new Date(participant.joined_at), 'MMM d, HH:mm')}
                    </TableCell>
                    <TableCell className="text-right">
                      <CyberButton
                        size="sm"
                        variant={participant.is_winner ? "default" : "outline"}
                        onClick={() => toggleWinner(participant.id, participant.is_winner)}
                        disabled={updating === participant.id}
                        className={participant.is_winner ? "bg-neon-orange hover:bg-neon-orange/80" : ""}
                      >
                        {updating === participant.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : participant.is_winner ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Winner
                          </>
                        ) : (
                          <>
                            <Circle className="w-4 h-4" />
                            Mark
                          </>
                        )}
                      </CyberButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
