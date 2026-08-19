import * as SQLite from 'expo-sqlite';
import { MIGRATIONS } from './schema';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('byajwala.db');
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await db.execAsync(MIGRATIONS[0]);
  await seedSettings(db);
  return db;
}

async function seedSettings(database: SQLite.SQLiteDatabase) {
  const defaults: Record<string, string> = {
    business_name: 'ByajWala',
    address: '',
    mobile: '',
    email: '',
    currency: '₹',
    default_rate: '2',
    default_duration: '12',
    receipt_prefix: 'BW',
    reminder_days: '1',
    reminders_enabled: '1',
    pin_enabled: '0',
    receipt_seq: '0',
    customer_seq: '0',
    loan_seq: '0',
  };
  for (const [k, v] of Object.entries(defaults)) {
    await database.runAsync(
      'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
      k,
      v
    );
  }
}

export async function audit(action: string, entity: string, entityId?: number, details?: string) {
  const database = await getDb();
  await database.runAsync(
    'INSERT INTO audit_logs (action, entity, entity_id, details, created_at) VALUES (?,?,?,?,?)',
    action,
    entity,
    entityId ?? null,
    details ?? null,
    new Date().toISOString()
  );
}

export async function nextSeq(kind: 'customer' | 'loan' | 'receipt'): Promise<string> {
  const database = await getDb();
  const key = `${kind}_seq`;
  const row = await database.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key=?', key);
  const n = Number(row?.value ?? 0) + 1;
  await database.runAsync('UPDATE settings SET value=? WHERE key=?', String(n), key);
  const prefix = kind === 'customer' ? 'C' : kind === 'loan' ? 'L' : 'R';
  const extra =
    kind === 'receipt'
      ? ((await database.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key=?', 'receipt_prefix'))
          ?.value ?? 'BW')
      : prefix;
  const year = new Date().getFullYear();
  if (kind === 'receipt') return `${extra}-${year}-${String(n).padStart(5, '0')}`;
  return `${prefix}${year}${String(n).padStart(4, '0')}`;
}

export function todayISO(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1 + months, d);
  return todayISO(dt);
}
