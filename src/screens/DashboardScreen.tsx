import React, { useCallback, useLayoutEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Screen, Card, Title, Muted, Amount, Loader, Empty } from '../components/ui';
import { dashboard } from '../db/repos';
import { formatMoney } from '../utils/money';
import { colors } from '../theme';
import { useApp } from '../context/AppContext';

export default function DashboardScreen() {
  const nav = useNavigation<any>();
  const { tick, settings } = useApp();

  useLayoutEffect(() => {
    nav.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', gap: 12, marginRight: 8 }}>
          <Text onPress={() => nav.navigate('Search')} style={{ color: colors.primary, fontWeight: '700' }}>
            Search
          </Text>
          <Text onPress={() => nav.navigate('Settings')} style={{ color: colors.primary, fontWeight: '700' }}>
            Settings
          </Text>
        </View>
      ),
    });
  }, [nav]);
  const [data, setData] = useState<any>(null);
  const sym = settings.currency || '₹';

  useFocusEffect(
    useCallback(() => {
      dashboard().then(setData).catch(console.warn);
    }, [tick])
  );

  if (!data) return <Loader />;

  const tiles = [
    { t: 'Active loans', v: String(data.active), c: colors.primary },
    { t: 'Principal out', v: formatMoney(data.principalOut, sym), c: colors.ink },
    { t: 'Interest expected', v: formatMoney(data.interestExp, sym), c: colors.warn },
    { t: 'Interest this month', v: formatMoney(data.collectedMonth, sym), c: colors.accent },
    { t: 'Due today', v: String(data.dueToday), c: colors.danger },
    { t: 'Due in 7 days', v: String(data.dueWeek), c: colors.warn },
    { t: 'Overdue items', v: String(data.overdue), c: colors.danger },
  ];

  return (
    <Screen>
      <Title>Dashboard</Title>
      <Muted>{settings.business_name || 'ByajWala'} · offline ledger</Muted>
      <View style={styles.grid}>
        {tiles.map((x) => (
          <Card key={x.t} style={styles.tile}>
            <Muted>{x.t}</Muted>
            <Amount value={x.v} size={18} />
          </Card>
        ))}
      </View>
      <Text style={styles.h}>Recently added loans</Text>
      {data.recentLoans.length === 0 ? (
        <Empty text="No loans yet. Add a customer and create a loan." />
      ) : (
        data.recentLoans.map((l: any) => (
          <TouchableOpacity key={l.id} onPress={() => nav.navigate('LoanDetail', { id: l.id })}>
            <Card>
              <Text style={styles.name}>{l.customer_name}</Text>
              <Muted>
                {l.loan_no} · {formatMoney(l.principal, sym)}
              </Muted>
            </Card>
          </TouchableOpacity>
        ))
      )}
      <Text style={styles.h}>Recent payments</Text>
      {data.recentPays.length === 0 ? (
        <Empty text="No payments recorded." />
      ) : (
        data.recentPays.map((p: any) => (
          <TouchableOpacity key={p.id} onPress={() => nav.navigate('Receipt', { id: p.id })}>
            <Card>
              <Text style={styles.name}>{p.customer_name}</Text>
              <Muted>
                {p.receipt_no} · {formatMoney(p.amount, sym)} · {p.payment_date}
              </Muted>
            </Card>
          </TouchableOpacity>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  tile: { width: '48%', flexGrow: 1 },
  h: { marginTop: 18, marginBottom: 8, fontWeight: '700', color: colors.ink, fontSize: 16 },
  name: { fontWeight: '700', color: colors.text, marginBottom: 2 },
});
