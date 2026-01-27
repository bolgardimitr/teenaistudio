import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, X, Star, Eye, Image, Video, Music } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface GenerationData {
  id: string;
  user_id: string;
  user_email: string;
  type: string;
  prompt: string;
  result_url: string | null;
  is_public: boolean;
  is_featured: boolean;
  likes_count: number;
  created_at: string;
}

export default function AdminGallery() {
  const { toast } = useToast();
  const [pendingWorks, setPendingWorks] = useState<GenerationData[]>([]);
  const [featuredWorks, setFeaturedWorks] = useState<GenerationData[]>([]);
  const [loading, setLoading] = useState(true);

  const [viewModal, setViewModal] = useState<{
    open: boolean;
    work: GenerationData | null;
  }>({
    open: false,
    work: null,
  });

  useEffect(() => {
    loadWorks();
  }, []);

  const loadWorks = async () => {
    setLoading(true);

    // Load public works (for moderation view)
    const { data: publicData } = await supabase
      .from('generations')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(50);

    const enrichedPublic: GenerationData[] = [];
    for (const gen of publicData || []) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', gen.user_id)
        .single();

      enrichedPublic.push({
        ...gen,
        user_email: profile?.email || 'Unknown',
      });
    }

    setPendingWorks(enrichedPublic.filter(w => !w.is_featured));

    // Load featured
    const { data: featuredData } = await supabase
      .from('generations')
      .select('*')
      .eq('is_featured', true)
      .order('created_at', { ascending: false });

    const enrichedFeatured: GenerationData[] = [];
    for (const gen of featuredData || []) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', gen.user_id)
        .single();

      enrichedFeatured.push({
        ...gen,
        user_email: profile?.email || 'Unknown',
      });
    }

    setFeaturedWorks(enrichedFeatured);
    setLoading(false);
  };

  const handleToggleFeatured = async (work: GenerationData) => {
    const { error } = await supabase
      .from('generations')
      .update({ is_featured: !work.is_featured })
      .eq('id', work.id);

    if (error) {
      toast({ title: 'Ошибка', variant: 'destructive' });
      return;
    }

    toast({ title: work.is_featured ? 'Убрано из Featured' : 'Добавлено в Featured!' });
    loadWorks();
  };

  const handleHide = async (work: GenerationData) => {
    const { error } = await supabase
      .from('generations')
      .update({ is_public: false, is_featured: false })
      .eq('id', work.id);

    if (error) {
      toast({ title: 'Ошибка', variant: 'destructive' });
      return;
    }

    toast({ title: 'Скрыто из галереи' });
    loadWorks();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'music':
        return <Music className="h-4 w-4" />;
      default:
        return <Image className="h-4 w-4" />;
    }
  };

  const WorkCard = ({ work }: { work: GenerationData }) => (
    <Card className="overflow-hidden">
      <div className="aspect-video bg-muted relative">
        {work.result_url ? (
          work.type === 'photo' ? (
            <img 
              src={work.result_url} 
              alt="" 
              className="w-full h-full object-cover"
            />
          ) : work.type === 'video' ? (
            <video 
              src={work.result_url} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl">
              🎵
            </div>
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {getTypeIcon(work.type)}
          </div>
        )}
        <div className="absolute top-2 left-2">
          <Badge variant="secondary" className="gap-1">
            {getTypeIcon(work.type)}
            {work.type}
          </Badge>
        </div>
        {work.is_featured && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-yellow-500 text-black">
              <Star className="h-3 w-3 mr-1" />
              Featured
            </Badge>
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground truncate mb-2">{work.user_email}</p>
        <p className="text-sm line-clamp-2 mb-3">{work.prompt}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            ❤️ {work.likes_count} • {format(new Date(work.created_at), 'dd.MM', { locale: ru })}
          </span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewModal({ open: true, work })}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleToggleFeatured(work)}
              className={work.is_featured ? 'text-yellow-500' : ''}
            >
              <Star className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive"
              onClick={() => handleHide(work)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">🖼 Галерея (модерация)</h1>

      <Tabs defaultValue="public">
        <TabsList>
          <TabsTrigger value="public">Публичные ({pendingWorks.length})</TabsTrigger>
          <TabsTrigger value="featured">Featured ({featuredWorks.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="public" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {pendingWorks.map((work) => (
              <WorkCard key={work.id} work={work} />
            ))}
          </div>
          {pendingWorks.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              Нет публичных работ для модерации
            </div>
          )}
        </TabsContent>

        <TabsContent value="featured" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {featuredWorks.map((work) => (
              <WorkCard key={work.id} work={work} />
            ))}
          </div>
          {featuredWorks.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              Нет избранных работ
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* View Modal */}
      <Dialog open={viewModal.open} onOpenChange={(open) => setViewModal({ ...viewModal, open })}>
        <DialogContent className="max-w-3xl bg-background border-border">
          <DialogHeader>
            <DialogTitle>Просмотр работы</DialogTitle>
          </DialogHeader>
          {viewModal.work && (
            <div className="space-y-4">
              {viewModal.work.result_url && (
                <div className="rounded-lg overflow-hidden bg-muted">
                  {viewModal.work.type === 'photo' && (
                    <img 
                      src={viewModal.work.result_url} 
                      alt="" 
                      className="max-w-full mx-auto"
                    />
                  )}
                  {viewModal.work.type === 'video' && (
                    <video 
                      src={viewModal.work.result_url} 
                      controls 
                      className="max-w-full mx-auto"
                    />
                  )}
                  {viewModal.work.type === 'music' && (
                    <audio 
                      src={viewModal.work.result_url} 
                      controls 
                      className="w-full"
                    />
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Автор:</p>
                  <p className="font-medium">{viewModal.work.user_email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Лайки:</p>
                  <p className="font-medium">{viewModal.work.likes_count}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Промпт:</p>
                <p className="p-3 rounded-lg bg-muted/30 text-sm">
                  {viewModal.work.prompt}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant={viewModal.work.is_featured ? 'secondary' : 'default'}
                  onClick={() => {
                    handleToggleFeatured(viewModal.work!);
                    setViewModal({ open: false, work: null });
                  }}
                >
                  <Star className="h-4 w-4 mr-2" />
                  {viewModal.work.is_featured ? 'Убрать из Featured' : 'Добавить в Featured'}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    handleHide(viewModal.work!);
                    setViewModal({ open: false, work: null });
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Скрыть из галереи
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
