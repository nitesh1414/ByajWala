import React, { useCallback, useState } from 'react';
import { Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Screen, Card, Title, Muted, Btn, Empty } from '../components/ui';
import { searchCustomers } from '../db/repos';
import type { Customer } from '../types';
import { colors } from '../theme';

export default function CustomersScreen() {
  const nav = useNavigation<any>();
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<Customer[]>([]);

  const load = useCallback(() => {
    searchCustomers(q).then(setRows);
  }, [q]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <Screen>
      <Title>Customers</Title>
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder="Search name, mobile, ID"
        placeholderTextColor={colors.muted}
        style={styles.search}
        onSubmitEditing={load}
      />
      <Btn label="Add customer" onPress={() => nav.navigate('CustomerForm', {})} />
      {rows.length === 0 ? (
        <Empty text="No customers found." />
      ) : (
        rows.map((c) => (
          <TouchableOpacity key={c.id} onPress={() => nav.navigate('CustomerDetail', { id: c.id })}>
            <Card>
              <Text style={styles.name}>{c.full_name}</Text>
              <Muted>
                {c.customer_no} · {c.mobile} {c.city ? `· ${c.city}` : ''}
              </Muted>
            </Card>
          </TouchableOpacity>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    fontSize: 16,
  },
  name: { fontWeight: '700', color: colors.text },
});
