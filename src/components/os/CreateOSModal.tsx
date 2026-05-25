import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useServiceOrders, type OSPriority } from "@/contexts/ServiceOrderContext";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CreateOSModal({ open, onClose }: Props) {
  const { createOrder } = useServiceOrders();
  const { projects, profiles } = useApp();
  const { user } = useAuth();
  const [projectId, setProjectId] = useState("");
  const [responsible, setResponsible] = useState("");
  const [priority, setPriority] = useState<OSPriority>("medium");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => { 
    setProjectId(""); 
    setResponsible(""); 
    setPriority("medium"); 
    setTitle(""); 
    setDueDate("");
    setDescription(""); 
    setFiles([]); 
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCreate = () => {
    if (!projectId || !responsible || !title) { toast.error("Preencha os campos obrigatórios."); return; }
    createOrder({ 
      projectId, 
      responsible, 
      priority, 
      title, 
      description,
      dueDate: dueDate ? new Date(dueDate + "T23:59:59") : undefined,
      attachments: files
    });
    toast.success("Ordem de Serviço criada com sucesso!");
    reset();
    onClose();
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

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Ordem de Serviço</DialogTitle>
        </DialogHeader>
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
                  {projects.filter((p) => p.status !== "archived").map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Responsável *</Label>
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancelar</Button>
          <Button onClick={handleCreate}>Criar OS</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}