import React, { useCallback, useState } from 'react';
import { Alert, Text } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { Screen, Title, Card, Row, Btn, Muted } from '../components/ui';
import { archiveCustomer, getCustomer, loanBalances, loansForCustomer, paymentsForCustomer } from '../db/repos';
import { formatMoney } from '../utils/money';
import { useApp } from '../context/AppContext';

export default function CustomerDetailScreen() {
  const nav = useNavigation<any>();
  const id = useRoute<any>().params.id as number;
  const { settings, refresh } = useApp();
  const [c, setC] = useState<any>(null);
  const [stats, setStats] = useState({ po: 0, io: 0, ip: 0, pp: 0 });

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const cust = await getCustomer(id);
        setC(cust);
        const loans = await loansForCustomer(id);
        let po = 0,
          io = 0,
          ip = 0,
          pp = 0;
        for (const l of loans) {
          const b = await loanBalances(l.id);
          po += b.principalOut;
          io += b.interestOut;
          ip += b.interestPaid;
          pp += b.principalPaid;
        }
        setStats({ po, io, ip, pp });
      })();
    }, [id])
  );

  if (!c) return null;
  const sym = settings.currency || '₹';

  return (
    <Screen>
      <Title>{c.full_name}</Title>
      <Muted>{c.customer_no}</Muted>
      <Card>
        <Row label="Mobile" value={c.mobile} />
        <Row label="Alt mobile" value={c.alt_mobile || '—'} />
        <Row label="Address" value={c.address || '—'} />
        <Row label="City" value={c.city || '—'} />
        <Row label="Guarantor" value={c.ref_name || '—'} />
        <Row label="ID proof" value={`${c.id_proof_type || ''} ${c.id_proof_number || ''}`.trim() || '—'} />
        <Row label="Notes" value={c.notes || '—'} />
      </Card>
      <Card>
        <Row label="Outstanding principal" value={formatMoney(stats.po, sym)} bold />
        <Row label="Outstanding interest" value={formatMoney(stats.io, sym)} />
        <Row label="Interest paid" value={formatMoney(stats.ip, sym)} />
        <Row label="Principal paid" value={formatMoney(stats.pp, sym)} />
        <Row label="Current outstanding" value={formatMoney(stats.po + stats.io, sym)} bold />
      </Card>
      <Btn label="Edit" variant="ghost" onPress={() => nav.navigate('CustomerForm', { id })} />
      <Btn label="New loan" onPress={() => nav.navigate('LoanForm', { customerId: id })} />
      <Btn label="Statement" variant="ghost" onPress={() => nav.navigate('Statement', { customerId: id })} />
      <Btn
        label="Archive customer"
        variant="danger"
        onPress={() =>
          Alert.alert('Archive?', 'Customer will be hidden. Loans remain.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Archive',
              style: 'destructive',
              onPress: async () => {
                await archiveCustomer(id);
                refresh();
                nav.goBack();
              },
            },
          ])
        }
      />
      <Text style={{ marginTop: 16, fontWeight: '700' }}>Loans</Text>
      <LoanList customerId={id} />
    </Screen>
  );
}

function LoanList({ customerId }: { customerId: number }) {
  const nav = useNavigation<any>();
  const [rows, setRows] = useState<any[]>([]);
  useFocusEffect(
    useCallback(() => {
      loansForCustomer(customerId).then(setRows);
    }, [customerId])
  );
  return (
    <>
      {rows.map((l) => (
        <Card key={l.id}>
          <Text
            onPress={() => nav.navigate('LoanDetail', { id: l.id })}
            style={{ fontWeight: '700' }}
          >
            {l.loan_no} · {l.status}
          </Text>
          <Muted>Start {l.start_date}</Muted>
        </Card>
      ))}
    </>
  );
}
