// Level XP thresholds
export const LEVEL_THRESHOLDS = [
  0,      // Level 1: 0-100
  100,    // Level 2: 100-300
  300,    // Level 3: 300-600
  600,    // Level 4: 600-1000
  1000,   // Level 5: 1000-1500
  1500,   // Level 6: 1500-2100
  2100,   // Level 7: 2100-2800
  2800,   // Level 8: 2800-3600
  3600,   // Level 9: 3600-4500
  4500,   // Level 10: 4500-5500
  5500,   // Level 11+
];

export function getLevelFromXP(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      return i + 1;
    }
  }
  return 1;
}

export function getXPForNextLevel(currentLevel: number): number {
  if (currentLevel >= LEVEL_THRESHOLDS.length) {
    return LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + (currentLevel - LEVEL_THRESHOLDS.length + 1) * 1000;
  }
  return LEVEL_THRESHOLDS[currentLevel] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
}

export function getXPProgress(xp: number, level: number): { current: number; required: number; percentage: number } {
  const currentLevelXP = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextLevelXP = getXPForNextLevel(level);
  const current = xp - currentLevelXP;
  const required = nextLevelXP - currentLevelXP;
  const percentage = Math.min((current / required) * 100, 100);
  
  return { current, required, percentage };
}

// XP rewards for actions
export const XP_REWARDS = {
  video_generation: 20,
  photo_generation: 5,
  music_generation: 15,
  agent_message: 2,
  gallery_publish: 10,
  receive_like: 3,
  daily_login: 5,
};

// Daily bonus by role
export const DAILY_BONUS_BY_ROLE = {
  free: 5,
  basic: 10,
  premium: 25,
  admin: 50,
};

// Streak bonuses
export const STREAK_BONUSES = [
  { days: 7, tokens: 20 },
  { days: 14, tokens: 50 },
  { days: 30, tokens: 150 },
];

// Level rewards
export const LEVEL_REWARDS: Record<number, { title: string; description: string }> = {
  2: { title: "Доступ к GPT-4o-mini", description: "Разблокирована базовая модель OpenAI" },
  3: { title: "Увеличенный лимит", description: "До 3 бесплатных генераций в день" },
  5: { title: "Премиум модели", description: "Скидка 10% на все премиум модели" },
  7: { title: "Приоритетная очередь", description: "Быстрее генерация контента" },
  10: { title: "VIP статус", description: "Эксклюзивные функции и поддержка" },
};
