import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Send, Settings, History, Download, PanelRightOpen } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

interface Agent {
  id: string;
  name: string;
  avatar: string;
  subject: string;
  grade: string | null;
  system_prompt: string;
}

interface Session {
  id: string;
  title: string;
  messages_count: number;
  tokens_spent: number;
  created_at: string;
}

const CHAT_MODELS = [
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", cost: 0, badge: "🆓" },
  { id: "gpt-4o-mini", name: "GPT-4o-mini", cost: 1, badge: "⭐" },
  { id: "gpt-4o", name: "GPT-4o", cost: 5, badge: "💎" },
];

export default function AgentChat() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [agent, setAgent] = useState<Agent | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-flash");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-chat`;

  useEffect(() => {
    if (agentId && user) {
      loadAgent();
      loadSessions();
    }
  }, [agentId, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadAgent = async () => {
    const { data, error } = await supabase
      .from("agents")
      .select("*")
      .eq("id", agentId)
      .maybeSingle();

    if (error || !data) {
      toast({ title: "Агент не найден", variant: "destructive" });
      navigate("/agents");
      return;
    }

    setAgent(data);
  };

  const loadSessions = async () => {
    const { data } = await supabase
      .from("agent_sessions")
      .select("*")
      .eq("agent_id", agentId)
      .eq("user_id", user?.id)
      .order("updated_at", { ascending: false });

    if (data) {
      setSessions(data);
    }
  };

  const createOrLoadSession = async () => {
    if (!user || !agentId) return null;

    // Check for existing session without messages
    const { data: existing } = await supabase
      .from("agent_sessions")
      .select("*")
      .eq("agent_id", agentId)
      .eq("user_id", user.id)
      .eq("messages_count", 0)
      .maybeSingle();

    if (existing) {
      setSession(existing);
      return existing;
    }

    // Create new session
    const { data: newSession, error } = await supabase
      .from("agent_sessions")
      .insert({
        agent_id: agentId,
        user_id: user.id,
        title: "Новая сессия",
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Ошибка создания сессии", variant: "destructive" });
      return null;
    }

    setSession(newSession);
    loadSessions();
    return newSession;
  };

  const loadSessionMessages = async (sessionId: string) => {
    const { data } = await supabase
      .from("agent_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (data) {
      setMessages(data.map(m => ({
        ...m,
        role: m.role as "user" | "assistant"
      })));
    }
  };

  const handleSessionSelect = async (sessionData: Session) => {
    setSession(sessionData);
    await loadSessionMessages(sessionData.id);
    setSidebarOpen(false);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || !user || !agent) return;

    const model = CHAT_MODELS.find(m => m.id === selectedModel)!;
    
    // Check token balance for paid models
    if (model.cost > 0) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("tokens_balance")
        .eq("id", user.id)
        .single();

      if (!profile || profile.tokens_balance < model.cost) {
        toast({ title: "Недостаточно токенов", variant: "destructive" });
        return;
      }
    }

    // Ensure session exists
    let currentSession = session;
    if (!currentSession) {
      currentSession = await createOrLoadSession();
      if (!currentSession) return;
    }

    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);

    // Add user message optimistically
    const tempUserMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMessage]);

    try {
      // Save user message to DB
      await supabase.from("agent_messages").insert({
        session_id: currentSession.id,
        role: "user",
        content: userMessage,
      });

      // Deduct tokens for paid models
      if (model.cost > 0) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("tokens_balance")
          .eq("id", user.id)
          .single();
        
        if (profile) {
          await supabase
            .from("profiles")
            .update({ tokens_balance: profile.tokens_balance - model.cost })
            .eq("id", user.id);

          await supabase.from("transactions").insert({
            user_id: user.id,
            amount: -model.cost,
            type: "spend",
            description: `Агент: ${agent.name} (${model.name})`,
          });
        }
      }

      // Stream response
      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: messages.map(m => ({ role: m.role, content: m.content })).concat([
            { role: "user", content: userMessage }
          ]),
          systemPrompt: agent.system_prompt,
          model: selectedModel,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Ошибка AI сервиса");
      }

      // Process stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      let textBuffer = "";

      const tempAssistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, tempAssistantMessage]);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });
        
        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => 
                prev.map(m => m.id === tempAssistantMessage.id 
                  ? { ...m, content: assistantContent } 
                  : m
                )
              );
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Save assistant message to DB
      await supabase.from("agent_messages").insert({
        session_id: currentSession.id,
        role: "assistant",
        content: assistantContent,
        tokens_spent: model.cost,
      });

      // Update session stats
      await supabase
        .from("agent_sessions")
        .update({
          messages_count: messages.length + 2,
          tokens_spent: (session?.tokens_spent || 0) + model.cost,
          title: userMessage.slice(0, 50),
        })
        .eq("id", currentSession.id);

    } catch (error) {
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось получить ответ",
        variant: "destructive",
      });
      setMessages(prev => prev.slice(0, -1)); // Remove temp message
    } finally {
      setIsLoading(false);
    }
  };

  if (!agent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/agents")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-xl">
              {agent.avatar}
            </div>
            <div>
              <h1 className="font-semibold">{agent.name}</h1>
              <div className="flex gap-1">
                <Badge variant="secondary" className="text-xs">{agent.subject}</Badge>
                {agent.grade && <Badge variant="outline" className="text-xs">{agent.grade}</Badge>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHAT_MODELS.map(model => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.badge} {model.name} {model.cost > 0 && `[${model.cost} ток]`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <PanelRightOpen className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>История сессий</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => {
                      setSession(null);
                      setMessages([]);
                      setSidebarOpen(false);
                    }}
                  >
                    + Новая сессия
                  </Button>
                  {sessions.map(s => (
                    <Card 
                      key={s.id} 
                      className={`cursor-pointer hover:bg-muted/50 ${session?.id === s.id ? 'ring-1 ring-primary' : ''}`}
                      onClick={() => handleSessionSelect(s)}
                    >
                      <CardContent className="p-3">
                        <p className="font-medium truncate">{s.title}</p>
                        <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                          <span>{s.messages_count} сообщ.</span>
                          <span>{s.tokens_spent} ток.</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="container max-w-3xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-4xl">
                {agent.avatar}
              </div>
              <h2 className="text-xl font-semibold mb-2">
                Привет! Я {agent.name}
              </h2>
              <p className="text-muted-foreground">
                Ваш AI-репетитор по предмету {agent.subject}
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {message.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                ) : (
                  message.content
                )}
              </div>
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-foreground/50 animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-foreground/50 animate-bounce delay-100" />
                  <div className="w-2 h-2 rounded-full bg-foreground/50 animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="sticky bottom-0 border-t bg-background/95 backdrop-blur p-4">
        <div className="container max-w-3xl mx-auto">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Напишите сообщение..."
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="bg-gradient-to-r from-primary to-secondary hover:opacity-90"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Модель: {CHAT_MODELS.find(m => m.id === selectedModel)?.name} • 
            Enter для отправки
          </p>
        </div>
      </div>
    </div>
  );
}
