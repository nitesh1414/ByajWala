import { getDb, nextSeq, todayISO, audit } from './database';
import type { Customer, Loan, Payment, PaymentType, ScheduleRow } from '../types';
import { previewLoan, classifyDue } from '../services/calc';
import { monthlyInterest } from '../utils/money';

export async function searchCustomers(q: string): Promise<Customer[]> {
  const db = await getDb();
  const like = `%${q.trim()}%`;
  if (!q.trim()) {
    return db.getAllAsync<Customer>('SELECT * FROM customers WHERE archived=0 ORDER BY updated_at DESC');
  }
  return db.getAllAsync<Customer>(
    `SELECT * FROM customers WHERE archived=0 AND (full_name LIKE ? OR mobile LIKE ? OR customer_no LIKE ? OR city LIKE ?) ORDER BY full_name`,
    like,
    like,
    like,
    like
  );
}

export async function getCustomer(id: number) {
  const db = await getDb();
  return db.getFirstAsync<Customer>('SELECT * FROM customers WHERE id=?', id);
}

export async function saveCustomer(c: Partial<Customer> & { full_name: string; mobile: string }, id?: number) {
  const db = await getDb();
  const now = new Date().toISOString();
  if (id) {
    await db.runAsync(
      `UPDATE customers SET full_name=?, mobile=?, alt_mobile=?, address=?, city=?, ref_name=?, ref_mobile=?,
       id_proof_type=?, id_proof_number=?, notes=?, photo_uri=?, updated_at=? WHERE id=?`,
      c.full_name,
      c.mobile,
      c.alt_mobile ?? '',
      c.address ?? '',
      c.city ?? '',
      c.ref_name ?? '',
      c.ref_mobile ?? '',
      c.id_proof_type ?? '',
      c.id_proof_number ?? '',
      c.notes ?? '',
      c.photo_uri ?? null,
      now,
      id
    );
    await audit('update', 'customer', id);
    return id;
  }
  const no = await nextSeq('customer');
  const r = await db.runAsync(
    `INSERT INTO customers (customer_no, full_name, mobile, alt_mobile, address, city, ref_name, ref_mobile,
      id_proof_type, id_proof_number, notes, photo_uri, archived, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,0,?,?)`,
    no,
    c.full_name,
    c.mobile,
    c.alt_mobile ?? '',
    c.address ?? '',
    c.city ?? '',
    c.ref_name ?? '',
    c.ref_mobile ?? '',
    c.id_proof_type ?? '',
    c.id_proof_number ?? '',
    c.notes ?? '',
    c.photo_uri ?? null,
    now,
    now
  );
  await audit('create', 'customer', r.lastInsertRowId);
  return r.lastInsertRowId;
}

export async function archiveCustomer(id: number) {
  const db = await getDb();
  await db.runAsync('UPDATE customers SET archived=1, updated_at=? WHERE id=?', new Date().toISOString(), id);
  await audit('archive', 'customer', id);
}

export async function createLoan(input: {
  customer_id: number;
  start_date: string;
  principal: number;
  rate_bps: number;
  duration_months: number;
  interest_due_day: number;
  notes?: string;
}) {
  const db = await getDb();
  const prev = previewLoan({
    principal: input.principal,
    rateBps: input.rate_bps,
    durationMonths: input.duration_months,
    startDate: input.start_date,
    dueDay: input.interest_due_day,
  });
  const loanNo = await nextSeq('loan');
  const now = new Date().toISOString();
  await db.execAsync('BEGIN');
  try {
    const r = await db.runAsync(
      `INSERT INTO loans (loan_no, customer_id, start_date, principal, rate_bps, duration_months, closing_date,
        interest_due_day, frequency, notes, monthly_interest, total_expected_interest, status, locked, archived, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?, 'active', 0, 0, ?, ?)`,
      loanNo,
      input.customer_id,
      input.start_date,
      input.principal,
      input.rate_bps,
      input.duration_months,
      prev.closingDate,
      input.interest_due_day,
      'Monthly',
      input.notes ?? '',
      prev.monthlyInterest,
      prev.totalExpectedInterest,
      now,
      now
    );
    const loanId = r.lastInsertRowId;
    for (const s of prev.schedule) {
      await db.runAsync(
        `INSERT INTO loan_schedule (loan_id, month_no, due_date, principal_snapshot, interest_due, interest_paid, principal_paid, balance, status, is_final)
         VALUES (?,?,?,?,?,0,0,?, 'upcoming', ?)`,
        loanId,
        s.month_no,
        s.due_date,
        s.principal_snapshot,
        s.interest_due,
        s.balance,
        s.is_final
      );
    }
    await refreshScheduleStatuses(loanId);
    await audit('create', 'loan', loanId);
    await db.execAsync('COMMIT');
    return loanId;
  } catch (e) {
    await db.execAsync('ROLLBACK');
    throw e;
  }
}

