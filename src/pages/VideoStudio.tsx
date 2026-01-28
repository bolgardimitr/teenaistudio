import { useState, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Video, Upload, X, Download, Share2, RefreshCw, 
  Sparkles, History, Wand2, Lock, Play, Loader2 
} from 'lucide-react';

interface VideoModel {
  id: string;
  name: string;
  badge: 'free' | 'basic' | 'premium';
  badgeLabel: string;
  cost: number;
  description: string;
  requiredRole: 'free' | 'basic' | 'premium';
  category: string;
}

const videoModels: VideoModel[] = [
  // Бесплатные
  {
    id: 'luma-dream',
    name: 'Luma Dream Machine',
    badge: 'free',
    badgeLabel: '🆓 FREE - 3/день',
    cost: 0,
    description: 'Быстрая генерация для начинающих',
    requiredRole: 'free',
    category: 'Бесплатные',
  },
  {
    id: 'seedance-lite',
    name: 'Seedance V1 Lite',
    badge: 'free',
    badgeLabel: '🆓 FREE - 5/день',
    cost: 0,
    description: 'Облегчённая бесплатная версия',
    requiredRole: 'free',
    category: 'Бесплатные',
  },
  // OpenAI Sora
  {
    id: 'sora-2',
    name: 'Sora 2',
    badge: 'basic',
    badgeLabel: '⭐ 50 токенов',
    cost: 50,
    description: 'Базовая модель OpenAI для видео',
    requiredRole: 'basic',
    category: 'OpenAI Sora',
  },
  {
    id: 'sora-2-pro',
    name: 'Sora 2 Pro',
    badge: 'premium',
    badgeLabel: '💎 80 токенов',
    cost: 80,
    description: 'Продвинутая версия с улучшенным качеством',
    requiredRole: 'premium',
    category: 'OpenAI Sora',
  },
  {
    id: 'sora-2-pro-story',
    name: 'Sora 2 Pro Story',
    badge: 'premium',
    badgeLabel: '💎 100 токенов',
    cost: 100,
    description: 'Создание многосценарных историй',
    requiredRole: 'premium',
    category: 'OpenAI Sora',
  },
  {
    id: 'sora-watermark-remover',
    name: 'Sora Watermark Remover',
    badge: 'basic',
    badgeLabel: '⭐ 30 токенов',
    cost: 30,
    description: 'Удаление водяных знаков с видео',
    requiredRole: 'basic',
    category: 'OpenAI Sora',
  },
  // Google Veo
  {
    id: 'veo3-fast',
    name: 'Veo 3 Fast',
    badge: 'basic',
    badgeLabel: '⭐ 80 токенов',
    cost: 80,
    description: 'Google DeepMind, быстрая генерация',
    requiredRole: 'basic',
    category: 'Google Veo',
  },
  {
    id: 'veo3-quality',
    name: 'Veo 3.1 Quality',
    badge: 'premium',
    badgeLabel: '💎 400 токенов',
    cost: 400,
    description: 'Максимальное качество от Google',
    requiredRole: 'premium',
    category: 'Google Veo',
  },
  // Kling
  {
    id: 'kling-turbo',
    name: 'Kling 2.5 Turbo',
    badge: 'basic',
    badgeLabel: '⭐ 70 токенов',
    cost: 70,
    description: 'Отличное качество, популярный выбор',
    requiredRole: 'basic',
    category: 'Kling',
  },
  {
    id: 'kling-2-6',
    name: 'Kling 2.6',
    badge: 'basic',
    badgeLabel: '⭐ 60 токенов',
    cost: 60,
    description: 'Обновлённая версия Kling',
    requiredRole: 'basic',
    category: 'Kling',
  },
  {
    id: 'kling-motion-control',
    name: 'Kling 2.6 Motion Control',
    badge: 'premium',
    badgeLabel: '💎 90 токенов',
    cost: 90,
    description: 'Продвинутый контроль движений камеры',
    requiredRole: 'premium',
    category: 'Kling',
  },
  // Seedance
  {
    id: 'seedance-pro',
    name: 'Seedance 1.5 Pro',
    badge: 'premium',
    badgeLabel: '💎 120 токенов',
    cost: 120,
    description: 'Кинематографичное видео со звуком',
    requiredRole: 'premium',
    category: 'Seedance',
  },
  {
    id: 'seedance-pro-fast',
    name: 'Seedance Pro Fast',
    badge: 'basic',
    badgeLabel: '⭐ 80 токенов',
    cost: 80,
    description: 'Быстрая версия Seedance',
    requiredRole: 'basic',
    category: 'Seedance',
  },
  // Wan Animate
  {
    id: 'wan-animate-move',
    name: 'Wan Animate Move',
    badge: 'basic',
    badgeLabel: '⭐ 40 токенов',
    cost: 40,
    description: 'Анимация движений персонажей',
    requiredRole: 'basic',
    category: 'Wan Animate',
  },
  {
    id: 'wan-animate-replace',
    name: 'Wan Animate Replace',
    badge: 'basic',
    badgeLabel: '⭐ 45 токенов',
    cost: 45,
    description: 'Замена элементов в анимации',
    requiredRole: 'basic',
    category: 'Wan Animate',
  },
  // Другие
  {
    id: 'runway-aleph',
    name: 'Runway Aleph',
    badge: 'premium',
    badgeLabel: '💎 100 токенов',
    cost: 100,
    description: 'Продвинутое редактирование сцен',
    requiredRole: 'premium',
    category: 'Другие',
  },
];

