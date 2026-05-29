import { useMemo } from "react";
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
  const totalBalance = accounts.filter(a => a.id !== "total-balance-account").reduce((s, a) => s + a.balance, 0);

  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const chartData = useMemo(() => {
    const portugueseMonths = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    
    // We construct the last 5 months
    const today = new Date();
    const list = [];
    
    for (let i = 4; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthIndex = d.getMonth();
      const label = portugueseMonths[monthIndex];
      list.push({
        mes: label,
        year: d.getFullYear(),
        month: d.getMonth(),
        receita: 0,
        despesa: 0,
      });
    }

    transactions.forEach((t) => {
      const tDate = new Date(t.date);
      const tYear = tDate.getFullYear();
      const tMonth = tDate.getMonth();
      
      const found = list.find((m) => m.year === tYear && m.month === tMonth);
      if (found) {
        if (t.type === "income") {
          found.receita += t.value;
        } else if (t.type === "expense") {
          found.despesa += t.value;
        }
      }
    });

    return list.map(({ mes, receita, despesa }) => ({ mes, receita, despesa }));
  }, [transactions]);

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