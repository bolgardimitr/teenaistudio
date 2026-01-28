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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { prompt, model, aspectRatio, style, referenceImage, changeStrength, mode, isTest } = await req.json() as GenerateImageRequest;

    const KIEAI_API_KEY = Deno.env.get("KIEAI_API_KEY");
    
    if (!KIEAI_API_KEY) {
      console.error("KIEAI_API_KEY is not configured");
      return new Response(
        JSON.stringify({ success: false, error: "API ключ KIE.AI не настроен. Обратитесь к администратору." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generate image request - Model: ${model}, Prompt: ${prompt.substring(0, 50)}...`);

    // Build full prompt with style
    const fullPrompt = style && style !== 'photorealism' 
      ? `${prompt}, ${style} style` 
      : prompt;

    // KIE.AI only supports Flux Kontext API for image generation
    // All models route through the same endpoint with different configurations
    const endpoint = "https://api.kie.ai/api/v1/flux/kontext/generate";
    
    // Map aspectRatio to supported values
    const supportedRatios = ["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"];
    const normalizedRatio = aspectRatio && supportedRatios.includes(aspectRatio) 
      ? aspectRatio 
      : "1:1";

    // Determine model variant based on requested model
    // flux-kontext-max for premium models, flux-kontext-pro for standard
    let modelVariant = "flux-kontext-pro";
    if (model === "flux-kontext-max" || model === "midjourney-v7" || model === "4o-image") {
      modelVariant = "flux-kontext-max";
    }

    const body: Record<string, unknown> = {
      prompt: fullPrompt,
      aspectRatio: normalizedRatio,
      model: modelVariant,
      outputFormat: "jpeg",
      enableTranslation: true, // Enable auto-translation for non-English prompts
    };

    // Handle image-to-image or editing modes
    if ((mode === "image-to-image" || mode === "editing") && referenceImage) {
      body.inputImage = referenceImage;
    }

    console.log(`Calling KIE.AI endpoint: ${endpoint}`);
    console.log(`Request body:`, JSON.stringify(body));

    // Make the API request
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${KIEAI_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

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

    // Check for API-level errors in response
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

    // Handle async task-based responses (taskId in data.data)
    const taskId = data.data?.taskId || data.taskId || data.task_id;
    
    if (taskId) {
      console.log(`Got taskId: ${taskId}, starting polling...`);
      
      let result = null;
      let attempts = 0;
      const maxAttempts = isTest ? 30 : 90; // 30 for tests (1 min), 90 for regular (3 min)

      // Use the correct status endpoint - flux/kontext/record-info (NOT record-detail!)
      const statusEndpoint = `https://api.kie.ai/api/v1/flux/kontext/record-info?taskId=${taskId}`;

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
            console.log(`Poll attempt ${attempts}: response = ${JSON.stringify(statusData).substring(0, 200)}`);
          }

          // Handle Flux Kontext response format according to documentation
          if (statusData.code === 200 && statusData.data) {
            const taskData = statusData.data;
            
            // Check if task is complete (successFlag = 1 or status = success)
            if (taskData.successFlag === 1 || taskData.status === "success" || taskData.status === "SUCCESS") {
              // Extract result URL from response - check all possible locations
              result = taskData.response?.resultImageUrl || 
                       taskData.response?.originImageUrl ||
                       taskData.resultImageUrl ||
                       taskData.imageUrl ||
                       taskData.response?.imageUrl;
              if (result) {
                console.log(`Image generation successful, URL: ${result.substring(0, 100)}`);
                break;
              }
            } else if (taskData.successFlag === 0 && taskData.errorMessage) {
              console.error(`Image generation failed: ${taskData.errorMessage}`);
              return new Response(
                JSON.stringify({
                  success: false,
                  error: taskData.errorMessage || "Генерация не удалась",
                }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
            // Continue polling for pending/processing status
          } else if (statusData.code === 404) {
            // Task not found yet - continue polling
            continue;
          }
          
          // Legacy format handling
          const status = statusData.data?.status || statusData.status;
          if (status === "completed" || status === "success" || status === "SUCCESS") {
            result = statusData.data?.output || statusData.data?.result || statusData.output || statusData.result;
            break;
          } else if (status === "failed" || status === "error" || status === "FAILED" || status === "fail") {
            return new Response(
              JSON.stringify({
                success: false,
                error: statusData.data?.error || statusData.error || statusData.msg || statusData.data?.failMsg || "Генерация не удалась",
              }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          // Continue polling for pending/processing status
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

      // Extract image URL from result
      const imageUrl = typeof result === "string" 
        ? result 
        : result.imageUrl || result.image_url || result.url || result.images?.[0]?.url || result.images?.[0];

      console.log(`Generation completed, image URL: ${imageUrl?.substring(0, 50)}...`);

      return new Response(
        JSON.stringify({ success: true, image_url: imageUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle direct response (no taskId) - check for immediate result
    const imageUrl = data.data?.imageUrl || data.data?.url || data.imageUrl || data.image_url || data.url || data.images?.[0]?.url || data.images?.[0] || data.output;
    
    if (imageUrl) {
      console.log(`Direct response, image URL: ${imageUrl?.substring(0, 50)}...`);
      return new Response(
        JSON.stringify({ success: true, image_url: imageUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // No image URL and no taskId - unexpected response
    console.error("Unexpected API response:", data);
    return new Response(
      JSON.stringify({ success: false, error: "Неожиданный ответ от API" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
