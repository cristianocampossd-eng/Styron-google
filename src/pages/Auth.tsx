import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail, Lock, LogIn, User, UserPlus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [company, setCompany] = useState<{ name: string; logo_url: string | null }>({ name: "STYRON", logo_url: null });

  useEffect(() => {
    supabase.from("company_settings").select("name, logo_url").maybeSingle().then(({ data }) => {
      if (data) setCompany({ name: data.name || "STYRON", logo_url: data.logo_url || null });
    }).catch((err) => {
      console.error("Erro ao carregar configurações da empresa do Supabase:", err);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
            }
          }
        });
        if (error) throw error;
        if (data?.session) {
          toast.success("Conta criada e login realizado!");
        } else {
          toast.success("Cadastro realizado com sucesso! Verifique seu e-mail ou faça login.");
          setIsSignUp(false);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Login realizado!");
      }
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed' || err.message?.includes('operation-not-allowed')) {
        toast.error(
          "Configuração Pendente: O provedor 'E-mail/Senha' está desativado no Firebase. Ative-o na guia Authentication do Firebase Console.",
          { duration: 10000 }
        );
      } else {
        toast.error(err.message || "Erro na autenticação");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setForgotLoading(false);
    if (error) toast.error(error.message);
    else { toast.success("E-mail de redefinição enviado!"); setForgotOpen(false); setForgotEmail(""); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          {company.logo_url ? (
            <img src={company.logo_url} alt={company.name} className="w-14 h-14 rounded-2xl mx-auto mb-4 object-cover" />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
              <span className="text-primary-foreground font-bold text-2xl">{company.name.charAt(0)}</span>
            </div>
          )}
          <h1 className="text-3xl font-bold tracking-tight">{company.name}</h1>
          <p className="text-muted-foreground mt-2">
            {isSignUp ? "Crie sua conta comercial" : "Entre na sua conta"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card rounded-xl border p-6 space-y-4 shadow-sm">
          {isSignUp && (
            <div>
              <Label>Nome Completo</Label>
              <div className="relative mt-1.5">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" className="pl-9" required />
              </div>
            </div>
          )}
          <div>
            <Label>E-mail</Label>
            <div className="relative mt-1.5">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" className="pl-9" required />
            </div>
          </div>
          <div>
            <Label>Senha</Label>
            <div className="relative mt-1.5">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pl-9" required minLength={6} />
            </div>
          </div>
          {!isSignUp && (
            <div className="text-right">
              <button type="button" onClick={() => setForgotOpen(true)} className="text-xs text-primary hover:underline">Esqueci minha senha</button>
            </div>
          )}
          <Button type="submit" className="w-full gap-2 mt-2" disabled={loading}>
            {isSignUp ? (
              <>
                <UserPlus className="w-4 h-4" />
                {loading ? "Criando conta..." : "Cadastrar conta"}
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                {loading ? "Carregando..." : "Entrar"}
              </>
            )}
          </Button>

          <div className="text-center mt-4 pt-2 border-t text-sm">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                // Reset errors or fields
              }}
              className="text-xs text-muted-foreground hover:text-primary transition-colors focus:outline-none"
            >
              {isSignUp ? "Já tem uma conta? Faça Login" : "Ainda não tem conta? Cadastrar-se"}
            </button>
          </div>
        </form>
      </div>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Recuperar senha</DialogTitle></DialogHeader>
          <form onSubmit={handleForgot} className="space-y-4">
            <p className="text-sm text-muted-foreground">Informe seu e-mail e enviaremos um link para redefinir sua senha.</p>
            <div><Label>E-mail</Label><Input type="email" required className="mt-1.5" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setForgotOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={forgotLoading}>{forgotLoading ? "Enviando..." : "Enviar link"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
