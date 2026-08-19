import React, { useState } from 'react';
import { Text, TextInput, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen, Title, Card, Muted, Empty } from '../components/ui';
import { globalSearch } from '../db/repos';
import { colors } from '../theme';

export default function SearchScreen() {
  const nav = useNavigation<any>();
  const [q, setQ] = useState('');
  const [res, setRes] = useState<{ customers: any[]; loans: any[] }>({ customers: [], loans: [] });

  const go = async (t: string) => {
    setQ(t);
    if (t.trim().length < 1) {
      setRes({ customers: [], loans: [] });
      return;
    }
    setRes(await globalSearch(t));
  };

  return (
    <Screen>
      <Title>Search</Title>
      <TextInput
        value={q}
        onChangeText={go}
        placeholder="Name, mobile, loan no, customer ID"
        style={{
          borderWidth: 1,
          borderColor: colors.line,
          backgroundColor: '#fff',
          borderRadius: 10,
          padding: 12,
          marginBottom: 12,
        }}
      />
      {res.customers.length + res.loans.length === 0 ? <Empty text="Type to search locally." /> : null}
      {res.customers.map((c) => (
        <TouchableOpacity key={'c' + c.id} onPress={() => nav.navigate('CustomerDetail', { id: c.id })}>
          <Card>
            <Text style={{ fontWeight: '700' }}>{c.full_name}</Text>
            <Muted>
              {c.customer_no} · {c.mobile}
            </Muted>
          </Card>
        </TouchableOpacity>
      ))}
      {res.loans.map((l) => (
        <TouchableOpacity key={'l' + l.id} onPress={() => nav.navigate('LoanDetail', { id: l.id })}>
          <Card>
            <Text style={{ fontWeight: '700' }}>{l.loan_no}</Text>
            <Muted>{l.customer_name}</Muted>
          </Card>
        </TouchableOpacity>
      ))}
    </Screen>
  );
}
