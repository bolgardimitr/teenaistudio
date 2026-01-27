import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Bot, Library, Sparkles } from "lucide-react";
import { AgentCard } from "@/components/agents/AgentCard";
import { TemplateCard } from "@/components/agents/TemplateCard";
import { EmptyAgents } from "@/components/agents/EmptyAgents";
import { CreateAgentWizard } from "@/components/agents/CreateAgentWizard";
import { AGENT_TEMPLATES, AGENT_CATEGORIES, AgentTemplate } from "@/data/agentTemplates";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Agent {
  id: string;
  name: string;
  avatar: string;
  subject: string;
  grade: string | null;
  style: string;
  features: string[];
  system_prompt: string;
  created_at: string;
  dialogsCount?: number;
  messagesCount?: number;
}

export default function AgentsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("my-agents");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [templateSearch, setTemplateSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [deleteAgentId, setDeleteAgentId] = useState<string | null>(null);
  const [templateToUse, setTemplateToUse] = useState<AgentTemplate | null>(null);

  useEffect(() => {
    if (user) {
      loadAgents();
    }
  }, [user]);

  const loadAgents = async () => {
    if (!user) return;

    setIsLoading(true);
    
    // Load agents with session stats
    const { data: agentsData, error } = await supabase
      .from("agents")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_template", false)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Ошибка загрузки агентов", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    // Get session stats for each agent
    const agentsWithStats = await Promise.all(
      (agentsData || []).map(async (agent) => {
        const { data: sessions } = await supabase
          .from("agent_sessions")
          .select("id, messages_count")
          .eq("agent_id", agent.id);

        const dialogsCount = sessions?.length || 0;
        const messagesCount = sessions?.reduce((sum, s) => sum + s.messages_count, 0) || 0;

        return { ...agent, dialogsCount, messagesCount };
      })
    );

    setAgents(agentsWithStats);
    setIsLoading(false);
  };

  const handleCreateAgent = async (data: {
    name: string;
    avatar: string;
    subject: string;
    grade: string;
    style: string;
    features: string[];
    systemPrompt: string;
  }) => {
    if (!user) return;

    const { error } = await supabase.from("agents").insert({
      user_id: user.id,
      name: data.name,
      avatar: data.avatar,
      subject: data.subject,
      grade: data.grade || null,
      style: data.style,
      features: data.features,
      system_prompt: data.systemPrompt,
      is_template: false,
      template_id: templateToUse?.id || null,
    });

    if (error) {
      toast({ title: "Ошибка создания агента", variant: "destructive" });
      return;
    }

    toast({ title: "Агент создан!" });
    setTemplateToUse(null);
    setEditingAgent(null);
    setActiveTab("my-agents");
    loadAgents();
  };

  const handleUpdateAgent = async (data: {
    name: string;
    avatar: string;
    subject: string;
    grade: string;
    style: string;
    features: string[];
    systemPrompt: string;
  }) => {
    if (!user || !editingAgent) return;

    const { error } = await supabase
      .from("agents")
      .update({
        name: data.name,
        avatar: data.avatar,
        subject: data.subject,
        grade: data.grade || null,
        style: data.style,
        features: data.features,
        system_prompt: data.systemPrompt,
      })
      .eq("id", editingAgent.id);

    if (error) {
      toast({ title: "Ошибка обновления агента", variant: "destructive" });
      return;
    }

    toast({ title: "Агент обновлён!" });
    setEditingAgent(null);
    loadAgents();
  };

  const handleDeleteAgent = async () => {
    if (!deleteAgentId) return;

    const { error } = await supabase
      .from("agents")
      .delete()
      .eq("id", deleteAgentId);

    if (error) {
      toast({ title: "Ошибка удаления агента", variant: "destructive" });
      return;
    }

    toast({ title: "Агент удалён" });
    setDeleteAgentId(null);
    loadAgents();
  };

  const handleUseTemplate = (template: AgentTemplate) => {
    setTemplateToUse(template);
    setActiveTab("create");
  };

  const filteredAgents = agents.filter(
    (agent) =>
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTemplates = AGENT_TEMPLATES.filter(
    (template) =>
      template.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
      template.subject.toLowerCase().includes(templateSearch.toLowerCase()) ||
      template.description.toLowerCase().includes(templateSearch.toLowerCase())
  );

  const groupedTemplates = AGENT_CATEGORIES.map((category) => ({
    ...category,
    templates: filteredTemplates.filter((t) => t.category === category.id),
  })).filter((cat) => cat.templates.length > 0);

  if (editingAgent) {
    return (
      <AppLayout>
        <div className="container max-w-3xl mx-auto py-8 px-4">
          <h1 className="text-2xl font-bold mb-6">Редактировать агента</h1>
          <CreateAgentWizard
            initialData={{
              name: editingAgent.name,
              avatar: editingAgent.avatar,
              subject: editingAgent.subject,
              grade: editingAgent.grade || "",
              style: editingAgent.style,
              features: editingAgent.features,
              systemPrompt: editingAgent.system_prompt,
            }}
            onComplete={handleUpdateAgent}
            onCancel={() => setEditingAgent(null)}
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container max-w-6xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Bot className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">🤖 AI-Репетиторы</h1>
            <p className="text-muted-foreground">Персональные помощники по школьным предметам</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="my-agents">
              <Bot className="w-4 h-4 mr-2" />
              Мои агенты
            </TabsTrigger>
            <TabsTrigger value="templates">
              <Library className="w-4 h-4 mr-2" />
              Шаблоны
            </TabsTrigger>
            <TabsTrigger value="create">
              <Sparkles className="w-4 h-4 mr-2" />
              Создать агента
            </TabsTrigger>
          </TabsList>

          {/* My Agents Tab */}
          <TabsContent value="my-agents">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : agents.length === 0 ? (
              <EmptyAgents
                onCreateAgent={() => setActiveTab("create")}
                onViewTemplates={() => setActiveTab("templates")}
              />
            ) : (
              <>
                <div className="relative mb-6">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск агентов..."
                    className="pl-10"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredAgents.map((agent) => (
                    <AgentCard
                      key={agent.id}
                      agent={agent}
                      onStartChat={(id) => navigate(`/agents/${id}/chat`)}
                      onEdit={(id) => {
                        const a = agents.find((ag) => ag.id === id);
                        if (a) setEditingAgent(a);
                      }}
                      onDelete={(id) => setDeleteAgentId(id)}
                    />
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates">
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={templateSearch}
                onChange={(e) => setTemplateSearch(e.target.value)}
                placeholder="Поиск шаблонов..."
                className="pl-10"
              />
            </div>

            <Accordion type="multiple" defaultValue={AGENT_CATEGORIES.map((c) => c.id)} className="space-y-2">
              {groupedTemplates.map((category) => (
                <AccordionItem key={category.id} value={category.id} className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="text-lg font-semibold">
                      {category.icon} {category.name}
                    </span>
                    <span className="ml-2 text-sm text-muted-foreground">
                      ({category.templates.length})
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
                      {category.templates.map((template) => (
                        <TemplateCard
                          key={template.id}
                          template={template}
                          onUse={handleUseTemplate}
                        />
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </TabsContent>

          {/* Create Agent Tab */}
          <TabsContent value="create">
            <CreateAgentWizard
              initialData={
                templateToUse
                  ? {
                      name: templateToUse.name,
                      avatar: templateToUse.avatar,
                      subject: templateToUse.subject,
                      grade: templateToUse.grade,
                      style: templateToUse.style,
                      features: templateToUse.features,
                      systemPrompt: templateToUse.systemPrompt,
                    }
                  : undefined
              }
              onComplete={handleCreateAgent}
              onCancel={() => {
                setTemplateToUse(null);
                setActiveTab("my-agents");
              }}
            />
          </TabsContent>
        </Tabs>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteAgentId} onOpenChange={() => setDeleteAgentId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Удалить агента?</AlertDialogTitle>
              <AlertDialogDescription>
                Это действие нельзя отменить. Все диалоги с этим агентом будут удалены.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteAgent} className="bg-destructive text-destructive-foreground">
                Удалить
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
