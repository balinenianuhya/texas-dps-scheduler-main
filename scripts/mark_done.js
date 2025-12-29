const Database = require('better-sqlite3');
const path = require('path');
const id = parseInt(process.argv[2], 10);
if (!id) {
  console.error('Usage: node mark_done.js <id>');
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
  db.prepare("UPDATE queue SET status = 'done' WHERE id = ?").run(id);
  console.log(`Marked id=${id} done in DB.`);
} catch (e) {
  console.error('Error updating DB:', e.message);
  process.exit(1);
} finally {
  db.close();
}
