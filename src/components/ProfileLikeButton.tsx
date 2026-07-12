import { Heart, Loader2 } from "lucide-react";
import { useProfileLikes } from "@/hooks/useProfileLikes";
import { cn } from "@/lib/utils";

interface ProfileLikeButtonProps {
  profileUserId: string;
  size?: "sm" | "md" | "lg";
  showCount?: boolean;
  className?: string;
}

export function ProfileLikeButton({ 
  profileUserId, 
  size = "md", 
  showCount = true,
  className 
}: ProfileLikeButtonProps) {
  const { hasLiked, likeCount, isLoading, isMutating, toggleLike, canLike } = useProfileLikes(profileUserId);

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const buttonSizeClasses = {
    sm: "px-2 py-1 text-xs gap-1",
    md: "px-3 py-1.5 text-sm gap-1.5",
    lg: "px-4 py-2 text-base gap-2",
  };

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-1.5 text-muted-foreground", className)}>
        <Loader2 className={cn(sizeClasses[size], "animate-spin")} />
        {showCount && <span className="font-rajdhani">...</span>}
      </div>
    );
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        toggleLike();
      }}
      disabled={isMutating || !canLike}
      className={cn(
        "flex items-center rounded-lg border transition-all duration-200 font-rajdhani font-medium",
        buttonSizeClasses[size],
        hasLiked
          ? "bg-neon-pink/20 border-neon-pink/40 text-neon-pink hover:bg-neon-pink/30"
          : "bg-card/50 border-border text-muted-foreground hover:text-neon-pink hover:border-neon-pink/30 hover:bg-neon-pink/10",
        !canLike && "opacity-50 cursor-not-allowed",
        isMutating && "opacity-70",
        className
      )}
    >
      <Heart 
        className={cn(
          sizeClasses[size],
          "transition-all duration-200",
          hasLiked && "fill-current"
        )} 
      />
      {showCount && (
        <span>{likeCount}</span>
      )}
    </button>
  );
}
