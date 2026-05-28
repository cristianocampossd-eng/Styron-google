import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { format, isPast, isToday, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Search, Eye, Edit, CheckCircle, RefreshCw, ClipboardList, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { OSStatusBadge, OSPriorityBadge } from "@/components/os/OSStatusBadge";
import { OSDetailDrawer } from "@/components/os/OSDetailDrawer";
import { CreateOSModal } from "@/components/os/CreateOSModal";
import { useServiceOrders, type ServiceOrder } from "@/contexts/ServiceOrderContext";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const cleanOSNumber = (num: string) => {
  if (!num) return "";
  const match = num.match(/(OS[-_]?\d+)/i);
  return match ? match[1].toUpperCase() : num;
};

export default function ServiceOrders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "mine";
  const setTab = (newTab: string) => setSearchParams({ tab: newTab });

  const { orders, updateStatus, archiveOrder } = useServiceOrders();
  const { projects, profiles, getProjectCode } = useApp();
  const { user } = useAuth();
  const currentUserId = user?.id || "";

  const [search, setSearch] = useState("");
  const [filterProject, setFilterProject] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedOS, setSelectedOS] = useState<ServiceOrder | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const tabFiltered = useMemo(() => {
    let list = orders;
    switch (tab) {
      case "mine":
        list = orders.filter((o) => (o.responsible === currentUserId || (!o.responsible && o.creator === currentUserId)) && o.status !== "archived" && o.status !== "completed");
        break;
      case "sent":
        list = orders.filter((o) => o.creator === currentUserId && o.responsible !== currentUserId && o.responsible && o.status !== "archived" && o.status !== "completed");
        break;
      case "completed":
        list = orders.filter((o) => o.status === "completed" && (o.creator === currentUserId || o.responsible === currentUserId));
        break;
      case "archived":
        list = orders.filter((o) => o.status === "archived" && (o.creator === currentUserId || o.responsible === currentUserId));
        break;
    }
    return list;
  }, [orders, tab, currentUserId]);

  const filtered = useMemo(() => {
    let list = tabFiltered;
    if (search) list = list.filter((o) => o.title.toLowerCase().includes(search.toLowerCase()) || o.number.toLowerCase().includes(search.toLowerCase()));
    if (filterProject !== "all") list = list.filter((o) => o.projectId === filterProject);
    if (filterPriority !== "all") list = list.filter((o) => o.priority === filterPriority);
    if (filterStatus !== "all") list = list.filter((o) => o.status === filterStatus);
    return list;
  }, [tabFiltered, search, filterProject, filterPriority, filterStatus]);

  const getProfileName = (id: string) => profiles.find((p) => p.id === id)?.name || id;

  const openDetail = (os: ServiceOrder) => { setSelectedOS(os); setDrawerOpen(true); };

  const pendingCount = orders.filter((o) => (o.responsible === currentUserId || (!o.responsible && o.creator === currentUserId)) && !["completed", "archived"].includes(o.status)).length;

  return (
    <div className="p-4 md:p-6 space-y-4 animate-fade-in">
      <PageHeader title="Ordens de Serviço" description={`${pendingCount} pendentes`} actions={
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Nova OS
        </Button>
      } />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="mine">Minhas OS</TabsTrigger>
          <TabsTrigger value="sent">Enviadas</TabsTrigger>
          <TabsTrigger value="completed">Finalizadas</TabsTrigger>
          <TabsTrigger value="archived">Arquivadas</TabsTrigger>
        </TabsList>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mt-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar OS..." className="pl-9" />
          </div>
          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Projeto" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os projetos</SelectItem>
              {projects.filter((p) => p.status !== "archived").map((p) => <SelectItem key={p.id} value={p.id}>{getProjectCode(p.id)} - {p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Prioridade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="low">Baixa</SelectItem>
              <SelectItem value="medium">Média</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="urgent">Urgente</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="sent">Enviado</SelectItem>
              <SelectItem value="received">Recebida</SelectItem>
              <SelectItem value="in_progress">Em execução</SelectItem>
              <SelectItem value="awaiting_adjustment">Aguardando ajuste</SelectItem>
              <SelectItem value="completed">Concluído</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4">
          {filtered.length === 0 ? (
            <EmptyState icon={ClipboardList} message="Nenhuma OS encontrada. Crie uma nova Ordem de Serviço para começar." actionLabel="Nova OS" onAction={() => setCreateOpen(true)} />
          ) : (
            <div className="rounded-xl border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº OS</TableHead>
                    <TableHead>Projeto</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Atribuído a</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Prazo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((os) => {
                    const project = projects.find((p) => p.id === os.projectId);
                    
                    let deadlineStatus = null;
                    if (os.dueDate) {
                      const isCompletedOrArchived = ["completed", "archived"].includes(os.status);
                      const baseDate = isCompletedOrArchived ? os.updatedAt : new Date();
                      
                      // Normalize dates to start of day for fair comparison
                      const startBaseDate = startOfDay(baseDate);
                      const startDueDate = startOfDay(os.dueDate);
                      
                      const isLate = startBaseDate > startDueDate;
                      
                      if (isCompletedOrArchived) {
                        deadlineStatus = isLate ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            Concluída com atraso
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            Concluída no prazo
                          </span>
                        );
                      } else {
                        deadlineStatus = isLate ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            <AlertTriangle className="w-3 h-3" /> Em atraso
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            <Clock className="w-3 h-3" /> Em dia
                          </span>
                        );
                      }
                    }

                    return (
                      <TableRow key={os.id} className="cursor-pointer hover:bg-accent/30 transition-colors" onClick={() => openDetail(os)}>
                        <TableCell className="font-mono text-xs font-medium">{cleanOSNumber(os.number)}</TableCell>
                        <TableCell className="text-sm">{project ? `${getProjectCode(project.id)} - ${project.name}` : ""}</TableCell>
                        <TableCell className="text-sm font-medium max-w-[200px] truncate">{os.title}</TableCell>
                        <TableCell><OSPriorityBadge priority={os.priority} /></TableCell>
                        <TableCell><OSStatusBadge status={os.status} /></TableCell>
                        <TableCell className="text-sm">{getProfileName(os.responsible)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{format(os.createdAt, "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {os.dueDate ? (
                            <div className="flex flex-col gap-1 items-start">
                              <span>{format(os.dueDate, "dd/MM/yyyy", { locale: ptBR })}</span>
                              {deadlineStatus}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDetail(os)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            {os.status === "completed" && os.creator === currentUserId && (
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { archiveOrder(os.id); toast.success("OS arquivada"); }}>
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </Tabs>

      <OSDetailDrawer order={selectedOS ? orders.find(o => o.id === selectedOS.id) || selectedOS : null} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <CreateOSModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}