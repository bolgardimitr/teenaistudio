-- Create text_chats table for storing chat sessions
CREATE TABLE public.text_chats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Новый чат',
  model TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create text_messages table for storing messages
CREATE TABLE public.text_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES public.text_chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  tokens_spent INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.text_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.text_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for text_chats
CREATE POLICY "Users can view their own chats"
ON public.text_chats FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chats"
ON public.text_chats FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chats"
ON public.text_chats FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chats"
ON public.text_chats FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for text_messages (access via chat ownership)
CREATE POLICY "Users can view messages of their chats"
ON public.text_messages FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.text_chats
  WHERE text_chats.id = text_messages.chat_id
  AND text_chats.user_id = auth.uid()
));

CREATE POLICY "Users can create messages in their chats"
ON public.text_messages FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.text_chats
  WHERE text_chats.id = text_messages.chat_id
  AND text_chats.user_id = auth.uid()
));

CREATE POLICY "Users can delete messages in their chats"
ON public.text_messages FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.text_chats
  WHERE text_chats.id = text_messages.chat_id
  AND text_chats.user_id = auth.uid()
));

-- Trigger for updating updated_at on text_chats
CREATE TRIGGER update_text_chats_updated_at
BEFORE UPDATE ON public.text_chats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_text_chats_user_id ON public.text_chats(user_id);
CREATE INDEX idx_text_messages_chat_id ON public.text_messages(chat_id);