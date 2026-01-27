import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { useToast } from "@/hooks/use-toast";
import { ProfileCard } from "@/components/profile/ProfileCard";
import { TokensSection } from "@/components/profile/TokensSection";
import { AchievementsSection } from "@/components/profile/AchievementsSection";
import { MyWorksSection } from "@/components/profile/MyWorksSection";
import { PlanSection } from "@/components/profile/PlanSection";
import { SettingsSection } from "@/components/profile/SettingsSection";
import { DAILY_BONUS_BY_ROLE, STREAK_BONUSES, XP_REWARDS } from "@/lib/gamification";

interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  tokens_balance: number;
  level: number;
  experience: number;
  daily_bonus_claimed_at: string | null;
  bonus_streak: number;
  created_at: string;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  requirement_type: string;
  requirement_value: number;
  reward_tokens: number;
  reward_xp: number;
}

interface UserAchievement {
  achievement_id: string;
  unlocked_at: string;
}

interface Generation {
  id: string;
  type: string;
  prompt: string;
  result_url: string | null;
  model: string | null;
  is_public: boolean;
  likes_count: number;
  created_at: string;
}

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState("free");
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [userStats, setUserStats] = useState({
    photo_count: 0,
    video_count: 0,
    music_count: 0,
    agent_count: 0,
    total_generations: 0,
    total_likes: 0,
    bonus_streak: 0,
    level: 1,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user]);

  const loadAllData = async () => {
    if (!user) return;
    setIsLoading(true);

    // Load profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileData) {
      setProfile(profileData);
      setUserStats(prev => ({
        ...prev,
        bonus_streak: profileData.bonus_streak || 0,
        level: profileData.level,
      }));
    }

    // Load role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (roleData) {
      setRole(roleData.role);
    }

    // Load achievements
    const { data: achievementsData } = await supabase
      .from("achievements")
      .select("*");

    if (achievementsData) {
      setAchievements(achievementsData);
    }

    // Load user achievements
    const { data: userAchievementsData } = await supabase
      .from("user_achievements")
      .select("achievement_id, unlocked_at")
      .eq("user_id", user.id);

    if (userAchievementsData) {
      setUserAchievements(userAchievementsData);
    }

    // Load generations
    const { data: generationsData } = await supabase
      .from("generations")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (generationsData) {
      setGenerations(generationsData);

      // Calculate stats
      const stats = {
        photo_count: generationsData.filter(g => g.type === "photo").length,
        video_count: generationsData.filter(g => g.type === "video").length,
        music_count: generationsData.filter(g => g.type === "music").length,
        agent_count: 0,
        total_generations: generationsData.length,
        total_likes: generationsData.reduce((sum, g) => sum + g.likes_count, 0),
        bonus_streak: profileData?.bonus_streak || 0,
        level: profileData?.level || 1,
      };

      // Get agent count
      const { count: agentCount } = await supabase
        .from("agents")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_template", false);

      stats.agent_count = agentCount || 0;
      setUserStats(stats);
    }

    // Calculate total spent
    const { data: transactionsData } = await supabase
      .from("transactions")
      .select("amount")
      .eq("user_id", user.id)
      .eq("type", "spend");

    if (transactionsData) {
      setTotalSpent(transactionsData.reduce((sum, t) => sum + Math.abs(t.amount), 0));
    }

    setIsLoading(false);
  };

  const handleUpdateName = async (name: string) => {
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ name })
      .eq("id", user.id);

    if (error) {
      toast({ title: "Ошибка сохранения", variant: "destructive" });
      return;
    }

    setProfile(prev => prev ? { ...prev, name } : null);
    toast({ title: "Имя обновлено!" });
  };

  const handleClaimBonus = async () => {
    if (!user || !profile) return;

    const bonusAmount = DAILY_BONUS_BY_ROLE[role as keyof typeof DAILY_BONUS_BY_ROLE] || 5;
    
    // Check if this continues a streak
    const lastClaim = profile.daily_bonus_claimed_at 
      ? new Date(profile.daily_bonus_claimed_at) 
      : null;
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    let newStreak = 1;
    if (lastClaim) {
      const lastClaimDay = new Date(lastClaim.getFullYear(), lastClaim.getMonth(), lastClaim.getDate());
      const yesterdayDay = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
      if (lastClaimDay.getTime() === yesterdayDay.getTime()) {
        newStreak = (profile.bonus_streak || 0) + 1;
      }
    }

    // Check for streak bonuses
    let extraBonus = 0;
    const streakBonus = STREAK_BONUSES.find(b => b.days === newStreak);
    if (streakBonus) {
      extraBonus = streakBonus.tokens;
    }

    const totalBonus = bonusAmount + extraBonus;
    const newBalance = profile.tokens_balance + totalBonus;
    const newXP = profile.experience + XP_REWARDS.daily_login;

    // Update profile
    const { error } = await supabase
      .from("profiles")
      .update({
        tokens_balance: newBalance,
        experience: newXP,
        daily_bonus_claimed_at: now.toISOString(),
        bonus_streak: newStreak,
      })
      .eq("id", user.id);

    if (error) {
      toast({ title: "Ошибка получения бонуса", variant: "destructive" });
      return;
    }

    // Add transaction
    await supabase.from("transactions").insert({
      user_id: user.id,
      amount: totalBonus,
      type: "bonus",
      description: extraBonus > 0 
        ? `Ежедневный бонус + серия ${newStreak} дней` 
        : "Ежедневный бонус",
    });

    // Update local state
    setProfile(prev => prev ? {
      ...prev,
      tokens_balance: newBalance,
      experience: newXP,
      daily_bonus_claimed_at: now.toISOString(),
      bonus_streak: newStreak,
    } : null);

    if (extraBonus > 0) {
      toast({
        title: `🎉 Вы получили ${totalBonus} токенов!`,
        description: `Бонус за серию ${newStreak} дней: +${extraBonus} токенов`,
      });
    } else {
      toast({ title: `🎁 Вы получили ${bonusAmount} токенов!` });
    }
  };

  const handleTogglePublic = async (id: string, isPublic: boolean) => {
    const { error } = await supabase
      .from("generations")
      .update({ is_public: isPublic })
      .eq("id", id);

    if (error) {
      toast({ title: "Ошибка", variant: "destructive" });
      return;
    }

    setGenerations(prev => prev.map(g => g.id === id ? { ...g, is_public: isPublic } : g));
    toast({ title: isPublic ? "Опубликовано!" : "Скрыто из галереи" });
  };

  const handleDeleteGeneration = async (id: string) => {
    const { error } = await supabase
      .from("generations")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Ошибка удаления", variant: "destructive" });
      return;
    }

    setGenerations(prev => prev.filter(g => g.id !== id));
    toast({ title: "Удалено" });
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  if (isLoading || !profile) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container max-w-4xl mx-auto py-8 px-4 space-y-6">
        {/* Profile Section */}
        <ProfileCard
          profile={profile}
          role={role}
          onUpdateName={handleUpdateName}
          onUpdateAvatar={() => {
            toast({ title: "Скоро!", description: "Загрузка аватара в разработке" });
          }}
        />

        {/* Tokens Section */}
        <TokensSection
          balance={profile.tokens_balance}
          totalSpent={totalSpent}
          streak={profile.bonus_streak || 0}
          role={role}
          dailyBonusClaimedAt={profile.daily_bonus_claimed_at}
          onClaimBonus={handleClaimBonus}
        />

        {/* Achievements Section */}
        <AchievementsSection
          achievements={achievements}
          userAchievements={userAchievements}
          userStats={userStats}
        />

        {/* My Works Section */}
        <MyWorksSection
          generations={generations}
          onTogglePublic={handleTogglePublic}
          onDelete={handleDeleteGeneration}
        />

        {/* Plan Section */}
        <PlanSection role={role} />

        {/* Settings Section */}
        <SettingsSection onLogout={handleLogout} />
      </div>
    </AppLayout>
  );
}
