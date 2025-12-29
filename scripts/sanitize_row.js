const Database = require('better-sqlite3');
const path = require('path');
const id = parseInt(process.argv[2], 10);
if (!id) {
  console.error('Usage: node sanitize_row.js <id>');
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
  cfg.personalInfo.firstName = 'Anon';
  cfg.personalInfo.lastName = 'User';
  cfg.personalInfo.email = 'anon@example.com';
  cfg.personalInfo.dob = '01/01/1970';
  cfg.personalInfo.lastFourSSN = '0000';
  cfg.personalInfo.phoneNumber = '';
  cfg.personalInfo.cardNumber = '';

  const newConfig = JSON.stringify(cfg);
  const newName = 'Anon User';
  const newEmail = 'anon@example.com';

  db.prepare('UPDATE queue SET config = ?, name = ?, email = ? WHERE id = ?').run(newConfig, newName, newEmail, id);
  console.log(`Sanitized queue id=${id}`);
} catch (e) {
  console.error('Error sanitizing row:', e.message);
  process.exit(1);
} finally {
  db.close();
}
