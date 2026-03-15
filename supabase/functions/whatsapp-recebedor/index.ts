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

    // === Detect message type: text, audio, or image ===
    let userText = "";
    let imageBase64: string | null = null;
    const messageType = body?.message?.messageType || body?.message?.type || "";
    const isAudio = messageType.toLowerCase().includes("audio") ||
                    messageType.toLowerCase().includes("ptt") ||
                    (typeof body?.message?.content === "object" && body?.message?.content?.mimetype?.includes("audio"));
    const isImage = messageType.toLowerCase().includes("image") ||
                    messageType.toLowerCase().includes("document") ||
                    (typeof body?.message?.content === "object" && body?.message?.content?.mimetype?.includes("image"));

    if (isAudio) {
      // === AUDIO PROCESSING ===
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
    } else if (isImage) {
      // === IMAGE PROCESSING ===
      const messageId = body?.message?.id || body?.message?.messageid;
      if (!messageId || !UAZAPI_URL || !UAZAPI_TOKEN) {
        return new Response(JSON.stringify({ error: "Cannot download image" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const downloadResponse = await fetch(`${UAZAPI_URL}/message/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json", token: UAZAPI_TOKEN },
        body: JSON.stringify({ id: messageId }),
      });
      const downloadResult = await downloadResponse.json();

      let rawBase64 = downloadResult?.base64 || downloadResult?.data || downloadResult?.file;
      let imgUrl = downloadResult?.fileURL || downloadResult?.url || downloadResult?.URL || downloadResult?.mediaUrl;

      if (rawBase64) {
        imageBase64 = rawBase64.replace(/^data:[^;]+;base64,/, "");
      } else if (imgUrl) {
        const imgResponse = await fetch(imgUrl);
        if (imgResponse.ok) {
          const imgBuffer = await imgResponse.arrayBuffer();
          const bytes = new Uint8Array(imgBuffer);
          let binary = "";
          for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
          imageBase64 = btoa(binary);
        }
      }

      if (!imageBase64) {
        if (UAZAPI_URL && UAZAPI_TOKEN) {
          await sendWhatsApp(UAZAPI_URL, UAZAPI_TOKEN, userPhone, "❌ Não consegui processar sua imagem. Tente enviar novamente!");
        }
        return new Response(JSON.stringify({ error: "Could not download image" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Caption text that may accompany the image
      userText = body?.message?.caption || body?.message?.text || body?.message?.content?.caption || "Analise esta imagem.";
    } else {
      // === TEXT PROCESSING ===
      const rawText = body?.message?.text || body?.text || body?.textMessage?.text || "";
      const rawContent = body?.message?.content;
      
      if (typeof rawText === "string" && rawText.length > 0) {
        userText = rawText;
      } else if (typeof rawContent === "string" && rawContent.length > 0) {
        userText = rawContent;
      } else if (typeof rawContent === "object" && rawContent?.text) {
        userText = String(rawContent.text);
      } else if (body?.message?.conversation) {
        userText = String(body.message.conversation);
      } else {
        console.log("=== TEXT EXTRACTION FAILED ===", JSON.stringify({ rawText, rawContent, messageType }));
        userText = "";
      }
    }

    if (!userText && !imageBase64) {
      return new Response(JSON.stringify({ error: "Missing text or image" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === Context Injection (RAG) ===
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
      return `- ID: ${f.id} | ${f.tipo}: R$${f.valor} "${f.descricao || "sem desc"}" [${f.status}] ${cat ? `(${cat.nome})` : ""} ${f.is_recorrente ? "(recorrente)" : ""} ${f.data_vencimento ? `venc: ${f.data_vencimento}` : ""}`;
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

=== COMPREENSÃO DE LINGUAGEM (CRÍTICO) ===
Você DEVE entender QUALQUER forma de escrita do usuário, incluindo:
- Gírias brasileiras: "mlk"=menino/filho, "coroa"=mãe/pai, "conto"=reais, "treta"=problema, "mano"=amigo, "po"=poxa, "hj"=hoje, "amanha"=amanhã, "dps"=depois, "blz"=beleza, "tmb"=também, "qnd"=quando, "pq"=porque, "vc"=você, "td"=tudo, "vdd"=verdade, "msg"=mensagem, "qto"=quanto, "grana"=dinheiro, "bufunfa"=dinheiro, "trampo"=trabalho, "rolê"=passeio/compromisso
- Abreviações: "net"=internet, "cel"=celular, "med"=médico, "dentist"=dentista, "acad"=academia, "merc"=mercado
- Erros de digitação e acentuação: "nao"=não, "eh"=é, "ta"=está, "to"=estou, "vou"=vou, "pra"=para, "pro"=para o
- Linguagem informal: "bora"=vamos, "firmeza"=ok, "suave"=tranquilo, "dale"=ok/vamos
- Spanglish e palavras em inglês: "meeting", "deadline", "gym", "shopping", "call"
- Mensagens em QUALQUER idioma (inglês, espanhol, etc.) — interprete e responda em português
- Números escritos por extenso ou abreviados: "5 conto"=R$5, "cem pila"=R$100

CORES DAS CATEGORIAS:
Cada categoria do usuário tem uma COR personalizada. Ao mencionar uma categoria na resposta, inclua um emoji colorido correspondente.
Use o mapeamento: vermelho=#ef4444→🔴, laranja=#f97316→🟠, amarelo=#f59e0b→🟡, verde=#22c55e→🟢, teal=#14b8a6→🟢, azul=#3b82f6→🔵, indigo=#6366f1→🟣, roxo=#8b5cf6→🟣, rosa=#ec4899→🔴, cinza=#64748b→⚪
Para outras cores, use o emoji mais próximo.

DATA ATUAL: ${spDate} | HORA: ${spHour} (Brasília, UTC-3)

=== CATEGORIAS DO USUÁRIO ===
${catList || "(nenhuma categoria criada ainda)"}

=== TAREFAS PENDENTES ===
${taskList || "(nenhuma tarefa pendente)"}

=== FINANÇAS DO MÊS (com IDs) ===
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

=== LEMBRETES E "ME LEMBRA" (CRÍTICO) ===
Quando o usuário pedir para ser LEMBRADO de algo (ex: "me lembra", "me avisa", "não me deixa esquecer", "lembra de", "po lembra", "me manda msg amanha sobre"):
- SEMPRE crie uma tarefa na tabela "itens_cerebro" com tipo="tarefa", status="pendente"
- SEMPRE defina data_hora_agendada com a data/hora do lembrete
- Se o usuário disser "amanhã de manhã", use amanhã às 08:00
- Se disser "amanhã", use amanhã às 09:00
- Se disser "depois", use hoje +2h
- Se disser "mais tarde", use hoje +3h
- Se disser "de noite", use hoje às 20:00
- Se for um lembrete de pagamento (pagar conta, pagar boleto), TAMBÉM crie a finança como pendente
- Associe à categoria mais relevante se existir

=== VISÃO COMPUTACIONAL / LEITURA DE IMAGENS ===
Se o usuário enviar uma IMAGEM, aja como um Leitor Financeiro Inteligente. Analise a imagem e identifique:

⚠️ REGRA CRÍTICA DE LEITURA DE VALORES — LEIA COM EXTREMA ATENÇÃO ⚠️
- Procure o campo "TOTAL A PAGAR", "VALOR TOTAL", "TOTAL" ou similar na imagem.
- SOLETRE o valor dígito por dígito antes de converter. Ex: se vê "R$91,53", soletre: "9", "1", vírgula, "5", "3" = 91.53
- Em moeda brasileira: PONTO = separador de MILHARES, VÍRGULA = separador de CENTAVOS.
  Exemplo: "R$ 1.234,56" = 1234.56 (mil duzentos e trinta e quatro reais).
- ⚠️ NÃO adicione dígitos que não existem na imagem!
  "R$ 91,53" → 91.53 (2 dígitos antes da vírgula). NÃO é 991.53 (3 dígitos)!
  "R$ 91,53" tem EXATAMENTE 2 dígitos antes da vírgula: "9" e "1".
- Se a imagem mostra "R$91,53" no campo TOTAL A PAGAR, o valor é NOVENTA E UM reais e cinquenta e três centavos = 91.53
- VALIDAÇÃO: Contas residenciais (água, luz, internet, gás) normalmente custam entre R$30 e R$500. Se o valor extraído for >500, RELEIA o campo TOTAL A PAGAR contando cada dígito.
- Na dúvida entre dois valores, escolha o que está no campo "TOTAL A PAGAR" ou "VALOR A PAGAR".

⚠️ REGRA CRÍTICA: GASTO vs CONTA/BOLETO ⚠️
PRIMEIRO determine o TIPO do documento:
- CONTA/BOLETO = documento de cobrança que mostra DATA DE VENCIMENTO e ainda NÃO foi pago. Exemplos: conta de água (Copasa, Sabesp), conta de luz (Cemig, Enel), conta de internet (Vero, Claro, NET), conta de telefone, boleto bancário, fatura de cartão.
  → Estes SEMPRE vão como status="pendente" com a data de vencimento extraída.
- GASTO/RECIBO = comprovante de algo JÁ PAGO. Exemplos: nota fiscal, cupom fiscal, comprovante de pagamento, recibo, extrato mostrando débito já realizado.
  → Estes vão como status="pago".

SE O DOCUMENTO TEM "VENCIMENTO", "DATA LIMITE", "PAGAR ATÉ" → É CONTA/BOLETO → status="pendente"
SE O DOCUMENTO TEM "COMPROVANTE", "RECIBO", "PAGO EM" → É GASTO → status="pago"

A) Se for um GASTO (nota fiscal, recibo, cupom fiscal, comprovante de pagamento JÁ REALIZADO):
   - Extraia o valor total e o nome do estabelecimento/local.
   - Gere uma ação de insert na tabela "financas" com: tipo="despesa", status="pago", descricao="<nome do local>", valor=<valor extraído>, data_vencimento="<data de hoje ${spDate}T12:00:00-03:00>".
   - Classifique na categoria mais adequada do usuário (ex: Alimentação, Transporte).
   - Responda: "🧾 Identifiquei um gasto de R$ XX,XX em <local>! Já registrei como pago. ✅"

B) Se for uma CONTA ou BOLETO (conta de luz, água, internet, telefone, boleto bancário — cobrança AINDA NÃO PAGA):
   - Identifique o tipo de conta ou nome da empresa (ex: "Cemig", "Vero", "Sabesp", "Copasa").
   - Extraia o valor exato do campo "TOTAL A PAGAR" e a DATA DE VENCIMENTO.
   ⚠️ EXTRAÇÃO DE DATA DE VENCIMENTO (OBRIGATÓRIO):
   - Procure na imagem por campos como "VENCIMENTO", "DATA VENCIMENTO", "VENCE EM", "PAGAR ATÉ", "DATA LIMITE DE PAGAMENTO".
   - A data DEVE ser extraída e convertida para formato ISO: YYYY-MM-DDT12:00:00-03:00
   - Exemplo: se vencimento é "09/03/2026", o campo data_vencimento DEVE ser "2026-03-09T12:00:00-03:00"
   - Se o ano não aparecer na imagem, use o ano atual (${spDate.split("-")[0]}).
   - NUNCA deixe data_vencimento como null quando o documento claramente mostra uma data de vencimento!
   - Gere uma ação de insert na tabela "financas" com: tipo="despesa", status="pendente", descricao="Conta <tipo/nome da empresa>", valor=<valor>, data_vencimento="<data ISO extraída>".
   - Na mensagem_whatsapp, SEMPRE mencione a data de vencimento formatada: "🧾 Li sua conta de <tipo> no valor de R$ XX,XX. *Vencimento: DD/MM/AAAA*. Registrei como pendente e vou te lembrar! 📅"

C) Se a imagem não for financeira, descreva o que vê e pergunte como pode ajudar.

=== BAIXA DE PAGAMENTO ===
Se o usuário disser que PAGOU uma conta (ex: "paguei a vero", "conta de luz paga", "paguei o boleto da internet"):
- Procure nas FINANÇAS DO MÊS acima qual despesa pendente corresponde (pelo nome/descrição).
- Use o ID dessa despesa para gerar uma ação de "update" na tabela "financas" com {id: "<id encontrado>", status: "pago"}.
- Responda celebrando: "✅ Conta paga! Boa organização! 🎉💪 Menos uma pendência!"
- Se houver mais de uma possível, pergunte qual especificamente.
- Se não encontrar nenhuma pendente correspondente, avise que não encontrou e pergunte mais detalhes.

REGRAS PARA ANIVERSARIANTES (MUITO IMPORTANTE):
- Se o usuário mencionar aniversário de alguém (ex: "aniversário do João dia 7 de agosto", "lembra do aniversário da Maria 15/03"), cadastre na tabela "aniversariantes".
- Campos: nome (TEXT), data_aniversario (DATE no formato YYYY-MM-DD), parentesco (TEXT - use "amigo" como padrão se não especificado).
- Parentescos válidos: amigo, amiga, pai, mãe, irmão, irmã, tio, tia, primo, prima, avô, avó, filho, filha, esposo, esposa, namorado, namorada, sogro, sogra, cunhado, cunhada, colega, chefe, outro.
- Se o usuário disser o parentesco (ex: "aniversário do meu pai João"), use-o. Se não, use "amigo".
- Gírias de parentesco: "coroa"=mãe/pai, "véio"=pai, "véia"=mãe, "moleque/mlk"=filho, "brother/mano"=amigo, "patroa"=esposa, "mozão"=namorado(a)
- Na resposta, confirme o cadastro e informe que lembretes serão enviados automaticamente no dia anterior e no dia do aniversário, às 10:00.

=== CRÉDITO vs DÉBITO (CRÍTICO) ===
Se o usuário disser que comprou algo no CRÉDITO (ex: "gastei 50 no crédito", "comprei no cartão de crédito", "passei no crédito"):
- Registre como tipo="despesa", status="pendente" (porque ainda vai ser cobrado na fatura).
- Responda: "💳 Registrei R$ XX,XX no crédito como pendente — vai entrar na fatura! 📋"

Se o usuário disser que comprou algo no DÉBITO (ex: "gastei 50 no débito", "paguei no débito", "passei no débito"):
- Registre como tipo="despesa", status="pago" (porque já saiu da conta na hora).
- Responda: "💳 Registrei R$ XX,XX no débito como pago — já saiu da conta! ✅"

Se o usuário não mencionar crédito nem débito, siga as regras normais de classificação.

REGRAS GERAIS:
- Se for RELATÓRIO: analise os dados e responda com detalhes por categoria. db_actions = [{"tabela":"","operacao":"nenhuma","dados":{}}]
- Se for CRIAR CATEGORIA: use tabela "categorias". Campos: nome, tipo ("financa" ou "tarefa")
- Se for NOVA DESPESA/RECEITA: classifique na categoria correta. Campos: tipo, valor, descricao, categoria_id, status, is_recorrente
- Se for NOVA TAREFA: tipo="tarefa". Campos: tipo, titulo, descricao, data_hora_agendada (ISO com -03:00 ou null), status ("pendente"), categoria_id
- Se for ANOTAÇÃO/IDEIA/NOTA/RECADO ou qualquer mensagem que NÃO seja tarefa, finança, categoria ou aniversário: tipo="ideia". Campos: tipo="ideia", titulo, descricao, status="pendente", categoria_id: null
  Exemplos de anotações: "preciso otimizar a ferramenta", "lembrar de comprar presente", "ideia para projeto novo", "anotar que fulano ligou"
  QUALQUER mensagem que não se encaixe claramente como tarefa com prazo, finança ou aniversário DEVE ser salva como anotação (tipo="ideia").
- Se for CONCLUSÃO de tarefa: SOMENTE marque como concluída se o usuário EXPLICITAMENTE disser que TERMINOU/CONCLUIU/FEZ a tarefa.
   O usuário DEVE usar palavras como: "fiz", "terminei", "concluí", "feito", "pronto", "acabei", "finalizei", "tá feito", "done", "já fui", "já fiz", "pode concluir", "já comprei", "já paguei".
   ⚠️ NUNCA marque uma tarefa como concluída apenas porque o usuário MENCIONOU palavras similares ao título da tarefa!
   Exemplo: se existe tarefa "otimizar ferramenta" e o usuário diz "preciso otimizar ferramenta paulo" → isso é uma NOVA ANOTAÇÃO, NÃO é conclusão da tarefa!
   ✅ Para concluir uma tarefa, gere db_action: {tabela: "itens_cerebro", operacao: "update", dados: {id: "<ID da tarefa>", status: "concluida"}}
   Responda celebrando: "✅ Tarefa concluída! Boa! 🎉💪"
   Se houver mais de uma tarefa que pode corresponder, PERGUNTE qual delas o usuário completou.

=== REAGENDAMENTO DE TAREFAS/COMPROMISSOS (CRÍTICO) ===
Quando o usuário pedir para REAGENDAR uma tarefa ou compromisso (ex: "reagenda a reunião pra sexta", "muda o horário do dentista pra 15h", "adia a tarefa X pra amanhã", "remarca", "empurra", "transfere pra outro dia", "muda a data"):
- Identifique qual tarefa pendente corresponde ao pedido (use os IDs das TAREFAS PENDENTES acima).
- Gere db_action: {tabela: "itens_cerebro", operacao: "update", dados: {id: "<ID>", data_hora_agendada: "<nova data ISO com -03:00>"}}
- Na resposta, confirme a mudança: "📅 Reagendei *<nome da tarefa>* para <nova data formatada>! ✅"
- Se houver mais de uma tarefa que pode corresponder, PERGUNTE qual delas o usuário quer reagendar.
- Se o usuário não especificar horário no reagendamento, mantenha o horário original (só mude o dia). Se não havia horário, use 09:00.
- Palavras-chave: "reagendar", "reagenda", "remarcar", "remarca", "adiar", "adia", "empurrar", "empurra", "mudar data", "muda a data", "transferir", "mover pra", "joga pra", "passa pra"

- Se for marcar finança como PAGA: use "update" com {id, status: "pago"}
- NUNCA insira categorias na tabela itens_cerebro.
- Ao criar tarefa, SEMPRE associe à categoria mais relevante do usuário. Se não houver correspondência, use categoria_id: null.

REGRAS DE HORÁRIO (CRÍTICO):
- "2h da manhã"/"2h da madrugada" = 02:00. "2h da tarde" = 14:00.
- Sem contexto: 1h-6h = madrugada. 7h-12h = manhã. NUNCA some 12 automaticamente.
- Use sempre offset -03:00 no timestamp.

Retorne APENAS o JSON, sem markdown, sem backticks.`;

    // === Build OpenAI messages ===
    const userMessageContent: any[] = [];

    if (imageBase64) {
      userMessageContent.push({
        type: "image_url",
        image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
      });
      userMessageContent.push({
        type: "text",
        text: userText || "Analise esta imagem e identifique se é um gasto, conta/boleto ou outro documento.",
      });
    } else {
      userMessageContent.push({ type: "text", text: userText });
    }

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessageContent },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    const aiData = await openaiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;
    if (!aiContent) throw new Error("Empty response from OpenAI");

    const cleanedContent = aiContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleanedContent);

    console.log("=== AI PARSED ===", JSON.stringify(parsed, null, 2));

    // === POST-PROCESSING: Validate extracted financial values from images ===
    if (imageBase64 && parsed.db_actions) {
      for (const action of parsed.db_actions) {
        if (action.tabela === "financas" && action.operacao === "insert" && action.dados?.valor) {
          const val = Number(action.dados.valor);
          // Heuristic: if value > 500 for residential bills, check if first digit was erroneously prepended
          // e.g., 991.63 -> the real value might be 91.63 (first digit "9" was hallucinated from nearby text)
          // e.g., 991.53 -> 91.53
          const desc = (action.dados.descricao || "").toLowerCase();
          const isResidentialBill = /água|agua|luz|energia|enel|cemig|copasa|sabesp|sanepar|internet|vero|claro|net|telefone|gás|gas|esgoto/.test(desc);
          
          if (isResidentialBill && val > 500) {
            // Try removing the first digit and see if it's in a reasonable range
            const valStr = val.toFixed(2);
            const withoutFirst = parseFloat(valStr.substring(1));
            if (withoutFirst >= 30 && withoutFirst <= 500) {
              console.log(`⚠️ VALUE CORRECTION: ${val} -> ${withoutFirst} (removed hallucinated first digit)`);
              action.dados.valor = withoutFirst;
              // Also fix the WhatsApp message
              if (parsed.mensagem_whatsapp) {
                parsed.mensagem_whatsapp = parsed.mensagem_whatsapp
                  .replace(val.toFixed(2).replace(".", ","), withoutFirst.toFixed(2).replace(".", ","))
                  .replace(`R$ ${val}`, `R$ ${withoutFirst}`)
                  .replace(`R$${val}`, `R$${withoutFirst}`);
              }
            }
          }
        }
      }
    }

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

        const { data: insertedRow, error } = await supabase.from(action.tabela).insert(insertData).select("id").single();
        if (error) {
          console.error(`Insert error on ${action.tabela}:`, error);
          throw error;
        }

        // === Google Calendar sync ===
        const scheduledDate = action.dados.data_hora_agendada || action.dados.data_vencimento;
        if (gcalIntegration?.access_token && scheduledDate) {
          try {
            let accessToken = gcalIntegration.access_token;

            const expiresAt = gcalIntegration.token_expires_at ? new Date(gcalIntegration.token_expires_at) : null;
            if (expiresAt && expiresAt < new Date() && gcalIntegration.refresh_token) {
              accessToken = await refreshGoogleToken(supabase, gcalIntegration, userId);
            }

            const startDate = new Date(scheduledDate);
            const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

            const isBill = action.tabela === "financas" && action.dados.status === "pendente";
            const summary = isBill
              ? `💰 Vencimento: ${action.dados.descricao || "Conta"} - R$${action.dados.valor}`
              : (action.dados.titulo || action.dados.descricao || "Compromisso - Cérebro de Bolso");
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
              const calData = await calRes.json();
              console.log("✅ Google Calendar event created:", calData.id);
              // Store the calendar event ID for future updates (rescheduling)
              if (calData.id && insertedRow?.id) {
                await supabase.from(action.tabela)
                  .update({ google_calendar_event_id: calData.id })
                  .eq("id", insertedRow.id);
              }
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

        // Auto-set completed_at when marking a task as completed
        if (action.tabela === "itens_cerebro" && updateData.status === "concluida") {
          updateData.completed_at = new Date().toISOString();
        }
        // Clear completed_at if reverting from completed
        if (action.tabela === "itens_cerebro" && updateData.status && updateData.status !== "concluida") {
          updateData.completed_at = null;
        }

        const { error } = await supabase
          .from(action.tabela)
          .update(updateData)
          .eq("id", id)
          .eq("user_id", userId);
        if (error) {
          console.error(`Update error on ${action.tabela}:`, error);
          // Don't throw - continue processing so WhatsApp response is still sent
        }
      }
    }

    // Decrement credits if not premium
    if (!isPremium && !isUnlimited && credits > 0) {
      await supabase.from("profiles").update({ credits: credits - 1 }).eq("id", userId);
    }

    // Send WhatsApp response
    if (UAZAPI_URL && UAZAPI_TOKEN && parsed.mensagem_whatsapp) {
      let finalMessage = parsed.mensagem_whatsapp;

      const hadCalendarSync = actions.some((action: any) => {
        if (!action.tabela || action.operacao !== "insert" || !action.dados) return false;
        const scheduledDate = action.dados.data_hora_agendada || action.dados.data_vencimento;
        return gcalIntegration?.access_token && scheduledDate;
      });

      if (hadCalendarSync) {
        finalMessage += "\n\n📅 _Evento adicionado automaticamente ao seu Google Agenda!_";
      }

      await sendWhatsApp(UAZAPI_URL, UAZAPI_TOKEN, userPhone, finalMessage);
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
