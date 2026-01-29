import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';

interface TaskComparison {
  task: string;
  best: string;
  bestBadge: 'free' | 'basic' | 'premium';
  alternative: string;
}

interface ModelInfo {
  name: string;
  developer: string;
  year: string;
  logo: string;
  color: string;
  description: string;
  strengths: string[];
}

interface ModelsHelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studioType: 'photo' | 'video' | 'music' | 'text';
}

// PHOTO MODELS DATA
const photoTaskComparisons: TaskComparison[] = [
  { task: 'Фотореализм', best: 'Nano Banana Pro', bestBadge: 'premium', alternative: 'Seedream 4.5' },
  { task: 'Художественный стиль', best: 'Midjourney V7', bestBadge: 'premium', alternative: 'Flux Kontext' },
  { task: 'Текст на изображении', best: '4o Image', bestBadge: 'premium', alternative: 'Ideogram V3' },
  { task: 'Редактирование фото', best: 'Nano Banana Pro', bestBadge: 'premium', alternative: 'Seedream 4.5' },
  { task: 'Быстрая генерация', best: 'Nano Banana', bestBadge: 'basic', alternative: 'Qwen Image' },
  { task: '4K разрешение', best: 'Seedream 4.5', bestBadge: 'premium', alternative: 'Nano Banana Pro' },
  { task: 'Бесплатная генерация', best: 'Kandinsky 3.1', bestBadge: 'free', alternative: 'Nano Banana' },
  { task: 'Консистентность персонажей', best: 'Flux Kontext', bestBadge: 'basic', alternative: 'Nano Banana Pro' },
  { task: 'Логотипы и иконки', best: 'Ideogram V3', bestBadge: 'basic', alternative: 'Recraft' },
];

const photoModelsInfo: ModelInfo[] = [
  {
    name: 'Nano Banana / Nano Banana Pro',
    developer: 'Google DeepMind',
    year: '2024-2025',
    logo: '🍌',
    color: 'from-yellow-500 to-orange-500',
    description: 'Nano Banana построен на основе Gemini 2.5 Flash, а Pro версия — на Gemini 3 Pro. Отличается превосходным пониманием естественного языка и способностью выполнять точные локальные редактирования.',
    strengths: ['Лучшее понимание сложных промптов', 'Точное локальное редактирование', 'Сохранение идентичности персонажей', 'Поддержка 4K (Pro)'],
  },
  {
    name: 'Midjourney V7',
    developer: 'Midjourney Inc.',
    year: '2022-2025',
    logo: '🎨',
    color: 'from-blue-500 to-purple-500',
    description: 'Midjourney — культовая модель для художественной генерации. Основана Дэвидом Хольцем, бывшим исследователем NASA. Известна уникальным "художественным взглядом".',
    strengths: ['Непревзойдённая эстетика', 'Уникальные стилизации', 'Отличная работа с концепт-артом', 'Сильное комьюнити'],
  },
  {
    name: '4o Image (GPT-Image-1)',
    developer: 'OpenAI',
    year: '2024-2025',
    logo: '🤖',
    color: 'from-green-500 to-teal-500',
    description: 'Модель генерации изображений от создателей ChatGPT. Отличается точным следованием инструкциям и способностью генерировать читаемый текст на изображениях.',
    strengths: ['Лучший текст на изображениях', 'Точное следование промптам', 'Гибкий контроль стиля', 'Интеграция с ChatGPT'],
  },
  {
    name: 'Seedream 4.0 / 4.5',
    developer: 'ByteDance (TikTok)',
    year: '2024-2025',
    logo: '🌱',
    color: 'from-pink-500 to-red-500',
    description: 'Модель от создателей TikTok. Seedream 4.0 лидирует в бенчмарках по качеству генерации. Версия 4.5 добавляет поддержку до 10 референс-изображений.',
    strengths: ['Топ-1 в бенчмарках качества', '4K разрешение', 'До 10 референс-изображений (4.5)', 'Отличная детализация'],
  },
  {
    name: 'Flux Kontext / Flux 2',
    developer: 'Black Forest Labs',
    year: '2024-2025',
    logo: '⚡',
    color: 'from-cyan-500 to-blue-500',
    description: 'Flux создан бывшими разработчиками Stable Diffusion из Black Forest Labs (Германия). Известен отличной консистентностью персонажей.',
    strengths: ['Сильная консистентность персонажей', 'Контекстная генерация', 'Повторяемость результатов', 'Яркие детализированные сцены'],
  },
  {
    name: 'Kandinsky 3.1',
    developer: 'Sber AI (Россия)',
    year: '2023-2024',
    logo: '🇷🇺',
    color: 'from-blue-600 to-red-500',
    description: 'Российская модель от Сбера, названная в честь художника Василия Кандинского. Полностью бесплатная и без ограничений.',
    strengths: ['Полностью бесплатная', 'Отличное понимание русского языка', 'Нет ограничений по количеству', 'Российские культурные контексты'],
  },
  {
    name: 'Ideogram V3',
    developer: 'Ideogram AI',
    year: '2023-2025',
    logo: '💡',
    color: 'from-amber-500 to-yellow-500',
    description: 'Ideogram специализируется на генерации изображений с читаемым текстом — логотипы, постеры, баннеры. Также предлагает функцию Reframe.',
    strengths: ['Лучший текст и типографика', 'Логотипы и брендинг', 'Функция Reframe', 'Постеры и баннеры'],
  },
  {
    name: 'Qwen Image',
    developer: 'Alibaba Cloud',
    year: '2024-2025',
    logo: '🌐',
    color: 'from-orange-500 to-red-500',
    description: 'Модель от Alibaba, часть семейства Qwen. Open-source модель с хорошей скоростью генерации. Особенно хороша для азиатской эстетики.',
    strengths: ['Open-source и бесплатная', 'Быстрая генерация', 'Хороша для e-commerce', 'Азиатская эстетика'],
  },
  {
    name: 'Recraft',
    developer: 'Recraft AI',
    year: '2024-2025',
    logo: '✂️',
    color: 'from-violet-500 to-purple-500',
    description: 'Специализированная модель для профессионального редактирования: удаление фона, ретушь, изменение объектов.',
    strengths: ['Профессиональное удаление фона', 'Продуктовая фотография', 'Ретушь и редактирование', 'E-commerce готовые изображения'],
  },
  {
    name: 'Grok Imagine',
    developer: 'xAI (Илон Маск)',
    year: '2024-2025',
    logo: '🚀',
    color: 'from-gray-500 to-gray-700',
    description: 'Модель от xAI, компании Илона Маска. Интегрирована в Grok AI и X (Twitter). Известна уникальным стилем.',
    strengths: ['Уникальный стиль генерации', 'Меньше ограничений', 'Интеграция с X/Twitter', 'Мемы и вирусный контент'],
  },
];

