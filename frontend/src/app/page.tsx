"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchExpenses, updateExpense, deleteExpense } from "@/lib/api";
import { Expense } from "@/types/expense";
import { parseAmount } from "@/lib/calculations";
import ExpenseForm from "@/components/ExpenseForm";
import ExpenseList from "@/components/ExpenseList";
import CategorySummary from "@/components/CategorySummary";
import styles from "./page.module.css";

const CATEGORIES = [
  "Food", "Transport", "Housing", "Entertainment",
  "Health", "Shopping", "Education", "Other",
];

export default function HomePage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [filters, setFilters] = useState({ category: "", sort: "date_desc" });

  // Edit modal state
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editForm, setEditForm] = useState({ amount: "", category: CATEGORIES[0], description: "", date: "" });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const loadExpenses = useCallback(async (category: string, sort: string) => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await fetchExpenses({ category, sort });
      setExpenses(data);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to load expenses");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExpenses(filters.category, filters.sort);
  }, [filters, loadExpenses]);

  function handleFilterChange(category: string, sort: string) {
    setFilters({ category, sort });
  }

  function handleCreated(expense: Expense) {
    setExpenses((prev) => {
      const withoutDupe = prev.filter((e) => e.id !== expense.id);
      return [expense, ...withoutDupe];
    });
    loadExpenses(filters.category, filters.sort);
  }

  // --- Edit ---
  function openEdit(expense: Expense) {
    setEditingExpense(expense);
    setEditForm({
      amount: parseAmount(expense.amount).toString(),
      category: expense.category,
      description: expense.description,
      date: expense.date.slice(0, 10),
    });
    setEditError(null);
  }

  async function handleEditSave() {
    if (!editingExpense) return;
    setEditSubmitting(true);
    setEditError(null);
    try {
      const updated = await updateExpense(editingExpense.id, editForm);
      setExpenses((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      setEditingExpense(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setEditSubmitting(false);
    }
  }

  // --- Delete ---
  async function handleDelete(id: string) {
    if (!confirm("Delete this expense? This cannot be undone.")) return;
    try {
      await deleteExpense(id);
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  }

  // Stats
  const totalAll = useMemo(
    () => expenses.reduce((s, e) => s + parseAmount(e.amount), 0),
    [expenses]
  );
  const thisMonth = useMemo(() => {
    const ym = new Date().toISOString().slice(0, 7);
    return expenses
      .filter((e) => e.date.startsWith(ym))
      .reduce((s, e) => s + parseAmount(e.amount), 0);
  }, [expenses]);

  const topCategory = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e) => {
      map[e.category] = (map[e.category] ?? 0) + parseAmount(e.amount);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  }, [expenses]);

  return (
    <main className={styles.main}>
      {/* Header */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.heading}>💰 Expense Tracker</h1>
          <p className={styles.sub}>Track where your money goes</p>
        </div>
      </header>

      {/* Stats strip */}
      <div className={styles.stats}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total Recorded</span>
          <span className={styles.statValue}>₹{totalAll.toFixed(2)}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>This Month</span>
          <span className={styles.statValue}>₹{thisMonth.toFixed(2)}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Top Category</span>
          <span className={styles.statValue}>{topCategory}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Entries</span>
          <span className={styles.statValue}>{expenses.length}</span>
        </div>
      </div>

      {fetchError && <p className={styles.fetchError}>{fetchError}</p>}

      {/* Layout */}
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <ExpenseForm onCreated={handleCreated} />
        </aside>
        <section className={styles.content}>
          <ExpenseList
            expenses={expenses}
            loading={loading}
            onFilterChange={handleFilterChange}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
          <CategorySummary expenses={expenses} />
        </section>
      </div>

      {/* Edit Modal */}
      {editingExpense && (
        <div className={styles.modalOverlay} onClick={() => setEditingExpense(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>✏️ Edit Expense</h2>
              <button className={styles.modalClose} onClick={() => setEditingExpense(null)}>✕</button>
            </div>

            {editError && <p className={styles.modalError}>⚠️ {editError}</p>}

            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Amount (₹)</label>
              <input
                className={styles.modalInput}
                type="number"
                min="0.01"
                step="0.01"
                value={editForm.amount}
                onChange={(e) => setEditForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>

            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Category</label>
              <select
                className={styles.modalInput}
                value={editForm.category}
                onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Description</label>
              <input
                className={styles.modalInput}
                type="text"
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                maxLength={120}
              />
            </div>

            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Date</label>
              <input
                className={styles.modalInput}
                type="date"
                value={editForm.date}
                onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>

            <div className={styles.modalActions}>
              <button className={styles.modalCancel} onClick={() => setEditingExpense(null)}>
                Cancel
              </button>
              <button className={styles.modalSave} onClick={handleEditSave} disabled={editSubmitting}>
                {editSubmitting ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
