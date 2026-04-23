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
 
// ─── Card Type Detection ──────────────────────────────────────────────────────
 
const detectCardType = (number: string): { type: string; icon: string } => {
  const num = number.replace(/\s/g, "");
  if (/^4/.test(num)) return { type: "Visa", icon: "💳" };
  if (/^5[1-5]/.test(num) || /^2(2[2-9][1-9]|[3-6]\d{2}|7[01]\d|720)/.test(num))
    return { type: "Mastercard", icon: "💳" };
  if (/^3[47]/.test(num)) return { type: "Amex", icon: "💳" };
  if (/^6(?:011|5)/.test(num)) return { type: "Discover", icon: "💳" };
  if (/^3(?:0[0-5]|[68])/.test(num)) return { type: "Diners", icon: "💳" };
  if (/^35/.test(num)) return { type: "JCB", icon: "💳" };
  if (num.length === 0) return { type: "", icon: "" };
  return { type: "Card", icon: "💳" };
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
 
// ─── Payment Validation Functions ─────────────────────────────────────────────

const luhnCheck = (num: string): boolean => {
  const digits = num.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let isEven = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i], 10);
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    isEven = !isEven;
  }
  return sum % 10 === 0;
};

const validateCardName = (name: string): boolean => {
  return name.trim().length > 0;
};

const validateCardNumber = (num: string): boolean => {
  return luhnCheck(num) && num.replace(/\s/g, "").length >= 13;
};

const validateExpiry = (expiry: string): boolean => {
  const match = expiry.match(/^(\d{2})\/(\d{2})$/);
  if (!match) return false;
  const month = parseInt(match[1], 10);
  const year = parseInt(match[2], 10);
  if (month < 1 || month > 12) return false;
  const now = new Date();
  const currentYear = now.getFullYear() % 100;
  const currentMonth = now.getMonth() + 1;
  const cardYear = 2000 + year;
  const expiryDate = new Date(cardYear, month, 0);
  return expiryDate >= now;
};