// VIDEO MODELS DATA
const videoTaskComparisons: TaskComparison[] = [
  { task: 'Кинематографическое качество', best: 'Veo 3.1 Quality', bestBadge: 'premium', alternative: 'Sora 2 Pro' },
  { task: 'Видео со звуком', best: 'Veo 3.1', bestBadge: 'premium', alternative: 'Seedance 1.5 Pro' },
  { task: 'Длинные видео (>1 мин)', best: 'Kling 2.6', bestBadge: 'premium', alternative: '—' },
  { task: 'Быстрая генерация', best: 'Veo 3 Fast', bestBadge: 'basic', alternative: 'Luma Dream Machine' },
  { task: 'Lip-sync и диалоги', best: 'Seedance 1.5 Pro', bestBadge: 'premium', alternative: 'Wan 2.5' },
  { task: 'Редактирование видео', best: 'Runway Aleph', bestBadge: 'premium', alternative: '—' },
  { task: 'Бюджетный вариант', best: 'Wan 2.5', bestBadge: 'basic', alternative: 'Hailuo 02' },
  { task: 'Бесплатная генерация', best: 'Luma Dream Machine', bestBadge: 'free', alternative: 'Seedance V1 Lite' },
  { task: 'Image-to-Video', best: 'Kling 2.6', bestBadge: 'premium', alternative: 'Veo 3.1' },
];

