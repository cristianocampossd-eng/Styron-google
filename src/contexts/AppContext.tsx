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
  isRecurring: boolean;
  recurrence: "once" | "monthly" | "weekly" | "yearly";
  value: number;
  projectId: string | null;
  categoryId: string;
  accountId: string;
  systemId?: string | null;
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
  importFromTemplate: (targetProjectId: string, templateId: string, baseStartDate: Date) => Promise<void>;
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
  updateReceivable: (id: string, data: Partial<ReceivablePayable>) => Promise<void>;
  payReceivable: (id: string, paymentData: { discount: number; interest: number; accountId: string; categoryId: string; projectId: string | null; systemId: string | null }) => Promise<void>;
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
  revertReceivable: (id: string) => Promise<void>;
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
    const [txRes, entriesRes] = await Promise.all([
      supabase.from("financial_transactions").select("*").order("transaction_date", { ascending: false }),
      supabase.from("financial_entries").select("id, due_date, created_at")
    ]);

    const entriesMap = new Map<string, { due_date?: string | null; created_at?: string | null }>();
    if (entriesRes.data) {
      entriesRes.data.forEach((e: any) => {
        entriesMap.set(e.id, e);
      });
    }

    if (txRes.data) {
      setTransactions(
        txRes.data.map((t: any) => {
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
          
          const refMatch = desc.match(/\[ref:([^:\s\]]+)\]/);
          const receivableId = refMatch ? refMatch[1] : null;

          // Parse format: [due:YYYY-MM-DD]
          let dueDate: Date | undefined = undefined;
          const dueMatch = desc.match(/\[due:(\d{4}-\d{2}-\d{2})\]/);
          if (dueMatch) {
            const [yr, mo, dy] = dueMatch[1].split("-").map(Number);
            dueDate = new Date(yr, mo - 1, dy);
          } else if (t.due_date) {
            dueDate = new Date(t.due_date);
          } else if (receivableId) {
            const entry = entriesMap.get(receivableId);
            if (entry && entry.due_date) {
              dueDate = new Date(entry.due_date + "T12:00:00");
            } else if (entry && entry.created_at) {
              dueDate = new Date(entry.created_at);
            }
          }

          // Fallback: If still no dueDate, we can fall back to transaction_date
          if (!dueDate) {
            dueDate = new Date(t.transaction_date);
          }

          // Strip metadata tags from the displayed description
          const cleanDesc = desc
            .replace(/\s*\[sys:[^\]]+\]/, "")
            .replace(/\s*\[ref:[^\]]+\]/, "")
            .replace(/\s*\[due:[^\]]+\]/, "");

          return {
            id: t.id,
            type: t.type as any,
            projectId: t.project_id,
            accountId: t.account_id || "",
            categoryId: t.category_id || "",
            value: Number(t.value),
            date: new Date(t.transaction_date),
            dueDate,
            description: cleanDesc,
            rawDescription: desc,
            receivableId,
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
      let localAccountMapping: Record<string, string> = {};
      try {
        const stored = localStorage.getItem("financial_entries_accounts");
        if (stored) localAccountMapping = JSON.parse(stored);
      } catch (err) {
        console.warn("Failed to load local account mapping:", err);
      }

      setReceivables(
        data.map((r: any) => {
          let parsedDueDate = new Date();
          if (r.due_date) {
            const parts = r.due_date.split('-');
            if (parts.length === 3) {
              parsedDueDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            } else {
              parsedDueDate = new Date(r.due_date);
            }
          } else if (r.created_at) {
            parsedDueDate = new Date(r.created_at);
          }

          const dbAccountId = r.account_id;
          const localAccountId = localAccountMapping[r.id];
          const finalAccountId = dbAccountId || localAccountId || "";

          return {
            id: r.id,
            date: new Date(r.created_at),
            dueDate: parsedDueDate,
            description: r.description,
            type: r.type as any,
            status: r.status as any,
            isRecurring: !!r.is_recurring || (r.recurrence && r.recurrence !== "once"),
            recurrence: (r.recurrence || "once") as any,
            value: Number(r.value),
            projectId: r.project_id,
            categoryId: r.category_id || "",
            accountId: finalAccountId,
          };
        })
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
          const sortedStages = [...updatedStages].sort((a, b) => (a.order || 0) - (b.order || 0));
          const firstStage = sortedStages[0];
          const firstStageTasks = firstStage ? firstStage.tasks : [];
          const allFirstStageCompleted = firstStageTasks.length > 0 ? firstStageTasks.every(t => t.status === "done") : true;

          status = completed === total && total > 0 ? "completed" : (allFirstStageCompleted && completed > 0) ? "in_progress" : "planning";
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

  const importFromTemplate = useCallback(async (targetProjectId: string, templateId: string, baseStartDate: Date) => {
    const templateProj = [...projects, ...templates].find((p) => p.id === templateId);
    if (!templateProj) {
      toast.error("Template não encontrado!");
      return;
    }

    const templateBaseDate = templateProj.startDate ? new Date(templateProj.startDate) : new Date();

    if (useLocalFallback) {
      setProjects((prev) => prev.map((p) => {
        if (p.id !== targetProjectId) return p;

        const newStages = [...p.stages];

        templateProj.stages.forEach((s) => {
          const stageId = `stage-copied-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          
          const copiedTasks: Task[] = s.tasks.map((t) => {
            const tStart = t.startDate ? new Date(t.startDate) : new Date();
            const tEnd = t.endDate ? new Date(t.endDate) : new Date();

            const offsetDiff = tStart.getTime() - templateBaseDate.getTime();
            const offsetDays = Math.round(offsetDiff / (1000 * 60 * 60 * 24));

            const durationDiff = tEnd.getTime() - tStart.getTime();
            const durationDays = Math.round(durationDiff / (1000 * 60 * 60 * 24));

            const newStart = new Date(baseStartDate.getTime());
            newStart.setDate(newStart.getDate() + offsetDays);

            const newEnd = new Date(newStart.getTime());
            newEnd.setDate(newEnd.getDate() + durationDays);

            return {
              id: `task-copied-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
              name: t.name,
              description: t.description || "",
              responsible: t.responsible || "Ana Silva",
              priority: t.priority || "medium",
              status: "todo",
              startDate: newStart,
              endDate: newEnd,
              comments: [],
              dependencies: []
            };
          });

          newStages.push({
            id: stageId,
            name: s.name,
            order: newStages.length,
            tasks: copiedTasks
          });
        });

        return {
          ...p,
          stages: newStages
        };
      }));

      toast.success("Modelo copiado com sucesso!");
      return;
    }

    try {
      for (let i = 0; i < templateProj.stages.length; i++) {
        const s = templateProj.stages[i];
        
        const { data: newStage, error: stageErr } = await supabase
          .from("project_stages")
          .insert({ project_id: targetProjectId, name: s.name, order: i })
          .select()
          .single();

        if (stageErr || !newStage) {
          console.error("Erro ao inserir etapa:", stageErr);
          continue;
        }

        for (const t of s.tasks) {
          const tStart = t.startDate ? new Date(t.startDate) : new Date();
          const tEnd = t.endDate ? new Date(t.endDate) : new Date();

          const offsetDiff = tStart.getTime() - templateBaseDate.getTime();
          const offsetDays = Math.round(offsetDiff / (1000 * 60 * 60 * 24));

          const durationDiff = tEnd.getTime() - tStart.getTime();
          const durationDays = Math.round(durationDiff / (1000 * 60 * 60 * 24));

          const newStart = new Date(baseStartDate.getTime());
          newStart.setDate(newStart.getDate() + offsetDays);

          const newEnd = new Date(newStart.getTime());
          newEnd.setDate(newEnd.getDate() + durationDays);

          const start_date = newStart.toISOString().split("T")[0];
          const end_date = newEnd.toISOString().split("T")[0];

          await supabase.from("tasks").insert({
            project_id: targetProjectId,
            stage_id: newStage.id,
            title: t.name,
            description: t.description || "",
            priority: t.priority || "medium",
            status: "pending",
            responsible_id: t.responsible || user?.id || null,
            start_date,
            end_date,
            created_by: user?.id || null,
          });
        }
      }

      toast.success("Modelo copiado com sucesso!");
      await loadProjects();
      await syncProjectStatus(targetProjectId);
    } catch (err) {
      console.error("Erro ao copiar do modelo:", err);
      toast.error("Erro ao copiar do modelo");
    }
  }, [projects, templates, user, useLocalFallback]);

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
        .select("id, status, stage_id")
        .eq("project_id", projectId);

      const { data: stagesData } = await supabase
        .from("project_stages")
        .select("id, order")
        .eq("project_id", projectId)
        .order("order", { ascending: true });

      if (projectTasks && projectTasks.length > 0) {
        const completedCount = projectTasks.filter((t) => t.status === "done").length;
        const totalCount = projectTasks.length;
        const progressVal = Math.round((completedCount / totalCount) * 100);

        const firstStageId = stagesData && stagesData.length > 0 ? stagesData[0].id : null;
        const firstStageTasks = firstStageId 
          ? projectTasks.filter((t) => t.stage_id === firstStageId)
          : [];
        const allFirstStageCompleted = firstStageTasks.length > 0 
          ? firstStageTasks.every((t) => t.status === "done") 
          : true;

        let newStatus = projectData.status;
        if (completedCount === totalCount) {
          newStatus = "completed";
        } else if (allFirstStageCompleted && completedCount >= 1) {
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
          const sortedStages = [...updatedStages].sort((a, b) => (a.order || 0) - (b.order || 0));
          const firstStage = sortedStages[0];
          const firstStageTasks = firstStage ? firstStage.tasks : [];
          const allFirstStageCompleted = firstStageTasks.length > 0 ? firstStageTasks.every(t => t.status === "done") : true;

          status = completed === total && total > 0 ? "completed" : (allFirstStageCompleted && completed > 0) ? "in_progress" : "planning";
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
    if (data.description !== undefined) updates.description = data.description;
    if (data.status !== undefined) updates.status = data.status;
    if (data.responsible !== undefined) updates.responsible_id = data.responsible;
    if (data.priority !== undefined) updates.priority = data.priority;
    if (data.startDate !== undefined && data.startDate !== null) {
      const d = typeof data.startDate === "string" ? new Date(data.startDate) : data.startDate;
      updates.start_date = !isNaN(d.getTime()) ? d.toISOString().split("T")[0] : null;
    }
    if (data.endDate !== undefined && data.endDate !== null) {
      const d = typeof data.endDate === "string" ? new Date(data.endDate) : data.endDate;
      updates.end_date = !isNaN(d.getTime()) ? d.toISOString().split("T")[0] : null;
    }

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
          const sortedStages = [...updatedStages].sort((a, b) => (a.order || 0) - (b.order || 0));
          const firstStage = sortedStages[0];
          const firstStageTasks = firstStage ? firstStage.tasks : [];
          const allFirstStageCompleted = firstStageTasks.length > 0 ? firstStageTasks.every(t => t.status === "done") : true;

          status = completed === total && total > 0 ? "completed" : (allFirstStageCompleted && completed > 0) ? "in_progress" : "planning";
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

  const updateDescriptionWithTags = (
    currentDesc: string | undefined,
    updates: {
      systemId?: string | null;
      affectsSystemBalance?: boolean | null;
      dueDate?: Date | null;
      receivableId?: string | null;
    }
  ): string => {
    let desc = currentDesc || "";
    
    // 1. Extract existing tag values from the description if not override
    const refMatch = desc.match(/\[ref:([^:\s\]]+)\]/);
    const existingRefId = refMatch ? refMatch[1] : null;
    
    const sysMatch = desc.match(/\[sys:([^:\s\]]+)(?::([yn]))?\]/);
    const existingSystemId = sysMatch ? sysMatch[1] : null;
    const existingAffects = sysMatch ? sysMatch[2] === 'y' : false;
    
    const dueMatch = desc.match(/\[due:(\d{4}-\d{2}-\d{2})\]/);
    const existingDueDateStr = dueMatch ? dueMatch[1] : null;
    
    // 2. Clear out all existing tags
    desc = desc
      .replace(/\s*\[sys:[^\]]+\]/g, "")
      .replace(/\s*\[ref:[^\]]+\]/g, "")
      .replace(/\s*\[due:[^\]]+\]/g, "")
      .trim();
      
    // 3. Select final values
    const finalRef = updates.receivableId !== undefined ? updates.receivableId : existingRefId;
    const finalSystemId = updates.systemId !== undefined ? updates.systemId : existingSystemId;
    const finalAffects = updates.affectsSystemBalance !== undefined ? updates.affectsSystemBalance : existingAffects;
    
    let finalDueDateStr = existingDueDateStr;
    if (updates.dueDate !== undefined) {
      if (updates.dueDate) {
        const yr = updates.dueDate.getFullYear();
        const mo = String(updates.dueDate.getMonth() + 1).padStart(2, "0");
        const dy = String(updates.dueDate.getDate()).padStart(2, "0");
        finalDueDateStr = `${yr}-${mo}-${dy}`;
      } else {
        finalDueDateStr = null;
      }
    }
    
    if (finalRef) {
      desc = `${desc} [ref:${finalRef}]`.trim();
    }
    if (finalSystemId) {
      desc = `${desc} [sys:${finalSystemId}:${finalAffects ? 'y' : 'n'}]`.trim();
    }
    if (finalDueDateStr) {
      desc = `${desc} [due:${finalDueDateStr}]`.trim();
    }
    
    return desc;
  };

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
        dueDate: t.dueDate,
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

    const finalDescription = updateDescriptionWithTags(t.description, {
      systemId: t.systemId,
      affectsSystemBalance: t.affectsSystemBalance,
      dueDate: t.dueDate,
      receivableId: t.receivableId || (t.description ? t.description.match(/\[ref:([^:\s\]]+)\]/)?.[1] : null),
    });

    const txPayload: any = {
      type: t.type,
      project_id: t.projectId || null,
      account_id: t.accountId || null,
      category_id: t.categoryId || null,
      value: t.value,
      description: finalDescription,
      transaction_date: t.date.toISOString(),
      due_date: t.dueDate ? t.dueDate.toISOString() : null,
      created_by: user?.id || null,
    };
    if (t.systemId) txPayload.system_id = t.systemId;
    txPayload.affects_system_balance = t.affectsSystemBalance ?? false;

    let { error } = await supabase.from("financial_transactions").insert(txPayload);
    if (error && (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist'))) {
      const { system_id, affects_system_balance, due_date, ...cleanPayload } = txPayload;
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
    if (error) { 
      console.error("Erro ao registrar no Supabase:", error); 
      throw new Error(`Erro ao registrar movimentação: ${error.message}`); 
    }
    await loadTransactions();
  }, [user, useLocalFallback]);

  const updateTransaction = useCallback(async (id: string, updated: Partial<Transaction>) => {
    if (useLocalFallback) {
      setTransactions((prev) => prev.map((t) => t.id === id ? { ...t, ...updated } : t));
      toast.success("Movimentação atualizada!");
      return;
    }

    const existingTx = transactions.find((txn) => txn.id === id);
    const prevRawDesc = existingTx?.rawDescription || existingTx?.description || "";
    const baseDesc = updated.description !== undefined ? updated.description : (existingTx?.description || "");

    const finalDescription = updateDescriptionWithTags(baseDesc, {
      systemId: updated.systemId !== undefined ? updated.systemId : (existingTx?.systemId || null),
      affectsSystemBalance: updated.affectsSystemBalance !== undefined ? updated.affectsSystemBalance : (existingTx?.affectsSystemBalance || false),
      dueDate: updated.dueDate !== undefined ? updated.dueDate : (existingTx?.dueDate || null),
      receivableId: existingTx?.receivableId || prevRawDesc.match(/\[ref:([^:\s\]]+)\]/)?.[1] || null
    });

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
    if (updated.dueDate) {
      txPayload.due_date = updated.dueDate.toISOString();
    }
    if (updated.systemId !== undefined) {
      txPayload.system_id = updated.systemId;
    }
    if (updated.affectsSystemBalance !== undefined) {
      txPayload.affects_system_balance = updated.affectsSystemBalance;
    }

    let { error } = await supabase.from("financial_transactions").update(txPayload).eq("id", id);
    if (error && (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist'))) {
      const { system_id, affects_system_balance, due_date, ...cleanPayload } = txPayload;
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
  }, [useLocalFallback, transactions]);

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
        isRecurring: r.isRecurring,
        recurrence: r.recurrence || "once",
        value: r.value,
        projectId: r.projectId || null,
        categoryId: r.categoryId || "",
        accountId: r.accountId || ""
      };
      setReceivables((prev) => [newRec, ...prev]);
      toast.success(r.type === "income" ? "Receita registrada!" : "Despesa registrada!");
      return;
    }

    const yr = r.dueDate.getFullYear();
    const mo = String(r.dueDate.getMonth() + 1).padStart(2, "0");
    const dy = String(r.dueDate.getDate()).padStart(2, "0");
    const formattedDueDate = `${yr}-${mo}-${dy}`;

    const payload: any = {
      type: r.type,
      description: r.description,
      recurrence: r.recurrence,
      status: r.status || "pending",
      due_date: formattedDueDate,
      value: r.value,
      project_id: r.projectId || null,
      category_id: r.categoryId || null,
      account_id: r.accountId || null,
    };

    const { data: insertResult, error: initialError } = await supabase.from("financial_entries").insert(payload).select();
    let error = initialError;
    let insertedRow = insertResult?.[0];

    if (error && (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist'))) {
      const { account_id, ...cleanPayload } = payload;
      const retryRes = await supabase.from("financial_entries").insert(cleanPayload).select();
      error = retryRes.error;
      insertedRow = retryRes.data?.[0];
    }

    if (error) { 
      console.error("Firebase/Supabase error:", error);
      toast.error("Erro ao registrar: " + error.message); 
      return; 
    }

    if (insertedRow && r.accountId) {
      try {
        const stored = localStorage.getItem("financial_entries_accounts");
        const mapping = stored ? JSON.parse(stored) : {};
        mapping[insertedRow.id] = r.accountId;
        localStorage.setItem("financial_entries_accounts", JSON.stringify(mapping));
      } catch (err) {
        console.warn("Failed to save local account mapping:", err);
      }
    }

    toast.success(r.type === "income" ? "Receita registrada!" : "Despesa registrada!");
    await loadReceivables();
  }, [useLocalFallback]);

  const updateReceivable = useCallback(async (id: string, data: Partial<ReceivablePayable>) => {
    if (useLocalFallback) {
      setReceivables((prev) => prev.map((r) => r.id === id ? { ...r, ...data } : r));
      toast.success("Atualizado!");
      return;
    }
    const updates: any = {};
    if (data.recurrence !== undefined) updates.recurrence = data.recurrence;
    if (data.dueDate !== undefined) {
      const yr = data.dueDate.getFullYear();
      const mo = String(data.dueDate.getMonth() + 1).padStart(2, "0");
      const dy = String(data.dueDate.getDate()).padStart(2, "0");
      updates.due_date = `${yr}-${mo}-${dy}`;
    }
    if (data.description !== undefined) updates.description = data.description;
    if (data.value !== undefined) updates.value = data.value;
    if (data.projectId !== undefined) updates.project_id = data.projectId;
    if (data.categoryId !== undefined) updates.category_id = data.categoryId || null;
    if (data.accountId !== undefined) updates.account_id = data.accountId || null;
    if (data.status !== undefined) updates.status = data.status;
    
    let { error } = await supabase.from("financial_entries").update(updates).eq("id", id);
    if (error && (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist'))) {
      const { account_id, ...cleanUpdates } = updates;
      const retryRes = await supabase.from("financial_entries").update(cleanUpdates).eq("id", id);
      error = retryRes.error;
    }

    if (error) { toast.error("Erro ao atualizar: " + error.message); return; }

    if (data.accountId) {
      try {
        const stored = localStorage.getItem("financial_entries_accounts");
        const mapping = stored ? JSON.parse(stored) : {};
        mapping[id] = data.accountId;
        localStorage.setItem("financial_entries_accounts", JSON.stringify(mapping));
      } catch (err) {
        console.warn("Failed to save local account mapping:", err);
      }
    }

    await loadReceivables();
    toast.success("Atualizado!");
  }, [useLocalFallback]);

  const payReceivable = useCallback(async (id: string, paymentData: { discount: number; interest: number; accountId: string; categoryId: string; projectId: string | null; systemId: string | null }) => {
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
        dueDate: item.dueDate,
        description: `${item.description || ""} [ref:${id}]`,
        systemId: paymentData.systemId
      };
      setTransactions((prev) => [newTx, ...prev]);

      const delta = item.type === "income" ? finalValue : -finalValue;
      setAccounts((prev) => prev.map((a) => a.id === paymentData.accountId ? { ...a, balance: a.balance + delta } : a));

      if (item.isRecurring) {
        // Generate next recurring item first
        const nextDueDate = new Date(item.dueDate);
        if (item.recurrence === "daily") nextDueDate.setDate(nextDueDate.getDate() + 1);
        else if (item.recurrence === "weekly") nextDueDate.setDate(nextDueDate.getDate() + 7);
        else if (item.recurrence === "monthly") nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        else if (item.recurrence === "yearly") nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);

        const newRec: ReceivablePayable = {
          id: `rec-${Date.now() + 1}`,
          date: new Date(),
          dueDate: nextDueDate,
          description: item.description,
          type: item.type,
          status: "pending",
          isRecurring: true,
          recurrence: item.recurrence,
          value: item.value,
          projectId: item.projectId,
          categoryId: item.categoryId,
          accountId: item.accountId,
          systemId: item.systemId,
        };

        setReceivables((prev) => [
          newRec,
          ...prev.map((r) => r.id === id ? { ...r, status: "paid", isRecurring: false, recurrence: "once" as any } : r)
        ]);
      } else {
        setReceivables((prev) => prev.map((r) => r.id === id ? { ...r, status: "paid" } : r));
      }

      toast.success(item.type === "income" ? "Recebimento confirmado!" : "Pagamento confirmado!");
      return;
    }

    const item = receivables.find((r) => r.id === id);
    if (!item) return;
    const finalValue = item.value - paymentData.discount + paymentData.interest;

    try {
      await addTransaction({
        type: item.type === "income" ? "income" : "expense",
        projectId: paymentData.projectId,
        accountId: paymentData.accountId,
        categoryId: paymentData.categoryId,
        systemId: paymentData.systemId,
        value: finalValue,
        date: new Date(),
        dueDate: item.dueDate,
        receivableId: id,
        description: item.description,
      });

      if (item.isRecurring) {
          // Create new item with isRecurring = true
          const nextDueDate = new Date(item.dueDate);
          if (item.recurrence === "daily") nextDueDate.setDate(nextDueDate.getDate() + 1);
          else if (item.recurrence === "weekly") nextDueDate.setDate(nextDueDate.getDate() + 7);
          else if (item.recurrence === "monthly") nextDueDate.setMonth(nextDueDate.getMonth() + 1);
          else if (item.recurrence === "yearly") nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
          
          await addReceivable({
              date: new Date(),
              dueDate: nextDueDate,
              description: item.description,
              type: item.type,
              status: "pending",
              isRecurring: true,
              recurrence: item.recurrence,
              value: item.value,
              projectId: item.projectId,
              categoryId: item.categoryId,
              accountId: item.accountId,
              systemId: item.systemId,
          });
      }

      await updateAccountBalance(paymentData.accountId, item.type === "income" ? finalValue : -finalValue);

      // Mark the paid item itself as non-recurring (once)
      const updateData: any = { status: "paid" };
      if (item.isRecurring) {
        updateData.recurrence = "once";
      }

      const { error } = await supabase.from("financial_entries").update(updateData).eq("id", id);
      if (error) { toast.error("Erro ao atualizar status"); return; }
      toast.success(item.type === "income" ? "Recebimento confirmado!" : "Pagamento confirmado!");
      await loadReceivables();
    } catch (err: any) {
      console.error("Erro na liquidação de lançamento:", err);
      toast.error(err.message || "Erro ao efetuar o pagamento/recebimento.");
    }
  }, [receivables, addTransaction, addReceivable, updateAccountBalance, useLocalFallback]);

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

  const revertReceivable = useCallback(async (id: string) => {
    const item = receivables.find((r) => r.id === id);
    if (!item) {
      toast.error("Lançamento não encontrado.");
      return;
    }

    if (item.status !== "paid") {
      toast.error("Este lançamento não está pago.");
      return;
    }

    const normalize = (str: string) => (str || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    const targetDesc = normalize(item.description);
    const targetType = item.type === "income" ? "income" : "expense";
    const targetValue = item.value;

    // --- STRATEGIC MATCH MECHANISM ---
    
    // Strategy 1: Find by exact [ref:ID] identifier
    let matchingTx = transactions.find((t) => {
      return t.receivableId === id || (t.rawDescription && t.rawDescription.includes(`[ref:${id}]`));
    });

    // Strategy 2: Exact description and close value
    if (!matchingTx) {
      matchingTx = transactions.find((t) => {
        if (t.type !== targetType) return false;
        const tDesc = normalize(t.description);
        const descMatches = tDesc === targetDesc;
        const valueMatches = Math.abs(t.value - targetValue) < 0.05;
        return descMatches && valueMatches;
      });
    }

    // Strategy 3: Substring description match and close value
    if (!matchingTx) {
      matchingTx = transactions.find((t) => {
        if (t.type !== targetType) return false;
        const tDesc = normalize(t.description);
        const descMatches = tDesc.includes(targetDesc) || targetDesc.includes(tDesc);
        const valueMatches = Math.abs(t.value - targetValue) < 0.05;
        return descMatches && valueMatches;
      });
    }

    // Strategy 4: Exact description regardless of value (for interest/discount)
    if (!matchingTx) {
      matchingTx = transactions.find((t) => {
        if (t.type !== targetType) return false;
        const tDesc = normalize(t.description);
        return tDesc === targetDesc;
      });
    }

    // Strategy 5: Substring description match regardless of value (relaxed matching)
    if (!matchingTx) {
      matchingTx = transactions.find((t) => {
        if (t.type !== targetType) return false;
        const tDesc = normalize(t.description);
        return tDesc.includes(targetDesc) || targetDesc.includes(tDesc);
      });
    }

    // Strategy 6: Same value, close properties as a last resort
    if (!matchingTx) {
      matchingTx = transactions.find((t) => {
        if (t.type !== targetType) return false;
        return Math.abs(t.value - targetValue) < 0.05;
      });
    }

    // Fallback search directly in Supabase using the same strategies directly
    if (!useLocalFallback && !matchingTx) {
      try {
        const { data: directTxs } = await supabase
          .from("financial_transactions")
          .select("*")
          .eq("type", targetType);
          
        if (directTxs && directTxs.length > 0) {
          const mappedDirect = directTxs.map((found: any) => {
            const rawDesc = found.description || "";
            const cleanDesc = rawDesc.replace(/\s*\[sys:[^\]]+\]/, "").replace(/\s*\[ref:[^\]]+\]/, "");
            const refMatch = rawDesc.match(/\[ref:([^:\s\]]+)\]/);
            return {
              id: found.id,
              type: found.type as any,
              projectId: found.project_id,
              accountId: found.account_id || "",
              categoryId: found.category_id || "",
              value: Number(found.value),
              date: new Date(found.transaction_date),
              description: cleanDesc,
              rawDescription: rawDesc,
              receivableId: refMatch ? refMatch[1] : null,
              systemId: found.system_id,
              affectsSystemBalance: found.affects_system_balance
            };
          });

          matchingTx = mappedDirect.find((t) => t.receivableId === id) ||
                       mappedDirect.find((t) => (t.rawDescription && t.rawDescription.includes(`[ref:${id}]`))) ||
                       mappedDirect.find((t) => normalize(t.description) === targetDesc && Math.abs(t.value - targetValue) < 0.05) ||
                       mappedDirect.find((t) => (normalize(t.description).includes(targetDesc) || targetDesc.includes(normalize(t.description))) && Math.abs(t.value - targetValue) < 0.05) ||
                       mappedDirect.find((t) => normalize(t.description) === targetDesc) ||
                       mappedDirect.find((t) => normalize(t.description).includes(targetDesc) || targetDesc.includes(normalize(t.description))) ||
                       mappedDirect.find((t) => Math.abs(t.value - targetValue) < 0.05);
        }
      } catch (err) {
        console.error("Erro ao buscar transação diretamente no Supabase:", err);
      }
    }

    if (useLocalFallback) {
      if (matchingTx) {
        const delta = matchingTx.type === "income" ? -matchingTx.value : matchingTx.value;
        setAccounts((prev) => prev.map((a) => a.id === matchingTx.accountId ? { ...a, balance: a.balance + delta } : a));
        setTransactions((prev) => prev.filter((t) => t.id !== matchingTx.id));
      }
      setReceivables((prev) => prev.map((r) => r.id === id ? { ...r, status: "pending" } : r));
      toast.success("Estornado!");
      return;
    }

    try {
      if (matchingTx && matchingTx.accountId) {
        const { data: dbAccount } = await supabase
          .from("financial_accounts")
          .select("balance")
          .eq("id", matchingTx.accountId)
          .single();
          
        if (dbAccount) {
          const currentBalance = Number(dbAccount.balance);
          const delta = matchingTx.type === "income" ? -matchingTx.value : matchingTx.value;
          
          const { error: accErr } = await supabase
            .from("financial_accounts")
            .update({ balance: currentBalance + delta })
            .eq("id", matchingTx.accountId);
            
          if (accErr) {
            console.error("Erro ao estornar saldo da conta:", accErr);
            toast.error("Erro ao atualizar o saldo da conta.");
            return;
          }
        }
        
        await supabase.from("financial_transactions").delete().eq("id", matchingTx.id);
      }

      const { error: entryErr } = await supabase.from("financial_entries").update({ status: "pending" }).eq("id", id);
      if (entryErr) {
         toast.error("Erro ao atualizar status do lançamento: " + entryErr.message);
         return;
      }

      if (matchingTx) {
        toast.success("Estorno efetuado com sucesso!");
      } else {
        toast.warning("Lançamento redefinido como Pendente, mas nenhuma movimentação financeira correspondente foi encontrada para estornar o saldo automaticamente.", { duration: 6000 });
      }

      await loadReceivables();
      await loadTransactions();
      await loadAccounts();
    } catch (e: any) {
      console.error("Erro no estorno:", e);
      toast.error("Erro ao processar estorno: " + e.message);
    }
  }, [receivables, transactions, accounts, useLocalFallback]);

  return (
    <AppContext.Provider
      value={{
        projects, templates, transactions, accounts, receivables, categories, taskMessages, notifications, loading, profiles, setProfiles,
        addProject, updateProject, updateProjectInvestment, duplicateProject, saveProjectAsTemplate, archiveProject, importFromTemplate, updateTask, deleteTask, updateStage, deleteStage, addStage, addTask,
        addTransaction, updateTransaction, deleteTransaction, updateAccountBalance,
        addReceivable, updateReceivable, payReceivable, deleteReceivable, revertReceivable,
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