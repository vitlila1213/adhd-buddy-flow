import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // === Find user profile ===
    const phoneVariants = [userPhone];
    if (userPhone.length === 12 && userPhone.startsWith("55")) {
      phoneVariants.push(userPhone.slice(0, 4) + "9" + userPhone.slice(4));
    } else if (userPhone.length === 13 && userPhone.startsWith("55")) {
      phoneVariants.push(userPhone.slice(0, 4) + userPhone.slice(5));
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, subscription_status, credits")
      .in("whatsapp_number", phoneVariants)
      .limit(1)
      .single();

    if (!profileData) {
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

    // Credit check
    if (!isPremium && !isUnlimited && credits <= 0) {
      if (UAZAPI_URL && UAZAPI_TOKEN) {
        await sendWhatsApp(UAZAPI_URL, UAZAPI_TOKEN, userPhone,
          `⚠️ Seus créditos gratuitos acabaram!\nAssine o Premium:\n${APP_URL}/vendas`
        );
      }
      return new Response(JSON.stringify({ blocked: "no_credits" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === Extract text (audio or text) ===
    let userText = "";
    const messageType = body?.message?.messageType || body?.message?.type || "";
    const isAudio = messageType.toLowerCase().includes("audio") ||
                    messageType.toLowerCase().includes("ptt") ||
                    (typeof body?.message?.content === "object" && body?.message?.content?.mimetype?.includes("audio"));

    if (isAudio) {
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

    // === PASSO B: Context Injection (RAG) ===
    // Fetch user categories
    const { data: userCategories } = await supabase
      .from("categorias")
      .select("id, nome, tipo")
      .eq("user_id", userId);

    // Fetch pending tasks
    const { data: pendingTasks } = await supabase
      .from("itens_cerebro")
      .select("id, titulo, tipo, status, categoria_id")
      .eq("user_id", userId)
      .eq("status", "pendente")
      .order("created_at", { ascending: false })
      .limit(30);

    // Fetch current month finances
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const { data: monthFinances } = await supabase
      .from("financas")
      .select("id, tipo, valor, descricao, status, categoria_id, is_recorrente, created_at, data_vencimento")
      .eq("user_id", userId)
      .gte("created_at", monthStart)
      .order("created_at", { ascending: false });

    // Build context string
    const catList = (userCategories || []).map(c => `- ID: ${c.id} | "${c.nome}" (${c.tipo})`).join("\n");
    const taskList = (pendingTasks || []).map(t => `- ID: ${t.id} | ${t.tipo}: "${t.titulo}"`).join("\n");
    const finList = (monthFinances || []).map(f => {
      const cat = (userCategories || []).find(c => c.id === f.categoria_id);
      return `- ${f.tipo}: R$${f.valor} "${f.descricao || "sem desc"}" [${f.status}] ${cat ? `(${cat.nome})` : ""} ${f.is_recorrente ? "(recorrente)" : ""}`;
    }).join("\n");

    const totalGastos = (monthFinances || []).filter(f => f.tipo === "despesa").reduce((s, f) => s + Number(f.valor), 0);
    const totalReceitas = (monthFinances || []).filter(f => f.tipo === "receita").reduce((s, f) => s + Number(f.valor), 0);

    // Timezone
    const spOffset = -3 * 60;
    const spTime = new Date(now.getTime() + spOffset * 60 * 1000);
    const spDate = spTime.toISOString().split("T")[0];
    const spHour = spTime.toISOString().split("T")[1].substring(0, 5);

    // === PASSO C: OpenAI call with full context ===
    const systemPrompt = `Você é um Assistente Pessoal humano, carismático e prestativo (use emojis com moderação). O usuário enviou uma mensagem pelo WhatsApp. Sua missão é interpretar o pedido e agir.

DATA ATUAL: ${spDate} | HORA: ${spHour} (Brasília, UTC-3)

=== CATEGORIAS DO USUÁRIO ===
${catList || "(nenhuma categoria criada ainda)"}

=== TAREFAS PENDENTES ===
${taskList || "(nenhuma tarefa pendente)"}

=== FINANÇAS DO MÊS ===
${finList || "(nenhuma transação no mês)"}
Total gastos: R$${totalGastos.toFixed(2)} | Total receitas: R$${totalReceitas.toFixed(2)} | Saldo: R$${(totalReceitas - totalGastos).toFixed(2)}

=== INSTRUÇÕES ===
Interprete a mensagem do usuário e retorne ESTRITAMENTE um JSON com:

1. "mensagem_whatsapp": Texto conversacional e amigável que será enviado de volta ao usuário confirmando a ação ou respondendo a pergunta/relatório solicitado. Seja natural e humano.

2. "db_actions": Array de ações no banco. Cada ação tem:
   - "tabela": "financas" ou "itens_cerebro"
   - "operacao": "insert", "update" ou "nenhuma"
   - "dados": JSON com os campos exatos

REGRAS:
- Se for RELATÓRIO (ex: "quanto gastei?", "como estão minhas finanças?"): analise os dados acima e responda na mensagem_whatsapp. db_actions = [{"tabela":"","operacao":"nenhuma","dados":{}}]
- Se for NOVA DESPESA/RECEITA: classifique na categoria correta (use o categoria_id). Se não houver categoria adequada, use null.
  Campos da tabela financas: tipo ("receita"/"despesa"), valor, descricao, categoria_id, status ("pago"/"pendente"), is_recorrente (boolean)
- Se for NOVA TAREFA/IDEIA: classifique na categoria correta.
  Campos da tabela itens_cerebro: tipo ("tarefa"/"ideia"), titulo, descricao, data_hora_agendada (ISO com -03:00 ou null), status ("pendente"), categoria_id
- Se for CONCLUSÃO de tarefa existente: use operacao "update" com os dados {id: "task_id", status: "concluida", completed_at: "${now.toISOString()}"}
- Se for marcar finança como PAGA: use operacao "update" com {id: "financa_id", status: "pago"}

REGRAS DE HORÁRIO (CRÍTICO):
- "2h da manhã"/"2h da madrugada" = 02:00. "2h da tarde" = 14:00.
- Sem contexto: 1h-6h = madrugada. 7h-12h = manhã. NUNCA some 12 automaticamente.
- Use sempre offset -03:00 no timestamp.

Retorne APENAS o JSON, sem markdown, sem backticks.`;

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

    console.log("=== AI PARSED ===", JSON.stringify(parsed, null, 2));

    // === PASSO D: Execute db_actions ===
    const actions = parsed.db_actions || [];
    for (const action of actions) {
      if (!action.tabela || action.operacao === "nenhuma" || !action.dados) continue;

      if (action.operacao === "insert") {
        const insertData = { ...action.dados, user_id: userId, user_phone: userPhone };
        // Remove fields that shouldn't be in the insert
        delete insertData.id;

        const { error } = await supabase.from(action.tabela).insert(insertData);
        if (error) {
          console.error(`Insert error on ${action.tabela}:`, error);
          throw error;
        }
      } else if (action.operacao === "update") {
        const { id, ...updateData } = action.dados;
        if (!id) continue;

        const { error } = await supabase
          .from(action.tabela)
          .update(updateData)
          .eq("id", id)
          .eq("user_id", userId);
        if (error) {
          console.error(`Update error on ${action.tabela}:`, error);
          throw error;
        }
      }
    }

    // Decrement credits if not premium
    if (!isPremium && !isUnlimited && credits > 0) {
      await supabase.from("profiles").update({ credits: credits - 1 }).eq("id", userId);
    }

    // Send WhatsApp response
    if (UAZAPI_URL && UAZAPI_TOKEN && parsed.mensagem_whatsapp) {
      await sendWhatsApp(UAZAPI_URL, UAZAPI_TOKEN, userPhone, parsed.mensagem_whatsapp);
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
