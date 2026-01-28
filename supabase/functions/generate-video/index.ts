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

// Upload base64 image to Supabase storage and return public URL
async function uploadBase64ToStorage(base64Data: string): Promise<string | null> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Supabase credentials not configured");
      return null;
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Extract mime type and base64 content
    const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      console.error("Invalid base64 format");
      return null;
    }
    
    const mimeType = matches[1];
    const base64Content = matches[2];
    const extension = mimeType.split("/")[1] || "jpg";
    
    // Convert base64 to Uint8Array
    const binaryString = atob(base64Content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Generate unique filename
    const fileName = `${crypto.randomUUID()}.${extension}`;
    
    // Upload to storage
    const { data, error } = await supabase.storage
      .from("video-references")
      .upload(fileName, bytes, {
        contentType: mimeType,
        upsert: false,
      });
    
    if (error) {
      console.error("Storage upload error:", error);
      return null;
    }
    
    // Get public URL
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

    console.log(`Generate video request - Model: ${model}, Prompt: ${prompt.substring(0, 50)}...`);

    // KIE.AI supports Runway API for video generation
    // All video models route through the runway endpoint
    const endpoint = "https://api.kie.ai/api/v1/runway/generate";

    // Parse duration - must be 5 or 10 seconds
    const videoDuration = duration ? parseInt(duration) : 5;
    const normalizedDuration = videoDuration === 10 ? 10 : 5;

    // Quality depends on duration: 1080p only available for 5s videos
    const quality = normalizedDuration === 10 ? "720p" : "1080p";

    // Map aspectRatio to supported values for runway
    const supportedRatios = ["16:9", "4:3", "1:1", "3:4", "9:16"];
    const normalizedRatio = aspectRatio && supportedRatios.includes(aspectRatio) 
      ? aspectRatio 
      : "16:9";

    const body: Record<string, unknown> = {
      prompt,
      duration: normalizedDuration,
      quality,
      aspectRatio: normalizedRatio,
    };

    // Handle watermark
    if (removeWatermark) {
      body.waterMark = "";
    }

    // Add reference image for image-to-video
    // If it's a base64 data URL, upload to storage first
    if (referenceImage) {
      if (referenceImage.startsWith("data:")) {
        console.log("Uploading base64 image to storage...");
        const publicUrl = await uploadBase64ToStorage(referenceImage);
        if (publicUrl) {
          body.imageUrl = publicUrl;
        } else {
          console.warn("Failed to upload reference image, proceeding without it");
        }
      } else {
        // Already a URL, use directly
        body.imageUrl = referenceImage;
      }
    }

    console.log(`Calling KIE.AI endpoint: ${endpoint}`);
    console.log(`Request body (truncated):`, JSON.stringify({ ...body, imageUrl: body.imageUrl ? (body.imageUrl as string).substring(0, 100) + "..." : undefined }));

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
      const maxAttempts = isTest ? 60 : 180; // 2 min for tests, 6 min for regular

      // Use the correct status endpoint - runway/record-detail
      const statusEndpoint = `https://api.kie.ai/api/v1/runway/record-detail?taskId=${taskId}`;

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

          // Handle Runway response format according to documentation
          if (statusData.code === 200 && statusData.data) {
            const taskData = statusData.data;
            
            // Check state field for video completion
            // States: wait, queueing, generating, success, fail
            if (taskData.state === "success") {
              // Extract video URL from videoInfo
              result = taskData.videoInfo?.videoUrl;
              if (result) {
                console.log(`Video generation successful, URL: ${result.substring(0, 100)}`);
                break;
              }
            } else if (taskData.state === "fail") {
              console.error(`Video generation failed: ${taskData.failMsg}`);
              return new Response(
                JSON.stringify({
                  success: false,
                  error: taskData.failMsg || "Генерация видео не удалась",
                }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
            // Continue polling for wait/queueing/generating states
          } else if (statusData.code === 404) {
            // Task not found yet - continue polling
            continue;
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

      console.log(`Video generation completed, URL: ${result?.substring(0, 50)}...`);

      return new Response(
        JSON.stringify({ success: true, video_url: result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle direct response (unlikely for video but just in case)
    const videoUrl = data.data?.videoUrl || data.data?.url || data.videoUrl || data.video_url || data.url;
    
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
