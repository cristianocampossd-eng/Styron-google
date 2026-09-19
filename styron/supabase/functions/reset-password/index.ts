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
      return new Response(JSON.stringify({ success: false, error: "Apenas administradores podem redefinir senhas" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { userId } = body || {};
    if (!userId) {
      return new Response(JSON.stringify({ success: false, error: "ID do usuário não fornecido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const tempPassword = genPassword();
    const { data: updated, error: updateErr } = await admin.auth.admin.updateUserById(userId, {
      password: tempPassword,
    });

    if (updateErr || !updated.user) {
      return new Response(JSON.stringify({ success: false, error: updateErr?.message || "Erro ao redefinir a senha" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, userId, tempPassword }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
