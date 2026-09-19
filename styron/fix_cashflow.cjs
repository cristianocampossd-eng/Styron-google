const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

// 1. Update the loop to 12 months and change variable name
// from `i = 5; i >= 0; i--` to `i = 11; i >= 0; i--`
// from `Saldo: 0` to `Resultado: 0`
code = code.replace(
  /for \(let i = 5; i >= 0; i--\) \{/,
  'for (let i = 11; i >= 0; i--) {'
);
code = code.replace(
  /Saldo: 0,/g,
  'Resultado: 0,'
);

// 2. Remove the currentAccumulated logic and change found.Saldo to found.Resultado
code = code.replace(
  /found\.Saldo \+= val;/g,
  'found.Resultado += val;'
);

// Replace lines 725-744 which calculates the accumulated balance.
// We just want to return list.map(({ name, Resultado }) => ({ name, Resultado }))
// Let's use regex to replace that block.
const blockToReplace = `    // Account for initial balances of bank accounts if no filters are applied
    if (projectFilter === "all" && systemFilter === "all" && accounts) {
      const totalAccountsBalance = accounts.reduce((acc, a) => acc + (a.balance || 0), 0);
      let allTxNet = 0;
      transactions.forEach(t => {
         if (t.type === "income") allTxNet += t.value;
         else if (t.type === "expense" || t.type === "withdrawal") allTxNet -= t.value;
      });
      const initialBase = totalAccountsBalance - allTxNet;
      previousBalance += initialBase;
    }

    let currentAccumulated = previousBalance;
    for (const m of list) {
      currentAccumulated += m.Saldo;
      m.Saldo = currentAccumulated;
    }

    return list.map(({ name, Saldo }) => ({ name, Saldo }));`;

if (code.includes(blockToReplace)) {
  code = code.replace(blockToReplace, `    return list.map(({ name, Resultado }) => ({ name, Resultado }));`);
} else {
  console.log("Could not find exact block to replace, falling back to manual split...");
}

// 3. Update the Card UI to be 12 months, and full width
// "Últimos 6 meses" -> "Últimos 12 meses"
code = code.replace(
  /<p className="text-xs text-slate-400 font-medium">Últimos 6 meses<\/p>/g,
  '<p className="text-xs text-slate-400 font-medium">Últimos 12 meses</p>'
);
code = code.replace(
  /<span>6 meses<\/span>/g,
  '<span>12 meses</span>'
);

// 4. Update the chart area to display Resultado
code = code.replace(
  /<Area type="monotone" dataKey="Saldo" stroke="#8B5CF6" strokeWidth=\{2\.5\}/g,
  '<Area type="monotone" dataKey="Resultado" stroke="#8B5CF6" strokeWidth={2.5}'
);
code = code.replace(
  /● Saldo Acumulado/g,
  '● Resultado do Mês (Lucro/Prejuízo)'
);
code = code.replace(
  /gradientSaldo/g,
  'gradientResultado'
);
// Make the card full width if it isn't. The parent is grid-cols-1 md:grid-cols-2.
// Let's just add md:col-span-2 to the "Fluxo de Caixa" card.
// Wait, if Receitas vs Despesas is col-span-1, making Fluxo de Caixa col-span-2 leaves a blank hole.
// Let's make BOTH col-span-2, effectively stacking them in full width.
code = code.replace(
  /<div className="bg-white border border-slate-200\/80 rounded-2xl p-5 shadow-xs" id="card-chart-receitas-despesas">/g,
  '<div className="md:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs" id="card-chart-receitas-despesas">'
);
code = code.replace(
  /<div className="bg-white border border-slate-200\/80 rounded-2xl p-5 shadow-xs" id="card-chart-fluxo-caixa">/g,
  '<div className="md:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs" id="card-chart-fluxo-caixa">'
);

fs.writeFileSync('src/pages/Dashboard.tsx', code);
console.log("Updated!");
