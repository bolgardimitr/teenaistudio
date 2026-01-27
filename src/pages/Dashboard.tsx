import { Video, Camera, Music, MessageCircle, Bot } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { StudioCard } from '@/components/dashboard/StudioCard';
import { TokenBalance } from '@/components/dashboard/TokenBalance';
import { RecentWorks } from '@/components/dashboard/RecentWorks';
import { useAuth } from '@/contexts/AuthContext';

const studios = [
  {
    path: '/video',
    title: 'Видео Студия',
    description: 'Создавай крутые видеоролики с помощью AI за считанные секунды',
    icon: Video,
    emoji: '🎬',
    colorClass: 'from-studio-video to-primary',
  },
  {
    path: '/photo',
    title: 'Фото Студия',
    description: 'Генерируй уникальные изображения в любом стиле',
    icon: Camera,
    emoji: '📸',
    colorClass: 'from-studio-photo to-secondary',
  },
  {
    path: '/music',
    title: 'Музыка Студия',
    description: 'Сочиняй музыку и мелодии с AI-композитором',
    icon: Music,
    emoji: '🎵',
    colorClass: 'from-studio-music to-blue-400',
  },
  {
    path: '/text',
    title: 'Текст AI',
    description: 'Общайся с умным AI-помощником и получай ответы',
    icon: MessageCircle,
    emoji: '💬',
    colorClass: 'from-studio-text to-green-400',
  },
  {
    path: '/agents',
    title: 'AI Репетиторы',
    description: 'Учись с персональными AI-репетиторами по любым предметам',
    icon: Bot,
    emoji: '🤖',
    colorClass: 'from-studio-agent to-yellow-400',
  },
];

export default function Dashboard() {
  const { profile } = useAuth();

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Welcome */}
        <div className="animate-slide-up">
          <h1 className="text-2xl md:text-3xl font-bold">
            Привет, <span className="gradient-text">{profile?.name || 'Создатель'}!</span> 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Что будем создавать сегодня?
          </p>
        </div>

        {/* Token Balance */}
        <TokenBalance />

        {/* Studios */}
        <div>
          <h2 className="text-xl font-semibold mb-4 animate-slide-up" style={{ animationDelay: '200ms' }}>
            AI Студии
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {studios.map((studio, index) => (
              <StudioCard
                key={studio.path}
                {...studio}
                delay={200 + index * 50}
              />
            ))}
          </div>
        </div>

        {/* Recent Works */}
        <RecentWorks />
      </div>
    </AppLayout>
  );
}