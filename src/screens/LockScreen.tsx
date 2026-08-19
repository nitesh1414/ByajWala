import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Btn } from '../components/ui';
import { colors } from '../theme';

export default function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');

  const check = async (value: string) => {
    setPin(value);
    const stored =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem('bw_pin')
        : null;
    let expected = stored;
    try {
      const SecureStore = await import('expo-secure-store');
      expected = (await SecureStore.getItemAsync('bw_pin')) || stored;
    } catch {
      /* web */
    }
    if (value.length >= 4 && expected && value === expected) {
      onUnlock();
    } else if (value.length >= 4 && expected && value.length === expected.length) {
      setErr('Incorrect PIN');
      setPin('');
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.logo}>ByajWala</Text>
      <Text style={styles.sub}>Enter PIN to open the ledger</Text>
      <TextInput
        value={pin}
        onChangeText={check}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={6}
        style={styles.input}
      />
      {err ? <Text style={styles.err}>{err}</Text> : null}
      <Btn label="Unlock" onPress={() => check(pin)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', padding: 28, backgroundColor: colors.bg },
  logo: { fontSize: 32, fontWeight: '800', color: colors.primary, textAlign: 'center' },
  sub: { textAlign: 'center', color: colors.muted, marginVertical: 12 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    letterSpacing: 8,
    textAlign: 'center',
  },
  err: { color: colors.danger, textAlign: 'center', marginTop: 8 },
});
