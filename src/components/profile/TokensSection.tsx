import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, Gift, Flame, Sparkles } from "lucide-react";
import { DAILY_BONUS_BY_ROLE, STREAK_BONUSES } from "@/lib/gamification";

interface TokensSectionProps {
  balance: number;
  totalSpent: number;
  streak: number;
  role: string;
  dailyBonusClaimedAt: string | null;
  onClaimBonus: () => Promise<void>;
  onTopUp?: () => void;
}

export function TokensSection({
  balance,
  totalSpent,
  streak,
  role,
  dailyBonusClaimedAt,
  onClaimBonus,
  onTopUp,
}: TokensSectionProps) {
  const [isClaiming, setIsClaiming] = useState(false);
  const [timeUntilNext, setTimeUntilNext] = useState("");

  const bonusAmount = DAILY_BONUS_BY_ROLE[role as keyof typeof DAILY_BONUS_BY_ROLE] || 5;

  const canClaimBonus = () => {
    if (!dailyBonusClaimedAt) return true;
    const lastClaim = new Date(dailyBonusClaimedAt);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastClaimDay = new Date(lastClaim.getFullYear(), lastClaim.getMonth(), lastClaim.getDate());
    return today > lastClaimDay;
  };

  useEffect(() => {
    if (!dailyBonusClaimedAt || canClaimBonus()) return;

    const updateTimer = () => {
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const diff = tomorrow.getTime() - now.getTime();
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeUntilNext(`${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [dailyBonusClaimedAt]);

  const handleClaim = async () => {
    setIsClaiming(true);
    await onClaimBonus();
    setIsClaiming(false);
  };

  const nextStreakBonus = STREAK_BONUSES.find(b => b.days > streak);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Balance Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-500" />
            Баланс токенов
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-4xl font-bold">{balance}</span>
            <span className="text-muted-foreground">токенов</span>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Потрачено за всё время: {totalSpent} токенов
          </p>
          <Button 
            onClick={onTopUp}
            className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Пополнить
          </Button>
        </CardContent>
      </Card>

      {/* Daily Bonus Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-green-500" />
            Ежедневный бонус
          </CardTitle>
        </CardHeader>
        <CardContent>
          {canClaimBonus() ? (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                Получите {bonusAmount} токенов бесплатно!
              </p>
              <Button
                onClick={handleClaim}
                disabled={isClaiming}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:opacity-90 text-white"
              >
                <Gift className="w-4 h-4 mr-2" />
                {isClaiming ? "Получаем..." : `🎁 Получить ${bonusAmount} токенов!`}
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="bg-green-500/10 text-green-500">
                  ✅ Бонус получен
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Следующий через: <span className="font-mono font-bold">{timeUntilNext}</span>
              </p>
            </>
          )}

          {/* Streak */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-5 h-5 text-orange-500" />
              <span className="font-semibold">Серия: {streak} {streak === 1 ? "день" : streak < 5 ? "дня" : "дней"}</span>
            </div>
            {nextStreakBonus && (
              <p className="text-sm text-muted-foreground">
                Ещё {nextStreakBonus.days - streak} дней до бонуса +{nextStreakBonus.tokens} токенов
              </p>
            )}
            <div className="flex gap-2 mt-3">
              {STREAK_BONUSES.map((bonus) => (
                <Badge
                  key={bonus.days}
                  variant={streak >= bonus.days ? "default" : "outline"}
                  className={streak >= bonus.days ? "bg-orange-500" : ""}
                >
                  {bonus.days}д: +{bonus.tokens}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