export async function listLoans(filter: string = 'active'): Promise<(Loan & { customer_name: string })[]> {
  const db = await getDb();
  let where = 'l.archived=0';
  if (filter === 'active') where += " AND l.status='active'";
  if (filter === 'closed') where += " AND l.status='closed'";
  return db.getAllAsync(
    `SELECT l.*, c.full_name as customer_name FROM loans l JOIN customers c ON c.id=l.customer_id WHERE ${where} ORDER BY l.updated_at DESC`
  );
}

export async function getLoan(id: number) {
  const db = await getDb();
  return db.getFirstAsync<Loan & { customer_name: string; mobile: string }>(
    `SELECT l.*, c.full_name as customer_name, c.mobile FROM loans l JOIN customers c ON c.id=l.customer_id WHERE l.id=?`,
    id
  );
}

export async function getSchedule(loanId: number): Promise<ScheduleRow[]> {
  const db = await getDb();
  return db.getAllAsync<ScheduleRow>('SELECT * FROM loan_schedule WHERE loan_id=? ORDER BY month_no', loanId);
}

export async function refreshScheduleStatuses(loanId: number) {
  const db = await getDb();
  const today = todayISO();
  const rows = await getSchedule(loanId);
  for (const r of rows) {
    const st = classifyDue(r.due_date, today, r.interest_paid, r.interest_due);
    await db.runAsync('UPDATE loan_schedule SET status=? WHERE id=?', st, r.id);
  }
}

export async function refreshAllSchedules() {
  const db = await getDb();
  const ids = await db.getAllAsync<{ id: number }>("SELECT id FROM loans WHERE status='active'");
  for (const { id } of ids) await refreshScheduleStatuses(id);
}

export async function recordPayment(p: {
  loan_id: number;
  payment_date: string;
  amount: number;
  payment_type: PaymentType;
  interest_amount: number;
  principal_amount: number;
  penalty: number;
  discount: number;
  mode: string;
  remarks: string;
}) {
  const db = await getDb();
  const loan = await getLoan(p.loan_id);
  if (!loan) throw new Error('Loan not found');
  if (loan.status === 'closed' && loan.locked) throw new Error('Loan is closed and locked');
  const receipt = await nextSeq('receipt');
  const now = new Date().toISOString();
  await db.execAsync('BEGIN');
  try {
    const r = await db.runAsync(
      `INSERT INTO payments (receipt_no, loan_id, customer_id, payment_date, amount, payment_type,
        interest_amount, principal_amount, penalty, discount, mode, remarks, voided, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,0,?)`,
      receipt,
      p.loan_id,
      loan.customer_id,
      p.payment_date,
      p.amount,
      p.payment_type,
      p.interest_amount,
      p.principal_amount,
      p.penalty,
      p.discount,
      p.mode,
      p.remarks,
      now
    );
    let remainingInt = p.interest_amount;
    const rows = await getSchedule(p.loan_id);
    for (const s of rows) {
      if (remainingInt <= 0) break;
      const need = Math.max(0, s.interest_due - s.interest_paid);
      if (need <= 0) continue;
      const take = Math.min(need, remainingInt);
      await db.runAsync('UPDATE loan_schedule SET interest_paid=interest_paid+? WHERE id=?', take, s.id);
      await db.runAsync(
        'INSERT INTO payment_allocations (payment_id, schedule_id, interest, principal) VALUES (?,?,?,0)',
        r.lastInsertRowId,
        s.id,
        take
      );
      remainingInt -= take;
    }
    if (p.principal_amount > 0) {
      const last = rows[rows.length - 1];
      if (last) {
        await db.runAsync(
          'UPDATE loan_schedule SET principal_paid=principal_paid+? WHERE id=?',
          p.principal_amount,
          last.id
        );
      }
    }
    await refreshScheduleStatuses(p.loan_id);
    await db.runAsync('UPDATE loans SET updated_at=? WHERE id=?', now, p.loan_id);
    await db.runAsync(
      'INSERT INTO receipts (payment_id, payload, created_at) VALUES (?,?,?)',
      r.lastInsertRowId,
      JSON.stringify({ receipt, ...p, customer: loan.customer_name, loan_no: loan.loan_no }),
      now
    );
    await audit('payment', 'payment', r.lastInsertRowId, receipt);
    await db.execAsync('COMMIT');
    return { id: r.lastInsertRowId, receipt_no: receipt };
  } catch (e) {
    await db.execAsync('ROLLBACK');
    throw e;
  }
}

