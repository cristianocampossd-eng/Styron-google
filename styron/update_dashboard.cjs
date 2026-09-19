const fs = require('fs');

let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

// Import useDashboardPreferences
if (!code.includes('useDashboardPreferences')) {
  code = code.replace(
    'import { useState, useMemo, useEffect } from "react";',
    'import { useState, useMemo, useEffect } from "react";\nimport { useDashboardPreferences } from "@/hooks/useDashboardPreferences";'
  );
}

// Instantiate preferences
if (!code.includes('const { preferences } = useDashboardPreferences();')) {
  code = code.replace(
    '  const navigate = useNavigate();',
    '  const navigate = useNavigate();\n  const { preferences } = useDashboardPreferences();'
  );
}

// 1. financial_kpis
code = code.replace(
  /<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5" id="dashboard-kpis-container">/g,
  '{preferences.financial_kpis && (<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5" id="dashboard-kpis-container">'
);
code = code.replace(
  /        \{\/\* ----------------- MAIN THREE-COLUMN GRID \(Left wider, Right narrow Sidebar\) ----------------- \*\/\}/,
  '        )} {/* END OF FINANCIAL KPIs */}\n\n        {/* ----------------- MAIN THREE-COLUMN GRID (Left wider, Right narrow Sidebar) ----------------- */}'
);

// 2. charts_main
code = code.replace(
  /            <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="charts-first-row">/,
  '            {preferences.charts_main && (\n            <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="charts-first-row">'
);
code = code.replace(
  /          \{\/\* Section 2: Projects Information Block \*\/\}/,
  '            )}\n          {/* Section 2: Projects Information Block */}'
);

// 3. projects_info
code = code.replace(
  /          \{\/\* Section 2: Projects Information Block \*\/\}\n          <div className="grid grid-cols-1 md:grid-cols-5 gap-6" id="projects-second-row">/,
  '          {/* Section 2: Projects Information Block */}\n          {preferences.projects_info && (\n          <div className="grid grid-cols-1 md:grid-cols-5 gap-6" id="projects-second-row">'
);
code = code.replace(
  /          \{\/\* Section 3: Group 3 - Finance by Category & Finance by System \*\/\}/,
  '          )}\n          {/* Section 3: Group 3 - Finance by Category & Finance by System */}'
);

// 4. finance_category_system
code = code.replace(
  /          \{\/\* Section 3: Group 3 - Finance by Category & Finance by System \*\/\}\n          <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="finance-third-row">/,
  '          {/* Section 3: Group 3 - Finance by Category & Finance by System */}\n          {preferences.finance_category_system && (\n          <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="finance-third-row">'
);
code = code.replace(
  /          \{\/\* Section 4: Group 4 - Finance by Project & Negotiation Funnel \*\/\}/,
  '          )}\n          {/* Section 4: Group 4 - Finance by Project & Negotiation Funnel */}'
);

// 5. finance_project_funnel
code = code.replace(
  /          \{\/\* Section 4: Group 4 - Finance by Project & Negotiation Funnel \*\/\}\n          <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="projects-reconciliation-row">/,
  '          {/* Section 4: Group 4 - Finance by Project & Negotiation Funnel */}\n          {preferences.finance_project_funnel && (\n          <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="projects-reconciliation-row">'
);
code = code.replace(
  /          \{\/\* Section 5: Group 5 - Recent Activities & Alerts \*\/\}/,
  '          )}\n          {/* Section 5: Group 5 - Recent Activities & Alerts */}'
);

// 6. recent_activities_alerts
code = code.replace(
  /          \{\/\* Section 5: Group 5 - Recent Activities & Alerts \*\/\}\n          <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="activities-alerts-row">/,
  '          {/* Section 5: Group 5 - Recent Activities & Alerts */}\n          {preferences.recent_activities_alerts && (\n          <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="activities-alerts-row">'
);
code = code.replace(
  /        \{\/\* ======================= RIGHT SIDEBAR COLUMN \(lg:col-span-1\) ======================= \*\/\}/,
  '          )}\n        </div> {/* END LEFT BLOCK */}\n        {/* ======================= RIGHT SIDEBAR COLUMN (lg:col-span-1) ======================= */}'
);

fs.writeFileSync('src/pages/Dashboard.tsx', code);
