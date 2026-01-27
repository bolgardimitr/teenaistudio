import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Heart,
  Copy,
  Wand2,
  Calendar,
  Download,
  Play,
  Pause,
  Check,
  Video,
  Camera,
  Music,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import type { Generation } from "./WorkCard";

interface WorkModalProps {
  work: Generation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLike: (id: string) => void;
  isAuthenticated: boolean;
}

export function WorkModal({
  work,
  open,
  onOpenChange,
  onLike,
  isAuthenticated,
}: WorkModalProps) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [liked, setLiked] = useState(work?.is_liked || false);
  const [likesCount, setLikesCount] = useState(work?.likes_count || 0);

  if (!work) return null;

  const handleCopyPrompt = async () => {
    await navigator.clipboard.writeText(work.prompt);
    setCopied(true);
    toast({ title: "Промпт скопирован!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMakeSimilar = () => {
    const studioPath = work.type === "photo" ? "/photo" : 
                       work.type === "video" ? "/video" : 
                       work.type === "music" ? "/music" : "/photo";
    
    localStorage.setItem("galleryPrompt", work.prompt);
    navigate(studioPath);
    onOpenChange(false);
  };

  const handleLike = () => {
    if (!isAuthenticated) {
      toast({ 
        title: "Необходима авторизация", 
        description: "Войдите, чтобы ставить лайки",
        variant: "destructive" 
      });
      return;
    }
    
    setLiked(!liked);
    setLikesCount(prev => liked ? prev - 1 : prev + 1);
    onLike(work.id);
  };

  const handleDownload = async () => {
    if (!work.result_url) return;
    
    try {
      const response = await fetch(work.result_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${work.type}-${work.id}.${work.type === "music" ? "mp3" : work.type === "video" ? "mp4" : "png"}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast({ title: "Ошибка загрузки", variant: "destructive" });
    }
  };

  const getTypeIcon = () => {
    switch (work.type) {
      case "video": return <Video className="h-4 w-4" />;
      case "photo": return <Camera className="h-4 w-4" />;
      case "music": return <Music className="h-4 w-4" />;
      default: return null;
    }
  };

  const renderMedia = () => {
    switch (work.type) {
      case "photo":
        return (
          <img
            src={work.result_url || "/placeholder.svg"}
            alt={work.prompt}
            className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
          />
        );

      case "video":
        return (
          <video
            src={work.result_url || undefined}
            controls
            className="w-full max-h-[70vh] rounded-lg"
            autoPlay
          />
        );

      case "music":
        return (
          <div className="w-full aspect-square max-w-md mx-auto bg-gradient-to-br from-primary/20 to-pink-500/20 rounded-2xl flex flex-col items-center justify-center gap-6 p-8">
            <Music className="h-24 w-24 text-primary" />
            <Button
              size="lg"
              className="rounded-full h-16 w-16"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8" />}
            </Button>
            {work.result_url && (
              <audio
                src={work.result_url}
                controls
                className="w-full mt-4"
                autoPlay={isPlaying}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
              />
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <div className="flex flex-col md:flex-row gap-0">
          {/* Media Section */}
          <div className="flex-1 bg-black/5 dark:bg-black/20 p-4 flex items-center justify-center min-h-[300px]">
            {renderMedia()}
          </div>

          {/* Info Panel */}
          <div className="w-full md:w-80 p-6 space-y-4 border-l border-border">
            {/* Author */}
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={work.author?.avatar_url || undefined} />
                <AvatarFallback>
                  {work.author?.name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{work.author?.name || "Аноним"}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(work.created_at), "d MMM yyyy", { locale: ru })}
                </p>
              </div>
            </div>

            <Separator />

            {/* Type & Model */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="gap-1">
                {getTypeIcon()}
                {work.type === "photo" ? "Фото" : work.type === "video" ? "Видео" : "Музыка"}
              </Badge>
              {work.model && (
                <Badge variant="secondary">{work.model}</Badge>
              )}
            </div>

            {/* Prompt */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Промпт:</p>
              <div className="bg-muted p-3 rounded-lg text-sm">
                <p className="line-clamp-4">{work.prompt}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={handleCopyPrompt}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Скопировано!" : "📋 Копировать"}
              </Button>
            </div>

            <Separator />

            {/* Actions */}
            <div className="space-y-2">
              <Button
                variant={liked ? "default" : "outline"}
                className={cn("w-full gap-2", liked && "bg-red-500 hover:bg-red-600")}
                onClick={handleLike}
              >
                <Heart className={cn("h-4 w-4", liked && "fill-white")} />
                {likesCount} лайков
              </Button>

              <Button
                variant="outline"
                className="w-full gap-2 bg-gradient-to-r from-primary/10 to-pink-500/10 hover:from-primary/20 hover:to-pink-500/20"
                onClick={handleMakeSimilar}
              >
                <Wand2 className="h-4 w-4" />
                🪄 Сделать похожее
              </Button>

              {work.type === "music" && work.result_url && (
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={handleDownload}
                >
                  <Download className="h-4 w-4" />
                  ⬇️ Скачать
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
