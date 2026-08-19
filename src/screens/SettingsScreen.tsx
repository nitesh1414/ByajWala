import React, { useEffect, useState } from 'react';
import { Alert, Share } from 'react-native';
import { Screen, Title, Field, Btn, Card, Row } from '../components/ui';
import { getSettings, setSetting } from '../db/repos';
import { exportBackup, pickBackupFile, restoreBackup } from '../services/backup';
import { useApp } from '../context/AppContext';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

async function setPin(pin: string) {
  if (Platform.OS === 'web') {
    localStorage.setItem('bw_pin', pin);
    return;
  }
  await SecureStore.setItemAsync('bw_pin', pin);
}

export default function SettingsScreen() {
  const { reloadSettings } = useApp();
  const [s, setS] = useState<Record<string, string>>({});
  const [pin, setPinVal] = useState('');

  useEffect(() => {
    getSettings().then(setS);
  }, []);

  const save = async () => {
    for (const [k, v] of Object.entries(s)) await setSetting(k, v);
    await reloadSettings();
    Alert.alert('Saved', 'Settings updated.');
  };

  const set = (k: string) => (v: string) => setS((x) => ({ ...x, [k]: v }));

  return (
    <Screen>
      <Title>Settings</Title>
      <Field label="Business name" value={s.business_name || ''} onChangeText={set('business_name')} />
      <Field label="Address" value={s.address || ''} onChangeText={set('address')} />
      <Field label="Mobile" value={s.mobile || ''} onChangeText={set('mobile')} />
      <Field label="Email" value={s.email || ''} onChangeText={set('email')} />
      <Field label="Currency" value={s.currency || '₹'} onChangeText={set('currency')} />
      <Field label="Default interest rate %" value={s.default_rate || '2'} onChangeText={set('default_rate')} />
      <Field label="Default duration (months)" value={s.default_duration || '12'} onChangeText={set('default_duration')} />
      <Field label="Receipt prefix" value={s.receipt_prefix || 'BW'} onChangeText={set('receipt_prefix')} />
      <Field label="Reminders enabled (1/0)" value={s.reminders_enabled || '1'} onChangeText={set('reminders_enabled')} />
      <Field label="Remind days before due" value={s.reminder_days || '1'} onChangeText={set('reminder_days')} />
      <Btn label="Save settings" onPress={save} />
      <Card>
        <Row label="App lock" value={s.pin_enabled === '1' ? 'On' : 'Off'} />
      </Card>
      <Field label="Set PIN (4 or 6 digits)" value={pin} onChangeText={setPinVal} keyboardType="number-pad" />
      <Btn
        label="Enable PIN lock"
        variant="ghost"
        onPress={async () => {
          if (!/^\d{4}$|^\d{6}$/.test(pin)) {
            Alert.alert('PIN', 'Enter 4 or 6 digits.');
            return;
          }
          await setPin(pin);
          await setSetting('pin_enabled', '1');
          await reloadSettings();
          Alert.alert('Locked', 'PIN saved on this device.');
        }}
      />
      <Btn
        label="Disable PIN"
        variant="ghost"
        onPress={async () => {
          await setSetting('pin_enabled', '0');
          await reloadSettings();
        }}
      />
      <Btn
        label="Export backup"
        onPress={async () => {
          const r = await exportBackup();
          if (typeof r === 'string' && r.startsWith('{')) {
            await Share.share({ message: r, title: 'byajwala-backup.json' });
          } else {
            Alert.alert('Backup', `Saved ${r}`);
          }
        }}
      />
      <Btn
        label="Restore backup"
        variant="danger"
        onPress={() =>
          Alert.alert('Restore?', 'This replaces ALL local data. Continue?', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Restore',
              style: 'destructive',
              onPress: async () => {
                try {
                  const txt = await pickBackupFile();
                  if (!txt) return;
                  await restoreBackup(txt);
                  await reloadSettings();
                  Alert.alert('Restored', 'Data imported.');
                } catch (e: any) {
                  Alert.alert('Failed', e.message || 'Invalid backup');
                }
              },
            },
          ])
        }
      />
    </Screen>
  );
}
