import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase, auth } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useApp } from "@/contexts/AppContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Lock, Unlock, Shield, KeyRound, UserCog, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface UserRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  blocked: boolean;
  role: string;
}

const MODULES = [
  { id: "dashboard", label: "Dashboard" },
  { id: "financial", label: "Financeiro" },
  { id: "settings", label: "Configurações" },
];

export default function AccountsSettings() {
  const { useLocalFallback, profiles: ctxProfiles, setProfiles } = useApp();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [permsUser, setPermsUser] = useState<UserRow | null>(null);
  const [perms, setPerms] = useState<Record<string, boolean>>({});

  // create form
  const [form, setForm] = useState({ name: "", email: "", phone: "", role: "operational" });
  const [submitting, setSubmitting] = useState(false);
  const [createdInfo, setCreatedInfo] = useState<{ email: string; password: string } | null>(null);

  // edit role form
  const [roleEditUser, setRoleEditUser] = useState<UserRow | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("operational");
  const [roleSubmitting, setRoleSubmitting] = useState(false);

  // delete user
  const [deleteUser, setDeleteUser] = useState<UserRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteUser = async () => {
    if (!deleteUser) return;
    setIsDeleting(true);

    if (useLocalFallback) {
      const updated = ctxProfiles.filter((p: any) => p.id !== deleteUser.id);
      setProfiles(updated);
      localStorage.setItem("styron_profiles", JSON.stringify(updated));
      setIsDeleting(false);
      setDeleteUser(null);
      toast.success("Usuário deletado com sucesso (modo local).");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { userId: deleteUser.id }
      });

      if (error || !data?.success) {
        toast.error("Erro ao deletar usuário: " + (error?.message || data?.error || "Desconhecido"));
      } else {
        toast.success("Usuário deletado com sucesso!");
        load();
      }
    } catch (err: any) {
      toast.error("Erro de conexão ao deletar: " + err.message);
    }
    
    setIsDeleting(false);
    setDeleteUser(null);
  };

  const openRoleEdit = (u: UserRow) => {
    setRoleEditUser(u);
    setSelectedRole(u.role);
  };

  const handleSaveRole = async () => {
    if (!roleEditUser) return;
    setRoleSubmitting(true);
    
    if (useLocalFallback) {
      const updated = ctxProfiles.map((p: any) => {
        if (p.id === roleEditUser.id) {
          return { ...p, role: selectedRole };
        }
        return p;
      });
      setProfiles(updated);
      localStorage.setItem("styron_profiles", JSON.stringify(updated));
      setRoleSubmitting(false);
      toast.success(`Função de ${roleEditUser.name} alterada para ${selectedRole === "admin" ? "Administrador" : "Operacional"} com sucesso!`);
      setRoleEditUser(null);
      return;
    }

    const { error } = await supabase.from("user_roles").upsert({
      id: roleEditUser.id,
      user_id: roleEditUser.id,
      role: selectedRole
    });
    setRoleSubmitting(false);

    if (error) {
      toast.error("Erro ao alterar função: " + (error.message || "tente de novo"));
    } else {
      toast.success(`Função de ${roleEditUser.name} alterada para ${selectedRole === "admin" ? "Administrador" : "Operacional"} com sucesso!`);
      setRoleEditUser(null);
      load();
    }
  };

  const load = async () => {
    setLoading(true);
    
    if (useLocalFallback) {
      const merged: UserRow[] = ctxProfiles.map((p: any) => ({
        id: p.id,
        name: p.name,
        email: p.email,
        phone: p.phone || "",
        blocked: !!p.blocked,
        role: p.role || "operational",
      }));
      setUsers(merged);
      setLoading(false);
      return;
    }

    const { data: profiles } = await supabase.from("profiles").select("id, name, email, phone, blocked");
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");
    const merged: UserRow[] = (profiles || []).map((p: any) => ({
      ...p,
      role: roles?.find((r: any) => r.user_id === p.id)?.role || "operational",
    }));
    setUsers(merged);
    setLoading(false);
  };
  
  useEffect(() => { load(); }, [ctxProfiles, useLocalFallback]);

  const toggleBlock = async (u: UserRow) => {
    if (useLocalFallback) {
      const updated = ctxProfiles.map((p: any) => {
        if (p.id === u.id) {
          return { ...p, blocked: !u.blocked };
        }
        return p;
      });
      setProfiles(updated);
      localStorage.setItem("styron_profiles", JSON.stringify(updated));
      toast.success(!u.blocked ? "Usuário bloqueado" : "Usuário desbloqueado");
      return;
    }

    const { error } = await supabase.from("profiles").update({ blocked: !u.blocked }).eq("id", u.id);
    if (error) return toast.error("Erro ao atualizar");
    toast.success(!u.blocked ? "Usuário bloqueado" : "Usuário desbloqueado");
    load();
  };

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    if (useLocalFallback) {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
      let pass = "";
      for (let i = 0; i < 11; i++) {
        pass += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const tempPassword = pass + "!1a";
      const newUserId = `usr-${Date.now()}`;
      const newProfile = {
        id: newUserId,
        name: form.name,
        email: form.email,
        phone: form.phone,
        blocked: false,
        role: form.role
      };
      
      const updated = [newProfile, ...ctxProfiles];
      setProfiles(updated);
      localStorage.setItem("styron_profiles", JSON.stringify(updated));
      
      setSubmitting(false);
      toast.success("Usuário criado com sucesso!");
      setCreatedInfo({ email: form.email, password: tempPassword });
      setForm({ name: "", email: "", phone: "", role: "operational" });
      setCreateOpen(false);
      return;
    }

    let success = false;
    let tempPassword = "";
    
    try {
      console.log("Tentando criar usuário via Edge Function...");
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: form,
      });
      
      if (!error && data?.success) {
        success = true;
        tempPassword = data.tempPassword;
      } else {
        console.warn("Falha no Edge Function, tentando método alternativo...", error, data?.error);
      }
    } catch (err) {
      console.warn("Remoto indisponível. Tentando método alternativo...", err);
    }
    
    if (!success) {
      console.log("Iniciando fluxo de cadastro alternativo (client-side)...");
      toast.info("Processando criação direta do usuário no Supabase...");
      
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
      
      if (!supabaseUrl || !supabaseAnonKey) {
        toast.error("Configuração do Supabase ausente nas variáveis de ambiente!");
        setSubmitting(false);
        return;
      }
      
      try {
        const { createClient } = await import("@supabase/supabase-js");
        // Criamos o cliente secundário com persistSession: false para não deslogar o administrador
        const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
          auth: { persistSession: false, autoRefreshToken: false }
        });
        
        // Geramos a senha temporária
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
        let pass = "";
        for (let i = 0; i < 11; i++) {
          pass += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        tempPassword = pass + "!1a";
        
        // Criar o usuário no authentication do Supabase
        console.log("Tentando cadastrar via tempClient.auth.signUp para o email:", form.email);
        const { data: authData, error: authError } = await tempClient.auth.signUp({
          email: form.email,
          password: tempPassword,
          options: {
            data: {
              full_name: form.name,
            }
          }
        });
        
        console.log("Resultado do signUp:", { authData, authError });
        
        if (authError) {
          throw new Error(authError.message || `Erro do Supabase Auth (Status: ${authError.status})`);
        }
        
        if (!authData?.user) {
          throw new Error("Não foi possível criar registro de autenticação (A resposta retornou sem dados de usuário. Verifique se o cadastro público/signUp está desativado no painel do Supabase, ou se este e-mail já existe).");
        }
        
        const newUserId = authData.user.id;
        
        // Aguarda 1000ms para garantir que os triggers do PostgreSQL criaram o perfil básico
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Atualiza campos adicionais (telefone) usando a sessão admin principal do app
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ phone: form.phone || "" })
          .eq("id", newUserId);
          
        if (profileError) {
          console.warn("Aviso: Erro ao definir telefone no perfil: ", profileError);
        }
        
        // Garante a inserção/substituição do perfil e função corretos
        await supabase.from("user_roles").delete().eq("user_id", newUserId);
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({ user_id: newUserId, role: form.role as "admin" | "operational" });
          
        if (roleError) {
          console.warn("Aviso: Erro ao definir função de usuário: ", roleError);
        }
        
        success = true;
      } catch (err: any) {
        toast.error("Falha ao criar usuário: " + (err.message || "erro desconhecido"));
        setSubmitting(false);
        return;
      }
    }
    
    setSubmitting(false);
    toast.success("Usuário criado com sucesso!");
    setCreatedInfo({ email: form.email, password: tempPassword });
    setForm({ name: "", email: "", phone: "", role: "operational" });
    setCreateOpen(false);
    load();
  };

  const openPerms = async (u: UserRow) => {
    setPermsUser(u);
    if (useLocalFallback) {
      const localPermsKey = `styron_perms_${u.id}`;
      const existingPerms = JSON.parse(localStorage.getItem(localPermsKey) || "{}");
      setPerms(existingPerms);
      return;
    }
    const { data } = await supabase.from("user_permissions").select("module, granted").eq("user_id", u.id);
    const map: Record<string, boolean> = {};
    (data || []).forEach((p: any) => { map[p.module] = p.granted; });
    setPerms(map);
  };

  const togglePerm = async (mod: string, val: boolean) => {
    if (!permsUser) return;
    setPerms((p) => ({ ...p, [mod]: val }));
    if (useLocalFallback) {
      const localPermsKey = `styron_perms_${permsUser.id}`;
      const existingPerms = JSON.parse(localStorage.getItem(localPermsKey) || "{}");
      existingPerms[mod] = val;
      localStorage.setItem(localPermsKey, JSON.stringify(existingPerms));
      return;
    }
    await supabase.from("user_permissions").upsert(
      { user_id: permsUser.id, module: mod, granted: val },
      { onConflict: "user_id,module" }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4 mr-2" />Cadastrar usuário</Button>
      </div>

      <div className="bg-card rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left p-3 font-medium">Nome</th>
              <th className="text-left p-3 font-medium">E-mail</th>
              <th className="text-left p-3 font-medium hidden md:table-cell">Telefone</th>
              <th className="text-left p-3 font-medium">Função</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Carregando...</td></tr>
            ) : users.map((u) => (
              <tr key={u.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="p-3 font-medium">{u.name}</td>
                <td className="p-3 text-muted-foreground">{u.email}</td>
                <td className="p-3 text-muted-foreground hidden md:table-cell">{u.phone || "-"}</td>
                <td className="p-3 capitalize">{u.role === "admin" ? "Administrador" : "Operacional"}</td>
                <td className="p-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs ${u.blocked ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                    {u.blocked ? "Bloqueado" : "Ativo"}
                  </span>
                </td>
                <td className="p-3 flex gap-1 justify-end">
                  {u.email && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        if (useLocalFallback) {
                          toast.success("Simulação: E-mail de cadastro de senha enviado!");
                          return;
                        }
                        const tid = toast.loading("Enviando e-mail de cadastro...");
                        const { error } = await supabase.auth.resetPasswordForEmail(u.email!, { redirectTo: `${window.location.origin}/reset-password` });
                        toast.dismiss(tid);
                        if (error) {
                          toast.error("Erro ao enviar e-mail: " + (error.message || "tente de novo"));
                        } else {
                          toast.success("E-mail de cadastro de senha enviado!");
                        }
                      }}
                      title="Enviar/Reenviar e-mail de cadastro de senha para este usuário"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => openRoleEdit(u)} title="Alterar função do usuário"><UserCog className="w-3.5 h-3.5 text-blue-500" /></Button>
                  <Button size="sm" variant="outline" onClick={() => openPerms(u)} title="Gerenciar permissões"><Shield className="w-3.5 h-3.5" /></Button>
                  <Button size="sm" variant="outline" onClick={() => toggleBlock(u)} title={u.blocked ? "Desbloquear" : "Bloquear"}>
                    {u.blocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setDeleteUser(u)} title="Deletar usuário">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create user dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cadastrar usuário</DialogTitle></DialogHeader>
          <form onSubmit={submitCreate} className="space-y-4 py-2">
            <div><Label>Nome</Label><Input className="mt-1.5" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div><Label>E-mail</Label><Input type="email" className="mt-1.5" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
            <div><Label>Telefone</Label><Input className="mt-1.5" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div>
              <Label>Função</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="operational">Operacional</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={submitting}>{submitting ? "Criando..." : "Criar usuário"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Created info dialog */}
      <Dialog open={!!createdInfo} onOpenChange={() => setCreatedInfo(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle><KeyRound className="inline w-4 h-4 mr-1" /> Usuário cadastrado com sucesso</DialogTitle></DialogHeader>
          <div className="space-y-2 py-2">
            <p className="text-sm">Um e-mail para cadastrar a senha foi enviado automaticamente ao usuário no endereço informado.</p>
            <p className="text-sm">Se desejar, você pode compartilhar os dados provisórios abaixo diretamente com ele:</p>
            <div className="bg-muted rounded p-3 font-mono text-sm">
              <div>E-mail: <strong>{createdInfo?.email}</strong></div>
              <div>Senha provisória: <strong>{createdInfo?.password}</strong></div>
            </div>
            <p className="text-xs text-muted-foreground">O link recebido por e-mail permite que o usuário cadastre sua senha particular com segurança.</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setCreatedInfo(null)}>Ok</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions dialog */}
      <Dialog open={!!permsUser} onOpenChange={() => setPermsUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Permissões — {permsUser?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">Conceda acesso adicional aos módulos restritos:</p>
            {MODULES.map((m) => (
              <div key={m.id} className="flex items-center justify-between border rounded-lg p-3">
                <span className="text-sm font-medium">{m.label}</span>
                <Switch checked={!!perms[m.id]} onCheckedChange={(v) => togglePerm(m.id, v)} disabled={permsUser?.role === "admin"} />
              </div>
            ))}
            {permsUser?.role === "admin" && <p className="text-xs text-muted-foreground">Administradores já possuem acesso total.</p>}
          </div>
          <DialogFooter><Button onClick={() => setPermsUser(null)}>Fechar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={!!roleEditUser} onOpenChange={() => setRoleEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle><UserCog className="inline w-4 h-4 mr-1.5 text-primary" /> Alterar Função do Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div>
              <Label>Usuário</Label>
              <div className="text-sm font-medium mt-1 bg-muted/40 p-2.5 rounded-lg border">
                {roleEditUser?.name} <span className="text-xs text-muted-foreground">({roleEditUser?.email})</span>
              </div>
            </div>
            <div>
              <Label htmlFor="edit-role-select">Nova Função</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger id="edit-role-select" className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="operational">Operacional</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {roleEditUser?.id === auth.currentUser?.uid && (
              <p className="text-xs text-amber-600 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                Atenção: Você está alterando a sua própria função. Caso se rebaixe para "Operacional", poderá perder acesso a áreas administrativas.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleEditUser(null)} disabled={roleSubmitting}>Cancelar</Button>
            <Button onClick={handleSaveRole} disabled={roleSubmitting}>
              {roleSubmitting ? "Alterando..." : "Confirmar Alteração"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive"><Trash2 className="inline w-4 h-4 mr-1.5" /> Deletar Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <p className="text-sm">
              Tem certeza que deseja deletar o usuário <strong>{deleteUser?.name}</strong>?
            </p>
            <p className="text-sm text-muted-foreground">
              Esta ação removerá o usuário do sistema e do banco de dados permanentemente, permitindo que o e-mail seja cadastrado novamente no futuro.
            </p>
            {deleteUser?.id === auth.currentUser?.uid && (
              <p className="text-xs font-semibold text-destructive mt-2">
                Aviso: Você está tentando deletar sua própria conta.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUser(null)} disabled={isDeleting}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={isDeleting}>
              {isDeleting ? "Deletando..." : "Sim, deletar usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
