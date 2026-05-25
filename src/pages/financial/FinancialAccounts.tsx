import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Plus } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function FinancialAccounts() {
  const [selected, setSelected] = useState<string | null>(null);
  const { accounts, transactions, refreshAccounts } = useApp();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [agency, setAgency] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [balance, setBalance] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Informe o nome"); return; }
    setSaving(true);
    const { error } = await supabase.from("financial_accounts").insert({
      name: name.trim(),
      agency: agency || "",
      account_number: accountNumber || "",
      balance: balance ? Number(balance) : 0,
    });
    setSaving(false);
    if (error) { toast.error("Erro ao criar conta"); return; }
    toast.success("Conta criada!");
    setName(""); setAgency(""); setAccountNumber(""); setBalance("");
    setCreateOpen(false);
    await refreshAccounts();
  };

  const account = accounts.find((a) => a.id === selected);
  const accTransactions = selected ? transactions.filter((t) => t.accountId === selected) : [];

  if (account) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Button variant="ghost" onClick={() => setSelected(null)} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
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
            {accTransactions.map((t) => (
              <div key={t.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{t.description}</p>
                  <p className="text-xs text-muted-foreground">{format(t.date, "dd/MM/yyyy")}</p>
                </div>
                <span className={cn("font-medium text-sm", t.type === "income" ? "text-success" : "text-destructive")}>
                  {t.type === "income" ? "+" : "-"}{fmt(t.value)}
                </span>
              </div>
            ))}
            {accTransactions.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground text-center">Nenhuma movimentação.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4 mr-2" />Nova conta</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {accounts.map((acc) => (
        <div
          key={acc.id}
          onClick={() => setSelected(acc.id)}
          className="bg-card rounded-xl border p-5 hover:shadow-md cursor-pointer transition-all animate-slide-up"
        >
          <p className="text-sm text-muted-foreground">{acc.name}</p>
          <p className="text-xl font-semibold mt-2">{fmt(acc.balance)}</p>
          <p className="text-xs text-muted-foreground mt-1">ID: {acc.id}</p>
        </div>
      ))}
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
    </div>
  );
}