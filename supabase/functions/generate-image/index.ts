import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

// Маппинг UI модели → KIE.AI model id для универсального createTask
// Источник: docs.kie.ai/market
const KIE_MODEL_IDS: Record<string, string> = {
  "flux-kontext": "flux-kontext-pro",
  "nano-banana": "google/nano-banana",
  "nano-banana-pro": "nano-banana-pro",
  seedream: "bytedance/seedream",
  "seedream-4.0": "bytedance/seedream-v4-text-to-image",
  "seedream-4.5": "bytedance/seedream-v4.5-text-to-image",
  "qwen-image": "qwen/text-to-image",
  "4o-image": "openai/gpt-image-1",
  "midjourney-v7": "midjourney/imagine",
  "ideogram-v3": "ideogram/text-to-image",
  recraft: "recraft-v3",
};

// Маппинг UI модели → специфичные endpoints (если есть)
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
  seedream: {
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
  recraft: {
    create: "/api/v1/recraft/generate",
    poll: "/api/v1/recraft/record-info",
  },
};

function normalizeModelId(uiModel: string | undefined | null): string {
  if (!uiModel) return "flux-kontext";

  const key = uiModel.toLowerCase().trim().replace(/\s+/g, "-");

  const aliases: Record<string, string> = {
    flux: "flux-kontext",
    "flux-kontext": "flux-kontext",
    "flux-kontекст": "flux-kontext",
    "flux-kontext-pro": "flux-kontext",

    "nano-banana": "nano-banana",
    "nano-banana-pro": "nano-banana-pro",

    seedream: "seedream",
    "seedream-4": "seedream-4.0",
    "seedream-4.0": "seedream-4.0",
    "seedream-4.0.0": "seedream-4.0",
    "seedream-4.5": "seedream-4.5",
    "seedream-4.5.0": "seedream-4.5",

    qwen: "qwen-image",
    "qwen-image": "qwen-image",

    "4o": "4o-image",
    "4o-image": "4o-image",

    midjourney: "midjourney-v7",
    "midjourney-v7": "midjourney-v7",

    ideogram: "ideogram-v3",
    "ideogram-v3": "ideogram-v3",

    recraft: "recraft",
  };

  return aliases[key] || key;
}

function buildUrl(endpointOrUrl: string): string {
  const raw = (endpointOrUrl || "").trim();
  if (!raw) throw new Error("Empty endpoint");

  if (/^https?:\/\//i.test(raw)) {
    const fixed = raw.replace(
      /^https?:\/\/api\.kie\.aihttps?:\/\/api\.kie\.ai/i,
      KIE_API_BASE
    );
    return fixed;
  }

  const cleanEndpoint = raw.startsWith("/") ? raw : `/${raw}`;
  return `${KIE_API_BASE}${cleanEndpoint}`;
}

