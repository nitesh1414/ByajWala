import React, { useCallback, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { Screen, Title, Card, Row, Btn, Chip, Muted } from '../components/ui';
import { getLoan, getSchedule, loanBalances, paymentsForLoan, unlockLoan } from '../db/repos';
import { formatMoney, formatRate } from '../utils/money';
import { useApp } from '../context/AppContext';
import { colors } from '../theme';

export default function LoanDetailScreen() {
  const nav = useNavigation<any>();
  const id = useRoute<any>().params.id as number;
  const { settings, refresh } = useApp();
  const [loan, setLoan] = useState<any>(null);
  const [bal, setBal] = useState<any>(null);
  const [sched, setSched] = useState<any[]>([]);
  const [pays, setPays] = useState<any[]>([]);
  const [tab, setTab] = useState<'schedule' | 'payments'>('schedule');

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setLoan(await getLoan(id));
        setBal(await loanBalances(id));
        setSched(await getSchedule(id));
        setPays(await paymentsForLoan(id));
      })();
    }, [id])
  );

  if (!loan || !bal) return null;
  const sym = settings.currency || '₹';

  return (
    <Screen>
      <Title>{loan.loan_no}</Title>
      <Muted>
        {loan.customer_name} · {loan.status}
        {loan.locked ? ' · locked' : ''}
      </Muted>
      <Card>
        <Row label="Principal" value={formatMoney(loan.principal, sym)} bold />
        <Row label="Rate / month" value={`${formatRate(loan.rate_bps)}%`} />
        <Row label="Monthly interest" value={formatMoney(loan.monthly_interest, sym)} />
        <Row label="Start / close" value={`${loan.start_date} → ${loan.closing_date}`} />
        <Row label="Principal outstanding" value={formatMoney(bal.principalOut, sym)} bold />
        <Row label="Interest paid" value={formatMoney(bal.interestPaid, sym)} />
        <Row label="Interest outstanding" value={formatMoney(bal.interestOut, sym)} />
      </Card>
      <Btn label="Record payment" onPress={() => nav.navigate('PaymentForm', { loanId: id })} />
      <Btn label="Final settlement" variant="ghost" onPress={() => nav.navigate('Settlement', { loanId: id })} />
      {loan.locked ? (
        <Btn
          label="Unlock closed loan"
          variant="danger"
          onPress={() =>
            Alert.alert('Unlock?', 'Closed loans should stay locked. Unlock only to correct a mistake.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Unlock',
                onPress: async () => {
                  await unlockLoan(id);
                  refresh();
                  setLoan(await getLoan(id));
                },
              },
            ])
          }
        />
      ) : null}
      <View style={{ flexDirection: 'row', marginTop: 12 }}>
        <Chip label="Schedule" active={tab === 'schedule'} onPress={() => setTab('schedule')} />
        <Chip label="Payments" active={tab === 'payments'} onPress={() => setTab('payments')} />
      </View>
      {tab === 'schedule'
        ? sched.map((s) => (
            <TouchableOpacity key={s.id} onPress={() => nav.navigate('Installment', { id: s.id, loanId: id })}>
              <Card>
                <Row label={`M${s.month_no} · ${s.due_date}`} value={s.status.toUpperCase()} />
                <Row label="Interest due / paid" value={`${formatMoney(s.interest_due, sym)} / ${formatMoney(s.interest_paid, sym)}`} />
                <Row label="Principal paid" value={formatMoney(s.principal_paid, sym)} />
              </Card>
            </TouchableOpacity>
          ))
        : pays.map((p) => (
            <TouchableOpacity key={p.id} onPress={() => nav.navigate('Receipt', { id: p.id })}>
              <Card>
                <Text style={{ fontWeight: '700' }}>{p.receipt_no}</Text>
                <Muted>
                  {p.payment_date} · {formatMoney(p.amount, sym)} · {p.payment_type}
                </Muted>
              </Card>
            </TouchableOpacity>
          ))}
    </Screen>
  );
}
