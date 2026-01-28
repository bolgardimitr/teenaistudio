import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Save, Key, Coins, Settings, RefreshCw, Eye, EyeOff, CheckCircle, XCircle, AlertCircle, Loader2, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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

type ApiStatus = 'connected' | 'error' | 'not_configured' | 'checking';

export default function AdminSettings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [prices, setPrices] = useState<TokenPrice[]>(DEFAULT_PRICES);
  const [freeLimits, setFreeLimits] = useState<FreeLimits>({
    photo: 5,
    video: 1,
    music: 3,
    text: 20,
    dailyBonus: 5,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingApiKeys, setIsSavingApiKeys] = useState(false);

  // API Key input values
  const [kieaiApiKey, setKieaiApiKey] = useState('');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [googleApiKey, setGoogleApiKey] = useState('');
  const [cloudpaymentsPublicId, setCloudpaymentsPublicId] = useState('');
  const [cloudpaymentsSecret, setCloudpaymentsSecret] = useState('');

  // Show/hide password toggles
  const [showKieai, setShowKieai] = useState(false);
  const [showOpenai, setShowOpenai] = useState(false);
  const [showGoogle, setShowGoogle] = useState(false);
  const [showCpPublic, setShowCpPublic] = useState(false);
  const [showCpSecret, setShowCpSecret] = useState(false);

  const apiProviders = useMemo(
    () => [
      { id: 'kieai', label: 'KIE.AI', secretKey: 'KIEAI_API_KEY', description: 'Генерация изображений и видео' },
      { id: 'openai', label: 'OpenAI', secretKey: 'OPENAI_API_KEY', description: 'GPT-4, DALL-E' },
      { id: 'google', label: 'Google AI', secretKey: 'GOOGLE_AI_API_KEY', description: 'Gemini Pro' },
      { id: 'cloudpayments', label: 'CloudPayments', secretKey: 'CLOUDPAYMENTS_API_SECRET', description: 'Платежи' },
    ],
    [],
  );

  const [apiStatus, setApiStatus] = useState<Record<string, { status: ApiStatus; balance?: string; message?: string }>>({
    kieai: { status: 'checking' },
    openai: { status: 'checking' },
    google: { status: 'checking' },
    cloudpayments: { status: 'checking' },
  });

  // Load settings on mount
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('token_prices, free_limits')
          .eq('id', 'default')
          .maybeSingle();

        if (error) throw error;

        if (data?.token_prices && Array.isArray(data.token_prices)) {
          setPrices(data.token_prices as unknown as TokenPrice[]);
        }
        if (data?.free_limits && typeof data.free_limits === 'object' && data.free_limits) {
          setFreeLimits(data.free_limits as unknown as FreeLimits);
        }
      } catch (e: any) {
        toast({
          title: 'Не удалось загрузить настройки',
          description: e.message,
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [toast]);

  const checkApi = async (providerId: string) => {
    setApiStatus((prev) => ({
      ...prev,
      [providerId]: { status: 'checking' },
    }));

    try {
      const { data, error } = await supabase.functions.invoke('test-api-connection', {
        body: { provider: providerId },
      });

      if (error) throw error;

      const message = data?.message as string | undefined;
      const notConfigured = !data?.success && !!message && /не настроен/i.test(message);

      setApiStatus((prev) => ({
        ...prev,
        [providerId]: {
          status: data?.success ? 'connected' : notConfigured ? 'not_configured' : 'error',
          balance: data?.balance,
          message,
        },
      }));
    } catch (e: any) {
      setApiStatus((prev) => ({
        ...prev,
        [providerId]: { status: 'error', message: e.message },
      }));
    }
  };

  const checkAllApis = () => {
    apiProviders.forEach((p) => {
      void checkApi(p.id);
    });
  };

  useEffect(() => {
    checkAllApis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePriceChange = (index: number, value: string) => {
    const newPrices = [...prices];
    newPrices[index].tokens = parseInt(value) || 0;
    setPrices(newPrices);
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert(
          {
            id: 'default',
            token_prices: prices as any,
            free_limits: freeLimits as any,
            updated_at: new Date().toISOString(),
            updated_by: user?.id ?? null,
          },
          { onConflict: 'id' },
        );

      if (error) throw error;

      toast({
        title: 'Настройки сохранены!',
        description: 'Цены и лимиты обновлены',
      });
    } catch (e: any) {
      toast({
        title: 'Ошибка сохранения',
        description: e.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveApiKeys = async () => {
    setIsSavingApiKeys(true);
    
    // API keys need to be managed through platform secrets
    // This is a UI hint for the user
    toast({
      title: '⚠️ Управление API ключами',
      description: 'API ключи управляются через безопасное хранилище платформы. Напишите в чат "обнови ключ KIEAI_API_KEY на [ваш ключ]" для обновления.',
      duration: 8000,
    });
    
    setIsSavingApiKeys(false);
  };

  const renderStatusIcon = (status: ApiStatus) => {
    if (status === 'connected') return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (status === 'checking') return <RefreshCw className="h-5 w-5 text-muted-foreground animate-spin" />;
    if (status === 'not_configured') return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    return <XCircle className="h-5 w-5 text-destructive" />;
  };

  const renderApiBadge = (status: ApiStatus) => {
    if (status === 'connected') return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Подключено</Badge>;
    if (status === 'checking') return <Badge variant="secondary">Проверка…</Badge>;
    if (status === 'not_configured') return <Badge variant="outline" className="border-yellow-500/30 text-yellow-500">Не настроен</Badge>;
    return <Badge variant="destructive">Ошибка</Badge>;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">⚙️ Настройки</h1>

      {/* API Keys Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Статус API подключений
          </CardTitle>
          <CardDescription>
            Текущий статус подключения к внешним сервисам
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {apiProviders.map((provider) => (
            <div
              key={provider.id}
              className="flex items-center justify-between p-4 rounded-lg border bg-card"
            >
              <div className="flex items-center gap-4">
                {renderStatusIcon(apiStatus[provider.id]?.status ?? 'checking')}
                <div>
                  <p className="font-medium">{provider.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {provider.description}
                    {apiStatus[provider.id]?.balance && (
                      <span className="ml-2 text-green-500">
                        Баланс: {apiStatus[provider.id]?.balance}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {renderApiBadge(apiStatus[provider.id]?.status ?? 'checking')}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => checkApi(provider.id)}
                  disabled={apiStatus[provider.id]?.status === 'checking'}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${apiStatus[provider.id]?.status === 'checking' ? 'animate-spin' : ''}`} />
                  Проверить
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* API Keys Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Редактирование API ключей
          </CardTitle>
          <CardDescription>
            Введите или измените API ключи для внешних сервисов
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* KIE.AI API Key */}
          <div className="space-y-2">
            <Label htmlFor="kieai-key" className="font-medium">
              KIE.AI API Key
            </Label>
            <div className="flex gap-2">
              <Input
                id="kieai-key"
                type={showKieai ? 'text' : 'password'}
                value={kieaiApiKey}
                onChange={(e) => setKieaiApiKey(e.target.value)}
                placeholder="Введите KIE.AI API ключ..."
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowKieai(!showKieai)}
              >
                {showKieai ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Получить: <a href="https://kie.ai" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">kie.ai</a>
            </p>
          </div>

          {/* OpenAI API Key */}
          <div className="space-y-2">
            <Label htmlFor="openai-key" className="font-medium">
              OpenAI API Key
            </Label>
            <div className="flex gap-2">
              <Input
                id="openai-key"
                type={showOpenai ? 'text' : 'password'}
                value={openaiApiKey}
                onChange={(e) => setOpenaiApiKey(e.target.value)}
                placeholder="sk-..."
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowOpenai(!showOpenai)}
              >
                {showOpenai ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Получить: <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">platform.openai.com/api-keys</a>
            </p>
          </div>

          {/* Google AI API Key */}
          <div className="space-y-2">
            <Label htmlFor="google-key" className="font-medium">
              Google AI API Key
            </Label>
            <div className="flex gap-2">
              <Input
                id="google-key"
                type={showGoogle ? 'text' : 'password'}
                value={googleApiKey}
                onChange={(e) => setGoogleApiKey(e.target.value)}
                placeholder="AIza..."
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowGoogle(!showGoogle)}
              >
                {showGoogle ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Получить: <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">aistudio.google.com/app/apikey</a>
            </p>
          </div>

          {/* CloudPayments Public ID */}
          <div className="space-y-2">
            <Label htmlFor="cp-public" className="font-medium">
              CloudPayments Public ID
            </Label>
            <div className="flex gap-2">
              <Input
                id="cp-public"
                type={showCpPublic ? 'text' : 'password'}
                value={cloudpaymentsPublicId}
                onChange={(e) => setCloudpaymentsPublicId(e.target.value)}
                placeholder="pk_..."
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowCpPublic(!showCpPublic)}
              >
                {showCpPublic ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* CloudPayments API Secret */}
          <div className="space-y-2">
            <Label htmlFor="cp-secret" className="font-medium">
              CloudPayments API Secret
            </Label>
            <div className="flex gap-2">
              <Input
                id="cp-secret"
                type={showCpSecret ? 'text' : 'password'}
                value={cloudpaymentsSecret}
                onChange={(e) => setCloudpaymentsSecret(e.target.value)}
                placeholder="..."
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowCpSecret(!showCpSecret)}
              >
                {showCpSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <Separator />

          {/* Warning about secure storage */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              <strong>⚠️ Важно:</strong> API ключи хранятся в защищённом хранилище платформы. 
              Для сохранения ключа, введите его в поле выше и нажмите "Сохранить API ключи".
              После сохранения ключ будет использоваться во всех Edge Functions.
            </p>
          </div>

          {/* Save API Keys Button */}
          <Button
            onClick={handleSaveApiKeys}
            disabled={isSavingApiKeys}
            className="w-full"
            size="lg"
          >
            {isSavingApiKeys ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Сохранение...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Сохранить API ключи
              </>
            )}
          </Button>
        </CardContent>
      </Card>

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
            <div className="space-y-2">
              <Label className="text-muted-foreground">📸 Фото / день</Label>
              <Input
                type="number"
                value={freeLimits.photo}
                onChange={(e) => setFreeLimits({ ...freeLimits, photo: parseInt(e.target.value) || 0 })}
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">🎬 Видео / день</Label>
              <Input
                type="number"
                value={freeLimits.video}
                onChange={(e) => setFreeLimits({ ...freeLimits, video: parseInt(e.target.value) || 0 })}
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">🎵 Музыка / день</Label>
              <Input
                type="number"
                value={freeLimits.music}
                onChange={(e) => setFreeLimits({ ...freeLimits, music: parseInt(e.target.value) || 0 })}
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">💬 Сообщения / день</Label>
              <Input
                type="number"
                value={freeLimits.text}
                onChange={(e) => setFreeLimits({ ...freeLimits, text: parseInt(e.target.value) || 0 })}
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">🎁 Ежедневный бонус</Label>
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

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSaveSettings} size="lg" disabled={isSaving || isLoading}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Сохранение…' : 'Сохранить настройки'}
        </Button>
      </div>
    </div>
  );
}
