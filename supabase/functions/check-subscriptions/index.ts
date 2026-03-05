import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar assinaturas ativas que já expiraram
    const { data: expired, error: fetchError } = await supabase
      .from("profiles")
      .select("id, email, whatsapp_number, subscription_expires_at")
      .eq("subscription_status", "active")
      .not("subscription_expires_at", "is", null)
      .lt("subscription_expires_at", new Date().toISOString());

    if (fetchError) throw fetchError;

    console.log("Assinaturas expiradas encontradas:", expired?.length || 0);

    if (!expired || expired.length === 0) {
      return new Response(JSON.stringify({ success: true, cancelled: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cancelar todas as assinaturas expiradas
    const expiredIds = expired.map((p) => p.id);
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ subscription_status: "cancelled" })
      .in("id", expiredIds);

    if (updateError) throw updateError;

    // Notificar via WhatsApp
    const UAZAPI_URL = Deno.env.get("UAZAPI_URL");
    const UAZAPI_TOKEN = Deno.env.get("UAZAPI_TOKEN");

    if (UAZAPI_URL && UAZAPI_TOKEN) {
      for (const profile of expired) {
        if (profile.whatsapp_number) {
          const msg = `⚠️ Sua assinatura do *Cérebro de Bolso* expirou.\n\n` +
            `Renove para continuar organizando suas ideias e tarefas! 🧠\n\n` +
            `Acesse o link para renovar.`;

          await fetch(`${UAZAPI_URL}/send/text`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "token": UAZAPI_TOKEN },
            body: JSON.stringify({ number: profile.whatsapp_number, text: msg }),
          });
        }
      }
    }

    return new Response(JSON.stringify({ success: true, cancelled: expired.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("check-subscriptions error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
