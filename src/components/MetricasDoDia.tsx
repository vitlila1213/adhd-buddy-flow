import { useItens } from "@/hooks/useItens";
import { useMemo } from "react";
import { CheckCircle2, Lightbulb, Loader2, ListTodo, Brain } from "lucide-react";
import { motion } from "framer-motion";

const MetricasDoDia = () => {
  const { data: items, isLoading } = useItens();

  const metrics = useMemo(() => {
    const all = items || [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const concluidasHoje = all.filter((i) => {
      if (i.status !== "concluida") return false;
      const updated = new Date(i.updated_at);
      updated.setHours(0, 0, 0, 0);
      return updated.getTime() === today.getTime();
    });

    const ideiasCapturadas = all.filter((i) => {
      const created = new Date(i.created_at);
      created.setHours(0, 0, 0, 0);
      return created.getTime() === today.getTime() && i.tipo === "ideia";
    });

    return {
      concluidas: concluidasHoje.length,
      ideias: ideiasCapturadas.length,
      total: all.length,
      pendentes: all.filter((i) => i.status === "pendente").length,
    };
  }, [items]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const cards = [
    {
      icon: <CheckCircle2 className="h-5 w-5 text-status-done-text" />,
      bg: "bg-status-done-bg",
      label: "Concluídas Hoje",
      value: metrics.concluidas,
    },
    {
      icon: <Lightbulb className="h-5 w-5 text-status-pending-text" />,
      bg: "bg-status-pending-bg",
      label: "Ideias Capturadas",
      value: metrics.ideias,
    },
    {
      icon: <ListTodo className="h-5 w-5 text-primary" />,
      bg: "bg-primary/10",
      label: "Pendentes",
      value: metrics.pendentes,
    },
    {
      icon: <Brain className="h-5 w-5 text-muted-foreground" />,
      bg: "bg-muted",
      label: "Total no Cérebro",
      value: metrics.total,
    },
  ];

  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08, duration: 0.3, ease: "easeOut" }}
          className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm"
        >
          <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${card.bg}`}>
            {card.icon}
          </div>
          <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
          <p className="mt-1 font-heading text-2xl font-bold tracking-tight text-card-foreground">
            {card.value}
          </p>
        </motion.div>
      ))}
    </div>
  );
};

export default MetricasDoDia;
