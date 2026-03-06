import { useState, useMemo } from "react";
import { useFinancas } from "@/hooks/useFinancas";
import { useCategorias } from "@/hooks/useCategorias";
import { Loader2, Plus, TrendingUp, TrendingDown, Wallet, DollarSign, Repeat, Trash2, Filter } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const FinancasTab = () => {
  const { data: financas, isLoading, create, remove } = useFinancas();
  const { data: categorias } = useCategorias();
  const [showForm, setShowForm] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todas");
  const [form, setForm] = useState({
    tipo: "despesa" as "receita" | "despesa",
    valor: "",
    descricao: "",
    categoria_id: "",
    status: "pendente" as "pago" | "pendente",
    is_recorrente: false,
  });

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

  const handleCreate = () => {
    if (!form.valor || Number(form.valor) <= 0) { toast.error("Informe um valor válido"); return; }
    create.mutate({
      tipo: form.tipo,
      valor: Number(form.valor),
      descricao: form.descricao || undefined,
      categoria_id: form.categoria_id || undefined,
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

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const financaCats = (categorias || []).filter(c => c.tipo === "financa");

  const financasFiltradas = useMemo(() => {
    const all = financas || [];
    if (filtroCategoria === "todas") return all;
    if (filtroCategoria === "sem_categoria") return all.filter(f => !f.categoria_id);
    return all.filter(f => f.categoria_id === filtroCategoria);
  }, [financas, filtroCategoria]);

  const pagos = financasFiltradas.filter(f => f.status === "pago");
  const pendentes = financasFiltradas.filter(f => f.status === "pendente");

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Gasto no Mês", value: resumo.gastos, icon: TrendingDown, color: "text-destructive", bg: "bg-destructive/10" },
          { label: "Recebido", value: resumo.recebido, icon: TrendingUp, color: "text-status-done-text", bg: "bg-status-done-bg" },
          { label: "Saldo", value: resumo.saldo, icon: Wallet, color: resumo.saldo >= 0 ? "text-status-done-text" : "text-destructive", bg: resumo.saldo >= 0 ? "bg-status-done-bg" : "bg-destructive/10" },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="rounded-2xl border border-border/60 bg-card p-3 shadow-sm"
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

      {/* Add button */}
      <button
        onClick={() => setShowForm(!showForm)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card/50 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
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
            className="overflow-hidden rounded-2xl border border-border/60 bg-card p-4 shadow-sm"
          >
            <div className="space-y-3">
              <div className="flex gap-2">
                {(["despesa", "receita"] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setForm(f => ({ ...f, tipo: t }))}
                    className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-colors ${
                      form.tipo === t
                        ? t === "despesa" ? "bg-destructive/10 text-destructive" : "bg-status-done-bg text-status-done-text"
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
                placeholder="Descrição..."
                value={form.descricao}
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <select
                value={form.categoria_id}
                onChange={e => setForm(f => ({ ...f, categoria_id: e.target.value }))}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Sem categoria</option>
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

      {/* Transactions list */}
      {[
        { title: "🕐 Pendentes", items: pendentes },
        { title: "✅ Pagos", items: pagos },
      ].map(section => (
        <div key={section.title}>
          <h3 className="mb-2 font-heading text-sm font-bold text-foreground">
            {section.title} <span className="text-xs font-normal text-muted-foreground">({section.items.length})</span>
          </h3>
          {section.items.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
              Nenhuma transação
            </p>
          ) : (
            <div className="space-y-2">
              {section.items.map(f => (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 shadow-sm"
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                    f.tipo === "receita" ? "bg-status-done-bg" : "bg-destructive/10"
                  }`}>
                    <DollarSign className={`h-4 w-4 ${
                      f.tipo === "receita" ? "text-status-done-text" : "text-destructive"
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-card-foreground">
                      {f.descricao || (f.tipo === "receita" ? "Receita" : "Despesa")}
                    </p>
                    <div className="flex items-center gap-2">
                      {f.categorias?.nome && (
                        <span className="text-[10px] text-muted-foreground">
                          {f.categorias.nome}
                        </span>
                      )}
                      {f.is_recorrente && <Repeat className="h-3 w-3 text-muted-foreground" />}
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(f.created_at), "dd MMM", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                  <span className={`font-heading text-sm font-bold ${
                    f.tipo === "receita" ? "text-status-done-text" : "text-destructive"
                  }`}>
                    {f.tipo === "receita" ? "+" : "-"}R$ {Number(f.valor).toFixed(2)}
                  </span>
                  <button onClick={() => remove.mutate(f.id)} className="rounded-lg p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default FinancasTab;
