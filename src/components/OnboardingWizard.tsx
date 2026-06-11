import { useState, useEffect, useId } from 'react';
import type { ReactNode } from 'react';
import { TrendingUp, Home, BarChart3, Goal, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';

// ---------------------------------------------------------------------------
// Safe localStorage helpers
// ---------------------------------------------------------------------------

function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Silently fail — localStorage may be full or disabled
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type GoalOption = 'retirement' | 'housing' | 'wealth' | 'passive_income';
type RiskTolerance = '保守' | '穩健' | '積極';

interface GoalCardItem {
  id: GoalOption;
  label: string;
  icon: ReactNode;
}

interface RiskOptionItem {
  id: RiskTolerance;
  label: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GOAL_CARDS: GoalCardItem[] = [
  { id: 'retirement', label: '💰 退休規劃', icon: <TrendingUp className="w-6 h-6" /> },
  { id: 'housing', label: '🏠 購屋基金', icon: <Home className="w-6 h-6" /> },
  { id: 'wealth', label: '📈 財富累積', icon: <BarChart3 className="w-6 h-6" /> },
  { id: 'passive_income', label: '🎯 被動收入', icon: <Goal className="w-6 h-6" /> },
];

const RISK_OPTIONS: RiskOptionItem[] = [
  { id: '保守', label: '保守 🛡️' },
  { id: '穩健', label: '穩健 ⚖️' },
  { id: '積極', label: '積極 🚀' },
];

const STEP_LABELS = ['目標選擇', '財務現況', '目標設定', '總結'];

const INPUT_CLASS =
  'w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/70 backdrop-blur-sm text-sm font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400 transition-all';

const LABEL_CLASS = 'block text-xs font-bold text-slate-500 mb-1.5';

const ERROR_CLASS = 'text-xs font-semibold text-red-500 mt-1';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const OnboardingWizard = () => {
  const { state, updateRetirementConfig, updatePortfolioAsset } = useApp();

  // --- Wizard visibility ----------------------------------------------------
  const [showWizard, setShowWizard] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  // --- Active step ----------------------------------------------------------
  const [step, setStep] = useState(0);

  // --- Step 1 — Goal --------------------------------------------------------
  const [goal, setGoal] = useState<GoalOption | null>(null);

  // --- Step 2 — Financial status --------------------------------------------
  const [age, setAge] = useState(30);
  const [monthlyIncome, setMonthlyIncome] = useState(60000);
  const [monthlySavings, setMonthlySavings] = useState(20000);
  const [totalAssets, setTotalAssets] = useState(1000000);

  // --- Step 3 — Retirement goal ---------------------------------------------
  const [retirementAge, setRetirementAge] = useState(60);
  const [monthlySpending, setMonthlySpending] = useState(50000);
  const [riskTolerance, setRiskTolerance] = useState<RiskTolerance | null>(null);

  // --- Accessibility IDs (stable per instance) ------------------------------
  const ageId = useId();
  const monthlyIncomeId = useId();
  const monthlySavingsId = useId();
  const totalAssetsId = useId();

  // --- Detect onboarding completion ------------------------------------------
  useEffect(() => {
    const completed = safeGetItem('onboarding_completed');
    if (completed !== 'true') {
      setShowWizard(true);
    }
  }, []);

  // --- Derived values --------------------------------------------------------
  const annualSavings = monthlySavings * 12;
  const fireTarget = monthlySpending * 12 * 25;
  const yearsToRetirement = retirementAge - age;

  // --- Step 2 validation -----------------------------------------------------
  const getStep2Errors = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (age < 18 || age > 80) {
      errs.age = '年齡須介於 18 歲至 80 歲之間';
    }
    if (monthlyIncome <= 0) {
      errs.monthlyIncome = '月收入必須大於 0';
    }
    if (monthlySavings > monthlyIncome) {
      errs.monthlySavings = '月儲蓄金額不能超過月收入';
    }
    return errs;
  };

  const step2Errors = getStep2Errors();

  const canGoNext = (() => {
    switch (step) {
      case 0:
        return goal !== null;
      case 1:
        return Object.keys(step2Errors).length === 0;
      case 2:
        return retirementAge > age && monthlySpending > 0 && riskTolerance !== null;
      case 3:
        return true;
      default:
        return false;
    }
  })();

  // --- Navigation ------------------------------------------------------------

  const handleNext = () => {
    if (step < 3) setStep((s) => s + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const handleComplete = () => {
    // Push values into app context
    updateRetirementConfig('age', age);
    updateRetirementConfig('monthly_spending', monthlySpending);
    updateRetirementConfig('monthly_invest', monthlySavings);
    updatePortfolioAsset('cash', totalAssets);

    // Mark onboarding as complete in localStorage
    safeSetItem('onboarding_completed', 'true');

    // Manually persist the full state snapshot so it survives reload
    const updatedState = {
      ...state,
      retirement: {
        ...state.retirement,
        age,
        monthly_spending: monthlySpending,
        monthly_invest: monthlySavings,
      },
      portfolio: {
        ...state.portfolio,
        cash: totalAssets,
      },
    };
    safeSetItem('aiPortfolio', JSON.stringify(updatedState));

    // Close the wizard — user sees the main app update from context changes
    setIsComplete(true);
  };

  // --- Keyboard navigation ---------------------------------------------------
  useEffect(() => {
    if (!showWizard) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture input while user is typing in a form field
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return;
      }

      if (e.key === 'ArrowRight' && step < 3 && canGoNext) {
        e.preventDefault();
        setStep((s) => s + 1);
      } else if (e.key === 'ArrowLeft' && step > 0) {
        e.preventDefault();
        setStep((s) => s - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showWizard, step, canGoNext]);

  // --- Render: nothing if already onboarded or completed --------------------
  if (!showWizard || isComplete) return null;

  // ============================================================================
  // Step Rendering
  // ============================================================================

  const renderStep1 = () => (
    <div className="space-y-6" key="step1">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-sky-400 text-white shadow-lg shadow-blue-500/20 mb-2">
          <TrendingUp className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">
          歡迎來到 AI 資產配置戰略總覽
        </h2>
        <p className="text-sm font-semibold text-slate-500">
          設定您的財務目標，開始您的投資旅程
        </p>
      </div>

      {/* Goal cards */}
      <div className="grid grid-cols-2 gap-3">
        {GOAL_CARDS.map((card) => {
          const isSelected = goal === card.id;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => setGoal(card.id)}
              aria-label={card.label}
              className={`
                relative flex flex-col items-center gap-2.5 p-5 rounded-2xl border-2 text-center
                transition-all duration-200 cursor-pointer select-none
                ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50/80 shadow-md shadow-blue-500/10 scale-[1.02]'
                    : 'border-slate-200/70 bg-white/60 hover:border-slate-300 hover:bg-white/80 hover:shadow-sm'
                }
              `}
            >
              {/* check mark */}
              {isSelected && (
                <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center">
                  <Check className="w-3 h-3 stroke-[3]" />
                </span>
              )}

              <span
                className={`transition-colors ${
                  isSelected ? 'text-blue-600' : 'text-slate-400'
                }`}
              >
                {card.icon}
              </span>
              <span
                className={`text-sm font-bold leading-tight ${
                  isSelected ? 'text-blue-700' : 'text-slate-600'
                }`}
              >
                {card.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderStep2 = () => {
    const formatNumber = (val: number) => val.toLocaleString();
    const errors = getStep2Errors();

    return (
      <div className="space-y-5" key="step2">
        <div className="text-center space-y-1">
          <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">
            💰 財務現況
          </h2>
          <p className="text-xs font-semibold text-slate-500">
            填寫您的財務基本資料，幫助我們為您打造專屬計劃
          </p>
        </div>

        {/* Input fields */}
        <div className="space-y-4">
          {/* Age */}
          <div>
            <label htmlFor={ageId} className={LABEL_CLASS}>
              目前年齡
            </label>
            <input
              id={ageId}
              type="number"
              min={18}
              max={80}
              value={age}
              onChange={(e) => setAge(Number(e.target.value))}
              aria-invalid={errors.age ? true : undefined}
              aria-describedby={errors.age ? `${ageId}-error` : undefined}
              className={`${INPUT_CLASS} ${errors.age ? 'border-red-400 focus:border-red-400 focus:ring-red-400/40' : ''}`}
            />
            {errors.age && (
              <p id={`${ageId}-error`} className={ERROR_CLASS} role="alert">
                {errors.age}
              </p>
            )}
          </div>

          {/* Monthly income */}
          <div>
            <label htmlFor={monthlyIncomeId} className={LABEL_CLASS}>
              月收入
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                NT$
              </span>
              <input
                id={monthlyIncomeId}
                type="number"
                min={0}
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(Math.max(0, Number(e.target.value)))}
                aria-invalid={errors.monthlyIncome ? true : undefined}
                aria-describedby={errors.monthlyIncome ? `${monthlyIncomeId}-error` : undefined}
                className={`${INPUT_CLASS} pl-14 ${errors.monthlyIncome ? 'border-red-400 focus:border-red-400 focus:ring-red-400/40' : ''}`}
              />
            </div>
            {errors.monthlyIncome && (
              <p id={`${monthlyIncomeId}-error`} className={ERROR_CLASS} role="alert">
                {errors.monthlyIncome}
              </p>
            )}
          </div>

          {/* Monthly savings */}
          <div>
            <label htmlFor={monthlySavingsId} className={LABEL_CLASS}>
              月儲蓄金額
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                NT$
              </span>
              <input
                id={monthlySavingsId}
                type="number"
                min={0}
                value={monthlySavings}
                onChange={(e) => setMonthlySavings(Math.max(0, Number(e.target.value)))}
                aria-invalid={errors.monthlySavings ? true : undefined}
                aria-describedby={errors.monthlySavings ? `${monthlySavingsId}-error` : undefined}
                className={`${INPUT_CLASS} pl-14 ${errors.monthlySavings ? 'border-red-400 focus:border-red-400 focus:ring-red-400/40' : ''}`}
              />
            </div>
            {errors.monthlySavings && (
              <p id={`${monthlySavingsId}-error`} className={ERROR_CLASS} role="alert">
                {errors.monthlySavings}
              </p>
            )}
          </div>

          {/* Total assets */}
          <div>
            <label htmlFor={totalAssetsId} className={LABEL_CLASS}>
              現有資產總額
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                NT$
              </span>
              <input
                id={totalAssetsId}
                type="number"
                min={0}
                value={totalAssets}
                onChange={(e) => setTotalAssets(Math.max(0, Number(e.target.value)))}
                className={`${INPUT_CLASS} pl-14`}
              />
            </div>
          </div>
        </div>

        {/* Annual savings summary */}
        <div className="rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/60 p-4 text-center">
          <p className="text-xs font-bold text-emerald-600 mb-1">年度總儲蓄金額</p>
          <p className="text-2xl font-extrabold text-emerald-700">
            NT$ {formatNumber(annualSavings)}
          </p>
          <p className="text-[10px] font-semibold text-emerald-500 mt-1">
            {monthlySavings.toLocaleString()} / 月 × 12 個月
          </p>
        </div>
      </div>
    );
  };

  const renderStep3 = () => {
    const fireNumber = monthlySpending * 12 * 25;

    return (
      <div className="space-y-6" key="step3">
        <div className="text-center space-y-1">
          <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">
            🏖️ 財務目標設定
          </h2>
          <p className="text-xs font-semibold text-slate-500">
            設定退休目標與風險承受度
          </p>
        </div>

        {/* Retirement age slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className={LABEL_CLASS}>目標退休年齡</label>
            <span className="text-sm font-extrabold text-blue-600 bg-blue-50 px-3 py-0.5 rounded-full">
              {retirementAge} 歲
            </span>
          </div>
          <input
            type="range"
            min={35}
            max={75}
            value={retirementAge}
            onChange={(e) => setRetirementAge(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer 
                       accent-blue-500 [&::-webkit-slider-thumb]:appearance-none 
                       [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 
                       [&::-webkit-slider-thumb]:rounded-full 
                       [&::-webkit-slider-thumb]:bg-gradient-to-r 
                       [&::-webkit-slider-thumb]:from-blue-500 
                       [&::-webkit-slider-thumb]:to-sky-400 
                       [&::-webkit-slider-thumb]:shadow-md 
                       [&::-webkit-slider-thumb]:shadow-blue-500/30 
                       [&::-webkit-slider-thumb]:cursor-pointer 
                       [&::-webkit-slider-thumb]:border-2 
                       [&::-webkit-slider-thumb]:border-white"
          />
          <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-1">
            <span>35 歲</span>
            <span>75 歲</span>
          </div>
        </div>

        {/* Desired monthly spending */}
        <div>
          <label className={LABEL_CLASS}>期望退休後月生活費</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
              NT$
            </span>
            <input
              type="number"
              min={0}
              value={monthlySpending}
              onChange={(e) => setMonthlySpending(Math.max(0, Number(e.target.value)))}
              className={`${INPUT_CLASS} pl-14`}
            />
          </div>
        </div>

        {/* Risk tolerance */}
        <div>
          <label className={LABEL_CLASS}>風險承受度</label>
          <div className="flex gap-2">
            {RISK_OPTIONS.map((opt) => {
              const isSelected = riskTolerance === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setRiskTolerance(opt.id)}
                  aria-label={opt.label}
                  className={`
                    flex-1 py-2.5 px-3 rounded-xl text-xs font-bold border-2
                    transition-all duration-200 cursor-pointer select-none
                    ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/80 text-blue-700 shadow-sm shadow-blue-500/10'
                        : 'border-slate-200/70 bg-white/60 text-slate-500 hover:border-slate-300 hover:bg-white/80'
                    }
                  `}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* FIRE target */}
        <div className="rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200/60 p-4 text-center space-y-1">
          <p className="text-xs font-bold text-indigo-600">FIRE 財務自由目標金額</p>
          <p className="text-2xl font-extrabold text-indigo-700">
            NT$ {fireNumber.toLocaleString()}
          </p>
          <p className="text-[10px] font-semibold text-indigo-500">
            {monthlySpending.toLocaleString()} / 月 × 12 個月 × 25 倍
          </p>
        </div>
      </div>
    );
  };

  const renderStep4 = () => {
    const goalLabel = goal
      ? GOAL_CARDS.find((c) => c.id === goal)?.label ?? '未選擇'
      : '未選擇';

    return (
      <div className="space-y-6" key="step4">
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-400 text-white shadow-lg shadow-emerald-500/20 mb-2">
            <Check className="w-7 h-7 stroke-[2.5]" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">
            設定完成！
          </h2>
          <p className="text-sm font-semibold text-slate-500">
            以下為您的財務規劃摘要
          </p>
        </div>

        {/* Summary card */}
        <div className="rounded-2xl bg-white/80 backdrop-blur-md border border-slate-200/70 shadow-lg shadow-slate-100/40 divide-y divide-slate-100">
          {/* Goal */}
          <div className="flex items-center justify-between px-5 py-3.5">
            <span className="text-xs font-bold text-slate-500">投資目標</span>
            <span className="text-sm font-extrabold text-slate-800">{goalLabel}</span>
          </div>

          {/* Current age */}
          <div className="flex items-center justify-between px-5 py-3.5">
            <span className="text-xs font-bold text-slate-500">目前年齡</span>
            <span className="text-sm font-extrabold text-slate-800">{age} 歲</span>
          </div>

          {/* Monthly income */}
          <div className="flex items-center justify-between px-5 py-3.5">
            <span className="text-xs font-bold text-slate-500">月收入</span>
            <span className="text-sm font-extrabold text-slate-800">
              NT$ {monthlyIncome.toLocaleString()}
            </span>
          </div>

          {/* Monthly savings */}
          <div className="flex items-center justify-between px-5 py-3.5">
            <span className="text-xs font-bold text-slate-500">月儲蓄金額</span>
            <span className="text-sm font-extrabold text-slate-800">
              NT$ {monthlySavings.toLocaleString()}
            </span>
          </div>

          {/* Total assets */}
          <div className="flex items-center justify-between px-5 py-3.5">
            <span className="text-xs font-bold text-slate-500">現有資產總額</span>
            <span className="text-sm font-extrabold text-slate-800">
              NT$ {totalAssets.toLocaleString()}
            </span>
          </div>

          {/* Retirement age */}
          <div className="flex items-center justify-between px-5 py-3.5">
            <span className="text-xs font-bold text-slate-500">目標退休年齡</span>
            <span className="text-sm font-extrabold text-slate-800">
              {retirementAge} 歲
            </span>
          </div>

          {/* Years to retirement */}
          <div className="flex items-center justify-between px-5 py-3.5">
            <span className="text-xs font-bold text-slate-500">距離退休</span>
            <span className="text-sm font-extrabold text-slate-800">
              {yearsToRetirement} 年
            </span>
          </div>

          {/* Monthly spending */}
          <div className="flex items-center justify-between px-5 py-3.5">
            <span className="text-xs font-bold text-slate-500">退休月生活費</span>
            <span className="text-sm font-extrabold text-slate-800">
              NT$ {monthlySpending.toLocaleString()}
            </span>
          </div>

          {/* Risk tolerance */}
          <div className="flex items-center justify-between px-5 py-3.5">
            <span className="text-xs font-bold text-slate-500">風險承受度</span>
            <span className="text-sm font-extrabold text-slate-800">
              {riskTolerance ?? '未選擇'}
            </span>
          </div>

          {/* FIRE target */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 rounded-b-2xl">
            <span className="text-xs font-bold text-indigo-600">FIRE 目標金額</span>
            <span className="text-sm font-extrabold text-indigo-700">
              NT$ {fireTarget.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-bold text-slate-500">
            <span>設定完成度</span>
            <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              100%
            </span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/40 p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 via-sky-400 to-emerald-500 transition-all duration-500 ease-out"
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="設定精靈"
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white/95 backdrop-blur-xl border border-white/30 shadow-2xl shadow-slate-900/20 p-6 sm:p-8"
      >
        {/* Step indicator dots */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`
                w-2 h-2 rounded-full transition-all duration-300
                ${i === step ? 'w-6 bg-blue-500' : i < step ? 'bg-emerald-400' : 'bg-slate-200'}
              `}
            />
          ))}
        </div>

        {/* Step label */}
        <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
          STEP {step + 1} / 4 — {STEP_LABELS[step]}
        </p>

        {/* Animated step content */}
        <div className="transition-opacity duration-300 animate-fade-in">
          {step === 0 && renderStep1()}
          {step === 1 && renderStep2()}
          {step === 2 && renderStep3()}
          {step === 3 && renderStep4()}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-4 border-t border-slate-100">
          {/* Back button */}
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 0}
            aria-label="上一步"
            className={`
              flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold
              transition-all duration-200 cursor-pointer select-none
              ${
                step === 0
                  ? 'text-slate-300 cursor-not-allowed'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
              }
            `}
          >
            <ArrowLeft className="w-4 h-4" />
            返回
          </button>

          {/* Next / Complete button */}
          {step < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canGoNext}
              aria-label="下一步"
              className={`
                flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold
                transition-all duration-200 cursor-pointer select-none
                ${
                  canGoNext
                    ? 'bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 hover:scale-[1.02]'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }
              `}
            >
              下一步
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleComplete}
              aria-label="開始使用"
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/30 hover:scale-[1.02] transition-all duration-200 cursor-pointer select-none"
            >
              <Check className="w-4 h-4" />
              開始使用
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
