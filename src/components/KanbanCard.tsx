import { Draggable } from "@hello-pangea/dnd";
import type { ItemCerebro } from "@/hooks/useItens";
import { StickyNote, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface KanbanCardProps {
  item: ItemCerebro;
  index: number;
}

const KanbanCard = ({ item, index }: KanbanCardProps) => {
  const cat = item.categorias;

  return (
    <Draggable draggableId={item.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`rounded-2xl border border-border/60 bg-card p-4 shadow-sm transition-all duration-300 ${
            snapshot.isDragging
              ? "shadow-xl ring-2 ring-primary/20 scale-[1.02]"
              : "hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
          }`}
        >
          <div className="mb-2 flex items-start gap-2.5">
            {item.tipo === "ideia" ? (
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-status-pending-bg">
                <StickyNote className="h-3.5 w-3.5 text-status-pending-text" />
              </div>
            ) : item.status === "concluida" ? (
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-status-done-bg">
                <CheckCircle2 className="h-3.5 w-3.5 text-status-done-text" />
              </div>
            ) : (
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-muted">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
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
            {/* Category badge */}
            {cat && (
              <span
                className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-semibold text-white"
                style={{ backgroundColor: cat.cor || "#6366f1" }}
              >
                {cat.nome}
              </span>
            )}

            {/* Status badge */}
            {item.status === "concluida" ? (
              <span className="inline-flex items-center rounded-lg bg-status-done-bg px-2 py-0.5 text-[11px] font-semibold text-status-done-text">
                Concluída
              </span>
            ) : (
              <span className="inline-flex items-center rounded-lg bg-status-pending-bg px-2 py-0.5 text-[11px] font-semibold text-status-pending-text">
                Pendente
              </span>
            )}

            {item.status === "concluida" && item.completed_at && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-status-done-bg px-2 py-0.5 text-[11px] font-medium text-status-done-text">
                <CheckCircle2 className="h-3 w-3" />
                {format(new Date(item.completed_at), "dd MMM, HH:mm", { locale: ptBR })}
              </span>
            )}

            {item.data_hora_agendada && item.status !== "concluida" && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
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
