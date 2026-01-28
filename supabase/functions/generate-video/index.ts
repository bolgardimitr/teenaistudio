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

    // Map model IDs to correct KIE.AI endpoints based on documentation
    let endpoint = "";
    let body: Record<string, unknown> = {
      prompt,
      aspectRatio: aspectRatio || "16:9",
    };

    // Set duration
    const videoDuration = duration ? parseInt(duration) : 5;
    body.duration = videoDuration;

    // Set quality based on duration (1080p not available for 10s videos)
    body.quality = videoDuration === 10 ? "720p" : "1080p";

    // Handle watermark
    if (!removeWatermark) {
      body.waterMark = "";
    }

    switch (model) {
      case "luma-dream":
        // Luma Dream Machine
        endpoint = "https://api.kie.ai/api/v1/luma/generate";
        break;

      case "runway-gen3":
      case "runway-aleph":
        // Runway - documented endpoint
        endpoint = "https://api.kie.ai/api/v1/runway/generate";
        body.model = model === "runway-aleph" ? "runway-aleph" : "runway-duration-5-generate";
        if (referenceImage) {
          body.imageUrl = referenceImage;
        }
        break;

      case "veo3-fast":
        // Veo3 Fast
        endpoint = "https://api.kie.ai/api/v1/veo3/generate";
        body.quality = "fast";
        break;

      case "veo3-quality":
        // Veo3 Quality
        endpoint = "https://api.kie.ai/api/v1/veo3/generate";
        body.quality = "quality";
        break;

      case "kling-turbo":
        // Kling AI Turbo
        endpoint = "https://api.kie.ai/api/v1/kling/generate";
        body.model = "turbo";
        break;

      case "kling-2-6":
        // Kling AI 2.6
        endpoint = "https://api.kie.ai/api/v1/kling/generate";
        body.model = "2.6";
        break;

      case "kling-motion-control":
        // Kling Motion Control
        endpoint = "https://api.kie.ai/api/v1/kling/generate";
        body.model = "motion-control";
        break;

      case "seedance-lite":
        // Seedance Lite
        endpoint = "https://api.kie.ai/api/v1/seedance/generate";
        body.model = "lite";
        break;

      case "seedance-pro":
        // Seedance Pro
        endpoint = "https://api.kie.ai/api/v1/seedance/generate";
        body.model = "pro";
        break;

      case "seedance-pro-fast":
        // Seedance Pro Fast
        endpoint = "https://api.kie.ai/api/v1/seedance/generate";
        body.model = "pro-fast";
        break;

      case "sora-2":
        // Sora 2
        endpoint = "https://api.kie.ai/api/v1/sora/generate";
        body.model = "sora-2";
        break;

      case "sora-2-pro":
        // Sora 2 Pro
        endpoint = "https://api.kie.ai/api/v1/sora/generate";
        body.model = "sora-2-pro";
        break;

      case "sora-2-pro-story":
        // Sora 2 Pro Story
        endpoint = "https://api.kie.ai/api/v1/sora/generate";
        body.model = "sora-2-pro-story";
        break;

      case "wan-animate-move":
        // Wan Animate Move
        endpoint = "https://api.kie.ai/api/v1/wan/generate";
        body.mode = "move";
        break;

      case "wan-animate-replace":
        // Wan Animate Replace
        endpoint = "https://api.kie.ai/api/v1/wan/generate";
        body.mode = "replace";
        break;

      default:
        // Default to Runway as most documented and reliable
        endpoint = "https://api.kie.ai/api/v1/runway/generate";
        body.model = "runway-duration-5-generate";
    }

    // Add reference image for image-to-video
    if (referenceImage && !body.imageUrl) {
      body.imageUrl = referenceImage;
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

    // Handle async task-based responses (video generation is always async)
    const taskId = data.data?.taskId || data.taskId || data.task_id;
    
    if (taskId) {
      console.log(`Got taskId: ${taskId}, starting polling...`);
      
      let result = null;
      let attempts = 0;
      const maxAttempts = 180; // 180 attempts * 2 seconds = 6 minutes max (video takes longer)

      // Determine the correct status endpoint based on the model
      // KIE.AI uses /record-detail?taskId={taskId} endpoint for status polling
      let statusEndpoint = `https://api.kie.ai/api/v1/runway/record-detail?taskId=${taskId}`;
      
      // Some models may have specific endpoints
      if (model === "luma-dream") {
        statusEndpoint = `https://api.kie.ai/api/v1/luma/record-detail?taskId=${taskId}`;
      } else if (model.startsWith("veo3")) {
        statusEndpoint = `https://api.kie.ai/api/v1/veo3/record-detail?taskId=${taskId}`;
      } else if (model.startsWith("kling")) {
        statusEndpoint = `https://api.kie.ai/api/v1/kling/record-detail?taskId=${taskId}`;
      } else if (model.startsWith("runway") || model === "runway-gen3" || model === "runway-aleph") {
        statusEndpoint = `https://api.kie.ai/api/v1/runway/record-detail?taskId=${taskId}`;
      } else if (model.startsWith("seedance")) {
        statusEndpoint = `https://api.kie.ai/api/v1/seedance/record-detail?taskId=${taskId}`;
      } else if (model.startsWith("sora")) {
        statusEndpoint = `https://api.kie.ai/api/v1/sora/record-detail?taskId=${taskId}`;
      } else if (model.startsWith("wan-animate")) {
        statusEndpoint = `https://api.kie.ai/api/v1/wan/record-detail?taskId=${taskId}`;
      }

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
            console.log(`Poll attempt ${attempts}: response = ${JSON.stringify(statusData).substring(0, 200)}`);
          }

          // Handle video response format from KIE.AI
          if (statusData.code === 200 && statusData.data) {
            const taskData = statusData.data;
            
            // Check state field for Runway/video models
            if (taskData.state === "success" || taskData.successFlag === 1) {
              // Extract video URL from various possible locations
              result = taskData.videoInfo?.videoUrl ||
                       taskData.response?.videoUrl || 
                       taskData.response?.resultUrls?.[0] ||
                       taskData.resultVideoUrl ||
                       taskData.videoUrl ||
                       taskData.videos?.[0]?.url;
              if (result) {
                console.log(`Video generation successful, URL: ${result.substring(0, 100)}`);
                break;
              }
            } else if (taskData.state === "failed" || (taskData.successFlag === 0 && taskData.errorMessage)) {
              console.error(`Video generation failed: ${taskData.failMsg || taskData.errorMessage}`);
              return new Response(
                JSON.stringify({
                  success: false,
                  error: taskData.failMsg || taskData.errorMessage || "Генерация видео не удалась",
                }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
            // state === "pending" or "processing" - continue polling
          }

          // Legacy format handling
          const status = statusData.data?.status || statusData.data?.state || statusData.status;

          if (status === "completed" || status === "success") {
            result = statusData.data?.videoInfo?.videoUrl || 
                     statusData.data?.output || 
                     statusData.data?.result || 
                     statusData.output;
            if (result) break;
          } else if (status === "failed" || status === "error") {
            return new Response(
              JSON.stringify({
                success: false,
                error: statusData.data?.failMsg || statusData.data?.error || statusData.msg || "Генерация видео не удалась",
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
        : result.videoUrl || result.video_url || result.url || result.videos?.[0]?.url || result.videos?.[0];

      console.log(`Video generation completed, URL: ${videoUrl?.substring(0, 50)}...`);

      return new Response(
        JSON.stringify({ success: true, video_url: videoUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle direct response (unlikely for video but just in case)
    const videoUrl = data.data?.videoUrl || data.data?.url || data.videoUrl || data.video_url || data.url || data.videos?.[0]?.url || data.videos?.[0] || data.output;
    
    if (videoUrl) {
      console.log(`Direct response, video URL: ${videoUrl?.substring(0, 50)}...`);
      return new Response(
        JSON.stringify({ success: true, video_url: videoUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // No video URL and no taskId - unexpected response
    console.error("Unexpected API response:", data);
    return new Response(
      JSON.stringify({ success: false, error: "Неожиданный ответ от API" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
