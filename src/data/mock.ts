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
  dueDate?: Date;
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

export const mockCategories: Category[] = [];

export const mockAccounts: Account[] = [];

const createTasks = (stageId: string, count: number, baseDate: Date): Task[] => [];

export const mockProjects: Project[] = [];

export const mockTransactions: Transaction[] = [];

export const mockRecurring: RecurringItem[] = [];

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