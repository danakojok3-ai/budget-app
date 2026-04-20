import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend
);

// ─── Types ───────────────────────────────────────────────────────────────────

type TransactionType = "income" | "expense";

const CATEGORIES = [
  "Food",
  "Housing",
  "Transport",
  "Health",
  "Entertainment",
  "Shopping",
  "Salary",
  "Freelance",
  "Other",
] as const;

type Category = (typeof CATEGORIES)[number];

interface Transaction {
  id: string;
  desc: string;
  amount: number;
  category: Category;
  type: TransactionType;
  date: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CAT_COLORS: Record<string, string> = {
  Food: "#1D9E75",
  Housing: "#378ADD",
  Transport: "#BA7517",
  Health: "#D4537E",
  Entertainment: "#7F77DD",
  Shopping: "#D85A30",
  Salary: "#639922",
  Freelance: "#888780",
  Other: "#3B6D11",
};

// ─── Utils ────────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

const fmtDate = (d: string) =>
  new Date(d + "T00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
  });

const fmtMonth = (k: string) => {
  const [y, m] = k.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
};

const monthKey = (d: string) => {
  const dt = new Date(d + "T00:00");
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
};

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const getTodayIso = () => new Date().toISOString().slice(0, 10);

const loadFromStorage = (): Transaction[] => {
  try {
    const s = localStorage.getItem("spendtrace_v2");
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
};

// ─── Styles (CSS-in-JS object map) ───────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  app: {
    fontFamily: "'DM Sans', sans-serif",
    maxWidth: 700,
    margin: "0 auto",
    padding: "2rem 1rem",
    color: "#1a1a1a",
  },
  header: {
    display: "flex",
    alignItems: "baseline",
    gap: 12,
    marginBottom: "1.5rem",
  },
  h1: {
    fontFamily: "'DM Serif Display', serif",
    fontSize: 28,
    fontWeight: 400,
    margin: 0,
  },
  periodLabel: {
    fontSize: 13,
    color: "#888",
    fontFamily: "'DM Mono', monospace",
  },
  stats: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 10,
    marginBottom: "1.5rem",
  },
  stat: {
    background: "#f5f5f3",
    borderRadius: 10,
    padding: "14px 16px",
  },
  statLabel: {
    fontSize: 11,
    letterSpacing: "0.06em",
    textTransform: "uppercase" as const,
    color: "#888",
    marginBottom: 6,
  },
  statValue: { fontFamily: "'DM Mono', monospace", fontSize: 20, fontWeight: 500 },
  formCard: {
    background: "#fff",
    border: "0.5px solid #e0e0e0",
    borderRadius: 14,
    padding: "1.25rem",
    marginBottom: "1.5rem",
  },
  formTitle: {
    fontSize: 12,
    fontWeight: 500,
    color: "#999",
    letterSpacing: "0.05em",
    textTransform: "uppercase" as const,
    marginBottom: "1rem",
  },
  formRow3: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr",
    gap: 10,
    marginBottom: 10,
  },
  formRow2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    marginBottom: 12,
  },
  field: { display: "flex", flexDirection: "column" as const, gap: 5 },
  fieldLabel: { fontSize: 12, color: "#888", fontWeight: 500 },
  input: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 14,
    padding: "8px 10px",
    border: "0.5px solid #e0e0e0",
    borderRadius: 8,
    background: "#f5f5f3",
    color: "#1a1a1a",
    outline: "none",
  },
  typeToggle: {
    display: "flex",
    border: "0.5px solid #e0e0e0",
    borderRadius: 8,
    overflow: "hidden",
  },
  addBtn: {
    width: "100%",
    padding: 10,
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 14,
    fontWeight: 500,
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    background: "#1a1a1a",
    color: "#fff",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "0.75rem",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 500,
    color: "#888",
    letterSpacing: "0.05em",
    textTransform: "uppercase" as const,
  },
  filterSelect: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13,
    padding: "5px 8px",
    border: "0.5px solid #e0e0e0",
    borderRadius: 8,
    background: "#f5f5f3",
    color: "#1a1a1a",
    outline: "none",
  },
  tabs: {
    display: "flex",
    border: "0.5px solid #e0e0e0",
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: "1rem",
  },
  legend: { display: "flex", flexWrap: "wrap" as const, gap: 10, marginBottom: 8 },
  legendItem: { display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#888" },
  legendSwatch: { width: 10, height: 10, borderRadius: 2 },
  txList: { display: "flex", flexDirection: "column" as const, gap: 6 },
  txItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "#fff",
    border: "0.5px solid #e0e0e0",
    borderRadius: 10,
    padding: "12px 14px",
  },
  txInfo: { flex: 1, minWidth: 0 },
  txDesc: {
    fontSize: 14,
    fontWeight: 500,
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  txMeta: { display: "flex", gap: 8, alignItems: "center", marginTop: 2 },
  txCat: {
    fontSize: 11,
    color: "#888",
    background: "#f5f5f3",
    padding: "2px 7px",
    borderRadius: 20,
    border: "0.5px solid #e0e0e0",
  },
  txDate: { fontSize: 11, color: "#999", fontFamily: "'DM Mono', monospace" },
  txAmount: { fontFamily: "'DM Mono', monospace", fontSize: 15, fontWeight: 500, flexShrink: 0 },
  delBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#ccc",
    padding: 4,
    borderRadius: 4,
    display: "flex",
  },
  empty: {
    textAlign: "center" as const,
    padding: "2.5rem 1rem",
    color: "#aaa",
    fontSize: 14,
    border: "0.5px dashed #e0e0e0",
    borderRadius: 14,
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>(loadFromStorage);
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<Category>("Food");
  const [txType, setTxType] = useState<TransactionType>("expense");
  const [date, setDate] = useState(getTodayIso);
  const [filterMonth, setFilterMonth] = useState("all");
  const [activeTab, setActiveTab] = useState<"chart" | "trends">("chart");

  useEffect(() => {
    try {
      localStorage.setItem("spendtrace_v2", JSON.stringify(transactions));
    } catch {}
  }, [transactions]);

  const monthOptions = useMemo(() => {
    const months = new Set(transactions.map((t) => monthKey(t.date)));
    return Array.from(months).sort().reverse();
  }, [transactions]);

  const filteredTxs = useMemo(() => {
    if (filterMonth === "all") return transactions;
    return transactions.filter((t) => monthKey(t.date) === filterMonth);
  }, [transactions, filterMonth]);

  const stats = useMemo(() => {
    const income = filteredTxs
      .filter((t) => t.type === "income")
      .reduce((a, c) => a + c.amount, 0);
    const expenses = filteredTxs
      .filter((t) => t.type === "expense")
      .reduce((a, c) => a + c.amount, 0);
    return { income, expenses, balance: income - expenses };
  }, [filteredTxs]);

  const catChartData = useMemo(() => {
    const bycat: Record<string, number> = {};
    filteredTxs
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        bycat[t.category] = (bycat[t.category] || 0) + t.amount;
      });
    const entries = Object.entries(bycat).sort((a, b) => b[1] - a[1]);
    return {
      entries,
      labels: entries.map((e) => e[0]),
      data: entries.map((e) => Math.round(e[1] * 100) / 100),
      colors: entries.map((e) => CAT_COLORS[e[0]] || "#888"),
    };
  }, [filteredTxs]);

  const trendChartData = useMemo(() => {
    const allMonths = Array.from(new Set(transactions.map((t) => monthKey(t.date)))).sort();
    const income = allMonths.map((m) =>
      Math.round(
        transactions
          .filter((t) => t.type === "income" && monthKey(t.date) === m)
          .reduce((a, c) => a + c.amount, 0) * 100
      ) / 100
    );
    const expenses = allMonths.map((m) =>
      Math.round(
        transactions
          .filter((t) => t.type === "expense" && monthKey(t.date) === m)
          .reduce((a, c) => a + c.amount, 0) * 100
      ) / 100
    );
    return { labels: allMonths.map(fmtMonth), income, expenses };
  }, [transactions]);

  const addTransaction = useCallback(() => {
    const num = parseFloat(amount);
    if (!desc.trim() || isNaN(num) || num <= 0 || !date) return;
    setTransactions((prev) => [
      {
        id: generateId(),
        desc: desc.trim(),
        amount: num,
        category,
        type: txType,
        date,
      },
      ...prev,
    ]);
    setDesc("");
    setAmount("");
  }, [desc, amount, category, txType, date]);

  const deleteTransaction = useCallback((id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const typeBtn = (t: TransactionType) => ({
    flex: 1,
    padding: "8px",
    fontSize: 13,
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 500,
    border: "none",
    cursor: "pointer",
    transition: "background .15s",
    background:
      txType === t
        ? t === "expense"
          ? "#FCEBEB"
          : "#E1F5EE"
        : "transparent",
    color:
      txType === t
        ? t === "expense"
          ? "#E24B4A"
          : "#085041"
        : "#999",
  } as React.CSSProperties);

  const tabBtn = (tab: "chart" | "trends") => ({
    flex: 1,
    padding: "7px",
    fontSize: 13,
    fontWeight: 500,
    fontFamily: "'DM Sans', sans-serif",
    border: "none",
    cursor: "pointer",
    background: activeTab === tab ? "#f5f5f3" : "transparent",
    color: activeTab === tab ? "#1a1a1a" : "#888",
  } as React.CSSProperties);

  const periodLabel =
    filterMonth === "all" ? "all time" : fmtMonth(filterMonth).toLowerCase();

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600&display=swap"
        rel="stylesheet"
      />
      <div style={S.app}>
        {/* Header */}
        <div style={S.header}>
          <h1 style={S.h1}>SpendTrace</h1>
          <span style={S.periodLabel}>{periodLabel}</span>
        </div>

        {/* Stats */}
        <div style={S.stats}>
          {(
            [
              { label: "Balance", value: stats.balance, color: stats.balance >= 0 ? "#1D9E75" : "#E24B4A" },
              { label: "Income", value: stats.income, color: "#1D9E75" },
              { label: "Expenses", value: stats.expenses, color: "#E24B4A" },
            ] as const
          ).map(({ label, value, color }) => (
            <div key={label} style={S.stat}>
              <div style={S.statLabel}>{label}</div>
              <div style={{ ...S.statValue, color }}>{fmt(value)}</div>
            </div>
          ))}
        </div>

        {/* Form */}
        <div style={S.formCard}>
          <div style={S.formTitle}>New transaction</div>
          <div style={S.formRow3}>
            <div style={S.field}>
              <label style={S.fieldLabel}>Description</label>
              <input
                style={S.input}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="e.g. Grocery run"
                onKeyDown={(e) => e.key === "Enter" && addTransaction()}
              />
            </div>
            <div style={S.field}>
              <label style={S.fieldLabel}>Amount</label>
              <input
                style={S.input}
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                min={0}
                step={0.01}
              />
            </div>
            <div style={S.field}>
              <label style={S.fieldLabel}>Date</label>
              <input
                style={S.input}
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
          <div style={S.formRow2}>
            <div style={S.field}>
              <label style={S.fieldLabel}>Category</label>
              <select
                style={S.input}
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div style={S.field}>
              <label style={S.fieldLabel}>Type</label>
              <div style={S.typeToggle}>
                <button style={typeBtn("expense")} onClick={() => setTxType("expense")}>
                  Expense
                </button>
                <button style={typeBtn("income")} onClick={() => setTxType("income")}>
                  Income
                </button>
              </div>
            </div>
          </div>
          <button style={S.addBtn} onClick={addTransaction}>
            Add transaction
          </button>
        </div>

        {/* Charts */}
        <div>
          <div style={S.sectionHeader}>
            <div style={S.tabs}>
              <button style={tabBtn("chart")} onClick={() => setActiveTab("chart")}>
                Spending by category
              </button>
              <button style={tabBtn("trends")} onClick={() => setActiveTab("trends")}>
                Monthly trends
              </button>
            </div>
            <select
              style={S.filterSelect}
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
            >
              <option value="all">All time</option>
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {fmtMonth(m)}
                </option>
              ))}
            </select>
          </div>

          {activeTab === "chart" && (
            <div>
              <div style={S.legend}>
                {catChartData.entries.map(([name, val], i) => (
                  <span key={name} style={S.legendItem}>
                    <span style={{ ...S.legendSwatch, background: catChartData.colors[i] }} />
                    {name} {fmt(val)}
                  </span>
                ))}
              </div>
              <div style={{ position: "relative", height: 200 }}>
                <Bar
                  data={{
                    labels: catChartData.labels,
                    datasets: [
                      {
                        data: catChartData.data,
                        backgroundColor: catChartData.colors,
                        borderRadius: 4,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => fmt(c.raw as number) } } },
                    scales: {
                      x: { grid: { display: false }, ticks: { font: { size: 12 } }, border: { display: false } },
                      y: { grid: { color: "rgba(0,0,0,.05)" }, ticks: { callback: (v) => fmt(v as number), font: { size: 11 } }, border: { display: false } },
                    },
                  }}
                />
              </div>
            </div>
          )}

          {activeTab === "trends" && (
            <div style={{ position: "relative", height: 220 }}>
              <Line
                data={{
                  labels: trendChartData.labels,
                  datasets: [
                    {
                      label: "Income",
                      data: trendChartData.income,
                      borderColor: "#1D9E75",
                      backgroundColor: "rgba(29,158,117,.1)",
                      tension: 0.3,
                      fill: true,
                      pointRadius: 4,
                      pointBackgroundColor: "#1D9E75",
                    },
                    {
                      label: "Expenses",
                      data: trendChartData.expenses,
                      borderColor: "#E24B4A",
                      backgroundColor: "rgba(226,75,74,.08)",
                      tension: 0.3,
                      fill: true,
                      pointRadius: 4,
                      pointBackgroundColor: "#E24B4A",
                      borderDash: [4, 3],
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { grid: { display: false }, border: { display: false } },
                    y: { grid: { color: "rgba(0,0,0,.05)" }, ticks: { callback: (v) => fmt(v as number) }, border: { display: false } },
                  },
                }}
              />
            </div>
          )}
        </div>

        {/* Transaction list */}
        <div style={{ marginTop: "1.5rem" }}>
          <div style={S.sectionHeader}>
            <div style={S.sectionTitle}>Transactions</div>
            <div style={{ fontSize: 12, color: "#aaa" }}>{filteredTxs.length} transactions</div>
          </div>
          <div style={S.txList}>
            {filteredTxs.length === 0 ? (
              <div style={S.empty}>No transactions yet — add one above</div>
            ) : (
              filteredTxs.map((t) => (
                <div key={t.id} style={S.txItem}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      flexShrink: 0,
                      background: t.type === "expense" ? "#E24B4A" : "#1D9E75",
                    }}
                  />
                  <div style={S.txInfo}>
                    <div style={S.txDesc}>{t.desc}</div>
                    <div style={S.txMeta}>
                      <span style={S.txCat}>{t.category}</span>
                      <span style={S.txDate}>{fmtDate(t.date)}</span>
                    </div>
                  </div>
                  <span style={{ ...S.txAmount, color: t.type === "expense" ? "#E24B4A" : "#1D9E75" }}>
                    {t.type === "expense" ? "−" : "+"} {fmt(t.amount)}
                  </span>
                  <button style={S.delBtn} onClick={() => deleteTransaction(t.id)} title="Delete">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4h6v2" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
