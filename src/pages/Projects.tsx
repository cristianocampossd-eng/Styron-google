import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, LayoutGrid, List, MoreHorizontal, Copy, Archive, FileText, Pencil } from "lucide-react";
import { statusLabels, type Project, type ProjectStatus } from "@/data/mock";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function Projects() {
  const [view, setView] = useState<"table" | "cards">("table");
  const [createOpen, setCreateOpen] = useState(false);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get("status") as ProjectStatus | null;
  const { projects, addProject, getProjectCode, profiles, templates } = useApp();

  const [fName, setFName] = useState("");
  const [fDesc, setFDesc] = useState("");
  const [fStart, setFStart] = useState("");
  const [fEnd, setFEnd] = useState("");
  const [fResp, setFResp] = useState("");
  const [fTemplate, setFTemplate] = useState<string>("none");

  const filteredProjects = statusFilter
    ? projects.filter((p) => p.status === statusFilter && p.status !== "archived")
    : projects.filter((p) => p.status !== "archived");

  const [editProject, setEditProject] = useState<Project | null>(null);

  const handleCreate = async () => {
    if (!fName.trim()) { toast.error("Informe o nome do projeto"); return; }
    await addProject({
      name: fName.trim(),
      description: fDesc.trim(),
      status: "planning",
      startDate: fStart ? new Date(fStart) : new Date(),
      endDate: fEnd ? new Date(fEnd) : new Date(Date.now() + 30 * 86400000),
      responsible: fResp || undefined,
      progress: 0,
      stages: [],
      fromTemplateId: fTemplate !== "none" ? fTemplate : undefined,
    } as any);
    setCreateOpen(false);
    setFName(""); setFDesc(""); setFStart(""); setFEnd(""); setFResp(""); setFTemplate("none");
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Projetos"
        description="Gerencie todos os seus projetos"
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Projeto
          </Button>
        }
        filters={
          <div className="flex gap-1 bg-secondary rounded-lg p-1 flex-wrap">
            <button
              onClick={() => setSearchParams({})}
              className={cn("px-3 py-1.5 rounded-md text-sm font-medium transition-colors", !statusFilter ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              Todos
            </button>
            {(["planning", "in_progress", "completed"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSearchParams({ status: s })}
                className={cn("px-3 py-1.5 rounded-md text-sm font-medium transition-colors", statusFilter === s ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                {statusLabels[s]}
              </button>
            ))}
            <div className="border-l mx-1" />
            <button
              onClick={() => setView("table")}
              className={cn("p-2 rounded-md transition-colors", view === "table" ? "bg-card shadow-sm" : "text-muted-foreground")}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView("cards")}
              className={cn("p-2 rounded-md transition-colors", view === "cards" ? "bg-card shadow-sm" : "text-muted-foreground")}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        }
      />

      {view === "table" ? (
        <div className="bg-card rounded-xl border overflow-hidden animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 font-medium text-muted-foreground">Nome</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-4 font-medium text-muted-foreground hidden md:table-cell">Início</th>
                  <th className="text-left p-4 font-medium text-muted-foreground hidden md:table-cell">Fim</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Progresso</th>
                  <th className="p-4 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => navigate(`/projects/${p.id}`)}
                  >
                    <td className="p-4">
                      <span className="text-xs text-muted-foreground mr-2">{getProjectCode(p.id)}</span>
                      <span className="font-medium">{p.name}</span>
                    </td>
                    <td className="p-4"><StatusBadge status={p.status} /></td>
                    <td className="p-4 text-muted-foreground hidden md:table-cell">{format(p.startDate, "dd/MM/yyyy")}</td>
                    <td className="p-4 text-muted-foreground hidden md:table-cell">{format(p.endDate, "dd/MM/yyyy")}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Progress value={p.progress} className="h-2 w-20" />
                        <span className="text-xs text-muted-foreground">{p.progress}%</span>
                      </div>
                    </td>
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <ProjectActions project={p} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((p) => (
            <div
              key={p.id}
              onClick={() => navigate(`/projects/${p.id}`)}
              className="bg-card rounded-xl border p-5 hover:shadow-md cursor-pointer transition-all duration-200 animate-slide-up"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="text-xs text-muted-foreground">{getProjectCode(p.id)}</span>
                  <h3 className="font-medium">{p.name}</h3>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <ProjectActions project={p} />
                </div>
              </div>
              <StatusBadge status={p.status} />
              <p className="text-xs text-muted-foreground mt-3">{p.description}</p>
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Progresso</span>
                  <span>{p.progress}%</span>
                </div>
                <Progress value={p.progress} className="h-2" />
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                {format(p.startDate, "dd/MM")} – {format(p.endDate, "dd/MM/yyyy")}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Projeto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>ID</Label>
              <Input value="Gerado automaticamente" readOnly disabled className="mt-1.5" />
            </div>
            <div>
              <Label>Nome</Label>
              <Input placeholder="Nome do projeto" className="mt-1.5" value={fName} onChange={(e) => setFName(e.target.value)} />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea placeholder="Descreva o projeto..." className="mt-1.5" value={fDesc} onChange={(e) => setFDesc(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data início</Label>
                <Input type="date" className="mt-1.5" value={fStart} onChange={(e) => setFStart(e.target.value)} />
              </div>
              <div>
                <Label>Data fim</Label>
                <Input type="date" className="mt-1.5" value={fEnd} onChange={(e) => setFEnd(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Responsável</Label>
              <Select value={fResp} onValueChange={setFResp}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Usar modelo</Label>
              <Select value={fTemplate} onValueChange={setFTemplate}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">As etapas e tarefas do modelo serão copiadas.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate}>Criar Projeto</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProjectActions({ project }: { project: Project }) {
  const { duplicateProject, archiveProject, updateProject, saveProjectAsTemplate, profiles } = useApp();
  const { isAdmin } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState(project.name);
  const [editDesc, setEditDesc] = useState(project.description);
  const [editStart, setEditStart] = useState(project.startDate ? format(project.startDate, "yyyy-MM-dd") : "");
  const [editEnd, setEditEnd] = useState(project.endDate ? format(project.endDate, "yyyy-MM-dd") : "");
  const [editResp, setEditResp] = useState(project.responsible || "none");
  const [editStatus, setEditStatus] = useState<ProjectStatus>(project.status);

  const handleEdit = () => {
    updateProject(project.id, {
      name: editName,
      description: editDesc,
      status: editStatus,
      startDate: editStart ? new Date(editStart) : undefined,
      endDate: editEnd ? new Date(editEnd) : undefined,
      responsible: editResp !== "none" ? editResp : undefined,
    });
    setEditOpen(false);
  };

  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {isAdmin && (
          <DropdownMenuItem onClick={() => { 
            setEditName(project.name); 
            setEditDesc(project.description); 
            setEditStart(project.startDate ? format(project.startDate, "yyyy-MM-dd") : "");
            setEditEnd(project.endDate ? format(project.endDate, "yyyy-MM-dd") : "");
            setEditResp(project.responsible || "none");
            setEditStatus(project.status);
            setEditOpen(true); 
          }}>
            <Pencil className="w-4 h-4 mr-2" /> Editar
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => duplicateProject(project.id)}>
          <Copy className="w-4 h-4 mr-2" /> Duplicar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => archiveProject(project.id)}>
          <Archive className="w-4 h-4 mr-2" /> Arquivar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => saveProjectAsTemplate(project.id)}>
          <FileText className="w-4 h-4 mr-2" /> Usar como modelo
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <Dialog open={editOpen} onOpenChange={setEditOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>Editar Projeto</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div><Label>Nome</Label><Input value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1.5" /></div>
          <div><Label>Descrição</Label><Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="mt-1.5" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data início</Label>
              <Input type="date" className="mt-1.5" value={editStart} onChange={(e) => setEditStart(e.target.value)} />
            </div>
            <div>
              <Label>Data fim</Label>
              <Input type="date" className="mt-1.5" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Status</Label>
              <Select value={editStatus} onValueChange={(val: ProjectStatus) => setEditStatus(val)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries({
                    planning: "Planejamento",
                    active: "Em Andamento",
                    completed: "Concluído",
                    onhold: "Paralisado",
                  }).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Responsável</Label>
              <Select value={editResp} onValueChange={setEditResp}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
          <Button onClick={handleEdit}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}