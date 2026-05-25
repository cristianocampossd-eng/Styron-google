import { addDays, subDays, format } from "date-fns";

const today = new Date();

export type ProjectStatus = "planning" | "in_progress" | "completed" | "archived";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "todo" | "in_progress" | "review" | "done";
export type TransactionType = "income" | "expense" | "transfer" | "withdrawal";

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  startDate: Date;
  endDate: Date;
  responsible: string;
  progress: number;
  stages: Stage[];
  isTemplate?: boolean;
  createdBy?: string;
}

export interface Stage {
  id: string;
  name: string;
  order: number;
  tasks: Task[];
}

export interface Task {
  id: string;
  name: string;
  description: string;
  responsible: string;
  startDate: Date;
  endDate: Date;
  status: TaskStatus;
  priority: TaskPriority;
  comments: Comment[];
  dependencies: string[];
}

export interface Comment {
  id: string;
  author: string;
  text: string;
  date: Date;
}

export interface Account {
  id: string;
  name: string;
  balance: number;
}

export interface Category {
  id: string;
  name: string;
  type: "income" | "expense";
}

export interface Transaction {
  id: string;
  type: TransactionType;
  projectId: string | null;
  accountId: string;
  categoryId: string;
  value: number;
  date: Date;
  description: string;
  systemId?: string | null;
  affectsSystemBalance?: boolean | null;
}

export interface RecurringItem {
  id: string;
  name: string;
  value: number;
  frequency: "monthly" | "weekly" | "yearly";
  type: "income" | "expense";
  categoryId: string;
  accountId: string;
}

export const people = ["Ana Silva", "Carlos Mendes", "Julia Santos", "Pedro Costa", "Mariana Lima", "Rafael Oliveira"];

export const mockCategories: Category[] = [
  { id: "cat1", name: "Desenvolvimento", type: "expense" },
  { id: "cat2", name: "Marketing", type: "expense" },
  { id: "cat3", name: "Infraestrutura", type: "expense" },
  { id: "cat4", name: "Consultoria", type: "income" },
  { id: "cat5", name: "Licenciamento", type: "income" },
  { id: "cat6", name: "Serviços", type: "income" },
  { id: "cat7", name: "Operacional", type: "expense" },
  { id: "cat8", name: "Vendas", type: "income" },
];

export const mockAccounts: Account[] = [
  { id: "acc1", name: "Conta Principal", balance: 45200.50 },
  { id: "acc2", name: "Conta Operacional", balance: 12800.00 },
  { id: "acc3", name: "Reserva", balance: 78500.00 },
  { id: "acc4", name: "Investimentos", balance: 32000.00 },
];

const createTasks = (stageId: string, count: number, baseDate: Date): Task[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `${stageId}-task${i + 1}`,
    name: ["Levantamento de requisitos", "Prototipação", "Desenvolvimento frontend", "Testes unitários", "Deploy", "Revisão de código", "Documentação", "Integração API"][i % 8],
    description: "Descrição detalhada da tarefa com objetivos e critérios de aceitação.",
    responsible: people[i % people.length],
    startDate: addDays(baseDate, i * 3),
    endDate: addDays(baseDate, i * 3 + 5),
    status: (["done", "done", "in_progress", "todo"] as TaskStatus[])[i % 4],
    priority: (["high", "medium", "low", "urgent"] as TaskPriority[])[i % 4],
    comments: [
      { id: `c${stageId}${i}1`, author: people[0], text: "Iniciado conforme planejado.", date: subDays(today, 5) },
    ],
    dependencies: i > 0 ? [`${stageId}-task${i}`] : [],
  }));

