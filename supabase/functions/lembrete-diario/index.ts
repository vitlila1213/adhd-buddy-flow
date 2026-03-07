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

    // São Paulo timezone (BRT = UTC-3)
    const now = new Date();
    const spOffset = -3 * 60;
    const spTime = new Date(now.getTime() + spOffset * 60 * 1000);
    const todayStr = spTime.toISOString().split("T")[0];
    const todayStart = `${todayStr}T00:00:00-03:00`;
    const todayEnd = `${todayStr}T23:59:59-03:00`;

    // Yesterday's date
    const yesterday = new Date(spTime);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];
    const yesterdayEnd = `${yesterdayStr}T23:59:59-03:00`;

    // Fetch pending bills due today
    const { data: pendingBills } = await supabase
      .from("financas")
      .select("id, tipo, valor, descricao, status, user_id, data_vencimento")
      .eq("status", "pendente")
      .eq("tipo", "despesa")
      .gte("data_vencimento", todayStart)
      .lte("data_vencimento", todayEnd);

    // Fetch pending tasks scheduled for today
    const { data: todayTasks } = await supabase
      .from("itens_cerebro")
      .select("id, titulo, tipo, status, user_id, data_hora_agendada")
      .eq("status", "pendente")
      .gte("data_hora_agendada", todayStart)
      .lte("data_hora_agendada", todayEnd);

    // Fetch OVERDUE tasks from previous days (scheduled before today and still pending)
    const { data: overdueTasks } = await supabase
      .from("itens_cerebro")
      .select("id, titulo, tipo, status, user_id, data_hora_agendada")
      .eq("status", "pendente")
      .lt("data_hora_agendada", todayStart);

    // Fetch overdue bills (before today, still pending)
    const { data: overdueBills } = await supabase
      .from("financas")
      .select("id, tipo, valor, descricao, status, user_id, data_vencimento")
      .eq("status", "pendente")
      .eq("tipo", "despesa")
      .lt("data_vencimento", todayStart);

    // Group by user_id
    const userPendencies: Record<string, { bills: any[]; tasks: any[]; overdueTasks: any[]; overdueBills: any[] }> = {};

    const ensure = (uid: string) => {
      if (!userPendencies[uid]) userPendencies[uid] = { bills: [], tasks: [], overdueTasks: [], overdueBills: [] };
    };

    for (const bill of (pendingBills || [])) {
      if (!bill.user_id) continue;
      ensure(bill.user_id);
      userPendencies[bill.user_id].bills.push(bill);
    }

    for (const task of (todayTasks || [])) {
      if (!task.user_id) continue;
      ensure(task.user_id);
      userPendencies[task.user_id].tasks.push(task);
    }

    for (const task of (overdueTasks || [])) {
      if (!task.user_id) continue;
      ensure(task.user_id);
      userPendencies[task.user_id].overdueTasks.push(task);
    }

    for (const bill of (overdueBills || [])) {
      if (!bill.user_id) continue;
      ensure(bill.user_id);
      userPendencies[bill.user_id].overdueBills.push(bill);
    }

    const userIds = Object.keys(userPendencies);
    if (userIds.length === 0) {
      console.log("No pending items for today");
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

      const { bills, tasks, overdueTasks: oTasks, overdueBills: oBills } = pending;
      if (bills.length === 0 && tasks.length === 0 && oTasks.length === 0 && oBills.length === 0) continue;

      let message = "Bom dia! ☀️ Aqui está seu resumo do dia:\n";

      // Overdue items first (highlighted)
      if (oTasks.length > 0 || oBills.length > 0) {
        message += "\n⚠️ *PENDÊNCIAS ATRASADAS:*\n";
        for (const task of oTasks) {
          const dateStr = task.data_hora_agendada
            ? new Date(task.data_hora_agendada).toLocaleDateString("pt-BR")
            : "";
          message += `  ⏰ ${task.titulo} (era para ${dateStr})\n`;
        }
        for (const bill of oBills) {
          const desc = bill.descricao || "Conta";
          const valor = Number(bill.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
          const dateStr = bill.data_vencimento
            ? new Date(bill.data_vencimento).toLocaleDateString("pt-BR")
            : "";
          message += `  ⏰ ${desc} ${valor} (vencia ${dateStr})\n`;
        }
      }

      if (bills.length > 0) {
        message += "\n🧾 *Contas de Hoje:*\n";
        for (const bill of bills) {
          const desc = bill.descricao || "Conta";
          const valor = Number(bill.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
          message += `  - ${desc} (${valor})\n`;
        }
      }

      if (tasks.length > 0) {
        message += "\n🧠 *Tarefas de Hoje:*\n";
        for (const task of tasks) {
          message += `  - ${task.titulo}\n`;
        }
      }

      message += "\nMe avise quando concluir algo para eu dar baixa! 💙";

      await sendWhatsApp(UAZAPI_URL, UAZAPI_TOKEN, profile.whatsapp_number, message);
      sentCount++;
      console.log(`✅ Lembrete matinal enviado para ${profile.whatsapp_number}`);
    }

    return new Response(JSON.stringify({ success: true, sent: sentCount }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("lembrete-diario error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
