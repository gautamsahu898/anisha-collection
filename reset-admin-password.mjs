import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scryptSync } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const databasePath = path.join(root, 'anisha.sqlite');
if (!existsSync(databasePath)) throw new Error('anisha.sqlite was not found beside this script. Run it from the project that contains the store database.');
const db = new DatabaseSync(databasePath);
db.exec('PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;');

async function readHidden(prompt) {
  if (!process.stdin.isTTY || !process.stdout.isTTY || typeof process.stdin.setRawMode !== 'function') {
    throw new Error('Run this command in an interactive local terminal so password input can stay hidden.');
  }
  process.stdout.write(prompt);
  const stdin = process.stdin;
  const previousRawMode = stdin.isRaw;
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding('utf8');
  return new Promise((resolve, reject) => {
    let value = '';
    const finish = (error) => {
      stdin.off('data', onData);
      stdin.setRawMode(previousRawMode);
      process.stdout.write('\n');
      if (error) reject(error);
      else resolve(value);
    };
    const onData = chunk => {
      for (const char of chunk) {
        if (char === '\u0003') return finish(new Error('Reset cancelled.'));
        if (char === '\r' || char === '\n') return finish();
        if (char === '\u007f' || char === '\b') value = [...value].slice(0, -1).join('');
        else if (char >= ' ') value += char;
      }
    };
    stdin.on('data', onData);
  });
}

try {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const email = (await rl.question('Admin email to reset: ')).trim().toLowerCase();
  rl.close();
  const admin = db.prepare("SELECT id FROM users WHERE email=? AND role='admin'").get(email);
  if (!admin) throw new Error('No administrator account found for that email.');

  const confirm = await readHidden(`Type RESET to continue for ${email}: `);
  if (confirm !== 'RESET') throw new Error('Reset cancelled.');

  const password = await readHidden('New password (minimum 12 characters): ');
  const repeated = await readHidden('Repeat new password: ');
  if (password.length < 12) throw new Error('Password must be at least 12 characters.');
  if (password !== repeated) throw new Error('Passwords do not match.');

  const salt = randomBytes(16).toString('hex');
  const passwordHash = `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(passwordHash, admin.id);
    db.prepare('DELETE FROM sessions WHERE user_id=?').run(admin.id);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  console.log('Admin password updated. Sign in again with the new password.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  db.close();
}
