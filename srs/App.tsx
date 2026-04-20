import React, { useState, useMemo, useEffect, useCallback } from "react";
import { 
  Plus, 
  Trash2, 
  Wallet, 
  X,
  History,
  ChevronDown,
  ArrowRight
} from "lucide-react";

// --- Types ---

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
  "Other"
] as const;

type Category = typeof CATEGORIES[number];

interface Transaction {
  id: string;
  description: string;
  amount: number;
  category: Category;
  type: TransactionType;
  date: string;
}

// --- Utils ---

const themeStyles = {
  page: {
    backgroundColor: "var(--color-bg-main)",
    color: "var(--color-text-primary)",
  },
  card: {
    backgroundColor: "var(--color-bg-card)",
    borderColor: "var(--color-border-theme)",
  },
  input: {
    backgroundColor: "var(--color-bg-input)",
    borderColor: "var(--color-border-theme)",
    color: "var(--color-text-primary)",
  },
  textPrimary: {
    color: "var(--color-text-primary)",
  },
  textSecondary: {
    color: "var(--color-text-secondary)",
  },
  accentGreen: {
    color: "var(--color-accent-green)",
  },
  accentRed: {
    color: "var(--color-accent-red)",
  },
  borderTheme: {
    borderColor: "var(--color-border-theme)",
  },
  bgMain50: {
    backgroundColor: "rgba(10, 10, 10, 0.5)",
  },
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

const parseDate = (dateStr: string): Date | null => {
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? null : d;
};

const formatDateSafe = (dateStr: string, formatStr: string) => {
  const date = parseDate(dateStr);
  if (!date) return "Invalid Date";

  if (formatStr === "MMMM yyyy") {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }

  if (formatStr === "MMM dd") {
    return date.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
  }

  return date.toLocaleDateString("en-US");
};

const formatMonthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const getTodayIso = () => new Date().toISOString().slice(0, 10);

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const isWithinInterval = (date: Date, start: Date, end: Date) => date >= start && date <= end;

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem("spendtrace_data");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<Category>("Food");
  const [type, setType] = useState<TransactionType>("expense");
  const [date, setDate] = useState(getTodayIso());
  const [filterMonth, setFilterMonth] = useState<string>("all");

  useEffect(() => {
    localStorage.setItem("spendtrace_data", JSON.stringify(transactions));
  }, [transactions]);

  const addTransaction = useCallback(() => {
    const numAmount = parseFloat(amount);
    if (!description.trim() || isNaN(numAmount) || numAmount <= 0) return;

    const newTransaction: Transaction = {
      id: generateId(),
      description: description.trim(),
      amount: numAmount,
      category,
      type,
      date,
    };

    setTransactions(prev => [newTransaction, ...prev]);
    setDescription("");
    setAmount("");
  }, [description, amount, category, type, date]);

  const deleteTransaction = useCallback((id: string) => {
    setTransactions(prev => prev.filter((t) => t.id !== id));
  }, []);

  const filteredTransactions = useMemo(() => {
    if (filterMonth === "all") return transactions;
    try {
      const [year, month] = filterMonth.split("-").map(Number);
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0);

      return transactions.filter((t) => {
        const tDate = parseDate(t.date);
        return tDate !== null && isWithinInterval(tDate, start, end);
      });
    } catch (e) {
      return transactions;
    }
  }, [transactions, filterMonth]);

  const stats = useMemo(() => {
    const income = filteredTransactions
      .filter((t) => t.type === "income")
      .reduce((acc, curr) => acc + curr.amount, 0);
    const expenses = filteredTransactions
      .filter((t) => t.type === "expense")
      .reduce((acc, curr) => acc + curr.amount, 0);
    const balance = income - expenses;
    return { income, expenses, balance };
  }, [filteredTransactions]);

  const chartData = useMemo(() => {
    const expensesByCategory = filteredTransactions
      .filter((t) => t.type === "expense")
      .reduce((acc, curr) => {
        acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
        return acc;
      }, {} as Record<string, number>);

    return Object.entries(expensesByCategory)
      .map(([name, value]) => ({ name, value: value as number }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  const monthOptions = useMemo(() => {
    const months = new Set<string>();
    transactions.forEach((t) => {
      const d = parseDate(t.date);
      if (d) {
        months.add(formatMonthKey(d));
      }
    });
    return Array.from(months).sort().reverse();
  }, [transactions]);

  return (
    <div style={themeStyles.page} className="min-h-screen px-4 py-6">
      <div className="mx-auto max-w-6xl">
        <div style={themeStyles.card} className="rounded-[2rem] border px-6 py-6 shadow-xl">
          <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p style={themeStyles.textSecondary} className="text-sm uppercase tracking-[0.3em]">
                Budget Tracker
              </p>
              <div className="mt-3 flex items-center gap-3">
                <Wallet size={32} />
                <div>
                  <p style={themeStyles.textPrimary} className="text-3xl font-semibold">
                    SpendTrace
                  </p>
                  <p style={themeStyles.textSecondary} className="text-sm">
                    Manage income, expenses, and monthly budgets.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border p-4" style={themeStyles.card}>
                <p style={themeStyles.textSecondary} className="text-xs uppercase tracking-[0.2em]">
                  Income
                </p>
                <p style={themeStyles.accentGreen} className="mt-2 text-2xl font-semibold">
                  {formatCurrency(stats.income)}
                </p>
              </div>
              <div className="rounded-3xl border p-4" style={themeStyles.card}>
                <p style={themeStyles.textSecondary} className="text-xs uppercase tracking-[0.2em]">
                  Expenses
                </p>
                <p style={themeStyles.accentRed} className="mt-2 text-2xl font-semibold">
                  {formatCurrency(stats.expenses)}
                </p>
              </div>
              <div className="rounded-3xl border p-4" style={themeStyles.card}>
                <p style={themeStyles.textSecondary} className="text-xs uppercase tracking-[0.2em]">
                  Balance
                </p>
                <p style={themeStyles.textPrimary} className="mt-2 text-2xl font-semibold">
                  {formatCurrency(stats.balance)}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
            <section className="rounded-[2rem] border p-6" style={themeStyles.card}>
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p style={themeStyles.textSecondary} className="text-sm uppercase tracking-[0.2em]">
                    New transaction
                  </p>
                  <h2 style={themeStyles.textPrimary} className="mt-2 text-2xl font-semibold">
                    Log income or expense
                  </h2>
                </div>
                <button
                  onClick={addTransaction}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  type="button"
                >
                  <Plus size={16} />
                  Add transaction
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm">
                  <span style={themeStyles.textSecondary}>Description</span>
                  <input
                    style={themeStyles.input}
                    className="rounded-3xl border px-4 py-3 outline-none"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="e.g. Freelance work"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  <span style={themeStyles.textSecondary}>Amount</span>
                  <input
                    style={themeStyles.input}
                    className="rounded-3xl border px-4 py-3 outline-none"
                    type="number"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="0.00"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  <span style={themeStyles.textSecondary}>Category</span>
                  <select
                    style={themeStyles.input}
                    className="rounded-3xl border px-4 py-3 outline-none"
                    value={category}
                    onChange={(event) => setCategory(event.target.value as Category)}
                  >
                    {CATEGORIES.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  <span style={themeStyles.textSecondary}>Type</span>
                  <select
                    style={themeStyles.input}
                    className="rounded-3xl border px-4 py-3 outline-none"
                    value={type}
                    onChange={(event) => setType(event.target.value as TransactionType)}
                  >
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm sm:col-span-2">
                  <span style={themeStyles.textSecondary}>Date</span>
                  <input
                    style={themeStyles.input}
                    className="rounded-3xl border px-4 py-3 outline-none"
                    type="date"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                  />
                </label>
              </div>
            </section>

            <aside className="space-y-6">
              <div className="rounded-[2rem] border p-6" style={themeStyles.card}>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p style={themeStyles.textSecondary} className="text-sm uppercase tracking-[0.2em]">
                      Filter by month
                    </p>
                    <p style={themeStyles.textPrimary} className="mt-2 text-lg font-semibold">
                      {filterMonth === "all" ? "All months" : formatDateSafe(`${filterMonth}-01`, "MMMM yyyy")}
                    </p>
                  </div>
                  {filterMonth !== "all" ? (
                    <button
                      onClick={() => setFilterMonth("all")}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-white"
                      type="button"
                      aria-label="Clear filter"
                    >
                      <X size={18} />
                    </button>
                  ) : null}
                </div>
                <select
                  style={themeStyles.input}
                  className="w-full rounded-3xl border px-4 py-3 outline-none"
                  value={filterMonth}
                  onChange={(event) => setFilterMonth(event.target.value)}
                >
                  <option value="all">All months</option>
                  {monthOptions.map((month) => (
                    <option key={month} value={month}>
                      {formatDateSafe(`${month}-01`, "MMMM yyyy")}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-[2rem] border p-6" style={themeStyles.card}>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p style={themeStyles.textSecondary} className="text-sm uppercase tracking-[0.2em]">
                      Top expense categories
                    </p>
                  </div>
                  <History size={20} />
                </div>
                <div className="space-y-3">
                  {chartData.length > 0 ? (
                    chartData.map((entry) => (
                      <div key={entry.name} className="flex items-center justify-between rounded-3xl bg-slate-950/50 px-4 py-3">
                        <span>{entry.name}</span>
                        <span className="font-semibold">{formatCurrency(entry.value)}</span>
                      </div>
                    ))
                  ) : (
                    <p style={themeStyles.textSecondary} className="text-sm">
                      No expense data for selected month.
                    </p>
                  )}
                </div>
              </div>
            </aside>
          </div>

          <section className="mt-6 rounded-[2rem] border p-6" style={themeStyles.card}>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p style={themeStyles.textSecondary} className="text-sm uppercase tracking-[0.2em]">
                  Transaction history
                </p>
                <p style={themeStyles.textPrimary} className="mt-2 text-xl font-semibold">
                  {filteredTransactions.length} records
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-3 text-sm text-white">
                <ChevronDown size={16} />
                Sorted by newest
              </div>
            </div>

            <div className="space-y-3">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex flex-col gap-3 rounded-[1.75rem] border bg-slate-950/50 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p style={themeStyles.textPrimary} className="text-lg font-semibold">
                        {transaction.description}
                      </p>
                      <p style={themeStyles.textSecondary} className="text-sm">
                        {transaction.category} · {formatDateSafe(transaction.date, "MMM dd")}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p
                        style={transaction.type === "income" ? themeStyles.accentGreen : themeStyles.accentRed}
                        className="text-lg font-semibold"
                      >
                        {transaction.type === "income" ? "+" : "-"}{formatCurrency(transaction.amount)}
                      </p>
                      <button
                        onClick={() => deleteTransaction(transaction.id)}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-red-500 text-white"
                        type="button"
                        aria-label={`Delete ${transaction.description}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.75rem] border bg-slate-950/50 p-6 text-center">
                  <p style={themeStyles.textPrimary} className="text-lg font-semibold">
                    No transactions yet
                  </p>
                  <p style={themeStyles.textSecondary} className="mt-2 text-sm">
                    Add an income or expense above to see it appear here.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
