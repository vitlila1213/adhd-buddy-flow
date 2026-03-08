import { useState } from "react";
import { useAniversariantes, PARENTESCOS } from "@/hooks/useAniversariantes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Cake, Plus, Trash2, Filter } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO, differenceInDays, setYear } from "date-fns";
import { ptBR } from "date-fns/locale";

const AniversariantesTab = () => {
  const { data: aniversariantes, isLoading, addAniversariante, deleteAniversariante } = useAniversariantes();
  const [showForm, setShowForm] = useState(false);
  const [nome, setNome] = useState("");
  const [dataAniversario, setDataAniversario] = useState("");
  const [parentesco, setParentesco] = useState("amigo");
  const [filtroParentesco, setFiltroParentesco] = useState<string>("todos");

  const handleAdd = async () => {
    if (!nome || !dataAniversario) {
      toast.error("Preencha nome e data!");
      return;
    }
    try {
      await addAniversariante.mutateAsync({ nome, data_aniversario: dataAniversario, parentesco });
      toast.success(`🎂 ${nome} adicionado(a)!`);
      setNome("");
      setDataAniversario("");
      setParentesco("amigo");
      setShowForm(false);
    } catch {
      toast.error("Erro ao adicionar");
    }
  };

  const handleDelete = async (id: string, nomeItem: string) => {
    try {
      await deleteAniversariante.mutateAsync(id);
      toast.success(`${nomeItem} removido(a)`);
    } catch {
      toast.error("Erro ao remover");
    }
  };

  const getDaysUntilBirthday = (dateStr: string) => {
    const today = new Date();
    const bday = parseISO(dateStr);
    let nextBday = setYear(bday, today.getFullYear());
    if (nextBday < today) nextBday = setYear(bday, today.getFullYear() + 1);
    return differenceInDays(nextBday, today);
  };

  const filtered = (aniversariantes || [])
    .filter(a => filtroParentesco === "todos" || a.parentesco === filtroParentesco)
    .sort((a, b) => getDaysUntilBirthday(a.data_aniversario) - getDaysUntilBirthday(b.data_aniversario));

  const parentescoEmoji: Record<string, string> = {
    amigo: "👫", amiga: "👫", pai: "👨", mãe: "👩", irmão: "👦", irmã: "👧",
    tio: "👨‍🦳", tia: "👩‍🦳", primo: "🧑", prima: "🧑", avô: "👴", avó: "👵",
    filho: "👦", filha: "👧", esposo: "💍", esposa: "💍", namorado: "❤️", namorada: "❤️",
    sogro: "👨‍🦳", sogra: "👩‍🦳", cunhado: "🤝", cunhada: "🤝", colega: "💼", chefe: "👔", outro: "🎂"
  };

  if (isLoading) return <div className="flex justify-center py-12 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/15">
            <Cake className="h-4 w-4 text-accent" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Aniversariantes</h2>
          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
            {aniversariantes?.length || 0}
          </span>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1.5 bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="p-4 space-y-3 border-primary/30 bg-primary/[0.03]">
          <Input placeholder="Nome da pessoa" value={nome} onChange={e => setNome(e.target.value)} />
          <Input type="date" value={dataAniversario} onChange={e => setDataAniversario(e.target.value)} />
          <Select value={parentesco} onValueChange={setParentesco}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PARENTESCOS.map(p => (
                <SelectItem key={p} value={p}>
                  {parentescoEmoji[p] || "🎂"} {p.charAt(0).toUpperCase() + p.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleAdd} disabled={addAniversariante.isPending} className="w-full bg-primary hover:bg-primary/90">
            {addAniversariante.isPending ? "Salvando..." : "🎂 Salvar Aniversariante"}
          </Button>
        </Card>
      )}

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filtroParentesco} onValueChange={setFiltroParentesco}>
          <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {PARENTESCOS.map(p => (
              <SelectItem key={p} value={p}>
                {parentescoEmoji[p]} {p.charAt(0).toUpperCase() + p.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <Cake className="mx-auto mb-3 h-10 w-10 opacity-30" />
          <p className="text-sm">Nenhum aniversariante cadastrado</p>
          <p className="text-xs mt-1">Adicione aqui ou envie pelo WhatsApp:<br />"aniversário do João dia 7 de agosto"</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(a => {
            const daysUntil = getDaysUntilBirthday(a.data_aniversario);
            const isToday = daysUntil === 0;
            const isTomorrow = daysUntil === 1;
            const isSoon = daysUntil <= 7;

            return (
              <Card
                key={a.id}
                className={`flex items-center justify-between p-3 transition-all ${
                  isToday ? "border-success border-l-4 border-l-success bg-success/5 ring-1 ring-success/20" :
                  isSoon ? "border-l-4 border-l-accent bg-accent/5" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{parentescoEmoji[a.parentesco] || "🎂"}</span>
                  <div>
                    <p className="font-semibold text-foreground">
                      {a.nome}
                      {isToday && " 🎉"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(a.data_aniversario), "dd 'de' MMMM", { locale: ptBR })} · {a.parentesco}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    isToday ? "bg-success text-success-foreground" :
                    isTomorrow ? "bg-accent text-accent-foreground" :
                    isSoon ? "bg-accent/15 text-accent" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {isToday ? "HOJE! 🎂" : isTomorrow ? "Amanhã!" : `${daysUntil} dias`}
                  </span>
                  <button
                    onClick={() => handleDelete(a.id, a.nome)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AniversariantesTab;
