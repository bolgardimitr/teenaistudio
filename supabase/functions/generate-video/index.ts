import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface GenerateVideoRequest {
  prompt: string;
  model: string;
  aspectRatio?: string;
  duration?: string;
  referenceImage?: string;
  removeWatermark?: boolean;
  isTest?: boolean;
}

// Конфигурация моделей KIE.AI для генерации видео
interface VideoModelConfig {
  kieModel: string;
  createEndpoint: string;
  pollEndpoint: string;
  maxDuration?: number;
  supportsAudio?: boolean;
}

const VIDEO_MODELS: Record<string, VideoModelConfig> = {
  // БЕСПЛАТНЫЕ
  'luma-dream': {
    kieModel: 'luma',
    createEndpoint: '/api/v1/luma/generate',
    pollEndpoint: '/api/v1/luma/record-info',
    maxDuration: 10,
  },
  'luma-dream-machine': {
    kieModel: 'luma',
    createEndpoint: '/api/v1/luma/generate',
    pollEndpoint: '/api/v1/luma/record-info',
    maxDuration: 10,
  },
  'seedance-lite': {
    kieModel: 'seedance-lite',
    createEndpoint: '/api/v1/seedance/generate',
    pollEndpoint: '/api/v1/seedance/record-info',
    maxDuration: 10,
  },
  'seedance-v1-lite': {
    kieModel: 'seedance-lite',
    createEndpoint: '/api/v1/seedance/generate',
    pollEndpoint: '/api/v1/seedance/record-info',
    maxDuration: 10,
  },
  
  // БАЗОВЫЕ
  'sora-2': {
    kieModel: 'sora-2',
    createEndpoint: '/api/v1/sora2/generate',
    pollEndpoint: '/api/v1/sora2/record-info',
    maxDuration: 20,
  },
  'veo3-fast': {
    kieModel: 'veo3-fast',
    createEndpoint: '/api/v1/veo3/generate',
    pollEndpoint: '/api/v1/veo3/record-info',
    maxDuration: 8,
    supportsAudio: true,
  },
  'veo-3-fast': {
    kieModel: 'veo3-fast',
    createEndpoint: '/api/v1/veo3/generate',
    pollEndpoint: '/api/v1/veo3/record-info',
    maxDuration: 8,
    supportsAudio: true,
  },
  'kling-turbo': {
    kieModel: 'kling-2.5-turbo',
    createEndpoint: '/api/v1/kling/generate',
    pollEndpoint: '/api/v1/kling/record-info',
    maxDuration: 10,
  },
  'kling-2.5-turbo': {
    kieModel: 'kling-2.5-turbo',
    createEndpoint: '/api/v1/kling/generate',
    pollEndpoint: '/api/v1/kling/record-info',
    maxDuration: 10,
  },
  'kling-2-6': {
    kieModel: 'kling-2.6',
    createEndpoint: '/api/v1/kling/generate',
    pollEndpoint: '/api/v1/kling/record-info',
    maxDuration: 10,
  },
  'kling-2.6': {
    kieModel: 'kling-2.6',
    createEndpoint: '/api/v1/kling/generate',
    pollEndpoint: '/api/v1/kling/record-info',
    maxDuration: 10,
  },
  'wan-animate-move': {
    kieModel: 'wan-2.5',
    createEndpoint: '/api/v1/wan/generate',
    pollEndpoint: '/api/v1/wan/record-info',
    maxDuration: 10,
    supportsAudio: true,
  },
  'wan-2.5': {
    kieModel: 'wan-2.5',
    createEndpoint: '/api/v1/wan/generate',
    pollEndpoint: '/api/v1/wan/record-info',
    maxDuration: 10,
    supportsAudio: true,
  },
  'wan-animate-replace': {
    kieModel: 'wan-2.5',
    createEndpoint: '/api/v1/wan/generate',
    pollEndpoint: '/api/v1/wan/record-info',
    maxDuration: 10,
    supportsAudio: true,
  },
  'hailuo-02': {
    kieModel: 'hailuo-02',
    createEndpoint: '/api/v1/hailuo/generate',
    pollEndpoint: '/api/v1/hailuo/record-info',
    maxDuration: 10,
  },
  
  // ПРЕМИУМ
  'sora-2-pro': {
    kieModel: 'sora-2-pro',
    createEndpoint: '/api/v1/sora2/generate',
    pollEndpoint: '/api/v1/sora2/record-info',
    maxDuration: 35,
  },
  'sora-2-pro-story': {
    kieModel: 'sora-2-pro',
    createEndpoint: '/api/v1/sora2/generate',
    pollEndpoint: '/api/v1/sora2/record-info',
    maxDuration: 60,
  },
  'veo3-quality': {
    kieModel: 'veo3-quality',
    createEndpoint: '/api/v1/veo3/generate',
    pollEndpoint: '/api/v1/veo3/record-info',
    maxDuration: 8,
    supportsAudio: true,
  },
  'veo-3.1-quality': {
    kieModel: 'veo3-quality',
    createEndpoint: '/api/v1/veo3/generate',
    pollEndpoint: '/api/v1/veo3/record-info',
    maxDuration: 8,
    supportsAudio: true,
  },
  'seedance-pro': {
    kieModel: 'seedance-pro',
    createEndpoint: '/api/v1/seedance/generate',
    pollEndpoint: '/api/v1/seedance/record-info',
    maxDuration: 10,
    supportsAudio: true,
  },
  'seedance-1.5-pro': {
    kieModel: 'seedance-pro',
    createEndpoint: '/api/v1/seedance/generate',
    pollEndpoint: '/api/v1/seedance/record-info',
    maxDuration: 10,
    supportsAudio: true,
  },
  'seedance-pro-fast': {
    kieModel: 'seedance-pro',
    createEndpoint: '/api/v1/seedance/generate',
    pollEndpoint: '/api/v1/seedance/record-info',
    maxDuration: 10,
  },
  'kling-motion-control': {
    kieModel: 'kling-2.6',
    createEndpoint: '/api/v1/kling/generate',
    pollEndpoint: '/api/v1/kling/record-info',
    maxDuration: 10,
  },
  'runway-aleph': {
    kieModel: 'runway-aleph',
    createEndpoint: '/api/v1/runway/generate',
    pollEndpoint: '/api/v1/runway/record-info',
    maxDuration: 10,
  },
};

