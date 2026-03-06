import { useState } from "react";
import { useCategorias } from "@/hooks/useCategorias";
import { Loader2, Plus, Pencil, Trash2, Tag, DollarSign, ListTodo } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const CategoriasTab = () => {
  const { data: categorias, isLoading, create, update, remove } = useCategorias();
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<"financa" | "tarefa">("tarefa");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNome, setEditingNome] = useState("");

  const handleCreate = () => {
    if (!nome.trim()) return;
    create.mutate({ nome: nome.trim(), tipo }, {
      onSuccess: () => { setNome(""); toast.success("Categoria criada!"); },
      onError: () => toast.error("Erro ao criar categoria"),
    });
  };

  const handleUpdate = (id: string) => {
    if (!editingNome.trim()) return;
    update.mutate({ id, nome: editingNome.trim() }, {
      onSuccess: () => { setEditingId(null); toast.success("Categoria atualizada!"); },
      onError: () => toast.error("Erro ao atualizar"),
    });
  };

  const handleDelete = (id: string) => {
    remove.mutate(id, {
      onSuccess: () => toast.success("Categoria removida!"),
      onError: () => toast.error("Erro ao remover"),
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
  const tarefaCats = (categorias || []).filter(c => c.tipo === "tarefa");

  return (
    <div className="space-y-6">
      {/* Create form */}
      <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
        <h3 className="mb-3 flex items-center gap-2 font-heading text-sm font-bold text-card-foreground">
          <Plus className="h-4 w-4 text-primary" />
          Nova Categoria
        </h3>
        <div className="flex gap-2">
          <input
            value={nome}
            onChange={e => setNome(e.target.value)}
            placeholder="Nome da categoria..."
            className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            onKeyDown={e => e.key === "Enter" && handleCreate()}
          />
          <select
            value={tipo}
            onChange={e => setTipo(e.target.value as "financa" | "tarefa")}
            className="rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="tarefa">📋 Tarefa</option>
            <option value="financa">💰 Finança</option>
          </select>
          <button
            onClick={handleCreate}
            disabled={!nome.trim() || create.isPending}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar"}
          </button>
        </div>
      </div>

      {/* Category sections */}
      {[
        { title: "Categorias de Finanças", icon: <DollarSign className="h-4 w-4" />, items: financaCats, emoji: "💰" },
        { title: "Categorias de Tarefas", icon: <ListTodo className="h-4 w-4" />, items: tarefaCats, emoji: "📋" },
      ].map(section => (
        <div key={section.title}>
          <h3 className="mb-3 flex items-center gap-2 font-heading text-sm font-bold text-foreground">
            {section.icon}
            {section.title}
            <span className="text-xs font-normal text-muted-foreground">({section.items.length})</span>
          </h3>
          {section.items.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
              Nenhuma categoria ainda. Crie acima! {section.emoji}
            </p>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {section.items.map(cat => (
                  <motion.div
                    key={cat.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 shadow-sm"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
                      <Tag className="h-4 w-4 text-primary" />
                    </div>
                    {editingId === cat.id ? (
                      <input
                        autoFocus
                        value={editingNome}
                        onChange={e => setEditingNome(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") handleUpdate(cat.id); if (e.key === "Escape") setEditingId(null); }}
                        className="flex-1 rounded-lg border border-input bg-background px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    ) : (
                      <span className="flex-1 text-sm font-medium text-card-foreground">{cat.nome}</span>
                    )}
                    <div className="flex gap-1">
                      {editingId === cat.id ? (
                        <button onClick={() => handleUpdate(cat.id)} className="rounded-lg p-1.5 text-primary hover:bg-primary/10">
                          ✓
                        </button>
                      ) : (
                        <button onClick={() => { setEditingId(cat.id); setEditingNome(cat.nome); }} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button onClick={() => handleDelete(cat.id)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default CategoriasTab;
