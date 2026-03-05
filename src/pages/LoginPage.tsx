import { useState } from "react";
import { usePhoneAuth } from "@/contexts/PhoneAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Brain } from "lucide-react";
import { motion } from "framer-motion";

const LoginPage = () => {
  const [phoneInput, setPhoneInput] = useState("");
  const { login } = usePhoneAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneInput.replace(/\D/g, "").length >= 10) {
      login(phoneInput);
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
            <label htmlFor="phone" className="mb-2 block text-sm font-medium text-foreground">
              Seu número de telefone
            </label>
            <Input
              id="phone"
              type="tel"
              placeholder="(31) 99999-9999"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              className="h-13 rounded-2xl border-border/60 bg-card text-base shadow-sm placeholder:text-muted-foreground/50 focus-visible:ring-primary"
            />
          </div>
          <Button
            type="submit"
            className="h-13 w-full rounded-2xl text-base font-semibold shadow-lg shadow-primary/20 transition-all duration-200 hover:shadow-xl hover:shadow-primary/30"
            disabled={phoneInput.replace(/\D/g, "").length < 10}
          >
            Entrar no Painel
          </Button>
        </form>

        <p className="mt-8 text-center text-xs text-muted-foreground/70">
          Use o mesmo número conectado ao WhatsApp
        </p>
      </motion.div>
    </div>
  );
};

export default LoginPage;
