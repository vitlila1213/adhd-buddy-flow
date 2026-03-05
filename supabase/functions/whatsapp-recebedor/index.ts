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
    
    // Log completo do payload para debug do formato UAZAPI
    console.log("=== PAYLOAD RECEBIDO DA UAZAPI ===");
    console.log(JSON.stringify(body, null, 2));

    // Extrair telefone e texto do payload UAZAPI
    // UAZAPI envia: body.chat.phone e body.message.text (ou body.message.content)
    const phone = body?.chat?.phone || body?.phone || body?.from || body?.sender || body?.number;
    const text = body?.message?.text || body?.message?.content || body?.text || body?.textMessage?.text;

    // Ignorar mensagens enviadas pela API (evitar loop)
    if (body?.message?.wasSentByApi === true || body?.message?.fromMe === true) {
      console.log("Mensagem enviada pela API ou fromMe, ignorando.");
      return new Response(JSON.stringify({ ignored: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Phone extraído:", phone);
    console.log("Texto extraído:", text);

    if (!phone || !text) {
      console.error("Campos ausentes - phone:", phone, "text:", text);
      return new Response(JSON.stringify({ error: "Missing phone or text" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Limpar número de telefone (apenas dígitos)
    const userPhone = phone.replace(/\D/g, "");

    // === PASSO 2: Processamento com IA (OpenAI) ===
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY não configurada");
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Você é o cérebro de um assistente virtual para pessoas com TDAH. O usuário enviará uma mensagem desestruturada ou uma ideia solta. Sua função é extrair a intenção e retornar estritamente um JSON com este formato: { "tipo": "ideia" ou "tarefa", "titulo": "resumo direto ao ponto", "data_hora_agendada": "formato timestamp ISO ou null se não houver data/hora mencionada", "status": "pendente" }. Se o usuário disser que concluiu algo, retorne o status como "concluida".`;

    console.log("Chamando OpenAI...");
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text },
        ],
        temperature: 0.3,
      }),
    });

    const aiData = await openaiResponse.json();
    console.log("Resposta OpenAI:", JSON.stringify(aiData, null, 2));

    const aiContent = aiData.choices?.[0]?.message?.content;
    if (!aiContent) {
      console.error("Resposta vazia da OpenAI");
      throw new Error("Empty response from OpenAI");
    }

    // Limpar possíveis markdown code blocks da resposta
    const cleanedContent = aiContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleanedContent);
    console.log("JSON parseado da IA:", JSON.stringify(parsed, null, 2));

    // === PASSO 3: Salvar no Banco (Supabase) ===
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: insertData, error: insertError } = await supabase.from("itens_cerebro").insert({
      user_phone: userPhone,
      tipo: parsed.tipo,
      titulo: parsed.titulo,
      descricao: parsed.descricao || null,
      data_hora_agendada: parsed.data_hora_agendada || null,
      status: parsed.status || "pendente",
    }).select();

    if (insertError) {
      console.error("Erro ao inserir no banco:", insertError);
      throw insertError;
    }

    console.log("Item inserido com sucesso:", JSON.stringify(insertData, null, 2));

    // === PASSO 4: Aviso de Sucesso via UAZAPI ===
    const UAZAPI_URL = Deno.env.get("UAZAPI_URL");
    const UAZAPI_INSTANCE = Deno.env.get("UAZAPI_INSTANCE");
    const UAZAPI_TOKEN = Deno.env.get("UAZAPI_TOKEN");

    if (UAZAPI_URL && UAZAPI_INSTANCE && UAZAPI_TOKEN) {
      const sendUrl = `${UAZAPI_URL}/message/sendText/${UAZAPI_INSTANCE}`;
      console.log("Enviando confirmação via UAZAPI para:", userPhone, "URL:", sendUrl);

      const uazapiResponse = await fetch(sendUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": UAZAPI_TOKEN,
        },
        body: JSON.stringify({
          number: userPhone,
          text: "✅ Anotado no seu Cérebro de Bolso!",
        }),
      });

      const uazapiResult = await uazapiResponse.text();
      console.log("Resposta UAZAPI:", uazapiResult);
    } else {
      console.warn("UAZAPI não configurada completamente. URL:", UAZAPI_URL, "INSTANCE:", UAZAPI_INSTANCE, "TOKEN:", !!UAZAPI_TOKEN);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
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
