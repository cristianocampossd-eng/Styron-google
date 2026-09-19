import { useState, useEffect } from "react";
import { useApp, type ReceivablePayable } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, Edit } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const statusLabels: Record<string, string> = { pending: "Pendente", paid: "Pago", overdue: "Vencido" };
const statusColors: Record<string, string> = { pending: "bg-warning/10 text-warning", paid: "bg-success/10 text-success", overdue: "bg-destructive/10 text-destructive" };
const recLabels: Record<string, string> = { once: "Única", daily: "Diária", monthly: "Mensal", weekly: "Semanal", yearly: "Anual", quarterly: "Trimestral" };

export default function FinancialRecurring() {
  const { receivables, addReceivable, updateReceivable, payReceivable, deleteReceivable, revertReceivable, projects, accounts, categories, getProjectCode } = useApp();
  const [systems, setSystems] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    supabase.from("company_systems").select("id, name").order("name", { ascending: true }).then(({ data }) => {
      if (data) setSystems(data);
    });
  }, []);

  const [createOpen, setCreateOpen] = useState(false);
  const [payOpen, setPayOpen] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState<string | null>(null);
  const [createType, setCreateType] = useState<"income" | "expense">("expense");

  // Filters
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");
  const [fType, setFType] = useState("all");
  const [fStatus, setFStatus] = useState("all");
  const [fProject, setFProject] = useState("all");
  const [fSystem, setFSystem] = useState("all");
  const [fRecurringStatus, setFRecurringStatus] = useState("all"); // "all", "active", "inactive"
  const [fRecurrenceType, setFRecurrenceType] = useState("all");

  // Pay form
  const [payAccount, setPayAccount] = useState("");
  const [payCategory, setPayCategory] = useState("");
  const [payProject, setPayProject] = useState("");
  const [paySystem, setPaySystem] = useState("none");
  const [payDiscount, setPayDiscount] = useState("0");
  const [payInterest, setPayInterest] = useState("0");

  // Create form
  const [cDesc, setCDesc] = useState("");
  const [cValue, setCValue] = useState("");
  const [cDueDate, setCDueDate] = useState("");
  const [cIsRecurring, setCIsRecurring] = useState(false);
  const [cProject, setCProject] = useState("none");
  const [cAccount, setCAccount] = useState("");
  const [cCategory, setCCategory] = useState("");
  const [cSystem, setCSystem] = useState("none");
  const [cRecurrence, setCRecurrence] = useState("monthly");
  const [cStatus, setCStatus] = useState("pending");

  const payingItem = receivables.find((r) => r.id === payOpen);
  const [revertConfirmOpen, setRevertConfirmOpen] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<string | null>(null);

  const filteredReceivables = receivables.filter((r) => {
    if (fType !== "all" && r.type !== fType) return false;
    if (fStatus !== "all" && r.status !== fStatus) return false;
    if (fProject !== "all" && (r.projectId || "none") !== fProject) return false;
    if (fSystem !== "all" && (r.systemId || "none") !== fSystem) return false;
    if (fRecurringStatus !== "all") {
      const isRecurring = r.isRecurring;
      if (fRecurringStatus === "active" && !isRecurring) return false;
      if (fRecurringStatus === "inactive" && isRecurring) return false;
    }
    if (fRecurrenceType !== "all" && r.recurrence !== fRecurrenceType) return false;
    if (fFrom && r.dueDate < new Date(fFrom)) return false;
    if (fTo && r.dueDate > new Date(fTo + "T23:59:59")) return false;
    return true;
  });

  useEffect(() => {
    if (editOpen) {
      const item = receivables.find(r => r.id === editOpen);
      if (item) {
        setCDesc(item.description);
        setCValue(item.value.toString());
        setCDueDate(format(item.dueDate, "yyyy-MM-dd"));
        setCIsRecurring(item.isRecurring);
        setCCategory(item.categoryId);
        setCAccount(item.accountId);
        setCProject(item.projectId || "none");
        setCSystem(item.systemId || "none");
        setCRecurrence(item.recurrence);
        setCreateType(item.type);
        setCStatus(item.status);
        setCreateOpen(true);
      }
    } else {
      setCDesc(""); setCValue(""); setCDueDate(""); setCSystem("none"); setCIsRecurring(false); setCStatus("pending");
      setCAccount(""); setCCategory(""); setCProject("none");
    }
  }, [editOpen]);

  useEffect(() => {
    if (createOpen && !editOpen) {
      if (accounts.length > 0 && !cAccount) {
        const firstRealAccount = accounts.find(a => a.id !== "total-balance-account") || accounts[0];
        setCAccount(firstRealAccount.id);
      }
      if (categories.length > 0 && !cCategory) {
        setCCategory(categories[0].id);
      }
    }
  }, [createOpen, editOpen, accounts, categories, cAccount, cCategory]);

  useEffect(() => {
    if (payOpen) {
      const item = receivables.find((r) => r.id === payOpen);
      if (item) {
        setPayAccount(item.accountId || (accounts.length > 0 ? (accounts.find(a => a.id !== "total-balance-account") || accounts[0]).id : ""));
        setPayCategory(item.categoryId || (categories.length > 0 ? categories[0].id : ""));
        setPayProject(item.projectId || "none");
        setPaySystem(item.systemId || "none");
        setPayDiscount("0");
        setPayInterest("0");
      }
    }
  }, [payOpen, receivables, accounts, categories]);

  const handleCreate = (type: "income" | "expense") => {
    if (editOpen) {
      updateReceivable(editOpen, {
        description: cDesc,
        value: parseFloat(cValue) || 0,
        dueDate: cDueDate ? new Date(cDueDate + "T12:00:00") : new Date(),
        isRecurring: cIsRecurring,
        recurrence: cIsRecurring ? (cRecurrence as any) : "once",
        projectId: cProject === "none" ? null : cProject,
        categoryId: cCategory || "",
        accountId: cAccount || "",
        systemId: cSystem === "none" ? null : cSystem,
        status: cStatus as any,
      });
      setEditOpen(null);
    } else {
      const item: ReceivablePayable = {
        id: `rp${Date.now()}`,
        date: new Date(),
        dueDate: cDueDate ? new Date(cDueDate + "T12:00:00") : new Date(Date.now() + 30 * 86400000),
        description: cDesc,
        type,
        status: "pending",
        isRecurring: cIsRecurring,
        recurrence: cIsRecurring ? (cRecurrence as any) : "once",
        value: parseFloat(cValue) || 0,
        projectId: cProject === "none" ? null : cProject,
        categoryId: cCategory || "",
        accountId: cAccount || "",
        systemId: cSystem === "none" ? null : cSystem,
      };
      addReceivable(item);
    }
    setCreateOpen(false);
  };

  const handlePay = () => {
    if (!payOpen) return;
    const item = receivables.find((r) => r.id === payOpen);
    if (!item) return;

    const selectedAccountId = payAccount || item.accountId || (accounts.length > 0 ? accounts[0].id : "");
    const selectedCategoryId = payCategory || item.categoryId || (categories.length > 0 ? categories[0].id : "");

    if (!selectedAccountId) {
      toast.error("Por favor, selecione uma conta de destino/origem.");
      return;
    }

    payReceivable(payOpen, {
      discount: parseFloat(payDiscount) || 0,
      interest: parseFloat(payInterest) || 0,
      accountId: selectedAccountId,
      categoryId: selectedCategoryId,
      projectId: payProject === "none" ? null : (payProject || item.projectId),
      systemId: paySystem === "none" ? null : (paySystem || item.systemId),
    });
    setPayOpen(null);
    setPayDiscount("0"); setPayInterest("0"); setPaySystem("none"); setPayProject("");
    setPayAccount(""); setPayCategory("");
  };

  const handleDelete = async (id: string) => {
    setDeleteConfirmOpen(id);
  };

  const handleRevert = async (id: string) => {
    setRevertConfirmOpen(id);
  };

  const confirmDelete = async () => {
    if (deleteConfirmOpen) {
      await deleteReceivable(deleteConfirmOpen);
      setDeleteConfirmOpen(null);
    }
  };

  const confirmRevert = async () => {
    if (revertConfirmOpen) {
      await revertReceivable(revertConfirmOpen);
      setRevertConfirmOpen(null);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => { setCreateType("expense"); setCIsRecurring(true); setCreateOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Despesa
        </Button>
        <Button onClick={() => { setCreateType("income"); setCIsRecurring(true); setCreateOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Receita
        </Button>
      </div>

      <div className="bg-card rounded-xl border p-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        <div><Label className="text-xs">Vence de</Label><Input type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)} /></div>
        <div><Label className="text-xs">Até</Label><Input type="date" value={fTo} onChange={(e) => setFTo(e.target.value)} /></div>
        <div>
          <Label className="text-xs">Tipo</Label>
          <Select value={fType} onValueChange={setFType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="income">Receita</SelectItem>
              <SelectItem value="expense">Despesa</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Status</Label>
          <Select value={fStatus} onValueChange={setFStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="paid">Pago</SelectItem>
              <SelectItem value="overdue">Vencido</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Projeto</Label>
          <Select value={fProject} onValueChange={setFProject}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="none">Geral</SelectItem>
              {projects.filter((p) => p.status !== "archived").map((p) => (
                <SelectItem key={p.id} value={p.id}>{getProjectCode(p.id)} - {p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Sistema</Label>
          <Select value={fSystem} onValueChange={setFSystem}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="none">Nenhum</SelectItem>
              {systems.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Recorrência</Label>
          <Select value={fRecurringStatus} onValueChange={setFRecurringStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativa</SelectItem>
              <SelectItem value="inactive">Inativa</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Frequência</Label>
          <Select value={fRecurrenceType} onValueChange={setFRecurrenceType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="once">Única</SelectItem>
              <SelectItem value="daily">Diária</SelectItem>
              <SelectItem value="weekly">Semanal</SelectItem>
              <SelectItem value="monthly">Mensal</SelectItem>
              <SelectItem value="quarterly">Trimestral</SelectItem>
              <SelectItem value="yearly">Anual</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-4 font-medium text-muted-foreground">Data</th>
                <th className="text-left p-4 font-medium text-muted-foreground hidden sm:table-cell">Vencimento</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Descrição</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Tipo</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Recorrente</th>
                <th className="text-left p-4 font-medium text-muted-foreground hidden md:table-cell">Recorrência</th>
                <th className="text-right p-4 font-medium text-muted-foreground">Valor</th>
                <th className="p-4 font-medium text-muted-foreground">Ação</th>
              </tr>
            </thead>
            <tbody>
              {filteredReceivables.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="p-4 text-muted-foreground">{format(r.date, "dd/MM/yy")}</td>
                  <td className="p-4 text-muted-foreground hidden sm:table-cell">{format(r.dueDate, "dd/MM/yy")}</td>
                  <td className="p-4">{r.description}</td>
                  <td className="p-4">
                    <span className={cn("inline-flex px-2 py-0.5 rounded-full text-xs font-medium", r.type === "income" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>
                      {r.type === "income" ? "Receita" : "Despesa"}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={cn("inline-flex px-2 py-0.5 rounded-full text-xs font-medium", statusColors[r.status])}>
                      {statusLabels[r.status]}
                    </span>
                  </td>
                  <td className="p-4">
                    <Switch checked={r.isRecurring} onCheckedChange={(checked) => updateReceivable(r.id, { recurrence: checked ? 'monthly' : 'once' })} />
                  </td>
                  <td className="p-4 text-muted-foreground hidden md:table-cell">{recLabels[r.recurrence]}</td>
                  <td className={cn("p-4 text-right font-medium", r.type === "income" ? "text-success" : "text-destructive")}>
                    {fmt(r.value)}
                  </td>
                  <td className="p-4 flex items-center justify-end gap-2">
                    {r.status !== "paid" ? (
                      <Button size="sm" variant={r.type === "income" ? "default" : "outline"} onClick={() => setPayOpen(r.id)}>
                        {r.type === "income" ? "Receber" : "Pagar"}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 h-8 text-xs font-semibold"
                        onClick={() => handleRevert(r.id)}
                      >
                        Estornar
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 rounded-full text-muted-foreground hover:text-blue-500 hover:bg-blue-50"
                      onClick={() => setEditOpen(r.id)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-50"
                      onClick={() => handleDelete(r.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      <Dialog open={createOpen} onOpenChange={(open) => {
        setCreateOpen(open);
        if (!open) setEditOpen(null);
      }}>
        <DialogContent className="max-h-[90vh] flex flex-col">
          <DialogHeader><DialogTitle>{editOpen ? "Editar" : createType === "income" ? "Nova Receita" : "Nova Despesa"}</DialogTitle></DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-4 py-4">
              <div><Label>Descrição</Label><Input value={cDesc} onChange={(e) => setCDesc(e.target.value)} className="mt-1.5" /></div>
              <div><Label>Valor</Label><Input type="number" value={cValue} onChange={(e) => setCValue(e.target.value)} className="mt-1.5" /></div>
              <div><Label>Data de Vencimento</Label><Input type="date" value={cDueDate} onChange={(e) => setCDueDate(e.target.value)} className="mt-1.5" /></div>
              
              <div className="flex items-center space-x-2">
                <Switch id="recurring" checked={cIsRecurring} onCheckedChange={setCIsRecurring} />
                <Label htmlFor="recurring">Lançamento Recorrente</Label>
              </div>

              {cIsRecurring && (
                <div>
                  <Label>Tipo de Recorrência</Label>
                  <Select value={cRecurrence} onValueChange={setCRecurrence}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Diária</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="monthly">Mensal</SelectItem>
                      <SelectItem value="quarterly">Trimestral</SelectItem>
                      <SelectItem value="yearly">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>Projeto</Label>
                <Select value={cProject} onValueChange={setCProject}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {projects.filter((p) => p.status !== "archived").map((p) => (
                      <SelectItem key={p.id} value={p.id}>{getProjectCode(p.id)} - {p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sistema</Label>
                <Select value={cSystem} onValueChange={setCSystem}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum / Não aplicável</SelectItem>
                    {systems.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Categoria</Label>
                <Select value={cCategory} onValueChange={setCCategory}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Conta</Label>
                <Select value={cAccount} onValueChange={setCAccount}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {accounts.filter(a => a.id !== "total-balance-account").map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {editOpen && (
                <div>
                  <Label>Status</Label>
                  <Select value={cStatus} onValueChange={setCStatus}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="paid">Pago</SelectItem>
                      <SelectItem value="overdue">Vencido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={() => handleCreate(createType)}>{editOpen ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay/Receive Modal */}
      <Dialog open={!!payOpen} onOpenChange={() => setPayOpen(null)}>
        <DialogContent className="max-h-[90vh] flex flex-col">
          <DialogHeader><DialogTitle>{payingItem?.type === "income" ? "Receber" : "Pagar"}: {payingItem?.description}</DialogTitle></DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-4 py-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Valor original</p>
                <p className="text-2xl font-bold">{payingItem ? fmt(payingItem.value) : ""}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Desconto</Label><Input type="number" value={payDiscount} onChange={(e) => setPayDiscount(e.target.value)} className="mt-1.5" /></div>
                <div><Label>Juros</Label><Input type="number" value={payInterest} onChange={(e) => setPayInterest(e.target.value)} className="mt-1.5" /></div>
              </div>
              <div>
                <Label>Conta</Label>
                <Select value={payAccount || payingItem?.accountId || ""} onValueChange={setPayAccount}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {accounts.filter(a => a.id !== "total-balance-account").map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Categoria</Label>
                <Select value={payCategory || payingItem?.categoryId || ""} onValueChange={setPayCategory}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Projeto</Label>
                <Select value={payProject || payingItem?.projectId || "none"} onValueChange={setPayProject}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {projects.filter((p) => p.status !== "archived").map((p) => (
                      <SelectItem key={p.id} value={p.id}>{getProjectCode(p.id)} - {p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sistema</Label>
                <Select value={paySystem === "none" && payingItem?.systemId ? payingItem.systemId : paySystem} onValueChange={setPaySystem}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum / Não aplicável</SelectItem>
                    {systems.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {payingItem && (
                <div className="bg-muted rounded-lg p-3 text-center">
                  <p className="text-sm text-muted-foreground">Valor final</p>
                  <p className="text-lg font-semibold">{fmt(payingItem.value - (parseFloat(payDiscount) || 0) + (parseFloat(payInterest) || 0))}</p>
                </div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(null)}>Cancelar</Button>
            <Button onClick={handlePay}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revert Confirmation Modal */}
      <Dialog open={!!revertConfirmOpen} onOpenChange={() => setRevertConfirmOpen(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Estornar Lançamento Financeiro</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Deseja realmente estornar este lançamento? O status voltará para <strong>Pendente</strong> e qualquer movimentação financeira associada na conta caixa será desfeita, ajustando novamente o saldo da respectiva conta.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setRevertConfirmOpen(null)}>Cancelar</Button>
            <Button variant="amber" className="bg-amber-600 hover:bg-amber-700 text-white" onClick={confirmRevert}>Confirmar Estorno</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteConfirmOpen} onOpenChange={() => setDeleteConfirmOpen(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir Lançamento</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Deseja realmente excluir este lançamento financeiro de Receita/Despesa? Esta ação é irreversível.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}