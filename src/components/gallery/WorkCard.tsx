import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Play, Pause, Video, Camera, Music } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Generation {
  id: string;
  type: string;
  model: string | null;
  prompt: string;
  result_url: string | null;
  likes_count: number;
  created_at: string;
  is_featured: boolean;
  user_id: string;
  author?: {
    name: string | null;
    avatar_url: string | null;
  };
  is_liked?: boolean;
}

interface WorkCardProps {
  work: Generation;
  onLike: (id: string) => void;
  onClick: () => void;
  isLiking?: boolean;
}

export function WorkCard({ work, onLike, onClick, isLiking }: WorkCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [liked, setLiked] = useState(work.is_liked || false);
  const [likesCount, setLikesCount] = useState(work.likes_count);

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLiking) return;
    
    setLiked(!liked);
    setLikesCount(prev => liked ? prev - 1 : prev + 1);
    onLike(work.id);
  };

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlaying(!isPlaying);
  };

  const getTypeIcon = () => {
    switch (work.type) {
      case "video": return <Video className="h-3 w-3" />;
      case "photo": return <Camera className="h-3 w-3" />;
      case "music": return <Music className="h-3 w-3" />;
      default: return null;
    }
  };

  const renderContent = () => {
    switch (work.type) {
      case "photo":
        return (
          <div className="relative aspect-square overflow-hidden rounded-t-xl">
            <img
              src={work.result_url || "/placeholder.svg"}
              alt={work.prompt}
              className={cn(
                "w-full h-full object-cover transition-transform duration-300",
                isHovered && "scale-110"
              )}
            />
          </div>
        );

      case "video":
        return (
          <div className="relative aspect-video overflow-hidden rounded-t-xl bg-muted">
            {work.result_url ? (
              <video
                src={work.result_url}
                className="w-full h-full object-cover"
                muted
                loop
                playsInline
                onMouseEnter={(e) => e.currentTarget.play()}
                onMouseLeave={(e) => {
                  e.currentTarget.pause();
                  e.currentTarget.currentTime = 0;
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Video className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-black/50 rounded-full p-3">
                <Play className="h-6 w-6 text-white" fill="white" />
              </div>
            </div>
          </div>
        );

      case "music":
        return (
          <div className="relative aspect-square overflow-hidden rounded-t-xl bg-gradient-to-br from-primary/20 to-pink-500/20">
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
              <Music className="h-16 w-16 text-primary mb-4" />
              <Button
                variant="outline"
                size="icon"
                className="rounded-full"
                onClick={handlePlayPause}
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
              </Button>
            </div>
            {work.result_url && (
              <audio
                src={work.result_url}
                onEnded={() => setIsPlaying(false)}
                ref={(el) => {
                  if (el) {
                    if (isPlaying) el.play();
                    else el.pause();
                  }
                }}
              />
            )}
          </div>
        );

      default:
        return (
          <div className="aspect-square bg-muted rounded-t-xl flex items-center justify-center">
            <span className="text-4xl">🎨</span>
          </div>
        );
    }
  };

  return (
    <Card
      className="overflow-hidden cursor-pointer group hover:shadow-lg transition-all duration-300 bg-card border-border"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {renderContent()}

      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={work.author?.avatar_url || undefined} />
              <AvatarFallback className="text-xs">
                {work.author?.name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium truncate max-w-[100px]">
              {work.author?.name || "Аноним"}
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "gap-1 h-8 px-2",
              liked && "text-red-500"
            )}
            onClick={handleLike}
          >
            <Heart
              className={cn(
                "h-4 w-4 transition-all",
                liked && "fill-red-500 scale-110"
              )}
            />
            <span className="text-xs">{likesCount}</span>
          </Button>
        </div>

        {work.model && (
          <div className="flex items-center gap-1">
            <Badge variant="secondary" className="text-xs gap-1">
              {getTypeIcon()}
              {work.model}
            </Badge>
          </div>
        )}
      </div>
    </Card>
  );
}
