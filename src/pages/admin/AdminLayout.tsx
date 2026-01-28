import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Palette, 
  Coins, 
  Bot, 
  Image, 
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Home,
  Plug
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  { path: '/admin', label: 'Дашборд', icon: LayoutDashboard, end: true },
  { path: '/admin/users', label: 'Пользователи', icon: Users },
  { path: '/admin/generations', label: 'Генерации', icon: Palette },
  { path: '/admin/transactions', label: 'Транзакции', icon: Coins },
  { path: '/admin/agents', label: 'Агенты', icon: Bot },
  { path: '/admin/gallery', label: 'Галерея', icon: Image },
  { path: '/admin/api-models', label: 'API и Модели', icon: Plug },
  { path: '/admin/settings', label: 'Настройки', icon: Settings },
];

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed left-0 top-0 z-40 h-screen bg-card border-r border-border transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          {!collapsed && (
            <span className="text-lg font-bold gradient-text">TEEN.AI Admin</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="p-2 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                collapsed && "justify-center"
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="absolute bottom-4 left-0 right-0 px-2 space-y-1">
          <NavLink
            to="/"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all",
              collapsed && "justify-center"
            )}
          >
            <Home className="h-5 w-5" />
            {!collapsed && <span>На сайт</span>}
          </NavLink>
          <button
            onClick={handleLogout}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-all",
              collapsed && "justify-center"
            )}
          >
            <LogOut className="h-5 w-5" />
            {!collapsed && <span>Выход</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main 
        className={cn(
          "flex-1 transition-all duration-300",
          collapsed ? "ml-16" : "ml-64"
        )}
      >
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