function withTaskId(pollEndpoint: string, taskId: string): string {
  const sep = pollEndpoint.includes("?") ? "&" : "?";
  return `${pollEndpoint}${sep}taskId=${encodeURIComponent(taskId)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Polling helper
// ─────────────────────────────────────────────────────────────────────────────
async function pollForResult(
  taskId: string,
  pollEndpoint: string,
  apiKey: string,
  maxAttempts: number
): Promise<string | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, 2000));

    try {
      const pollUrl = buildUrl(withTaskId(pollEndpoint, taskId));
      console.log(`Poll attempt ${attempt + 1}/${maxAttempts}: ${pollUrl}`);

      const res = await fetch(pollUrl, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!res.ok) {
        console.log(`Poll HTTP ${res.status}`);
        continue;
      }

      const json = await res.json();
      if ((attempt + 1) % 5 === 0 || attempt >= maxAttempts - 3) {
        console.log(
          `Poll ${attempt + 1}/${maxAttempts}: ${JSON.stringify(json).substring(0, 500)}`
        );
      }

      if (json.code === 200 && json.data) {
        const taskData = json.data;
        const isCompleted =
          taskData.completeTime !== null && taskData.completeTime !== undefined;
        const state = taskData.status || taskData.state;

        if (
          isCompleted ||
          ["completed", "success", "COMPLETED", "SUCCESS"].includes(state)
        ) {
          const url = extractImageUrl(taskData);
          if (url) return url;
        }

        if (["failed", "error", "FAILED"].includes(state)) {
          throw new Error(
            taskData.error || taskData.errorMessage || "Generation failed"
          );
        }
      }
    } catch (err) {
      console.error(`Poll error at ${attempt + 1}:`, err);
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Universal fallback via /api/v1/jobs/createTask
// ─────────────────────────────────────────────────────────────────────────────
async function tryUniversalCreateTask(
  apiKey: string,
  kieModelId: string,
  prompt: string,
  aspectRatio: string,
  referenceImage?: string,
  maxAttempts = 30
): Promise<Response | null> {
  const createUrl = buildUrl("/api/v1/jobs/createTask");
  console.log(
    `Universal fallback → ${createUrl} with model=${kieModelId}`
  );

  // KIE.AI требует формат: { model, input: { prompt, aspect_ratio, ... } }
  const input: Record<string, unknown> = {
    prompt,
    aspect_ratio: aspectRatio,
  };
  if (referenceImage) input.image_url = referenceImage;

  const body: Record<string, unknown> = {
    model: kieModelId,
    input,
  };

  console.log("Universal createTask body:", JSON.stringify(body, null, 2));

  const res = await fetch(createUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  console.log("Universal createTask response:", JSON.stringify(data).substring(0, 500));

  if (!res.ok || (data.code && data.code !== 200)) {
    console.error("Universal createTask failed:", data);
    return null;
  }

  const taskId = data.data?.taskId || data.taskId || data.task_id || data.id;
  if (!taskId) {
    const immediateUrl = extractImageUrl(data);
    if (immediateUrl) {
      return new Response(
        JSON.stringify({ success: true, image_url: immediateUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    return null;
  }

  console.log(`Universal taskId: ${taskId}`);

  // Polling via /api/v1/jobs/recordInfo (согласно docs.kie.ai)
  const pollEndpoint = "/api/v1/jobs/recordInfo";
  const imageUrl = await pollForResult(taskId, pollEndpoint, apiKey, maxAttempts);

  if (!imageUrl) return null;

  console.log(`SUCCESS (universal)! Image URL: ${imageUrl}`);
  return new Response(
    JSON.stringify({ success: true, image_url: imageUrl }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      prompt,
      model,
      aspectRatio,
      style,
      referenceImage,
      isTest,
    } = (await req.json()) as GenerateImageRequest;

    const KIEAI_API_KEY = Deno.env.get("KIEAI_API_KEY");

    if (!KIEAI_API_KEY) {
      console.error("KIEAI_API_KEY is not configured");
      return new Response(
        JSON.stringify({
          success: false,
          error: "API ключ KIE.AI не настроен. Обратитесь к администратору.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("=== GENERATE IMAGE REQUEST ===");
    console.log("Prompt:", prompt?.substring(0, 100) + "...");
    console.log("Model:", model);
    console.log("Aspect Ratio:", aspectRatio);

    const fullPrompt =
      style && style !== "photorealism" ? `${prompt}, ${style} style` : prompt;

    const modelId = normalizeModelId(model);
    const endpoints = MODEL_ENDPOINTS[modelId] || MODEL_ENDPOINTS["flux-kontext"];
    const kieModelId = KIE_MODEL_IDS[modelId] || "flux-kontext-pro";
    const maxAttempts = isTest ? 15 : 30;
    const ar = aspectRatio || "1:1";

    console.log("Normalized Model ID:", modelId);
    console.log("KIE Model ID:", kieModelId);
    console.log("Create Endpoint:", endpoints.create);
    console.log("Poll Endpoint:", endpoints.poll);

    // ─────────────────────────────────────────────────────────────────────────
    // Step 1: Try model-specific endpoint
    // ─────────────────────────────────────────────────────────────────────────
    const createUrl = buildUrl(endpoints.create);
    console.log("Create URL:", createUrl);

    const requestBody: Record<string, unknown> = {
      prompt: fullPrompt,
      aspect_ratio: ar,
    };
    if (referenceImage) requestBody.image_url = referenceImage;

    console.log("Request body:", JSON.stringify(requestBody, null, 2));

    const response = await fetch(createUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${KIEAI_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    console.log("API Response status:", response.status);
    console.log("API Response:", JSON.stringify(data).substring(0, 500));

    // ─────────────────────────────────────────────────────────────────────────
    // If 404 / error → fallback to universal createTask
    // ─────────────────────────────────────────────────────────────────────────
    if (!response.ok || (data.code && data.code !== 200)) {
      console.log("Model endpoint failed, trying universal createTask fallback...");

      const fallbackResponse = await tryUniversalCreateTask(
        KIEAI_API_KEY,
        kieModelId,
        fullPrompt,
        ar,
        referenceImage,
        maxAttempts
      );

      if (fallbackResponse) return fallbackResponse;

      // Both failed
      return new Response(
        JSON.stringify({
          success: false,
          error: data.msg || data.message || `Ошибка API: ${response.status}`,
        }),
        {
          status: response.status || 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Immediate result?
    // ─────────────────────────────────────────────────────────────────────────
    const immediateResult = extractImageUrl(data);
    if (immediateResult) {
      console.log("Immediate result:", immediateResult.substring(0, 100));
      return new Response(
        JSON.stringify({ success: true, image_url: immediateResult }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Polling with model-specific poll endpoint
    // ─────────────────────────────────────────────────────────────────────────
    const taskId = data.data?.taskId || data.taskId || data.task_id || data.id;

    if (!taskId) {
      console.error("No taskId in response:", data);
      return new Response(
        JSON.stringify({ success: false, error: "Не удалось создать задачу генерации" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Got taskId: ${taskId}, starting polling...`);

    const imageUrl = await pollForResult(
      String(taskId),
      endpoints.poll,
      KIEAI_API_KEY,
      maxAttempts
    );

    if (imageUrl) {
      console.log(`SUCCESS! Image URL: ${imageUrl.substring(0, 100)}`);
      return new Response(
        JSON.stringify({ success: true, image_url: imageUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Timeout
    console.error(`Timeout waiting for result after ${maxAttempts} attempts`);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Генерация заняла слишком много времени. Попробуйте ещё раз.",
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

// ─────────────────────────────────────────────────────────────────────────────
// Extract image URL from various KIE.AI response formats
// ─────────────────────────────────────────────────────────────────────────────
function extractImageUrl(data: Record<string, unknown>): string | null {
  // Сначала пробуем распарсить resultJson (универсальный API возвращает его как строку)
  const d = data as any;
  const taskData = d.data || d;

  // resultJson может быть строкой JSON
  let resultJson = taskData.resultJson;
  if (typeof resultJson === "string") {
    try {
      resultJson = JSON.parse(resultJson);
    } catch {
      // ignore
    }
  }

  // Ищем URL в resultJson.resultUrls (универсальный API)
  if (resultJson?.resultUrls?.length > 0) {
    const url = resultJson.resultUrls[0];
    if (typeof url === "string" && url.startsWith("http")) return url;
  }

  const possiblePaths = [
    // Универсальный API
    resultJson?.resultUrls?.[0],
    // flux-kontext format
    taskData.response?.resultImageUrl,
    taskData.response?.originImageUrl,
    taskData.resultImageUrl,
    taskData.originImageUrl,
    // Standard formats
    taskData.output?.url,
    taskData.output?.image_url,
    taskData.output?.images?.[0]?.url,
    taskData.output?.images?.[0],
    taskData.images?.[0]?.url,
    taskData.images?.[0],
    taskData.image_url,
    taskData.imageUrl,
    taskData.url,
    taskData.result?.image_url,
    taskData.result?.url,
    // Nested in data (если data ещё не развёрнут)
    d.data?.response?.resultImageUrl,
    d.data?.resultImageUrl,
    d.data?.originImageUrl,
    d.data?.output?.url,
    d.data?.output?.image_url,
    d.data?.output?.images?.[0]?.url,
    d.data?.images?.[0],
    d.data?.image_url,
    d.data?.url,
  ];

  for (const path of possiblePaths) {
    if (typeof path === "string" && path.startsWith("http")) {
      return path;
    }
  }

  return null;
}
