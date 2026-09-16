import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Screen, Title, Card, Row, Btn } from '../components/ui';
import { getPayment, loanBalances } from '../db/repos';
import { formatMoney } from '../utils/money';
import { receiptHtml, shareHtmlPdf } from '../services/pdf';
import { useApp } from '../context/AppContext';

export default function ReceiptScreen() {
  const id = useRoute<any>().params.id as number;
  const { settings } = useApp();
  const [p, setP] = useState<any>(null);
  const [bal, setBal] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const pay = await getPayment(id);
      setP(pay);
      if (pay) setBal(await loanBalances(pay.loan_id));
    })();
  }, [id]);

  if (!p) return null;
  const sym = settings.currency || '₹';

  const share = async () => {
    try {
      await shareHtmlPdf(
        receiptHtml({
          business: settings.business_name || 'ByajWala',
          receipt_no: p.receipt_no,
          customer: p.full_name,
          loan_no: p.loan_no,
          date: p.payment_date,
          amount: formatMoney(p.amount, sym),
          interest: formatMoney(p.interest_amount, sym),
          principal: formatMoney(p.principal_amount, sym),
          remainP: formatMoney(bal?.principalOut ?? 0, sym),
          remainI: formatMoney(bal?.interestOut ?? 0, sym),
          mode: p.mode,
          remarks: p.remarks || '—',
        }),
        `${p.receipt_no}.pdf`
      );
    } catch {
      Alert.alert('Share failed', 'Could not generate PDF on this device.');
    }
  };

  return (
    <Screen>
      <Title>Receipt {p.receipt_no}</Title>
      <Card>
        <Row label="Business" value={settings.business_name || 'ByajWala'} />
        <Row label="Customer" value={p.full_name} />
        <Row label="Loan" value={p.loan_no} />
        <Row label="Date" value={p.payment_date} />
        <Row label="Amount" value={formatMoney(p.amount, sym)} bold />
        <Row label="Interest paid" value={formatMoney(p.interest_amount, sym)} />
        <Row label="Principal paid" value={formatMoney(p.principal_amount, sym)} />
        <Row label="Remaining principal" value={formatMoney(bal?.principalOut ?? 0, sym)} />
        <Row label="Remaining interest" value={formatMoney(bal?.interestOut ?? 0, sym)} />
        <Row label="Mode" value={p.mode} />
        <Row label="Remarks" value={p.remarks || '—'} />
      </Card>
      <Btn label="Preview / share PDF" onPress={share} />
    </Screen>
  );
}
