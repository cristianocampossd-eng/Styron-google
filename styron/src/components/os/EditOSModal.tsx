import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useServiceOrders, type ServiceOrder, type OSPriority } from "@/contexts/ServiceOrderContext";
import { useApp } from "@/contexts/AppContext";
import { format } from "date-fns";
import { toast } from "sonner";

const cleanOSNumber = (num: string) => {
  if (!num) return "";
  const match = num.match(/(OS[-_]?\d+)/i);
  return match ? match[1].toUpperCase() : num;
};

interface Props {
  order: ServiceOrder | null;
  open: boolean;
  onClose: () => void;
}

export function EditOSModal({ order, open, onClose }: Props) {
  const { updateOrder } = useServiceOrders();
  const { projects, profiles, getProjectCode } = useApp();

  const [projectId, setProjectId] = useState("");
  const [responsible, setResponsible] = useState("");
  const [priority, setPriority] = useState<OSPriority>("medium");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (order) {
      setProjectId(order.projectId || "");
      setResponsible(order.responsible || "");
      setPriority(order.priority || "medium");
      setTitle(order.title || "");
      setDueDate(order.dueDate ? format(order.dueDate, "yyyy-MM-dd") : "");
      setDescription(order.description || "");
    }
  }, [order, open]);

  if (!order) return null;

  const handleUpdate = async () => {
    if (!projectId || !responsible || !title) {
      toast.error("Preencha os campos obrigatórios (Título, Projeto, Atribuir a).");
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading("Salvando alterações da Ordem de Serviço...");

    try {
      await updateOrder(order.id, {
        projectId,
        responsible,
        priority,
        title,
        description,
        dueDate: dueDate ? new Date(dueDate + "T23:59:59") : undefined,
      });
      toast.dismiss(loadingToast);
      onClose();
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("Erro ao atualizar Ordem de Serviço.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent id="edit-os-modal-content" className="max-w-lg">
        <DialogTitle className="sr-only">Editar Ordem de Serviço {cleanOSNumber(order.number)}</DialogTitle>
        <DialogDescription className="sr-only">Formulário para edição dos dados da Ordem de Serviço</DialogDescription>
        <div className="flex flex-col max-h-[80vh]">
          <DialogHeader>
            <h2 className="text-lg font-semibold leading-none tracking-tight">Editar Ordem de Serviço {cleanOSNumber(order.number)}</h2>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-1 mt-2">
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-os-title">Título *</Label>
                <Input
                  id="edit-os-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Resumo da OS"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="edit-os-project">Projeto *</Label>
                  <Select value={projectId} onValueChange={setProjectId}>
                    <SelectTrigger id="edit-os-project-trigger">
                      <SelectValue placeholder="Selecionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects
                        .filter((p) => p.status !== "archived" || p.id === order.projectId)
                        .map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {getProjectCode ? `${getProjectCode(p.id)} - ` : ""}{p.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="edit-os-responsible">Atribuir a *</Label>
                  <Select value={responsible} onValueChange={setResponsible}>
                    <SelectTrigger id="edit-os-responsible-trigger">
                      <SelectValue placeholder="Selecionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="edit-os-priority">Prioridade</Label>
                  <Select value={priority} onValueChange={(v) => setPriority(v as OSPriority)}>
                    <SelectTrigger id="edit-os-priority-trigger">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="urgent">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="edit-os-duedate">Prazo de Entrega</Label>
                  <Input
                    id="edit-os-duedate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit-os-description">Observação / Descrição</Label>
                <Textarea
                  id="edit-os-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva a OS detalhadamente..."
                  className="min-h-[100px]"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4 pt-2 border-t flex gap-2 justify-end">
            <Button id="btn-cancel-edit-os" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button id="btn-submit-edit-os" onClick={handleUpdate} disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
