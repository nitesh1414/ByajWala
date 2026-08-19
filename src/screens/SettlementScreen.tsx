import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Screen, Title, Card, Row, Field, Btn } from '../components/ui';
import { loanBalances, settleLoan } from '../db/repos';
import { formatMoney, toPaise } from '../utils/money';
import { todayISO } from '../db/database';
import { useApp } from '../context/AppContext';

export default function SettlementScreen() {
  const nav = useNavigation<any>();
  const loanId = useRoute<any>().params.loanId as number;
  const { settings, refresh } = useApp();
  const [b, setB] = useState<any>(null);
  const [date, setDate] = useState(todayISO());
  const [received, setReceived] = useState('');

  useEffect(() => {
    loanBalances(loanId).then((x) => {
      setB(x);
      const remainInt = x.loan.monthly_interest; // last month interest if still open
      const payable = x.principalOut + remainInt;
      setReceived(String(payable / 100));
    });
  }, [loanId]);

  if (!b) return null;
  const sym = settings.currency || '₹';
  const remainInt = b.loan.monthly_interest;
  const payable = b.principalOut + remainInt;

  const close = () => {
    Alert.alert('Close loan?', 'This marks the loan closed and locked.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Settle',
        onPress: async () => {
          await settleLoan(loanId, {
            payment_date: date,
            amount: toPaise(received),
            interest_amount: remainInt,
            principal_amount: b.principalOut,
            penalty: 0,
            discount: Math.max(0, payable - toPaise(received)),
            mode: 'Cash',
            remarks: 'Final settlement',
          });
          refresh();
          Alert.alert('Closed', 'Loan settled and locked.');
          nav.goBack();
        },
      },
    ]);
  };

  return (
    <Screen>
      <Title>Final settlement</Title>
      <Card>
        <Row label="Original principal" value={formatMoney(b.loan.principal, sym)} />
        <Row label="Total interest due (expected)" value={formatMoney(b.expected, sym)} />
        <Row label="Total interest paid" value={formatMoney(b.interestPaid, sym)} />
        <Row label="Remaining interest (this close)" value={formatMoney(remainInt, sym)} />
        <Row label="Principal outstanding" value={formatMoney(b.principalOut, sym)} bold />
        <Row label="Final amount payable" value={formatMoney(payable, sym)} bold />
      </Card>
      <Field label="Settlement date" value={date} onChangeText={setDate} />
      <Field label="Final payment received" value={received} onChangeText={setReceived} keyboardType="decimal-pad" />
      <Btn label="Close loan" onPress={close} />
    </Screen>
  );
}
