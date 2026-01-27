import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MessageCircle, Plus, Search, Trash2, Send, Paperclip, Globe, 
  Copy, RefreshCw, Check, Loader2, Scale, X, ChevronDown
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

interface AIModel {
  id: string;
  name: string;
  tier: 'free' | 'basic' | 'premium';
  cost: number;
  description: string;
}

const aiModels: AIModel[] = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', tier: 'free', cost: 0, description: 'Быстрая и эффективная' },
  { id: 'llama-3.3', name: 'Llama 3.3', tier: 'free', cost: 0, description: 'Meta, быстрые ответы' },
  { id: 'deepseek', name: 'DeepSeek', tier: 'free', cost: 0.5, description: 'Хорошие рассуждения' },
  { id: 'gpt-4o-mini', name: 'GPT-4o-mini', tier: 'basic', cost: 1, description: 'OpenAI, баланс цена/качество' },
  { id: 'gemini-2.0-pro', name: 'Gemini 2.0 Pro', tier: 'basic', cost: 2, description: 'Google, расширенные возможности' },
  { id: 'gpt-4o', name: 'GPT-4o', tier: 'premium', cost: 5, description: 'Лучшая модель OpenAI' },
  { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', tier: 'premium', cost: 3, description: 'Anthropic, отличный для текстов' },
  { id: 'gemini-3-pro', name: 'Gemini 3 Pro', tier: 'premium', cost: 4, description: 'Новейший флагман Google' },
];

interface Chat {
  id: string;
  title: string;
  model: string;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  tokens_spent: number;
  created_at: string;
}

