const fs = require('fs');
let lines = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8').split('\n');

// Find and remove line 2250 (which contains `)}`)
if (lines[2249].trim() === ')}') {
  lines[2249] = '';
}

// Find and remove line 2639 (which contains `</div>`)
if (lines[2638].trim() === '</div>') {
  lines[2638] = '';
}

fs.writeFileSync('src/pages/Dashboard.tsx', lines.join('\n'));
