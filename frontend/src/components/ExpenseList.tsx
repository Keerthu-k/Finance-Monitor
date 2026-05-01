"use client";

import { useMemo, useState, useCallback } from "react";
import { Expense } from "@/types/expense";
import { computeTotal, filterByMonth, getAvailableMonths, parseAmount } from "@/lib/calculations";
import styles from "./ExpenseList.module.css";

const CATEGORIES = [
  "All", "Food", "Transport", "Housing", "Entertainment",
  "Health", "Shopping", "Education", "Other",
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  Food:          { bg: "#fef9c3", text: "#854d0e" },
  Transport:     { bg: "#dbeafe", text: "#1d4ed8" },
  Housing:       { bg: "#dcfce7", text: "#15803d" },
  Entertainment: { bg: "#fce7f3", text: "#be185d" },
  Health:        { bg: "#ffe4e6", text: "#be123c" },
  Shopping:      { bg: "#ede9fe", text: "#6d28d9" },
  Education:     { bg: "#ccfbf1", text: "#0f766e" },
  Other:         { bg: "#f3f4f6", text: "#374151" },
};

interface Props {
  expenses: Expense[];
  loading: boolean;
  onFilterChange: (category: string, sort: string) => void;
  onEdit?: (expense: Expense) => void;
  onDelete?: (id: string) => void;
}

function SkeletonRow() {
  return (
    <tr className={styles.skeletonRow}>
      <td><span className={`${styles.skeleton} ${styles.skW1}`} /></td>
      <td><span className={`${styles.skeleton} ${styles.skW2}`} /></td>
      <td><span className={`${styles.skeleton} ${styles.skW3}`} /></td>
      <td className={styles.right}><span className={`${styles.skeleton} ${styles.skW4}`} /></td>
      <td><span className={`${styles.skeleton} ${styles.skW2}`} /></td>
    </tr>
  );
}

export default function ExpenseList({ expenses, loading, onFilterChange, onEdit, onDelete }: Props) {
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("date_desc");
  const [selectedMonth, setSelectedMonth] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  const availableMonths = useMemo(() => getAvailableMonths(expenses), [expenses]);
  const safeMonth = availableMonths.includes(selectedMonth) ? selectedMonth : "All";
  const filtered = useMemo(() => filterByMonth(expenses, safeMonth), [expenses, safeMonth]);
  const total = useMemo(() => computeTotal(filtered), [filtered]);

  // Sort expenses flat
  const sorted = useMemo(() => {
    const copy = [...filtered];
    if (sort === "date_desc") {
      copy.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else {
      copy.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
    return copy;
  }, [filtered, sort]);

  const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sorted.slice(start, start + ITEMS_PER_PAGE);
  }, [sorted, currentPage]);

  const handleCategory = useCallback(
    (val: string) => {
      setCategory(val);
      setCurrentPage(1);
      onFilterChange(val === "All" ? "" : val, sort);
    },
    [sort, onFilterChange]
  );

  const handleSort = useCallback(
    (val: string) => {
      setSort(val);
      setCurrentPage(1);
      onFilterChange(category === "All" ? "" : category, val);
    },
    [category, onFilterChange]
  );

  const handleDateChange = useCallback((dateStr: string) => {
    if (dateStr) {
      setSelectedMonth(dateStr.slice(0, 7));
      setCurrentPage(1);
    }
  }, []);

  return (
    <div className={styles.container}>
      {/* Controls */}
      <div className={styles.controls}>
        <div className={styles.filterGroup}>
          <label className={styles.controlLabel}>Category</label>
          <div className={styles.selectWrapper}>
            <select className={styles.select} value={category} onChange={(e) => handleCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <span className={styles.chevron}>▾</span>
          </div>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.controlLabel}>Month</label>
          <div className={styles.datePickerWrapper}>
            <input
              type="month"
              className={styles.datePicker}
              value={safeMonth && safeMonth !== "All" ? safeMonth : ""}
              onChange={(e) => handleDateChange(e.target.value + "-01")}
            />
            {safeMonth && safeMonth !== "All" && (
              <button
                className={styles.clearDateBtn}
                onClick={() => { setSelectedMonth("All"); setCurrentPage(1); }}
                title="Show all months"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.controlLabel}>Sort</label>
          <div className={styles.selectWrapper}>
            <select className={styles.select} value={sort} onChange={(e) => handleSort(e.target.value)}>
              <option value="date_desc">Newest first</option>
              <option value="">Oldest first</option>
            </select>
            <span className={styles.chevron}>▾</span>
          </div>
        </div>

        <div className={styles.totalBox}>
          <span className={styles.totalLabel}>
            {loading ? "—" : `${filtered.length} expense${filtered.length !== 1 ? "s" : ""}`}
          </span>
          <span className={styles.totalAmount}>
            {loading ? "…" : `₹${total.toFixed(2)}`}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Description</th>
              <th className={styles.right}>Amount</th>
              <th className={styles.actionsHeader}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className={styles.empty}>
                    <span className={styles.emptyIcon}>🪙</span>
                    <p>No expenses found.</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map((e) => {
                const d = new Date(e.date + "T00:00:00");
                const color = CATEGORY_COLORS[e.category] ?? CATEGORY_COLORS.Other;
                return (
                  <tr key={e.id} className={styles.expenseRow}>
                    {/* Date cell — big day number + month/year below */}
                    <td>
                      <div className={styles.dateCell}>
                        <span className={styles.dateDay}>
                          {String(d.getDate()).padStart(2, "0")}
                        </span>
                        <span className={styles.dateMonYear}>
                          {d.toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={styles.badge} style={{ background: color.bg, color: color.text }}>
                        {e.category}
                      </span>
                    </td>
                    <td className={styles.desc}>{e.description}</td>
                    <td className={`${styles.amount} ${styles.right}`}>
                      ₹{parseAmount(e.amount).toFixed(2)}
                    </td>
                    <td className={styles.actionsCell}>
                      <button
                        className={styles.editBtn}
                        onClick={() => onEdit?.(e)}
                        title="Edit expense"
                      >
                        ✏️
                      </button>
                      <button
                        className={styles.deleteBtn}
                        onClick={() => onDelete?.(e.id)}
                        title="Delete expense"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && sorted.length > 0 && totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.paginationBtn}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            ← Previous
          </button>
          <span className={styles.paginationInfo}>
            Page {currentPage} of {totalPages}
          </span>
          <button
            className={styles.paginationBtn}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