export const mockProjects: Project[] = [
  {
    id: "p1", name: "Redesign Plataforma Web", description: "Redesign completo da plataforma com foco em UX moderna.",
    status: "in_progress", startDate: subDays(today, 30), endDate: addDays(today, 60), responsible: "Ana Silva", progress: 45,
    stages: [
      { id: "p1s1", name: "Descoberta", order: 1, tasks: createTasks("p1s1", 3, subDays(today, 30)) },
      { id: "p1s2", name: "Design", order: 2, tasks: createTasks("p1s2", 4, subDays(today, 15)) },
      { id: "p1s3", name: "Desenvolvimento", order: 3, tasks: createTasks("p1s3", 4, addDays(today, 5)) },
    ],
  },
  {
    id: "p2", name: "App Mobile v2", description: "Segunda versão do aplicativo mobile com novos recursos.",
    status: "in_progress", startDate: subDays(today, 15), endDate: addDays(today, 90), responsible: "Carlos Mendes", progress: 20,
    stages: [
      { id: "p2s1", name: "Planejamento", order: 1, tasks: createTasks("p2s1", 3, subDays(today, 15)) },
      { id: "p2s2", name: "Implementação", order: 2, tasks: createTasks("p2s2", 5, addDays(today, 10)) },
    ],
  },
  {
    id: "p3", name: "Migração Cloud", description: "Migração da infraestrutura para cloud.",
    status: "planning", startDate: addDays(today, 10), endDate: addDays(today, 120), responsible: "Julia Santos", progress: 0,
    stages: [
      { id: "p3s1", name: "Análise", order: 1, tasks: createTasks("p3s1", 2, addDays(today, 10)) },
    ],
  },
  {
    id: "p4", name: "Sistema de Pagamentos", description: "Integração com gateways de pagamento.",
    status: "completed", startDate: subDays(today, 90), endDate: subDays(today, 10), responsible: "Pedro Costa", progress: 100,
    stages: [
      { id: "p4s1", name: "Integração", order: 1, tasks: createTasks("p4s1", 4, subDays(today, 90)) },
      { id: "p4s2", name: "Testes", order: 2, tasks: createTasks("p4s2", 3, subDays(today, 40)) },
    ],
  },
  {
    id: "p5", name: "Dashboard Analytics", description: "Painel de analytics com métricas em tempo real.",
    status: "in_progress", startDate: subDays(today, 20), endDate: addDays(today, 40), responsible: "Mariana Lima", progress: 60,
    stages: [
      { id: "p5s1", name: "Backend", order: 1, tasks: createTasks("p5s1", 3, subDays(today, 20)) },
      { id: "p5s2", name: "Frontend", order: 2, tasks: createTasks("p5s2", 4, subDays(today, 5)) },
    ],
  },
  {
    id: "p6", name: "API Gateway", description: "Centralização de APIs com rate limiting.",
    status: "planning", startDate: addDays(today, 5), endDate: addDays(today, 70), responsible: "Rafael Oliveira", progress: 0,
    stages: [
      { id: "p6s1", name: "Arquitetura", order: 1, tasks: createTasks("p6s1", 2, addDays(today, 5)) },
    ],
  },
  {
    id: "p7", name: "Onboarding Automatizado", description: "Fluxo de onboarding para novos clientes.",
    status: "completed", startDate: subDays(today, 60), endDate: subDays(today, 5), responsible: "Ana Silva", progress: 100,
    stages: [
      { id: "p7s1", name: "Fluxo", order: 1, tasks: createTasks("p7s1", 3, subDays(today, 60)) },
    ],
  },
  {
    id: "p8", name: "CRM Interno", description: "Sistema CRM para equipe de vendas.",
    status: "in_progress", startDate: subDays(today, 10), endDate: addDays(today, 50), responsible: "Carlos Mendes", progress: 30,
    stages: [
      { id: "p8s1", name: "MVP", order: 1, tasks: createTasks("p8s1", 4, subDays(today, 10)) },
    ],
  },
];

