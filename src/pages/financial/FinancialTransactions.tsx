import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
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
  const { transactions, accounts, categories, projects, addTransaction, updateTransaction, deleteTransaction, updateAccountBalance, getProjectCode } = useApp();
  const { isAdmin, canAccess } = useAuth();
  const [systems, setSystems] = useState<{ id: string; name: string }[]>([]);

  // Selected details / edit states
  const [selectedTx, setSelectedTx] = useState<any | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [editType, setEditType] = useState<string>("income");
  const [editAccount, setEditAccount] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editProject, setEditProject] = useState("general");
  const [editValue, setEditValue] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editSystem, setEditSystem] = useState("none");
  const [editAffectsSystem, setEditAffectsSystem] = useState(false);
  const [editDate, setEditDate] = useState("");
  const [editDueDate, setEditDueDate] = useState("");

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
  const [formDueDate, setFormDueDate] = useState("");

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
      dueDate: formDueDate ? new Date(formDueDate + "T12:00:00") : undefined,
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

  const handleRowClick = (t: any) => {
    setSelectedTx(t);
    setEditType(t.type);
    setEditAccount(t.accountId || "");
    setEditCategory(t.categoryId || "none");
    setEditProject(t.projectId || "general");
    setEditValue(String(t.value));
    setEditDesc(t.description || "");
    setEditSystem(t.systemId || "none");
    setEditAffectsSystem(!!t.affectsSystemBalance);
    // Format date is YYYY-MM-DD for native input date
    const yyyymmdd = t.date ? new Date(t.date).toISOString().split("T")[0] : "";
    setEditDate(yyyymmdd);
    const dueYyyymmdd = t.dueDate ? new Date(t.dueDate).toISOString().split("T")[0] : "";
    setEditDueDate(dueYyyymmdd);
    setDetailsOpen(true);
  };

  const handleEditSave = async () => {
    if (!selectedTx) return;
    const value = parseFloat(editValue);
    if (!value || !editAccount) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    try {
      // 1. Revert old transaction impact on balance
      const oldType = selectedTx.type;
      const oldValue = selectedTx.value;
      const oldAccountId = selectedTx.accountId;

      let revertDelta = 0;
      if (oldType === "income") {
        revertDelta = -oldValue;
      } else if (oldType === "expense" || oldType === "withdrawal" || oldType === "transfer") {
        revertDelta = oldValue;
      }

      if (revertDelta !== 0 && oldAccountId) {
        await updateAccountBalance(oldAccountId, revertDelta);
      }

      // 2. Apply new transaction impact on balance
      let applyDelta = 0;
      if (editType === "income") {
        applyDelta = value;
      } else if (editType === "expense" || editType === "withdrawal" || editType === "transfer") {
        applyDelta = -value;
      }

      if (applyDelta !== 0 && editAccount) {
        await updateAccountBalance(editAccount, applyDelta);
      }

      // 3. Update the record
      await updateTransaction(selectedTx.id, {
        type: editType as any,
        projectId: editProject === "general" ? null : editProject,
        accountId: editAccount,
        categoryId: editCategory === "none" ? null : editCategory,
        value,
        description: editDesc,
        date: new Date(editDate + "T12:00:00"), // Noon to safe guard offsets
        dueDate: editDueDate ? new Date(editDueDate + "T12:00:00") : undefined,
        systemId: editSystem === "none" ? null : editSystem,
        affectsSystemBalance: editAffectsSystem,
      });

      setDetailsOpen(false);
      setSelectedTx(null);
    } catch (err) {
      console.error("Erro ao salvar edição:", err);
      toast.error("Erro ao salvar alterações da movimentação.");
    }
  };

  const handleDeleteTransaction = async (tx: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Deseja realmente excluir esta movimentação?")) return;

    try {
      // Revert transaction impact on balance
      const oldType = tx.type;
      const oldValue = tx.value;
      const oldAccountId = tx.accountId;

      let revertDelta = 0;
      if (oldType === "income") {
        revertDelta = -oldValue;
      } else if (oldType === "expense" || oldType === "withdrawal" || oldType === "transfer") {
        revertDelta = oldValue;
      }

      if (revertDelta !== 0 && oldAccountId) {
        await updateAccountBalance(oldAccountId, revertDelta);
      }

      await deleteTransaction(tx.id);
      toast.success("Movimentação excluída!");
    } catch (err) {
      console.error("Erro ao excluir movimentação:", err);
      toast.error("Erro ao excluir movimentação.");
    }
  };

  const handleEditDelete = async () => {
    if (!selectedTx) return;
    const fakeEvent = { stopPropagation: () => {} } as any;
    await handleDeleteTransaction(selectedTx, fakeEvent);
    setDetailsOpen(false);
    setSelectedTx(null);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="flex gap-1 bg-secondary rounded-lg p-1">
          <button onClick={() => {}} className={cn("px-3 py-1.5 rounded-md text-sm font-medium transition-colors", !typeFilter ? "bg-card shadow-sm" : "text-muted-foreground")}>Todos</button>
        </div>
        {canAccess("action_create") && (
          <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" /> Nova Movimentação</Button>
        )}
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
                <th className="text-left p-4 font-medium text-muted-foreground hidden sm:table-cell">Vencimento</th>
                <th className="text-center p-4 font-medium text-muted-foreground w-20">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const project = projects.find((p) => p.id === t.projectId);
                const account = accounts.find((a) => a.id === t.accountId);
                const category = categories.find((c) => c.id === t.categoryId);
                return (
                  <tr 
                    key={t.id} 
                    className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => handleRowClick(t)}
                  >
                    <td className="p-4">
                      <span className={cn("inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium", typeColors[t.type])}>
                        {typeLabels[t.type]}
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground hidden md:table-cell">
                      {project ? `${getProjectCode(project.id)} - ${project.name}` : "Geral"}
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
                    <td className="p-4 text-muted-foreground hidden sm:table-cell">{t.dueDate ? format(t.dueDate, "dd/MM/yyyy") : "-"}</td>
                    <td className="p-4 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-50"
                        onClick={(e) => handleDeleteTransaction(t, e)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nova Movimentação</DialogTitle></DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-4 py-2">
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
                    <SelectItem key={p.id} value={p.id}>{getProjectCode(p.id)} - {p.name}</SelectItem>
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
            <div>
              <Label>Data de Vencimento</Label>
              <Input type="date" className="mt-1.5" value={formDueDate} onChange={(e) => setFormDueDate(e.target.value)} />
            </div>
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

      {/* Details & Edit Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Informações de Movimentação</DialogTitle>
            <DialogDescription>
              {isAdmin 
                ? "Como administrador, você pode editar todos os campos desta movimentação." 
                : "Apenas visualização. Altere de conta de administrador para poder editar."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-4 py-2">
            <div>
              <Label>Tipo</Label>
              <Select value={editType} onValueChange={setEditType} disabled={!isAdmin}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Receita</SelectItem>
                  <SelectItem value="expense">Despesa</SelectItem>
                  <SelectItem value="transfer">Transferência</SelectItem>
                  <SelectItem value="withdrawal">Saque</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Data da Transação</Label>
              <Input 
                type="date" 
                value={editDate} 
                onChange={(e) => setEditDate(e.target.value)} 
                className="mt-1.5"
                disabled={!isAdmin}
              />
            </div>
            <div>
              <Label>Data de Vencimento</Label>
              <Input 
                type="date" 
                value={editDueDate} 
                onChange={(e) => setEditDueDate(e.target.value)} 
                className="mt-1.5"
                disabled={!isAdmin}
              />
            </div>

            <div>
              <Label>Projeto</Label>
              <Select value={editProject} onValueChange={setEditProject} disabled={!isAdmin}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">Geral</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{getProjectCode(p.id)} - {p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Conta</Label>
              <Select value={editAccount} onValueChange={setEditAccount} disabled={!isAdmin}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Categoria</Label>
              <Select value={editCategory} onValueChange={setEditCategory} disabled={!isAdmin}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Valor</Label>
              <Input 
                type="number" 
                step="0.01" 
                className="mt-1.5" 
                value={editValue} 
                onChange={(e) => setEditValue(e.target.value)} 
                disabled={!isAdmin}
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <Input 
                className="mt-1.5" 
                value={editDesc} 
                onChange={(e) => setEditDesc(e.target.value)} 
                disabled={!isAdmin}
              />
            </div>

            <div className="border bg-muted/10 p-3 rounded-lg space-y-3">
              <div>
                <Label htmlFor="edit-system-select">Vincular a um Sistema</Label>
                <Select value={editSystem} onValueChange={setEditSystem} disabled={!isAdmin}>
                  <SelectTrigger id="edit-system-select" className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum / Não aplicável</SelectItem>
                    {systems.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {editSystem !== "none" && (
                <div className="flex items-center space-x-2 pt-1">
                  <Checkbox 
                    id="edit-affects-system" 
                    checked={editAffectsSystem} 
                    onCheckedChange={(checked) => setEditAffectsSystem(!!checked)} 
                    disabled={!isAdmin}
                  />
                  <Label htmlFor="edit-affects-system" className="text-xs cursor-pointer text-muted-foreground font-semibold">
                    Esta movimentação incidirá no saldo final do sistema
                  </Label>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            {canAccess("action_delete") && (
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleEditDelete} 
                className="mr-auto flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" /> Excluir Registro
              </Button>
            )}
            <Button variant="outline" onClick={() => { setDetailsOpen(false); setSelectedTx(null); }}>
              {canAccess("action_edit") ? "Cancelar" : "Fechar"}
            </Button>
            {canAccess("action_edit") && (
              <Button onClick={handleEditSave}>
                Salvar Alterações
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}