import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Image, Video, Music, Layers, MoreVertical, Download, Globe, Lock, Trash2, Heart } from "lucide-react";

interface Generation {
  id: string;
  type: string;
  prompt: string;
  result_url: string | null;
  model: string | null;
  is_public: boolean;
  likes_count: number;
  created_at: string;
}

interface MyWorksSectionProps {
  generations: Generation[];
  onTogglePublic: (id: string, isPublic: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  video: <Video className="w-4 h-4" />,
  photo: <Image className="w-4 h-4" />,
  music: <Music className="w-4 h-4" />,
};

const TYPE_LABELS: Record<string, string> = {
  video: "Видео",
  photo: "Фото",
  music: "Музыка",
};

export function MyWorksSection({ generations, onTogglePublic, onDelete }: MyWorksSectionProps) {
  const [activeTab, setActiveTab] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [filterPublic, setFilterPublic] = useState("all");

  const filteredGenerations = generations
    .filter((g) => {
      if (activeTab !== "all" && g.type !== activeTab) return false;
      if (filterPublic === "public" && !g.is_public) return false;
      if (filterPublic === "private" && g.is_public) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "popular":
          return b.likes_count - a.likes_count;
        default: // newest
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  const counts = {
    all: generations.length,
    video: generations.filter(g => g.type === "video").length,
    photo: generations.filter(g => g.type === "photo").length,
    music: generations.filter(g => g.type === "music").length,
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Мои работы
          </CardTitle>
          <div className="flex gap-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Новые</SelectItem>
                <SelectItem value="oldest">Старые</SelectItem>
                <SelectItem value="popular">Популярные</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPublic} onValueChange={setFilterPublic}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                <SelectItem value="public">Публичные</SelectItem>
                <SelectItem value="private">Приватные</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="all">Все ({counts.all})</TabsTrigger>
            <TabsTrigger value="video">Видео ({counts.video})</TabsTrigger>
            <TabsTrigger value="photo">Фото ({counts.photo})</TabsTrigger>
            <TabsTrigger value="music">Музыка ({counts.music})</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {filteredGenerations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Нет работ для отображения
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredGenerations.map((gen) => (
                  <Card key={gen.id} className="overflow-hidden">
                    {/* Preview */}
                    <div className="aspect-video bg-muted relative">
                      {gen.result_url ? (
                        gen.type === "photo" ? (
                          <img
                            src={gen.result_url}
                            alt={gen.prompt}
                            className="w-full h-full object-cover"
                          />
                        ) : gen.type === "video" ? (
                          <video
                            src={gen.result_url}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Music className="w-12 h-12 text-muted-foreground" />
                          </div>
                        )
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {TYPE_ICONS[gen.type] || <Layers className="w-12 h-12" />}
                        </div>
                      )}

                      {/* Type badge */}
                      <Badge className="absolute top-2 left-2" variant="secondary">
                        {TYPE_ICONS[gen.type]}
                        <span className="ml-1">{TYPE_LABELS[gen.type] || gen.type}</span>
                      </Badge>

                      {/* Public/Private */}
                      <Badge
                        className="absolute top-2 right-2"
                        variant={gen.is_public ? "default" : "outline"}
                      >
                        {gen.is_public ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                      </Badge>
                    </div>

                    <CardContent className="p-3">
                      <p className="text-sm truncate mb-2">{gen.prompt}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {gen.model && <Badge variant="outline" className="text-xs">{gen.model}</Badge>}
                          <span>{new Date(gen.created_at).toLocaleDateString("ru-RU")}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {gen.is_public && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Heart className="w-3 h-3" />
                              {gen.likes_count}
                            </div>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {gen.result_url && (
                                <DropdownMenuItem asChild>
                                  <a href={gen.result_url} download>
                                    <Download className="w-4 h-4 mr-2" />
                                    Скачать
                                  </a>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => onTogglePublic(gen.id, !gen.is_public)}>
                                {gen.is_public ? (
                                  <>
                                    <Lock className="w-4 h-4 mr-2" />
                                    Сделать приватным
                                  </>
                                ) : (
                                  <>
                                    <Globe className="w-4 h-4 mr-2" />
                                    Опубликовать
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => onDelete(gen.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Удалить
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