const validateCVV = (cvv: string): boolean => {
  return /^\d{3,4}$/.test(cvv);
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  desktopPage: {
    display: "grid",
    gridTemplateColumns: "260px 1fr",
    gap: 24,
    maxWidth: 1240,
    margin: "0 auto",
    alignItems: "start",
    padding: "2rem 1rem",
  },
  mobilePage: {
    display: "flex",
    flexDirection: "column" as const,
    minHeight: "100vh",
  },
  mobileHeader: {
    padding: "1rem 1rem 0.5rem",
    borderBottom: "1px solid rgba(148,163,184,0.10)",
    background: "#080b1d",
    position: "sticky" as const,
    top: 0,
    zIndex: 10,
  },
  mobileHeaderRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  mobileLogo: {
    fontFamily: "'DM Serif Display', serif",
    color: "#f8fafc",
    fontSize: 22,
    fontWeight: 400,
    letterSpacing: "-0.04em",
  },
  mobileContent: {
    flex: 1,
    overflowY: "auto" as const,
    padding: "1rem",
    paddingBottom: "90px",
    display: "flex",
    flexDirection: "column" as const,
    gap: 16,
  },
  mobileNav: {
    position: "fixed" as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: 72,
    background: "#080b1d",
    borderTop: "1px solid rgba(148,163,184,0.12)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-around",
    padding: "0 8px",
    zIndex: 100,
    paddingBottom: "env(safe-area-inset-bottom, 0px)",
  },
  mobileNavBtn: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: 3,
    padding: "8px 12px",
    borderRadius: 14,
    background: "transparent",
    border: "none",
    cursor: "pointer",
    minWidth: 52,
    fontSize: 18,
    color: "#64748b",
  },
  mobileNavBtnActive: {
    color: "#60a5fa",
    background: "rgba(59,130,246,0.10)",
  },
  mobileNavLabel: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.04em",
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
    position: "fixed" as const,
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0, 0, 0, 0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem 1rem",
    zIndex: 200,
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
    maxHeight: "90vh",
    overflowY: "auto" as const,
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
    flexShrink: 0,
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
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13,
  },
  currencyChipActive: {
    background: "#1D9E75",
    color: "#fff",
    borderColor: "transparent",
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
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 14,
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
  toggleActive: {
    width: 50,
    height: 28,
    borderRadius: 999,
    background: "linear-gradient(135deg, #22c55e, #38bdf8)",
    border: "none",
    position: "relative" as const,
    cursor: "pointer",
    flexShrink: 0,
  },
  toggleInactive: {
    width: 50,
    height: 28,
    borderRadius: 999,
    background: "rgba(148,163,184,0.16)",
    border: "none",
    position: "relative" as const,
    cursor: "pointer",
    flexShrink: 0,
  },
  toggleThumb: {
    position: "absolute" as const,
    top: 3,
    left: 3,
    width: 22,
    height: 22,
    borderRadius: "50%",
    background: "#fff",
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
  // Desktop stats: 4 columns
  statsDesktop: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr 1fr",
    gap: 16,
  },
  // Mobile stats: 2 columns
  statsMobile: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
  },
  stat: {
    background: "rgba(255,255,255,0.04)",
    borderRadius: 20,
    padding: "1rem",
    position: "relative" as const,
    border: "1px solid rgba(148,163,184,0.08)",
  },
  statMain: {
    background: "linear-gradient(180deg, rgba(59,130,246,0.18) 0%, rgba(15,23,42,0.9) 100%)",
    color: "#f8fafc",
    border: "1px solid rgba(59,130,246,0.35)",
    gridColumn: "1 / -1",
  },
  statMainDesktop: {
    background: "linear-gradient(180deg, rgba(59,130,246,0.18) 0%, rgba(15,23,42,0.9) 100%)",
    color: "#f8fafc",
    border: "1px solid rgba(59,130,246,0.35)",
  },
  statLabel: {
    fontSize: 10,
    letterSpacing: "0.12em",
    textTransform: "uppercase" as const,
    color: "#94a3b8",
    marginBottom: 6,
  },
  statValue: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 22,
    fontWeight: 700,
    lineHeight: 1.1,
  },
  statValueHero: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 30,
    fontWeight: 700,
    lineHeight: 1.1,
  },
  statTrend: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    fontSize: 11,
    color: "#cbd5e1",
    flexWrap: "wrap" as const,
  },
  statTrendPositive: { color: "#4ade80" },
  statTrendNegative: { color: "#fb7185" },
  statArrow: {
    width: 16,
    height: 16,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    background: "rgba(59,130,246,0.18)",
    fontSize: 10,
    color: "#eff6ff",
    flexShrink: 0,
  },
  statArrowDown: { background: "rgba(244,63,94,0.18)" },
  formCard: {
    background: "rgba(255,255,255,0.04)",
    borderRadius: 24,
    padding: "1.25rem",
    border: "1px solid rgba(148,163,184,0.08)",
  },
  formTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: "#94a3b8",
    letterSpacing: "0.18em",
    textTransform: "uppercase" as const,
    marginBottom: "1rem",
  },
  formRow3: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr",
    gap: 10,
    marginBottom: 10,
  },
  formRow3Mobile: {
    display: "grid",
    gridTemplateColumns: "1fr",
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
  inputWrapper: { position: "relative" as const, display: "flex", alignItems: "center" },
  inputIcon: { position: "absolute" as const, left: 12, color: "#94a3b8", fontSize: 15 },
  input: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 14,
    padding: "11px 12px 11px 36px",
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    background: "#f8fafc",
    color: "#111827",
    outline: "none",
    width: "100%",
    boxSizing: "border-box" as const,
  },
  inputNoIcon: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 15,
    padding: "12px 14px",
    border: "1.5px solid #d1d5db",
    borderRadius: 10,
    background: "#ffffff",
    color: "#111827",
    outline: "none",
    width: "100%",
    boxSizing: "border-box" as const,
    fontWeight: 500,
    transition: "all 0.2s ease",
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
    transition: "transform .18s ease, background .18s ease",
  },
  addBtnSuccess: { background: "#0f766e" },
  categoryPills: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
    gap: 8,
    padding: "10px",
    borderRadius: 18,
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    maxHeight: 200,
    overflowY: "auto" as const,
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
    boxSizing: "border-box" as const,
  },
  categoryPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
    minHeight: 40,
    padding: "8px 10px",
    borderRadius: 999,
    border: "1px solid #e2e8f0",
    background: "#fff",
    color: "#334155",
    fontSize: 12,
    cursor: "pointer",
    transition: "all .18s ease",
    textAlign: "center" as const,
  },
  categoryPillActive: {
    background: "#1D9E75",
    color: "#fff",
    borderColor: "transparent",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap" as const,
    gap: 10,
    marginBottom: "0.75rem",
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 500,
    color: "#cbd5e1",
    letterSpacing: "0.12em",
    textTransform: "uppercase" as const,
  },
  filterSelect: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13,
    padding: "8px 10px",
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
    width: "100%",
  },
  legend: { display: "flex", flexWrap: "wrap" as const, gap: 8, marginBottom: 10 },
  legendItem: { display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#cbd5e1" },
  legendSwatch: { width: 8, height: 8, borderRadius: 2, flexShrink: 0 },
  txList: { display: "flex", flexDirection: "column" as const, gap: 10 },
  txItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "rgba(255,255,255,0.04)",
    borderRadius: 20,
    padding: "14px 16px",
    border: "1px solid rgba(148,163,184,0.10)",
  },
  txInfo: { flex: 1, minWidth: 0 },
  txDesc: {
    fontSize: 13,
    fontWeight: 600,
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
    color: "#f8fafc",
  },
  txMeta: { display: "flex", gap: 8, alignItems: "center", marginTop: 3, flexWrap: "wrap" as const },
  txCat: {
    fontSize: 11,
    color: "#cbd5e1",
    background: "rgba(255,255,255,0.04)",
    padding: "3px 8px",
    borderRadius: 999,
    border: "1px solid rgba(148,163,184,0.16)",
  },
  txDate: { fontSize: 10, color: "#94a3b8", fontFamily: "'DM Mono', monospace" },
  txAmount: { fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 700, flexShrink: 0 },
  delBtn: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(148,163,184,0.16)",
    cursor: "pointer",
    color: "#cbd5e1",
    padding: 6,
    borderRadius: 10,
    display: "flex",
    flexShrink: 0,
  },
  empty: {
    textAlign: "center" as const,
    padding: "2rem 1rem",
    color: "#cbd5e1",
    fontSize: 13,
    border: "1px dashed rgba(148,163,184,0.28)",
    borderRadius: 20,
    background: "rgba(148,163,184,0.06)",
  },
  emptyTitle: { fontSize: 15, fontWeight: 700, color: "#f8fafc", marginBottom: 6 },
  emptyText: { color: "#94a3b8", fontSize: 12 },
  cardBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 12px",
    borderRadius: 10,
    background: "rgba(59,130,246,0.16)",
    border: "1px solid rgba(59,130,246,0.3)",
    color: "#93c5fd",
    fontSize: 13,
    fontWeight: 600,
    marginTop: 8,
  },
  errorMessage: {
    fontSize: 12,
    color: "#dc2626",
    marginTop: 6,
    fontWeight: 500,
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  inputError: {
    borderColor: "#ef4444 !important" as any,
    background: "rgba(239, 68, 68, 0.05) !important" as any,
  },
  fieldError: { position: "relative" as const },
};
 
