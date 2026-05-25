import { useState, useRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Send, User, Image as ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { OSComment } from "@/contexts/ServiceOrderContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ImagePreviewModal } from "./ImagePreviewModal";

interface Props {
  comments: OSComment[];
  onAdd: (text: string, imageUrl?: string) => void;
  currentUser: string;
}

export function OSComments({ comments, onAdd, currentUser }: Props) {
  const [text, setText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        toast.error("Por favor, selecione apenas imagens.");
        return;
      }
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
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
        const path = `chat-images/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("company-assets").upload(path, selectedImage);
        if (error) {
          console.error("Erro no upload do chat-images:", error);
          throw error;
        }
        const { data } = supabase.storage.from("company-assets").getPublicUrl(path);
        uploadedUrl = data.publicUrl;
      }

      onAdd(text.trim() || "Imagem", uploadedUrl);
      setText("");
      removeImage();
    } catch (e) {
      console.error("Erro ao enviar mensagem com imagem:", e);
      toast.error("Erro ao enviar imagem ou comentário");
    } finally {
      setIsUploading(false);
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
                <p className="text-sm whitespace-pre-wrap">{c.text}</p>
                <p className={`text-[10px] mt-1 text-right ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                  {format(c.date, "dd/MM HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      
      {imagePreview && (
        <div className="mb-2 relative inline-block">
          <img src={imagePreview} alt="Preview" className="h-20 rounded-md border object-cover" />
          <button onClick={removeImage} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow-sm hover:opacity-80">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
      
      <div className="flex gap-2 items-end">
        <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageSelect} />
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