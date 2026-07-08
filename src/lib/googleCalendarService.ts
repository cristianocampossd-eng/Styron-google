import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Initialize Firebase only if it hasn't been initialized yet
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

// In-memory token cache (Do NOT store access token in localStorage/sessionStorage per security mandates)
let cachedToken: string | null = null;
let cachedEmail: string | null = null;

// On load, retrieve saved email from local storage
try {
  cachedEmail = localStorage.getItem("gcal_connected_email");
} catch (e) {
  console.error("Erro ao carregar e-mail salvo do Google Agenda:", e);
}

// Synchronously sync token from Supabase if session exists on load
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session?.provider_token) {
    cachedToken = session.provider_token;
    cachedEmail = session.user?.email || null;
    if (cachedEmail) {
      localStorage.setItem("gcal_connected_email", cachedEmail);
    }
  } else if (session?.user?.user_metadata?.gcal_token) {
    cachedToken = session.user.user_metadata.gcal_token;
    cachedEmail = session.user.user_metadata.gcal_email || session.user.email || null;
    if (cachedEmail) {
      localStorage.setItem("gcal_connected_email", cachedEmail);
    }
  }
}).catch((err) => {
  console.error("Erro ao inicializar token do Google do Supabase:", err);
});

// Subscribe to auth state changes to sync token
supabase.auth.onAuthStateChange((_event, session) => {
  if (session?.provider_token) {
    cachedToken = session.provider_token;
    cachedEmail = session.user?.email || null;
    if (cachedEmail) {
      localStorage.setItem("gcal_connected_email", cachedEmail);
    }
  } else if (session?.user?.user_metadata?.gcal_token) {
    cachedToken = session.user.user_metadata.gcal_token;
    cachedEmail = session.user.user_metadata.gcal_email || session.user.email || null;
    if (cachedEmail) {
      localStorage.setItem("gcal_connected_email", cachedEmail);
    }
  } else {
    if (!session) {
      cachedToken = null;
      cachedEmail = null;
    }
  }
});

