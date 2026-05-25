import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useServiceOrders } from "@/contexts/ServiceOrderContext";
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
} from "recharts";
import { statusLabels } from "@/data/mock";
import { useApp } from "@/contexts/AppContext";
import { KpiCard } from "@/components/shared/KpiCard";
import { ChartCard } from "@/components/shared/ChartCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { subDays, startOfYear, isAfter, isBefore, startOfDay, differenceInDays } from "date-fns";

const periods = ["Hoje", "7 dias", "30 dias", "Ano", "Total"] as const;

function getDateRange(period: string): { start: Date; end: Date } | null {
  const now = new Date();
  switch (period) {
    case "Hoje": return { start: startOfDay(now), end: now };
    case "7 dias": return { start: subDays(now, 7), end: now };
    case "30 dias": return { start: subDays(now, 30), end: now };
    case "Ano": return { start: startOfYear(now), end: now };
    default: return null;
  }
}

export default function Dashboard() {
  const [period, setPeriod] = useState<string>("30 dias");
  const navigate = useNavigate();
  const { projects, transactions, accounts, getProjectCode } = useApp();
  const { user } = useAuth();
  const currentUserId = user?.id || "";
  const { orders } = useServiceOrders();

  const range = getDateRange(period);

  const filteredProjects = useMemo(() => {
    if (!range) return projects.filter((p) => p.status !== "archived");
    return projects.filter((p) => p.status !== "archived" && isAfter(p.startDate, range.start) || (isBefore(p.startDate, range.end) && isAfter(p.endDate, range.start)));
  }, [projects, range]);

  const filteredTransactions = useMemo(() => {
    if (!range) return transactions;
    return transactions.filter((t) => isAfter(t.date, range.start) && isBefore(t.date, range.end));
  }, [transactions, range]);

  const filteredOrders = useMemo(() => {
    if (!range) return orders;
    return orders.filter((o) => isAfter(o.createdAt, range.start) && isBefore(o.createdAt, range.end));
  }, [orders, range]);

  const planning = filteredProjects.filter((p) => p.status === "planning").length;
  const inProgress = filteredProjects.filter((p) => p.status === "in_progress").length;
  const completed = filteredProjects.filter((p) => p.status === "completed").length;

  const myOrders = useMemo(() => {
    return filteredOrders.filter((o) => (o.responsible === currentUserId || (!o.responsible && o.creator === currentUserId)) && o.status !== "archived" && o.status !== "completed").length;
  }, [filteredOrders, currentUserId]);

  const sentOrders = useMemo(() => {
    return filteredOrders.filter((o) => o.creator === currentUserId && o.responsible !== currentUserId && o.responsible && o.status !== "archived" && o.status !== "completed").length;
  }, [filteredOrders, currentUserId]);

  const completedOrders = useMemo(() => {
    return filteredOrders.filter((o) => o.status === "completed" && (o.creator === currentUserId || o.responsible === currentUserId)).length;
  }, [filteredOrders, currentUserId]);

  const archivedOrders = useMemo(() => {
    return filteredOrders.filter((o) => o.status === "archived" && (o.creator === currentUserId || o.responsible === currentUserId)).length;
  }, [filteredOrders, currentUserId]);

  const totalIncome = filteredTransactions.filter((t) => t.type === "income").reduce((s, t) => s + t.value, 0);
  const totalExpense = filteredTransactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.value, 0);

  const pieData = [
    { name: statusLabels.planning, value: planning, color: "hsl(38, 92%, 50%)" },
    { name: statusLabels.in_progress, value: inProgress, color: "hsl(215, 60%, 50%)" },
    { name: statusLabels.completed, value: completed, color: "hsl(142, 71%, 45%)" },
  ];

  // Evolution chart: aggregate progress of active (non-completed) projects
  const evolutionData = useMemo(() => {
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"];
    const activeProjects = projects.filter((p) => p.status !== "completed" && p.status !== "archived");
    return months.map((month, i) => {
      const factor = (i + 1) / months.length;
      const totalProgress = activeProjects.reduce((sum, p) => sum + Math.min(p.progress * factor * (0.8 + Math.random() * 0.4), 100), 0);
      return { month, progresso: Math.round(totalProgress) };
    });
  }, [projects]);

  // Expense/income by category from filtered transactions
  const expenseData = useMemo(() => {
    const map = new Map<string, number>();
    filteredTransactions.filter((t) => t.type === "expense").forEach((t) => {
      const cat = t.description.split(" ")[0];
      map.set(cat, (map.get(cat) || 0) + t.value);
    });
    return Array.from(map.entries()).slice(0, 5).map(([cat, valor]) => ({ cat, valor }));
  }, [filteredTransactions]);

  const incomeData = useMemo(() => {
    const map = new Map<string, number>();
    filteredTransactions.filter((t) => t.type === "income").forEach((t) => {
      const cat = t.description.split(" ")[0];
      map.set(cat, (map.get(cat) || 0) + t.value);
    });
    return Array.from(map.entries()).slice(0, 5).map(([cat, valor]) => ({ cat, valor }));
  }, [filteredTransactions]);

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Dashboard"
        description="Visão geral de projetos e finanças"
        filters={
          <div className="flex gap-1 bg-secondary rounded-lg p-1">
            {periods.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  period === p
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {p}
              </button>
            ))}
          </div>
        }
      />

      {/* Project section */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Projetos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div onClick={() => navigate("/projects?status=planning")} className="cursor-pointer hover:scale-[1.02] transition-transform">
            <KpiCard title="Planejamento" value={planning} icon={FolderKanban} iconColor="bg-warning/10" change={12} />
          </div>
          <div onClick={() => navigate("/projects?status=in_progress")} className="cursor-pointer hover:scale-[1.02] transition-transform">
            <KpiCard title="Em andamento" value={inProgress} icon={PlayCircle} iconColor="bg-primary/10" change={8} />
          </div>
          <div onClick={() => navigate("/projects?status=completed")} className="cursor-pointer hover:scale-[1.02] transition-transform">
            <KpiCard title="Concluídos" value={completed} icon={CheckCircle2} iconColor="bg-success/10" change={25} />
          </div>
        </div>
      </div>

      {/* Ordens de Serviço section */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Ordens de Serviço (OS)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div onClick={() => navigate("/service-orders?tab=mine")} className="cursor-pointer hover:scale-[1.02] transition-transform">
            <KpiCard title="Minhas OS" value={myOrders} icon={ClipboardList} iconColor="bg-primary/10" />
          </div>
          <div onClick={() => navigate("/service-orders?tab=sent")} className="cursor-pointer hover:scale-[1.02] transition-transform">
            <KpiCard title="Enviadas" value={sentOrders} icon={Send} iconColor="bg-info/10" />
          </div>
          <div onClick={() => navigate("/service-orders?tab=completed")} className="cursor-pointer hover:scale-[1.02] transition-transform">
            <KpiCard title="Finalizadas" value={completedOrders} icon={CheckCircle2} iconColor="bg-success/10" />
          </div>
          <div onClick={() => navigate("/service-orders?tab=archived")} className="cursor-pointer hover:scale-[1.02] transition-transform">
            <KpiCard title="Arquivadas" value={archivedOrders} icon={Archive} iconColor="bg-muted/10" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" key={period}>
        <div onClick={() => navigate("/projects")} className="cursor-pointer hover:shadow-lg transition-shadow rounded-xl">
        <ChartCard title="Distribuição por Status">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: "0.75rem", border: "1px solid hsl(220,13%,91%)", fontSize: "0.875rem" }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 -mt-4">
            {pieData.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                {d.name}
              </div>
            ))}
          </div>
        </ChartCard>
        </div>

        <div onClick={() => navigate("/projects")} className="cursor-pointer hover:shadow-lg transition-shadow rounded-xl">
        <ChartCard title="Evolução de Projetos Ativos (Progresso Acumulado)">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={evolutionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(220,10%,46%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(220,10%,46%)" />
              <Tooltip
                contentStyle={{ borderRadius: "0.75rem", border: "1px solid hsl(220,13%,91%)", fontSize: "0.875rem" }}
                formatter={(value: number) => [`${value}%`, "Progresso acumulado"]}
              />
              <Line type="monotone" dataKey="progresso" stroke="hsl(215,60%,50%)" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        </div>
      </div>

      {/* Financial section */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Financeiro</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div onClick={() => navigate("/financial/transactions?type=income")} className="cursor-pointer hover:scale-[1.02] transition-transform">
            <KpiCard title="Entradas" value={fmt(totalIncome)} icon={ArrowUpRight} iconColor="bg-success/10" change={15} />
          </div>
          <div onClick={() => navigate("/financial/transactions?type=expense")} className="cursor-pointer hover:scale-[1.02] transition-transform">
            <KpiCard title="Saídas" value={fmt(totalExpense)} icon={ArrowDownRight} iconColor="bg-destructive/10" change={-5} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div onClick={() => navigate("/financial/transactions?type=expense")} className="cursor-pointer hover:shadow-lg transition-shadow rounded-xl">
        <ChartCard title="Despesas por Categoria">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={expenseData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
              <XAxis dataKey="cat" tick={{ fontSize: 12 }} stroke="hsl(220,10%,46%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(220,10%,46%)" />
              <Tooltip contentStyle={{ borderRadius: "0.75rem", border: "1px solid hsl(220,13%,91%)", fontSize: "0.875rem" }} />
              <Bar dataKey="valor" fill="hsl(0,72%,51%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        </div>

        <div onClick={() => navigate("/financial/transactions?type=income")} className="cursor-pointer hover:shadow-lg transition-shadow rounded-xl">
        <ChartCard title="Receitas por Categoria">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={incomeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
              <XAxis dataKey="cat" tick={{ fontSize: 12 }} stroke="hsl(220,10%,46%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(220,10%,46%)" />
              <Tooltip contentStyle={{ borderRadius: "0.75rem", border: "1px solid hsl(220,13%,91%)", fontSize: "0.875rem" }} />
              <Bar dataKey="valor" fill="hsl(142,71%,45%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        </div>
      </div>

      {/* Account cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {accounts.map((acc) => (
          <div key={acc.id} className="bg-card rounded-xl border p-5 animate-slide-up cursor-pointer hover:shadow-md transition-all" onClick={() => navigate("/financial/accounts")}>
            <p className="text-sm text-muted-foreground">{acc.name}</p>
            <p className="text-lg font-semibold mt-1">{fmt(acc.balance)}</p>
          </div>
        ))}
        <div className="bg-primary rounded-xl p-5 animate-slide-up cursor-pointer hover:opacity-90 transition-opacity" onClick={() => navigate("/financial")}>
          <p className="text-sm text-primary-foreground/80">Saldo Total</p>
          <p className="text-lg font-semibold text-primary-foreground mt-1">{fmt(totalBalance)}</p>
        </div>
      </div>
    </div>
  );
}