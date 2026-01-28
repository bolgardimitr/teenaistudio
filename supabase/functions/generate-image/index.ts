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
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { prompt, model, aspectRatio, style, referenceImage, changeStrength, mode } = await req.json() as GenerateImageRequest;

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

    // Map model IDs to correct KIE.AI endpoints based on documentation
    let endpoint = "";
    let body: Record<string, unknown> = {};

    switch (model) {
      case "nano-banana":
        // Nano Banana - fast generation
        endpoint = "https://api.kie.ai/api/v1/flux/kontext/generate";
        body = {
          prompt: fullPrompt,
          aspectRatio: aspectRatio || "1:1",
          model: "flux-kontext-pro",
        };
        break;

      case "4o-image":
        // GPT-4o Image generation
        endpoint = "https://api.kie.ai/api/v1/4o/generate";
        const sizeMap: Record<string, string> = {
          "16:9": "1792x1024",
          "9:16": "1024x1792",
          "4:3": "1344x1024",
          "3:4": "1024x1344",
          "1:1": "1024x1024",
        };
        body = {
          prompt: fullPrompt,
          size: sizeMap[aspectRatio || "1:1"] || "1024x1024",
        };
        break;

      case "midjourney-v7":
        // Midjourney v7
        endpoint = "https://api.kie.ai/api/v1/midjourney/generate";
        body = {
          prompt: fullPrompt,
          aspectRatio: aspectRatio || "1:1",
          model: "v7",
        };
        break;

      case "flux-kontext":
        // Flux Kontext - documented endpoint
        endpoint = "https://api.kie.ai/api/v1/flux/kontext/generate";
        body = {
          prompt: fullPrompt,
          aspectRatio: aspectRatio || "1:1",
          model: "flux-kontext-pro",
          outputFormat: "jpeg",
        };
        if (referenceImage) {
          body.inputImage = referenceImage;
        }
        break;

      case "flux-kontext-max":
        // Flux Kontext Max - enhanced model
        endpoint = "https://api.kie.ai/api/v1/flux/kontext/generate";
        body = {
          prompt: fullPrompt,
          aspectRatio: aspectRatio || "1:1",
          model: "flux-kontext-max",
          outputFormat: "jpeg",
        };
        if (referenceImage) {
          body.inputImage = referenceImage;
        }
        break;

      case "seedream":
        // SeedReam
        endpoint = "https://api.kie.ai/api/v1/seedream/generate";
        body = {
          prompt: fullPrompt,
          aspectRatio: aspectRatio || "1:1",
        };
        break;

      case "kandinsky":
        // Kandinsky - Russian AI model
        endpoint = "https://api.kie.ai/api/v1/kandinsky/generate";
        body = {
          prompt: fullPrompt,
          aspectRatio: aspectRatio || "1:1",
        };
        break;

      default:
        // Default to Flux Kontext as most reliable
        endpoint = "https://api.kie.ai/api/v1/flux/kontext/generate";
        body = {
          prompt: fullPrompt,
          aspectRatio: aspectRatio || "1:1",
          model: "flux-kontext-pro",
        };
    }

    // Handle image-to-image or editing modes
    if ((mode === "image-to-image" || mode === "editing") && referenceImage) {
      body.inputImage = referenceImage;
      if (changeStrength !== undefined) {
        body.strength = changeStrength;
      }
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
      const maxAttempts = 90; // 90 attempts * 2 seconds = 3 minutes max

      // Determine the correct status endpoint based on the model/endpoint used
      let statusEndpoint = `https://api.kie.ai/api/v1/flux/kontext/${taskId}`;
      if (model === "midjourney-v7") {
        statusEndpoint = `https://api.kie.ai/api/v1/midjourney/${taskId}`;
      } else if (model === "4o-image") {
        statusEndpoint = `https://api.kie.ai/api/v1/4o/${taskId}`;
      } else if (model === "seedream") {
        statusEndpoint = `https://api.kie.ai/api/v1/seedream/${taskId}`;
      } else if (model === "kandinsky") {
        statusEndpoint = `https://api.kie.ai/api/v1/kandinsky/${taskId}`;
      }

      while (!result && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        attempts++;

        try {
          // Use the correct task status endpoint for the model
          const statusResponse = await fetch(statusEndpoint, {
            headers: {
              Authorization: `Bearer ${KIEAI_API_KEY}`,
            },
          });

          const statusData = await statusResponse.json();
          
          if (attempts % 5 === 0) {
            console.log(`Poll attempt ${attempts}: response = ${JSON.stringify(statusData).substring(0, 200)}`);
          }

          // Handle Flux Kontext response format
          if (statusData.code === 200 && statusData.data) {
            const taskData = statusData.data;
            // Check if task is complete (successFlag = 1 or status = success)
            if (taskData.successFlag === 1 || taskData.status === "success" || taskData.status === "SUCCESS") {
              // Extract result URL from response
              result = taskData.response?.resultImageUrl || 
                       taskData.response?.originImageUrl ||
                       taskData.resultImageUrl ||
                       taskData.imageUrl;
              if (result) break;
            } else if (taskData.successFlag === 0 && taskData.errorMessage) {
              return new Response(
                JSON.stringify({
                  success: false,
                  error: taskData.errorMessage || "Генерация не удалась",
                }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
          }
          
          // Legacy format handling
          const status = statusData.data?.status || statusData.status;
          if (status === "completed" || status === "success" || status === "SUCCESS") {
            result = statusData.data?.output || statusData.data?.result || statusData.output || statusData.result;
            break;
          } else if (status === "failed" || status === "error" || status === "FAILED") {
            return new Response(
              JSON.stringify({
                success: false,
                error: statusData.data?.error || statusData.error || statusData.msg || "Генерация не удалась",
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
