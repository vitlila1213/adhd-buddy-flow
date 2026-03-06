import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FREE_LIMIT = 10;
const APP_URL = "https://adhd-buddy-flow.lovable.app";

async function sendWhatsApp(url: string, token: string, phone: string, text: string) {
  await fetch(`${url}/send/text`, {
    method: "POST",
    headers: { "Content-Type": "application/json", token },
    body: JSON.stringify({ number: phone, text }),
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    console.log("=== PAYLOAD RECEBIDO ===", JSON.stringify(body, null, 2));

    // Ignorar mensagens do bot
    if (body?.message?.wasSentByApi === true || body?.message?.fromMe === true) {
      return new Response(JSON.stringify({ ignored: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const phone = body?.chat?.phone || body?.phone || body?.from || body?.sender || body?.number;
    if (!phone) {
      return new Response(JSON.stringify({ error: "Missing phone" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPhone = phone.replace(/\D/g, "");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const UAZAPI_URL = Deno.env.get("UAZAPI_URL");
    const UAZAPI_TOKEN = Deno.env.get("UAZAPI_TOKEN");

    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // === BLINDAGEM: Verificar perfil e limites ===
    // Brazilian mobile numbers: UAZAPI may send without the 9th digit (12 digits)
    // but user may have saved with 9 (13 digits), or vice-versa. Try both formats.
    const phoneVariants = [userPhone];
    if (userPhone.length === 12 && userPhone.startsWith("55")) {
      // Add variant with 9: 55XX -> 55XX9
      const withNine = userPhone.slice(0, 4) + "9" + userPhone.slice(4);
      phoneVariants.push(withNine);
    } else if (userPhone.length === 13 && userPhone.startsWith("55")) {
      // Add variant without 9
      const withoutNine = userPhone.slice(0, 4) + userPhone.slice(5);
      phoneVariants.push(withoutNine);
    }

    console.log("Phone variants to search:", phoneVariants);

    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, subscription_status, credits")
      .in("whatsapp_number", phoneVariants)
      .limit(1)
      .single();

    // Regra 1: Não cadastrado
    if (!profileData) {
      console.log("Perfil não encontrado para:", userPhone);
      if (UAZAPI_URL && UAZAPI_TOKEN) {
        await sendWhatsApp(UAZAPI_URL, UAZAPI_TOKEN, userPhone,
          `👋 Olá! Vi que você ainda não tem o Cérebro de Bolso.\nCrie sua conta grátis para começar:\n${APP_URL}`
        );
      }
      return new Response(JSON.stringify({ blocked: "not_registered" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = profileData.id;
    const isPremium = profileData.subscription_status === "active";
    const credits = profileData.credits ?? 0;
    const isUnlimited = credits === -1;

    // Regra 2: Limite free (check credits)
    if (!isPremium && !isUnlimited) {
      if (credits <= 0) {
        console.log("Créditos esgotados para:", userPhone);
        if (UAZAPI_URL && UAZAPI_TOKEN) {
          await sendWhatsApp(UAZAPI_URL, UAZAPI_TOKEN, userPhone,
            `⚠️ Seus créditos gratuitos acabaram!\n\nPara continuar esvaziando sua mente sem limites, assine o plano Premium:\n${APP_URL}/vendas`
          );
        }
        return new Response(JSON.stringify({ blocked: "no_credits" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // === Regra 3: Passagem livre — extrair texto ===
    let userText = "";
    const messageType = body?.message?.messageType || body?.message?.type || "";
    const isAudio = messageType.toLowerCase().includes("audio") ||
                    messageType.toLowerCase().includes("ptt") ||
                    (typeof body?.message?.content === "object" && body?.message?.content?.mimetype?.includes("audio"));

    if (isAudio) {
      console.log("=== ÁUDIO DETECTADO ===");
      const messageId = body?.message?.id || body?.message?.messageid;
      if (!messageId || !UAZAPI_URL || !UAZAPI_TOKEN) {
        return new Response(JSON.stringify({ error: "Cannot download audio" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const downloadResponse = await fetch(`${UAZAPI_URL}/message/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json", token: UAZAPI_TOKEN },
        body: JSON.stringify({ id: messageId }),
      });
      const downloadResult = await downloadResponse.json();

      let audioBase64 = downloadResult?.base64 || downloadResult?.data || downloadResult?.file;
      let audioUrl = downloadResult?.fileURL || downloadResult?.url || downloadResult?.URL || downloadResult?.mediaUrl;
      let audioBlob: Blob | null = null;

      if (audioBase64) {
        const cleanBase64 = audioBase64.replace(/^data:[^;]+;base64,/, "");
        const binaryString = atob(cleanBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
        audioBlob = new Blob([bytes], { type: "audio/ogg" });
      } else if (audioUrl) {
        const audioResponse = await fetch(audioUrl);
        if (audioResponse.ok) audioBlob = await audioResponse.blob();
      }

      if (!audioBlob) {
        if (UAZAPI_URL && UAZAPI_TOKEN) {
          await sendWhatsApp(UAZAPI_URL, UAZAPI_TOKEN, userPhone, "❌ Não consegui processar seu áudio. Tente enviar como texto!");
        }
        return new Response(JSON.stringify({ error: "Could not download audio" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const whisperForm = new FormData();
      whisperForm.append("file", audioBlob, "audio.ogg");
      whisperForm.append("model", "whisper-1");
      whisperForm.append("language", "pt");

      const whisperResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: whisperForm,
      });
      const whisperResult = await whisperResponse.json();
      userText = whisperResult?.text || "";

      if (!userText) {
        if (UAZAPI_URL && UAZAPI_TOKEN) {
          await sendWhatsApp(UAZAPI_URL, UAZAPI_TOKEN, userPhone, "❌ Não entendi seu áudio. Pode repetir ou enviar como texto?");
        }
        return new Response(JSON.stringify({ error: "Whisper returned empty text" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      userText = body?.message?.text || body?.message?.content || body?.text || body?.textMessage?.text || "";
      if (typeof userText !== "string") {
        return new Response(JSON.stringify({ error: "Text is not a string" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (!userText) {
      return new Response(JSON.stringify({ error: "Missing text" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === IA (OpenAI GPT) ===
    // Calcular data/hora atual em São Paulo (UTC-3) para o prompt
    const nowUtc = new Date();
    const spOffset = -3 * 60; // UTC-3 em minutos
    const spTime = new Date(nowUtc.getTime() + spOffset * 60 * 1000);
    const spDate = spTime.toISOString().split("T")[0]; // YYYY-MM-DD
    const spHour = spTime.toISOString().split("T")[1].substring(0, 5); // HH:MM
    
    // Fetch existing pending tasks for context so AI can match completions
    const { data: pendingTasks } = await supabase
      .from("itens_cerebro")
      .select("id, titulo, tipo")
      .eq("user_id", userId)
      .eq("status", "pendente")
      .order("created_at", { ascending: false })
      .limit(20);

    const taskListForPrompt = (pendingTasks || []).map(t => `- ID: ${t.id} | ${t.tipo}: "${t.titulo}"`).join("\n");

    const systemPrompt = `Você é o cérebro de um assistente virtual para pessoas com TDAH. O usuário enviará uma mensagem desestruturada ou uma ideia solta. Sua função é extrair a intenção e retornar estritamente um JSON.

REGRA PRINCIPAL DE CONCLUSÃO: Se o usuário disser que JÁ FEZ, JÁ CONCLUIU, JÁ LIGOU, JÁ RESOLVEU algo, você DEVE procurar na lista de tarefas pendentes abaixo qual tarefa corresponde e retornar:
{ "acao": "concluir", "task_id": "ID da tarefa encontrada", "titulo": "titulo original da tarefa" }

Lista de tarefas/ideias pendentes do usuário:
${taskListForPrompt || "(nenhuma tarefa pendente)"}

Se NÃO for uma conclusão, retorne uma NOVA entrada:
{ "acao": "criar", "tipo": "ideia" ou "tarefa", "titulo": "resumo direto ao ponto", "data_hora_agendada": "formato timestamp ISO ou null", "status": "pendente" }

REGRAS DE FUSO HORÁRIO (OBRIGATÓRIO): 1) O fuso horário do usuário é SEMPRE America/Sao_Paulo (UTC-3). 2) A data de HOJE em São Paulo é ${spDate} e agora são ${spHour} (horário de Brasília). 3) Todos os horários mencionados pelo usuário já estão em horário de Brasília. 4) O campo data_hora_agendada DEVE usar o offset -03:00. Exemplo: se o usuário diz "amanhã às 9h", e hoje é ${spDate}, retorne a data de amanhã com "T09:00:00-03:00". NUNCA use UTC (Z ou +00:00).`;

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
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
    const aiContent = aiData.choices?.[0]?.message?.content;
    if (!aiContent) throw new Error("Empty response from OpenAI");

    const cleanedContent = aiContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleanedContent);

    // === Salvar ou Concluir ===
    if (parsed.acao === "concluir" && parsed.task_id) {
      // Update existing task to completed
      const { error: updateError } = await supabase
        .from("itens_cerebro")
        .update({ status: "concluida", completed_at: new Date().toISOString() })
        .eq("id", parsed.task_id)
        .eq("user_id", userId);

      if (updateError) throw updateError;

      if (UAZAPI_URL && UAZAPI_TOKEN) {
        await sendWhatsApp(UAZAPI_URL, UAZAPI_TOKEN, userPhone,
          `✅ Tarefa concluída: "${parsed.titulo}"\n\nMandou bem! 🎉`
        );
      }
    } else {
      // Create new item
      const { error: insertError } = await supabase.from("itens_cerebro").insert({
        user_phone: userPhone,
        user_id: userId,
        tipo: parsed.tipo || "tarefa",
        titulo: parsed.titulo,
        descricao: parsed.descricao || null,
        data_hora_agendada: parsed.data_hora_agendada || null,
        status: parsed.status || "pendente",
      });

      if (insertError) throw insertError;

      // Decrementar créditos se não for premium/ilimitado
      if (!isPremium && !isUnlimited && credits > 0) {
        await supabase
          .from("profiles")
          .update({ credits: credits - 1 })
          .eq("id", userId);
      }

      if (UAZAPI_URL && UAZAPI_TOKEN) {
        const confirmMsg = isAudio
          ? `🎙️ Entendi seu áudio!\n✅ Anotado: "${parsed.titulo}"`
          : `✅ Anotado no seu Cérebro de Bolso!`;
        await sendWhatsApp(UAZAPI_URL, UAZAPI_TOKEN, userPhone, confirmMsg);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("whatsapp-recebedor error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
