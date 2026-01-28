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

    // Map model IDs to KIE.AI endpoints
    let endpoint = "";
    let body: Record<string, unknown> = {};

    // Build full prompt with style
    const fullPrompt = style && style !== 'photorealism' 
      ? `${prompt}, ${style} style` 
      : prompt;

    switch (model) {
      case "nano-banana":
        endpoint = "https://api.kie.ai/api/v1/image/nano-banana";
        body = {
          prompt: fullPrompt,
          aspect_ratio: aspectRatio || "1:1",
        };
        break;

      case "4o-image":
        endpoint = "https://api.kie.ai/api/v1/image/4o";
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
        endpoint = "https://api.kie.ai/api/v1/image/midjourney";
        body = {
          prompt: fullPrompt,
          aspect_ratio: aspectRatio || "1:1",
          model: "v7",
        };
        break;

      case "flux-kontext":
        endpoint = "https://api.kie.ai/api/v1/image/flux-kontext";
        body = {
          prompt: fullPrompt,
          aspect_ratio: aspectRatio || "1:1",
        };
        break;

      case "seedream":
        endpoint = "https://api.kie.ai/api/v1/image/seedream";
        body = {
          prompt: fullPrompt,
          aspect_ratio: aspectRatio || "1:1",
        };
        break;

      case "kandinsky":
        // Kandinsky uses a different endpoint structure
        endpoint = "https://api.kie.ai/api/v1/image/kandinsky";
        body = {
          prompt: fullPrompt,
          aspect_ratio: aspectRatio || "1:1",
        };
        break;

      default:
        // Default to nano-banana as fallback
        endpoint = "https://api.kie.ai/api/v1/image/nano-banana";
        body = {
          prompt: fullPrompt,
          aspect_ratio: aspectRatio || "1:1",
        };
    }

    // Handle image-to-image or editing modes
    if ((mode === "image-to-image" || mode === "editing") && referenceImage) {
      body.image = referenceImage;
      if (changeStrength !== undefined) {
        body.strength = changeStrength;
      }
    }

    console.log(`Calling KIE.AI endpoint: ${endpoint}`);

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
          error: data.message || data.error || `Ошибка API: ${response.status}` 
        }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle async task-based responses
    if (data.task_id) {
      console.log(`Got task_id: ${data.task_id}, starting polling...`);
      
      let result = null;
      let attempts = 0;
      const maxAttempts = 90; // 90 attempts * 2 seconds = 3 minutes max

      while (!result && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        attempts++;

        try {
          const statusResponse = await fetch(
            `https://api.kie.ai/api/v1/task/${data.task_id}`,
            {
              headers: {
                Authorization: `Bearer ${KIEAI_API_KEY}`,
              },
            }
          );

          const statusData = await statusResponse.json();
          console.log(`Poll attempt ${attempts}: status = ${statusData.status}`);

          if (statusData.status === "completed" || statusData.status === "success") {
            result = statusData.output || statusData.result;
            break;
          } else if (statusData.status === "failed" || statusData.status === "error") {
            return new Response(
              JSON.stringify({
                success: false,
                error: statusData.error || statusData.message || "Генерация не удалась",
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
        : result.image_url || result.url || result.images?.[0]?.url || result.images?.[0];

      console.log(`Generation completed, image URL: ${imageUrl?.substring(0, 50)}...`);

      return new Response(
        JSON.stringify({ success: true, image_url: imageUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle direct response (no task_id)
    const imageUrl = data.image_url || data.url || data.images?.[0]?.url || data.images?.[0] || data.output;
    
    console.log(`Direct response, image URL: ${imageUrl?.substring(0, 50)}...`);

    return new Response(
      JSON.stringify({ success: true, image_url: imageUrl }),
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
