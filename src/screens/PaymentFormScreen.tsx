import React, { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Screen, Title, Field, Btn, Chip, Card, Row } from '../components/ui';
import { loanBalances, recordPayment } from '../db/repos';
import { formatMoney, toPaise } from '../utils/money';
import { todayISO } from '../db/database';
import { useApp } from '../context/AppContext';
import type { PaymentType } from '../types';

const TYPES: PaymentType[] = ['interest', 'principal', 'partial', 'advance_interest', 'other', 'settlement'];
const MODES = ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Other'];

export default function PaymentFormScreen() {
  const nav = useNavigation<any>();
  const loanId = useRoute<any>().params.loanId as number;
  const { settings, refresh } = useApp();
  const [bal, setBal] = useState<any>(null);
  const [date, setDate] = useState(todayISO());
  const [type, setType] = useState<PaymentType>('interest');
  const [mode, setMode] = useState('Cash');
  const [amount, setAmount] = useState('');
  const [interest, setInterest] = useState('');
  const [principal, setPrincipal] = useState('');
  const [penalty, setPenalty] = useState('0');
  const [discount, setDiscount] = useState('0');
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    loanBalances(loanId).then((b) => {
      setBal(b);
      const mi = b.loan.monthly_interest;
      setAmount(String(mi / 100));
      setInterest(String(mi / 100));
      setPrincipal('0');
    });
  }, [loanId]);

  useEffect(() => {
    if (!bal) return;
    if (type === 'interest' || type === 'advance_interest') {
      const v = bal.loan.monthly_interest / 100;
      setInterest(String(v));
      setPrincipal('0');
      setAmount(String(v));
    }
    if (type === 'principal') {
      setInterest('0');
      setPrincipal(String(bal.principalOut / 100));
      setAmount(String(bal.principalOut / 100));
    }
    if (type === 'settlement') {
      const tot = bal.principalOut + Math.max(0, bal.loan.monthly_interest - (bal.interestPaid % (bal.loan.monthly_interest || 1)));
      // remaining interest this cycle + principal
      const remainInt = Math.max(0, bal.interestOut > 0 ? bal.loan.monthly_interest : 0);
      setInterest(String(remainInt / 100));
      setPrincipal(String(bal.principalOut / 100));
      setAmount(String((remainInt + bal.principalOut) / 100));
    }
  }, [type, bal]);

  const save = async () => {
    const amt = toPaise(amount);
    if (amt <= 0) {
      Alert.alert('Invalid', 'Enter a payment amount.');
      return;
    }
    Alert.alert('Confirm payment', `Record ${formatMoney(amt, settings.currency || '₹')}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Save',
        onPress: async () => {
          try {
            const res = await recordPayment({
              loan_id: loanId,
              payment_date: date,
              amount: amt,
              payment_type: type,
              interest_amount: toPaise(interest),
              principal_amount: toPaise(principal),
              penalty: toPaise(penalty),
              discount: toPaise(discount),
              mode,
              remarks,
            });
            refresh();
            nav.replace('Receipt', { id: res.id });
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Could not save');
          }
        },
      },
    ]);
  };

  if (!bal) return null;
  const sym = settings.currency || '₹';

  return (
    <Screen>
      <Title>Record payment</Title>
      <Card>
        <Row label="Loan" value={bal.loan.loan_no} />
        <Row label="Principal out" value={formatMoney(bal.principalOut, sym)} />
        <Row label="Monthly interest" value={formatMoney(bal.loan.monthly_interest, sym)} />
      </Card>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {TYPES.map((t) => (
          <Chip key={t} label={t.replace('_', ' ')} active={type === t} onPress={() => setType(t)} />
        ))}
      </View>
      <Field label="Date" value={date} onChangeText={setDate} />
      <Field label="Amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
      <Field label="Interest portion" value={interest} onChangeText={setInterest} keyboardType="decimal-pad" />
      <Field label="Principal portion" value={principal} onChangeText={setPrincipal} keyboardType="decimal-pad" />
      <Field label="Penalty / late fee" value={penalty} onChangeText={setPenalty} keyboardType="decimal-pad" />
      <Field label="Discount / adjustment" value={discount} onChangeText={setDiscount} keyboardType="decimal-pad" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {MODES.map((m) => (
          <Chip key={m} label={m} active={mode === m} onPress={() => setMode(m)} />
        ))}
      </View>
      <Field label="Remarks" value={remarks} onChangeText={setRemarks} />
      <Btn label="Save payment" onPress={save} />
    </Screen>
  );
}
