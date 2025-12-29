const Database = require('better-sqlite3');
const path = require('path');
const id = parseInt(process.argv[2], 10);
const last4 = process.argv[3];
if (!id || !last4) {
  console.error('Usage: node update_ssn.js <id> <last4>');
  process.exit(1);
}
const dbPath = path.join(__dirname, '..', 'web-ui', '.data', 'app.db');
const db = new Database(dbPath);
try {
  const row = db.prepare('SELECT * FROM queue WHERE id = ?').get(id);
  if (!row) {
    console.error(`No queue row with id=${id}`);
    process.exit(1);
  }
  const cfg = JSON.parse(row.config || '{}');
  cfg.personalInfo = cfg.personalInfo || {};
  cfg.personalInfo.lastFourSSN = String(last4);
  db.prepare('UPDATE queue SET config = ? WHERE id = ?').run(JSON.stringify(cfg), id);
  console.log(`Updated id=${id} lastFourSSN=${last4}`);
} catch (e) {
  console.error('Error updating DB:', e.message);
  process.exit(1);
} finally {
  db.close();
}
