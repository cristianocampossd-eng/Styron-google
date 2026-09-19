import { defaultPreferences, useDashboardPreferences, DashboardSectionKey } from "@/hooks/useDashboardPreferences";
import { Checkbox } from "@/components/ui/checkbox";

export default function DashboardSettings() {
  const { preferences, updatePreferences } = useDashboardPreferences();

  const handleToggle = (key: DashboardSectionKey, checked: boolean) => {
    updatePreferences({ ...preferences, [key]: checked });
  };

  const sections: { key: DashboardSectionKey; label: string; description: string; group: string }[] = [
    // Painel Operacional & Financeiro - Principal
    { key: "financial_kpis", label: "KPIs Financeiros (Topo)", description: "Indicadores de Receita, Despesa, Lucro e Projetos Ativos.", group: "Gestão - Painel Principal" },
    { key: "charts_main", label: "Gráficos Principais", description: "Receitas vs Despesas e Fluxo de Caixa.", group: "Gestão - Painel Principal" },
    { key: "projects_info", label: "Informações de Projetos", description: "Evolução e Distribuição por Status.", group: "Gestão - Painel Principal" },
    { key: "finance_category_system", label: "Despesas por Categoria / Sistema", description: "Gráficos de rosca e barras horizontais por sistema.", group: "Gestão - Painel Principal" },
    { key: "finance_project_funnel", label: "Despesas por Projeto / Funil", description: "Progress bars de projetos e funil de negociações.", group: "Gestão - Painel Principal" },
    { key: "recent_activities_alerts", label: "Atividades e Alertas", description: "Log de atividades recentes e notificações do sistema.", group: "Gestão - Painel Principal" },

    // Painel Operacional & Financeiro - Lateral
    { key: "sidebar_os", label: "Ordens de Serviço e Atrasos", description: "Resumo e Alerta de Ordens de Serviço.", group: "Gestão - Painel Lateral" },
    { key: "sidebar_finance_overview", label: "Financeiro Geral Consolidado", description: "Resumo de movimentações em andamento.", group: "Gestão - Painel Lateral" },
    { key: "sidebar_recurring", label: "Receitas e Despesas Recorrentes", description: "Próximos vencimentos fixos e assinaturas.", group: "Gestão - Painel Lateral" },
    { key: "sidebar_products", label: "Principais Produtos/Serviços", description: "Produtos mais relevantes e valores associados.", group: "Gestão - Painel Lateral" },
    { key: "sidebar_sales_indicators", label: "Indicadores Comerciais", description: "Performance e total de fechamentos.", group: "Gestão - Painel Lateral" },

    // Comercial (CRM)
    { key: "crm_kpis", label: "KPIs do CRM (Topo)", description: "Indicadores de leads, conversões e ticket médio.", group: "Comercial (CRM)" },
    { key: "crm_charts", label: "Gráficos de Vendas e Funil", description: "Segmentos, origens e evolução da carteira de clientes.", group: "Comercial (CRM)" },
  ];

  const groupedSections = sections.reduce((acc, section) => {
    if (!acc[section.group]) acc[section.group] = [];
    acc[section.group].push(section);
    return acc;
  }, {} as Record<string, typeof sections>);

  return (
    <div className="bg-card border rounded-lg p-6 space-y-8 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold mb-1">Personalização do Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          Escolha quais seções você deseja visualizar na página inicial.
        </p>
      </div>

      <div className="space-y-8">
        {Object.entries(groupedSections).map(([group, groupSections]) => (
          <div key={group} className="space-y-4">
            <h3 className="text-sm font-bold text-primary uppercase tracking-wider border-b pb-2">
              {group}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {groupSections.map((section) => (
                <div key={section.key} className="flex items-start space-x-3 p-3 bg-muted/30 border rounded-lg transition-colors hover:bg-muted/50">
                  <Checkbox
                    id={`toggle-${section.key}`}
                    checked={preferences[section.key] ?? defaultPreferences[section.key]}
                    onCheckedChange={(checked) => handleToggle(section.key, !!checked)}
                    className="mt-0.5"
                  />
                  <div className="space-y-1 leading-none">
                    <label
                      htmlFor={`toggle-${section.key}`}
                      className="text-sm font-semibold cursor-pointer select-none"
                    >
                      {section.label}
                    </label>
                    <p className="text-xs text-muted-foreground select-none">
                      {section.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
