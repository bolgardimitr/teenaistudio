import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Coins, CreditCard, Sparkles, Crown, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface TopUpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TokenPackage {
  id: string;
  name: string;
  tokens: number;
  bonus: number;
  price: number;
  pricePerToken: number;
  popular?: boolean;
  bestValue?: boolean;
}

const TOKEN_PACKAGES: TokenPackage[] = [
  { id: 'mini', name: 'Мини', tokens: 200, bonus: 0, price: 149, pricePerToken: 0.75 },
  { id: 'starter', name: 'Стартовый', tokens: 500, bonus: 50, price: 299, pricePerToken: 0.54, popular: true },
  { id: 'basic', name: 'Базовый', tokens: 1500, bonus: 200, price: 799, pricePerToken: 0.47 },
  { id: 'advanced', name: 'Продвинутый', tokens: 4000, bonus: 600, price: 1990, pricePerToken: 0.43 },
  { id: 'max', name: 'Максимальный', tokens: 10000, bonus: 2000, price: 4490, pricePerToken: 0.37, bestValue: true },
];

const PREMIUM_SUBSCRIPTION = {
  price: 990,
  tokens: 2000,
  features: [
    'Доступ ко всем моделям',
    'Безлимитные агенты',
    'Приоритетная поддержка',
  ],
};

// Price per token for custom amounts (same as starter)
const CUSTOM_PRICE_PER_TOKEN = 0.60;

