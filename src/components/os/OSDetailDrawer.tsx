import { format, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { X, UserCircle, Calendar, FolderKanban, RefreshCw, AlertTriangle, Clock, Upload, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { OSStatusBadge, OSPriorityBadge } from "./OSStatusBadge";
import { OSTimeline } from "./OSTimeline";
import { OSComments } from "./OSComments";
import { useServiceOrders, type ServiceOrder, type OSStatus } from "@/contexts/ServiceOrderContext";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useState, useRef } from "react";
import { ImagePreviewModal } from "./ImagePreviewModal";

interface Props {
  order: ServiceOrder | null;
  open: boolean;
  onClose: () => void;
}

export function OSDetailDrawer({ order, open, onClose }: Props) {
  const { updateStatus, reassign, addComment, requestMoreTime, respondTimeRequest, addAttachment } = useServiceOrders();
  const { projects, profiles } = useApp();
  const { user } = useAuth();
  const [reassignUser, setReassignUser] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length && order) {
      setIsUploading(true);
      const loadingToast = toast.loading("Enviando anexo...");
      try {
        await addAttachment(order.id, Array.from(e.target.files));
        toast.dismiss(loadingToast);
        toast.success("Anexos adicionados com sucesso!");
      } catch (err) {
        toast.dismiss(loadingToast);
        toast.error("Erro ao fazer upload");
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    }
  };

  // Extension Request State
  const [extensionMode, setExtensionMode] = useState(false);
  const [extDate, setExtDate] = useState("");
  const [extJustification, setExtJustification] = useState("");

  const [creatorApproveMode, setCreatorApproveMode] = useState(false);
  const [approveDate, setApproveDate] = useState("");

  if (!order) return null;

  const project = projects.find((p) => p.id === order.projectId);
  const currentUserId = user?.id || "";
  const isCreator = order.creator === currentUserId;
  const isResponsible = order.responsible === currentUserId;

  const getProfileName = (id: string) => profiles.find((p) => p.id === id)?.name || id;

  const handleStatus = (status: OSStatus, label: string) => {
    updateStatus(order.id, status);
    toast.success(`OS marcada como "${label}"`);
  };

  const handleReassign = () => {
    if (!reassignUser) return;
    reassign(order.id, reassignUser);
    toast.success(`OS reatribuída para ${reassignUser}`);
    setReassignUser("");
  };

  const handleRequestTime = () => {
    if (!extDate || !extJustification) { toast.error("Preencha a data e justificativa"); return; }
    requestMoreTime(order.id, new Date(extDate + "T23:59:59"), extJustification);
    toast.success("Solicitação enviada");
    setExtensionMode(false);
  };

  const handleApproveExt = (approve: boolean) => {
    if (approve) {
      respondTimeRequest(order.id, "approved", approveDate ? new Date(approveDate + "T23:59:59") : undefined);
      toast.success("Prazo aprovado");
    } else {
      respondTimeRequest(order.id, "rejected");
      toast.success("Prazo rejeitado");
    }
    setCreatorApproveMode(false);
  };

  const isOverdue = order.dueDate && isPast(order.dueDate) && !isToday(order.dueDate) && !["completed", "archived"].includes(order.status);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg">{order.number}</SheetTitle>
          </div>
          <p className="text-base font-medium mt-1">{order.title}</p>
          <div className="flex gap-2 mt-2">
            <OSStatusBadge status={order.status} />
            <OSPriorityBadge priority={order.priority} />
            {isOverdue && (
              <span className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                <AlertTriangle className="w-3 h-3" /> Atrasada
              </span>
            )}
          </div>
        </SheetHeader>

        <div className="py-4 space-y-4">
          <ImagePreviewModal imageUrl={previewImage} onClose={() => setPreviewImage(null)} />
          {/* Meta info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FolderKanban className="w-4 h-4" /> {project?.name}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4" /> {format(order.createdAt, "dd/MM/yyyy", { locale: ptBR })}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <UserCircle className="w-4 h-4" /> Criador: {getProfileName(order.creator)}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <UserCircle className="w-4 h-4" /> Atribuído para: <span className="font-semibold text-foreground">{getProfileName(order.responsible)}</span>
            </div>
            {order.dueDate && (
              <div className={`col-span-2 flex items-center gap-2 font-medium ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
                <Clock className="w-4 h-4" /> Prazo de Entrega: {format(order.dueDate, "dd/MM/yyyy", { locale: ptBR })}
              </div>
            )}
          </div>

          {/* Extension Request UI */}
          {order.deadlineExtensionRequest && order.deadlineExtensionRequest.status === "pending" && (
            <div className="bg-orange-50 border border-orange-200 dark:bg-orange-950/20 dark:border-orange-900/50 p-3 rounded-lg text-sm space-y-2">
              <p className="font-semibold text-orange-800 dark:text-orange-300">Solicitação de Prazo Pendente</p>
              <p className="text-orange-700 dark:text-orange-400">Nova data solicitada: {format(order.deadlineExtensionRequest.requestedDate, "dd/MM/yyyy")}</p>
              <p className="text-orange-700 dark:text-orange-400">Justificativa: {order.deadlineExtensionRequest.justification}</p>
              
              {isCreator && !creatorApproveMode && (
                <div className="flex gap-2 mt-2">
                  <Button size="sm" onClick={() => setCreatorApproveMode(true)}>Avaliar</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleApproveExt(false)}>Rejeitar</Button>
                </div>
              )}
              {creatorApproveMode && isCreator && (
                <div className="flex flex-col gap-2 mt-2">
                  <p className="text-xs text-orange-800 dark:text-orange-300">Data de Aprovação (Opcional - deixe em branco para aceitar a data sugerida)</p>
                  <Input type="date" value={approveDate} onChange={(e) => setApproveDate(e.target.value)} className="h-8" />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleApproveExt(true)}>Aprovar com Data</Button>
                    <Button size="sm" variant="outline" onClick={() => setCreatorApproveMode(false)}>Cancelar</Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {extensionMode ? (
            <div className="bg-muted/50 p-3 rounded-lg space-y-3">
              <p className="text-sm font-medium">Solicitar Mais Prazo</p>
              <Input type="date" value={extDate} onChange={(e) => setExtDate(e.target.value)} />
              <Input placeholder="Justificativa..." value={extJustification} onChange={(e) => setExtJustification(e.target.value)} />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleRequestTime}>Enviar Solicitação</Button>
                <Button size="sm" variant="outline" onClick={() => setExtensionMode(false)}>Cancelar</Button>
              </div>
            </div>
          ) : (
            isResponsible && !["completed", "archived"].includes(order.status) && order.dueDate && (!order.deadlineExtensionRequest || order.deadlineExtensionRequest.status !== "pending") && (
              <Button size="sm" variant="secondary" onClick={() => setExtensionMode(true)}>Solicitar mais prazo</Button>
            )
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {isResponsible && order.status === "sent" && (
              <Button size="sm" variant="outline" onClick={() => handleStatus("received", "Recebida")}>Confirmar Recebimento</Button>
            )}
            {isResponsible && order.status === "received" && (
              <Button size="sm" onClick={() => handleStatus("in_progress", "Em execução")}>Iniciar Execução</Button>
            )}
            {isResponsible && order.status === "in_progress" && (
              <>
                <Button size="sm" onClick={() => handleStatus("completed", "Concluído")}>Marcar Concluída</Button>
                <Button size="sm" variant="outline" onClick={() => handleStatus("awaiting_adjustment", "Aguardando ajuste")}>Solicitar Ajuste</Button>
              </>
            )}
            {isCreator && order.status === "awaiting_adjustment" && (
              <Button size="sm" onClick={() => handleStatus("in_progress", "Em execução")}>Reabrir Execução</Button>
            )}
            {isCreator && order.status === "completed" && (
              <>
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => { handleStatus("archived", "Aprovado"); toast.success("OS aprovada e encaminhada para arquivadas!"); }}>Aprovar (Arquivar)</Button>
                <Button size="sm" variant="outline" onClick={() => handleStatus("in_progress", "Em execução")}>Reabrir</Button>
              </>
            )}
            {order.status === "completed" && (
              <Button size="sm" variant="secondary" onClick={() => {
                if (!isResponsible) {
                  toast.error("A ação só pode ser realizada pelo responsável. Por favor, solicite a ele a realização da ação.");
                  return;
                }
                handleStatus("archived", "Arquivado pelo responsável");
                toast.success("OS arquivada com sucesso!");
              }}>Arquivar OS</Button>
            )}
            {order.status === "archived" && (
              <Button size="sm" variant="outline" onClick={() => {
                if (!isResponsible) {
                  toast.error("A ação só pode ser realizada pelo responsável. Por favor, solicite a ele a realização da ação.");
                  return;
                }
                handleStatus("completed", "Desarquivado pelo responsável");
                toast.success("OS desarquivada com sucesso!");
              }}>Desarquivar OS</Button>
            )}
          </div>

          {/* Reassign */}
          {isCreator && !["completed", "archived"].includes(order.status) && (
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Reatribuir</p>
                <Select value={reassignUser} onValueChange={setReassignUser}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecionar usuário" /></SelectTrigger>
                  <SelectContent>
                    {profiles.filter((p) => p.id !== order.responsible).map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" variant="secondary" onClick={handleReassign} disabled={!reassignUser}>Reatribuir</Button>
            </div>
          )}

          <Tabs defaultValue="description" className="mt-4">
            <TabsList className="w-full">
              <TabsTrigger value="description" className="flex-1">Descrição</TabsTrigger>
              <TabsTrigger value="timeline" className="flex-1">Timeline</TabsTrigger>
              <TabsTrigger value="comments" className="flex-1">Chat</TabsTrigger>
            </TabsList>
            <TabsContent value="description" className="mt-3">
              <p className="text-sm text-muted-foreground leading-relaxed">{order.description}</p>
              
              <div className="mt-6 border-t pt-4">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-medium">Anexos ({order.attachments.length})</p>
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                    <Upload className="w-4 h-4 mr-2" />
                    {isUploading ? "Enviando..." : "Adicionar Arquivo"}
                  </Button>
                  <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileUpload} />
                </div>
                
                {order.attachments.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {order.attachments.map((a) => (
                      <div key={a.id} className="group rounded-lg border bg-muted/30 p-3 flex flex-col items-center justify-center text-center hover:bg-muted transition-colors relative cursor-pointer" onClick={() => a.type.startsWith("image") ? setPreviewImage(a.url) : window.open(a.url, '_blank')}>
                        <div className="mb-2">
                          {a.type.startsWith("image") ? "📷" : a.type.startsWith("video") ? "🎥" : "📎"}
                        </div>
                        <span className="text-xs text-foreground font-medium line-clamp-1 break-all px-1 max-w-full" title={a.name}>{a.name}</span>
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                          <Download className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 border border-dashed rounded-lg bg-muted/10">
                    <p className="text-sm text-muted-foreground">Nenhum anexo adicionado.</p>
                  </div>
                )}
              </div>
            </TabsContent>
            <TabsContent value="timeline" className="mt-3">
              <OSTimeline entries={order.timeline} />
            </TabsContent>
            <TabsContent value="comments" className="mt-3">
              <OSComments comments={order.comments} onAdd={(text, imageUrl) => addComment(order.id, text, imageUrl)} currentUser={getProfileName(currentUserId)} />
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}