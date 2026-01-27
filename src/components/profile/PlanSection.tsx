import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Check, Zap, Rocket } from "lucide-react";

interface PlanSectionProps {
  role: string;
}

const PLANS = [
  {
    id: "free",
    name: "FREE",
    description: "Бесплатный доступ к базовым функциям",
    features: [
      "2 бесплатные генерации в день",
      "Базовые модели AI",
      "5 токенов ежедневно",
      "Сохранение работ",
    ],
    icon: Zap,
    color: "from-gray-500 to-gray-600",
  },
  {
    id: "basic",
    name: "BASIC",
    price: "299₽/мес",
    description: "Расширенные возможности для творчества",
    features: [
      "10 бесплатных генераций в день",
      "Доступ к GPT-4o-mini",
      "10 токенов ежедневно",
      "Приоритетная очередь",
      "Без рекламы",
    ],
    icon: Rocket,
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: "premium",
    name: "PREMIUM",
    price: "799₽/мес",
    description: "Полный доступ ко всем функциям",
    features: [
      "Безлимитные генерации",
      "Все премиум модели",
      "25 токенов ежедневно",
      "Максимальный приоритет",
      "Эксклюзивные функции",
      "Персональная поддержка",
    ],
    icon: Crown,
    color: "from-amber-500 to-orange-500",
    popular: true,
  },
];

export function PlanSection({ role }: PlanSectionProps) {
  const currentPlan = PLANS.find(p => p.id === role) || PLANS[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-amber-500" />
          Тариф и подписка
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Current Plan */}
        <div className="mb-6">
          <p className="text-sm text-muted-foreground mb-2">Текущий тариф:</p>
          <div className="flex items-center gap-3">
            <Badge className={`bg-gradient-to-r ${currentPlan.color} text-white px-4 py-1 text-lg`}>
              {currentPlan.name}
            </Badge>
            <span className="text-muted-foreground">{currentPlan.description}</span>
          </div>
        </div>

        {/* All Plans */}
        <div className="grid md:grid-cols-3 gap-4">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const isActive = plan.id === role;

            return (
              <Card
                key={plan.id}
                className={`relative ${isActive ? "ring-2 ring-primary" : ""} ${
                  plan.popular ? "border-amber-500/50" : ""
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500">
                    Популярный
                  </Badge>
                )}
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${plan.color} flex items-center justify-center`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold">{plan.name}</h4>
                      {plan.price && <p className="text-sm text-primary">{plan.price}</p>}
                    </div>
                  </div>

                  <ul className="space-y-2 my-4">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500 shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {isActive ? (
                    <Button variant="outline" className="w-full" disabled>
                      Текущий тариф
                    </Button>
                  ) : (
                    <Button
                      className={`w-full ${
                        plan.popular ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90" : ""
                      }`}
                      variant={plan.popular ? "default" : "outline"}
                    >
                      {plan.id === "free" ? "Перейти" : "Улучшить"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
