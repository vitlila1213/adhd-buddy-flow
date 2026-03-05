import { Draggable } from "@hello-pangea/dnd";
import type { ItemCerebro } from "@/hooks/useItens";
import { Lightbulb, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface KanbanCardProps {
  item: ItemCerebro;
  index: number;
}

const KanbanCard = ({ item, index }: KanbanCardProps) => {
  return (
    <Draggable draggableId={item.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`rounded-lg border border-border bg-card p-3.5 shadow-sm transition-shadow ${
            snapshot.isDragging ? "shadow-md ring-2 ring-primary/20" : ""
          }`}
        >
          <div className="mb-1.5 flex items-start gap-2">
            {item.tipo === "ideia" ? (
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            ) : item.status === "concluida" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            ) : (
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <h4 className="text-sm font-semibold leading-snug text-card-foreground">
              {item.titulo}
            </h4>
          </div>

          {item.descricao && (
            <p className="mb-2 pl-6 text-xs leading-relaxed text-muted-foreground line-clamp-2">
              {item.descricao}
            </p>
          )}

          {item.data_hora_agendada && (
            <div className="pl-6">
              <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
                <Clock className="h-3 w-3" />
                {format(new Date(item.data_hora_agendada), "dd MMM, HH:mm", { locale: ptBR })}
              </span>
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
};

export default KanbanCard;
