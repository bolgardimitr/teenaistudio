import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Pencil, Trash2 } from "lucide-react";

interface AgentCardProps {
  agent: {
    id: string;
    name: string;
    avatar: string;
    subject: string;
    grade?: string;
    dialogsCount?: number;
    messagesCount?: number;
  };
  onStartChat: (agentId: string) => void;
  onEdit: (agentId: string) => void;
  onDelete: (agentId: string) => void;
}

export function AgentCard({ agent, onStartChat, onEdit, onDelete }: AgentCardProps) {
  return (
    <Card className="bg-card/50 border-border/50 hover:border-primary/50 transition-all">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-3xl">
            {agent.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">{agent.name}</h3>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="secondary">{agent.subject}</Badge>
              {agent.grade && (
                <Badge variant="outline">{agent.grade}</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Диалогов: {agent.dialogsCount || 0} | Сообщений: {agent.messagesCount || 0}
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="gap-2 flex-wrap">
        <Button 
          onClick={() => onStartChat(agent.id)}
          className="flex-1 bg-gradient-to-r from-primary to-secondary hover:opacity-90"
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          Начать диалог
        </Button>
        <Button 
          variant="outline" 
          size="icon"
          onClick={() => onEdit(agent.id)}
        >
          <Pencil className="w-4 h-4" />
        </Button>
        <Button 
          variant="outline" 
          size="icon"
          onClick={() => onDelete(agent.id)}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
