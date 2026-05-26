import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function FinancialCategories() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const { categories, addCategory, deleteCategory } = useApp();

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Por favor, preencha o nome da categoria.");
      return;
    }
    await addCategory(name, type);
    setName("");
    setType("expense");
    setOpen(false);
  };

  const handleDelete = async (id: string, catName: string) => {
    if (confirm(`Deseja realmente excluir a categoria "${catName}"?`)) {
      await deleteCategory(id);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" /> Nova Categoria</Button>
      </div>

      <div className="bg-card rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-4 font-medium text-muted-foreground">Nome</th>
              <th className="text-left p-4 font-medium text-muted-foreground">Tipo</th>
              <th className="text-center p-4 font-medium text-muted-foreground w-20">Ações</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="p-4 font-medium">{cat.name}</td>
                <td className="p-4">
                  <span className={cn(
                    "inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium",
                    cat.type === "income" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                  )}>
                    {cat.type === "income" ? "Receita" : "Despesa"}
                  </span>
                </td>
                <td className="p-4 text-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-50"
                    onClick={() => handleDelete(cat.id, cat.name)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) { setName(""); setType("expense"); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Categoria</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Nome</Label>
              <Input 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="Nome da categoria" 
                className="mt-1.5" 
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(val) => setType(val as "income" | "expense")}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Receita</SelectItem>
                  <SelectItem value="expense">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); setName(""); setType("expense"); }}>Cancelar</Button>
            <Button onClick={handleCreate}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}