import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";
import type {
  Project,
  Transaction,
  Account,
  Task,
  Category,
  Stage,
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
  profiles: { id: string; name: string; email: string | null }[];
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
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [templates, setTemplates] = useState<Project[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [receivables, setReceivables] = useState<ReceivablePayable[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [taskMessages, setTaskMessages] = useState<TaskMessage[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [profiles, setProfiles] = useState<{ id: string; name: string; email: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

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
    if (!user) return;
    const channel = supabase
      .channel("notifications-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => {
        loadNotifications();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  async function loadAll() {
    setLoading(true);
    try {
      await Promise.all([
        loadProjects().catch((err) => console.error("Erro ao carregar projetos do Supabase:", err)),
        loadTransactions().catch((err) => console.error("Erro ao carregar transações do Supabase:", err)),
        loadAccounts().catch((err) => console.error("Erro ao carregar contas do Supabase:", err)),
        loadCategories().catch((err) => console.error("Erro ao carregar categorias do Supabase:", err)),
        loadReceivables().catch((err) => console.error("Erro ao carregar contas a ver/receber do Supabase:", err)),
        loadNotifications().catch((err) => console.error("Erro ao carregar notificações do Supabase:", err)),
        loadProfiles().catch((err) => console.error("Erro ao carregar perfis do Supabase:", err)),
      ]);
    } catch (e) {
      console.error("Erro no carregamento inicial de dados:", e);
    } finally {
      setLoading(false);
    }
  }

  async function loadProfiles() {
    const { data } = await supabase.from("profiles").select("id, name, email");
    if (data) setProfiles(data);
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
        data.map((t: any) => ({
          id: t.id,
          type: t.type as any,
          projectId: t.project_id,
          accountId: t.account_id || "",
          categoryId: t.category_id || "",
          value: Number(t.value),
          date: new Date(t.transaction_date),
          description: t.description || "",
          systemId: t.system_id,
          affectsSystemBalance: t.affects_system_balance,
        }))
      );
    }
  }

  async function loadAccounts() {
    const { data } = await supabase.from("financial_accounts").select("*").order("created_at");
    if (data) {
      setAccounts(data.map((a: any) => ({ id: a.id, name: a.name, balance: Number(a.balance) })));
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
  }, [user, projects, templates]);

  const updateProject = useCallback(async (id: string, data: Partial<Project>) => {
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
    toast.success("Projeto atualizado!");
    await loadProjects();
  }, []);

  const updateProjectInvestment = useCallback(async (id: string, value: number) => {
    const { error } = await supabase.from("projects").update({ initial_investment: value }).eq("id", id);
    if (error) { toast.error("Erro ao salvar investimento"); return; }
    toast.success("Investimento atualizado!");
    await loadProjects();
  }, []);

  const addStage = useCallback(async (projectId: string, name: string) => {
    const proj = projects.find((p) => p.id === projectId);
    const order = proj ? proj.stages.length : 0;
    const { error } = await supabase.from("project_stages").insert({ project_id: projectId, name, order });
    if (error) { toast.error("Erro ao criar etapa"); return; }
    toast.success("Etapa adicionada!");
    await loadProjects();
  }, [projects]);

  const addTask = useCallback(async (input: { projectId: string; stageId: string; name: string; description?: string; responsibleId?: string | null; priority?: string; startDate?: Date; endDate?: Date }) => {
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
  }, [user]);

  const duplicateProject = useCallback(async (id: string) => {
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
  }, [projects, templates, addProject]);

  const saveProjectAsTemplate = useCallback(async (id: string) => {
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
  }, [projects, user]);

  const archiveProject = useCallback(async (id: string) => {
    await updateProject(id, { status: "archived" as any });
    toast.success("Projeto arquivado!");
  }, [updateProject]);

  const syncProjectStatus = async (projectId: string) => {
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
    const updates: any = {};
    if (data.name !== undefined) updates.title = data.name;
    if (data.status !== undefined) updates.status = data.status;
    if (data.responsible !== undefined) updates.responsible_id = data.responsible;
    if (data.priority !== undefined) updates.priority = data.priority;

    const { error } = await supabase.from("tasks").update(updates).eq("id", taskId);
    if (error) { toast.error("Erro ao atualizar tarefa"); return; }
    await syncProjectStatus(projectId);
    await loadProjects();
  }, []);

  const deleteTask = useCallback(async (projectId: string, taskId: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (error) { toast.error("Erro ao excluir tarefa"); return; }
    toast.success("Tarefa excluída");
    await syncProjectStatus(projectId);
    await loadProjects();
  }, []);

  const updateStage = useCallback(async (projectId: string, stageId: string, name: string) => {
    const { error } = await supabase.from("project_stages").update({ name }).eq("id", stageId);
    if (error) { toast.error("Erro ao atualizar etapa"); return; }
    toast.success("Etapa atualizada");
    await loadProjects();
  }, []);

  const deleteStage = useCallback(async (projectId: string, stageId: string) => {
    const { error: tErr } = await supabase.from("tasks").delete().eq("stage_id", stageId);
    const { error } = await supabase.from("project_stages").delete().eq("id", stageId);
    if (error) { toast.error("Erro ao excluir etapa"); return; }
    toast.success("Etapa excluída");
    await loadProjects();
  }, []);

  const refreshProjects = loadProjects;
  const refreshTransactions = loadTransactions;
  const refreshAccounts = loadAccounts;

  const addTransaction = useCallback(async (t: Omit<Transaction, "id">) => {
    const { error } = await supabase.from("financial_transactions").insert({
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
    if (error) { toast.error("Erro ao registrar movimentação"); return; }
    await loadTransactions();
  }, [user]);

  const updateAccountBalance = useCallback(async (accountId: string, delta: number) => {
    const acc = accounts.find((a) => a.id === accountId);
    if (!acc) return;
    const { error } = await supabase
      .from("financial_accounts")
      .update({ balance: acc.balance + delta })
      .eq("id", accountId);
    if (error) { toast.error("Erro ao atualizar saldo"); return; }
    await loadAccounts();
  }, [accounts]);

  const addReceivable = useCallback(async (r: Omit<ReceivablePayable, "id">) => {
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
    if (error) { toast.error("Erro ao registrar"); return; }
    toast.success(r.type === "income" ? "Receita registrada!" : "Despesa registrada!");
    await loadReceivables();
  }, []);

  const payReceivable = useCallback(async (id: string, paymentData: { discount: number; interest: number; accountId: string; categoryId: string; projectId: string | null }) => {
    const item = receivables.find((r) => r.id === id);
    if (!item) return;
    const finalValue = item.value - paymentData.discount + paymentData.interest;

    // Create transaction
    await addTransaction({
      type: item.type === "income" ? "income" : "expense",
      projectId: paymentData.projectId,
      accountId: paymentData.accountId,
      categoryId: paymentData.categoryId,
      value: finalValue,
      date: new Date(),
      description: item.description,
    });

    // Update balance
    await updateAccountBalance(paymentData.accountId, item.type === "income" ? finalValue : -finalValue);

    // Update entry status
    await supabase.from("financial_entries").update({ status: "paid" }).eq("id", id);
    toast.success(item.type === "income" ? "Recebimento confirmado!" : "Pagamento confirmado!");
    await loadReceivables();
  }, [receivables, addTransaction, updateAccountBalance]);

  const addTaskMessage = useCallback(async (msg: { taskId: string; author: string; text: string }) => {
    const { error } = await supabase.from("task_messages").insert({
      task_id: msg.taskId,
      sender_id: user?.id || msg.author,
      message: msg.text,
    });
    if (error) { toast.error("Erro ao enviar mensagem"); return; }
    await loadProjects();
  }, [user]);

  const addNotification = useCallback(async (n: { type: string; title: string; description: string; userId: string; link?: string }) => {
    await supabase.from("notifications").insert({
      user_id: n.userId,
      type: n.type,
      title: n.title,
      message: n.description,
      link: n.link || "",
    });
  }, []);

  const markNotificationRead = useCallback(async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const addCategory = useCallback(async (name: string, type: "income" | "expense") => {
    const { error } = await supabase.from("financial_categories").insert({ name, type });
    if (error) { toast.error("Erro ao criar categoria"); return; }
    toast.success("Categoria criada com sucesso!");
    await loadCategories();
  }, []);

  return (
    <AppContext.Provider
      value={{
        projects, templates, transactions, accounts, receivables, categories, taskMessages, notifications, loading, profiles,
        addProject, updateProject, updateProjectInvestment, duplicateProject, saveProjectAsTemplate, archiveProject, updateTask, deleteTask, updateStage, deleteStage, addStage, addTask,
        addTransaction, updateAccountBalance,
        addReceivable, payReceivable,
        addTaskMessage, addNotification, markNotificationRead, getProjectCode,
        refreshProjects, refreshTransactions, refreshAccounts, addCategory,
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