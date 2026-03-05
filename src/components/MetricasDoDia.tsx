import { useItens } from "@/hooks/useItens";
import { useMemo } from "react";
import { CheckCircle2, Lightbulb, Loader2 } from "lucide-react";

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

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        icon={<CheckCircle2 className="h-6 w-6 text-primary" />}
        label="Tarefas Concluídas Hoje"
        value={metrics.concluidas}
      />
      <MetricCard
        icon={<Lightbulb className="h-6 w-6 text-accent" />}
        label="Ideias Capturadas Hoje"
        value={metrics.ideias}
      />
      <MetricCard
        icon={<span className="text-xl">📋</span>}
        label="Total Pendentes"
        value={metrics.pendentes}
      />
      <MetricCard
        icon={<span className="text-xl">🧠</span>}
        label="Total no Cérebro"
        value={metrics.total}
      />
    </div>
  );
};

const MetricCard = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) => (
  <div className="animate-fade-in rounded-xl border border-border bg-card p-5 shadow-sm">
    <div className="mb-3 flex items-center gap-3">
      {icon}
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
    </div>
    <p className="font-heading text-3xl font-bold text-card-foreground">{value}</p>
  </div>
);

export default MetricasDoDia;
