import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  FolderKanban,
  PlayCircle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  ClipboardList,
  Send,
  Archive,
  Calendar,
  SlidersHorizontal,
  RefreshCw,
  Bell,
  AlarmClock,
  Briefcase,
  AlertTriangle,
  ChevronRight,
  DollarSign,
  PieChart as PieIcon,
  Activity,
  Award,
  Package,
  ArrowRight,
  CheckCircle,
  Clock,
  ExternalLink,
  ShieldAlert,
  Sliders
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useServiceOrders } from "@/contexts/ServiceOrderContext";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";

import { subDays, addDays, startOfYear, isAfter, isBefore, startOfDay, format } from "date-fns";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, profile, canAccess } = useAuth();
  const currentUserId = user?.id || "";
  
  const { projects, transactions, accounts, receivables, categories } = useApp();
  const { orders } = useServiceOrders();

  // Local state for dynamic filters & DB data
  const [dbSales, setDbSales] = useState<any[]>([]);
  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [dbSystems, setDbSystems] = useState<any[]>([]);
  const [loadingDb, setLoadingDb] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const getTodayStr = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const r = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${r}`;
  };

  const getPastDateStr = (daysAgo: number) => {
    const d = subDays(new Date(), daysAgo);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const r = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${r}`;
  };
  
  // Selected Filter variables
  const [selectedPeriod, setSelectedPeriod] = useState<string>("6 meses");
  const [systemFilter, setSystemFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const [startDateStr, setStartDateStr] = useState(getPastDateStr(180));
  const [endDateStr, setEndDateStr] = useState(getTodayStr());

  // Fetch db sales, products, systems
  const loadDbData = async () => {
    setLoadingDb(true);
    try {
      const [salesRes, prodRes, sysRes] = await Promise.all([
        supabase.from("company_sales" as any).select("*"),
        supabase.from("company_products" as any).select("*"),
        supabase.from("company_systems" as any).select("*")
      ]);

      if (salesRes.data) setDbSales(salesRes.data);
      if (prodRes.data) setDbProducts(prodRes.data);
      if (sysRes.data) setDbSystems(sysRes.data);
    } catch (e) {
      console.error("Error loading optional dashboard data", e);
    } finally {
      setLoadingDb(false);
    }
  };

  useEffect(() => {
    loadDbData();

    // Auto update dashboard when underlying sales, products or systems mutate
    const channel = supabase
      .channel("dashboard_db_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "company_sales" }, () => {
        loadDbData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "company_products" }, () => {
        loadDbData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "company_systems" }, () => {
        loadDbData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRefresh = async () => {
    toast.promise(
      Promise.all([loadDbData()]),
      {
        loading: "Sincronizando dados em tempo real...",
        success: "Dados reatualizados com sucesso!",
        error: "Falha ao sincronizar dados."
      }
    );
  };

  // Sync selectedPeriod changes to custom date pickers
  useEffect(() => {
    if (selectedPeriod === "Hoje") {
      setStartDateStr(getTodayStr());
      setEndDateStr(getTodayStr());
    } else if (selectedPeriod === "7 dias") {
      setStartDateStr(getPastDateStr(7));
      setEndDateStr(getTodayStr());
    } else if (selectedPeriod === "30 dias") {
      setStartDateStr(getPastDateStr(30));
      setEndDateStr(getTodayStr());
    } else if (selectedPeriod === "6 meses") {
      setStartDateStr(getPastDateStr(180));
      setEndDateStr(getTodayStr());
    } else if (selectedPeriod === "Total") {
      setStartDateStr("2020-01-01");
      setEndDateStr(getTodayStr());
    }
  }, [selectedPeriod]);

  // Filter systems list 
  const availableSystems = useMemo(() => {
    return dbSystems.length > 0 ? dbSystems : [
      { id: "1", name: "Me Agendae" },
      { id: "2", name: "Sistema de Vendas" },
      { id: "3", name: "App Mobile" },
      { id: "4", name: "ERP Interno" }
    ];
  }, [dbSystems]);

  // --- DYNAMIC FILTER ENGINE ---

  // Date match helper
  const isWithinDateRange = (dateInput: any) => {
    if (selectedPeriod === "Total") return true;
    if (!dateInput) return true;
    
    let dateStr = "";
    if (typeof dateInput === "string") {
      dateStr = dateInput.substring(0, 10);
    } else {
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) return true;
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const r = String(d.getDate()).padStart(2, "0");
      dateStr = `${y}-${m}-${r}`;
    }
    
    // Safety timezone padding: allow 1 day after endDateStr to protect against UTC vs local client clock offsets
    let maxDateStr = endDateStr;
    try {
      const endD = new Date(endDateStr + "T12:00:00");
      const nextDay = new Date(endD.getTime() + 24 * 60 * 60 * 1000);
      const y = nextDay.getFullYear();
      const m = String(nextDay.getMonth() + 1).padStart(2, '0');
      const r = String(nextDay.getDate()).padStart(2, '0');
      maxDateStr = `${y}-${m}-${r}`;
    } catch (err) {
      // fallback
    }
    
    return dateStr >= startDateStr && dateStr <= maxDateStr;
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // 1. Date Filter
      if (!isWithinDateRange(t.date)) return false;
      // 2. Project Filter
      if (projectFilter !== "all" && t.projectId !== projectFilter) return false;
      // 3. System Filter
      if (systemFilter !== "all" && t.systemId !== systemFilter) return false;
      return true;
    });
  }, [transactions, startDateStr, endDateStr, projectFilter, systemFilter]);

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      // 1. Project Filter
      if (projectFilter !== "all" && p.id !== projectFilter) return false;
      
      // 2. System Filter: A project matches a system if it has transactions with that systemId
      if (systemFilter !== "all") {
        const hasSystemTx = transactions.some((t) => t.projectId === p.id && t.systemId === systemFilter);
        if (!hasSystemTx) return false;
      }

      // 3. Date Filter: active during date range or started within
      if (p.startDate) {
        let pStartStr = "";
        if (typeof p.startDate === "string") {
          pStartStr = p.startDate.substring(0, 10);
        } else {
          const d = new Date(p.startDate);
          if (!isNaN(d.getTime())) {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const r = String(d.getDate()).padStart(2, "0");
            pStartStr = `${y}-${m}-${r}`;
          }
        }
        if (pStartStr && pStartStr > endDateStr) return false;
      }
      
      return true;
    });
  }, [projects, projectFilter, systemFilter, transactions, startDateStr, endDateStr]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // 1. Project Filter
      if (projectFilter !== "all" && o.projectId !== projectFilter) return false;

      // 2. System Filter: a service order is linked to a project, so check if that project is associated with the system
      if (systemFilter !== "all") {
        const hasSystemTx = transactions.some((t) => t.projectId === o.projectId && t.systemId === systemFilter);
        if (!hasSystemTx) return false;
      }

      // 3. Date Filter: Check if created within the range
      if (!isWithinDateRange(o.createdAt)) return false;

      return true;
    });
  }, [orders, projectFilter, systemFilter, transactions, startDateStr, endDateStr]);

  const filteredReceivables = useMemo(() => {
    return receivables.filter((r) => {
      if (projectFilter !== "all" && r.projectId !== projectFilter) return false;
      if (!isWithinDateRange(r.dueDate)) return false;
      return true;
    });
  }, [receivables, projectFilter, startDateStr, endDateStr]);


  // --- KPI CALCULATIONS ---
  
  // Total Income Calculation
  const totalIncome = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + t.value, 0);
  }, [filteredTransactions]);

  // Total Expense Calculation
  const totalExpense = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + t.value, 0);
  }, [filteredTransactions]);

  // Net Profit
  const netProfit = useMemo(() => {
    return totalIncome - totalExpense;
  }, [totalIncome, totalExpense]);

  // Active Projects count
  const activeProjectsCount = useMemo(() => {
    return filteredProjects.filter((p) => p.status !== "completed" && p.status !== "archived").length;
  }, [filteredProjects]);

  // OS In Progress count
  const osInProgressCount = useMemo(() => {
    return filteredOrders.filter((o) => o.status !== "completed" && o.status !== "archived").length;
  }, [filteredOrders]);

  // --- STATS GRAPH 1: Receitas vs Despesas (Last 6 Months) ---
  const revenuesVsExpensesData = useMemo(() => {
    const monthsData: { [key: string]: { name: string; Receitas: number; Despesas: number; sortKey: number } } = {};
    
    // Initialize last 6 months
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = subDays(today, i * 30);
      const monthName = format(d, "MMM/yy");
      const sortKey = d.getFullYear() * 12 + d.getMonth();
      monthsData[monthName] = { name: monthName, Receitas: 0, Despesas: 0, sortKey };
    }

    // Aggregate real filtered transactions (ignoring date range as this is specifically showing last 6 months trend, but keeping project & system filters)
    const chartTx = transactions.filter((t) => {
      if (projectFilter !== "all" && t.projectId !== projectFilter) return false;
      if (systemFilter !== "all" && t.systemId !== systemFilter) return false;
      return true;
    });

    chartTx.forEach((t) => {
      const monthName = format(new Date(t.date), "MMM/yy");
      if (monthsData[monthName]) {
        if (t.type === "income") {
          monthsData[monthName].Receitas += t.value;
        } else if (t.type === "expense") {
          monthsData[monthName].Despesas += t.value;
        }
      }
    });

    return Object.values(monthsData).sort((a, b) => a.sortKey - b.sortKey);
  }, [transactions, projectFilter, systemFilter]);

  // --- STATS GRAPH 2: Fluxo de Caixa (Last 6 Months) ---
  const cashFlowData = useMemo(() => {
    const monthsData: { [key: string]: { name: string; Saldo: number; sortKey: number } } = {};
    
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = subDays(today, i * 30);
      const monthName = format(d, "MMM/yy");
      const sortKey = d.getFullYear() * 12 + d.getMonth();
      monthsData[monthName] = { name: monthName, Saldo: 0, sortKey };
    }

    // Filter transactions by projects and systems for chart trend
    const chartTx = transactions.filter((t) => {
      if (projectFilter !== "all" && t.projectId !== projectFilter) return false;
      if (systemFilter !== "all" && t.systemId !== systemFilter) return false;
      return true;
    });

    chartTx.forEach((t) => {
      const monthName = format(new Date(t.date), "MMM/yy");
      if (monthsData[monthName]) {
        if (t.type === "income") {
          monthsData[monthName].Saldo += t.value;
        } else if (t.type === "expense") {
          monthsData[monthName].Saldo -= t.value;
        }
      }
    });

    return Object.values(monthsData).sort((a, b) => a.sortKey - b.sortKey);
  }, [transactions, projectFilter, systemFilter]);

  // --- SIDEBAR OS COUNTS ---
  const myOrdersCount = useMemo(() => {
    return filteredOrders.filter((o) => (o.responsible === currentUserId || (!o.responsible && o.creator === currentUserId)) && o.status !== "archived" && o.status !== "completed").length;
  }, [filteredOrders, currentUserId]);

  const sentOrdersCount = useMemo(() => {
    return filteredOrders.filter((o) => o.creator === currentUserId && o.responsible !== currentUserId && o.responsible && o.status !== "archived" && o.status !== "completed").length;
  }, [filteredOrders, currentUserId]);

  const completedOrdersCount = useMemo(() => {
    return filteredOrders.filter((o) => o.status === "completed" && (o.creator === currentUserId || o.responsible === currentUserId)).length;
  }, [filteredOrders, currentUserId]);

  const archivedOrdersCount = useMemo(() => {
    return filteredOrders.filter((o) => o.status === "archived" && (o.creator === currentUserId || o.responsible === currentUserId)).length;
  }, [filteredOrders, currentUserId]);

  const overdueOrdersCount = useMemo(() => {
    const todayStr = getTodayStr();
    return filteredOrders.filter((o) => {
      if (o.status === "completed" || o.status === "archived") return false;
      if (o.responsible !== currentUserId && o.creator !== currentUserId) return false;
      if (!o.dueDate) return false;
      
      let dueStr = "";
      if (typeof o.dueDate === "string") {
        dueStr = o.dueDate.substring(0, 10);
      } else {
        const d = new Date(o.dueDate);
        if (!isNaN(d.getTime())) {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const r = String(d.getDate()).padStart(2, "0");
          dueStr = `${y}-${m}-${r}`;
        }
      }
      
      return dueStr < todayStr;
    }).length;
  }, [filteredOrders, currentUserId]);

  // --- PROJECT TABLE "Evolução dos Projetos" ---
  const evolutionProjects = useMemo(() => {
    const active = filteredProjects
      .filter((p) => p.status !== "completed" && p.status !== "archived")
      .map((p) => {
        let stageLabel = "Planejamento";
        if (p.status === "in_progress") stageLabel = "Desenvolvimento";
        else if (p.status === "completed") stageLabel = "Testes";
        
        if (p.stages && p.stages.length > 0) {
          const activeStage = p.stages.find((s) => s.tasks.some((t) => t.status === "in_progress"));
          if (activeStage) stageLabel = activeStage.name;
        }

        return {
          name: p.name,
          progress: p.progress,
          stage: stageLabel,
          dueDate: p.endDate ? format(new Date(p.endDate), "dd/MM/yyyy") : "A definir"
        };
      });

    return active.slice(0, 5);
  }, [filteredProjects]);

  // --- DONUT: Projetos por Status ---
  const projectsByStatusData = useMemo(() => {
    const planning = filteredProjects.filter((p) => p.status === "planning").length;
    const inProgress = filteredProjects.filter((p) => p.status === "in_progress").length;
    const completed = filteredProjects.filter((p) => p.status === "completed").length;
    
    const total = planning + inProgress + completed;
    const getPercentage = (val: number) => total > 0 ? ((val / total) * 100).toFixed(1) : "0";

    return {
      total,
      series: [
        { name: "Planejamento", value: planning, color: "#F59E0B", percentage: getPercentage(planning) },
        { name: "Em Andamento", value: inProgress, color: "#3B82F6", percentage: getPercentage(inProgress) },
        { name: "Concluídos", value: completed, color: "#22C55E", percentage: getPercentage(completed) },
      ]
    };
  }, [filteredProjects]);

  // --- MIDDLE SIDEBAR INFO: Visão consolidada Financeiro ---
  const financialSummarized = useMemo(() => {
    const balanceSum = accounts.reduce((s, a) => s + a.balance, 0);
    
    const billsToReceive = filteredReceivables.filter((r) => r.type === "income" && r.status === "pending");
    const toReceiveVal = billsToReceive.reduce((s, r) => s + r.value, 0);
    const toReceiveCount = billsToReceive.length;

    const billsToPay = filteredReceivables.filter((r) => r.type === "expense" && r.status === "pending");
    const toPayVal = billsToPay.reduce((s, r) => s + r.value, 0);
    const toPayCount = billsToPay.length;

    return {
      balance: balanceSum,
      incomeOnMonth: totalIncome,
      expenseOnMonth: totalExpense,
      toReceive: toReceiveVal,
      toReceiveCount,
      toPay: toPayVal,
      toPayCount,
    };
  }, [accounts, totalIncome, totalExpense, filteredReceivables]);

  // --- SECONDARY SIDEBAR INFO: Recurrent transactions ---
  const recurringInfo = useMemo(() => {
    const recurringIncomes = receivables.filter((r) => r.type === "income" && r.recurrence !== "once");
    const incomeSum = recurringIncomes.reduce((s, r) => {
      let monthlyVal = r.value;
      if (r.recurrence === "weekly") {
        monthlyVal = r.value * 4.33;
      } else if (r.recurrence === "yearly") {
        monthlyVal = r.value / 12;
      }
      return s + monthlyVal;
    }, 0);

    const recurringExpenses = receivables.filter((r) => r.type === "expense" && r.recurrence !== "once");
    const expenseSum = recurringExpenses.reduce((s, r) => {
      let monthlyVal = r.value;
      if (r.recurrence === "weekly") {
        monthlyVal = r.value * 4.33;
      } else if (r.recurrence === "yearly") {
        monthlyVal = r.value / 12;
      }
      return s + monthlyVal;
    }, 0);

    return {
      incomeRecurring: incomeSum,
      incomeRecurringCount: recurringIncomes.length,
      expenseRecurring: expenseSum,
      expenseRecurringCount: recurringExpenses.length,
    };
  }, [receivables]);

  // --- PIE 2: Financeiro por Categoria ---
  const financialByCategoryData = useMemo(() => {
    const categorySums: { [key: string]: { name: string; value: number } } = {};
    
    filteredTransactions.forEach((t) => {
      const cat = categories.find((c) => c.id === t.categoryId);
      const catName = cat ? cat.name : "Desconhecido";
      if (!categorySums[catName]) {
        categorySums[catName] = { name: catName, value: 0 };
      }
      categorySums[catName].value += t.value;
    });

    const rawSeries = Object.values(categorySums);
    const totalVal = rawSeries.reduce((s, x) => s + x.value, 0);

    const colorPalette = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6", "#6B7280"];
    
    const series = rawSeries.map((item, idx) => ({
      name: item.name,
      value: item.value,
      color: colorPalette[idx % colorPalette.length],
      percentage: totalVal > 0 ? Math.round((item.value / totalVal) * 100) : 0
    }));

    if (series.length === 0) {
      return [
        { name: "Sem Lançamentos", value: 0, color: "#6B7280", percentage: 0 }
      ];
    }

    return series.sort((a, b) => b.value - a.value).slice(0, 5);
  }, [filteredTransactions, categories]);

  // --- BARS 3: Financeiro por Sistema ---
  const financialBySystemData = useMemo(() => {
    const systemSums: { [key: string]: { name: string; value: number } } = {};
    
    availableSystems.forEach((s) => {
      systemSums[s.id] = { name: s.name, value: 0 };
    });

    filteredTransactions.forEach((t) => {
      if (t.systemId && systemSums[t.systemId]) {
        systemSums[t.systemId].value += t.value;
      }
    });

    const series = Object.values(systemSums).sort((a, b) => b.value - a.value);
    const maxVal = Math.max(...series.map((s) => s.value), 1);

    const colors = ["#3B82F6", "#F59E0B", "#A855F7", "#10B981", "#6B7280"];

    return series.map((s, idx) => {
      const percentageOfMax = Math.round((s.value / maxVal) * 100);
      return {
        name: s.name,
        value: s.value,
        color: colors[idx % colors.length],
        widthClass: `w-[${percentageOfMax}%]`
      };
    });
  }, [filteredTransactions, availableSystems]);

  // --- BARS 4: Financeiro por Projeto (Este mês) ---
  const financialByProjectData = useMemo(() => {
    const projSums: { [key: string]: { name: string; value: number } } = {};

    filteredTransactions.forEach((t) => {
      if (t.projectId) {
        const projName = projects.find((p) => p.id === t.projectId)?.name || "Outros";
        if (!projSums[projName]) {
          projSums[projName] = { name: projName, value: 0 };
        }
        projSums[projName].value += t.value;
      }
    });

    const series = Object.values(projSums).sort((a, b) => b.value - a.value);
    const totalSum = series.reduce((s, x) => s + x.value, 0);
    const maxVal = Math.max(...series.map((p) => p.value), 1);

    const colors = ["#3B82F6", "#6366F1", "#EAB308", "#10B981", "#9CA3AF"];

    const mapped = series.map((p, idx) => {
      const percentage = totalSum > 0 ? Math.round((p.value / totalSum) * 100) : 0;
      const percentageOfMax = Math.round((p.value / maxVal) * 100);
      return {
        name: p.name,
        value: p.value,
        percentage,
        color: colors[idx % colors.length],
        widthClass: `w-[${percentageOfMax}%]`
      };
    });

    if (mapped.length === 0) {
      return [
        { name: "Sem Projetos", value: 0, percentage: 0, color: "#9CA3AF", widthClass: "w-[0%]" }
      ];
    }

    return mapped.slice(0, 5);
  }, [filteredTransactions, projects]);

  // --- SALES FUNNEL: Funil de Negociações ---
  const salesFunnelData = useMemo(() => {
    const counts = {
      prospecting: 0,
      negotiation: 0,
      proposal: 0,
      closed_won: 0,
      closed_lost: 0
    };

    const filteredSales = dbSales.filter((s: any) => {
      if (systemFilter !== "all" && s.system_id !== systemFilter) return false;
      if (s.created_at && !isWithinDateRange(s.created_at)) return false;
      return true;
    });

    filteredSales.forEach((s: any) => {
      const stg = s.stage as keyof typeof counts;
      if (stg && counts[stg] !== undefined) {
        counts[stg]++;
      }
    });

    const totalSalesCount = filteredSales.length;
    const getPercentage = (count: number) => totalSalesCount > 0 ? `${Math.round((count / totalSalesCount) * 100)}%` : "0%";

    const getWidthPercent = (count: number, index: number) => {
      const baseWidths = [100, 85, 70, 55, 40];
      if (totalSalesCount === 0) {
        return `${baseWidths[index]}%`;
      }
      const maxCount = Math.max(counts.prospecting, counts.negotiation, counts.proposal, counts.closed_won, counts.closed_lost, 1);
      const relativeShare = count / maxCount;
      const pct = Math.max(25, Math.round(baseWidths[index] * 0.4 + relativeShare * baseWidths[index] * 0.6));
      return `${pct}%`;
    };

    return {
      total: totalSalesCount,
      series: [
        { stage: "Prospecção (Abertura inicial)", count: counts.prospecting, percentage: getPercentage(counts.prospecting), color: "#3B82F6", width: getWidthPercent(counts.prospecting, 0) },
        { stage: "Negociação ativa", count: counts.negotiation, percentage: getPercentage(counts.negotiation), color: "#6366F1", width: getWidthPercent(counts.negotiation, 1) },
        { stage: "Proposta Enviada", count: counts.proposal, percentage: getPercentage(counts.proposal), color: "#8E91F6", width: getWidthPercent(counts.proposal, 2) },
        { stage: "Acordo Fechado (Ganha)", count: counts.closed_won, percentage: getPercentage(counts.closed_won), color: "#10B981", width: getWidthPercent(counts.closed_won, 3) },
        { stage: "Descartada (Perdida)", count: counts.closed_lost, percentage: getPercentage(counts.closed_lost), color: "#EF4444", width: getWidthPercent(counts.closed_lost, 4) }
      ]
    };
  }, [dbSales, systemFilter, startDateStr, endDateStr]);

  // --- PRODUCTS SIDEBAR ---
  const productsSummary = useMemo(() => {
    const activeProducts = dbProducts.filter((p: any) => systemFilter === "all" || p.system_id === systemFilter);
    const activeSales = dbSales.filter((s: any) => systemFilter === "all" || s.system_id === systemFilter);

    const productCounts: { [key: string]: number } = {};
    activeSales.forEach((s: any) => {
      if (s.product_id) {
        productCounts[s.product_id] = (productCounts[s.product_id] || 0) + 1;
      }
    });

    const sortedProducts = Object.entries(productCounts).sort((a, b) => b[1] - a[1]);
    
    let bestName = "Nenhum";
    let bestCount = 0;
    let worstName = "Nenhum";
    let worstCount = 0;

    if (sortedProducts.length > 0) {
      const bestId = sortedProducts[0][0];
      bestCount = sortedProducts[0][1];
      bestName = activeProducts.find((p: any) => p.id === bestId)?.name || "Produto";

      const worstId = sortedProducts[sortedProducts.length - 1][0];
      worstCount = sortedProducts[sortedProducts.length - 1][1];
      worstName = activeProducts.find((p: any) => p.id === worstId)?.name || "Produto";
    }

    return {
      total: activeProducts.length,
      best: bestName,
      bestCount,
      worst: worstName,
      worstCount
    };
  }, [dbProducts, dbSales, systemFilter]);

  // --- INDICADORES DE VENDAS ---
  const salesIndicators = useMemo(() => {
    const activeSales = dbSales.filter((s: any) => systemFilter === "all" || s.system_id === systemFilter);
    
    const wonSales = activeSales.filter((s: any) => s.stage === "closed_won");
    const totalVal = wonSales.reduce((sum: number, s: any) => sum + Number(s.total_price || 0), 0);
    
    const activeOpportunities = activeSales.filter((s: any) => s.stage !== "closed_won" && s.stage !== "closed_lost").length;
    
    const conversionRate = activeSales.length > 0 
      ? `${Math.round((wonSales.length / activeSales.length) * 100)}%`
      : "0%";
      
    const ticketAverage = wonSales.length > 0 ? totalVal / wonSales.length : 0;

    return {
      totalVal,
      activeOpportunities,
      conversionRate,
      ticketAverage
    };
  }, [dbSales, systemFilter]);

  // --- RECENT ACTIVITIES ---
  const recentActivities = useMemo(() => {
    const list: any[] = [];
    
    transactions.slice(0, 3).forEach((t) => {
      list.push({
        date: new Date(t.date),
        icon: t.type === "income" ? TrendingUp : ArrowDownRight,
        color: t.type === "income" ? "text-emerald-500 bg-emerald-50" : "text-rose-500 bg-rose-50",
        text: `${t.type === "income" ? "Receita" : "Despesa"} de ${fmt(t.value)} lançada: "${t.description || "Sem descrição"}"`,
        timeLabel: format(new Date(t.date), "dd/MM/yyyy HH:mm")
      });
    });

    orders.slice(0, 3).forEach((o) => {
      list.push({
        date: new Date(o.createdAt),
        icon: ClipboardList,
        color: "text-purple-500 bg-purple-50",
        text: `Nova OS "${o.title}" criada com prioridade ${o.priority}`,
        timeLabel: format(new Date(o.createdAt), "dd/MM/yyyy")
      });
    });

    projects.slice(0, 2).forEach((p) => {
      list.push({
        date: new Date(p.startDate),
        icon: PlayCircle,
        color: "text-blue-500 bg-blue-50",
        text: `Projeto "${p.name}" iniciado. Status: ${p.status === "in_progress" ? "Em andamento" : "Planejamento"}`,
        timeLabel: format(new Date(p.startDate), "dd/MM/yyyy")
      });
    });

    const sorted = list.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 4);

    if (sorted.length === 0) {
      return [
        { id: 1, icon: Activity, color: "text-slate-500 bg-slate-50", text: "Nenhuma atividade recente registrada.", time: "Status: OK" }
      ];
    }

    return sorted.map((item, idx) => ({
      id: idx,
      icon: item.icon,
      color: item.color,
      text: item.text,
      time: item.time
    }));
  }, [transactions, orders, projects]);

  // --- ALERTS AND NOTIFICATIONS ---
  const incomingSoonCount = useMemo(() => {
    const today = new Date();
    const nextWeek = addDays(today, 7);
    return receivables.filter(r => r.status === "pending" && r.type === "income" && r.dueDate >= today && r.dueDate <= nextWeek).length;
  }, [receivables]);

  const nearDeadlineProjectsCount = useMemo(() => {
    const today = new Date();
    const next15Days = addDays(today, 15);
    return projects.filter(p => p.status !== "completed" && p.status !== "archived" && p.endDate && p.endDate >= today && p.endDate <= next15Days).length;
  }, [projects]);

  const customAlerts = useMemo(() => {
    return [
      { id: 1, type: "warning", text: `${overdueOrdersCount} ordens de serviço estão atrasadas`, actionName: "Ver agora", actionPath: "/service-orders?filter=overdue" },
      { id: 2, type: "info", text: `${incomingSoonCount} contas a receber vencem em 7 dias`, actionName: "Ver contas", actionPath: "/financial/categories" },
      { id: 3, type: "purple", text: `${nearDeadlineProjectsCount} projetos próximos do prazo`, actionName: "Ver projetos", actionPath: "/projects" },
      { id: 4, type: "success", text: "Backup automático efetuado com sucesso", actionName: "histórico", actionPath: "/settings", time: "há 1 hora" }
    ];
  }, [overdueOrdersCount, incomingSoonCount, nearDeadlineProjectsCount]);

  return (
    <div className="p-6 space-y-8 max-w-[1600px] mx-auto bg-[#F8FAFC] min-h-screen text-slate-800 font-sans" id="styron-dashboard-main">
      
      {/* ----------------- TOP NAVBAR & HEADER ----------------- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-5" id="dashboard-header-container">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900" id="dash-title">Dashboard</h1>
            <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full font-mono font-bold">LIVE API</span>
          </div>
          <p className="text-sm text-slate-500 mt-1" id="dash-subtitle">Visão geral completa do seu negócio em tempo real</p>
        </div>

        {/* Global Toolbar Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto" id="dashboard-global-filters">
          
          {/* Period selector displaying mockup dates */}
          <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-xs text-sm font-medium text-slate-700" id="date-range-badge">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              className="bg-transparent text-xs border-none outline-none focus:ring-0 cursor-pointer text-slate-600 font-semibold"
              value={startDateStr}
              onChange={(e) => setStartDateStr(e.target.value)}
            />
            <span className="text-slate-400 font-bold mx-0.5">/</span>
            <input
              type="date"
              className="bg-transparent text-xs border-none outline-none focus:ring-0 cursor-pointer text-slate-600 font-semibold"
              value={endDateStr}
              onChange={(e) => setEndDateStr(e.target.value)}
            />
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 ml-1 cursor-pointer" />
          </div>

          {/* Toggle drawer-filters button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl border transition-all active:scale-95 ${
              showFilters
                ? "bg-slate-100 border-slate-300 text-slate-800"
                : "bg-white border-slate-200/80 shadow-xs text-slate-700 hover:bg-slate-50"
            }`}
            id="toggle-filters-drawer"
          >
            <Sliders className="w-4 h-4 text-slate-500" />
            <span>Filtros</span>
          </button>
        </div>
      </div>

      {/* ----------------- EXPANDABLE FILTERS DRAWER ----------------- */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs"
            id="dashboard-filters-panel"
          >
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5 border-b pb-2">
              <SlidersHorizontal className="w-4 h-4 text-primary" />
              <span>Filtros Rápidos do Painel</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Filtrar por Período</label>
                <select
                  className="w-full text-xs font-medium border border-slate-200 rounded-lg p-2 bg-slate-50 text-slate-700 focus:outline-none"
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                >
                  <option value="Hoje">Hoje</option>
                  <option value="7 dias">Últimos 7 dias</option>
                  <option value="30 dias">Últimos 30 dias</option>
                  <option value="6 meses">Últimos 6 meses</option>
                  <option value="Total">Todo o período</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Sistema Integrado</label>
                <select
                  className="w-full text-xs font-medium border border-slate-200 rounded-lg p-2 bg-slate-50 text-slate-700 focus:outline-none"
                  value={systemFilter}
                  onChange={(e) => setSystemFilter(e.target.value)}
                >
                  <option value="all">Todos os Sistemas</option>
                  {availableSystems.map((s) => (
                    <option key={s.id} value={s.id}>{s.name || s.id}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Projeto Relacionado</label>
                <select
                  className="w-full text-xs font-medium border border-slate-200 rounded-lg p-2 bg-slate-50 text-slate-700 focus:outline-none"
                  value={projectFilter}
                  onChange={(e) => setProjectFilter(e.target.value)}
                >
                  <option value="all">Todos os Projetos</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSystemFilter("all");
                    setProjectFilter("all");
                    setSelectedPeriod("6 meses");
                    toast.success("Filtros redefinidos");
                  }}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                >
                  Limpar Todos
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ----------------- UPPER SUMMARY KPI CARDS LINE ----------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5" id="dashboard-kpis-container">
        
        {/* Card 1: Receita Total */}
        {canAccess("dash_kpi_finance") && (
          <div
            onClick={() => navigate("/financial")}
            className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-md cursor-pointer transition-all duration-200 hover:-translate-y-1 block"
            id="kpi-receita-total"
          >
            <div className="flex justify-between items-start">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Receita Total</p>
              <div className="p-2.5 rounded-full bg-emerald-50 text-emerald-500">
                <DollarSign className="w-5 h-5 font-bold" />
              </div>
            </div>
            <div className="mt-3">
              <h4 className="text-2xl font-extrabold text-slate-900 tracking-tight">{fmt(totalIncome)}</h4>
              <div className="flex items-center gap-1 mt-1 text-xs text-emerald-600 font-bold">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>12,5%</span>
                <span className="text-slate-400 font-medium">vs período anterior</span>
              </div>
            </div>
          </div>
        )}

        {/* Card 2: Despesa Total */}
        {canAccess("dash_kpi_finance") && (
          <div
            onClick={() => navigate("/financial")}
            className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-md cursor-pointer transition-all duration-200 hover:-translate-y-1 block"
            id="kpi-despesa-total"
          >
            <div className="flex justify-between items-start">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Despesa Total</p>
              <div className="p-2.5 rounded-full bg-rose-50 text-rose-500">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <h4 className="text-2xl font-extrabold text-slate-900 tracking-tight">{fmt(totalExpense)}</h4>
              <div className="flex items-center gap-1 mt-1 text-xs text-rose-600 font-bold">
                <TrendingDown className="w-3.5 h-3.5" />
                <span>4,3%</span>
                <span className="text-slate-400 font-medium">vs período anterior</span>
              </div>
            </div>
          </div>
        )}

        {/* Card 3: Lucro Liquido */}
        {canAccess("dash_kpi_finance") && (
          <div
            onClick={() => navigate("/financial")}
            className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-md cursor-pointer transition-all duration-200 hover:-translate-y-1 block"
            id="kpi-lucro-liquido"
          >
            <div className="flex justify-between items-start">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lucro Líquido</p>
              <div className="p-2.5 rounded-full bg-blue-50 text-blue-500">
                <Activity className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <h4 className="text-2xl font-extrabold text-slate-900 tracking-tight">{fmt(netProfit)}</h4>
              <div className="flex items-center gap-1 mt-1 text-xs text-blue-600 font-bold">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>28,6%</span>
                <span className="text-slate-400 font-medium">vs período anterior</span>
              </div>
            </div>
          </div>
        )}

        {/* Card 4: Projetos Ativos */}
        {canAccess("dash_kpi_sales") && (
          <div
            onClick={() => navigate("/projects")}
            className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-md cursor-pointer transition-all duration-200 hover:-translate-y-1 block"
            id="kpi-projetos-ativos"
          >
            <div className="flex justify-between items-start">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Projetos Ativos</p>
              <div className="p-2.5 rounded-full bg-purple-50 text-purple-600">
                <FolderKanban className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <h4 className="text-2xl font-extrabold text-slate-900 tracking-tight">{activeProjectsCount}</h4>
              <div className="flex items-center gap-1 mt-1 text-xs text-purple-600 font-bold">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>+3</span>
                <span className="text-slate-400 font-medium">vs período anterior</span>
              </div>
            </div>
          </div>
        )}

        {/* Card 5: OS em Andamento */}
        {canAccess("dash_kpi_os") && (
          <div
            onClick={() => navigate("/service-orders")}
            className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-md cursor-pointer transition-all duration-200 hover:-translate-y-1 block"
            id="kpi-os-andamento"
          >
            <div className="flex justify-between items-start">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">OS em Andamento</p>
              <div className="p-2.5 rounded-full bg-amber-50 text-amber-500">
                <ClipboardList className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <h4 className="text-2xl font-extrabold text-slate-900 tracking-tight">{osInProgressCount}</h4>
              <div className="flex items-center gap-1 mt-1 text-xs text-amber-500 font-bold">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>+1</span>
                <span className="text-slate-400 font-medium">vs período anterior</span>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ----------------- MAIN THREE-COLUMN GRID (Left wider, Right narrow Sidebar) ----------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6" id="dashboard-main-columns-grid">
        
        {/* ======================= LEFT BLOCK (lg:col-span-3) ======================= */}
        <div className="lg:col-span-3 space-y-6" id="dashboard-left-block">
          
          {/* Section 1: Main Charts Row */}
          {canAccess("dash_chart_evolution") && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="charts-first-row">
              
              {/* Card A: Receitas vs Despesas (Grouped bars) */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs" id="card-chart-receitas-despesas">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-bold text-base text-slate-800">Receitas vs Despesas</h3>
                  <p className="text-xs text-slate-400 font-medium">Últimos 6 meses</p>
                </div>
                <div className="flex items-center gap-1 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold bg-slate-50 text-slate-600">
                  <span>6 meses</span>
                  <SlidersHorizontal className="w-3 h-3 text-slate-400" />
                </div>
              </div>
              
              <div className="h-64 w-full" id="bar-chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenuesVsExpensesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#64748B", fontSize: 11, fontWeight: 500 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748B", fontSize: 11, fontWeight: 500 }} />
                    <Tooltip contentStyle={{ borderRadius: "12px", border: "1.5px solid #F1F5F9", fontSize: "12px" }} />
                    <Bar dataKey="Receitas" fill="#22C55E" radius={[4, 4, 0, 0]} barSize={12} />
                    <Bar dataKey="Despesas" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center justify-center gap-4 mt-3 pb-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                  <div className="w-3 h-3 rounded bg-emerald-500" />
                  <span>Receitas</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                  <div className="w-3 h-3 rounded bg-rose-500" />
                  <span>Despesas</span>
                </div>
              </div>
            </div>

            {/* Card B: Fluxo de Caixa (Line with area gradient) */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs" id="card-chart-fluxo-caixa">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-bold text-base text-slate-800">Fluxo de Caixa</h3>
                  <p className="text-xs text-slate-400 font-medium">Últimos 6 meses</p>
                </div>
                <div className="flex items-center gap-1 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold bg-slate-50 text-slate-600">
                  <span>6 meses</span>
                  <SlidersHorizontal className="w-3 h-3 text-slate-400" />
                </div>
              </div>

              <div className="h-64 w-full" id="area-chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cashFlowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradientSaldo" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#64748B", fontSize: 11, fontWeight: 500 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748B", fontSize: 11, fontWeight: 500 }} />
                    <Tooltip contentStyle={{ borderRadius: "12px", border: "1.5px solid #F1F5F9", fontSize: "12px" }} />
                    <Area type="monotone" dataKey="Saldo" stroke="#8B5CF6" strokeWidth={2.5} fillOpacity={1} fill="url(#gradientSaldo)" dot={{ r: 4, strokeWidth: 1.5, stroke: "#8B5CF6", fill: "#FFFFFF" }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center justify-center gap-4 mt-3 pb-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                  <div className="w-30 px-1 py-0.5 rounded bg-purple-500/20 text-center font-bold text-purple-600/90 text-[10px]">
                    ● Saldo Acumulado
                  </div>
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Section 2: Projects Information Block */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6" id="projects-second-row">
            
            {/* Left part: Evolução dos Projetos Table */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs md:col-span-3 flex flex-col justify-between" id="card-evolucao-projetos">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="font-bold text-base text-slate-800">Evolução dos Projetos</h3>
                    <p className="text-xs text-slate-400 font-medium font-semibold">Progresso de todos os projetos em andamento</p>
                  </div>
                </div>

                <div className="overflow-x-auto" id="projects-evolution-table">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                        <th className="py-2.5">Projeto</th>
                        <th className="py-2.5">Progresso</th>
                        <th className="py-2.5">Etapa Atual</th>
                        <th className="py-2.5 text-right">Prazo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-sm">
                      {evolutionProjects.map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/40 transition-colors">
                          <td className="py-3 font-semibold text-slate-800 truncate max-w-[140px]">{p.name}</td>
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${
                                    p.progress < 30 ? 'bg-rose-500' : p.progress < 60 ? 'bg-amber-500' : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${p.progress}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold text-slate-500 font-mono">{p.progress}%</span>
                            </div>
                          </td>
                          <td className="py-3 text-xs">
                            <span className={`px-2 py-0.5 rounded-full font-bold ${
                              p.stage === "Planejamento" ? "bg-amber-50 text-amber-600" :
                              p.stage === "Desenvolvimento" ? "bg-blue-50 text-blue-600" :
                              "bg-emerald-50 text-emerald-600"
                            }`}>
                              {p.stage}
                            </span>
                          </td>
                          <td className="py-3 text-right font-mono text-xs text-slate-500 tracking-tight">{p.dueDate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 mt-4 text-center">
                <button
                  onClick={() => navigate("/projects")}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/70 transition-colors cursor-pointer"
                >
                  <span>Ver todos os projetos</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Right part: Projetos por Status Chart */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs md:col-span-2 flex flex-col justify-between" id="card-projetos-por-status">
              <div>
                <h3 className="font-bold text-base text-slate-800">Projetos por Status</h3>
                <p className="text-xs text-slate-400 font-medium">Distribuição dos projetos</p>
                
                <div className="h-44 w-full relative flex items-center justify-center my-2" id="projects-donut-wrapper">
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-3xl font-black text-slate-900 leading-none">{projectsByStatusData.total}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total</span>
                  </div>
                  
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={projectsByStatusData.series}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {projectsByStatusData.series.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Legends with percentages */}
                <div className="space-y-2 text-xs font-semibold text-slate-600 px-2" id="projects-status-legends">
                  {projectsByStatusData.series.map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span>{item.name}</span>
                      </div>
                      <span className="font-bold text-slate-500 font-mono">{item.value} ({item.percentage}%)</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 mt-4 text-center">
                <button
                  onClick={() => navigate("/projects")}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/70 transition-colors cursor-pointer"
                >
                  <span>Ver todos os projetos</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>

          {/* Section 3: Group 3 - Finance by Category & Finance by System */}
          {canAccess("dash_chart_systems") && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="finance-third-row">
              
              {/* Financeiro por Categoria Donut */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between" id="card-financeiro-categoria">
              <div>
                <h3 className="font-bold text-base text-slate-800">Financeiro por Categoria</h3>
                <p className="text-xs text-slate-400 font-medium">Este mês</p>
                
                <div className="flex flex-col sm:flex-row items-center gap-4 py-4">
                  {/* Left Donut */}
                  <div className="h-36 w-36 relative flex items-center justify-center shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={financialByCategoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={65}
                          dataKey="value"
                        >
                          {financialByCategoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Legends list */}
                  <div className="w-full space-y-1.5 text-xs font-medium text-slate-600">
                    {financialByCategoryData.map((item, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 truncate max-w-[130px]">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="truncate">{item.name}</span>
                        </div>
                        <span className="font-mono text-slate-500 font-bold shrink-0">{fmt(item.value)} ({item.percentage}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 text-center">
                <button
                  onClick={() => navigate("/financial/categories")}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/70 transition-colors cursor-pointer"
                >
                  <span>Ver todas as categorias</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Financeiro por Sistema Horizontal bar meters */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between" id="card-financeiro-sistema">
              <div>
                <h3 className="font-bold text-base text-slate-800">Financeiro por Sistema</h3>
                <p className="text-xs text-slate-400 font-medium">Este mês</p>

                <div className="space-y-4 py-4">
                  {financialBySystemData.map((s, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-slate-600">
                        <span>{s.name}</span>
                        <span className="font-mono">{fmt(s.value)}</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full">
                        <div 
                          className="h-full rounded-full transition-all duration-500" 
                          style={{ backgroundColor: s.color, width: s.widthClass.replace("w-[", "").replace("]", "") }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 text-center">
                <button
                  onClick={() => navigate("/financial/systems")}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/70 transition-colors cursor-pointer"
                >
                  <span>Ver todos os sistemas</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
          )}

          {/* Section 4: Group 4 - Finance by Project & Negotiation Funnel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="projects-reconciliation-row">
            
            {/* Financeiro por Projeto Progress bars */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between" id="card-financeiro-projeto">
              <div>
                <h3 className="font-bold text-base text-slate-800">Financeiro por Projeto</h3>
                <p className="text-xs text-slate-400 font-medium">Este mês</p>

                <div className="space-y-4 py-4">
                  {financialByProjectData.map((p, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-slate-600">
                        <span>{p.name}</span>
                        <span className="font-mono">{fmt(p.value)} ({p.percentage}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full">
                        <div 
                          className="h-full rounded-full" 
                          style={{ backgroundColor: p.color, width: `${p.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 text-center">
                <button
                  onClick={() => navigate("/projects")}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/70 transition-colors cursor-pointer"
                >
                  <span>Ver todos os projetos</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Funil de Negociações (Vertical trapezoid mock) */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between" id="card-funil-negociacoes">
              <div>
                <h3 className="font-bold text-base text-slate-800">Funil de Negociações</h3>
                <p className="text-xs text-slate-400 font-medium">Quantidade de negociações por etapa</p>

                {/* Styled layered visual funnel */}
                <div className="flex flex-col items-center space-y-2.5 py-4" id="visual-funnel-container">
                  {salesFunnelData.series.map((f, idx) => (
                    <div 
                      key={idx} 
                      className="flex justify-between items-center px-4 py-1.5 text-xs font-bold rounded-lg text-white shadow-xs transition-transform hover:scale-[1.03] duration-150"
                      style={{ backgroundColor: f.color, width: f.width }}
                    >
                      <span className="truncate">{f.stage}</span>
                      <span className="font-mono">{f.count} ({f.percentage})</span>
                    </div>
                  ))}

                  <div className="flex justify-between w-full text-xs font-bold text-slate-500 pt-3 border-t border-slate-100 mt-2">
                    <span>Total de oportunidades</span>
                    <span className="text-slate-800 text-sm">{salesFunnelData.total}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 text-center">
                <button
                  onClick={() => navigate("/sales")}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/70 transition-colors cursor-pointer"
                >
                  <span>Ver todas oportunidades</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>

          {/* Section 5: Group 5 - Recent Activities & Alerts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="activities-alerts-row">
            
            {/* Atividades Recentes Card */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between" id="card-atividades-recentes">
              <div>
                <h3 className="font-bold text-base text-slate-800">Atividades Recentes</h3>
                <p className="text-xs text-slate-400 font-medium mb-3">Histórico de ações e lançamentos do sistema</p>

                <div className="space-y-4 pt-2">
                  {recentActivities.map((act) => {
                    const ActIcon = act.icon;
                    return (
                      <div key={act.id} className="flex gap-3 items-start">
                        <div className={`p-2 rounded-full shrink-0 ${act.color}`}>
                          <ActIcon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-700 font-semibold leading-relaxed">{act.text}</p>
                          <span className="text-[10px] text-slate-400 font-bold block mt-1 font-mono uppercase tracking-wider">{act.time}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 mt-4 text-center">
                <button
                  onClick={() => navigate("/projects")}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/70 transition-colors cursor-pointer"
                >
                  <span>Ver todas atividades</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Alertas e Notificações */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between" id="card-alertas-notificacoes">
              <div>
                <h3 className="font-bold text-base text-slate-800">Alertas e Notificações</h3>
                <p className="text-xs text-slate-400 font-medium mb-3">Avisos importantes de prazos e eventos</p>

                <div className="space-y-3.5 pt-2">
                  {customAlerts.map((alert) => (
                    <div 
                      key={alert.id} 
                      className={`flex justify-between items-center p-3 rounded-xl border text-xs font-medium ${
                        alert.type === "warning" ? "bg-rose-50/50 border-rose-100 text-rose-800" :
                        alert.type === "info" ? "bg-blue-50/50 border-blue-100 text-blue-800" :
                        alert.type === "purple" ? "bg-purple-50/50 border-purple-100 text-purple-800" :
                        "bg-emerald-50/50 border-emerald-100 text-emerald-800"
                      }`}
                    >
                      <div className="flex gap-2 items-center min-w-0">
                        {alert.type === "warning" && <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />}
                        {alert.type === "info" && <Calendar className="w-4 h-4 text-blue-500 shrink-0" />}
                        {alert.type === "purple" && <Clock className="w-4 h-4 text-purple-500 shrink-0" />}
                        {alert.type === "success" && <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />}
                        <span className="truncate pr-1 block font-semibold">{alert.text}</span>
                      </div>
                      
                      <button
                        onClick={() => navigate(alert.actionPath)}
                        className="text-[10px] font-bold uppercase tracking-wider underline shrink-0 hover:opacity-85 text-current"
                      >
                        {alert.actionName}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 mt-4 text-center">
                <button
                  onClick={() => navigate("/settings")}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/70 transition-colors cursor-pointer"
                >
                  <span>Ver todos alertas</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>

        </div>

        {/* ======================= RIGHT SIDEBAR COLUMN (lg:col-span-1) ======================= */}
        <div className="space-y-6" id="dashboard-sidebar-block">
          
          {/* Card 1: Ordens de Serviço List & OS Atraso Alarm alert callout */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs" id="sidebar-ordens-servico">
            <h3 className="font-bold text-base text-slate-800 mb-3">Ordens de Serviço</h3>
            
            {/* Rows metric counts */}
            <div className="divide-y divide-slate-100 text-sm font-semibold text-slate-600" id="os-sidebar-items">
              
              <div className="flex justify-between items-center py-3">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-blue-500 bg-blue-50 p-0.5 rounded" />
                  <span>Minhas OS</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 font-mono text-base">{myOrdersCount}</span>
                  <button onClick={() => navigate("/service-orders?tab=mine")} className="text-xs text-primary font-bold hover:underline">Ver todas</button>
                </div>
              </div>

              <div className="flex justify-between items-center py-3">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-indigo-500 bg-indigo-50 p-0.5 rounded" />
                  <span>Enviadas</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 font-mono text-base">{sentOrdersCount}</span>
                  <button onClick={() => navigate("/service-orders?tab=sent")} className="text-xs text-primary font-bold hover:underline">Ver todas</button>
                </div>
              </div>

              <div className="flex justify-between items-center py-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 bg-emerald-50 p-0.5 rounded" />
                  <span>Concluídas</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 font-mono text-base">{completedOrdersCount}</span>
                  <button onClick={() => navigate("/service-orders?tab=completed")} className="text-xs text-primary font-bold hover:underline">Ver todas</button>
                </div>
              </div>

              <div className="flex justify-between items-center py-3">
                <div className="flex items-center gap-2">
                  <Archive className="w-4 h-4 text-slate-500 bg-slate-55 p-0.5 rounded" />
                  <span>Arquivadas</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 font-mono text-base">{archivedOrdersCount}</span>
                  <button onClick={() => navigate("/service-orders?tab=archived")} className="text-xs text-primary font-bold hover:underline">Ver todas</button>
                </div>
              </div>

            </div>

            {/* "OS em Atraso" Alert box widget */}
            {overdueOrdersCount > 0 ? (
              <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-4 mt-4 flex items-center gap-3.5" id="os-atrasadas-callout">
                <div className="p-3 bg-rose-100 rounded-full text-rose-500 animate-pulse shrink-0">
                  <AlarmClock className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] uppercase font-bold text-rose-500 tracking-wider">OS em Atraso</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <h4 className="text-2xl font-black text-rose-600 font-mono leading-none">{overdueOrdersCount}</h4>
                    <p className="text-xs font-bold text-rose-700/80">OS atrasadas</p>
                  </div>
                  <button 
                    onClick={() => navigate("/service-orders?tab=mine")} 
                    className="text-xs font-bold text-rose-600 underline hover:text-rose-800 transition-colors mt-2 block"
                  >
                    Ver todas
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-50/30 border border-emerald-100 rounded-xl p-4 mt-4 flex items-center gap-3.5" id="os-atrasadas-callout">
                <div className="p-2.5 bg-emerald-100 rounded-full text-emerald-600 shrink-0">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">OS em Dia</span>
                  <div className="flex items-center mt-0.5">
                    <h4 className="text-sm font-bold text-emerald-800">Tudo em dia!</h4>
                  </div>
                  <p className="text-[11px] text-emerald-700/80 mt-0.5">Nenhuma ordem de serviço pendente atrasada.</p>
                </div>
              </div>
            )}

          </div>

          {/* Card 2: Financeiro Geral (Consolidated overview) */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs" id="sidebar-financeiro-geral">
            <h3 className="font-bold text-base text-slate-800 mb-1">Financeiro Geral</h3>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-3">Visão consolidada</p>
            
            <div className="space-y-3.5 mb-4 text-sm font-semibold text-slate-600" id="consolidated-financial-numbers">
              
              <div className="flex justify-between items-center py-1">
                <span>Saldo Total</span>
                <span className="font-mono text-emerald-600 font-extrabold">{fmt(financialSummarized.balance)}</span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span>Receitas no Mês</span>
                <span className="font-mono text-emerald-600 font-extrabold">{fmt(financialSummarized.incomeOnMonth)}</span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span>Despesas no Mês</span>
                <span className="font-mono text-rose-500 font-extrabold">{fmt(financialSummarized.expenseOnMonth)}</span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span>A Receber</span>
                <div className="text-right">
                  <span className="font-mono text-slate-800 font-extrabold block">{fmt(financialSummarized.toReceive)}</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block font-semibold">{financialSummarized.toReceiveCount} títulos</span>
                </div>
              </div>

              <div className="flex justify-between items-center py-1">
                <span>A Pagar</span>
                <div className="text-right">
                  <span className="font-mono text-slate-800 font-extrabold block">{fmt(financialSummarized.toPay)}</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block font-semibold">{financialSummarized.toPayCount} títulos</span>
                </div>
              </div>

            </div>

            <div className="border-t border-slate-100 pt-3 text-center">
              <button
                onClick={() => navigate("/financial")}
                className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-primary/70 transition-colors cursor-pointer"
              >
                <span>Ver detalhes financeiros</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Card 3: Receitas e Despesas Recorrentes */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs" id="sidebar-recorrencias">
            <h3 className="font-bold text-base text-slate-800 mb-1">Receitas e Despesas Recorrentes</h3>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-4">Visão mensal</p>

            <div className="space-y-4 mb-4 text-xs font-bold" id="recurring-numbers-list">
              
              <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Receitas Recorrentes</span>
                <div className="flex justify-between items-center mt-1 text-slate-800">
                  <span className="font-mono font-black text-sm">{fmt(recurringInfo.incomeRecurring)} /mês</span>
                  <span className="text-[10px] text-slate-500 font-semibold">{recurringInfo.incomeRecurringCount} recebimentos</span>
                </div>
              </div>

              <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Despesas Recorrentes</span>
                <div className="flex justify-between items-center mt-1 text-slate-800">
                  <span className="font-mono font-black text-sm">{fmt(recurringInfo.expenseRecurring)} /mês</span>
                  <span className="text-[10px] text-slate-500 font-semibold">{recurringInfo.expenseRecurringCount} pagamentos</span>
                </div>
              </div>

            </div>

            <div className="border-t border-slate-100 pt-3 text-center">
              <button
                onClick={() => navigate("/financial/recurring")}
                className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-primary/70 transition-colors cursor-pointer"
              >
                <span>Ver recorrências</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Card 4: Produtos */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs" id="sidebar-produtos">
            <h3 className="font-bold text-base text-slate-800 mb-1">Produtos</h3>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-4">Visão geral dos produtos</p>

            <div className="space-y-3.5 mb-4 text-xs font-semibold text-slate-600" id="products-metric-rows">
              
              <div className="flex justify-between items-center bg-slate-50/40 p-2 rounded-xl">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-500" />
                  <span>Total de Produtos</span>
                </div>
                <span className="font-mono font-extrabold text-slate-800">{productsSummary.total} <span className="text-[10px] font-medium text-slate-400">Cadastrados</span></span>
              </div>

              <div className="flex justify-between items-center bg-slate-50/40 p-2 rounded-xl">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span>Mais Vendido</span>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-slate-800 block">{productsSummary.best}</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-semibold block">{productsSummary.bestCount} vendas</span>
                </div>
              </div>

              <div className="flex justify-between items-center bg-slate-50/40 p-2 rounded-xl">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-slate-400" />
                  <span>Menos Vendido</span>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-slate-800 block">Integração API</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-semibold block">{productsSummary.worstCount} venda</span>
                </div>
              </div>

            </div>

            <div className="border-t border-slate-100 pt-3 text-center">
              <button
                onClick={() => navigate("/products")}
                className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-primary/70 transition-colors cursor-pointer"
              >
                <span>Ver catálogo de produtos</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Card 5: Indicadores de Vendas (Performance Comercial) */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs" id="sidebar-indicadores-vendas">
            <h3 className="font-bold text-base text-slate-800 mb-1">Indicadores de Vendas</h3>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-4">Performance comercial</p>

            <div className="grid grid-cols-2 gap-3 mb-4" id="sales-metrics-grid">
              
              <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Total de Vendas</span>
                <h5 className="font-mono font-black text-slate-850 text-sm mt-0.5">{fmt(salesIndicators.totalVal)}</h5>
                <span className="text-[9px] text-slate-405 font-bold uppercase tracking-wider block mt-1">Este mês</span>
              </div>

              <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Oportunidades</span>
                <h5 className="font-mono font-black text-slate-850 text-sm mt-0.5">{salesIndicators.activeOpportunities}</h5>
                <span className="text-[9px] text-slate-405 font-bold uppercase block mt-1 tracking-wider">Em andamento</span>
              </div>

              <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Conversão</span>
                <h5 className="font-mono font-black text-slate-850 text-sm mt-0.5">{salesIndicators.conversionRate}</h5>
                <span className="text-[9px] text-slate-405 font-bold uppercase block mt-1 tracking-wider">Geral</span>
              </div>

              <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Ticket Médio</span>
                <h5 className="font-mono font-black text-slate-850 text-sm mt-0.5">{fmt(salesIndicators.ticketAverage)}</h5>
                <span className="text-[9px] text-slate-450 font-bold uppercase block mt-1 tracking-wider">Por venda</span>
              </div>

            </div>

            <div className="border-t border-slate-100 pt-3 text-center">
              <button
                onClick={() => navigate("/sales")}
                className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-primary/70 transition-colors pr-1 cursor-pointer"
              >
                <span>Ver painel de vendas</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