export function TopUpModal({ open, onOpenChange }: TopUpModalProps) {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [selectedPackage, setSelectedPackage] = useState<TokenPackage | null>(null);
  const [customTokens, setCustomTokens] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const customAmount = parseInt(customTokens) || 0;
  const customPrice = Math.ceil(customAmount * CUSTOM_PRICE_PER_TOKEN);

  const isCustomMode = customTokens.length > 0 && customAmount >= 100;

  const totalTokens = isCustomMode 
    ? customAmount 
    : (selectedPackage ? selectedPackage.tokens + selectedPackage.bonus : 0);
  
  const totalPrice = isCustomMode 
    ? customPrice 
    : (selectedPackage?.price || 0);

  const bonusTokens = isCustomMode ? 0 : (selectedPackage?.bonus || 0);

  useEffect(() => {
    if (customTokens.length > 0) {
      setSelectedPackage(null);
    }
  }, [customTokens]);

  const handleSelectPackage = (pkg: TokenPackage) => {
    setSelectedPackage(pkg);
    setCustomTokens('');
  };

  const handlePayment = async () => {
    if (!user || totalPrice === 0) return;

    setIsProcessing(true);

    try {
      // Create pending transaction
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          amount: totalTokens,
          type: 'topup',
          status: 'pending',
          description: isCustomMode 
            ? `Пополнение: ${customAmount} токенов` 
            : `Пакет "${selectedPackage?.name}": ${selectedPackage?.tokens} + ${selectedPackage?.bonus} бонус`,
          metadata: {
            package_id: selectedPackage?.id || 'custom',
            tokens: isCustomMode ? customAmount : selectedPackage?.tokens,
            bonus: bonusTokens,
            price: totalPrice,
          },
        })
        .select()
        .single();

      if (txError) throw txError;

      // Check if CloudPayments is available
      if (typeof (window as any).cp === 'undefined') {
        // Fallback: simulate successful payment for development
        console.warn('CloudPayments not loaded, simulating payment...');
        
        // Update transaction status
        await supabase
          .from('transactions')
          .update({ status: 'completed' })
          .eq('id', transaction.id);

        // Update user balance
        const newBalance = (profile?.tokens_balance || 0) + totalTokens;
        await supabase
          .from('profiles')
          .update({ tokens_balance: newBalance })
          .eq('id', user.id);

        await refreshProfile();

        toast({
          title: '✅ Успешно!',
          description: `Начислено ${totalTokens} токенов`,
        });

        onOpenChange(false);
        setSelectedPackage(null);
        setCustomTokens('');
        return;
      }

      // Initialize CloudPayments widget
      const widget = new (window as any).cp.CloudPayments();
      
      widget.pay('charge', {
        publicId: import.meta.env.VITE_CLOUDPAYMENTS_PUBLIC_ID,
        description: `Пополнение баланса TEEN.AI: ${totalTokens} токенов`,
        amount: totalPrice,
        currency: 'RUB',
        accountId: user.id,
        email: user.email,
        data: {
          transactionId: transaction.id,
          userId: user.id,
          tokens: totalTokens,
        },
      }, {
        onSuccess: async () => {
          // Update transaction status
          await supabase
            .from('transactions')
            .update({ status: 'completed' })
            .eq('id', transaction.id);

          // Update user balance
          const newBalance = (profile?.tokens_balance || 0) + totalTokens;
          await supabase
            .from('profiles')
            .update({ tokens_balance: newBalance })
            .eq('id', user.id);

          await refreshProfile();

          toast({
            title: '✅ Успешно!',
            description: `Начислено ${totalTokens} токенов`,
          });

          onOpenChange(false);
          setSelectedPackage(null);
          setCustomTokens('');
        },
        onFail: async (reason: string) => {
          // Update transaction status
          const currentMetadata = typeof transaction.metadata === 'object' && transaction.metadata !== null 
            ? transaction.metadata 
            : {};
          
          await supabase
            .from('transactions')
            .update({ 
              status: 'failed',
              metadata: { ...currentMetadata, error: reason },
            })
            .eq('id', transaction.id);

          toast({
            title: 'Ошибка оплаты',
            description: reason || 'Попробуйте ещё раз',
            variant: 'destructive',
          });
        },
        onComplete: () => {
          setIsProcessing(false);
        },
      });
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось создать платёж',
        variant: 'destructive',
      });
      setIsProcessing(false);
    }
  };

  const handleSubscribe = async () => {
    toast({
      title: 'Скоро!',
      description: 'Подписки будут доступны в ближайшее время',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-background border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span>💎</span> Пополнить баланс
          </DialogTitle>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Coins className="h-4 w-4 text-primary" />
            <span>Текущий баланс: <span className="font-semibold text-foreground">{profile?.tokens_balance ?? 0}</span> токенов</span>
          </div>
        </DialogHeader>

        {/* Token Packages Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
          {TOKEN_PACKAGES.map((pkg) => (
            <Card
              key={pkg.id}
              className={cn(
                'cursor-pointer transition-all duration-200 hover:scale-[1.02] relative overflow-hidden',
                selectedPackage?.id === pkg.id
                  ? 'ring-2 ring-primary bg-primary/5'
                  : 'hover:bg-muted/50'
              )}
              onClick={() => handleSelectPackage(pkg)}
            >
              {pkg.popular && (
                <Badge className="absolute top-2 right-2 bg-studio-agent text-white text-xs">
                  ⭐ Популярный
                </Badge>
              )}
              {pkg.bestValue && (
                <Badge className="absolute top-2 right-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs">
                  💎 Лучшая цена
                </Badge>
              )}
              <CardContent className="p-4 pt-8">
                <p className="text-sm text-muted-foreground">{pkg.name}</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-bold">{pkg.tokens.toLocaleString()}</span>
                  <Coins className="h-4 w-4 text-primary" />
                </div>
                {pkg.bonus > 0 && (
                  <p className="text-sm text-green-500 font-medium">+{pkg.bonus} бонус</p>
                )}
                <div className="mt-3">
                  <p className="text-lg font-semibold">{pkg.price} ₽</p>
                  <p className="text-xs text-muted-foreground">{pkg.pricePerToken} ₽/токен</p>
                </div>
                {selectedPackage?.id === pkg.id && (
                  <div className="absolute top-2 left-2">
                    <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Custom Amount */}
        <div className="mt-4 p-4 rounded-xl bg-muted/30 border border-border">
          <p className="text-sm font-medium mb-2">Или введите своё количество:</p>
          <div className="flex gap-3 items-center">
            <Input
              type="number"
              placeholder="Минимум 100"
              value={customTokens}
              onChange={(e) => setCustomTokens(e.target.value)}
              className="max-w-[150px]"
              min={100}
            />
            <span className="text-muted-foreground">токенов</span>
            {customAmount >= 100 && (
              <span className="text-sm text-muted-foreground ml-auto">
                = {customPrice} ₽ ({CUSTOM_PRICE_PER_TOKEN} ₽/токен)
              </span>
            )}
          </div>
        </div>

        {/* Summary */}
        {(selectedPackage || isCustomMode) && (
          <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Итого к начислению:</p>
                <p className="text-xl font-bold">
                  {(isCustomMode ? customAmount : selectedPackage?.tokens || 0).toLocaleString()}
                  {bonusTokens > 0 && (
                    <span className="text-green-500 text-base ml-1">+{bonusTokens}</span>
                  )}
                  <span className="text-base font-normal ml-1">токенов</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">К оплате:</p>
                <p className="text-xl font-bold gradient-text">{totalPrice} ₽</p>
              </div>
            </div>
          </div>
        )}

        {/* Pay Button */}
        <Button
          className="w-full mt-4 h-12 text-lg gradient-primary hover:opacity-90"
          disabled={totalPrice === 0 || isProcessing}
          onClick={handlePayment}
        >
          <CreditCard className="mr-2 h-5 w-5" />
          {isProcessing ? 'Обработка...' : `Оплатить ${totalPrice} ₽`}
        </Button>

        <Separator className="my-6" />

        {/* Premium Subscription */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-primary/30">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
              <Crown className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                Premium подписка
                <Badge variant="secondary" className="text-xs">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Рекомендуем
                </Badge>
              </h3>
              <p className="text-2xl font-bold mt-1">{PREMIUM_SUBSCRIPTION.price} ₽<span className="text-sm font-normal text-muted-foreground">/месяц</span></p>
              <ul className="mt-3 space-y-1">
                <li className="flex items-center gap-2 text-sm">
                  <Coins className="h-4 w-4 text-primary" />
                  <span><strong>{PREMIUM_SUBSCRIPTION.tokens}</strong> токенов каждый месяц</span>
                </li>
                {PREMIUM_SUBSCRIPTION.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-green-500" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full mt-4 border-primary/50 hover:bg-primary/10"
            onClick={handleSubscribe}
          >
            Оформить подписку
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
