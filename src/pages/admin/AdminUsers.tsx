import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, MoreHorizontal, Eye, Coins, RefreshCw, Ban, Trash2, Plus, Minus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Textarea } from '@/components/ui/textarea';

interface UserData {
  id: string;
  email: string | null;
  name: string | null;
  tokens_balance: number;
  created_at: string;
  role: string;
  generations_count: number;
}

const ROLE_COLORS: Record<string, string> = {
  free: 'bg-gray-500/20 text-gray-400',
  basic: 'bg-blue-500/20 text-blue-400',
  premium: 'bg-purple-500/20 text-purple-400',
  admin: 'bg-red-500/20 text-red-400',
};

export default function AdminUsers() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  // Modal states
  const [tokenModal, setTokenModal] = useState<{
    open: boolean;
    type: 'add' | 'remove';
    user: UserData | null;
    amount: string;
    reason: string;
  }>({
    open: false,
    type: 'add',
    user: null,
    amount: '',
    reason: '',
  });

  const [bulkTokenModal, setBulkTokenModal] = useState<{
    open: boolean;
    amount: string;
    reason: string;
  }>({
    open: false,
    amount: '',
    reason: '',
  });

  const [roleModal, setRoleModal] = useState<{
    open: boolean;
    user: UserData | null;
    newRole: string;
  }>({
    open: false,
    user: null,
    newRole: '',
  });

  useEffect(() => {
    loadUsers();
  }, [roleFilter, sortBy]);

  const loadUsers = async () => {
    setLoading(true);

    // Get profiles
    let query = supabase
      .from('profiles')
      .select('id, email, name, tokens_balance, created_at');

    if (sortBy === 'created_at') {
      query = query.order('created_at', { ascending: false });
    } else if (sortBy === 'tokens_balance') {
      query = query.order('tokens_balance', { ascending: false });
    }

    const { data: profiles, error } = await query;

    if (error) {
      toast({ title: 'Ошибка загрузки', variant: 'destructive' });
      setLoading(false);
      return;
    }

    // Get roles and generation counts
    const usersData: UserData[] = [];

    for (const profile of profiles || []) {
      // Get role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', profile.id)
        .single();

      // Get generations count
      const { count: gensCount } = await supabase
        .from('generations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id);

      const role = roleData?.role || 'free';

      if (roleFilter === 'all' || role === roleFilter) {
        usersData.push({
          ...profile,
          role,
          generations_count: gensCount || 0,
        });
      }
    }

    // Apply search filter
    const filtered = usersData.filter(u => 
      !search || 
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.name?.toLowerCase().includes(search.toLowerCase())
    );

    setUsers(filtered);
    setLoading(false);
  };

  const handleSearch = () => {
    loadUsers();
  };

  const handleAddTokens = async () => {
    if (!tokenModal.user || !tokenModal.amount) return;

    const amount = parseInt(tokenModal.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Введите корректное количество', variant: 'destructive' });
      return;
    }

    const newBalance = tokenModal.type === 'add'
      ? tokenModal.user.tokens_balance + amount
      : Math.max(0, tokenModal.user.tokens_balance - amount);

    // Update balance
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ tokens_balance: newBalance })
      .eq('id', tokenModal.user.id);

    if (updateError) {
      toast({ title: 'Ошибка обновления баланса', variant: 'destructive' });
      return;
    }

    // Create transaction
    await supabase.from('transactions').insert({
      user_id: tokenModal.user.id,
      amount: tokenModal.type === 'add' ? amount : -amount,
      type: 'admin',
      description: tokenModal.reason || (tokenModal.type === 'add' ? 'Начислено администратором' : 'Списано администратором'),
    });

    toast({
      title: tokenModal.type === 'add' ? 'Токены начислены!' : 'Токены списаны!',
      description: `${tokenModal.type === 'add' ? '+' : '-'}${amount} токенов для ${tokenModal.user.email}`,
    });

    setTokenModal({ open: false, type: 'add', user: null, amount: '', reason: '' });
    loadUsers();
  };

  const handleBulkAddTokens = async () => {
    if (selectedUsers.size === 0 || !bulkTokenModal.amount) return;

    const amount = parseInt(bulkTokenModal.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Введите корректное количество', variant: 'destructive' });
      return;
    }

    let successCount = 0;

    for (const userId of selectedUsers) {
      const user = users.find(u => u.id === userId);
      if (!user) continue;

      const newBalance = user.tokens_balance + amount;

      const { error } = await supabase
        .from('profiles')
        .update({ tokens_balance: newBalance })
        .eq('id', userId);

      if (!error) {
        await supabase.from('transactions').insert({
          user_id: userId,
          amount,
          type: 'admin',
          description: bulkTokenModal.reason || 'Массовое начисление администратором',
        });
        successCount++;
      }
    }

    toast({
      title: 'Массовое начисление завершено!',
      description: `+${amount} токенов для ${successCount} пользователей`,
    });

    setBulkTokenModal({ open: false, amount: '', reason: '' });
    setSelectedUsers(new Set());
    loadUsers();
  };

  const handleChangeRole = async () => {
    if (!roleModal.user || !roleModal.newRole) return;

    const validRoles = ['free', 'basic', 'premium', 'admin'] as const;
    type ValidRole = typeof validRoles[number];
    
    if (!validRoles.includes(roleModal.newRole as ValidRole)) {
      toast({ title: 'Некорректная роль', variant: 'destructive' });
      return;
    }

    const { error } = await supabase
      .from('user_roles')
      .update({ role: roleModal.newRole as ValidRole })
      .eq('user_id', roleModal.user.id);

    if (error) {
      toast({ title: 'Ошибка изменения роли', variant: 'destructive' });
      return;
    }

    toast({
      title: 'Роль изменена!',
      description: `${roleModal.user.email} теперь ${roleModal.newRole}`,
    });

    setRoleModal({ open: false, user: null, newRole: '' });
    loadUsers();
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map(u => u.id)));
    }
  };

  const toggleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">👥 Пользователи</h1>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск по email или имени..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Роль" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все роли</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Сортировка" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Дата регистрации</SelectItem>
                <SelectItem value="tokens_balance">Баланс</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSearch}>
              <Search className="h-4 w-4 mr-2" />
              Поиск
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedUsers.size > 0 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">
                Выбрано: <strong>{selectedUsers.size}</strong> пользователей
              </span>
              <Button onClick={() => setBulkTokenModal({ open: true, amount: '', reason: '' })}>
                <Coins className="h-4 w-4 mr-2" />
                Начислить выбранным
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users Table */}
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
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={selectedUsers.size === users.length && users.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Имя</TableHead>
                  <TableHead>Роль</TableHead>
                  <TableHead className="text-right">Баланс</TableHead>
                  <TableHead className="text-right">Генераций</TableHead>
                  <TableHead>Регистрация</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedUsers.has(user.id)}
                        onCheckedChange={() => toggleSelectUser(user.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>{user.name || '-'}</TableCell>
                    <TableCell>
                      <Badge className={ROLE_COLORS[user.role] || ROLE_COLORS.free}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {user.tokens_balance.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">{user.generations_count}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(user.created_at), 'dd.MM.yyyy', { locale: ru })}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover border-border">
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            Просмотреть профиль
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setTokenModal({ 
                              open: true, 
                              type: 'add', 
                              user, 
                              amount: '', 
                              reason: '' 
                            })}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Начислить токены
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setTokenModal({ 
                              open: true, 
                              type: 'remove', 
                              user, 
                              amount: '', 
                              reason: '' 
                            })}
                          >
                            <Minus className="h-4 w-4 mr-2" />
                            Списать токены
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setRoleModal({ open: true, user, newRole: user.role })}
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Изменить роль
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">
                            <Ban className="h-4 w-4 mr-2" />
                            Заблокировать
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Удалить
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Token Modal */}
      <Dialog open={tokenModal.open} onOpenChange={(open) => setTokenModal({ ...tokenModal, open })}>
        <DialogContent className="bg-background border-border">
          <DialogHeader>
            <DialogTitle>
              {tokenModal.type === 'add' ? '💰 Начислить токены' : '💸 Списать токены'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Пользователь:</p>
              <p className="font-medium">{tokenModal.user?.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Текущий баланс:</p>
              <p className="font-medium">{tokenModal.user?.tokens_balance.toLocaleString()} токенов</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">
                {tokenModal.type === 'add' ? 'Начислить:' : 'Списать:'}
              </label>
              <Input
                type="number"
                placeholder="Количество токенов"
                value={tokenModal.amount}
                onChange={(e) => setTokenModal({ ...tokenModal, amount: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Причина:</label>
              <Textarea
                placeholder="Причина начисления/списания"
                value={tokenModal.reason}
                onChange={(e) => setTokenModal({ ...tokenModal, reason: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTokenModal({ ...tokenModal, open: false })}>
              Отмена
            </Button>
            <Button onClick={handleAddTokens}>
              {tokenModal.type === 'add' ? 'Начислить' : 'Списать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Token Modal */}
      <Dialog open={bulkTokenModal.open} onOpenChange={(open) => setBulkTokenModal({ ...bulkTokenModal, open })}>
        <DialogContent className="bg-background border-border">
          <DialogHeader>
            <DialogTitle>💰 Массовое начисление токенов</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Выбрано пользователей:</p>
              <p className="font-medium">{selectedUsers.size}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Начислить каждому:</label>
              <Input
                type="number"
                placeholder="Количество токенов"
                value={bulkTokenModal.amount}
                onChange={(e) => setBulkTokenModal({ ...bulkTokenModal, amount: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Причина:</label>
              <Textarea
                placeholder="Причина начисления"
                value={bulkTokenModal.reason}
                onChange={(e) => setBulkTokenModal({ ...bulkTokenModal, reason: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkTokenModal({ ...bulkTokenModal, open: false })}>
              Отмена
            </Button>
            <Button onClick={handleBulkAddTokens}>
              Начислить всем
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Modal */}
      <Dialog open={roleModal.open} onOpenChange={(open) => setRoleModal({ ...roleModal, open })}>
        <DialogContent className="bg-background border-border">
          <DialogHeader>
            <DialogTitle>🔄 Изменить роль</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Пользователь:</p>
              <p className="font-medium">{roleModal.user?.email}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Новая роль:</label>
              <Select value={roleModal.newRole} onValueChange={(v) => setRoleModal({ ...roleModal, newRole: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите роль" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleModal({ ...roleModal, open: false })}>
              Отмена
            </Button>
            <Button onClick={handleChangeRole}>
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
