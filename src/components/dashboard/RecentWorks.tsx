import { useEffect, useState } from 'react';
import { Video, Camera, Music, MessageCircle, Bot, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Generation {
  id: string;
  type: 'video' | 'photo' | 'music' | 'text' | 'agent';
  prompt: string;
  result_url: string | null;
  status: string;
  created_at: string;
}

const typeIcons = {
  video: Video,
  photo: Camera,
  music: Music,
  text: MessageCircle,
  agent: Bot,
};

const typeLabels = {
  video: 'Видео',
  photo: 'Фото',
  music: 'Музыка',
  text: 'Текст',
  agent: 'Агент',
};

const typeColors = {
  video: 'from-studio-video to-primary',
  photo: 'from-studio-photo to-secondary',
  music: 'from-studio-music to-blue-400',
  text: 'from-studio-text to-green-400',
  agent: 'from-studio-agent to-yellow-400',
};

export function RecentWorks() {
  const { user } = useAuth();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchGenerations = async () => {
      const { data } = await supabase
        .from('generations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(4);

      if (data) {
        setGenerations(data as Generation[]);
      }
      setLoading(false);
    };

    fetchGenerations();
  }, [user]);

  if (loading) {
    return (
      <div className="animate-slide-up" style={{ animationDelay: '400ms' }}>
        <h2 className="text-xl font-semibold mb-4">Последние работы</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="aspect-square rounded-2xl bg-card animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (generations.length === 0) {
    return (
      <div className="animate-slide-up" style={{ animationDelay: '400ms' }}>
        <h2 className="text-xl font-semibold mb-4">Последние работы</h2>
        <div className="rounded-2xl bg-card border border-border/50 p-8 text-center">
          <p className="text-muted-foreground mb-2">У вас пока нет работ</p>
          <p className="text-sm text-muted-foreground/70">
            Начните создавать контент с помощью наших AI-инструментов!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up" style={{ animationDelay: '400ms' }}>
      <h2 className="text-xl font-semibold mb-4">Последние работы</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {generations.map((gen) => {
          const Icon = typeIcons[gen.type];
          
          return (
            <div
              key={gen.id}
              className="group relative aspect-square rounded-2xl bg-card border border-border/50 overflow-hidden transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
            >
              {gen.result_url ? (
                <img
                  src={gen.result_url}
                  alt={gen.prompt}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className={`w-full h-full bg-gradient-to-br ${typeColors[gen.type]} opacity-20 flex items-center justify-center`}>
                  <Icon className="h-12 w-12 text-foreground/50" />
                </div>
              )}
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full bg-gradient-to-r ${typeColors[gen.type]} text-white`}>
                      {typeLabels[gen.type]}
                    </span>
                  </div>
                  <p className="text-white text-xs line-clamp-2">{gen.prompt}</p>
                  <div className="flex items-center gap-1 mt-1 text-white/60 text-[10px]">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(gen.created_at), { addSuffix: true, locale: ru })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}