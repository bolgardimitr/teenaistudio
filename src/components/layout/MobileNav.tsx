import { Link, useLocation } from 'react-router-dom';
import { Video, Camera, Music, MessageCircle, Bot, Home } from 'lucide-react';

const navItems = [
  { path: '/', label: 'Главная', icon: Home },
  { path: '/video', label: 'Видео', icon: Video },
  { path: '/photo', label: 'Фото', icon: Camera },
  { path: '/music', label: 'Музыка', icon: Music },
  { path: '/text', label: 'Текст', icon: MessageCircle },
  { path: '/agents', label: 'Агенты', icon: Bot },
];

export function MobileNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden glass border-t border-border/50">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground'
              }`}
            >
              <div className={`p-1.5 rounded-xl ${isActive ? 'gradient-primary' : ''}`}>
                <Icon className={`h-5 w-5 ${isActive ? 'text-white' : ''}`} />
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}