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
  isTest?: boolean;
}

// Конфигурация моделей KIE.AI для генерации изображений
interface ImageModelConfig {
  kieModel: string;
  createEndpoint: string;
  pollEndpoint: string;
}

const IMAGE_MODELS: Record<string, ImageModelConfig> = {
  // Flux Kontext (проверено работает)
  'flux-kontext': {
    kieModel: 'flux-kontext-pro',
    createEndpoint: '/api/v1/flux/kontext/generate',
    pollEndpoint: '/api/v1/flux/kontext/record-info'
  },
  
  // Nano Banana (Gemini 2.5 Flash)
  'nano-banana': {
    kieModel: 'nano-banana',
    createEndpoint: '/api/v1/nano-banana/generate',
    pollEndpoint: '/api/v1/nano-banana/record-info'
  },
  
  // Nano Banana Pro (Gemini 3 Pro)
  'nano-banana-pro': {
    kieModel: 'nano-banana-pro',
    createEndpoint: '/api/v1/nano-banana/generate',
    pollEndpoint: '/api/v1/nano-banana/record-info'
  },
  
  // Seedream 4.0 (ByteDance)
  'seedream': {
    kieModel: 'seedream',
    createEndpoint: '/api/v1/seedream/generate',
    pollEndpoint: '/api/v1/seedream/record-info'
  },
  'seedream-4.0': {
    kieModel: 'seedream',
    createEndpoint: '/api/v1/seedream/generate',
    pollEndpoint: '/api/v1/seedream/record-info'
  },
  
  // Seedream 4.5 (ByteDance)
  'seedream-4-5': {
    kieModel: 'seedream-4.5',
    createEndpoint: '/api/v1/seedream/generate',
    pollEndpoint: '/api/v1/seedream/record-info'
  },
  'seedream-4.5': {
    kieModel: 'seedream-4.5',
    createEndpoint: '/api/v1/seedream/generate',
    pollEndpoint: '/api/v1/seedream/record-info'
  },
  
  // Qwen Image (Alibaba)
  'qwen-image': {
    kieModel: 'qwen-vl',
    createEndpoint: '/api/v1/qwen/generate',
    pollEndpoint: '/api/v1/qwen/record-info'
  },
  
  // 4o Image (OpenAI GPT-4o)
  '4o-image': {
    kieModel: 'gpt-image-1',
    createEndpoint: '/api/v1/4o-image/generate',
    pollEndpoint: '/api/v1/4o-image/record-info'
  },
  
  // Midjourney V7
  'midjourney-v7': {
    kieModel: 'midjourney',
    createEndpoint: '/api/v1/midjourney/imagine',
    pollEndpoint: '/api/v1/midjourney/record-info'
  },
  
  // Ideogram V3
  'ideogram-v3': {
    kieModel: 'ideogram-v3',
    createEndpoint: '/api/v1/ideogram/generate',
    pollEndpoint: '/api/v1/ideogram/record-info'
  },
  
  // Recraft
  'recraft': {
    kieModel: 'recraft-v3',
    createEndpoint: '/api/v1/recraft/generate',
    pollEndpoint: '/api/v1/recraft/record-info'
  },
};

