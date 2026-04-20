import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
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

const CATEGORY_ICONS: Record<Category, string> = {
  Food: "🍔",
  Housing: "🏠",
  Transport: "🚌",
  Health: "💊",
  Entertainment: "🎬",
  Shopping: "🛍️",
  Salary: "💼",
  Freelance: "🖋️",
  Other: "✨",
};

// ─── Utils ───────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

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
    minHeight: "100vh",
    padding: "2rem 1rem",
    color: "#e2e8f0",
    background: "#020617",
  },
  page: {
    display: "grid",
    gridTemplateColumns: "260px 1fr",
    gap: 24,
    maxWidth: 1240,
    margin: "0 auto",
    alignItems: "start",
  },
  sidebar: {
    background: "#080b1d",
    borderRadius: 32,
    padding: 28,
    display: "flex",
    flexDirection: "column" as const,
    gap: 20,
    minHeight: "calc(100vh - 4rem)",
    border: "1px solid rgba(148,163,184,0.08)",
    boxShadow: "0 40px 120px rgba(15,23,42,0.5)",
  },
  sidebarHeader: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 8,
  },
  sidebarTitle: {
    color: "#94a3b8",
    fontSize: 11,
    letterSpacing: "0.25em",
    textTransform: "uppercase" as const,
  },
  sidebarLogo: {
    fontFamily: "'DM Serif Display', serif",
    color: "#f8fafc",
    fontSize: 28,
    fontWeight: 400,
    letterSpacing: "-0.05em",
  },
  sidebarSubtitle: {
    fontSize: 13,
    color: "#94a3b8",
    marginTop: 4,
    maxWidth: 220,
    lineHeight: 1.5,
  },
  sidebarNav: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 12,
  },
  sidebarItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "12px 14px",
    borderRadius: 18,
    color: "#cbd5e1",
    background: "transparent",
    border: "1px solid transparent",
    cursor: "pointer",
    transition: "all .18s ease",
  },
  sidebarItemActive: {
    background: "rgba(59,130,246,0.18)",
    borderColor: "rgba(59,130,246,0.4)",
    color: "#eff6ff",
  },
  sidebarBadge: {
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    background: "rgba(59,130,246,0.16)",
    color: "#bfdbfe",
  },
  sidebarFooter: {
    marginTop: "auto",
    padding: "14px 16px",
    borderRadius: 18,
    border: "1px solid rgba(148,163,184,0.12)",
    background: "rgba(255,255,255,0.02)",
    color: "#94a3b8",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  sidebarFooterButton: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    border: "none",
    background: "transparent",
    color: "inherit",
    padding: 0,
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 600,
    cursor: "pointer",
  },
  settingsOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0, 0, 0, 0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem",
    zIndex: 20,
  },
  settingsCard: {
    width: "100%",
    maxWidth: 400,
    background: "#0b1229",
    borderRadius: 28,
    border: "1px solid rgba(148,163,184,0.12)",
    boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
    padding: 24,
    display: "flex",
    flexDirection: "column" as const,
    gap: 18,
  },
  settingsHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
  },
  settingsTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: "#f8fafc",
    letterSpacing: "0.02em",
  },
  settingsSubtitle: {
    marginTop: 6,
    color: "#94a3b8",
    fontSize: 13,
    lineHeight: 1.5,
  },
  settingsClose: {
    border: "none",
    background: "rgba(255,255,255,0.06)",
    color: "#f8fafc",
    width: 32,
    height: 32,
    borderRadius: 14,
    cursor: "pointer",
    fontSize: 16,
    lineHeight: 1,
  },
  settingsItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    padding: "16px 18px",
    borderRadius: 18,
    border: "1px solid rgba(148,163,184,0.12)",
    background: "rgba(255,255,255,0.02)",
  },
  settingsOptionRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    padding: "16px 18px",
    borderRadius: 18,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(148,163,184,0.12)",
  },
  settingsInput: {
    width: 120,
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.18)",
    background: "rgba(255,255,255,0.06)",
    color: "#f8fafc",
    padding: "10px 12px",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13,
    outline: "none",
  },
  currencyChip: {
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid rgba(148,163,184,0.12)",
    cursor: "pointer",
    background: "rgba(255,255,255,0.05)",
    color: "#cbd5e1",
    transition: "all .18s ease",
  },
  currencyChipActive: {
    background: "#1D9E75",
    color: "#fff",
    borderColor: "transparent",
    boxShadow: "0 16px 40px rgba(29,158,117,0.24)",
  },
  settingsActionButton: {
    marginTop: 8,
    width: "100%",
    borderRadius: 18,
    border: "none",
    background: "#22c55e",
    color: "#0f172a",
    padding: "14px 18px",
    fontWeight: 700,
    cursor: "pointer",
    transition: "background .18s ease",
    boxShadow: "0 18px 50px rgba(34,197,94,0.24)",
  },
  settingsItemTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: "#f8fafc",
  },
  settingsItemHint: {
    marginTop: 6,
    color: "#94a3b8",
    fontSize: 12,
    lineHeight: 1.4,
  },
  settingsOption: {
    width: "100%",
    textAlign: "left",
    padding: "16px 18px",
    borderRadius: 18,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(148,163,184,0.12)",
    color: "#f8fafc",
    fontWeight: 600,
    cursor: "pointer",
    transition: "background .18s ease",
  },
  toggleActive: {
    width: 50,
    height: 28,
    borderRadius: 999,
    background: "linear-gradient(135deg, #22c55e, #38bdf8)",
    border: "none",
    position: "relative" as const,
    cursor: "pointer",
  },
  toggleInactive: {
    width: 50,
    height: 28,
    borderRadius: 999,
    background: "rgba(148,163,184,0.16)",
    border: "none",
    position: "relative" as const,
    cursor: "pointer",
  },
  toggleThumb: {
    position: "absolute" as const,
    top: 3,
    left: 3,
    width: 22,
    height: 22,
    borderRadius: "50%",
    background: "#fff",
    boxShadow: "0 10px 20px rgba(0,0,0,0.15)",
  },
  content: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 24,
  },
  header: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 10,
  },
  h1: {
    fontFamily: "'DM Serif Display', serif",
    fontSize: 38,
    fontWeight: 400,
    margin: 0,
    color: "#f8fafc",
    letterSpacing: "-0.04em",
  },
  periodLabel: {
    fontSize: 13,
    color: "#94a3b8",
    fontFamily: "'DM Mono', monospace",
  },
  stats: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr 1fr",
    gap: 16,
    marginBottom: "0",
  },
  stat: {
    background: "rgba(255,255,255,0.04)",
    borderRadius: 28,
    padding: "1.4rem 1.2rem",
    boxShadow: "0 30px 90px rgba(15,23,42,0.35)",
    position: "relative" as const,
    minHeight: 140,
    border: "1px solid rgba(148,163,184,0.08)",
  },
  statMain: {
    background: "linear-gradient(180deg, rgba(59,130,246,0.18) 0%, rgba(15,23,42,0.9) 100%)",
    color: "#f8fafc",
    border: "1px solid rgba(59,130,246,0.35)",
    boxShadow: "0 40px 120px rgba(59,130,246,0.12)",
  },
  statLabel: {
    fontSize: 11,
    letterSpacing: "0.12em",
    textTransform: "uppercase" as const,
    color: "#94a3b8",
    marginBottom: 10,
  },
  statValue: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 32,
    fontWeight: 700,
    lineHeight: 1.05,
  },
  statTrend: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    fontSize: 12,
    color: "#cbd5e1",
  },
  statTrendPositive: {
    color: "#4ade80",
  },
  statTrendNegative: {
    color: "#fb7185",
  },
  statArrow: {
    width: 18,
    height: 18,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    background: "rgba(59,130,246,0.18)",
    fontSize: 11,
    color: "#eff6ff",
  },
  statArrowDown: {
    background: "rgba(244,63,94,0.18)",
  },
  formCard: {
    background: "rgba(255,255,255,0.04)",
    borderRadius: 32,
    padding: "1.75rem",
    boxShadow: "0 30px 90px rgba(15,23,42,0.28)",
    border: "1px solid rgba(148,163,184,0.08)",
    marginBottom: "0",
  },
  formTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: "#94a3b8",
    letterSpacing: "0.18em",
    textTransform: "uppercase" as const,
    marginBottom: "1.2rem",
  },
  formRow3: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr",
    gap: 10,
    marginBottom: 10,
  },
  formRow2: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 10,
    marginBottom: 12,
  },
  field: { display: "flex", flexDirection: "column" as const, gap: 6 },
  fieldLabel: { fontSize: 12, color: "#64748b", fontWeight: 600 },
  inputWrapper: { position: "relative", display: "flex", alignItems: "center" },
  inputIcon: { position: "absolute", left: 12, color: "#94a3b8", fontSize: 15 },
  input: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 14,
    padding: "11px 12px 11px 36px",
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    background: "#f8fafc",
    color: "#111827",
    outline: "none",
  },
  inputAmount: {
    color: "#1D9E75",
  },
  typeToggle: {
    display: "flex",
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    overflow: "hidden",
    background: "#f8fafc",
    minHeight: 44,
  },
  addBtn: {
    width: "100%",
    padding: 12,
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 14,
    fontWeight: 700,
    border: "none",
    borderRadius: 16,
    cursor: "pointer",
    background: "#1D9E75",
    color: "#fff",
    boxShadow: "0 16px 30px rgba(29,158,117,0.18)",
    transition: "transform .18s ease, background .18s ease",
  },
  addBtnSuccess: {
    background: "#0f766e",
  },
  categoryPills: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
    gap: 10,
    padding: "10px",
    borderRadius: 18,
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    maxHeight: 260,
    overflowY: "auto",
  },
  categorySearchInput: {
    width: "100%",
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.18)",
    background: "#f8fafc",
    color: "#111827",
    padding: "10px 12px",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13,
    outline: "none",
  },
  categoryPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
    minHeight: 44,
    padding: "10px 14px",
    borderRadius: 999,
    border: "1px solid #e2e8f0",
    background: "#fff",
    color: "#334155",
    fontSize: 13,
    cursor: "pointer",
    transition: "all .18s ease",
    textAlign: "center" as const,
  },
  categoryPillActive: {
    background: "#1D9E75",
    color: "#fff",
    borderColor: "transparent",
    boxShadow: "0 18px 45px rgba(29,158,117,0.18)",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap" as const,
    gap: 12,
    marginBottom: "0.75rem",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 500,
    color: "#cbd5e1",
    letterSpacing: "0.12em",
    textTransform: "uppercase" as const,
  },
  filterSelect: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13,
    padding: "9px 12px",
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: 14,
    background: "rgba(255,255,255,0.05)",
    color: "#e2e8f0",
    outline: "none",
  },
  tabs: {
    display: "flex",
    border: "1px solid rgba(148,163,184,0.12)",
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: "1rem",
    background: "rgba(255,255,255,0.04)",
  },
  legend: { display: "flex", flexWrap: "wrap" as const, gap: 10, marginBottom: 10 },
  legendItem: { display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#cbd5e1" },
  legendSwatch: { width: 10, height: 10, borderRadius: 2 },
  txList: { display: "flex", flexDirection: "column" as const, gap: 12 },
  txItem: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    background: "rgba(255,255,255,0.04)",
    borderRadius: 24,
    padding: "18px 20px",
    boxShadow: "0 30px 90px rgba(15,23,42,0.25)",
    border: "1px solid rgba(148,163,184,0.10)",
    transition: "transform .18s ease, box-shadow .18s ease",
  },
  txBadge: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    flexShrink: 0,
  },
  txInfo: { flex: 1, minWidth: 0 },
  txDesc: {
    fontSize: 14,
    fontWeight: 600,
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
    color: "#f8fafc",
  },
  txMeta: { display: "flex", gap: 10, alignItems: "center", marginTop: 4, flexWrap: "wrap" as const, color: "#94a3b8" },
  txCat: {
    fontSize: 12,
    color: "#cbd5e1",
    background: "rgba(255,255,255,0.04)",
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid rgba(148,163,184,0.16)",
  },
  txDate: { fontSize: 11, color: "#94a3b8", fontFamily: "'DM Mono', monospace" },
  txAmount: { fontFamily: "'DM Mono', monospace", fontSize: 15, fontWeight: 700, flexShrink: 0, color: "#f8fafc" },
  delBtn: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(148,163,184,0.16)",
    cursor: "pointer",
    color: "#cbd5e1",
    padding: 8,
    borderRadius: 10,
    display: "flex",
  },
  empty: {
    textAlign: "center" as const,
    padding: "2rem 1.5rem",
    color: "#cbd5e1",
    fontSize: 14,
    border: "1px dashed rgba(148,163,184,0.28)",
    borderRadius: 24,
    background: "rgba(148,163,184,0.06)",
    minHeight: 190,
    display: "grid",
    placeItems: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: "#f8fafc",
    marginBottom: 6,
  },
  emptyText: {
    color: "#94a3b8",
  },
  ghostGraph: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 10,
    marginTop: 18,
    width: "100%",
  },
  ghostBar: {
    height: 12,
    borderRadius: 999,
    background: "linear-gradient(90deg, rgba(255,255,255,0.08), rgba(148,163,184,0.2))",
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
  const [categorySearch, setCategorySearch] = useState("");
  const [filterMonth, setFilterMonth] = useState("all");
  const [activeTab, setActiveTab] = useState<"chart" | "trends">("chart");
  const [selectedSection, setSelectedSection] = useState<"dashboard" | "transactions" | "goals" | "insights" | "export">("dashboard");
  const [showSettings, setShowSettings] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [monthlyGoal, setMonthlyGoal] = useState(1200);
  const [goalInput, setGoalInput] = useState("1200");
  const [currency, setCurrency] = useState<"USD" | "EUR" | "GBP">("USD");
  const [passcodeEnabled, setPasscodeEnabled] = useState(true);
  const [addStatus, setAddStatus] = useState<"idle" | "success">("idle");
  const [recentTxId, setRecentTxId] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem("spendtrace_v2", JSON.stringify(transactions));
    } catch {}
  }, [transactions]);

  const monthOptions = useMemo(() => {
    const months = new Set(transactions.map((t) => monthKey(t.date)));
    return Array.from(months).sort().reverse();
  }, [transactions]);

  const currencySymbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : "£";
  const appStyle = { ...S.app, background: darkMode ? "#020617" : "#f8fafc", color: darkMode ? "#e2e8f0" : "#0f172a" };

  const filteredTxs = useMemo(() => {
    if (filterMonth === "all") return transactions;
    return transactions.filter((t) => monthKey(t.date) === filterMonth);
  }, [transactions, filterMonth]);

  const monthPerformance = useMemo<{
    income: number | null;
    expenses: number | null;
    balance: number | null;
    savings: number | null;
  }>(() => {
    const months = Array.from(new Set(transactions.map((t) => monthKey(t.date)))).sort();
    if (months.length < 2) return { income: null, expenses: null, balance: null, savings: null };
    const summary = months.map((month) => {
      const income = transactions
        .filter((t) => t.type === "income" && monthKey(t.date) === month)
        .reduce((sum, tx) => sum + tx.amount, 0);
      const expenses = transactions
        .filter((t) => t.type === "expense" && monthKey(t.date) === month)
        .reduce((sum, tx) => sum + tx.amount, 0);
      const balance = income - expenses;
      return { month, income, expenses, balance, savings: Math.max(balance, 0) };
    });
    const latest = summary[summary.length - 1];
    const previous = summary[summary.length - 2];
    const diff = (current: number, previousVal: number) =>
      previousVal === 0 ? null : Number((((current - previousVal) / Math.abs(previousVal)) * 100).toFixed(1));
    return {
      income: diff(latest.income, previous.income),
      expenses: diff(latest.expenses, previous.expenses),
      balance: diff(latest.balance, previous.balance),
      savings: diff(latest.savings, previous.savings),
    };
  }, [transactions]);

  const stats = useMemo(() => {
    const income = filteredTxs
      .filter((t) => t.type === "income")
      .reduce((a, c) => a + c.amount, 0);
    const expenses = filteredTxs
      .filter((t) => t.type === "expense")
      .reduce((a, c) => a + c.amount, 0);
    const balance = income - expenses;
    const savings = Math.max(balance, 0);
    return { income, expenses, balance, savings };
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
    const newTransaction: Transaction = {
      id: generateId(),
      desc: desc.trim(),
      amount: num,
      category,
      type: txType,
      date,
    };
    setTransactions((prev) => [newTransaction, ...prev]);
    setDesc("");
    setAmount("");
    setAddStatus("success");
    setRecentTxId(newTransaction.id);
    window.setTimeout(() => setAddStatus("idle"), 900);
    window.setTimeout(() => setRecentTxId(null), 900);
  }, [desc, amount, category, txType, date]);

  const deleteTransaction = useCallback((id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const typeBtn = (t: TransactionType) => ({
    flex: 1,
    padding: "10px",
    fontSize: 13,
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 600,
    border: "none",
    cursor: "pointer",
    transition: "background .15s, color .15s",
    background:
      txType === t
        ? t === "expense"
          ? "rgba(244,63,94,0.18)"
          : "rgba(34,197,94,0.18)"
        : "transparent",
    color:
      txType === t
        ? t === "expense"
          ? "#fb7185"
          : "#4ade80"
        : "#94a3b8",
  } as React.CSSProperties);

  const tabBtn = (tab: "chart" | "trends") => ({
    flex: 1,
    padding: "10px 12px",
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif",
    border: "none",
    cursor: "pointer",
    background: activeTab === tab ? "rgba(255,255,255,0.08)" : "transparent",
    color: activeTab === tab ? "#f8fafc" : "#94a3b8",
  } as React.CSSProperties);

  const periodLabel =
    filterMonth === "all" ? "all time" : fmtMonth(filterMonth).toLowerCase();

  const filteredCategories = CATEGORIES.filter((category) =>
    category.toLowerCase().includes(categorySearch.toLowerCase())
  );

  const selectedSectionLabel =
    selectedSection === "dashboard"
      ? "Dashboard"
      : selectedSection === "transactions"
      ? "Transactions"
      : selectedSection === "goals"
      ? "Goals"
      : selectedSection === "insights"
      ? "Insights"
      : "Export";

  const sectionContent =
    selectedSection === "dashboard" ? (
      <>
        <div style={S.stats}>
          {(
            [
              {
                label: "Hero Balance",
                value: stats.balance,
                color: stats.balance >= 0 ? "#4ade80" : "#fb7185",
                trend: monthPerformance.balance,
                hero: true,
              },
              {
                label: "Income",
                value: stats.income,
                color: "#22c55e",
                trend: monthPerformance.income,
                hero: false,
              },
              {
                label: "Expenses",
                value: stats.expenses,
                color: "#fb7185",
                trend: monthPerformance.expenses,
                hero: false,
              },
              {
                label: "Savings",
                value: stats.savings,
                color: "#60a5fa",
                trend: monthPerformance.savings,
                hero: false,
              },
            ] as const
          ).map(({ label, value, color, trend, hero }) => (
            <div key={label} style={{ ...S.stat, ...(hero ? S.statMain : {}) }}>
              <div style={S.statLabel}>{label}</div>
              <div style={{ ...S.statValue, color }}>{fmt(value)}</div>
              <div style={S.statTrend}>
                <span
                  style={{
                    ...S.statArrow,
                    ...(trend !== null && trend !== undefined && trend < 0 ? S.statArrowDown : {}),
                  }}
                >
                  {trend === null || trend === undefined ? "—" : trend >= 0 ? "↑" : "↓"}
                </span>
                <span
                  style={
                    trend !== null && trend !== undefined
                      ? trend >= 0
                        ? S.statTrendPositive
                        : S.statTrendNegative
                      : {}
                  }
                >
                  {trend === null || trend === undefined ? "No history" : `${fmtPct(trend)} vs prev`}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div style={S.formCard}>
          <div style={S.formTitle}>New transaction</div>
          <div style={S.formRow3}>
            <div style={S.field}>
              <label style={S.fieldLabel}>Description</label>
              <div style={S.inputWrapper}>
                <span style={S.inputIcon}>📝</span>
                <input
                  style={S.input}
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="e.g. Grocery run"
                  onKeyDown={(e) => e.key === "Enter" && addTransaction()}
                />
              </div>
            </div>
            <div style={S.field}>
              <label style={S.fieldLabel}>Amount</label>
              <div style={S.inputWrapper}>
                <span style={S.inputIcon}>💲</span>
                <input
                  style={{
                    ...S.input,
                    color: txType === "expense" ? "#E24B4A" : "#1D9E75",
                  }}
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  min={0}
                  step={0.01}
                />
              </div>
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
              <input
                style={S.categorySearchInput}
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                placeholder="Search category..."
              />
              <div style={S.categoryPills}>
                {filteredCategories.length > 0 ? (
                  filteredCategories.map((c) => (
                    <button
                      key={c}
                      type="button"
                      style={
                        category === c
                          ? { ...S.categoryPill, ...S.categoryPillActive }
                          : S.categoryPill
                      }
                      onClick={() => setCategory(c)}
                    >
                      <span>{CATEGORY_ICONS[c]}</span>
                      {c}
                    </button>
                  ))
                ) : (
                  <div style={S.emptyText}>No categories match that search.</div>
                )}
              </div>
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
          <button
            style={{
              ...S.addBtn,
              ...(addStatus === "success" ? S.addBtnSuccess : {}),
            }}
            onClick={addTransaction}
          >
            {addStatus === "success" ? "Added ✓" : "Add transaction"}
          </button>
        </div>

        <div>
          <div style={S.sectionHeader}>
            <div style={S.tabs}>
              <button style={tabBtn("chart")} onClick={() => setActiveTab("chart")}>Spending by category</button>
              <button style={tabBtn("trends")} onClick={() => setActiveTab("trends")}>Monthly trends</button>
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
            <>
              <div style={S.legend}>
                {catChartData.entries.map(([name, val], i) => (
                  <span key={name} style={S.legendItem}>
                    <span style={{ ...S.legendSwatch, background: catChartData.colors[i] }} />
                    {name} {fmt(val)}
                  </span>
                ))}
              </div>
              <div style={{ position: "relative", height: 240 }}>
                <Doughnut
                  data={{
                    labels: catChartData.labels,
                    datasets: [
                      {
                        data: catChartData.data,
                        backgroundColor: catChartData.colors,
                        borderWidth: 2,
                        hoverOffset: 8,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: "68%",
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: "#0f172a",
                        titleColor: "#f8fafc",
                        bodyColor: "#cbd5e1",
                        borderColor: "rgba(148,163,184,0.2)",
                        borderWidth: 1,
                        callbacks: { label: (c) => fmt(c.raw as number) },
                      },
                    },
                  }}
                />
              </div>
            </>
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
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      backgroundColor: "#0f172a",
                      titleColor: "#f8fafc",
                      bodyColor: "#cbd5e1",
                      borderColor: "rgba(148,163,184,0.2)",
                      borderWidth: 1,
                    },
                  },
                  scales: {
                    x: {
                      grid: { display: false, color: "rgba(148,163,184,0.12)" },
                      ticks: { color: "#cbd5e1" },
                      border: { display: false },
                    },
                    y: {
                      grid: { color: "rgba(148,163,184,0.12)" },
                      ticks: { callback: (v) => fmt(v as number), color: "#cbd5e1" },
                      border: { display: false },
                    },
                  },
                }}
              />
            </div>
          )}
        </div>

        <div style={{ marginTop: "1.5rem" }}>
          <div style={S.sectionHeader}>
            <div style={S.sectionTitle}>Transactions</div>
            <div style={{ fontSize: 12, color: "#aaa" }}>{filteredTxs.length} transactions</div>
          </div>
          <div style={S.txList}>
            {filteredTxs.length === 0 ? (
              <div style={S.empty}>
                <div style={S.emptyTitle}>Your ledger is waiting.</div>
                <div style={S.emptyText}>Add a first purchase, paycheck, or coffee run to bring SpendTrace to life.</div>
                <div style={S.ghostGraph}>
                  <div style={{ ...S.ghostBar, width: "80%" }} />
                  <div style={{ ...S.ghostBar, width: "60%" }} />
                  <div style={{ ...S.ghostBar, width: "90%" }} />
                  <div style={{ ...S.ghostBar, width: "50%" }} />
                </div>
              </div>
            ) : (
              filteredTxs.map((t) => (
                <div
                  key={t.id}
                  className={t.id === recentTxId ? "recent-transaction" : undefined}
                  style={S.txItem}
                >
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
      </>
    ) : selectedSection === "transactions" ? (
      <>
        <div style={S.formCard}>
          <div style={S.formTitle}>New transaction</div>
          <div style={S.formRow3}>
            <div style={S.field}>
              <label style={S.fieldLabel}>Description</label>
              <div style={S.inputWrapper}>
                <span style={S.inputIcon}>📝</span>
                <input
                  style={S.input}
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="e.g. Grocery run"
                  onKeyDown={(e) => e.key === "Enter" && addTransaction()}
                />
              </div>
            </div>
            <div style={S.field}>
              <label style={S.fieldLabel}>Amount</label>
              <div style={S.inputWrapper}>
                <span style={S.inputIcon}>💲</span>
                <input
                  style={{
                    ...S.input,
                    color: txType === "expense" ? "#E24B4A" : "#1D9E75",
                  }}
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  min={0}
                  step={0.01}
                />
              </div>
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
              <input
                style={S.categorySearchInput}
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                placeholder="Search category..."
              />
              <div style={S.categoryPills}>
                {filteredCategories.length > 0 ? (
                  filteredCategories.map((c) => (
                    <button
                      key={c}
                      type="button"
                      style={
                        category === c
                          ? { ...S.categoryPill, ...S.categoryPillActive }
                          : S.categoryPill
                      }
                      onClick={() => setCategory(c)}
                    >
                      <span>{CATEGORY_ICONS[c]}</span>
                      {c}
                    </button>
                  ))
                ) : (
                  <div style={S.emptyText}>No categories match that search.</div>
                )}
              </div>
            </div>
            <div style={S.field}>
              <label style={S.fieldLabel}>Type</label>
              <div style={S.typeToggle}>
                <button style={typeBtn("expense")} onClick={() => setTxType("expense")}>Expense</button>
                <button style={typeBtn("income")} onClick={() => setTxType("income")}>Income</button>
              </div>
            </div>
          </div>
          <button
            style={{
              ...S.addBtn,
              ...(addStatus === "success" ? S.addBtnSuccess : {}),
            }}
            onClick={addTransaction}
          >
            {addStatus === "success" ? "Added ✓" : "Add transaction"}
          </button>
        </div>

        <div style={{ marginTop: "1.5rem" }}>
          <div style={S.sectionHeader}>
            <div style={S.sectionTitle}>Transactions</div>
            <div style={{ fontSize: 12, color: "#aaa" }}>{filteredTxs.length} transactions</div>
          </div>
          <div style={S.txList}>
            {filteredTxs.length === 0 ? (
              <div style={S.empty}>
                <div style={S.emptyTitle}>Your ledger is waiting.</div>
                <div style={S.emptyText}>Add a first purchase, paycheck, or coffee run to bring SpendTrace to life.</div>
                <div style={S.ghostGraph}>
                  <div style={{ ...S.ghostBar, width: "80%" }} />
                  <div style={{ ...S.ghostBar, width: "60%" }} />
                  <div style={{ ...S.ghostBar, width: "90%" }} />
                  <div style={{ ...S.ghostBar, width: "50%" }} />
                </div>
              </div>
            ) : (
              filteredTxs.map((t) => (
                <div
                  key={t.id}
                  className={t.id === recentTxId ? "recent-transaction" : undefined}
                  style={S.txItem}
                >
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
      </>
    ) : selectedSection === "goals" ? (
      <>
        <div style={S.formCard}>
          <div style={S.formTitle}>Goal progress</div>
          <p style={{ color: "#cbd5e1", marginTop: 12 }}>
            You're targeting {currencySymbol}{monthlyGoal.toLocaleString()} in savings this month.
          </p>
          <div style={{ marginTop: 20, background: "rgba(255,255,255,0.05)", borderRadius: 28, height: 18, overflow: "hidden" }}>
            <div
              style={{
                width: `${Math.min(100, Math.round((stats.savings / monthlyGoal) * 100))}%`,
                background: "#22c55e",
                height: "100%",
              }}
            />
          </div>
          <div style={{ color: "#94a3b8", marginTop: 8 }}>
            {monthlyGoal === 0 ? "Set a goal to see progress." : `${Math.round((stats.savings / monthlyGoal) * 100)}% of goal`}
          </div>
        </div>
        <div style={S.formCard}>
          <div style={S.formTitle}>Goal actions</div>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 12, marginTop: 12 }}>
            <button style={S.settingsActionButton} onClick={() => setShowSettings(true)}>
              Update goal settings
            </button>
            <button
              style={{ ...S.settingsActionButton, background: "rgba(34,197,94,0.16)", color: "#d1fae5" }}
              onClick={() => setSelectedSection("transactions")}
            >
              Log a new transaction
            </button>
          </div>
        </div>
      </>
    ) : selectedSection === "insights" ? (
      <>
        <div style={S.sectionHeader}>
          <div style={S.sectionTitle}>Insights</div>
          <div style={{ fontSize: 12, color: "#aaa" }}>Deep dive into your cash flow</div>
        </div>
        <div style={{ display: "grid", gap: 20 }}>
          <div style={S.formCard}>
            <div style={S.formTitle}>Category snapshot</div>
            <div style={{ marginTop: 16, position: "relative", height: 220 }}>
              <Doughnut
                data={{
                  labels: catChartData.labels,
                  datasets: [
                    {
                      data: catChartData.data,
                      backgroundColor: catChartData.colors,
                      borderWidth: 2,
                      hoverOffset: 8,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  cutout: "68%",
                  plugins: { legend: { display: false } },
                }}
              />
            </div>
          </div>
          <div style={S.formCard}>
            <div style={S.formTitle}>Trend analysis</div>
            <div style={{ marginTop: 16, position: "relative", height: 220 }}>
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
                  scales: { x: { grid: { display: false }, ticks: { color: "#cbd5e1" }, border: { display: false } }, y: { grid: { color: "rgba(148,163,184,0.12)" }, ticks: { callback: (v) => fmt(v as number), color: "#cbd5e1" }, border: { display: false } } },
                }}
              />
            </div>
          </div>
        </div>
      </>
    ) : (
      <div style={S.formCard}>
        <div style={S.formTitle}>Export your data</div>
        <p style={{ color: "#cbd5e1", marginTop: 12 }}>
          Download all transactions as CSV for reporting and backup.
        </p>
        <button
          style={{ ...S.settingsActionButton, marginTop: 18 }}
          onClick={() => {
            const csv = [
              ["Date", "Description", "Category", "Type", "Amount"],
              ...transactions.map((t) => [
                fmtDate(t.date),
                t.desc,
                t.category,
                t.type,
                t.amount.toFixed(2),
              ]),
            ]
              .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
              .join("\n");
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = "spendtrace-transactions.csv";
            link.click();
          }}
        >
          Export CSV
        </button>
      </div>
    );

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600&display=swap"
        rel="stylesheet"
      />
      <style>{`
        .recent-transaction {
          animation: tx-slide-in 0.32s ease-out;
        }
        @keyframes tx-slide-in {
          from { opacity: 0; transform: translateY(-12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div style={appStyle}>
        <div style={S.page}>
          <aside style={S.sidebar}>
            <div style={S.sidebarHeader}>
              <div style={S.sidebarTitle}>Navigation</div>
              <div style={S.sidebarLogo}>SpendTrace</div>
              <div style={S.sidebarSubtitle}>Your budget command center in one place.</div>
            </div>
            <nav style={S.sidebarNav}>
              {[
                  { key: "dashboard", label: "Dashboard", icon: "📊" },
                  { key: "transactions", label: "Transactions", icon: "💳" },
                  { key: "goals", label: "Goals", icon: "🎯", badge: "New" },
                  { key: "insights", label: "Insights", icon: "📈" },
                  { key: "export", label: "Export", icon: "⬇️" },
                ].map((item) => {
                  const isActive = selectedSection === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setSelectedSection(item.key as typeof selectedSection)}
                      style={isActive ? { ...S.sidebarItem, ...S.sidebarItemActive } : S.sidebarItem}
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                      {item.badge ? (
                        <span style={S.sidebarBadge}>{item.badge}</span>
                      ) : null}
                    </button>
                  );
                })}
              </nav>
              <div style={S.sidebarFooter}>
                <button
                  type="button"
                  onClick={() => setShowSettings(true)}
                  style={S.sidebarFooterButton}
                >
                  Settings <span style={{ marginLeft: "auto" }}>⚙️</span>
                </button>
              </div>
            </aside>
            <main style={S.content}>
              <div style={S.header}>
                <div>
                  <h1 style={S.h1}>SpendTrace</h1>
                  <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>
                    {selectedSectionLabel}
                  </div>
                </div>
                <span style={S.periodLabel}>{periodLabel}</span>
              </div>

            {sectionContent}
      </main>
      {showSettings && (
        <div style={S.settingsOverlay} onClick={() => setShowSettings(false)}>
          <div style={S.settingsCard} onClick={(e) => e.stopPropagation()}>
            <div style={S.settingsHeader}>
              <div>
                <div style={S.settingsTitle}>SpendTrace Settings</div>
                <div style={S.settingsSubtitle}>Update your theme, goals, currency, and security preferences.</div>
              </div>
              <button
                type="button"
                style={S.settingsClose}
                onClick={() => setShowSettings(false)}
              >
                ✕
              </button>
            </div>

            <div style={S.settingsItem}>
              <div>
                <div style={S.settingsItemTitle}>App Theme: Dark Mode</div>
                <div style={S.settingsItemHint}>Keep the dashboard easy on the eyes.</div>
              </div>
              <button
                type="button"
                onClick={() => setDarkMode((prev) => !prev)}
                style={darkMode ? S.toggleActive : S.toggleInactive}
              >
                <span style={{
                  ...S.toggleThumb,
                  transform: darkMode ? "translateX(21px)" : "translateX(0)",
                }} />
              </button>
            </div>

            <div style={S.settingsOptionRow}>
              <div>
                <div style={S.settingsItemTitle}>Monthly savings goal</div>
                <div style={S.settingsItemHint}>Set a target so SpendTrace can keep you on track.</div>
              </div>
              <input
                type="number"
                min={0}
                style={S.settingsInput}
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                onBlur={() => {
                  const value = parseFloat(goalInput);
                  if (!Number.isNaN(value) && value > 0) {
                    setMonthlyGoal(value);
                    setGoalInput(String(value));
                  } else {
                    setGoalInput(String(monthlyGoal));
                  }
                }}
              />
            </div>

            <div style={S.settingsOptionRow}>
              <div>
                <div style={S.settingsItemTitle}>Currency preferences</div>
                <div style={S.settingsItemHint}>Choose how all amounts are shown in the dashboard.</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {(["USD", "EUR", "GBP"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setCurrency(option)}
                    style={
                      currency === option
                        ? { ...S.currencyChip, ...S.currencyChipActive }
                        : S.currencyChip
                    }
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div style={S.settingsItem}>
              <div>
                <div style={S.settingsItemTitle}>Profile & Security</div>
                <div style={S.settingsItemHint}>Require a passcode to unlock SpendTrace.</div>
              </div>
              <button
                type="button"
                onClick={() => setPasscodeEnabled((prev) => !prev)}
                style={passcodeEnabled ? S.toggleActive : S.toggleInactive}
              >
                <span style={{
                  ...S.toggleThumb,
                  transform: passcodeEnabled ? "translateX(21px)" : "translateX(0)",
                }} />
              </button>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" as const, marginTop: 8 }}>
              <div style={{ ...S.settingsOptionRow, flex: 1, minWidth: 150 }}>
                <div>
                  <div style={S.settingsItemTitle}>Current goal</div>
                  <div style={S.settingsItemHint}>{currencySymbol}{monthlyGoal.toLocaleString()}</div>
                </div>
              </div>
              <div style={{ ...S.settingsOptionRow, flex: 1, minWidth: 150 }}>
                <div>
                  <div style={S.settingsItemTitle}>Currency</div>
                  <div style={S.settingsItemHint}>{currency} selected</div>
                </div>
              </div>
            </div>

            <button type="button" style={S.settingsActionButton} onClick={() => setShowSettings(false)}>
              Save settings
            </button>
          </div>
        </div>
      )}
    </div>
  </div>
</>
  );
}
