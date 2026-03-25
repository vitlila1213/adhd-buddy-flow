import { useItens } from "@/hooks/useItens";
import { useCategorias } from "@/hooks/useCategorias";
import { useMemo, useState } from "react";
import { CheckCircle2, Lightbulb, Loader2, ListTodo, Brain, MessageCircle, PieChart as PieChartIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths, addDays, addWeeks, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import DailyGoalCard from "@/components/DailyGoalCard";

const WHATSAPP_AGENT = "5511934396102";

type FilterType = "concluida" | "pendente";
type DatePeriod = "dia" | "semana" | "mes" | "tudo";

const MetricasDoDia = () => {
  const { data: items, isLoading } = useItens();
  const { data: categorias } = useCategorias();
  const [filter, setFilter] = useState<FilterType>("concluida");
  const [datePeriod, setDatePeriod] = useState<DatePeriod>("dia");
  const [dateOffset, setDateOffset] = useState(0);

  const dateRange = useMemo(() => {
    if (datePeriod === "tudo") return null;
    const now = new Date();
    let base = now;
    const fns = {
      dia: { sub: subDays, add: addDays, start: startOfDay, end: endOfDay },
      semana: { sub: subWeeks, add: addWeeks, start: (d: Date) => startOfWeek(d, { weekStartsOn: 1 }), end: (d: Date) => endOfWeek(d, { weekStartsOn: 1 }) },
      mes: { sub: subMonths, add: addMonths, start: startOfMonth, end: endOfMonth },
    };
    const f = fns[datePeriod];
    if (dateOffset < 0) base = f.sub(now, Math.abs(dateOffset));
    else if (dateOffset > 0) base = f.add(now, dateOffset);
    return { start: f.start(base), end: f.end(base), base };
  }, [datePeriod, dateOffset]);

  const dateLabel = useMemo(() => {
    if (!dateRange) return "Todo o período";
    switch (datePeriod) {
      case "dia": return format(dateRange.base, "dd 'de' MMMM", { locale: ptBR });
      case "semana": return `${format(dateRange.start, "dd/MM")} a ${format(dateRange.end, "dd/MM")}`;
      case "mes": return format(dateRange.base, "MMMM yyyy", { locale: ptBR });
      default: return "";
    }
  }, [dateRange, datePeriod]);

  const isInRange = (dateStr: string) => {
    if (!dateRange) return true;
    const d = new Date(dateStr);
    return d >= dateRange.start && d <= dateRange.end;
  };

  const metrics = useMemo(() => {
    const all = items || [];

    const concluidasFiltered = all.filter((i) => {
      if (i.status !== "concluida") return false;
      return isInRange(i.updated_at);
    });

    const ideiasFiltered = all.filter((i) => {
      return i.tipo === "ideia" && isInRange(i.created_at);
    });

    return {
      concluidas: concluidasFiltered.length,
      ideias: ideiasFiltered.length,
      total: all.length,
      pendentes: all.filter((i) => i.status === "pendente").length,
    };
  }, [items, dateRange]);

  const chartData = useMemo(() => {
    const all = items || [];
    const cats = categorias || [];
    
    const filteredItems = all.filter((i) => i.status === filter && isInRange(filter === "concluida" ? i.updated_at : i.created_at));
    
    // Group by category
    const categoryMap = new Map<string, { name: string; count: number; color: string }>();
    
    filteredItems.forEach((item) => {
      const catId = item.categoria_id || "sem-categoria";
      const cat = cats.find((c) => c.id === catId);
      const catName = cat?.nome || "Sem categoria";
      const catColor = cat?.cor || "#94a3b8";
      
      if (categoryMap.has(catId)) {
        categoryMap.get(catId)!.count++;
      } else {
        categoryMap.set(catId, { name: catName, count: 1, color: catColor });
      }
    });
    
    const total = filteredItems.length;
    
    return Array.from(categoryMap.values()).map((cat) => ({
      name: cat.name,
      value: cat.count,
      percentage: total > 0 ? Math.round((cat.count / total) * 100) : 0,
      color: cat.color,
    }));
  }, [items, categorias, filter]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const cards = [
    {
      icon: <CheckCircle2 className="h-5 w-5 text-success" />,
      bg: "bg-success/10",
      borderAccent: "border-l-success",
      label: "Concluídas Hoje",
      value: metrics.concluidas,
    },
    {
      icon: <Lightbulb className="h-5 w-5 text-accent" />,
      bg: "bg-accent/10",
      borderAccent: "border-l-accent",
      label: "Anotações Capturadas",
      value: metrics.ideias,
    },
    {
      icon: <ListTodo className="h-5 w-5 text-primary" />,
      bg: "bg-primary/10",
      borderAccent: "border-l-primary",
      label: "Pendentes",
      value: metrics.pendentes,
    },
    {
      icon: <Brain className="h-5 w-5 text-navy" />,
      bg: "bg-navy/10",
      borderAccent: "border-l-navy",
      label: "Total no Cérebro",
      value: metrics.total,
    },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-xl border border-border/50 bg-card px-3 py-2 shadow-lg">
          <p className="font-medium text-card-foreground">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {data.value} tarefas ({data.percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage }: any) => {
    if (percentage < 10) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        className="text-xs font-bold drop-shadow-md"
      >
        {`${percentage}%`}
      </text>
    );
  };

  return (
    <div className="space-y-4">
      {/* Daily Goal Card */}
      <DailyGoalCard />

      {/* Date Period Filter */}
      <div className="rounded-2xl border border-border/60 bg-card p-3 shadow-sm">
        <div className="flex items-center gap-1 mb-2">
          {(["dia", "semana", "mes", "tudo"] as DatePeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => { setDatePeriod(p); setDateOffset(0); }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                datePeriod === p ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p === "dia" ? "Dia" : p === "semana" ? "Semana" : p === "mes" ? "Mês" : "Tudo"}
            </button>
          ))}
        </div>
        {datePeriod !== "tudo" && (
          <div className="flex items-center justify-between">
            <button onClick={() => setDateOffset(o => o - 1)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-foreground capitalize">{dateLabel}</span>
            <button onClick={() => setDateOffset(o => o + 1)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.3, ease: "easeOut" }}
            className={`rounded-2xl border border-border/60 border-l-4 ${card.borderAccent} bg-card p-4 shadow-sm`}
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

      {/* Pie Chart Section */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.3, ease: "easeOut" }}
        className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm"
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <PieChartIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-card-foreground">Por Categoria</h3>
              <p className="text-xs text-muted-foreground">Distribuição de tarefas</p>
            </div>
          </div>
          
          {/* Filter Toggle */}
          <div className="flex rounded-xl bg-muted p-1">
            <button
              onClick={() => setFilter("concluida")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                filter === "concluida"
                  ? "bg-success text-success-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Concluídas
            </button>
            <button
              onClick={() => setFilter("pendente")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                filter === "pendente"
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Pendentes
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={filter}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="h-64"
          >
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    {chartData.map((entry, index) => (
                      <linearGradient
                        key={`gradient-${index}`}
                        id={`gradient-${index}`}
                        x1="0"
                        y1="0"
                        x2="1"
                        y2="1"
                      >
                        <stop offset="0%" stopColor={entry.color} stopOpacity={1} />
                        <stop offset="100%" stopColor={entry.color} stopOpacity={0.7} />
                      </linearGradient>
                    ))}
                  </defs>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomLabel}
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={800}
                    animationEasing="ease-out"
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={`url(#gradient-${index})`}
                        stroke={entry.color}
                        strokeWidth={2}
                        className="drop-shadow-md transition-all duration-200 hover:opacity-80"
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    formatter={(value) => (
                      <span className="text-xs text-card-foreground">{value}</span>
                    )}
                    wrapperStyle={{ paddingTop: 10 }}
                    iconType="circle"
                    iconSize={8}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                <PieChartIcon className="mb-2 h-12 w-12 opacity-30" />
                <p className="text-sm">Nenhuma tarefa {filter === "concluida" ? "concluída" : "pendente"}</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* WhatsApp Agent Button */}
      <motion.a
        href={`https://wa.me/${WHATSAPP_AGENT}`}
        target="_blank"
        rel="noopener noreferrer"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.3, ease: "easeOut" }}
        className="flex items-center gap-3 rounded-2xl border border-success/30 bg-success/5 p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/15">
          <MessageCircle className="h-5 w-5 text-success" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-card-foreground">Falar com o Agente</p>
          <p className="text-xs text-muted-foreground">WhatsApp do Cérebro de Bolso</p>
        </div>
        <span className="text-xs font-medium text-success">Abrir →</span>
      </motion.a>

      <motion.a
        href="https://wa.me/5531981096698"
        target="_blank"
        rel="noopener noreferrer"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.3, ease: "easeOut" }}
        className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
          <Headphones className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-card-foreground">Falar com Suporte</p>
          <p className="text-xs text-muted-foreground">Atendimento humanizado 24h</p>
        </div>
        <span className="text-xs font-medium text-primary">Abrir →</span>
      </motion.a>
    </div>
  );
};

export default MetricasDoDia;
