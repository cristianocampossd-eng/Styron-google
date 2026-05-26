import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const typeLabels: Record<string, string> = { income: "Receita", expense: "Despesa", transfer: "Transferência", withdrawal: "Saque" };
const typeColors: Record<string, string> = {
  income: "bg-success/10 text-success",
  expense: "bg-destructive/10 text-destructive",
  transfer: "bg-primary/10 text-primary",
  withdrawal: "bg-warning/10 text-warning",
};

export default function FinancialTransactions() {
  const [open, setOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const typeFilter = searchParams.get("type");
  const { transactions, accounts, categories, projects, addTransaction, updateAccountBalance } = useApp();
  const [systems, setSystems] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    supabase.from("company_systems").select("id, name").order("name", { ascending: true }).then(({ data }) => {
      if (data) setSystems(data);
    });
  }, []);

  // Filters
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");
  const [fProject, setFProject] = useState("all");
  const [fAccount, setFAccount] = useState("all");
  const [fCategory, setFCategory] = useState("all");
  const [fType, setFType] = useState<string>("all");

  const [formType, setFormType] = useState<string>("income");
  const [formAccount, setFormAccount] = useState("");
  const [formDestAccount, setFormDestAccount] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formProject, setFormProject] = useState("general");
  const [formValue, setFormValue] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formSystem, setFormSystem] = useState("none");
  const [formAffectsSystem, setFormAffectsSystem] = useState(false);

  const filtered = transactions.filter((t) => {
    if (typeFilter && t.type !== typeFilter) return false;
    if (fType !== "all" && t.type !== fType) return false;
    if (fProject !== "all" && (t.projectId || "general") !== fProject) return false;
    if (fAccount !== "all" && t.accountId !== fAccount) return false;
    if (fCategory !== "all" && t.categoryId !== fCategory) return false;
    if (fFrom && t.date < new Date(fFrom)) return false;
    if (fTo && t.date > new Date(fTo + "T23:59:59")) return false;
    return true;
  });

  const handleSave = () => {
    const value = parseFloat(formValue);
    if (!value || !formAccount) return;
    const txn = {
      id: `t${Date.now()}`,
      type: formType as any,
      projectId: formProject === "general" ? null : formProject,
      accountId: formAccount,
      categoryId: formCategory || null,
      value,
      date: new Date(),
      description: formDesc || typeLabels[formType],
      systemId: formSystem === "none" ? null : formSystem,
      affectsSystemBalance: formAffectsSystem,
    };
    addTransaction(txn);
    if (formType === "income") updateAccountBalance(formAccount, value);
    if (formType === "expense") updateAccountBalance(formAccount, -value);
    if (formType === "withdrawal") updateAccountBalance(formAccount, -value);
    if (formType === "transfer") {
      updateAccountBalance(formAccount, -value);
      if (formDestAccount) updateAccountBalance(formDestAccount, value);
    }
    toast.success("Movimentação registrada!");
    setOpen(false);
    setFormValue(""); 
    setFormDesc("");
    setFormSystem("none");
    setFormAffectsSystem(false);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="flex gap-1 bg-secondary rounded-lg p-1">
          <button onClick={() => {}} className={cn("px-3 py-1.5 rounded-md text-sm font-medium transition-colors", !typeFilter ? "bg-card shadow-sm" : "text-muted-foreground")}>Todos</button>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" /> Nova Movimentação</Button>
      </div>

      <div className="bg-card rounded-xl border p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <div><Label className="text-xs">De</Label><Input type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)} /></div>
        <div><Label className="text-xs">Até</Label><Input type="date" value={fTo} onChange={(e) => setFTo(e.target.value)} /></div>
        <div>
          <Label className="text-xs">Tipo</Label>
          <Select value={fType} onValueChange={setFType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="income">Receita</SelectItem>
              <SelectItem value="expense">Despesa</SelectItem>
              <SelectItem value="transfer">Transferência</SelectItem>
              <SelectItem value="withdrawal">Saque</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Projeto</Label>
          <Select value={fProject} onValueChange={setFProject}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="general">Geral</SelectItem>
              {projects.filter((p) => p.status !== "archived").map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Conta</Label>
          <Select value={fAccount} onValueChange={setFAccount}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Categoria</Label>
          <Select value={fCategory} onValueChange={setFCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-4 font-medium text-muted-foreground">Tipo</th>
                <th className="text-left p-4 font-medium text-muted-foreground hidden md:table-cell">Projeto/Sistema</th>
                <th className="text-left p-4 font-medium text-muted-foreground hidden md:table-cell">Conta</th>
                <th className="text-left p-4 font-medium text-muted-foreground hidden lg:table-cell">Categoria</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Descrição</th>
                <th className="text-right p-4 font-medium text-muted-foreground">Valor</th>
                <th className="text-left p-4 font-medium text-muted-foreground hidden sm:table-cell">Data</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const project = projects.find((p) => p.id === t.projectId);
                const account = accounts.find((a) => a.id === t.accountId);
                const category = categories.find((c) => c.id === t.categoryId);
                return (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="p-4">
                      <span className={cn("inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium", typeColors[t.type])}>
                        {typeLabels[t.type]}
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground hidden md:table-cell">
                      {project?.name || "Geral"}
                      {t.systemId && (
                        <div className="text-[10px] text-primary font-semibold mt-0.5">
                          💻 {systems.find((s) => s.id === t.systemId)?.name || "Sistema"}
                          {t.affectsSystemBalance && <span className="text-emerald-600 font-bold"> (Incide no saldo)</span>}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-muted-foreground hidden md:table-cell">{account?.name}</td>
                    <td className="p-4 text-muted-foreground hidden lg:table-cell">{category?.name}</td>
                    <td className="p-4">{t.description}</td>
                    <td className={cn("p-4 text-right font-medium", t.type === "income" ? "text-success" : "text-destructive")}>
                      {t.type === "income" ? "+" : "-"}{fmt(t.value)}
                    </td>
                    <td className="p-4 text-muted-foreground hidden sm:table-cell">{format(t.date, "dd/MM/yyyy")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Movimentação</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Tipo</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Receita</SelectItem>
                  <SelectItem value="expense">Despesa</SelectItem>
                  <SelectItem value="transfer">Transferência</SelectItem>
                  <SelectItem value="withdrawal">Saque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Projeto</Label>
              <Select value={formProject} onValueChange={setFormProject}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Geral" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">Geral</SelectItem>
                  {projects.filter((p) => p.status !== "archived").map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Conta</Label>
              <Select value={formAccount} onValueChange={setFormAccount}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formType === "transfer" && (
              <div>
                <Label>Conta destino</Label>
                <Select value={formDestAccount} onValueChange={setFormDestAccount}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {accounts.filter((a) => a.id !== formAccount).map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Categoria</Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Valor</Label><Input type="number" placeholder="R$ 0,00" className="mt-1.5" value={formValue} onChange={(e) => setFormValue(e.target.value)} /></div>
            <div><Label>Descrição</Label><Input placeholder="Descrição" className="mt-1.5" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} /></div>

            <div className="border bg-muted/10 p-3 rounded-lg space-y-3">
              <div>
                <Label htmlFor="txn-system-select">Vincular a um Sistema</Label>
                <Select value={formSystem} onValueChange={setFormSystem}>
                  <SelectTrigger id="txn-system-select" className="mt-1.5">
                    <SelectValue placeholder="Escolha um sistema (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum / Não aplicável</SelectItem>
                    {systems.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formSystem !== "none" && (
                <div className="flex items-center space-x-2 pt-1">
                  <Checkbox 
                    id="affects-system" 
                    checked={formAffectsSystem} 
                    onCheckedChange={(checked) => setFormAffectsSystem(!!checked)} 
                  />
                  <Label htmlFor="affects-system" className="text-xs cursor-pointer text-muted-foreground font-semibold">
                    Esta movimentação incidirá no saldo final do sistema
                  </Label>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}