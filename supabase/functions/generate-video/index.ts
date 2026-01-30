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

// Маппинг UI моделей на реальные KIE.AI модели
interface VideoModelConfig {
  model: string;
  buildInput: (prompt: string, duration: number, aspectRatio: string, imageUrl?: string) => Record<string, unknown>;
}

const VIDEO_MODEL_CONFIGS: Record<string, VideoModelConfig> = {
  // БЕСПЛАТНЫЕ модели
  'luma-dream-machine': {
    model: 'luma/dream-machine-v1.5',
    buildInput: (prompt, duration, aspectRatio, imageUrl) => ({
      prompt,
      duration,
      aspect_ratio: aspectRatio,
      ...(imageUrl && { image_url: imageUrl }),
    }),
  },
  
  'seedance-v1-lite': {
    model: 'bytedance/seedance-lite',
    buildInput: (prompt, duration, aspectRatio, imageUrl) => ({
      prompt,
      duration,
      aspect_ratio: aspectRatio,
      ...(imageUrl && { image_url: imageUrl }),
    }),
  },
  
  // БАЗОВЫЕ модели
  'kling-2.5-turbo': {
    model: 'kling/v2.5-turbo',
    buildInput: (prompt, duration, aspectRatio, imageUrl) => ({
      prompt,
      duration,
      aspect_ratio: aspectRatio,
      mode: 'std',
      ...(imageUrl && { image_url: imageUrl }),
    }),
  },
  
  'kling-2.6': {
    model: 'kling/v2.6-pro',
    buildInput: (prompt, duration, aspectRatio, imageUrl) => ({
      prompt,
      duration,
      aspect_ratio: aspectRatio,
      mode: 'pro',
      ...(imageUrl && { image_url: imageUrl }),
    }),
  },
  
  'kling-2.6-motion-control': {
    model: 'kling/v2.6-pro',
    buildInput: (prompt, duration, aspectRatio, imageUrl) => ({
      prompt,
      duration,
      aspect_ratio: aspectRatio,
      mode: 'pro',
      enable_motion_control: true,
      ...(imageUrl && { image_url: imageUrl }),
    }),
  },
  
  'wan-move': {
    model: 'alibaba/wan-2.5',
    buildInput: (prompt, duration, aspectRatio, imageUrl) => ({
      prompt,
      duration: Math.min(duration, 10),
      aspect_ratio: aspectRatio,
      with_audio: true,
      mode: 'move',
      ...(imageUrl && { image_url: imageUrl }),
    }),
  },
  
  'wan-replace': {
    model: 'alibaba/wan-2.5',
    buildInput: (prompt, duration, aspectRatio, imageUrl) => ({
      prompt,
      duration: Math.min(duration, 10),
      aspect_ratio: aspectRatio,
      with_audio: true,
      mode: 'replace',
      ...(imageUrl && { image_url: imageUrl }),
    }),
  },
  
  // ПРЕМИУМ модели
  'seedance-1.5-pro': {
    model: 'bytedance/seedance-1.5-pro',
    buildInput: (prompt, duration, aspectRatio, imageUrl) => ({
      prompt,
      duration,
      aspect_ratio: aspectRatio,
      with_audio: true,
      quality: 'high',
      ...(imageUrl && { image_url: imageUrl }),
    }),
  },
  
  'seedance-pro-fast': {
    model: 'bytedance/seedance-pro',
    buildInput: (prompt, duration, aspectRatio, imageUrl) => ({
      prompt,
      duration,
      aspect_ratio: aspectRatio,
      speed: 'fast',
      ...(imageUrl && { image_url: imageUrl }),
    }),
  },
  
  'veo-3-fast': {
    model: 'google/veo-3',
    buildInput: (prompt, duration, aspectRatio, imageUrl) => ({
      prompt,
      duration: Math.min(duration, 8),
      aspect_ratio: aspectRatio,
      mode: 'fast',
      with_audio: true,
      ...(imageUrl && { image_url: imageUrl }),
    }),
  },
  
  'veo-3.1-quality': {
    model: 'google/veo-3.1',
    buildInput: (prompt, duration, aspectRatio, imageUrl) => ({
      prompt,
      duration: Math.min(duration, 8),
      aspect_ratio: aspectRatio,
      mode: 'quality',
      with_audio: true,
      resolution: '1080p',
      ...(imageUrl && { image_url: imageUrl }),
    }),
  },
  
  'sora-2': {
    model: 'openai/sora-2',
    buildInput: (prompt, duration, aspectRatio, imageUrl) => ({
      prompt,
      duration,
      aspect_ratio: aspectRatio,
      ...(imageUrl && { image_url: imageUrl }),
    }),
  },
  
  'sora-2-pro': {
    model: 'openai/sora-2-pro',
    buildInput: (prompt, duration, aspectRatio, imageUrl) => ({
      prompt,
      duration: Math.min(duration, 35),
      aspect_ratio: aspectRatio,
      quality: 'high',
      ...(imageUrl && { image_url: imageUrl }),
    }),
  },
  
  'sora-2-pro-story': {
    model: 'openai/sora-2-pro',
    buildInput: (prompt, duration, aspectRatio, imageUrl) => ({
      prompt,
      duration: Math.min(duration, 60),
      aspect_ratio: aspectRatio,
      mode: 'story',
      ...(imageUrl && { image_url: imageUrl }),
    }),
  },
  
  'runway-aleph': {
    model: 'runway/aleph',
    buildInput: (prompt, duration, aspectRatio, imageUrl) => ({
      prompt,
      duration,
      aspect_ratio: aspectRatio,
      ...(imageUrl && { image_url: imageUrl }),
    }),
  },
  
  'watermark-remover': {
    model: 'topaz/watermark-remover',
    buildInput: (prompt, duration, aspectRatio, imageUrl) => ({
      video_url: imageUrl, // В этом случае imageUrl - это URL видео
    }),
  },
};

