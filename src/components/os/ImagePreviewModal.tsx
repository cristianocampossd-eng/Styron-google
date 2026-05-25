import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImagePreviewModalProps {
  imageUrl: string | null;
  onClose: () => void;
}

export function ImagePreviewModal({ imageUrl, onClose }: ImagePreviewModalProps) {
  if (!imageUrl) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <Button variant="ghost" className="absolute top-4 right-4 text-white" onClick={onClose}>
        <X className="w-6 h-6" />
      </Button>
      <img src={imageUrl} alt="Anexo em tamanho grande" className="max-w-full max-h-full object-contain rounded-lg" />
    </div>
  );
}
