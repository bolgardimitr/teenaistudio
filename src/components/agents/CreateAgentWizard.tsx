import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { 
  AGENT_AVATARS, 
  AGENT_CATEGORIES, 
  COMMUNICATION_STYLES, 
  AGENT_FEATURES 
} from "@/data/agentTemplates";

interface AgentFormData {
  name: string;
  avatar: string;
  subject: string;
  grade: string;
  style: string;
  features: string[];
  systemPrompt: string;
}

interface CreateAgentWizardProps {
  initialData?: Partial<AgentFormData>;
  onComplete: (data: AgentFormData) => void;
  onCancel: () => void;
}

export function CreateAgentWizard({ initialData, onComplete, onCancel }: CreateAgentWizardProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<AgentFormData>({
    name: initialData?.name || "",
    avatar: initialData?.avatar || "🤖",
    subject: initialData?.subject || "",
    grade: initialData?.grade || "",
    style: initialData?.style || "friendly",
    features: initialData?.features || ["step_by_step", "praise", "use_emoji"],
    systemPrompt: initialData?.systemPrompt || "",
  });
  const [testMessages, setTestMessages] = useState<{role: string; content: string}[]>([]);
  const [testInput, setTestInput] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const generateSystemPrompt = () => {
    const styleDescriptions: Record<string, string> = {
      friendly: "дружелюбный и поддерживающий, много хвалишь и подбадриваешь",
      strict: "требовательный, но справедливый, следишь за точностью",
      playful: "весёлый и игривый, превращаешь обучение в игру",
      practical: "практичный и сфокусированный, без лишних слов",
    };

    const featureInstructions = formData.features.map(f => {
      const feature = AGENT_FEATURES.find(af => af.id === f);
      return feature ? `- ${feature.label}` : "";
    }).filter(Boolean).join("\n");

    return `Ты — AI-репетитор по предмету "${formData.subject}" для ученика ${formData.grade}. Тебя зовут ${formData.name}.

ТВОЙ СТИЛЬ:
Ты ${styleDescriptions[formData.style] || styleDescriptions.friendly}.

ТВОИ ПРАВИЛА:
${featureInstructions}

ФОРМАТ ОТВЕТОВ:
- Пошаговые объяснения
- Простой и понятный язык
- Проверочные вопросы в конце

Начни диалог с приветствия и спроси, с чем нужна помощь.`;
  };

  const handleNext = () => {
    if (step === 2) {
      setFormData(prev => ({
        ...prev,
        systemPrompt: prev.systemPrompt || generateSystemPrompt()
      }));
    }
    setStep(s => Math.min(s + 1, 4));
  };

  const handleBack = () => {
    setStep(s => Math.max(s - 1, 1));
  };

  const handleFeatureToggle = (featureId: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.includes(featureId)
        ? prev.features.filter(f => f !== featureId)
        : [...prev.features, featureId]
    }));
  };

  const handleTestSend = () => {
    if (!testInput.trim()) return;
    
    setTestMessages(prev => [
      ...prev,
      { role: "user", content: testInput },
      { role: "assistant", content: `Привет! Я ${formData.name}, твой помощник по предмету ${formData.subject}. Чем могу помочь? 😊` }
    ]);
    setTestInput("");
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.name && formData.subject;
      case 2:
        return formData.style;
      case 3:
        return true;
      case 4:
        return formData.systemPrompt;
      default:
        return true;
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-between mb-8">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
              step >= s 
                ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground" 
                : "bg-muted text-muted-foreground"
            }`}>
              {step > s ? <Check className="w-5 h-5" /> : s}
            </div>
            {s < 4 && (
              <div className={`w-12 md:w-24 h-1 mx-2 ${
                step > s ? "bg-primary" : "bg-muted"
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Basic */}
      {step === 1 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Шаг 1: Основное</h2>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Имя агента</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Например: Матеша"
              />
            </div>

            <div>
              <Label>Аватар</Label>
              <div className="grid grid-cols-6 gap-2 mt-2">
                {AGENT_AVATARS.map((avatar) => (
                  <button
                    key={avatar}
                    onClick={() => setFormData(prev => ({ ...prev, avatar }))}
                    className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl transition-all ${
                      formData.avatar === avatar 
                        ? "bg-primary/20 ring-2 ring-primary" 
                        : "bg-muted hover:bg-muted/80"
                    }`}
                  >
                    {avatar}
                  </button>
                ))}
              </div>
              <Button variant="outline" className="mt-2" size="sm">
                <Sparkles className="w-4 h-4 mr-2" />
                Сгенерировать
              </Button>
            </div>

            <div>
              <Label htmlFor="subject">Предмет</Label>
              <Select
                value={formData.subject}
                onValueChange={(value) => setFormData(prev => ({ ...prev, subject: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите предмет" />
                </SelectTrigger>
                <SelectContent>
                  {AGENT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.icon} {cat.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="Другое">Другое</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="grade">Класс / Уровень</Label>
              <Input
                id="grade"
                value={formData.grade}
                onChange={(e) => setFormData(prev => ({ ...prev, grade: e.target.value }))}
                placeholder="Например: 5 класс или Beginner"
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Personality */}
      {step === 2 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Шаг 2: Личность</h2>
          
          <div>
            <Label>Стиль общения</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
              {COMMUNICATION_STYLES.map((style) => (
                <Card
                  key={style.id}
                  className={`cursor-pointer transition-all ${
                    formData.style === style.id
                      ? "ring-2 ring-primary bg-primary/10"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => setFormData(prev => ({ ...prev, style: style.id }))}
                >
                  <CardContent className="p-4 flex items-start gap-3">
                    <span className="text-2xl">{style.icon}</span>
                    <div>
                      <h4 className="font-medium">{style.name}</h4>
                      <p className="text-sm text-muted-foreground">{style.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <Label>Особенности</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
              {AGENT_FEATURES.map((feature) => (
                <div key={feature.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={feature.id}
                    checked={formData.features.includes(feature.id)}
                    onCheckedChange={() => handleFeatureToggle(feature.id)}
                  />
                  <Label htmlFor={feature.id} className="cursor-pointer">
                    {feature.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Materials */}
      {step === 3 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Шаг 3: Материалы (опционально)</h2>
          
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              📁
            </div>
            <h3 className="font-medium mb-2">Загрузите свои материалы</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Агент будет использовать их для более точных ответов
            </p>
            <p className="text-xs text-muted-foreground">
              Поддерживаемые форматы: PDF, DOCX, TXT
            </p>
            <Button variant="outline" className="mt-4">
              Выбрать файлы
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground text-center">
            Этот шаг можно пропустить и добавить материалы позже
          </p>
        </div>
      )}

      {/* Step 4: Testing */}
      {step === 4 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Шаг 4: Тестирование</h2>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Системный промпт</Label>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? "Готово" : "Редактировать"}
              </Button>
            </div>
            <Textarea
              value={formData.systemPrompt}
              onChange={(e) => setFormData(prev => ({ ...prev, systemPrompt: e.target.value }))}
              readOnly={!isEditing}
              className={`min-h-[200px] text-sm ${!isEditing ? "bg-muted/50" : ""}`}
            />
          </div>

          <div>
            <Label>Тестовый чат</Label>
            <Card className="mt-2">
              <CardContent className="p-4">
                <div className="h-48 overflow-y-auto space-y-3 mb-4">
                  {testMessages.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      Отправьте сообщение, чтобы протестировать агента
                    </p>
                  ) : (
                    testMessages.map((msg, i) => (
                      <div 
                        key={i}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`max-w-[80%] rounded-lg px-3 py-2 ${
                          msg.role === "user" 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-muted"
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    placeholder="Напишите тестовое сообщение..."
                    onKeyDown={(e) => e.key === "Enter" && handleTestSend()}
                  />
                  <Button onClick={handleTestSend}>Отправить</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={step === 1 ? onCancel : handleBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          {step === 1 ? "Отмена" : "Назад"}
        </Button>
        {step < 4 ? (
          <Button onClick={handleNext} disabled={!canProceed()}>
            Далее
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button 
            onClick={() => onComplete(formData)}
            className="bg-gradient-to-r from-primary to-secondary hover:opacity-90"
          >
            <Check className="w-4 h-4 mr-2" />
            Сохранить агента
          </Button>
        )}
      </div>
    </div>
  );
}
