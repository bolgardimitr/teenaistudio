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

// Base URL without trailing slash
const KIE_API_BASE = "https://api.kie.ai";

// Маппинг UI модели → реальные endpoints KIE.AI
const MODEL_ENDPOINTS: Record<string, { create: string; poll: string }> = {
  "flux-kontext": {
    create: "/api/v1/flux/kontext/generate",
    poll: "/api/v1/flux/kontext/record-info",
  },

  "nano-banana": {
    create: "/api/v1/nano-banana/generate",
    poll: "/api/v1/nano-banana/record-info",
  },
  "nano-banana-pro": {
    create: "/api/v1/nano-banana/generate",
    poll: "/api/v1/nano-banana/record-info",
  },

  "seedream": {
    create: "/api/v1/seedream/generate",
    poll: "/api/v1/seedream/record-info",
  },
  "seedream-4.0": {
    create: "/api/v1/seedream/generate",
    poll: "/api/v1/seedream/record-info",
  },
  "seedream-4.5": {
    create: "/api/v1/seedream/generate",
    poll: "/api/v1/seedream/record-info",
  },

  "qwen-image": {
    create: "/api/v1/qwen/generate",
    poll: "/api/v1/qwen/record-info",
  },

  "4o-image": {
    create: "/api/v1/4o-image/generate",
    poll: "/api/v1/4o-image/record-info",
  },

  "midjourney-v7": {
    create: "/api/v1/midjourney/imagine",
    poll: "/api/v1/midjourney/record-info",
  },

  "ideogram-v3": {
    create: "/api/v1/ideogram/generate",
    poll: "/api/v1/ideogram/record-info",
  },

  "recraft": {
    create: "/api/v1/recraft/generate",
    poll: "/api/v1/recraft/record-info",
  },
};

function normalizeModelId(uiModel: string | undefined | null): string {
  if (!uiModel) return "flux-kontext";

  const key = uiModel.toLowerCase().trim().replace(/\s+/g, "-");

  // Явные алиасы/исправления (важно: без частичных replace, чтобы не получать seedream-4.0.0)
  const aliases: Record<string, string> = {
    "flux": "flux-kontext",
    "flux-kontext": "flux-kontext",
    "flux-kontекст": "flux-kontext",
    "flux-kontext-pro": "flux-kontext",

    "nano-banana": "nano-banana",
    "nano-banana-pro": "nano-banana-pro",

    "seedream": "seedream",
    "seedream-4": "seedream-4.0",
    "seedream-4.0": "seedream-4.0",
    "seedream-4.0.0": "seedream-4.0",
    "seedream-4.5": "seedream-4.5",
    "seedream-4.5.0": "seedream-4.5",

    "qwen": "qwen-image",
    "qwen-image": "qwen-image",

    "4o": "4o-image",
    "4o-image": "4o-image",

    "midjourney": "midjourney-v7",
    "midjourney-v7": "midjourney-v7",

    "ideogram": "ideogram-v3",
    "ideogram-v3": "ideogram-v3",

    "recraft": "recraft",
  };

  return aliases[key] || key;
}

// Безопасная сборка URL: принимает либо endpoint (/api/...), либо полный URL.
function buildUrl(endpointOrUrl: string): string {
  const raw = (endpointOrUrl || "").trim();
  if (!raw) throw new Error("Empty endpoint");

  // Если уже полный URL — возвращаем, но чиним частый баг с двойным base URL.
  if (/^https?:\/\//i.test(raw)) {
    const fixed = raw.replace(
      /^https?:\/\/api\.kie\.aihttps?:\/\/api\.kie\.ai/i,
      KIE_API_BASE
    );
    console.log("Built URL:", fixed);
    return fixed;
  }

  const cleanEndpoint = raw.startsWith("/") ? raw : `/${raw}`;
  const url = `${KIE_API_BASE}${cleanEndpoint}`;
  console.log("Built URL:", url);
  return url;
}

