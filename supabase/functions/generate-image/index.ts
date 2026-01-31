import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface GenerateImageRequest {
  prompt: string;
  model: string;
  aspectRatio?: string;
  style?: string;
  referenceImage?: string;
  changeStrength?: number;
  mode?: 'text-to-image' | 'image-to-image' | 'editing';
  isTest?: boolean;
}

// Маппинг UI моделей на правильные KIE.AI модели (согласно https://docs.kie.ai и https://kie.ai/market)
// Используем единый createTask endpoint: https://api.kie.ai/api/v1/jobs/createTask

interface ModelConfig {
  model: string;
  buildInput: (prompt: string, aspectRatio: string, referenceImage?: string) => Record<string, unknown>;
}

// Функция для получения правильного KIE.AI имени модели с fallback
function getKieAiModel(uiModel: string): string {
  const mapping: Record<string, string> = {
    // Проверенные модели из документации KIE.AI
    'nano-banana': 'nano-banana',
    'nano-banana-pro': 'nano-banana-pro',
    'flux-kontext': 'flux-kontext-pro',
    'flux-2': 'flux-2',
    'seedream-4.0': 'seedream',
    'seedream-4.5': 'seedream',
    '4o-image': 'gpt-image-1',
    'gpt-image-1.5': 'gpt-image-1.5',
    'midjourney-v7': 'midjourney',
    'ideogram-v3': 'ideogram',
    'qwen': 'qwen-vl',
    'qwen-image': 'qwen-vl',
    'recraft': 'recraft-v3',
    'grok-imagine': 'grok-imagine',
    // Fallback для моделей, которые могут не поддерживаться
    'kandinsky-3.1': 'nano-banana',
    'playground': 'nano-banana',
    'playground-ai': 'nano-banana',
  };
  
  return mapping[uiModel] || 'nano-banana';
}

const MODEL_CONFIGS: Record<string, ModelConfig> = {
  // Nano Banana (Google DeepMind)
  'nano-banana': {
    model: 'nano-banana',
    buildInput: (prompt, aspectRatio, referenceImage) => ({
      prompt,
      aspect_ratio: aspectRatio,
      ...(referenceImage && { image_url: referenceImage }),
    }),
  },
  
  'nano-banana-pro': {
    model: 'nano-banana-pro',
    buildInput: (prompt, aspectRatio, referenceImage) => ({
      prompt,
      aspect_ratio: aspectRatio,
      ...(referenceImage && { image_url: referenceImage }),
    }),
  },
  
  // Flux (Black Forest Labs)
  'flux-kontext': {
    model: 'flux-kontext-pro',
    buildInput: (prompt, aspectRatio, referenceImage) => ({
      prompt,
      aspect_ratio: aspectRatio,
      output_format: 'jpeg',
      enable_translation: true,
      ...(referenceImage && { input_image: referenceImage }),
    }),
  },
  
  'flux-2': {
    model: 'flux-2',
    buildInput: (prompt, aspectRatio) => ({
      prompt,
      aspect_ratio: aspectRatio,
      output_format: 'jpeg',
    }),
  },
  
  // Seedream (ByteDance)
  'seedream-4.0': {
    model: 'seedream',
    buildInput: (prompt, aspectRatio, referenceImage) => ({
      prompt,
      aspect_ratio: aspectRatio,
      ...(referenceImage && { image_url: referenceImage }),
    }),
  },
  
  'seedream-4.5': {
    model: 'seedream',
    buildInput: (prompt, aspectRatio, referenceImage) => ({
      prompt,
      aspect_ratio: aspectRatio,
      quality: 'high',
      ...(referenceImage && { image_url: referenceImage }),
    }),
  },
  
  // OpenAI GPT Image
  '4o-image': {
    model: 'gpt-image-1',
    buildInput: (prompt, aspectRatio) => ({
      prompt,
      size: mapAspectRatioToOpenAISize(aspectRatio),
      quality: 'high',
    }),
  },
  
  'gpt-image-1.5': {
    model: 'gpt-image-1.5',
    buildInput: (prompt, aspectRatio) => ({
      prompt,
      size: mapAspectRatioToOpenAISize(aspectRatio),
      quality: 'high',
    }),
  },
  
  // Midjourney
  'midjourney-v7': {
    model: 'midjourney',
    buildInput: (prompt, aspectRatio) => ({
      prompt: `${prompt} --ar ${aspectRatio} --v 7`,
    }),
  },
  
  // Ideogram
  'ideogram-v3': {
    model: 'ideogram',
    buildInput: (prompt, aspectRatio) => ({
      prompt,
      aspect_ratio: aspectRatio,
      style_type: 'auto',
    }),
  },
  
  // Qwen
  'qwen': {
    model: 'qwen-vl',
    buildInput: (prompt, aspectRatio) => ({
      prompt,
      aspect_ratio: aspectRatio,
    }),
  },
  
  // Recraft
  'recraft': {
    model: 'recraft-v3',
    buildInput: (prompt, aspectRatio) => ({
      prompt,
      aspect_ratio: aspectRatio,
      style: 'realistic_image',
    }),
  },
  
  // Grok Imagine (xAI)
  'grok-imagine': {
    model: 'grok-imagine',
    buildInput: (prompt, aspectRatio) => ({
      prompt,
      aspect_ratio: aspectRatio,
    }),
  },
  
  // Fallback модели - используют nano-banana
  'kandinsky-3.1': {
    model: 'nano-banana',
    buildInput: (prompt, aspectRatio) => ({
      prompt,
      aspect_ratio: aspectRatio,
    }),
  },
  
  'playground': {
    model: 'nano-banana',
    buildInput: (prompt, aspectRatio) => ({
      prompt,
      aspect_ratio: aspectRatio,
    }),
  },
};

