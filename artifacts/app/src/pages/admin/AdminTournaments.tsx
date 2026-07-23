import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAuth } from "@/hooks/useAuth";
import { useAdminTournaments } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Loader2, Search, Plus, Edit, Trash2, Trophy, Users, Calendar, Coins, Eye, Send, Play, Square, Crown } from "lucide-react";
import { CyberInput } from "@/components/ui/cyber-input";
import { CyberButton } from "@/components/ui/cyber-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { z } from "zod";
import { TournamentParticipantsDialog } from "@/components/admin/TournamentParticipantsDialog";

const tournamentSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  game: z.string().min(1, "Game is required"),
  description: z.string().optional(),
  entry_fee: z.number().min(0, "Entry fee must be positive"),
  prize_pool: z.number().min(0, "Prize pool must be positive"),
  max_players: z.number().min(2, "At least 2 players required"),
  start_time: z.string().min(1, "Start time is required"),
  status: z.enum(["upcoming", "live", "completed"]),
  room_id: z.string().optional(),
  room_password: z.string().optional(),
  image_url: z.string().optional(),
});

type TournamentForm = z.infer<typeof tournamentSchema>;

const defaultForm: TournamentForm = {
  title: "",
  game: "BGMI",
  description: "",
  entry_fee: 30,
  prize_pool: 0,
  max_players: 100,
  start_time: "",
  status: "upcoming",
  room_id: "",
  room_password: "",
  image_url: "",
};