export const mockTransactions: Transaction[] = [
  { id: "t1", type: "income", projectId: "p1", accountId: "acc1", categoryId: "cat4", value: 15000, date: subDays(today, 2), description: "Consultoria design" },
  { id: "t2", type: "expense", projectId: "p1", accountId: "acc2", categoryId: "cat1", value: 8500, date: subDays(today, 5), description: "Salário dev frontend" },
  { id: "t3", type: "income", projectId: "p4", accountId: "acc1", categoryId: "cat5", value: 25000, date: subDays(today, 8), description: "Licença software" },
  { id: "t4", type: "expense", projectId: "p2", accountId: "acc2", categoryId: "cat2", value: 3200, date: subDays(today, 10), description: "Campanha marketing" },
  { id: "t5", type: "expense", projectId: null, accountId: "acc2", categoryId: "cat3", value: 1800, date: subDays(today, 12), description: "Servidor cloud" },
  { id: "t6", type: "income", projectId: "p5", accountId: "acc1", categoryId: "cat6", value: 12000, date: subDays(today, 15), description: "Serviço analytics" },
  { id: "t7", type: "expense", projectId: "p3", accountId: "acc2", categoryId: "cat7", value: 4500, date: subDays(today, 18), description: "Licença ferramentas" },
  { id: "t8", type: "income", projectId: null, accountId: "acc1", categoryId: "cat8", value: 9800, date: subDays(today, 20), description: "Vendas Q1" },
  { id: "t9", type: "transfer", projectId: null, accountId: "acc1", categoryId: "cat7", value: 5000, date: subDays(today, 3), description: "Transferência para reserva" },
  { id: "t10", type: "expense", projectId: "p8", accountId: "acc2", categoryId: "cat1", value: 6700, date: subDays(today, 1), description: "Desenvolvimento CRM" },
  { id: "t11", type: "income", projectId: "p7", accountId: "acc1", categoryId: "cat6", value: 18000, date: subDays(today, 25), description: "Projeto onboarding" },
  { id: "t12", type: "expense", projectId: "p5", accountId: "acc2", categoryId: "cat3", value: 2100, date: subDays(today, 7), description: "Hospedagem dados" },
  { id: "t13", type: "income", projectId: null, accountId: "acc4", categoryId: "cat8", value: 7500, date: subDays(today, 30), description: "Vendas recorrentes" },
  { id: "t14", type: "expense", projectId: "p1", accountId: "acc2", categoryId: "cat2", value: 4200, date: subDays(today, 4), description: "Material promocional" },
  { id: "t15", type: "income", projectId: "p2", accountId: "acc1", categoryId: "cat4", value: 11000, date: subDays(today, 14), description: "Consultoria mobile" },
];

export const mockRecurring: RecurringItem[] = [
  { id: "r1", name: "Assinatura AWS", value: 2500, frequency: "monthly", type: "expense", categoryId: "cat3", accountId: "acc2" },
  { id: "r2", name: "Receita SaaS", value: 15000, frequency: "monthly", type: "income", categoryId: "cat8", accountId: "acc1" },
  { id: "r3", name: "Aluguel escritório", value: 4000, frequency: "monthly", type: "expense", categoryId: "cat7", accountId: "acc2" },
  { id: "r4", name: "Licença anual", value: 8000, frequency: "yearly", type: "expense", categoryId: "cat5", accountId: "acc2" },
  { id: "r5", name: "Consultoria fixa", value: 6000, frequency: "monthly", type: "income", categoryId: "cat4", accountId: "acc1" },
];

export const statusColors: Record<ProjectStatus, string> = {
  planning: "bg-warning/10 text-warning",
  in_progress: "bg-primary/10 text-primary",
  completed: "bg-success/10 text-success",
  archived: "bg-muted text-muted-foreground",
};

export const statusLabels: Record<ProjectStatus, string> = {
  planning: "Planejamento",
  in_progress: "Em andamento",
  completed: "Concluído",
  archived: "Arquivado",
};

export const taskStatusLabels: Record<TaskStatus, string> = {
  todo: "A fazer",
  in_progress: "Em andamento",
  review: "Revisão",
  done: "Concluído",
};

export const priorityLabels: Record<TaskPriority, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  urgent: "Urgente",
};

export const priorityColors: Record<TaskPriority, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-primary/10 text-primary",
  high: "bg-warning/10 text-warning",
  urgent: "bg-destructive/10 text-destructive",
};