export default function TextStudio() {
  const { profile, user, refreshProfile, role } = useAuth();
  
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-2.5-flash');
  const [inputValue, setInputValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [compareModels, setCompareModels] = useState<string[]>([]);
  const [comparePrompt, setComparePrompt] = useState('');
  const [compareResults, setCompareResults] = useState<{model: string, response: string}[]>([]);
  const [isComparing, setIsComparing] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load chats
  useEffect(() => {
    if (user) {
      loadChats();
    }
  }, [user]);

  // Load messages when chat changes
  useEffect(() => {
    if (currentChatId) {
      loadMessages(currentChatId);
    } else {
      setMessages([]);
    }
  }, [currentChatId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadChats = async () => {
    const { data, error } = await supabase
      .from('text_chats')
      .select('*')
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error('Error loading chats:', error);
      return;
    }
    
    setChats(data || []);
  };

  const loadMessages = async (chatId: string) => {
    const { data, error } = await supabase
      .from('text_messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error loading messages:', error);
      return;
    }
    
    // Cast roles properly
    const typedMessages = (data || []).map(m => ({
      ...m,
      role: m.role as 'user' | 'assistant'
    }));
    
    setMessages(typedMessages);
    
    // Update selected model based on chat
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      setSelectedModel(chat.model);
    }
  };

  const createNewChat = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('text_chats')
      .insert({
        user_id: user.id,
        title: 'Новый чат',
        model: selectedModel,
      })
      .select()
      .single();
    
    if (error) {
      toast.error('Ошибка создания чата');
      return;
    }
    
    setChats(prev => [data, ...prev]);
    setCurrentChatId(data.id);
    setMessages([]);
  };

  const deleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const { error } = await supabase
      .from('text_chats')
      .delete()
      .eq('id', chatId);
    
    if (error) {
      toast.error('Ошибка удаления чата');
      return;
    }
    
    setChats(prev => prev.filter(c => c.id !== chatId));
    if (currentChatId === chatId) {
      setCurrentChatId(null);
      setMessages([]);
    }
    toast.success('Чат удалён');
  };

  const getModelInfo = (modelId: string) => aiModels.find(m => m.id === modelId);

  const getTierBadge = (tier: 'free' | 'basic' | 'premium') => {
    switch (tier) {
      case 'free':
        return <span className="text-xs bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">🆓</span>;
      case 'basic':
        return <span className="text-xs bg-sky-500/20 text-sky-400 px-1.5 py-0.5 rounded">⭐</span>;
      case 'premium':
        return <span className="text-xs bg-violet-500/20 text-violet-400 px-1.5 py-0.5 rounded">💎</span>;
    }
  };

  const canAccessModel = (tier: 'free' | 'basic' | 'premium') => {
    if (!role) return tier === 'free';
    if (role === 'admin' || role === 'premium') return true;
    if (role === 'basic') return tier !== 'premium';
    return tier === 'free';
  };

  const streamChat = async (chatMessages: {role: string, content: string}[], onDelta: (text: string) => void) => {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/text-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages: chatMessages, model: selectedModel }),
    });

    if (!response.ok || !response.body) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Ошибка при отправке сообщения');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      textBuffer += decoder.decode(value, { stream: true });
      
      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (line.startsWith(':') || line.trim() === '') continue;
        if (!line.startsWith('data: ')) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') break;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) onDelta(content);
        } catch {
          textBuffer = line + '\n' + textBuffer;
          break;
        }
      }
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading || !user || !profile) return;

    const model = getModelInfo(selectedModel);
    if (!model) return;

    if (!canAccessModel(model.tier)) {
      toast.error('Эта модель недоступна для вашего тарифа');
      return;
    }

    if (model.cost > 0 && profile.tokens_balance < model.cost) {
      toast.error(`Недостаточно токенов. Нужно: ${model.cost}`);
      return;
    }

    setIsLoading(true);
    setIsStreaming(true);

    let chatId = currentChatId;

    try {
      // Create chat if needed
      if (!chatId) {
        const { data: newChat, error: chatError } = await supabase
          .from('text_chats')
          .insert({
            user_id: user.id,
            title: inputValue.slice(0, 50) + (inputValue.length > 50 ? '...' : ''),
            model: selectedModel,
          })
          .select()
          .single();

        if (chatError) throw chatError;
        chatId = newChat.id;
        setCurrentChatId(chatId);
        setChats(prev => [newChat, ...prev]);
      }

      // Add user message
      const { data: userMsg, error: msgError } = await supabase
        .from('text_messages')
        .insert({
          chat_id: chatId,
          role: 'user',
          content: inputValue.trim(),
          tokens_spent: 0,
        })
        .select()
        .single();

      if (msgError) throw msgError;
      
      const typedUserMsg = { ...userMsg, role: userMsg.role as 'user' | 'assistant' };
      setInputValue('');
      setMessages(prev => [...prev, typedUserMsg]);

      // Deduct tokens if not free
      if (model.cost > 0) {
        await supabase
          .from('profiles')
          .update({ tokens_balance: profile.tokens_balance - model.cost })
          .eq('id', profile.id);

        await supabase.from('transactions').insert({
          user_id: user.id,
          amount: -model.cost,
          type: 'spend',
          description: `Сообщение: ${model.name}`,
        });
      }

      // Prepare messages for API
      const apiMessages = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content,
      }));

      // Stream response
      let assistantContent = '';
      const tempId = `temp-${Date.now()}`;
      
      setMessages(prev => [...prev, {
        id: tempId,
        role: 'assistant',
        content: '',
        tokens_spent: model.cost,
        created_at: new Date().toISOString(),
      }]);

      await streamChat(apiMessages, (chunk) => {
        assistantContent += chunk;
        setMessages(prev => prev.map(m => 
          m.id === tempId ? { ...m, content: assistantContent } : m
        ));
      });

      // Save assistant message
      const { data: assistantMsg, error: assistantError } = await supabase
        .from('text_messages')
        .insert({
          chat_id: chatId,
          role: 'assistant',
          content: assistantContent,
          tokens_spent: model.cost,
        })
        .select()
        .single();

      if (assistantError) throw assistantError;

      const typedAssistantMsg = { ...assistantMsg, role: assistantMsg.role as 'user' | 'assistant' };
      setMessages(prev => prev.map(m => 
        m.id === tempId ? typedAssistantMsg : m
      ));

      // Update chat title and timestamp
      await supabase
        .from('text_chats')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', chatId);

      refreshProfile();
    } catch (error) {
      console.error('Send message error:', error);
      toast.error(error instanceof Error ? error.message : 'Ошибка отправки');
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const regenerateResponse = async (messageIndex: number) => {
    if (isLoading || !currentChatId) return;
    
    // Get messages up to and including the user message before this assistant response
    const userMessageIndex = messageIndex - 1;
    if (userMessageIndex < 0 || messages[userMessageIndex].role !== 'user') return;

    const messagesToSend = messages.slice(0, messageIndex).map(m => ({
      role: m.role,
      content: m.content,
    }));

    setIsLoading(true);
    setIsStreaming(true);

    try {
      const model = getModelInfo(selectedModel);
      if (!model) return;

      let assistantContent = '';
      const tempId = `regen-${Date.now()}`;

      // Replace the assistant message with a new streaming one
      setMessages(prev => [
        ...prev.slice(0, messageIndex),
        {
          id: tempId,
          role: 'assistant',
          content: '',
          tokens_spent: model?.cost || 0,
          created_at: new Date().toISOString(),
        }
      ]);

      await streamChat(messagesToSend, (chunk) => {
        assistantContent += chunk;
        setMessages(prev => prev.map(m => 
          m.id === tempId ? { ...m, content: assistantContent } : m
        ));
      });

      // Delete old message and save new one
      await supabase
        .from('text_messages')
        .delete()
        .eq('id', messages[messageIndex].id);

      const { data: newMsg } = await supabase
        .from('text_messages')
        .insert({
          chat_id: currentChatId,
          role: 'assistant',
          content: assistantContent,
          tokens_spent: model?.cost || 0,
        })
        .select()
        .single();

      if (newMsg) {
        const typedNewMsg = { ...newMsg, role: newMsg.role as 'user' | 'assistant' };
        setMessages(prev => prev.map(m => 
          m.id === tempId ? typedNewMsg : m
        ));
      }
    } catch (error) {
      console.error('Regenerate error:', error);
      toast.error('Ошибка регенерации');
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const handleCompare = async () => {
    if (compareModels.length < 2 || !comparePrompt.trim()) {
      toast.error('Выберите минимум 2 модели и введите промпт');
      return;
    }

    setIsComparing(true);
    setCompareResults([]);

    try {
      const results: {model: string, response: string}[] = [];
      
      for (const modelId of compareModels) {
        const model = getModelInfo(modelId);
        if (!model) continue;

        let content = '';
        const originalModel = selectedModel;
        
        // Temporarily set model for the API call
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/text-chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            messages: [{ role: 'user', content: comparePrompt }], 
            model: modelId 
          }),
        });

        if (response.ok && response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            let idx;
            while ((idx = buffer.indexOf('\n')) !== -1) {
              const line = buffer.slice(0, idx).trim();
              buffer = buffer.slice(idx + 1);
              if (!line.startsWith('data: ')) continue;
              const json = line.slice(6);
              if (json === '[DONE]') continue;
              try {
                const parsed = JSON.parse(json);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) content += delta;
              } catch {}
            }
          }
        }

        results.push({ model: model.name, response: content || 'Ошибка получения ответа' });
        setCompareResults([...results]);
      }
    } catch (error) {
      console.error('Compare error:', error);
      toast.error('Ошибка сравнения');
    } finally {
      setIsComparing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const filteredChats = chats.filter(chat =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentModel = getModelInfo(selectedModel);

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-8rem)] gap-4">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0 glass rounded-2xl p-4 flex flex-col">
          <Button
            onClick={createNewChat}
            className="w-full gradient-primary hover:opacity-90 rounded-xl gap-2 mb-4"
          >
            <Plus className="h-4 w-4" />
            Новый чат
          </Button>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск чатов..."
              className="pl-9 bg-muted/30 border-border/50 rounded-xl"
            />
          </div>

          <ScrollArea className="flex-1 -mx-2 px-2">
            <div className="space-y-2">
              {filteredChats.map((chat) => {
                const model = getModelInfo(chat.model);
                return (
                  <button
                    key={chat.id}
                    onClick={() => setCurrentChatId(chat.id)}
                    className={cn(
                      "w-full p-3 rounded-xl text-left transition-all group relative",
                      currentChatId === chat.id
                        ? "bg-primary/20 border border-primary/50"
                        : "bg-muted/30 hover:bg-muted/50 border border-transparent"
                    )}
                  >
                    <p className="text-sm font-medium text-foreground truncate pr-6">
                      {chat.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {new Date(chat.created_at).toLocaleDateString('ru')}
                      </span>
                      {model && getTierBadge(model.tier)}
                    </div>
                    <button
                      onClick={(e) => deleteChat(chat.id, e)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/20 rounded transition-all"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </button>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 glass rounded-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-border/50 flex items-center justify-between">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 rounded-xl">
                  {currentModel && getTierBadge(currentModel.tier)}
                  <span>{currentModel?.name || 'Выберите модель'}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-72 bg-popover border-border" align="start">
                <DropdownMenuLabel>Бесплатные</DropdownMenuLabel>
                <DropdownMenuGroup>
                  {aiModels.filter(m => m.tier === 'free').map(model => (
                    <DropdownMenuItem
                      key={model.id}
                      onClick={() => setSelectedModel(model.id)}
                      className={cn(!canAccessModel(model.tier) && "opacity-50")}
                      disabled={!canAccessModel(model.tier)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {getTierBadge(model.tier)}
                          <span className="font-medium">{model.name}</span>
                          {model.cost > 0 && (
                            <span className="text-xs text-muted-foreground">{model.cost} токен</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{model.description}</p>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Базовые</DropdownMenuLabel>
                <DropdownMenuGroup>
                  {aiModels.filter(m => m.tier === 'basic').map(model => (
                    <DropdownMenuItem
                      key={model.id}
                      onClick={() => setSelectedModel(model.id)}
                      className={cn(!canAccessModel(model.tier) && "opacity-50")}
                      disabled={!canAccessModel(model.tier)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {getTierBadge(model.tier)}
                          <span className="font-medium">{model.name}</span>
                          <span className="text-xs text-muted-foreground">{model.cost} токен</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{model.description}</p>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Премиум</DropdownMenuLabel>
                <DropdownMenuGroup>
                  {aiModels.filter(m => m.tier === 'premium').map(model => (
                    <DropdownMenuItem
                      key={model.id}
                      onClick={() => setSelectedModel(model.id)}
                      className={cn(!canAccessModel(model.tier) && "opacity-50")}
                      disabled={!canAccessModel(model.tier)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {getTierBadge(model.tier)}
                          <span className="font-medium">{model.name}</span>
                          <span className="text-xs text-muted-foreground">{model.cost} токенов</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{model.description}</p>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              className="gap-2 rounded-xl"
              onClick={() => setShowCompareModal(true)}
            >
              <Scale className="h-4 w-4" />
              Сравнение
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-studio-text to-emerald-400 flex items-center justify-center mb-4">
                  <MessageCircle className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Начните разговор</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  Задайте любой вопрос AI-ассистенту. Он поможет с учёбой, творчеством и многим другим!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-3",
                      message.role === 'user' ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
                      message.role === 'user' 
                        ? "bg-primary" 
                        : "bg-gradient-to-br from-studio-text to-emerald-400"
                    )}>
                      {message.role === 'user' ? (
                        <span className="text-xs">👤</span>
                      ) : (
                        <span className="text-xs">🤖</span>
                      )}
                    </div>
                    <div className={cn(
                      "max-w-[80%] rounded-2xl p-4",
                      message.role === 'user'
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50"
                    )}>
                      {message.role === 'assistant' ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown
                            components={{
                              code({ node, className, children, ...props }) {
                                const isInline = !className;
                                const codeContent = String(children).replace(/\n$/, '');
                                
                                if (isInline) {
                                  return (
                                    <code className="bg-muted px-1.5 py-0.5 rounded text-sm" {...props}>
                                      {children}
                                    </code>
                                  );
                                }
                                
                                return (
                                  <div className="relative group">
                                    <pre className="bg-muted rounded-lg p-4 overflow-x-auto">
                                      <code className={className} {...props}>
                                        {children}
                                      </code>
                                    </pre>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100"
                                      onClick={() => copyToClipboard(codeContent, `code-${message.id}`)}
                                    >
                                      {copiedId === `code-${message.id}` ? (
                                        <Check className="h-3 w-3" />
                                      ) : (
                                        <Copy className="h-3 w-3" />
                                      )}
                                    </Button>
                                  </div>
                                );
                              }
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      )}
                      
                      {message.role === 'assistant' && !isStreaming && (
                        <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => copyToClipboard(message.content, message.id)}
                          >
                            {copiedId === message.id ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                            Копировать
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => regenerateResponse(index)}
                            disabled={isLoading}
                          >
                            <RefreshCw className="h-3 w-3" />
                            Регенерировать
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isStreaming && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">AI печатает...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t border-border/50">
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" className="flex-shrink-0" disabled>
                <Paperclip className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="flex-shrink-0" disabled>
                <Globe className="h-4 w-4" />
              </Button>
              <Textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Введите сообщение..."
                className="flex-1 min-h-[44px] max-h-32 bg-muted/30 border-border/50 rounded-xl resize-none"
                disabled={isLoading}
              />
              <Button
                onClick={sendMessage}
                disabled={isLoading || !inputValue.trim()}
                className="gradient-primary hover:opacity-90 rounded-xl"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
              <span>
                Стоимость: <span className="text-primary font-medium">{currentModel?.cost || 0} токенов</span>
              </span>
              <span>Enter для отправки • Shift+Enter для новой строки</span>
            </div>
          </div>
        </div>
      </div>

      {/* Compare Modal */}
      <Dialog open={showCompareModal} onOpenChange={setShowCompareModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Сравнение моделей</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Выберите модели (2-4):</p>
              <div className="grid grid-cols-2 gap-2">
                {aiModels.filter(m => canAccessModel(m.tier)).map(model => (
                  <label
                    key={model.id}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all",
                      compareModels.includes(model.id)
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <Checkbox
                      checked={compareModels.includes(model.id)}
                      onCheckedChange={(checked) => {
                        if (checked && compareModels.length < 4) {
                          setCompareModels([...compareModels, model.id]);
                        } else if (!checked) {
                          setCompareModels(compareModels.filter(id => id !== model.id));
                        }
                      }}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {getTierBadge(model.tier)}
                        <span className="font-medium text-sm">{model.name}</span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Промпт:</p>
              <Textarea
                value={comparePrompt}
                onChange={(e) => setComparePrompt(e.target.value)}
                placeholder="Введите вопрос для сравнения..."
                className="min-h-[80px]"
              />
            </div>

            <Button
              onClick={handleCompare}
              disabled={isComparing || compareModels.length < 2 || !comparePrompt.trim()}
              className="w-full gradient-primary"
            >
              {isComparing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Сравниваем...
                </>
              ) : (
                'Сравнить'
              )}
            </Button>

            {compareResults.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {compareResults.map((result, i) => (
                  <div key={i} className="bg-muted/30 rounded-xl p-4">
                    <h4 className="font-semibold text-sm mb-2">{result.model}</h4>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{result.response}</ReactMarkdown>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