// Нормализация названия модели
function normalizeVideoModelName(model: string): string {
  const normalized = model.toLowerCase()
    .replace(/\s+/g, '-')
    .replace('luma dream machine', 'luma-dream-machine')
    .replace('seedance v1 lite', 'seedance-v1-lite')
    .replace('kling 2.5 turbo', 'kling-2.5-turbo')
    .replace('kling 2.6', 'kling-2.6')
    .replace('kling 2.6 motion control', 'kling-2.6-motion-control')
    .replace('wan move', 'wan-move')
    .replace('wan replace', 'wan-replace')
    .replace('seedance 1.5 pro', 'seedance-1.5-pro')
    .replace('seedance pro fast', 'seedance-pro-fast')
    .replace('veo 3 fast', 'veo-3-fast')
    .replace('veo 3.1 quality', 'veo-3.1-quality')
    .replace('sora 2 pro story', 'sora-2-pro-story')
    .replace('sora 2 pro', 'sora-2-pro')
    .replace('sora 2', 'sora-2')
    .replace('runway aleph', 'runway-aleph')
    .replace('watermark remover', 'watermark-remover');
  
  return normalized;
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
    const modelConfig = VIDEO_MODEL_CONFIGS[normalizedModel];

    console.log('=== GENERATE VIDEO REQUEST ===');
    console.log('UI Model:', model);
    console.log('Normalized Model:', normalizedModel);
    console.log('Prompt:', prompt.substring(0, 100) + '...');
    console.log('Aspect Ratio:', aspectRatio);
    console.log('Duration:', duration);

    if (!modelConfig) {
      console.log(`Model ${normalizedModel} not found, using runway-aleph as fallback`);
    }
    
    const config = modelConfig || VIDEO_MODEL_CONFIGS['runway-aleph'];
    
    console.log('Using KIE.AI model:', config.model);

    // Парсим длительность
    const videoDuration = duration ? parseInt(duration) : 5;
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
    const requestBody = {
      model: config.model,
      input: config.buildInput(prompt, videoDuration, normalizedRatio, imageUrl),
    };

    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    // Используем единый endpoint
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
      console.error("No taskId in response:", data);
      return new Response(
        JSON.stringify({ success: false, error: "Не удалось создать задачу генерации" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Got taskId: ${taskId}, starting polling...`);
    
    let result = null;
    let attempts = 0;
    const maxAttempts = isTest ? 60 : 180; // Video takes longer

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
        
        if (attempts % 10 === 0) {
          console.log(`Poll attempt ${attempts}: ${JSON.stringify(statusData).substring(0, 300)}`);
        }

        if (statusData.code === 200 && statusData.data) {
          const taskData = statusData.data;
          const status = taskData.status || taskData.state;
          
          if (status === 'completed' || status === 'success' || status === 'COMPLETED' || status === 'SUCCESS') {
            result = extractVideoUrl(taskData);
            if (result) {
              console.log(`Video generation completed! URL: ${result.substring(0, 100)}`);
              break;
            }
          } else if (status === 'failed' || status === 'FAILED' || status === 'error') {
            const errorMsg = taskData.error || taskData.errorMessage || taskData.failMsg || 'Генерация видео не удалась';
            console.error(`Video generation failed: ${errorMsg}`);
            return new Response(
              JSON.stringify({ success: false, error: errorMsg }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      } catch (pollError) {
        console.error(`Poll error at attempt ${attempts}:`, pollError);
      }
    }

    if (!result) {
      return new Response(
        JSON.stringify({ success: false, error: "Превышено время ожидания генерации видео" }),
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

// Извлечение URL видео из ответа
function extractVideoUrl(data: Record<string, unknown>): string | null {
  const possiblePaths = [
    (data as any).output?.video_url,
    (data as any).output?.videoUrl,
    (data as any).output?.url,
    (data as any).video_url,
    (data as any).videoUrl,
    (data as any).url,
    (data as any).result?.video_url,
    (data as any).result?.url,
    (data as any).videoInfo?.videoUrl,
    (data as any).data?.video_url,
    (data as any).data?.output?.video_url,
  ];
  
  for (const path of possiblePaths) {
    if (typeof path === 'string' && path.startsWith('http')) {
      return path;
    }
  }
  
  return null;
}
