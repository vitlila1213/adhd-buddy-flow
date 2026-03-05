import { useState } from "react";
import { usePhoneAuth } from "@/contexts/PhoneAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Brain } from "lucide-react";

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
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
            <Brain className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            Cérebro de Bolso
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Seu assistente para TDAH via WhatsApp
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-foreground">
              Seu número de telefone
            </label>
            <Input
              id="phone"
              type="tel"
              placeholder="(11) 99999-9999"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              className="h-12 text-base"
            />
          </div>
          <Button
            type="submit"
            className="h-12 w-full text-base font-semibold"
            disabled={phoneInput.replace(/\D/g, "").length < 10}
          >
            Entrar no Painel
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Use o mesmo número conectado ao WhatsApp
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
