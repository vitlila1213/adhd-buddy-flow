import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const reqBody = await req.json();
    console.log("=== KIWIFY WEBHOOK PAYLOAD ===", JSON.stringify(reqBody, null, 2));

    const email = reqBody?.Customer?.email || reqBody?.customer?.email || reqBody?.email;
    const status = reqBody?.order_status || reqBody?.status || reqBody?.subscription_status;

    if (!email || !status) {
      console.error("Missing email or status:", { email, status });
      return new Response(JSON.stringify({ error: "Missing email or status" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Email:", email, "Status:", status);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const statusLower = status.toLowerCase();

    if (["approved", "paid"].includes(statusLower)) {
      const { data: profileData, error } = await supabase
        .from("profiles")
        .update({
          subscription_status: "active",
          subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          credits: -1, // unlimited
        })
        .eq("email", email)
        .select("whatsapp_number")
        .single();

      if (error) {
        console.error("Erro ao ativar:", error);
      } else {
        console.log("Assinatura ativada para:", email);

        // Enviar boas-vindas via WhatsApp
        const UAZAPI_URL = Deno.env.get("UAZAPI_URL");
        const UAZAPI_TOKEN = Deno.env.get("UAZAPI_TOKEN");
        const phone = profileData?.whatsapp_number;

        if (UAZAPI_URL && UAZAPI_TOKEN && phone) {
          await fetch(`${UAZAPI_URL}/send/text`, {
            method: "POST",
            headers: { "Content-Type": "application/json", token: UAZAPI_TOKEN },
            body: JSON.stringify({
              number: phone,
              text: "🎉 Parabéns! Sua assinatura Premium do Cérebro de Bolso foi ativada!\n\n👑 Agora você tem uso ilimitado do seu segundo cérebro.\n\nMande suas ideias e tarefas sem limites. Estou pronto pra te ajudar! 🧠✨\n\n🔗 Acesse seu painel aqui:\nhttps://adhd-buddy-flow.lovable.app/",
            }),
          });
          console.log("Boas-vindas enviada para:", phone);
        }
      }

    } else if (["refunded", "chargeback", "canceled", "cancelled"].includes(statusLower)) {
      const { error } = await supabase
        .from("profiles")
        .update({ subscription_status: "inactive", credits: 0 })
        .eq("email", email);

      if (error) console.error("Erro ao desativar:", error);
      else console.log("Assinatura desativada para:", email);
    } else {
      console.log("Status não tratado:", statusLower);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("kiwify-webhook error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
