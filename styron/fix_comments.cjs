const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

// Replace occurrences of:
// {preferences.xyz && (
// {/* comment */}
// with:
// {/* comment */}
// {preferences.xyz && (

code = code.replace(/\{preferences\.([a-zA-Z_]+) && \(\n\s*\{\/\*(.*?)\*\/\}/g, '{/*$2*/}\n          {preferences.$1 && (');

fs.writeFileSync('src/pages/Dashboard.tsx', code);
