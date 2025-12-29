const { spawn } = require('child_process');
const { join } = require('path');
const { existsSync, renameSync, unlinkSync, writeFileSync, createWriteStream } = require('fs');
const YAML = require('yaml');
const Database = require('better-sqlite3');

async function runId(id) {
  const webUiDb = join(__dirname, '..', 'web-ui', '.data', 'app.db');
  const db = new Database(webUiDb);
  const row = db.prepare('SELECT * FROM queue WHERE id = ?').get(id);
  if (!row) {
    console.log(`No queue row with id=${id}`);
    db.close();
    return;
  }
  if (row.paid !== 1) {
    console.log(`Row id=${id} is not paid (paid=${row.paid}), skipping`);
    db.close();
    return;
  }
  if (row.status !== 'pending') {
    console.log(`Row id=${id} status is '${row.status}', expected 'pending' to process`);
    db.close();
    return;
  }

  const projectRoot = join(__dirname, '..');
  const configPath = join(projectRoot, 'config.yml');
  const backupPath = join(projectRoot, `config.yml.bak.${Date.now()}`);
  let hadBackup = false;
  try {
    if (existsSync(configPath)) {
      renameSync(configPath, backupPath);
      hadBackup = true;
    }
    const cfg = JSON.parse(row.config);
    const yamlText = YAML.stringify(cfg || {});
    writeFileSync(configPath, yamlText, 'utf8');

    console.log(`Wrote config.yml for id=${id}, starting scheduler with DRY_RUN=1`);

    const logPath = join(__dirname, `dryrun_${id}_${Date.now()}.log`);
    const logStream = createWriteStream(logPath, { flags: 'a' });

    const proc = spawn('npm', ['start'], { cwd: projectRoot, shell: true, env: { ...process.env, DRY_RUN: '1' } });
    proc.stdout.on('data', d => { const s = d.toString(); process.stdout.write(s); logStream.write('[OUT] ' + s); });
    proc.stderr.on('data', d => { const s = d.toString(); process.stderr.write(s); logStream.write('[ERR] ' + s); });

    const timeoutMs = 3 * 60 * 1000; // 3 minutes
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      try { proc.kill(); } catch (e) {}
    }, timeoutMs);

    const exitCode = await new Promise((resolve) => {
      proc.on('close', (code) => {
        clearTimeout(timeout);
        resolve(code ?? 0);
      });
      proc.on('error', (err) => {
        clearTimeout(timeout);
        resolve(1);
      });
    });

    logStream.end();

    if (timedOut) {
      console.log(`Scheduler run for id=${id} timed out after ${timeoutMs/1000}s. See ${logPath}`);
    } else {
      console.log(`Scheduler exited with code ${exitCode} for id=${id}. Log: ${logPath}`);
      if (exitCode === 0) {
        db.prepare("UPDATE queue SET status = 'done' WHERE id = ?").run(id);
        console.log(`Marked id=${id} done in DB.`);
      } else {
        console.log(`Did not mark id=${id} done (exit code ${exitCode}).`);
      }
    }
  } catch (err) {
    console.error('Error processing id=', id, err);
  } finally {
    // restore backup
    try {
      if (hadBackup) {
        if (existsSync(configPath)) unlinkSync(configPath);
        renameSync(backupPath, configPath);
      } else {
        if (existsSync(configPath)) unlinkSync(configPath);
      }
    } catch (e) {
      console.error('Failed to restore config backup:', e);
    }
  }
  db.close();
}

async function main() {
  const ids = process.argv.slice(2).map(x => parseInt(x, 10)).filter(n => !isNaN(n));
  if (ids.length === 0) {
    console.error('Usage: node run_dry_for_ids.js <id1> <id2> ...');
    process.exit(1);
  }
  for (const id of ids) {
    await runId(id);
  }
}

main();
