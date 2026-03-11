import { Brain, Check, Crown, Sparkles, Zap, Shield, MessageSquare, ArrowRight, Calendar, Gift, Tag, Mic, BarChart3, Bell, Star, ChevronDown, X, Camera, FileText, CreditCard, Clock, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import logoImg from "@/assets/logo.png";
import InstallPWAButton from "@/components/InstallPWAButton";

// Hook para countdown até fim do dia
const useCountdown = () => {
  const getTimeLeft = () => {
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    const diff = endOfDay.getTime() - now.getTime();

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff % (1000 * 60 * 60) / (1000 * 60));
    const seconds = Math.floor(diff % (1000 * 60) / 1000);

    return { hours, minutes, seconds };
  };

  const [timeLeft, setTimeLeft] = useState(getTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return timeLeft;
};

const features = [
{ icon: MessageSquare, title: "Registre Tudo no WhatsApp", desc: "Envie texto ou áudio. A IA entende, classifica e registra automaticamente. Sem cadastros, sem apps extras." },
{ icon: Brain, title: "Zero Esforço Mental", desc: "Esvazie sua mente. O Cérebro de Bolso organiza ideias, tarefas e finanças pra você focar no que importa." },
{ icon: Tag, title: "Categorias Personalizadas", desc: "Crie quantas categorias quiser. Organize gastos, tarefas e compromissos do seu jeito, com cores personalizadas." },
{ icon: Bell, title: "Lembretes Automáticos", desc: "Nunca mais esqueça um compromisso. Receba alertas no WhatsApp no horário certo." },
{ icon: Gift, title: "Aniversariantes", desc: "Cadastre aniversários e receba lembretes no dia anterior e no dia. Nunca mais esqueça de parabenizar alguém." },
{ icon: Calendar, title: "Google Agenda Integrado", desc: "Seus compromissos sincronizam automaticamente com o Google Agenda. Organização total em um só lugar." },
{ icon: Camera, title: "Visão Computacional", desc: "Envie foto de boletos e notas fiscais. A IA lê, extrai valores e datas de vencimento, e registra tudo automaticamente." },
{ icon: CreditCard, title: "Baixa Automática de Contas", desc: "Diga \"paguei a conta de luz\" e o sistema encontra a conta pendente e dá baixa automaticamente." },
{ icon: BarChart3, title: "Lembrete Diário", desc: "Todo dia às 7h você recebe no WhatsApp um resumo das contas a pagar e tarefas do dia." }];


const howItWorks = [
{ step: "1", title: "Mande uma mensagem", desc: "Texto, áudio ou foto no WhatsApp. Ex: \"gastei 50 no mercado\", envie a foto do boleto ou diga \"reunião amanhã às 15h\"." },
{ step: "2", title: "A IA organiza tudo", desc: "Categoriza automaticamente, registra no banco, lê boletos e notas, e sincroniza com Google Agenda." },
{ step: "3", title: "Acompanhe no painel", desc: "Veja tudo organizado em um painel visual com Kanban, gráficos e relatórios." }];


const examples = [
"Gastei 50 reais no iFood",
"Reunião com João amanhã às 15h",
"Aniversário do meu pai dia 7 de agosto",
"Quanto gastei esse mês?",
"Recebi 5 mil de salário",
"📸 [Foto do boleto de internet]",
"Paguei a conta da Vero",
"Me dá um relatório de gastos"];


const testimonials = [
{ name: "Ana Clara", role: "Empreendedora", text: "Finalmente parei de esquecer compromissos. O lembrete no WhatsApp é perfeito pra quem tem TDAH como eu!", stars: 5 },
{ name: "Lucas Mendes", role: "Estudante", text: "Uso pra controlar meus gastos. Só mando um áudio e tá registrado. Simples demais!", stars: 5 },
{ name: "Fernanda Costa", role: "Autônoma", text: "A integração com Google Agenda mudou minha vida. Tudo sincronizado automaticamente.", stars: 5 }];


const plan = {
  name: "Premium Mensal",
  price: "27,97",
  period: "/mês",
  link: "https://pay.kiwify.com.br/4IdnrMP"
};

const monthlyBenefits = [
{ icon: Zap, text: "Sem fidelidade — cancele quando quiser" },
{ icon: Shield, text: "Sem surpresas — valor fixo todo mês" },
{ icon: Sparkles, text: "Acesso total desde o primeiro dia" },
{ icon: CreditCard, text: "Menos de R$1 por dia para ter um assistente 24h" }];


const planFeatures = [
"Uso Ilimitado do Assistente",
"Texto, Áudio e Imagem no WhatsApp",
"Leitura de Boletos e Notas Fiscais",
"Kanban Visual Premium",
"Lembretes via WhatsApp",
"Lembrete Diário às 7h",
"Categorias Personalizadas",
"Aba de Aniversariantes",
"Integração Google Agenda",
"Relatórios Detalhados",
"Suporte Prioritário"];


const comparisonFeatures = [
{ feature: "Assistente via WhatsApp", cerebro: true, others: false },
{ feature: "Texto e Áudio", cerebro: true, others: false },
{ feature: "Leitura de Boletos por Foto 📸", cerebro: true, others: false },
{ feature: "Leitura de Notas Fiscais por Foto", cerebro: true, others: false },
{ feature: "Baixa Automática de Contas", cerebro: true, others: false },
{ feature: "Lembrete Diário às 7h no WhatsApp", cerebro: true, others: false },
{ feature: "Aniversariantes com Lembrete Automático 🎂", cerebro: true, others: false },
{ feature: "Google Agenda Integrado", cerebro: true, others: false },
{ feature: "Categorias com Cores Personalizadas", cerebro: true, others: false },
{ feature: "Relatório Financeiro por Categoria", cerebro: true, others: true },
{ feature: "Kanban de Tarefas", cerebro: true, others: true },
{ feature: "Controle de Gastos", cerebro: true, others: true }];


const faqs = [
{ q: "Como funciona o Cérebro de Bolso?", a: "Você envia mensagens de texto, áudio ou fotos pelo WhatsApp. Nossa IA interpreta, categoriza e registra automaticamente suas tarefas, ideias e finanças. Envie foto de um boleto e ele lê o valor e vencimento! Tudo aparece organizado no seu painel." },
{ q: "Preciso instalar algum aplicativo?", a: "Não! O Cérebro de Bolso funciona 100% pelo WhatsApp. O painel é acessado pelo navegador do celular ou computador, sem instalar nada." },
{ q: "Meus dados estão seguros?", a: "Sim. Utilizamos criptografia e todas as informações são armazenadas com segurança. Cada usuário só tem acesso aos seus próprios dados." },
{ q: "Como funciona a leitura de boletos?", a: "Basta enviar uma foto do boleto pelo WhatsApp. A IA identifica o valor, a empresa e a data de vencimento. Registra automaticamente como conta pendente e te lembra no dia do vencimento!" },
{ q: "Posso testar antes de assinar?", a: "Sim! Você recebe 10 créditos gratuitos ao se cadastrar. Sem cartão de crédito." },
{ q: "O que é a aba de Aniversariantes?", a: "É um recurso exclusivo onde você cadastra aniversários de amigos e familiares. O sistema envia lembretes automáticos no dia anterior e no dia do aniversário, com mensagem pronta pra enviar!" },
{ q: "Como funciona a baixa de contas?", a: "Quando você pagar uma conta, basta dizer \"paguei a conta de luz\" ou \"paguei a Vero\". A IA encontra a conta pendente e atualiza o status para pago automaticamente!" }];


const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" }
  })
};

