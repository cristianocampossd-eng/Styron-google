import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useServiceOrders, type OSPriority } from "@/contexts/ServiceOrderContext";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Upload, X, Link as LinkIcon, Plus } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CreateOSModal({ open, onClose }: Props) {
  const { createOrder } = useServiceOrders();
  const { projects, profiles, getProjectCode } = useApp();
  const { user } = useAuth();
  const [projectId, setProjectId] = useState("");
  const [responsible, setResponsible] = useState("");
  const [priority, setPriority] = useState<OSPriority>("medium");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [links, setLinks] = useState<{ name: string; url: string }[]>([]);
  const [newLinkName, setNewLinkName] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => { 
    setProjectId(""); 
    setResponsible(""); 
    setPriority("medium"); 
    setTitle(""); 
    setDueDate("");
    setDescription(""); 
    setFiles([]); 
    setLinks([]);
    setNewLinkName("");
    setNewLinkUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
            const file = items[i].getAsFile();
            if (file) {
                setFiles((prev) => [...prev, file]);
                toast.success("Imagem colada da área de transferência");
            }
        }
    }
  };

  const handleCreate = async () => {
    if (!projectId || !responsible || !title) { 
      toast.error("Preencha os campos obrigatórios."); 
      return; 
    }
    
    setIsSubmitting(true);
    const loadingToast = toast.loading("Criando Ordem de Serviço...");
    
    try {
      const osId = await createOrder({ 
        projectId, 
        responsible, 
        priority, 
        title, 
        description,
        dueDate: dueDate ? new Date(dueDate + "T23:59:59") : undefined,
        attachments: files,
        externalLinks: links
      });
      
      if (osId) {
        toast.dismiss(loadingToast);
        toast.success("Ordem de Serviço criada com sucesso!");
        reset();
        onClose();
      } else {
        toast.dismiss(loadingToast);
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("Erro ao criar Ordem de Serviço.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.length) {
      const newFiles = Array.from(e.dataTransfer.files);
      setFiles((prev) => [...prev, ...newFiles]);
      toast.success(`${newFiles.length} arquivo(s) adicionado(s)`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
      toast.success(`${newFiles.length} arquivo(s) selecionado(s)`);
    }
  };

  const addLink = () => {
    if (!newLinkUrl) {
      toast.error("Insira a URL do link.");
      return;
    }
    setLinks((prev) => [...prev, { name: newLinkName || "Link Externo", url: newLinkUrl }]);
    setNewLinkName("");
    setNewLinkUrl("");
    toast.success("Link adicionado.");
  };

  const removeLink = (index: number) => {
    setLinks((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-lg">
        <DialogTitle className="sr-only">Nova Ordem de Serviço</DialogTitle>
        <DialogDescription className="sr-only">Formulário para criar uma nova ordem de serviço no sistema</DialogDescription>
        <div className="flex flex-col max-h-[80vh]">
          <DialogHeader>
            <h2 className="text-lg font-semibold leading-none tracking-tight">Nova Ordem de Serviço</h2>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-1" onPaste={handlePaste}>
            <div className="space-y-4">
              <div>
                <Label>Título *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Resumo da OS" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Projeto *</Label>
                  <Select value={projectId} onValueChange={setProjectId}>
                    <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>
                      {projects.filter((p) => p.status !== "archived").map((p) => <SelectItem key={p.id} value={p.id}>{getProjectCode(p.id)} - {p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Atribuir a *</Label>
                  <Select value={responsible} onValueChange={setResponsible}>
                    <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>
                      {profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Prioridade</Label>
                  <Select value={priority} onValueChange={(v) => setPriority(v as OSPriority)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="urgent">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Prazo de Entrega</Label>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Observação</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descreva a OS detalhadamente..." className="min-h-[100px]" />
              </div>
              <div>
                <Label>Anexos</Label>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  multiple
                  onChange={handleFileChange}
                />
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-accent/30 transition-all"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Arraste arquivos ou clique para adicionar</p>
                  <p className="text-xs text-muted-foreground mt-1">Fotos, vídeos e documentos</p>
                </div>
                {files.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {files.map((f, i) => (
                      <span key={i} className="inline-flex items-center gap-1 bg-muted text-xs px-2 py-1 rounded-lg">
                        {f.name}
                        <button onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <Label>Links (Google Drive, Youtube, etc)</Label>
                <div className="flex gap-2 mt-1">
                  <div className="flex-1 space-y-2">
                    <Input value={newLinkName} onChange={(e) => setNewLinkName(e.target.value)} placeholder="Nome do link (opcional)" className="h-8 text-xs" />
                    <Input value={newLinkUrl} onChange={(e) => setNewLinkUrl(e.target.value)} placeholder="https://..." className="h-8 text-xs" />
                  </div>
                  <Button type="button" size="icon" variant="outline" className="h-auto" onClick={addLink}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {links.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {links.map((l, i) => (
                      <span key={i} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-100 text-[10px] px-2 py-1 rounded-lg max-w-[200px]">
                        <LinkIcon className="w-3 h-3 shrink-0" />
                        <span className="truncate">{l.name}</span>
                        <button onClick={() => removeLink(i)} className="hover:text-blue-900"><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => { reset(); onClose(); }} disabled={isSubmitting}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting ? "Criando..." : "Criar OS"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
