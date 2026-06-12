import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Pencil, Cpu, Trash2, ArrowUpRight, ArrowDownRight, Wallet, History, CalendarDays, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useApp } from "@/contexts/AppContext";

interface CompanySystem {
  id: string;
  name: string;
  initial_balance: number;
}

interface FinancialTransaction {
  id: string;
  project_id?: string | null;
  type: string;
  value: number;
  system_id?: string | null;
  description?: string;
  transaction_date?: string | null;
  category_id?: string | null;
}

const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const cleanDescription = (desc: string) => {
  return desc.replace(/\[sys:[^\]]+\]/g, "").replace(/\[ref:[^\]]+\]/g, "").replace(/\[due:[^\]]+\]/g, "").trim();
};

export default function FinancialSystems() {
  const { categories } = useApp();
  const [systems, setSystems] = useState<CompanySystem[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  // States
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [selectedSystemForDetails, setSelectedSystemForDetails] = useState<CompanySystem | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Systems
      const sysRes = await supabase.from("company_systems" as any).select("*").order("name", { ascending: true });
      if (sysRes.error) { console.error("Error loading systems:", sysRes.error); throw sysRes.error; }

      // 2. Transactions - with date and category_id
      let txRes = await supabase.from("financial_transactions" as any).select("id, type, value, project_id, system_id, description, transaction_date, category_id");
      if (txRes.error && (txRes.error.code === '42703' || txRes.error.message?.includes('column') || txRes.error.message?.includes('does not exist'))) {
        console.warn("Retrying financial_transactions select without system_id column");
        txRes = await supabase.from("financial_transactions" as any).select("id, type, value, project_id, description, transaction_date, category_id");
      }
      if (txRes.error) { console.error("Error loading transactions (detailed):", JSON.stringify(txRes.error)); throw txRes.error; }

      const mappedTx = (txRes.data || []).map((t: any) => {
        let systemId = t.system_id || null;
        const desc = t.description || "";
        const match = desc.match(/\[sys:([^:\s\]]+)(?::([yn]))?\]/);
        if (match && !systemId) {
          systemId = match[1];
        }
        return {
          id: t.id,
          type: t.type,
          value: Number(t.value),
          project_id: t.project_id,
          system_id: systemId,
          description: desc,
          transaction_date: t.transaction_date || null,
          category_id: t.category_id || null,
        };
      });

      setSystems(sysRes.data || []);
      setTransactions(mappedTx);
    } catch (err) {
      console.error("Erro ao carregar dados financeiros dos sistemas (detalhado):", err);
      toast.error(`Erro ao obter informações financeiras: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel("financial_systems_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "financial_transactions" }, () => {
        loadData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "company_systems" }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getSystemFinancials = (systemId: string) => {
    // 1. Initial Balance
    const system = systems.find(s => s.id === systemId);
    const initial = system ? system.initial_balance : 0;

    // 2. Transactions linked to this system
    const systemTx = transactions.filter(t => t.system_id === systemId);
    const txIncome = systemTx.filter(t => t.type === "income").reduce((acc, t) => acc + (t.value || 0), 0);
    const txExpense = systemTx.filter(t => t.type === "expense" || t.type === "withdrawal").reduce((acc, t) => acc + (t.value || 0), 0);

    // 3. Computation - Vendas Closed Won removed entirely per request
    const balance = initial + txIncome - txExpense;

    return {
      initial,
      txIncome,
      txExpense,
      balance,
      systemTx
    };
  };

  const handleDeleteSystem = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente excluir o sistema "${name}"?`)) return;
    try {
      const { error } = await supabase.from("company_systems").delete().eq("id", id);
      if (error) throw error;
      toast.success("Sistema excluído!");
      loadData();
    } catch (err) {
      console.error("Erro ao excluir sistema:", err);
      toast.error("Falha ao excluir sistema.");
    }
  };

  const handleUpdateInitialBalance = async () => {
    if (!editingId) return;
    const value = parseFloat(editValue) || 0;
    try {
      const { error } = await supabase
        .from("company_systems" as any)
        .update({ initial_balance: value })
        .eq("id", editingId);

      if (error) throw error;
      toast.success("Saldo inicial do sistema atualizado.");
      setEditingId(null);
      loadData();
    } catch (err) {
      console.error("Erro ao atualizar saldo inicial:", err);
      toast.error("Falha ao salvar saldo inicial.");
    }
  };

  if (loading && systems.length === 0) {
    return <div className="py-12 text-center animate-pulse text-muted-foreground">Carregando demonstrativo financeiro dos sistemas...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in" id="financial-systems-tab">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-1.5">
            <Cpu className="w-5 h-5 text-primary" /> Controle de Contas por Sistema
          </h2>
          <p className="text-xs text-muted-foreground">
            Acompanhe o saldo financeiro de cada sistema em relação a transações de receitas e despesas incidentes de forma rápida e segura.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {systems.map((sys) => {
          const fin = getSystemFinancials(sys.id);
          return (
            <div 
              key={sys.id} 
              className="bg-card rounded-xl border p-5 hover:shadow-md hover:border-primary/40 cursor-pointer transition-all flex flex-col justify-between"
              onClick={() => setSelectedSystemForDetails(sys)}
              title="Clique para ver extrato detalhado de movimentações"
            >
              <div>
                <div className="flex items-center justify-between mb-4 pb-2 border-b">
                  <div>
                    <h3 className="font-bold text-base text-foreground">{sys.name}</h3>
                    <span className="text-[10px] text-muted-foreground font-mono">ID: {sys.id.substring(0, 8)}...</span>
                  </div>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-primary rounded-full" 
                      onClick={(e) => { 
                        e.stopPropagation();
                        setEditingId(sys.id); 
                        setEditValue(String(sys.initial_balance)); 
                      }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-red-500 rounded-full" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSystem(sys.id, sys.name);
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Saldo Inicial</span>
                    <span className="font-semibold text-foreground">{fmt(fin.initial)}</span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground flex items-center gap-1">Transações (Receitas)</span>
                    <span className="font-medium text-emerald-600">+{fmt(fin.txIncome)}</span>
                  </div>

                  <div className="flex justify-between items-center text-xs border-b pb-2">
                    <span className="text-muted-foreground flex items-center gap-1">Transações (Despesas)</span>
                    <span className="font-semibold text-red-500">-{fmt(fin.txExpense)}</span>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <span className="text-muted-foreground font-bold text-sm">Saldo Final</span>
                    <span className={cn("text-lg font-black", fin.balance >= 0 ? "text-emerald-600" : "text-red-500")}>
                      {fmt(fin.balance)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t text-[10px] text-muted-foreground text-center font-medium hover:text-primary transition-colors flex items-center justify-center gap-1">
                <History className="w-3.5 h-3.5" /> Clique para ver todas as movimentações
              </div>
            </div>
          );
        })}

        {systems.length === 0 && (
          <p className="text-sm text-muted-foreground col-span-full text-center py-12">Nenhum sistema cadastrado. Por favor, acesse o menu "Sistemas" para cadastrar.</p>
        )}
      </div>

      {/* DETALHES DE MOVIMENTAÇÕES COMPLETO */}
      <Dialog open={!!selectedSystemForDetails} onOpenChange={() => setSelectedSystemForDetails(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6 rounded-2xl">
          {selectedSystemForDetails && (() => {
            const fin = getSystemFinancials(selectedSystemForDetails.id);
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-indigo-500" /> Movimentações: {selectedSystemForDetails.name}
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Extrato resumido e detalhado de receitas e despesas vinculadas a este sistema.
                  </DialogDescription>
                </DialogHeader>

                {/* Resumo Card */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-900 border rounded-xl p-4 my-2 text-center">
                  <div className="flex flex-col justify-center">
                    <span className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Saldo Inicial</span>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 mt-1">{fmt(fin.initial)}</span>
                  </div>
                  <div className="flex flex-col justify-center border-l">
                    <span className="text-[10px] text-muted-foreground uppercase font-black tracking-wider text-emerald-600">Total Receitas</span>
                    <span className="text-sm font-bold text-emerald-600 mt-1">+{fmt(fin.txIncome)}</span>
                  </div>
                  <div className="flex flex-col justify-center border-l">
                    <span className="text-[10px] text-muted-foreground uppercase font-black tracking-wider text-red-500">Total Despesas</span>
                    <span className="text-sm font-bold text-red-500 mt-1">-{fmt(fin.txExpense)}</span>
                  </div>
                  <div className="flex flex-col justify-center border-l">
                    <span className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Saldo Final</span>
                    <span className={cn("text-sm font-black mt-1", fin.balance >= 0 ? "text-emerald-600" : "text-red-500")}>
                      {fmt(fin.balance)}
                    </span>
                  </div>
                </div>

                {/* List of movements */}
                <div className="flex-1 overflow-y-auto pr-1 space-y-2 mt-2 max-h-[45vh]">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Receipt className="w-3.5 h-3.5" /> Lista de Transações
                  </h4>
                  {fin.systemTx.length === 0 ? (
                    <div className="text-center py-10 text-xs text-muted-foreground border border-dashed rounded-xl">
                      Nenhuma transação financeira vinculada a este sistema no período.
                    </div>
                  ) : (
                    fin.systemTx.map((tx) => {
                      const isIncome = tx.type === "income";
                      const catName = categories.find((c) => c.id === tx.category_id)?.name || "Geral";
                      const txDate = tx.transaction_date 
                        ? new Date(tx.transaction_date).toLocaleDateString("pt-BR") 
                        : "Sem data";

                      return (
                        <div 
                          key={tx.id} 
                          className="flex items-center justify-between p-3.5 rounded-xl border bg-card hover:bg-slate-50/50 transition-colors gap-4"
                        >
                          <div className="flex items-center gap-3 truncate">
                            <div className={cn(
                              "p-2 rounded-lg shrink-0",
                              isIncome ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20" : "bg-red-50 text-red-500 dark:bg-red-950/20"
                            )}>
                              {isIncome ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                            </div>
                            <div className="truncate min-w-0">
                              <span className="font-semibold text-slate-700 dark:text-slate-100 text-xs block truncate">
                                {cleanDescription(tx.description || "Transação sem descrição")}
                              </span>
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                                <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-medium">{catName}</span>
                                <span>•</span>
                                <span className="flex items-center gap-0.5"><CalendarDays className="w-3 h-3" /> {txDate}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className={cn("text-xs font-extrabold shrink-0", isIncome ? "text-emerald-600" : "text-red-500")}>
                            {isIncome ? "+" : "-"}{fmt(tx.value)}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <DialogFooter className="pt-4 border-t mt-4">
                  <Button variant="outline" onClick={() => setSelectedSystemForDetails(null)} className="font-semibold w-full sm:w-auto">
                    Fechar Extrato
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* EDITAR SALDO INICIAL */}
      <Dialog open={!!editingId} onOpenChange={() => setEditingId(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Editar Saldo Inicial</DialogTitle>
            <DialogDescription>
              Defina o saldo inicial de fundos para contabilidade inicial deste sistema no financeiro.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="initial-bal-input">Saldo Inicial (R$)</Label>
            <Input 
              id="initial-bal-input"
              type="number" 
              step="0.01"
              value={editValue} 
              onChange={(e) => setEditValue(e.target.value)} 
              className="mt-2 rounded-xl" 
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditingId(null)}>Cancelar</Button>
            <Button onClick={handleUpdateInitialBalance} className="bg-indigo-600 text-white hover:bg-indigo-700 font-semibold">Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
