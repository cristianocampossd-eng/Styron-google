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
  Edit2,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

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
  const [calendarView, setCalendarView] = useState<"month" | "week" | "day">("month");
  
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

  const handlePrev = () => {
    if (calendarView === "month") {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else if (calendarView === "week") {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 1);
      setCurrentDate(d);
    }
  };

  const handleNext = () => {
    if (calendarView === "month") {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else if (calendarView === "week") {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 1);
      setCurrentDate(d);
    }
  };

  const getDaysOfWeek = (date: Date) => {
    const currentDay = date.getDay(); // 0 is Sunday
    const sunday = new Date(date);
    sunday.setDate(date.getDate() - currentDay);
    const weekDays: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(sunday);
      day.setDate(sunday.getDate() + i);
      weekDays.push(day);
    }
    return weekDays;
  };

  const getFormattedTitle = () => {
    if (calendarView === "month") {
      return `${monthNames[currentDate.getMonth()]} de ${currentDate.getFullYear()}`;
    } else if (calendarView === "week") {
      const weekDays = getDaysOfWeek(currentDate);
      const start = weekDays[0];
      const end = weekDays[6];
      return `Semana: ${start.getDate()}/${start.getMonth() + 1} a ${end.getDate()}/${end.getMonth() + 1} de ${end.getFullYear()}`;
    } else {
      return `${currentDate.getDate()} de ${monthNames[currentDate.getMonth()]} de ${currentDate.getFullYear()}`;
    }
  };

  const getEventsForDate = (date: Date) => {
    const yearStr = date.getFullYear();
    const monthStr = String(date.getMonth() + 1).padStart(2, "0");
    const dayStr = String(date.getDate()).padStart(2, "0");
    const comparisonDate = `${yearStr}-${monthStr}-${dayStr}`;

    const matchedActivities = activities.filter(act => act.date === comparisonDate);
    const matchedTasks = tasks.filter(task => task.due_date === comparisonDate);

    return {
      activities: matchedActivities,
      tasks: matchedTasks
    };
  };

  const weekdayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  
  const hours = [
    "08:00", "09:00", "10:00", "11:00", "12:00", "13:00",
    "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"
  ];

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
          <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
          <p className="text-muted-foreground text-sm font-semibold">Buscando e sincronizando compromissos com Google Agenda...</p>
        </div>
      ) : activeTab === "calendar" ? (
        <div className="space-y-6">
          {/* Calendar Grid Controller (Full Width) */}
          <Card className="w-full shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b gap-4">
              <div>
                <CardTitle className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  📁 {getFormattedTitle()}
                </CardTitle>
                <CardDescription>
                  {calendarView === "month" 
                    ? "Selecione um dia para agendar compromissos diretamente." 
                    : calendarView === "week" 
                    ? "Visualize e gerencie a programação desta semana."
                    : "Agende compromissos escolhendo um horário na linha do tempo."}
                </CardDescription>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* View Selection Button Group */}
                <div className="flex items-center border rounded-lg p-0.5 bg-muted/40 shrink-0">
                  <Button 
                    variant={calendarView === "month" ? "secondary" : "ghost"} 
                    size="sm" 
                    onClick={() => setCalendarView("month")}
                    className="text-xs h-7 px-2.5 font-bold"
                  >
                    Mês
                  </Button>
                  <Button 
                    variant={calendarView === "week" ? "secondary" : "ghost"} 
                    size="sm" 
                    onClick={() => setCalendarView("week")}
                    className="text-xs h-7 px-2.5 font-bold"
                  >
                    Semana
                  </Button>
                  <Button 
                    variant={calendarView === "day" ? "secondary" : "ghost"} 
                    size="sm" 
                    onClick={() => setCalendarView("day")}
                    className="text-xs h-7 px-2.5 font-bold"
                  >
                    Dia
                  </Button>
                </div>

                {/* Navigation Group */}
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" onClick={handlePrev} className="w-8 h-8 rounded-lg">
                    <ChevronLeft className="w-4.5 h-4.5" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())} className="text-xs h-8 font-semibold">
                    Hoje
                  </Button>
                  <Button variant="outline" size="icon" onClick={handleNext} className="w-8 h-8 rounded-lg">
                    <ChevronRight className="w-4.5 h-4.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-4 sm:p-6">
              {calendarView === "month" && (
                <>
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

                      const dayStr = String(day).padStart(2, "0");
                      const mStr = String(month + 1).padStart(2, "0");
                      const fullDate = `${year}-${mStr}-${dayStr}`;

                      return (
                        <div
                          key={`day-${day}`}
                          onClick={() => {
                            setEditingEventId(null);
                            setEventDate(fullDate);
                            setEventTitle("");
                            setEventDescription("");
                            setEventLocation("");
                            setEventParticipants("");
                            setSelectedClientId("none");
                            setIsAddEventOpen(true);
                          }}
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
                </>
              )}

              {calendarView === "week" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
                  {getDaysOfWeek(currentDate).map((day, idx) => {
                    const { activities: dayActs, tasks: dayTsks } = getEventsForDate(day);
                    const isToday =
                      new Date().getDate() === day.getDate() &&
                      new Date().getMonth() === day.getMonth() &&
                      new Date().getFullYear() === day.getFullYear();

                    const dayStr = String(day.getDate()).padStart(2, "0");
                    const monthStr = String(day.getMonth() + 1).padStart(2, "0");
                    const fullDateStr = `${day.getFullYear()}-${monthStr}-${dayStr}`;

                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          setEditingEventId(null);
                          setEventDate(fullDateStr);
                          setEventTitle("");
                          setEventDescription("");
                          setEventLocation("");
                          setEventParticipants("");
                          setSelectedClientId("none");
                          setIsAddEventOpen(true);
                        }}
                        className={`min-h-[220px] border rounded-xl p-3 text-left transition-all cursor-pointer flex flex-col justify-between hover:bg-slate-50/50 dark:hover:bg-slate-900/40 ${
                          isToday
                            ? "bg-indigo-50/55 dark:bg-indigo-950/25 border-indigo-400 ring-1 ring-indigo-400"
                            : "bg-background border-slate-200/60"
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between border-b pb-2">
                            <div>
                              <span className="text-[10px] text-muted-foreground uppercase font-black tracking-wider block">
                                {weekdayNames[day.getDay()]}
                              </span>
                              <span className={`text-base font-black ${isToday ? "text-indigo-600 dark:text-indigo-400" : "text-foreground"}`}>
                                {day.getDate()}
                              </span>
                            </div>
                            <span className="p-1 rounded-full text-muted-foreground hover:bg-muted shrink-0">
                              <Plus className="w-3.5 h-3.5" />
                            </span>
                          </div>

                          <div className="space-y-2 max-h-[140px] overflow-y-auto scrollbar-none">
                            {dayActs.length === 0 && dayTsks.length === 0 ? (
                              <span className="text-[10px] text-muted-foreground italic block pt-2">Vazio</span>
                            ) : (
                              <>
                                {dayActs.map((act) => {
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
                                      className="text-[10px] bg-slate-100 dark:bg-slate-900 p-1.5 rounded-lg border leading-snug font-medium flex items-center gap-1.5 text-foreground hover:bg-slate-200 dark:hover:bg-slate-800"
                                      title={`${act.title} às ${act.time}`}
                                    >
                                      <span className="text-xs shrink-0">{iconLabel}</span>
                                      <span className="truncate flex-1">{act.title}</span>
                                    </div>
                                  );
                                })}

                                {dayTsks.map((task) => (
                                  <div
                                    key={task.id}
                                    className="text-[10px] bg-amber-50 dark:bg-amber-955/10 p-1.5 rounded-lg border border-amber-200 text-amber-800 dark:text-amber-300 leading-snug font-medium flex items-center gap-1.5"
                                    title={`Tarefa: ${task.description}`}
                                  >
                                    <span className="shrink-0">📝</span>
                                    <span className="truncate flex-1">{task.description}</span>
                                  </div>
                                ))}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {calendarView === "day" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Hourly Timeline */}
                  <div className="md:col-span-2 space-y-2.5">
                    <h3 className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5 animate-fade-in text-left">
                      <Clock className="w-4 h-4 text-indigo-500" /> Compromissos do Dia (Horários)
                    </h3>
                    
                    <div className="border rounded-xl divide-y bg-muted/10">
                      {hours.map((hour) => {
                        const { activities: dayActs } = getEventsForDate(currentDate);
                        const hourNum = parseInt(hour.split(":")[0]);
                        const matchedActs = dayActs.filter((act) => {
                          if (!act.time) return false;
                          const actHour = parseInt(act.time.split(":")[0]);
                          return actHour === hourNum;
                        });

                        const dayStr = String(currentDate.getDate()).padStart(2, "0");
                        const monthStr = String(currentDate.getMonth() + 1).padStart(2, "0");
                        const fullDateStr = `${currentDate.getFullYear()}-${monthStr}-${dayStr}`;

                        return (
                          <div key={hour} className="flex items-stretch min-h-[55px] hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                            <div className="w-16 p-3 border-r text-xs font-black text-slate-500 flex items-center justify-center bg-muted/20 shrink-0">
                              {hour}
                            </div>
                            <div className="flex-1 p-2.5 flex flex-wrap items-center gap-2">
                              {matchedActs.length > 0 ? (
                                matchedActs.map((act) => {
                                  const iconLabel =
                                    act.type === "call" ? "📞" :
                                    act.type === "meeting" ? "🤝" :
                                    act.type === "presentation" ? "📊" : "⚡";

                                  return (
                                    <div
                                      key={act.id}
                                      onClick={() => handleOpenEditEvent(act)}
                                      className="text-xs bg-slate-100 dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 border-indigo-200 border p-2 rounded-lg cursor-pointer font-semibold flex items-center gap-2 max-w-full truncate shadow-sm transition-all text-left"
                                    >
                                      <span className="text-sm">{iconLabel}</span>
                                      <div className="min-w-0">
                                        <p className="font-bold text-foreground truncate">{act.title}</p>
                                        {act.location && <p className="text-[10px] text-muted-foreground truncate">📍 {act.location}</p>}
                                      </div>
                                    </div>
                                  );
                                })
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingEventId(null);
                                    setEventDate(fullDateStr);
                                    setEventTime(hour);
                                    setEventTitle("");
                                    setEventDescription("");
                                    setEventLocation("");
                                    setEventParticipants("");
                                    setSelectedClientId("none");
                                    setIsAddEventOpen(true);
                                  }}
                                  className="text-[11px] text-muted-foreground hover:text-indigo-600 flex items-center gap-1 font-semibold p-1 h-7 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                  <Plus className="w-3 h-3" /> Agendar compromisso para {hour}
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Day's Overview / Tasks */}
                  <div className="space-y-4">
                    <div className="bg-slate-50/50 dark:bg-slate-900/20 border rounded-xl p-4 space-y-4">
                      <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 text-left">
                        <CheckSquare className="w-4 h-4 text-amber-500" /> Tarefas para Hoje
                      </h3>

                      {(() => {
                        const { tasks: dayTsks } = getEventsForDate(currentDate);
                        if (dayTsks.length === 0) {
                          return (
                            <p className="text-xs text-muted-foreground italic py-3 text-left">
                              Nenhuma tarefa corporativa agendada para este dia.
                            </p>
                          );
                        }
                        return (
                          <div className="space-y-2">
                            {dayTsks.map((task) => (
                              <div
                                key={task.id}
                                className="bg-background border border-slate-200/80 rounded-lg p-2.5 text-left text-xs flex items-start gap-2 shadow-sm"
                              >
                                <span className="text-base">📝</span>
                                <div className="min-w-0 flex-1">
                                  <p className="font-bold text-foreground leading-normal">{task.description}</p>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">Responsável: {task.responsible || "Todos"}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>

                    <div className="bg-indigo-50/20 dark:bg-indigo-950/5 border border-indigo-100 dark:border-indigo-900 p-4 rounded-xl space-y-2.5 text-left">
                      <h4 className="text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                        Resumo da Data
                      </h4>
                      {(() => {
                        const { activities: dayActs, tasks: dayTsks } = getEventsForDate(currentDate);
                        return (
                          <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                            <p>• {dayActs.length} agendamento(s) de atividade.</p>
                            <p>• {dayTsks.length} tarefa(s) pendente(s).</p>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Information & Stats (Underneath Calendar) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="shadow-sm border-sky-100 dark:border-sky-900 bg-sky-50/20 dark:bg-sky-950/5">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-sky-800 dark:text-sky-300 flex items-center gap-1.5">
                  📅 Google Agenda
                </CardTitle>
                {gcalConnected && (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {gcalConnected ? (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground text-left">
                      Sua agenda do sistema está sincronizada em tempo real com a Google Agenda.
                    </p>
                    <div className="flex items-center gap-2 p-2 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-100 dark:border-emerald-900">
                      <div className="bg-emerald-100 dark:bg-emerald-900 p-1 rounded-full text-emerald-700 dark:text-emerald-300 shrink-0">
                        <CheckCircle className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 truncate">
                          Sincronização Ativa
                        </p>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 truncate">
                          {gcalEmail}
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleDisconnectGoogle}
                      className="w-full text-xs h-8 border-rose-200 hover:bg-rose-50 hover:text-rose-700 text-rose-600 dark:border-rose-900/50 dark:hover:bg-rose-950/20 dark:hover:text-rose-400 font-bold"
                    >
                      Desconectar Google Agenda
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground text-left">
                      Conecte sua conta para sincronizar automaticamente seus agendamentos e reuniões com sua Google Agenda pessoal.
                    </p>
                    <Button 
                      onClick={handleConnectGoogle} 
                      disabled={isSyncingGCal}
                      className="w-full text-xs h-9 font-bold bg-sky-600 hover:bg-sky-700 text-white flex items-center justify-center gap-2"
                    >
                      {isSyncingGCal ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Conectando...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24">
                            <path
                              fill="currentColor"
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                              fill="currentColor"
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                              fill="currentColor"
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.41-.12-.78-.28-1.09-.43z"
                            />
                            <path
                              fill="currentColor"
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                            />
                          </svg>
                          Conectar Google Agenda
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

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

                <div className="bg-amber-50/30 dark:bg-amber-955/10 border border-amber-100 p-4 rounded-xl text-left">
                  <span className="text-[10px] text-amber-850 dark:text-amber-400 uppercase font-black flex items-center gap-1">
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
                      {act.location && <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium block">📍 {act.location}</span>}
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
