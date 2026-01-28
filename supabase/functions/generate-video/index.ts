import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { prompt, model, aspectRatio, duration, referenceImage, removeWatermark } = await req.json() as GenerateVideoRequest;

    const KIEAI_API_KEY = Deno.env.get("KIEAI_API_KEY");
    
    if (!KIEAI_API_KEY) {
      console.error("KIEAI_API_KEY is not configured");
      return new Response(
        JSON.stringify({ success: false, error: "API ключ KIE.AI не настроен. Обратитесь к администратору." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generate video request - Model: ${model}, Prompt: ${prompt.substring(0, 50)}...`);

    // Map model IDs to KIE.AI endpoints
    let endpoint = "";
    let body: Record<string, unknown> = {
      prompt,
      aspect_ratio: aspectRatio || "16:9",
    };

    if (duration) {
      body.duration = parseInt(duration);
    }

    if (referenceImage) {
      body.image = referenceImage;
    }

    switch (model) {
      case "luma-dream":
        endpoint = "https://api.kie.ai/api/v1/video/luma";
        break;

      case "seedance-lite":
        endpoint = "https://api.kie.ai/api/v1/video/seedance";
        body.model = "v1-lite";
        break;

      case "sora-2":
        endpoint = "https://api.kie.ai/api/v1/video/sora";
        body.model = "sora-2";
        break;

      case "sora-2-pro":
        endpoint = "https://api.kie.ai/api/v1/video/sora";
        body.model = "sora-2-pro";
        break;

      case "sora-2-pro-story":
        endpoint = "https://api.kie.ai/api/v1/video/sora";
        body.model = "sora-2-pro-story";
        break;

      case "sora-watermark-remover":
        endpoint = "https://api.kie.ai/api/v1/video/sora-watermark";
        break;

      case "veo3-fast":
        endpoint = "https://api.kie.ai/api/v1/video/veo3";
        body.quality = "fast";
        break;

      case "veo3-quality":
        endpoint = "https://api.kie.ai/api/v1/video/veo3";
        body.quality = "quality";
        break;

      case "kling-turbo":
        endpoint = "https://api.kie.ai/api/v1/video/kling";
        body.model = "2.5-turbo";
        break;

      case "kling-2-6":
        endpoint = "https://api.kie.ai/api/v1/video/kling";
        body.model = "2.6";
        break;

      case "kling-motion-control":
        endpoint = "https://api.kie.ai/api/v1/video/kling";
        body.model = "2.6-motion";
        break;

      case "seedance-pro":
        endpoint = "https://api.kie.ai/api/v1/video/seedance";
        body.model = "1.5-pro";
        break;

      case "seedance-pro-fast":
        endpoint = "https://api.kie.ai/api/v1/video/seedance";
        body.model = "pro-fast";
        break;

      case "wan-animate-move":
        endpoint = "https://api.kie.ai/api/v1/video/wan";
        body.mode = "move";
        break;

      case "wan-animate-replace":
        endpoint = "https://api.kie.ai/api/v1/video/wan";
        body.mode = "replace";
        break;

      case "runway-aleph":
        endpoint = "https://api.kie.ai/api/v1/video/runway";
        body.model = "aleph";
        break;

      default:
        // Default to Luma as fallback
        endpoint = "https://api.kie.ai/api/v1/video/luma";
    }

    // Handle watermark removal option
    if (removeWatermark) {
      body.remove_watermark = true;
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

    // Handle async task-based responses (video generation is always async)
    if (data.task_id) {
      console.log(`Got task_id: ${data.task_id}, starting polling...`);
      
      let result = null;
      let attempts = 0;
      const maxAttempts = 180; // 180 attempts * 2 seconds = 6 minutes max (video takes longer)

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
          
          if (attempts % 10 === 0) {
            console.log(`Poll attempt ${attempts}: status = ${statusData.status}`);
          }

          if (statusData.status === "completed" || statusData.status === "success") {
            result = statusData.output || statusData.result;
            break;
          } else if (statusData.status === "failed" || statusData.status === "error") {
            return new Response(
              JSON.stringify({
                success: false,
                error: statusData.error || statusData.message || "Генерация видео не удалась",
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
          JSON.stringify({ success: false, error: "Превышено время ожидания генерации видео" }),
          { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Extract video URL from result
      const videoUrl = typeof result === "string" 
        ? result 
        : result.video_url || result.url || result.videos?.[0]?.url || result.videos?.[0];

      console.log(`Video generation completed, URL: ${videoUrl?.substring(0, 50)}...`);

      return new Response(
        JSON.stringify({ success: true, video_url: videoUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle direct response (unlikely for video but just in case)
    const videoUrl = data.video_url || data.url || data.videos?.[0]?.url || data.videos?.[0] || data.output;
    
    console.log(`Direct response, video URL: ${videoUrl?.substring(0, 50)}...`);

    return new Response(
      JSON.stringify({ success: true, video_url: videoUrl }),
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
