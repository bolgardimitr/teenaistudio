import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, model } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Map model IDs to Lovable AI Gateway models
    const modelMap: Record<string, string> = {
      'gemini-2.5-flash': 'google/gemini-2.5-flash',
      'gemini-2.0-pro': 'google/gemini-2.5-pro',
      'gemini-3-pro': 'google/gemini-3-pro-preview',
      'gpt-4o-mini': 'openai/gpt-5-mini',
      'gpt-4o': 'openai/gpt-5',
      'llama-3.3': 'google/gemini-2.5-flash-lite',
      'deepseek': 'google/gemini-2.5-flash-lite',
      'claude-3.5-sonnet': 'openai/gpt-5',
    };

    const aiModel = modelMap[model] || 'google/gemini-3-flash-preview';

    console.log(`Using model: ${aiModel} for request model: ${model}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          { 
            role: "system", 
            content: "Ты полезный AI-ассистент для детей и подростков. Отвечай дружелюбно, понятно и безопасно. Используй эмодзи для выразительности. При написании кода используй markdown форматирование с блоками кода." 
          },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Слишком много запросов. Подождите немного." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Недостаточно кредитов AI." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(
        JSON.stringify({ error: "Ошибка AI сервиса" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("text-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
