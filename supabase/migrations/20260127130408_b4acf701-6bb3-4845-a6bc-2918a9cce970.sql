-- Add bonus streak to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS bonus_streak INTEGER NOT NULL DEFAULT 0;

-- Create achievements table
CREATE TABLE public.achievements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL,
  requirement_type TEXT NOT NULL,
  requirement_value INTEGER NOT NULL,
  reward_tokens INTEGER NOT NULL DEFAULT 0,
  reward_xp INTEGER NOT NULL DEFAULT 0
);

-- Create user_achievements junction table
CREATE TABLE public.user_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  achievement_id TEXT NOT NULL REFERENCES public.achievements(id),
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- Enable RLS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS policies for achievements (read-only for all)
CREATE POLICY "Anyone can view achievements"
ON public.achievements FOR SELECT
USING (true);

-- RLS policies for user_achievements
CREATE POLICY "Users can view their own achievements"
ON public.user_achievements FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can unlock their own achievements"
ON public.user_achievements FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Insert default achievements
INSERT INTO public.achievements (id, name, description, icon, category, requirement_type, requirement_value, reward_tokens, reward_xp) VALUES
('first_photo', 'Первая картинка', 'Создайте первое изображение', '🎨', 'creation', 'photo_count', 1, 10, 20),
('first_video', 'Режиссёр', 'Создайте первое видео', '🎬', 'creation', 'video_count', 1, 20, 50),
('first_music', 'Музыкант', 'Создайте первый трек', '🎵', 'creation', 'music_count', 1, 15, 30),
('first_agent', 'Учитель', 'Создайте своего агента', '🤖', 'creation', 'agent_count', 1, 25, 50),
('popular_10', 'Популярный', 'Получите 10 лайков', '⭐', 'social', 'total_likes', 10, 30, 100),
('popular_50', 'Звезда', 'Получите 50 лайков', '🌟', 'social', 'total_likes', 50, 100, 300),
('streak_7', 'На волне', 'Войдите 7 дней подряд', '🔥', 'streak', 'bonus_streak', 7, 20, 50),
('streak_14', 'Постоянство', 'Войдите 14 дней подряд', '💪', 'streak', 'bonus_streak', 14, 50, 100),
('streak_30', 'Легенда', 'Войдите 30 дней подряд', '👑', 'streak', 'bonus_streak', 30, 150, 300),
('gen_100', 'Сотня', 'Создайте 100 генераций', '💯', 'creation', 'total_generations', 100, 50, 200),
('gen_500', 'Продюсер', 'Создайте 500 генераций', '🎪', 'creation', 'total_generations', 500, 200, 500),
('level_5', 'Мастер', 'Достигните 5 уровня', '🏆', 'level', 'level', 5, 100, 0),
('level_10', 'Эксперт', 'Достигните 10 уровня', '🎖️', 'level', 'level', 10, 300, 0);

-- Create index
CREATE INDEX idx_user_achievements_user_id ON public.user_achievements(user_id);