import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  AlertTriangle, 
  Clock, 
  Download, 
  Trash2, 
  Copy, 
  List, 
  Grid, 
  Music,
  Image,
  Video,
  Droplet
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Generation {
  id: string;
  type: string;
  model: string | null;
  prompt: string;
  result_url: string | null;
  status: string;
  tokens_spent: number;
  created_at: string;
  is_public: boolean;
}

const modelOptions = [
  'Nano Banana',
  'Midjourney V7',
  '4o Image',
  'Flux Kontext',
  'Veo 3 Fast',
  'Kling 2.5',
  'Suno',
  'Runway Gen-4',
  'Luma Dream Machine',
  'Minimax',
];

export default function HistoryPage() {
  const { user } = useAuth();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [filterModel, setFilterModel] = useState('all');
  const [filterDuration, setFilterDuration] = useState('all');
  const [filterAspect, setFilterAspect] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  useEffect(() => {
    if (user) {
      loadGenerations();
    }
  }, [user, filterType, filterModel]);

  const loadGenerations = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      let query = supabase
        .from('generations')
        .select('*')
        .eq('user_id', user.id)
        .in('type', ['photo', 'video', 'music'])
        .order('created_at', { ascending: false })
        .limit(100);

      if (filterType !== 'all') {
        query = query.eq('type', filterType);
      }

      if (filterModel !== 'all') {
        query = query.eq('model', filterModel);
      }

      const { data, error } = await query;
      if (error) throw error;
      setGenerations(data || []);
    } catch (error) {
      console.error('Error loading generations:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить историю генераций',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatRelativeTime = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diff = now.getTime() - then.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'только что';
    if (minutes < 60) return `${minutes} мин назад`;
    if (hours < 24) return `${hours} ч назад`;
    if (days === 1) return 'вчера';
    if (days < 7) return `${days} дней назад`;
    return then.toLocaleDateString('ru-RU');
  };

  const downloadFile = async (url: string, type: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `generation_${Date.now()}.${type === 'video' ? 'mp4' : type === 'music' ? 'mp3' : 'png'}`;
    link.target = '_blank';
    link.click();
    toast({
      title: 'Скачивание',
      description: 'Файл скачивается...',
    });
  };

  const deleteGeneration = async (id: string) => {
    if (!confirm('Удалить эту генерацию?')) return;

    const { error } = await supabase
      .from('generations')
      .delete()
      .eq('id', id);

    if (!error) {
      setGenerations(prev => prev.filter(g => g.id !== id));
      toast({
        title: 'Удалено',
        description: 'Генерация удалена',
      });
    } else {
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить генерацию',
        variant: 'destructive',
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Скопировано',
      description: 'Промпт скопирован в буфер обмена',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/50">✓ succeeded</Badge>;
      case 'failed':
        return <Badge variant="destructive">✗ failed</Badge>;
      default:
        return <Badge variant="secondary">⏳ pending</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'photo':
        return <Image className="w-12 h-12 text-muted-foreground" />;
      case 'video':
        return <Video className="w-12 h-12 text-muted-foreground" />;
      case 'music':
        return <Music className="w-12 h-12 text-muted-foreground" />;
      default:
        return null;
    }
  };

  return (
    <AppLayout>
      <div className="container py-6 pb-24 md:pb-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold gradient-text">
            История генераций
          </h1>
          <p className="text-muted-foreground mt-2">
            Просмотр и управление вашими задачами генерации видео и фото
          </p>
        </div>

        {/* Storage Warning */}
        <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-yellow-400">
                Предупреждение о политике хранения
              </h3>
              <p className="text-yellow-200/80 text-sm mt-1">
                Медиафайлы (изображения, видео, аудио и т.д.) хранятся в течение <strong>14 дней</strong>, 
                а данные о генерациях — в течение <strong>2 месяцев</strong>.
              </p>
              <p className="text-yellow-200/80 text-sm mt-1">
                Данные, которые не будут сохранены в течение этого периода, будут удалены безвозвратно. 
                Пожалуйста, заранее создайте резервные копии всех важных медиафайлов, скачивая их на свой компьютер.
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6 p-4 bg-card rounded-xl border border-border">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40 bg-muted border-border">
              <SelectValue placeholder="Все типы" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все типы</SelectItem>
              <SelectItem value="photo">📸 Фото</SelectItem>
              <SelectItem value="video">🎬 Видео</SelectItem>
              <SelectItem value="music">🎵 Музыка</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterModel} onValueChange={setFilterModel}>
            <SelectTrigger className="w-44 bg-muted border-border">
              <SelectValue placeholder="Все модели" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все модели</SelectItem>
              {modelOptions.map(model => (
                <SelectItem key={model} value={model}>{model}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterDuration} onValueChange={setFilterDuration}>
            <SelectTrigger className="w-44 bg-muted border-border">
              <SelectValue placeholder="Все длительности" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все длительности</SelectItem>
              <SelectItem value="5">5 секунд</SelectItem>
              <SelectItem value="10">10 секунд</SelectItem>
              <SelectItem value="15">15 секунд</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterAspect} onValueChange={setFilterAspect}>
            <SelectTrigger className="w-44 bg-muted border-border">
              <SelectValue placeholder="Все соотношения" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все соотношения</SelectItem>
              <SelectItem value="1:1">1:1 (Квадрат)</SelectItem>
              <SelectItem value="16:9">16:9 (Горизонт)</SelectItem>
              <SelectItem value="9:16">9:16 (Вертикаль)</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-1 ml-auto">
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('list')}
              className="border-border"
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('grid')}
              className="border-border"
            >
              <Grid className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && generations.length === 0 && (
          <div className="text-center py-20">
            <Clock className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-muted-foreground mb-2">
              История пуста
            </h3>
            <p className="text-muted-foreground mb-4">
              Здесь будут отображаться ваши генерации фото, видео и музыки
            </p>
            <Button asChild className="gradient-primary">
              <Link to="/photo">Создать первую генерацию</Link>
            </Button>
          </div>
        )}

        {/* List View */}
        {!isLoading && generations.length > 0 && viewMode === 'list' && (
          <div className="space-y-4">
            {generations.map((gen) => (
              <div
                key={gen.id}
                className="bg-card border border-border rounded-xl p-4 flex gap-4 hover:border-primary/50 transition-colors"
              >
                {/* Preview */}
                <div className="w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden bg-muted relative group">
                  {gen.type === 'photo' && gen.result_url && (
                    <img
                      src={gen.result_url}
                      alt={gen.prompt}
                      className="w-full h-full object-cover"
                    />
                  )}
                  {gen.type === 'video' && gen.result_url && (
                    <video
                      src={gen.result_url}
                      className="w-full h-full object-cover"
                      muted
                      onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                      onMouseLeave={(e) => {
                        const video = e.target as HTMLVideoElement;
                        video.pause();
                        video.currentTime = 0;
                      }}
                    />
                  )}
                  {gen.type === 'music' && (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                  {!gen.result_url && gen.type !== 'music' && (
                    <div className="w-full h-full flex items-center justify-center">
                      {getTypeIcon(gen.type)}
                    </div>
                  )}

                  {/* Overlay */}
                  {gen.result_url && (
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-white hover:bg-white/20"
                        onClick={() => downloadFile(gen.result_url!, gen.type)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-white hover:bg-white/20"
                        onClick={() => deleteGeneration(gen.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {getStatusBadge(gen.status)}
                    {gen.model && (
                      <Badge variant="outline" className="border-primary text-primary">
                        {gen.model}
                      </Badge>
                    )}
                    <span className="text-muted-foreground text-sm ml-auto">
                      {formatRelativeTime(gen.created_at)}
                    </span>
                  </div>

                  {/* Prompt */}
                  <div className="mb-3">
                    <span className="text-muted-foreground text-xs uppercase tracking-wide">prompt</span>
                    <p className="text-foreground text-sm mt-1 line-clamp-2">
                      {gen.prompt}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(gen.prompt)}
                      className="mt-1 h-6 px-2 text-xs text-muted-foreground"
                    >
                      <Copy className="w-3 h-3 mr-1" /> Копировать
                    </Button>
                  </div>

                  {/* Cost and Actions */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-muted-foreground text-sm">
                      Стоимость: <span className="text-foreground">{gen.tokens_spent} токенов</span>
                    </span>

                    <div className="flex gap-2 flex-wrap">
                      <Button variant="outline" size="sm" className="border-border text-xs">
                        <Image className="w-3 h-3 mr-1" /> Как референс
                      </Button>
                      {gen.type === 'photo' && (
                        <Button variant="outline" size="sm" className="border-border text-xs">
                          <Video className="w-3 h-3 mr-1" /> Видео из фото
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="border-border text-xs">
                        <Droplet className="w-3 h-3 mr-1" /> Водяной знак
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Grid View */}
        {!isLoading && generations.length > 0 && viewMode === 'grid' && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {generations.map((gen) => (
              <div
                key={gen.id}
                className="bg-card border border-border rounded-xl overflow-hidden group cursor-pointer hover:border-primary/50 transition-colors"
              >
                {/* Preview */}
                <div className="aspect-square relative">
                  {gen.type === 'photo' && gen.result_url && (
                    <img src={gen.result_url} alt="" className="w-full h-full object-cover" />
                  )}
                  {gen.type === 'video' && gen.result_url && (
                    <video src={gen.result_url} className="w-full h-full object-cover" muted />
                  )}
                  {gen.type === 'music' && (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <Music className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                  {!gen.result_url && gen.type !== 'music' && (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      {getTypeIcon(gen.type)}
                    </div>
                  )}

                  {/* Badges */}
                  <div className="absolute top-2 left-2 flex gap-1">
                    {gen.model && (
                      <Badge className="bg-black/60 text-xs">{gen.model}</Badge>
                    )}
                  </div>

                  {/* Overlay */}
                  {gen.result_url && (
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-white hover:bg-white/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadFile(gen.result_url!, gen.type);
                        }}
                      >
                        <Download className="w-5 h-5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-white hover:bg-white/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteGeneration(gen.id);
                        }}
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-3">
                  <p className="text-xs text-muted-foreground line-clamp-2">{gen.prompt}</p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-muted-foreground">{gen.tokens_spent} токенов</span>
                    <span className="text-xs text-muted-foreground">{formatRelativeTime(gen.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
