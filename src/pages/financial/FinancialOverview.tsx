import {
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useApp } from "@/contexts/AppContext";
import { KpiCard } from "@/components/shared/KpiCard";
import { ChartCard } from "@/components/shared/ChartCard";

export default function FinancialOverview() {
  const { transactions, accounts } = useApp();
  const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.value, 0);
  const totalExpense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.value, 0);
  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const chartData = [
    { mes: "Jan", receita: 28000, despesa: 18000 },
    { mes: "Fev", receita: 32000, despesa: 22000 },
    { mes: "Mar", receita: 35000, despesa: 19000 },
    { mes: "Abr", receita: 40000, despesa: 25000 },
    { mes: "Mai", receita: totalIncome, despesa: totalExpense },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard title="Receitas" value={fmt(totalIncome)} icon={ArrowUpRight} iconColor="bg-success/10" change={12} />
        <KpiCard title="Despesas" value={fmt(totalExpense)} icon={ArrowDownRight} iconColor="bg-destructive/10" change={-3} />
        <KpiCard title="Saldo Total" value={fmt(totalBalance)} icon={Wallet} iconColor="bg-primary/10" change={8} />
      </div>
      <ChartCard title="Receitas vs Despesas (Últimos meses)">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
            <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke="hsl(220,10%,46%)" />
            <YAxis tick={{ fontSize: 12 }} stroke="hsl(220,10%,46%)" />
            <Tooltip contentStyle={{ borderRadius: "0.75rem", border: "1px solid hsl(220,13%,91%)", fontSize: "0.875rem" }} />
            <Bar dataKey="receita" fill="hsl(142,71%,45%)" radius={[6, 6, 0, 0]} name="Receita" />
            <Bar dataKey="despesa" fill="hsl(0,72%,51%)" radius={[6, 6, 0, 0]} name="Despesa" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}