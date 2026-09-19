import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function FinancialProjects() {
  const [tab, setTab] = useState<"active" | "completed">("active");
  const { projects, transactions, updateProjectInvestment } = useApp();
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const activeProjects = projects.filter((p) => p.status !== "completed" && p.status !== "archived");
  const completedProjects = projects.filter((p) => p.status === "completed");
  const displayedProjects = tab === "active" ? activeProjects : completedProjects;

  const getProjectFinancials = (projectId: string) => {
    const ptxns = transactions.filter((t) => t.projectId === projectId);
    const income = ptxns.filter((t) => t.type === "income").reduce((s, t) => s + t.value, 0);
    const expense = ptxns.filter((t) => t.type === "expense").reduce((s, t) => s + t.value, 0);
    return { income, expense, balance: income - expense };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex gap-1 bg-secondary rounded-lg p-1 w-fit">
        <button onClick={() => setTab("active")} className={cn("px-3 py-1.5 rounded-md text-sm font-medium transition-colors", tab === "active" ? "bg-card shadow-sm" : "text-muted-foreground")}>Em produção</button>
        <button onClick={() => setTab("completed")} className={cn("px-3 py-1.5 rounded-md text-sm font-medium transition-colors", tab === "completed" ? "bg-card shadow-sm" : "text-muted-foreground")}>Concluídos</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayedProjects.map((p) => {
          const fin = getProjectFinancials(p.id);
          const investment = (p as any).initial_investment || 0;
          return (
            <div key={p.id} className="bg-card rounded-xl border p-5 hover:shadow-md transition-shadow animate-slide-up">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">{p.name}</h3>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(p.id); setEditValue(String(investment)); }}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Investimento inicial</span>
                  <span className="font-medium">{fmt(investment)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Receitas</span>
                  <span className="font-medium text-success">{fmt(fin.income)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Despesas</span>
                  <span className="font-medium text-destructive">{fmt(fin.expense)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-muted-foreground font-medium">Saldo</span>
                  <span className={cn("font-semibold", fin.balance >= 0 ? "text-success" : "text-destructive")}>{fmt(fin.balance)}</span>
                </div>
              </div>
            </div>
          );
        })}
        {displayedProjects.length === 0 && (
          <p className="text-sm text-muted-foreground col-span-full text-center py-8">Nenhum projeto nesta categoria.</p>
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Investimento inicial</DialogTitle></DialogHeader>
          <div className="py-4">
            <Label>Valor (R$)</Label>
            <Input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="mt-1.5" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={async () => {
              if (editing) await updateProjectInvestment(editing, parseFloat(editValue) || 0);
              setEditing(null);
            }}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}