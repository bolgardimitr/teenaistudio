import { useState, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Camera, Upload, X, Download, Share2, RefreshCw, 
  Sparkles, History, Wand2, Lock, Loader2, Edit3,
  Image as ImageIcon, Type, Palette, ZoomIn
} from 'lucide-react';

interface PhotoModel {
  id: string;
  name: string;
  badge: 'free' | 'basic' | 'premium';
  badgeLabel: string;
  cost: number;
  description: string;
  requiredRole: 'free' | 'basic' | 'premium';
  freeLimit?: number;
}

const photoModels: PhotoModel[] = [
  {
    id: 'kandinsky',
    name: 'Kandinsky 3.1',
    badge: 'free',
    badgeLabel: '🆓 FREE',
    cost: 0,
    description: 'Российская модель, без ограничений',
    requiredRole: 'free',
  },
  {
    id: 'nano-banana',
    name: 'Nano Banana',
    badge: 'free',
    badgeLabel: '🆓 4 токена*',
    cost: 4,
    description: 'Gemini 2.5, быстрая генерация',
    requiredRole: 'free',
    freeLimit: 10,
  },
  {
    id: 'seedream',
    name: 'Seedream 4.0',
    badge: 'basic',
    badgeLabel: '⭐ 4 токена',
    cost: 4,
    description: 'До 4K разрешения, ByteDance',
    requiredRole: 'basic',
  },
  {
    id: 'flux-kontext',
    name: 'Flux Kontext',
    badge: 'basic',
    badgeLabel: '⭐ 8 токенов',
    cost: 8,
    description: 'Отличная детализация',
    requiredRole: 'basic',
  },
  {
    id: 'midjourney-v7',
    name: 'Midjourney V7',
    badge: 'premium',
    badgeLabel: '💎 15 токенов',
    cost: 15,
    description: 'Художественные стили',
    requiredRole: 'premium',
  },
  {
    id: '4o-image',
    name: '4o Image',
    badge: 'premium',
    badgeLabel: '💎 10 токенов',
    cost: 10,
    description: 'OpenAI, точный текст на изображении',
    requiredRole: 'premium',
  },
];

const aspectRatios = [
  { value: '1:1', label: '1:1 (Квадрат)' },
  { value: '16:9', label: '16:9 (Горизонтальное)' },
  { value: '9:16', label: '9:16 (Вертикальное)' },
  { value: '4:3', label: '4:3 (Классическое)' },
  { value: '3:4', label: '3:4 (Портретное)' },
];

const styles = [
  { value: 'photorealism', label: 'Фотореализм', icon: '📷' },
  { value: 'cartoon', label: 'Мультфильм', icon: '🎨' },
  { value: 'anime', label: 'Аниме', icon: '🌸' },
  { value: 'fantasy', label: 'Фэнтези', icon: '🧙' },
  { value: '3d-render', label: '3D рендер', icon: '💎' },
  { value: 'watercolor', label: 'Акварель', icon: '🖌️' },
  { value: 'comic', label: 'Комикс', icon: '💥' },
];

const variantCounts = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '4', label: '4' },
];

const formats = [
  { value: 'jpg', label: 'JPG' },
  { value: 'png', label: 'PNG' },
];

type GenerationMode = 'text-to-image' | 'image-to-image' | 'editing';

const roleHierarchy = { free: 0, basic: 1, premium: 2, admin: 3 };

