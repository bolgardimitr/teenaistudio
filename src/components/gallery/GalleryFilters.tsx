import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Video, Camera, Music, LayoutGrid } from "lucide-react";

export type ContentType = "all" | "video" | "photo" | "music";
export type SortOption = "new" | "popular" | "recommended";

interface GalleryFiltersProps {
  contentType: ContentType;
  sortOption: SortOption;
  onContentTypeChange: (type: ContentType) => void;
  onSortChange: (sort: SortOption) => void;
}

const contentTypes = [
  { value: "all" as ContentType, label: "Все", icon: LayoutGrid },
  { value: "video" as ContentType, label: "🎬 Видео", icon: Video },
  { value: "photo" as ContentType, label: "📸 Фото", icon: Camera },
  { value: "music" as ContentType, label: "🎵 Музыка", icon: Music },
];

export function GalleryFilters({
  contentType,
  sortOption,
  onContentTypeChange,
  onSortChange,
}: GalleryFiltersProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div className="flex flex-wrap gap-2">
        {contentTypes.map((type) => (
          <Button
            key={type.value}
            variant={contentType === type.value ? "default" : "outline"}
            size="sm"
            onClick={() => onContentTypeChange(type.value)}
            className="rounded-full"
          >
            {type.label}
          </Button>
        ))}
      </div>

      <Select value={sortOption} onValueChange={(v) => onSortChange(v as SortOption)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Сортировка" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="new">Новые</SelectItem>
          <SelectItem value="popular">Популярные</SelectItem>
          <SelectItem value="recommended">Рекомендуемые</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
