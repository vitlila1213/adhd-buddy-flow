import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar, CheckCircle, XCircle, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface Integration {
  id: string;
  provider: string;
  connected_at: string;
  token_expires_at: string | null;
}

const IntegracoesTab = () => {
  const { user } = useAuth();
  const [integration, setIntegration] = useState<Integration | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  const fetchIntegration = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_integrations")
      .select("*")
      .eq("user_id", user.id)
      .eq("provider", "google_calendar")
      .maybeSingle();
    setIntegration(data as Integration | null);
    setLoading(false);
  };

  useEffect(() => {
    fetchIntegration();

    const params = new URLSearchParams(window.location.search);
    const gcalStatus = params.get("gcal_status");
    if (gcalStatus === "success") {
      toast.success("Google Agenda conectado com sucesso! 🎉");
      fetchIntegration();
      window.history.replaceState({}, "", window.location.pathname);
    } else if (gcalStatus === "error") {
      const reason = params.get("reason") || "unknown";
      toast.error(`Erro ao conectar Google Agenda: ${reason}`);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [user]);

  const handleConnect = async () => {
    if (!user) return;
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-calendar-auth", {
        body: { userId: user.id },
      });

      if (error) throw error;
      if (data?.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (e) {
      console.error("Connect error:", e);
      toast.error("Erro ao iniciar conexão com Google");
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user || !integration) return;
    const { error } = await supabase
      .from("user_integrations")
      .delete()
      .eq("id", integration.id);

    if (error) {
      toast.error("Erro ao desconectar");
    } else {
      setIntegration(null);
      toast.success("Google Agenda desconectado");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">🔗 Integrações</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Conecte serviços externos para sincronizar seus dados automaticamente.
        </p>
      </div>

      <Card className="p-5 border-l-4 border-l-primary">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Calendar className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">Google Agenda</h3>
              {integration ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                  <CheckCircle className="h-3 w-3" />
                  Conectado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  <XCircle className="h-3 w-3" />
                  Desconectado
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Sincronize compromissos e tarefas agendadas automaticamente com sua agenda do Google.
              Quando o agente criar um item com data e hora, ele será adicionado à sua agenda.
            </p>

            {integration && (
              <p className="text-xs text-muted-foreground mt-2">
                Conectado em: {new Date(integration.connected_at).toLocaleDateString("pt-BR")}
              </p>
            )}

            <div className="mt-4 flex gap-2">
              {integration ? (
                <Button variant="destructive" size="sm" onClick={handleDisconnect}>
                  Desconectar
                </Button>
              ) : (
                <Button onClick={handleConnect} disabled={connecting} size="sm" className="bg-primary hover:bg-primary/90">
                  {connecting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Conectando...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-4 w-4" />
                      Conectar Google Agenda
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card className="border-dashed border-accent/30 p-5">
        <div className="text-center text-muted-foreground">
          <p className="text-sm">🚀 Mais integrações em breve!</p>
          <p className="text-xs mt-1">Notion, Trello, e mais...</p>
        </div>
      </Card>
    </div>
  );
};

export default IntegracoesTab;