function withTaskId(pollEndpoint: string, taskId: string): string {
  const sep = pollEndpoint.includes("?") ? "&" : "?";
  return `${pollEndpoint}${sep}taskId=${encodeURIComponent(taskId)}`;
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

    console.log('=== GENERATE IMAGE REQUEST ===');
    console.log('Prompt:', prompt?.substring(0, 100) + '...');
    console.log('Model:', model);
    console.log('Aspect Ratio:', aspectRatio);

    // Build full prompt with style
    const fullPrompt = style && style !== 'photorealism' 
      ? `${prompt}, ${style} style` 
      : prompt;

    const modelId = normalizeModelId(model);
    const endpoints = MODEL_ENDPOINTS[modelId] || MODEL_ENDPOINTS["flux-kontext"];

    console.log("Normalized Model ID:", modelId);
    console.log("Create Endpoint:", endpoints.create);
    console.log("Poll Endpoint:", endpoints.poll);

    const createUrl = buildUrl(endpoints.create);
    console.log("Create URL:", createUrl);

    const requestBody = {
      prompt: fullPrompt,
      aspect_ratio: aspectRatio || '1:1',
      ...(referenceImage && { image_url: referenceImage }),
    };

    console.log('Request body:', JSON.stringify(requestBody, null, 2));

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
          error: data.msg || data.message || `Ошибка API: ${response.status}` 
        }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for error code in response
    if (data.code && data.code !== 200) {
      console.error("KIE.AI API returned error code:", data.code, data.msg);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: data.msg || `Ошибка API: ${data.code}` 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for immediate result
    const immediateResult = extractImageUrl(data);
    if (immediateResult) {
      console.log('Immediate result:', immediateResult.substring(0, 100));
      return new Response(
        JSON.stringify({ success: true, image_url: immediateResult }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get taskId for polling
    const taskId = data.data?.taskId || data.taskId || data.task_id || data.id;
    
    if (!taskId) {
      console.error("No taskId in response:", data);
      return new Response(
        JSON.stringify({ success: false, error: "Не удалось создать задачу генерации" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Got taskId: ${taskId}, starting polling...`);
    
    // Polling for result - CORRECT URL construction
    const maxAttempts = isTest ? 15 : 30;
    
    for (let attempts = 0; attempts < maxAttempts; attempts++) {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      try {
        const pollUrl = buildUrl(withTaskId(endpoints.poll, String(taskId)));

        console.log(`Poll attempt ${attempts + 1}/${maxAttempts}: ${pollUrl}`);
        
        const statusResponse = await fetch(pollUrl, {
          headers: {
            Authorization: `Bearer ${KIEAI_API_KEY}`,
          },
        });

        if (!statusResponse.ok) {
          console.log(`Poll attempt ${attempts + 1}: HTTP ${statusResponse.status}`);
          continue;
        }

        const statusData = await statusResponse.json();
        
        // Log every 5th request or last 3
        if ((attempts + 1) % 5 === 0 || attempts >= maxAttempts - 3) {
          console.log(`Poll attempt ${attempts + 1}/${maxAttempts}: ${JSON.stringify(statusData).substring(0, 500)}`);
        }

        if (statusData.code === 200 && statusData.data) {
          const taskData = statusData.data;
          
          // KIE.AI uses completeTime as completion indicator
          const isCompleted = taskData.completeTime !== null && taskData.completeTime !== undefined;
          const status = taskData.status || taskData.state;
          
          if (isCompleted || status === 'completed' || status === 'success' || status === 'COMPLETED' || status === 'SUCCESS') {
            console.log(`Task completed! Full response: ${JSON.stringify(taskData).substring(0, 1000)}`);
            
            const imageUrl = extractImageUrl(taskData);
            if (imageUrl) {
              console.log(`SUCCESS! Image URL: ${imageUrl.substring(0, 100)}`);
              return new Response(
                JSON.stringify({ success: true, image_url: imageUrl }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            } else {
              console.error('Task completed but no image URL found');
            }
          } else if (status === 'failed' || status === 'error' || status === 'FAILED') {
            const errorMsg = taskData.error || taskData.errorMessage || taskData.failMsg || 'Генерация не удалась';
            console.error(`Generation failed: ${errorMsg}`);
            return new Response(
              JSON.stringify({ success: false, error: errorMsg }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      } catch (pollError) {
        console.error(`Poll error at attempt ${attempts + 1}:`, pollError);
      }
    }
    
    // Timeout
    console.error(`Timeout waiting for result after ${maxAttempts} attempts`);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Генерация заняла слишком много времени. Попробуйте ещё раз." 
      }),
      { status: 408, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

// Extract image URL from various KIE.AI response formats
function extractImageUrl(data: Record<string, unknown>): string | null {
  const possiblePaths = [
    // KIE.AI flux-kontext format
    (data as any).response?.resultImageUrl,
    (data as any).response?.originImageUrl,
    (data as any).resultImageUrl,
    (data as any).originImageUrl,
    // Standard formats
    (data as any).output?.url,
    (data as any).output?.image_url,
    (data as any).output?.images?.[0]?.url,
    (data as any).output?.images?.[0],
    (data as any).images?.[0]?.url,
    (data as any).images?.[0],
    (data as any).image_url,
    (data as any).imageUrl,
    (data as any).url,
    (data as any).result?.image_url,
    (data as any).result?.url,
    // Nested in data
    (data as any).data?.response?.resultImageUrl,
    (data as any).data?.resultImageUrl,
    (data as any).data?.originImageUrl,
    (data as any).data?.output?.url,
    (data as any).data?.output?.image_url,
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
