import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    
    // Extract phone and message from UAZAPI webhook format
    const phone = body?.phone || body?.from || body?.sender;
    const text = body?.text || body?.message || body?.body;

    if (!phone || !text) {
      return new Response(JSON.stringify({ error: "Missing phone or text" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call OpenAI to categorize
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Você é um assistente de TDAH. O usuário enviará um texto. Você deve categorizar em JSON estrito: { "tipo": "ideia" ou "tarefa", "titulo": "resumo curto", "descricao": "descrição completa ou null", "data_hora_agendada": "formato ISO ou null se não houver data", "status": "pendente" }. Se o usuário disser que concluiu algo, retorne: { "acao": "concluir", "titulo_busca": "termo para buscar a tarefa" }. Responda APENAS com o JSON, sem markdown.`,
          },
          { role: "user", content: text },
        ],
        temperature: 0.3,
      }),
    });

    const aiData = await openaiResponse.json();
    const parsed = JSON.parse(aiData.choices[0].message.content);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let confirmMessage = "✅ Anotei no seu painel!";

    if (parsed.acao === "concluir") {
      // Find and update matching task
      const { data: tasks } = await supabase
        .from("itens_cerebro")
        .select("*")
        .eq("user_phone", phone.replace(/\D/g, ""))
        .eq("status", "pendente")
        .ilike("titulo", `%${parsed.titulo_busca}%`)
        .limit(1);

      if (tasks && tasks.length > 0) {
        await supabase
          .from("itens_cerebro")
          .update({ status: "concluida" })
          .eq("id", tasks[0].id);
        confirmMessage = `✅ Tarefa "${tasks[0].titulo}" marcada como concluída!`;
      } else {
        confirmMessage = "🤔 Não encontrei essa tarefa no seu painel.";
      }
    } else {
      // Insert new item
      const { error } = await supabase.from("itens_cerebro").insert({
        user_phone: phone.replace(/\D/g, ""),
        tipo: parsed.tipo,
        titulo: parsed.titulo,
        descricao: parsed.descricao || null,
        data_hora_agendada: parsed.data_hora_agendada || null,
        status: parsed.status || "pendente",
      });

      if (error) throw error;

      confirmMessage = parsed.tipo === "ideia"
        ? `💡 Ideia "${parsed.titulo}" salva no seu painel!`
        : `📋 Tarefa "${parsed.titulo}" criada no seu painel!`;
    }

    // Send confirmation via UAZAPI
    const UAZAPI_URL = Deno.env.get("UAZAPI_URL");
    const UAZAPI_TOKEN = Deno.env.get("UAZAPI_TOKEN");

    if (UAZAPI_URL && UAZAPI_TOKEN) {
      await fetch(`${UAZAPI_URL}/send-message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${UAZAPI_TOKEN}`,
        },
        body: JSON.stringify({
          phone: phone,
          message: confirmMessage,
        }),
      });
    }

    return new Response(JSON.stringify({ success: true, message: confirmMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("whatsapp-recebedor error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
