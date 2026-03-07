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

    // Get today's date in São Paulo timezone
    const now = new Date();
    const spOffset = -3 * 60;
    const spTime = new Date(now.getTime() + spOffset * 60 * 1000);
    const todayStr = spTime.toISOString().split("T")[0]; // YYYY-MM-DD
    const todayStart = `${todayStr}T00:00:00-03:00`;
    const todayEnd = `${todayStr}T23:59:59-03:00`;

    // Fetch pending bills due today
    const { data: pendingBills } = await supabase
      .from("financas")
      .select("id, tipo, valor, descricao, status, user_id, data_vencimento")
      .eq("status", "pendente")
      .eq("tipo", "despesa")
      .gte("data_vencimento", todayStart)
      .lte("data_vencimento", todayEnd);

    // Fetch pending tasks scheduled for today
    const { data: pendingTasks } = await supabase
      .from("itens_cerebro")
      .select("id, titulo, tipo, status, user_id, data_hora_agendada")
      .eq("status", "pendente")
      .gte("data_hora_agendada", todayStart)
      .lte("data_hora_agendada", todayEnd);

    // Group by user_id
    const userPendencies: Record<string, { bills: any[]; tasks: any[] }> = {};

    for (const bill of (pendingBills || [])) {
      if (!bill.user_id) continue;
      if (!userPendencies[bill.user_id]) userPendencies[bill.user_id] = { bills: [], tasks: [] };
      userPendencies[bill.user_id].bills.push(bill);
    }

    for (const task of (pendingTasks || [])) {
      if (!task.user_id) continue;
      if (!userPendencies[task.user_id]) userPendencies[task.user_id] = { bills: [], tasks: [] };
      userPendencies[task.user_id].tasks.push(task);
    }

    const userIds = Object.keys(userPendencies);
    if (userIds.length === 0) {
      console.log("No pending items for today");
      return new Response(JSON.stringify({ sent: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch profiles for these users
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, whatsapp_number")
      .in("id", userIds);

    let sentCount = 0;

    for (const profile of (profiles || [])) {
      if (!profile.whatsapp_number) continue;

      const pending = userPendencies[profile.id];
      if (!pending) continue;

      const { bills, tasks } = pending;
      if (bills.length === 0 && tasks.length === 0) continue;

      let message = "Bom dia! ☀️ Passando para lembrar dos compromissos de hoje:\n";

      if (bills.length > 0) {
        message += "\n🧾 *Contas a Pagar:*\n";
        for (const bill of bills) {
          const desc = bill.descricao || "Conta";
          const valor = Number(bill.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
          message += `  - ${desc} (${valor})\n`;
        }
      }

      if (tasks.length > 0) {
        message += "\n🧠 *Tarefas:*\n";
        for (const task of tasks) {
          message += `  - ${task.titulo}\n`;
        }
      }

      message += "\nMe avise quando pagar as contas para eu dar baixa aqui! 💙";

      await sendWhatsApp(UAZAPI_URL, UAZAPI_TOKEN, profile.whatsapp_number, message);
      sentCount++;
      console.log(`✅ Lembrete enviado para ${profile.whatsapp_number}`);
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