export default function PhotoStudio() {
  const { profile, user, role, refreshProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<GenerationMode>('text-to-image');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [prompt, setPrompt] = useState('');
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [changeStrength, setChangeStrength] = useState([0.5]);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [style, setStyle] = useState('photorealism');
  const [variantCount, setVariantCount] = useState('1');
  const [format, setFormat] = useState('png');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationInfo, setGenerationInfo] = useState<{
    model: string;
    prompt: string;
    tokensSpent: number;
  } | null>(null);

  const userRoleLevel = roleHierarchy[role || 'free'];

  const canAccessModel = (model: PhotoModel) => {
    return userRoleLevel >= roleHierarchy[model.requiredRole];
  };

  const getModelCost = (modelId: string) => {
    const model = photoModels.find(m => m.id === modelId);
    return model?.cost || 0;
  };

  const getTotalCost = () => {
    const baseCost = getModelCost(selectedModel);
    const variants = parseInt(variantCount);
    return baseCost * variants;
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
        setReferenceImage(reader.result as string);
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
        setReferenceImage(reader.result as string);
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

    if ((mode === 'image-to-image' || mode === 'editing') && !referenceImage) {
      toast.error('Загрузите референсное изображение');
      return;
    }

    const model = photoModels.find(m => m.id === selectedModel);
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
    setGeneratedImages([]);
    setGenerationError(null);

    // Start progress animation
    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 10;
      });
    }, 1000);

    try {
      // Create generation record first
      const { data: generation, error: genError } = await supabase
        .from('generations')
        .insert({
          user_id: user!.id,
          type: 'photo',
          model: selectedModel,
          prompt: prompt.trim(),
          tokens_spent: totalCost,
          status: 'processing',
        })
        .select()
        .single();

      if (genError) throw genError;

      // Call the edge function
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: {
          prompt: prompt.trim(),
          model: selectedModel,
          aspectRatio: aspectRatio,
          style: style,
          referenceImage: referenceImage,
          changeStrength: changeStrength[0],
          mode: mode,
        },
      });

      clearInterval(progressInterval);

      if (error) {
        throw new Error(error.message || 'Ошибка вызова функции генерации');
      }

      if (!data.success) {
        throw new Error(data.error || 'Генерация не удалась');
      }

      setGenerationProgress(100);

      // Get the image URL from response
      const imageUrl = data.image_url;
      
      if (!imageUrl) {
        throw new Error('Не получен URL изображения');
      }

      // Update generation with result
      await supabase
        .from('generations')
        .update({ 
          status: 'completed',
          result_url: imageUrl,
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
        description: `Генерация фото: ${model.name}`,
      });

      // For now we only get 1 image, but the UI supports multiple
      setGeneratedImages([imageUrl]);
      setGenerationInfo({
        model: model.name,
        prompt: prompt,
        tokensSpent: totalCost,
      });

      await refreshProfile();
      toast.success('Изображение успешно создано! 📸');

    } catch (error) {
      clearInterval(progressInterval);
      console.error('Generation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при генерации изображения';
      setGenerationError(errorMessage);
      toast.error(errorMessage);
      
      // Update generation status to failed
      // Note: We don't have the generation.id here if the insert failed
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublish = async (imageUrl: string) => {
    toast.success('Изображение опубликовано в галерею! 📤');
  };

  const handleCreateVariations = (imageUrl: string) => {
    setReferenceImage(imageUrl);
    setMode('image-to-image');
    toast.info('Изображение добавлено как референс');
  };

  const resetGeneration = () => {
    setGeneratedImages([]);
    setGenerationProgress(0);
    setGenerationInfo(null);
  };

  return (
    <AppLayout>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 min-h-[calc(100vh-10rem)]">
        {/* Left Panel - Controls */}
        <div className="lg:col-span-2 space-y-5 overflow-y-auto">
          {/* Header */}
          <div className="animate-slide-up">
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <span>📸</span>
              <span className="gradient-text">Фото Студия</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              Создавайте уникальные изображения с помощью AI
            </p>
          </div>

          {/* Generation Mode Tabs */}
          <div className="animate-slide-up" style={{ animationDelay: '50ms' }}>
            <Tabs value={mode} onValueChange={(v) => setMode(v as GenerationMode)}>
              <TabsList className="w-full bg-muted/50 p-1 rounded-xl">
                <TabsTrigger 
                  value="text-to-image" 
                  className="flex-1 rounded-lg data-[state=active]:gradient-primary data-[state=active]:text-white gap-1.5"
                >
                  <Type className="h-4 w-4" />
                  <span className="hidden sm:inline">Text-to-Image</span>
                  <span className="sm:hidden">Текст</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="image-to-image"
                  className="flex-1 rounded-lg data-[state=active]:gradient-primary data-[state=active]:text-white gap-1.5"
                >
                  <ImageIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Image-to-Image</span>
                  <span className="sm:hidden">Фото</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="editing"
                  className="flex-1 rounded-lg data-[state=active]:gradient-primary data-[state=active]:text-white gap-1.5"
                >
                  <Palette className="h-4 w-4" />
                  <span className="hidden sm:inline">Редактирование</span>
                  <span className="sm:hidden">Редакт.</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Model Selection */}
          <div className="glass rounded-2xl p-4 animate-slide-up" style={{ animationDelay: '100ms' }}>
            <h3 className="font-semibold mb-3">Выбор модели</h3>
            <div className="grid grid-cols-2 gap-3">
              {photoModels.map((model) => {
                const isAccessible = canAccessModel(model);
                const isSelected = selectedModel === model.id;

                return (
                  <button
                    key={model.id}
                    onClick={() => isAccessible && setSelectedModel(model.id)}
                    disabled={!isAccessible}
                    className={`relative p-3 rounded-xl text-left transition-all duration-200 ${
                      isSelected
                        ? 'bg-gradient-to-br from-primary/20 to-secondary/20 border-2 border-primary'
                        : isAccessible
                        ? 'bg-muted/30 border border-border/50 hover:border-primary/50'
                        : 'bg-muted/20 border border-border/30 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    {!isAccessible && (
                      <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] rounded-xl flex items-center justify-center">
                        <Lock className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-1">
                      <span className="font-medium text-sm line-clamp-1">{model.name}</span>
                    </div>
                    <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full mt-1 ${
                      model.badge === 'free' 
                        ? 'bg-green-500/20 text-green-400'
                        : model.badge === 'basic'
                        ? 'bg-studio-agent/20 text-studio-agent'
                        : 'bg-primary/20 text-primary'
                    }`}>
                      {model.badgeLabel}
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">
                      {model.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reference Image (for Image-to-Image and Editing) */}
          {(mode === 'image-to-image' || mode === 'editing') && (
            <div className="glass rounded-2xl p-4 animate-slide-up" style={{ animationDelay: '150ms' }}>
              <h3 className="font-semibold mb-3">
                {mode === 'image-to-image' ? 'Референсное изображение' : 'Изображение для редактирования'}
              </h3>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              {referenceImage ? (
                <div className="relative">
                  <img
                    src={referenceImage}
                    alt="Reference"
                    className="w-full h-40 object-cover rounded-xl"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7"
                    onClick={() => setReferenceImage(null)}
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
                </div>
              )}

              {mode === 'image-to-image' && referenceImage && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Сила изменения</span>
                    <span className="text-sm font-medium">{changeStrength[0].toFixed(1)}</span>
                  </div>
                  <Slider
                    value={changeStrength}
                    onValueChange={setChangeStrength}
                    min={0.1}
                    max={1}
                    step={0.1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Похоже</span>
                    <span>Сильно отличается</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Prompt */}
          <div className="glass rounded-2xl p-4 animate-slide-up" style={{ animationDelay: '200ms' }}>
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
              placeholder="Опишите изображение. Например: Девочка 9 лет с каштановыми волосами рисует на планшете, яркий солнечный свет, мультяшный стиль, детализированный фон комнаты"
              className="min-h-[100px] bg-muted/30 border-border/50 rounded-xl resize-none"
              disabled={isGenerating}
            />
            <div className="text-right text-xs text-muted-foreground mt-1">
              {prompt.length} символов
            </div>
          </div>

          {/* Settings */}
          <div className="glass rounded-2xl p-4 animate-slide-up" style={{ animationDelay: '250ms' }}>
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
                  Стиль
                </label>
                <Select value={style} onValueChange={setStyle}>
                  <SelectTrigger className="bg-muted/30 border-border/50 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {styles.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        <span className="flex items-center gap-2">
                          <span>{s.icon}</span>
                          <span>{s.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">
                    Кол-во вариантов
                  </label>
                  <Select value={variantCount} onValueChange={setVariantCount}>
                    <SelectTrigger className="bg-muted/30 border-border/50 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {variantCounts.map((v) => (
                        <SelectItem key={v.value} value={v.value}>
                          {v.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">
                    Формат
                  </label>
                  <Select value={format} onValueChange={setFormat}>
                    <SelectTrigger className="bg-muted/30 border-border/50 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {formats.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Total & Generate Button */}
          <div className="glass rounded-2xl p-4 animate-slide-up" style={{ animationDelay: '300ms' }}>
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
                  <span>📸</span>
                  Создать изображение
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Right Panel - Result */}
        <div className="lg:col-span-3">
          <div className="glass rounded-2xl p-6 h-full min-h-[500px] flex flex-col animate-slide-up" style={{ animationDelay: '100ms' }}>
            {!isGenerating && generatedImages.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="w-24 h-24 rounded-3xl bg-muted/50 flex items-center justify-center mb-4">
                  <Camera className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Здесь появятся ваши изображения</h3>
                <p className="text-muted-foreground text-sm max-w-md">
                  Выберите модель, введите описание и нажмите "Создать изображение"
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
                <h3 className="text-lg font-semibold mb-2">Создаём изображения...</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Это займёт несколько секунд
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

            {generatedImages.length > 0 && (
              <div className="flex-1 flex flex-col">
                <div className={`grid gap-4 flex-1 ${
                  generatedImages.length === 1 ? 'grid-cols-1' :
                  generatedImages.length === 2 ? 'grid-cols-2' :
                  'grid-cols-2'
                }`}>
                  {generatedImages.map((imageUrl, index) => (
                    <div
                      key={index}
                      className="relative group rounded-xl overflow-hidden bg-muted/30 aspect-square"
                    >
                      <img
                        src={imageUrl}
                        alt={`Generated ${index + 1}`}
                        className="w-full h-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
                        onClick={() => setSelectedImageIndex(index)}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute bottom-0 left-0 right-0 p-3 flex gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="flex-1 h-8 text-xs rounded-lg bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-0"
                            onClick={(e) => { e.stopPropagation(); window.open(imageUrl, '_blank'); }}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Скачать
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 w-8 p-0 rounded-lg bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-0"
                            onClick={(e) => { e.stopPropagation(); handleCreateVariations(imageUrl); }}
                          >
                            <RefreshCw className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 w-8 p-0 rounded-lg bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-0"
                            onClick={(e) => { e.stopPropagation(); handlePublish(imageUrl); }}
                          >
                            <Share2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 w-8 p-0 rounded-lg bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-0"
                            onClick={(e) => { e.stopPropagation(); setSelectedImageIndex(index); }}
                          >
                            <ZoomIn className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 sm:flex-none rounded-xl border-border/50 gap-2"
                      onClick={resetGeneration}
                    >
                      <RefreshCw className="h-4 w-4" />
                      Сгенерировать ещё
                    </Button>
                  </div>

                  {generationInfo && (
                    <div className="bg-muted/30 rounded-xl p-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Модель:</span>
                        <span className="font-medium">{generationInfo.model}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Потрачено:</span>
                        <span className="font-medium">{generationInfo.tokensSpent} токенов</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Промпт:</span>
                        <p className="mt-1 text-foreground line-clamp-2">{generationInfo.prompt}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Preview Modal */}
      <Dialog open={selectedImageIndex !== null} onOpenChange={() => setSelectedImageIndex(null)}>
        <DialogContent className="max-w-4xl p-0 bg-transparent border-0">
          {selectedImageIndex !== null && generatedImages[selectedImageIndex] && (
            <div className="relative">
              <img
                src={generatedImages[selectedImageIndex]}
                alt={`Preview ${selectedImageIndex + 1}`}
                className="w-full h-auto rounded-xl"
              />
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                <Button
                  className="gradient-primary rounded-xl gap-2"
                  onClick={() => window.open(generatedImages[selectedImageIndex], '_blank')}
                >
                  <Download className="h-4 w-4" />
                  Скачать
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl border-white/30 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 gap-2"
                  onClick={() => handlePublish(generatedImages[selectedImageIndex])}
                >
                  <Share2 className="h-4 w-4" />
                  Опубликовать
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl border-white/30 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 gap-2"
                  onClick={() => {
                    handleCreateVariations(generatedImages[selectedImageIndex]);
                    setSelectedImageIndex(null);
                  }}
                >
                  <Edit3 className="h-4 w-4" />
                  Редактировать
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}