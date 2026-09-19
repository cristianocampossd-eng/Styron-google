const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

// 7. sidebar_os
code = code.replace(
  /          \{\/\* Card 1: Ordens de Serviço List \& OS Atraso Alarm alert callout \*\/\}/,
  '          {preferences.sidebar_os && (\n          {/* Card 1: Ordens de Serviço List & OS Atraso Alarm alert callout */}'
);
code = code.replace(
  /          \{\/\* Card 2: Financeiro Geral \(Consolidated overview\) \*\/\}/,
  '          )}\n          {/* Card 2: Financeiro Geral (Consolidated overview) */}'
);

// 8. sidebar_finance_overview
code = code.replace(
  /          \{\/\* Card 2: Financeiro Geral \(Consolidated overview\) \*\/\}\n          <div className="bg-white border border-slate-200\/80 rounded-2xl p-5 shadow-xs"/,
  '          {/* Card 2: Financeiro Geral (Consolidated overview) */}\n          {preferences.sidebar_finance_overview && (\n          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs"'
);
code = code.replace(
  /          \{\/\* Card 3: Receitas e Despesas Recorrentes \*\/\}/,
  '          )}\n          {/* Card 3: Receitas e Despesas Recorrentes */}'
);

// 9. sidebar_recurring
code = code.replace(
  /          \{\/\* Card 3: Receitas e Despesas Recorrentes \*\/\}\n          <div className="bg-white border border-slate-200\/80 rounded-2xl shadow-xs overflow-hidden"/,
  '          {/* Card 3: Receitas e Despesas Recorrentes */}\n          {preferences.sidebar_recurring && (\n          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden"'
);
code = code.replace(
  /          \{\/\* Card 4: Produtos \*\/\}/,
  '          )}\n          {/* Card 4: Produtos */}'
);

// 10. sidebar_products
code = code.replace(
  /          \{\/\* Card 4: Produtos \*\/\}\n          <div className="bg-white border border-slate-200\/80 rounded-2xl p-5 shadow-xs"/,
  '          {/* Card 4: Produtos */}\n          {preferences.sidebar_products && (\n          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs"'
);
code = code.replace(
  /          \{\/\* Card 5: Indicadores de Vendas \(Performance Comercial\) \*\/\}/,
  '          )}\n          {/* Card 5: Indicadores de Vendas (Performance Comercial) */}'
);

// 11. sidebar_sales_indicators
code = code.replace(
  /          \{\/\* Card 5: Indicadores de Vendas \(Performance Comercial\) \*\/\}\n          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xs text-white"/,
  '          {/* Card 5: Indicadores de Vendas (Performance Comercial) */}\n          {preferences.sidebar_sales_indicators && (\n          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xs text-white"'
);
code = code.replace(
  /        <\/div>\n      \)\}\n      \{crmTab === "crm" && \(/,
  '          )}\n        </div>\n      )}\n      {crmTab === "crm" && ('
);

// 12. crm_kpis
code = code.replace(
  /          \{\/\* --- KPI SUMMARY ROW FOR CRM --- \*\/\}\n          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 animate-in fade-in duration-300" id="crm-summary-kpis-grid">/,
  '          {/* --- KPI SUMMARY ROW FOR CRM --- */}\n          {preferences.crm_kpis && (\n          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 animate-in fade-in duration-300" id="crm-summary-kpis-grid">'
);
code = code.replace(
  /          \{\/\* --- BENTO SECTION FOR GRAPHICS --- \*\/\}/,
  '          )}\n          {/* --- BENTO SECTION FOR GRAPHICS --- */}'
);

// 13. crm_charts
code = code.replace(
  /          \{\/\* --- BENTO SECTION FOR GRAPHICS --- \*\/\}\n          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom duration-500" id="crm-bento-graphics-grid">/,
  '          {/* --- BENTO SECTION FOR GRAPHICS --- */}\n          {preferences.crm_charts && (\n          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom duration-500" id="crm-bento-graphics-grid">'
);
code = code.replace(
  /        <\/div>\n      \)\}\n      \{\/\* MODAL DETALHES DE SISTEMA CLICADO \*\/\}/,
  '          )}\n        </div>\n      )}\n      {/* MODAL DETALHES DE SISTEMA CLICADO */}'
);

fs.writeFileSync('src/pages/Dashboard.tsx', code);
