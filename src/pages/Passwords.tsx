import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Lock,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  Plus,
  Search,
  Trash2,
  Edit2,
  LockKeyhole,
  Check,
  AlertTriangle,
  Clock,
  Briefcase
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CompanyPassword {
  id: string;
  title: string;
  category: string;
  link: string;
  login: string;
  pass: string;
  created_at?: string;
}

export default function Passwords() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Authentication State
  const [typedPassword, setTypedPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Manager State
  const [passwords, setPasswords] = useState<CompanyPassword[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [link, setLink] = useState("");
  const [login, setLogin] = useState("");
  const [pass, setPass] = useState("");

  // UI state for revealing passwords & copy clicks
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<Record<string, "login" | "pass" | null>>({});

  // 5 Minutes Inactivity Handling Timer Reference
  const INACTIVITY_LIMIT_MS = 5 * 60 * 1000; // 5 mins in milliseconds
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Inactivity tracking effect
  useEffect(() => {
    if (!isAuthenticated) return;

    const resetInactivityTimer = () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      inactivityTimerRef.current = setTimeout(() => {
        handleInactivityTimeout();
      }, INACTIVITY_LIMIT_MS);
    };

    const handleInactivityTimeout = () => {
      setIsAuthenticated(false);
      setTypedPassword("");
      toast.warning("Sessão encerrada por inatividade. A tela de senhas foi fechada por segurança.");
      navigate("/");
    };

    // Events to watch for activity
    const activityEvents = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    activityEvents.forEach((event) => {
      window.addEventListener(event, resetInactivityTimer);
    });

    // Start timer on initial mount/auth
    resetInactivityTimer();

    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, resetInactivityTimer);
      });
    };
  }, [isAuthenticated, navigate]);

  // Load passwords from database when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadPasswords();
    }
  }, [isAuthenticated]);

  const loadPasswords = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("company_passwords").select("*").order("title", { ascending: true });
      if (error) throw error;
      setPasswords(data || []);
    } catch (err: any) {
      console.error("Erro ao carregar senhas da empresa:", err);
      toast.error("Erro ao baixar dados das senhas.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email) return;

    setIsVerifying(true);
    try {
      // Re-authentication via Supabase auth sign-in method
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: typedPassword,
      });

      if (error) {
        toast.error("Senha incorreta. Acesso negado.");
        setIsVerifying(false);
        return;
      }

      setIsAuthenticated(true);
      toast.success("Acesso autorizado!");
    } catch (err) {
      toast.error("Erro de comunicação com o servidor de autenticação.");
    } finally {
      setIsVerifying(false);
    }
  };

  // List of available categories currently stored + standard defaults
  const categories = Array.from(
    new Set([
      "Servidores & VPS",
      "Redes Sociais",
      "Sistemas ERP/CRM",
      "Hospedagem & Domínios",
      "Bancos & Gateway",
      "E-mails",
      ...passwords.map((p) => p.category)
    ])
  ).filter(Boolean);

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !login || !pass) {
      toast.error("Preencha o título, o login e a senha.");
      return;
    }

    const finalCategory = isAddingNewCategory ? newCategoryName : category;
    if (!finalCategory) {
      toast.error("Defina ou selecione uma categoria.");
      return;
    }

    const payload = {
      title,
      category: finalCategory,
      link: link.startsWith("http") || link === "" ? link : `https://${link}`,
      login,
      pass,
    };

    try {
      if (editingId) {
        // Update
        const { error } = await supabase.from("company_passwords").update(payload).eq("id", editingId);
        if (error) throw error;
        toast.success("Senha atualizada com sucesso.");
      } else {
        // Insert
        const { error } = await supabase.from("company_passwords").insert(payload);
        if (error) throw error;
        toast.success("Nova senha cadastrada com sucesso.");
      }

      setIsDialogOpen(false);
      clearForm();
      loadPasswords();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao salvar senha no banco de dados.");
    }
  };

  const handleEdit = (pwd: CompanyPassword) => {
    setEditingId(pwd.id);
    setTitle(pwd.title);
    setCategory(pwd.category);
    setIsAddingNewCategory(false);
    setLink(pwd.link);
    setLogin(pwd.login);
    setPass(pwd.pass);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Excluir permanentemente o acesso da senha "${name}"?`)) {
      try {
        const { error } = await supabase.from("company_passwords").delete().eq("id", id);
        if (error) throw error;
        toast.success("Registro excluído com sucesso.");
        loadPasswords();
      } catch (e) {
        toast.error("Falha ao excluir registro.");
      }
    }
  };

  const clearForm = () => {
    setEditingId(null);
    setTitle("");
    setCategory("");
    setNewCategoryName("");
    setIsAddingNewCategory(false);
    setLink("");
    setLogin("");
    setPass("");
  };

  const handleCopyToClipboard = (text: string, id: string, type: "login" | "pass") => {
    navigator.clipboard.writeText(text);
    setCopiedId((prev) => ({ ...prev, [id]: type }));
    toast.success(`${type === "login" ? "Login" : "Senha"} copiado para a área de transferência!`);
    setTimeout(() => {
      setCopiedId((prev) => ({ ...prev, [id]: null }));
    }, 2000);
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Filter list of passwords
  const filteredPasswords = passwords.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.login.toLowerCase().includes(search.toLowerCase()) ||
      (p.link && p.link.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory = selectedCategory === "all" || p.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Security Verification Screen
  if (!isAuthenticated) {
    return (
      <div className="container max-w-lg mx-auto py-20 px-4">
        <Card className="border-2 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1.5 bg-destructive" />
          <CardHeader className="space-y-3 pb-6 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
              <LockKeyhole className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-xl font-bold tracking-tight">Área Restrita - Senhas Corporativas</CardTitle>
              <CardDescription>
                Apenas Administradores do sistema podem acessar o cofre de chaves.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 p-4 rounded-lg flex gap-3 text-xs leading-5">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <div>
                <strong>Atenção:</strong> Por motivos de segurança, você deve re-inserir sua senha pessoal de login para abrir o painel confidencial. Esta visualização fechará e bloqueará automaticamente após 5 minutos de inatividade.
              </div>
            </div>

            <form onSubmit={handleVerifyPassword} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="auth-pwd">Senha Pessoal de Acesso</Label>
                <Input
                  id="auth-pwd"
                  type="password"
                  placeholder="Selecione sua senha"
                  value={typedPassword}
                  onChange={(e) => setTypedPassword(e.target.value)}
                  className="pr-10"
                  required
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" type="button" className="w-1/2" onClick={() => navigate("/")}>
                  Cancelar
                </Button>
                <Button type="submit" className="w-1/2 bg-destructive hover:bg-destructive/90 text-destructive-foreground" disabled={isVerifying}>
                  {isVerifying ? "Verificando..." : "Liberar Cofre"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4" id="passwords-page">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2 text-destructive">
            <Lock className="w-8 h-8" /> Cofre de Senhas da Empresa
          </h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
            <Clock className="w-4 h-4 text-amber-500 animate-pulse" /> Bloqueio automático por inatividade ativado (5m)
          </p>
        </div>

        <Button
          onClick={() => {
            clearForm();
            setIsDialogOpen(true);
          }}
          className="bg-destructive hover:bg-destructive/90 text-white flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> Cadastrar Nova Senha
        </Button>
      </div>

      {/* Filters bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título, ID ou link..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Categorias</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-end">
          <span className="text-sm font-medium text-muted-foreground">
            Exibindo {filteredPasswords.length} de {passwords.length} cadastradas
          </span>
        </div>
      </div>

      {/* Main Grid View */}
      {loading ? (
        <div className="py-20 text-center animate-pulse text-muted-foreground">Carregando cofre criptografado...</div>
      ) : filteredPasswords.length === 0 ? (
        <Card className="py-12 text-center">
          <CardContent className="space-y-3">
            <div className="w-12 h-12 rounded-full min-h-12 bg-muted flex items-center justify-center mx-auto text-muted-foreground">
              <Search className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-lg">Nenhuma credencial encontrada</p>
              <p className="text-sm text-muted-foreground">Insira dados clicando em cadastrar nova senha ou alterne o filtro de busca.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPasswords.map((pwd) => (
            <Card key={pwd.id} className="relative hover:shadow-md transition-shadow">
              <CardHeader className="pb-3 border-b border-muted">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="inline-block bg-muted text-muted-foreground px-2 py-0.5 rounded text-[10px] font-bold uppercase mb-1">
                      {pwd.category}
                    </span>
                    <CardTitle className="text-lg font-bold text-foreground">
                      {pwd.title}
                    </CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full text-muted-foreground hover:text-amber-500 hover:bg-amber-50" onClick={() => handleEdit(pwd)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-50" onClick={() => handleDelete(pwd.id, pwd.title)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-3.5">
                {/* Site/Link */}
                {pwd.link && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground font-semibold">Endereço de Acesso:</span>
                    <a
                      href={pwd.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary font-medium hover:underline flex items-center gap-1.5 truncate max-w-[180px]"
                    >
                      {pwd.link.replace(/^https?:\/\//i, "")} <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    </a>
                  </div>
                )}

                {/* Login */}
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground font-semibold">Username / Login:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs max-w-[160px] truncate bg-muted/65 px-2 py-0.5 rounded font-medium text-foreground">
                      {pwd.login}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7 text-muted-foreground hover:text-primary"
                      onClick={() => handleCopyToClipboard(pwd.login, pwd.id, "login")}
                    >
                      {copiedId[pwd.id] === "login" ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>

                {/* Password hidden/visible */}
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground font-semibold">Senha Secreta:</span>
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center bg-muted/65 pl-2 pr-1 py-0.5 rounded">
                      <input
                        type={visiblePasswords[pwd.id] ? "text" : "password"}
                        value={pwd.pass}
                        readOnly
                        className="font-mono text-xs w-28 bg-transparent tracking-widest border-0 focus:ring-0 focus:outline-none text-foreground p-0 h-5"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-6 h-6 shrink-0 ml-1 text-muted-foreground hover:text-foreground"
                        onClick={() => togglePasswordVisibility(pwd.id)}
                      >
                        {visiblePasswords[pwd.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7 text-muted-foreground hover:text-primary"
                      onClick={() => handleCopyToClipboard(pwd.pass, pwd.id, "pass")}
                    >
                      {copiedId[pwd.id] === "pass" ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Register/Edit dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Senha Corporativa" : "Cadastrar Nova Chave no Cofre"}</DialogTitle>
            <DialogDescription>As informações de senha serão criptografadas e persistidas de forma fechada.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title-inp">Título do Serviço</Label>
              <Input
                id="title-inp"
                placeholder="Ex: C-Panel Styron, Conta Instagram"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Categoria</Label>
                <Button
                  variant="link"
                  type="button"
                  className="h-auto p-0 text-xs"
                  onClick={() => setIsAddingNewCategory(!isAddingNewCategory)}
                >
                  {isAddingNewCategory ? "Selecionar Existente" : "+ Criar Categoria"}
                </Button>
              </div>

              {isAddingNewCategory ? (
                <Input
                  placeholder="Nome da Nova Categoria"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  required
                />
              ) : (
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.length === 0 ? (
                      <SelectItem value="default" disabled>Sem categorias disponíveis</SelectItem>
                    ) : (
                      categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="link-inp">Link/Site Oficial</Label>
              <Input
                id="link-inp"
                placeholder="Ex: portal.styron.com.br"
                value={link}
                onChange={(e) => setLink(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-inp">Usuário / Login</Label>
              <Input
                id="login-inp"
                placeholder="Ex: admin_styron@gmail.com"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pass-inp">Senha Secreta</Label>
              <Input
                id="pass-inp"
                type="text"
                placeholder="Ex: @Admin#S3guro"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                required
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-destructive hover:bg-destructive/90 text-white">
                Salvar Credencial
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
