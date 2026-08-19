import { monthlyInterest, type Paise } from '../utils/money';
import { addMonths } from '../db/database';

export type LoanPreview = {
  monthlyInterest: Paise;
  totalExpectedInterest: Paise;
  finalSettlement: Paise;
  closingDate: string;
  schedule: {
    month_no: number;
    due_date: string;
    principal_snapshot: Paise;
    interest_due: Paise;
    is_final: number;
    balance: Paise;
  }[];
};

export function previewLoan(input: {
  principal: Paise;
  rateBps: number;
  durationMonths: number;
  startDate: string;
  dueDay: number;
}): LoanPreview {
  const mi = monthlyInterest(input.principal, input.rateBps);
  const months = Math.max(1, input.durationMonths);
  const schedule = [];
  for (let i = 1; i <= months; i++) {
    const due = addMonths(input.startDate, i);
    const isFinal = i === months ? 1 : 0;
    schedule.push({
      month_no: i,
      due_date: due,
      principal_snapshot: input.principal,
      interest_due: mi,
      is_final: isFinal,
      balance: input.principal + (isFinal ? mi : 0),
    });
  }
  const totalExpectedInterest = mi * months;
  return {
    monthlyInterest: mi,
    totalExpectedInterest,
    finalSettlement: input.principal + mi,
    closingDate: addMonths(input.startDate, months),
    schedule,
  };
}

export function classifyDue(due: string, today: string, paid: Paise, dueAmt: Paise): 'upcoming' | 'due' | 'paid' | 'partial' | 'overdue' {
  if (dueAmt <= 0 || paid >= dueAmt) return 'paid';
  if (paid > 0 && paid < dueAmt) {
    if (due < today) return 'overdue';
    return 'partial';
  }
  if (due === today) return 'due';
  if (due < today) return 'overdue';
  return 'upcoming';
}
