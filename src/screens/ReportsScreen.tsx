import React, { useState } from 'react';
import { Alert, Share, View } from 'react-native';
import { Screen, Title, Chip, Card, Row, Btn, Field } from '../components/ui';
import { collectionReport, listLoans, overdueRows } from '../db/repos';
import { formatMoney } from '../utils/money';
import { todayISO } from '../db/database';
import { shareHtmlPdf, statementHtml, toCsv as csvFn } from '../services/pdf';
import { useApp } from '../context/AppContext';

const KINDS = [
  'daily',
  'monthly',
  'interest',
  'principal',
  'out_principal',
  'out_interest',
  'overdue',
  'active',
  'closed',
] as const;

export default function ReportsScreen() {
  const { settings } = useApp();
  const [kind, setKind] = useState<(typeof KINDS)[number]>('daily');
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());
  const [summary, setSummary] = useState({ n: 0, amt: 0, int: 0, prin: 0, extra: '' });
  const [rows, setRows] = useState<any[]>([]);
  const sym = settings.currency || '₹';

  const run = async () => {
    if (kind === 'daily' || kind === 'monthly' || kind === 'interest' || kind === 'principal') {
      const start = kind === 'monthly' ? from.slice(0, 7) + '-01' : from;
      const pays = await collectionReport(start, to);
      const int = pays.reduce((s, p) => s + p.interest_amount, 0);
      const prin = pays.reduce((s, p) => s + p.principal_amount, 0);
      setRows(pays);
      setSummary({ n: pays.length, amt: int + prin, int, prin, extra: '' });
    } else if (kind === 'overdue') {
      const o = await overdueRows('overdue');
      setRows(o);
      setSummary({ n: o.length, amt: o.reduce((s, r) => s + r.remaining, 0), int: 0, prin: 0, extra: '' });
    } else if (kind === 'active' || kind === 'closed') {
      const ls = await listLoans(kind);
      setRows(ls);
      setSummary({ n: ls.length, amt: ls.reduce((s, l) => s + l.principal, 0), int: 0, prin: 0, extra: '' });
    } else {
      const ls = await listLoans('active');
      setRows(ls);
      setSummary({ n: ls.length, amt: ls.reduce((s, l) => s + l.principal, 0), int: 0, prin: 0, extra: kind });
    }
  };

  const exportCsv = async () => {
    const headers = ['id', 'info', 'amount'];
    const data = rows.map((r) => [r.id, r.loan_no || r.full_name || r.customer_name || '', r.amount || r.principal || r.remaining || 0]);
    const csv = csvFn(headers, data);
    try {
      await Share.share({ message: csv, title: 'ByajWala report.csv' });
    } catch {
      Alert.alert('CSV', 'Could not share file.');
    }
  };

  const exportPdf = async () => {
    const body = `<p>${kind} · ${from} to ${to}</p><p>Count ${summary.n} · Amount ${formatMoney(summary.amt, sym)}</p>
      <ul>${rows
        .slice(0, 80)
        .map((r) => `<li>${r.loan_no || ''} ${r.full_name || r.customer_name || ''} ${r.payment_date || ''}</li>`)
        .join('')}</ul>`;
    await shareHtmlPdf(statementHtml('ByajWala report', body));
  };

  return (
    <Screen>
      <Title>Reports</Title>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {KINDS.map((k) => (
          <Chip key={k} label={k.replace('_', ' ')} active={kind === k} onPress={() => setKind(k)} />
        ))}
      </View>
      <Field label="From" value={from} onChangeText={setFrom} />
      <Field label="To" value={to} onChangeText={setTo} />
      <Btn label="Run report" onPress={run} />
      <Card>
        <Row label="Rows" value={String(summary.n)} />
        <Row label="Total" value={formatMoney(summary.amt, sym)} bold />
        <Row label="Interest" value={formatMoney(summary.int, sym)} />
        <Row label="Principal" value={formatMoney(summary.prin, sym)} />
      </Card>
      <Btn label="Share CSV" variant="ghost" onPress={exportCsv} />
      <Btn label="Share PDF" variant="ghost" onPress={exportPdf} />
    </Screen>
  );
}
