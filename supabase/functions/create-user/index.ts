import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function genPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let p = "";
  for (let i = 0; i < 12; i++) p += chars.charAt(Math.floor(Math.random() * chars.length));
  return p + "!1";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ success: false, error: "Não autenticado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verify caller is admin
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userData.user.id);
    if (!roles?.some((r: any) => r.role === "admin")) {
      return new Response(JSON.stringify({ success: false, error: "Apenas administradores podem criar usuários" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { name, email, phone, role } = body || {};
    if (!name || !email || !role) {
      return new Response(JSON.stringify({ success: false, error: "Campos obrigatórios faltando" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!["admin", "operational"].includes(role)) {
      return new Response(JSON.stringify({ success: false, error: "Função inválida" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const tempPassword = genPassword();
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: name },
    });
    if (createErr || !created.user) {
      return new Response(JSON.stringify({ success: false, error: createErr?.message || "Erro ao criar" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const newId = created.user.id;
    // upsert profile
    await admin.from("profiles").upsert({ id: newId, name, email, phone: phone || "" });
    // Set role (replace default)
    await admin.from("user_roles").delete().eq("user_id", newId);
    await admin.from("user_roles").insert({ user_id: newId, role });

    return new Response(JSON.stringify({ success: true, userId: newId, tempPassword }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
