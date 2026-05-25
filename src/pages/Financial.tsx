import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Visão Geral", path: "/financial" },
  { label: "Projetos", path: "/financial/projects" },
  { label: "Sistemas", path: "/financial/systems" },
  { label: "Contas", path: "/financial/accounts" },
  { label: "Categorias", path: "/financial/categories" },
  { label: "Receitas/Despesas", path: "/financial/recurring" },
  { label: "Movimentações", path: "/financial/transactions" },
];

export default function Financial() {
  const { pathname } = useLocation();

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight">Financeiro</h1>
      <div className="flex gap-1 overflow-x-auto bg-secondary rounded-lg p-1">
        {tabs.map((tab) => {
          const isActive = pathname === tab.path || (tab.path === "/financial" && pathname === "/financial");
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              end={tab.path === "/financial"}
              className={cn(
                "px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors",
                isActive ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </NavLink>
          );
        })}
      </div>
      <Outlet />
    </div>
  );
}