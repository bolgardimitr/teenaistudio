import { useState, useRef } from 'react';
import { Music, Play, Pause, Download, Share2, Video, Lock, ChevronDown, ChevronUp, Sparkles, Loader2, HelpCircle } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ModelsHelpModal } from '@/components/studio/ModelsHelpModal';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface MusicModel {
  id: string;
  name: string;
  tier: 'free' | 'basic' | 'premium';
  cost: number;
  description: string;
  freeLimit?: string;
  maxDuration?: number;
}

const musicModels: MusicModel[] = [
  { id: 'suno-v3.5', name: 'Suno V3.5', tier: 'free', cost: 15, description: 'Базовое качество, для начала', freeLimit: '2 бесплатных генерации в день' },
  { id: 'suno-v4', name: 'Suno V4', tier: 'basic', cost: 20, description: 'Улучшенный вокал' },
  { id: 'suno-v4.5', name: 'Suno V4.5', tier: 'basic', cost: 25, description: 'Профессиональное качество' },
  { id: 'suno-v5', name: 'Suno V5', tier: 'premium', cost: 30, description: 'Максимальное качество, до 8 минут', maxDuration: 8 },
];

const genres = [
  'Поп', 'Рок', 'Электроника', 'Хип-хоп', 'Джаз', 'Классика', 'Детская музыка', 'Другое'
];

interface GeneratedTrack {
  id: string;
  title: string;
  variant: number;
  audioUrl: string;
  coverUrl: string;
  lyrics?: string;
  duration: string;
}