// ─── Component ────────────────────────────────────────────────────────────────
export default function App() {
  const [isMobile, setIsMobile] = useState(false);
 
  useEffect(() => {
    const checkSize = () => setIsMobile(window.innerWidth < 768);
    checkSize();
    window.addEventListener("resize", checkSize);
    return () => window.removeEventListener("resize", checkSize);
  }, []);
 
  const [transactions, setTransactions] = useState<Transaction[]>(loadFromStorage);
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<Category>("Food");
  const [txType, setTxType] = useState<TransactionType>("expense");
  const [date, setDate] = useState(getTodayIso);
  const [categorySearch, setCategorySearch] = useState("");
  const [filterMonth, setFilterMonth] = useState("all");
  const [activeTab, setActiveTab] = useState<"chart" | "trends">("chart");
  const [selectedSection, setSelectedSection] = useState<"dashboard" | "transactions" | "goals" | "insights" | "export" | "premium">("dashboard");
  const [showSettings, setShowSettings] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [monthlyGoal, setMonthlyGoal] = useState(1200);
  const [goalInput, setGoalInput] = useState("1200");
  const [currency, setCurrency] = useState<"USD" | "EUR" | "GBP">("USD");
  const [passcodeEnabled, setPasscodeEnabled] = useState(true);
  const [addStatus, setAddStatus] = useState<"idle" | "success">("idle");
  const [recentTxId, setRecentTxId] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"card" | null>(null);
  const [showPaymentSetup, setShowPaymentSetup] = useState(false);
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCVV, setCardCVV] = useState("");
  const [cardNameError, setCardNameError] = useState("");
  const [cardNumberError, setCardNumberError] = useState("");
  const [cardExpiryError, setCardExpiryError] = useState("");
  const [cardCVVError, setCardCVVError] = useState("");
 
  const detectedCard = useMemo(() => detectCardType(cardNumber), [cardNumber]);

  const isFormValid = useMemo(() => {
    return (
      validateCardName(cardName) &&
      validateCardNumber(cardNumber) &&
      validateExpiry(cardExpiry) &&
      validateCVV(cardCVV)
    );
  }, [cardName, cardNumber, cardExpiry, cardCVV]);

  // Validate fields and set error messages
  useEffect(() => {
    if (cardName && !validateCardName(cardName)) {
      setCardNameError("Name cannot be empty");
    } else {
      setCardNameError("");
    }
  }, [cardName]);

  useEffect(() => {
    if (cardNumber) {
      const clean = cardNumber.replace(/\s/g, "");
      if (clean.length < 13) {
        setCardNumberError("Card number must be at least 13 digits");
      } else if (!luhnCheck(cardNumber)) {
        setCardNumberError("Invalid card number (failed Luhn check)");
      } else {
        setCardNumberError("");
      }
    } else {
      setCardNumberError("");
    }
  }, [cardNumber]);

  useEffect(() => {
    if (cardExpiry) {
      if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) {
        setCardExpiryError("Format must be MM/YY");
      } else if (!validateExpiry(cardExpiry)) {
        setCardExpiryError("Card has expired or date is invalid");
      } else {
        setCardExpiryError("");
      }
    } else {
      setCardExpiryError("");
    }
  }, [cardExpiry]);

  useEffect(() => {
    if (cardCVV) {
      if (!validateCVV(cardCVV)) {
        setCardCVVError("CVV must be 3-4 digits");
      } else {
        setCardCVVError("");
      }
    } else {
      setCardCVVError("");
    }
  }, [cardCVV]);
 
  useEffect(() => {
    try { localStorage.setItem("spendtrace_v2", JSON.stringify(transactions)); } catch {}
    const savedPremium = localStorage.getItem("spendtrace_premium");
    if (savedPremium === "true") setIsPremium(true);
    const savedPayment = localStorage.getItem("spendtrace_payment_method");
    if (savedPayment === "card") setPaymentMethod("card");
    const savedCard = localStorage.getItem("spendtrace_card_name");
    if (savedCard) setCardName(savedCard);
  }, [transactions]);
 
  useEffect(() => {
    const savedPremium = localStorage.getItem("spendtrace_premium");
    if (!savedPremium) setSelectedSection("premium");
  }, []);
 
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
    income: number | null; expenses: number | null; balance: number | null; savings: number | null;
  }>(() => {
    const months = Array.from(new Set(transactions.map((t) => monthKey(t.date)))).sort();
    if (months.length < 2) return { income: null, expenses: null, balance: null, savings: null };
    const summary = months.map((month) => {
      const income = transactions.filter((t) => t.type === "income" && monthKey(t.date) === month).reduce((sum, tx) => sum + tx.amount, 0);
      const expenses = transactions.filter((t) => t.type === "expense" && monthKey(t.date) === month).reduce((sum, tx) => sum + tx.amount, 0);
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
    const income = filteredTxs.filter((t) => t.type === "income").reduce((a, c) => a + c.amount, 0);
    const expenses = filteredTxs.filter((t) => t.type === "expense").reduce((a, c) => a + c.amount, 0);
    const balance = income - expenses;
    const savings = Math.max(balance, 0);
    return { income, expenses, balance, savings };
  }, [filteredTxs]);
 
  const catChartData = useMemo(() => {
    const bycat: Record<string, number> = {};
    filteredTxs.filter((t) => t.type === "expense").forEach((t) => {
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
      Math.round(transactions.filter((t) => t.type === "income" && monthKey(t.date) === m).reduce((a, c) => a + c.amount, 0) * 100) / 100
    );
    const expenses = allMonths.map((m) =>
      Math.round(transactions.filter((t) => t.type === "expense" && monthKey(t.date) === m).reduce((a, c) => a + c.amount, 0) * 100) / 100
    );
    return { labels: allMonths.map(fmtMonth), income, expenses };
  }, [transactions]);
 
  const addTransaction = useCallback(() => {
    const num = parseFloat(amount);
    if (!desc.trim() || isNaN(num) || num <= 0 || !date) return;
    const newTransaction: Transaction = { id: generateId(), desc: desc.trim(), amount: num, category, type: txType, date };
    setTransactions((prev) => [newTransaction, ...prev]);
    setDesc(""); setAmount("");
    setAddStatus("success"); setRecentTxId(newTransaction.id);
    window.setTimeout(() => setAddStatus("idle"), 900);
    window.setTimeout(() => setRecentTxId(null), 900);
  }, [desc, amount, category, txType, date]);
 
  const deleteTransaction = useCallback((id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }, []);
 
  const typeBtn = (t: TransactionType) => ({
    flex: 1, padding: "10px", fontSize: 13, fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
    border: "none", cursor: "pointer", transition: "background .15s, color .15s",
    background: txType === t ? (t === "expense" ? "rgba(244,63,94,0.18)" : "rgba(34,197,94,0.18)") : "transparent",
    color: txType === t ? (t === "expense" ? "#fb7185" : "#4ade80") : "#94a3b8",
  } as React.CSSProperties);
 
  const tabBtn = (tab: "chart" | "trends") => ({
    flex: 1, padding: "9px 10px", fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
    border: "none", cursor: "pointer",
    background: activeTab === tab ? "rgba(255,255,255,0.08)" : "transparent",
    color: activeTab === tab ? "#f8fafc" : "#94a3b8",
  } as React.CSSProperties);
 
  const periodLabel = filterMonth === "all" ? "all time" : fmtMonth(filterMonth).toLowerCase();
  const filteredCategories = CATEGORIES.filter((c) => c.toLowerCase().includes(categorySearch.toLowerCase()));
 
  // ─── Shared sub-components ────────────────────────────────────────────────
 
  const StatsGrid = () => (
    <div style={isMobile ? S.statsMobile : S.statsDesktop}>
      {([
        { label: "Balance", value: stats.balance, color: stats.balance >= 0 ? "#4ade80" : "#fb7185", trend: monthPerformance.balance, hero: true },
        { label: "Income", value: stats.income, color: "#22c55e", trend: monthPerformance.income, hero: false },
        { label: "Expenses", value: stats.expenses, color: "#fb7185", trend: monthPerformance.expenses, hero: false },
        { label: "Savings", value: stats.savings, color: "#60a5fa", trend: monthPerformance.savings, hero: false },
      ] as const).map(({ label, value, color, trend, hero }) => (
        <div key={label} style={{ ...S.stat, ...(hero ? (isMobile ? S.statMain : S.statMainDesktop) : {}) }}>
          <div style={S.statLabel}>{label}</div>
          <div style={{ ...(hero ? S.statValueHero : S.statValue), color, wordBreak: "break-all" }}>{fmt(value)}</div>
          <div style={S.statTrend}>
            <span style={{ ...S.statArrow, ...(trend !== null && trend !== undefined && trend < 0 ? S.statArrowDown : {}) }}>
              {trend == null ? "—" : trend >= 0 ? "↑" : "↓"}
            </span>
            <span style={trend != null ? (trend >= 0 ? S.statTrendPositive : S.statTrendNegative) : {}}>
              {trend == null ? "No history" : `${fmtPct(trend)} vs prev`}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
 
  const AddForm = () => (
    <div style={S.formCard}>
      <div style={S.formTitle}>New transaction</div>
      <div style={isMobile ? S.formRow3Mobile : S.formRow3}>
        <div style={S.field}>
          <label style={S.fieldLabel}>Description</label>
          <div style={S.inputWrapper}>
            <span style={S.inputIcon}>📝</span>
            <input style={S.input} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="e.g. Grocery run" onKeyDown={(e) => e.key === "Enter" && addTransaction()} />
          </div>
        </div>
        <div style={S.field}>
          <label style={S.fieldLabel}>Amount</label>
          <div style={S.inputWrapper}>
            <span style={S.inputIcon}>💲</span>
            <input style={{ ...S.input, color: txType === "expense" ? "#E24B4A" : "#1D9E75" }} type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" min={0} step={0.01} />
          </div>
        </div>
        <div style={S.field}>
          <label style={S.fieldLabel}>Date</label>
          <input style={{ ...S.input, paddingLeft: 12 }} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>
      <div style={S.formRow2}>
        <div style={S.field}>
          <label style={S.fieldLabel}>Category</label>
          <input style={S.categorySearchInput} value={categorySearch} onChange={(e) => setCategorySearch(e.target.value)} placeholder="Search category..." />
          <div style={S.categoryPills}>
            {filteredCategories.length > 0 ? (
              filteredCategories.map((c) => (
                <button key={c} type="button" style={category === c ? { ...S.categoryPill, ...S.categoryPillActive } : S.categoryPill} onClick={() => setCategory(c)}>
                  <span style={{ fontSize: 14 }}>{CATEGORY_ICONS[c]}</span>
                  {c}
                </button>
              ))
            ) : (
              <div style={S.emptyText}>No matches.</div>
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
      <button style={{ ...S.addBtn, ...(addStatus === "success" ? S.addBtnSuccess : {}) }} onClick={addTransaction}>
        {addStatus === "success" ? "Added ✓" : "Add transaction"}
      </button>
    </div>
  );
 
  const TxList = () => (
    <div>
      <div style={S.sectionHeader}>
        <div style={S.sectionTitle}>Transactions</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select style={S.filterSelect} value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
            <option value="all">All time</option>
            {monthOptions.map((m) => <option key={m} value={m}>{fmtMonth(m)}</option>)}
          </select>
          <span style={{ fontSize: 11, color: "#64748b" }}>{filteredTxs.length} txns</span>
        </div>
      </div>
      <div style={S.txList}>
        {filteredTxs.length === 0 ? (
          <div style={S.empty}>
            <div style={S.emptyTitle}>Your ledger is waiting.</div>
            <div style={S.emptyText}>Add a purchase, paycheck, or coffee run to bring SpendTrace to life.</div>
          </div>
        ) : (
          filteredTxs.map((t) => (
            <div key={t.id} className={t.id === recentTxId ? "recent-transaction" : undefined} style={S.txItem}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: t.type === "expense" ? "#E24B4A" : "#1D9E75" }} />
              <div style={S.txInfo}>
                <div style={S.txDesc}>{t.desc}</div>
                <div style={S.txMeta}>
                  <span style={S.txCat}>{t.category}</span>
                  <span style={S.txDate}>{fmtDate(t.date)}</span>
                </div>
              </div>
              <span style={{ ...S.txAmount, color: t.type === "expense" ? "#E24B4A" : "#1D9E75" }}>
                {t.type === "expense" ? "−" : "+"}{fmt(t.amount)}
              </span>
              <button style={S.delBtn} onClick={() => deleteTransaction(t.id)} title="Delete">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
 
  const ChartsSection = () => (
    <div>
      <div style={{ ...S.sectionHeader, flexDirection: "column" as const, alignItems: "stretch" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <select style={S.filterSelect} value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
            <option value="all">All time</option>
            {monthOptions.map((m) => <option key={m} value={m}>{fmtMonth(m)}</option>)}
          </select>
        </div>
        <div style={S.tabs}>
          <button style={tabBtn("chart")} onClick={() => setActiveTab("chart")}>By category</button>
          <button style={tabBtn("trends")} onClick={() => setActiveTab("trends")}>Monthly trends</button>
        </div>
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
          <div style={{ position: "relative", height: 200 }}>
            <Doughnut data={{ labels: catChartData.labels, datasets: [{ data: catChartData.data, backgroundColor: catChartData.colors, borderWidth: 2, hoverOffset: 8 }] }}
              options={{ responsive: true, maintainAspectRatio: false, cutout: "68%", plugins: { legend: { display: false }, tooltip: { backgroundColor: "#0f172a", titleColor: "#f8fafc", bodyColor: "#cbd5e1", borderColor: "rgba(148,163,184,0.2)", borderWidth: 1, callbacks: { label: (c) => fmt(c.raw as number) } } } }} />
          </div>
        </>
      )}
      {activeTab === "trends" && (
        <div style={{ position: "relative", height: 200 }}>
          <Line data={{ labels: trendChartData.labels, datasets: [{ label: "Income", data: trendChartData.income, borderColor: "#1D9E75", backgroundColor: "rgba(29,158,117,.1)", tension: 0.3, fill: true, pointRadius: 3, pointBackgroundColor: "#1D9E75" }, { label: "Expenses", data: trendChartData.expenses, borderColor: "#E24B4A", backgroundColor: "rgba(226,75,74,.08)", tension: 0.3, fill: true, pointRadius: 3, pointBackgroundColor: "#E24B4A", borderDash: [4, 3] }] }}
            options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { backgroundColor: "#0f172a", titleColor: "#f8fafc", bodyColor: "#cbd5e1", borderColor: "rgba(148,163,184,0.2)", borderWidth: 1 } }, scales: { x: { grid: { display: false }, ticks: { color: "#cbd5e1", font: { size: 10 } }, border: { display: false } }, y: { grid: { color: "rgba(148,163,184,0.12)" }, ticks: { callback: (v) => fmt(v as number), color: "#cbd5e1", font: { size: 10 } }, border: { display: false } } } }} />
        </div>
      )}
    </div>
  );
 
  const PremiumSection = () => (
    <div style={S.formCard}>
      <div style={S.formTitle}>SpendTrace Premium</div>
      <p style={{ color: "#cbd5e1", marginTop: 12, fontSize: 13 }}>Unlock advanced features and take full control of your finances.</p>
      {isPremium && paymentMethod ? (
        <div style={{ marginTop: 16 }}>
          <p style={{ color: "#4ade80", fontWeight: 600 }}>✓ Premium Unlocked</p>
          <p style={{ color: "#94a3b8", fontSize: 12, marginTop: 6 }}>Cardholder: {cardName}</p>
          <div style={S.cardBadge}>💳 {detectCardType(cardNumber).type} •••• {cardNumber.replace(/\s/g, "").slice(-4)}</div>
          <button style={{ ...S.settingsActionButton, marginTop: 16, background: "#64748b" }} onClick={() => {
            setIsPremium(false); setPaymentMethod(null); setCardName(""); setCardNumber(""); setCardExpiry(""); setCardCVV("");
            localStorage.removeItem("spendtrace_premium"); localStorage.removeItem("spendtrace_payment_method"); localStorage.removeItem("spendtrace_card_name");
          }}>Cancel Subscription</button>
        </div>
      ) : (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, padding: "12px 14px", background: "#1e293b", borderRadius: 12, border: "1px solid rgba(59, 130, 246, 0.5)" }}>
            <span style={{ fontSize: 16 }}>🛡️</span>
            <span style={{ fontSize: 13, color: "#bfdbfe", fontWeight: 500 }}>Demo Mode – No real charges will be made</span>
          </div>
          <p style={{ color: "#cbd5e1", fontSize: 14, marginBottom: 16, fontWeight: 500 }}>Premium: <strong style={{ color: "#4ade80" }}>$19.99/year</strong></p>
          {!showPaymentSetup ? (
            <button style={{ ...S.settingsActionButton, background: "#3b82f6" }} onClick={() => setShowPaymentSetup(true)}>💳 Add Card</button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 14 }}>
              {/* Cardholder Name */}
              <div style={S.field}>
                <label style={{ ...S.fieldLabel, marginBottom: 8 }}>Cardholder Name *</label>
                <input 
                  type="text"
                  style={{ 
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "16px",
                    padding: "13px 14px",
                    border: cardNameError ? "2px solid #ef4444" : "2px solid #d1d5db",
                    borderRadius: "10px",
                    background: cardNameError ? "rgba(239, 68, 68, 0.08)" : "#ffffff",
                    color: "#000000",
                    outline: "none",
                    width: "100%",
                    boxSizing: "border-box" as const,
                    fontWeight: 500,
                    transition: "border-color 0.2s ease",
                  }} 
                  value={cardName} 
                  onChange={(e) => setCardName(e.target.value)} 
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#3b82f6")}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = cardNameError ? "#ef4444" : "#d1d5db";
                  }}
                  placeholder="Holly Davidson" 
                  autoComplete="off"
                />
                {cardNameError && <div style={{ ...S.errorMessage, marginTop: 6 }}>❌ {cardNameError}</div>}
              </div>

              {/* Card Number */}
              <div style={S.field}>
                <label style={{ ...S.fieldLabel, marginBottom: 8 }}>Card Number *</label>
                <div style={{ position: "relative" as const }}>
                  <input 
                    type="text"
                    inputMode="numeric"
                    style={{ 
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "16px",
                      padding: "13px 14px",
                      paddingRight: detectedCard.type ? 110 : 14,
                      border: cardNumberError ? "2px solid #ef4444" : "2px solid #d1d5db",
                      borderRadius: "10px",
                      background: cardNumberError ? "rgba(239, 68, 68, 0.08)" : "#ffffff",
                      color: "#000000",
                      outline: "none",
                      width: "100%",
                      boxSizing: "border-box" as const,
                      fontWeight: 500,
                      transition: "border-color 0.2s ease",
                      WebkitAppearance: "none" as any,
                      appearance: "none" as any,
                    }} 
                    value={cardNumber}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
                      const formatted = raw.replace(/(\d{4})(?=\d)/g, "$1 ");
                      setCardNumber(formatted);
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#3b82f6")}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = cardNumberError ? "#ef4444" : "#d1d5db";
                    }}
                    placeholder="4532 0151 1283 0366" 
                    maxLength={19}
                    autoComplete="off"
                    spellCheck="false"
                  />
                  {detectedCard.type && (
                    <span style={{ position: "absolute" as const, right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 13, fontWeight: 700, color: "#3b82f6", pointerEvents: "none", userSelect: "none" }}>
                      {detectedCard.type}
                    </span>
                  )}
                </div>
                {cardNumberError && <div style={{ ...S.errorMessage, marginTop: 6 }}>❌ {cardNumberError}</div>}
              </div>

              {/* Expiry & CVV */}
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ ...S.field, flex: 1 }}>
                  <label style={{ ...S.fieldLabel, marginBottom: 8 }}>Expiry *</label>
                  <input 
                    type="text"
                    inputMode="numeric"
                    style={{ 
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "16px",
                      padding: "13px 14px",
                      border: cardExpiryError ? "2px solid #ef4444" : "2px solid #d1d5db",
                      borderRadius: "10px",
                      background: cardExpiryError ? "rgba(239, 68, 68, 0.08)" : "#ffffff",
                      color: "#000000",
                      outline: "none",
                      width: "100%",
                      boxSizing: "border-box" as const,
                      fontWeight: 500,
                      transition: "border-color 0.2s ease",
                    }} 
                    value={cardExpiry} 
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, "");
                      if (val.length >= 2) val = val.slice(0, 2) + "/" + val.slice(2, 4);
                      setCardExpiry(val);
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#3b82f6")}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = cardExpiryError ? "#ef4444" : "#d1d5db";
                    }}
                    placeholder="12/26" 
                    maxLength={5}
                    autoComplete="off"
                    spellCheck="false"
                  />
                  {cardExpiryError && <div style={{ ...S.errorMessage, marginTop: 6, fontSize: 11 }}>❌ {cardExpiryError}</div>}
                </div>
                <div style={{ ...S.field, flex: 1 }}>
                  <label style={{ ...S.fieldLabel, marginBottom: 8 }}>CVV *</label>
                  <input 
                    type="text"
                    inputMode="numeric"
                    style={{ 
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "16px",
                      padding: "13px 14px",
                      border: cardCVVError ? "2px solid #ef4444" : "2px solid #d1d5db",
                      borderRadius: "10px",
                      background: cardCVVError ? "rgba(239, 68, 68, 0.08)" : "#ffffff",
                      color: "#000000",
                      outline: "none",
                      width: "100%",
                      boxSizing: "border-box" as const,
                      fontWeight: 500,
                      transition: "border-color 0.2s ease",
                      letterSpacing: "3px",
                    }} 
                    value={cardCVV} 
                    onChange={(e) => setCardCVV(e.target.value.replace(/\D/g, ""))} 
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#3b82f6")}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = cardCVVError ? "#ef4444" : "#d1d5db";
                    }}
                    placeholder="123" 
                    maxLength={4}
                    autoComplete="off"
                    spellCheck="false"
                  />
                  {cardCVVError && <div style={{ ...S.errorMessage, marginTop: 6, fontSize: 11 }}>❌ {cardCVVError}</div>}
                </div>
              </div>

              {/* Action Buttons */}
              <button 
                style={{ 
                  ...S.settingsActionButton, 
                  background: isFormValid ? "#10b981" : "#d1d5db",
                  color: isFormValid ? "#fff" : "#6b7280",
                  marginTop: 8,
                  cursor: isFormValid ? "pointer" : "not-allowed",
                  fontWeight: 600,
                  fontSize: 15,
                  transition: "all 0.2s ease"
                }} 
                onClick={() => {
                  if (isFormValid) {
                    setPaymentMethod("card");
                    setIsPremium(true);
                    localStorage.setItem("spendtrace_payment_method", "card");
                    localStorage.setItem("spendtrace_premium", "true");
                    localStorage.setItem("spendtrace_card_name", cardName);
                    setShowPaymentSetup(false);
                  }
                }}
                disabled={!isFormValid}
              >
                {isFormValid ? "✓ Confirm Payment" : "Complete form to continue"}
              </button>
              <button 
                style={{ ...S.settingsActionButton, marginTop: 0, background: "#6b7280", color: "#fff" }} 
                onClick={() => setShowPaymentSetup(false)}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
 
  const premiumPaywall = (
    <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", minHeight: "50vh", padding: "1.5rem", textAlign: "center" as const }}>
      <div style={{ maxWidth: 360, background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 24, padding: "1.5rem" }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>🔒</div>
        <h2 style={{ color: "#f8fafc", fontSize: 18, marginBottom: 10 }}>Premium Access Required</h2>
        <p style={{ color: "#cbd5e1", marginBottom: 16, fontSize: 13 }}>Set up a card to unlock full access to SpendTrace.</p>
        <button style={{ ...S.settingsActionButton, marginTop: 0 }} onClick={() => setSelectedSection("premium")}>Unlock Premium</button>
      </div>
    </div>
  );
 
  const sectionContent = () => {
    if (selectedSection === "dashboard") return (
      <>
        <StatsGrid />
        <AddForm />
        <ChartsSection />
        <TxList />
      </>
    );
    if (selectedSection === "transactions") return (
      <>
        <AddForm />
        <TxList />
      </>
    );
    if (selectedSection === "goals") return (
      <>
        <div style={S.formCard}>
          <div style={S.formTitle}>Goal progress</div>
          <p style={{ color: "#cbd5e1", marginTop: 8, fontSize: 13 }}>Targeting {currencySymbol}{monthlyGoal.toLocaleString()} in savings this month.</p>
          <div style={{ marginTop: 16, background: "rgba(255,255,255,0.05)", borderRadius: 20, height: 14, overflow: "hidden" }}>
            <div style={{ width: `${Math.min(100, Math.round((stats.savings / monthlyGoal) * 100))}%`, background: "#22c55e", height: "100%", borderRadius: 20 }} />
          </div>
          <div style={{ color: "#94a3b8", marginTop: 8, fontSize: 12 }}>
            {monthlyGoal === 0 ? "Set a goal to see progress." : `${Math.round((stats.savings / monthlyGoal) * 100)}% of goal`}
          </div>
        </div>
        <div style={S.formCard}>
          <button style={S.settingsActionButton} onClick={() => setShowSettings(true)}>Update goal settings</button>
          <button style={{ ...S.settingsActionButton, marginTop: 8, background: "rgba(34,197,94,0.16)", color: "#d1fae5" }} onClick={() => setSelectedSection("transactions")}>Log a transaction</button>
        </div>
      </>
    );
    if (selectedSection === "insights") return (
      <>
        <div style={S.formCard}>
          <div style={S.formTitle}>Category snapshot</div>
          <div style={{ marginTop: 12, position: "relative" as const, height: 200 }}>
            <Doughnut data={{ labels: catChartData.labels, datasets: [{ data: catChartData.data, backgroundColor: catChartData.colors, borderWidth: 2, hoverOffset: 8 }] }} options={{ responsive: true, maintainAspectRatio: false, cutout: "68%", plugins: { legend: { display: false } } }} />
          </div>
        </div>
        <div style={S.formCard}>
          <div style={S.formTitle}>Trend analysis</div>
          <div style={{ marginTop: 12, position: "relative" as const, height: 200 }}>
            <Line data={{ labels: trendChartData.labels, datasets: [{ label: "Income", data: trendChartData.income, borderColor: "#1D9E75", backgroundColor: "rgba(29,158,117,.1)", tension: 0.3, fill: true, pointRadius: 3, pointBackgroundColor: "#1D9E75" }, { label: "Expenses", data: trendChartData.expenses, borderColor: "#E24B4A", backgroundColor: "rgba(226,75,74,.08)", tension: 0.3, fill: true, pointRadius: 3, pointBackgroundColor: "#E24B4A", borderDash: [4, 3] }] }}
              options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { color: "#cbd5e1", font: { size: 10 } }, border: { display: false } }, y: { grid: { color: "rgba(148,163,184,0.12)" }, ticks: { callback: (v) => fmt(v as number), color: "#cbd5e1", font: { size: 10 } }, border: { display: false } } } }} />
          </div>
        </div>
      </>
    );
    if (selectedSection === "export") return (
      <div style={S.formCard}>
        <div style={S.formTitle}>Export data</div>
        <p style={{ color: "#cbd5e1", marginTop: 8, fontSize: 13 }}>Download all transactions as CSV for reporting and backup.</p>
        <button style={{ ...S.settingsActionButton, marginTop: 12 }} onClick={() => {
          const csv = [["Date", "Description", "Category", "Type", "Amount"], ...transactions.map((t) => [fmtDate(t.date), t.desc, t.category, t.type, t.amount.toFixed(2)])].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
          const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
          const link = document.createElement("a");
          link.href = URL.createObjectURL(blob); link.download = "spendtrace-transactions.csv"; link.click();
        }}>Export CSV</button>
      </div>
    );
    if (selectedSection === "premium") return <PremiumSection />;
    return null;
  };
 
  const NAV_ITEMS = [
    { key: "dashboard", label: "Home", icon: "📊" },
    { key: "transactions", label: "Txns", icon: "💳" },
    { key: "goals", label: "Goals", icon: "🎯" },
    { key: "insights", label: "Insights", icon: "📈" },
    { key: "premium", label: "Premium", icon: "⭐" },
  ] as const;
 
  // ─── Render ───────────────────────────────────────────────────────────────
 
  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
      <style>{`
        .recent-transaction { animation: tx-slide-in 0.32s ease-out; }
        @keyframes tx-slide-in { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; }
        select option { background: #0b1229; color: #e2e8f0; }
      `}</style>
 
      <div style={appStyle}>
        {isMobile ? (
          // ─── MOBILE LAYOUT ─────────────────────────────────────────────────
          <div style={S.mobilePage}>
            <div style={S.mobileHeader}>
              <div style={S.mobileHeaderRow}>
                <span style={S.mobileLogo}>SpendTrace</span>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 11, color: "#64748b", fontFamily: "'DM Mono', monospace" }}>{periodLabel}</span>
                  <button type="button" style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 18 }} onClick={() => setShowSettings(true)}>⚙️</button>
                </div>
              </div>
            </div>
 
            <div style={S.mobileContent}>
              {!isPremium && selectedSection !== "premium" ? premiumPaywall : sectionContent()}
            </div>
 
            {/* Bottom Tab Bar */}
            <nav style={S.mobileNav}>
              {NAV_ITEMS.map((item) => {
                const isActive = selectedSection === item.key;
                return (
                  <button key={item.key} type="button"
                    style={{ ...S.mobileNavBtn, ...(isActive ? S.mobileNavBtnActive : {}) }}
                    onClick={() => setSelectedSection(item.key as typeof selectedSection)}>
                    <span style={{ fontSize: 20, lineHeight: 1 }}>{item.icon}</span>
                    <span style={{ ...S.mobileNavLabel, color: isActive ? "#60a5fa" : "#64748b" }}>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        ) : (
          // ─── DESKTOP LAYOUT ────────────────────────────────────────────────
          <div style={S.desktopPage}>
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
                  { key: "premium", label: "Premium", icon: "⭐" },
                ].map((item) => {
                  const isActive = selectedSection === item.key;
                  return (
                    <button key={item.key} type="button" onClick={() => setSelectedSection(item.key as typeof selectedSection)}
                      style={isActive ? { ...S.sidebarItem, ...S.sidebarItemActive } : S.sidebarItem}>
                      <span>{item.icon}</span>
                      <span style={{ flex: 1, textAlign: "left" as const }}>{item.label}</span>
                      {item.badge && <span style={S.sidebarBadge}>{item.badge}</span>}
                    </button>
                  );
                })}
              </nav>
              <div style={S.sidebarFooter}>
                <button type="button" onClick={() => setShowSettings(true)} style={S.sidebarFooterButton}>
                  Settings <span style={{ marginLeft: "auto" }}>⚙️</span>
                </button>
              </div>
            </aside>
 
            <main style={{ ...S.content, padding: "2rem 0" }}>
              <div style={S.header}>
                <div>
                  <h1 style={S.h1}>SpendTrace</h1>
                  <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>
                    {selectedSection.charAt(0).toUpperCase() + selectedSection.slice(1)}
                  </div>
                </div>
                <span style={S.periodLabel}>{periodLabel}</span>
              </div>
              {!isPremium && selectedSection !== "premium" ? premiumPaywall : sectionContent()}
            </main>
          </div>
        )}
 
        {/* Settings Modal */}
        {showSettings && (
          <div style={S.settingsOverlay} onClick={() => setShowSettings(false)}>
            <div style={S.settingsCard} onClick={(e) => e.stopPropagation()}>
              <div style={S.settingsHeader}>
                <div>
                  <div style={S.settingsTitle}>SpendTrace Settings</div>
                  <div style={S.settingsSubtitle}>Update your theme, goals, currency, and security preferences.</div>
                </div>
                <button type="button" style={S.settingsClose} onClick={() => setShowSettings(false)}>✕</button>
              </div>
 
              <div style={S.settingsItem}>
                <div>
                  <div style={S.settingsItemTitle}>App Theme: Dark Mode</div>
                  <div style={S.settingsItemHint}>Keep the dashboard easy on the eyes.</div>
                </div>
                <button type="button" onClick={() => setDarkMode((p) => !p)} style={darkMode ? S.toggleActive : S.toggleInactive}>
                  <span style={{ ...S.toggleThumb, transform: darkMode ? "translateX(21px)" : "translateX(0)" }} />
                </button>
              </div>
 
              <div style={S.settingsOptionRow}>
                <div>
                  <div style={S.settingsItemTitle}>Monthly savings goal</div>
                  <div style={S.settingsItemHint}>Set a target to stay on track.</div>
                </div>
                <input type="number" min={0} style={S.settingsInput} value={goalInput} onChange={(e) => setGoalInput(e.target.value)}
                  onBlur={() => {
                    const value = parseFloat(goalInput);
                    if (!Number.isNaN(value) && value > 0) { setMonthlyGoal(value); setGoalInput(String(value)); }
                    else setGoalInput(String(monthlyGoal));
                  }} />
              </div>
 
              <div style={S.settingsOptionRow}>
                <div>
                  <div style={S.settingsItemTitle}>Currency</div>
                  <div style={S.settingsItemHint}>Choose how amounts are shown.</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {(["USD", "EUR", "GBP"] as const).map((option) => (
                    <button key={option} type="button" onClick={() => setCurrency(option)} style={currency === option ? { ...S.currencyChip, ...S.currencyChipActive } : S.currencyChip}>{option}</button>
                  ))}
                </div>
              </div>
 
              <div style={S.settingsItem}>
                <div>
                  <div style={S.settingsItemTitle}>Profile & Security</div>
                  <div style={S.settingsItemHint}>Require a passcode to unlock.</div>
                </div>
                <button type="button" onClick={() => setPasscodeEnabled((p) => !p)} style={passcodeEnabled ? S.toggleActive : S.toggleInactive}>
                  <span style={{ ...S.toggleThumb, transform: passcodeEnabled ? "translateX(21px)" : "translateX(0)" }} />
                </button>
              </div>
 
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" as const }}>
                <div style={{ ...S.settingsOptionRow, flex: 1, minWidth: 120 }}>
                  <div>
                    <div style={S.settingsItemTitle}>Goal</div>
                    <div style={S.settingsItemHint}>{currencySymbol}{monthlyGoal.toLocaleString()}</div>
                  </div>
                </div>
                <div style={{ ...S.settingsOptionRow, flex: 1, minWidth: 120 }}>
                  <div>
                    <div style={S.settingsItemTitle}>Currency</div>
                    <div style={S.settingsItemHint}>{currency}</div>
                  </div>
                </div>
              </div>
 
              <button type="button" style={S.settingsActionButton} onClick={() => setShowSettings(false)}>Save settings</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}