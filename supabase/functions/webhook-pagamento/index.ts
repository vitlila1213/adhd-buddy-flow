import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    console.log("=== WEBHOOK PAGAMENTO RECEBIDO ===");
    console.log(JSON.stringify(body, null, 2));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // === Extrair dados do webhook (compatível com Hotmart e Kiwify) ===
    let buyerEmail = "";
    let buyerName = "";
    let eventType = "";
    let platform = "";

    // Hotmart format
    if (body?.data?.buyer?.email) {
      buyerEmail = body.data.buyer.email;
      buyerName = body.data.buyer.name || "";
      eventType = body?.event || "";
      platform = "hotmart";
    }
    // Kiwify format
    else if (body?.Customer?.email) {
      buyerEmail = body.Customer.email;
      buyerName = body.Customer.full_name || "";
      eventType = body?.order_status || "";
      platform = "kiwify";
    }
    // Formato de teste manual
    else if (body?.email) {
      buyerEmail = body.email;
      buyerName = body.name || "";
      eventType = body.event || "purchase_approved";
      platform = body.platform || "manual";
    }

    if (!buyerEmail) {
      console.error("Email do comprador não encontrado no payload");
      return new Response(JSON.stringify({ error: "Missing buyer email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Plataforma:", platform);
    console.log("Email:", buyerEmail);
    console.log("Evento:", eventType);

    // === Determinar ação baseada no evento ===
    const activationEvents = [
      "PURCHASE_APPROVED", "PURCHASE_COMPLETE", "purchase_approved", "purchase_complete",
      "paid", "approved", "completed",
    ];
    const cancellationEvents = [
      "PURCHASE_CANCELED", "PURCHASE_REFUNDED", "SUBSCRIPTION_CANCELLATION",
      "purchase_canceled", "refunded", "cancelled", "expired",
    ];

    let newStatus = "";
    if (activationEvents.includes(eventType)) {
      newStatus = "active";
    } else if (cancellationEvents.includes(eventType)) {
      newStatus = "inactive";
    } else {
      // Se não reconhecer o evento, assume ativação (para testes)
      newStatus = "active";
      console.log("Evento não reconhecido, assumindo ativação:", eventType);
    }

    // === Buscar perfil pelo email ===
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", buyerEmail)
      .single();

    if (profileError || !profile) {
      console.log("Perfil não encontrado para:", buyerEmail);
      // Salvar em uma fila para processar quando o usuário se cadastrar
      console.log("Usuário ainda não cadastrado. Status será aplicado quando fizer login.");
      return new Response(JSON.stringify({ 
        success: true, 
        message: "User not registered yet. Will be activated on first login.",
        email: buyerEmail,
        status: newStatus,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === Atualizar status da assinatura ===
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ subscription_status: newStatus })
      .eq("id", profile.id);

    if (updateError) {
      console.error("Erro ao atualizar perfil:", updateError);
      throw updateError;
    }

    console.log(`Perfil ${profile.id} atualizado para: ${newStatus}`);

    // === Enviar WhatsApp de boas-vindas (se ativação e tem número) ===
    if (newStatus === "active" && profile.whatsapp_number) {
      const UAZAPI_URL = Deno.env.get("UAZAPI_URL");
      const UAZAPI_TOKEN = Deno.env.get("UAZAPI_TOKEN");

      if (UAZAPI_URL && UAZAPI_TOKEN) {
        const welcomeMsg = `🎉 *Bem-vindo ao Cérebro de Bolso!*\n\n` +
          `Sua assinatura foi ativada com sucesso! ✅\n\n` +
          `Agora você pode me enviar mensagens de texto ou áudio a qualquer momento.\n\n` +
          `Eu vou organizar suas ideias e tarefas automaticamente. 🧠\n\n` +
          `Experimente agora! Me mande uma ideia ou tarefa.`;

        const sendResponse = await fetch(`${UAZAPI_URL}/send/text`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "token": UAZAPI_TOKEN },
          body: JSON.stringify({ number: profile.whatsapp_number, text: welcomeMsg }),
        });

        const sendResult = await sendResponse.text();
        console.log("WhatsApp de boas-vindas enviado:", sendResult);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      email: buyerEmail,
      new_status: newStatus,
      whatsapp_sent: newStatus === "active" && !!profile.whatsapp_number,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("webhook-pagamento error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
