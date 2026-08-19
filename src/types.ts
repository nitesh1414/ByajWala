export type Customer = {
  id: number;
  customer_no: string;
  full_name: string;
  mobile: string;
  alt_mobile: string;
  address: string;
  city: string;
  ref_name: string;
  ref_mobile: string;
  id_proof_type: string;
  id_proof_number: string;
  notes: string;
  photo_uri: string | null;
  archived: number;
  created_at: string;
  updated_at: string;
};

export type LoanStatus = 'active' | 'closed' | 'archived';

export type Loan = {
  id: number;
  loan_no: string;
  customer_id: number;
  start_date: string;
  principal: number;
  rate_bps: number;
  duration_months: number;
  closing_date: string;
  interest_due_day: number;
  frequency: string;
  notes: string;
  monthly_interest: number;
  total_expected_interest: number;
  status: LoanStatus;
  locked: number;
  created_at: string;
  updated_at: string;
};

export type ScheduleStatus = 'upcoming' | 'due' | 'paid' | 'partial' | 'overdue';

export type ScheduleRow = {
  id: number;
  loan_id: number;
  month_no: number;
  due_date: string;
  principal_snapshot: number;
  interest_due: number;
  interest_paid: number;
  principal_paid: number;
  balance: number;
  status: ScheduleStatus;
  is_final: number;
};

export type PaymentType =
  | 'interest'
  | 'principal'
  | 'settlement'
  | 'partial'
  | 'advance_interest'
  | 'other';

export type Payment = {
  id: number;
  receipt_no: string;
  loan_id: number;
  customer_id: number;
  payment_date: string;
  amount: number;
  payment_type: PaymentType;
  interest_amount: number;
  principal_amount: number;
  penalty: number;
  discount: number;
  mode: string;
  remarks: string;
  voided: number;
  created_at: string;
};

export type AppSettings = {
  business_name: string;
  address: string;
  mobile: string;
  email: string;
  currency: string;
  default_rate: string;
  default_duration: string;
  receipt_prefix: string;
  reminder_days: string;
  reminders_enabled: string;
  pin_enabled: string;
};
