import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { type AppRole, type Module, isModuleAllowedForRole } from "@/lib/role";
import { toast } from "sonner";

interface Profile {
  id: string;
  name: string;
  email: string | null;
  avatar_url: string | null;
  phone?: string | null;
  blocked?: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  role: AppRole;
  permissions: Record<string, boolean>;
  canAccess: (module: Module) => boolean;
  reloadProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole>("operational");
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const email = session.user.email;
        const name = session.user.user_metadata?.full_name || null;
        setTimeout(() => {
          loadProfile(session.user.id, email ?? null, name);
          loadRole(session.user.id, email);
          loadPermissions(session.user.id);
        }, 0);
      } else {
        setProfile(null);
        setRole("operational");
        setPermissions([]);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id, session.user.email ?? null, session.user.user_metadata?.full_name || null);
        loadRole(session.user.id, session.user.email);
        loadPermissions(session.user.id);
      }
      setLoading(false);
    }).catch((err) => {
      console.error("Erro ao carregar sessão:", err);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(userId: string, email: string | null = null, name: string | null = null) {
    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
      if (error || !data) {
        const finalName = name || email?.split("@")[0] || "Usuário STYRON";
        const newProfile = {
          id: userId,
          name: finalName,
          email: email,
          phone: '',
          blocked: false,
        };
        await supabase.from("profiles").upsert(newProfile);
        setProfile({
          id: userId,
          name: finalName,
          email: email,
          avatar_url: null,
          phone: '',
          blocked: false,
        });
      } else {
        setProfile(data as Profile);
        if ((data as any).blocked) {
          toast.error("Sua conta está bloqueada. Contate o administrador.");
          await supabase.auth.signOut();
        }
      }
    } catch (e) {
      console.error("Erro ao carregar ou cadastrar perfil no Firebase:", e);
    }
  }

  async function loadRole(userId: string, email?: string) {
    try {
      const userEmail = email || session?.user?.email || user?.email;
      if (userEmail === "styronoficial@gmail.com" || userEmail === "cristianocampos.sd@gmail.com") {
        setRole("admin");
        return;
      }
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
      if (error) throw error;
      const roles = (data || []).map((r: any) => r.role);
      if (roles.includes("admin") || userEmail === "styronoficial@gmail.com" || userEmail === "cristianocampos.sd@gmail.com") setRole("admin");
      else if (roles.includes("operational")) setRole("operational");
      else setRole("user");
    } catch (e) {
      console.error("Erro ao carregar direitos/funções do Supabase:", e);
      // Fallback
      if (email === "styronoficial@gmail.com" || email === "cristianocampos.sd@gmail.com") {
        setRole("admin");
      }
    }
  }

  async function loadPermissions(userId: string) {
    try {
      const { data, error } = await supabase.from("user_permissions").select("module, granted").eq("user_id", userId);
      if (error) throw error;
      const permMap: Record<string, boolean> = {};
      (data || []).forEach((p: any) => { permMap[p.module] = p.granted; });
      setPermissions(permMap);
    } catch (e) {
      console.error("Erro ao carregar permissões do Supabase:", e);
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole("operational");
    setPermissions({});
  };

  const isAdmin = role === "admin";
  const canAccess = (module: Module) => isModuleAllowedForRole(role, module, permissions);
  const reloadProfile = async () => { if (user) await loadProfile(user.id); };

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, isAdmin, role, permissions, canAccess, reloadProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}