import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Brain, Mail, Lock, Sparkles, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@") || password.length < 6) return;
    setLoading(true);

    if (isSignUp) {
      const { error } = await signUp(email, password);
      setLoading(false);
      if (error) {
        toast.error(error.message || "Erro ao criar conta. Tente novamente.");
      } else {
        toast.success("Conta criada com sucesso! Faça login.");
        setIsSignUp(false);
      }
    } else {
      const { error } = await signIn(email, password);
      setLoading(false);
      if (error) {
        toast.error("Email ou senha incorretos.");
      }
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
          <Button
            type="submit"
            disabled={!email.includes("@") || password.length < 6 || loading}
            className="h-13 w-full rounded-2xl text-base font-semibold shadow-lg shadow-primary/20 transition-all duration-200 hover:shadow-xl hover:shadow-primary/30"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 animate-spin" /> {isSignUp ? "Criando..." : "Entrando..."}
              </span>
            ) : isSignUp ? (
              "Criar minha conta"
            ) : (
              "Acessar meu Cérebro"
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {isSignUp ? "Já tem conta?" : "Ainda não tem conta?"}{" "}
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="font-semibold text-primary hover:underline"
          >
            {isSignUp ? "Fazer login" : "Criar conta"}
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default LoginPage;
