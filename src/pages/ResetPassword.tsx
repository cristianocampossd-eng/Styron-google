import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function ResetPassword() {
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase recovery sets a session via hash
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.length < 6) return toast.error("Mínimo 6 caracteres");
    if (pwd !== confirm) return toast.error("Senhas não coincidem");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Senha redefinida! Faça login.");
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <form onSubmit={submit} className="w-full max-w-md bg-card border rounded-xl p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Redefinir senha</h1>
        {!ready && <p className="text-sm text-muted-foreground">Aguardando token de recuperação...</p>}
        <div><Label>Nova senha</Label><Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} className="mt-1.5" required minLength={6} /></div>
        <div><Label>Confirmar senha</Label><Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1.5" required minLength={6} /></div>
        <Button type="submit" className="w-full" disabled={loading || !ready}>{loading ? "Salvando..." : "Salvar nova senha"}</Button>
      </form>
    </div>
  );
}
