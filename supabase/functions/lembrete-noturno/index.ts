import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // São Paulo timezone
    const now = new Date();
    const spOffset = -3 * 60;
    const spTime = new Date(now.getTime() + spOffset * 60 * 1000);
    const todayStr = spTime.toISOString().split("T")[0];
    const todayStart = `${todayStr}T00:00:00-03:00`;
    const todayEnd = `${todayStr}T23:59:59-03:00`;

    // Tomorrow for day-before reminders
    const spTomorrow = new Date(spTime.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowStr = spTomorrow.toISOString().split("T")[0];
    const tomorrowEnd = `${tomorrowStr}T23:59:59-03:00`;

    // Fetch tasks still pending that were scheduled for today or earlier
    const { data: pendingTasks } = await supabase
      .from("itens_cerebro")
      .select("id, titulo, tipo, status, user_id, data_hora_agendada")
      .eq("status", "pendente")
      .lte("data_hora_agendada", todayEnd);

    // Fetch bills still pending due today or earlier
    const { data: pendingBills } = await supabase
      .from("financas")
      .select("id, tipo, valor, descricao, status, user_id, data_vencimento")
      .eq("status", "pendente")
      .eq("tipo", "despesa")
      .lte("data_vencimento", todayEnd);

    // Fetch bills due TOMORROW (day-before reminder)
    const tomorrowStart = `${tomorrowStr}T00:00:00-03:00`;
    const { data: tomorrowBills } = await supabase
      .from("financas")
      .select("id, tipo, valor, descricao, status, user_id, data_vencimento")
      .eq("status", "pendente")
      .eq("tipo", "despesa")
      .gte("data_vencimento", tomorrowStart)
      .lte("data_vencimento", tomorrowEnd);

    // Fetch tasks scheduled for TOMORROW (day-before reminder)
    const { data: tomorrowTasks } = await supabase
      .from("itens_cerebro")
      .select("id, titulo, tipo, status, user_id, data_hora_agendada")
      .eq("status", "pendente")
      .gte("data_hora_agendada", tomorrowStart)
      .lte("data_hora_agendada", tomorrowEnd);

    // Group by user
    const userPendencies: Record<string, { tasks: any[]; bills: any[]; tomorrowBills: any[]; tomorrowTasks: any[] }> = {};

    const ensure = (uid: string) => {
      if (!userPendencies[uid]) userPendencies[uid] = { tasks: [], bills: [], tomorrowBills: [], tomorrowTasks: [] };
    };

    for (const task of (pendingTasks || [])) {
      if (!task.user_id) continue;
      ensure(task.user_id);
      userPendencies[task.user_id].tasks.push(task);
    }

    for (const bill of (pendingBills || [])) {
      if (!bill.user_id) continue;
      ensure(bill.user_id);
      userPendencies[bill.user_id].bills.push(bill);
    }

    for (const bill of (tomorrowBills || [])) {
      if (!bill.user_id) continue;
      ensure(bill.user_id);
      userPendencies[bill.user_id].tomorrowBills.push(bill);
    }

    for (const task of (tomorrowTasks || [])) {
      if (!task.user_id) continue;
      ensure(task.user_id);
      userPendencies[task.user_id].tomorrowTasks.push(task);
    }

    const userIds = Object.keys(userPendencies);
    if (userIds.length === 0) {
      console.log("No pending items at end of day");
      return new Response(JSON.stringify({ sent: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, whatsapp_number")
      .in("id", userIds);

    let sentCount = 0;

    for (const profile of (profiles || [])) {
      if (!profile.whatsapp_number) continue;

      const pending = userPendencies[profile.id];
      if (!pending) continue;

      const { tasks, bills, tomorrowBills: tmrwBills } = pending;
      if (tasks.length === 0 && bills.length === 0 && tmrwBills.length === 0) continue;

      let message = "Boa tarde! ☀️ Passando para te lembrar das suas pendências:\n";

      if (tasks.length > 0) {
        message += "\n📋 *Tarefas pendentes:*\n";
        for (const task of tasks) {
          message += `  ⏳ ${task.titulo}\n`;
        }
      }

      if (bills.length > 0) {
        message += "\n💰 *Contas vencendo hoje ou atrasadas:*\n";
        for (const bill of bills) {
          const desc = bill.descricao || "Conta";
          const valor = Number(bill.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
          const venc = bill.data_vencimento ? new Date(bill.data_vencimento).toLocaleDateString("pt-BR") : "";
          message += `  🚨 ${desc} (${valor})${venc ? ` — vence ${venc}` : ""}\n`;
        }
      }

      if (tmrwBills.length > 0) {
        message += "\n⚠️ *Contas vencendo AMANHÃ:*\n";
        for (const bill of tmrwBills) {
          const desc = bill.descricao || "Conta";
          const valor = Number(bill.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
          message += `  📅 ${desc} (${valor}) — vence amanhã!\n`;
        }
      }

      message += "\nSe já pagou alguma, me avisa que dou baixa! 💪";

      await sendWhatsApp(UAZAPI_URL, UAZAPI_TOKEN, profile.whatsapp_number, message);
      sentCount++;
      console.log(`✅ Lembrete noturno enviado para ${profile.whatsapp_number}`);
    }

    return new Response(JSON.stringify({ success: true, sent: sentCount }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("lembrete-noturno error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
