import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { GalleryHeader } from "@/components/gallery/GalleryHeader";
import { GalleryFilters, type ContentType, type SortOption } from "@/components/gallery/GalleryFilters";
import { FeaturedSection } from "@/components/gallery/FeaturedSection";
import { WorkCard, type Generation } from "@/components/gallery/WorkCard";
import { WorkModal } from "@/components/gallery/WorkModal";

const ITEMS_PER_PAGE = 20;

export default function GalleryPage() {
  const { user } = useAuth();
  const [works, setWorks] = useState<Generation[]>([]);
  const [featuredWorks, setFeaturedWorks] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [contentType, setContentType] = useState<ContentType>("all");
  const [sortOption, setSortOption] = useState<SortOption>("new");

  const [selectedWork, setSelectedWork] = useState<Generation | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [likingIds, setLikingIds] = useState<Set<string>>(new Set());

  // Fetch user's likes
  useEffect(() => {
    if (!user) return;

    const fetchUserLikes = async () => {
      const { data } = await supabase
        .from("likes")
        .select("generation_id")
        .eq("user_id", user.id);

      if (data) {
        setUserLikes(new Set(data.map((l) => l.generation_id)));
      }
    };

    fetchUserLikes();
  }, [user]);

  // Fetch featured works
  useEffect(() => {
    const fetchFeatured = async () => {
      const { data } = await supabase
        .from("generations")
        .select("*")
        .eq("is_public", true)
        .eq("is_featured", true)
        .order("likes_count", { ascending: false })
        .limit(10);

      if (data) {
        const worksWithAuthors = await enrichWithAuthors(data);
        setFeaturedWorks(worksWithAuthors);
      }
    };

    fetchFeatured();
  }, []);

  const enrichWithAuthors = async (generations: any[]): Promise<Generation[]> => {
    const userIds = [...new Set(generations.map((g) => g.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, avatar_url")
      .in("id", userIds);

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

    return generations.map((g) => ({
      ...g,
      author: profileMap.get(g.user_id) || null,
      is_liked: userLikes.has(g.id),
    }));
  };

  const fetchWorks = useCallback(
    async (pageNum: number, append = false) => {
      if (pageNum === 0) setLoading(true);
      else setLoadingMore(true);

      try {
        let query = supabase
          .from("generations")
          .select("*")
          .eq("is_public", true)
          .neq("result_url", null);

        // Content type filter
        if (contentType !== "all") {
          query = query.eq("type", contentType);
        }

        // Search filter
        if (searchQuery.trim()) {
          query = query.ilike("prompt", `%${searchQuery.trim()}%`);
        }

        // Sort
        if (sortOption === "new") {
          query = query.order("created_at", { ascending: false });
        } else if (sortOption === "popular") {
          query = query.order("likes_count", { ascending: false });
        } else {
          // Recommended: mix of recent and popular
          query = query
            .order("likes_count", { ascending: false })
            .order("created_at", { ascending: false });
        }

        // Pagination
        query = query.range(
          pageNum * ITEMS_PER_PAGE,
          (pageNum + 1) * ITEMS_PER_PAGE - 1
        );

        const { data, error } = await query;

        if (error) throw error;

        if (data) {
          const worksWithAuthors = await enrichWithAuthors(data);

          if (append) {
            setWorks((prev) => [...prev, ...worksWithAuthors]);
          } else {
            setWorks(worksWithAuthors);
          }

          setHasMore(data.length === ITEMS_PER_PAGE);
        }
      } catch (error) {
        console.error("Error fetching works:", error);
        toast({
          title: "Ошибка загрузки",
          description: "Не удалось загрузить работы",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [contentType, searchQuery, sortOption, userLikes]
  );

  // Initial fetch and refetch on filter change
  useEffect(() => {
    setPage(0);
    fetchWorks(0);
  }, [contentType, sortOption, searchQuery]);

  // Update works with like status when userLikes changes
  useEffect(() => {
    setWorks((prev) =>
      prev.map((w) => ({ ...w, is_liked: userLikes.has(w.id) }))
    );
    setFeaturedWorks((prev) =>
      prev.map((w) => ({ ...w, is_liked: userLikes.has(w.id) }))
    );
  }, [userLikes]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchWorks(nextPage, true);
  };

  const handleLike = async (generationId: string) => {
    if (!user) {
      toast({
        title: "Необходима авторизация",
        description: "Войдите, чтобы ставить лайки",
        variant: "destructive",
      });
      return;
    }

    if (likingIds.has(generationId)) return;

    setLikingIds((prev) => new Set(prev).add(generationId));

    const isLiked = userLikes.has(generationId);

    try {
      if (isLiked) {
        // Remove like
        await supabase
          .from("likes")
          .delete()
          .eq("user_id", user.id)
          .eq("generation_id", generationId);

        setUserLikes((prev) => {
          const next = new Set(prev);
          next.delete(generationId);
          return next;
        });
      } else {
        // Add like
        await supabase.from("likes").insert({
          user_id: user.id,
          generation_id: generationId,
        });

        setUserLikes((prev) => new Set(prev).add(generationId));
      }

      // Update local state
      const updateLikeCount = (items: Generation[]) =>
        items.map((w) =>
          w.id === generationId
            ? {
                ...w,
                likes_count: isLiked
                  ? Math.max(0, w.likes_count - 1)
                  : w.likes_count + 1,
                is_liked: !isLiked,
              }
            : w
        );

      setWorks(updateLikeCount);
      setFeaturedWorks(updateLikeCount);
      
      if (selectedWork?.id === generationId) {
        setSelectedWork((prev) =>
          prev
            ? {
                ...prev,
                likes_count: isLiked
                  ? Math.max(0, prev.likes_count - 1)
                  : prev.likes_count + 1,
                is_liked: !isLiked,
              }
            : null
        );
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить лайк",
        variant: "destructive",
      });
    } finally {
      setLikingIds((prev) => {
        const next = new Set(prev);
        next.delete(generationId);
        return next;
      });
    }
  };

  const handleWorkClick = (work: Generation) => {
    setSelectedWork(work);
    setModalOpen(true);
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <GalleryHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <GalleryFilters
          contentType={contentType}
          sortOption={sortOption}
          onContentTypeChange={(type) => {
            setContentType(type);
            setPage(0);
          }}
          onSortChange={(sort) => {
            setSortOption(sort);
            setPage(0);
          }}
        />

        <FeaturedSection works={featuredWorks} onWorkClick={handleWorkClick} />

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-square rounded-xl" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            ))}
          </div>
        ) : works.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">🖼</p>
            <h3 className="text-xl font-semibold mb-2">Пока нет работ</h3>
            <p className="text-muted-foreground">
              Станьте первым, кто опубликует свою работу!
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {works.map((work) => (
                <WorkCard
                  key={work.id}
                  work={work}
                  onLike={handleLike}
                  onClick={() => handleWorkClick(work)}
                  isLiking={likingIds.has(work.id)}
                />
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-8">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Загрузка...
                    </>
                  ) : (
                    "Загрузить ещё"
                  )}
                </Button>
              </div>
            )}
          </>
        )}

        <WorkModal
          work={selectedWork}
          open={modalOpen}
          onOpenChange={setModalOpen}
          onLike={handleLike}
          isAuthenticated={!!user}
        />
      </div>
    </AppLayout>
  );
}