export default function AdminTournaments() {
  const { user: currentUser } = useAuth();
  const { data: tournaments, isLoading, error } = useAdminTournaments();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TournamentForm>(defaultForm);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [sendingCredentials, setSendingCredentials] = useState<string | null>(null);
  const [participantsDialogOpen, setParticipantsDialogOpen] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<{ id: string; title: string } | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const filteredTournaments = tournaments?.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.game.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openCreateDialog = () => {
    setEditingId(null);
    setForm(defaultForm);
    setIsDialogOpen(true);
  };

  const openEditDialog = (tournament: any) => {
    setEditingId(tournament.id);
    setForm({
      title: tournament.title,
      game: tournament.game,
      description: tournament.description || "",
      entry_fee: Number(tournament.entry_fee),
      prize_pool: Number(tournament.prize_pool),
      max_players: tournament.max_players,
      start_time: new Date(tournament.start_time).toISOString().slice(0, 16),
      status: tournament.status,
      room_id: tournament.room_id || "",
      room_password: tournament.room_password || "",
      image_url: tournament.image_url || "",
    });
    setIsDialogOpen(true);
  };

  const openParticipantsDialog = (tournament: { id: string; title: string }) => {
    setSelectedTournament(tournament);
    setParticipantsDialogOpen(true);
  };

  const handleSubmit = async () => {
    const validation = tournamentSchema.safeParse(form);
    if (!validation.success) {
      toast({
        title: "Validation Error",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setFormLoading(true);

    const payload = {
      title: form.title,
      game: form.game,
      description: form.description || null,
      entry_fee: form.entry_fee,
      prize_pool: form.prize_pool,
      max_players: form.max_players,
      start_time: new Date(form.start_time).toISOString(),
      status: form.status,
      room_id: form.room_id || null,
      room_password: form.room_password || null,
      image_url: form.image_url || null,
    };

    let error;
    if (editingId) {
      const result = await (supabase as any)
        .from('tournaments')
        .update(payload)
        .eq('id', editingId);
      error = result.error;
    } else {
      const result = await (supabase as any)
        .from('tournaments')
        .insert(payload);
      error = result.error;
    }

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: editingId ? "Tournament Updated" : "Tournament Created",
        description: `Tournament has been ${editingId ? 'updated' : 'created'} successfully`,
      });
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['adminTournaments'] });
    }

    setFormLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this tournament?")) return;

    setDeleteLoading(id);

    const { error } = await supabase
      .from('tournaments')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Tournament Deleted",
        description: "Tournament has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['adminTournaments'] });
    }

    setDeleteLoading(null);
  };

  const handleSendCredentials = async (tournament: any) => {
    if (!tournament.room_id || !tournament.room_password) {
      toast({
        title: "Missing Credentials",
        description: "Please set room ID and password first",
        variant: "destructive",
      });
      return;
    }

    setSendingCredentials(tournament.id);

    try {
      // Fetch participants with phone numbers - use select('*') and filter in JS
      // to avoid TypeScript errors while types regenerate
      const { data: rawParticipants, error: fetchError } = await supabase
        .from('tournament_participants')
        .select('*')
        .eq('tournament_id', tournament.id);

      if (fetchError) throw fetchError;

      // Filter participants who have phone numbers
      const participantsData = (rawParticipants as any[] || []).filter(
        (p: any) => p.phone_number
      );

      if (participantsData.length === 0) {
        toast({
          title: "No Recipients",
          description: "No participants with phone numbers found",
          variant: "destructive",
        });
        setSendingCredentials(null);
        return;
      }

      // Call edge function
      const { data, error } = await supabase.functions.invoke('send-room-credentials', {
        body: {
          tournament_id: tournament.id,
          tournament_title: tournament.title,
          room_id: tournament.room_id,
          room_password: tournament.room_password,
          participants: participantsData.map((p: any) => ({
            phone_number: p.phone_number,
            player_name: p.player_name || 'Player',
          })),
        },
      });

      if (error) throw error;

      toast({
        title: "Credentials Sent!",
        description: `Sent to ${data?.sent || 0} participants${data?.failed ? `, ${data.failed} failed` : ''}`,
      });
    } catch (error: any) {
      console.error('Error sending credentials:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send credentials",
        variant: "destructive",
      });
    } finally {
      setSendingCredentials(null);
    }
  };

  const handleForceStatus = async (id: string, newStatus: string, title: string) => {
    if (!confirm(`Force ${newStatus} tournament "${title}"?`)) return;
    setDeleteLoading(id);
    const { error } = await supabase.from("tournaments").update({ status: newStatus }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      if (currentUser) {
        await supabase.from("admin_audit_log").insert({
          admin_id: currentUser.id, action: `force_${newStatus}_tournament`,
          target_type: "tournament", target_id: id,
          details: { title, new_status: newStatus } as any,
        });
      }
      toast({ title: `Tournament ${newStatus}`, description: `"${title}" has been force-${newStatus}.` });
      queryClient.invalidateQueries({ queryKey: ["adminTournaments"] });
    }
    setDeleteLoading(null);
  };

  const handleAssignWinner = async (tournamentId: string, participantId: string) => {
    const { error } = await (supabase as any).from("tournament_participants")
      .update({ is_winner: true }).eq("id", participantId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      if (currentUser) {
        await supabase.from("admin_audit_log").insert({
          admin_id: currentUser.id, action: "assign_tournament_winner",
          target_type: "tournament_participant", target_id: participantId,
          details: { tournament_id: tournamentId } as any,
        });
      }
      toast({ title: "Winner Assigned" });
      queryClient.invalidateQueries({ queryKey: ["adminTournaments"] });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "live":
        return <Badge className="bg-neon-green/20 text-neon-green border-neon-green/30">Live</Badge>;
      case "upcoming":
        return <Badge className="bg-primary/20 text-primary border-primary/30">Upcoming</Badge>;
      case "completed":
        return <Badge variant="secondary">Completed</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="Tournament Management" description="Loading tournaments...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="Tournament Management" description="Error loading tournaments">
        <div className="text-center text-destructive py-12">
          Failed to load tournaments. Please try again.
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Tournament Management" description="Create and manage tournaments">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <CyberInput
          placeholder="Search tournaments..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          icon={<Search className="w-5 h-5" />}
          className="flex-1 max-w-md"
        />
        <CyberButton onClick={openCreateDialog}>
          <Plus className="w-5 h-5" />
          Create Tournament
        </CyberButton>
      </div>

      {/* Tournaments Table */}
      <div className="bg-gradient-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground font-rajdhani">Tournament</TableHead>
              <TableHead className="text-muted-foreground font-rajdhani">Players</TableHead>
              <TableHead className="text-muted-foreground font-rajdhani">Entry / Prize</TableHead>
              <TableHead className="text-muted-foreground font-rajdhani">Start Time</TableHead>
              <TableHead className="text-muted-foreground font-rajdhani">Status</TableHead>
              <TableHead className="text-muted-foreground font-rajdhani text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTournaments?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                  No tournaments found
                </TableCell>
              </TableRow>
            ) : (
              filteredTournaments?.map((tournament) => (
                <TableRow key={tournament.id} className="border-border">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {(tournament as any).image_url ? (
                        <img 
                          src={(tournament as any).image_url} 
                          alt={tournament.game}
                          className="w-10 h-10 rounded-lg object-cover border border-primary/20"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                          <Trophy className="w-5 h-5 text-primary" />
                        </div>
                      )}
                      <div>
                        <p className="font-rajdhani font-medium text-foreground">{tournament.title}</p>
                        <p className="text-xs text-muted-foreground">{tournament.game}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span className="font-rajdhani">{tournament.current_players}/{tournament.max_players}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-rajdhani">
                      <span className="text-muted-foreground">₹{tournament.entry_fee}</span>
                      <span className="text-muted-foreground/50 mx-1">/</span>
                      <span className="text-neon-green">₹{tournament.prize_pool}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-muted-foreground font-rajdhani">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(tournament.start_time), 'MMM dd, HH:mm')}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(tournament.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-1">
                      {/* Force Controls */}
                      {tournament.status === "upcoming" && (
                        <CyberButton variant="outline" size="sm" onClick={() => handleForceStatus(tournament.id, "live", tournament.title)}
                          disabled={deleteLoading === tournament.id} className="text-neon-green border-neon-green/30" title="Force Start">
                          <Play className="w-4 h-4" />
                        </CyberButton>
                      )}
                      {tournament.status === "live" && (
                        <CyberButton variant="outline" size="sm" onClick={() => handleForceStatus(tournament.id, "completed", tournament.title)}
                          disabled={deleteLoading === tournament.id} className="text-neon-orange border-neon-orange/30" title="Force End">
                          <Square className="w-4 h-4" />
                        </CyberButton>
                      )}
                      {tournament.status !== "cancelled" && tournament.status !== "completed" && (
                        <CyberButton variant="outline" size="sm" onClick={() => handleForceStatus(tournament.id, "cancelled", tournament.title)}
                          disabled={deleteLoading === tournament.id} className="text-destructive border-destructive/30" title="Cancel">
                          ✕
                        </CyberButton>
                      )}

                      {tournament.room_id && tournament.room_password && (
                        <CyberButton variant="outline" size="sm" onClick={() => handleSendCredentials(tournament)}
                          disabled={sendingCredentials === tournament.id} className="text-neon-cyan border-neon-cyan/30" title="Send Credentials">
                          {sendingCredentials === tournament.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </CyberButton>
                      )}
                      <CyberButton variant="outline" size="sm" onClick={() => openParticipantsDialog({ id: tournament.id, title: tournament.title })}>
                        <Users className="w-4 h-4" /><span className="ml-1">{tournament.current_players}</span>
                      </CyberButton>
                      <CyberButton variant="outline" size="sm" onClick={() => openEditDialog(tournament)}>
                        <Edit className="w-4 h-4" />
                      </CyberButton>
                      <CyberButton variant="destructive" size="sm" onClick={() => handleDelete(tournament.id)} disabled={deleteLoading === tournament.id}>
                        {deleteLoading === tournament.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </CyberButton>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-orbitron text-foreground">
              {editingId ? "Edit Tournament" : "Create Tournament"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Tournament title"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="game">Game</Label>
                <Select value={form.game} onValueChange={(v) => setForm({ ...form, game: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BGMI">BGMI</SelectItem>
                    <SelectItem value="Free Fire">Free Fire</SelectItem>
                    <SelectItem value="COD Mobile">COD Mobile</SelectItem>
                    <SelectItem value="Valorant">Valorant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Tournament description"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="entry_fee">Entry Fee (₹)</Label>
                <Input
                  id="entry_fee"
                  type="number"
                  value={form.entry_fee}
                  onChange={(e) => setForm({ ...form, entry_fee: Number(e.target.value) })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="prize_pool">Prize Pool (₹)</Label>
                <Input
                  id="prize_pool"
                  type="number"
                  value={form.prize_pool}
                  onChange={(e) => setForm({ ...form, prize_pool: Number(e.target.value) })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="max_players">Max Players</Label>
                <Input
                  id="max_players"
                  type="number"
                  value={form.max_players}
                  onChange={(e) => setForm({ ...form, max_players: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="start_time">Start Time</Label>
              <Input
                id="start_time"
                type="datetime-local"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="image_url">Game Logo URL (Optional)</Label>
              <Input
                id="image_url"
                value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                placeholder="https://example.com/freefire-logo.png"
              />
              {form.image_url && (
                <div className="mt-2 flex items-center gap-2">
                  <img 
                    src={form.image_url} 
                    alt="Game logo preview" 
                    className="w-12 h-12 rounded-lg object-cover border border-primary/30"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <span className="text-xs text-muted-foreground">Preview</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="room_id">Room ID (Optional)</Label>
                <Input
                  id="room_id"
                  value={form.room_id}
                  onChange={(e) => setForm({ ...form, room_id: e.target.value })}
                  placeholder="Game room ID"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="room_password">Room Password (Optional)</Label>
                <Input
                  id="room_password"
                  value={form.room_password}
                  onChange={(e) => setForm({ ...form, room_password: e.target.value })}
                  placeholder="Game room password"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <CyberButton variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </CyberButton>
            <CyberButton onClick={handleSubmit} disabled={formLoading}>
              {formLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : editingId ? (
                "Update"
              ) : (
                "Create"
              )}
            </CyberButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Participants Dialog */}
      <TournamentParticipantsDialog
        open={participantsDialogOpen}
        onOpenChange={setParticipantsDialogOpen}
        tournament={selectedTournament}
      />
    </AdminLayout>
  );
}
