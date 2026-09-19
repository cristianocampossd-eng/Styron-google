import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
      return new Response(JSON.stringify({ success: false, error: "Apenas administradores podem deletar usuários" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { userId } = body || {};
    
    if (!userId) {
      return new Response(JSON.stringify({ success: false, error: "ID do usuário não fornecido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    
    if (userId === userData.user.id) {
      return new Response(JSON.stringify({ success: false, error: "Você não pode deletar a própria conta desta forma" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Delete user from auth (this will cascade to profiles and user_roles if FK cascade is set, 
    // but we can manually delete them just in case)
    const { error: deleteErr } = await admin.auth.admin.deleteUser(userId);
    
    if (deleteErr) {
      return new Response(JSON.stringify({ success: false, error: deleteErr?.message || "Erro ao deletar do Auth" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    
    // We can also try to manually delete from profiles and roles just in case there's no ON DELETE CASCADE
    await admin.from("user_roles").delete().eq("user_id", userId);
    await admin.from("user_permissions").delete().eq("user_id", userId);
    await admin.from("profiles").delete().eq("id", userId);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
