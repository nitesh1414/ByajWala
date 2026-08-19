import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Screen, Title, Card, Row, Btn, Muted } from '../components/ui';
import { getCustomer, getSchedule, loanBalances, loansForCustomer, paymentsForCustomer } from '../db/repos';
import { formatMoney } from '../utils/money';
import { shareHtmlPdf, statementHtml, escapeHtml } from '../services/pdf';
import { useApp } from '../context/AppContext';

export default function StatementScreen() {
  const customerId = useRoute<any>().params.customerId as number;
  const { settings } = useApp();
  const [htmlBits, setHtmlBits] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    (async () => {
      const c = await getCustomer(customerId);
      if (!c) return;
      setName(c.full_name);
      const loans = await loansForCustomer(customerId);
      const pays = await paymentsForCustomer(customerId);
      const sym = settings.currency || '₹';
      let body = `<h3>${escapeHtml(c.full_name)}</h3><p>${escapeHtml(c.customer_no)} · ${escapeHtml(c.mobile)}<br/>${escapeHtml(c.address)}</p>`;
      for (const l of loans) {
        const b = await loanBalances(l.id);
        const sch = await getSchedule(l.id);
        body += `<h4>${escapeHtml(l.loan_no)} (${l.status})</h4>
          <p>Principal ${formatMoney(l.principal, sym)} · Rate ${(l.rate_bps / 100).toFixed(2)}% · Start ${l.start_date}</p>
          <p>Interest collected ${formatMoney(b.interestPaid, sym)} · Principal collected ${formatMoney(b.principalPaid, sym)} · Outstanding ${formatMoney(b.principalOut + b.interestOut, sym)}</p>
          <table style="width:100%;font-size:12px">${sch
            .map(
              (s) =>
                `<tr><td>${s.month_no}</td><td>${s.due_date}</td><td>${s.status}</td><td>${formatMoney(s.interest_due, sym)}</td></tr>`
            )
            .join('')}</table>`;
      }
      body += `<h4>Payments</h4><ul>${pays
        .map((p) => `<li>${p.payment_date} ${p.receipt_no} ${formatMoney(p.amount, sym)} ${p.payment_type}</li>`)
        .join('')}</ul>`;
      setHtmlBits(body);
    })();
  }, [customerId, settings.currency]);

  return (
    <Screen>
      <Title>Statement</Title>
      <Muted>{name}</Muted>
      <Card>
        <Row label="Includes" value="Loans, schedule, payments, outstanding" />
      </Card>
      <Btn
        label="Generate PDF & share"
        onPress={async () => {
          try {
            await shareHtmlPdf(statementHtml(`Statement — ${name}`, htmlBits), `statement-${name}.pdf`);
          } catch {
            Alert.alert('Error', 'PDF failed');
          }
        }}
      />
    </Screen>
  );
}
