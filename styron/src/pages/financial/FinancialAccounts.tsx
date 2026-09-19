import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Trash2, Pencil } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function FinancialAccounts() {
  const [selected, setSelected] = useState<string | null>(null);
  const { accounts, transactions, refreshAccounts, updateAccount } = useApp();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [agency, setAgency] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [balance, setBalance] = useState("");
  const [editName, setEditName] = useState("");
  const [editAgency, setEditAgency] = useState("");
  const [editAccountNumber, setEditAccountNumber] = useState("");
  const [editBalance, setEditBalance] = useState("");
  const [saving, setSaving] = useState(false);

  const startEdit = (acc: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingAccountId(acc.id);
    setEditName(acc.name);
    setEditAgency(acc.agency || "");
    setEditAccountNumber(acc.account_number || "");
    setEditBalance(String(acc.balance));
    setEditOpen(true);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) { toast.error("Informe o nome"); return; }
    setSaving(true);
    await updateAccount(editingAccountId!, {
      name: editName.trim(),
      agency: editAgency || "",
      account_number: editAccountNumber || "",
      balance: editBalance ? Number(editBalance) : 0,
    });
    setSaving(false);
    setEditOpen(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Informe o nome"); return; }
    setSaving(true);
    const { data, error } = await supabase.from("financial_accounts").insert({
      name: name.trim(),
      agency: agency || "",
      account_number: accountNumber || "",
      balance: balance ? Number(balance) : 0,
    }).select();
    
    if (!error && data?.[0] && balance && Number(balance) > 0) {
      await supabase.from("financial_transactions").insert({
        type: "income",
        account_id: data[0].id,
        value: Number(balance),
        description: "Saldo Inicial",
        transaction_date: new Date().toISOString(),
      });
    }

    setSaving(false);
    if (error) { toast.error("Erro ao criar conta"); return; }
    toast.success("Conta criada!");
    setName(""); setAgency(""); setAccountNumber(""); setBalance("");
    setCreateOpen(false);
    await refreshAccounts();
  };

  const deleteAccount = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmOpen(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmOpen) return;
    const { error } = await supabase.from("financial_accounts").delete().eq("id", deleteConfirmOpen);
    if (error) {
      toast.error("Erro ao excluir conta: " + error.message);
      return;
    }
    toast.success("Conta excluída!");
    if (selected === deleteConfirmOpen) {
      setSelected(null);
    }
    setDeleteConfirmOpen(null);
    await refreshAccounts();
  };

  const account = accounts.find((a) => a.id === selected);
  const accTransactions = selected
    ? transactions.filter((t) => t.accountId === selected || t.destinationAccountId === selected)
    : [];

  if (account) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex justify-between items-center bg-card p-3 rounded-lg border">
          <Button variant="ghost" onClick={() => setSelected(null)} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => startEdit(account, e)}
              className="gap-2"
            >
              <Pencil className="w-4 h-4" /> Editar Conta
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={(e) => deleteAccount(account.id, e)}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" /> Excluir Conta
            </Button>
          </div>
        </div>
        <div className="bg-card rounded-xl border p-5">
          <h3 className="text-lg font-semibold">{account.name}</h3>
          <p className="text-2xl font-bold mt-2">{fmt(account.balance)}</p>
          <p className="text-xs text-muted-foreground mt-1">Operações de transferência e saque são feitas em Movimentações.</p>
        </div>

        <div className="bg-card rounded-xl border overflow-hidden">
          <div className="p-4 border-b">
            <h4 className="text-sm font-medium text-muted-foreground">Movimentações</h4>
          </div>
          <div className="divide-y">
            {accTransactions.map((t) => {
              const isIncomeForThisAccount =
                t.type === "income" ||
                (t.type === "transfer" && t.destinationAccountId === selected);
              
              const sign = isIncomeForThisAccount ? "+" : "-";
              const colorClass = isIncomeForThisAccount ? "text-success" : "text-destructive";

              return (
                <div key={t.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {t.description}
                      {t.type === "transfer" && (
                        <span className="text-xs text-muted-foreground ml-1.5 font-normal block sm:inline">
                          ({accounts.find((a) => a.id === t.accountId)?.name || "Origem"} → {t.destinationAccountId ? (accounts.find((a) => a.id === t.destinationAccountId)?.name || "Destino") : <span className="text-amber-500 font-semibold">Sem destino ⚠️</span>})
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{format(t.date, "dd/MM/yyyy")}</p>
                  </div>
                  <span className={cn("font-medium text-sm", colorClass)}>
                    {sign}{fmt(t.value)}
                  </span>
                </div>
              );
            })}
            {accTransactions.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground text-center">Nenhuma movimentação.</p>
            )}
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        <Dialog open={!!deleteConfirmOpen} onOpenChange={() => setDeleteConfirmOpen(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Excluir Conta</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-2">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Deseja realmente excluir esta conta financeira? Esta ação é irreversível e removerá todos os registros associados.
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

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4 mr-2" />Nova conta</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {accounts.map((acc) => {
        const totalIncome = transactions
          .filter((t) => (t.accountId === acc.id && t.type === "income") || (t.destinationAccountId === acc.id && t.type === "transfer"))
          .reduce((sum, t) => sum + (t.value || 0), 0);
        const totalExpense = transactions
          .filter((t) => t.accountId === acc.id && (t.type === "expense" || t.type === "withdrawal" || t.type === "transfer"))
          .reduce((sum, t) => sum + (t.value || 0), 0);

        return (
            <div
              key={acc.id}
              onClick={() => setSelected(acc.id)}
              className={cn(
                "bg-card rounded-xl border p-5 hover:shadow-md cursor-pointer transition-all animate-slide-up flex flex-col justify-between space-y-4 relative group",
                acc.id === "total-balance-account" && "ring-2 ring-primary bg-primary/5"
              )}
            >
              <div>
                <div className="flex justify-between items-start">
                  <p className={cn("text-sm font-medium", acc.id === "total-balance-account" ? "text-primary" : "text-muted-foreground")}>{acc.name}</p>
                  {acc.id !== "total-balance-account" && (
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/5 md:opacity-0 group-hover:opacity-100 transition-all"
                        onClick={(e) => startEdit(acc, e)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-50 md:opacity-0 group-hover:opacity-100 transition-all"
                        onClick={(e) => deleteAccount(acc.id, e)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
                <p className={cn(
                  "text-2xl font-bold mt-2",
                  acc.balance < 0 ? "text-rose-600" : "text-foreground"
                )}>{fmt(acc.balance)}</p>
                {acc.id !== "total-balance-account" && (
                    <p className="text-[10px] text-muted-foreground/80 mt-1 font-mono">ID: {acc.id.substring(0, 8)}...</p>
                )}
              </div>
              
              {acc.id !== "total-balance-account" && (
                <div className="grid grid-cols-2 gap-2 pt-3 border-t text-xs">
                  <div className="flex flex-col">
                    <span className="text-muted-foreground text-[10px] uppercase font-semibold">Entradas</span>
                    <span className="text-emerald-600 font-bold mt-0.5">+{fmt(totalIncome)}</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-muted-foreground text-[10px] uppercase font-semibold">Saídas</span>
                    <span className="text-red-500 font-bold mt-0.5">-{fmt(totalExpense)}</span>
                  </div>
                </div>
              )}
            </div>
        );
      })}
      {accounts.length === 0 && (
        <p className="text-sm text-muted-foreground col-span-full text-center py-8">Nenhuma conta cadastrada.</p>
      )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova conta</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-4 py-2">
            <div><Label>Nome</Label><Input className="mt-1.5" value={name} onChange={(e) => setName(e.target.value)} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Agência</Label><Input className="mt-1.5" value={agency} onChange={(e) => setAgency(e.target.value)} /></div>
              <div><Label>Conta</Label><Input className="mt-1.5" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} /></div>
            </div>
            <div><Label>Saldo inicial</Label><Input type="number" step="0.01" className="mt-1.5" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="0,00" /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Criar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar conta</DialogTitle></DialogHeader>
          <form onSubmit={saveEdit} className="space-y-4 py-2">
            <div><Label>Nome</Label><Input className="mt-1.5" value={editName} onChange={(e) => setEditName(e.target.value)} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Agência</Label><Input className="mt-1.5" value={editAgency} onChange={(e) => setEditAgency(e.target.value)} /></div>
              <div><Label>Conta</Label><Input className="mt-1.5" value={editAccountNumber} onChange={(e) => setEditAccountNumber(e.target.value)} /></div>
            </div>
            <div>
              <Label>Saldo atual</Label>
              <Input
                type="number"
                step="0.01"
                className="mt-1.5"
                value={editBalance}
                onChange={(e) => setEditBalance(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteConfirmOpen} onOpenChange={() => setDeleteConfirmOpen(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir Conta</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Deseja realmente excluir esta conta financeira? Esta ação é irreversível e removerá todos os registros associados.
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