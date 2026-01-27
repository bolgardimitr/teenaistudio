import { Coins, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState } from 'react';

export function TokenBalance() {
  const { profile, refreshProfile } = useAuth();
  const [claiming, setClaiming] = useState(false);

  const canClaimBonus = () => {
    if (!profile?.daily_bonus_claimed_at) return true;
    const lastClaim = new Date(profile.daily_bonus_claimed_at);
    const now = new Date();
    return lastClaim.toDateString() !== now.toDateString();
  };

  const claimDailyBonus = async () => {
    if (!profile) return;
    setClaiming(true);

    try {
      const bonusAmount = 10;

      await supabase
        .from('profiles')
        .update({
          tokens_balance: profile.tokens_balance + bonusAmount,
          daily_bonus_claimed_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      await supabase.from('transactions').insert({
        user_id: profile.id,
        amount: bonusAmount,
        type: 'bonus',
        description: 'Ежедневный бонус',
      });

      await refreshProfile();
      toast.success(`🎉 Вы получили ${bonusAmount} токенов!`);
    } catch (error) {
      toast.error('Ошибка при получении бонуса');
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl gradient-primary p-6 md:p-8 animate-slide-up">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgZmlsbD0iI2ZmZiIgY3g9IjMwIiBjeT0iMzAiIHI9IjIiIG9wYWNpdHk9Ii4xIi8+PC9nPjwvc3ZnPg==')] opacity-30" />
      
      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <p className="text-white/80 text-sm mb-1">Ваш баланс</p>
          <div className="flex items-center gap-3">
            <Coins className="h-8 w-8 text-studio-agent" />
            <span className="text-4xl md:text-5xl font-bold text-white">
              {profile?.tokens_balance ?? 0}
            </span>
            <span className="text-white/60 text-lg">токенов</span>
          </div>
        </div>

        {canClaimBonus() && (
          <Button
            onClick={claimDailyBonus}
            disabled={claiming}
            className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border border-white/30 rounded-xl gap-2 transition-all duration-300 hover:scale-105"
          >
            <Sparkles className="h-4 w-4" />
            {claiming ? 'Получение...' : 'Получить ежедневный бонус'}
          </Button>
        )}
      </div>

      <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -top-10 -left-10 w-32 h-32 rounded-full bg-white/5 blur-2xl" />
    </div>
  );
}