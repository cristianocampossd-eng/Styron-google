import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, GanttChart, List, Activity, MoreHorizontal, CheckCircle2, UserPlus, Pencil, MessageSquare, Send, Trash2, Copy } from "lucide-react";
import { statusLabels, taskStatusLabels, priorityLabels, priorityColors, type Task, type Stage, type TaskStatus, type TaskPriority } from "@/data/mock";
import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format, differenceInDays, addDays, min, max, isToday, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { projects, templates, importFromTemplate, updateTask, deleteTask, updateStage, deleteStage, taskMessages, addTaskMessage, getProjectCode, profiles, addStage, addTask } = useApp();
  const { user, profile: authProfile } = useAuth();
  const project = projects.find((p) => p.id === id);
  const isProjectCreator = user?.id === project?.createdBy;
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editTaskMode, setEditTaskMode] = useState(false);
  const [taskTab, setTaskTab] = useState<"details" | "messages">("details");
  const [addStageOpen, setAddStageOpen] = useState(false);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [copyTemplateOpen, setCopyTemplateOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [baseCopyDate, setBaseCopyDate] = useState("");
  const [ganttZoom, setGanttZoom] = useState<"day" | "week" | "month">("week");
  const [chatInput, setChatInput] = useState("");

  const [stageName, setStageName] = useState("");
  const [tName, setTName] = useState("");
  const [tDesc, setTDesc] = useState("");
  const [tStageId, setTStageId] = useState("");
  const [tResp, setTResp] = useState("");
  const [tStart, setTStart] = useState("");
  const [tEnd, setTEnd] = useState("");
  const [tPrior, setTPrior] = useState<TaskPriority>("medium");
  const [tStatus, setTStatus] = useState<TaskStatus>("todo");

  const getProfileName = (id: string) => profiles.find((p) => p.id === id)?.name || id;
  const currentUserName = authProfile?.name || user?.email || "Eu";

  if (!project) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Projeto não encontrado.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/projects")}>
          Voltar
        </Button>
      </div>
    );
  }

  const allTasks = project.stages.flatMap((s) => s.tasks);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/projects")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-muted-foreground">{getProjectCode(project.id)}</span>
            <h1 className="text-2xl font-semibold">{project.name}</h1>
            <StatusBadge status={project.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
        </div>
        <div className="hidden sm:flex gap-2">
          <Button variant="outline" onClick={() => {
            setBaseCopyDate(format(new Date(), "yyyy-MM-dd"));
            if (templates && templates.length > 0) {
              setSelectedTemplateId(templates[0].id);
            }
            setCopyTemplateOpen(true);
          }}>
            <Copy className="w-4 h-4 mr-2" /> Copiar de Modelo
          </Button>
          <Button variant="outline" onClick={() => setAddStageOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Etapa
          </Button>
          <Button onClick={() => setAddTaskOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Tarefa
          </Button>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-card rounded-xl border p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Progresso geral</span>
          <span className="text-sm font-medium">{project.progress}%</span>
        </div>
        <Progress value={project.progress} className="h-2.5" />
        <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
          <span>{project.stages.length} etapas</span>
          <span>{allTasks.length} tarefas</span>
          <span>{allTasks.filter((t) => t.status === "done").length} concluídas</span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="gantt">
        <TabsList>
          <TabsTrigger value="gantt" className="gap-1.5">
            <GanttChart className="w-4 h-4" /> Gantt
          </TabsTrigger>
          <TabsTrigger value="list" className="gap-1.5">
            <List className="w-4 h-4" /> Lista
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-1.5">
            <Activity className="w-4 h-4" /> Atividades
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gantt" className="mt-4">
          <GanttView stages={project.stages} zoom={ganttZoom} onZoomChange={setGanttZoom} onTaskClick={setSelectedTask} />
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          <ListView stages={project.stages} onTaskClick={setSelectedTask} isCreator={isProjectCreator} onUpdateStage={(stageId, name) => updateStage(project.id, stageId, name)} onDeleteStage={(stageId) => deleteStage(project.id, stageId)} />
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <ActivityView tasks={allTasks} messages={taskMessages} />
        </TabsContent>
      </Tabs>

      {/* Task Detail Drawer */}
      <Sheet open={!!selectedTask} onOpenChange={(val) => { if (!val) { setSelectedTask(null); setEditTaskMode(false); } }}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          {selectedTask && (
            <>
              <SheetHeader className="flex flex-row items-center justify-between">
                <div>
                  {editTaskMode ? (
                    <Input 
                      value={tName || selectedTask.name} 
                      onChange={(e) => setTName(e.target.value)}
                      className="mt-2 font-medium"
                      placeholder="Nome da Tarefa"
                    />
                  ) : (
                    <SheetTitle>{selectedTask.name}</SheetTitle>
                  )}
                </div>
                {isProjectCreator && !editTaskMode && (
                  <Button variant="ghost" size="icon" onClick={() => {
                    setTName(selectedTask.name);
                    setTDesc(selectedTask.description);
                    const startD = selectedTask.startDate ? new Date(selectedTask.startDate) : null;
                    const endD = selectedTask.endDate ? new Date(selectedTask.endDate) : null;
                    setTStart(startD && !isNaN(startD.getTime()) ? format(startD, "yyyy-MM-dd") : "");
                    setTEnd(endD && !isNaN(endD.getTime()) ? format(endD, "yyyy-MM-dd") : "");
                    setTResp(selectedTask.responsible || "");
                    setTPrior(selectedTask.priority || "medium");
                    setTStatus(selectedTask.status || "todo");
                    const curStage = project?.stages.find((s) => s.tasks.some((t) => t.id === selectedTask.id));
                    setTStageId(curStage ? curStage.id : "");
                    setEditTaskMode(true);
                  }}>
                    <Pencil className="w-4 h-4 text-muted-foreground" />
                  </Button>
                )}
              </SheetHeader>

              {editTaskMode ? (
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>Descrição</Label>
                    <Textarea 
                      value={tDesc} 
                      onChange={(e) => setTDesc(e.target.value)} 
                      rows={4}
                      className="mt-1"
                    />
                  </div>

                  {project && project.stages && project.stages.length > 0 && (
                    <div>
                      <Label>Etapa</Label>
                      <Select value={tStageId} onValueChange={setTStageId}>
                        <SelectTrigger className="mt-1.5">
                          <SelectValue placeholder="Selecione a etapa" />
                        </SelectTrigger>
                        <SelectContent>
                          {project.stages.map((stg) => (
                            <SelectItem key={stg.id} value={stg.id}>
                              {stg.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <Label>Responsável</Label>
                    <Select value={tResp} onValueChange={setTResp}>
                      <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione um responsável" /></SelectTrigger>
                      <SelectContent>
                        {profiles.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Status</Label>
                      <Select value={tStatus} onValueChange={(val) => setTStatus(val as TaskStatus)}>
                        <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(["todo", "in_progress", "review", "done"] as const).map((s) => (
                            <SelectItem key={s} value={s}>{taskStatusLabels[s]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Prioridade</Label>
                      <Select value={tPrior} onValueChange={(val) => setTPrior(val as TaskPriority)}>
                        <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(["low", "medium", "high", "urgent"] as const).map((p) => (
                            <SelectItem key={p} value={p}>{priorityLabels[p]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Data de Início</Label>
                      <Input 
                        type="date" 
                        value={tStart} 
                        onChange={(e) => setTStart(e.target.value)} 
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Data de Término</Label>
                      <Input 
                        type="date" 
                        value={tEnd} 
                        onChange={(e) => setTEnd(e.target.value)} 
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => {
                      const updatedStartDate = tStart ? new Date(tStart + "T12:00:00") : selectedTask.startDate;
                      const updatedEndDate = tEnd ? new Date(tEnd + "T12:00:00") : selectedTask.endDate;

                      updateTask(project.id, selectedTask.id, { 
                        name: tName, 
                        description: tDesc,
                        startDate: updatedStartDate,
                        endDate: updatedEndDate,
                        responsible: tResp,
                        priority: tPrior,
                        status: tStatus,
                        stageId: tStageId,
                      });
                      setSelectedTask({ 
                        ...selectedTask, 
                        name: tName, 
                        description: tDesc,
                        startDate: updatedStartDate,
                        endDate: updatedEndDate,
                        responsible: tResp,
                        priority: tPrior,
                        status: tStatus,
                      });
                      toast.success("Tarefa atualizada!");
                      setEditTaskMode(false);
                    }}>Salvar</Button>
                    <Button variant="outline" onClick={() => setEditTaskMode(false)}>Cancelar</Button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Task Actions */}
              <div className="flex gap-2 mt-4 flex-wrap">
                <Button
                  size="sm"
                  variant={selectedTask.status === "done" ? "secondary" : "default"}
                  onClick={() => {
                    updateTask(project.id, selectedTask.id, { status: "done" as TaskStatus });
                    setSelectedTask({ ...selectedTask, status: "done" });
                    toast.success("Tarefa concluída!");
                  }}
                  disabled={selectedTask.status === "done"}
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Concluir
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline"><UserPlus className="w-4 h-4 mr-1" /> Transferir</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {profiles.filter((p) => p.id !== selectedTask.responsible).map((p) => (
                      <DropdownMenuItem key={p.id} onClick={() => {
                        updateTask(project.id, selectedTask.id, { responsible: p.id });
                        setSelectedTask({ ...selectedTask, responsible: p.id });
                        toast.success(`Transferido para ${p.name}`);
                      }}>{p.name}</DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                {isProjectCreator && (
                  <Button size="sm" variant="destructive" onClick={() => {
                    deleteTask(project.id, selectedTask.id);
                    setSelectedTask(null);
                  }}>
                    <Trash2 className="w-4 h-4 mr-1" /> Excluir
                  </Button>
                )}
              </div>

              {/* Tabs */}
              <div className="flex gap-1 bg-secondary rounded-lg p-1 mt-4">
                <button onClick={() => setTaskTab("details")} className={cn("px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex-1", taskTab === "details" ? "bg-card shadow-sm" : "text-muted-foreground")}>Detalhes</button>
                <button onClick={() => setTaskTab("messages")} className={cn("px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex-1 flex items-center justify-center gap-1", taskTab === "messages" ? "bg-card shadow-sm" : "text-muted-foreground")}>
                  <MessageSquare className="w-3.5 h-3.5" /> Mensagens
                </button>
              </div>

              {taskTab === "details" ? (
                <div className="space-y-4 mt-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Responsável</p>
                    <p className="font-medium">{getProfileName(selectedTask.responsible)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Select
                      value={selectedTask.status}
                      onValueChange={(val) => {
                        updateTask(project.id, selectedTask.id, { status: val as TaskStatus });
                        setSelectedTask({ ...selectedTask, status: val as TaskStatus });
                        toast.success("Status atualizado!");
                      }}
                    >
                      <SelectTrigger className="w-40 mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(["todo", "in_progress", "review", "done"] as const).map((s) => (
                          <SelectItem key={s} value={s}>{taskStatusLabels[s]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Prioridade</p>
                    <span className={cn("inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium", priorityColors[selectedTask.priority])}>
                      {priorityLabels[selectedTask.priority]}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Período</p>
                    <p>{format(selectedTask.startDate, "dd/MM/yyyy")} – {format(selectedTask.endDate, "dd/MM/yyyy")}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Descrição</p>
                    <p className="text-sm">{selectedTask.description}</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col mt-4" style={{ minHeight: 300 }}>
                  <div className="flex-1 space-y-3 overflow-y-auto max-h-[400px] mb-3">
                    {taskMessages
                      .filter((m) => m.taskId === selectedTask.id)
                      .map((m) => (
                        <div key={m.id} className={cn("flex flex-col", m.author === "Ana Silva" ? "items-end" : "items-start")}>
                          <div className={cn("rounded-2xl px-4 py-2 max-w-[80%]", m.author === user?.id ? "bg-primary text-primary-foreground" : "bg-muted")}>
                            <p className="text-sm">{m.text}</p>
                          </div>
                          <span className="text-[10px] text-muted-foreground mt-0.5">{getProfileName(m.author)} · {format(m.date, "dd/MM HH:mm")}</span>
                        </div>
                      ))}
                    {taskMessages.filter((m) => m.taskId === selectedTask.id).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">Nenhuma mensagem ainda.</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Digite uma mensagem..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && chatInput.trim()) {
                          addTaskMessage({ taskId: selectedTask.id, author: user?.id || "", text: chatInput.trim() });
                          setChatInput("");
                        }
                      }}
                    />
                    <Button size="icon" onClick={() => {
                      if (chatInput.trim()) {
                        addTaskMessage({ taskId: selectedTask.id, author: user?.id || "", text: chatInput.trim() });
                        setChatInput("");
                      }
                    }}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
          </>
        )}
        </SheetContent>
      </Sheet>

      {/* Copy Template Modal */}
      <Dialog open={copyTemplateOpen} onOpenChange={setCopyTemplateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copiar Etapas e Tarefas de Modelo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Selecione o Modelo</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Selecione um modelo salvo" />
                </SelectTrigger>
                <SelectContent>
                  {templates && templates.length > 0 ? (
                    templates.map((tpl) => (
                      <SelectItem key={tpl.id} value={tpl.id}>
                        {tpl.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      Nenhum modelo disponível
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {(!templates || templates.length === 0) && (
                <p className="text-xs text-destructive mt-1">
                  Nenhum modelo salvo encontrado. Salve um projeto como modelo para copiar etapas e tarefas dele.
                </p>
              )}
            </div>

            <div>
              <Label>Data de Início da Cópia (Referência)</Label>
              <Input
                type="date"
                className="mt-1.5"
                value={baseCopyDate}
                onChange={(e) => setBaseCopyDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                As datas das tarefas do modelo serão calculadas e distribuídas a partir desta data, mantendo o mesmo intervalo de dias e a duração configurados no modelo original.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyTemplateOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={async () => {
                if (!selectedTemplateId || selectedTemplateId === "none") {
                  toast.error("Por favor, selecione um modelo");
                  return;
                }
                if (!baseCopyDate) {
                  toast.error("Por favor, informe a data de início");
                  return;
                }
                
                const baseDate = new Date(`${baseCopyDate}T12:00:00`);
                if (isNaN(baseDate.getTime())) {
                  toast.error("Data inválida");
                  return;
                }

                await importFromTemplate(project.id, selectedTemplateId, baseDate);
                setCopyTemplateOpen(false);
              }}
              disabled={!templates || templates.length === 0}
            >
              Confirmar Cópia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Stage Modal */}
      <Dialog open={addStageOpen} onOpenChange={setAddStageOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Etapa</DialogTitle></DialogHeader>
          <div className="py-4">
            <Label>Nome da etapa</Label>
            <Input placeholder="Ex: Desenvolvimento" className="mt-1.5" value={stageName} onChange={(e) => setStageName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddStageOpen(false)}>Cancelar</Button>
            <Button onClick={async () => {
              if (!stageName.trim()) { toast.error("Informe o nome"); return; }
              await addStage(project.id, stageName.trim());
              setStageName(""); setAddStageOpen(false);
            }}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Task Modal */}
      <Dialog open={addTaskOpen} onOpenChange={setAddTaskOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Tarefa</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div><Label>Nome</Label><Input placeholder="Nome da tarefa" className="mt-1.5" value={tName} onChange={(e) => setTName(e.target.value)} /></div>
            <div><Label>Descrição</Label><Textarea placeholder="Descreva..." className="mt-1.5" value={tDesc} onChange={(e) => setTDesc(e.target.value)} /></div>
            <div>
              <Label>Etapa</Label>
              <Select value={tStageId} onValueChange={setTStageId}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {project.stages.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Responsável</Label>
              <Select value={tResp} onValueChange={setTResp}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Data início</Label><Input type="date" className="mt-1.5" value={tStart} onChange={(e) => setTStart(e.target.value)} /></div>
              <div><Label>Data fim</Label><Input type="date" className="mt-1.5" value={tEnd} onChange={(e) => setTEnd(e.target.value)} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddTaskOpen(false)}>Cancelar</Button>
            <Button onClick={async () => {
              if (!tName.trim()) { toast.error("Informe o nome"); return; }
              if (!tStageId) { toast.error("Selecione a etapa"); return; }
              await addTask({
                projectId: project.id,
                stageId: tStageId,
                name: tName.trim(),
                description: tDesc,
                responsibleId: tResp || null,
                startDate: tStart ? new Date(tStart) : undefined,
                endDate: tEnd ? new Date(tEnd) : undefined,
              });
              setTName(""); setTDesc(""); setTResp(""); setTStart(""); setTEnd("");
              setAddTaskOpen(false);
            }}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GanttView({ stages, zoom, onZoomChange, onTaskClick }: {
  stages: Stage[];
  zoom: "day" | "week" | "month";
  onZoomChange: (z: "day" | "week" | "month") => void;
  onTaskClick: (t: Task) => void;
}) {
  const allTasks = stages.flatMap((s) => s.tasks);
  const today = startOfDay(new Date());

  // Coerce all task dates safely using new Date() to handle any potential string-dates and get start of day
  const taskDates = allTasks.flatMap((t) => [
    startOfDay(new Date(t.startDate)),
    startOfDay(new Date(t.endDate))
  ]);

  const rawMinDate = taskDates.length ? min(taskDates) : today;
  const rawMaxDate = taskDates.length ? max(taskDates) : addDays(today, 30);

  // Guarantee that "Today" is always within the [minDate, maxDate] range so the indicator is always visible
  const minDate = today < rawMinDate ? today : rawMinDate;
  const maxDate = today > rawMaxDate ? today : rawMaxDate;

  const totalDays = Math.max(differenceInDays(maxDate, minDate) + 1, 14);
  const dayWidth = zoom === "day" ? 40 : zoom === "week" ? 20 : 8;

  const todayOffset = differenceInDays(today, minDate);
  const todayLeft = todayOffset * dayWidth;
  const showTodayLine = todayOffset >= 0 && todayOffset <= totalDays;

  return (
    <div className="bg-card rounded-xl border overflow-hidden animate-fade-in">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-sm font-medium">Gráfico de Gantt</h3>
        <div className="flex gap-1 bg-secondary rounded-lg p-1">
          {(["day", "week", "month"] as const).map((z) => (
            <button
              key={z}
              onClick={() => onZoomChange(z)}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                zoom === z ? "bg-card shadow-sm" : "text-muted-foreground"
              )}
            >
              {{ day: "Dia", week: "Semana", month: "Mês" }[z]}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto relative">
        <div style={{ minWidth: totalDays * dayWidth + 200 }} className="relative">
          {/* Today line */}
          {showTodayLine && (
            <div
              className="absolute top-0 bottom-0 z-10 pointer-events-none border-l-2 border-dashed border-rose-500/70"
              style={{ left: 200 + todayLeft }}
            >
              <div className="absolute top-1 -left-[15px] bg-rose-500 text-white text-[9px] px-1.5 py-0.5 rounded-md shadow-sm font-semibold tracking-wider uppercase">
                Hoje
              </div>
            </div>
          )}
          {/* Timeline header */}
          <div className="flex border-b bg-muted/30">
            <div className="w-[200px] shrink-0 p-3 text-xs font-medium text-muted-foreground">Tarefa</div>
            <div className="flex-1 flex">
              {Array.from({ length: Math.min(totalDays, 60) }, (_, i) => {
                const d = addDays(minDate, i);
                return (
                  <div
                    key={i}
                    style={{ width: dayWidth }}
                    className="text-center text-[10px] text-muted-foreground py-2 border-l border-border/50"
                  >
                    {i % (zoom === "day" ? 1 : zoom === "week" ? 7 : 30) === 0
                      ? format(d, zoom === "month" ? "MMM" : "dd/MM")
                      : ""}
                  </div>
                );
              })}
            </div>
          </div>

          {stages.map((stage) => (
            <div key={stage.id}>
              <div className="flex items-center border-b bg-muted/20">
                <div className="w-[200px] shrink-0 p-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {stage.name}
                </div>
              </div>
              {stage.tasks.map((task) => {
                const offset = Math.max(differenceInDays(task.startDate, minDate), 0);
                const duration = Math.max(differenceInDays(task.endDate, task.startDate), 1);
                const isLate = task.endDate < new Date() && task.status !== "done";
                const progressPct = task.status === "done" ? 100 : task.status === "in_progress" ? 50 : 0;

                return (
                  <div
                    key={task.id}
                    className="flex items-center border-b hover:bg-muted/20 cursor-pointer transition-colors"
                    onClick={() => onTaskClick(task)}
                  >
                    <div className="w-[200px] shrink-0 p-3 text-xs truncate">{task.name}</div>
                    <div className="flex-1 relative h-10">
                      <div
                        className={cn(
                          "absolute top-2 h-6 rounded-md transition-all group",
                          isLate ? "bg-destructive/20" : "bg-primary/20"
                        )}
                        style={{ left: offset * dayWidth, width: Math.max(duration * dayWidth, 20) }}
                      >
                        <div
                          className={cn("h-full rounded-md", isLate ? "bg-destructive" : "bg-primary")}
                          style={{ width: `${progressPct}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-[10px] font-medium text-foreground bg-card/80 px-1 rounded">
                            {task.name}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ListView({ stages, onTaskClick, isCreator, onDeleteStage, onUpdateStage }: { stages: Stage[]; onTaskClick: (t: Task) => void; isCreator?: boolean; onDeleteStage?: (stageId: string) => void; onUpdateStage?: (stageId: string, name: string) => void }) {
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  return (
    <div className="space-y-4 animate-fade-in">
      {stages.map((stage) => (
        <div key={stage.id} className="bg-card rounded-xl border">
          <div className="p-4 border-b flex items-center justify-between">
            {editingStageId === stage.id ? (
              <div className="flex gap-2 w-full max-w-sm">
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8" />
                <Button size="sm" onClick={() => {
                  if (onUpdateStage && editName.trim()) onUpdateStage(stage.id, editName.trim());
                  setEditingStageId(null);
                }}>Salvar</Button>
                <Button size="sm" variant="outline" onClick={() => setEditingStageId(null)}>Cancelar</Button>
              </div>
            ) : (
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                {stage.name}
                {isCreator && onUpdateStage && (
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setEditingStageId(stage.id); setEditName(stage.name); }}>
                    <Pencil className="w-3 h-3" />
                  </Button>
                )}
              </h3>
            )}
            {isCreator && onDeleteStage && editingStageId !== stage.id && (
              <Button size="sm" variant="ghost" className="h-8 hover:text-destructive" onClick={() => onDeleteStage(stage.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
          <div className="divide-y">
            {stage.tasks.map((task) => (
              <div
                key={task.id}
                className="p-4 flex items-center gap-4 hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => onTaskClick(task)}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{task.name}</p>
                  <p className="text-xs text-muted-foreground">{task.responsible}</p>
                </div>
                <span className={cn("inline-flex px-2 py-0.5 rounded-full text-xs font-medium", priorityColors[task.priority])}>
                  {priorityLabels[task.priority]}
                </span>
                <span className="text-xs text-muted-foreground hidden sm:block">
                  {format(task.startDate, "dd/MM")} – {format(task.endDate, "dd/MM")}
                </span>
                <span className={cn("inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary")}>
                  {taskStatusLabels[task.status]}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ActivityView({ tasks, messages }: { tasks: Task[]; messages: { id: string; taskId: string; author: string; text: string; date: Date }[] }) {
  const activities = messages
    .filter((m) => tasks.some((t) => t.id === m.taskId))
    .map((m) => {
      const task = tasks.find((t) => t.id === m.taskId);
      return { ...m, taskName: task?.name || "Tarefa" };
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  if (activities.length === 0) {
    return <div className="p-8 text-center text-muted-foreground bg-card rounded-xl border">Nenhuma atividade registrada.</div>;
  }

  return (
    <div className="bg-card rounded-xl border divide-y animate-fade-in">
      {activities.map((a) => (
        <div key={a.id} className="p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">{a.author}</span>
            <span className="text-xs text-muted-foreground">{format(a.date, "dd/MM/yyyy HH:mm")}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="text-foreground font-medium">{a.taskName}</span>: {a.text}
          </p>
        </div>
      ))}
    </div>
  );
}