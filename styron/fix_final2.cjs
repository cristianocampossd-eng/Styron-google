const fs = require('fs');
let lines = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8').split('\n');

// Fix sidebar_sales_indicators (lines around 2303)
for (let i = 2300; i < 2310; i++) {
  if (lines[i] && lines[i].includes('Card 5: Indicadores de Vendas')) {
    // Insert preferences.sidebar_sales_indicators && ( right after the comment
    lines.splice(i + 1, 0, '          {preferences.sidebar_sales_indicators && (');
    break;
  }
}

// Line 2354 currently has `)}` from my manual addition. Since we added a line above, it shifted.
// Let's just find the `)}` around 2350-2360 and delete it.
for (let i = 2350; i < 2365; i++) {
  if (lines[i] && lines[i].trim() === ')}') {
    lines[i] = ''; // remove the wrong one
    break;
  }
}

// Now we need to close sidebar_sales_indicators properly. It ends at `Gerenciar CRM de Clientes` button.
// The div for sidebar-indicadores-vendas ends around line 2353. Let's find it.
let foundEnd = false;
for (let i = 2345; i < 2365; i++) {
  if (lines[i] && lines[i].includes('Gerenciar CRM de Clientes')) {
    // We know the button ends 2 lines later, then div ends 1 line later.
    // Let's just insert `)}` after the `</div>` that corresponds to the card.
    lines.splice(i + 4, 0, '          )}');
    foundEnd = true;
    break;
  }
}

// Fix crm_charts: swap `)}` and `</div>` around 2640.
// Let's find the closing of the bento graphics grid.
for (let i = 2635; i < 2650; i++) {
  if (lines[i] && lines[i].includes('Clique no gráfico para auditar toda a carteira comercial')) {
    // line i: <p>
    // line i+1: </div> (closes card)
    // line i+2: empty
    // line i+3: )} or </div>
    // Let's rewrite these lines directly.
    lines[i+2] = '          </div>';
    lines[i+3] = '          )}';
    lines[i+4] = ''; // clear any remaining just in case
    break;
  }
}

fs.writeFileSync('src/pages/Dashboard.tsx', lines.join('\n'));
