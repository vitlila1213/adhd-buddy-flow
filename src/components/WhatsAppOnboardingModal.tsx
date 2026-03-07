import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const WhatsAppOnboardingModal = () => {
  const { profile, updateProfile, refreshProfile } = useAuth();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const isOpen = !!profile && !profile.whatsapp_number;

  const normalizePhone = (raw: string): string => {
    let num = raw.replace(/\D/g, "");
    // Remove leading zero from DDD: 55 0XX -> 55 XX
    if (num.startsWith("550")) {
      num = "55" + num.slice(3);
    }
    // Ensure mobile 9: 55 XX 8xxx -> 55 XX 9 8xxx
    if (num.length === 12 && num.startsWith("55")) {
      num = num.slice(0, 4) + "9" + num.slice(4);
    }
    return num;
  };

  const handleSave = async () => {
    const cleaned = normalizePhone(phone);
    if (cleaned.length < 12) {
      toast.error("Digite o número completo com código do país e DDD (ex: 553199999999)");
      return;
    }
    setLoading(true);
    try {
      await updateProfile({ whatsapp_number: cleaned });

      // Refresh profile to get latest data (pending_activation may have updated credits)
      await refreshProfile();

      // Send welcome message based on subscription status
      try {
        const { data: freshProfile } = await supabase
          .from("profiles")
          .select("subscription_status, credits")
          .eq("id", profile.id)
          .single();

        const isPremium = freshProfile?.subscription_status === "active" || freshProfile?.credits === -1;

        const message = isPremium
          ? `🎉 *Bem-vindo ao Cérebro de Bolso!*\n\n` +
            `Sua assinatura foi ativada com sucesso! ✅\n` +
            `Seus créditos são *ilimitados*! 🚀\n\n` +
            `Me envie mensagens de texto ou áudio com suas ideias e tarefas.\n\n` +
            `Eu vou organizar tudo automaticamente no seu painel. 🧠\n\n` +
            `Experimente agora! Me mande uma ideia ou tarefa.`
          : `🎉 *Bem-vindo ao Cérebro de Bolso!*\n\n` +
            `Você ganhou *10 créditos gratuitos* para testar! 🎁\n\n` +
            `Me envie mensagens de texto ou áudio com suas ideias e tarefas.\n\n` +
            `Eu vou organizar tudo automaticamente no seu painel. 🧠\n\n` +
            `Experimente agora! Me mande uma ideia ou tarefa.`;

        await supabase.functions.invoke("whatsapp-lembrete", {
          body: { type: "welcome", phone: cleaned, message },
        });
      } catch (e) {
        console.log("Welcome message error (non-blocking):", e);
      }

      await refreshProfile();
      toast.success("WhatsApp salvo com sucesso!");
    } catch {
      toast.error("Erro ao salvar. Tente novamente.");
    }
    setLoading(false);
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent className="rounded-3xl border-border/60 sm:max-w-md [&>button]:hidden">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <MessageSquare className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="font-heading text-xl">Conecte seu WhatsApp</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Para receber lembretes e enviar tarefas por áudio, precisamos do seu número com código do país e DDD.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <Input
            type="tel"
            placeholder="553199999999"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-13 rounded-2xl border-border/60 bg-background text-center text-lg tracking-widest placeholder:text-muted-foreground/40"
          />
          <p className="text-center text-xs text-muted-foreground">
            Exemplo: <strong>55</strong> (país) + <strong>31</strong> (DDD) + <strong>999999999</strong>
          </p>
          <Button
            onClick={handleSave}
            disabled={phone.replace(/\D/g, "").length < 12 || loading}
            className="h-13 w-full rounded-2xl text-base font-semibold"
          >
            {loading ? "Salvando..." : "Salvar e continuar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WhatsAppOnboardingModal;