export const googleCalendarService = {
  isInitialized(): boolean {
    return !!cachedToken;
  },

  getConnectedEmail(): string | null {
    return cachedEmail;
  },

  async getAccessToken(): Promise<string | null> {
    if (cachedToken) return cachedToken;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.provider_token) {
        cachedToken = session.provider_token;
        cachedEmail = session.user?.email || null;
        if (cachedEmail) {
          localStorage.setItem("gcal_connected_email", cachedEmail);
        }
        return cachedToken;
      }

      if (session?.user?.user_metadata?.gcal_token) {
        cachedToken = session.user.user_metadata.gcal_token;
        cachedEmail = session.user.user_metadata.gcal_email || session.user.email || null;
        if (cachedEmail) {
          localStorage.setItem("gcal_connected_email", cachedEmail);
        }
        return cachedToken;
      }
    } catch (e) {
      console.error("Erro ao ler credenciais do Supabase:", e);
    }

    return null;
  },

  async connect(): Promise<{ email: string; token: string }> {
    const provider = new GoogleAuthProvider();
    // Request Google Calendar scopes for viewing and editing events
    provider.addScope("https://www.googleapis.com/auth/calendar");
    provider.addScope("https://www.googleapis.com/auth/calendar.events");
    
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential?.accessToken) {
        throw new Error("Não foi possível obter o token de acesso do Google.");
      }
      
      cachedToken = credential.accessToken;
      cachedEmail = result.user.email;
      if (cachedEmail) {
        localStorage.setItem("gcal_connected_email", cachedEmail);
      }

      // Save to Supabase User Metadata for cross-domain sync and production site capability
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.auth.updateUser({
            data: {
              gcal_token: cachedToken,
              gcal_email: cachedEmail
            }
          });
        }
      } catch (sErr) {
        console.error("Erro ao gravar token do Google no Supabase user_metadata:", sErr);
      }

      toast.success(`Conectado ao Google Agenda como ${cachedEmail}`);
      return { email: cachedEmail || "", token: cachedToken };
    } catch (error: any) {
      console.error("Erro ao conectar com Google Agenda:", error);
      toast.error("Erro ao autenticar com o Google: " + (error.message || error));
      throw error;
    }
  },

  async disconnect() {
    cachedToken = null;
    cachedEmail = null;
    try {
      localStorage.removeItem("gcal_connected_email");
    } catch (e) {
      console.error(e);
    }

    // Clear in Supabase User Metadata
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.auth.updateUser({
          data: {
            gcal_token: null,
            gcal_email: null
          }
        });
      }
    } catch (sErr) {
      console.error("Erro ao apagar token do Google do Supabase user_metadata:", sErr);
    }

    signOut(auth).catch(console.error);
    toast.success("Conta do Google Agenda desconectada.");
  },

  async createEvent(event: {
    title: string;
    description: string;
    date: string;
    time: string;
    participants: string;
    location?: string;
  }): Promise<string | null> {
    const token = await this.getAccessToken();
    if (!token) {
      toast.error("Google Agenda não está conectada ou a sessão expirou. Conecte novamente.");
      return null;
    }

    // Prepare date objects using browser local timezone
    const startDateTimeStr = `${event.date}T${event.time}:00`;
    const startDate = new Date(startDateTimeStr);
    if (isNaN(startDate.getTime())) {
      toast.error("Data ou hora inválida.");
      return null;
    }

    // Default duration: 1 hour
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    const startISO = startDate.toISOString();
    const endISO = endDate.toISOString();

    // Parse participant emails
    const attendeesList: { email: string }[] = [];
    if (event.participants) {
      const parts = event.participants.split(/[,;\s]+/);
      for (const p of parts) {
        if (p.includes("@") && p.includes(".")) {
          attendeesList.push({ email: p.trim() });
        }
      }
    }

    const body = {
      summary: event.title,
      description: event.description,
      location: event.location || "",
      start: {
        dateTime: startISO,
      },
      end: {
        dateTime: endISO,
      },
      attendees: attendeesList.length > 0 ? attendeesList : undefined,
    };

    try {
      const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error("GCal API Error:", errData);
        throw new Error(errData.error?.message || "Erro na resposta do Google");
      }

      const data = await res.json();
      return data.id || null;
    } catch (error: any) {
      console.error("Erro ao criar evento na Google Agenda:", error);
      toast.error("Erro ao sincronizar com Google Agenda: " + error.message);
      return null;
    }
  },

  async updateEvent(
    googleEventId: string,
    event: {
      title: string;
      description: string;
      date: string;
      time: string;
      participants: string;
      location?: string;
    }
  ): Promise<boolean> {
    const token = await this.getAccessToken();
    if (!token) {
      toast.error("Google Agenda não está conectada ou a sessão expirou.");
      return false;
    }

    const startDateTimeStr = `${event.date}T${event.time}:00`;
    const startDate = new Date(startDateTimeStr);
    if (isNaN(startDate.getTime())) {
      toast.error("Data ou hora inválida.");
      return false;
    }

    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    const startISO = startDate.toISOString();
    const endISO = endDate.toISOString();

    const attendeesList: { email: string }[] = [];
    if (event.participants) {
      const parts = event.participants.split(/[,;\s]+/);
      for (const p of parts) {
        if (p.includes("@") && p.includes(".")) {
          attendeesList.push({ email: p.trim() });
        }
      }
    }

    const body = {
      summary: event.title,
      description: event.description,
      location: event.location || "",
      start: {
        dateTime: startISO,
      },
      end: {
        dateTime: endISO,
      },
      attendees: attendeesList.length > 0 ? attendeesList : undefined,
    };

    try {
      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error("GCal API Error:", errData);
        throw new Error(errData.error?.message || "Erro na resposta do Google");
      }

      return true;
    } catch (error: any) {
      console.error("Erro ao atualizar evento na Google Agenda:", error);
      toast.error("Erro ao atualizar na Google Agenda: " + error.message);
      return false;
    }
  },

  async deleteEvent(googleEventId: string): Promise<boolean> {
    const token = await this.getAccessToken();
    if (!token) {
      toast.error("Google Agenda não está conectada ou a sessão expirou.");
      return false;
    }

    try {
      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 410 || res.status === 404) {
          return true; // Already deleted or gone
        }
        console.error("GCal API Error:", errData);
        throw new Error(errData.error?.message || "Erro na resposta do Google");
      }

      return true;
    } catch (error: any) {
      console.error("Erro ao deletar evento da Google Agenda:", error);
      toast.error("Erro ao deletar da Google Agenda: " + error.message);
      return false;
    }
  }
};
