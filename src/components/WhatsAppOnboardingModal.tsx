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

const WhatsAppOnboardingModal = () => {
  const { profile, updateProfile } = useAuth();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const isOpen = !!profile && !profile.whatsapp_number;

  const handleSave = async () => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length < 12) {
      toast.error("Digite o número completo com código do país e DDD (ex: 553199999999)");
      return;
    }
    setLoading(true);
    try {
      await updateProfile({ whatsapp_number: cleaned });
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
