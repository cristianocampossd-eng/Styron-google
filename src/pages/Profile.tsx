import { useState } from "react";
import { User, Mail, Shield, LogOut, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export default function Profile() {
  const { profile, isAdmin, signOut, user, reloadProfile } = useAuth();
  const [uploading, setUploading] = useState(false);

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 500 * 1024 * 1024) {
      toast.error("O arquivo é muito grande. O limite é 500MB.");
      return;
    }

    setUploading(true);
    const path = `${user.id}/avatar-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { 
      upsert: true,
      resumable: true 
    });
    if (error) { toast.error("Erro no upload"); setUploading(false); return; }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", user.id);
    await reloadProfile();
    setUploading(false);
    toast.success("Foto atualizada!");
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6 animate-fade-in">
      <h1 className="text-2xl font-semibold tracking-tight">Meu Perfil</h1>

      <div className="bg-card rounded-xl border p-6">
        <div className="flex items-center gap-4 mb-6">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-8 h-8 text-primary" />
            </div>
          )}
          <div className="flex-1">
            <h2 className="text-lg font-semibold">{profile?.name || user?.email}</h2>
            <p className="text-sm text-muted-foreground">{isAdmin ? "Administrador(a)" : "Operacional"}</p>
            <label className="cursor-pointer mt-2 inline-block">
              <input type="file" accept="image/*" hidden onChange={handleAvatar} />
              <span className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded border hover:bg-muted">
                <Upload className="w-3 h-3" /> {uploading ? "Enviando..." : "Alterar foto"}
              </span>
            </label>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Mail className="w-5 h-5 text-muted-foreground" />
            <div><p className="text-xs text-muted-foreground">E-mail</p><p className="text-sm font-medium">{user?.email}</p></div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Shield className="w-5 h-5 text-muted-foreground" />
            <div><p className="text-xs text-muted-foreground">Função</p><p className="text-sm font-medium">{isAdmin ? "Admin" : "Operacional"}</p></div>
          </div>
        </div>

        <Button variant="outline" className="mt-6 gap-2" onClick={async () => { await signOut(); toast.success("Logout realizado!"); }}>
          <LogOut className="w-4 h-4" /> Sair
        </Button>
      </div>
    </div>
  );
}
