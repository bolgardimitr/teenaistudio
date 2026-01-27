import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Check, X, Eye, Edit, Plus, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface AgentData {
  id: string;
  name: string;
  subject: string;
  avatar: string;
  style: string;
  system_prompt: string;
  is_template: boolean;
  user_id: string;
  user_email: string;
  created_at: string;
  usage_count: number;
}

export default function AdminAgents() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<AgentData[]>([]);
  const [publicAgents, setPublicAgents] = useState<AgentData[]>([]);
  const [loading, setLoading] = useState(true);

  const [viewModal, setViewModal] = useState<{
    open: boolean;
    agent: AgentData | null;
  }>({
    open: false,
    agent: null,
  });

  const [editModal, setEditModal] = useState<{
    open: boolean;
    agent: AgentData | null;
    name: string;
    subject: string;
    avatar: string;
    style: string;
    system_prompt: string;
  }>({
    open: false,
    agent: null,
    name: '',
    subject: '',
    avatar: '',
    style: '',
    system_prompt: '',
  });

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    setLoading(true);

    // Load templates
    const { data: templatesData } = await supabase
      .from('agents')
      .select('*')
      .eq('is_template', true)
      .order('created_at', { ascending: false });

    const enrichedTemplates: AgentData[] = [];
    for (const agent of templatesData || []) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', agent.user_id)
        .single();

      // Count usage (agents created from this template)
      const { count } = await supabase
        .from('agents')
        .select('*', { count: 'exact', head: true })
        .eq('template_id', agent.id);

      enrichedTemplates.push({
        ...agent,
        user_email: profile?.email || 'System',
        usage_count: count || 0,
      });
    }

    setTemplates(enrichedTemplates);

    // Load all non-template agents (for moderation)
    const { data: agentsData } = await supabase
      .from('agents')
      .select('*')
      .eq('is_template', false)
      .order('created_at', { ascending: false })
      .limit(50);

    const enrichedAgents: AgentData[] = [];
    for (const agent of agentsData || []) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', agent.user_id)
        .single();

      enrichedAgents.push({
        ...agent,
        user_email: profile?.email || 'Unknown',
        usage_count: 0,
      });
    }

    setPublicAgents(enrichedAgents);
    setLoading(false);
  };

  const handleSaveTemplate = async () => {
    if (!editModal.agent && !editModal.name) return;

    if (editModal.agent) {
      // Update existing
      const { error } = await supabase
        .from('agents')
        .update({
          name: editModal.name,
          subject: editModal.subject,
          avatar: editModal.avatar,
          style: editModal.style,
          system_prompt: editModal.system_prompt,
        })
        .eq('id', editModal.agent.id);

      if (error) {
        toast({ title: 'Ошибка сохранения', variant: 'destructive' });
        return;
      }

      toast({ title: 'Шаблон обновлён!' });
    } else {
      // Create new template
      // For admin-created templates, we need a system user or use the current admin
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({ title: 'Ошибка авторизации', variant: 'destructive' });
        return;
      }

      const { error } = await supabase
        .from('agents')
        .insert({
          name: editModal.name,
          subject: editModal.subject,
          avatar: editModal.avatar || '🤖',
          style: editModal.style || 'friendly',
          system_prompt: editModal.system_prompt,
          is_template: true,
          user_id: user.id,
        });

      if (error) {
        toast({ title: 'Ошибка создания', variant: 'destructive' });
        return;
      }

      toast({ title: 'Шаблон создан!' });
    }

    setEditModal({
      open: false,
      agent: null,
      name: '',
      subject: '',
      avatar: '',
      style: '',
      system_prompt: '',
    });
    loadAgents();
  };

  const handleDeleteAgent = async (agentId: string) => {
    const { error } = await supabase
      .from('agents')
      .delete()
      .eq('id', agentId);

    if (error) {
      toast({ title: 'Ошибка удаления', variant: 'destructive' });
      return;
    }

    toast({ title: 'Удалено' });
    loadAgents();
  };

  const openEditModal = (agent?: AgentData) => {
    if (agent) {
      setEditModal({
        open: true,
        agent,
        name: agent.name,
        subject: agent.subject,
        avatar: agent.avatar,
        style: agent.style,
        system_prompt: agent.system_prompt,
      });
    } else {
      setEditModal({
        open: true,
        agent: null,
        name: '',
        subject: '',
        avatar: '🤖',
        style: 'friendly',
        system_prompt: '',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">🤖 Агенты</h1>

      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates">Шаблоны ({templates.length})</TabsTrigger>
          <TabsTrigger value="moderation">Все агенты ({publicAgents.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Шаблоны агентов</CardTitle>
              <Button onClick={() => openEditModal()}>
                <Plus className="h-4 w-4 mr-2" />
                Новый шаблон
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Агент</TableHead>
                    <TableHead>Предмет</TableHead>
                    <TableHead>Стиль</TableHead>
                    <TableHead className="text-right">Использований</TableHead>
                    <TableHead>Создан</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((agent) => (
                    <TableRow key={agent.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{agent.avatar}</span>
                          <span className="font-medium">{agent.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{agent.subject}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{agent.style}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {agent.usage_count}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(agent.created_at), 'dd.MM.yyyy', { locale: ru })}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewModal({ open: true, agent })}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditModal(agent)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="moderation" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Все агенты пользователей</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Агент</TableHead>
                    <TableHead>Создатель</TableHead>
                    <TableHead>Предмет</TableHead>
                    <TableHead>Стиль</TableHead>
                    <TableHead>Создан</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {publicAgents.map((agent) => (
                    <TableRow key={agent.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{agent.avatar}</span>
                          <span className="font-medium">{agent.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">
                        {agent.user_email}
                      </TableCell>
                      <TableCell>{agent.subject}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{agent.style}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(agent.created_at), 'dd.MM.yyyy', { locale: ru })}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewModal({ open: true, agent })}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => handleDeleteAgent(agent.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Modal */}
      <Dialog open={viewModal.open} onOpenChange={(open) => setViewModal({ ...viewModal, open })}>
        <DialogContent className="max-w-2xl bg-background border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{viewModal.agent?.avatar}</span>
              {viewModal.agent?.name}
            </DialogTitle>
          </DialogHeader>
          {viewModal.agent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Предмет:</p>
                  <p className="font-medium">{viewModal.agent.subject}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Стиль:</p>
                  <p className="font-medium">{viewModal.agent.style}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Создатель:</p>
                  <p className="font-medium">{viewModal.agent.user_email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Шаблон:</p>
                  <p className="font-medium">{viewModal.agent.is_template ? 'Да' : 'Нет'}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Системный промпт:</p>
                <p className="p-3 rounded-lg bg-muted/30 text-sm whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                  {viewModal.agent.system_prompt}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editModal.open} onOpenChange={(open) => setEditModal({ ...editModal, open })}>
        <DialogContent className="max-w-2xl bg-background border-border">
          <DialogHeader>
            <DialogTitle>
              {editModal.agent ? 'Редактировать шаблон' : 'Новый шаблон'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">Название:</label>
                <Input
                  value={editModal.name}
                  onChange={(e) => setEditModal({ ...editModal, name: e.target.value })}
                  placeholder="Математик Макс"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Аватар (emoji):</label>
                <Input
                  value={editModal.avatar}
                  onChange={(e) => setEditModal({ ...editModal, avatar: e.target.value })}
                  placeholder="🤖"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Предмет:</label>
                <Input
                  value={editModal.subject}
                  onChange={(e) => setEditModal({ ...editModal, subject: e.target.value })}
                  placeholder="Математика"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Стиль:</label>
                <Input
                  value={editModal.style}
                  onChange={(e) => setEditModal({ ...editModal, style: e.target.value })}
                  placeholder="friendly"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Системный промпт:</label>
              <Textarea
                value={editModal.system_prompt}
                onChange={(e) => setEditModal({ ...editModal, system_prompt: e.target.value })}
                placeholder="Ты дружелюбный репетитор по математике..."
                className="min-h-[200px]"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditModal({ ...editModal, open: false })}>
                Отмена
              </Button>
              <Button onClick={handleSaveTemplate}>
                {editModal.agent ? 'Сохранить' : 'Создать'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
