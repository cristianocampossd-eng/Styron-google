import { useState, useEffect, useMemo } from "react";
import { crmService, Client } from "@/lib/crmService";
import { supabase } from "@/integrations/supabase/client";
import { ClientFormModal } from "@/components/crm/ClientFormModal";
import { ClientDetailsModal } from "@/components/crm/ClientDetailsModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { 
  Users, 
  Grid, 
  List, 
  Plus, 
  Search, 
  Phone, 
  Mail, 
  Building, 
  Trash, 
  Edit, 
  Eye, 
  Share2,
  TrendingUp,
  Award,
  CircleAlert,
  ArrowRight,
  MessageCircle
} from "lucide-react";

export default function Clients() {
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [allSales, setAllSales] = useState<any[]>([]);
  
  // UI views
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Search and Filter states
  const [searchName, setSearchName] = useState("");
  const [searchCompany, setSearchCompany] = useState("");
  const [searchPhone, setSearchPhone] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [filterSegment, setFilterSegment] = useState<string>("all");
  const [filterOrigin, setFilterOrigin] = useState<string>("all");
  
  // Special metric filter state (triggered by clicking dynamic indicators)
  const [metricFilter, setMetricFilter] = useState<"none" | "active" | "open_opps" | "converted">("none");

  // Modal active states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Fetch all core datasets
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Get clients
      const clientData = await crmService.getClients();
      setClients(clientData);

      // 2. Get Sales opportunities (from company_sales) to map stats
      const { data: salesData } = await supabase
        .from("company_sales")
        .select("*");
      setAllSales(salesData || []);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar dados do CRM.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Open client details or apply filters via URL query parameter redirection
  useEffect(() => {
    if (clients.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const clientIdParam = params.get("clientId");
      if (clientIdParam) {
        const found = clients.find(c => c.id === clientIdParam);
        if (found) {
          setSelectedClient(found);
          setIsDetailsOpen(true);
        }
      }

      const statusParam = params.get("status");
      if (statusParam) {
        setFilterStatus(statusParam as any);
      }

      const metricParam = params.get("metric");
      if (metricParam) {
        setMetricFilter(metricParam as any);
      }

      const segmentParam = params.get("segment");
      if (segmentParam) {
        setFilterSegment(segmentParam);
      }

      const originParam = params.get("origin");
      if (originParam) {
        setFilterOrigin(originParam);
      }
    }
  }, [clients]);

  // Sync client list
  const handleSaveClient = async (clientData: Omit<Client, "id" | "created_at" | "updated_at">) => {
    try {
      if (editingClient) {
        // Update
        const updated = await crmService.updateClient(editingClient.id, clientData);
        toast.success(`Cadastro de "${updated.contato_nome}" atualizado.`);
      } else {
        // Create
        const created = await crmService.addClient(clientData);
        toast.success(`Cliente "${created.contato_nome}" adicionado com sucesso.`);
      }
      fetchData();
    } catch (err) {
      throw err;
    }
  };

  const handleDeleteClient = async (id: string, name: string) => {
    if (!window.confirm(`Deseja realmente excluir permanentemente o cliente "${name}" do banco de dados? Esta ação removerá também seus aniversários, anotações, arquivos e compromissos.`)) return;
    try {
      await crmService.deleteClient(id);
      toast.success("Cadastro do cliente excluído com sucesso.");
      fetchData();
    } catch (err) {
      toast.error("Erro ao deletar cliente.");
    }
  };

  const handleEditClick = (client: Client) => {
    setEditingClient(client);
    setIsFormOpen(true);
  };

  const handleDetailsClick = (client: Client) => {
    setSelectedClient(client);
    setIsDetailsOpen(true);
  };

  // Helper metrics definitions check
  const getClientOpps = (clientId: string, clientName: string, company: string) => {
    return allSales.filter(sale => {
      const boundClientId = crmService.getSaleClientBinding(sale.id);
      if (boundClientId === clientId) return true;
      return (
        (sale.client_name && sale.client_name.toLowerCase() === clientName.toLowerCase()) ||
        (sale.company_name && sale.company_name.toLowerCase() === company.toLowerCase())
      );
    });
  };

  // KPI aggregates
  const totalClientsCount = clients.length;
  const activeClientsCount = clients.filter(c => c.status === "active").length;
  
  const clientsWithOpenOpps = clients.filter(c => {
    const opps = getClientOpps(c.id, c.contato_nome, c.empresa);
    return opps.some(sale => !["closed_won", "closed_lost"].includes(sale.stage));
  });
  
  const clientsConverted = clients.filter(c => {
    const opps = getClientOpps(c.id, c.contato_nome, c.empresa);
    return opps.some(sale => sale.stage === "closed_won");
  });

  // Unique segments and origins extracted from actual client data
  const uniqueSegments = useMemo(() => {
    const list = clients.map(c => c.segmento).filter(Boolean);
    return Array.from(new Set(list));
  }, [clients]);

  const uniqueOrigins = useMemo(() => {
    const list = clients.map(c => c.origem_lead).filter(Boolean);
    return Array.from(new Set(list));
  }, [clients]);

  // Filter computation logic (Search criteria + Metric selection filter)
  const filteredClients = clients.filter(c => {
    // 1. Search fields
    if (searchName && !c.contato_nome.toLowerCase().includes(searchName.toLowerCase())) return false;
    if (searchCompany && !c.empresa.toLowerCase().includes(searchCompany.toLowerCase())) return false;
    if (searchPhone && !`${c.telefone_principal} ${c.whatsapp}`.includes(searchPhone)) return false;
    if (searchEmail && !`${c.email_principal} ${c.email_secundario}`.toLowerCase().includes(searchEmail.toLowerCase())) return false;

    // 2. Combo Status selection
    if (filterStatus !== "all" && c.status !== filterStatus) return false;

    // 3. Dynamic Clickable Metrics indicator
    if (metricFilter === "active" && c.status !== "active") return false;
    if (metricFilter === "open_opps") {
      const hasOpen = clientsWithOpenOpps.some(openClient => openClient.id === c.id);
      if (!hasOpen) return false;
    }
    if (metricFilter === "converted") {
      const hasWon = clientsConverted.some(wonClient => wonClient.id === c.id);
      if (!hasWon) return false;
    }

    // 4. Segment and Origin filters
    if (filterSegment !== "all" && (!c.segmento || c.segmento.toLowerCase() !== filterSegment.toLowerCase())) return false;
    if (filterOrigin !== "all" && (!c.origem_lead || c.origem_lead.toLowerCase() !== filterOrigin.toLowerCase())) return false;

    return true;
  });

  // Rapid toggle interactive KPI indicator search
  const handleMetricIndicatorClick = (metric: typeof metricFilter) => {
    if (metricFilter === metric) {
      setMetricFilter("none"); // Reset toggle
      toast.info("Filtro de métrica removido.");
    } else {
      setMetricFilter(metric);
      toast.success(`Filtrando lista de clientes para: ${
        metric === "active" ? "Clientes ativos" : 
        metric === "open_opps" ? "Clientes com oportunidades em aberto" : 
        "Clientes convertidos (Ganhos)"
      }`);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Header bar section */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
            <Users className="w-7 h-7 text-primary" /> Módulo de Clientes & CRM
          </h1>
          <p className="text-slate-500 text-xs dark:text-slate-400">
            Cadastre os perfis de clientes, estruture o pipeline comercial, acompanhe a agenda de reuniões e centralize anexos de vendas.
          </p>
        </div>

        <div className="flex gap-2">
          <Button 
            size="sm" 
            onClick={() => { setEditingClient(null); setIsFormOpen(true); }}
            className="font-bold flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Cadastrar Cliente
          </Button>

          <div className="border p-0.5 rounded-lg flex items-center bg-card shadow-sm">
            <Button 
              size="icon" 
              variant="ghost" 
              className={`w-8 h-8 ${viewMode === 'table' ? 'bg-slate-100 text-primary' : 'text-slate-400'}`}
              onClick={() => setViewMode("table")}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button 
              size="icon" 
              variant="ghost" 
              className={`w-8 h-8 ${viewMode === 'grid' ? 'bg-slate-100 text-primary' : 'text-slate-400'}`}
              onClick={() => setViewMode("grid")}
            >
              <Grid className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* KPI Stats Cards - CLICKABLE to filter */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Clients */}
        <Card 
          className={`cursor-pointer group hover:shadow-md transition-all ${metricFilter === 'none' ? 'ring-2 ring-primary border-primary' : 'border-slate-200'}`}
          onClick={() => setMetricFilter("none")}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Total de Clientes</span>
              <span className="text-2.5xl font-black text-slate-800 dark:text-white">{totalClientsCount}</span>
              <span className="text-[9px] text-slate-400 block group-hover:text-primary transition-colors">Exibir todos os cadastros</span>
            </div>
            <Users className="w-9 h-9 text-slate-300 opacity-60 shrink-0" />
          </CardContent>
        </Card>

        {/* Active Clients */}
        <Card 
          className={`cursor-pointer group hover:shadow-md transition-all ${metricFilter === 'active' ? 'ring-2 ring-emerald-500 border-emerald-500' : 'border-slate-200'}`}
          onClick={() => handleMetricIndicatorClick("active")}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Clientes Ativos</span>
              <span className="text-2.5xl font-black text-emerald-600">{activeClientsCount}</span>
              <span className="text-[9px] text-slate-400 block group-hover:text-emerald-600">Clique para filtrar ativos</span>
            </div>
            <TrendingUp className="w-9 h-9 text-emerald-300 opacity-60 shrink-0" />
          </CardContent>
        </Card>

        {/* Clientes com oportunidades abertas */}
        <Card 
          className={`cursor-pointer group hover:shadow-md transition-all ${metricFilter === 'open_opps' ? 'ring-2 ring-amber-500 border-amber-500' : 'border-slate-200'}`}
          onClick={() => handleMetricIndicatorClick("open_opps")}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Em Propecção/Negociação</span>
              <span className="text-2.5xl font-black text-amber-500">{clientsWithOpenOpps.length}</span>
              <span className="text-[9px] text-slate-400 block group-hover:text-amber-500">Filtrar negócios em aberto</span>
            </div>
            <CircleAlert className="w-9 h-9 text-amber-300 opacity-60 shrink-0" />
          </CardContent>
        </Card>

        {/* Clientes convertidos */}
        <Card 
          className={`cursor-pointer group hover:shadow-md transition-all ${metricFilter === 'converted' ? 'ring-2 ring-indigo-500 border-indigo-500' : 'border-slate-200'}`}
          onClick={() => handleMetricIndicatorClick("converted")}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Clientes Convertidos</span>
              <span className="text-2.5xl font-black text-indigo-600">{clientsConverted.length}</span>
              <span className="text-[9px] text-slate-400 block group-hover:text-indigo-600">Filtrar vendas ganhas</span>
            </div>
            <Award className="w-9 h-9 text-indigo-300 opacity-60 shrink-0" />
          </CardContent>
        </Card>
      </section>

      {/* Advanced Filter Box Section */}
      <section className="bg-card border p-4 rounded-xl shadow-sm text-xs space-y-4">
        <h3 className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-2 pb-1.5 border-b">
          <Search className="w-4 h-4 text-primary" /> Filtros Refinados do CRM
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3.5">
          <div className="space-y-1">
            <Label htmlFor="search_name">Nome do Contato</Label>
            <Input 
              id="search_name"
              placeholder="Buscar por nome..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="h-8.5 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="search_comp">Empresa</Label>
            <Input 
              id="search_comp"
              placeholder="Nome da empresa..."
              value={searchCompany}
              onChange={(e) => setSearchCompany(e.target.value)}
              className="h-8.5 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="search_tel">Telefone / WhatsApp</Label>
            <Input 
              id="search_tel"
              placeholder="Número..."
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              className="h-8.5 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="search_mail">E-mail</Label>
            <Input 
              id="search_mail"
              placeholder="Endereço de e-mail..."
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              className="h-8.5 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label>Status Comercial</Label>
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
              <SelectTrigger className="h-8.5 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="active">Apenas Ativos</SelectItem>
                <SelectItem value="inactive">Apenas Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Segmento</Label>
            <Select value={filterSegment} onValueChange={(v) => setFilterSegment(v)}>
              <SelectTrigger className="h-8.5 text-xs">
                <SelectValue placeholder="Segmento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Sectors: Todos</SelectItem>
                {uniqueSegments.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Origem do Lead</Label>
            <Select value={filterOrigin} onValueChange={(v) => setFilterOrigin(v)}>
              <SelectTrigger className="h-8.5 text-xs">
                <SelectValue placeholder="Origem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Origem: Todas</SelectItem>
                {uniqueOrigins.map(o => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Clear indicators helper alerts block */}
        {(searchName || searchCompany || searchPhone || searchEmail || filterStatus !== 'all' || metricFilter !== 'none' || filterSegment !== 'all' || filterOrigin !== 'all') && (
          <div className="flex gap-2 items-center justify-between text-[11px] bg-slate-50 dark:bg-slate-900 border p-2 rounded-lg">
            <span className="text-slate-500 font-medium">
              Filtro ativo: exibindo <strong>{filteredClients.length}</strong> de um total de <strong>{totalClientsCount}</strong> clientes.
            </span>
            <Button 
              size="xs" 
              variant="link" 
              onClick={() => {
                setSearchName("");
                setSearchCompany("");
                setSearchPhone("");
                setSearchEmail("");
                setFilterStatus("all");
                setFilterSegment("all");
                setFilterOrigin("all");
                setMetricFilter("none");
                toast.info("Todos os filtros foram redefinidos.");
              }}
              className="h-auto p-0 font-bold"
            >
              Limpar Todos os Filtros
            </Button>
          </div>
        )}
      </section>

      {/* Primary Listing Section representing clients */}
      {loading ? (
        <div className="flex items-center justify-center p-12 bg-white rounded-xl border">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <span className="ml-3 text-sm text-slate-500 font-medium">Sincronizando clientes do banco...</span>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="bg-white border rounded-xl p-12 text-center text-xs space-y-3 dark:bg-slate-950">
          <Users className="w-12 h-12 text-slate-300 mx-auto" />
          <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">Nenhum cliente cadastrado</h4>
          <p className="text-slate-400 max-w-md mx-auto">
            Não encontramos registros comerciais que correspondam aos filtros indicados. Tente ajustar os parâmetros ou registre um novo perfil.
          </p>
          <Button size="sm" onClick={() => { setEditingClient(null); setIsFormOpen(true); }} className="mx-auto mt-2 font-bold">
            Cadastrar Cliente Primeiro
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        /* GRID / CARDS VIEW MODE */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filteredClients.map((c) => {
            const opps = getClientOpps(c.id, c.contato_nome, c.empresa);
            const totalDealValue = opps.reduce((sum, s) => sum + (s.total_price || 0), 0);
            return (
              <Card key={c.id} className="group hover:shadow-md transition-all duration-200 border border-slate-200 bg-white flex flex-col justify-between dark:bg-slate-950">
                <CardContent className="p-4 flex flex-col gap-3 h-full">
                  <div className="flex justify-between items-start gap-2">
                    <div className="truncate min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`inline-block w-2 h-2 rounded-full ${c.status === 'active' ? 'bg-green-500' : 'bg-slate-300'}`} />
                        <span className="text-[10px] text-muted-foreground font-mono truncate uppercase">{c.segmento || "Segmento n/d"}</span>
                      </div>
                      <h4 
                        className="font-black text-slate-800 text-base leading-tight truncate hover:text-primary cursor-pointer mt-0.5 dark:text-white"
                        onClick={() => handleDetailsClick(c)}
                      >
                        {c.contato_nome}
                      </h4>
                      <p className="text-slate-500 text-xs font-semibold flex items-center gap-1 truncate">
                        <Building className="w-3.5 h-3.5 text-slate-300" /> {c.empresa || "Sem Nome Fantasia"}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-b py-2 space-y-1.5 text-xs">
                    {c.email_principal && (
                      <p className="text-slate-600 dark:text-slate-400 flex items-center gap-2 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-300 shrink-0" /> {c.email_principal}
                      </p>
                    )}
                    {c.whatsapp ? (
                      <a 
                        href={`https://wa.me/${c.whatsapp.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-2 hover:underline truncate py-0.5"
                        title="Conversar no WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4 text-emerald-500 shrink-0" /> {c.whatsapp} (WhatsApp)
                      </a>
                    ) : c.telefone_principal ? (
                      <p className="text-slate-600 dark:text-slate-400 flex items-center gap-2 truncate">
                        <Phone className="w-3.5 h-3.5 text-slate-300 shrink-0" /> {c.telefone_principal}
                      </p>
                    ) : null}
                  </div>

                  {/* Summary aggregate details */}
                  <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-50 dark:bg-slate-900 p-2 rounded-lg">
                    <div>
                      <span className="text-slate-400 block uppercase font-black">Oportunidades</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{opps.length} negociação(ões)</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block uppercase font-black font-mono">Total em Vendas</span>
                      <span className="font-extrabold text-indigo-600">
                        {totalDealValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    </div>
                  </div>
                </CardContent>

                {/* Grid card bottom actions bar */}
                <div className="p-2 border-t bg-slate-50/50 flex justify-between gap-1 mt-auto shrink-0 dark:bg-slate-900/40">
                  <Button 
                    size="xs" 
                    variant="ghost" 
                    onClick={() => handleDetailsClick(c)} 
                    className="flex gap-1.5 items-center font-bold text-slate-700 hover:text-slate-900"
                  >
                    <Eye className="w-4 h-4 text-slate-400" /> Ficha CRM
                  </Button>

                  <div className="flex gap-1 shrink-0">
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="w-7 h-7 hover:bg-slate-200" 
                      onClick={() => handleEditClick(c)}
                    >
                      <Edit className="w-4 h-4 text-slate-500" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="w-7 h-7 hover:bg-red-50 text-red-500"
                      onClick={() => handleDeleteClient(c.id, c.contato_nome)}
                    >
                      <Trash className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW MODE */
        <div className="border rounded-xl overflow-hidden bg-white dark:bg-slate-950 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b">
                  <th className="p-3.5 font-bold tracking-wider text-slate-400 uppercase text-[9px]">Status</th>
                  <th className="p-3.5 font-bold tracking-wider text-slate-400 uppercase text-[9px]">Nome do Contato</th>
                  <th className="p-3.5 font-bold tracking-wider text-slate-400 uppercase text-[9px]">Empresa (Nome Fantasia)</th>
                  <th className="p-3.5 font-bold tracking-wider text-slate-400 uppercase text-[9px]">Segmento / Origem</th>
                  <th className="p-3.5 font-bold tracking-wider text-slate-400 uppercase text-[9px]">Contatos Principais</th>
                  <th className="p-3.5 font-bold tracking-wider text-slate-400 uppercase text-[9px] text-right">Oportunidades / Total</th>
                  <th className="p-3.5 font-bold tracking-wider text-slate-400 uppercase text-[9px] text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((c) => {
                  const opps = getClientOpps(c.id, c.contato_nome, c.empresa);
                  const totalDealValue = opps.reduce((sum, s) => sum + (s.total_price || 0), 0);
                  return (
                    <tr key={c.id} className="border-b last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="p-3.5">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                          {c.status === "active" ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span 
                          onClick={() => handleDetailsClick(c)}
                          className="font-bold text-slate-800 text-sm hover:text-primary hover:underline cursor-pointer dark:text-white"
                        >
                          {c.contato_nome}
                        </span>
                        {c.cargo && <span className="block text-[10px] text-slate-400">{c.cargo}</span>}
                      </td>
                      <td className="p-3.5">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{c.empresa || "Sem Nome Fantasia"}</span>
                        {c.razao_social && <span className="block text-[10px] text-slate-400 truncate max-w-[200px]">{c.razao_social}</span>}
                      </td>
                      <td className="p-3.5">
                        <span className="text-slate-800 dark:text-slate-300 font-medium">{c.segmento || "Não informado"}</span>
                        <span className="block text-[10px] text-slate-400 font-semibold">{c.origem_lead || "Contato Direto"}</span>
                      </td>
                      <td className="p-3.5 space-y-1">
                        {c.email_principal && (
                          <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                            <Mail className="w-3.5 h-3.5 text-slate-300 shrink-0" /> {c.email_principal}
                          </span>
                        )}
                        {c.whatsapp ? (
                          <span className="flex items-center gap-1">
                            <a 
                              href={`https://wa.me/${c.whatsapp.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1 hover:underline text-[11px]"
                              title="Disparar mensagem no WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> {c.whatsapp}
                            </a>
                          </span>
                        ) : c.telefone_principal ? (
                          <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                            <Phone className="w-3.5 h-3.5 text-slate-300 shrink-0" /> {c.telefone_principal}
                          </span>
                        ) : null}
                      </td>
                      <td className="p-3.5 text-right space-y-0.5">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{opps.length} ativa(s)</span>
                        <span className="block text-indigo-600 font-extrabold text-[13px]">
                          {totalDealValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-medium">
                        <div className="flex gap-1 justify-end">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleDetailsClick(c)}
                            title="Visualizar ficha CRM completa"
                            className="h-8 w-8 hover:bg-slate-100"
                          >
                            <Eye className="w-4 h-4 text-slate-500" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleEditClick(c)}
                            title="Editar cadastro"
                            className="h-8 w-8 hover:bg-slate-100"
                          >
                            <Edit className="w-4 h-4 text-slate-500" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleDeleteClient(c.id, c.contato_nome)}
                            title="Excluir cadastro"
                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: Form Cadastro/Edição de Clientes */}
      <ClientFormModal 
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        client={editingClient}
        onSave={handleSaveClient}
      />

      {/* MODAL 2: Ficha Completa do Cliente com abas (Histórico, Oportunidades, Agenda, Arquivos, Financeiro, Anotações) */}
      {selectedClient && (
        <ClientDetailsModal 
          isOpen={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
          client={selectedClient}
          onEditClick={() => { setIsDetailsOpen(false); handleEditClick(selectedClient); }}
          allSales={allSales}
          onSaleUpdated={fetchData}
        />
      )}

    </div>
  );
}