const modelCategories = ['Бесплатные', 'OpenAI Sora', 'Google Veo', 'Kling', 'Seedance', 'Wan Animate', 'Другие'];

const aspectRatios = [
  { value: '9:16', label: '9:16 (Вертикальное — TikTok, Reels)' },
  { value: '16:9', label: '16:9 (Горизонтальное — YouTube)' },
  { value: '1:1', label: '1:1 (Квадратное)' },
];

const durations = [
  { value: '5', label: '5 секунд' },
  { value: '8', label: '8 секунд (рекомендуется)' },
  { value: '10', label: '10 секунд' },
];

const roleHierarchy = { free: 0, basic: 1, premium: 2, admin: 3 };

export default function VideoStudio() {
  const { profile, user, role, refreshProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedModel, setSelectedModel] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('videoStudio_selectedModel') || '';
    }
    return '';
  });
  const [prompt, setPrompt] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [duration, setDuration] = useState('8');
  const [removeWatermark, setRemoveWatermark] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedVideo, setGeneratedVideo] = useState<{
    url: string;
    model: string;
    prompt: string;
    tokensSpent: number;
  } | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const userRoleLevel = roleHierarchy[role || 'free'];

  const handleSelectModel = (modelId: string) => {
    setSelectedModel(modelId);
    localStorage.setItem('videoStudio_selectedModel', modelId);
  };

  const canAccessModel = (model: VideoModel) => {
    return userRoleLevel >= roleHierarchy[model.requiredRole];
  };

  const getModelCost = (modelId: string) => {
    const model = videoModels.find(m => m.id === modelId);
    if (!model) return 0;
    return model.cost;
  };

  const getTotalCost = () => {
    const baseCost = getModelCost(selectedModel);
    const watermarkCost = removeWatermark ? 10 : 0;
    return baseCost + watermarkCost;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Файл слишком большой. Максимум 10 МБ');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Файл слишком большой. Максимум 10 МБ');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!selectedModel) {
      toast.error('Выберите модель для генерации');
      return;
    }

    if (prompt.length < 10) {
      toast.error('Промпт должен содержать минимум 10 символов');
      return;
    }

    const model = videoModels.find(m => m.id === selectedModel);
    if (!model || !canAccessModel(model)) {
      toast.error('У вас нет доступа к этой модели');
      return;
    }

    const totalCost = getTotalCost();
    if (profile && profile.tokens_balance < totalCost) {
      toast.error(`Недостаточно токенов. Нужно: ${totalCost}, у вас: ${profile.tokens_balance}`);
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);
    setGeneratedVideo(null);
    setGenerationError(null);

    // Start progress animation
    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 5;
      });
    }, 2000);

    try {
      // Create generation record
      const { data: generation, error: genError } = await supabase
        .from('generations')
        .insert({
          user_id: user!.id,
          type: 'video',
          model: selectedModel,
          prompt: prompt.trim(),
          tokens_spent: totalCost,
          status: 'processing',
        })
        .select()
        .single();

      if (genError) throw genError;

      // Call the edge function
      const { data, error } = await supabase.functions.invoke('generate-video', {
        body: {
          prompt: prompt.trim(),
          model: selectedModel,
          aspectRatio: aspectRatio,
          duration: duration,
          referenceImage: uploadedImage,
          removeWatermark: removeWatermark,
        },
      });

      clearInterval(progressInterval);

      if (error) {
        throw new Error(error.message || 'Ошибка вызова функции генерации');
      }

      if (!data.success) {
        throw new Error(data.error || 'Генерация видео не удалась');
      }

      setGenerationProgress(100);

      // Get the video URL from response
      const videoUrl = data.video_url;
      
      if (!videoUrl) {
        throw new Error('Не получен URL видео');
      }

      // Update generation with result
      await supabase
        .from('generations')
        .update({ 
          status: 'completed',
          result_url: videoUrl,
        })
        .eq('id', generation.id);

      // Deduct tokens
      await supabase
        .from('profiles')
        .update({ tokens_balance: profile!.tokens_balance - totalCost })
        .eq('id', profile!.id);

      // Record transaction
      await supabase.from('transactions').insert({
        user_id: user!.id,
        amount: -totalCost,
        type: 'spend',
        description: `Генерация видео: ${model.name}`,
      });

      setGeneratedVideo({
        url: videoUrl,
        model: model.name,
        prompt: prompt,
        tokensSpent: totalCost,
      });

      await refreshProfile();
      toast.success('Видео успешно создано! 🎬');

    } catch (error) {
      clearInterval(progressInterval);
      console.error('Video generation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при генерации видео';
      setGenerationError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublishToGallery = async () => {
    if (!generatedVideo) return;
    toast.success('Видео опубликовано в галерею! 📤');
  };

  const resetGeneration = () => {
    setGeneratedVideo(null);
    setGenerationProgress(0);
  };

  return (
    <AppLayout>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 min-h-[calc(100vh-10rem)]">
        {/* Left Panel - Controls */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div className="animate-slide-up">
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <span>🎬</span>
              <span className="gradient-text">Видео Студия</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              Создавайте видео с озвучкой из текста и изображений
            </p>
          </div>

          {/* Model Selection */}
          <div className="glass rounded-2xl p-4 animate-slide-up" style={{ animationDelay: '50ms' }}>
            <h3 className="font-semibold mb-3">Выбор модели</h3>
            <div className="max-h-[400px] overflow-y-auto pr-1 space-y-4 custom-scrollbar">
              {modelCategories.map((category) => {
                const categoryModels = videoModels.filter(m => m.category === category);
                if (categoryModels.length === 0) return null;
                
                return (
                  <div key={category}>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                      {category}
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {categoryModels.map((model) => {
                        const isAccessible = canAccessModel(model);
                        const isSelected = selectedModel === model.id;

                        return (
                          <button
                            key={model.id}
                            onClick={() => isAccessible && handleSelectModel(model.id)}
                            disabled={!isAccessible}
                            className={`relative p-2.5 rounded-xl text-left transition-all duration-200 ${
                              isSelected
                                ? 'bg-gradient-to-br from-primary/20 to-secondary/20 border-2 border-primary'
                                : isAccessible
                                ? 'bg-muted/30 border border-border/50 hover:border-primary/50'
                                : 'bg-muted/20 border border-border/30 opacity-60 cursor-not-allowed'
                            }`}
                          >
                            {!isAccessible && (
                              <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] rounded-xl flex items-center justify-center">
                                <Lock className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex items-start justify-between gap-1">
                              <span className="font-medium text-xs line-clamp-1">{model.name}</span>
                            </div>
                            <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded-full mt-1 ${
                              model.badge === 'free' 
                                ? 'bg-green-500/20 text-green-400'
                                : model.badge === 'basic'
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-primary/20 text-primary'
                            }`}>
                              {model.badgeLabel}
                            </span>
                            <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1">
                              {model.description}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Prompt */}
          <div className="glass rounded-2xl p-4 animate-slide-up" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Промпт</h3>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Тренды
                </Button>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                  <History className="h-3 w-3 mr-1" />
                  История
                </Button>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                  <Wand2 className="h-3 w-3 mr-1" />
                  Улучшить
                </Button>
              </div>
            </div>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Опишите видео, которое хотите создать. Например: Девочка рисует картину, камера плавно приближается, яркие краски..."
              className="min-h-[100px] bg-muted/30 border-border/50 rounded-xl resize-none"
              disabled={isGenerating}
            />
            <div className="text-right text-xs text-muted-foreground mt-1">
              {prompt.length} символов
            </div>
          </div>

          {/* Image Upload */}
          <div className="glass rounded-2xl p-4 animate-slide-up" style={{ animationDelay: '150ms' }}>
            <h3 className="font-semibold mb-3">Изображение (опционально)</h3>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            {uploadedImage ? (
              <div className="relative">
                <img
                  src={uploadedImage}
                  alt="Uploaded"
                  className="w-full h-32 object-cover rounded-xl"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7"
                  onClick={() => setUploadedImage(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border/50 rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              >
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Перетащите или нажмите для загрузки
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Загрузите изображение для анимации (image-to-video)
                </p>
              </div>
            )}
          </div>

          {/* Settings */}
          <div className="glass rounded-2xl p-4 animate-slide-up" style={{ animationDelay: '200ms' }}>
            <h3 className="font-semibold mb-3">Настройки</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">
                  Соотношение сторон
                </label>
                <Select value={aspectRatio} onValueChange={setAspectRatio}>
                  <SelectTrigger className="bg-muted/30 border-border/50 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {aspectRatios.map((ratio) => (
                      <SelectItem key={ratio.value} value={ratio.value}>
                        {ratio.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">
                  Длительность
                </label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger className="bg-muted/30 border-border/50 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {durations.map((dur) => (
                      <SelectItem key={dur.value} value={dur.value}>
                        {dur.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={removeWatermark}
                  onCheckedChange={(checked) => setRemoveWatermark(!!checked)}
                  className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <span className="text-sm">
                  Удалить водяной знак <span className="text-muted-foreground">(+10 токенов)</span>
                </span>
              </label>
            </div>
          </div>

          {/* Total & Generate Button */}
          <div className="glass rounded-2xl p-4 animate-slide-up" style={{ animationDelay: '250ms' }}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-muted-foreground">Стоимость:</span>
              <span className="text-xl font-bold gradient-text">{getTotalCost()} токенов</span>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !selectedModel || prompt.length < 10}
              className="w-full gradient-primary hover:opacity-90 rounded-xl h-12 text-base font-semibold gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Генерация...
                </>
              ) : (
                <>
                  <span>🎬</span>
                  Создать видео
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Right Panel - Result */}
        <div className="lg:col-span-3">
          <div className="glass rounded-2xl p-6 h-full min-h-[400px] flex flex-col animate-slide-up" style={{ animationDelay: '100ms' }}>
            {!isGenerating && !generatedVideo && (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="w-24 h-24 rounded-3xl bg-muted/50 flex items-center justify-center mb-4">
                  <Video className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Здесь появится ваше видео</h3>
                <p className="text-muted-foreground text-sm max-w-md">
                  Выберите модель, введите описание и нажмите "Создать видео"
                </p>
              </div>
            )}

            {isGenerating && (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="relative w-24 h-24 mb-6">
                  <div className="absolute inset-0 rounded-3xl gradient-primary animate-pulse-glow" />
                  <div className="absolute inset-2 rounded-2xl bg-background flex items-center justify-center">
                    <Loader2 className="h-10 w-10 text-primary animate-spin" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-2">Создаём ваше видео...</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Это может занять 1-3 минуты
                </p>
                <div className="w-full max-w-xs">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full gradient-primary transition-all duration-500"
                      style={{ width: `${generationProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {Math.round(generationProgress)}% завершено
                  </p>
                </div>
              </div>
            )}

            {generatedVideo && (
              <div className="flex-1 flex flex-col">
                <div className="relative flex-1 bg-black rounded-xl overflow-hidden min-h-[300px]">
                  <video
                    src={generatedVideo.url}
                    controls
                    className="absolute inset-0 w-full h-full object-contain"
                  />
                </div>

                <div className="mt-4 space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 sm:flex-none rounded-xl border-border/50 gap-2"
                      onClick={() => window.open(generatedVideo.url, '_blank')}
                    >
                      <Download className="h-4 w-4" />
                      Скачать
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 sm:flex-none rounded-xl border-border/50 gap-2"
                      onClick={resetGeneration}
                    >
                      <RefreshCw className="h-4 w-4" />
                      Сгенерировать ещё
                    </Button>
                    <Button
                      className="flex-1 sm:flex-none gradient-primary rounded-xl gap-2"
                      onClick={handlePublishToGallery}
                    >
                      <Share2 className="h-4 w-4" />
                      Опубликовать
                    </Button>
                  </div>

                  <div className="bg-muted/30 rounded-xl p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Модель:</span>
                      <span className="font-medium">{generatedVideo.model}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Потрачено:</span>
                      <span className="font-medium">{generatedVideo.tokensSpent} токенов</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Промпт:</span>
                      <p className="mt-1 text-foreground line-clamp-2">{generatedVideo.prompt}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}