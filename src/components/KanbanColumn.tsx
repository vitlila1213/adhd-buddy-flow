import { useState, useMemo } from "react";
import { Droppable } from "@hello-pangea/dnd";
import KanbanCard from "./KanbanCard";
import type { ItemCerebro } from "@/hooks/useItens";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight, Folder } from "lucide-react";

export interface CategoryGroup {
  categoryId: string | null;
  categoryName: string;
  categoryColor: string;
  items: ItemCerebro[];
}

interface KanbanColumnProps {
  id: string;
  title: string;
  items: ItemCerebro[];
  emoji: string;
  groups?: CategoryGroup[];
}

const columnColors: Record<string, { badge: string; dropzone: string }> = {
  anotacoes: { badge: "bg-accent/15 text-accent", dropzone: "bg-accent/5" },
  tarefas: { badge: "bg-primary/15 text-primary", dropzone: "bg-primary/5" },
  pendentes: { badge: "bg-destructive/15 text-destructive", dropzone: "bg-destructive/5" },
  concluidas: { badge: "bg-success/15 text-success", dropzone: "bg-success/5" },
};

const KanbanColumn = ({ id, title, items, emoji, groups }: KanbanColumnProps) => {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const useGroups = groups && groups.length > 0;
  const totalItems = useGroups
    ? groups!.reduce((s, g) => s + g.items.length, 0)
    : items.length;

  const colors = columnColors[id] || columnColors.tarefas;

  const toggleGroup = (key: string) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const renderData = useMemo(() => {
    if (!useGroups) return null;
    let idx = 0;
    return groups!.map((g) => {
      const key = g.categoryId || "sem-categoria";
      const isCollapsed = collapsed[key] ?? false;
      const startIdx = idx;
      if (!isCollapsed) idx += g.items.length;
      return { ...g, key, isCollapsed, startIdx };
    });
  }, [useGroups, groups, collapsed]);

  return (
    <div className="flex min-h-[200px] flex-1 flex-col sm:min-h-[400px]">
      <div className="mb-3 flex items-center gap-2.5 px-1">
        <span className="text-lg">{emoji}</span>
        <h3 className="font-heading text-sm font-bold tracking-tight text-foreground">
          {title}
        </h3>
        <span className={`ml-auto flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${colors.badge}`}>
          {totalItems}
        </span>
      </div>

      <Droppable droppableId={id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex flex-1 flex-col gap-1 rounded-2xl p-1 transition-colors duration-200 ${
              snapshot.isDraggingOver ? colors.dropzone : ""
            }`}
          >
            {renderData ? (
              renderData.map((group) => (
                <div key={group.key} className="mb-1">
                  <button
                    onClick={() => toggleGroup(group.key)}
                    className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left transition-colors hover:bg-muted/60"
                  >
                    {group.isCollapsed ? (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <div
                      className="h-4 w-4 rounded-md shrink-0 flex items-center justify-center"
                      style={{ backgroundColor: group.categoryColor }}
                    >
                      <Folder className="h-2.5 w-2.5 text-white" />
                    </div>
                    <span className="text-xs font-semibold text-foreground truncate">
                      {group.categoryName}
                    </span>
                    <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-muted px-1.5 text-[10px] font-bold text-muted-foreground">
                      {group.items.length}
                    </span>
                  </button>

                  <AnimatePresence initial={false}>
                    {!group.isCollapsed && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-2 pl-3 pt-1">
                          {group.items.map((item, idx) => (
                            <motion.div
                              key={item.id}
                              layout
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              transition={{
                                layout: { type: "spring", stiffness: 350, damping: 30 },
                                opacity: { duration: 0.2 },
                                y: { duration: 0.25 },
                              }}
                            >
                              <KanbanCard item={item} index={group.startIdx + idx} />
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))
            ) : (
              <AnimatePresence initial={false}>
                {items.map((item, index) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{
                      layout: { type: "spring", stiffness: 350, damping: 30 },
                      opacity: { duration: 0.2 },
                      y: { duration: 0.25 },
                    }}
                  >
                    <KanbanCard item={item} index={index} />
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
            {provided.placeholder}
            {totalItems === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-1 flex-col items-center justify-center py-16 sm:py-12"
              >
                <span className="mb-2 text-3xl opacity-30">{emoji}</span>
                <p className="text-sm text-muted-foreground/50">Nenhum item aqui</p>
              </motion.div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
};

export default KanbanColumn;
