import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Cpu,
  Plus,
  Search,
  Trash2,
  Edit2,
  DollarSign,
  Info,
  CheckCircle,
  Hash,
  Monitor,
  Activity,
  Coins
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export interface CompanySystem {
  id: string;
  name: string;
  initial_balance: number;
  created_at?: string;
}

export default function Systems() {
  const { isAdmin } = useAuth();
  const [systems, setSystems] = useState<CompanySystem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // Form State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [initialBalance, setInitialBalance] = useState<number>(0);

  useEffect(() => {
    loadSystems();
  }, []);

  const loadSystems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("company_systems").select("*").order("name", { ascending: true });
      if (error) throw error;
      setSystems(data || []);
    } catch (err: any) {
      console.error("Erro ao carregar sistemas:", err);
      toast.error("Erro ao atualizar lista de sistemas.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSystem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      toast.error("Nome do sistema é obrigatório.");
      return;
    }

    const payload = {
      name,
      initial_balance: Number(initialBalance),
    };

    try {
      if (editingId) {
        const { error } = await supabase.from("company_systems").update(payload).eq("id", editingId);
        if (error) throw error;
        toast.success("Sistema atualizado com sucesso.");
      } else {
        const { error } = await supabase.from("company_systems").insert(payload);
        if (error) throw error;
        toast.success("Sistema cadastrado com sucesso.");
      }

      setIsDialogOpen(false);
      clearForm();
      loadSystems();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar sistema no banco de dados.");
    }
  };

  const handleEdit = (system: CompanySystem) => {
    setEditingId(system.id);
    setName(system.name);
    setInitialBalance(system.initial_balance);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string, sysName: string) => {
    if (confirm(`Remover permanentemente o sistema "${sysName}"?`)) {
      try {
        const { error } = await supabase.from("company_systems").delete().eq("id", id);
        if (error) throw error;
        toast.success("Sistema removido.");
        loadSystems();
      } catch (err) {
        toast.error("Erro ao excluir sistema.");
      }
    }
  };

  const clearForm = () => {
    setEditingId(null);
    setName("");
    setInitialBalance(0);
  };

  const filteredSystems = systems.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(value);
  };

  const totalInitialBalance = systems.reduce((acc, current) => acc + current.initial_balance, 0);

  return (
    <div className="container mx-auto py-8 px-4" id="systems-catalog-page">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <Cpu className="w-8 h-8 text-primary" /> Cadastro de Sistemas
          </h1>
          <p className="text-muted-foreground mt-1">
            Cadastre os sistemas que sua empresa comercializa ou gerencia e controle seus saldos iniciais.
          </p>
        </div>

        <Button
          onClick={() => {
            clearForm();
            setIsDialogOpen(true);
          }}
          className="flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> Cadastrar Sistema
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="hover:shadow-sm">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground uppercase font-semibold">Total de Sistemas</p>
                <h3 className="text-3xl font-black text-foreground mt-1">{systems.length}</h3>
              </div>
              <div className="p-3 bg-primary/10 text-primary rounded-xl">
                <Monitor className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-sm">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground uppercase font-semibold">Saldo Inicial Total</p>
                <h3 className="text-3xl font-black text-primary mt-1">{formatPrice(totalInitialBalance)}</h3>
              </div>
              <div className="p-3 bg-green-500/10 text-green-500 rounded-xl">
                <Coins className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Options */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="relative md:col-span-3">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome do sistema..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center justify-end">
          <span className="text-sm font-medium text-muted-foreground">
            Total: {filteredSystems.length} sistemas encontrados
          </span>
        </div>
      </div>

      {/* Systems List Rendering */}
      {loading ? (
        <div className="py-20 text-center animate-pulse text-muted-foreground">Carregando sistemas...</div>
      ) : filteredSystems.length === 0 ? (
        <Card className="py-12 text-center border-dashed">
          <CardContent className="space-y-4 pt-6">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
              <Cpu className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-lg">Sem Sistemas Cadastrados</p>
              <p className="text-sm text-muted-foreground">Nenhum sistema cadastrado ainda. Clique em "Cadastrar Sistema" para começar.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSystems.map((sys) => (
            <Card key={sys.id} className="relative flex flex-col hover:shadow-md transition-all border">
              <CardHeader className="pb-3 border-b">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg font-bold text-foreground">
                      {sys.name}
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-0.5 mt-1 flex items-center gap-1">
                      <Activity className="w-3.5 h-3.5 text-primary" /> Ativo
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full text-muted-foreground hover:text-primary hover:bg-muted" onClick={() => handleEdit(sys)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-50" onClick={() => handleDelete(sys.id, sys.name)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 flex-1 bg-muted/5">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-semibold">Código ID:</span>
                  <span className="font-mono text-xs">{sys.id.substring(0, 8)}...</span>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30 border-t py-4 justify-between items-center">
                <span className="text-xs text-muted-foreground">Saldo Inicial</span>
                <span className="text-xl font-black text-primary flex items-center gap-0.5">
                  {formatPrice(sys.initial_balance)}
                </span>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Cadastrar/Editar Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Sistema" : "Cadastrar Novo Sistema"}</DialogTitle>
            <DialogDescription>
              Insira o nome do sistema comercial e o saldo inicial para controle financeiro.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveSystem} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sys-name">Nome do Sistema</Label>
              <Input
                id="sys-name"
                placeholder="Ex: Me agendae, Styron ERP"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sys-balance">Saldo Inicial (R$)</Label>
              <div className="relative">
                <DollarSign className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input
                  id="sys-balance"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={initialBalance || ""}
                  onChange={(e) => setInitialBalance(Number(e.target.value))}
                  className="pl-8"
                  required
                />
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingId ? "Atualizar Sistema" : "Cadastrar Sistema"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
