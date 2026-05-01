"use client";

import { useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { createExpense } from "@/lib/api";
import { Expense } from "@/types/expense";
import styles from "./ExpenseForm.module.css";

const CATEGORIES = [
  "Food", "Transport", "Housing", "Entertainment",
  "Health", "Shopping", "Education", "Other",
];

const CATEGORY_ICONS: Record<string, string> = {
  Food: "🍽️", Transport: "🚌", Housing: "🏠", Entertainment: "🎬",
  Health: "💊", Shopping: "🛍️", Education: "📚", Other: "📌",
};

interface FieldErrors {
  amount?: string;
  description?: string;
  date?: string;
}

interface Props {
  onCreated: (expense: Expense) => void;
}

function validate(form: { amount: string; description: string; date: string }): FieldErrors {
  const errors: FieldErrors = {};
  const amount = parseFloat(form.amount);
  if (!form.amount || isNaN(amount)) {
    errors.amount = "Amount is required.";
  } else if (amount <= 0) {
    errors.amount = "Amount must be greater than ₹0.";
  } else if (!/^\d+(\.\d{1,2})?$/.test(form.amount)) {
    errors.amount = "Use up to 2 decimal places.";
  }
  if (!form.description.trim()) {
    errors.description = "Description is required.";
  } else if (form.description.trim().length < 2) {
    errors.description = "Description is too short.";
  }
  if (!form.date) {
    errors.date = "Date is required.";
  }
  return errors;
}

export default function ExpenseForm({ onCreated }: Props) {
  const idempotencyKey = useRef(uuidv4());

  const [form, setForm] = useState({
    amount: "",
    category: CATEGORIES[0],
    description: "",
    date: new Date().toISOString().slice(0, 10),
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    const updated = { ...form, [name]: value };
    setForm(updated);
    setApiError(null);
    setSuccess(false);
    // Revalidate the changed field if already touched
    if (touched[name]) {
      const errs = validate(updated);
      setFieldErrors((prev) => ({ ...prev, [name]: errs[name as keyof FieldErrors] }));
    }
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const errs = validate(form);
    setFieldErrors((prev) => ({ ...prev, [name]: errs[name as keyof FieldErrors] }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    // Mark all fields touched and run full validation
    setTouched({ amount: true, description: true, date: true });
    const errs = validate(form);
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    setApiError(null);

    try {
      const expense = await createExpense({
        ...form,
        idempotency_key: idempotencyKey.current,
      });
      onCreated(expense);
      idempotencyKey.current = uuidv4();
      setForm({
        amount: "",
        category: CATEGORIES[0],
        description: "",
        date: new Date().toISOString().slice(0, 10),
      });
      setFieldErrors({});
      setTouched({});
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const selectedIcon = CATEGORY_ICONS[form.category] ?? "📌";

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.formHeader}>
        <div className={styles.formIcon}>＋</div>
        <h2 className={styles.title}>Add Expense</h2>
      </div>

      {apiError && (
        <div className={styles.alert + " " + styles.alertError}>
          <span>⚠️</span> {apiError}
        </div>
      )}
      {success && (
        <div className={styles.alert + " " + styles.alertSuccess}>
          <span>✓</span> Expense added successfully!
        </div>
      )}

      {/* Amount */}
      <div className={styles.field}>
        <label className={styles.label}>Amount</label>
        <div className={styles.inputWrapper}>
          <span className={styles.prefix}>₹</span>
          <input
            className={`${styles.input} ${styles.inputPrefixed} ${fieldErrors.amount && touched.amount ? styles.inputError : ""}`}
            type="number"
            name="amount"
            value={form.amount}
            onChange={handleChange}
            onBlur={handleBlur}
            min="0.01"
            step="0.01"
            placeholder="0.00"
          />
        </div>
        {touched.amount && fieldErrors.amount && (
          <span className={styles.fieldError}>{fieldErrors.amount}</span>
        )}
      </div>

      {/* Category */}
      <div className={styles.field}>
        <label className={styles.label}>Category</label>
        <div className={styles.inputWrapper}>
          <span className={styles.prefix}>{selectedIcon}</span>
          <select
            className={styles.input + " " + styles.inputPrefixed}
            name="category"
            value={form.category}
            onChange={handleChange}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{CATEGORY_ICONS[c]} {c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Description */}
      <div className={styles.field}>
        <label className={styles.label}>Description</label>
        <input
          className={`${styles.input} ${fieldErrors.description && touched.description ? styles.inputError : ""}`}
          type="text"
          name="description"
          value={form.description}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="What was this for?"
          maxLength={120}
        />
        {touched.description && fieldErrors.description && (
          <span className={styles.fieldError}>{fieldErrors.description}</span>
        )}
      </div>

      {/* Date */}
      <div className={styles.field}>
        <label className={styles.label}>Date</label>
        <div className={styles.dateWrapper}>
          <span className={styles.calIcon}>📅</span>
          <input
            className={`${styles.input} ${styles.dateInput} ${fieldErrors.date && touched.date ? styles.inputError : ""}`}
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
            onBlur={handleBlur}
          />
        </div>
        {touched.date && fieldErrors.date && (
          <span className={styles.fieldError}>{fieldErrors.date}</span>
        )}
      </div>

      <button className={styles.button} type="submit" disabled={submitting}>
        {submitting ? "Saving…" : "Add Expense"}
      </button>
    </form>
  );
}
