const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, '..', 'TradeBlotter_Export_16.csv');

if (!fs.existsSync(CSV_PATH)) {
  console.error('CSV not found');
  process.exit(1);
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result.map(s => s.replace(/^"|"$/g, ''));
}

const content = fs.readFileSync(CSV_PATH, 'utf8');
const lines = content.split(/\r?\n/);
const headers = parseCSVLine(lines[0]);

console.log('=== SCANNING EXPORT 16 COLUMN HEADERS ===');
console.log(`Total Columns: ${headers.length}`);
console.log('Columns list:', JSON.stringify(headers));

const firstNonEmptyValues = {};
headers.forEach(h => {
  firstNonEmptyValues[h] = null;
});

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  const cells = parseCSVLine(line);
  headers.forEach((h, idx) => {
    const val = (cells[idx] || '').trim();
    if (val && val !== 'N/A' && val !== '.' && firstNonEmptyValues[h] === null) {
      firstNonEmptyValues[h] = val;
    }
  });
}

console.log('\n=== COLUMNS AND FIRST NON-EMPTY REAL VALUE ===');
headers.forEach(h => {
  const val = firstNonEmptyValues[h];
  console.log(`- [${h}]: ${val ? `"${val}"` : '(COMPLETELY EMPTY - IGNORE)'}`);
});