const videoModelsInfo: ModelInfo[] = [
  {
    name: 'Veo 3.1 / Veo 3 Fast',
    developer: 'Google DeepMind',
    year: '2024-2025',
    logo: '🎬',
    color: 'from-blue-500 to-green-500',
    description: 'Флагманская видео-модель Google. Veo 3.1 генерирует видео со встроенным звуком и поддерживает разрешение до 4K.',
    strengths: ['Видео со звуком', '4K разрешение', 'Кинематографическое качество', 'Интеграция с Google'],
  },
  {
    name: 'Sora 2 / Sora 2 Pro',
    developer: 'OpenAI',
    year: '2024-2025',
    logo: '🎥',
    color: 'from-green-500 to-teal-500',
    description: 'Модель генерации видео от OpenAI. Sora понимает физику мира и создаёт реалистичные сцены с правильным движением.',
    strengths: ['Понимание физики', 'Длинные сцены', 'Многосценарные истории (Pro Story)', 'Высокая детализация'],
  },
  {
    name: 'Kling 2.5 / 2.6',
    developer: 'Kuaishou (Китай)',
    year: '2024-2025',
    logo: '🎞️',
    color: 'from-red-500 to-orange-500',
    description: 'Китайская модель от Kuaishou (конкурент TikTok). Kling известен отличным Image-to-Video и поддержкой длинных видео.',
    strengths: ['Лучший Image-to-Video', 'Длинные видео до 2+ минут', 'Motion Control', 'Отличная консистентность'],
  },
  {
    name: 'Runway Aleph',
    developer: 'Runway ML',
    year: '2023-2025',
    logo: '🛫',
    color: 'from-purple-500 to-pink-500',
    description: 'Runway — пионер AI-видео. Aleph их новейшая модель с продвинутым редактированием и контролем камеры.',
    strengths: ['Профессиональное редактирование', 'Контроль камеры', 'Inpainting видео', 'Индустриальный стандарт'],
  },
  {
    name: 'Seedance 1.5 Pro',
    developer: 'ByteDance (TikTok)',
    year: '2024-2025',
    logo: '💃',
    color: 'from-pink-500 to-red-500',
    description: 'Модель от ByteDance для танцевальных и музыкальных видео. Отличный lip-sync и синхронизация с музыкой.',
    strengths: ['Лучший lip-sync', 'Танцевальные видео', 'Синхронизация с музыкой', 'Генерация звука'],
  },
  {
    name: 'Wan 2.5',
    developer: 'Alibaba',
    year: '2024-2025',
    logo: '🌊',
    color: 'from-cyan-500 to-blue-500',
    description: 'Бюджетная модель от Alibaba. Wan 2.5 предлагает хорошее качество по доступной цене с функциями Move и Replace.',
    strengths: ['Доступная цена', 'Move анимация', 'Replace объектов', 'Хорошее соотношение цена/качество'],
  },
  {
    name: 'Hailuo 02',
    developer: 'MiniMax (Китай)',
    year: '2024-2025',
    logo: '🌈',
    color: 'from-indigo-500 to-purple-500',
    description: 'Модель от MiniMax, известная быстрой генерацией и хорошим качеством за небольшие деньги.',
    strengths: ['Быстрая генерация', 'Бюджетный вариант', 'Хорошее качество', 'Стабильные результаты'],
  },
  {
    name: 'Luma Dream Machine',
    developer: 'Luma AI',
    year: '2024-2025',
    logo: '💭',
    color: 'from-violet-500 to-indigo-500',
    description: 'Бесплатная модель от Luma AI. Отличный старт для новичков с 3 бесплатными генерациями в день.',
    strengths: ['Полностью бесплатная', '3 генерации в день', 'Простой интерфейс', 'Хорошее качество для бесплатной'],
  },
];

// MUSIC MODELS DATA
const musicTaskComparisons: TaskComparison[] = [
  { task: 'Максимальное качество', best: 'Suno V5', bestBadge: 'premium', alternative: 'Suno V4.5' },
  { task: 'Длинные треки (8 мин)', best: 'Suno V5', bestBadge: 'premium', alternative: '—' },
  { task: 'Профессиональный вокал', best: 'Suno V4.5', bestBadge: 'basic', alternative: 'Suno V5' },
  { task: 'Бесплатная генерация', best: 'Suno V3.5', bestBadge: 'free', alternative: '—' },
  { task: 'Инструментальная музыка', best: 'Suno V5', bestBadge: 'premium', alternative: 'Suno V4' },
  { task: 'Быстрая генерация', best: 'Suno V3.5', bestBadge: 'free', alternative: 'Suno V4' },
];

