import { ChevronRight, Moon, X } from "lucide-react";

interface SettingsPopoverProps {
  open: boolean;
  darkMode: boolean;
  onClose: () => void;
  onToggleDarkMode: () => void;
  onOpenMonthlyGoals?: () => void;
  onOpenCurrencyPreferences?: () => void;
  onOpenProfileSecurity?: () => void;
}

export function SettingsPopover({
  open,
  darkMode,
  onClose,
  onToggleDarkMode,
  onOpenMonthlyGoals,
  onOpenCurrencyPreferences,
  onOpenProfileSecurity,
}: SettingsPopoverProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm overflow-hidden rounded-xl border border-gray-800 bg-[#1a1d23] shadow-[0_25px_80px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
              SPENDTRACE SETTINGS
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-white/5 hover:text-white"
            aria-label="Close settings"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2 px-5 py-4">
          <button
            type="button"
            onClick={onToggleDarkMode}
            className="flex w-full items-center justify-between rounded-2xl border border-gray-800 bg-white/5 px-4 py-4 text-left text-slate-100 transition hover:bg-white/5"
          >
            <div>
              <div className="text-sm font-semibold">App Theme: Dark Mode</div>
            </div>
            <span
              className="relative inline-flex h-9 w-16 items-center rounded-full bg-slate-800 p-1 transition shadow-[0_0_10px_rgba(74,222,128,0.5)]"
              aria-hidden="true"
            >
              <span
                className={`inline-block h-7 w-7 rounded-full bg-emerald-400 transition-transform duration-200 ${
                  darkMode ? "translate-x-7" : "translate-x-0"
                }`}
              />
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenMonthlyGoals}
            className="flex w-full items-center justify-between rounded-2xl px-4 py-4 text-left text-slate-100 transition hover:bg-white/5"
          >
            <span className="text-sm font-semibold">Set Monthly Goals</span>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </button>

          <button
            type="button"
            onClick={onOpenCurrencyPreferences}
            className="flex w-full items-center justify-between rounded-2xl px-4 py-4 text-left text-slate-100 transition hover:bg-white/5"
          >
            <span className="text-sm font-semibold">Currency Preferences</span>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </button>

          <button
            type="button"
            onClick={onOpenProfileSecurity}
            className="flex w-full items-center justify-between rounded-2xl px-4 py-4 text-left text-slate-100 transition hover:bg-white/5"
          >
            <span className="text-sm font-semibold">Profile & Security</span>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
