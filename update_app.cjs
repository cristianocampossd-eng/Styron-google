const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes('DashboardSettings')) {
  code = code.replace(
    'import IntegrationsSettings from "./pages/settings/IntegrationsSettings";',
    'import IntegrationsSettings from "./pages/settings/IntegrationsSettings";\nimport DashboardSettings from "./pages/settings/DashboardSettings";'
  );
  
  code = code.replace(
    '<Route path="integrations" element={<ProtectedRoute module="settings"><IntegrationsSettings /></ProtectedRoute>} />',
    '<Route path="integrations" element={<ProtectedRoute module="settings"><IntegrationsSettings /></ProtectedRoute>} />\n                            <Route path="dashboard" element={<ProtectedRoute module="settings"><DashboardSettings /></ProtectedRoute>} />'
  );
  fs.writeFileSync('src/App.tsx', code);
}