const musicModelsInfo: ModelInfo[] = [
  {
    name: 'Suno V3.5',
    developer: 'Suno AI',
    year: '2023-2024',
    logo: '🎵',
    color: 'from-green-500 to-emerald-500',
    description: 'Базовая версия Suno с 2 бесплатными генерациями в день. Хороший старт для знакомства с AI-музыкой.',
    strengths: ['2 бесплатных генерации в день', 'Быстрая генерация', 'Хорошее базовое качество', 'Поддержка русского языка'],
  },
  {
    name: 'Suno V4',
    developer: 'Suno AI',
    year: '2024',
    logo: '🎶',
    color: 'from-blue-500 to-cyan-500',
    description: 'Улучшенная версия с более качественным вокалом и инструментами. Поддержка различных жанров.',
    strengths: ['Улучшенный вокал', 'Больше жанров', 'Лучшая структура песни', 'Качественные инструменты'],
  },
  {
    name: 'Suno V4.5',
    developer: 'Suno AI',
    year: '2024-2025',
    logo: '🎤',
    color: 'from-purple-500 to-pink-500',
    description: 'Профессиональное качество с продвинутой обработкой вокала и расширенными возможностями.',
    strengths: ['Профессиональный вокал', 'Расширенные стили', 'Детальный контроль', 'Студийное качество'],
  },
  {
    name: 'Suno V5',
    developer: 'Suno AI',
    year: '2025',
    logo: '🏆',
    color: 'from-amber-500 to-orange-500',
    description: 'Флагманская модель с максимальным качеством и поддержкой треков до 8 минут.',
    strengths: ['Треки до 8 минут', 'Максимальное качество', 'Все жанры и стили', 'Коммерческое использование'],
  },
];

// TEXT MODELS DATA
const textTaskComparisons: TaskComparison[] = [
  { task: 'Сложные рассуждения', best: 'GPT-4o', bestBadge: 'premium', alternative: 'Claude 3.5 Sonnet' },
  { task: 'Написание текстов', best: 'Claude 3.5 Sonnet', bestBadge: 'premium', alternative: 'GPT-4o' },
  { task: 'Код и программирование', best: 'GPT-4o', bestBadge: 'premium', alternative: 'DeepSeek' },
  { task: 'Быстрые ответы', best: 'Gemini 2.5 Flash', bestBadge: 'free', alternative: 'Llama 3.3' },
  { task: 'Бесплатное использование', best: 'Gemini 2.5 Flash', bestBadge: 'free', alternative: 'Llama 3.3' },
  { task: 'Анализ документов', best: 'Gemini 3 Pro', bestBadge: 'premium', alternative: 'Claude 3.5 Sonnet' },
  { task: 'Креативное письмо', best: 'Claude 3.5 Sonnet', bestBadge: 'premium', alternative: 'GPT-4o' },
  { task: 'Баланс цена/качество', best: 'GPT-4o-mini', bestBadge: 'basic', alternative: 'Gemini 2.0 Pro' },
];

const textModelsInfo: ModelInfo[] = [
  {
    name: 'GPT-4o',
    developer: 'OpenAI',
    year: '2024-2025',
    logo: '🤖',
    color: 'from-green-500 to-teal-500',
    description: 'Флагманская модель OpenAI. GPT-4o ("o" = "omni") мультимодальная модель с отличным пониманием контекста и рассуждениями.',
    strengths: ['Лучшие рассуждения', 'Мультимодальность', 'Код и программирование', 'Длинный контекст'],
  },
  {
    name: 'Claude 3.5 Sonnet',
    developer: 'Anthropic',
    year: '2024-2025',
    logo: '🎭',
    color: 'from-orange-500 to-amber-500',
    description: 'Модель от Anthropic, созданная бывшими сотрудниками OpenAI. Известна безопасностью и отличным качеством текстов.',
    strengths: ['Лучшее написание текстов', 'Безопасность и этика', 'Длинный контекст (200K)', 'Анализ документов'],
  },
  {
    name: 'Gemini 3 Pro / 2.0 Pro',
    developer: 'Google DeepMind',
    year: '2024-2025',
    logo: '💎',
    color: 'from-blue-500 to-purple-500',
    description: 'Флагманские модели Google. Gemini 3 Pro — новейшая версия с расширенными возможностями.',
    strengths: ['Мультимодальность', 'Интеграция с Google', 'Анализ изображений', 'Большой контекст'],
  },
  {
    name: 'Gemini 2.5 Flash',
    developer: 'Google DeepMind',
    year: '2024-2025',
    logo: '⚡',
    color: 'from-yellow-500 to-orange-500',
    description: 'Быстрая и бесплатная модель Google. Отличный баланс скорости и качества для повседневных задач.',
    strengths: ['Полностью бесплатная', 'Очень быстрая', 'Хорошее качество', 'Мультимодальность'],
  },
  {
    name: 'Llama 3.3',
    developer: 'Meta',
    year: '2024-2025',
    logo: '🦙',
    color: 'from-blue-600 to-indigo-500',
    description: 'Open-source модель от Meta (Facebook). Llama 3.3 предлагает отличное качество бесплатно.',
    strengths: ['Open-source', 'Бесплатная', 'Быстрые ответы', 'Хорошее качество'],
  },
  {
    name: 'DeepSeek',
    developer: 'DeepSeek AI (Китай)',
    year: '2024-2025',
    logo: '🔍',
    color: 'from-cyan-500 to-blue-500',
    description: 'Китайская модель с сильными математическими и логическими способностями. Хороша для рассуждений.',
    strengths: ['Сильная математика', 'Логические рассуждения', 'Доступная цена', 'Код и программирование'],
  },
  {
    name: 'GPT-4o-mini',
    developer: 'OpenAI',
    year: '2024-2025',
    logo: '🔹',
    color: 'from-teal-500 to-green-500',
    description: 'Облегчённая версия GPT-4o. Отличный баланс цены и качества для большинства задач.',
    strengths: ['Баланс цена/качество', 'Быстрее GPT-4o', 'Достаточное качество', 'Экономия токенов'],
  },
];

