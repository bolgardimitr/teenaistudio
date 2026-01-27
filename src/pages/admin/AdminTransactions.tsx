import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Download, TrendingUp, TrendingDown, Gift, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface TransactionData {
  id: string;
  user_id: string;
  user_email: string;
  type: string;
  amount: number;
  description: string | null;
  status: string;
  created_at: string;
}

const TYPE_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  topup: { icon: TrendingUp, color: 'bg-green-500/20 text-green-400', label: 'Пополнение' },
  spend: { icon: TrendingDown, color: 'bg-red-500/20 text-red-400', label: 'Списание' },
  bonus: { icon: Gift, color: 'bg-purple-500/20 text-purple-400', label: 'Бонус' },
  admin: { icon: Shield, color: 'bg-blue-500/20 text-blue-400', label: 'Админ' },
};

export default function AdminTransactions() {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [periodFilter, setPeriodFilter] = useState<string>('all');

  useEffect(() => {
    loadTransactions();
  }, [typeFilter, periodFilter]);

  const loadTransactions = async () => {
    setLoading(true);

    let query = supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (typeFilter !== 'all') {
      query = query.eq('type', typeFilter);
    }

    if (periodFilter !== 'all') {
      const now = new Date();
      let startDate: Date;
      
      switch (periodFilter) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0);
      }
      
      query = query.gte('created_at', startDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      toast({ title: 'Ошибка загрузки', variant: 'destructive' });
      setLoading(false);
      return;
    }

    // Enrich with user emails
    const enriched: TransactionData[] = [];
    for (const tx of data || []) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', tx.user_id)
        .single();

      enriched.push({
        ...tx,
        user_email: profile?.email || 'Unknown',
      });
    }

    // Apply search filter
    const filtered = search
      ? enriched.filter(tx => tx.user_email.toLowerCase().includes(search.toLowerCase()))
      : enriched;

    setTransactions(filtered);
    setLoading(false);
  };

  const handleSearch = () => {
    loadTransactions();
  };

  const handleExport = () => {
    // Generate CSV
    const headers = ['ID', 'Пользователь', 'Тип', 'Сумма', 'Описание', 'Статус', 'Дата'];
    const rows = transactions.map(tx => [
      tx.id,
      tx.user_email,
      TYPE_CONFIG[tx.type]?.label || tx.type,
      tx.amount.toString(),
      tx.description || '',
      tx.status,
      format(new Date(tx.created_at), 'dd.MM.yyyy HH:mm'),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `transactions_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();

    toast({ title: 'Экспортировано!' });
  };

  const TypeBadge = ({ type }: { type: string }) => {
    const config = TYPE_CONFIG[type] || TYPE_CONFIG.spend;
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">💰 Транзакции</h1>
        <Button onClick={handleExport} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Экспорт в CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск по email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Тип" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все типы</SelectItem>
                <SelectItem value="topup">Пополнение</SelectItem>
                <SelectItem value="spend">Списание</SelectItem>
                <SelectItem value="bonus">Бонус</SelectItem>
                <SelectItem value="admin">Админ</SelectItem>
              </SelectContent>
            </Select>

            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Период" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Всё время</SelectItem>
                <SelectItem value="today">Сегодня</SelectItem>
                <SelectItem value="week">Неделя</SelectItem>
                <SelectItem value="month">Месяц</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={handleSearch}>
              <Search className="h-4 w-4 mr-2" />
              Поиск
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Пользователь</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead className="text-right">Сумма</TableHead>
                  <TableHead>Описание</TableHead>
                  <TableHead>Дата</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {tx.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {tx.user_email}
                    </TableCell>
                    <TableCell>
                      <TypeBadge type={tx.type} />
                    </TableCell>
                    <TableCell className={`text-right font-medium ${
                      tx.amount >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {tx.amount >= 0 ? '+' : ''}{tx.amount}
                    </TableCell>
                    <TableCell className="max-w-[250px] truncate text-muted-foreground">
                      {tx.description || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(tx.created_at), 'dd.MM HH:mm', { locale: ru })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
