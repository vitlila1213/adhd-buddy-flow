import { useState, useMemo } from "react";
import { useFinancas } from "@/hooks/useFinancas";
import { useCategorias } from "@/hooks/useCategorias";
import { Loader2, Plus, TrendingUp, TrendingDown, Wallet, DollarSign, Repeat, Trash2, Filter, PieChart as PieChartIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

type ChartFilter = "receita" | "despesa";

const FinancasTab = () => {
  const { data: financas, isLoading, create, remove } = useFinancas();
  const { data: categorias } = useCategorias();
  const [showForm, setShowForm] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todas");
  const [chartFilter, setChartFilter] = useState<ChartFilter>("despesa");
  const [form, setForm] = useState({
    tipo: "despesa" as "receita" | "despesa",
    valor: "",
    descricao: "",
    categoria_id: "",
    status: "pendente" as "pago" | "pendente",
    is_recorrente: false,
  });

  const financaCats = (categorias || []).filter(c => c.tipo === "financa");

  const resumo = useMemo(() => {
    const all = financas || [];
    const now = new Date();
    const mesAtual = all.filter(f => {
      const d = new Date(f.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const gastos = mesAtual.filter(f => f.tipo === "despesa").reduce((s, f) => s + Number(f.valor), 0);
    const recebido = mesAtual.filter(f => f.tipo === "receita").reduce((s, f) => s + Number(f.valor), 0);
    return { gastos, recebido, saldo: recebido - gastos };
  }, [financas]);

  // Chart data grouped by category
  const chartData = useMemo(() => {
    const all = financas || [];
    const cats = financaCats;
    
    const filteredItems = all.filter((f) => f.tipo === chartFilter);
    
    const categoryMap = new Map<string, { name: string; count: number; total: number; color: string }>();
    
    filteredItems.forEach((item) => {
      const catId = item.categoria_id || "sem-categoria";
      const cat = cats.find((c) => c.id === catId);
      const catName = cat?.nome || "Sem categoria";
      const catColor = cat?.cor || "#94a3b8";
      
      if (categoryMap.has(catId)) {
        const existing = categoryMap.get(catId)!;
        existing.count++;
        existing.total += Number(item.valor);
      } else {
        categoryMap.set(catId, { name: catName, count: 1, total: Number(item.valor), color: catColor });
      }
    });
    
    const grandTotal = filteredItems.reduce((s, f) => s + Number(f.valor), 0);
    
    return Array.from(categoryMap.values()).map((cat) => ({
      name: cat.name,
      value: cat.total,
      count: cat.count,
      percentage: grandTotal > 0 ? Math.round((cat.total / grandTotal) * 100) : 0,
      color: cat.color,
    }));
  }, [financas, financaCats, chartFilter]);

  const financasFiltradas = useMemo(() => {
    const all = financas || [];
    if (filtroCategoria === "todas") return all;
    if (filtroCategoria === "sem_categoria") return all.filter(f => !f.categoria_id);
    return all.filter(f => f.categoria_id === filtroCategoria);
  }, [financas, filtroCategoria]);

  // Group by category for report
  const groupedByCategory = useMemo(() => {
    const groups = new Map<string, typeof financasFiltradas>();
    
    financasFiltradas.forEach(f => {
      const catId = f.categoria_id || "sem-categoria";
      if (!groups.has(catId)) {
        groups.set(catId, []);
      }
      groups.get(catId)!.push(f);
    });
    
    return Array.from(groups.entries()).map(([catId, items]) => {
      const cat = financaCats.find(c => c.id === catId);
      return {
        categoryId: catId,
        categoryName: cat?.nome || "Sem categoria",
        categoryColor: cat?.cor || "#94a3b8",
        items,
        totalReceita: items.filter(i => i.tipo === "receita").reduce((s, i) => s + Number(i.valor), 0),
        totalDespesa: items.filter(i => i.tipo === "despesa").reduce((s, i) => s + Number(i.valor), 0),
      };
    });
  }, [financasFiltradas, financaCats]);

  // Auto-categorize: find best matching category based on description
  const findBestCategory = (descricao: string): string | undefined => {
    if (!descricao) return undefined;
    const desc = descricao.toLowerCase();
    
    for (const cat of financaCats) {
      const catName = cat.nome.toLowerCase();
      if (desc.includes(catName) || catName.includes(desc.split(" ")[0])) {
        return cat.id;
      }
    }
    return undefined;
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const handleCreate = () => {
    if (!form.valor || Number(form.valor) <= 0) { toast.error("Informe um valor válido"); return; }
    
    // Auto-categorize if no category selected
    let categoryId = form.categoria_id || undefined;
    if (!categoryId && form.descricao) {
      categoryId = findBestCategory(form.descricao);
      if (categoryId) {
        const cat = financaCats.find(c => c.id === categoryId);
        toast.info(`Categorizado automaticamente como "${cat?.nome}"`);
      }
    }
    
    create.mutate({
      tipo: form.tipo,
      valor: Number(form.valor),
      descricao: form.descricao || undefined,
      categoria_id: categoryId,
      status: form.status,
      is_recorrente: form.is_recorrente,
    }, {
      onSuccess: () => {
        setForm({ tipo: "despesa", valor: "", descricao: "", categoria_id: "", status: "pendente", is_recorrente: false });
        setShowForm(false);
        toast.success("Transação adicionada!");
      },
      onError: () => toast.error("Erro ao criar transação"),
    });
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-xl border border-border bg-card p-3 shadow-lg">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: data.color }} />
            <span className="font-medium text-foreground">{data.name}</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            R$ {data.value.toFixed(2)} ({data.percentage}%)
          </p>
          <p className="text-xs text-muted-foreground">{data.count} transações</p>
        </div>
      );
    }
    return null;
  };

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage }: any) => {
    if (percentage < 5) return null;
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
        className="text-xs font-bold"
        style={{ textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}
      >
        {percentage}%
      </text>
    );
  };

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Gasto no Mês", value: resumo.gastos, icon: TrendingDown, color: "text-destructive", bg: "bg-destructive/10", border: "border-l-destructive" },
          { label: "Recebido", value: resumo.recebido, icon: TrendingUp, color: "text-success", bg: "bg-success/10", border: "border-l-success" },
          { label: "Saldo", value: resumo.saldo, icon: Wallet, color: resumo.saldo >= 0 ? "text-success" : "text-destructive", bg: resumo.saldo >= 0 ? "bg-success/10" : "bg-destructive/10", border: resumo.saldo >= 0 ? "border-l-success" : "border-l-destructive" },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`rounded-2xl border border-border/60 border-l-4 ${card.border} bg-card p-3 shadow-sm`}
          >
            <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-xl ${card.bg}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
            <p className="text-[10px] font-medium text-muted-foreground">{card.label}</p>
            <p className={`font-heading text-lg font-bold tracking-tight ${card.color}`}>
              R$ {card.value.toFixed(2)}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Pie Chart Section */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm"
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <PieChartIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-heading text-base font-bold text-foreground">Por Categoria</h3>
              <p className="text-xs text-muted-foreground">Distribuição de {chartFilter === "despesa" ? "gastos" : "receitas"}</p>
            </div>
          </div>
          <div className="flex rounded-xl bg-muted p-1">
            {(["despesa", "receita"] as ChartFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setChartFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  chartFilter === f
                    ? f === "despesa" ? "bg-destructive/20 text-destructive" : "bg-success/20 text-success"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f === "despesa" ? "📉 Despesas" : "📈 Receitas"}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={chartFilter}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            {chartData.length > 0 ? (
              <div className="flex flex-col items-center">
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <defs>
                        {chartData.map((entry, index) => (
                          <linearGradient key={`gradient-${index}`} id={`finGradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={entry.color} stopOpacity={1} />
                            <stop offset="100%" stopColor={entry.color} stopOpacity={0.7} />
                          </linearGradient>
                        ))}
                      </defs>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                        labelLine={false}
                        label={CustomLabel}
                        animationBegin={0}
                        animationDuration={800}
                        animationEasing="ease-out"
                      >
                        {chartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={`url(#finGradient-${index})`}
                            stroke={entry.color}
                            strokeWidth={2}
                            className="drop-shadow-md transition-all duration-300 hover:opacity-80"
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend */}
                <div className="mt-4 flex flex-wrap justify-center gap-3">
                  {chartData.map((entry, index) => (
                    <motion.div
                      key={entry.name}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-1.5"
                    >
                      <div className="h-3 w-3 rounded-full shadow-sm" style={{ backgroundColor: entry.color }} />
                      <span className="text-xs font-medium text-foreground">{entry.name}</span>
                      <span className="text-xs text-muted-foreground">({entry.percentage}%)</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                Nenhuma transação nesta categoria
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Category Filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <select
          value={filtroCategoria}
          onChange={e => setFiltroCategoria(e.target.value)}
          className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="todas">Todas as categorias</option>
          <option value="sem_categoria">Sem categoria</option>
          {financaCats.map(c => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
      </div>

      {/* Add button */}
      <button
        onClick={() => setShowForm(!showForm)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/30 bg-primary/[0.03] py-3 text-sm font-medium text-primary transition-colors hover:border-primary hover:bg-primary/5"
      >
        <Plus className="h-4 w-4" />
        Nova Transação
      </button>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden rounded-2xl border border-primary/20 bg-card p-4 shadow-sm"
          >
            <div className="space-y-3">
              <div className="flex gap-2">
                {(["despesa", "receita"] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setForm(f => ({ ...f, tipo: t }))}
                    className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-colors ${
                      form.tipo === t
                        ? t === "despesa" ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {t === "despesa" ? "📉 Despesa" : "📈 Receita"}
                  </button>
                ))}
              </div>
              <input
                type="number"
                placeholder="Valor (R$)"
                value={form.valor}
                onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                placeholder="Descrição (ex: Conta de Luz, Mercado...)"
                value={form.descricao}
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-[10px] text-muted-foreground">
                💡 Dica: Se a descrição conter o nome de uma categoria, será categorizado automaticamente!
              </p>
              <select
                value={form.categoria_id}
                onChange={e => setForm(f => ({ ...f, categoria_id: e.target.value }))}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Sem categoria (auto-detectar)</option>
                {financaCats.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
              <div className="flex items-center gap-4">
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as "pago" | "pendente" }))}
                  className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="pendente">🕐 Pendente</option>
                  <option value="pago">✅ Pago</option>
                </select>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={form.is_recorrente}
                    onChange={e => setForm(f => ({ ...f, is_recorrente: e.target.checked }))}
                    className="rounded border-input"
                  />
                  <Repeat className="h-3.5 w-3.5" />
                  Recorrente
                </label>
              </div>
              <button
                onClick={handleCreate}
                disabled={create.isPending}
                className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {create.isPending ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Salvar"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transactions grouped by category */}
      {groupedByCategory.map(group => (
        <div key={group.categoryId} className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded" style={{ backgroundColor: group.categoryColor }} />
            <h3 className="font-heading text-sm font-bold text-foreground">
              {group.categoryName}
            </h3>
            <span className="text-xs text-muted-foreground">
              ({group.items.length}) • 
              {group.totalDespesa > 0 && <span className="text-destructive ml-1">-R${group.totalDespesa.toFixed(2)}</span>}
              {group.totalReceita > 0 && <span className="text-success ml-1">+R${group.totalReceita.toFixed(2)}</span>}
            </span>
          </div>
          <div className="space-y-2">
            {group.items.map(f => (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-center gap-3 rounded-2xl border border-border/60 border-l-4 bg-card p-3 shadow-sm`}
                style={{ borderLeftColor: group.categoryColor }}
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                  f.tipo === "receita" ? "bg-success/10" : "bg-destructive/10"
                }`}>
                  <DollarSign className={`h-4 w-4 ${
                    f.tipo === "receita" ? "text-success" : "text-destructive"
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-card-foreground">
                    {f.descricao || (f.tipo === "receita" ? "Receita" : "Despesa")}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      f.status === "pago" ? "bg-success/10 text-success" : "bg-amber-500/10 text-amber-600"
                    }`}>
                      {f.status === "pago" ? "✅ Pago" : "🕐 Pendente"}
                    </span>
                    {f.is_recorrente && <Repeat className="h-3 w-3 text-muted-foreground" />}
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(f.created_at), "dd MMM", { locale: ptBR })}
                    </span>
                  </div>
                </div>
                <span className={`font-heading text-sm font-bold ${
                  f.tipo === "receita" ? "text-success" : "text-destructive"
                }`}>
                  {f.tipo === "receita" ? "+" : "-"}R$ {Number(f.valor).toFixed(2)}
                </span>
                <button onClick={() => remove.mutate(f.id)} className="rounded-lg p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      ))}

      {financasFiltradas.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
          Nenhuma transação encontrada
        </p>
      )}
    </div>
  );
};

export default FinancasTab;
