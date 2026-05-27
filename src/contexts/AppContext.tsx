import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";
import { playBeepSound } from "@/lib/utils";
import {
  type Project,
  type Transaction,
  type Account,
  type Task,
  type Category,
  type Stage,
  mockProjects,
  mockAccounts,
  mockCategories,
  mockTransactions,
  people,
} from "@/data/mock";

export interface ReceivablePayable {
  id: string;
  date: Date;
  dueDate: Date;
  description: string;
  type: "income" | "expense";
  status: "pending" | "paid" | "overdue";
  recurrence: "once" | "monthly" | "weekly" | "yearly";
  value: number;
  projectId: string | null;
  categoryId: string;
  accountId: string;
}

export interface TaskMessage {
  id: string;
  taskId: string;
  author: string;
  text: string;
  date: Date;
}

export interface Notification {
  id: string;
  type: "task_message" | "task_completed" | "os";
  title: string;
  description: string;
  date: Date;
  read: boolean;
  link?: { projectId: string; taskId: string };
}

interface AppContextType {
  projects: Project[];
  templates: Project[];
  transactions: Transaction[];
  accounts: Account[];
  receivables: ReceivablePayable[];
  categories: Category[];
  taskMessages: TaskMessage[];
  notifications: Notification[];
  loading: boolean;
  profiles: { id: string; name: string; email: string | null; phone?: string | null; blocked?: boolean; role?: string }[];
  setProfiles: React.Dispatch<React.SetStateAction<{ id: string; name: string; email: string | null; phone?: string | null; blocked?: boolean; role?: string }[]>>;
  addProject: (p: Partial<Project> & { fromTemplateId?: string }) => Promise<void>;
  updateProject: (id: string, data: Partial<Project>) => Promise<void>;
  updateProjectInvestment: (id: string, value: number) => Promise<void>;
  duplicateProject: (id: string) => Promise<void>;
  saveProjectAsTemplate: (id: string) => Promise<void>;
  archiveProject: (id: string) => Promise<void>;
  updateTask: (projectId: string, taskId: string, data: Partial<Task>) => Promise<void>;
  deleteTask: (projectId: string, taskId: string) => Promise<void>;
  updateStage: (projectId: string, stageId: string, name: string) => Promise<void>;
  deleteStage: (projectId: string, stageId: string) => Promise<void>;
  addStage: (projectId: string, name: string) => Promise<void>;
  addTask: (input: { projectId: string; stageId: string; name: string; description?: string; responsibleId?: string | null; priority?: string; startDate?: Date; endDate?: Date }) => Promise<void>;
  addTransaction: (t: Omit<Transaction, "id">) => Promise<void>;
  updateTransaction: (id: string, updated: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  updateAccountBalance: (accountId: string, delta: number) => Promise<void>;
  addReceivable: (r: Omit<ReceivablePayable, "id">) => Promise<void>;
  payReceivable: (id: string, paymentData: { discount: number; interest: number; accountId: string; categoryId: string; projectId: string | null }) => Promise<void>;
  addTaskMessage: (msg: { taskId: string; author: string; text: string }) => Promise<void>;
  addNotification: (n: { type: string; title: string; description: string; userId: string; link?: string }) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  getProjectCode: (projectId: string) => string;
  refreshProjects: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
  refreshAccounts: () => Promise<void>;
  addCategory: (name: string, type: "income" | "expense") => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  deleteReceivable: (id: string) => Promise<void>;
  useLocalFallback: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [templates, setTemplates] = useState<Project[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [receivables, setReceivables] = useState<ReceivablePayable[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [taskMessages, setTaskMessages] = useState<TaskMessage[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [profiles, setProfiles] = useState<{ id: string; name: string; email: string | null; phone?: string | null; blocked?: boolean; role?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [useLocalFallback, setUseLocalFallback] = useState(false);

  // Helper to check if Supabase has required tables
  const checkSupabaseOfflineOrMissing = async (): Promise<boolean> => {
    try {
      const { error } = await supabase.from("profiles").select("id").limit(1);
      if (error && (error.code === 'PGRST205' || error.message?.includes('Could not find the table') || error.message?.includes('schema cache'))) {
        console.warn("Supabase tables are missing. Using LocalStorage fallback.");
        return true;
      }
      return false;
    } catch (e) {
      console.warn("Failed to connect to Supabase. Using LocalStorage fallback.", e);
      return true;
    }
  };

  const loadFromLocalStorage = useCallback(() => {
    // 1. Categories
    let localCats = localStorage.getItem("styron_prod_categories");
    if (!localCats) {
      localCats = JSON.stringify(mockCategories);
      localStorage.setItem("styron_prod_categories", localCats);
    }
    setCategories(JSON.parse(localCats));

    // 2. Accounts
    let localAccs = localStorage.getItem("styron_prod_accounts");
    if (!localAccs) {
      localAccs = JSON.stringify(mockAccounts);
      localStorage.setItem("styron_prod_accounts", localAccs);
    }
    const baseAccs = JSON.parse(localAccs);
    const totalBalance = baseAccs.reduce((sum: any, acc: any) => sum + acc.balance, 0);
    setAccounts([...baseAccs, { id: "total-balance-account", name: "Saldo Total", balance: totalBalance }]);


    // 3. Projects
    let localProjs = localStorage.getItem("styron_prod_projects");
    if (!localProjs) {
      localProjs = JSON.stringify(mockProjects);
      localStorage.setItem("styron_prod_projects", localProjs);
    }
    const parsedProjs = JSON.parse(localProjs).map((p: any) => ({
      ...p,
      startDate: new Date(p.startDate),
      endDate: new Date(p.endDate),
      stages: (p.stages || []).map((s: any) => ({
        ...s,
        tasks: (s.tasks || []).map((t: any) => ({
          ...t,
          startDate: new Date(t.startDate),
          endDate: new Date(t.endDate),
        }))
      }))
    }));
    setProjects(parsedProjs.filter((p: any) => !p.is_template));
    setTemplates(parsedProjs.filter((p: any) => p.is_template));

    // 4. Transactions
    let localTx = localStorage.getItem("styron_prod_transactions");
    if (!localTx) {
      localTx = JSON.stringify(mockTransactions);
      localStorage.setItem("styron_prod_transactions", localTx);
    }
    setTransactions(JSON.parse(localTx).map((t: any) => ({
      ...t,
      date: new Date(t.date)
    })));

    // 5. Receivables
    let localRec = localStorage.getItem("styron_prod_receivables");
    if (!localRec) {
      const initialReceivables = [
        {
          id: "rec1",
          date: new Date(),
          dueDate: new Date(Date.now() + 5 * 86400000),
          description: "Serviço de Desenvolvimento App",
          type: "income",
          status: "pending",
          recurrence: "once",
          value: 12000,
          projectId: "p1",
          categoryId: "cat6",
          accountId: "acc1"
        },
        {
          id: "rec2",
          date: new Date(),
          dueDate: new Date(Date.now() + 10 * 86400000),
          description: "Servidor Mensal Heroku",
          type: "expense",
          status: "pending",
          recurrence: "monthly",
          value: 350,
          projectId: null,
          categoryId: "cat3",
          accountId: "acc2"
        }
      ];
      localRec = JSON.stringify(initialReceivables);
      localStorage.setItem("styron_prod_receivables", localRec);
    }
    setReceivables(JSON.parse(localRec).map((r: any) => ({
      ...r,
      date: new Date(r.date),
      dueDate: new Date(r.dueDate)
    })));

    // 6. Profiles
    let localProfiles = localStorage.getItem("styron_prod_profiles");
    if (!localProfiles) {
      const initialProfiles = people.map((p, index) => ({
        id: `usr-${index + 1}`,
        name: p,
        email: `${p.toLowerCase().replace(/ /g, ".")}@styron.com.br`
      }));
      if (user) {
        initialProfiles.unshift({
          id: user.id,
          name: profile?.name || user.email?.split("@")[0] || "Administrador",
          email: user.email || ""
        });
      }
      localProfiles = JSON.stringify(initialProfiles);
      localStorage.setItem("styron_prod_profiles", localProfiles);
    }
    let parsedProfiles = JSON.parse(localProfiles);
    setProfiles(parsedProfiles.filter((p: any) => p.email !== "styronoficial@gmail.com" && p.email !== "styron@gmail.com"));

    // 7. Notifications
    let localNotifs = localStorage.getItem("styron_prod_notifications") || "[]";
    setNotifications(JSON.parse(localNotifs).map((n: any) => ({
      ...n,
      date: new Date(n.date)
    })));
  }, [user, profile]);

  // Sync state to localStorage if fallback mode is active
  useEffect(() => {
    if (useLocalFallback) {
      const allProjects = [...projects, ...templates];
      localStorage.setItem("styron_prod_projects", JSON.stringify(allProjects));
    }
  }, [projects, templates, useLocalFallback]);

  useEffect(() => {
    if (useLocalFallback) {
      localStorage.setItem("styron_prod_transactions", JSON.stringify(transactions));
    }
  }, [transactions, useLocalFallback]);

  useEffect(() => {
    if (useLocalFallback) {
      localStorage.setItem("styron_prod_accounts", JSON.stringify(accounts));
    }
  }, [accounts, useLocalFallback]);

  useEffect(() => {
    if (useLocalFallback) {
      localStorage.setItem("styron_prod_categories", JSON.stringify(categories));
    }
  }, [categories, useLocalFallback]);

  useEffect(() => {
    if (useLocalFallback) {
      localStorage.setItem("styron_prod_receivables", JSON.stringify(receivables));
    }
  }, [receivables, useLocalFallback]);

  useEffect(() => {
    if (useLocalFallback) {
      localStorage.setItem("styron_prod_notifications", JSON.stringify(notifications));
    }
  }, [notifications, useLocalFallback]);

  useEffect(() => {
    if (useLocalFallback) {
      localStorage.setItem("styron_prod_profiles", JSON.stringify(profiles));
    }
  }, [profiles, useLocalFallback]);

  // Load all data when user is authenticated
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    loadAll();
  }, [user]);

  // Realtime for notifications
  useEffect(() => {
    if (!user || useLocalFallback) return;
    const channel = supabase
      .channel("notifications-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, (payload) => {
        loadNotifications();
        if (payload?.eventType === "INSERT") {
          playBeepSound();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, useLocalFallback]);

  async function loadAll() {
    setLoading(true);
    try {
      const fallback = await checkSupabaseOfflineOrMissing();
      setUseLocalFallback(fallback);

      if (fallback) {
        loadFromLocalStorage();
      } else {
        await Promise.all([
          loadProjects().catch((err) => console.error("Erro ao carregar projetos do Supabase:", err)),
          loadTransactions().catch((err) => console.error("Erro ao carregar transações do Supabase:", err)),
          loadAccounts().catch((err) => console.error("Erro ao carregar contas do Supabase:", err)),
          loadCategories().catch((err) => console.error("Erro ao carregar categorias do Supabase:", err)),
          loadReceivables().catch((err) => console.error("Erro ao carregar contas a ver/receber do Supabase:", err)),
          loadNotifications().catch((err) => console.error("Erro ao carregar notificações do Supabase:", err)),
          loadProfiles().catch((err) => console.error("Erro ao carregar perfis do Supabase:", err)),
        ]);
      }
    } catch (e) {
      console.error("Erro no carregamento inicial de dados:", e);
      setUseLocalFallback(true);
      loadFromLocalStorage();
    } finally {
      setLoading(false);
    }
  }

  async function loadProfiles() {
    const { data } = await supabase.from("profiles").select("id, name, email");
    if (data) {
      setProfiles(data.filter((p: any) => p.email !== "styronoficial@gmail.com" && p.email !== "styron@gmail.com"));
    }
  }

  async function loadProjects() {
    const { data: projectsData } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });

    if (!projectsData) return;

    // Load stages and tasks for each project
    const { data: stagesData } = await supabase
      .from("project_stages")
      .select("*")
      .order("order", { ascending: true });

    const { data: tasksData } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: true });

    const { data: messagesData } = await supabase
      .from("task_messages")
      .select("*")
      .order("created_at", { ascending: true });

    setTaskMessages(
      (messagesData || []).map((m: any) => ({
        id: m.id,
        taskId: m.task_id,
        author: m.sender_id,
        text: m.message,
        date: new Date(m.created_at),
      }))
    );

    const mapped: Project[] = projectsData.map((p: any) => {
      const pStages = (stagesData || []).filter((s: any) => s.project_id === p.id);
      const stages: Stage[] = pStages.map((s: any) => ({
        id: s.id,
        name: s.name,
        order: s.order,
        tasks: (tasksData || [])
          .filter((t: any) => t.stage_id === s.id)
          .map((t: any): Task => ({
            id: t.id,
            name: t.title,
            description: t.description || "",
            responsible: t.responsible_id || "",
            startDate: new Date(t.start_date || Date.now()),
            endDate: new Date(t.end_date || Date.now()),
            status: t.status as any,
            priority: t.priority as any,
            comments: [],
            dependencies: [],
          })),
      }));

      const allTasks = stages.flatMap((s) => s.tasks);
      const totalTasksCount = allTasks.length;
      const completedTasksCount = allTasks.filter((t) => t.status === "done").length;
      const calculatedProgress = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

      return {
        id: p.id,
        name: p.name,
        description: p.description || "",
        status: p.status as any,
        startDate: new Date(p.start_date || Date.now()),
        endDate: new Date(p.end_date || Date.now()),
        responsible: p.responsible_id || "",
        createdBy: p.created_by || "",
        progress: calculatedProgress,
        stages,
        project_code: p.project_code,
        initial_investment: Number(p.initial_investment || 0),
        is_template: !!p.is_template,
      };
    });

    setProjects(mapped.filter((p: any) => !p.is_template));
    setTemplates(mapped.filter((p: any) => p.is_template));
  }

  async function loadTransactions() {
    const { data } = await supabase
      .from("financial_transactions")
      .select("*")
      .order("transaction_date", { ascending: false });
    if (data) {
      setTransactions(
        data.map((t: any) => {
          let systemId = t.system_id || null;
          let affectsSystemBalance = t.affects_system_balance ?? false;
          const desc = t.description || "";
          
          // Parse format: [sys:SYSTEM_ID:y/n]
          const match = desc.match(/\[sys:([^:\s\]]+)(?::([yn]))?\]/);
          if (match) {
            if (!systemId) systemId = match[1];
            if (t.affects_system_balance === undefined || t.affects_system_balance === null) {
              affectsSystemBalance = match[2] === 'y';
            }
          }
          
          // Strip the metadata tag from the displayed description
          const cleanDesc = desc.replace(/\s*\[sys:[^\]]+\]/, "");

          return {
            id: t.id,
            type: t.type as any,
            projectId: t.project_id,
            accountId: t.account_id || "",
            categoryId: t.category_id || "",
            value: Number(t.value),
            date: new Date(t.transaction_date),
            description: cleanDesc,
            systemId,
            affectsSystemBalance,
          };
        })
      );
    }
  }

  async function loadAccounts() {
    const { data } = await supabase.from("financial_accounts").select("*").order("created_at");
    if (data) {
      const baseAccounts = data.map((a: any) => ({ id: a.id, name: a.name, balance: Number(a.balance) }));
      const totalBalance = baseAccounts.reduce((sum, acc) => sum + acc.balance, 0);
      setAccounts([...baseAccounts, { id: "total-balance-account", name: "Saldo Total", balance: totalBalance }]);
    }
  }

  async function loadCategories() {
    const { data } = await supabase.from("financial_categories").select("*").order("created_at");
    if (data) {
      setCategories(data.map((c: any) => ({ id: c.id, name: c.name, type: c.type as any })));
    }
  }

  async function loadReceivables() {
    const { data } = await supabase.from("financial_entries").select("*").order("created_at", { ascending: false });
    if (data) {
      setReceivables(
        data.map((r: any) => ({
          id: r.id,
          date: new Date(r.created_at),
          dueDate: new Date(r.due_date || r.created_at),
          description: r.description,
          type: r.type as any,
          status: r.status as any,
          recurrence: (r.recurrence || "once") as any,
          value: Number(r.value),
          projectId: r.project_id,
          categoryId: r.category_id || "",
          accountId: "",
        }))
      );
    }
  }

  async function loadNotifications() {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) {
      setNotifications(
        data.map((n: any) => ({
          id: n.id,
          type: n.type as any,
          title: n.title,
          description: n.message,
          date: new Date(n.created_at),
          read: n.read,
          link: (() => {
            if (!n.link) return undefined;
            try {
              return JSON.parse(n.link);
            } catch (e) {
              return n.link;
            }
          })(),
        }))
      );
    }
  }

  const getProjectCode = useCallback((projectId: string) => {
    const p = projects.find((proj) => proj.id === projectId);
    return (p as any)?.project_code || projectId.slice(0, 7);
  }, [projects]);

  const addProject = useCallback(async (p: Partial<Project> & { fromTemplateId?: string }) => {
    if (useLocalFallback) {
      const newProj: Project = {
        id: `proj-${Date.now()}`,
        name: p.name || "Novo Projeto",
        description: p.description || "",
        status: p.status || "planning",
        startDate: p.startDate ? new Date(p.startDate) : new Date(),
        endDate: p.endDate ? new Date(p.endDate) : new Date(Date.now() + 30 * 86400000),
        responsible: (p as any).responsible || "Ana Silva",
        createdBy: user?.id || "admin",
        progress: 0,
        stages: [],
        project_code: `PRJ-${Math.floor(1000 + Math.random() * 9000)}`,
        initial_investment: Number(p.initial_investment || 0),
        is_template: !!p.is_template,
      } as any;

      if (p.fromTemplateId) {
        const tpl = [...projects, ...templates].find((t) => t.id === p.fromTemplateId);
        if (tpl) {
          newProj.stages = tpl.stages.map((s, idx) => ({
            id: `stage-${Date.now()}-${idx}`,
            name: s.name,
            order: s.order,
            tasks: s.tasks.map((t, tIdx) => ({
              id: `task-${Date.now()}-${idx}-${tIdx}`,
              name: t.name,
              description: t.description || "",
              responsible: t.responsible || "Ana Silva",
              priority: t.priority || "medium",
              status: "todo",
              startDate: new Date(),
              endDate: new Date(Date.now() + 7 * 86400000),
              comments: [],
              dependencies: []
            }))
          }));
        }
      }

      if (newProj.is_template) {
        setTemplates((prev) => [newProj, ...prev]);
      } else {
        setProjects((prev) => [newProj, ...prev]);
      }
      toast.success("Projeto criado com sucesso!");
      return;
    }

    const { data, error } = await supabase
      .from("projects")
      .insert({
        name: p.name || "Novo Projeto",
        description: p.description || "",
        status: p.status || "planning",
        progress: p.progress || 0,
        start_date: p.startDate ? p.startDate.toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
        end_date: p.endDate ? p.endDate.toISOString().split("T")[0] : new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
        responsible_id: (p as any).responsible || user?.id || null,
        created_by: user?.id || null,
        project_code: "",
      })
      .select()
      .single();
    if (error) { toast.error("Erro ao criar projeto"); return; }
    // If created from template, copy stages and tasks (without dates)
    if (p.fromTemplateId && data) {
      const tpl = [...projects, ...templates].find((t) => t.id === p.fromTemplateId);
      if (tpl) {
        for (let i = 0; i < tpl.stages.length; i++) {
          const s = tpl.stages[i];
          const { data: newStage } = await supabase
            .from("project_stages")
            .insert({ project_id: data.id, name: s.name, order: i })
            .select()
            .single();
          if (newStage) {
            for (const t of s.tasks) {
              await supabase.from("tasks").insert({
                project_id: data.id,
                stage_id: newStage.id,
                title: t.name,
                description: t.description || "",
                priority: t.priority || "medium",
                status: "pending",
                created_by: user?.id || null,
              });
            }
          }
        }
      }
    }
    toast.success("Projeto criado com sucesso!");
    await loadProjects();
  }, [user, projects, templates, useLocalFallback]);

  const updateProject = useCallback(async (id: string, data: Partial<Project>) => {
    if (useLocalFallback) {
      const updateFn = (list: Project[]) => list.map((p) => {
        if (p.id !== id) return p;
        return {
          ...p,
          ...data,
          startDate: data.startDate ? new Date(data.startDate) : p.startDate,
          endDate: data.endDate ? new Date(data.endDate) : p.endDate,
        };
      });
      setProjects((prev) => updateFn(prev));
      setTemplates((prev) => updateFn(prev));
      toast.success("Projeto atualizado!");
      return;
    }

    const updates: any = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.description !== undefined) updates.description = data.description;
    if (data.status !== undefined) updates.status = data.status;
    if (data.progress !== undefined) updates.progress = data.progress;
    if (data.startDate) updates.start_date = data.startDate.toISOString().split("T")[0];
    if (data.endDate) updates.end_date = data.endDate.toISOString().split("T")[0];
    if ((data as any).responsible !== undefined) updates.responsible_id = (data as any).responsible;

    const { error } = await supabase.from("projects").update(updates).eq("id", id);
    if (error) { toast.error("Erro ao atualizar projeto"); return; }
    
    const proj = projects.find(p => p.id === id);
    if (proj && proj.responsible && proj.responsible !== user?.id) {
      await supabase.from("notifications").insert({
        user_id: proj.responsible,
        type: "project",
        title: "Projeto atualizado",
        message: `O projeto "${proj.name}" teve uma atualização de status ou andamento.`,
        link: JSON.stringify({ projectId: id })
      });
    }

    toast.success("Projeto atualizado!");
    await loadProjects();
  }, [useLocalFallback, projects, user]);

  const updateProjectInvestment = useCallback(async (id: string, value: number) => {
    if (useLocalFallback) {
      const updateFn = (list: Project[]) => list.map((p) => p.id === id ? { ...p, initial_investment: value } : p);
      setProjects((prev) => updateFn(prev));
      setTemplates((prev) => updateFn(prev));
      toast.success("Investimento atualizado!");
      return;
    }

    const { error } = await supabase.from("projects").update({ initial_investment: value }).eq("id", id);
    if (error) { toast.error("Erro ao salvar investimento"); return; }
    toast.success("Investimento atualizado!");
    await loadProjects();
  }, [useLocalFallback]);

  const addStage = useCallback(async (projectId: string, name: string) => {
    if (useLocalFallback) {
      const updateFn = (list: Project[]) => list.map((p) => {
        if (p.id !== projectId) return p;
        const newStage = {
          id: `stage-${Date.now()}`,
          name,
          order: p.stages.length,
          tasks: []
        };
        return {
          ...p,
          stages: [...p.stages, newStage]
        };
      });
      setProjects((prev) => updateFn(prev));
      setTemplates((prev) => updateFn(prev));
      toast.success("Etapa adicionada!");
      return;
    }

    const proj = projects.find((p) => p.id === projectId);
    const order = proj ? proj.stages.length : 0;
    const { error } = await supabase.from("project_stages").insert({ project_id: projectId, name, order });
    if (error) { toast.error("Erro ao criar etapa"); return; }
    toast.success("Etapa adicionada!");
    await loadProjects();
  }, [projects, useLocalFallback]);

  const addTask = useCallback(async (input: { projectId: string; stageId: string; name: string; description?: string; responsibleId?: string | null; priority?: string; startDate?: Date; endDate?: Date }) => {
    if (useLocalFallback) {
      const newTask: Task = {
        id: `task-${Date.now()}`,
        name: input.name,
        description: input.description || "",
        responsible: input.responsibleId || "Ana Silva",
        startDate: input.startDate ? new Date(input.startDate) : new Date(),
        endDate: input.endDate ? new Date(input.endDate) : new Date(Date.now() + 7 * 86400000),
        status: "todo",
        priority: (input.priority || "medium") as any,
        comments: [],
        dependencies: []
      };

      const updateFn = (list: Project[]) => list.map((p) => {
        if (p.id !== input.projectId) return p;
        const updatedStages = p.stages.map((s) => {
          if (s.id !== input.stageId) return s;
          return {
            ...s,
            tasks: [...s.tasks, newTask]
          };
        });
        
        // Recalculate progress and status
        const allTasks = updatedStages.flatMap((stg) => stg.tasks);
        const total = allTasks.length;
        const completed = allTasks.filter((t) => t.status === "done").length;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        let status = p.status;
        if (status !== "archived") {
          status = completed === total && total > 0 ? "completed" : completed > 0 ? "in_progress" : "planning";
        }

        return {
          ...p,
          progress,
          status,
          stages: updatedStages
        };
      });

      setProjects((prev) => updateFn(prev));
      setTemplates((prev) => updateFn(prev));
      toast.success("Tarefa adicionada!");
      return;
    }

    const { error } = await supabase.from("tasks").insert({
      project_id: input.projectId,
      stage_id: input.stageId,
      title: input.name,
      description: input.description || "",
      responsible_id: input.responsibleId || user?.id || null,
      priority: input.priority || "medium",
      status: "pending",
      start_date: (input.startDate || new Date()).toISOString().split("T")[0],
      end_date: (input.endDate || new Date(Date.now() + 7 * 86400000)).toISOString().split("T")[0],
      created_by: user?.id || null,
    });
    if (error) { toast.error("Erro ao criar tarefa"); return; }
    toast.success("Tarefa adicionada!");
    await syncProjectStatus(input.projectId);
    await loadProjects();
  }, [user, useLocalFallback, projects, templates]);

  const duplicateProject = useCallback(async (id: string) => {
    if (useLocalFallback) {
      const source = [...projects, ...templates].find((p) => p.id === id);
      if (!source) return;
      await addProject({
        name: `${source.name} (cópia)`,
        description: source.description,
        status: "planning" as any,
        progress: 0,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 86400000),
        fromTemplateId: id,
      } as any);
      return;
    }

    const source = [...projects, ...templates].find((p) => p.id === id);
    if (!source) return;
    await addProject({
      name: `${source.name} (cópia)`,
      description: source.description,
      status: "planning" as any,
      progress: 0,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 86400000),
      fromTemplateId: id,
    } as any);
    toast.success("Projeto duplicado!");
  }, [projects, templates, addProject, useLocalFallback]);

  const saveProjectAsTemplate = useCallback(async (id: string) => {
    if (useLocalFallback) {
      const source = projects.find((p) => p.id === id);
      if (!source) return;
      const tpl: Project = {
        ...source,
        id: `tpl-${Date.now()}`,
        name: `${source.name} (modelo)`,
        isTemplate: true,
        project_code: `TPL-${Math.floor(1000 + Math.random() * 9000)}`
      } as any;
      setTemplates((prev) => [tpl, ...prev]);
      toast.success("Modelo salvo!");
      return;
    }

    const source = projects.find((p) => p.id === id);
    if (!source) return;
    const { data, error } = await supabase.from("projects").insert({
      name: `${source.name} (modelo)`,
      description: source.description,
      status: "planning",
      progress: 0,
      start_date: new Date().toISOString().split("T")[0],
      end_date: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
      created_by: user?.id || null,
      is_template: true,
      project_code: "",
    } as any).select().single();
    if (error || !data) { toast.error("Erro ao salvar modelo"); return; }
    for (let i = 0; i < source.stages.length; i++) {
      const s = source.stages[i];
      const { data: newStage } = await supabase
        .from("project_stages")
        .insert({ project_id: data.id, name: s.name, order: i })
        .select()
        .single();
      if (newStage) {
        for (const t of s.tasks) {
          await supabase.from("tasks").insert({
            project_id: data.id,
            stage_id: newStage.id,
            title: t.name,
            description: t.description || "",
            priority: t.priority || "medium",
            status: "pending",
            created_by: user?.id || null,
          });
        }
      }
    }
    toast.success("Modelo salvo!");
    await loadProjects();
  }, [projects, user, useLocalFallback]);

  const archiveProject = useCallback(async (id: string) => {
    if (useLocalFallback) {
      await updateProject(id, { status: "archived" as any });
      return;
    }

    await updateProject(id, { status: "archived" as any });
    toast.success("Projeto arquivado!");
  }, [updateProject, useLocalFallback]);

  const syncProjectStatus = async (projectId: string) => {
    if (useLocalFallback) return;
    try {
      const { data: projectData } = await supabase
        .from("projects")
        .select("status")
        .eq("id", projectId)
        .single();
      
      if (!projectData || projectData.status === "archived") return;

      const { data: projectTasks } = await supabase
        .from("tasks")
        .select("id, status")
        .eq("project_id", projectId);

      if (projectTasks && projectTasks.length > 0) {
        const completedCount = projectTasks.filter((t) => t.status === "done").length;
        const totalCount = projectTasks.length;
        const progressVal = Math.round((completedCount / totalCount) * 100);

        let newStatus = projectData.status;
        if (completedCount === totalCount) {
          newStatus = "completed";
        } else if (completedCount >= 1) {
          newStatus = "in_progress";
        } else {
          newStatus = "planning";
        }

        const updates: any = { progress: progressVal };
        if (newStatus !== projectData.status) {
          updates.status = newStatus;
        }

        await supabase.from("projects").update(updates).eq("id", projectId);
      } else {
        await supabase.from("projects").update({ progress: 0, status: "planning" }).eq("id", projectId);
      }
    } catch (err) {
      console.error("Erro ao sincronizar status do projeto:", err);
    }
  };

  const updateTask = useCallback(async (projectId: string, taskId: string, data: Partial<Task>) => {
    if (useLocalFallback) {
      const updateFn = (list: Project[]) => list.map((p) => {
        if (p.id !== projectId) return p;
        const updatedStages = p.stages.map((s) => ({
          ...s,
          tasks: s.tasks.map((t) => {
            if (t.id !== taskId) return t;
            return {
              ...t,
              ...data,
              startDate: data.startDate ? new Date(data.startDate) : t.startDate,
              endDate: data.endDate ? new Date(data.endDate) : t.endDate,
            };
          })
        }));

        const allTasks = updatedStages.flatMap((stg) => stg.tasks);
        const total = allTasks.length;
        const completed = allTasks.filter((t) => t.status === "done").length;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        let status = p.status;
        if (status !== "archived") {
          status = completed === total && total > 0 ? "completed" : completed > 0 ? "in_progress" : "planning";
        }

        return {
          ...p,
          progress,
          status,
          stages: updatedStages
        };
      });

      setProjects((prev) => updateFn(prev));
      setTemplates((prev) => updateFn(prev));
      toast.success("Tarefa atualizada!");
      return;
    }

    const updates: any = {};
    if (data.name !== undefined) updates.title = data.name;
    if (data.status !== undefined) updates.status = data.status;
    if (data.responsible !== undefined) updates.responsible_id = data.responsible;
    if (data.priority !== undefined) updates.priority = data.priority;

    const { error } = await supabase.from("tasks").update(updates).eq("id", taskId);
    if (error) { toast.error("Erro ao atualizar tarefa"); return; }
    await syncProjectStatus(projectId);
    await loadProjects();
  }, [useLocalFallback]);

  const deleteTask = useCallback(async (projectId: string, taskId: string) => {
    if (useLocalFallback) {
      const updateFn = (list: Project[]) => list.map((p) => {
        if (p.id !== projectId) return p;
        const updatedStages = p.stages.map((s) => ({
          ...s,
          tasks: s.tasks.filter((t) => t.id !== taskId)
        }));

        const allTasks = updatedStages.flatMap((stg) => stg.tasks);
        const total = allTasks.length;
        const completed = allTasks.filter((t) => t.status === "done").length;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        let status = p.status;
        if (status !== "archived") {
          status = completed === total && total > 0 ? "completed" : completed > 0 ? "in_progress" : "planning";
        }

        return {
          ...p,
          progress,
          status,
          stages: updatedStages
        };
      });

      setProjects((prev) => updateFn(prev));
      setTemplates((prev) => updateFn(prev));
      toast.success("Tarefa excluída");
      return;
    }

    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (error) { toast.error("Erro ao excluir tarefa"); return; }
    toast.success("Tarefa excluída");
    await syncProjectStatus(projectId);
    await loadProjects();
  }, [useLocalFallback]);

  const updateStage = useCallback(async (projectId: string, stageId: string, name: string) => {
    if (useLocalFallback) {
      const updateFn = (list: Project[]) => list.map((p) => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          stages: p.stages.map((s) => s.id === stageId ? { ...s, name } : s)
        };
      });
      setProjects((prev) => updateFn(prev));
      setTemplates((prev) => updateFn(prev));
      toast.success("Etapa atualizada");
      return;
    }

    const { error } = await supabase.from("project_stages").update({ name }).eq("id", stageId);
    if (error) { toast.error("Erro ao atualizar etapa"); return; }
    toast.success("Etapa atualizada");
    await loadProjects();
  }, [useLocalFallback]);

  const deleteStage = useCallback(async (projectId: string, stageId: string) => {
    if (useLocalFallback) {
      const updateFn = (list: Project[]) => list.map((p) => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          stages: p.stages.filter((s) => s.id !== stageId)
        };
      });
      setProjects((prev) => updateFn(prev));
      setTemplates((prev) => updateFn(prev));
      toast.success("Etapa excluída");
      return;
    }

    const { error: tErr } = await supabase.from("tasks").delete().eq("stage_id", stageId);
    const { error } = await supabase.from("project_stages").delete().eq("id", stageId);
    if (error) { toast.error("Erro ao excluir etapa"); return; }
    toast.success("Etapa excluída");
    await loadProjects();
  }, [useLocalFallback]);

  const refreshProjects = loadProjects;
  const refreshTransactions = loadTransactions;
  const refreshAccounts = loadAccounts;

  const addTransaction = useCallback(async (t: Omit<Transaction, "id">) => {
    if (useLocalFallback) {
      const newTx: Transaction = {
        id: `tx-${Date.now()}`,
        type: t.type,
        projectId: t.projectId || null,
        accountId: t.accountId || "",
        categoryId: t.categoryId || "",
        value: t.value,
        date: t.date || new Date(),
        description: t.description || ""
      };
      setTransactions((prev) => [newTx, ...prev]);
      if (t.accountId) {
        const delta = t.type === "income" ? t.value : -t.value;
        setAccounts((prev) => prev.map((a) => a.id === t.accountId ? { ...a, balance: a.balance + delta } : a));
      }
      toast.success("Movimentação registrada com sucesso!");
      return;
    }

    const finalDescription = t.systemId 
      ? `${t.description || ""} [sys:${t.systemId}:${t.affectsSystemBalance ? 'y' : 'n'}]`.trim()
      : t.description;

    const txPayload: any = {
      type: t.type,
      project_id: t.projectId || null,
      account_id: t.accountId || null,
      category_id: t.category_id || null,
      value: t.value,
      description: finalDescription,
      transaction_date: t.date.toISOString(),
      created_by: user?.id || null,
    };
    if (t.systemId) txPayload.system_id = t.systemId;
    txPayload.affects_system_balance = t.affectsSystemBalance ?? false;

    let { error } = await supabase.from("financial_transactions").insert(txPayload);
    if (error && (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist'))) {
      const { system_id, affects_system_balance, ...cleanPayload } = txPayload;
      const retryRes = await supabase.from("financial_transactions").insert(cleanPayload);
      error = retryRes.error;
    }
    const dummyObj = ({
      type: t.type,
      project_id: t.projectId || null,
      account_id: t.accountId || null,
      category_id: t.categoryId || null,
      value: t.value,
      description: t.description,
      transaction_date: t.date.toISOString(),
      created_by: user?.id || null,
      system_id: t.systemId || null,
      affects_system_balance: t.affectsSystemBalance ?? false,
    });
    void dummyObj;
    if (error) { console.error("Erro ao registrar no Supabase:", error); toast.error(`Erro ao registrar movimentação: ${error.message}`); return; }
    await loadTransactions();
  }, [user, useLocalFallback]);

  const updateTransaction = useCallback(async (id: string, updated: Partial<Transaction>) => {
    if (useLocalFallback) {
      setTransactions((prev) => prev.map((t) => t.id === id ? { ...t, ...updated } : t));
      toast.success("Movimentação atualizada!");
      return;
    }

    const finalDescription = updated.systemId 
      ? `${updated.description || ""} [sys:${updated.systemId}:${updated.affectsSystemBalance ? 'y' : 'n'}]`.trim()
      : updated.description;

    const txPayload: any = {
      type: updated.type,
      project_id: updated.projectId || null,
      account_id: updated.accountId || null,
      category_id: updated.categoryId || null,
      value: updated.value,
      description: finalDescription,
    };
    if (updated.date) {
      txPayload.transaction_date = updated.date.toISOString();
    }
    if (updated.systemId !== undefined) {
      txPayload.system_id = updated.systemId;
    }
    if (updated.affectsSystemBalance !== undefined) {
      txPayload.affects_system_balance = updated.affectsSystemBalance;
    }

    let { error } = await supabase.from("financial_transactions").update(txPayload).eq("id", id);
    if (error && (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist'))) {
      const { system_id, affects_system_balance, ...cleanPayload } = txPayload;
      const retryRes = await supabase.from("financial_transactions").update(cleanPayload).eq("id", id);
      error = retryRes.error;
    }

    if (error) { 
      console.error("Erro ao atualizar no Supabase:", error); 
      toast.error(`Erro ao atualizar movimentação: ${error.message}`); 
      return; 
    }
    toast.success("Movimentação atualizada!");
    await loadTransactions();
  }, [useLocalFallback]);

  const deleteTransaction = useCallback(async (id: string) => {
    if (useLocalFallback) {
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      toast.success("Movimentação excluída!");
      return;
    }

    const { error } = await supabase.from("financial_transactions").delete().eq("id", id);
    if (error) {
      console.error("Erro ao excluir no Supabase:", error);
      toast.error(`Erro ao excluir movimentação: ${error.message}`);
      return;
    }
    toast.success("Movimentação excluída!");
    await loadTransactions();
  }, [useLocalFallback]);

  const updateAccountBalance = useCallback(async (accountId: string, delta: number) => {
    if (useLocalFallback) {
      setAccounts((prev) => prev.map((a) => a.id === accountId ? { ...a, balance: a.balance + delta } : a));
      return;
    }

    const acc = accounts.find((a) => a.id === accountId);
    if (!acc) return;
    const { error } = await supabase
      .from("financial_accounts")
      .update({ balance: acc.balance + delta })
      .eq("id", accountId);
    if (error) { toast.error("Erro ao atualizar saldo"); return; }
    await loadAccounts();
  }, [accounts, useLocalFallback]);

  const addReceivable = useCallback(async (r: Omit<ReceivablePayable, "id">) => {
    if (useLocalFallback) {
      const newRec: ReceivablePayable = {
        id: `rec-${Date.now()}`,
        date: new Date(),
        dueDate: r.dueDate || new Date(),
        description: r.description,
        type: r.type,
        status: r.status || "pending",
        recurrence: r.recurrence || "once",
        value: r.value,
        projectId: r.projectId || null,
        categoryId: r.categoryId || "",
        accountId: ""
      };
      setReceivables((prev) => [newRec, ...prev]);
      toast.success(r.type === "income" ? "Receita registrada!" : "Despesa registrada!");
      return;
    }

    const { error } = await supabase.from("financial_entries").insert({
      type: r.type,
      description: r.description,
      recurrence: r.recurrence,
      status: r.status || "pending",
      due_date: r.dueDate.toISOString().split("T")[0],
      value: r.value,
      project_id: r.projectId || null,
      category_id: r.categoryId || null,
    });
    if (error) { 
      console.error("Firebase/Supabase error:", error);
      toast.error("Erro ao registrar: " + error.message); 
      return; 
    }
    toast.success(r.type === "income" ? "Receita registrada!" : "Despesa registrada!");
    await loadReceivables();
  }, [useLocalFallback]);

  const payReceivable = useCallback(async (id: string, paymentData: { discount: number; interest: number; accountId: string; categoryId: string; projectId: string | null }) => {
    if (useLocalFallback) {
      const item = receivables.find((r) => r.id === id);
      if (!item) return;
      const finalValue = item.value - paymentData.discount + paymentData.interest;

      const newTx: Transaction = {
        id: `tx-${Date.now()}`,
        type: item.type === "income" ? "income" : "expense",
        projectId: paymentData.projectId || null,
        accountId: paymentData.accountId,
        categoryId: paymentData.categoryId,
        value: finalValue,
        date: new Date(),
        description: item.description
      };
      setTransactions((prev) => [newTx, ...prev]);

      const delta = item.type === "income" ? finalValue : -finalValue;
      setAccounts((prev) => prev.map((a) => a.id === paymentData.accountId ? { ...a, balance: a.balance + delta } : a));

      setReceivables((prev) => prev.map((r) => r.id === id ? { ...r, status: "paid" } : r));
      toast.success(item.type === "income" ? "Recebimento confirmado!" : "Pagamento confirmado!");
      return;
    }

    const item = receivables.find((r) => r.id === id);
    if (!item) return;
    const finalValue = item.value - paymentData.discount + paymentData.interest;

    await addTransaction({
      type: item.type === "income" ? "income" : "expense",
      projectId: paymentData.projectId,
      accountId: paymentData.accountId,
      categoryId: paymentData.categoryId,
      value: finalValue,
      date: new Date(),
      description: item.description,
    });

    await updateAccountBalance(paymentData.accountId, item.type === "income" ? finalValue : -finalValue);

    const { error } = await supabase.from("financial_entries").update({ status: "paid" }).eq("id", id);
    if (error) { toast.error("Erro ao atualizar status"); return; }
    toast.success(item.type === "income" ? "Recebimento confirmado!" : "Pagamento confirmado!");
    await loadReceivables();
  }, [receivables, addTransaction, updateAccountBalance, useLocalFallback]);

  const addTaskMessage = useCallback(async (msg: { taskId: string; author: string; text: string }) => {
    if (useLocalFallback) {
      const newMsg: TaskMessage = {
        id: `msg-${Date.now()}`,
        taskId: msg.taskId,
        author: user?.email || msg.author || "Usuário",
        text: msg.text,
        date: new Date()
      };
      setTaskMessages((prev) => [...prev, newMsg]);
      toast.success("Mensagem enviada!");
      return;
    }

    const { error } = await supabase.from("task_messages").insert({
      task_id: msg.taskId,
      sender_id: user?.id || msg.author,
      message: msg.text,
    });
    if (error) { toast.error("Erro ao enviar mensagem"); return; }
    await loadProjects();
  }, [user, useLocalFallback]);

  const addNotification = useCallback(async (n: { type: string; title: string; description: string; userId: string; link?: string }) => {
    if (useLocalFallback) {
      const newNotif: Notification = {
        id: `notif-${Date.now()}`,
        type: n.type as any,
        title: n.title,
        description: n.description,
        date: new Date(),
        read: false,
        link: n.link ? { projectId: n.link, taskId: "" } : undefined
      };
      setNotifications((prev) => [newNotif, ...prev]);
      playBeepSound();
      return;
    }

    await supabase.from("notifications").insert({
      user_id: n.userId,
      type: n.type,
      title: n.title,
      message: n.description,
      link: n.link || "",
    });
  }, [useLocalFallback]);

  const markNotificationRead = useCallback(async (id: string) => {
    if (useLocalFallback) {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      return;
    }

    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, [useLocalFallback]);

  const addCategory = useCallback(async (name: string, type: "income" | "expense") => {
    if (useLocalFallback) {
      const newCat: Category = {
        id: `cat-${Date.now()}`,
        name,
        type
      };
      setCategories((prev) => [...prev, newCat]);
      toast.success("Categoria criada com sucesso!");
      return;
    }

    const { error } = await supabase.from("financial_categories").insert({ name, type });
    if (error) { toast.error("Erro ao criar categoria"); return; }
    toast.success("Categoria criada com sucesso!");
    await loadCategories();
  }, [useLocalFallback]);

  const deleteCategory = useCallback(async (id: string) => {
    if (useLocalFallback) {
      setCategories((prev) => prev.filter((c) => c.id !== id));
      toast.success("Categoria excluída!");
      return;
    }

    const { error } = await supabase.from("financial_categories").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir categoria: " + error.message);
      return;
    }
    toast.success("Categoria excluída com sucesso!");
    await loadCategories();
  }, [useLocalFallback]);

  const deleteReceivable = useCallback(async (id: string) => {
    if (useLocalFallback) {
      setReceivables((prev) => prev.filter((r) => r.id !== id));
      toast.success("Registro excluído!");
      return;
    }

    const { error } = await supabase.from("financial_entries").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir registro: " + error.message);
      return;
    }
    toast.success("Registro excluído com sucesso!");
    await loadReceivables();
  }, [useLocalFallback]);

  return (
    <AppContext.Provider
      value={{
        projects, templates, transactions, accounts, receivables, categories, taskMessages, notifications, loading, profiles, setProfiles,
        addProject, updateProject, updateProjectInvestment, duplicateProject, saveProjectAsTemplate, archiveProject, updateTask, deleteTask, updateStage, deleteStage, addStage, addTask,
        addTransaction, updateTransaction, deleteTransaction, updateAccountBalance,
        addReceivable, payReceivable, deleteReceivable,
        addTaskMessage, addNotification, markNotificationRead, getProjectCode,
        refreshProjects, refreshTransactions, refreshAccounts, addCategory, deleteCategory,
        useLocalFallback,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}