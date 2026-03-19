import { useState, useMemo } from "react";
import { useFinancas } from "@/hooks/useFinancas";
import { useCategorias } from "@/hooks/useCategorias";
import { Loader2, Plus, TrendingUp, TrendingDown, Trash2, Repeat, DollarSign, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, FolderPlus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subWeeks, subMonths, subYears, addDays, addWeeks, addMonths, addYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

type ViewTab = "despesas" | "renda";
type PeriodFilter = "dia" | "semana" | "mes" | "ano";

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#22c55e", "#14b8a6",
  "#3b82f6", "#6366f1", "#8b5cf6", "#ec4899", "#64748b",
];

const FinancasTab = () => {
  const { data: financas, isLoading, create, remove } = useFinancas();
  const { data: categorias, create: createCat } = useCategorias();
  const [viewTab, setViewTab] = useState<ViewTab>("despesas");
  const [period, setPeriod] = useState<PeriodFilter>("mes");
  const [periodOffset, setPeriodOffset] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [showCatForm, setShowCatForm] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatCor, setNewCatCor] = useState("#6366f1");
  const [newCatParentId, setNewCatParentId] = useState("");
  const [showSubCatForm, setShowSubCatForm] = useState<string | null>(null);
  const [newSubCatName, setNewSubCatName] = useState("");
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({
    tipo: "despesa" as "receita" | "despesa",
    valor: "",
    descricao: "",
    categoria_id: "",
    status: "pendente" as "pago" | "pendente",
    is_recorrente: false,
  });

  const allFinancaCats = (categorias || []).filter(c => c.tipo === "financa");
  const parentCats = allFinancaCats.filter(c => !c.parent_id);
  const getSubcats = (parentId: string) => allFinancaCats.filter(c => c.parent_id === parentId);

  const toggleExpand = (id: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Period range calculation
  const periodRange = useMemo(() => {
    const now = new Date();
    let base = now;

    const offsetFns = {
      dia: { sub: subDays, add: addDays, start: startOfDay, end: endOfDay },
      semana: { sub: subWeeks, add: addWeeks, start: startOfWeek, end: endOfWeek },
      mes: { sub: subMonths, add: addMonths, start: startOfMonth, end: endOfMonth },
      ano: { sub: subYears, add: addYears, start: startOfYear, end: endOfYear },
    };

    const fns = offsetFns[period];
    if (periodOffset < 0) base = fns.sub(now, Math.abs(periodOffset));
    else if (periodOffset > 0) base = fns.add(now, periodOffset);

    const weekOpts = period === "semana" ? { weekStartsOn: 1 as const } : undefined;
    return {
      start: fns.start(base, weekOpts as any),
      end: fns.end(base, weekOpts as any),
      label: getPeriodLabel(period, base),
    };
  }, [period, periodOffset]);

  function getPeriodLabel(p: PeriodFilter, date: Date): string {
    switch (p) {
      case "dia": return format(date, "dd 'de' MMMM", { locale: ptBR });
      case "semana": return `Semana de ${format(startOfWeek(date, { weekStartsOn: 1 }), "dd/MM")} a ${format(endOfWeek(date, { weekStartsOn: 1 }), "dd/MM")}`;
      case "mes": return format(date, "MMMM yyyy", { locale: ptBR });
      case "ano": return format(date, "yyyy");
    }
  }

  // Filter finances by period and type
  const filteredFinancas = useMemo(() => {
    const all = financas || [];
    const tipo = viewTab === "despesas" ? "despesa" : "receita";
    return all.filter(f => {
      if (f.tipo !== tipo) return false;
      const d = new Date(f.created_at);
      return d >= periodRange.start && d <= periodRange.end;
    });
  }, [financas, viewTab, periodRange]);

  const totalFiltered = useMemo(() =>
    filteredFinancas.reduce((s, f) => s + Number(f.valor), 0),
    [filteredFinancas]
  );

  // Total balance (all time current month)
  const resumo = useMemo(() => {
    const all = financas || [];
    const inRange = all.filter(f => {
      const d = new Date(f.created_at);
      return d >= periodRange.start && d <= periodRange.end;
    });
    const gastos = inRange.filter(f => f.tipo === "despesa").reduce((s, f) => s + Number(f.valor), 0);
    const recebido = inRange.filter(f => f.tipo === "receita").reduce((s, f) => s + Number(f.valor), 0);
    return { gastos, recebido, saldo: recebido - gastos };
  }, [financas, periodRange]);

  // Chart data grouped by category (parent-level grouping)
  const chartData = useMemo(() => {
    const categoryMap = new Map<string, { name: string; total: number; color: string; count: number }>();

    filteredFinancas.forEach((item) => {
      const catId = item.categoria_id || "sem-categoria";
      const cat = allFinancaCats.find((c) => c.id === catId);
      // Group by parent category if subcategory
      const parentCat = cat?.parent_id ? allFinancaCats.find(c => c.id === cat.parent_id) : null;
      const groupId = parentCat ? parentCat.id : catId;
      const groupName = parentCat ? parentCat.nome : (cat?.nome || "Sem categoria");
      const groupColor = parentCat ? parentCat.cor : (cat?.cor || "#94a3b8");

      if (categoryMap.has(groupId)) {
        const existing = categoryMap.get(groupId)!;
        existing.count++;
        existing.total += Number(item.valor);
      } else {
        categoryMap.set(groupId, { name: groupName, count: 1, total: Number(item.valor), color: groupColor });
      }
    });

    return Array.from(categoryMap.values())
      .sort((a, b) => b.total - a.total)
      .map((cat) => ({
        name: cat.name,
        value: cat.total,
        count: cat.count,
        percentage: totalFiltered > 0 ? Math.round((cat.total / totalFiltered) * 100) : 0,
        color: cat.color,
      }));
  }, [filteredFinancas, allFinancaCats, totalFiltered]);

  // Auto-categorize
  const findBestCategory = (descricao: string): string | undefined => {
    if (!descricao) return undefined;
    const desc = descricao.toLowerCase();
    // Try subcategories first (more specific), then parents
    const subcats = allFinancaCats.filter(c => c.parent_id);
    for (const sub of subcats) {
      const parent = allFinancaCats.find(c => c.id === sub.parent_id);
      if (!parent) continue;
      const subName = sub.nome.toLowerCase();
      const parentName = parent.nome.toLowerCase();
      // Match if description contains both parent and subcategory context
      if (desc.includes(subName) && desc.includes(parentName)) {
        return sub.id;
      }
    }
    // Fallback: match any category name
    for (const cat of allFinancaCats) {
      const catName = cat.nome.toLowerCase();
      if (desc.includes(catName) || catName.includes(desc.split(" ")[0])) {
        return cat.id;
      }
    }
    return undefined;
  };

  const handleCreate = () => {
    if (!form.valor || Number(form.valor) <= 0) { toast.error("Informe um valor válido"); return; }

    let categoryId = form.categoria_id || undefined;
    if (!categoryId && form.descricao) {
      categoryId = findBestCategory(form.descricao);
      if (categoryId) {
        const cat = allFinancaCats.find(c => c.id === categoryId);
        const parent = cat?.parent_id ? allFinancaCats.find(c => c.id === cat.parent_id) : null;
        const label = parent ? `${parent.nome} > ${cat?.nome}` : cat?.nome;
        toast.info(`Categorizado automaticamente como "${label}"`);
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

  const handleCreateCat = () => {
    if (!newCatName.trim()) return;
    createCat.mutate(
      { nome: newCatName.trim(), tipo: "financa", cor: newCatCor, parent_id: newCatParentId || undefined },
      {
        onSuccess: () => { setNewCatName(""); setNewCatParentId(""); setShowCatForm(false); toast.success("Categoria criada!"); },
        onError: () => toast.error("Erro ao criar categoria"),
      }
    );
  };

  const handleCreateSubCat = (parentId: string) => {
    if (!newSubCatName.trim()) return;
    const parent = parentCats.find(c => c.id === parentId);
    createCat.mutate(
      { nome: newSubCatName.trim(), tipo: "financa", cor: parent?.cor || "#6366f1", parent_id: parentId },
      {
        onSuccess: () => { setNewSubCatName(""); setShowSubCatForm(null); toast.success("Subcategoria criada!"); },
        onError: () => toast.error("Erro ao criar subcategoria"),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header - Total Balance */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total no Período</p>
        <p className={`font-heading text-3xl font-black tracking-tight ${resumo.saldo >= 0 ? "text-emerald-500" : "text-destructive"}`}>
          {resumo.saldo >= 0 ? "" : "-"}R$ {Math.abs(resumo.saldo).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </p>
      </motion.div>

      {/* DESPESAS / RENDA tabs */}
      <div className="flex border-b border-border">
        {(["despesas", "renda"] as ViewTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setViewTab(tab)}
            className={`flex-1 py-2.5 text-sm font-bold uppercase tracking-wider transition-colors relative ${
              viewTab === tab ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "despesas" ? "Despesas" : "Renda"}
            {viewTab === tab && (
              <motion.div
                layoutId="finTabIndicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Period Filters + Chart Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm"
      >
        {/* Period tabs */}
        <div className="flex items-center gap-1 px-4 pt-4">
          {(["dia", "semana", "mes", "ano"] as PeriodFilter[]).map((p) => (
            <button
              key={p}
              onClick={() => { setPeriod(p); setPeriodOffset(0); }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                period === p
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p === "dia" ? "Dia" : p === "semana" ? "Semana" : p === "mes" ? "Mês" : "Ano"}
            </button>
          ))}
        </div>

        {/* Period Navigation */}
        <div className="flex items-center justify-between px-4 pt-2 pb-1">
          <button onClick={() => setPeriodOffset(o => o - 1)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold text-foreground capitalize">{periodRange.label}</span>
          <button onClick={() => setPeriodOffset(o => o + 1)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Donut Chart */}
        <div className="relative px-4 pb-4">
          {chartData.length > 0 ? (
            <div className="relative h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    {chartData.map((entry, index) => (
                      <linearGradient key={`fg-${index}`} id={`finGrad-${index}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={entry.color} stopOpacity={1} />
                        <stop offset="100%" stopColor={entry.color} stopOpacity={0.75} />
                      </linearGradient>
                    ))}
                  </defs>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={105}
                    paddingAngle={2}
                    dataKey="value"
                    strokeWidth={0}
                    animationBegin={0}
                    animationDuration={800}
                    animationEasing="ease-out"
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={`url(#finGrad-${index})`}
                        className="transition-all duration-300 hover:opacity-80"
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              {/* Center label */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">
                    {viewTab === "despesas" ? "Gastos" : "Receitas"}
                  </p>
                  <p className="font-heading text-xl font-black text-foreground">
                    R$ {totalFiltered.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
              Nenhuma transação neste período
            </div>
          )}
        </div>

        {/* FAB Add Button */}
        <div className="flex justify-end px-4 pb-4 -mt-2">
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-105 active:scale-95"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>
      </motion.div>

      {/* Add Transaction Form */}
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
                        ? t === "despesa" ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-500"
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
                💡 Se a descrição conter o nome de uma categoria/subcategoria, será categorizado automaticamente!
              </p>
              <select
                value={form.categoria_id}
                onChange={e => setForm(f => ({ ...f, categoria_id: e.target.value }))}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Sem categoria (auto-detectar)</option>
                {parentCats.map(parent => {
                  const subs = getSubcats(parent.id);
                  return (
                    <optgroup key={parent.id} label={parent.nome}>
                      {subs.length === 0 && (
                        <option value={parent.id}>{parent.nome}</option>
                      )}
                      {subs.map(sub => (
                        <option key={sub.id} value={sub.id}>{sub.nome}</option>
                      ))}
                    </optgroup>
                  );
                })}
                {/* Categories without parent that also have no subcategories - show directly */}
                {allFinancaCats.filter(c => !c.parent_id && getSubcats(c.id).length === 0).length > 0 && null}
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

      {/* Category Breakdown List with Subcategories */}
      <div className="space-y-2">
        {chartData.map((cat, i) => (
          <motion.div
            key={cat.name}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3 shadow-sm"
          >
            {/* Color dot */}
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: cat.color + "20" }}
            >
              <div className="h-4 w-4 rounded-full" style={{ backgroundColor: cat.color }} />
            </div>
            {/* Name */}
            <span className="flex-1 text-sm font-semibold text-foreground truncate">{cat.name}</span>
            {/* Percentage */}
            <span className="text-sm text-muted-foreground">{cat.percentage}%</span>
            {/* Value */}
            <span className="font-heading text-sm font-bold text-foreground min-w-[80px] text-right">
              R$ {cat.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Create Category / Subcategory Section */}
      <div className="space-y-2">
        <button
          onClick={() => setShowCatForm(!showCatForm)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/30 bg-primary/[0.03] py-3 text-sm font-medium text-primary transition-colors hover:border-primary hover:bg-primary/5"
        >
          <Plus className="h-4 w-4" />
          Nova Categoria de Finanças
        </button>

        <AnimatePresence>
          {showCatForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden rounded-2xl border border-primary/20 bg-card p-4 shadow-sm"
            >
              <div className="space-y-3">
                <input
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  placeholder="Nome da categoria (ex: Loja de Roupas, Casa 1...)"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  onKeyDown={e => e.key === "Enter" && handleCreateCat()}
                />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Cor:</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {PRESET_COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => setNewCatCor(c)}
                        className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110"
                        style={{
                          backgroundColor: c,
                          borderColor: newCatCor === c ? "hsl(var(--foreground))" : "transparent",
                        }}
                      />
                    ))}
                    <input
                      type="color"
                      value={newCatCor}
                      onChange={e => setNewCatCor(e.target.value)}
                      className="h-6 w-6 cursor-pointer rounded-full border-0 p-0"
                      title="Cor personalizada"
                    />
                  </div>
                </div>
                <button
                  onClick={handleCreateCat}
                  disabled={!newCatName.trim() || createCat.isPending}
                  className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {createCat.isPending ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Criar Categoria"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Hierarchical Category Tree */}
      {parentCats.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Categorias ({parentCats.length})
          </h3>
          {parentCats.map(parent => {
            const subs = getSubcats(parent.id);
            const isExpanded = expandedCats.has(parent.id);
            return (
              <div key={parent.id} className="space-y-1">
                <div
                  className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3 shadow-sm cursor-pointer"
                  onClick={() => subs.length > 0 && toggleExpand(parent.id)}
                >
                  <div className="h-8 w-8 shrink-0 rounded-xl" style={{ backgroundColor: parent.cor || "#6366f1" }} />
                  <span className="flex-1 text-sm font-semibold text-card-foreground">{parent.nome}</span>
                  {subs.length > 0 && (
                    <span className="text-[10px] text-muted-foreground mr-1">{subs.length} sub</span>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); setShowSubCatForm(showSubCatForm === parent.id ? null : parent.id); setNewSubCatName(""); }}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                    title="Adicionar subcategoria"
                  >
                    <FolderPlus className="h-3.5 w-3.5" />
                  </button>
                  {subs.length > 0 && (
                    isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>

                {/* Add subcategory form */}
                <AnimatePresence>
                  {showSubCatForm === parent.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden ml-6"
                    >
                      <div className="flex gap-2 py-1">
                        <input
                          autoFocus
                          value={newSubCatName}
                          onChange={e => setNewSubCatName(e.target.value)}
                          placeholder="Nome da subcategoria (ex: Luz, Água...)"
                          className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          onKeyDown={e => e.key === "Enter" && handleCreateSubCat(parent.id)}
                        />
                        <button
                          onClick={() => handleCreateSubCat(parent.id)}
                          disabled={!newSubCatName.trim() || createCat.isPending}
                          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                        >
                          {createCat.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar"}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Subcategories */}
                <AnimatePresence>
                  {isExpanded && subs.map(sub => (
                    <motion.div
                      key={sub.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="ml-6 flex items-center gap-3 rounded-xl border border-border/40 bg-muted/30 px-3 py-2"
                    >
                      <div className="h-5 w-5 shrink-0 rounded-lg" style={{ backgroundColor: sub.cor || parent.cor || "#6366f1" }} />
                      <span className="flex-1 text-xs font-medium text-card-foreground">{sub.nome}</span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* Transaction List */}
      {filteredFinancas.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Transações ({filteredFinancas.length})
          </h3>
          {filteredFinancas.map(f => {
            const cat = allFinancaCats.find(c => c.id === f.categoria_id);
            const parentCat = cat?.parent_id ? allFinancaCats.find(c => c.id === cat.parent_id) : null;
            const catLabel = parentCat ? `${parentCat.nome} > ${cat?.nome}` : cat?.nome;
            return (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 rounded-2xl border border-border/60 border-l-4 bg-card p-3 shadow-sm"
                style={{ borderLeftColor: cat?.cor || parentCat?.cor || "#94a3b8" }}
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                  f.tipo === "receita" ? "bg-emerald-500/10" : "bg-destructive/10"
                }`}>
                  <DollarSign className={`h-4 w-4 ${
                    f.tipo === "receita" ? "text-emerald-500" : "text-destructive"
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-card-foreground">
                    {f.descricao || (f.tipo === "receita" ? "Receita" : "Despesa")}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {catLabel && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: (cat?.cor || "#94a3b8") + "20", color: cat?.cor || "#94a3b8" }}>
                        {catLabel}
                      </span>
                    )}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      f.status === "pago" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-600"
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
                  f.tipo === "receita" ? "text-emerald-500" : "text-destructive"
                }`}>
                  {f.tipo === "receita" ? "+" : "-"}R$ {Number(f.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
                <button onClick={() => remove.mutate(f.id)} className="rounded-lg p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            );
          })}
        </div>
      )}

      {filteredFinancas.length === 0 && chartData.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
          Nenhuma transação neste período
        </p>
      )}
    </div>
  );
};

const ChartTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-xl border border-border bg-card p-3 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: data.color }} />
          <span className="font-medium text-foreground">{data.name}</span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          R$ {data.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} ({data.percentage}%)
        </p>
        <p className="text-xs text-muted-foreground">{data.count} transações</p>
      </div>
    );
  }
  return null;
};

export default FinancasTab;
