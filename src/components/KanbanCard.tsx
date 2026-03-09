import { Draggable } from "@hello-pangea/dnd";
import type { ItemCerebro } from "@/hooks/useItens";
import { useItens } from "@/hooks/useItens";
import { StickyNote, CheckCircle2, Clock, Trash2, Check } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "./ui/button";
import { toast } from "sonner";

interface KanbanCardProps {
  item: ItemCerebro;
  index: number;
}

const KanbanCard = ({ item, index }: KanbanCardProps) => {
  const cat = item.categorias;
  const { deleteItem, updateStatus } = useItens();

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteItem.mutate(item.id, {
      onSuccess: () => toast.success("Item excluído!"),
      onError: () => toast.error("Erro ao excluir item"),
    });
  };

  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateStatus.mutate(
      { id: item.id, status: "concluida", completed_at: new Date().toISOString() },
      {
        onSuccess: () => toast.success("Tarefa concluída!"),
        onError: () => toast.error("Erro ao concluir tarefa"),
      }
    );
  };

  return (
    <Draggable draggableId={item.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`group relative rounded-2xl border bg-card p-4 shadow-sm transition-all duration-300 ${
            snapshot.isDragging
              ? "border-primary shadow-xl ring-2 ring-primary/20 scale-[1.02]"
              : "border-border/60 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
          } ${
            item.status === "concluida" ? "border-l-4 border-l-success" :
            item.tipo === "ideia" ? "border-l-4 border-l-accent" :
            "border-l-4 border-l-primary"
          }`}
        >
          {/* Action buttons */}
          <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            {item.status !== "concluida" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg bg-success/10 text-success hover:bg-success/20 hover:text-success"
                onClick={handleComplete}
                title="Marcar como concluída"
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive"
              onClick={handleDelete}
              title="Excluir"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="mb-2 flex items-start gap-2.5">
            {item.tipo === "ideia" ? (
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-accent/15">
                <StickyNote className="h-3.5 w-3.5 text-accent" />
              </div>
            ) : item.status === "concluida" ? (
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-success/15">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              </div>
            ) : (
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Clock className="h-3.5 w-3.5 text-primary" />
              </div>
            )}
            <div className="flex-1 min-w-0 pr-14">
              <h4
                className={`text-sm font-semibold leading-snug text-card-foreground ${
                  item.status === "concluida" ? "line-through opacity-60" : ""
                }`}
              >
                {item.titulo}
              </h4>
            </div>
          </div>

          {item.descricao && (
            <p className="mb-2.5 pl-[38px] text-xs leading-relaxed text-muted-foreground line-clamp-2">
              {item.descricao}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 pl-[38px]">
            {cat && (
              <span
                className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-semibold text-white"
                style={{ backgroundColor: cat.cor || "#6366f1" }}
              >
                {cat.nome}
              </span>
            )}

            {item.status === "concluida" ? (
              <span className="inline-flex items-center rounded-lg bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
                Concluída
              </span>
            ) : (
              <span className="inline-flex items-center rounded-lg bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">
                Pendente
              </span>
            )}

            {item.status === "concluida" && item.completed_at && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
                <CheckCircle2 className="h-3 w-3" />
                {format(new Date(item.completed_at), "dd MMM, HH:mm", { locale: ptBR })}
              </span>
            )}

            {item.data_hora_agendada && item.status !== "concluida" && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                <Clock className="h-3 w-3" />
                {format(new Date(item.data_hora_agendada), "dd MMM, HH:mm", { locale: ptBR })}
              </span>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
};
export default KanbanCard;
