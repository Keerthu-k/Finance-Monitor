"use client";

import { useMemo } from "react";
import { Expense } from "@/types/expense";
import { groupByCategory } from "@/lib/calculations";
import styles from "./CategorySummary.module.css";

const CATEGORY_COLORS: Record<string, string> = {
  Food: "#854d0e",
  Transport: "#1d4ed8",
  Housing: "#15803d",
  Entertainment: "#be185d",
  Health: "#be123c",
  Shopping: "#6d28d9",
  Education: "#0f766e",
  Other: "#374151",
};

const CATEGORY_BG: Record<string, string> = {
  Food: "#fef9c3",
  Transport: "#dbeafe",
  Housing: "#dcfce7",
  Entertainment: "#fce7f3",
  Health: "#ffe4e6",
  Shopping: "#ede9fe",
  Education: "#ccfbf1",
  Other: "#f3f4f6",
};

interface Props {
  expenses: Expense[];
}

export default function CategorySummary({ expenses }: Props) {
  const { rows, total } = useMemo(() => groupByCategory(expenses), [expenses]);

  if (rows.length === 0) return null;

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>Spending by Category</h3>
      <div className={styles.rows}>
        {rows.map(({ category, total: catTotal, count }) => {
          const pct = total > 0 ? (catTotal / total) * 100 : 0;
          const bg = CATEGORY_BG[category] ?? "#f3f4f6";
          const color = CATEGORY_COLORS[category] ?? "#374151";
          return (
            <div key={category} className={styles.row}>
              <div className={styles.rowHeader}>
                <span
                  className={styles.badge}
                  style={{ background: bg, color }}
                >
                  {category}
                </span>
                <span className={styles.count}>{count} entry{count !== 1 ? "s" : ""}</span>
                <span className={styles.amount}>₹{catTotal.toFixed(2)}</span>
                <span className={styles.pct}>{pct.toFixed(1)}%</span>
              </div>
              <div className={styles.barTrack}>
                <div
                  className={styles.barFill}
                  style={{ width: `${pct}%`, background: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className={styles.footer}>
        Total across {rows.length} categories: <strong>₹{total.toFixed(2)}</strong>
      </div>
    </div>
  );
}
