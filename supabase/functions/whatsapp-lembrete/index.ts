import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if it's a direct message request
    let body: Record<string, unknown> | null = null;
    try {
      body = await req.json();
    } catch {
      // No body = cron call
    }

    // === Welcome / direct message ===
    if (body?.phone && body?.message) {
      console.log("Sending direct message to:", body.phone);
      await sendWhatsApp(UAZAPI_URL, UAZAPI_TOKEN, body.phone as string, body.message as string);
      return new Response(JSON.stringify({ success: true, type: "direct" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === Cron: check scheduled reminders + birthdays ===
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    // Use a 10-minute lookback window to catch reminders even if cron skips a minute
    const lookbackStart = new Date(now.getTime() - 10 * 60 * 1000);

    console.log("Checking reminders from", lookbackStart.toISOString(), "to", now.toISOString());

    // === TASK REMINDERS: tasks scheduled in the past 10 min that haven't been reminded yet ===
    const { data: tasks, error } = await supabase
      .from("itens_cerebro")
      .select("*, categorias(nome, cor)")
      .eq("status", "pendente")
      .is("completed_at", null)
      .eq("reminder_sent", false)
      .gte("data_hora_agendada", lookbackStart.toISOString())
      .lte("data_hora_agendada", now.toISOString());

    if (error) throw error;

    console.log("Found", tasks?.length || 0, "task reminders to send");

    const colorToEmoji: Record<string, string> = {
      "#ef4444": "🔴", "#f97316": "🟠", "#f59e0b": "🟡", "#22c55e": "🟢",
      "#14b8a6": "🟢", "#3b82f6": "🔵", "#6366f1": "🟣", "#8b5cf6": "🟣",
      "#ec4899": "🔴", "#64748b": "⚪",
    };

    let sent = 0;
    for (const task of tasks || []) {
      const cat = (task as any).categorias;
      const catEmoji = cat?.cor ? (colorToEmoji[cat.cor] || "🔵") : "";
      const catLabel = cat?.nome ? ` ${catEmoji} *${cat.nome}*` : "";
      
      const message = `⏰ *Lembrete!*\n\n` +
        `📝 *${task.titulo}*${catLabel}\n` +
        `${task.descricao ? `\n${task.descricao}\n` : ""}` +
        `\nEstou aqui para te ajudar a não esquecer de nada! 💙`;
      
      await sendWhatsApp(UAZAPI_URL, UAZAPI_TOKEN, task.user_phone, message);
      
      // Mark as reminded to prevent duplicate sends
      await supabase
        .from("itens_cerebro")
        .update({ reminder_sent: true })
        .eq("id", task.id);
      
      sent++;
      console.log(`✅ Reminder sent for task "${task.titulo}" to ${task.user_phone}`);
    }

    // === BIRTHDAY REMINDERS (check at 10:00 BRT = 13:00 UTC) ===
    const utcHour = now.getUTCHours();
    const utcMinute = now.getUTCMinutes();
    
    // 10:00 BRT = 13:00 UTC. Check within the 13:00 minute window.
    if (utcHour === 13 && utcMinute === 0) {
      console.log("=== Checking birthday reminders ===");
      
      // Get all birthdays
      const { data: allBirthdays, error: bdayError } = await supabase
        .from("aniversariantes")
        .select("*");
      
      if (bdayError) {
        console.error("Birthday fetch error:", bdayError);
      } else {
        // BRT date calculation
        const brtNow = new Date(now.getTime() - 3 * 60 * 60 * 1000);
        const todayMonth = brtNow.getUTCMonth() + 1;
        const todayDay = brtNow.getUTCDate();
        
        // Tomorrow in BRT
        const brtTomorrow = new Date(brtNow.getTime() + 24 * 60 * 60 * 1000);
        const tomorrowMonth = brtTomorrow.getUTCMonth() + 1;
        const tomorrowDay = brtTomorrow.getUTCDate();

        const parentescoEmoji: Record<string, string> = {
          amigo: "👫", amiga: "👫", pai: "👨", "mãe": "👩", "irmão": "👦", "irmã": "👧",
          tio: "👨‍🦳", tia: "👩‍🦳", primo: "🧑", prima: "🧑", "avô": "👴", "avó": "👵",
          filho: "👦", filha: "👧", esposo: "💍", esposa: "💍", namorado: "❤️", namorada: "❤️",
          sogro: "👨‍🦳", sogra: "👩‍🦳", cunhado: "🤝", cunhada: "🤝", colega: "💼", chefe: "👔", outro: "🎂"
        };

        for (const bday of allBirthdays || []) {
          const bdayDate = new Date(bday.data_aniversario + "T12:00:00Z");
          const bdayMonth = bdayDate.getUTCMonth() + 1;
          const bdayDay = bdayDate.getUTCDate();
          const emoji = parentescoEmoji[bday.parentesco] || "🎂";

          // Check if birthday is TOMORROW (send day-before reminder)
          if (bdayMonth === tomorrowMonth && bdayDay === tomorrowDay) {
            const months = ["", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
            const message = `🔔 *Lembrete de Aniversário — Amanhã!*\n\n` +
              `${emoji} *${bday.nome}* (${bday.parentesco}) faz aniversário *amanhã*, dia ${tomorrowDay} de ${months[tomorrowMonth]}! 🎂\n\n` +
              `💡 Já preparou uma mensagem especial? Aqui vai uma sugestão:\n\n` +
              `───────────────\n` +
              `🎉🎂 *Feliz Aniversário, ${bday.nome}!* 🎂🎉\n\n` +
              `Que esse novo ciclo seja repleto de saúde, paz, amor e muitas conquistas! ✨\n` +
              `Você merece todo o carinho do mundo! 🥳💖\n` +
              `Um abraço enorme! 🤗\n` +
              `───────────────\n\n` +
              `Copie e envie amanhã! Se precisar de algo, estou aqui! 💙`;

            await sendWhatsApp(UAZAPI_URL, UAZAPI_TOKEN, bday.user_phone, message);
            sent++;
            console.log(`Sent day-before birthday reminder for ${bday.nome} to ${bday.user_phone}`);
          }

          // Check if birthday is TODAY (send day-of reminder)
          if (bdayMonth === todayMonth && bdayDay === todayDay) {
            const months = ["", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
            const message = `🎉🎂 *HOJE é o aniversário de ${bday.nome}!* 🎂🎉\n\n` +
              `${emoji} *${bday.nome}* (${bday.parentesco}) está completando mais um ano de vida hoje, dia ${todayDay} de ${months[todayMonth]}! 🥳\n\n` +
              `🎁 Não esqueça de enviar os parabéns! Aqui vai uma mensagem especial:\n\n` +
              `───────────────\n` +
              `🌟🎂 *Parabéns, ${bday.nome}!* 🎂🌟\n\n` +
              `Hoje é o SEU dia! 🎈\n` +
              `Que a vida te presenteie com momentos incríveis, muita saúde, felicidade e realizações! ✨\n` +
              `Que todos os seus sonhos se realizem! 🙏💖\n` +
              `Parabéns por mais um ano de vida! 🥳🎊\n` +
              `Um abraço cheio de carinho! 🤗💝\n` +
              `───────────────\n\n` +
              `Aproveite para enviar agora! Se precisar de algo, estou aqui! 💙`;

            await sendWhatsApp(UAZAPI_URL, UAZAPI_TOKEN, bday.user_phone, message);
            sent++;
            console.log(`Sent birthday reminder for ${bday.nome} to ${bday.user_phone}`);
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, reminders_sent: sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("whatsapp-lembrete error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
