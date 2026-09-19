const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

// The block currently looks like:
// {canAccess("dash_chart_evolution") && (
//   preferences.charts_main && (
//   <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="charts-first-row">
// ...
//   </div>
// )}
//
//   )}
// {/* Section 2: Projects Information Block */}

// We can just revert it to:
// {canAccess("dash_chart_evolution") && preferences.charts_main && (
//   <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="charts-first-row">
// ...
//   </div>
// )}
// {/* Section 2: Projects Information Block */}

code = code.replace(
  /          \{canAccess\("dash_chart_evolution"\) && \(\n            preferences.charts_main && \(\n            <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="charts-first-row">/g,
  '          {canAccess("dash_chart_evolution") && preferences.charts_main && (\n            <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="charts-first-row">'
);

code = code.replace(
  /          \)\}\n\n            \)\}\n          \{\/\* Section 2: Projects Information Block \*\/\}/g,
  '          )}\n          {/* Section 2: Projects Information Block */}'
);

fs.writeFileSync('src/pages/Dashboard.tsx', code);
