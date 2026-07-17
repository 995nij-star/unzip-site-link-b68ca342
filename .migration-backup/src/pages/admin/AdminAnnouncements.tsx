import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAnnouncements, CreateAnnouncementInput, Announcement } from "@/hooks/useAnnouncements";
import { useTournaments } from "@/hooks/useTournaments";
import { CyberButton } from "@/components/ui/cyber-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Megaphone, Trophy, Edit, Trash2, Eye, EyeOff, User, IndianRupee } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export default function AdminAnnouncements() {
  const { announcements, isLoading, createAnnouncement, updateAnnouncement, deleteAnnouncement } = useAnnouncements(true);
  const { tournaments } = useTournaments();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateAnnouncementInput>({
    title: "",
    content: "",
    type: "general",
    tournament_id: null,
    winner_user_id: null,
    prize_amount: null,
    is_published: true,
  });

  // Search for users by UID
  const [userSearch, setUserSearch] = useState("");
  const { data: searchedUsers = [] } = useQuery({
    queryKey: ["user-search", userSearch],
    queryFn: async () => {
      if (!userSearch || userSearch.length < 3) return [];
      const { sanitizeSearchTerm } = await import("@/lib/searchSanitize");
      const safe = sanitizeSearchTerm(userSearch);
      if (!safe) return [];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, username, uid, avatar_url")
        .or(`uid.ilike.%${safe}%,username.ilike.%${safe}%`)
        .limit(5);
      return data || [];
    },
    enabled: userSearch.length >= 3,
  });

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      type: "general",
      tournament_id: null,
      winner_user_id: null,
      prize_amount: null,
      is_published: true,
    });
    setUserSearch("");
  };

  const handleCreate = async () => {
    await createAnnouncement.mutateAsync(formData);
    setIsCreateOpen(false);
    resetForm();
  };

  const handleUpdate = async () => {
    if (!editingAnnouncement) return;
    await updateAnnouncement.mutateAsync({
      id: editingAnnouncement.id,
      ...formData,
    });
    setEditingAnnouncement(null);
    resetForm();
  };

  const openEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
      tournament_id: announcement.tournament_id,
      winner_user_id: announcement.winner_user_id,
      prize_amount: announcement.prize_amount,
      is_published: announcement.is_published,
    });
    if (announcement.winner_profile) {
      setUserSearch(announcement.winner_profile.username || announcement.winner_profile.uid || "");
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "winner": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
      case "tournament_result": return "bg-blue-500/20 text-blue-400 border-blue-500/50";
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/50";
    }
  };

  const AnnouncementForm = ({ onSubmit, submitLabel }: { onSubmit: () => void; submitLabel: string }) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Title</Label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Announcement title"
        />
      </div>

      <div className="space-y-2">
        <Label>Type</Label>
        <Select
          value={formData.type}
          onValueChange={(value: "winner" | "general" | "tournament_result") =>
            setFormData({ ...formData, type: value })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="general">General</SelectItem>
            <SelectItem value="winner">Winner Announcement</SelectItem>
            <SelectItem value="tournament_result">Tournament Result</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Content</Label>
        <Textarea
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          placeholder="Announcement content..."
          rows={4}
        />
      </div>

      {(formData.type === "winner" || formData.type === "tournament_result") && (
        <>
          <div className="space-y-2">
            <Label>Tournament (Optional)</Label>
            <Select
              value={formData.tournament_id || "none"}
              onValueChange={(value) =>
                setFormData({ ...formData, tournament_id: value === "none" ? null : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select tournament" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No tournament</SelectItem>
                {tournaments.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.title} - {t.game}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Winner (Search by UID or Username)</Label>
            <Input
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search user..."
            />
            {searchedUsers.length > 0 && (
              <div className="border border-border rounded-lg overflow-hidden">
                {searchedUsers.map((user) => (
                  <button
                    key={user.user_id}
                    className={`w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left ${
                      formData.winner_user_id === user.user_id ? "bg-primary/10" : ""
                    }`}
                    onClick={() => {
                      setFormData({ ...formData, winner_user_id: user.user_id });
                      setUserSearch(user.username || user.uid || "");
                    }}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.username || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">UID: {user.uid}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Prize Amount (₹)</Label>
            <Input
              type="number"
              value={formData.prize_amount || ""}
              onChange={(e) => setFormData({ ...formData, prize_amount: e.target.value ? parseFloat(e.target.value) : null })}
              placeholder="Enter prize amount"
            />
          </div>
        </>
      )}

      <div className="flex items-center gap-3">
        <Switch
          checked={formData.is_published}
          onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
        />
        <Label>Publish immediately</Label>
      </div>

      <CyberButton onClick={onSubmit} className="w-full" disabled={!formData.title || !formData.content}>
        {submitLabel}
      </CyberButton>
    </div>
  );

  return (
    <AdminLayout title="Announcements" description="Manage winner announcements and updates">
      <div className="space-y-6">
        {/* Header with Create Button */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary" />
            <span className="text-sm text-muted-foreground">
              {announcements.length} announcement{announcements.length !== 1 ? "s" : ""}
            </span>
          </div>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <CyberButton onClick={() => resetForm()}>
                <Plus className="w-4 h-4 mr-2" />
                New Announcement
              </CyberButton>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Announcement</DialogTitle>
              </DialogHeader>
              <AnnouncementForm onSubmit={handleCreate} submitLabel="Create Announcement" />
            </DialogContent>
          </Dialog>
        </div>

        {/* Announcements List */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Megaphone className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No announcements yet</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {announcements.map((announcement) => (
              <Card key={announcement.id} className={`${!announcement.is_published ? "opacity-60" : ""}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getTypeColor(announcement.type)}>
                          {announcement.type === "winner" && <Trophy className="w-3 h-3 mr-1" />}
                          {announcement.type.replace("_", " ")}
                        </Badge>
                        {!announcement.is_published && (
                          <Badge variant="outline" className="text-muted-foreground">
                            <EyeOff className="w-3 h-3 mr-1" />
                            Draft
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-lg">{announcement.title}</CardTitle>
                    </div>
                    <div className="flex gap-2">
                      <CyberButton
                        variant="ghost"
                        size="icon"
                        onClick={() => updateAnnouncement.mutate({
                          id: announcement.id,
                          is_published: !announcement.is_published,
                        })}
                      >
                        {announcement.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </CyberButton>
                      <Dialog open={editingAnnouncement?.id === announcement.id} onOpenChange={(open) => !open && setEditingAnnouncement(null)}>
                        <DialogTrigger asChild>
                          <CyberButton variant="ghost" size="icon" onClick={() => openEdit(announcement)}>
                            <Edit className="w-4 h-4" />
                          </CyberButton>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                          <DialogHeader>
                            <DialogTitle>Edit Announcement</DialogTitle>
                          </DialogHeader>
                          <AnnouncementForm onSubmit={handleUpdate} submitLabel="Save Changes" />
                        </DialogContent>
                      </Dialog>
                      <CyberButton
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteAnnouncement.mutate(announcement.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </CyberButton>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">{announcement.content}</p>

                  {/* Winner & Prize Details - Admin View */}
                  <div className="flex flex-wrap gap-4 text-sm">
                    {announcement.winner_profile && (
                      <div className="flex items-center gap-2 bg-muted/50 px-3 py-2 rounded-lg">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={announcement.winner_profile.avatar_url || undefined} />
                          <AvatarFallback><User className="w-3 h-3" /></AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="font-medium">{announcement.winner_profile.username}</span>
                          <span className="text-muted-foreground ml-2">#{announcement.winner_profile.uid}</span>
                        </div>
                      </div>
                    )}
                    {announcement.prize_amount && (
                      <div className="flex items-center gap-2 bg-green-500/10 text-green-400 px-3 py-2 rounded-lg">
                        <IndianRupee className="w-4 h-4" />
                        <span className="font-semibold">{announcement.prize_amount.toLocaleString()}</span>
                      </div>
                    )}
                    {announcement.tournament && (
                      <div className="flex items-center gap-2 bg-blue-500/10 text-blue-400 px-3 py-2 rounded-lg">
                        <Trophy className="w-4 h-4" />
                        <span>{announcement.tournament.title}</span>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground mt-4">
                    Created {format(new Date(announcement.created_at), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
