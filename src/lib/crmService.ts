import { supabase } from "@/integrations/supabase/client";

export interface Client {
  id: string;
  contato_nome: string;
  empresa: string;
  razao_social: string;
  cpf: string;
  cnpj: string;
  inscricao_estadual: string;
  cargo: string;
  email_principal: string;
  email_secundario: string;
  telefone_principal: string;
  whatsapp: string;
  site: string;
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  pais: string;
  origem_lead: string;
  segmento: string;
  porte_empresa: string;
  qtd_funcionarios: number;
  faturamento_estimado: number;
  observacoes: string;
  status: "active" | "inactive";
  logo_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ClientActivity {
  id: string;
  client_id: string;
  opportunity_id?: string | null;
  type: "call" | "meeting" | "presentation" | "follow_up" | "demo" | "visit" | "closing";
  title: string;
  description: string;
  date: string;
  time: string;
  location?: string;
  participants: string;
  observation?: string;
  google_event_id?: string | null;
  created_at?: string;
}

export interface ClientAttachment {
  id: string;
  client_id: string;
  file_name: string;
  file_type: string;
  file_url: string;
  created_at?: string;
}

export interface ClientNote {
  id: string;
  client_id: string;
  text: string;
  created_at?: string;
}

export interface ClientTask {
  id: string;
  client_id: string;
  opportunity_id?: string | null;
  description: string;
  responsible: string;
  due_date: string;
  status: "pending" | "completed";
  created_at?: string;
}

// Memory and LocalStorage caching
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const IS_CLIENT_DB_AVAILABLE = { 
  val: !(!supabaseUrl || supabaseUrl === "https://placeholder.supabase.co" || supabaseUrl.trim() === "")
};

// Ensure local storage keys
const LOCAL_CLIENTS_KEY = "styron_crm_clients";
const LOCAL_ACTIVITIES_KEY = "styron_crm_activities";
const LOCAL_ATTACHMENTS_KEY = "styron_crm_attachments";
const LOCAL_NOTES_KEY = "styron_crm_notes";
const LOCAL_TASKS_KEY = "styron_crm_tasks";
const LOCAL_SALES_CLIENTS_MAP_KEY = "styron_crm_sales_clients_map";

// Helper keys loader
function getLocalData<T>(key: string): T[] {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

function saveLocalData<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

// Export CRM core services
export const crmService = {
  // --- CLIENTS CRUD ---
  async getClients(): Promise<Client[]> {
    if (IS_CLIENT_DB_AVAILABLE.val) {
      try {
        const { data, error } = await supabase
          .from("company_clients" as any)
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        return data as Client[];
      } catch (err: any) {
        console.warn("Supabase company_clients read failed, falling back to LocalStorage.", err?.message || err);
        IS_CLIENT_DB_AVAILABLE.val = false;
      }
    }
    return getLocalData<Client>(LOCAL_CLIENTS_KEY);
  },

  async addClient(client: Omit<Client, "id">): Promise<Client> {
    const newId = crypto.randomUUID();
    const newClient: Client = {
      ...client,
      id: newId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (IS_CLIENT_DB_AVAILABLE.val) {
      try {
        const { data, error } = await supabase
          .from("company_clients" as any)
          .insert(newClient)
          .select()
          .single();
        if (error) throw error;
        return data as Client;
      } catch (err: any) {
        console.warn("Supabase add client failed, using LocalStorage fallback.", err.message);
      }
    }

    // Fallback save
    const locals = getLocalData<Client>(LOCAL_CLIENTS_KEY);
    locals.unshift(newClient);
    saveLocalData(LOCAL_CLIENTS_KEY, locals);
    return newClient;
  },

  async updateClient(id: string, updates: Partial<Client>): Promise<Client> {
    const now = new Date().toISOString();
    
    if (IS_CLIENT_DB_AVAILABLE.val) {
      try {
        const { data, error } = await supabase
          .from("company_clients" as any)
          .update({ ...updates, updated_at: now })
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data as Client;
      } catch (err: any) {
        console.warn("Supabase update client failed, updating LocalStorage.", err.message);
      }
    }

    const locals = getLocalData<Client>(LOCAL_CLIENTS_KEY);
    const index = locals.findIndex((c) => c.id === id);
    if (index !== -1) {
      locals[index] = { ...locals[index], ...updates, updated_at: now };
      saveLocalData(LOCAL_CLIENTS_KEY, locals);
      return locals[index];
    }
    throw new Error("Client not found in fallback storage.");
  },

  async deleteClient(id: string): Promise<void> {
    if (IS_CLIENT_DB_AVAILABLE.val) {
      try {
        const { error } = await supabase.from("company_clients" as any).delete().eq("id", id);
        if (error) throw error;
      } catch (err: any) {
        console.warn("Supabase delete client failed, falling back to LocalStorage.", err.message);
      }
    }

    const locals = getLocalData<Client>(LOCAL_CLIENTS_KEY);
    const filtered = locals.filter((c) => c.id !== id);
    saveLocalData(LOCAL_CLIENTS_KEY, filtered);

    // Delete associated items
    const acts = getLocalData<ClientActivity>(LOCAL_ACTIVITIES_KEY).filter((a) => a.client_id !== id);
    saveLocalData(LOCAL_ACTIVITIES_KEY, acts);

    const atts = getLocalData<ClientAttachment>(LOCAL_ATTACHMENTS_KEY).filter((a) => a.client_id !== id);
    saveLocalData(LOCAL_ATTACHMENTS_KEY, atts);

    const notes = getLocalData<ClientNote>(LOCAL_NOTES_KEY).filter((n) => n.client_id !== id);
    saveLocalData(LOCAL_NOTES_KEY, notes);
  },

  // --- ACTIVITIES (AGENDA) CRUD ---
  async getActivities(): Promise<ClientActivity[]> {
    if (IS_CLIENT_DB_AVAILABLE.val) {
      try {
        const { data, error } = await supabase
          .from("company_client_activities" as any)
          .select("*")
          .order("date", { ascending: true })
          .order("time", { ascending: true });
        if (error) throw error;
        return data as ClientActivity[];
      } catch (err: any) {
        console.warn("Supabase activities select failed, using LocalStorage.", err?.message || err);
        IS_CLIENT_DB_AVAILABLE.val = false;
      }
    }
    return getLocalData<ClientActivity>(LOCAL_ACTIVITIES_KEY);
  },

  async addActivity(act: Omit<ClientActivity, "id">): Promise<ClientActivity> {
    const newId = crypto.randomUUID();
    const newAct: ClientActivity = {
      ...act,
      id: newId,
      created_at: new Date().toISOString(),
    };

    if (IS_CLIENT_DB_AVAILABLE.val) {
      try {
        const { data, error } = await supabase
          .from("company_client_activities" as any)
          .insert(newAct)
          .select()
          .single();
        if (error) throw error;
        return data as ClientActivity;
      } catch (err: any) {
        console.warn("Supabase add activity failed, using LocalStorage.", err.message);
      }
    }

    const locals = getLocalData<ClientActivity>(LOCAL_ACTIVITIES_KEY);
    locals.push(newAct);
    saveLocalData(LOCAL_ACTIVITIES_KEY, locals);
    return newAct;
  },

  async updateActivity(id: string, updates: Partial<ClientActivity>): Promise<ClientActivity> {
    if (IS_CLIENT_DB_AVAILABLE.val) {
      try {
        const { data, error } = await supabase
          .from("company_client_activities" as any)
          .update(updates)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data as ClientActivity;
      } catch (err: any) {
        console.warn("Supabase update activity failed, updating LocalStorage.", err.message);
      }
    }

    const locals = getLocalData<ClientActivity>(LOCAL_ACTIVITIES_KEY);
    const index = locals.findIndex((a) => a.id === id);
    if (index !== -1) {
      locals[index] = { ...locals[index], ...updates };
      saveLocalData(LOCAL_ACTIVITIES_KEY, locals);
      return locals[index];
    }
    throw new Error("Activity not found.");
  },

  async deleteActivity(id: string): Promise<void> {
    if (IS_CLIENT_DB_AVAILABLE.val) {
      try {
        const { error } = await supabase.from("company_client_activities" as any).delete().eq("id", id);
        if (error) throw error;
      } catch (err: any) {
        console.warn("Supabase delete activity failed, using LocalStorage.", err.message);
      }
    }

    const locals = getLocalData<ClientActivity>(LOCAL_ACTIVITIES_KEY);
    const filtered = locals.filter((a) => a.id !== id);
    saveLocalData(LOCAL_ACTIVITIES_KEY, filtered);
  },

  // --- ATTACHMENTS (ARQUIVOS) CRUD ---
  async getAttachments(): Promise<ClientAttachment[]> {
    if (IS_CLIENT_DB_AVAILABLE.val) {
      try {
        const { data, error } = await supabase
          .from("company_client_attachments" as any)
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        return data as ClientAttachment[];
      } catch (err: any) {
        console.warn("Supabase attachments select failed, using LocalStorage.", err?.message || err);
        IS_CLIENT_DB_AVAILABLE.val = false;
      }
    }
    return getLocalData<ClientAttachment>(LOCAL_ATTACHMENTS_KEY);
  },

  async addAttachment(att: Omit<ClientAttachment, "id">): Promise<ClientAttachment> {
    const newId = crypto.randomUUID();
    const newAtt: ClientAttachment = {
      ...att,
      id: newId,
      created_at: new Date().toISOString(),
    };

    if (IS_CLIENT_DB_AVAILABLE.val) {
      try {
        const { data, error } = await supabase
          .from("company_client_attachments" as any)
          .insert(newAtt)
          .select()
          .single();
        if (error) throw error;
        return data as ClientAttachment;
      } catch (err: any) {
        console.warn("Supabase add attachment failed, using LocalStorage.", err.message);
      }
    }

    const locals = getLocalData<ClientAttachment>(LOCAL_ATTACHMENTS_KEY);
    locals.unshift(newAtt);
    saveLocalData(LOCAL_ATTACHMENTS_KEY, locals);
    return newAtt;
  },

  async deleteAttachment(id: string): Promise<void> {
    if (IS_CLIENT_DB_AVAILABLE.val) {
      try {
        const { error } = await supabase.from("company_client_attachments" as any).delete().eq("id", id);
        if (error) throw error;
      } catch (err: any) {
        console.warn("Supabase delete attachment failed, using LocalStorage.", err.message);
      }
    }

    const locals = getLocalData<ClientAttachment>(LOCAL_ATTACHMENTS_KEY);
    const filtered = locals.filter((a) => a.id !== id);
    saveLocalData(LOCAL_ATTACHMENTS_KEY, filtered);
  },

  // --- NOTES CRUD ---
  async getNotes(): Promise<ClientNote[]> {
    if (IS_CLIENT_DB_AVAILABLE.val) {
      try {
        const { data, error } = await supabase
          .from("company_client_notes" as any)
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        return data as ClientNote[];
      } catch (err: any) {
        console.warn("Supabase notes select failed, using LocalStorage.", err?.message || err);
        IS_CLIENT_DB_AVAILABLE.val = false;
      }
    }
    return getLocalData<ClientNote>(LOCAL_NOTES_KEY);
  },

  async addNote(note: Omit<ClientNote, "id">): Promise<ClientNote> {
    const newId = crypto.randomUUID();
    const newNote: ClientNote = {
      ...note,
      id: newId,
      created_at: new Date().toISOString(),
    };

    if (IS_CLIENT_DB_AVAILABLE.val) {
      try {
        const { data, error } = await supabase
          .from("company_client_notes" as any)
          .insert(newNote)
          .select()
          .single();
        if (error) throw error;
        return data as ClientNote;
      } catch (err: any) {
        console.warn("Supabase add note failed, using LocalStorage.", err.message);
      }
    }

    const locals = getLocalData<ClientNote>(LOCAL_NOTES_KEY);
    locals.unshift(newNote);
    saveLocalData(LOCAL_NOTES_KEY, locals);
    return newNote;
  },

  async deleteNote(id: string): Promise<void> {
    if (IS_CLIENT_DB_AVAILABLE.val) {
      try {
        const { error } = await supabase.from("company_client_notes" as any).delete().eq("id", id);
        if (error) throw error;
      } catch (err: any) {
        console.warn("Supabase delete note failed, using LocalStorage.", err.message);
      }
    }

    const locals = getLocalData<ClientNote>(LOCAL_NOTES_KEY);
    const filtered = locals.filter((n) => n.id !== id);
    saveLocalData(LOCAL_NOTES_KEY, filtered);
  },

  // --- TASKS/TODOS CRUD ---
  async getTasks(): Promise<ClientTask[]> {
    return getLocalData<ClientTask>(LOCAL_TASKS_KEY);
  },

  async addTask(task: Omit<ClientTask, "id" | "status">): Promise<ClientTask> {
    const newTask: ClientTask = {
      ...task,
      id: crypto.randomUUID(),
      status: "pending",
      created_at: new Date().toISOString()
    };
    const locals = getLocalData<ClientTask>(LOCAL_TASKS_KEY);
    locals.unshift(newTask);
    saveLocalData(LOCAL_TASKS_KEY, locals);
    return newTask;
  },

  async updateTask(id: string, updates: Partial<ClientTask>): Promise<ClientTask> {
    const locals = getLocalData<ClientTask>(LOCAL_TASKS_KEY);
    const index = locals.findIndex(t => t.id === id);
    if (index !== -1) {
      locals[index] = { ...locals[index], ...updates };
      saveLocalData(LOCAL_TASKS_KEY, locals);
      return locals[index];
    }
    throw new Error("Task not found");
  },

  async deleteTask(id: string): Promise<void> {
    const locals = getLocalData<ClientTask>(LOCAL_TASKS_KEY);
    const filtered = locals.filter(t => t.id !== id);
    saveLocalData(LOCAL_TASKS_KEY, filtered);
  },

  // --- OPPORTUNITY TO CLIENT ID BINDING MAP ---
  // If the company_sales table doesn't have a column "client_id", we can store a map of sale_id -> client_id locally
  saveSaleClientBinding(saleId: string, clientId: string) {
    const map = getLocalData<{ saleId: string; clientId: string }>(LOCAL_SALES_CLIENTS_MAP_KEY);
    const filtered = map.filter((bind) => bind.saleId !== saleId);
    filtered.push({ saleId, clientId });
    saveLocalData(LOCAL_SALES_CLIENTS_MAP_KEY, filtered);
  },

  getSaleClientBinding(saleId: string): string | null {
    const map = getLocalData<{ saleId: string; clientId: string }>(LOCAL_SALES_CLIENTS_MAP_KEY);
    const bind = map.find((m) => m.saleId === saleId);
    return bind ? bind.clientId : null;
  }
};
