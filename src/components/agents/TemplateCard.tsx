import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { AgentTemplate } from "@/data/agentTemplates";

interface TemplateCardProps {
  template: AgentTemplate;
  onUse: (template: AgentTemplate) => void;
}

export function TemplateCard({ template, onUse }: TemplateCardProps) {
  return (
    <Card className="bg-card/50 border-border/50 hover:border-primary/50 transition-all h-full flex flex-col">
      <CardContent className="pt-6 flex-1">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-2xl shrink-0">
            {template.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{template.name}</h3>
            <div className="flex flex-wrap gap-1 mt-1">
              <Badge variant="secondary" className="text-xs">
                {template.categoryIcon} {template.subject}
              </Badge>
              <Badge variant="outline" className="text-xs">{template.grade}</Badge>
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
          {template.description}
        </p>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={() => onUse(template)}
          variant="outline"
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Использовать
        </Button>
      </CardFooter>
    </Card>
  );
}