// Маппинг aspectRatio на размеры изображений
function mapAspectRatioToSize(aspectRatio: string): string {
  const sizeMap: Record<string, string> = {
    '1:1': 'square_hd',
    '16:9': 'landscape_16_9',
    '9:16': 'portrait_16_9',
    '4:3': 'landscape_4_3',
    '3:4': 'portrait_4_3',
    '3:2': 'landscape_4_3',
    '2:3': 'portrait_4_3',
    '5:4': 'square_hd',
    '4:5': 'square_hd',
    '21:9': 'landscape_16_9',
  };
  return sizeMap[aspectRatio] || 'square_hd';
}

function mapAspectRatioToOpenAISize(aspectRatio: string): string {
  const sizeMap: Record<string, string> = {
    '1:1': '1024x1024',
    '16:9': '1792x1024',
    '9:16': '1024x1792',
    '4:3': '1792x1024',
    '3:4': '1024x1792',
    '3:2': '1792x1024',
    '2:3': '1024x1792',
    '5:4': '1024x1024',
    '4:5': '1024x1024',
    '21:9': '1792x1024',
  };
  return sizeMap[aspectRatio] || '1024x1024';
}

// Нормализация названия модели из UI в ключ конфига
function normalizeModelName(model: string): string {
  const normalized = model.toLowerCase()
    .replace(/\s+/g, '-')
    .replace('kandinsky 3.1', 'kandinsky-3.1')
    .replace('nano banana pro', 'nano-banana-pro')
    .replace('nano banana', 'nano-banana')
    .replace('qwen image', 'qwen')
    .replace('seedream 4.0', 'seedream-4.0')
    .replace('seedream 4.5', 'seedream-4.5')
    .replace('flux kontext', 'flux-kontext')
    .replace('flux 2', 'flux-2')
    .replace('ideogram v3', 'ideogram-v3')
    .replace('4o image', '4o-image')
    .replace('midjourney v7', 'midjourney-v7')
    .replace('grok imagine', 'grok-imagine')
    .replace('playground ai', 'playground');
  
  return normalized;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { prompt, model, aspectRatio, style, referenceImage, mode, isTest } = await req.json() as GenerateImageRequest;

    const KIEAI_API_KEY = Deno.env.get("KIEAI_API_KEY");
    
    if (!KIEAI_API_KEY) {
      console.error("KIEAI_API_KEY is not configured");
      return new Response(
        JSON.stringify({ success: false, error: "API ключ KIE.AI не настроен. Обратитесь к администратору." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Нормализуем название модели
    const normalizedModel = normalizeModelName(model);
    const modelConfig = MODEL_CONFIGS[normalizedModel];
    
    console.log('=== GENERATE IMAGE REQUEST ===');
    console.log('UI Model:', model);
    console.log('Normalized Model:', normalizedModel);
    console.log('Prompt:', prompt.substring(0, 100) + '...');
    console.log('Aspect Ratio:', aspectRatio);
    
    // Используем getKieAiModel для получения правильного имени модели с fallback
    const kieModel = getKieAiModel(normalizedModel);
    
    if (!modelConfig) {
      console.log(`Model ${normalizedModel} not found in configs, using nano-banana as fallback`);
    }
    
    // Используем конфиг модели или fallback на nano-banana
    const config = modelConfig || MODEL_CONFIGS['nano-banana'];
    
    console.log(`UI Model: ${model} → Normalized: ${normalizedModel} → KIE.AI Model: ${kieModel}`);
    console.log('Using config model:', config.model);

    // Собираем полный prompt со стилем
    const fullPrompt = style && style !== 'photorealism' 
      ? `${prompt}, ${style} style` 
      : prompt;

    // Подготавливаем body запроса согласно документации KIE.AI
    const normalizedRatio = aspectRatio || '1:1';
    const requestBody = {
      model: config.model,
      input: config.buildInput(fullPrompt, normalizedRatio, referenceImage),
    };

    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    // Используем единый endpoint /api/v1/jobs/createTask
    const endpoint = "https://api.kie.ai/api/v1/jobs/createTask";
    
    console.log('Calling endpoint:', endpoint);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${KIEAI_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    
    console.log('API Response:', JSON.stringify(data).substring(0, 500));

    if (!response.ok) {
      console.error("KIE.AI API error:", response.status, data);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: data.msg || data.message || data.error || `Ошибка API: ${response.status}` 
        }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Проверяем успешность ответа
    if (data.code && data.code !== 200) {
      console.error("KIE.AI API returned error code:", data.code, data.msg);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: data.msg || `Ошибка API: ${data.code}` 
        }),
        { status: data.code, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Получаем taskId для polling
    const taskId = data.data?.taskId || data.taskId || data.task_id;
    
    if (!taskId) {
      // Проверяем, может результат уже есть
      const immediateResult = extractImageUrl(data);
      if (immediateResult) {
        console.log('Immediate result:', immediateResult.substring(0, 100));
        return new Response(
          JSON.stringify({ success: true, image_url: immediateResult }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      console.error("No taskId in response:", data);
      return new Response(
        JSON.stringify({ success: false, error: "Не удалось создать задачу генерации" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Got taskId: ${taskId}, starting polling...`);
    
    // Polling для получения результата
    let result = null;
    let attempts = 0;
    const maxAttempts = isTest ? 30 : 90;
    
    // Единый endpoint для проверки статуса
    const statusEndpoint = `https://api.kie.ai/api/v1/jobs/getTask?taskId=${taskId}`;

    while (!result && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      attempts++;

      try {
        const statusResponse = await fetch(statusEndpoint, {
          headers: {
            Authorization: `Bearer ${KIEAI_API_KEY}`,
          },
        });

        const statusData = await statusResponse.json();
        
        if (attempts % 5 === 0) {
          console.log(`Poll attempt ${attempts}: ${JSON.stringify(statusData).substring(0, 300)}`);
        }

        if (statusData.code === 200 && statusData.data) {
          const taskData = statusData.data;
          const status = taskData.status || taskData.state;
          
          if (status === 'completed' || status === 'success' || status === 'COMPLETED' || status === 'SUCCESS') {
            result = extractImageUrl(taskData);
            if (result) {
              console.log(`Generation completed! URL: ${result.substring(0, 100)}`);
              break;
            }
          } else if (status === 'failed' || status === 'FAILED' || status === 'error') {
            const errorMsg = taskData.error || taskData.errorMessage || taskData.failMsg || 'Генерация не удалась';
            console.error(`Generation failed: ${errorMsg}`);
            return new Response(
              JSON.stringify({ success: false, error: errorMsg }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          // pending, processing, running - продолжаем polling
        }
      } catch (pollError) {
        console.error(`Poll error at attempt ${attempts}:`, pollError);
      }
    }

    if (!result) {
      return new Response(
        JSON.stringify({ success: false, error: "Превышено время ожидания генерации" }),
        { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, image_url: result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("generate-image error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Неизвестная ошибка",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Извлечение URL изображения из различных форматов ответа
function extractImageUrl(data: Record<string, unknown>): string | null {
  // Проверяем все возможные пути к результату
  const possiblePaths = [
    (data as any).output?.images?.[0]?.url,
    (data as any).output?.image_url,
    (data as any).output?.url,
    (data as any).images?.[0]?.url,
    (data as any).images?.[0],
    (data as any).image_url,
    (data as any).imageUrl,
    (data as any).url,
    (data as any).result?.image_url,
    (data as any).result?.url,
    (data as any).response?.resultImageUrl,
    (data as any).response?.originImageUrl,
    (data as any).resultImageUrl,
    (data as any).data?.output?.images?.[0]?.url,
    (data as any).data?.images?.[0],
    (data as any).data?.image_url,
  ];
  
  for (const path of possiblePaths) {
    if (typeof path === 'string' && path.startsWith('http')) {
      return path;
    }
  }
  
  return null;
}
