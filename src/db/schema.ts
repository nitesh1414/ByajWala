export const MIGRATIONS = [
  `
  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_no TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    alt_mobile TEXT DEFAULT '',
    address TEXT DEFAULT '',
    city TEXT DEFAULT '',
    ref_name TEXT DEFAULT '',
    ref_mobile TEXT DEFAULT '',
    id_proof_type TEXT DEFAULT '',
    id_proof_number TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    photo_uri TEXT,
    archived INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    loan_no TEXT NOT NULL UNIQUE,
    customer_id INTEGER NOT NULL,
    start_date TEXT NOT NULL,
    principal INTEGER NOT NULL,
    rate_bps INTEGER NOT NULL,
    duration_months INTEGER NOT NULL,
    closing_date TEXT NOT NULL,
    interest_due_day INTEGER NOT NULL,
    frequency TEXT DEFAULT 'Monthly',
    notes TEXT DEFAULT '',
    monthly_interest INTEGER NOT NULL,
    total_expected_interest INTEGER NOT NULL,
    status TEXT DEFAULT 'active',
    locked INTEGER DEFAULT 0,
    archived INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  );
  CREATE TABLE IF NOT EXISTS loan_schedule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    loan_id INTEGER NOT NULL,
    month_no INTEGER NOT NULL,
    due_date TEXT NOT NULL,
    principal_snapshot INTEGER NOT NULL,
    interest_due INTEGER NOT NULL,
    interest_paid INTEGER DEFAULT 0,
    principal_paid INTEGER DEFAULT 0,
    balance INTEGER NOT NULL,
    status TEXT DEFAULT 'upcoming',
    is_final INTEGER DEFAULT 0,
    FOREIGN KEY (loan_id) REFERENCES loans(id)
  );
  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    receipt_no TEXT NOT NULL UNIQUE,
    loan_id INTEGER NOT NULL,
    customer_id INTEGER NOT NULL,
    payment_date TEXT NOT NULL,
    amount INTEGER NOT NULL,
    payment_type TEXT NOT NULL,
    interest_amount INTEGER DEFAULT 0,
    principal_amount INTEGER DEFAULT 0,
    penalty INTEGER DEFAULT 0,
    discount INTEGER DEFAULT 0,
    mode TEXT DEFAULT 'Cash',
    remarks TEXT DEFAULT '',
    voided INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (loan_id) REFERENCES loans(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  );
  CREATE TABLE IF NOT EXISTS payment_allocations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payment_id INTEGER NOT NULL,
    schedule_id INTEGER,
    interest INTEGER DEFAULT 0,
    principal INTEGER DEFAULT 0,
    FOREIGN KEY (payment_id) REFERENCES payments(id)
  );
  CREATE TABLE IF NOT EXISTS receipts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payment_id INTEGER NOT NULL,
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS notifications_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    scheduled_for TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id INTEGER,
    details TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_loans_customer ON loans(customer_id);
  CREATE INDEX IF NOT EXISTS idx_sched_loan ON loan_schedule(loan_id);
  CREATE INDEX IF NOT EXISTS idx_pay_loan ON payments(loan_id);
  `,
];
