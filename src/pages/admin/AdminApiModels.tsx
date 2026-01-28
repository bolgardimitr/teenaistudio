import { useState, useEffect } from 'react';
import { 
  Plug, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  ExternalLink,
  Download,
  Bell,
  Zap,
  Play
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ApiConnection {
  id: string;
  name: string;
  description: string;
  secretKey: string;
  status: 'connected' | 'error' | 'not_configured';
  balance?: string;
}

interface ModelStatus {
  id: string;
  name: string;
  type: 'photo' | 'video' | 'music' | 'text';
  api: string;
  cost: string;
  status: 'success' | 'warning' | 'error';
  lastTest?: string;
  errorMessage?: string;
}

const apiConnections: ApiConnection[] = [
  { 
    id: 'kieai', 
    name: 'KIE.AI API', 
    description: 'Генерация изображений и видео',
    secretKey: 'KIEAI_API_KEY',
    status: 'not_configured'
  },
  { 
    id: 'openai', 
    name: 'OpenAI API', 
    description: 'GPT и DALL-E модели',
    secretKey: 'OPENAI_API_KEY',
    status: 'not_configured'
  },
  { 
    id: 'google', 
    name: 'Google AI API', 
    description: 'Gemini модели',
    secretKey: 'GOOGLE_AI_API_KEY',
    status: 'not_configured'
  },
  { 
    id: 'cloudpayments', 
    name: 'CloudPayments', 
    description: 'Обработка платежей',
    secretKey: 'CLOUDPAYMENTS_API_SECRET',
    status: 'not_configured'
  }
];

const allModels: ModelStatus[] = [
  // Photo models
  { id: 'nano-banana', name: 'Nano Banana', type: 'photo', api: 'KIE.AI', cost: '4 токена', status: 'success' },
  { id: 'kandinsky', name: 'Kandinsky 3.1', type: 'photo', api: 'KIE.AI', cost: 'FREE', status: 'success' },
  { id: '4o-image', name: '4o Image', type: 'photo', api: 'KIE.AI', cost: '10 токенов', status: 'success' },
  { id: 'midjourney', name: 'Midjourney V7', type: 'photo', api: 'KIE.AI', cost: '15 токенов', status: 'success' },
  { id: 'flux-kontext', name: 'Flux Kontext', type: 'photo', api: 'KIE.AI', cost: '8 токенов', status: 'success' },
  { id: 'seedream', name: 'Seedream 4.0', type: 'photo', api: 'KIE.AI', cost: '12 токенов', status: 'success' },
  
  // Video models
  { id: 'luma', name: 'Luma Dream Machine', type: 'video', api: 'KIE.AI', cost: 'FREE (3/день)', status: 'success' },
  { id: 'kling-turbo', name: 'Kling 2.5 Turbo', type: 'video', api: 'KIE.AI', cost: '70 токенов', status: 'success' },
  { id: 'seedance', name: 'Seedance 1.5 Pro', type: 'video', api: 'KIE.AI', cost: '120 токенов', status: 'success' },
  { id: 'veo3-fast', name: 'Veo 3 Fast', type: 'video', api: 'KIE.AI', cost: '80 токенов', status: 'success' },
  { id: 'veo31', name: 'Veo 3.1 Quality', type: 'video', api: 'KIE.AI', cost: '400 токенов', status: 'success' },
  { id: 'runway', name: 'Runway Aleph', type: 'video', api: 'KIE.AI', cost: '100 токенов', status: 'success' },
  { id: 'sora-2', name: 'Sora 2', type: 'video', api: 'KIE.AI', cost: '50 токенов', status: 'success' },
  { id: 'sora-2-pro', name: 'Sora 2 Pro', type: 'video', api: 'KIE.AI', cost: '80 токенов', status: 'success' },
  
  // Music models
  { id: 'suno-v4', name: 'Suno V4', type: 'music', api: 'KIE.AI', cost: '30 токенов', status: 'success' },
  { id: 'suno-v35', name: 'Suno V3.5', type: 'music', api: 'KIE.AI', cost: 'FREE (2/день)', status: 'success' },
  
  // Text models
  { id: 'gemini-flash', name: 'Gemini 2.5 Flash', type: 'text', api: 'Lovable AI', cost: 'FREE', status: 'success' },
  { id: 'gpt-4o', name: 'GPT-4o', type: 'text', api: 'OpenAI', cost: '5 токенов', status: 'success' },
  { id: 'claude-sonnet', name: 'Claude 3.5 Sonnet', type: 'text', api: 'Anthropic', cost: '8 токенов', status: 'success' },
];

export default function AdminApiModels() {
  const [connections, setConnections] = useState<ApiConnection[]>(apiConnections);
  const [models, setModels] = useState<ModelStatus[]>(allModels);
  const [testingAll, setTestingAll] = useState(false);
  const [testingModel, setTestingModel] = useState<string | null>(null);
  const [testProgress, setTestProgress] = useState(0);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [currentTestModel, setCurrentTestModel] = useState<string>('');
  const [apiTests, setApiTests] = useState<any[]>([]);

  useEffect(() => {
    loadApiTests();
  }, []);

  const loadApiTests = async () => {
    const { data, error } = await supabase
      .from('api_tests')
      .select('*')
      .order('tested_at', { ascending: false })
      .limit(100);

    if (data) {
      setApiTests(data);
      // Update model statuses based on latest tests
      updateModelStatuses(data);
    }
  };

  const updateModelStatuses = (tests: any[]) => {
    const latestTests = new Map<string, any>();
    tests.forEach(test => {
      if (!latestTests.has(test.model_name)) {
        latestTests.set(test.model_name, test);
      }
    });

    setModels(prevModels => prevModels.map(model => {
      const lastTest = latestTests.get(model.name);
      if (lastTest) {
        return {
          ...model,
          status: lastTest.status as 'success' | 'warning' | 'error',
          lastTest: formatTimeAgo(new Date(lastTest.tested_at)),
          errorMessage: lastTest.error_message
        };
      }
      return model;
    }));
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} ч назад`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} дн назад`;
  };

  const testApiConnection = async (connectionId: string) => {
    const connection = connections.find(c => c.id === connectionId);
    if (!connection) return;

    setConnections(prev => prev.map(c => 
      c.id === connectionId ? { ...c, status: 'not_configured' } : c
    ));

    try {
      // Test via edge function
      const { data, error } = await supabase.functions.invoke('test-api-connection', {
        body: { provider: connectionId }
      });

      if (error) throw error;

      setConnections(prev => prev.map(c => 
        c.id === connectionId ? { 
          ...c, 
          status: data.success ? 'connected' : 'error',
          balance: data.balance
        } : c
      ));

      toast({
        title: data.success ? 'API подключено' : 'Ошибка подключения',
        description: data.message || (data.success ? 'Соединение успешно установлено' : 'Проверьте API ключ'),
        variant: data.success ? 'default' : 'destructive'
      });
    } catch (error: any) {
      setConnections(prev => prev.map(c => 
        c.id === connectionId ? { ...c, status: 'error' } : c
      ));
      
      toast({
        title: 'Ошибка тестирования',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const testModel = async (model: ModelStatus) => {
    setTestingModel(model.id);
    setCurrentTestModel(model.name);
    setTestDialogOpen(true);
    setTestProgress(0);

    const progressInterval = setInterval(() => {
      setTestProgress(prev => Math.min(prev + 10, 90));
    }, 500);

    try {
      let testPrompt = '';
      switch (model.type) {
        case 'photo':
          testPrompt = 'test image, simple red circle on white background';
          break;
        case 'video':
          testPrompt = 'simple animation test, 2 seconds';
          break;
        case 'music':
          testPrompt = 'simple melody, 10 seconds, instrumental';
          break;
        case 'text':
          testPrompt = 'Say "API test successful"';
          break;
      }

      const startTime = Date.now();
      
      // Call the appropriate edge function based on model type
      let functionName = '';
      switch (model.type) {
        case 'photo':
          functionName = 'generate-image';
          break;
        case 'video':
          functionName = 'generate-video';
          break;
        default:
          functionName = 'text-chat';
      }

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { 
          prompt: testPrompt,
          model: model.id,
          isTest: true
        }
      });

      const responseTime = Date.now() - startTime;
      clearInterval(progressInterval);
      setTestProgress(100);

      // Save test result
      await supabase.from('api_tests').insert({
        model_name: model.name,
        model_type: model.type,
        api_provider: model.api,
        status: error ? 'error' : 'success',
        response_time_ms: responseTime,
        error_message: error?.message || null
      });

      // Update local state
      setModels(prev => prev.map(m => 
        m.id === model.id ? {
          ...m,
          status: error ? 'error' : 'success',
          lastTest: 'только что',
          errorMessage: error?.message
        } : m
      ));

      toast({
        title: error ? 'Тест не пройден' : 'Тест успешен',
        description: error ? error.message : `Модель ${model.name} работает корректно (${responseTime}ms)`,
        variant: error ? 'destructive' : 'default'
      });

    } catch (error: any) {
      clearInterval(progressInterval);
      setTestProgress(100);
      
      await supabase.from('api_tests').insert({
        model_name: model.name,
        model_type: model.type,
        api_provider: model.api,
        status: 'error',
        error_message: error.message
      });

      setModels(prev => prev.map(m => 
        m.id === model.id ? {
          ...m,
          status: 'error',
          lastTest: 'только что',
          errorMessage: error.message
        } : m
      ));

      toast({
        title: 'Ошибка теста',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setTimeout(() => {
        setTestDialogOpen(false);
        setTestingModel(null);
        setTestProgress(0);
      }, 1000);
    }
  };

  const testAllModels = async () => {
    setTestingAll(true);
    
    for (const model of models) {
      await testModel(model);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
    }
    
    setTestingAll(false);
    loadApiTests();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-amber-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
      case 'success':
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Подключено</Badge>;
      case 'warning':
        return <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30">Предупреждение</Badge>;
      case 'error':
        return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">Ошибка</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground">Не настроен</Badge>;
    }
  };

  const getRowClass = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-500/5 hover:bg-green-500/10';
      case 'warning':
        return 'bg-amber-500/5 hover:bg-amber-500/10';
      case 'error':
        return 'bg-red-500/5 hover:bg-red-500/10';
      default:
        return '';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'photo': return 'Фото';
      case 'video': return 'Видео';
      case 'music': return 'Музыка';
      case 'text': return 'Текст';
      default: return type;
    }
  };

  const exportReport = () => {
    const csvContent = [
      ['Модель', 'Тип', 'API', 'Стоимость', 'Статус', 'Последний тест', 'Ошибка'].join(','),
      ...models.map(m => [
        m.name,
        getTypeLabel(m.type),
        m.api,
        m.cost,
        m.status,
        m.lastTest || 'Не тестировалась',
        m.errorMessage || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `api-models-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast({
      title: 'Отчёт экспортирован',
      description: 'CSV файл загружен'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">API и Модели</h1>
          <p className="text-muted-foreground">
            Мониторинг подключений и статус моделей генерации
          </p>
        </div>
      </div>

      {/* API Connections */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Plug className="h-5 w-5" />
          Статус API подключений
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {connections.map(connection => (
            <Card key={connection.id} className={cn(
              "transition-all",
              connection.status === 'connected' && "border-green-500/30 bg-green-500/5",
              connection.status === 'error' && "border-red-500/30 bg-red-500/5"
            )}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{connection.name}</CardTitle>
                  {getStatusIcon(connection.status)}
                </div>
                <CardDescription className="text-xs">
                  {connection.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {getStatusBadge(connection.status)}
                {connection.balance && (
                  <p className="text-sm text-muted-foreground">
                    Баланс: {connection.balance}
                  </p>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => testApiConnection(connection.id)}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {connection.status === 'not_configured' ? 'Настроить' : 'Проверить'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Models Status Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Статус моделей генерации
            </h2>
            <p className="text-sm text-muted-foreground">
              Зелёные модели готовы к работе, красные требуют настройки
            </p>
          </div>
          <Button 
            onClick={testAllModels}
            disabled={testingAll}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", testingAll && "animate-spin")} />
            {testingAll ? 'Тестирование...' : 'Проверить все модели'}
          </Button>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Статус</TableHead>
                <TableHead>Модель</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>API</TableHead>
                <TableHead>Стоимость</TableHead>
                <TableHead>Последний тест</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {models.map(model => (
                <TableRow key={model.id} className={getRowClass(model.status)}>
                  <TableCell>
                    {getStatusIcon(model.status)}
                  </TableCell>
                  <TableCell className="font-medium">{model.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{getTypeLabel(model.type)}</Badge>
                  </TableCell>
                  <TableCell>{model.api}</TableCell>
                  <TableCell>
                    <Badge variant={model.cost === 'FREE' || model.cost.includes('FREE') ? 'default' : 'secondary'} 
                           className={model.cost === 'FREE' || model.cost.includes('FREE') ? 'bg-green-500/20 text-green-500' : ''}>
                      {model.cost}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {model.status === 'error' && model.errorMessage ? (
                      <span className="text-red-400">{model.errorMessage}</span>
                    ) : model.lastTest ? (
                      <span className="text-muted-foreground">
                        {model.status === 'success' && 'Успешно, '}{model.lastTest}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Не тестировалась</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => testModel(model)}
                      disabled={testingModel === model.id}
                    >
                      <Play className={cn("h-4 w-4 mr-1", testingModel === model.id && "animate-pulse")} />
                      Тест
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* API Balances */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Баланс API аккаунтов</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">KIE.AI</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-2xl font-bold">—</p>
              <p className="text-sm text-muted-foreground">
                Нажмите "Проверить" для получения баланса
              </p>
              <Button variant="outline" size="sm" asChild>
                <a href="https://kie.ai/dashboard" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Открыть панель KIE.AI
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 pt-4 border-t">
        <Button variant="outline" onClick={() => {
          connections.forEach(c => testApiConnection(c.id));
        }}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Проверить все API
        </Button>
        <Button variant="outline" onClick={exportReport}>
          <Download className="h-4 w-4 mr-2" />
          Экспорт отчёта
        </Button>
        <Button variant="outline" disabled>
          <Bell className="h-4 w-4 mr-2" />
          Настроить уведомления
        </Button>
      </div>

      {/* Test Progress Dialog */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Тестирование модели</DialogTitle>
            <DialogDescription>
              {currentTestModel}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Progress value={testProgress} className="h-2" />
            <p className="text-sm text-center text-muted-foreground">
              {testProgress < 100 ? 'Отправка тестового запроса...' : 'Завершено!'}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
