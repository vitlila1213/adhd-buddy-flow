import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Send, Loader2, CheckCircle2, XCircle, ArrowLeft, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";

interface LogEntry {
  id: number;
  timestamp: string;
  type: "request" | "response";
  status: "success" | "error";
  payload: string;
  responseData: string;
}

const SAMPLE_PAYLOADS = [
  {
    label: "Texto simples",
    payload: {
      chat: { phone: "" },
      message: { text: "", messageType: "text", fromMe: false, wasSentByApi: false },
    },
  },
  {
    label: "Tarefa com horário",
    payload: {
      chat: { phone: "" },
      message: { text: "Me lembra de tomar remédio amanhã às 9h", messageType: "text", fromMe: false, wasSentByApi: false },
    },
  },
  {
    label: "Ideia solta",
    payload: {
      chat: { phone: "" },
      message: { text: "Tive uma ideia: criar um app que organiza pensamentos de quem tem TDAH", messageType: "text", fromMe: false, wasSentByApi: false },
    },
  },
  {
    label: "Concluir tarefa",
    payload: {
      chat: { phone: "" },
      message: { text: "Já fiz a reunião com o cliente", messageType: "text", fromMe: false, wasSentByApi: false },
    },
  },
];

const WebhookTest = () => {
  const [phone, setPhone] = useState("5511934396102");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logCounter, setLogCounter] = useState(0);

  const sendWebhook = async (text: string) => {
    if (!phone || !text) return;

    setLoading(true);
    const payload = {
      chat: { phone },
      message: { text, messageType: "text", fromMe: false, wasSentByApi: false },
    };

    const newId = logCounter + 1;
    setLogCounter(newId);

    const requestLog: LogEntry = {
      id: newId,
      timestamp: new Date().toLocaleTimeString("pt-BR"),
      type: "request",
      status: "success",
      payload: JSON.stringify(payload, null, 2),
      responseData: "",
    };

    setLogs((prev) => [requestLog, ...prev]);

    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-recebedor", {
        body: payload,
      });

      const responseLog: LogEntry = {
        id: newId + 0.5,
        timestamp: new Date().toLocaleTimeString("pt-BR"),
        type: "response",
        status: error ? "error" : "success",
        payload: "",
        responseData: JSON.stringify(error || data, null, 2),
      };

      setLogs((prev) => [responseLog, ...prev]);
    } catch (err: any) {
      const errorLog: LogEntry = {
        id: newId + 0.5,
        timestamp: new Date().toLocaleTimeString("pt-BR"),
        type: "response",
        status: "error",
        payload: "",
        responseData: err.message || "Erro desconhecido",
      };
      setLogs((prev) => [errorLog, ...prev]);
    } finally {
      setLoading(false);
    }
  };

  const testLembrete = async () => {
    setLoading(true);
    const newId = logCounter + 1;
    setLogCounter(newId);

    const requestLog: LogEntry = {
      id: newId,
      timestamp: new Date().toLocaleTimeString("pt-BR"),
      type: "request",
      status: "success",
      payload: "Invocando whatsapp-lembrete...",
      responseData: "",
    };
    setLogs((prev) => [requestLog, ...prev]);

    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-lembrete", {
        body: {},
      });

      const responseLog: LogEntry = {
        id: newId + 0.5,
        timestamp: new Date().toLocaleTimeString("pt-BR"),
        type: "response",
        status: error ? "error" : "success",
        payload: "",
        responseData: JSON.stringify(error || data, null, 2),
      };
      setLogs((prev) => [responseLog, ...prev]);
    } catch (err: any) {
      const errorLog: LogEntry = {
        id: newId + 0.5,
        timestamp: new Date().toLocaleTimeString("pt-BR"),
        type: "response",
        status: "error",
        payload: "",
        responseData: err.message || "Erro desconhecido",
      };
      setLogs((prev) => [errorLog, ...prev]);
    } finally {
      setLoading(false);
    }
  };

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
            <h1 className="text-lg font-semibold text-foreground">Teste de Webhook</h1>
            <p className="text-xs text-muted-foreground">Simule mensagens do WhatsApp</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
        {/* Phone */}
        <Card className="rounded-2xl border-border/50 p-4 shadow-sm">
          <Label className="text-xs font-medium text-muted-foreground">Número do WhatsApp</Label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="5511999999999"
            className="mt-1.5 rounded-xl"
          />
        </Card>

        {/* Quick payloads */}
        <Card className="rounded-2xl border-border/50 p-4 shadow-sm">
          <Label className="text-xs font-medium text-muted-foreground">Payloads rápidos</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {SAMPLE_PAYLOADS.map((sample) => (
              <Button
                key={sample.label}
                variant="outline"
                size="sm"
                className="rounded-xl text-xs"
                onClick={() => {
                  const p = { ...sample.payload };
                  p.chat.phone = phone;
                  p.message.text = p.message.text || message || "Teste genérico";
                  sendWebhook(p.message.text);
                }}
                disabled={loading}
              >
                <Zap className="mr-1 h-3 w-3" />
                {sample.label}
              </Button>
            ))}
          </div>
        </Card>

        {/* Custom message */}
        <Card className="rounded-2xl border-border/50 p-4 shadow-sm">
          <Label className="text-xs font-medium text-muted-foreground">Mensagem personalizada</Label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Digite uma mensagem para simular..."
            className="mt-1.5 min-h-[80px] rounded-xl"
          />
          <div className="mt-3 flex gap-2">
            <Button
              onClick={() => sendWebhook(message)}
              disabled={loading || !message}
              className="flex-1 rounded-xl"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Enviar Webhook
            </Button>
            <Button
              onClick={testLembrete}
              disabled={loading}
              variant="secondary"
              className="rounded-xl"
            >
              ⏰ Testar Lembrete
            </Button>
          </div>
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
                  Nenhum log ainda. Envie um webhook para começar.
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
                    {log.payload || log.responseData}
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
