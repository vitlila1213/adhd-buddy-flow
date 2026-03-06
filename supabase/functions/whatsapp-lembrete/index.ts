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

    // Check if it's a direct message request (welcome, etc.)
    let body: Record<string, unknown> | null = null;
    try {
      body = await req.json();
    } catch {
      // No body = cron call for reminders
    }

    // === Welcome / direct message ===
    if (body?.phone && body?.message) {
      console.log("Sending direct message to:", body.phone);
      await sendWhatsApp(UAZAPI_URL, UAZAPI_TOKEN, body.phone as string, body.message as string);
      return new Response(JSON.stringify({ success: true, type: "direct" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === Cron: check scheduled reminders ===
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    const minuteStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), 0);
    const minuteEnd = new Date(minuteStart.getTime() + 60000);

    console.log("Checking reminders between", minuteStart.toISOString(), "and", minuteEnd.toISOString());

    const { data: tasks, error } = await supabase
      .from("itens_cerebro")
      .select("*, categorias(nome, cor)")
      .eq("status", "pendente")
      .gte("data_hora_agendada", minuteStart.toISOString())
      .lt("data_hora_agendada", minuteEnd.toISOString());

    if (error) throw error;

    console.log("Found", tasks?.length || 0, "reminders to send");

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
      
      const message = `⏰ *Lembrete, querido(a)!*\n\n` +
        `📝 *${task.titulo}*${catLabel}\n` +
        `${task.descricao ? `\n${task.descricao}\n` : ""}` +
        `\nEstou aqui para te ajudar a não esquecer de nada! 💙`;
      
      await sendWhatsApp(UAZAPI_URL, UAZAPI_TOKEN, task.user_phone, message);
      sent++;
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