export default function MusicStudio() {
  const { profile, user, refreshProfile, role } = useAuth();
  const navigate = useNavigate();
  
  const [selectedModel, setSelectedModel] = useState<string>('suno-v3.5');
  const [mode, setMode] = useState<'simple' | 'advanced'>('simple');
  const [description, setDescription] = useState('');
  const [genre, setGenre] = useState('');
  const [customGenre, setCustomGenre] = useState('');
  const [songTitle, setSongTitle] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [isInstrumental, setIsInstrumental] = useState(false);
  const [duration, setDuration] = useState<'2' | '4'>('2');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedTracks, setGeneratedTracks] = useState<GeneratedTrack[]>([]);
  const [isGeneratingLyrics, setIsGeneratingLyrics] = useState(false);
  
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [expandedLyrics, setExpandedLyrics] = useState<string | null>(null);
  const [showModelsHelp, setShowModelsHelp] = useState(false);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

  const getTierBadge = (tier: 'free' | 'basic' | 'premium') => {
    switch (tier) {
      case 'free':
        return <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">🆓 FREE</span>;
      case 'basic':
        return <span className="text-xs bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded-full">⭐ BASIC</span>;
      case 'premium':
        return <span className="text-xs bg-violet-500/20 text-violet-400 px-2 py-0.5 rounded-full">💎 PREMIUM</span>;
    }
  };

  const canAccessModel = (tier: 'free' | 'basic' | 'premium') => {
    if (!role) return tier === 'free';
    if (role === 'admin' || role === 'premium') return true;
    if (role === 'basic') return tier !== 'premium';
    return tier === 'free';
  };

  const getSelectedModel = () => musicModels.find(m => m.id === selectedModel);

  const calculateCost = () => {
    const model = getSelectedModel();
    return model?.cost || 0;
  };

  const handleGenerateLyrics = async () => {
    if (!description.trim() && !genre) {
      toast.error('Введите описание музыки или выберите жанр');
      return;
    }

    setIsGeneratingLyrics(true);
    
    // Simulate AI lyrics generation
    setTimeout(() => {
      const finalGenre = genre === 'Другое' ? customGenre : genre;
      const sampleLyrics = `[Куплет 1]
${description || finalGenre || 'Музыка'} звучит в моей душе
Мелодия летит всё выше и выше
Каждый звук как волшебство
Наполняет сердце радостью

[Припев]
Это музыка моя
Она ведёт меня
Сквозь облака и звёзды
В мир, где сбываются мечты

[Куплет 2]
Ритм пульсирует в крови
Каждая нота — часть меня
Музыка объединяет нас
В этом прекрасном танце жизни

[Припев]
Это музыка моя
Она ведёт меня
Сквозь облака и звёзды
В мир, где сбываются мечты`;

      setLyrics(sampleLyrics);
      setIsGeneratingLyrics(false);
      toast.success('Текст песни сгенерирован!');
    }, 2000);
  };

  const handleGenerate = async () => {
    if (!description.trim() && mode === 'simple') {
      toast.error('Введите описание музыки');
      return;
    }

    if (mode === 'advanced' && !lyrics.trim() && !isInstrumental) {
      toast.error('Введите текст песни или выберите инструментальный режим');
      return;
    }

    const model = getSelectedModel();
    if (!model) {
      toast.error('Выберите модель');
      return;
    }

    if (!canAccessModel(model.tier)) {
      toast.error('Эта модель недоступна для вашего тарифа');
      return;
    }

    if (!profile || !user) {
      toast.error('Необходимо войти в аккаунт');
      return;
    }

    const cost = calculateCost();
    if (profile.tokens_balance < cost) {
      toast.error(`Недостаточно токенов. Нужно: ${cost}`);
      return;
    }

    if (duration === '4' && model.id !== 'suno-v5') {
      toast.error('Длительность 4 минуты доступна только для Suno V5');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);
    setGeneratedTracks([]);

    try {
      // Create generation record
      const { data: generation, error: genError } = await supabase
        .from('generations')
        .insert({
          user_id: user.id,
          type: 'music',
          model: model.id,
          prompt: mode === 'simple' ? description : `${songTitle}\n\n${lyrics}`,
          tokens_spent: cost,
          status: 'processing',
        })
        .select()
        .single();

      if (genError) throw genError;

      // Deduct tokens
      await supabase
        .from('profiles')
        .update({ tokens_balance: profile.tokens_balance - cost })
        .eq('id', profile.id);

      // Record transaction
      await supabase.from('transactions').insert({
        user_id: user.id,
        amount: -cost,
        type: 'spend',
        description: `Генерация музыки: ${model.name}`,
      });

      // Simulate generation progress
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev >= 95) {
            clearInterval(progressInterval);
            return 95;
          }
          return prev + Math.random() * 15;
        });
      }, 1000);

      // Simulate completion after delay
      setTimeout(async () => {
        clearInterval(progressInterval);
        setGenerationProgress(100);

        // Generate 2 track variants
        const tracks: GeneratedTrack[] = [
          {
            id: `${generation.id}-1`,
            title: songTitle || 'Сгенерированный трек',
            variant: 1,
            audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
            coverUrl: `https://picsum.photos/seed/${generation.id}-1/300/300`,
            lyrics: isInstrumental ? undefined : lyrics || description,
            duration: duration === '2' ? '2:00' : '4:00',
          },
          {
            id: `${generation.id}-2`,
            title: songTitle || 'Сгенерированный трек',
            variant: 2,
            audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
            coverUrl: `https://picsum.photos/seed/${generation.id}-2/300/300`,
            lyrics: isInstrumental ? undefined : lyrics || description,
            duration: duration === '2' ? '2:00' : '4:00',
          },
        ];

        setGeneratedTracks(tracks);

        await supabase
          .from('generations')
          .update({ status: 'completed', result_url: tracks[0].audioUrl })
          .eq('id', generation.id);

        setIsGenerating(false);
        refreshProfile();
        toast.success('Музыка создана! 🎵');
      }, 8000);

    } catch (error) {
      console.error(error);
      toast.error('Ошибка при генерации');
      setIsGenerating(false);
    }
  };

  const togglePlay = (trackId: string, audioUrl: string) => {
    if (playingTrackId === trackId) {
      audioRefs.current[trackId]?.pause();
      setPlayingTrackId(null);
    } else {
      // Pause any currently playing
      if (playingTrackId && audioRefs.current[playingTrackId]) {
        audioRefs.current[playingTrackId].pause();
      }
      
      if (!audioRefs.current[trackId]) {
        audioRefs.current[trackId] = new Audio(audioUrl);
        audioRefs.current[trackId].onended = () => setPlayingTrackId(null);
      }
      
      audioRefs.current[trackId].play();
      setPlayingTrackId(trackId);
    }
  };

  const handleCreateClip = (track: GeneratedTrack) => {
    // Navigate to video studio with pre-filled prompt
    const videoPrompt = `Музыкальный клип для песни "${track.title}". ${description}`;
    navigate(`/video?prompt=${encodeURIComponent(videoPrompt)}`);
  };

  return (
    <AppLayout>
      <div className="flex flex-col lg:flex-row gap-6 h-full">
        {/* Left Panel - Controls */}
        <div className="w-full lg:w-2/5 space-y-6 overflow-y-auto">
          {/* Header */}
          <div className="text-center lg:text-left animate-slide-up">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-studio-music to-blue-400 mb-3">
              <span className="text-3xl">🎵</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap justify-center lg:justify-start">
              <h1 className="text-2xl font-bold gradient-text">Музыкальная Студия</h1>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowModelsHelp(true)}
                className="border-border/50 text-muted-foreground hover:text-foreground"
              >
                <HelpCircle className="w-4 h-4 mr-1" />
                Подсказка по моделям
              </Button>
            </div>
            <p className="text-muted-foreground text-sm mt-1">Создавайте оригинальную музыку с вокалом и без</p>
          </div>

          {/* Model Selection */}
          <div className="glass rounded-2xl p-4 space-y-3 animate-slide-up" style={{ animationDelay: '50ms' }}>
            <h3 className="font-semibold text-foreground">Выбор модели</h3>
            <div className="grid grid-cols-2 gap-2">
              {musicModels.map((model) => {
                const isAccessible = canAccessModel(model.tier);
                const isSelected = selectedModel === model.id;

                return (
                  <button
                    key={model.id}
                    onClick={() => isAccessible && setSelectedModel(model.id)}
                    disabled={!isAccessible}
                    className={cn(
                      "relative p-3 rounded-xl text-left transition-all",
                      isSelected 
                        ? "bg-gradient-to-br from-primary/20 to-secondary/20 border-2 border-primary" 
                        : "bg-muted/30 border border-border/50 hover:border-primary/50",
                      !isAccessible && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {!isAccessible && (
                      <div className="absolute top-2 right-2">
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="space-y-1">
                      <div className="font-medium text-sm text-foreground">{model.name}</div>
                      <div className="flex items-center gap-2">
                        {getTierBadge(model.tier)}
                        <span className="text-xs text-primary font-semibold">{model.cost} токенов</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">{model.description}</p>
                      {model.freeLimit && (
                        <p className="text-xs text-green-400">*{model.freeLimit}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mode Tabs */}
          <div className="glass rounded-2xl p-4 animate-slide-up" style={{ animationDelay: '100ms' }}>
            <Tabs value={mode} onValueChange={(v) => setMode(v as 'simple' | 'advanced')}>
              <TabsList className="w-full bg-muted/50">
                <TabsTrigger value="simple" className="flex-1">Простой</TabsTrigger>
                <TabsTrigger value="advanced" className="flex-1">Расширенный</TabsTrigger>
              </TabsList>

              <TabsContent value="simple" className="mt-4 space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Описание музыки</label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Опишите желаемую музыку: жанр, настроение, инструменты. Например: Весёлая детская песня про лето, поп-музыка, уклеле и синтезатор"
                    className="min-h-[100px] bg-muted/30 border-border/50 rounded-xl resize-none"
                    maxLength={500}
                    disabled={isGenerating}
                  />
                  <div className="text-xs text-muted-foreground text-right mt-1">
                    {description.length}/500
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="advanced" className="mt-4 space-y-4">
                {/* Genre */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Жанр</label>
                  <Select value={genre} onValueChange={setGenre}>
                    <SelectTrigger className="bg-muted/30 border-border/50 rounded-xl">
                      <SelectValue placeholder="Выберите жанр" />
                    </SelectTrigger>
                    <SelectContent>
                      {genres.map((g) => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {genre === 'Другое' && (
                    <Input
                      value={customGenre}
                      onChange={(e) => setCustomGenre(e.target.value)}
                      placeholder="Введите свой жанр"
                      className="mt-2 bg-muted/30 border-border/50 rounded-xl"
                    />
                  )}
                </div>

                {/* Song Title */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Название песни</label>
                  <Input
                    value={songTitle}
                    onChange={(e) => setSongTitle(e.target.value)}
                    placeholder="Введите название"
                    className="bg-muted/30 border-border/50 rounded-xl"
                    disabled={isGenerating}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Описание</label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Опишите настроение, инструменты, стиль..."
                    className="min-h-[60px] bg-muted/30 border-border/50 rounded-xl resize-none"
                    maxLength={500}
                    disabled={isGenerating}
                  />
                </div>

                {/* Lyrics */}
                {!isInstrumental && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-foreground">Текст песни</label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleGenerateLyrics}
                        disabled={isGeneratingLyrics || isGenerating}
                        className="text-xs text-primary hover:text-primary/80"
                      >
                        {isGeneratingLyrics ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Генерация...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3 w-3 mr-1" />
                            Сгенерировать текст AI
                          </>
                        )}
                      </Button>
                    </div>
                    <Textarea
                      value={lyrics}
                      onChange={(e) => setLyrics(e.target.value)}
                      placeholder={`Куплет 1:
...

Припев:
...

Куплет 2:
...`}
                      className="min-h-[150px] bg-muted/30 border-border/50 rounded-xl resize-none font-mono text-sm"
                      disabled={isGenerating}
                    />
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Settings */}
          <div className="glass rounded-2xl p-4 space-y-4 animate-slide-up" style={{ animationDelay: '150ms' }}>
            <h3 className="font-semibold text-foreground">Настройки</h3>

            {/* Instrumental */}
            <div className="flex items-center gap-3">
              <Checkbox
                id="instrumental"
                checked={isInstrumental}
                onCheckedChange={(checked) => setIsInstrumental(checked as boolean)}
                disabled={isGenerating}
              />
              <label htmlFor="instrumental" className="text-sm text-foreground cursor-pointer">
                Инструментальный трек (без вокала)
              </label>
            </div>

            {/* Duration */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Длительность</label>
              <Select value={duration} onValueChange={(v) => setDuration(v as '2' | '4')}>
                <SelectTrigger className="bg-muted/30 border-border/50 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">До 2 минут</SelectItem>
                  <SelectItem value="4" disabled={selectedModel !== 'suno-v5'}>
                    До 4 минут {selectedModel !== 'suno-v5' && '(только V5)'}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Generate Button */}
          <div className="glass rounded-2xl p-4 animate-slide-up" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">Стоимость:</span>
              <span className="text-lg font-bold text-primary">{calculateCost()} токенов</span>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || (!description.trim() && mode === 'simple')}
              className="w-full gradient-primary hover:opacity-90 rounded-xl gap-2 h-12 text-base"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Создаём музыку...
                </>
              ) : (
                <>
                  <Music className="h-5 w-5" />
                  Создать музыку
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Будет создано 2 варианта трека
            </p>
          </div>
        </div>

        {/* Right Panel - Results */}
        <div className="w-full lg:w-3/5">
          <div className="glass rounded-2xl p-6 h-full min-h-[500px] flex flex-col animate-slide-up" style={{ animationDelay: '100ms' }}>
            {isGenerating ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4">
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-studio-music to-blue-400 flex items-center justify-center animate-pulse-glow">
                  <Music className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Создаём вашу музыку...</h3>
                <p className="text-sm text-muted-foreground text-center">
                  Это может занять 1-2 минуты
                </p>
                <div className="w-full max-w-xs">
                  <Progress value={generationProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    {Math.round(generationProgress)}%
                  </p>
                </div>
              </div>
            ) : generatedTracks.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Результаты генерации</h3>
                <div className="grid gap-4">
                  {generatedTracks.map((track) => (
                    <div key={track.id} className="bg-muted/30 rounded-xl p-4 space-y-3">
                      <div className="flex gap-4">
                        {/* Cover */}
                        <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                          <img 
                            src={track.coverUrl} 
                            alt={track.title}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-foreground truncate">
                            {track.title} — Вариант {track.variant}
                          </h4>
                          <p className="text-sm text-muted-foreground">{track.duration}</p>
                          
                          {/* Player Controls */}
                          <div className="flex items-center gap-3 mt-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-10 w-10 rounded-full"
                              onClick={() => togglePlay(track.id, track.audioUrl)}
                            >
                              {playingTrackId === track.id ? (
                                <Pause className="h-5 w-5" />
                              ) : (
                                <Play className="h-5 w-5 ml-0.5" />
                              )}
                            </Button>
                            <div className="flex-1 h-1 bg-muted rounded-full">
                              <div className="h-full w-0 bg-primary rounded-full transition-all" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Lyrics */}
                      {track.lyrics && (
                        <Collapsible 
                          open={expandedLyrics === track.id}
                          onOpenChange={(open) => setExpandedLyrics(open ? track.id : null)}
                        >
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="w-full justify-between">
                              <span className="text-sm">Текст песни</span>
                              {expandedLyrics === track.id ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="bg-muted/50 rounded-lg p-3 mt-2">
                              <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans">
                                {track.lyrics}
                              </pre>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      )}

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" className="rounded-lg gap-1.5">
                          <Download className="h-4 w-4" />
                          Скачать MP3
                        </Button>
                        <Button variant="outline" size="sm" className="rounded-lg gap-1.5">
                          <Share2 className="h-4 w-4" />
                          Опубликовать
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="rounded-lg gap-1.5"
                          onClick={() => handleCreateClip(track)}
                        >
                          <Video className="h-4 w-4" />
                          Создать клип
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
                <div className="h-20 w-20 rounded-2xl bg-muted/50 flex items-center justify-center">
                  <Music className="h-10 w-10 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Здесь появится ваша музыка</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Начните генерацию музыки, чтобы увидеть результаты
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Models Help Modal */}
      <ModelsHelpModal 
        open={showModelsHelp} 
        onOpenChange={setShowModelsHelp} 
        studioType="music" 
      />
    </AppLayout>
  );
}
