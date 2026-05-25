import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Package,
  Plus,
  Search,
  Trash2,
  Edit2,
  Tag,
  DollarSign,
  Info,
  Archive,
  CheckCircle,
  XCircle,
  Hash,
  ShoppingBag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export interface CompanyProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  sku: string;
  category: string;
  status: "active" | "inactive";
  system_id?: string | null;
  created_at?: string;
}

export default function Products() {
  const { isAdmin } = useAuth();
  const [products, setProducts] = useState<CompanyProduct[]>([]);
  const [systems, setSystems] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSystem, setSelectedSystem] = useState("all");

  // Form State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [systemId, setSystemId] = useState<string>("none");
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  useEffect(() => {
    loadProducts();
    loadSystems();
  }, []);

  const loadSystems = async () => {
    try {
      const { data } = await supabase.from("company_systems").select("id, name").order("name", { ascending: true });
      if (data) setSystems(data);
    } catch (err) {
      console.error("Erro ao carregar sistemas:", err);
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("company_products").select("*").order("name", { ascending: true });
      if (error) throw error;
      setProducts(data || []);
    } catch (err: any) {
      console.error("Erro ao carregar produtos:", err);
      toast.error("Erro ao atualizar catálogo de produtos.");
    } finally {
      setLoading(false);
    }
  };

  const categories = Array.from(
    new Set([
      "Serviços Mensais",
      "Consultoria",
      "Licenças de Software",
      "Equipamentos",
      "Suporte Técnico",
      ...products.map((p) => p.category)
    ])
  ).filter(Boolean);

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategory = isAddingNewCategory ? newCategoryName : category;
    if (!name || price <= 0 || !finalCategory) {
      toast.error("Nome, Preço e Categoria são de preenchimento obrigatório.");
      return;
    }

    const calculatedSku = sku || `ST-${Math.floor(Math.random() * 900000 + 100000)}`;

    const payload = {
      name,
      description,
      price: Number(price),
      sku: calculatedSku,
      category: finalCategory,
      status,
      system_id: systemId === "none" ? null : systemId,
    };

    try {
      if (editingId) {
        const { error } = await supabase.from("company_products").update(payload).eq("id", editingId);
        if (error) throw error;
        toast.success("Produto atualizado com sucesso.");
      } else {
        const { error } = await supabase.from("company_products").insert(payload);
        if (error) throw error;
        toast.success("Produto cadastrado com sucesso.");
      }

      setIsDialogOpen(false);
      clearForm();
      loadProducts();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar produto no banco de dados.");
    }
  };

  const handleEdit = (prod: CompanyProduct) => {
    setEditingId(prod.id);
    setName(prod.name);
    setDescription(prod.description);
    setPrice(prod.price);
    setSku(prod.sku);
    setCategory(prod.category);
    setStatus(prod.status);
    setSystemId(prod.system_id || "none");
    setIsAddingNewCategory(false);
    setNewCategoryName("");
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string, prodName: string) => {
    if (confirm(`Remover permanentemente o produto "${prodName}" do catálogo?`)) {
      try {
        const { error } = await supabase.from("company_products").delete().eq("id", id);
        if (error) throw error;
        toast.success("Produto removido.");
        loadProducts();
      } catch (err) {
        toast.error("Erro ao excluir produto.");
      }
    }
  };

  const clearForm = () => {
    setEditingId(null);
    setName("");
    setDescription("");
    setPrice(0);
    setSku("");
    setCategory("");
    setStatus("active");
    setSystemId("none");
    setIsAddingNewCategory(false);
    setNewCategoryName("");
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = selectedCategory === "all" || p.category === selectedCategory;

    const matchesSystem =
      selectedSystem === "all" ||
      (selectedSystem === "none" && !p.system_id) ||
      p.system_id === selectedSystem;

    return matchesSearch && matchesCategory && matchesSystem;
  });

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(value);
  };

  return (
    <div className="container mx-auto py-8 px-4" id="products-catalog-page">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <Package className="w-8 h-8 text-primary" /> Catálogo de Produtos e Serviços
          </h1>
          <p className="text-muted-foreground mt-1">
            Cadastre e acompanhe os produtos que sua empresa comercializa nos fechamentos de vendas.
          </p>
        </div>

        <Button
          onClick={() => {
            clearForm();
            setIsDialogOpen(true);
          }}
          className="flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> Cadastrar Produto
        </Button>
      </div>

      {/* Filter Options */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
        <div className="relative md:col-span-5">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, código SKU, descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="md:col-span-3">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Categorias</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-2">
          <Select value={selectedSystem} onValueChange={setSelectedSystem}>
            <SelectTrigger>
              <SelectValue placeholder="Sistema" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Sistemas</SelectItem>
              {systems.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
              <SelectItem value="none">Sem Sistema</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-end md:col-span-2">
          <span className="text-sm font-medium text-muted-foreground">
            Total: {filteredProducts.length}
          </span>
        </div>
      </div>

      {/* Products List Rendering */}
      {loading ? (
        <div className="py-20 text-center animate-pulse text-muted-foreground">Carregando catálogo...</div>
      ) : filteredProducts.length === 0 ? (
        <Card className="py-12 text-center border-dashed">
          <CardContent className="space-y-4 pt-6">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
              <Package className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-lg">Catálogo Vazio</p>
              <p className="text-sm text-muted-foreground">Não encontramos itens. Cadastre produtos para começar.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((prod) => (
            <Card key={prod.id} className="relative flex flex-col hover:shadow-md transition-all border">
              <CardHeader className="pb-3 border-b">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="inline-flex items-center gap-1 bg-muted text-muted-foreground px-2 py-0.5 rounded text-[10px] font-bold uppercase mb-1">
                      <Tag className="w-3 h-3" /> {prod.category}
                    </span>
                    <CardTitle className="text-lg font-bold text-foreground">
                      {systems.find((s) => s.id === prod.system_id)
                        ? `${systems.find((s) => s.id === prod.system_id)?.name} - ${prod.name}`
                        : prod.name}
                    </CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full text-muted-foreground hover:text-primary hover:bg-muted" onClick={() => handleEdit(prod)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-50" onClick={() => handleDelete(prod.id, prod.name)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-3.5 flex-1">
                {prod.description ? (
                  <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                    {prod.description}
                  </p>
                ) : (
                  <p className="text-sm italic text-muted-foreground">Sem descrição cadastrada.</p>
                )}

                <div className="flex justify-between items-center text-xs border-t pt-3 font-mono">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5" /> Código SKU:
                  </span>
                  <span className="font-semibold">{prod.sku}</span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-semibold flex items-center gap-1">
                    💻 Sistema:
                  </span>
                  <span className="font-semibold text-primary">
                    {systems.find((s) => s.id === prod.system_id)?.name || "Nenhum"}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-semibold">Status de Venda:</span>
                  {prod.status === "active" ? (
                    <span className="text-green-600 font-semibold flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Ativo / Disponível
                    </span>
                  ) : (
                    <span className="text-red-500 font-semibold flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" /> Fora de Linha
                    </span>
                  )}
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30 border-t py-4 justify-between items-center">
                <span className="text-xs text-muted-foreground">Preço Unitário</span>
                <span className="text-xl font-black text-primary flex items-center gap-0.5">
                  {formatPrice(prod.price)}
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
            <DialogTitle>{editingId ? "Editar Informações do Produto" : "Adicionar Produto no Catálogo"}</DialogTitle>
            <DialogDescription>
              Insira o nome, categoria e valor referencial que serão vinculados à sua esteira comercial.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveProduct} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prod-name">Nome do Produto ou Serviço</Label>
              <Input
                id="prod-name"
                placeholder="Ex: Consultoria Técnica, Licença Office"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prod-desc">Descrição / Escopo comercial</Label>
              <Textarea
                id="prod-desc"
                placeholder="Detalhes sobre o produto, entrega ou suporte..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prod-price">Preço Sugerido (R$)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="prod-price"
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={price || ""}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="pl-8"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="prod-sku">Código de Referência (SKU)</Label>
                <Input
                  id="prod-sku"
                  placeholder="Gerado automaticamente se zerado"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                />
              </div>
            </div>

             <div className="space-y-2">
              {isAddingNewCategory ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="new-category">Nova Categoria</Label>
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto p-0 text-xs"
                      onClick={() => setIsAddingNewCategory(false)}
                    >
                      Selecionar Existente
                    </Button>
                  </div>
                  <Input
                    id="new-category"
                    placeholder="Digite o nome da nova categoria"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    required
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="prod-category">Categoria</Label>
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto p-0 text-xs text-primary"
                      onClick={() => {
                        setIsAddingNewCategory(true);
                        setNewCategoryName("");
                      }}
                    >
                      + Criar Nova Categoria
                    </Button>
                  </div>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger id="prod-category">
                      <SelectValue placeholder="Escolha uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Status de Venda</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo (Disponível no catálogo)</SelectItem>
                  <SelectItem value="inactive">Inativo (Bloqueado para novas vendas)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 pb-2">
              <Label htmlFor="prod-system">Sistema Vinculado</Label>
              <Select value={systemId} onValueChange={(v) => setSystemId(v)}>
                <SelectTrigger id="prod-system">
                  <SelectValue placeholder="Selecione um sistema..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum / Não aplicável</SelectItem>
                  {systems.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingId ? "Atualizar Produto" : "Adicionar ao Catálogo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
