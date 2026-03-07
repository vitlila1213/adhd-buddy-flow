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
    const { data: userCategories } = await supabase
      .from("categorias")
      .select("id, nome, tipo, cor")
      .eq("user_id", userId);

    const { data: pendingTasks } = await supabase
      .from("itens_cerebro")
      .select("id, titulo, tipo, status, categoria_id")
      .eq("user_id", userId)
      .eq("status", "pendente")
      .order("created_at", { ascending: false })
      .limit(30);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const { data: monthFinances } = await supabase
      .from("financas")
      .select("id, tipo, valor, descricao, status, categoria_id, is_recorrente, created_at, data_vencimento")
      .eq("user_id", userId)
      .gte("created_at", monthStart)
      .order("created_at", { ascending: false });

    // Fetch birthdays
    const { data: aniversariantes } = await supabase
      .from("aniversariantes")
      .select("id, nome, data_aniversario, parentesco")
      .eq("user_id", userId);

    const anivList = (aniversariantes || []).map(a => 
      `- ${a.nome} | ${a.parentesco} | ${a.data_aniversario}`
    ).join("\n");

    const catList = (userCategories || []).map(c => `- ID: ${c.id} | "${c.nome}" (${c.tipo}) | Cor: ${c.cor}`).join("\n");
    const taskList = (pendingTasks || []).map(t => `- ID: ${t.id} | ${t.tipo}: "${t.titulo}"`).join("\n");
    const finList = (monthFinances || []).map(f => {
      const cat = (userCategories || []).find(c => c.id === f.categoria_id);
      return `- ${f.tipo}: R$${f.valor} "${f.descricao || "sem desc"}" [${f.status}] ${cat ? `(${cat.nome})` : ""} ${f.is_recorrente ? "(recorrente)" : ""}`;
    }).join("\n");

    const totalGastos = (monthFinances || []).filter(f => f.tipo === "despesa").reduce((s, f) => s + Number(f.valor), 0);
    const totalReceitas = (monthFinances || []).filter(f => f.tipo === "receita").reduce((s, f) => s + Number(f.valor), 0);

    const spOffset = -3 * 60;
    const spTime = new Date(now.getTime() + spOffset * 60 * 1000);
    const spDate = spTime.toISOString().split("T")[0];
    const spHour = spTime.toISOString().split("T")[1].substring(0, 5);

    const systemPrompt = `Você é o *Cérebro de Bolso* 🧠, um assistente pessoal educado, profissional e detalhista. Use emojis com frequência para tornar a conversa leve e agradável.

PERSONALIDADE:
- Seja educado e profissional. NÃO use termos como "querido(a)", "meu bem", "meu amor" ou similares. Trate o usuário de forma respeitosa e direta.
- Dê respostas DETALHADAS e organizadas com quebras de linha
- Use emojis relacionados ao contexto (🍔 comida, 🚗 transporte, 💼 trabalho, 🎂 aniversário, etc.)
- Quando listar itens, organize de forma clara
- Finalize com uma frase educada oferecendo ajuda

CORES DAS CATEGORIAS:
Cada categoria do usuário tem uma COR personalizada. Ao mencionar uma categoria na resposta, inclua um emoji colorido correspondente.
Use o mapeamento: vermelho=#ef4444→🔴, laranja=#f97316→🟠, amarelo=#f59e0b→🟡, verde=#22c55e→🟢, teal=#14b8a6→🟢, azul=#3b82f6→🔵, indigo=#6366f1→🟣, roxo=#8b5cf6→🟣, rosa=#ec4899→🔴, cinza=#64748b→⚪
Para outras cores, use o emoji mais próximo.

DATA ATUAL: ${spDate} | HORA: ${spHour} (Brasília, UTC-3)

=== CATEGORIAS DO USUÁRIO ===
${catList || "(nenhuma categoria criada ainda)"}

=== TAREFAS PENDENTES ===
${taskList || "(nenhuma tarefa pendente)"}

=== FINANÇAS DO MÊS ===
${finList || "(nenhuma transação no mês)"}
Total gastos: R$${totalGastos.toFixed(2)} | Total receitas: R$${totalReceitas.toFixed(2)} | Saldo: R$${(totalReceitas - totalGastos).toFixed(2)}

=== ANIVERSARIANTES CADASTRADOS ===
${anivList || "(nenhum aniversariante cadastrado)"}

=== INSTRUÇÕES ===
Interprete a mensagem do usuário e retorne ESTRITAMENTE um JSON com:

1. "mensagem_whatsapp": Texto conversacional organizado e educado. Confirme a ação com clareza, mencione a categoria com seu emoji de cor.

FORMATO DE RELATÓRIO (MUITO IMPORTANTE):
Quando o usuário pedir relatório de gastos/finanças, organize OBRIGATORIAMENTE assim, agrupando por categoria com datas e subtotais:

"📊 *Relatório de Gastos — Mês Atual*

🔴 *Alimentação*
 - 04/04/2025: R$ 50,00 (Gasto no iFood)
 - 04/04/2025: R$ 50,00 (Gasto na padaria)
 - *Subtotal: R$ 330,00*

💰 *Total Geral: R$ 480,00*

Se precisar de mais detalhes, estou por aqui! 💙"

2. "db_actions": Array de ações no banco. Cada ação tem:
   - "tabela": "financas", "itens_cerebro", "categorias" ou "aniversariantes"
   - "operacao": "insert", "update" ou "nenhuma"
   - "dados": JSON com os campos exatos

REGRAS PARA ANIVERSARIANTES (MUITO IMPORTANTE):
- Se o usuário mencionar aniversário de alguém (ex: "aniversário do João dia 7 de agosto", "lembra do aniversário da Maria 15/03"), cadastre na tabela "aniversariantes".
- Campos: nome (TEXT), data_aniversario (DATE no formato YYYY-MM-DD), parentesco (TEXT - use "amigo" como padrão se não especificado).
- Parentescos válidos: amigo, amiga, pai, mãe, irmão, irmã, tio, tia, primo, prima, avô, avó, filho, filha, esposo, esposa, namorado, namorada, sogro, sogra, cunhado, cunhada, colega, chefe, outro.
- Se o usuário disser o parentesco (ex: "aniversário do meu pai João"), use-o. Se não, use "amigo".
- Na resposta, confirme o cadastro e informe que lembretes serão enviados automaticamente no dia anterior e no dia do aniversário, às 10:00.
- Exemplo de resposta para cadastro de aniversário:

"🎂 Aniversário registrado! ✅

👨 *João* — Pai
📅 07 de Agosto

Fique tranquilo! Vou te enviar um lembrete no dia *06/08 às 10:00* e outro no dia *07/08 às 10:00* com uma mensagem especial de feliz aniversário pronta para você enviar! 🎉

Se precisar de mais algo, estou por aqui! 💙"

REGRAS GERAIS:
- Se for RELATÓRIO: analise os dados e responda com detalhes por categoria. db_actions = [{"tabela":"","operacao":"nenhuma","dados":{}}]
- Se for CRIAR CATEGORIA: use tabela "categorias". Campos: nome, tipo ("financa" ou "tarefa")
- Se for NOVA DESPESA/RECEITA: classifique na categoria correta. Campos: tipo, valor, descricao, categoria_id, status, is_recorrente
- Se for NOVA TAREFA/IDEIA: Campos: tipo, titulo, descricao, data_hora_agendada (ISO com -03:00 ou null), status ("pendente"), categoria_id
- Se for CONCLUSÃO de tarefa: use "update" com {id, status: "concluida", completed_at: "${now.toISOString()}"}
- Se for marcar finança como PAGA: use "update" com {id, status: "pago"}
- NUNCA insira categorias na tabela itens_cerebro.

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

    // === Execute db_actions ===
    const actions = parsed.db_actions || [];

    // Check if user has Google Calendar connected
    const { data: gcalIntegration } = await supabase
      .from("user_integrations")
      .select("access_token, refresh_token, token_expires_at")
      .eq("user_id", userId)
      .eq("provider", "google_calendar")
      .maybeSingle();

    for (const action of actions) {
      if (!action.tabela || action.operacao === "nenhuma" || !action.dados) continue;

      if (action.operacao === "insert") {
        const insertData: Record<string, unknown> = { ...action.dados, user_id: userId };
        if (action.tabela === "itens_cerebro") {
          insertData.user_phone = userPhone;
        }
        if (action.tabela === "aniversariantes") {
          insertData.user_phone = userPhone;
        }
        delete insertData.id;

        const { error } = await supabase.from(action.tabela).insert(insertData);
        if (error) {
          console.error(`Insert error on ${action.tabela}:`, error);
          throw error;
        }

        // === Google Calendar sync ===
        const scheduledDate = action.dados.data_hora_agendada || action.dados.data_vencimento;
        if (gcalIntegration?.access_token && scheduledDate) {
          try {
            let accessToken = gcalIntegration.access_token;

            // Refresh token if expired
            const expiresAt = gcalIntegration.token_expires_at ? new Date(gcalIntegration.token_expires_at) : null;
            if (expiresAt && expiresAt < new Date() && gcalIntegration.refresh_token) {
              const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
              const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");
              if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
                const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
                  method: "POST",
                  headers: { "Content-Type": "application/x-www-form-urlencoded" },
                  body: new URLSearchParams({
                    client_id: GOOGLE_CLIENT_ID,
                    client_secret: GOOGLE_CLIENT_SECRET,
                    refresh_token: gcalIntegration.refresh_token,
                    grant_type: "refresh_token",
                  }),
                });
                const refreshData = await refreshRes.json();
                if (refreshData.access_token) {
                  accessToken = refreshData.access_token;
                  const newExpiry = new Date(Date.now() + (refreshData.expires_in || 3600) * 1000).toISOString();
                  await supabase.from("user_integrations")
                    .update({ access_token: accessToken, token_expires_at: newExpiry })
                    .eq("user_id", userId)
                    .eq("provider", "google_calendar");
                }
              }
            }

            const startDate = new Date(scheduledDate);
            const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // +1 hour

            const summary = action.dados.titulo || action.dados.descricao || "Compromisso - Cérebro de Bolso";
            const description = action.dados.descricao || action.dados.titulo || "";

            const calendarEvent = {
              summary: `🧠 ${summary}`,
              description: `${description}\n\n— Adicionado pelo Cérebro de Bolso`,
              start: { dateTime: startDate.toISOString(), timeZone: "America/Sao_Paulo" },
              end: { dateTime: endDate.toISOString(), timeZone: "America/Sao_Paulo" },
              reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 30 }] },
            };

            const calRes = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(calendarEvent),
            });

            if (calRes.ok) {
              console.log("✅ Google Calendar event created");
            } else {
              const calErr = await calRes.text();
              console.error("Google Calendar error:", calErr);
            }
          } catch (calError) {
            console.error("Google Calendar sync error:", calError);
          }
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
