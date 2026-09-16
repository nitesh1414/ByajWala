import React, { useCallback, useState } from 'react';
import { Text, View, TouchableOpacity } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Screen, Title, Card, Chip, Btn, Muted, Empty } from '../components/ui';
import { listLoans } from '../db/repos';
import { formatMoney } from '../utils/money';
import { useApp } from '../context/AppContext';

export default function LoansScreen() {
  const nav = useNavigation<any>();
  const { settings } = useApp();
  const [filter, setFilter] = useState('active');
  const [rows, setRows] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      listLoans(filter).then(setRows);
    }, [filter])
  );

  return (
    <Screen>
      <Title>Loans</Title>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {['active', 'closed', 'all'].map((f) => (
          <Chip key={f} label={f} active={filter === f} onPress={() => setFilter(f)} />
        ))}
      </View>
      <Btn label="Create loan" onPress={() => nav.navigate('LoanForm', {})} />
      {rows.length === 0 ? (
        <Empty text="No loans in this filter." />
      ) : (
        rows.map((l) => (
          <TouchableOpacity key={l.id} onPress={() => nav.navigate('LoanDetail', { id: l.id })}>
            <Card>
              <Text style={{ fontWeight: '700' }}>{l.customer_name}</Text>
              <Muted>
                {l.loan_no} · {formatMoney(l.principal, settings.currency || '₹')} · {l.status}
              </Muted>
            </Card>
          </TouchableOpacity>
        ))
      )}
    </Screen>
  );
}
