import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload } from "lucide-react";

export default function CompanySettings() {
  const [id, setId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    supabase.from("company_settings").select("*").maybeSingle().then(({ data }) => {
      if (data) { setId(data.id); setName(data.name || ""); setLogoUrl(data.logo_url || ""); }
    });
  }, []);

  const save = async () => {
    setSaving(true);
    const payload: any = { name, logo_url: logoUrl };
    let res;
    if (id) res = await supabase.from("company_settings").update(payload).eq("id", id);
    else res = await supabase.from("company_settings").insert(payload);
    setSaving(false);
    if (res.error) toast.error("Erro ao salvar"); else toast.success("Empresa atualizada!");
  };

  const handleLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = `logo-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("company-assets").upload(path, file, { upsert: true });
    if (error) { toast.error("Erro no upload"); setUploading(false); return; }
    const { data } = supabase.storage.from("company-assets").getPublicUrl(path);
    setLogoUrl(data.publicUrl);
    setUploading(false);
    toast.success("Logo carregado. Clique em Salvar.");
  };

  return (
    <div className="bg-card rounded-xl border p-6 space-y-4 max-w-xl">
      <div>
        <Label>Nome da empresa</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" />
      </div>
      <div>
        <Label>Logo</Label>
        <div className="mt-1.5 flex items-center gap-4">
          {logoUrl && <img src={logoUrl} className="w-16 h-16 rounded object-cover border" alt="logo" />}
          <label className="cursor-pointer">
            <input type="file" accept="image/*" hidden onChange={handleLogo} />
            <span className="inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm hover:bg-muted">
              <Upload className="w-4 h-4" /> {uploading ? "Enviando..." : "Enviar logo"}
            </span>
          </label>
        </div>
      </div>
      <Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar alterações"}</Button>
    </div>
  );
}
