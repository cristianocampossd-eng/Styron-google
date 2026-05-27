import { format, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { X, UserCircle, Calendar, FolderKanban, RefreshCw, AlertTriangle, Clock, Upload, Download, Link2, Plus, ExternalLink, Image as ImageIcon, Video, FileText, Eye } from "lucide-react";
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
  const { updateStatus, reassign, addComment, editComment, requestMoreTime, respondTimeRequest, addAttachment, deleteAttachment, addExternalLink } = useServiceOrders();
  const { projects, profiles } = useApp();
  const { user } = useAuth();
  const [reassignUser, setReassignUser] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file && order) {
          setIsUploading(true);
          const loadingToast = toast.loading("Enviando anexo colado...");
          try {
            await addAttachment(order.id, [file]);
            toast.dismiss(loadingToast);
            toast.success("Imagem colada com sucesso!");
          } catch (err) {
            toast.dismiss(loadingToast);
            console.error("Erro no upload (colar):", err);
          } finally {
            setIsUploading(false);
          }
        }
      }
    }
  };

  const [linkMode, setLinkMode] = useState(false);
  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length && order) {
      setIsUploading(true);
      const loadingToast = toast.loading("Enviando anexo...");
      try {
        await addAttachment(order.id, Array.from(e.target.files));
        toast.dismiss(loadingToast);
      } catch (err) {
        toast.dismiss(loadingToast);
        console.error("Erro no upload:", err);
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

  const handleAddLink = async () => {
    if (!linkUrl) {
      toast.error("Insira a URL do link.");
      return;
    }
    await addExternalLink(order.id, linkName || "Link Externo", linkUrl);
    setLinkMode(false);
    setLinkName("");
    setLinkUrl("");
  };

  const isOverdue = order.dueDate && isPast(order.dueDate) && !isToday(order.dueDate) && !["completed", "archived"].includes(order.status);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto" onPaste={handlePaste}>
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
              <UserCircle className="w-4 h-4" /> Responsável pela OS: {getProfileName(order.creator)}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <UserCircle className="w-4 h-4" /> Atribuído a: <span className="font-semibold text-foreground">{getProfileName(order.responsible)}</span>
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
                if (!isResponsible && !isCreator) {
                  toast.error("A ação só pode ser realizada pelo responsável ou pelo criador da OS. Por favor, solicite a eles a realização da ação.");
                  return;
                }
                handleStatus("archived", "Arquivado pelo responsável");
                toast.success("OS arquivada com sucesso!");
              }}>Arquivar OS</Button>
            )}
            {order.status === "archived" && (
              <Button size="sm" variant="outline" onClick={() => {
                if (!isResponsible && !isCreator) {
                  toast.error("A ação só pode ser realizada pelo responsável ou pelo criador da OS. Por favor, solicite a eles a realização da ação.");
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
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setLinkMode(!linkMode)} disabled={isUploading}>
                      <Link2 className="w-4 h-4 mr-2" />
                      Link
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                      <Upload className="w-4 h-4 mr-2" />
                      Arquivo
                    </Button>
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileUpload} />
                </div>

                {linkMode && (
                  <div className="mb-4 bg-muted/50 p-3 rounded-lg flex flex-col gap-2">
                    <p className="text-xs font-semibold">Adicionar Link Externo</p>
                    <Input placeholder="Nome (Ex: Video Drive)" value={linkName} onChange={(e) => setLinkName(e.target.value)} className="h-8 text-xs" />
                    <Input placeholder="URL (https://...)" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} className="h-8 text-xs" />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleAddLink}>Adicionar</Button>
                      <Button size="sm" variant="outline" onClick={() => setLinkMode(false)}>Cancelar</Button>
                    </div>
                  </div>
                )}
                
                {order.attachments.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {order.attachments.map((a) => (
                      <div 
                        key={a.id} 
                        className="group rounded-xl border bg-card hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-200 p-2 flex flex-col relative cursor-pointer overflow-hidden" 
                        onClick={() => {
                          if (a.type === "image") {
                            setPreviewImage(a.url);
                          } else {
                            window.open(a.url, '_blank');
                          }
                        }}
                      >
                        <button 
                          className="absolute top-1.5 right-1.5 bg-destructive hover:bg-destructive/90 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteAttachment(order.id, a.id);
                          }}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        
                        {/* Thumbnail / Box Area */}
                        <div className="w-full h-24 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 flex items-center justify-center overflow-hidden relative border border-zinc-100 dark:border-zinc-800">
                          {a.type === "image" ? (
                            <img 
                              src={a.url} 
                              alt={a.name} 
                              referrerPolicy="no-referrer" 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" 
                            />
                          ) : a.type === "video" ? (
                            <div className="flex flex-col items-center">
                              <Video className="w-8 h-8 text-rose-500 mb-1" />
                              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Video</span>
                            </div>
                          ) : a.type === "link" ? (
                            <div className="flex flex-col items-center">
                              <Link2 className="w-8 h-8 text-blue-500 mb-1" />
                              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Link</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center">
                              <FileText className="w-8 h-8 text-zinc-500 mb-1" />
                              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Doc</span>
                            </div>
                          )}
                          
                          {/* Hover Overlay */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
                            {a.type === "link" ? (
                              <ExternalLink className="w-6 h-6 text-white" />
                            ) : a.type === "image" ? (
                              <Eye className="w-6 h-6 text-white" />
                            ) : (
                              <Download className="w-6 h-6 text-white" />
                            )}
                          </div>
                        </div>
                        
                        {/* Title Caption */}
                        <div className="px-1.5 pt-1.5 pb-0.5 flex flex-col">
                          <span className="text-[11px] text-zinc-700 dark:text-zinc-200 font-medium line-clamp-1 truncate block leading-normal pr-4" title={a.name}>
                            {a.name}
                          </span>
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
              <OSComments comments={order.comments} onAdd={(text, imageUrl, videoUrl) => addComment(order.id, text, imageUrl, videoUrl)} onEdit={(commentId, newText) => editComment(order.id, commentId, newText)} currentUser={getProfileName(currentUserId)} />
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}