// Нормализация названия модели
function normalizeVideoModelName(model: string): string {
  const mapping: Record<string, string> = {
    // Luma
    'Luma Dream Machine': 'luma-dream-machine',
    'luma dream machine': 'luma-dream-machine',
    'luma-dream': 'luma-dream-machine',
    
    // Seedance
    'Seedance V1 Lite': 'seedance-v1-lite',
    'seedance v1 lite': 'seedance-v1-lite',
    'seedance-lite': 'seedance-v1-lite',
    'Seedance 1.5 Pro': 'seedance-1.5-pro',
    'seedance 1.5 pro': 'seedance-1.5-pro',
    'Seedance Pro Fast': 'seedance-pro-fast',
    
    // Sora
    'Sora 2': 'sora-2',
    'sora 2': 'sora-2',
    'Sora 2 Pro': 'sora-2-pro',
    'sora 2 pro': 'sora-2-pro',
    'Sora 2 Pro Story': 'sora-2-pro-story',
    
    // Veo
    'Veo 3 Fast': 'veo-3-fast',
    'veo 3 fast': 'veo-3-fast',
    'veo3-fast': 'veo-3-fast',
    'Veo 3.1 Quality': 'veo-3.1-quality',
    'veo 3.1 quality': 'veo-3.1-quality',
    'veo3-quality': 'veo-3.1-quality',
    
    // Kling
    'Kling 2.5 Turbo': 'kling-2.5-turbo',
    'kling 2.5 turbo': 'kling-2.5-turbo',
    'kling-turbo': 'kling-2.5-turbo',
    'Kling 2.6': 'kling-2.6',
    'kling 2.6': 'kling-2.6',
    'kling-2-6': 'kling-2.6',
    'Kling 2.6 Motion Control': 'kling-motion-control',
    
    // Wan
    'Wan Animate Move': 'wan-animate-move',
    'wan animate move': 'wan-animate-move',
    'Wan Animate Replace': 'wan-animate-replace',
    'wan-2.5': 'wan-2.5',
    
    // Hailuo
    'Hailuo 02': 'hailuo-02',
    'hailuo 02': 'hailuo-02',
    
    // Runway
    'Runway Aleph': 'runway-aleph',
    'runway aleph': 'runway-aleph',
  };
  
  const normalized = mapping[model] || mapping[model.toLowerCase()];
  if (normalized) return normalized;
  
  return model.toLowerCase().replace(/\s+/g, '-');
}

