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
    
    console.log("=== PAYLOAD RECEBIDO DA UAZAPI ===");
    console.log(JSON.stringify(body, null, 2));

    // Ignorar mensagens enviadas pela API (evitar loop)
    if (body?.message?.wasSentByApi === true || body?.message?.fromMe === true) {
      console.log("Mensagem enviada pela API ou fromMe, ignorando.");
      return new Response(JSON.stringify({ ignored: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const phone = body?.chat?.phone || body?.phone || body?.from || body?.sender || body?.number;
    if (!phone) {
      console.error("Phone ausente");
      return new Response(JSON.stringify({ error: "Missing phone" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPhone = phone.replace(/\D/g, "");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const UAZAPI_URL = Deno.env.get("UAZAPI_URL");
    const UAZAPI_TOKEN = Deno.env.get("UAZAPI_TOKEN");

    if (!OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY não configurada");
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === PASSO 1: Extrair texto (direto ou via transcrição de áudio) ===
    let userText = "";
    const messageType = body?.message?.messageType || body?.message?.type || "";
    const isAudio = messageType.toLowerCase().includes("audio") || 
                    messageType.toLowerCase().includes("ptt") ||
                    (typeof body?.message?.content === "object" && body?.message?.content?.mimetype?.includes("audio"));

    if (isAudio) {
      console.log("=== MENSAGEM DE ÁUDIO DETECTADA ===");
      
      // Baixar áudio via UAZAPI endpoint /message/download
      const messageId = body?.message?.id || body?.message?.messageid;
      if (!messageId || !UAZAPI_URL || !UAZAPI_TOKEN) {
        console.error("Não foi possível baixar áudio: messageId:", messageId, "UAZAPI configurada:", !!(UAZAPI_URL && UAZAPI_TOKEN));
        return new Response(JSON.stringify({ error: "Cannot download audio" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log("Baixando áudio via UAZAPI, messageId:", messageId);
      const downloadUrl = `${UAZAPI_URL}/message/download`;
      const downloadResponse = await fetch(downloadUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "token": UAZAPI_TOKEN,
        },
        body: JSON.stringify({ id: messageId }),
      });

      const downloadResult = await downloadResponse.json();
      console.log("Resposta download UAZAPI (keys):", Object.keys(downloadResult));

      // O resultado pode conter base64 do arquivo ou uma URL direta
      let audioBase64 = downloadResult?.base64 || downloadResult?.data || downloadResult?.file;
      let audioUrl = downloadResult?.url || downloadResult?.URL || downloadResult?.mediaUrl;

      let audioBlob: Blob | null = null;

      if (audioBase64) {
        console.log("Áudio recebido em base64, tamanho:", audioBase64.length);
        // Remover prefixo data:audio/... se existir
        const cleanBase64 = audioBase64.replace(/^data:[^;]+;base64,/, "");
        const binaryString = atob(cleanBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        audioBlob = new Blob([bytes], { type: "audio/ogg" });
      } else if (audioUrl) {
        console.log("Áudio recebido como URL:", audioUrl);
        const audioResponse = await fetch(audioUrl);
        if (audioResponse.ok) {
          audioBlob = await audioResponse.blob();
        } else {
          console.error("Falha ao baixar áudio da URL:", audioResponse.status);
        }
      } else {
        console.error("Formato de resposta de download desconhecido:", JSON.stringify(downloadResult).substring(0, 500));
      }

      if (!audioBlob) {
        // Enviar mensagem informando que não conseguiu processar o áudio
        if (UAZAPI_URL && UAZAPI_TOKEN) {
          await fetch(`${UAZAPI_URL}/send/text`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "token": UAZAPI_TOKEN },
            body: JSON.stringify({
              number: userPhone,
              text: "❌ Não consegui processar seu áudio. Tente enviar como texto!",
            }),
          });
        }
        return new Response(JSON.stringify({ error: "Could not download audio" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // === Transcrever com OpenAI Whisper ===
      console.log("Transcrevendo áudio com Whisper, tamanho:", audioBlob.size);
      const whisperForm = new FormData();
      whisperForm.append("file", audioBlob, "audio.ogg");
      whisperForm.append("model", "whisper-1");
      whisperForm.append("language", "pt");

      const whisperResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: whisperForm,
      });

      const whisperResult = await whisperResponse.json();
      console.log("Resultado Whisper:", JSON.stringify(whisperResult));

      userText = whisperResult?.text || "";
      if (!userText) {
        console.error("Whisper não retornou texto");
        if (UAZAPI_URL && UAZAPI_TOKEN) {
          await fetch(`${UAZAPI_URL}/send/text`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "token": UAZAPI_TOKEN },
            body: JSON.stringify({
              number: userPhone,
              text: "❌ Não entendi seu áudio. Pode repetir ou enviar como texto?",
            }),
          });
        }
        return new Response(JSON.stringify({ error: "Whisper returned empty text" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log("Texto transcrito:", userText);
    } else {
      // Mensagem de texto normal
      userText = body?.message?.text || body?.message?.content || body?.text || body?.textMessage?.text || "";
      
      if (typeof userText !== "string") {
        console.error("Texto não é string:", typeof userText);
        return new Response(JSON.stringify({ error: "Text is not a string" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    console.log("Phone:", userPhone);
    console.log("Texto final para IA:", userText);

    if (!userText) {
      console.error("Texto vazio");
      return new Response(JSON.stringify({ error: "Missing text" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === PASSO 2: Processamento com IA (OpenAI GPT) ===
    const systemPrompt = `Você é o cérebro de um assistente virtual para pessoas com TDAH. O usuário enviará uma mensagem desestruturada ou uma ideia solta. Sua função é extrair a intenção e retornar estritamente um JSON com este formato: { "tipo": "ideia" ou "tarefa", "titulo": "resumo direto ao ponto", "data_hora_agendada": "formato timestamp ISO ou null se não houver data/hora mencionada", "status": "pendente" }. Se o usuário disser que concluiu algo, retorne o status como "concluida".`;

    console.log("Chamando OpenAI GPT...");
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
          { role: "user", content: userText },
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

    // === PASSO 4: Confirmação via UAZAPI ===
    if (UAZAPI_URL && UAZAPI_TOKEN) {
      const confirmMsg = isAudio
        ? `🎙️ Entendi seu áudio!\n✅ Anotado: "${parsed.titulo}"`
        : "✅ Anotado no seu Cérebro de Bolso!";

      const uazapiResponse = await fetch(`${UAZAPI_URL}/send/text`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "token": UAZAPI_TOKEN,
        },
        body: JSON.stringify({
          number: userPhone,
          text: confirmMsg,
        }),
      });

      const uazapiResult = await uazapiResponse.text();
      console.log("Resposta UAZAPI:", uazapiResult);
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
