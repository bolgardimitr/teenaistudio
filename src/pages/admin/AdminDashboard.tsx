import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Activity, Palette, Coins, TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';

interface Stats {
  totalUsers: number;
  activeToday: number;
  generationsToday: number;
  revenueMonth: number;
  userGrowth: number;
}

interface DailyData {
  date: string;
  count: number;
}

interface TypeData {
  name: string;
  value: number;
  color: string;
}

interface Event {
  id: string;
  type: 'registration' | 'payment' | 'generation';
  user: string;
  details: string;
  time: string;
}

const TYPE_COLORS: Record<string, string> = {
  video: '#8B5CF6',
  photo: '#EC4899',
  music: '#10B981',
  text: '#F59E0B',
  agent: '#3B82F6',
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeToday: 0,
    generationsToday: 0,
    revenueMonth: 0,
    userGrowth: 0,
  });
  const [registrations, setRegistrations] = useState<DailyData[]>([]);
  const [generationsByType, setGenerationsByType] = useState<TypeData[]>([]);
  const [topModels, setTopModels] = useState<{ name: string; count: number }[]>([]);
  const [revenueData, setRevenueData] = useState<DailyData[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    
    const today = new Date();
    const todayStart = startOfDay(today).toISOString();
    const todayEnd = endOfDay(today).toISOString();
    const monthStart = startOfDay(subDays(today, 30)).toISOString();
    const weekStart = startOfDay(subDays(today, 7)).toISOString();

    // Total users
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Users registered this week vs last week
    const { count: thisWeekUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekStart);

    const { count: lastWeekUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfDay(subDays(today, 14)).toISOString())
      .lt('created_at', weekStart);

    const userGrowth = lastWeekUsers && lastWeekUsers > 0 
      ? Math.round(((thisWeekUsers || 0) - lastWeekUsers) / lastWeekUsers * 100)
      : 0;

    // Active today (users who generated something today)
    const { data: activeData } = await supabase
      .from('generations')
      .select('user_id')
      .gte('created_at', todayStart)
      .lte('created_at', todayEnd);
    
    const activeToday = new Set(activeData?.map(g => g.user_id)).size;

    // Generations today
    const { count: generationsToday } = await supabase
      .from('generations')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart)
      .lte('created_at', todayEnd);

    // Revenue this month
    const { data: revenueTransactions } = await supabase
      .from('transactions')
      .select('metadata')
      .eq('type', 'topup')
      .eq('status', 'completed')
      .gte('created_at', monthStart);

    const revenueMonth = revenueTransactions?.reduce((sum, t) => {
      const price = typeof t.metadata === 'object' && t.metadata !== null 
        ? (t.metadata as { price?: number }).price || 0 
        : 0;
      return sum + price;
    }, 0) || 0;

    setStats({
      totalUsers: totalUsers || 0,
      activeToday,
      generationsToday: generationsToday || 0,
      revenueMonth,
      userGrowth,
    });

    // Registrations by day (30 days)
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('created_at')
      .gte('created_at', monthStart)
      .order('created_at');

    const regByDay: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const date = format(subDays(today, i), 'dd.MM');
      regByDay[date] = 0;
    }
    
    profilesData?.forEach(p => {
      const date = format(new Date(p.created_at), 'dd.MM');
      if (regByDay[date] !== undefined) {
        regByDay[date]++;
      }
    });

    setRegistrations(Object.entries(regByDay).map(([date, count]) => ({ date, count })));

    // Generations by type
    const { data: genByType } = await supabase
      .from('generations')
      .select('type')
      .gte('created_at', monthStart);

    const typeCounts: Record<string, number> = {};
    genByType?.forEach(g => {
      typeCounts[g.type] = (typeCounts[g.type] || 0) + 1;
    });

    setGenerationsByType(
      Object.entries(typeCounts).map(([name, value]) => ({
        name: name === 'video' ? 'Видео' : 
              name === 'photo' ? 'Фото' : 
              name === 'music' ? 'Музыка' : 
              name === 'text' ? 'Текст' : 'Агенты',
        value,
        color: TYPE_COLORS[name] || '#888',
      }))
    );

    // Top models
    const { data: modelData } = await supabase
      .from('generations')
      .select('model')
      .not('model', 'is', null)
      .gte('created_at', monthStart);

    const modelCounts: Record<string, number> = {};
    modelData?.forEach(g => {
      if (g.model) {
        modelCounts[g.model] = (modelCounts[g.model] || 0) + 1;
      }
    });

    setTopModels(
      Object.entries(modelCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }))
    );

    // Revenue by day
    const { data: revData } = await supabase
      .from('transactions')
      .select('created_at, metadata')
      .eq('type', 'topup')
      .eq('status', 'completed')
      .gte('created_at', monthStart);

    const revByDay: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const date = format(subDays(today, i), 'dd.MM');
      revByDay[date] = 0;
    }

    revData?.forEach(t => {
      const date = format(new Date(t.created_at), 'dd.MM');
      const price = typeof t.metadata === 'object' && t.metadata !== null 
        ? (t.metadata as { price?: number }).price || 0 
        : 0;
      if (revByDay[date] !== undefined) {
        revByDay[date] += price;
      }
    });

    setRevenueData(Object.entries(revByDay).map(([date, count]) => ({ date, count })));

    // Recent events
    const eventsList: Event[] = [];

    // Recent registrations
    const { data: recentProfiles } = await supabase
      .from('profiles')
      .select('id, email, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    recentProfiles?.forEach(p => {
      eventsList.push({
        id: `reg-${p.id}`,
        type: 'registration',
        user: p.email || 'Unknown',
        details: 'Новая регистрация',
        time: p.created_at,
      });
    });

    // Recent payments
    const { data: recentPayments } = await supabase
      .from('transactions')
      .select('id, user_id, amount, created_at, metadata')
      .eq('type', 'topup')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(5);

    for (const p of recentPayments || []) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', p.user_id)
        .single();

      const price = typeof p.metadata === 'object' && p.metadata !== null 
        ? (p.metadata as { price?: number }).price || 0 
        : 0;

      eventsList.push({
        id: `pay-${p.id}`,
        type: 'payment',
        user: profile?.email || 'Unknown',
        details: `Оплата ${price} ₽ (${p.amount} токенов)`,
        time: p.created_at,
      });
    }

    // Recent generations
    const { data: recentGens } = await supabase
      .from('generations')
      .select('id, user_id, type, model, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    for (const g of recentGens || []) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', g.user_id)
        .single();

      eventsList.push({
        id: `gen-${g.id}`,
        type: 'generation',
        user: profile?.email || 'Unknown',
        details: `${g.type} - ${g.model || 'N/A'}`,
        time: g.created_at,
      });
    }

    // Sort by time
    eventsList.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    setEvents(eventsList.slice(0, 10));

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">📊 Дашборд</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Всего пользователей
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
            <div className="flex items-center text-xs mt-1">
              {stats.userGrowth >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
              )}
              <span className={stats.userGrowth >= 0 ? 'text-green-500' : 'text-red-500'}>
                {stats.userGrowth >= 0 ? '+' : ''}{stats.userGrowth}% за неделю
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Активных сегодня
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeToday}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {stats.totalUsers > 0 
                ? `${Math.round(stats.activeToday / stats.totalUsers * 100)}% от всех`
                : '0%'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Генераций сегодня
            </CardTitle>
            <Palette className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.generationsToday}</div>
            <div className="flex gap-1 mt-1 flex-wrap">
              {generationsByType.slice(0, 3).map(t => (
                <Badge 
                  key={t.name} 
                  variant="secondary" 
                  className="text-xs"
                  style={{ backgroundColor: `${t.color}20`, color: t.color }}
                >
                  {t.name}: {t.value}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Выручка за месяц
            </CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.revenueMonth.toLocaleString()} ₽</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Registrations Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Регистрации за 30 дней</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={registrations}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Generations by Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Генерации по типам</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={generationsByType}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {generationsByType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Models */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Топ-5 моделей</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topModels} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={100} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Выручка за 30 дней</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    formatter={(value) => [`${value} ₽`, 'Выручка']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Events */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Последние события</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {events.map((event) => (
              <div 
                key={event.id} 
                className="flex items-center gap-4 p-3 rounded-lg bg-muted/30"
              >
                <div className={`p-2 rounded-full ${
                  event.type === 'registration' ? 'bg-blue-500/20 text-blue-500' :
                  event.type === 'payment' ? 'bg-green-500/20 text-green-500' :
                  'bg-purple-500/20 text-purple-500'
                }`}>
                  {event.type === 'registration' ? <Users className="h-4 w-4" /> :
                   event.type === 'payment' ? <Coins className="h-4 w-4" /> :
                   <Palette className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{event.details}</p>
                  <p className="text-xs text-muted-foreground truncate">{event.user}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {format(new Date(event.time), 'HH:mm', { locale: ru })}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