const VendasPage = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const timeLeft = useCountdown();
  return (
    <div className="min-h-screen bg-background">
      {/* Announcement Bar with Urgency */}
      <div className="bg-gradient-to-r from-destructive to-destructive/80 px-4 py-2.5 text-center text-sm font-medium text-white">
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <span>🔥 Oferta por tempo limitado!</span>
          <span className="font-bold">
            {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
          </span>
          <span className="hidden sm:inline">— Garanta seu desconto agora</span>
        </div>
      </div>

      {/* Header */}
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-border/30 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Link to="/" className="flex items-center gap-3">
            <img src={logoImg} alt="Cérebro de Bolso" className="h-9 w-9 rounded-xl object-contain" />
            <span className="font-heading text-base font-bold tracking-tight text-foreground">Meu Cérebro de Bolso

            </span>
          </Link>
          <div className="flex items-center gap-3">
            <a href="#como-funciona" className="hidden text-sm text-muted-foreground hover:text-foreground sm:block">
              Como funciona
            </a>
            <a href="#planos" className="hidden text-sm text-muted-foreground hover:text-foreground sm:block">
              Planos
            </a>
            <InstallPWAButton />
            <Link to="/">
              <Button variant="outline" size="sm" className="rounded-xl text-sm">
                Login
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero - Navy background */}
      <section className="relative overflow-hidden bg-navy px-5 pb-20 pt-32 sm:pb-28 sm:pt-40">
        {/* Gradient orbs */}
        <div className="pointer-events-none absolute -left-32 top-20 h-72 w-72 rounded-full bg-primary/20 blur-[100px]" />
        <div className="pointer-events-none absolute -right-20 bottom-10 h-56 w-56 rounded-full bg-success/15 blur-[80px]" />
        <div className="pointer-events-none absolute left-1/2 top-1/3 h-40 w-40 -translate-x-1/2 rounded-full bg-accent/15 blur-[60px]" />

        <div className="relative mx-auto max-w-4xl text-center">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 text-base font-semibold text-primary">
            
            Você ainda tá tentando lembrar tudo de cabeça?
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="font-heading text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-6xl">
            
            Tenha um assistente pessoal
            <br />
            <span className="bg-gradient-to-r from-primary via-primary to-success bg-clip-text text-transparent">
              trabalhando 24h por dia pra você
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
            
            Mande áudio, texto ou foto no WhatsApp. A IA organiza tarefas, finanças e compromissos.
            Lê boletos, dá baixa em contas e lembra seus aniversários.
          </motion.p>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="mx-auto mt-8 flex flex-wrap items-center justify-center gap-3">
            
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 backdrop-blur-sm">
              <Shield className="h-4 w-4 text-success" />
              Dados Protegidos
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 backdrop-blur-sm">
              <Camera className="h-4 w-4 text-accent" />
              Lê Boletos por Foto
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 backdrop-blur-sm">
              <Mic className="h-4 w-4 text-primary" />
              Texto, Áudio e Foto
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.5 }}
            className="mt-10 flex flex-col items-center gap-4">
            
            <Link to="/">
              <Button size="lg" className="h-16 rounded-2xl bg-success px-12 text-lg font-bold text-white shadow-xl shadow-success/30 hover:bg-success/90">
                <Rocket className="mr-3 h-6 w-6" />
                Quero Organizar Minha Vida
                <ArrowRight className="ml-3 h-6 w-6" />
              </Button>
            </Link>
            <p className="text-sm font-medium text-success">
              🎁 10 créditos grátis • Sem cartão • Começa em 30 segundos
            </p>
            <a href="#planos">
              <Button variant="ghost" size="lg" className="h-12 rounded-2xl px-8 text-base text-white/60 hover:text-white hover:bg-white/5">
                Ou veja os planos premium →
              </Button>
            </a>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="bg-background px-5 py-16 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-4 text-center font-heading text-2xl font-bold text-foreground sm:text-3xl">
            Como funciona
          </h2>
          <p className="mb-12 text-center text-muted-foreground">
            Três passos simples para organizar sua vida
          </p>
          <div className="grid gap-8 sm:grid-cols-3">
            {howItWorks.map((item, i) =>
            <motion.div
              key={item.step}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={fadeUp}
              className="text-center">
              
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground shadow-lg shadow-primary/20">
                  {item.step}
                </div>
                <h3 className="font-heading text-lg font-bold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="bg-navy px-5 py-16 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-4 text-center font-heading text-2xl font-bold text-white sm:text-3xl">
            Tudo que você precisa em um só lugar
          </h2>
          <p className="mb-12 text-center text-white/60">
            Funcionalidades exclusivas que nenhum concorrente oferece juntas
          </p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => {
              const isExclusive = ["Aniversariantes", "Google Agenda Integrado", "Visão Computacional", "Baixa Automática de Contas", "Lembrete Diário"].includes(f.title);
              return (
                <motion.div
                  key={f.title}
                  custom={i}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-50px" }}
                  variants={fadeUp}
                  className={`relative rounded-2xl border p-6 shadow-sm ${
                  isExclusive ?
                  "border-primary/30 bg-primary/10" :
                  "border-white/10 bg-white/5"}`
                  }>
                  
                  {isExclusive &&
                  <span className="absolute right-3 top-3 rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
                      Exclusivo
                    </span>
                  }
                  <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${
                  isExclusive ? "bg-primary/25" : "bg-white/10"}`
                  }>
                    <f.icon className={`h-5 w-5 ${isExclusive ? "text-primary" : "text-success"}`} />
                  </div>
                  <h3 className="font-heading text-base font-bold text-white">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/60">{f.desc}</p>
                </motion.div>);

            })}
          </div>
        </div>
      </section>

      {/* Comparativo */}
      <section className="bg-background px-5 py-16 sm:py-24">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-4 text-center font-heading text-2xl font-bold text-foreground sm:text-3xl">
            Por que o Cérebro de Bolso é diferente?
          </h2>
          <p className="mb-12 text-center text-muted-foreground">
            Veja o que só a gente oferece comparado com outros apps de organização
          </p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">
            
            <div className="grid grid-cols-3 border-b border-border/50 bg-navy">
              <div className="px-4 py-4 text-sm font-semibold text-white/70 sm:px-6">
                Funcionalidade
              </div>
              <div className="flex items-center justify-center gap-2 px-4 py-4 text-sm font-bold text-primary sm:px-6">
                <Brain className="h-4 w-4" />
                Cérebro de Bolso
              </div>
              <div className="px-4 py-4 text-center text-sm font-semibold text-white/50 sm:px-6">
                Outros Apps
              </div>
            </div>
            {comparisonFeatures.map((item, i) =>
            <div
              key={i}
              className={`grid grid-cols-3 border-b border-border/20 last:border-0 ${
              !item.others ? "bg-success/[0.04]" : ""}`
              }>
              
                <div className="flex items-center px-4 py-3 text-xs font-medium text-foreground sm:px-6 sm:text-sm">
                  {item.feature}
                </div>
                <div className="flex items-center justify-center px-4 py-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-success/15">
                    <Check className="h-4 w-4 text-success" />
                  </div>
                </div>
                <div className="flex items-center justify-center px-4 py-3">
                  {item.others ?
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted">
                      <Check className="h-4 w-4 text-muted-foreground" />
                    </div> :

                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-destructive/10">
                      <X className="h-4 w-4 text-destructive" />
                    </div>
                }
                </div>
              </div>
            )}
          </motion.div>
          <div className="mt-8 text-center">
            <Link to="/">
              <Button size="lg" className="h-14 rounded-2xl bg-success px-10 text-base font-bold text-white shadow-xl shadow-success/30 hover:bg-success/90">
                <Rocket className="mr-2 h-5 w-5" />
                Experimentar de Graça
              </Button>
            </Link>
            <p className="mt-3 text-xs text-muted-foreground">10 créditos grátis • Sem cartão</p>
          </div>
        </div>
      </section>

      {/* Interactive examples */}
      <section className="bg-navy px-5 py-16 sm:py-24">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-4 text-center font-heading text-2xl font-bold text-white sm:text-3xl">
            Interaja com o Cérebro de Bolso 24h por dia
          </h2>
          <p className="mb-10 text-center text-white/60">
            Pergunte, registre ou envie fotos. Veja alguns exemplos:
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {examples.map((ex, i) =>
            <motion.div
              key={i}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="rounded-full border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm text-white">
              
                💬 {ex}
              </motion.div>
            )}
          </div>
          <div className="mt-10 text-center">
            <Link to="/">
              <Button size="lg" className="h-14 rounded-2xl bg-success px-10 text-base font-bold text-white shadow-xl shadow-success/30 hover:bg-success/90">
                <Rocket className="mr-2 h-5 w-5" />
                Começar Agora — É Grátis
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-background px-5 py-16 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-4 text-center font-heading text-2xl font-bold text-foreground sm:text-3xl">
            Quem usa, recomenda
          </h2>
          <p className="mb-12 text-center text-muted-foreground">
            Veja como o Cérebro de Bolso está ajudando pessoas reais
          </p>
          <div className="grid gap-6 sm:grid-cols-3">
            {testimonials.map((t, i) =>
            <motion.div
              key={t.name}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={fadeUp}
              className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
              
                <div className="mb-3 flex gap-0.5">
                  {Array.from({ length: t.stars }).map((_, j) =>
                <Star key={j} className="h-4 w-4 fill-accent text-accent" />
                )}
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">"{t.text}"</p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {t.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="planos" className="bg-navy px-5 py-16 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-4 text-center font-heading text-2xl font-bold text-white sm:text-3xl">
            Organize-se agora
          </h2>
          <p className="mb-12 text-center text-white/60">
            Assistente pessoal via WhatsApp 24h por dia
          </p>

          {/* Free trial CTA */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto mb-10 max-w-lg rounded-2xl border-2 border-dashed border-success/40 bg-success/10 p-6 text-center">
            
            <p className="text-sm font-semibold text-success">🎁 Ainda não tem certeza?</p>
            <p className="mt-1 text-2xl font-extrabold text-white">Teste grátis primeiro!</p>
            <p className="mt-2 text-sm text-white/60">Receba 10 créditos gratuitos. Sem cartão de crédito.</p>
            <Link to="/" className="mt-4 block">
              <Button size="lg" className="h-14 w-full rounded-2xl bg-success text-base font-bold text-white shadow-xl shadow-success/30 hover:bg-success/90">
                <Rocket className="mr-2 h-5 w-5" />
                Criar Minha Conta Grátis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto max-w-lg">
            
            <div className="relative overflow-hidden rounded-3xl border-2 border-primary bg-navy-light p-8 shadow-2xl shadow-primary/20 ring-2 ring-primary/30">
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-[60px]" />
              <div className="absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-success/10 blur-[50px]" />

              <div className="relative">
                {/* Urgency Countdown */}
                <div className="mb-4 rounded-xl bg-destructive/20 border border-destructive/30 p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-destructive animate-pulse" />
                    <span className="text-sm font-bold text-destructive uppercase tracking-wider">Oferta expira em:</span>
                  </div>
                  <div className="flex justify-center gap-3">
                    <div className="flex flex-col items-center">
                      <span className="text-2xl font-extrabold text-white">{String(timeLeft.hours).padStart(2, '0')}</span>
                      <span className="text-[10px] uppercase text-white/50">Horas</span>
                    </div>
                    <span className="text-2xl font-bold text-destructive">:</span>
                    <div className="flex flex-col items-center">
                      <span className="text-2xl font-extrabold text-white">{String(timeLeft.minutes).padStart(2, '0')}</span>
                      <span className="text-[10px] uppercase text-white/50">Min</span>
                    </div>
                    <span className="text-2xl font-bold text-destructive">:</span>
                    <div className="flex flex-col items-center">
                      <span className="text-2xl font-extrabold text-white">{String(timeLeft.seconds).padStart(2, '0')}</span>
                      <span className="text-[10px] uppercase text-white/50">Seg</span>
                    </div>
                  </div>
                </div>

                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent-foreground">
                  <Crown className="h-3.5 w-3.5" />
                  Plano Recomendado
                </div>

                <h3 className="font-heading text-2xl font-bold text-white">{plan.name}</h3>

                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-base text-white/50">R$</span>
                  <span className="font-heading text-5xl font-extrabold text-white">{plan.price}</span>
                  <span className="text-base text-white/50">{plan.period}</span>
                </div>
                <p className="mt-1 text-sm font-medium text-success">
                  Menos de R$1 por dia para organizar sua vida inteira
                </p>

                {/* Monthly benefits */}
                <div className="mt-6 space-y-3">
                  {monthlyBenefits.map((b, i) =>
                  <div key={i} className="flex items-center gap-3 text-sm text-white/80">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15">
                        <b.icon className="h-4 w-4 text-primary" />
                      </div>
                      {b.text}
                    </div>
                  )}
                </div>

                <div className="my-6 border-t border-white/10" />

                {/* Features list */}
                <ul className="space-y-2.5">
                  {planFeatures.map((f) =>
                  <li key={f} className="flex items-center gap-2.5 text-sm text-white/70">
                      <Check className="h-4 w-4 shrink-0 text-success" />
                      {f}
                    </li>
                  )}
                </ul>

                <a href={plan.link} target="_blank" rel="noopener noreferrer" className="mt-8 block">
                  <Button size="lg" className="h-16 w-full rounded-2xl bg-success text-lg font-bold text-white shadow-xl shadow-success/30 hover:bg-success/90">
                    <Crown className="mr-3 h-6 w-6" />
                    Quero o Plano Premium — R${plan.price}/mês
                    <ArrowRight className="ml-3 h-6 w-6" />
                  </Button>
                </a>
                <p className="mt-3 text-center text-xs text-white/40">
                  Pagamento 100% seguro • Cancele quando quiser
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-background px-5 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-12 text-center font-heading text-2xl font-bold text-foreground sm:text-3xl">
            Perguntas Frequentes
          </h2>
          <div className="space-y-3">
            {faqs.map((faq, i) =>
            <motion.div
              key={i}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="overflow-hidden rounded-2xl border border-border/50 bg-card">
              
                <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="flex w-full items-center justify-between px-6 py-4 text-left text-sm font-semibold text-foreground transition-colors hover:bg-muted/50">
                
                  {faq.q}
                  <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i &&
              <div className="px-6 pb-4 text-sm leading-relaxed text-muted-foreground">
                    {faq.a}
                  </div>
              }
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-navy px-5 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            className="mx-auto mb-6">
            
            <img src={logoImg} alt="Cérebro de Bolso" className="mx-auto h-20 w-20 rounded-[1.75rem] object-contain shadow-xl shadow-primary/25" />
          </motion.div>
          <h2 className="font-heading text-2xl font-extrabold text-white sm:text-4xl">
            Pare de tentar lembrar de tudo.
            <br />
            <span className="bg-gradient-to-r from-primary to-success bg-clip-text text-transparent">
              Deixe o Cérebro de Bolso fazer isso por você.
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-white/60">
            Comece agora e tenha um assistente pessoal no WhatsApp organizando sua vida 24 horas por dia.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4">
            <Link to="/">
              <Button size="lg" className="h-16 rounded-2xl bg-success px-12 text-lg font-bold text-white shadow-xl shadow-success/30 hover:bg-success/90">
                <Rocket className="mr-3 h-6 w-6" />
                Quero Começar Agora
                <ArrowRight className="ml-3 h-6 w-6" />
              </Button>
            </Link>
            <p className="text-sm font-medium text-success">🎁 10 créditos grátis • Sem cartão de crédito</p>
            <a href="#planos">
              <Button variant="ghost" className="text-white/60 hover:bg-white/5 hover:text-white">
                Ou assine o plano premium →
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-navy px-5 py-8">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} Cérebro de Bolso. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>);

};

export default VendasPage;