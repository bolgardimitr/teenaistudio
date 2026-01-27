import { useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Star, Heart } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Generation } from "./WorkCard";

interface FeaturedSectionProps {
  works: Generation[];
  onWorkClick: (work: Generation) => void;
}

export function FeaturedSection({ works, onWorkClick }: FeaturedSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (works.length === 0) return null;

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 320;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Star className="h-5 w-5 text-primary fill-primary" />
          Выбор редакции
        </h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            className="rounded-full"
            onClick={() => scroll("left")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full"
            onClick={() => scroll("right")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 snap-x snap-mandatory"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {works.map((work) => (
          <Card
            key={work.id}
            className="flex-shrink-0 w-72 overflow-hidden cursor-pointer group hover:shadow-xl transition-all duration-300 snap-start border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent"
            onClick={() => onWorkClick(work)}
          >
            <div className="relative aspect-[4/3] overflow-hidden">
              {work.type === "photo" ? (
                <img
                  src={work.result_url || "/placeholder.svg"}
                  alt={work.prompt}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
              ) : work.type === "video" ? (
                <video
                  src={work.result_url || undefined}
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
                <div className="w-full h-full bg-gradient-to-br from-primary/30 to-pink-500/30 flex items-center justify-center">
                  <span className="text-6xl">🎵</span>
                </div>
              )}
              <div className="absolute top-2 right-2">
                <Star className="h-6 w-6 text-primary fill-primary drop-shadow-lg" />
              </div>
            </div>

            <div className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={work.author?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {work.author?.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium truncate max-w-[120px]">
                    {work.author?.name || "Аноним"}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Heart className="h-4 w-4" />
                  {work.likes_count}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
