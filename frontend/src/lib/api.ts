import { CreateExpensePayload, Expense } from "@/types/expense";

const BASE = "/api";

export async function fetchExpenses(params: {
  category?: string;
  sort?: string;
}): Promise<Expense[]> {
  const query = new URLSearchParams();
  if (params.category) query.set("category", params.category);
  if (params.sort) query.set("sort", params.sort);

  const res = await fetch(`${BASE}/expenses?${query.toString()}`, {
    cache: "no-store",
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Failed to fetch expenses: ${res.status}`);
  return res.json();
}

export async function createExpense(payload: CreateExpensePayload): Promise<Expense> {
  const res = await fetch(`${BASE}/expenses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function updateExpense(
  id: string,
  payload: { amount: string; category: string; description: string; date: string }
): Promise<Expense> {
  const res = await fetch(`${BASE}/expenses/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Update failed: ${res.status}`);
  }
  return res.json();
}

export async function deleteExpense(id: string): Promise<void> {
  const res = await fetch(`${BASE}/expenses/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Delete failed: ${res.status}`);
  }
}
