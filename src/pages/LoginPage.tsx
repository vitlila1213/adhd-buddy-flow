import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Brain, Mail, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signInWithOtp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return;
    setLoading(true);
    const { error } = await signInWithOtp(email);
    setLoading(false);
    if (error) {
      toast.error("Erro ao enviar o link mágico. Tente novamente.");
    } else {
      setSent(true);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        <div className="mb-10 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.4, ease: "easeOut" }}
            className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-primary shadow-xl shadow-primary/25"
          >
            <Brain className="h-10 w-10 text-primary-foreground" />
          </motion.div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            Cérebro de Bolso
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Seu assistente para TDAH via WhatsApp
          </p>
        </div>

        {!sent ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-foreground">
                Seu e-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="voce@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-13 rounded-2xl border-border/60 bg-card pl-10 text-base shadow-sm placeholder:text-muted-foreground/50 focus-visible:ring-primary"
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={!email.includes("@") || loading}
              className="h-13 w-full rounded-2xl text-base font-semibold shadow-lg shadow-primary/20 transition-all duration-200 hover:shadow-xl hover:shadow-primary/30"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 animate-spin" /> Enviando...
                </span>
              ) : (
                "Acessar meu Cérebro"
              )}
            </Button>
          </form>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border border-border/60 bg-card p-6 text-center shadow-sm"
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-status-done-bg">
              <Mail className="h-6 w-6 text-status-done-text" />
            </div>
            <h2 className="mb-2 font-heading text-lg font-bold text-foreground">
              Link mágico enviado! ✨
            </h2>
            <p className="text-sm text-muted-foreground">
              Enviamos um link para <strong className="text-foreground">{email}</strong>.
              Clique nele para entrar (verifique o spam).
            </p>
            <Button
              variant="ghost"
              className="mt-4 text-sm text-primary"
              onClick={() => setSent(false)}
            >
              Usar outro e-mail
            </Button>
          </motion.div>
        )}

        <p className="mt-8 text-center text-xs text-muted-foreground/70">
          Sem senha. Um clique e você está dentro.
        </p>
      </motion.div>
    </div>
  );
};

export default LoginPage;