const getStudioTitle = (type: 'photo' | 'video' | 'music' | 'text') => {
  switch (type) {
    case 'photo': return 'Гид по моделям генерации изображений';
    case 'video': return 'Гид по моделям генерации видео';
    case 'music': return 'Гид по моделям генерации музыки';
    case 'text': return 'Гид по текстовым моделям AI';
  }
};

const getStudioDescription = (type: 'photo' | 'video' | 'music' | 'text') => {
  switch (type) {
    case 'photo': return 'Узнайте какая модель лучше подходит для вашей задачи';
    case 'video': return 'Выберите оптимальную модель для создания видео';
    case 'music': return 'Найдите идеальную модель для вашей музыки';
    case 'text': return 'Подберите модель для ваших текстовых задач';
  }
};

const getTaskComparisons = (type: 'photo' | 'video' | 'music' | 'text') => {
  switch (type) {
    case 'photo': return photoTaskComparisons;
    case 'video': return videoTaskComparisons;
    case 'music': return musicTaskComparisons;
    case 'text': return textTaskComparisons;
  }
};

const getModelsInfo = (type: 'photo' | 'video' | 'music' | 'text') => {
  switch (type) {
    case 'photo': return photoModelsInfo;
    case 'video': return videoModelsInfo;
    case 'music': return musicModelsInfo;
    case 'text': return textModelsInfo;
  }
};

export function ModelsHelpModal({ open, onOpenChange, studioType }: ModelsHelpModalProps) {
  const taskComparisons = getTaskComparisons(studioType);
  const modelsInfo = getModelsInfo(studioType);

  const getBadgeClass = (badge: 'free' | 'basic' | 'premium') => {
    switch (badge) {
      case 'free': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'basic': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'premium': return 'bg-primary/20 text-primary border-primary/30';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-background border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            {getStudioTitle(studioType)}
          </DialogTitle>
          <DialogDescription>
            {getStudioDescription(studioType)}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="comparison" className="mt-4">
          <TabsList className="bg-muted">
            <TabsTrigger value="comparison">📊 Сравнение по задачам</TabsTrigger>
            <TabsTrigger value="about">📖 О моделях</TabsTrigger>
          </TabsList>

          {/* Comparison Tab */}
          <TabsContent value="comparison" className="mt-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Какую модель выбрать?</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-muted-foreground">Задача</th>
                      <th className="text-left py-3 px-4 text-muted-foreground">🏆 Лучшая модель</th>
                      <th className="text-left py-3 px-4 text-muted-foreground">💡 Альтернатива</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    {taskComparisons.map((item, index) => (
                      <tr key={index} className="border-b border-border/50 hover:bg-muted/50">
                        <td className="py-3 px-4 font-medium text-foreground">{item.task}</td>
                        <td className="py-3 px-4">
                          <Badge className={getBadgeClass(item.bestBadge)}>
                            {item.best}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="border-border">
                            {item.alternative}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* About Models Tab */}
          <TabsContent value="about" className="mt-4">
            <div className="space-y-4">
              {modelsInfo.map((model, index) => (
                <div key={index} className="bg-muted/30 rounded-xl p-4 border border-border">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${model.color} flex items-center justify-center text-2xl flex-shrink-0`}>
                      {model.logo}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="text-foreground font-semibold">{model.name}</h4>
                        <Badge variant="outline" className="text-xs border-border">
                          {model.year}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-sm mb-2">
                        Разработчик: {model.developer}
                      </p>
                      <p className="text-muted-foreground text-sm mb-3">
                        {model.description}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {model.strengths.map((strength, i) => (
                          <Badge key={i} variant="secondary" className="bg-muted text-muted-foreground text-xs">
                            ✓ {strength}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
