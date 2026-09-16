import { Platform } from 'react-native';
import { overdueRows, getSettings } from '../db/repos';
import { getDb } from '../db/database';

export async function refreshReminders() {
  const settings = await getSettings();
  if (settings.reminders_enabled !== '1') return;
  const db = await getDb();
  const today = overdueRows('today');
  const overdue = overdueRows('overdue');
  const [t, o] = await Promise.all([today, overdue]);
  const title = t.length ? `${t.length} payment(s) due today` : o.length ? `${o.length} overdue` : 'All clear';
  const body = t.length || o.length ? 'Open Recovery to collect interest.' : 'No dues today.';
  await db.runAsync(
    'INSERT INTO notifications_log (kind, title, body, scheduled_for, created_at) VALUES (?,?,?,?,?)',
    'digest',
    title,
    body,
    new Date().toISOString().slice(0, 10),
    new Date().toISOString()
  );
  if (Platform.OS === 'web') return;
  try {
    const Notifications = await import('expo-notifications');
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null,
    });
  } catch {
    /* optional */
  }
}
