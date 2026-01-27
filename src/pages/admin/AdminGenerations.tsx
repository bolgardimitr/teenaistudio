import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MoreHorizontal, Eye, Globe, Star, Trash2, Video, Camera, Music, MessageCircle, Bot } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface GenerationData {
  id: string;
  user_id: string;
  user_email: string;
  type: string;
  model: string | null;
  prompt: string;
  result_url: string | null;
  tokens_spent: number;
  status: string;
  is_public: boolean;
  is_featured: boolean;
  created_at: string;
}

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  video: Video,
  photo: Camera,
  music: Music,
  text: MessageCircle,
  agent: Bot,
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  completed: 'bg-green-500/20 text-green-400',
  failed: 'bg-red-500/20 text-red-400',
};

export default function AdminGenerations() {
  const { toast } = useToast();
  const [generations, setGenerations] = useState<GenerationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<string>('all');

  const [viewModal, setViewModal] = useState<{
    open: boolean;
    generation: GenerationData | null;
  }>({
    open: false,
    generation: null,
  });

  useEffect(() => {
    loadGenerations();
  }, [typeFilter, statusFilter, periodFilter]);

  const loadGenerations = async () => {
    setLoading(true);

    let query = supabase
      .from('generations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (typeFilter !== 'all') {
      query = query.eq('type', typeFilter);
    }

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    if (periodFilter !== 'all') {
      const now = new Date();
      let startDate: Date;
      
      switch (periodFilter) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0);
      }
      
      query = query.gte('created_at', startDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      toast({ title: 'Ошибка загрузки', variant: 'destructive' });
      setLoading(false);
      return;
    }

    // Enrich with user emails
    const enriched: GenerationData[] = [];
    for (const gen of data || []) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', gen.user_id)
        .single();

      enriched.push({
        ...gen,
        user_email: profile?.email || 'Unknown',
      });
    }

    setGenerations(enriched);
    setLoading(false);
  };

  const handleTogglePublic = async (gen: GenerationData) => {
    const { error } = await supabase
      .from('generations')
      .update({ is_public: !gen.is_public })
      .eq('id', gen.id);

    if (error) {
      toast({ title: 'Ошибка', variant: 'destructive' });
      return;
    }

    toast({ title: gen.is_public ? 'Скрыто из галереи' : 'Опубликовано!' });
    loadGenerations();
  };

  const handleToggleFeatured = async (gen: GenerationData) => {
    const { error } = await supabase
      .from('generations')
      .update({ is_featured: !gen.is_featured })
      .eq('id', gen.id);

    if (error) {
      toast({ title: 'Ошибка', variant: 'destructive' });
      return;
    }

    toast({ title: gen.is_featured ? 'Убрано из Featured' : 'Добавлено в Featured!' });
    loadGenerations();
  };

  const handleDelete = async (gen: GenerationData) => {
    const { error } = await supabase
      .from('generations')
      .delete()
      .eq('id', gen.id);

    if (error) {
      toast({ title: 'Ошибка удаления', variant: 'destructive' });
      return;
    }

    toast({ title: 'Удалено' });
    loadGenerations();
  };

  const TypeIcon = ({ type }: { type: string }) => {
    const Icon = TYPE_ICONS[type] || Camera;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">🎨 Генерации</h1>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Тип" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все типы</SelectItem>
                <SelectItem value="video">Видео</SelectItem>
                <SelectItem value="photo">Фото</SelectItem>
                <SelectItem value="music">Музыка</SelectItem>
                <SelectItem value="text">Текст</SelectItem>
                <SelectItem value="agent">Агенты</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Период" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Всё время</SelectItem>
                <SelectItem value="today">Сегодня</SelectItem>
                <SelectItem value="week">Неделя</SelectItem>
                <SelectItem value="month">Месяц</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Generations Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Тип</TableHead>
                  <TableHead>Пользователь</TableHead>
                  <TableHead>Модель</TableHead>
                  <TableHead className="text-right">Токены</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Публичное</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {generations.map((gen) => (
                  <TableRow key={gen.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <TypeIcon type={gen.type} />
                        <span className="capitalize">{gen.type}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {gen.user_email}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {gen.model || '-'}
                    </TableCell>
                    <TableCell className="text-right">{gen.tokens_spent}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[gen.status] || STATUS_COLORS.pending}>
                        {gen.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {gen.is_public && <Globe className="h-4 w-4 text-green-500" />}
                        {gen.is_featured && <Star className="h-4 w-4 text-yellow-500" />}
                        {!gen.is_public && !gen.is_featured && '-'}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(gen.created_at), 'dd.MM HH:mm', { locale: ru })}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover border-border">
                          <DropdownMenuItem onClick={() => setViewModal({ open: true, generation: gen })}>
                            <Eye className="h-4 w-4 mr-2" />
                            Просмотреть
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleTogglePublic(gen)}>
                            <Globe className="h-4 w-4 mr-2" />
                            {gen.is_public ? 'Скрыть' : 'Опубликовать'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleFeatured(gen)}>
                            <Star className="h-4 w-4 mr-2" />
                            {gen.is_featured ? 'Убрать из Featured' : 'В Featured'}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => handleDelete(gen)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Удалить
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Modal */}
      <Dialog open={viewModal.open} onOpenChange={(open) => setViewModal({ ...viewModal, open })}>
        <DialogContent className="max-w-2xl bg-background border-border">
          <DialogHeader>
            <DialogTitle>Просмотр генерации</DialogTitle>
          </DialogHeader>
          {viewModal.generation && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Тип:</p>
                  <p className="font-medium capitalize">{viewModal.generation.type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Модель:</p>
                  <p className="font-medium">{viewModal.generation.model || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Пользователь:</p>
                  <p className="font-medium">{viewModal.generation.user_email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Токены:</p>
                  <p className="font-medium">{viewModal.generation.tokens_spent}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Промпт:</p>
                <p className="p-3 rounded-lg bg-muted/30 text-sm">
                  {viewModal.generation.prompt}
                </p>
              </div>

              {viewModal.generation.result_url && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Результат:</p>
                  {viewModal.generation.type === 'photo' && (
                    <img 
                      src={viewModal.generation.result_url} 
                      alt="Result" 
                      className="max-w-full rounded-lg"
                    />
                  )}
                  {viewModal.generation.type === 'video' && (
                    <video 
                      src={viewModal.generation.result_url} 
                      controls 
                      className="max-w-full rounded-lg"
                    />
                  )}
                  {viewModal.generation.type === 'music' && (
                    <audio 
                      src={viewModal.generation.result_url} 
                      controls 
                      className="w-full"
                    />
                  )}
                  {!['photo', 'video', 'music'].includes(viewModal.generation.type) && (
                    <a 
                      href={viewModal.generation.result_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {viewModal.generation.result_url}
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
