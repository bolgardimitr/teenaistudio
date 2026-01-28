import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { provider } = await req.json();

    let result = { success: false, message: '', balance: '' };

    switch (provider) {
      case 'kieai': {
        const apiKey = Deno.env.get('KIEAI_API_KEY');
        if (!apiKey) {
          result = { success: false, message: 'API ключ не настроен', balance: '' };
          break;
        }

        try {
          // Test KIE.AI connection by checking account credits
          const response = await fetch('https://api.kie.ai/api/v1/chat/credit', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            }
          });

          const data = await response.json();
          console.log('KIE.AI credit response:', JSON.stringify(data));
          
          if (response.ok && data.code === 200) {
            const credits = data.data;
            result = { 
              success: true, 
              message: 'Подключение успешно', 
              balance: credits !== undefined ? `${credits} кредитов` : 'Доступно'
            };
          } else {
            result = { 
              success: false, 
              message: data.msg || `Ошибка API: ${response.status}`, 
              balance: '' 
            };
          }
        } catch (e: unknown) {
          const errorMessage = e instanceof Error ? e.message : 'Unknown error';
          result = { success: false, message: `Ошибка соединения: ${errorMessage}`, balance: '' };
        }
        break;
      }

      case 'openai': {
        const apiKey = Deno.env.get('OPENAI_API_KEY');
        if (!apiKey) {
          result = { success: false, message: 'API ключ не настроен', balance: '' };
          break;
        }

        try {
          const response = await fetch('https://api.openai.com/v1/models', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${apiKey}`
            }
          });

          if (response.ok) {
            result = { success: true, message: 'Подключение успешно', balance: 'Активно' };
          } else {
            result = { success: false, message: `Ошибка API: ${response.status}`, balance: '' };
          }
        } catch (e: unknown) {
          const errorMessage = e instanceof Error ? e.message : 'Unknown error';
          result = { success: false, message: `Ошибка соединения: ${errorMessage}`, balance: '' };
        }
        break;
      }

      case 'google': {
        const apiKey = Deno.env.get('GOOGLE_AI_API_KEY');
        if (!apiKey) {
          result = { success: false, message: 'API ключ не настроен', balance: '' };
          break;
        }

        try {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`, {
            method: 'GET'
          });

          if (response.ok) {
            result = { success: true, message: 'Подключение успешно', balance: 'Активно' };
          } else {
            result = { success: false, message: `Ошибка API: ${response.status}`, balance: '' };
          }
        } catch (e: unknown) {
          const errorMessage = e instanceof Error ? e.message : 'Unknown error';
          result = { success: false, message: `Ошибка соединения: ${errorMessage}`, balance: '' };
        }
        break;
      }

      case 'cloudpayments': {
        const publicId = Deno.env.get('CLOUDPAYMENTS_PUBLIC_ID');
        const apiSecret = Deno.env.get('CLOUDPAYMENTS_API_SECRET');
        
        if (!publicId || !apiSecret) {
          result = { success: false, message: 'API ключи не настроены', balance: '' };
          break;
        }

        // CloudPayments test endpoint
        try {
          const auth = btoa(`${publicId}:${apiSecret}`);
          const response = await fetch('https://api.cloudpayments.ru/test', {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
          });

          if (response.ok) {
            const data = await response.json();
            result = { 
              success: data.Success === true, 
              message: data.Success ? 'Подключение успешно' : data.Message || 'Ошибка', 
              balance: 'Активно' 
            };
          } else {
            result = { success: false, message: `Ошибка API: ${response.status}`, balance: '' };
          }
        } catch (e: unknown) {
          const errorMessage = e instanceof Error ? e.message : 'Unknown error';
          result = { success: false, message: `Ошибка соединения: ${errorMessage}`, balance: '' };
        }
        break;
      }

      default:
        result = { success: false, message: 'Неизвестный провайдер', balance: '' };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      success: false, 
      message: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
