import { Brain, Check, Crown, Sparkles, Zap, Shield, MessageSquare, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const features = [
  { icon: MessageSquare, title: "WhatsApp Inteligente", desc: "Mande áudio ou texto. A IA organiza tudo pra você." },
  { icon: Brain, title: "Zero Esforço Mental", desc: "Esvazie sua mente. Nós classificamos ideias e tarefas." },
  { icon: Zap, title: "Kanban Visual", desc: "Veja tudo organizado em um painel limpo e intuitivo." },
  { icon: Shield, title: "Lembretes Automáticos", desc: "Nunca mais esqueça. Receba alertas no WhatsApp." },
];

const plans = [
  {
    name: "Mensal",
    price: "29,90",
    period: "/mês",
    link: "https://pay.kiwify.com.br/o9VoTdd",
    highlight: false,
    badge: null,
  },
  {
    name: "Trimestral",
    price: "74,90",
    period: "/trimestre",
    link: "https://pay.kiwify.com.br/qaehX5t",
    highlight: true,
    badge: "Mais Vendido",
  },
  {
    name: "Semestral",
    price: "119,90",
    period: "/semestre",
    link: "https://pay.kiwify.com.br/TonUbU4",
    highlight: false,
    badge: "Melhor Custo-Benefício",
  },
];

const planFeatures = ["Uso Ilimitado do Robô", "Acesso ao Kanban Premium", "Lembretes via WhatsApp", "Suporte Prioritário"];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" },
  }),
};

const VendasPage = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="glass fixed left-0 right-0 top-0 z-50">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/25">
              <Brain className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-heading text-base font-bold tracking-tight text-foreground">
              Cérebro de Bolso
            </span>
          </Link>
          <Link to="/">
            <Button variant="ghost" size="sm" className="text-sm text-muted-foreground">
              Já tenho conta
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="px-5 pb-16 pt-28 sm:pb-24 sm:pt-36">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-primary shadow-xl shadow-primary/25"
          >
            <Brain className="h-10 w-10 text-primary-foreground" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="font-heading text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl"
          >
            Seu Segundo Cérebro
            <br />
            <span className="text-primary">no WhatsApp</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg"
          >
            Esvazie sua mente mandando áudios e textos no WhatsApp. A IA organiza
            tudo em ideias e tarefas — automaticamente. Feito para quem tem TDAH.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.5 }}
            className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
          >
            <Link to="/">
              <Button size="lg" className="h-14 rounded-2xl px-8 text-base font-semibold shadow-lg shadow-primary/20">
                <Sparkles className="mr-2 h-5 w-5" />
                Começar Gratuitamente
              </Button>
            </Link>
            <a href="#planos">
              <Button variant="outline" size="lg" className="h-14 rounded-2xl px-8 text-base font-semibold">
                Ver Planos
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </a>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-4 text-xs text-muted-foreground/60"
          >
            10 ideias grátis • Sem cartão de crédito
          </motion.p>
        </div>
      </section>

      {/* Features */}
      <section className="bg-card/50 px-5 py-16 sm:py-24">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-12 text-center font-heading text-2xl font-bold text-foreground sm:text-3xl">
            Como funciona
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                variants={fadeUp}
                className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-heading text-base font-bold text-foreground">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="planos" className="px-5 py-16 sm:py-24">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-4 text-center font-heading text-2xl font-bold text-foreground sm:text-3xl">
            Planos Premium
          </h2>
          <p className="mb-12 text-center text-sm text-muted-foreground">
            Desbloqueie uso ilimitado do seu segundo cérebro
          </p>
          <div className="grid gap-5 sm:grid-cols-3">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                variants={fadeUp}
                className={`relative overflow-hidden rounded-2xl border p-6 shadow-sm transition-shadow hover:shadow-md ${
                  plan.highlight
                    ? "border-primary bg-card shadow-lg shadow-primary/10"
                    : "border-border/50 bg-card"
                }`}
              >
                {plan.badge && (
                  <div className={`absolute right-3 top-3 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${
                    plan.highlight
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {plan.badge}
                  </div>
                )}
                <h3 className="font-heading text-lg font-bold text-foreground">{plan.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-sm text-muted-foreground">R$</span>
                  <span className="font-heading text-3xl font-extrabold text-foreground">
                    {plan.price}
                  </span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </div>
                <ul className="mt-5 space-y-2.5">
                  {planFeatures.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
                <a href={plan.link} target="_blank" rel="noopener noreferrer" className="mt-6 block">
                  <Button
                    className={`w-full rounded-xl font-semibold ${
                      plan.highlight
                        ? "shadow-lg shadow-primary/20"
                        : ""
                    }`}
                    variant={plan.highlight ? "default" : "outline"}
                  >
                    <Crown className="mr-2 h-4 w-4" />
                    Assinar Agora
                  </Button>
                </a>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 px-5 py-8">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs text-muted-foreground/60">
            © {new Date().getFullYear()} Cérebro de Bolso. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default VendasPage;
