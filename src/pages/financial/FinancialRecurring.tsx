import { useState } from "react";
import { useApp, type ReceivablePayable } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const statusLabels: Record<string, string> = { pending: "Pendente", paid: "Pago", overdue: "Vencido" };
const statusColors: Record<string, string> = { pending: "bg-warning/10 text-warning", paid: "bg-success/10 text-success", overdue: "bg-destructive/10 text-destructive" };
const recLabels: Record<string, string> = { once: "Única", monthly: "Mensal", weekly: "Semanal", yearly: "Anual" };

export default function FinancialRecurring() {
  const { receivables, addReceivable, payReceivable, projects, accounts, categories } = useApp();
  const [createOpen, setCreateOpen] = useState(false);
  const [payOpen, setPayOpen] = useState<string | null>(null);
  const [createType, setCreateType] = useState<"income" | "expense">("expense");

  // Filters
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");
  const [fType, setFType] = useState("all");
  const [fStatus, setFStatus] = useState("all");
  const [fProject, setFProject] = useState("all");

  // Pay form
  const [payAccount, setPayAccount] = useState("");
  const [payCategory, setPayCategory] = useState("");
  const [payDiscount, setPayDiscount] = useState("0");
  const [payInterest, setPayInterest] = useState("0");

  // Create form
  const [cDesc, setCDesc] = useState("");
  const [cValue, setCValue] = useState("");
  const [cProject, setCProject] = useState("none");
  const [cAccount, setCAccount] = useState("");
  const [cCategory, setCCategory] = useState("");
  const [cRecurrence, setCRecurrence] = useState("once");

  const payingItem = receivables.find((r) => r.id === payOpen);

  const filteredReceivables = receivables.filter((r) => {
    if (fType !== "all" && r.type !== fType) return false;
    if (fStatus !== "all" && r.status !== fStatus) return false;
    if (fProject !== "all" && (r.projectId || "none") !== fProject) return false;
    if (fFrom && r.dueDate < new Date(fFrom)) return false;
    if (fTo && r.dueDate > new Date(fTo + "T23:59:59")) return false;
    return true;
  });

  const handleCreate = (type: "income" | "expense") => {
    const item: ReceivablePayable = {
      id: `rp${Date.now()}`,
      date: new Date(),
      dueDate: new Date(Date.now() + 30 * 86400000),
      description: cDesc,
      type,
      status: "pending",
      recurrence: cRecurrence as any,
      value: parseFloat(cValue) || 0,
      projectId: cProject === "none" ? null : cProject,
      categoryId: cCategory || "",
      accountId: cAccount || "",
    };
    addReceivable(item);
    setCreateOpen(false);
    setCDesc(""); setCValue("");
  };

  const handlePay = () => {
    if (!payOpen) return;
    const item = receivables.find((r) => r.id === payOpen);
    payReceivable(payOpen, {
      discount: parseFloat(payDiscount) || 0,
      interest: parseFloat(payInterest) || 0,
      accountId: payAccount || item?.accountId || "",
      categoryId: payCategory || item?.categoryId || "",
      projectId: item?.projectId || null,
    });
    setPayOpen(null);
    setPayDiscount("0"); setPayInterest("0");
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => { setCreateType("expense"); setCreateOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Despesa
        </Button>
        <Button onClick={() => { setCreateType("income"); setCreateOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Receita
        </Button>
      </div>

      <div className="bg-card rounded-xl border p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
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
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
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
                  <td className="p-4 text-muted-foreground hidden md:table-cell">{recLabels[r.recurrence]}</td>
                  <td className={cn("p-4 text-right font-medium", r.type === "income" ? "text-success" : "text-destructive")}>
                    {fmt(r.value)}
                  </td>
                  <td className="p-4">
                    {r.status !== "paid" && (
                      <Button size="sm" variant={r.type === "income" ? "default" : "outline"} onClick={() => setPayOpen(r.id)}>
                        {r.type === "income" ? "Receber" : "Pagar"}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{createType === "income" ? "Nova Receita" : "Nova Despesa"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div><Label>Descrição</Label><Input value={cDesc} onChange={(e) => setCDesc(e.target.value)} className="mt-1.5" /></div>
            <div><Label>Valor</Label><Input type="number" value={cValue} onChange={(e) => setCValue(e.target.value)} className="mt-1.5" /></div>
            <div>
              <Label>Recorrência</Label>
              <Select value={cRecurrence} onValueChange={setCRecurrence}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">Única</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="yearly">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Projeto</Label>
              <Select value={cProject} onValueChange={setCProject}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {projects.filter((p) => p.status !== "archived").map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Conta</Label>
              <Select value={cAccount} onValueChange={setCAccount}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={() => handleCreate(createType)}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay/Receive Modal */}
      <Dialog open={!!payOpen} onOpenChange={() => setPayOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{payingItem?.type === "income" ? "Receber" : "Pagar"}: {payingItem?.description}</DialogTitle></DialogHeader>
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
              <Select value={payAccount} onValueChange={setPayAccount}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={payCategory} onValueChange={setPayCategory}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(null)}>Cancelar</Button>
            <Button onClick={handlePay}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}