// Upload base64 image to Supabase storage
async function uploadBase64ToStorage(base64Data: string): Promise<string | null> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Supabase credentials not configured");
      return null;
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      console.error("Invalid base64 format");
      return null;
    }
    
    const mimeType = matches[1];
    const base64Content = matches[2];
    const extension = mimeType.split("/")[1] || "jpg";
    
    const binaryString = atob(base64Content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const fileName = `${crypto.randomUUID()}.${extension}`;
    
    const { error } = await supabase.storage
      .from("video-references")
      .upload(fileName, bytes, {
        contentType: mimeType,
        upsert: false,
      });
    
    if (error) {
      console.error("Storage upload error:", error);
      return null;
    }
    
    const { data: publicUrlData } = supabase.storage
      .from("video-references")
      .getPublicUrl(fileName);
    
    console.log(`Uploaded image to storage: ${publicUrlData.publicUrl}`);
    return publicUrlData.publicUrl;
  } catch (err) {
    console.error("Error uploading to storage:", err);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { prompt, model, aspectRatio, duration, referenceImage, removeWatermark, isTest } = await req.json() as GenerateVideoRequest;

    const KIEAI_API_KEY = Deno.env.get("KIEAI_API_KEY");
    
    if (!KIEAI_API_KEY) {
      console.error("KIEAI_API_KEY is not configured");
      return new Response(
        JSON.stringify({ success: false, error: "API ключ KIE.AI не настроен. Обратитесь к администратору." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Нормализуем название модели
    const normalizedModel = normalizeVideoModelName(model);
    const modelConfig = VIDEO_MODELS[normalizedModel];
    
    // Fallback на luma-dream-machine если модель не найдена
    const config = modelConfig || VIDEO_MODELS['luma-dream-machine'];
    const actualModel = modelConfig ? normalizedModel : 'luma-dream-machine';

    console.log('=== GENERATE VIDEO REQUEST ===');
    console.log('UI Model:', model);
    console.log('Normalized Model:', normalizedModel);
    console.log('Using:', actualModel);
    console.log('Prompt:', prompt.substring(0, 100) + '...');
    console.log('Aspect Ratio:', aspectRatio);
    console.log('Duration:', duration);
    console.log('Create Endpoint:', config.createEndpoint);
    console.log('Poll Endpoint:', config.pollEndpoint);

    // Парсим длительность
    const requestedDuration = duration ? parseInt(duration) : 5;
    const videoDuration = config.maxDuration 
      ? Math.min(requestedDuration, config.maxDuration)
      : requestedDuration;
    const normalizedRatio = aspectRatio || '16:9';

    // Обрабатываем референс-изображение
    let imageUrl: string | undefined;
    if (referenceImage) {
      if (referenceImage.startsWith("data:")) {
        console.log("Uploading base64 image to storage...");
        const publicUrl = await uploadBase64ToStorage(referenceImage);
        if (publicUrl) {
          imageUrl = publicUrl;
        } else {
          console.warn("Failed to upload reference image, proceeding without it");
        }
      } else {
        imageUrl = referenceImage;
      }
    }

    // Подготавливаем body запроса
    const requestBody: Record<string, unknown> = {
      prompt,
      duration: videoDuration,
      aspect_ratio: normalizedRatio,
    };
    
    // Добавляем image_url если есть
    if (imageUrl) {
      requestBody.image_url = imageUrl;
    }
    
    // Добавляем with_audio для моделей с поддержкой звука
    if (config.supportsAudio) {
      requestBody.with_audio = true;
    }

    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    const createUrl = `https://api.kie.ai${config.createEndpoint}`;
    console.log('Calling endpoint:', createUrl);

    const response = await fetch(createUrl, {
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

    const taskId = data.data?.taskId || data.taskId || data.task_id;
    
    if (!taskId) {
      // Проверяем на синхронный результат
      const immediateResult = extractVideoUrl(data);
      if (immediateResult) {
        return new Response(
          JSON.stringify({ success: true, video_url: immediateResult }),
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
    
    // Polling для получения результата (видео может занимать больше времени)
    const result = await pollForVideoResult(taskId, KIEAI_API_KEY, config.pollEndpoint, isTest);

    if (!result) {
      return new Response(
        JSON.stringify({ success: false, error: "Превышено время ожидания генерации видео. Попробуйте снова." }),
        { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, video_url: result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("generate-video error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Неизвестная ошибка",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Polling для видео (более длительное ожидание)
async function pollForVideoResult(
  taskId: string, 
  apiKey: string, 
  pollEndpoint: string,
  isTest?: boolean
): Promise<string | null> {
  const maxAttempts = isTest ? 60 : 180; // До 6 минут для видео
  
  for (let attempts = 0; attempts < maxAttempts; attempts++) {
    await new Promise((resolve) => setTimeout(resolve, 2000));

    try {
      const statusUrl = `https://api.kie.ai${pollEndpoint}?taskId=${taskId}`;
      
      const statusResponse = await fetch(statusUrl, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      const statusData = await statusResponse.json();
      
      // Логируем каждый 10-й запрос
      if ((attempts + 1) % 10 === 0) {
        console.log(`Poll attempt ${attempts + 1}/${maxAttempts}: ${JSON.stringify(statusData).substring(0, 300)}`);
      }

      if (statusData.code === 200 && statusData.data) {
        const taskData = statusData.data;
        const status = taskData.status || taskData.state;
        const isCompleted = taskData.completeTime !== null && taskData.completeTime !== undefined;
        
        if (isCompleted || status === 'completed' || status === 'success' || status === 'COMPLETED' || status === 'SUCCESS') {
          const videoUrl = extractVideoUrl(taskData);
          if (videoUrl) {
            console.log(`Video generation completed! URL: ${videoUrl.substring(0, 100)}`);
            return videoUrl;
          }
        } else if (status === 'failed' || status === 'FAILED' || status === 'error') {
          const errorMsg = taskData.error || taskData.errorMessage || taskData.failMsg || 'Генерация видео не удалась';
          console.error(`Video generation failed: ${errorMsg}`);
          throw new Error(errorMsg);
        }
      }
    } catch (pollError) {
      if (pollError instanceof Error && !pollError.message.includes('не удалась')) {
        console.error(`Poll error at attempt ${attempts + 1}:`, pollError);
      } else {
        throw pollError;
      }
    }
  }
  
  return null;
}

// Извлечение URL видео из ответа
function extractVideoUrl(data: Record<string, unknown>): string | null {
  const possiblePaths = [
    // KIE.AI форматы
    (data as any).response?.videoUrl,
    (data as any).response?.resultVideoUrl,
    (data as any).videoInfo?.videoUrl,
    (data as any).videoUrl,
    (data as any).video_url,
    // Стандартные форматы
    (data as any).output?.video_url,
    (data as any).output?.videoUrl,
    (data as any).output?.url,
    (data as any).url,
    (data as any).result?.video_url,
    (data as any).result?.url,
    // Вложенные в data
    (data as any).data?.response?.videoUrl,
    (data as any).data?.videoInfo?.videoUrl,
    (data as any).data?.video_url,
    (data as any).data?.videoUrl,
    (data as any).data?.output?.video_url,
    (data as any).data?.url,
  ];
  
  for (const path of possiblePaths) {
    if (typeof path === 'string' && path.startsWith('http')) {
      return path;
    }
  }
  
  return null;
}