export async function loanBalances(loanId: number) {
  const loan = await getLoan(loanId);
  if (!loan) throw new Error('missing');
  const db = await getDb();
  const pay = await db.getFirstAsync<{ pi: number; pp: number }>(
    `SELECT COALESCE(SUM(interest_amount),0) as pi, COALESCE(SUM(principal_amount),0) as pp
     FROM payments WHERE loan_id=? AND voided=0`,
    loanId
  );
  const principalPaid = pay?.pp ?? 0;
  const interestPaid = pay?.pi ?? 0;
  const principalOut = Math.max(0, loan.principal - principalPaid);
  const expected = monthlyInterest(principalOut || loan.principal, loan.rate_bps) * loan.duration_months;
  const interestOut = Math.max(0, expected - interestPaid);
  return { loan, principalPaid, interestPaid, principalOut, interestOut, expected };
}

export async function settleLoan(loanId: number, payment: Omit<Parameters<typeof recordPayment>[0], 'loan_id' | 'payment_type'>) {
  await recordPayment({ ...payment, loan_id: loanId, payment_type: 'settlement' });
  const db = await getDb();
  await db.runAsync(
    "UPDATE loans SET status='closed', locked=1, updated_at=? WHERE id=?",
    new Date().toISOString(),
    loanId
  );
  await audit('settle', 'loan', loanId);
}

export async function unlockLoan(loanId: number) {
  const db = await getDb();
  await db.runAsync("UPDATE loans SET locked=0, updated_at=? WHERE id=?", new Date().toISOString(), loanId);
  await audit('unlock', 'loan', loanId);
}

export async function paymentsForLoan(loanId: number) {
  const db = await getDb();
  return db.getAllAsync<Payment>('SELECT * FROM payments WHERE loan_id=? AND voided=0 ORDER BY payment_date DESC, id DESC', loanId);
}

export async function paymentsForCustomer(customerId: number) {
  const db = await getDb();
  return db.getAllAsync<Payment & { loan_no: string }>(
    `SELECT p.*, l.loan_no FROM payments p JOIN loans l ON l.id=p.loan_id WHERE p.customer_id=? AND p.voided=0 ORDER BY p.payment_date DESC`,
    customerId
  );
}

export async function loansForCustomer(customerId: number) {
  const db = await getDb();
  return db.getAllAsync<Loan>('SELECT * FROM loans WHERE customer_id=? AND archived=0 ORDER BY created_at DESC', customerId);
}

