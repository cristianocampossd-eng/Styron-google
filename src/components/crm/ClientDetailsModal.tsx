import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { 
  Client, 
  ClientActivity, 
  ClientAttachment, 
  ClientNote, 
  ClientTask,
  crmService 
} from "@/lib/crmService";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { googleCalendarService } from "@/lib/googleCalendarService";
import { 
  User, 
  Building, 
  Phone, 
  Mail, 
  Briefcase, 
  Globe, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Paperclip, 
  Edit, 
  Trash, 
  ExternalLink,
  MessageSquare,
  Clock,
  CheckCircle,
  FolderLock,
  Grid,
  List,
  Plus,
  Compass,
  FileText,
  MessageCircle
} from "lucide-react";
import { toast } from "sonner";

interface ClientDetailsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  onEditClick: () => void;
  // Opportunities list passed from parent
  allSales: any[];
  onSaleUpdated: () => void;
}

export function ClientDetailsModal({ 
  isOpen, 
  onOpenChange, 
  client, 
  onEditClick,
  allSales,
  onSaleUpdated
}: ClientDetailsModalProps) {
  
  // Tab states are managed locally
  const [activeTab, setActiveTab] = useState("resumo");

  // CRM Child Lists State
  const [activities, setActivities] = useState<ClientActivity[]>([]);
  const [attachments, setAttachments] = useState<ClientAttachment[]>([]);
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [tasks, setTasks] = useState<ClientTask[]>([]);

  // Task form local state
  const [taskDescription, setTaskDescription] = useState("");
  const [taskResponsible, setTaskResponsible] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");

  // Local additions states
  const [noteText, setNoteText] = useState("");
  
  // Google Calendar Integration Mock-Client Hook Toggle
  const [isGoogleConnected, setIsGoogleConnected] = useState(() => {
    return googleCalendarService.isInitialized();
  });

  useEffect(() => {
    setIsGoogleConnected(googleCalendarService.isInitialized());
  }, [activeTab]);

  // App scheduling state
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventParticipants, setEventParticipants] = useState("");
  const [eventType, setEventType] = useState<ClientActivity["type"]>("meeting");
  const [eventObs, setEventObs] = useState("");

  // Attachments UI states
  const [attachmentViewMode, setAttachmentViewMode] = useState<"grid" | "list">("grid");
  const [uploadingFile, setUploadingFile] = useState(false);

  // Fetch data
  const loadCrmData = async () => {
    try {
      const [allActs, allAtts, allNotes, allTasks] = await Promise.all([
        crmService.getActivities(),
        crmService.getAttachments(),
        crmService.getNotes(),
        crmService.getTasks()
      ]);

      // Filter by client ID
      setActivities(allActs.filter(a => a.client_id === client.id));
      setAttachments(allAtts.filter(a => a.client_id === client.id));
      setNotes(allNotes.filter(n => n.client_id === client.id));
      setTasks(allTasks.filter(t => t.client_id === client.id));
    } catch (err) {
      console.error("Error loading sub-CRM data:", err);
    }
  };

  useEffect(() => {
    if (isOpen && client?.id) {
      loadCrmData();
      setActiveTab("resumo");
      setShowEventForm(false);
    }
  }, [isOpen, client?.id]);

  // Handle WhatsApp Link
  const handleWhatsAppChat = () => {
    if (!client.whatsapp) {
      toast.error("Este cliente não possui número do WhatsApp cadastrado.");
      return;
    }
    // Clean telephone number
    const numbersOnly = client.whatsapp.replace(/\D/g, "");
    const formattedNum = numbersOnly.startsWith("55") ? numbersOnly : `55${numbersOnly}`;
    window.open(`https://wa.me/${formattedNum}`, "_blank");
  };

  // KPI calculations
  const clientSales = allSales.filter(sale => {
    // If sale is associated to client via local binding or same company/client name
    const boundClientId = crmService.getSaleClientBinding(sale.id);
    if (boundClientId === client.id) return true;
    
    // Fallback name matching
    return (
      (sale.client_name && sale.client_name.toLowerCase() === client.contato_nome.toLowerCase()) || 
      (sale.company_name && sale.company_name.toLowerCase() === client.empresa.toLowerCase())
    );
  });

  const totalOpps = clientSales.length;
  const wonOpps = clientSales.filter(s => s.stage === "closed_won");
  const sumWonValue = wonOpps.reduce((sum, s) => sum + (s.total_price || 0), 0);
  const ticketMedio = wonOpps.length > 0 ? sumWonValue / wonOpps.length : 0;

  // Last/next interactions
  const sortedActivities = [...activities].sort((a, b) => {
    return new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime();
  });

  const nowTime = new Date().getTime();
  const pastEvents = sortedActivities.filter(a => new Date(`${a.date}T${a.time}`).getTime() <= nowTime);
  const futureEvents = sortedActivities.filter(a => new Date(`${a.date}T${a.time}`).getTime() > nowTime);

  const lastInteraction = pastEvents.length > 0 ? pastEvents[pastEvents.length - 1] : null;
  const nextAppointment = futureEvents.length > 0 ? futureEvents[0] : null;

  // Note management
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    try {
      await crmService.addNote({
        client_id: client.id,
        text: noteText.trim()
      });
      setNoteText("");
      toast.success("Anotação adicionada com sucesso!");
      loadCrmData();
    } catch (err) {
      toast.error("Erro ao salvar anotação.");
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!window.confirm("Deseja realmente excluir esta anotação?")) return;
    try {
      await crmService.deleteNote(id);
      toast.success("Anotação removida.");
      loadCrmData();
    } catch (err) {
      toast.error("Erro ao deletar anotação.");
    }
  };

  // Google Calendar Auth Actual Setup trigger
  const handleToggleGoogleCalendar = async () => {
    if (isGoogleConnected) {
      googleCalendarService.disconnect();
      setIsGoogleConnected(false);
      toast.info("Conexão com Google Calendar removida.");
    } else {
      try {
        await googleCalendarService.connect();
        setIsGoogleConnected(true);
        toast.success("Iniciada autenticação segura com Google Calendar!");
      } catch (err) {
        toast.error("Houve uma falha na autenticação do Google.");
      }
    }
  };

  // Schedule appointment
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle || !eventDate || !eventTime) {
      toast.error("Título, data e hora são obrigatórios para agendamentos.");
      return;
    }

    try {
      const activeOpportunity = clientSales[0]?.id || null;

      // Sync with Google Calendar first if connected
      let googleEventId: string | null = null;
      if (googleCalendarService.isInitialized()) {
        try {
          googleEventId = await googleCalendarService.createEvent({
            title: eventTitle,
            description: eventDescription,
            date: eventDate,
            time: eventTime,
            participants: eventParticipants,
            location: eventLocation
          });
        } catch (e) {
          console.error("Erro Google Calendar API Event Sync:", e);
        }
      }

      const actPayload = {
        client_id: client.id,
        opportunity_id: activeOpportunity,
        type: eventType,
        title: eventTitle,
        description: eventDescription,
        date: eventDate,
        time: eventTime,
        location: eventLocation,
        participants: eventParticipants,
        observation: eventObs,
        google_event_id: googleEventId
      };

      await crmService.addActivity(actPayload);

      if (googleEventId) {
        toast.info(`Sincronizado no Google Agenda: "${eventTitle}"`);
      }

      toast.success("Atividade cadastrada com sucesso na agenda!");

      // Clear event form
      setEventTitle("");
      setEventDescription("");
      setEventDate("");
      setEventTime("");
      setEventLocation("");
      setEventParticipants("");
      setEventType("meeting");
      setEventObs("");
      setShowEventForm(false);

      loadCrmData();
    } catch (err) {
      toast.error("Erro ao cadastrar evento.");
    }
  };

  const handleDeleteActivity = async (id: string, googleEventId?: string | null) => {
    if (!window.confirm("Deseja deletar este evento da agenda?")) return;
    try {
      await crmService.deleteActivity(id);
      
      if (googleEventId) {
        try {
          await googleCalendarService.deleteEvent(googleEventId);
          toast.info("Compromisso removido também do Google Agenda.");
        } catch (googleErr) {
          console.error("Erro ao excluir do Google Agenda:", googleErr);
        }
      }

      toast.success("Agendamento excluído.");
      loadCrmData();
    } catch (err) {
      toast.error("Erro ao deletar agendamento.");
    }
  };

  // Tasks (Deadlines) Activities Logic
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskDescription || !taskResponsible || !taskDueDate) {
      toast.warning("Preencha a descrição, responsável e prazo final.");
      return;
    }
    try {
      await crmService.addTask({
        client_id: client.id,
        description: taskDescription,
        responsible: taskResponsible,
        due_date: taskDueDate
      });
      toast.success("Tarefa com prazo agendada com sucesso!");
      setTaskDescription("");
      setTaskResponsible("");
      setTaskDueDate("");
      loadCrmData();
    } catch (taskErr) {
      toast.error("Erro ao cadastrar tarefa.");
    }
  };

  const handleToggleTaskStatus = async (id: string, currentStatus: string) => {
    try {
      const nextStatus = currentStatus === "completed" ? "pending" : "completed";
      await crmService.updateTask(id, { status: nextStatus });
      toast.success(nextStatus === "completed" ? "Tarefa concluída! 🎉" : "Tarefa reaberta.");
      loadCrmData();
    } catch (taskErr) {
      toast.error("Erro ao atualizar tarefa.");
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!window.confirm("Gostaria de excluir permanentemente esta tarefa?")) return;
    try {
      await crmService.deleteTask(id);
      toast.success("Tarefa excluída.");
      loadCrmData();
    } catch (taskErr) {
      toast.error("Erro ao excluir tarefa.");
    }
  };

  // Timeline chronology builder
  const getTimelineItems = () => {
    const noteItems = notes.map(n => ({
      id: `note-${n.id}`,
      category: "note" as const,
      title: "Anotação Adicionada",
      description: n.text,
      date: n.created_at ? n.created_at.split("T")[0] : new Date().toISOString().split("T")[0],
      time: n.created_at ? n.created_at.split("T")[1]?.slice(0, 5) || "" : ""
    }));

    const taskItems = tasks.map(t => ({
      id: `task-${t.id}`,
      category: "task" as const,
      title: `Tarefa com Prazo (${t.status === "completed" ? "Concluída" : "Pendente"})`,
      description: `O que fazer: ${t.description}\nResponsável: ${t.responsible}\nPrazo final: ${new Date(t.due_date).toLocaleDateString("pt-BR")}`,
      date: t.created_at ? t.created_at.split("T")[0] : t.due_date,
      time: ""
    }));

    const activityItems = activities.map(act => ({
      id: `act-${act.id}`,
      category: "activity" as const,
      type: act.type,
      title: act.title,
      description: act.description + (act.participants ? `\nParticipantes: ${act.participants}` : "") + (act.location ? `\nLocalidade: ${act.location}` : ""),
      date: act.date,
      time: act.time || ""
    }));

    const creationItem = client.created_at ? [{
      id: "creation-event",
      category: "creation" as const,
      title: "Cliente Registrado no CRM",
      description: `Início de Relacionamento Comercial com a Styron.\nOrigem do Lead: ${client.origem_lead || "Direta / Prospecção"}`,
      date: client.created_at.split("T")[0],
      time: client.created_at.split("T")[1]?.slice(0, 5) || ""
    }] : [];

    return [
      ...creationItem,
      ...noteItems,
      ...taskItems,
      ...activityItems
    ].sort((a, b) => {
      return new Date(`${b.date}T${b.time || "00:00"}`).getTime() - new Date(`${a.date}T${a.time || "00:00"}`).getTime();
    });
  };

  // Attachments handlings
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      // Secure local File Reader to store in Cache or mock if Supabase storage has empty configuration
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64Url = reader.result as string;

        // Try Supabase Storage
        let finalUrl = base64Url;
        try {
          const fileExt = file.name.split('.').pop();
          const filePath = `${client.id}/${crypto.randomUUID()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage
            .from("company-assets")
            .upload(filePath, file);

          if (!uploadError) {
            const { data } = supabase.storage.from("company-assets").getPublicUrl(filePath);
            if (data?.publicUrl) {
              finalUrl = data.publicUrl;
            }
          }
        } catch (storageErr) {
          console.warn("Could not save to Supabase bucket, using Base64 URI local fallback.", storageErr);
        }

        // Add attachment record in crmService
        await crmService.addAttachment({
          client_id: client.id,
          file_name: file.name,
          file_type: file.type,
          file_url: finalUrl
        });

        toast.success(`Arquivo "${file.name}" anexado com sucesso!`);
        loadCrmData();
      };
    } catch (err) {
      toast.error("Erro ao anexar arquivo.");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDeleteAttachment = async (id: string) => {
    if (!window.confirm("Deseja realmente remover este arquivo anexo?")) return;
    try {
      await crmService.deleteAttachment(id);
      toast.success("Arquivo removido dos anexos.");
      loadCrmData();
    } catch (err) {
      toast.error("Erro ao remover anexo.");
    }
  };

  // Change individual Opportunity stage directly from the detail sheet
  const handleUpdateOpportunityStage = async (saleId: string, newStage: string) => {
    try {
      const { error } = await supabase
        .from("company_sales")
        .update({ stage: newStage })
        .eq("id", saleId);
      
      if (error) throw error;
      toast.success(`Fase da oportunidade alterada para: ${newStage}`);
      onSaleUpdated();
    } catch (err) {
      toast.error("Erro ao atualizar status da venda.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${client.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                  {client.status === "active" ? "Ativo" : "Inativo"}
                </span>
                <span className="text-xs text-muted-foreground font-mono">{client.empresa || "Sem Empresa"}</span>
              </div>
              <DialogTitle className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {client.contato_nome}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Cadastro CRM • Criado em {client.created_at ? new Date(client.created_at).toLocaleDateString("pt-BR") : "Não informado"}
              </DialogDescription>
            </div>

            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="outline" onClick={onEditClick} className="flex items-center gap-1">
                <Edit className="w-3.5 h-3.5" /> Editar Cadastro
              </Button>
              <Button size="sm" onClick={handleWhatsAppChat} className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 font-semibold">
                <MessageSquare className="w-4 h-4" /> WhatsApp
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* KPIs Bento Section */}
        <section className="grid grid-cols-2 md:grid-cols-5 gap-3 my-4">
          <div className="p-3 bg-slate-50 border rounded-xl flex flex-col justify-center dark:bg-slate-900/40">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Oportunidades</span>
            <span className="text-lg font-black text-slate-800 dark:text-slate-200 mt-1">{totalOpps}</span>
          </div>
          <div className="p-3 bg-slate-50 border rounded-xl flex flex-col justify-center dark:bg-slate-900/40">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Convertido</span>
            <span className="text-lg font-black text-green-600 mt-1">
              {sumWonValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
          </div>
          <div className="p-3 bg-slate-50 border rounded-xl flex flex-col justify-center dark:bg-slate-900/40">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Ticket Médio</span>
            <span className="text-lg font-black text-indigo-600 mt-1">
              {ticketMedio.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
          </div>
          <div className="p-3 bg-slate-50 border rounded-xl flex flex-col justify-center dark:bg-slate-900/40 col-span-2 md:col-span-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Último Contato</span>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1.5 truncate">
              {lastInteraction ? `${new Date(lastInteraction.date).toLocaleDateString("pt-BR")} - ${lastInteraction.title}` : "Nenhuma interação"}
            </span>
          </div>
          <div className="p-3 bg-slate-50 border rounded-xl flex flex-col justify-center dark:bg-slate-900/40 col-span-2 md:col-span-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Próxima Reunião</span>
            <span className="text-xs font-semibold text-amber-600 mt-1.5 truncate">
              {nextAppointment ? `${new Date(nextAppointment.date).toLocaleDateString("pt-BR")} • ${nextAppointment.time}` : "Sem agendamentos"}
            </span>
          </div>
        </section>

        {/* Tabs System */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 md:grid-cols-8 w-full h-auto gap-1 bg-slate-100 p-1 rounded-lg">
            <TabsTrigger value="resumo" className="text-xs py-2">Ficha Geral</TabsTrigger>
            <TabsTrigger value="historico" className="text-xs py-2">Histórico</TabsTrigger>
            <TabsTrigger value="oportunidades" className="text-xs py-2">Oportunidades</TabsTrigger>
            <TabsTrigger value="atividades" className="text-xs py-2">Tarefas</TabsTrigger>
            <TabsTrigger value="agenda" className="text-xs py-2">Agenda</TabsTrigger>
            <TabsTrigger value="arquivos" className="text-xs py-2">Arquivos</TabsTrigger>
            <TabsTrigger value="financeiro" className="text-xs py-2">Financeiro</TabsTrigger>
            <TabsTrigger value="anotacoes" className="text-xs py-2">Anotações</TabsTrigger>
          </TabsList>

          {/* TAB 1: FICHA GERAL RESUMO */}
          <TabsContent value="resumo" className="pt-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Contatos & Fiscais Card */}
              <div className="space-y-4 border rounded-xl p-4 bg-white dark:bg-slate-950">
                <h4 className="font-bold border-b pb-2 text-slate-800 dark:text-slate-200 text-sm flex items-center gap-1.5">
                  <User className="w-4 h-4 text-primary" /> Informações de Contato & Fiscais
                </h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium">Nome do Contato</span>
                    <p className="font-bold text-slate-700 dark:text-slate-300 mt-0.5">{client.contato_nome}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Cargo</span>
                    <p className="font-bold text-slate-700 dark:text-slate-300 mt-0.5">{client.cargo || "Não cadastrado"}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 font-medium">Empresa / Razão Social</span>
                    <p className="font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                      {client.empresa || "N/A"} {client.razao_social ? `(${client.razao_social})` : ""}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">CPF</span>
                    <p className="font-mono text-slate-700 dark:text-slate-300 mt-0.5">{client.cpf || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">CNPJ</span>
                    <p className="font-mono text-slate-700 dark:text-slate-300 mt-0.5">{client.cnpj || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Inscrição Estadual</span>
                    <p className="font-mono text-slate-700 dark:text-slate-300 mt-0.5">{client.inscricao_estadual || "Isento"}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Site corporativo</span>
                    {client.site ? (
                      <a href={client.site} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline flex items-center gap-1 mt-0.5">
                        {client.site} <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <p className="text-slate-500 mt-0.5">Sem site</p>
                    )}
                  </div>
                  <div className="col-span-2 grid grid-cols-2 gap-2 mt-2 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg border">
                    <div>
                      <span className="text-slate-400 font-medium">E-mail Principal</span>
                      <p className="font-bold text-slate-700 dark:text-slate-300 mt-0.5 truncate">{client.email_principal || "Sem e-mail"}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">WhatsApp / Tel</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <p className="font-bold text-slate-700 dark:text-slate-300 truncate">{client.whatsapp || client.telefone_principal || "Sem telefone"}</p>
                        {client.whatsapp && (
                          <button 
                            onClick={handleWhatsAppChat}
                            className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[9px] font-bold tracking-wide uppercase hover:bg-emerald-100 transition-colors flex items-center gap-0.5 shrink-0"
                            title="Conversar por WhatsApp"
                          >
                            <MessageCircle className="w-2.5 h-2.5 text-emerald-500" /> Chamar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Address / Commercial Summary right column */}
              <div className="space-y-6">
                {/* Endereço */}
                <div className="space-y-4 border rounded-xl p-4 bg-white dark:bg-slate-950">
                  <h4 className="font-bold border-b pb-2 text-slate-800 dark:text-slate-200 text-sm flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-primary" /> Endereço Comercial
                  </h4>
                  <div className="text-xs space-y-2">
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                      {client.rua ? `${client.rua}, Nº ${client.numero || "S/N"}` : "Rua não informada"}
                      {client.complemento ? ` - ${client.complemento}` : ""}
                      <br />
                      {client.bairro ? `${client.bairro} • ` : ""}{client.cidade || "Cidade n/d"} - {client.estado || "UF"}
                      <br />
                      <span className="text-slate-400">CEP: {client.cep || "00000-000"} • País: {client.pais || "Brasil"}</span>
                    </p>
                  </div>
                </div>

                {/* Dados de Perfil de Negócio */}
                <div className="space-y-4 border rounded-xl p-4 bg-white dark:bg-slate-950">
                  <h4 className="font-bold border-b pb-2 text-slate-800 dark:text-slate-200 text-sm flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-primary" /> Perfil de Mercado & Lead
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 font-medium">Porte da Empresa</span>
                      <p className="font-bold text-slate-700 dark:text-slate-300 mt-0.5 capitalize">{client.porte_empresa?.toLowerCase() || "Não especificado"}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Segmento</span>
                      <p className="font-bold text-slate-700 dark:text-slate-300 mt-0.5">{client.segmento || "Não especificado"}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium font-mono">Qtd. Funcionários</span>
                      <p className="font-bold text-slate-700 dark:text-slate-300 mt-0.5">{client.qtd_funcionarios || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Faturamento Estimado</span>
                      <p className="font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                        {client.faturamento_estimado ? client.faturamento_estimado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "N/A"}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 font-medium">Origem da Oportunidade (Lead)</span>
                      <span className="inline-block bg-slate-100 text-slate-800 px-2 py-0.5 rounded-full font-semibold text-[10px] ml-2">
                        {client.origem_lead || "Direto"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Observações Base */}
            {client.observacoes && (
              <div className="border rounded-xl p-4 bg-slate-50 dark:bg-slate-900/60 text-xs">
                <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1">Notas Corporativas de Perfil</span>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">{client.observacoes}</p>
              </div>
            )}
          </TabsContent>

          {/* TAB 2: HISTÓRICO / UNIFIED CHRONOLOGICAL TIMELINE */}
          <TabsContent value="historico" className="pt-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Linha de Tempo Comercial Unificada</h4>
                <div className="flex gap-2">
                  <Button size="xs" variant="outline" onClick={() => { setActiveTab("atividades"); }} className="gap-1 text-xs">
                    <Plus className="w-3 h-3" /> Nova Tarefa
                  </Button>
                  <Button size="xs" onClick={() => { setActiveTab("agenda"); setShowEventForm(true); }} className="gap-1 text-xs">
                    <Plus className="w-3 h-3" /> Agendar Atividade
                  </Button>
                </div>
              </div>

              {(() => {
                const timelineItems = getTimelineItems();
                if (timelineItems.length === 0) {
                  return (
                    <div className="p-8 border-2 border-dashed rounded-xl text-center space-y-2">
                      <Clock className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-slate-400 text-xs font-semibold">Sem histórico de atividades. Registre reuniões, follow-ups ou ligações para sincronizar a timeline.</p>
                    </div>
                  );
                }
                return (
                  <div className="relative border-l-2 pl-6 ml-4 space-y-6 py-2">
                    {timelineItems.map((item) => {
                      const isUpcomingAct = item.category === "activity" && new Date(`${item.date}T${item.time}`).getTime() > nowTime;
                      
                      let bgBadge = "bg-slate-100 text-slate-800 border-slate-200";
                      let bulletColor = "border-indigo-600";
                      let categoryLabel = "Evento";

                      if (item.category === "creation") {
                        bgBadge = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400";
                        bulletColor = "border-blue-500";
                        categoryLabel = "Cadastro";
                      } else if (item.category === "note") {
                        bgBadge = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400";
                        bulletColor = "border-amber-500";
                        categoryLabel = "Anotação";
                      } else if (item.category === "task") {
                        bgBadge = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400";
                        bulletColor = "border-emerald-500";
                        categoryLabel = "Tarefas";
                      } else if (item.category === "activity") {
                        bgBadge = isUpcomingAct ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-indigo-50 text-indigo-700 border-indigo-200";
                        bulletColor = isUpcomingAct ? "border-purple-500" : "border-indigo-600";
                        categoryLabel = item.type === "meeting" ? "Reunião" : 
                                        item.type === "call" ? "Ligação" : 
                                        item.type === "presentation" ? "Apresentação" : 
                                        item.type === "follow_up" ? "Follow Up" : 
                                        item.type === "demo" ? "Demonstração" : 
                                        item.type === "closing" ? "Fechamento" : item.type || "Compromisso";
                      }

                      return (
                        <div key={item.id} className="relative group text-xs font-sans">
                          {/* Circle Bullet Badge indicator */}
                          <div className={`absolute -left-[29px] top-1 w-3.5 h-3.5 rounded-full border-2 bg-white ${bulletColor}`} />
                          
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-1">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border self-start max-w-max uppercase ${bgBadge}`}>
                              {categoryLabel}
                            </span>
                            <span className="font-mono text-slate-400 text-[10px]">
                              {new Date(`${item.date}T00:00:00`).toLocaleDateString("pt-BR")} {item.time ? `às ${item.time}` : ""}
                            </span>
                          </div>

                          <h5 className="font-bold text-slate-800 dark:text-slate-100 text-sm mt-1.5">{item.title}</h5>
                          <p className="text-slate-500 dark:text-slate-400 mt-0.5 max-w-xl leading-relaxed whitespace-pre-line font-sans">{item.description}</p>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </TabsContent>

          {/* TAB 3: OPORTUNIDADES / PIPELINE */}
          <TabsContent value="oportunidades" className="pt-4 space-y-4">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Oportunidades de Vendas Ativas</h4>
            
            {clientSales.length === 0 ? (
              <div className="p-8 border-2 border-dashed rounded-xl text-center">
                <p className="text-slate-400 text-xs font-semibold">Nenhuma oportunidade registrada no momento. Acesse a tela de Vendas para cadastrar propostas vinculadas a este cliente.</p>
              </div>
            ) : (
              <div className="border rounded-xl bg-white dark:bg-slate-950 overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 border-b">
                      <th className="p-3">Código/Produto</th>
                      <th className="p-3">Valor</th>
                      <th className="p-3">Vendedor</th>
                      <th className="p-3">Etapa Atual</th>
                      <th className="p-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientSales.map((sale) => (
                      <tr key={sale.id} className="border-b last:border-0 hover:bg-slate-50/50">
                        <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                          {sale.product_name}
                          <span className="block text-[10px] text-slate-400 font-normal">{sale.notes || "Sem descrição"}</span>
                        </td>
                        <td className="p-3 font-bold text-indigo-600">
                          {sale.total_price ? sale.total_price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "R$ 0,00"}
                        </td>
                        <td className="p-3 text-slate-500">{sale.seller_name}</td>
                        <td className="p-3">
                          <Select 
                            value={sale.stage} 
                            onValueChange={(val) => handleUpdateOpportunityStage(sale.id, val)}
                          >
                            <SelectTrigger className="w-36 h-8 text-[10px] font-bold uppercase">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="prospecting">Prospecção</SelectItem>
                              <SelectItem value="negotiation">Negociação</SelectItem>
                              <SelectItem value="proposal">Proposta Técnica</SelectItem>
                              <SelectItem value="closed_won">Ganha (Fechada)</SelectItem>
                              <SelectItem value="closed_lost">Perdida</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-3 text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-400">{sale.stage === 'closed_won' ? "✔️ Concluído" : "Aberto"}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* TAB: TAREFAS / DEADLINE ACTIVITIES */}
          <TabsContent value="atividades" className="pt-4">
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-indigo-50/20 p-3 rounded-lg border">
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Controle de Tarefas & Atividades com Prazo</h4>
                  <p className="text-muted-foreground text-[10px]">Acompanhe e configure tarefas prioritárias com responsáveis e prazos de encerramento delimitados.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Form to create a Task */}
                <Card className="border p-4 bg-muted/15 md:col-span-1 h-fit">
                  <h5 className="font-bold text-xs text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider">Nova Tarefa Comercial</h5>
                  <form onSubmit={handleCreateTask} className="space-y-3 text-xs">
                    <div className="space-y-1">
                      <Label htmlFor="task-desc">Descrição / O que fazer *</Label>
                      <Input 
                        id="task-desc" 
                        placeholder="Ex: Disparar contrato revisado hoje..." 
                        value={taskDescription}
                        onChange={e => setTaskDescription(e.target.value)}
                        className="h-8.5 text-xs"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <Label htmlFor="task-resp">Responsável Comercial *</Label>
                      <Input 
                        id="task-resp" 
                        placeholder="Nome do colaborador..." 
                        value={taskResponsible}
                        onChange={e => setTaskResponsible(e.target.value)}
                        className="h-8.5 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="task-due">Prazo de Conclusão *</Label>
                      <Input 
                        id="task-due" 
                        type="date"
                        value={taskDueDate}
                        onChange={e => setTaskDueDate(e.target.value)}
                        className="h-8.5 text-xs font-mono"
                      />
                    </div>

                    <Button type="submit" size="sm" className="w-full mt-2 font-bold flex gap-1">
                      <Plus className="w-3.5 h-3.5" /> Salvar Tarefa
                    </Button>
                  </form>
                </Card>

                {/* List of Tasks */}
                <div className="md:col-span-2 space-y-3">
                  {tasks.length === 0 ? (
                    <div className="p-8 border border-dashed rounded-xl text-center space-y-2 bg-muted/5">
                      <CheckCircle className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-slate-400 text-xs font-semibold">Toda a pauta limpa! Não há tarefas com prazo pendentes.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                      {tasks.map(t => (
                        <div 
                          key={t.id} 
                          className={`flex items-center justify-between p-3 border rounded-xl bg-card transition-all text-xs ${t.status === "completed" ? "opacity-70 line-through bg-slate-50/50" : "hover:border-primary/40 border-slate-200"}`}
                        >
                          <div className="flex items-start gap-2 max-w-[80%] font-sans">
                            <Checkbox 
                              className="mt-0.5"
                              id={`chk-${t.id}`}
                              checked={t.status === "completed"} 
                              onCheckedChange={() => handleToggleTaskStatus(t.id, t.status)} 
                            />
                            <div className="space-y-0.5">
                              <p className={`font-semibold text-slate-800 dark:text-slate-200 lg:text-left text-left ${t.status === "completed" ? "text-slate-400 font-normal outline-none shadow-none border-none line-through" : ""}`}>
                                {t.description}
                              </p>
                              <div className="flex gap-2 flex-wrap items-center text-[10px] text-muted-foreground font-medium">
                                <span className="bg-slate-100 text-slate-700 dark:bg-slate-900 px-1.5 py-0.5 rounded font-bold text-[9px]">
                                  Resp: {t.responsible}
                                </span>
                                <span>•</span>
                                <span className={`font-mono font-bold ${t.status === "pending" && t.due_date < new Date().toISOString().split("T")[0] ? "text-red-600 bg-red-50 dark:bg-red-950/20 px-1.5 py-0.5 rounded border border-red-100 dark:border-red-900" : ""}`}>
                                  Prazo: {new Date(t.due_date).toLocaleDateString("pt-BR")}
                                </span>
                              </div>
                            </div>
                          </div>

                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 w-7 h-7 shrink-0" 
                            onClick={() => handleDeleteTask(t.id)}
                            title="Deletar tarefa"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 4: AGENDA GENERAL */}
          <TabsContent value="agenda" className="pt-4 space-y-6">
            {/* Event Scheduling Action form */}
            {!showEventForm ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                  <h5 className="font-bold text-slate-800 dark:text-slate-200 text-xs">Compromissos Agendados</h5>
                  <Button size="sm" onClick={() => setShowEventForm(true)} className="gap-1.5">
                    <Plus className="w-4 h-4" /> Novo Agendamento
                  </Button>
                </div>

                {activities.length === 0 ? (
                  <p className="text-slate-400 text-xs italic text-center py-4">Nenhum compromisso pendente nesta ficha.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {activities.map((act) => (
                      <div key={act.id} className="p-3 border rounded-xl bg-white dark:bg-slate-950 flex justify-between gap-2 shadow-sm">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] uppercase font-bold bg-indigo-50 border rounded text-primary px-1">{act.type}</span>
                            <span className="text-slate-400 font-mono">{new Date(act.date).toLocaleDateString("pt-BR")} às {act.time}</span>
                          </div>
                          <h6 className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate">{act.title}</h6>
                          <p className="text-slate-500 truncate max-w-sm">{act.description}</p>
                          {act.participants && <p className="text-slate-400 text-[10px]">Coparticipantes: {act.participants}</p>}
                        </div>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="text-red-500 hover:text-red-600 self-center shrink-0"
                          onClick={() => handleDeleteActivity(act.id, act.google_event_id)}
                        >
                          <Trash className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleCreateEvent} className="border-t pt-4 space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <h5 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Criar Compromisso CRM</h5>
                  <Button type="button" variant="ghost" size="xs" onClick={() => setShowEventForm(false)}>Voltar para listagem</Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="space-y-1.5 col-span-2">
                    <Label htmlFor="evt_title">Título do Compromisso *</Label>
                    <Input 
                      id="evt_title" 
                      placeholder="Ex: Reunião de escopo técnico, follow-up comercial"
                      value={eventTitle}
                      onChange={(e) => setEventTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Tipo de Atividade</Label>
                    <Select value={eventType} onValueChange={(v) => setEventType(v as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="meeting">Reunião (Presencial / Call)</SelectItem>
                        <SelectItem value="call">Telefonema Ativo</SelectItem>
                        <SelectItem value="presentation">Apresentação Técnica / Proposta</SelectItem>
                        <SelectItem value="follow_up">Follow Up</SelectItem>
                        <SelectItem value="demo">Demonstração de Sistemas</SelectItem>
                        <SelectItem value="visit">Visita In Loco</SelectItem>
                        <SelectItem value="closing">Estudo de Fechamento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="evt_date">Data *</Label>
                    <Input 
                      id="evt_date" 
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="evt_time">Hora *</Label>
                    <Input 
                      id="evt_time" 
                      type="time"
                      value={eventTime}
                      onChange={(e) => setEventTime(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="evt_loc">Local ou Link (ex. Google Meet)</Label>
                    <Input 
                      id="evt_loc" 
                      placeholder="https://meet.google.com/abc-defg"
                      value={eventLocation}
                      onChange={(e) => setEventLocation(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5 col-span-3">
                    <Label htmlFor="evt_part">E-mails de Participantes (separados por vírgula)</Label>
                    <Input 
                      id="evt_part" 
                      placeholder="comercial@styron.com, cliente@empresa.com"
                      value={eventParticipants}
                      onChange={(e) => setEventParticipants(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5 col-span-3">
                    <Label htmlFor="evt_desc">Descrição / Pauta</Label>
                    <Textarea 
                      id="evt_desc" 
                      placeholder="Tópicos da conversa, perguntas-chave, objetivos..."
                      value={eventDescription}
                      onChange={(e) => setEventDescription(e.target.value)}
                      rows={2}
                    />
                  </div>

                  <div className="space-y-1.5 col-span-3">
                    <Label htmlFor="evt_obs">Observações pós-reunião ou pendências</Label>
                    <Textarea 
                      id="evt_obs" 
                      placeholder="Estrear follow-ups com o material x..."
                      value={eventObs}
                      onChange={(e) => setEventObs(e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowEventForm(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    Agendar Compromisso {isGoogleConnected && "e Sincronizar Google"}
                  </Button>
                </div>
              </form>
            )}
          </TabsContent>

          {/* TAB 5: ARQUIVOS / ANEXOS DO CLIENTE */}
          <TabsContent value="arquivos" className="pt-4 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Biblioteca Corporativa do Cliente</h4>
                <p className="text-slate-400 text-[10px]">Contratos, logos de empresa, propostas comerciais ou diagramação de sistemas.</p>
              </div>

              <div className="flex gap-2">
                <Button 
                  size="icon" 
                  variant="outline" 
                  onClick={() => setAttachmentViewMode("grid")}
                  className={attachmentViewMode === "grid" ? "bg-slate-100" : ""}
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button 
                  size="icon" 
                  variant="outline" 
                  onClick={() => setAttachmentViewMode("list")}
                  className={attachmentViewMode === "list" ? "bg-slate-100" : ""}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Direct Pick upload Box */}
            <div className="border-2 border-dashed rounded-xl p-4 text-center bg-slate-50 dark:bg-slate-900/40 relative">
              <input 
                type="file" 
                id="crm_file_input" 
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                onChange={handleFileUpload} 
                disabled={uploadingFile}
              />
              <Paperclip className="w-6 h-6 text-slate-400 mx-auto mb-1 animate-pulse" />
              <p className="text-xs text-slate-600 font-bold dark:text-slate-400">
                {uploadingFile ? "Fazendo upload..." : "Clique ou arraste um arquivo para anexar à ficha"}
              </p>
              <p className="text-[10px] text-slate-400">Suporta PDFs, logos (.png, .jpg), planilhas, contratos ou propostas</p>
            </div>

            {attachments.length === 0 ? (
              <p className="text-center text-slate-400 text-xs italic py-6">Nenhum arquivo anexado ainda.</p>
            ) : attachmentViewMode === "grid" ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                {attachments.map((file) => {
                  const isImg = file.file_type.startsWith("image/");
                  return (
                    <div key={file.id} className="border rounded-xl bg-white dark:bg-slate-950 overflow-hidden shadow-sm flex flex-col justify-between group relative">
                      {isImg ? (
                        <div className="h-24 bg-slate-100 dark:bg-slate-900 border-b overflow-hidden relative flex items-center justify-center">
                          <img src={file.file_url} alt="" className="object-cover w-full h-full hover:scale-105 transition-transform" />
                        </div>
                      ) : (
                        <div className="h-24 bg-slate-50 border-b flex items-center justify-center dark:bg-slate-900">
                          <FileText className="w-8 h-8 text-indigo-400" />
                        </div>
                      )}
                      
                      <div className="p-2 truncate min-w-0">
                        <p className="font-bold text-slate-700 dark:text-slate-300 truncate" title={file.file_name}>{file.file_name}</p>
                        <span className="text-[9px] text-slate-400 uppercase">{file.file_type.split("/")[1] || "DOC"}</span>
                      </div>

                      <div className="p-1 border-t bg-slate-50 flex justify-end gap-1 shrink-0 dark:bg-slate-900 opacity-90 group-hover:opacity-100 transition-opacity">
                        <a href={file.file_url} download target="_blank" rel="noreferrer">
                          <Button size="icon" variant="ghost" className="w-7 h-7 text-indigo-600">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        </a>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="w-7 h-7 text-red-500 hover:text-red-600"
                          onClick={() => handleDeleteAttachment(file.id)}
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="border rounded-xl overflow-hidden bg-white dark:bg-slate-950 text-xs text-left">
                {attachments.map((file) => (
                  <div key={file.id} className="p-3 border-b last:border-0 hover:bg-slate-50/50 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 truncate">
                      <Paperclip className="w-4 h-4 text-indigo-400 shrink-0" />
                      <div className="truncate min-w-0">
                        <p className="font-bold text-slate-700 dark:text-slate-300 truncate">{file.file_name}</p>
                        <span className="text-[10px] text-slate-400 font-mono">{file.file_type || "desconhecido"}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <a href={file.file_url} download target="_blank" rel="noreferrer">
                        <Button size="icon" variant="ghost" className="text-indigo-600">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </a>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="text-red-500 hover:text-red-600"
                        onClick={() => handleDeleteAttachment(file.id)}
                      >
                        <Trash className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TAB 6: FINANCEIRO */}
          <TabsContent value="financeiro" className="pt-4 space-y-4">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Painel de Fluxo Financeiro do Cliente</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="border rounded-xl p-3 bg-indigo-50/50 border-indigo-100 flex items-center justify-between dark:bg-slate-900/20">
                <div>
                  <span className="text-slate-400 font-medium block">Total Comercial</span>
                  <span className="text-xl font-bold text-indigo-600">
                    {sumWonValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                </div>
                <DollarSign className="w-8 h-8 text-indigo-400 opacity-60" />
              </div>

              <div className="border rounded-xl p-3 bg-amber-50/50 border-amber-100 flex items-center justify-between dark:bg-slate-900/20">
                <div>
                  <span className="text-slate-400 font-medium block">Ticket Médio Ganho</span>
                  <span className="text-xl font-bold text-amber-600 font-mono">
                    {ticketMedio.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                </div>
                <Compass className="w-8 h-8 text-amber-400 opacity-60" />
              </div>

              <div className="border rounded-xl p-3 bg-green-50/50 border-green-100 flex items-center justify-between dark:bg-slate-900/20">
                <div>
                  <span className="text-slate-400 font-medium block">Contratos Fechados</span>
                  <span className="text-xl font-bold text-green-600">{wonOpps.length}</span>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400 opacity-60" />
              </div>
            </div>

            <div className="border rounded-xl p-4 bg-slate-50 dark:bg-slate-900 text-xs space-y-2">
              <h5 className="font-semibold text-slate-800 dark:text-slate-100">Faturamento Realizado por Eventos Contratuais</h5>
              {wonOpps.length === 0 ? (
                <p className="text-slate-400 italic">Sem eventos de liquidação financeira iniciada. Vendas faturadas (CLOSED_WON) geram fluxo de caixa associado no módulo Financeiro.</p>
              ) : (
                <div className="space-y-2">
                  {wonOpps.map((sale) => (
                    <div key={sale.id} className="p-2.5 border rounded-lg bg-white dark:bg-slate-950 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-slate-700 dark:text-slate-300">Geração de Receita: {sale.product_name}</p>
                        <span className="text-[10px] text-slate-400 font-mono">Vendedor Responsável: {sale.seller_name}</span>
                      </div>
                      <span className="font-black text-green-600">{sale.total_price ? sale.total_price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "R$ 0,00"}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB 7: ANOTAÇÕES */}
          <TabsContent value="anotacoes" className="pt-4 space-y-4">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Notas Internas & Recomendações</h4>

            <form onSubmit={handleAddNote} className="space-y-2">
              <Textarea 
                placeholder="Adicione notas ricas para reuniões futuras, detalhes sobre estilo de comunicação ou objeções superadas..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="text-xs resize-none"
                rows={3}
                required
              />
              <Button type="submit" size="sm" className="h-8 text-xs">Salvar Nota de Briefing</Button>
            </form>

            <div className="space-y-2.5 transition-all">
              {notes.length === 0 ? (
                <p className="text-slate-400 text-xs italic text-center py-4">Nenhuma nota interna criada ainda.</p>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="p-3 border rounded-xl bg-slate-50 text-xs relative dark:bg-slate-900 group">
                    <p className="text-slate-700 dark:text-slate-300 mr-8 leading-relaxed whitespace-pre-line">{note.text}</p>
                    <span className="text-[10px] text-slate-400 block mt-2">{note.created_at ? new Date(note.created_at).toLocaleString("pt-BR") : ""}</span>
                    
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-red-500 hover:text-red-600 w-6 h-6 absolute right-2 top-2 opacity-50 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDeleteNote(note.id)}
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
