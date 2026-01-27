import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Lock } from "lucide-react";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement_type: string;
  requirement_value: number;
  reward_tokens: number;
  reward_xp: number;
}

interface UserAchievement {
  achievement_id: string;
  unlocked_at: string;
}

interface AchievementsSectionProps {
  achievements: Achievement[];
  userAchievements: UserAchievement[];
  userStats: {
    photo_count: number;
    video_count: number;
    music_count: number;
    agent_count: number;
    total_generations: number;
    total_likes: number;
    bonus_streak: number;
    level: number;
  };
}

export function AchievementsSection({
  achievements,
  userAchievements,
  userStats,
}: AchievementsSectionProps) {
  const unlockedIds = new Set(userAchievements.map(ua => ua.achievement_id));

  const getProgress = (achievement: Achievement): { current: number; percentage: number } => {
    const statMap: Record<string, number> = {
      photo_count: userStats.photo_count,
      video_count: userStats.video_count,
      music_count: userStats.music_count,
      agent_count: userStats.agent_count,
      total_generations: userStats.total_generations,
      total_likes: userStats.total_likes,
      bonus_streak: userStats.bonus_streak,
      level: userStats.level,
    };

    const current = statMap[achievement.requirement_type] || 0;
    const percentage = Math.min((current / achievement.requirement_value) * 100, 100);
    return { current, percentage };
  };

  const unlockedAchievements = achievements.filter(a => unlockedIds.has(a.id));
  const lockedAchievements = achievements.filter(a => !unlockedIds.has(a.id));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          Достижения
          <Badge variant="secondary">
            {unlockedAchievements.length} / {achievements.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Unlocked */}
          {unlockedAchievements.map((achievement) => {
            const userAchievement = userAchievements.find(ua => ua.achievement_id === achievement.id);
            return (
              <Card key={achievement.id} className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/30">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-2xl">
                      {achievement.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold truncate">{achievement.name}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {achievement.description}
                      </p>
                      {userAchievement && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Получено {new Date(userAchievement.unlocked_at).toLocaleDateString("ru-RU")}
                        </p>
                      )}
                    </div>
                  </div>
                  {(achievement.reward_tokens > 0 || achievement.reward_xp > 0) && (
                    <div className="flex gap-2 mt-3">
                      {achievement.reward_tokens > 0 && (
                        <Badge variant="secondary">+{achievement.reward_tokens} 💰</Badge>
                      )}
                      {achievement.reward_xp > 0 && (
                        <Badge variant="secondary">+{achievement.reward_xp} XP</Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {/* Locked */}
          {lockedAchievements.map((achievement) => {
            const progress = getProgress(achievement);
            return (
              <Card key={achievement.id} className="bg-muted/30 opacity-75">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-2xl grayscale">
                      {achievement.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold truncate">{achievement.name}</h4>
                        <Lock className="w-3 h-3 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {achievement.description}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Прогресс</span>
                      <span>{progress.current} / {achievement.requirement_value}</span>
                    </div>
                    <Progress value={progress.percentage} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
