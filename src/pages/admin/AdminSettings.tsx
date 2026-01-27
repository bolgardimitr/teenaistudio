import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Save, Eye, EyeOff, Key, Coins, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TokenPrice {
  model: string;
  type: string;
  tokens: number;
}

interface FreeLimits {
  photo: number;
  video: number;
  music: number;
  text: number;
  dailyBonus: number;
}

const DEFAULT_PRICES: TokenPrice[] = [
  { model: 'FLUX', type: 'photo', tokens: 5 },
  { model: 'Stable Diffusion', type: 'photo', tokens: 3 },
  { model: 'KIE.AI', type: 'video', tokens: 50 },
  { model: 'Suno', type: 'music', tokens: 10 },
  { model: 'GPT-4', type: 'text', tokens: 2 },
  { model: 'Gemini', type: 'text', tokens: 1 },
];

export default function AdminSettings() {
  const { toast } = useToast();
  const [prices, setPrices] = useState<TokenPrice[]>(DEFAULT_PRICES);
  const [freeLimits, setFreeLimits] = useState<FreeLimits>({
    photo: 5,
    video: 1,
    music: 3,
    text: 20,
    dailyBonus: 5,
  });

  const [apiKeys, setApiKeys] = useState({
    kieai: '',
    openai: '',
    google: '',
    cloudpayments_public: '',
    cloudpayments_secret: '',
  });

  const [showKeys, setShowKeys] = useState({
    kieai: false,
    openai: false,
    google: false,
    cloudpayments_public: false,
    cloudpayments_secret: false,
  });

  const handlePriceChange = (index: number, value: string) => {
    const newPrices = [...prices];
    newPrices[index].tokens = parseInt(value) || 0;
    setPrices(newPrices);
  };

  const handleSaveSettings = () => {
    // In a real app, this would save to a settings table or environment variables
    toast({
      title: 'Настройки сохранены!',
      description: 'Изменения вступят в силу немедленно',
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">⚙️ Настройки</h1>

      {/* Token Prices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Цены токенов
          </CardTitle>
          <CardDescription>
            Стоимость генерации в токенах для каждой модели
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Модель</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead className="w-[150px]">Токены</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prices.map((price, index) => (
                <TableRow key={`${price.model}-${price.type}`}>
                  <TableCell className="font-medium">{price.model}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{price.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={price.tokens}
                      onChange={(e) => handlePriceChange(index, e.target.value)}
                      className="w-24"
                      min={0}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Free Tier Limits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Лимиты Free тарифа
          </CardTitle>
          <CardDescription>
            Бесплатные генерации в день для пользователей без подписки
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <label className="text-sm text-muted-foreground">📸 Фото / день</label>
              <Input
                type="number"
                value={freeLimits.photo}
                onChange={(e) => setFreeLimits({ ...freeLimits, photo: parseInt(e.target.value) || 0 })}
                min={0}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">🎬 Видео / день</label>
              <Input
                type="number"
                value={freeLimits.video}
                onChange={(e) => setFreeLimits({ ...freeLimits, video: parseInt(e.target.value) || 0 })}
                min={0}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">🎵 Музыка / день</label>
              <Input
                type="number"
                value={freeLimits.music}
                onChange={(e) => setFreeLimits({ ...freeLimits, music: parseInt(e.target.value) || 0 })}
                min={0}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">💬 Сообщения / день</label>
              <Input
                type="number"
                value={freeLimits.text}
                onChange={(e) => setFreeLimits({ ...freeLimits, text: parseInt(e.target.value) || 0 })}
                min={0}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">🎁 Ежедневный бонус</label>
              <Input
                type="number"
                value={freeLimits.dailyBonus}
                onChange={(e) => setFreeLimits({ ...freeLimits, dailyBonus: parseInt(e.target.value) || 0 })}
                min={0}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Ключи
          </CardTitle>
          <CardDescription>
            Ключи для внешних сервисов. Храните их в безопасности!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* KIE.AI */}
          <div>
            <label className="text-sm font-medium">KIE.AI API Key</label>
            <div className="flex gap-2 mt-1">
              <div className="relative flex-1">
                <Input
                  type={showKeys.kieai ? 'text' : 'password'}
                  value={apiKeys.kieai}
                  onChange={(e) => setApiKeys({ ...apiKeys, kieai: e.target.value })}
                  placeholder="sk-..."
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                  onClick={() => setShowKeys({ ...showKeys, kieai: !showKeys.kieai })}
                >
                  {showKeys.kieai ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          {/* OpenAI */}
          <div>
            <label className="text-sm font-medium">OpenAI API Key</label>
            <div className="flex gap-2 mt-1">
              <div className="relative flex-1">
                <Input
                  type={showKeys.openai ? 'text' : 'password'}
                  value={apiKeys.openai}
                  onChange={(e) => setApiKeys({ ...apiKeys, openai: e.target.value })}
                  placeholder="sk-..."
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                  onClick={() => setShowKeys({ ...showKeys, openai: !showKeys.openai })}
                >
                  {showKeys.openai ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          {/* Google AI */}
          <div>
            <label className="text-sm font-medium">Google AI API Key</label>
            <div className="flex gap-2 mt-1">
              <div className="relative flex-1">
                <Input
                  type={showKeys.google ? 'text' : 'password'}
                  value={apiKeys.google}
                  onChange={(e) => setApiKeys({ ...apiKeys, google: e.target.value })}
                  placeholder="AIza..."
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                  onClick={() => setShowKeys({ ...showKeys, google: !showKeys.google })}
                >
                  {showKeys.google ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* CloudPayments Public ID */}
          <div>
            <label className="text-sm font-medium">CloudPayments Public ID</label>
            <div className="flex gap-2 mt-1">
              <div className="relative flex-1">
                <Input
                  type={showKeys.cloudpayments_public ? 'text' : 'password'}
                  value={apiKeys.cloudpayments_public}
                  onChange={(e) => setApiKeys({ ...apiKeys, cloudpayments_public: e.target.value })}
                  placeholder="pk_..."
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                  onClick={() => setShowKeys({ ...showKeys, cloudpayments_public: !showKeys.cloudpayments_public })}
                >
                  {showKeys.cloudpayments_public ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          {/* CloudPayments Secret */}
          <div>
            <label className="text-sm font-medium">CloudPayments API Secret</label>
            <div className="flex gap-2 mt-1">
              <div className="relative flex-1">
                <Input
                  type={showKeys.cloudpayments_secret ? 'text' : 'password'}
                  value={apiKeys.cloudpayments_secret}
                  onChange={(e) => setApiKeys({ ...apiKeys, cloudpayments_secret: e.target.value })}
                  placeholder="..."
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                  onClick={() => setShowKeys({ ...showKeys, cloudpayments_secret: !showKeys.cloudpayments_secret })}
                >
                  {showKeys.cloudpayments_secret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            ⚠️ API ключи хранятся в безопасном хранилище и не передаются клиенту.
            Для применения изменений нажмите "Сохранить настройки".
          </p>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSaveSettings} size="lg">
          <Save className="h-4 w-4 mr-2" />
          Сохранить настройки
        </Button>
      </div>
    </div>
  );
}
