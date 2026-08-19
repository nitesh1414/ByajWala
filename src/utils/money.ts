/** Integer paise — never use floats for money. */
export type Paise = number;

export function toPaise(rupees: string | number): Paise {
  const n = typeof rupees === 'number' ? rupees : Number(String(rupees).replace(/,/g, ''));
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function fromPaise(p: Paise): number {
  return (p || 0) / 100;
}

export function formatMoney(p: Paise, symbol = '₹'): string {
  const neg = p < 0;
  const abs = Math.abs(p || 0);
  const whole = Math.floor(abs / 100);
  const frac = abs % 100;
  const withCommas = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${neg ? '-' : ''}${symbol}${withCommas}.${frac.toString().padStart(2, '0')}`;
}

export function monthlyInterest(principal: Paise, rateBps: number): Paise {
  // rate as percent * 100 (e.g. 2.00% => 200). Interest = P * rate / 100
  // paise * (ratePercent) / 100
  const ratePercentTimes100 = rateBps; // 200 = 2.00%
  return Math.round((principal * ratePercentTimes100) / 10000);
}

export function parseRateToBps(rate: string | number): number {
  const n = typeof rate === 'number' ? rate : Number(rate);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function formatRate(bps: number): string {
  return (bps / 100).toFixed(2);
}
