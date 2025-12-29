const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'web-ui', '.data', 'app.db');
console.log('DB path:', dbPath);
const db = new Database(dbPath, { readonly: true });
try {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  console.log('TABLES:', tables.map(t => t.name).join(', '));
  console.log('---queue rows---');
  try {
    const rows = db.prepare('SELECT * FROM queue').all();
    console.log(JSON.stringify(rows, null, 2));
  } catch (e) {
    console.error('Error reading queue table:', e.message);
  }
} finally {
  db.close();
}
