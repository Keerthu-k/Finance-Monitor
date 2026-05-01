export interface Expense {
  id: string;
  amount: string;
  category: string;
  description: string;
  date: string;
  created_at: string;
}

export interface CreateExpensePayload {
  amount: string;
  category: string;
  description: string;
  date: string;
  idempotency_key: string;
}
