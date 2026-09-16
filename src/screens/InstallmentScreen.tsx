import React, { useEffect, useState } from 'react';
import { useRoute } from '@react-navigation/native';
import { Screen, Title, Card, Row } from '../components/ui';
import { getDb } from '../db/database';
import { formatMoney } from '../utils/money';
import { useApp } from '../context/AppContext';

export default function InstallmentScreen() {
  const { id } = useRoute<any>().params;
  const { settings } = useApp();
  const [s, setS] = useState<any>(null);
  useEffect(() => {
    getDb().then((db) => db.getFirstAsync('SELECT * FROM loan_schedule WHERE id=?', id).then(setS));
  }, [id]);
  if (!s) return null;
  const sym = settings.currency || '₹';
  return (
    <Screen>
      <Title>Installment {s.month_no}</Title>
      <Card>
        <Row label="Due date" value={s.due_date} />
        <Row label="Status" value={s.status} />
        <Row label="Principal snapshot" value={formatMoney(s.principal_snapshot, sym)} />
        <Row label="Interest due" value={formatMoney(s.interest_due, sym)} />
        <Row label="Interest paid" value={formatMoney(s.interest_paid, sym)} />
        <Row label="Principal paid" value={formatMoney(s.principal_paid, sym)} />
        <Row label="Balance (final month)" value={formatMoney(s.balance, sym)} />
        <Row label="Final installment" value={s.is_final ? 'Yes' : 'No'} />
      </Card>
    </Screen>
  );
}
