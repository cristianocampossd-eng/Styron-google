import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Pencil, Activity, Coins, LineChart, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CompanySystem {
  id: string;
  name: string;
  initial_balance: number;
}

interface CompanyProduct {
  id: string;
  name: string;
  system_id?: string | null;
}

interface CompanySale {
  id: string;
  product_id: string;
  total_price: number;
  stage: string;
  system_id?: string | null;
}

interface FinancialTransaction {
  id: string;
  project_id?: string | null;
  type: "income" | "expense";
  value: number;
  affects_system_balance?: boolean | null;
}

const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function FinancialSystems() {
  const [systems, setSystems] = useState<CompanySystem[]>([]);
  const [products, setProducts] = useState<CompanyProduct[]>([]);
  const [sales, setSales] = useState<CompanySale[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  // Editing Balance form
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [sysRes, prodRes, salesRes, txRes] = await Promise.all([
        supabase.from("company_systems" as any).select("*").order("name", { ascending: true }),
        supabase.from("company_products" as any).select("id, name, system_id"),
        supabase.from("company_sales" as any).select("id, product_id, total_price, stage, system_id"),
        supabase.from("financial_transactions" as any).select("id, type, value, project_id")
      ]);

      if (sysRes.error) { console.error("Error loading systems:", sysRes.error); throw sysRes.error; }
      if (prodRes.error) { console.error("Error loading products:", prodRes.error); throw prodRes.error; }
      if (salesRes.error) { console.error("Error loading sales:", salesRes.error); throw salesRes.error; }
      if (txRes.error) { console.error("Error loading transactions (detailed):", JSON.stringify(txRes.error)); throw txRes.error; }

      setSystems(sysRes.data || []);
      setProducts(prodRes.data || []);
      setSales(salesRes.data || []);
      setTransactions(txRes.data || []);
    } catch (err) {
      console.error("Erro ao carregar dados financeiros dos sistemas (detalhado):", err);
      toast.error(`Erro ao obter informações financeiras: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getSystemFinancials = (systemId: string) => {
    // 1. Initial Balance
    const system = systems.find(s => s.id === systemId);
    const initial = system ? system.initial_balance : 0;

    // 2. Sales Revenue (sales related to products in this system OR sales tagged directly with systemId)
    const productIdsForSystem = products.filter(p => p.system_id === systemId).map(p => p.id);
    const systemSales = sales.filter(s => 
      s.system_id === systemId || 
      (s.product_id && productIdsForSystem.includes(s.product_id))
    );
    
    // Count revenue from closed sales
    const salesRevenue = systemSales
      .filter(s => s.stage === "closed_won" || s.stage === "Concluido" || s.stage === "Faturado")
      .reduce((acc, current) => acc + (current.total_price || 0), 0);

    // 3. Transactions linked to this system (via project_id if implemented in future, for now transactions appear separately)
    // const systemTx = transactions.filter(t => t.system_id === systemId);
    
    // For now, transactions are not linked to systems directly.
    const systemTx: FinancialTransaction[] = []; 
    const txIncome = 0;
    const txExpense = 0;

    // 4. Computation
    const totalRevenue = salesRevenue + txIncome;
    const totalExpense = txExpense;
    const balance = initial + totalRevenue - totalExpense;

    return {
      initial,
      salesRevenue,
      txIncome,
      txExpense,
      totalRevenue,
      totalExpense,
      balance
    };
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
            Acompanhe o saldo financeiro de cada sistema em relação a vendas de produtos de software, receitas adicionadas e despesas incidentes.
          </p>
        </div>
        <Button onClick={loadData} variant="outline" size="sm">
          Sincronizar Valores
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {systems.map((sys) => {
          const fin = getSystemFinancials(sys.id);
          return (
            <div key={sys.id} className="bg-card rounded-xl border p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4 pb-2 border-b">
                <div>
                  <h3 className="font-bold text-base text-foreground">{sys.name}</h3>
                  <span className="text-[10px] text-muted-foreground font-mono">ID: {sys.id.substring(0, 8)}...</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground hover:text-primary rounded-full" 
                  onClick={() => { 
                    setEditingId(sys.id); 
                    setEditValue(String(sys.initial_balance)); 
                  }}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
              </div>

              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-xs">Saldo Inicial</span>
                  <span className="font-semibold text-foreground">{fmt(fin.initial)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-xs flex items-center gap-1">Vendas (Closed Won)</span>
                  <span className="font-semibold text-emerald-600">+{fmt(fin.salesRevenue)}</span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">Transações (Receitas)</span>
                  <span className="font-medium text-emerald-600">+{fmt(fin.txIncome)}</span>
                </div>

                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-muted-foreground text-xs flex items-center gap-1">Transações (Despesas)</span>
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
          );
        })}

        {systems.length === 0 && (
          <p className="text-sm text-muted-foreground col-span-full text-center py-12">Nenhum sistema cadastrado. Por favor, acesse o menu "Sistemas" para cadastrar.</p>
        )}
      </div>

      <Dialog open={!!editingId} onOpenChange={() => setEditingId(null)}>
        <DialogContent className="max-w-md">
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
              className="mt-2" 
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingId(null)}>Cancelar</Button>
            <Button onClick={handleUpdateInitialBalance}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
