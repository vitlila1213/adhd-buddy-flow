import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const APP_URL = "https://adhd-buddy-flow.lovable.app";

const REMARKETING_MESSAGES = [
  // Day 1 - Emotional
  `🧠 *Oi! Sou o Cérebro de Bolso!*\n\nPercebi que você usou todos os seus créditos gratuitos… Isso mostra que você realmente aproveitou a ferramenta! 🎉\n\nSem o Premium, suas tarefas podem ficar desorganizadas e você pode esquecer compromissos importantes 😕\n\n✨ *Com o Premium você tem:*\n• Mensagens ilimitadas\n• Lembretes automáticos no WhatsApp\n• Leitura de boletos por foto 📸\n• Controle financeiro completo\n• Lembretes de aniversário 🎂\n\n🔗 Assine agora: ${APP_URL}/vendas\n\n💙 Estou aqui para te ajudar a nunca mais esquecer de nada!`,

  // Day 2 - Social proof
  `💡 *Sabia que centenas de pessoas já organizam sua vida com o Cérebro de Bolso?*\n\nEnquanto isso, suas tarefas continuam se acumulando sem alguém para te lembrar... ⏰\n\n🏆 *O que nossos assinantes dizem:*\n"Nunca mais esqueci de pagar uma conta!" 💳\n"Organizo tudo pelo WhatsApp, é incrível!" 🚀\n\nPor menos de R$ 1 por dia, você tem um assistente pessoal 24h! 🧠\n\n👉 ${APP_URL}/vendas\n\nVamos organizar sua vida juntos? 💙`,

  // Day 3 - Benefit focused
  `📋 *Ei! Suas tarefas estão esperando por você!*\n\nCom o Cérebro de Bolso Premium, você pode:\n\n📸 Enviar foto de boleto e registrar automaticamente\n⏰ Receber lembretes no horário exato\n🎂 Nunca esquecer um aniversário\n💰 Controlar todas as finanças\n📊 Ver relatórios detalhados\n📅 Sincronizar com Google Agenda\n\nTudo isso pelo WhatsApp, sem baixar nenhum app! 📱\n\n🔗 Comece agora: ${APP_URL}/vendas\n\nSua organização está a um clique! 💙`,

  // Day 4 - Urgency
  `⚡ *Última chamada, organização!*\n\nVocê experimentou o Cérebro de Bolso e viu como ele funciona. Agora imagine ter acesso ILIMITADO a tudo isso:\n\n✅ Mensagens sem limite\n✅ Lembretes inteligentes\n✅ Visão computacional para boletos\n✅ Gestão financeira completa\n\n❌ Sem o Premium: esquecimentos, contas atrasadas, desorganização...\n\n✅ Com o Premium: vida organizada, contas em dia, paz de espírito! 🧘\n\n👉 ${APP_URL}/vendas\n\nNão deixe para depois o que seu cérebro precisa agora! 🧠💙`,

  // Day 5 - Friendly
  `👋 *E aí, tudo bem?*\n\nSenti sua falta por aqui! 🥺\n\nSei que a vida é corrida, por isso mesmo criei o Cérebro de Bolso — para você não precisar se preocupar em lembrar de tudo.\n\n🧠 Eu lembro por você!\n⏰ Te aviso na hora certa!\n📸 Leio seus boletos!\n🎂 Lembro dos aniversários!\n\nTudo pelo WhatsApp, simples assim. 💬\n\n💙 Volte quando quiser: ${APP_URL}/vendas\n\nEstou aqui te esperando! 🤗`,
];

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
    const UAZAPI_URL = Deno.env.get("UAZAPI_URL");
    const UAZAPI_TOKEN = Deno.env.get("UAZAPI_TOKEN");

    if (!UAZAPI_URL || !UAZAPI_TOKEN) {
      return new Response(JSON.stringify({ error: "UAZAPI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find users with credits = 0, not active, with whatsapp number
    // And who haven't received remarketing in the last 24h
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: targets, error } = await supabase
      .from("profiles")
      .select("id, whatsapp_number, credits, subscription_status, last_remarketing_at, created_at")
      .eq("credits", 0)
      .neq("subscription_status", "active")
      .not("whatsapp_number", "is", null);

    if (error) throw error;

    console.log(`Found ${targets?.length || 0} potential remarketing targets`);

    let sent = 0;
    const now = new Date();

    for (const user of targets || []) {
      if (!user.whatsapp_number) continue;

      // Skip if remarketing sent less than 24h ago
      if (user.last_remarketing_at && user.last_remarketing_at > twentyFourHoursAgo) {
        console.log(`Skipping ${user.whatsapp_number} - remarketing sent recently`);
        continue;
      }

      // Check if account is at least 24h old (don't spam new users)
      const accountAge = now.getTime() - new Date(user.created_at).getTime();
      if (accountAge < 24 * 60 * 60 * 1000) {
        console.log(`Skipping ${user.whatsapp_number} - account too new`);
        continue;
      }

      // Pick message based on days since creation (cycles through 5 messages)
      const daysSinceCreation = Math.floor(accountAge / (24 * 60 * 60 * 1000));
      const messageIndex = (daysSinceCreation - 1) % REMARKETING_MESSAGES.length;
      const message = REMARKETING_MESSAGES[Math.max(0, messageIndex)];

      await sendWhatsApp(UAZAPI_URL, UAZAPI_TOKEN, user.whatsapp_number, message);

      // Update last_remarketing_at
      await supabase
        .from("profiles")
        .update({ last_remarketing_at: now.toISOString() })
        .eq("id", user.id);

      sent++;
      console.log(`Sent remarketing to ${user.whatsapp_number} (message ${messageIndex + 1})`);
    }

    return new Response(
      JSON.stringify({ success: true, remarketing_sent: sent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("remarketing-lembrete error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