// Нормализация названия модели из UI
function normalizeModelId(uiModel: string): string {
  const mapping: Record<string, string> = {
    // Flux
    'Flux Kontext': 'flux-kontext',
    'flux kontext': 'flux-kontext',
    'flux-kontext': 'flux-kontext',
    
    // Nano Banana
    'Nano Banana': 'nano-banana',
    'nano banana': 'nano-banana',
    'nano-banana': 'nano-banana',
    
    // Nano Banana Pro
    'Nano Banana Pro': 'nano-banana-pro',
    'nano banana pro': 'nano-banana-pro',
    'nano-banana-pro': 'nano-banana-pro',
    
    // Seedream
    'Seedream 4.0': 'seedream',
    'seedream 4.0': 'seedream',
    'seedream': 'seedream',
    'Seedream 4.5': 'seedream-4.5',
    'seedream 4.5': 'seedream-4.5',
    'seedream-4-5': 'seedream-4.5',
    
    // Qwen
    'Qwen Image': 'qwen-image',
    'qwen image': 'qwen-image',
    'qwen-image': 'qwen-image',
    
    // 4o Image
    '4o Image': '4o-image',
    '4o image': '4o-image',
    '4o-image': '4o-image',
    
    // Midjourney
    'Midjourney V7': 'midjourney-v7',
    'midjourney v7': 'midjourney-v7',
    'midjourney-v7': 'midjourney-v7',
    
    // Ideogram
    'Ideogram V3': 'ideogram-v3',
    'ideogram v3': 'ideogram-v3',
    'ideogram-v3': 'ideogram-v3',
    
    // Recraft
    'Recraft': 'recraft',
    'recraft': 'recraft',
  };
  
  // Проверяем маппинг
  const normalized = mapping[uiModel] || mapping[uiModel.toLowerCase()];
  if (normalized) return normalized;
  
  // Fallback: преобразуем к kebab-case
  return uiModel.toLowerCase().replace(/\s+/g, '-');
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { prompt, model, aspectRatio, style, referenceImage, isTest } = await req.json() as GenerateImageRequest;

    const KIEAI_API_KEY = Deno.env.get("KIEAI_API_KEY");
    
    if (!KIEAI_API_KEY) {
      console.error("KIEAI_API_KEY is not configured");
      return new Response(
        JSON.stringify({ success: false, error: "API ключ KIE.AI не настроен. Обратитесь к администратору." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Нормализуем модель
    const modelId = normalizeModelId(model);
    const modelConfig = IMAGE_MODELS[modelId];
    
    // Если модель не найдена - используем flux-kontext
    const config = modelConfig || IMAGE_MODELS['flux-kontext'];
    const actualModelId = modelConfig ? modelId : 'flux-kontext';

    console.log('=== GENERATE IMAGE REQUEST ===');
    console.log('UI Model:', model);
    console.log('Normalized:', modelId);
    console.log('Using:', actualModelId);
    console.log('Prompt:', prompt.substring(0, 100) + '...');
    console.log('Aspect Ratio:', aspectRatio);
    console.log('Create Endpoint:', config.createEndpoint);
    console.log('Poll Endpoint:', config.pollEndpoint);

    // Собираем полный prompt со стилем
    const fullPrompt = style && style !== 'photorealism' 
      ? `${prompt}, ${style} style` 
      : prompt;

    // Формируем тело запроса
    const requestBody = {
      prompt: fullPrompt,
      aspect_ratio: aspectRatio || '1:1',
      ...(referenceImage && { image_url: referenceImage }),
    };

    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    const createUrl = `https://api.kie.ai${config.createEndpoint}`;
    console.log('Calling:', createUrl);

    const response = await fetch(createUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${KIEAI_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    
    console.log('API Response status:', response.status);
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

    // Проверяем, может результат уже есть в ответе
    const immediateResult = extractImageUrl(data);
    if (immediateResult) {
      console.log('Immediate result:', immediateResult.substring(0, 100));
      return new Response(
        JSON.stringify({ success: true, image_url: immediateResult }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Получаем taskId для polling
    const taskId = data.data?.taskId || data.taskId || data.task_id || data.id;
    
    if (!taskId) {
      console.error("No taskId in response:", data);
      return new Response(
        JSON.stringify({ success: false, error: "Не удалось создать задачу генерации" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Got taskId: ${taskId}, starting polling...`);
    
    // Polling для получения результата
    const result = await pollForResult(taskId, KIEAI_API_KEY, config.pollEndpoint, isTest);

    if (!result) {
      console.error(`Timeout waiting for result`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Генерация заняла слишком много времени. Попробуйте ещё раз или выберите другую модель." 
        }),
        { status: 408, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

// Polling для получения результата
async function pollForResult(
  taskId: string, 
  apiKey: string, 
  pollEndpoint: string,
  isTest?: boolean
): Promise<string | null> {
  const maxAttempts = isTest ? 15 : 30; // 30-60 секунд
  
  for (let attempts = 0; attempts < maxAttempts; attempts++) {
    await new Promise((resolve) => setTimeout(resolve, 2000));

    try {
      const statusUrl = `https://api.kie.ai${pollEndpoint}?taskId=${taskId}`;
      
      const statusResponse = await fetch(statusUrl, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!statusResponse.ok) {
        console.log(`Poll attempt ${attempts + 1}: HTTP ${statusResponse.status}`);
        continue;
      }

      const statusData = await statusResponse.json();
      
      // Логируем каждый 5-й запрос
      if ((attempts + 1) % 5 === 0 || attempts >= maxAttempts - 3) {
        console.log(`Poll attempt ${attempts + 1}/${maxAttempts}: ${JSON.stringify(statusData).substring(0, 500)}`);
      }

      if (statusData.code === 200 && statusData.data) {
        const taskData = statusData.data;
        
        // KIE.AI использует completeTime как признак завершения
        const isCompleted = taskData.completeTime !== null && taskData.completeTime !== undefined;
        const status = taskData.status || taskData.state;
        
        if (isCompleted || status === 'completed' || status === 'success' || status === 'COMPLETED' || status === 'SUCCESS') {
          console.log(`Task completed! Full response: ${JSON.stringify(taskData).substring(0, 1000)}`);
          
          const imageUrl = extractImageUrl(taskData);
          if (imageUrl) {
            console.log(`SUCCESS! Image URL: ${imageUrl.substring(0, 100)}`);
            return imageUrl;
          } else {
            console.error('Task completed but no image URL found');
          }
        } else if (status === 'failed' || status === 'error' || status === 'FAILED') {
          const errorMsg = taskData.error || taskData.errorMessage || taskData.failMsg || 'Генерация не удалась';
          console.error(`Generation failed: ${errorMsg}`);
          throw new Error(errorMsg);
        }
      }
    } catch (pollError) {
      if (pollError instanceof Error && pollError.message !== 'Генерация не удалась') {
        console.error(`Poll error at attempt ${attempts + 1}:`, pollError);
      } else {
        throw pollError;
      }
    }
  }
  
  return null;
}

// Извлечение URL изображения из различных форматов ответа KIE.AI
function extractImageUrl(data: Record<string, unknown>): string | null {
  const possiblePaths = [
    // KIE.AI flux-kontext format
    (data as any).response?.resultImageUrl,
    (data as any).response?.originImageUrl,
    (data as any).resultImageUrl,
    (data as any).originImageUrl,
    // Стандартные форматы
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
    // Вложенные в data
    (data as any).data?.response?.resultImageUrl,
    (data as any).data?.resultImageUrl,
    (data as any).data?.originImageUrl,
    (data as any).data?.output?.images?.[0]?.url,
    (data as any).data?.images?.[0],
    (data as any).data?.image_url,
    (data as any).data?.url,
  ];
  
  for (const path of possiblePaths) {
    if (typeof path === 'string' && path.startsWith('http')) {
      return path;
    }
  }
  
  return null;
}
