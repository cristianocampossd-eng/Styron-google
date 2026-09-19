import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function PasswordSettings() {
  const [newPwd, setNewPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPwd.length < 6) return toast.error("Mínimo 6 caracteres");
    if (newPwd !== confirm) return toast.error("Senhas não coincidem");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPwd });
    setLoading(false);
    if (error) toast.error(error.message);
    else { toast.success("Senha alterada!"); setNewPwd(""); setConfirm(""); }
  };

  return (
    <form onSubmit={submit} className="bg-card rounded-xl border p-6 space-y-4 max-w-md">
      <div><Label>Nova senha</Label><Input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} className="mt-1.5" required minLength={6} /></div>
      <div><Label>Confirmar senha</Label><Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1.5" required minLength={6} /></div>
      <Button type="submit" disabled={loading}>{loading ? "Alterando..." : "Alterar senha"}</Button>
    </form>
  );
}
