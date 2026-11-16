export const parseMoneyToCents = (raw: string | number): number => {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.round(raw * 100);
  }
  const cleaned = String(raw).trim().replace(/[^\d.,-]/g, '').replace(/,/g, '.');
  const num = Number(cleaned);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 100);
};

export const centsToNumber = (cents: number): number => (cents ?? 0) / 100;
