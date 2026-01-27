import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Video, Camera, Music, MessageCircle, Bot, Coins, Plus, User, LogOut, Settings, Image } from 'lucide-react';
import { TopUpModal } from '@/components/topup/TopUpModal';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  { path: '/video', label: 'Видео', icon: Video, emoji: '🎬' },
  { path: '/photo', label: 'Фото', icon: Camera, emoji: '📸' },
  { path: '/music', label: 'Музыка', icon: Music, emoji: '🎵' },
  { path: '/text', label: 'Текст', icon: MessageCircle, emoji: '💬' },
  { path: '/agents', label: 'Агенты', icon: Bot, emoji: '🤖' },
];

export function Header() {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [topUpOpen, setTopUpOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <header className="sticky top-0 z-50 glass border-b border-border/50">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl font-bold gradient-text">TEEN.AI</span>
            <span className="text-sm text-muted-foreground">Studio</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  location.pathname === item.path
                    ? 'gradient-primary text-white'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <span>{item.emoji}</span>
                <span className="hidden lg:inline">{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/50">
            <Coins className="h-4 w-4 text-studio-agent" />
            <span className="font-semibold">{profile?.tokens_balance ?? 0}</span>
          </div>

          <Button
            size="sm"
            className="gradient-primary hover:opacity-90 transition-opacity rounded-xl gap-2"
            onClick={() => setTopUpOpen(true)}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Пополнить</span>
          </Button>

          <TopUpModal open={topUpOpen} onOpenChange={setTopUpOpen} />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                <Avatar className="h-10 w-10 border-2 border-primary/30">
                  <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.name || 'User'} />
                  <AvatarFallback className="gradient-primary text-white font-semibold">
                    {profile?.name?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-popover border-border" align="end">
              <div className="px-3 py-2">
                <p className="text-sm font-medium">{profile?.name || 'Пользователь'}</p>
                <p className="text-xs text-muted-foreground">{profile?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/profile" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Профиль
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/gallery" className="cursor-pointer">
                  <Image className="mr-2 h-4 w-4" />
                  Галерея
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Настройки
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                Выход
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}