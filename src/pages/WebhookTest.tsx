import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Send, Loader2, CheckCircle2, XCircle, ArrowLeft, Zap, CreditCard, Gift } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";

interface LogEntry {
  id: number;
  timestamp: string;
  type: "request" | "response";
  status: "success" | "error";
  content: string;
}

const WebhookTest = () => {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("5511934396102");
  const [platform, setPlatform] = useState("hotmart");
  const [event, setEvent] = useState("PURCHASE_APPROVED");
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logCounter, setLogCounter] = useState(0);
  const [trialEmail, setTrialEmail] = useState("");
  const [trialLoading, setTrialLoading] = useState(false);

  const addLog = (type: "request" | "response", status: "success" | "error", content: string) => {
    setLogCounter((prev) => {
      const newId = prev + 1;
      setLogs((logs) => [
        {
          id: newId,
          timestamp: new Date().toLocaleTimeString("pt-BR"),
          type,
          status,
          content,
        },
        ...logs,
      ]);
      return newId;
    });
  };

  const buildPayload = () => {
    if (platform === "hotmart") {
      return {
        event,
        phone,
        data: {
          buyer: { email, name: "Usuário Teste", phone },
          purchase: { status: event === "PURCHASE_APPROVED" ? "approved" : "cancelled" },
        },
      };
    }
    if (platform === "kiwify") {
      return {
        order_status: event === "PURCHASE_APPROVED" ? "paid" : "refunded",
        phone,
        Customer: { email, full_name: "Usuário Teste", mobile: phone },
      };
    }
    return { email, phone, event, platform: "manual", name: "Usuário Teste" };
  };

  const sendWebhook = async () => {
    if (!email) return;
    setLoading(true);

    const payload = buildPayload();
    addLog("request", "success", JSON.stringify(payload, null, 2));

    try {
      const { data, error } = await supabase.functions.invoke("webhook-pagamento", { body: payload });
      addLog("response", error ? "error" : "success", JSON.stringify(error || data, null, 2));
    } catch (err: any) {
      addLog("response", "error", err.message || "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  const events = platform === "hotmart"
    ? [
        { value: "PURCHASE_APPROVED", label: "✅ Compra Aprovada" },
        { value: "PURCHASE_CANCELED", label: "❌ Compra Cancelada" },
        { value: "PURCHASE_REFUNDED", label: "💸 Reembolso" },
        { value: "SUBSCRIPTION_CANCELLATION", label: "🚫 Cancelamento Assinatura" },
      ]
    : platform === "kiwify"
    ? [
        { value: "PURCHASE_APPROVED", label: "✅ Pago" },
        { value: "PURCHASE_CANCELED", label: "❌ Cancelado" },
        { value: "PURCHASE_REFUNDED", label: "💸 Reembolsado" },
      ]
    : [
        { value: "purchase_approved", label: "✅ Ativar" },
        { value: "purchase_canceled", label: "❌ Desativar" },
      ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link to="/">
            <Button variant="ghost" size="icon" className="rounded-xl">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Teste de Pagamento
            </h1>
            <p className="text-xs text-muted-foreground">Simule webhooks de Hotmart / Kiwify</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
        {/* Config */}
        <Card className="rounded-2xl border-border/50 p-4 shadow-sm space-y-4">
          <div>
            <Label className="text-xs font-medium text-muted-foreground">E-mail do comprador</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@email.com"
              type="email"
              className="mt-1.5 rounded-xl"
            />
          </div>

          <div>
            <Label className="text-xs font-medium text-muted-foreground">WhatsApp (com código do país)</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="5511999999999"
              className="mt-1.5 rounded-xl"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              O WhatsApp será salvo no perfil e receberá a mensagem de boas-vindas.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Plataforma</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger className="mt-1.5 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hotmart">Hotmart</SelectItem>
                  <SelectItem value="kiwify">Kiwify</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Evento</Label>
              <Select value={event} onValueChange={setEvent}>
                <SelectTrigger className="mt-1.5 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {events.map((e) => (
                    <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={sendWebhook}
            disabled={loading || !email}
            className="w-full rounded-xl"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Simular Webhook de Pagamento
          </Button>
        </Card>

        {/* Trial Grátis */}
        <Card className="rounded-2xl border-primary/30 bg-primary/5 p-4 shadow-sm space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Gift className="h-4 w-4 text-primary" />
            🎁 Ativar 1 Mês Grátis
          </h3>
          <p className="text-xs text-muted-foreground">
            Insira o e-mail do usuário para ativar 30 dias de acesso ilimitado gratuitamente.
          </p>
          <div className="flex gap-2">
            <Input
              value={trialEmail}
              onChange={(e) => setTrialEmail(e.target.value)}
              placeholder="usuario@email.com"
              type="email"
              className="flex-1 rounded-xl"
            />
            <Button
              onClick={async () => {
                if (!trialEmail) return;
                setTrialLoading(true);
                try {
                  const { data, error } = await supabase.functions.invoke("webhook-pagamento", {
                    body: {
                      email: trialEmail,
                      event: "purchase_approved",
                      platform: "manual",
                      name: "Trial Grátis",
                    },
                  });
                  if (error) throw error;
                  addLog("response", "success", `✅ Trial ativado para ${trialEmail}\n${JSON.stringify(data, null, 2)}`);
                  setTrialEmail("");
                  toast.success("1 mês grátis ativado com sucesso!");
                } catch (err: any) {
                  addLog("response", "error", err.message || "Erro ao ativar trial");
                  toast.error("Erro ao ativar trial");
                } finally {
                  setTrialLoading(false);
                }
              }}
              disabled={trialLoading || !trialEmail}
              className="rounded-xl shrink-0"
            >
              {trialLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Gift className="mr-2 h-4 w-4" />}
              Ativar
            </Button>
          </div>
        </Card>

        {/* URL do Webhook */}
        <Card className="rounded-2xl border-border/50 p-4 shadow-sm">
          <Label className="text-xs font-medium text-muted-foreground">URL do Webhook (configure na Hotmart/Kiwify)</Label>
          <div className="mt-1.5 flex items-center gap-2">
            <code className="flex-1 rounded-xl bg-muted/50 px-3 py-2 text-xs text-foreground/80 break-all">
              {`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/webhook-pagamento`}
            </code>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl shrink-0"
              onClick={() => {
                navigator.clipboard.writeText(
                  `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/webhook-pagamento`
                );
              }}
            >
              Copiar
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Cole esta URL nas configurações de webhook da sua plataforma de pagamento.
          </p>
        </Card>

        {/* Logs */}
        <Card className="rounded-2xl border-border/50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium text-muted-foreground">Logs</Label>
            {logs.length > 0 && (
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setLogs([])}>
                Limpar
              </Button>
            )}
          </div>

          <div className="mt-2 max-h-[400px] space-y-2 overflow-y-auto">
            <AnimatePresence>
              {logs.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum log ainda. Simule um pagamento para começar.
                </p>
              )}
              {logs.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-xl border border-border/40 bg-muted/30 p-3"
                >
                  <div className="mb-1 flex items-center gap-2">
                    {log.status === "success" ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-red-500" />
                    )}
                    <Badge
                      variant={log.type === "request" ? "default" : "secondary"}
                      className="rounded-lg text-[10px]"
                    >
                      {log.type === "request" ? "REQUEST" : "RESPONSE"}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">{log.timestamp}</span>
                  </div>
                  <pre className="max-h-[150px] overflow-auto whitespace-pre-wrap text-[11px] text-foreground/80">
                    {log.content}
                  </pre>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default WebhookTest;
