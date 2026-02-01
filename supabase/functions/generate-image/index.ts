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

// ВРЕМЕННОЕ РЕШЕНИЕ: используем проверенный endpoint flux-kontext для всех моделей
const WORKING_ENDPOINT = "https://api.kie.ai/api/v1/flux/kontext/generate";

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
    console.log('UI Model:', model);
    console.log('Prompt:', prompt.substring(0, 100) + '...');
    console.log('Aspect Ratio:', aspectRatio);
    console.log('Using endpoint:', WORKING_ENDPOINT);

    // Собираем полный prompt со стилем
    const fullPrompt = style && style !== 'photorealism' 
      ? `${prompt}, ${style} style` 
      : prompt;

    // Формируем тело запроса для flux-kontext
    const requestBody = {
      prompt: fullPrompt,
      aspect_ratio: aspectRatio || '1:1',
      ...(referenceImage && { image_url: referenceImage }),
    };

    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(WORKING_ENDPOINT, {
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
    let result = null;
    let attempts = 0;
    const maxAttempts = 30; // Максимум 60 секунд (30 попыток по 2 сек)

    while (!result && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      attempts++;

      try {
        const statusEndpoint = `https://api.kie.ai/api/v1/flux/kontext/record-info?taskId=${taskId}`;
        
        const statusResponse = await fetch(statusEndpoint, {
          headers: {
            Authorization: `Bearer ${KIEAI_API_KEY}`,
          },
        });

        if (!statusResponse.ok) {
          console.log(`Poll attempt ${attempts}: HTTP ${statusResponse.status}`);
          continue;
        }

        const statusData = await statusResponse.json();
        
        // Логируем каждый 5-й запрос и последние попытки
        if (attempts % 5 === 0 || attempts >= maxAttempts - 3) {
          console.log(`Poll attempt ${attempts}/${maxAttempts}: ${JSON.stringify(statusData).substring(0, 500)}`);
        }

        if (statusData.code === 200 && statusData.data) {
          const taskData = statusData.data;
          
          // KIE.AI использует completeTime как признак завершения!
          const isCompleted = taskData.completeTime !== null && taskData.completeTime !== undefined;
          const status = taskData.status || taskData.state;
          
          console.log(`Task status check: completeTime=${taskData.completeTime}, status=${status}, isCompleted=${isCompleted}`);
          
          if (isCompleted || status === 'completed' || status === 'success') {
            // Логируем полный ответ для отладки
            console.log(`Task completed! Full response: ${JSON.stringify(taskData)}`);
            
            // Извлекаем URL из response объекта
            result = extractImageUrl(taskData);
            
            if (result) {
              console.log(`SUCCESS! Image URL: ${result}`);
              break;
            } else {
              console.error('Task completed but no image URL found in response');
            }
          } else if (status === 'failed' || status === 'error') {
            const errorMsg = taskData.error || taskData.errorMessage || taskData.failMsg || 'Генерация не удалась';
            console.error(`Generation failed: ${errorMsg}`);
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
      console.error(`Timeout after ${attempts} attempts`);
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

// Извлечение URL изображения из различных форматов ответа KIE.AI
function extractImageUrl(data: Record<string, unknown>): string | null {
  // Логируем структуру для отладки
  console.log('Extracting URL from:', JSON.stringify(data).substring(0, 1000));
  
  // KIE.AI flux-kontext возвращает URL в response.resultImageUrl
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
    (data as any).data?.output?.images?.[0]?.url,
    (data as any).data?.images?.[0],
    (data as any).data?.image_url,
    (data as any).data?.url,
  ];
  
  for (const path of possiblePaths) {
    if (typeof path === 'string' && path.startsWith('http')) {
      console.log('Found image URL at path:', path.substring(0, 100));
      return path;
    }
  }
  
  console.error('No image URL found in any known path');
  return null;
}
