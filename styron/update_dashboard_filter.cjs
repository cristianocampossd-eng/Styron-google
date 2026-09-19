const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

// 1. Add getFirstDayOfMonthStr
if (!code.includes('getFirstDayOfMonthStr = () =>')) {
  code = code.replace(
    /  const getTodayStr = \(\) => \{/,
    '  const getFirstDayOfMonthStr = () => {\n    const d = new Date();\n    const y = d.getFullYear();\n    const m = String(d.getMonth() + 1).padStart(2, "0");\n    return `${y}-${m}-01`;\n  };\n\n  const getTodayStr = () => {'
  );
}

// 2. Change initial selectedPeriod
code = code.replace(
  /const \[selectedPeriod, setSelectedPeriod\] = useState<string>\("6 meses"\);/,
  'const [selectedPeriod, setSelectedPeriod] = useState<string>("Mês atual");'
);

// 3. Change initial startDateStr
code = code.replace(
  /const \[startDateStr, setStartDateStr\] = useState\(getPastDateStr\(180\)\);/,
  'const [startDateStr, setStartDateStr] = useState(getFirstDayOfMonthStr());'
);

// 4. Update useEffect for selectedPeriod
code = code.replace(
  /    \} else if \(selectedPeriod === "7 dias"\) \{/,
  '    } else if (selectedPeriod === "Mês atual") {\n      setStartDateStr(getFirstDayOfMonthStr());\n      setEndDateStr(getTodayStr());\n    } else if (selectedPeriod === "7 dias") {'
);

// 5. Add to select options
code = code.replace(
  /<option value="Hoje">Hoje<\/option>/,
  '<option value="Hoje">Hoje</option>\n                  <option value="Mês atual">Mês atual</option>'
);

fs.writeFileSync('src/pages/Dashboard.tsx', code);
