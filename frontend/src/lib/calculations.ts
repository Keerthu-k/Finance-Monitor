import { Expense } from "@/types/expense";

export interface CategoryRow {
  category: string;
  total: number;
  count: number;
}

export interface CategorySummaryResult {
  rows: CategoryRow[];
  total: number;
}

/**
 * Safely parse amount string to number with 2 decimal precision.
 * This avoids floating point errors (0.1 + 0.2 !== 0.3).
 * Returns 0 if parsing fails or value is invalid.
 */
export function parseAmount(amount: string | number): number {
  try {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    if (isNaN(num) || !isFinite(num) || num < 0) return 0;
    return Math.round(num * 100) / 100; // Round to 2 decimals
  } catch {
    return 0;
  }
}

export function groupByCategory(expenses: Expense[]): CategorySummaryResult {
  const map: Record<string, { total: number; count: number }> = {};
  for (const e of expenses) {
    const amt = parseAmount(e.amount);
    if (!map[e.category]) map[e.category] = { total: 0, count: 0 };
    map[e.category].total += amt;
    map[e.category].count += 1;
  }
  const rows: CategoryRow[] = Object.entries(map)
    .map(([category, { total, count }]) => ({ category, total, count }))
    .sort((a, b) => b.total - a.total);

  const total = rows.reduce((s, r) => s + r.total, 0);
  return { rows, total };
}

export function computeTotal(expenses: Expense[]): number {
  return expenses.reduce((s, e) => s + parseAmount(e.amount), 0);
}

export function filterByMonth(expenses: Expense[], yearMonth: string): Expense[] {
  if (yearMonth === "All" || !yearMonth) return expenses;
  return expenses.filter((e) => isValidDate(e.date) && e.date.startsWith(yearMonth));
}

export function getAvailableMonths(expenses: Expense[]): string[] {
  const seen = new Set<string>();
  expenses.forEach((e) => {
    if (isValidDate(e.date)) {
      seen.add(e.date.slice(0, 7));
    }
  });
  return Array.from(seen).sort().reverse();
}

/**
 * Validate date format YYYY-MM-DD (basic check only)
 */
export function isValidDate(dateStr: string): boolean {
  if (!dateStr) return false;
  const regex = /^\d{4}-\d{2}-\d{2}/; // Format check
  return regex.test(dateStr);
}
