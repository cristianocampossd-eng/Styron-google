const fs = require('fs');
let lines = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8').split('\n');

// Remove line 1864 (index 1863) which is the extra `)}`
if (lines[1863].trim() === ')}') {
  lines[1863] = '';
}

// Remove line 2032 (index 2031) which is `        </div>`
if (lines[2031].trim() === '</div>') {
  lines[2031] = '';
}

// Write back
fs.writeFileSync('src/pages/Dashboard.tsx', lines.join('\n'));
