import React, { useCallback, useState } from 'react';
import { Text, View, TouchableOpacity } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Screen, Title, Card, Chip, Muted, Empty } from '../components/ui';
import { overdueRows } from '../db/repos';
import { formatMoney } from '../utils/money';
import { useApp } from '../context/AppContext';

const FILTERS = ['overdue', 'today', 'week', 'month', 'high', 'all'] as const;

export default function RecoveryScreen() {
  const nav = useNavigation<any>();
  const { settings } = useApp();
  const [f, setF] = useState<(typeof FILTERS)[number]>('overdue');
  const [rows, setRows] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      overdueRows(f).then(setRows);
    }, [f])
  );

  return (
    <Screen>
      <Title>Recovery</Title>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {FILTERS.map((x) => (
          <Chip key={x} label={x === 'high' ? 'high outstanding' : x === 'week' ? 'this week' : x === 'month' ? 'this month' : x} active={f === x} onPress={() => setF(x)} />
        ))}
      </View>
      {rows.length === 0 ? (
        <Empty text="Nothing in this filter." />
      ) : (
        rows.map((r) => (
          <TouchableOpacity key={r.id} onPress={() => nav.navigate('LoanDetail', { id: r.loan_id })}>
            <Card>
              <Text style={{ fontWeight: '700' }}>{r.customer_name}</Text>
              <Muted>
                {r.loan_no} · due {r.due_date} · {r.days_overdue > 0 ? `${r.days_overdue}d overdue` : r.status}
              </Muted>
              <Muted>
                Interest due {formatMoney(r.interest_due, settings.currency || '₹')} · received{' '}
                {formatMoney(r.interest_paid, settings.currency || '₹')} · remaining {formatMoney(r.remaining, settings.currency || '₹')}
              </Muted>
            </Card>
          </TouchableOpacity>
        ))
      )}
    </Screen>
  );
}
