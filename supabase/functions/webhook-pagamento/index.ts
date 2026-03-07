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

    // === Extrair dados (compatível com Hotmart, Kiwify e manual) ===
    let buyerEmail = "";
    let buyerPhone = "";
    let eventType = "";
    let platform = "";

    if (body?.data?.buyer?.email) {
      // Hotmart
      buyerEmail = body.data.buyer.email;
      buyerPhone = body.data.buyer.phone || body.phone || "";
      eventType = body?.event || "";
      platform = "hotmart";
    } else if (body?.Customer?.email) {
      // Kiwify
      buyerEmail = body.Customer.email;
      buyerPhone = body.Customer.mobile || body.phone || "";
      eventType = body?.order_status || "";
      platform = "kiwify";
    } else if (body?.email) {
      // Manual
      buyerEmail = body.email;
      buyerPhone = body.phone || "";
      eventType = body.event || "purchase_approved";
      platform = body.platform || "manual";
    }

    buyerPhone = buyerPhone.replace(/\D/g, "");

    if (!buyerEmail) {
      return new Response(JSON.stringify({ error: "Missing buyer email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Plataforma:", platform, "Email:", buyerEmail, "Phone:", buyerPhone, "Evento:", eventType);

    // === Determinar status ===
    const activationEvents = [
      "PURCHASE_APPROVED", "PURCHASE_COMPLETE", "purchase_approved", "purchase_complete",
      "paid", "approved", "completed",
    ];
    const cancellationEvents = [
      "PURCHASE_CANCELED", "PURCHASE_REFUNDED", "SUBSCRIPTION_CANCELLATION",
      "purchase_canceled", "refunded", "cancelled", "expired",
    ];

    let newStatus = activationEvents.includes(eventType) ? "active"
      : cancellationEvents.includes(eventType) ? "cancelled"
      : "active";

    // === Buscar perfil ===
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", buyerEmail)
      .single();

    if (profileError || !profile) {
      console.log("Perfil não encontrado para:", buyerEmail, "- salvando ativação pendente");

      if (newStatus === "active") {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        await supabase
          .from("pending_activations")
          .upsert({
            email: buyerEmail,
            subscription_status: "active",
            credits: -1,
            subscription_expires_at: expiresAt.toISOString(),
            whatsapp_number: buyerPhone || null,
            platform,
          }, { onConflict: "email" });

        console.log("Ativação pendente salva para:", buyerEmail);
      }

      return new Response(JSON.stringify({
        success: true,
        message: "Pending activation saved. Will apply on signup.",
        email: buyerEmail,
        status: newStatus,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === Calcular data de expiração (30 dias a partir de agora) ===
    const updateData: Record<string, unknown> = {
      subscription_status: newStatus,
    };

    if (newStatus === "active") {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      updateData.subscription_expires_at = expiresAt.toISOString();
      updateData.credits = -1; // unlimited
    } else if (newStatus === "cancelled") {
      updateData.credits = 0;
    }

    // Salvar telefone no perfil se fornecido e ainda não existir
    if (buyerPhone && !profile.whatsapp_number) {
      updateData.whatsapp_number = buyerPhone;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", profile.id);

    if (updateError) {
      console.error("Erro ao atualizar perfil:", updateError);
      throw updateError;
    }

    console.log(`Perfil ${profile.id} atualizado: status=${newStatus}`);

    // === WhatsApp de boas-vindas ===
    const whatsappNumber = buyerPhone || profile.whatsapp_number;
    if (newStatus === "active" && whatsappNumber) {
      const UAZAPI_URL = Deno.env.get("UAZAPI_URL");
      const UAZAPI_TOKEN = Deno.env.get("UAZAPI_TOKEN");

      if (UAZAPI_URL && UAZAPI_TOKEN) {
        const welcomeMsg = `🎉 *Bem-vindo ao Cérebro de Bolso!*\n\n` +
          `Sua assinatura foi ativada com sucesso! ✅\n\n` +
          `Agora você pode me enviar mensagens de texto ou áudio a qualquer momento.\n\n` +
          `Eu vou organizar suas ideias e tarefas automaticamente. 🧠\n\n` +
          `Experimente agora! Me mande uma ideia ou tarefa.`;

        await fetch(`${UAZAPI_URL}/send/text`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "token": UAZAPI_TOKEN },
          body: JSON.stringify({ number: whatsappNumber, text: welcomeMsg }),
        });
        console.log("WhatsApp de boas-vindas enviado para:", whatsappNumber);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      email: buyerEmail,
      new_status: newStatus,
      whatsapp_sent: newStatus === "active" && !!whatsappNumber,
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
