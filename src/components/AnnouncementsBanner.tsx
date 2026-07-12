import { useAnnouncements } from "@/hooks/useAnnouncements";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Megaphone, User, IndianRupee, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { CyberButton } from "@/components/ui/cyber-button";

export function AnnouncementsBanner() {
  const { announcements, isLoading } = useAnnouncements();
  const [currentIndex, setCurrentIndex] = useState(0);

  // Filter only published announcements
  const publishedAnnouncements = announcements.filter((a) => a.is_published);

  // Auto-rotate announcements
  useEffect(() => {
    if (publishedAnnouncements.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % publishedAnnouncements.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [publishedAnnouncements.length]);

  if (isLoading || publishedAnnouncements.length === 0) {
    return null;
  }

  const currentAnnouncement = publishedAnnouncements[currentIndex];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "winner":
      case "tournament_result":
        return <Trophy className="w-5 h-5 text-yellow-400" />;
      default:
        return <Megaphone className="w-5 h-5 text-primary" />;
    }
  };

  const getTypeBg = (type: string) => {
    switch (type) {
      case "winner":
        return "from-yellow-500/10 via-orange-500/5 to-transparent border-yellow-500/30";
      case "tournament_result":
        return "from-blue-500/10 via-cyan-500/5 to-transparent border-blue-500/30";
      default:
        return "from-primary/10 via-primary/5 to-transparent border-primary/30";
    }
  };

  return (
    <Card className={`relative overflow-hidden bg-gradient-to-r ${getTypeBg(currentAnnouncement.type)} border`}>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="hidden sm:flex items-center justify-center w-12 h-12 rounded-xl bg-background/50 backdrop-blur">
            {getTypeIcon(currentAnnouncement.type)}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge
                variant="outline"
                className={`text-xs ${
                  currentAnnouncement.type === "winner"
                    ? "border-yellow-500/50 text-yellow-400"
                    : currentAnnouncement.type === "tournament_result"
                    ? "border-blue-500/50 text-blue-400"
                    : "border-primary/50 text-primary"
                }`}
              >
                {currentAnnouncement.type === "winner" && "🏆 Winner"}
                {currentAnnouncement.type === "tournament_result" && "📊 Results"}
                {currentAnnouncement.type === "general" && "📢 Update"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {format(new Date(currentAnnouncement.created_at), "MMM d")}
              </span>
            </div>

            <h3 className="font-orbitron font-bold text-foreground mb-1 truncate">
              {currentAnnouncement.title}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {currentAnnouncement.content}
            </p>

            {/* Winner & Prize - User View */}
            {(currentAnnouncement.winner_profile || currentAnnouncement.prize_amount) && (
              <div className="flex flex-wrap items-center gap-3 mt-3">
                {currentAnnouncement.winner_profile && (
                  <div className="flex items-center gap-2 text-sm">
                    <Avatar className="h-6 w-6 border border-yellow-500/50">
                      <AvatarImage src={currentAnnouncement.winner_profile.avatar_url || undefined} />
                      <AvatarFallback><User className="w-3 h-3" /></AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-foreground">
                      {currentAnnouncement.winner_profile.username}
                    </span>
                  </div>
                )}
                {currentAnnouncement.prize_amount && (
                  <div className="flex items-center gap-1 text-sm text-green-400 font-semibold">
                    <IndianRupee className="w-3 h-3" />
                    {currentAnnouncement.prize_amount.toLocaleString()}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Navigation */}
          {publishedAnnouncements.length > 1 && (
            <div className="flex items-center gap-1">
              <CyberButton
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() =>
                  setCurrentIndex((prev) =>
                    prev === 0 ? publishedAnnouncements.length - 1 : prev - 1
                  )
                }
              >
                <ChevronLeft className="w-4 h-4" />
              </CyberButton>
              <span className="text-xs text-muted-foreground min-w-[3ch] text-center">
                {currentIndex + 1}/{publishedAnnouncements.length}
              </span>
              <CyberButton
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() =>
                  setCurrentIndex((prev) => (prev + 1) % publishedAnnouncements.length)
                }
              >
                <ChevronRight className="w-4 h-4" />
              </CyberButton>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
