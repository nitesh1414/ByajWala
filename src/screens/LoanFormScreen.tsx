import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Screen, Title, Field, Btn, Card, Row, Chip } from '../components/ui';
import { createLoan, searchCustomers } from '../db/repos';
import { previewLoan } from '../services/calc';
import { formatMoney, parseRateToBps, toPaise } from '../utils/money';
import { todayISO } from '../db/database';
import { useApp } from '../context/AppContext';
import type { Customer } from '../types';

export default function LoanFormScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { settings, refresh } = useApp();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState<number | undefined>(route.params?.customerId);
  const [start, setStart] = useState(todayISO());
  const [principal, setPrincipal] = useState('');
  const [rate, setRate] = useState(settings.default_rate || '2');
  const [months, setMonths] = useState(settings.default_duration || '12');
  const [dueDay, setDueDay] = useState('1');
  const [notes, setNotes] = useState('');
  const [review, setReview] = useState(false);

  useEffect(() => {
    searchCustomers('').then(setCustomers);
  }, []);

  const prev = useMemo(() => {
    const p = toPaise(principal);
    const m = Number(months) || 0;
    if (p <= 0 || m <= 0) return null;
    return previewLoan({
      principal: p,
      rateBps: parseRateToBps(rate),
      durationMonths: m,
      startDate: start,
      dueDay: Number(dueDay) || 1,
    });
  }, [principal, rate, months, start, dueDay]);

  const save = async () => {
    if (!customerId || !prev) {
      Alert.alert('Incomplete', 'Select a customer and enter valid loan amounts.');
      return;
    }
    await createLoan({
      customer_id: customerId,
      start_date: start,
      principal: toPaise(principal),
      rate_bps: parseRateToBps(rate),
      duration_months: Number(months),
      interest_due_day: Number(dueDay) || 1,
      notes,
    });
    refresh();
    Alert.alert('Saved', 'Loan created with monthly schedule.');
    nav.goBack();
  };

  const sym = settings.currency || '₹';

  return (
    <Screen>
      <Title>New loan</Title>
      <Text style={{ marginBottom: 6, fontWeight: '600' }}>Customer</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {customers.map((c) => (
          <Chip key={c.id} label={c.full_name} active={customerId === c.id} onPress={() => setCustomerId(c.id)} />
        ))}
      </View>
      <Field label="Start date (YYYY-MM-DD)" value={start} onChangeText={setStart} />
      <Field label="Principal (₹)" value={principal} onChangeText={setPrincipal} keyboardType="decimal-pad" />
      <Field label="Monthly interest rate (%)" value={rate} onChangeText={setRate} keyboardType="decimal-pad" />
      <Field label="Duration (months)" value={months} onChangeText={setMonths} keyboardType="number-pad" />
      <Field label="Interest due day of month" value={dueDay} onChangeText={setDueDay} keyboardType="number-pad" />
      <Field label="Notes" value={notes} onChangeText={setNotes} multiline />
      {prev && (
        <Card>
          <Row label="Monthly interest" value={formatMoney(prev.monthlyInterest, sym)} bold />
          <Row label="Total expected interest" value={formatMoney(prev.totalExpectedInterest, sym)} />
          <Row label="Final settlement (P + last month)" value={formatMoney(prev.finalSettlement, sym)} />
          <Row label="Closing date" value={prev.closingDate} />
          <Row label="Installments" value={String(prev.schedule.length)} />
        </Card>
      )}
      {!review ? (
        <Btn label="Review calculation" onPress={() => setReview(true)} disabled={!prev} />
      ) : (
        <>
          {prev?.schedule.map((s) => (
            <Card key={s.month_no}>
              <Row label={`Month ${s.month_no}`} value={s.due_date} />
              <Row label="Interest due" value={formatMoney(s.interest_due, sym)} />
              {s.is_final ? <Row label="Includes principal" value={formatMoney(s.principal_snapshot, sym)} /> : null}
            </Card>
          ))}
          <Btn label="Save loan" onPress={save} />
        </>
      )}
    </Screen>
  );
}
