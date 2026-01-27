import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface GalleryHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function GalleryHeader({ searchQuery, onSearchChange }: GalleryHeaderProps) {
  return (
    <div className="text-center space-y-4 mb-8">
      <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent">
        🖼 Галерея TEEN.AI
      </h1>
      <p className="text-muted-foreground text-lg">
        Лучшие работы наших учеников
      </p>
      <div className="relative max-w-md mx-auto">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск по описанию или автору..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>
    </div>
  );
}
