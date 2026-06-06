import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { crmService, Client, ClientActivity, ClientTask } from "@/lib/crmService";
import { googleCalendarService } from "@/lib/googleCalendarService";
import { toast } from "sonner";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  CheckCircle,
  HelpCircle,
  User,
  Mail,
  Video,
  MapPin,
  RefreshCw,
  Search,
  Filter,
  Activity,
  CheckSquare,
  Edit2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function Calendar() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [activities, setActivities] = useState<ClientActivity[]>([]);
  const [tasks, setTasks] = useState<ClientTask[]>([]);
  const [loading, setLoading] = useState(true);

  // Google Calendar Connectivity State
  const [gcalConnected, setGcalConnected] = useState(false);
  const [gcalEmail, setGcalEmail] = useState<string | null>(null);
  const [isSyncingGCal, setIsSyncingGCal] = useState(false);

  // Calendar Grid State
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Dialog State
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState("");
  
  // Event Form state
  const [eventTitle, setEventTitle] = useState("");
  const [eventType, setEventType] = useState<"call" | "meeting" | "presentation" | "follow_up" | "demo" | "visit" | "closing">("meeting");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("10:00");
  const [eventLocation, setEventLocation] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventParticipants, setEventParticipants] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string>("none");
  const [isSaving, setIsSaving] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  // Filters State
  const [searchText, setSearchText] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");

  const [activeTab, setActiveTab] = useState<"calendar" | "list">("calendar");

  useEffect(() => {
    loadAllData();
    checkGoogleConnection();
  }, []);

  const checkGoogleConnection = () => {
    setGcalConnected(googleCalendarService.isInitialized());
    setGcalEmail(googleCalendarService.getConnectedEmail());
  };

  const handleConnectGoogle = async () => {
    setIsSyncingGCal(true);
    try {
      await googleCalendarService.connect();
      checkGoogleConnection();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncingGCal(false);
    }
  };

  const handleDisconnectGoogle = () => {
    if (confirm("Deseja desconectar sua conta da Google Agenda? Novos compromissos não serão sincronizados.")) {
      googleCalendarService.disconnect();
      checkGoogleConnection();
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const storedClients = await crmService.getClients();
      setClients(storedClients);

      const storedActivities = await crmService.getActivities();
      setActivities(storedActivities);

      const storedTasks = await crmService.getTasks();
      setTasks(storedTasks);
    } catch (err) {
      console.error("Erro ao carregar os dados no Calendário:", err);
      toast.error("Erro ao ler dados da Agenda.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleSelectDay = (day: number) => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, "0");
    const dayStr = String(day).padStart(2, "0");
    const fullDate = `${year}-${month}-${dayStr}`;
    setEditingEventId(null);
    setEventDate(fullDate);
    setEventTitle("");
    setEventDescription("");
    setEventLocation("");
    setEventParticipants("");
    setSelectedClientId("none");
    setIsAddEventOpen(true);
  };

  const handleOpenGeneralAdd = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setEditingEventId(null);
    setEventDate(`${yyyy}-${mm}-${dd}`);
    setEventTitle("");
    setEventDescription("");
    setEventLocation("");
    setEventParticipants("");
    setSelectedClientId("none");
    setIsAddEventOpen(true);
  };

  const handleOpenEditEvent = (act: ClientActivity) => {
    setEditingEventId(act.id);
    setEventTitle(act.title || "");
    setEventType(act.type || "meeting");
    setEventDate(act.date || "");
    setEventTime(act.time || "10:00");
    setEventLocation(act.location || "");
    setEventDescription(act.description || "");
    setEventParticipants(act.participants || "");
    setSelectedClientId(act.client_id || "none");
    setIsAddEventOpen(true);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim() || !eventDate || !eventTime) {
      toast.error("Por favor, preencha o título, a data e o horário.");
      return;
    }

    setIsSaving(true);
    try {
      if (editingEventId) {
        // Edit Mode
        const oldAct = activities.find(a => a.id === editingEventId);
        let gEventId = oldAct?.google_event_id || null;

        if (gcalConnected) {
          try {
            if (gEventId) {
              await googleCalendarService.updateEvent(gEventId, {
                title: `${eventTitle} (Styron CRM)`,
                description: `${eventDescription}\n\nAgendamento automático via CRM Styron.`,
                date: eventDate,
                time: eventTime,
                participants: eventParticipants,
                location: eventLocation,
              });
            } else {
              gEventId = await googleCalendarService.createEvent({
                title: `${eventTitle} (Styron CRM)`,
                description: `${eventDescription}\n\nAgendamento automático via CRM Styron.`,
                date: eventDate,
                time: eventTime,
                participants: eventParticipants,
                location: eventLocation,
              });
            }
          } catch (gerr) {
            console.error("Erro ao sincronizar com Google Agenda:", gerr);
          }
        }

        await crmService.updateActivity(editingEventId, {
          client_id: selectedClientId === "none" ? "general_calendar" : selectedClientId,
          title: eventTitle,
          type: eventType,
          date: eventDate,
          time: eventTime,
          location: eventLocation,
          description: eventDescription,
          participants: eventParticipants,
          google_event_id: gEventId,
        });

        toast.success("Compromisso atualizado com sucesso!");
      } else {
        // Create Mode
        let gEventId: string | null = null;
        if (gcalConnected) {
          try {
            gEventId = await googleCalendarService.createEvent({
              title: `${eventTitle} (Styron CRM)`,
              description: `${eventDescription}\n\nAgendamento automático via CRM Styron.`,
              date: eventDate,
              time: eventTime,
              participants: eventParticipants,
              location: eventLocation,
            });
            if (gEventId) {
              toast.success("Evento sincronizado com a Google Agenda!");
            }
          } catch (gerr) {
            console.error("GCal Sync Error:", gerr);
          }
        }

        await crmService.addActivity({
          client_id: selectedClientId === "none" ? "general_calendar" : selectedClientId,
          title: eventTitle,
          type: eventType,
          date: eventDate,
          time: eventTime,
          location: eventLocation,
          description: eventDescription,
          participants: eventParticipants,
          google_event_id: gEventId,
        });

        toast.success("Compromisso agendado com sucesso!");
      }

      setIsAddEventOpen(false);
      loadAllData();
    } catch (err) {
      console.error(err);
      toast.error("Falha ao registrar compromisso.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEvent = async (id: string, gEventId?: string | null) => {
    if (confirm("Tem certeza que deseja apagar este compromisso?")) {
      try {
        if (gEventId) {
          await googleCalendarService.deleteEvent(gEventId);
        }
        await crmService.deleteActivity(id);
        toast.success("Compromisso excluído com sucesso.");
        loadAllData();
      } catch (err) {
        console.error(err);
        toast.error("Erro ao deletar compromisso.");
      }
    }
  };

  // Build calendar grid days
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const daysArray: (number | null)[] = [];
  for (let i = 0; i < firstDayIndex; i++) {
    daysArray.push(null);
  }
  for (let i = 1; i <= totalDays; i++) {
    daysArray.push(i);
  }

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  // Helper to match events for a given day
  const getEventsForDay = (day: number) => {
    const dayStr = String(day).padStart(2, "0");
    const mStr = String(month + 1).padStart(2, "0");
    const comparisonDate = `${year}-${mStr}-${dayStr}`;

    const matchedActivities = activities.filter(act => act.date === comparisonDate);
    const matchedTasks = tasks.filter(task => task.due_date === comparisonDate);

    return {
      activities: matchedActivities,
      tasks: matchedTasks
    };
  };

  // Filter handlers
  const filteredActivities = activities.filter(act => {
    const matchSearch = act.title.toLowerCase().includes(searchText.toLowerCase()) ||
                        (act.description && act.description.toLowerCase().includes(searchText.toLowerCase()));
    const matchType = typeFilter === "all" || act.type === typeFilter;
    const matchClient = clientFilter === "all" || act.client_id === clientFilter;
    return matchSearch && matchType && matchClient;
  });

  const filteredTasks = tasks.filter(task => {
    const matchSearch = task.description.toLowerCase().includes(searchText.toLowerCase());
    const matchClient = clientFilter === "all" || task.client_id === clientFilter;
    return matchSearch && matchClient && typeFilter === "all"; // tasks mapped as a general category or hidden if filtering distinct types
  });

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6 text-foreground bg-background">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-2.5">
            <CalendarIcon className="w-8 h-8 text-indigo-500 shrink-0" /> Agenda Geral Integrada
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Visualização consolidada de todos os seus compromissos, tarefas e reuniões de forma nativa e segura.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={handleOpenGeneralAdd}
            className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 font-bold"
          >
            <Plus className="w-4 h-4" /> Agendar Evento
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={loadAllData}
            title="Atualizar Agenda"
            className="border-slate-200"
          >
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Filter and Views Banner */}
      <div className="bg-white dark:bg-slate-900 border rounded-xl p-4 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-muted-foreground" />
          <Input
            placeholder="Pesquisar compromisso..."
            className="pl-9 bg-muted/30"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>

        <div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="bg-muted/30">
              <SelectValue placeholder="Tipo de Evento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="meeting">👥 Reuniões / Encontros</SelectItem>
              <SelectItem value="call">📞 Chamadas / Calls</SelectItem>
              <SelectItem value="presentation">📊 Apresentações</SelectItem>
              <SelectItem value="follow_up">🔄 Retornos / Follow-ups</SelectItem>
              <SelectItem value="demo">💻 Demonstrações</SelectItem>
              <SelectItem value="visit">🚗 Visitas Técnicas</SelectItem>
              <SelectItem value="closing">✍️ Fechamento</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="bg-muted/30">
              <SelectValue placeholder="Filtrar por Cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os clientes</SelectItem>
              {clients.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.contato_nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end border-t md:border-t-0 pt-3 md:pt-0 gap-1.5">
          <Button
            variant={activeTab === "calendar" ? "default" : "outline"}
            onClick={() => setActiveTab("calendar")}
            className="w-full sm:w-auto text-xs h-9 font-bold"
          >
            Grade Mensal
          </Button>
          <Button
            variant={activeTab === "list" ? "default" : "outline"}
            onClick={() => setActiveTab("list")}
            className="w-full sm:w-auto text-xs h-9 font-bold"
          >
            Lista de Compromissos
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="min-h-[400px] flex flex-col items-center justify-center border border-dashed rounded-xl p-8 space-y-3">
          <RefreshCw className="w-10 h-10 text-indigo-505 animate-spin" />
          <p className="text-muted-foreground text-sm font-semibold">Buscando e sincronizando compromissos com Google Agenda...</p>
        </div>
      ) : activeTab === "calendar" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Calendar Grid Controller (Left Columns) */}
          <Card className="lg:col-span-8 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
              <div>
                <CardTitle className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  📁 {monthNames[month]} de {year}
                </CardTitle>
                <CardDescription>
                  Selecione um dia para agendar compromissos diretamente.
                </CardDescription>
              </div>

              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" onClick={handlePrevMonth} className="w-8 h-8 rounded-lg">
                  <ChevronLeft className="w-4.5 h-4.5" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())} className="text-xs h-8">
                  Hoje
                </Button>
                <Button variant="outline" size="icon" onClick={handleNextMonth} className="w-8 h-8 rounded-lg">
                  <ChevronRight className="w-4.5 h-4.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-black text-muted-foreground uppercase tracking-wider mb-2">
                <span>Dom</span>
                <span>Seg</span>
                <span>Ter</span>
                <span>Qua</span>
                <span>Qui</span>
                <span>Sex</span>
                <span>Sáb</span>
              </div>

              {/* Grid content */}
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                {daysArray.map((day, idx) => {
                  if (day === null) {
                    return <div key={`empty-${idx}`} className="bg-slate-50/40 dark:bg-slate-950/10 min-h-[75px] sm:min-h-[100px] border border-transparent rounded-lg" />;
                  }

                  const { activities: dayActs, tasks: dayTsks } = getEventsForDay(day);
                  const isToday =
                    new Date().getDate() === day &&
                    new Date().getMonth() === month &&
                    new Date().getFullYear() === year;

                  return (
                    <div
                      key={`day-${day}`}
                      onClick={() => handleSelectDay(day)}
                      className={`min-h-[75px] sm:min-h-[100px] border rounded-lg p-1.5 text-left transition-all cursor-pointer flex flex-col justify-between hover:bg-slate-55/75 dark:hover:bg-slate-900/50 ${
                        isToday
                          ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-400 font-bold ring-1 ring-indigo-400"
                          : "bg-background border-slate-200/60"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] sm:text-xs font-black px-1.5 py-0.5 rounded-full ${
                          isToday ? "bg-indigo-600 text-white" : "text-muted-foreground hover:bg-muted"
                        }`}>
                          {day}
                        </span>
                        
                        {(dayActs.length > 0 || dayTsks.length > 0) && (
                          <span className="w-2 h-2 rounded-full bg-indigo-500" />
                        )}
                      </div>

                      <div className="space-y-1 mt-1 overflow-y-auto max-h-[60px] scrollbar-none">
                        {dayActs.slice(0, 3).map((act) => {
                          const iconLabel =
                            act.type === "call" ? "📞" :
                            act.type === "meeting" ? "🤝" :
                            act.type === "presentation" ? "📊" : "⚡";

                          return (
                            <div
                              key={act.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditEvent(act);
                              }}
                              className="text-[9px] truncate bg-slate-100 dark:bg-slate-900 p-0.5 rounded border leading-none font-medium flex items-center gap-0.5 text-foreground hover:bg-slate-200 dark:hover:bg-slate-850"
                              title={`${act.title} às ${act.time}`}
                            >
                              <span className="text-[10px] shrink-0">{iconLabel}</span>
                              <span className="truncate flex-1">{act.title}</span>
                            </div>
                          );
                        })}

                        {dayTsks.slice(0, 2).map((task) => (
                          <div
                            key={task.id}
                            className="text-[9px] truncate bg-amber-50 dark:bg-amber-950/10 p-0.5 rounded border border-amber-200 text-amber-800 dark:text-amber-300 leading-none font-medium flex items-center gap-0.5"
                            title={`Tarefa: ${task.description}`}
                          >
                            <span className="shrink-0">📝</span>
                            <span className="truncate flex-1">{task.description}</span>
                          </div>
                        ))}

                        {(dayActs.length + dayTsks.length) > 5 && (
                          <div className="text-[8px] text-center text-muted-foreground uppercase font-black tracking-tighter">
                            + {(dayActs.length + dayTsks.length) - 5} itens
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats & Today overview */}
          <div className="services lg:col-span-4 space-y-6">
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  📅 Compromissos do Mês
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 border rounded-xl text-left space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-black">Atividades</span>
                    <p className="text-3xl font-black text-indigo-650">{activities.length}</p>
                    <span className="text-xs text-muted-foreground block">Agendadas no CRM</span>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 border rounded-xl text-left space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-black">Google Sync</span>
                    <p className="text-3xl font-black text-sky-600">
                      {activities.filter(a => a.google_event_id).length}
                    </p>
                    <span className="text-xs text-muted-foreground block">Sincronizados</span>
                  </div>
                </div>

                <div className="bg-amber-50/30 dark:bg-amber-950/10 border border-amber-100 p-4 rounded-xl text-left">
                  <span className="text-[10px] text-amber-800 dark:text-amber-400 uppercase font-black flex items-center gap-1">
                    <CheckSquare className="w-3.5 h-3.5" /> Tarefas Pendentes
                  </span>
                  <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">
                    {tasks.filter(t => t.status === "pending").length} Pendentes
                  </p>
                  <span className="text-xs text-muted-foreground block mt-1">Tarefas agendadas para execução recente.</span>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  🔥 Compromissos Próximos
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 px-4 space-y-3">
                {activities.slice(0, 5).length === 0 ? (
                  <div className="text-xs text-muted-foreground py-6 text-center">
                    Crie um compromisso para listá-lo aqui.
                  </div>
                ) : (
                  activities.slice(0, 5).map(act => (
                    <div key={act.id} className="text-left border-b pb-3 last:border-b-0 last:pb-0 text-xs space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold text-foreground truncate block max-w-[170px]">{act.title}</span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-5 h-5 text-indigo-650 hover:text-indigo-800 hover:bg-indigo-50 rounded"
                            onClick={() => handleOpenEditEvent(act)}
                            title="Editar Compromisso"
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <span className="text-[9px] uppercase font-bold text-slate-500 bg-muted px-1.5 py-0.5 rounded shrink-0">
                            {act.type}
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground">📅 {act.date} às {act.time}</p>
                      {act.location && <span className="text-[10px] text-indigo-605 dark:text-indigo-400 font-medium block">📍 {act.location}</span>}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        /* List Tab View */
        <Card className="shadow-sm">
          <CardHeader className="border-b">
            <CardTitle className="text-lg font-black text-slate-800 dark:text-slate-100">
              📋 Todos os Agendamentos do Sistema ({filteredActivities.length + filteredTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-4">
            {filteredActivities.length === 0 && filteredTasks.length === 0 ? (
              <div className="text-sm text-center py-12 text-muted-foreground border border-dashed rounded-xl">
                Nenhum agendamento encontrado para o filtro selecionado.
              </div>
            ) : (
              <div className="space-y-3">
                {/* Consolidate activities list */}
                {filteredActivities.map(act => {
                  const client = clients.find(c => c.id === act.client_id);
                  return (
                    <div
                      key={act.id}
                      className="text-left bg-slate-50 dark:bg-slate-900 border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base font-black text-foreground">{act.title}</span>
                          <span className="text-[10px] uppercase font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded">
                            {act.type}
                          </span>
                          {act.google_event_id && (
                            <span className="text-[9.5px] bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-200 px-2 py-0.5 rounded font-bold flex items-center">
                              Google Sincronizado
                            </span>
                          )}
                        </div>

                        {act.description && <p className="text-muted-foreground text-sm italic">"{act.description}"</p>}

                        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground font-semibold">
                          <span>📅 {act.date} ás {act.time}</span>
                          {client && (
                            <span className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-indigo-505" /> Cliente: <strong>{client.contato_nome}</strong>
                            </span>
                          )}
                          {act.location && (
                            <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-bold">
                              📍 {act.location}
                            </span>
                          )}
                          {act.participants && (
                            <span>👥 Convidados: {act.participants}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-end border-t sm:border-t-0 pt-2 sm:pt-0 gap-1.5 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEditEvent(act)}
                          className="w-8 h-8 rounded-full text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/20"
                          title="Editar Compromisso"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteEvent(act.id, act.google_event_id)}
                          className="w-8 h-8 rounded-full text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-955/20"
                          title="Excluir Compromisso"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}

                {/* Tasks with dates */}
                {filteredTasks.map(task => {
                  const client = clients.find(c => c.id === task.client_id);
                  return (
                    <div
                      key={task.id}
                      className="text-left bg-amber-50/20 dark:bg-amber-955/10 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                    >
                      <div className="space-y-1.5 col-span-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base font-black text-slate-800 dark:text-slate-100">{task.description}</span>
                          <span className="text-[10px] uppercase font-bold bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded">
                            Tarefa Pendente
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground font-semibold">
                          <span>📅 Prazo Final: {task.due_date}</span>
                          {client && (
                            <span className="flex items-center gap-1">
                              👤 Para o Cliente: <strong>{client.contato_nome}</strong>
                            </span>
                          )}
                          <span>👤 Responsável: {task.responsible || "Todos"}</span>
                        </div>
                      </div>
                      <div className="text-xs font-bold text-amber-650 px-3 py-1 rounded bg-amber-50 border border-amber-200">
                        Pendente
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Agendar Compromisso Dialog */}
      <Dialog open={isAddEventOpen} onOpenChange={(open) => { if (!open) setIsAddEventOpen(false); }}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleCreateEvent}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-indigo-500" /> {editingEventId ? "Editar Compromisso" : "Confirmar Agendamento Geral"}
              </DialogTitle>
              <DialogDescription>
                {editingEventId ? "Modifique as informações do compromisso selecionado." : "Registre um novo compromisso na agenda corporativa."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="space-y-1.5 text-left">
                <Label htmlFor="evt-title">Título do Compromisso *</Label>
                <Input
                  id="evt-title"
                  placeholder="Ex: Alinhamento Styron com Diretoria"
                  required
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 text-left">
                  <Label htmlFor="evt-type">Tipo</Label>
                  <Select
                    value={eventType}
                    onValueChange={(val: any) => setEventType(val)}
                  >
                    <SelectTrigger id="evt-type">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="meeting">🤝 Reunião</SelectItem>
                      <SelectItem value="call">📞 Chamada / Call</SelectItem>
                      <SelectItem value="presentation">📊 Apresentação</SelectItem>
                      <SelectItem value="follow_up">🔄 Retorno / Follow-up</SelectItem>
                      <SelectItem value="demo">💻 Demonstração</SelectItem>
                      <SelectItem value="visit">🚗 Visita Técnica</SelectItem>
                      <SelectItem value="closing">✍️ Fechamento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 text-left">
                  <Label htmlFor="evt-client">Vincular Cliente CRM</Label>
                  <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                    <SelectTrigger id="evt-client">
                      <SelectValue placeholder="Sem cliente específico" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum (Calendário Geral)</SelectItem>
                      {clients.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.contato_nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 text-left">
                  <Label htmlFor="evt-date">Data *</Label>
                  <Input
                    id="evt-date"
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5 text-left">
                  <Label htmlFor="evt-time">Horário *</Label>
                  <Input
                    id="evt-time"
                    type="time"
                    required
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5 text-left">
                <Label htmlFor="evt-loc">Local / Link Videoconferência</Label>
                <Input
                  id="evt-loc"
                  placeholder="Ex: Google Meet, Zoom, Sala de Reunião"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                />
              </div>

              <div className="space-y-1.5 text-left">
                <Label htmlFor="evt-participants">Participantes (E-mails separados por vírgula)</Label>
                <Input
                  id="evt-participants"
                  placeholder="Ex: diretor@cliente.com, comercial@styron.com"
                  value={eventParticipants}
                  onChange={(e) => setEventParticipants(e.target.value)}
                />
              </div>

              <div className="space-y-1.5 text-left">
                <Label htmlFor="evt-desc">Descrição / Escopo do Compromisso</Label>
                <Textarea
                  id="evt-desc"
                  placeholder="Alinhamentos, pautas ou notas importantes..."
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <p className="text-[11px] text-muted-foreground bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded leading-normal">
                Este compromisso será registrado e mantido localmente com segurança na base de dados do sistema.
              </p>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isSaving}
                onClick={() => setIsAddEventOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-indigo-650 hover:bg-slate-800 text-white font-bold"
              >
                {isSaving ? (editingEventId ? "Salvando..." : "Gravando...") : (editingEventId ? "Salvar Alterações" : "Salvar Agendamento")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
