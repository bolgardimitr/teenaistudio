import { useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Video, Camera, Music, MessageCircle, Bot, Send, Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const studioConfig = {
  video: {
    title: 'Видео Студия',
    description: 'Опиши видео, которое хочешь создать',
    icon: Video,
    emoji: '🎬',
    placeholder: 'Например: Космический корабль летит сквозь звёзды...',
    colorClass: 'from-studio-video to-primary',
    tokenCost: 20,
  },
  photo: {
    title: 'Фото Студия',
    description: 'Опиши изображение, которое хочешь создать',
    icon: Camera,
    emoji: '📸',
    placeholder: 'Например: Милый котёнок в очках читает книгу...',
    colorClass: 'from-studio-photo to-secondary',
    tokenCost: 10,
  },
  music: {
    title: 'Музыка Студия',
    description: 'Опиши музыку или мелодию',
    icon: Music,
    emoji: '🎵',
    placeholder: 'Например: Весёлая электронная музыка для игры...',
    colorClass: 'from-studio-music to-blue-400',
    tokenCost: 15,
  },
  text: {
    title: 'Текст AI',
    description: 'Задай любой вопрос AI-помощнику',
    icon: MessageCircle,
    emoji: '💬',
    placeholder: 'Например: Помоги мне написать сочинение про космос...',
    colorClass: 'from-studio-text to-green-400',
    tokenCost: 5,
  },
  agents: {
    title: 'AI Репетиторы',
    description: 'Выбери предмет и начни обучение с AI',
    icon: Bot,
    emoji: '🤖',
    placeholder: 'Например: Объясни мне теорему Пифагора простыми словами...',
    colorClass: 'from-studio-agent to-yellow-400',
    tokenCost: 5,
  },
};

type StudioType = keyof typeof studioConfig;

export default function StudioPage() {
  const { type } = useParams<{ type: string }>();
  const { profile, user, refreshProfile } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  if (!type || !(type in studioConfig)) {
    return <Navigate to="/" replace />;
  }

  const config = studioConfig[type as StudioType];
  const Icon = config.icon;

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Введите описание');
      return;
    }

    if (!profile || !user) {
      toast.error('Необходимо войти в аккаунт');
      return;
    }

    if (profile.tokens_balance < config.tokenCost) {
      toast.error(`Недостаточно токенов. Нужно: ${config.tokenCost}`);
      return;
    }

    setIsGenerating(true);

    try {
      // Create generation record
      const { data: generation, error: genError } = await supabase
        .from('generations')
        .insert({
          user_id: user.id,
          type: type as StudioType,
          prompt: prompt.trim(),
          tokens_spent: config.tokenCost,
          status: 'processing',
        })
        .select()
        .single();

      if (genError) throw genError;

      // Deduct tokens
      await supabase
        .from('profiles')
        .update({ tokens_balance: profile.tokens_balance - config.tokenCost })
        .eq('id', profile.id);

      // Record transaction
      await supabase.from('transactions').insert({
        user_id: user.id,
        amount: -config.tokenCost,
        type: 'spend',
        description: `Генерация ${config.title}`,
      });

      // Simulate processing (in real app, this would call AI API)
      setTimeout(async () => {
        await supabase
          .from('generations')
          .update({ status: 'completed' })
          .eq('id', generation.id);

        toast.success('Генерация завершена! 🎉');
        setIsGenerating(false);
        setPrompt('');
        refreshProfile();
      }, 3000);

    } catch (error) {
      console.error(error);
      toast.error('Ошибка при генерации');
      setIsGenerating(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center animate-slide-up">
          <div className={`inline-flex items-center justify-center h-20 w-20 rounded-3xl bg-gradient-to-br ${config.colorClass} mb-4`}>
            <span className="text-4xl">{config.emoji}</span>
          </div>
          <h1 className="text-3xl font-bold gradient-text">{config.title}</h1>
          <p className="text-muted-foreground mt-2">{config.description}</p>
        </div>

        {/* Input Area */}
        <div className="glass rounded-3xl p-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={config.placeholder}
            className="min-h-[150px] bg-muted/30 border-border/50 rounded-2xl resize-none text-base"
            disabled={isGenerating}
          />

          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Стоимость: <span className="text-primary font-semibold">{config.tokenCost} токенов</span>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="gradient-primary hover:opacity-90 rounded-xl gap-2 px-6"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Генерация...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Создать
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Generation Preview */}
        {isGenerating && (
          <div className="glass rounded-3xl p-8 text-center animate-slide-up">
            <div className={`inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br ${config.colorClass} mb-4 animate-pulse-glow`}>
              <Icon className="h-8 w-8 text-white" />
            </div>
            <p className="text-foreground font-medium">AI работает над твоим запросом...</p>
            <p className="text-sm text-muted-foreground mt-1">Это займёт несколько секунд</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}