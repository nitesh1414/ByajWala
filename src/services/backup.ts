import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { getDb } from '../db/database';
import { Platform } from 'react-native';

export async function exportBackup(): Promise<string> {
  const db = await getDb();
  const tables = [
    'customers',
    'loans',
    'loan_schedule',
    'payments',
    'payment_allocations',
    'receipts',
    'settings',
    'notifications_log',
    'audit_logs',
  ];
  const dump: Record<string, any[]> = { exported_at: [new Date().toISOString()] as any };
  for (const t of tables) {
    dump[t] = await db.getAllAsync(`SELECT * FROM ${t}`);
  }
  const json = JSON.stringify({ version: 1, exported_at: new Date().toISOString(), tables: dump });
  if (Platform.OS === 'web') {
    return json;
  }
  const path = `${FileSystem.documentDirectory}byajwala-backup-${Date.now()}.json`;
  await FileSystem.writeAsStringAsync(path, json);
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(path);
  return path;
}

export function validateBackup(obj: any): string | null {
  if (!obj || obj.version !== 1 || !obj.tables) return 'Invalid backup file.';
  if (!Array.isArray(obj.tables.customers) || !Array.isArray(obj.tables.loans)) return 'Backup missing core tables.';
  return null;
}

export async function restoreBackup(json: string) {
  const obj = JSON.parse(json);
  const err = validateBackup(obj);
  if (err) throw new Error(err);
  const db = await getDb();
  await db.execAsync('BEGIN');
  try {
    const order = [
      'audit_logs',
      'notifications_log',
      'receipts',
      'payment_allocations',
      'payments',
      'loan_schedule',
      'loans',
      'customers',
      'settings',
    ];
    for (const t of order) await db.execAsync(`DELETE FROM ${t}`);
    const insertOrder = [...order].reverse();
    for (const t of insertOrder) {
      const rows = obj.tables[t] || [];
      for (const row of rows) {
        const keys = Object.keys(row);
        const qs = keys.map(() => '?').join(',');
        await db.runAsync(
          `INSERT INTO ${t} (${keys.join(',')}) VALUES (${qs})`,
          ...keys.map((k) => row[k])
        );
      }
    }
    await db.execAsync('COMMIT');
  } catch (e) {
    await db.execAsync('ROLLBACK');
    throw e;
  }
}

export async function pickBackupFile(): Promise<string | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
  if (res.canceled || !res.assets?.[0]) return null;
  if (Platform.OS === 'web') {
    // content may be uri
    const r = await fetch(res.assets[0].uri);
    return r.text();
  }
  return FileSystem.readAsStringAsync(res.assets[0].uri);
}
