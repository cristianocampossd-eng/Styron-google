import { useState, useRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Send, User, Image as ImageIcon, X, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { OSComment } from "@/contexts/ServiceOrderContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ImagePreviewModal } from "./ImagePreviewModal";

interface Props {
  comments: OSComment[];
  onAdd: (text: string, imageUrl?: string, videoUrl?: string) => void;
  onEdit?: (commentId: string, newText: string) => Promise<void>;
  currentUser: string;
}

export function OSComments({ comments, onAdd, onEdit, currentUser }: Props) {
  const [text, setText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [isUpdatingComment, setIsUpdatingComment] = useState(false);

  const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        toast.error("Por favor, selecione apenas imagens ou vídeos.");
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error("O arquivo selecionado é muito grande. O limite é 500MB.");
        return;
      }
      setSelectedImage(file);
      if (file.type.startsWith('image/')) {
        setImagePreview(URL.createObjectURL(file));
      } else {
        setImagePreview(null); // No preview for videos in chat input yet
      }
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSend = async () => {
    if (!text.trim() && !selectedImage) return;
    
    let uploadedUrl = undefined;
    setIsUploading(true);
    try {
      if (selectedImage) {
        const ext = selectedImage.name.split('.').pop() || 'png';
        const isVideo = selectedImage.type.startsWith('video/');
        const path = `chat-images/${crypto.randomUUID()}.${ext}`;
        
        const { error } = await supabase.storage.from("company-assets").upload(path, selectedImage, {
          resumable: true
        });
        if (error) {
          console.error("Erro no upload do chat-images:", error);
          if (error.message.includes('exceeded the maximum allowed size')) {
            toast.error("O arquivo excede o limite permitido (50MB no plano gratuito do Supabase ou limite do bucket).");
          } else {
            toast.error(`Falha no upload: ${error.message}`);
          }
          throw error;
        }
        const { data } = supabase.storage.from("company-assets").getPublicUrl(path);
        
        if (isVideo) {
          onAdd(text.trim() || "Vídeo", undefined, data.publicUrl);
        } else {
          onAdd(text.trim() || "Imagem", data.publicUrl);
        }
      } else {
        onAdd(text.trim(), undefined);
      }
      
      setText("");
      removeImage();
    } catch (e) {
      console.error("Erro ao enviar mensagem com imagem:", e);
      toast.error("Erro ao enviar imagem ou comentário");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveEdit = async (id: string) => {
    if (!editingText.trim() || !onEdit) return;
    setIsUpdatingComment(true);
    try {
      await onEdit(id, editingText);
      setEditingCommentId(null);
    } catch (e) {
      console.error("Erro ao salvar edição:", e);
    } finally {
      setIsUpdatingComment(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <ImagePreviewModal imageUrl={previewImage} onClose={() => setPreviewImage(null)} />
      <div className="flex-1 space-y-4 overflow-auto max-h-[350px] mb-3 pr-2">
        {comments.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhum comentário ainda.</p>
        )}
        {comments.map((c) => {
          const isMe = c.author === currentUser;
          const commentDate = new Date(c.date);
          const isWithinTenMinutes = (Date.now() - commentDate.getTime()) <= 10 * 60 * 1000;
          const canEdit = isMe && isWithinTenMinutes && !!onEdit;
          const isEditingThis = editingCommentId === c.id;

          return (
            <div key={c.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className={`max-w-[75%] rounded-xl px-3 py-2 ${isMe ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                <p className={`text-xs font-medium mb-1 ${isMe ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{c.author}</p>
                {c.imageUrl && (
                  <img src={c.imageUrl} alt="Anexo do chat" className="w-full max-w-[200px] rounded-md mb-2 object-cover cursor-pointer hover:opacity-90" onClick={() => setPreviewImage(c.imageUrl || null)} />
                )}
                {c.videoUrl && (
                  <video src={c.videoUrl} controls className="w-full max-w-[250px] rounded-md mb-2" />
                )}
                
                {isEditingThis ? (
                  <div className="mt-1 flex flex-col gap-1.5 w-full min-w-[180px]">
                    <Textarea
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      className="bg-background text-foreground text-sm min-h-[60px] max-h-32 resize-none"
                      disabled={isUpdatingComment}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSaveEdit(c.id);
                        } else if (e.key === "Escape") {
                          setEditingCommentId(null);
                        }
                      }}
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        className={`h-7 px-2 text-xs ${isMe ? "text-primary-foreground/90 hover:bg-primary-foreground/10 hover:text-primary-foreground" : "text-muted-foreground hover:bg-muted-foreground/10"}`}
                        onClick={() => setEditingCommentId(null)}
                        disabled={isUpdatingComment}
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        variant={isMe ? "secondary" : "default"}
                        className="h-7 px-2 text-xs font-medium"
                        onClick={() => handleSaveEdit(c.id)}
                        disabled={!editingText.trim() || isUpdatingComment}
                      >
                        {isUpdatingComment ? "Salvando..." : "Salvar"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed break-words">{c.text}</p>
                    {canEdit && (
                      <button
                        onClick={() => {
                          setEditingCommentId(c.id);
                          setEditingText(c.text);
                        }}
                        className={`text-[10px] flex items-center gap-1 font-medium mt-1 uppercase tracking-wider transition-opacity hover:opacity-100 ${
                          isMe ? "text-primary-foreground/80 opacity-70" : "text-muted-foreground opacity-60"
                        }`}
                      >
                        <Pencil className="w-2.5 h-2.5" /> Editar
                      </button>
                    )}
                  </>
                )}

                <p className={`text-[10px] mt-1 text-right ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                  {format(c.date, "dd/MM HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      
      {imagePreview ? (
        <div className="mb-2 relative inline-block">
          <img src={imagePreview} alt="Preview" className="h-20 rounded-md border object-cover" />
          <button onClick={removeImage} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow-sm hover:opacity-80">
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : selectedImage && selectedImage.type.startsWith('video/') && (
        <div className="mb-2 relative inline-block">
          <div className="h-20 w-32 rounded-md border bg-muted flex flex-col items-center justify-center text-xs text-muted-foreground gap-1">
            <span>🎥 Vídeo</span>
            <span className="truncate max-w-[90%]">{selectedImage.name}</span>
          </div>
          <button onClick={removeImage} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow-sm hover:opacity-80">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
      
      <div className="flex gap-2 items-end">
        <input type="file" accept="image/*,video/*" className="hidden" ref={fileInputRef} onChange={handleImageSelect} />
        <Button variant="outline" size="icon" className="shrink-0" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
          <ImageIcon className="w-4 h-4" />
        </Button>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escreva um comentário..."
          className="min-h-[40px] max-h-20 resize-none text-sm py-2"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          disabled={isUploading}
        />
        <Button size="icon" className="shrink-0" onClick={handleSend} disabled={(!text.trim() && !selectedImage) || isUploading}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
