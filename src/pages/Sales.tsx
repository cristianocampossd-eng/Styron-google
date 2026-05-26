import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/contexts/AppContext";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  ShoppingBag,
  Plus,
  Search,
  TrendingUp,
  Award,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingDown,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  User,
  Building,
  ArrowUpRight,
  Edit2,
  Trash2,
  Filter,
  Cpu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { CompanyProduct } from "./Products";

interface CompanySale {
  id: string;
  client_name: string;
  company_name?: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  stage: "prospecting" | "negotiation" | "proposal" | "closed_won" | "closed_lost";
  seller_id: string;
  seller_name: string;
  notes?: string;
  system_id?: string | null;
  created_at?: string;
}

const STAGES_DETAILS = {
  prospecting: { label: "Prospecção", color: "bg-blue-100 text-blue-805 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300", step: 1 },
  negotiation: { label: "Negociação", color: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300", step: 2 },
  proposal: { label: "Proposta Enviada", color: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300", step: 3 },
  closed_won: { label: "Fechada (Ganha) ✅", color: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300", step: 4 },
  closed_lost: { label: "Fechada (Perdida) ❌", color: "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-955/40 dark:text-rose-300", step: 4 }
};

export default function Sales() {
  const { user, profile } = useAuth();
  const { accounts, categories, projects, addTransaction, updateAccountBalance } = useApp();
  const [sales, setSales] = useState<CompanySale[]>([]);
  const [products, setProducts] = useState<CompanyProduct[]>([]);
  const [loading, setLoading] = useState(false);

  // Financial Dialog State for Won Sales
  const [isFinTxDialogOpen, setIsFinTxDialogOpen] = useState(false);
  const [pendingSale, setPendingSale] = useState<any | null>(null);

  // Financial Form States
  const [finType, setFinType] = useState<string>("income");
  const [finAccount, setFinAccount] = useState("");
  const [finDestAccount, setFinDestAccount] = useState("");
  const [finCategory, setFinCategory] = useState("");
  const [finProject, setFinProject] = useState("general");
  const [finValue, setFinValue] = useState("");
  const [finDesc, setFinDesc] = useState("");
  const [finSystem, setFinSystem] = useState("none");
  const [finAffectsSystem, setFinAffectsSystem] = useState(true);

  // Filters State
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [systems, setSystems] = useState<{ id: string; name: string }[]>([]);
  const [systemFilter, setSystemFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState<"today" | "7days" | "30days" | "year" | "all">("all");

  // Modal State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Field State
  const [clientName, setClientName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [stage, setStage] = useState<"prospecting" | "negotiation" | "proposal" | "closed_won" | "closed_lost">("prospecting");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadSalesAndProducts();
  }, []);

  // Update total price when quantity or unit price changes
  useEffect(() => {
    setTotalPrice(quantity * unitPrice);
  }, [quantity, unitPrice]);

  const loadSalesAndProducts = async () => {
    setLoading(true);
    try {
      // Load Sales
      const { data: salesData, error: salesErr } = await supabase.from("company_sales").select("*").order("created_at", { ascending: false });
      if (salesErr) throw salesErr;
      setSales(salesData || []);

      // Load Products/Services catalog to select from
      const { data: prodData } = await supabase.from("company_products").select("*").eq("status", "active");
      setProducts(prodData || []);

      // Load Systems
      const { data: sysData } = await supabase.from("company_systems").select("id, name").order("name", { ascending: true });
      if (sysData) setSystems(sysData);
    } catch (err: any) {
      console.error("Erro ao carregar vendas do Firebase:", err);
      toast.error("Erro ao sincronizar informações de vendas.");
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelect = (selectedId: string) => {
    setProductId(selectedId);
    const selectedProd = products.find((p) => p.id === selectedId);
    if (selectedProd) {
      setUnitPrice(selectedProd.price);
    }
  };

  const openFinancialDialog = (saleData: any) => {
    setPendingSale(saleData);
    setFinType("income");
    setFinValue(String(saleData.total_price || 0));
    setFinDesc(`Venda: ${saleData.client_name} - ${saleData.product_name}`);
    
    const sysId = saleData.system_id || "none";
    setFinSystem(sysId);
    setFinAffectsSystem(sysId !== "none");

    if (accounts && accounts.length > 0) {
      setFinAccount(accounts[0].id);
    } else {
      setFinAccount("");
    }

    if (categories && categories.length > 0) {
      const salesCat = categories.find(c => c.name.toLowerCase().includes("venda") || c.name.toLowerCase().includes("receit"));
      setFinCategory(salesCat ? salesCat.id : categories[0].id);
    } else {
      setFinCategory("");
    }

    setFinProject("general");
    setIsFinTxDialogOpen(true);
  };

  const handleSaveFinancialTxAndSale = async () => {
    if (!pendingSale) return;
    const value = parseFloat(finValue);
    if (!value || isNaN(value) || !finAccount) {
      toast.error("Por favor, preencha o valor e selecione a conta de movimentação.");
      return;
    }

    try {
      const basePayload = {
        client_name: pendingSale.client_name,
        company_name: pendingSale.company_name,
        product_id: pendingSale.product_id,
        product_name: pendingSale.product_name,
        quantity: Number(pendingSale.quantity),
        unit_price: Number(pendingSale.unit_price),
        total_price: Number(pendingSale.total_price),
        stage: "closed_won" as const,
        seller_id: pendingSale.seller_id,
        seller_name: pendingSale.seller_name,
        notes: pendingSale.notes,
      };

      if (pendingSale.id) {
        // Update existing sale
        let { error } = await supabase.from("company_sales").update({
          ...basePayload,
          system_id: pendingSale.system_id,
        }).eq("id", pendingSale.id);
        
        if (error && (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist'))) {
          console.warn("Retrying update without system_id column");
          const retryRes = await supabase.from("company_sales").update(basePayload).eq("id", pendingSale.id);
          error = retryRes.error;
        }
        if (error) throw error;
      } else {
        // Insert new sale
        let { error } = await supabase.from("company_sales").insert({
          ...basePayload,
          system_id: pendingSale.system_id,
        });
        
        if (error && (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist'))) {
          console.warn("Retrying insert without system_id column");
          const retryRes = await supabase.from("company_sales").insert(basePayload);
          error = retryRes.error;
        }
        if (error) throw error;
      }

      // Track financial txn
      const txn = {
        type: finType as any,
        projectId: finProject === "general" ? null : finProject,
        accountId: finAccount,
        categoryId: finCategory || null,
        value,
        date: new Date(),
        description: finDesc || `Venda: ${pendingSale.client_name}`,
        systemId: finSystem === "none" ? null : finSystem,
        affectsSystemBalance: finAffectsSystem,
      };

      await addTransaction(txn);
      
      // Update local account balance
      if (finType === "income") updateAccountBalance(finAccount, value);
      if (finType === "expense") updateAccountBalance(finAccount, -value);
      if (finType === "withdrawal") updateAccountBalance(finAccount, -value);
      if (finType === "transfer") {
        updateAccountBalance(finAccount, -value);
        if (finDestAccount) updateAccountBalance(finDestAccount, value);
      }

      toast.success("Venda finalizada (ganha) e movimentação financeira registrada com sucesso!");
      setIsFinTxDialogOpen(false);
      setPendingSale(null);
      clearForm();
      loadSalesAndProducts();
    } catch (err: any) {
      console.error(err);
      toast.error(`Erro ao finalizar a venda: ${err.message || "Erro desconhecido"}`);
    }
  };

  const handleSaveSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !productId || quantity <= 0) {
      toast.error("Preencha o nome do cliente, quantidade e escolha o produto.");
      return;
    }

    const selectedProd = products.find((p) => p.id === productId);
    const selectedProductName = selectedProd ? selectedProd.name : "Serviço customizado";
    const selectedSystemId = selectedProd ? (selectedProd as any).system_id : null;

    const basePayload = {
      client_name: clientName,
      company_name: companyName,
      product_id: productId,
      product_name: selectedProductName,
      quantity: Number(quantity),
      unit_price: Number(unitPrice),
      total_price: Number(totalPrice),
      stage,
      seller_id: user?.id || "fallback-vendedor",
      seller_name: profile?.name || user?.email?.split("@")[0] || "Consultor Styron",
      notes,
    };

    if (stage === "closed_won") {
      const tempSale = {
        id: editingId || undefined,
        client_name: clientName,
        company_name: companyName,
        product_id: productId,
        product_name: selectedProductName,
        quantity: Number(quantity),
        unit_price: Number(unitPrice),
        total_price: Number(totalPrice),
        stage: "closed_won" as const,
        seller_id: user?.id || "fallback-vendedor",
        seller_name: profile?.name || user?.email?.split("@")[0] || "Consultor Styron",
        notes,
        system_id: selectedSystemId,
      };
      setIsDialogOpen(false);
      openFinancialDialog(tempSale);
      return;
    }

    try {
      if (editingId) {
        // Update
        let { error } = await supabase.from("company_sales").update({
          ...basePayload,
          system_id: selectedSystemId,
        }).eq("id", editingId);
        
        if (error && (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist'))) {
          console.warn("Retrying update without system_id column");
          const retryRes = await supabase.from("company_sales").update(basePayload).eq("id", editingId);
          error = retryRes.error;
        }
        
        if (error) throw error;
        toast.success("Oportunidade de venda atualizada.");
      } else {
        // Insert new sale
        let { error } = await supabase.from("company_sales").insert({
          ...basePayload,
          system_id: selectedSystemId,
        });
        
        if (error && (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist'))) {
          console.warn("Retrying insert without system_id column");
          const retryRes = await supabase.from("company_sales").insert(basePayload);
          error = retryRes.error;
        }
        
        if (error) throw error;
        toast.success("Oportunidade de venda registrada no funil.");
      }

      setIsDialogOpen(false);
      clearForm();
      loadSalesAndProducts();
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao gravar venda no banco de dados.");
    }
  };

  const clearForm = () => {
    setEditingId(null);
    setClientName("");
    setCompanyName("");
    setProductId("");
    setQuantity(1);
    setUnitPrice(0);
    setTotalPrice(0);
    setStage("prospecting");
    setNotes("");
  };

  const handleEdit = (sale: CompanySale) => {
    setEditingId(sale.id);
    setClientName(sale.client_name);
    setCompanyName(sale.company_name || "");
    setProductId(sale.product_id);
    setQuantity(sale.quantity);
    setUnitPrice(sale.unit_price);
    setTotalPrice(sale.total_price);
    setStage(sale.stage);
    setNotes(sale.notes || "");
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string, client: string) => {
    if (confirm(`Remover permanentemente do funil a oportunidade do cliente "${client}"?`)) {
      try {
        const { error } = await supabase.from("company_sales").delete().eq("id", id);
        if (error) throw error;
        toast.success("Oportunidade de venda excluída.");
        loadSalesAndProducts();
      } catch (err) {
        toast.error("Erro ao deletar registro.");
      }
    }
  };

  // Step progression helper ("avançando até o fechamento da venda")
  const handleAdvanceStage = async (sale: CompanySale) => {
    let nextStage: "prospecting" | "negotiation" | "proposal" | "closed_won" | "closed_lost" | null = null;
    if (sale.stage === "prospecting") nextStage = "negotiation";
    else if (sale.stage === "negotiation") nextStage = "proposal";
    else if (sale.stage === "proposal") nextStage = "closed_won"; // Default advance proposal wins

    if (nextStage) {
      if (nextStage === "closed_won") {
        openFinancialDialog({
          ...sale,
          stage: "closed_won"
        });
        return;
      }
      try {
        const { error } = await supabase
          .from("company_sales")
          .update({ stage: nextStage })
          .eq("id", sale.id);

        if (error) throw error;
        toast.success(`Estágio de venda avançado para: ${STAGES_DETAILS[nextStage].label}`);
        loadSalesAndProducts();
      } catch (err) {
        toast.error("Erro ao atualizar estágio da venda.");
      }
    }
  };

  const handleRegressStage = async (sale: CompanySale) => {
    let prevStage: "prospecting" | "negotiation" | "proposal" | "closed_won" | "closed_lost" | null = null;
    if (sale.stage === "negotiation") prevStage = "prospecting";
    else if (sale.stage === "proposal") prevStage = "negotiation";
    else if (sale.stage === "closed_won" || sale.stage === "closed_lost") prevStage = "proposal";

    if (prevStage) {
      try {
        const { error } = await supabase
          .from("company_sales")
          .update({ stage: prevStage })
          .eq("id", sale.id);

        if (error) throw error;
        toast.success(`Estágio de venda retornado para: ${STAGES_DETAILS[prevStage].label}`);
        loadSalesAndProducts();
      } catch (err) {
        toast.error("Erro ao atualizar estágio da venda.");
      }
    }
  };

  const handleSetLost = async (sale: CompanySale) => {
    try {
      const { error } = await supabase
        .from("company_sales")
        .update({ stage: "closed_lost" })
        .eq("id", sale.id);

      if (error) throw error;
      toast.error(`Oportunidade classificada como Fechada (Perdida) ❌`);
      loadSalesAndProducts();
    } catch (e) {
      toast.error("Falha ao atualizar registro de venda.");
    }
  };

  // Period filter logic helper
  const matchesPeriod = (sale: CompanySale) => {
    if (periodFilter === "all") return true;
    if (!sale.created_at) return true;
    
    const createdAt = new Date(sale.created_at);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (periodFilter === "today") {
      return createdAt >= startOfToday;
    }
    if (periodFilter === "7days") {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return createdAt >= sevenDaysAgo;
    }
    if (periodFilter === "30days") {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return createdAt >= thirtyDaysAgo;
    }
    if (periodFilter === "year") {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      return createdAt >= startOfYear;
    }
    return true;
  };

  // Metrics calculated based on chosen system and period filters
  const statsSales = sales.filter((s) => {
    const matchesSystem = systemFilter === "all" || 
      s.system_id === systemFilter || 
      (() => {
        const saleProduct = products.find(p => p.id === s.product_id);
        return saleProduct && saleProduct.system_id === systemFilter;
      })();
    
    return matchesSystem && matchesPeriod(s);
  });

  const wonSales = statsSales.filter((s) => s.stage === "closed_won");
  const activeSales = statsSales.filter((s) => !["closed_won", "closed_lost"].includes(s.stage));

  const totalWonValue = wonSales.reduce((sum, s) => sum + s.total_price, 0);
  const totalInNegotiationValue = activeSales.reduce((sum, s) => sum + s.total_price, 0);
  const conversionRate = statsSales.length > 0 ? (wonSales.length / statsSales.length) * 100 : 0;

  // Filter list (includes search string + options)
  const filteredSales = sales.filter((s) => {
    const matchesSearch =
      s.client_name.toLowerCase().includes(search.toLowerCase()) ||
      (s.company_name && s.company_name.toLowerCase().includes(search.toLowerCase())) ||
      s.product_name.toLowerCase().includes(search.toLowerCase()) ||
      s.seller_name.toLowerCase().includes(search.toLowerCase());

    const matchesStage = stageFilter === "all" || s.stage === stageFilter;

    const matchesSystem = systemFilter === "all" || 
      s.system_id === systemFilter || 
      (() => {
        const saleProduct = products.find(p => p.id === s.product_id);
        return saleProduct && saleProduct.system_id === systemFilter;
      })();

    return matchesSearch && matchesStage && matchesSystem && matchesPeriod(s);
  });

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(value);
  };

  return (
    <div className="container mx-auto py-8 px-4" id="sales-pipeline-page">
      {/* Top Title Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-8 h-8 text-primary" /> Painel de Vendas & Negociação
          </h1>
          <p className="text-muted-foreground mt-1">
            Cadastre novas propostas, acompanhe o progresso e feche novos negócios corporativos.
          </p>
        </div>

        <Button
          onClick={() => {
            clearForm();
            setIsDialogOpen(true);
          }}
          className="flex items-center gap-2"
          disabled={products.length === 0}
        >
          <Plus className="w-5 h-5" /> Nova Oportunidade Venda
        </Button>
      </div>

      {products.length === 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 p-4 rounded-lg flex items-center gap-3 text-xs mb-6">
          <Clock className="w-5 h-5 shrink-0 animate-ping" />
          <span>
            <strong>Aviso:</strong> Você precisa cadastrar ao menos 1 produto ativo na aba "Produtos" antes de poder registrar preenchimentos ou orçamentos de vendas de forma vinculada.
          </span>
        </div>
      )}

      {/* Statistics Header Widgets row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="hover:shadow-sm">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Fechadas Ganhas</span>
                <p className="text-2xl font-black text-emerald-600">{formatPrice(totalWonValue)}</p>
              </div>
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg text-emerald-600">
                <Award className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-medium">Contabiliza {wonSales.length} contratos encerrados</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-sm">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">No Funil Ativo</span>
                <p className="text-2xl font-black text-amber-600">{formatPrice(totalInNegotiationValue)}</p>
              </div>
              <div className="p-2 bg-amber-50 dark:bg-amber-950/40 rounded-lg text-amber-600">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-medium">{activeSales.length} propostas flutuando no funil</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-sm">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Taxa de Conversão</span>
                <p className="text-2xl font-black text-blue-600">{conversionRate.toFixed(1)}%</p>
              </div>
              <div className="p-2 bg-blue-50 dark:bg-blue-950/40 rounded-lg text-blue-600">
                <ArrowUpRight className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-medium">Proporção de propostas convertidas</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-sm">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Total Oportunidades</span>
                <p className="text-2xl font-black text-foreground">{sales.length}</p>
              </div>
              <div className="p-2 bg-muted rounded-lg text-foreground">
                <ShoppingBag className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-medium">Soma de todo histórico comercial</p>
          </CardContent>
        </Card>
      </div>

      {/* Period Selector Tabs Bar */}
      <div className="flex flex-wrap items-center gap-1.5 mb-6 bg-muted/40 p-1 rounded-xl border w-fit">
        {[
          { id: "today", label: "Hoje" },
          { id: "7days", label: "7 dias" },
          { id: "30days", label: "30 dias" },
          { id: "year", label: "Ano" },
          { id: "all", label: "Total" },
        ].map((tab) => (
          <Button
            key={tab.id}
            variant={periodFilter === tab.id ? "default" : "ghost"}
            size="sm"
            onClick={() => setPeriodFilter(tab.id as any)}
            className="rounded-lg text-xs font-semibold px-4 py-1.5 transition-all"
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Filter Options */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
        <div className="relative md:col-span-5">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, empresa, produto, vendedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="md:col-span-3">
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Estágio do Funil" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Ver Todos Estágios</SelectItem>
              <SelectItem value="prospecting">Prospecção</SelectItem>
              <SelectItem value="negotiation">Negociação</SelectItem>
              <SelectItem value="proposal">Proposta Enviada</SelectItem>
              <SelectItem value="closed_won">Acordo Fechado (Ganha)</SelectItem>
              <SelectItem value="closed_lost">Descartada (Perdida)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-2">
          <Select value={systemFilter} onValueChange={setSystemFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Sistema" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Sistemas</SelectItem>
              {systems.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
              <SelectItem value="none">Sem Sistema</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-end md:col-span-2 font-medium text-xs text-muted-foreground">
          Total: {filteredSales.length}
        </div>
      </div>

      {/* Sales Pipelines Kanban-list render */}
      {loading ? (
        <div className="py-20 text-center animate-pulse text-muted-foreground">Carregando esteira comercial...</div>
      ) : filteredSales.length === 0 ? (
        <Card className="py-12 text-center border-dashed">
          <CardContent className="space-y-4 pt-6">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-lg">Esteira Comercial Sem Registros</p>
              <p className="text-sm text-muted-foreground">
                Nenhum lead ou proposta confere com a busca/filtros vigentes.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredSales.map((sale) => {
            const config = STAGES_DETAILS[sale.stage];
            return (
              <Card key={sale.id} className="relative overflow-hidden shadow-sm hover:shadow transition-shadow border">
                {/* Thin side line representation of status */}
                <div className={`absolute left-0 inset-y-0 w-1 ${sale.stage === 'closed_won' ? 'bg-emerald-500' : sale.stage === 'closed_lost' ? 'bg-rose-500' : 'bg-primary'}`} />

                <CardContent className="p-5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                  {/* Left Column Description */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${config.color}`}>
                        {config.label}
                      </span>
                      {sale.company_name && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1.5 bg-muted px-2 py-0.5 rounded">
                          <Building className="w-3.5 h-3.5" /> {sale.company_name}
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-foreground truncate">
                      {sale.client_name}
                    </h3>

                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                      <span>Venda: <strong>{sale.product_name}</strong></span>
                      <span className="hidden sm:inline">•</span>
                      {(() => {
                        const sys = systems.find((s) => s.id === sale.system_id);
                        if (sys) {
                          return (
                            <>
                              <span className="text-primary font-semibold flex items-center gap-1 bg-primary/5 px-2 py-0.5 rounded text-[10px]">
                                💻 {sys.name}
                              </span>
                              <span className="hidden sm:inline">•</span>
                            </>
                          );
                        }
                        return null;
                      })()}
                      <span>Quant: <strong>{sale.quantity}x</strong></span>
                      <span className="hidden sm:inline">•</span>
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-blue-500 shrink-0" /> Vendedor: <strong>{sale.seller_name}</strong>
                      </span>
                    </p>

                    {sale.notes && (
                      <p className="text-xs italic bg-muted/40 p-2 rounded text-muted-foreground mt-2 max-w-3xl">
                        "{sale.notes}"
                      </p>
                    )}
                  </div>

                  {/* Right Column Progression Pipeline Visual & Controls */}
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-6 w-full lg:w-auto shrink-0 border-t pt-4 lg:border-t-0 lg:pt-0">
                    {/* Visual Stages bar */}
                    <div className="flex flex-col space-y-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Progresso Esteira</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4].map((stepNumber) => {
                          const isCompleted = config.step >= stepNumber;
                          const isLost = sale.stage === "closed_lost" && stepNumber === 4;

                          let circleColor = "bg-muted";
                          if (isCompleted) {
                            if (sale.stage === "closed_won") circleColor = "bg-emerald-500";
                            else if (sale.stage === "closed_lost") circleColor = "bg-rose-500";
                            else circleColor = "bg-primary";
                          }

                          return (
                            <div
                              key={stepNumber}
                              className={`w-5 h-1.5 rounded-full ${circleColor}`}
                              title={`Etapa ${stepNumber}`}
                            />
                          );
                        })}
                      </div>
                    </div>

                    {/* Monetary total */}
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Valor Total Fechado</span>
                      <p className="text-lg font-black text-foreground">{formatPrice(sale.total_price)}</p>
                    </div>

                    {/* Operational progression buttons ("avançando ate o fechamento") */}
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-primary rounded-full hover:bg-muted" onClick={() => handleEdit(sale)} title="Editar Oportunidade">
                        <Edit2 className="w-4 h-4" />
                      </Button>

                      {/* Advance Stage Control */}
                      {sale.stage !== "closed_won" && sale.stage !== "closed_lost" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAdvanceStage(sale)}
                            className="bg-primary/5 hover:bg-primary/10 text-primary flex items-center gap-1"
                          >
                            Avançar <ArrowRight className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleSetLost(sale)}
                            className="w-8 h-8 rounded-full border-rose-200 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                            title="Descartar / Perdida"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </>
                      )}

                      {/* Regress Opportunity State */}
                      {sale.stage !== "prospecting" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRegressStage(sale)}
                          className="w-8 h-8 rounded-full text-muted-foreground hover:bg-muted"
                          title="Voltar Estapa/Estágio"
                        >
                          <ArrowLeft className="w-4 h-4" />
                        </Button>
                      )}

                      <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-red-500 rounded-full hover:bg-red-50" onClick={() => handleDelete(sale.id, sale.client_name)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Cadastrar/Editar Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Proposta Comercial" : "Nova Oportunidade Comercial"}</DialogTitle>
            <DialogDescription>
              Preencha os termos, escolha o produto desejado e defina a etapa atual do relacionamento comercial.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveSale} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client-name">Nome do Cliente (Lead)</Label>
                <Input
                  id="client-name"
                  placeholder="Ex: Roberto Carlos"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company-name">Empresa / Razão Social</Label>
                <Input
                  id="company-name"
                  placeholder="Ex: Styron Tecnologia"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Produto ou Serviço Vendido</Label>
              <Select value={productId} onValueChange={handleProductSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um produto do catálogo" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((prod) => (
                    <SelectItem key={prod.id} value={prod.id}>
                      {prod.name} ({formatPrice(prod.price)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sale-qty">Quantidade</Label>
                <Input
                  id="sale-qty"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sale-unit-price">Preço Unitário Aplicado</Label>
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="sale-unit-price"
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={unitPrice || ""}
                    onChange={(e) => setUnitPrice(Number(e.target.value))}
                    className="pl-8"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center p-3.5 bg-muted/50 rounded-lg">
              <span className="text-sm font-semibold">Valor Total da Proposta</span>
              <span className="text-lg font-black text-primary">{formatPrice(totalPrice)}</span>
            </div>

            <div className="space-y-2">
              <Label>Etapa Inicial do Funil</Label>
              <Select value={stage} onValueChange={(v) => setStage(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha a etapa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prospecting">Prospecção (Abertura inicial)</SelectItem>
                  <SelectItem value="negotiation">Negociação ativa</SelectItem>
                  <SelectItem value="proposal">Proposta Enviada</SelectItem>
                  <SelectItem value="closed_won">Acordo Fechado - Ganha ✅</SelectItem>
                  <SelectItem value="closed_lost">Descartada - Perdida ❌</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sale-notes">Observações Comerciais</Label>
              <Textarea
                id="sale-notes"
                placeholder="Insira detalhes da proposta ou data provável de resposta..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="resize-none"
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingId ? "Atualizar Oportunidade" : "Registrar Venda"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detalhes da Movimentação Financeira Modal */}
      <Dialog open={isFinTxDialogOpen} onOpenChange={setIsFinTxDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Finalizar Venda: Detalhes Financeiros</DialogTitle>
            <DialogDescription>
              Para registrar o fechamento desta venda ganha, defina como ocorrerá a movimentação financeira correspondente no fluxo de caixa.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Tipo da Movimentação</Label>
              <Select value={finType} onValueChange={setFinType}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Receita (Entrada)</SelectItem>
                  <SelectItem value="expense">Despesa (Saída)</SelectItem>
                  <SelectItem value="transfer">Transferência</SelectItem>
                  <SelectItem value="withdrawal">Saque</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Projeto Vinculado</Label>
              <Select value={finProject} onValueChange={setFinProject}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Geral" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">Geral (Nenhum projeto específico)</SelectItem>
                  {projects.filter((p) => p.status !== "archived").map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Conta Creditada / Movimentada</Label>
              <Select value={finAccount} onValueChange={setFinAccount}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Selecione uma conta" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} ({formatPrice(a.balance || 0)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {finType === "transfer" && (
              <div>
                <Label>Conta Destino</Label>
                <Select value={finDestAccount} onValueChange={setFinDestAccount}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Selecione a conta destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.filter((a) => a.id !== finAccount).map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name} ({formatPrice(a.balance || 0)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Categoria Financeira</Label>
              <Select value={finCategory} onValueChange={setFinCategory}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="fin-value">Valor Recebido</Label>
              <Input
                id="fin-value"
                type="number"
                step="0.01"
                placeholder="R$ 0,00"
                className="mt-1.5"
                value={finValue}
                onChange={(e) => setFinValue(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="fin-desc">Descrição da Transação</Label>
              <Input
                id="fin-desc"
                placeholder="Descrição"
                className="mt-1.5"
                value={finDesc}
                onChange={(e) => setFinDesc(e.target.value)}
              />
            </div>

            <div className="border bg-muted/10 p-3 rounded-lg space-y-3">
              <div>
                <Label htmlFor="fin-system-select">Vincular a um Sistema</Label>
                <Select value={finSystem} onValueChange={(v) => {
                  setFinSystem(v);
                  setFinAffectsSystem(v !== "none");
                }}>
                  <SelectTrigger id="fin-system-select" className="mt-1.5">
                    <SelectValue placeholder="Escolha um sistema" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum / Não aplicável</SelectItem>
                    {systems.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {finSystem !== "none" && (
                <div className="flex items-center space-x-2 pt-1">
                  <Checkbox
                    id="fin-affects-system"
                    checked={finAffectsSystem}
                    onCheckedChange={(checked) => setFinAffectsSystem(!!checked)}
                  />
                  <Label htmlFor="fin-affects-system" className="text-xs cursor-pointer text-muted-foreground font-semibold">
                    Esta movimentação incidirá no saldo final do sistema
                  </Label>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFinTxDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveFinancialTxAndSale} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Confirmar Recebimento e Ganhar Venda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
