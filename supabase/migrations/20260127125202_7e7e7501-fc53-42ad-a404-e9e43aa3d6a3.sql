-- Create agents table for storing user's AI tutors
CREATE TABLE public.agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT NOT NULL DEFAULT '🤖',
  subject TEXT NOT NULL,
  grade TEXT,
  style TEXT NOT NULL DEFAULT 'friendly',
  features TEXT[] DEFAULT ARRAY[]::TEXT[],
  system_prompt TEXT NOT NULL,
  is_template BOOLEAN NOT NULL DEFAULT false,
  template_id UUID REFERENCES public.agents(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create agent_sessions table for tracking chat sessions
CREATE TABLE public.agent_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Новая сессия',
  messages_count INTEGER NOT NULL DEFAULT 0,
  tokens_spent INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create agent_messages table for storing messages
CREATE TABLE public.agent_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.agent_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  tokens_spent INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for agents
CREATE POLICY "Users can view their own agents"
ON public.agents FOR SELECT
USING (auth.uid() = user_id OR is_template = true);

CREATE POLICY "Users can create their own agents"
ON public.agents FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agents"
ON public.agents FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agents"
ON public.agents FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for agent_sessions
CREATE POLICY "Users can view their own sessions"
ON public.agent_sessions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions"
ON public.agent_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
ON public.agent_sessions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
ON public.agent_sessions FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for agent_messages
CREATE POLICY "Users can view messages of their sessions"
ON public.agent_messages FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.agent_sessions
  WHERE agent_sessions.id = agent_messages.session_id
  AND agent_sessions.user_id = auth.uid()
));

CREATE POLICY "Users can create messages in their sessions"
ON public.agent_messages FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.agent_sessions
  WHERE agent_sessions.id = agent_messages.session_id
  AND agent_sessions.user_id = auth.uid()
));

CREATE POLICY "Users can delete messages in their sessions"
ON public.agent_messages FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.agent_sessions
  WHERE agent_sessions.id = agent_messages.session_id
  AND agent_sessions.user_id = auth.uid()
));

-- Triggers for updated_at
CREATE TRIGGER update_agents_updated_at
BEFORE UPDATE ON public.agents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agent_sessions_updated_at
BEFORE UPDATE ON public.agent_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_agents_user_id ON public.agents(user_id);
CREATE INDEX idx_agents_is_template ON public.agents(is_template);
CREATE INDEX idx_agent_sessions_agent_id ON public.agent_sessions(agent_id);
CREATE INDEX idx_agent_sessions_user_id ON public.agent_sessions(user_id);
CREATE INDEX idx_agent_messages_session_id ON public.agent_messages(session_id);