export async function dashboard() {
  const db = await getDb();
  await refreshAllSchedules();
  const today = todayISO();
  const week = todayISO(new Date(Date.now() + 7 * 86400000));
  const monthPrefix = today.slice(0, 7);
  const active = await db.getFirstAsync<{ n: number }>("SELECT COUNT(*) as n FROM loans WHERE status='active'");
  const loans = await db.getAllAsync<Loan>("SELECT * FROM loans WHERE status='active'");
  let principalOut = 0;
  let interestExp = 0;
  for (const l of loans) {
    const b = await loanBalances(l.id);
    principalOut += b.principalOut;
    interestExp += b.interestOut;
  }
  const collected = await db.getFirstAsync<{ s: number }>(
    `SELECT COALESCE(SUM(interest_amount),0) as s FROM payments WHERE voided=0 AND payment_date LIKE ?`,
    `${monthPrefix}%`
  );
  const dueToday = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) as n FROM loan_schedule s JOIN loans l ON l.id=s.loan_id WHERE l.status='active' AND s.due_date=? AND s.status IN ('due','partial','overdue')`,
    today
  );
  const dueWeek = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) as n FROM loan_schedule s JOIN loans l ON l.id=s.loan_id WHERE l.status='active' AND s.due_date>? AND s.due_date<=? AND s.status IN ('upcoming','due','partial')`,
    today,
    week
  );
  const overdue = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) as n FROM loan_schedule s JOIN loans l ON l.id=s.loan_id WHERE l.status='active' AND s.status='overdue'`
  );
  const recentLoans = await db.getAllAsync(
    `SELECT l.*, c.full_name as customer_name FROM loans l JOIN customers c ON c.id=l.customer_id ORDER BY l.created_at DESC LIMIT 5`
  );
  const recentPays = await db.getAllAsync(
    `SELECT p.*, c.full_name as customer_name, l.loan_no FROM payments p
     JOIN customers c ON c.id=p.customer_id JOIN loans l ON l.id=p.loan_id
     WHERE p.voided=0 ORDER BY p.created_at DESC LIMIT 5`
  );
  return {
    active: active?.n ?? 0,
    principalOut,
    interestExp,
    collectedMonth: collected?.s ?? 0,
    dueToday: dueToday?.n ?? 0,
    dueWeek: dueWeek?.n ?? 0,
    overdue: overdue?.n ?? 0,
    recentLoans,
    recentPays,
  };
}

export async function overdueRows(filter: 'all' | 'today' | 'week' | 'month' | 'overdue' | 'high' = 'overdue') {
  const db = await getDb();
  await refreshAllSchedules();
  const today = todayISO();
  const rows = await db.getAllAsync<any>(
    `SELECT s.*, l.loan_no, l.principal, c.full_name as customer_name
     FROM loan_schedule s
     JOIN loans l ON l.id=s.loan_id
     JOIN customers c ON c.id=l.customer_id
     WHERE l.status='active'`
  );
  const mapped = rows.map((r) => {
    const remaining = Math.max(0, r.interest_due - r.interest_paid);
    const days = Math.floor((new Date(today).getTime() - new Date(r.due_date).getTime()) / 86400000);
    return { ...r, remaining, days_overdue: days };
  });
  if (filter === 'today') return mapped.filter((r) => r.due_date === today);
  if (filter === 'week') {
    const w = todayISO(new Date(Date.now() + 7 * 86400000));
    return mapped.filter((r) => r.due_date >= today && r.due_date <= w);
  }
  if (filter === 'month') return mapped.filter((r) => r.due_date.startsWith(today.slice(0, 7)));
  if (filter === 'high') return mapped.filter((r) => r.remaining > 0).sort((a, b) => b.remaining - a.remaining);
  if (filter === 'overdue') return mapped.filter((r) => r.status === 'overdue');
  return mapped;
}

export async function getSettings(): Promise<Record<string, string>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT * FROM settings');
  const o: Record<string, string> = {};
  rows.forEach((r) => (o[r.key] = r.value));
  return o;
}

export async function setSetting(key: string, value: string) {
  const db = await getDb();
  await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?,?)', key, value);
}

export async function globalSearch(q: string) {
  const db = await getDb();
  const like = `%${q}%`;
  const customers = await db.getAllAsync<Customer>(
    'SELECT * FROM customers WHERE archived=0 AND (full_name LIKE ? OR mobile LIKE ? OR customer_no LIKE ?) LIMIT 20',
    like,
    like,
    like
  );
  const loans = await db.getAllAsync(
    `SELECT l.*, c.full_name as customer_name FROM loans l JOIN customers c ON c.id=l.customer_id
     WHERE l.loan_no LIKE ? OR c.full_name LIKE ? LIMIT 20`,
    like,
    like
  );
  return { customers, loans };
}

export async function collectionReport(from: string, to: string) {
  const db = await getDb();
  return db.getAllAsync<any>(
    `SELECT p.*, c.full_name, l.loan_no FROM payments p
     JOIN customers c ON c.id=p.customer_id JOIN loans l ON l.id=p.loan_id
     WHERE p.voided=0 AND p.payment_date>=? AND p.payment_date<=? ORDER BY p.payment_date`,
    from,
    to
  );
}

export async function getPayment(id: number) {
  const db = await getDb();
  return db.getFirstAsync<Payment & { full_name: string; loan_no: string }>(
    `SELECT p.*, c.full_name, l.loan_no FROM payments p
     JOIN customers c ON c.id=p.customer_id JOIN loans l ON l.id=p.loan_id WHERE p.id=?`,
    id
  );
}
