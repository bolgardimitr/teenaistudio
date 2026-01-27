import { Button } from "@/components/ui/button";
import { Bot, Library } from "lucide-react";

interface EmptyAgentsProps {
  onCreateAgent: () => void;
  onViewTemplates: () => void;
}

export function EmptyAgents({ onCreateAgent, onViewTemplates }: EmptyAgentsProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mb-6">
        <Bot className="w-16 h-16 text-primary" />
      </div>
      <h2 className="text-2xl font-bold mb-2">У вас пока нет агентов</h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        Создайте своего AI-репетитора или выберите из готовых шаблонов
      </p>
      <div className="flex gap-3 flex-wrap justify-center">
        <Button 
          onClick={onCreateAgent}
          className="bg-gradient-to-r from-primary to-secondary hover:opacity-90"
        >
          <Bot className="w-4 h-4 mr-2" />
          Создать агента
        </Button>
        <Button variant="outline" onClick={onViewTemplates}>
          <Library className="w-4 h-4 mr-2" />
          Смотреть шаблоны
        </Button>
      </div>
    </div>
  );
}
