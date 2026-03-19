import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Lock, Sparkles, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Mode = "login" | "signup" | "forgot";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, signUp } = useAuth();

  const passwordsMatch = password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      setLoading(false);
      if (error) {
        toast.error("Erro ao enviar email de recuperação.");
      } else {
        toast.success("Email de recuperação enviado! Verifique sua caixa de entrada.");
        setMode("login");
      }
      return;
    }

    if (!email.includes("@") || password.length < 6) {
      setLoading(false);
      return;
    }

    if (mode === "signup") {
      if (!passwordsMatch) {
        setLoading(false);
        toast.error("As senhas não coincidem.");
        return;
      }
      const { error } = await signUp(email, password);
      setLoading(false);
      if (error) {
        toast.error(error.message || "Erro ao criar conta. Tente novamente.");
      } else {
        toast.success("Conta criada com sucesso! Faça login.");
        setMode("login");
      }
    } else {
      const { error } = await signIn(email, password);
      setLoading(false);
      if (error) {
        toast.error("Email ou senha incorretos.");
      }
    }
  };

  const isDisabled = () => {
    if (loading) return true;
    if (mode === "forgot") return !email.includes("@");
    if (!email.includes("@") || password.length < 6) return true;
    if (mode === "signup" && !passwordsMatch) return true;
    return false;
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
            className="mx-auto mb-5"
          >
            <img alt="Cérebro de Bolso" className="mx-auto h-20 w-20 object-contain" src="/lovable-uploads/a22f2c7d-63b0-47e6-ae34-48fa9b00b748.png" />
          </motion.div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            Cérebro de Bolso
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {mode === "forgot"
              ? "Digite seu e-mail para recuperar a senha"
              : "Seu assistente pessoal via WhatsApp"}
          </p>
        </div>

        <AnimatePresence mode="wait">
          <motion.form
            key={mode}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
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

            {mode !== "forgot" && (
              <>
                <div>
                  <label htmlFor="password" className="mb-2 block text-sm font-medium text-foreground">
                    Senha
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-13 rounded-2xl border-border/60 bg-card pl-10 pr-10 text-base shadow-sm placeholder:text-muted-foreground/50 focus-visible:ring-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {mode === "signup" && (
                  <div>
                    <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-foreground">
                      Confirmar senha
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        type={showPassword ? "text" : "password"}
                        placeholder="Repita a senha"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="h-13 rounded-2xl border-border/60 bg-card pl-10 pr-10 text-base shadow-sm placeholder:text-muted-foreground/50 focus-visible:ring-primary"
                      />
                    </div>
                    {confirmPassword.length > 0 && !passwordsMatch && (
                      <p className="mt-1.5 text-xs text-destructive">As senhas não coincidem</p>
                    )}
                  </div>
                )}
              </>
            )}

            <Button
              type="submit"
              disabled={isDisabled()}
              className="h-13 w-full rounded-2xl text-base font-semibold shadow-lg shadow-primary/20 transition-all duration-200 hover:shadow-xl hover:shadow-primary/30"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 animate-spin" />
                  {mode === "forgot" ? "Enviando..." : mode === "signup" ? "Criando..." : "Entrando..."}
                </span>
              ) : mode === "forgot" ? (
                "Enviar email de recuperação"
              ) : mode === "signup" ? (
                "Criar minha conta"
              ) : (
                "Acessar meu Cérebro"
              )}
            </Button>
          </motion.form>
        </AnimatePresence>

        <div className="mt-6 space-y-2 text-center text-sm text-muted-foreground">
          {mode === "forgot" ? (
            <button
              type="button"
              onClick={() => setMode("login")}
              className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar ao login
            </button>
          ) : (
            <>
              <p>
                {mode === "signup" ? "Já tem conta?" : "Ainda não tem conta?"}{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === "signup" ? "login" : "signup");
                    setConfirmPassword("");
                  }}
                  className="font-semibold text-primary hover:underline"
                >
                  {mode === "signup" ? "Fazer login" : "Criar conta"}
                </button>
              </p>
              <p>
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="text-muted-foreground hover:text-primary hover:underline"
                >
                  Esqueci minha senha
                </button>
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
