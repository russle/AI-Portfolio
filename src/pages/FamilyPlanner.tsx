import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../components/Card';
import { LineChart } from '../components/LineChart';
import { 
  Plus, 
  Trash2, 
  AlertTriangle, 
  PiggyBank, 
  X, 
  ChevronRight,
  CheckCircle2
} from 'lucide-react';

export interface FamilyGoal {
  id: string;
  name: string;
  currentAmount: number;
  targetAmount: number;
  targetYears: number;
  expectedReturn: number; // 年化報酬率，例如 0.07
  monthlyBudget: number;  // 預計投入/月
  priority: 'rigid' | 'important' | 'flexible';
}

const DEFAULT_GOALS: FamilyGoal[] = [
  {
    id: '1',
    name: '🏡 購屋自備款',
    currentAmount: 800000,
    targetAmount: 5000000,
    targetYears: 6,
    expectedReturn: 0.07,
    monthlyBudget: 35000,
    priority: 'rigid'
  },
  {
    id: '2',
    name: '👼 子女教育基金',
    currentAmount: 200000,
    targetAmount: 2000000,
    targetYears: 12,
    expectedReturn: 0.07,
    monthlyBudget: 15000,
    priority: 'important'
  },
  {
    id: '3',
    name: '✈️ 歐洲奢華遊',
    currentAmount: 50000,
    targetAmount: 600000,
    targetYears: 3,
    expectedReturn: 0.04,
    monthlyBudget: 10000,
    priority: 'flexible'
  }
];

export const FamilyPlanner: React.FC = () => {
  // 1. 獨立 LocalStorage 沙盒持久化 (Independent LocalStorage Sandbox Decision)
  const [goals, setGoals] = useState<FamilyGoal[]>(() => {
    const saved = localStorage.getItem('family_planner_goals');
    return saved ? JSON.parse(saved) : DEFAULT_GOALS;
  });

  const [familyMonthlyLimit, setFamilyMonthlyLimit] = useState<number>(() => {
    const saved = localStorage.getItem('family_planner_limit');
    return saved ? parseInt(saved, 10) : 50000;
  });

  useEffect(() => {
    localStorage.setItem('family_planner_goals', JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    localStorage.setItem('family_planner_limit', familyMonthlyLimit.toString());
  }, [familyMonthlyLimit]);

  // 新增/編輯 Modal 狀態
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<FamilyGoal | null>(null);
  
  // 表單狀態
  const [goalName, setGoalName] = useState('');
  const [currentAmount, setCurrentAmount] = useState<number>(0);
  const [targetAmount, setTargetAmount] = useState<number>(1000000);
  const [targetYears, setTargetYears] = useState<number>(5);
  const [expectedReturn, setExpectedReturn] = useState<number>(7);
  const [monthlyBudget, setMonthlyBudget] = useState<number>(10000);
  const [priority, setPriority] = useState<'rigid' | 'important' | 'flexible'>('important');

  // 詳細 Drawer 狀態
  const [selectedGoal, setSelectedGoal] = useState<FamilyGoal | null>(null);

  // 2. 優先級權重智慧預算分配決策 (Priority-Based Phase-Out Budget Allocation Decision)
  const budgetAllocation = useMemo(() => {
    const allocation: Record<string, number> = {};
    let remainingLimit = familyMonthlyLimit;

    // 按優先級分組
    const rigidGoals = goals.filter(g => g.priority === 'rigid');
    const importantGoals = goals.filter(g => g.priority === 'important');
    const flexibleGoals = goals.filter(g => g.priority === 'flexible');

    // 1. 分配給 Rigid (剛性首要)
    const totalRigidDemand = rigidGoals.reduce((sum, g) => sum + g.monthlyBudget, 0);
    if (totalRigidDemand > 0) {
      if (remainingLimit >= totalRigidDemand) {
        rigidGoals.forEach(g => {
          allocation[g.id] = g.monthlyBudget;
        });
        remainingLimit -= totalRigidDemand;
      } else {
        rigidGoals.forEach(g => {
          allocation[g.id] = (g.monthlyBudget / totalRigidDemand) * remainingLimit;
        });
        remainingLimit = 0;
      }
    }

    // 2. 分配給 Important (重要目標)
    const totalImportantDemand = importantGoals.reduce((sum, g) => sum + g.monthlyBudget, 0);
    if (totalImportantDemand > 0) {
      if (remainingLimit >= totalImportantDemand) {
        importantGoals.forEach(g => {
          allocation[g.id] = g.monthlyBudget;
        });
        remainingLimit -= totalImportantDemand;
      } else {
        importantGoals.forEach(g => {
          allocation[g.id] = (g.monthlyBudget / totalImportantDemand) * remainingLimit;
        });
        remainingLimit = 0;
      }
    }

    // 3. 分配給 Flexible (彈性享樂)
    const totalFlexibleDemand = flexibleGoals.reduce((sum, g) => sum + g.monthlyBudget, 0);
    if (totalFlexibleDemand > 0) {
      if (remainingLimit >= totalFlexibleDemand) {
        flexibleGoals.forEach(g => {
          allocation[g.id] = g.monthlyBudget;
        });
        remainingLimit -= totalFlexibleDemand;
      } else {
        flexibleGoals.forEach(g => {
          allocation[g.id] = (g.monthlyBudget / totalFlexibleDemand) * remainingLimit;
        });
        remainingLimit = 0;
      }
    }

    // 補齊可能獲得 0 的部分
    goals.forEach(g => {
      if (allocation[g.id] === undefined) {
        allocation[g.id] = 0;
      }
    });

    return allocation;
  }, [goals, familyMonthlyLimit]);

  // 總預算需求
  const totalBudgetDemand = useMemo(() => {
    return goals.reduce((sum, g) => sum + g.monthlyBudget, 0);
  }, [goals]);

  // 3. 沙盒複利達成率與折線圖軌跡演算 (Success Rate Math)
  const goalCalculations = useMemo(() => {
    const calcs: Record<string, {
      finalAsset: number;
      successRate: number;
      trajectory: { year: string; asset: number }[];
      isShortfunded: boolean;
      deficitAmount: number;
    }> = {};

    goals.forEach(g => {
      const allocated = budgetAllocation[g.id] ?? 0;
      const isShortfunded = allocated < g.monthlyBudget;
      const deficitAmount = g.monthlyBudget - allocated;

      let asset = g.currentAmount;
      const r = g.expectedReturn;
      const years = g.targetYears;
      const trajectory = [{ year: '第 0 年', asset: Math.round(asset) }];

      for (let y = 1; y <= years; y++) {
        // 年化複利公式：期末累積
        asset = asset * (1 + r) + (allocated * 12);
        trajectory.push({
          year: `第 ${y} 年`,
          asset: Math.round(asset)
        });
      }

      const rate = g.targetAmount > 0 ? Math.min(100, (asset / g.targetAmount) * 100) : 100;

      calcs[g.id] = {
        finalAsset: Math.round(asset),
        successRate: Math.round(rate),
        trajectory,
        isShortfunded,
        deficitAmount
      };
    });

    return calcs;
  }, [goals, budgetAllocation]);

  // 家庭總體平均達成度
  const averageSuccessRate = useMemo(() => {
    if (goals.length === 0) return 0;
    const total = goals.reduce((sum, g) => sum + (goalCalculations[g.id]?.successRate ?? 0), 0);
    return Math.round(total / goals.length);
  }, [goals, goalCalculations]);

  // 打開 Modal 新增
  const handleOpenAddModal = () => {
    setEditingGoal(null);
    setGoalName('');
    setCurrentAmount(0);
    setTargetAmount(1000000);
    setTargetYears(5);
    setExpectedReturn(7);
    setMonthlyBudget(10000);
    setPriority('important');
    setIsModalOpen(true);
  };

  // 打開 Modal 編輯
  const handleOpenEditModal = (g: FamilyGoal) => {
    setEditingGoal(g);
    setGoalName(g.name);
    setCurrentAmount(g.currentAmount);
    setTargetAmount(g.targetAmount);
    setTargetYears(g.targetYears);
    setExpectedReturn(g.expectedReturn * 100);
    setMonthlyBudget(g.monthlyBudget);
    setPriority(g.priority);
    setIsModalOpen(true);
  };

  // 儲存目標
  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalName.trim()) return;

    const newGoal: FamilyGoal = {
      id: editingGoal ? editingGoal.id : Math.random().toString(36).substring(2, 9),
      name: goalName,
      currentAmount,
      targetAmount,
      targetYears,
      expectedReturn: expectedReturn / 100,
      monthlyBudget,
      priority
    };

    if (editingGoal) {
      setGoals(goals.map(g => g.id === editingGoal.id ? newGoal : g));
      if (selectedGoal?.id === editingGoal.id) {
        setSelectedGoal(newGoal);
      }
    } else {
      setGoals([...goals, newGoal]);
    }

    setIsModalOpen(false);
  };

  // 刪除目標
  const handleDeleteGoal = (id: string) => {
    if (window.confirm('確定要刪除此理財目標信封嗎？')) {
      setGoals(goals.filter(g => g.id !== id));
      if (selectedGoal?.id === id) {
        setSelectedGoal(null);
      }
    }
  };

  // 優先級標籤中文轉換
  const getPriorityLabel = (p: 'rigid' | 'important' | 'flexible') => {
    switch (p) {
      case 'rigid': return { text: '🔥 剛性首要', bg: 'bg-rose-500/10 text-rose-600 border-rose-500/20' };
      case 'important': return { text: '⭐ 重要目標', bg: 'bg-blue-500/10 text-blue-600 border-blue-500/20' };
      case 'flexible': return { text: '☕ 彈性享樂', bg: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' };
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* 頂部引言 */}
      <div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">家庭信封目標規劃 (Family Goals)</h1>
        <p className="text-slate-500 mt-2 text-sm leading-relaxed">
          採用「目標導向多水庫（信封袋）規劃」架構。將理財目標完全解耦，以專屬沙盒複利精算達成率，並在有限預算下依優先級智慧裁扣與預警。
        </p>
      </div>

      {/* 總體預算儀表板 & 主控制台 (雙欄頂級儀表板架構) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* 左側：家庭預算主控制台 (Sticky) */}
        <Card className="p-6 lg:col-span-1 lg:sticky lg:top-24 space-y-6 bg-white/80 backdrop-blur-md shadow-sm border border-slate-200/50">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-800 text-base">🏡 家庭預算主控制台</h3>
            <p className="text-[11px] text-slate-400 mt-1">規劃與分配每月的家庭理財資金上限</p>
          </div>

          <div className="space-y-5">
            {/* 月度理財預算限額 */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-500">家庭每月理財預算上限 (TWD)</label>
                <span className="text-sm font-extrabold text-blue-600 font-mono">
                  ${familyMonthlyLimit.toLocaleString()} 元
                </span>
              </div>
              <input
                type="range"
                min="5000"
                max="200000"
                step="5000"
                value={familyMonthlyLimit}
                onChange={(e) => setFamilyMonthlyLimit(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="grid grid-cols-2 gap-3 mt-1.5">
                <input
                  type="number"
                  value={familyMonthlyLimit}
                  onChange={(e) => setFamilyMonthlyLimit(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500 font-mono"
                  min="0"
                  step="1000"
                />
                <button
                  onClick={handleOpenAddModal}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-md shadow-blue-500/10 cursor-pointer transition-all active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  新增信封
                </button>
              </div>
            </div>

            {/* 預算分配熱點與健康指標 */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-3">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-400">總設定預算需求：</span>
                <span className="text-slate-700 font-mono">${totalBudgetDemand.toLocaleString()} 元</span>
              </div>
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-400">實質預算分配率：</span>
                <span className={`${totalBudgetDemand > familyMonthlyLimit ? 'text-rose-500' : 'text-emerald-600'} font-mono`}>
                  {Math.round((totalBudgetDemand / familyMonthlyLimit) * 100)}%
                </span>
              </div>
              
              {/* 進度條 */}
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    totalBudgetDemand > familyMonthlyLimit ? 'bg-rose-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, (totalBudgetDemand / familyMonthlyLimit) * 100)}%` }}
                ></div>
              </div>

              {/* 超支紅色警告 (Red Deficit Warning) */}
              {totalBudgetDemand > familyMonthlyLimit ? (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-100 flex items-start gap-2 text-[10px] font-bold text-rose-700 leading-normal animate-pulse">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  <div>
                    <span>預算超支警報！總需求大於每月上限 ${familyMonthlyLimit.toLocaleString()} 元。系統已自動啟動「優先級權重分配法」，部分彈性目標已被強行減領或暫停注資。</span>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 leading-normal">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>預算規劃安全！所有目標水庫皆已獲得 100% 滿足。</span>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* 右側：總體達成度與目標卡片網格 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 家庭總達成率看板 */}
          <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/50 to-indigo-50/30 backdrop-blur-md p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-2 flex-1">
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-blue-700 bg-blue-100/60 border border-blue-200/50 uppercase tracking-wider">
                🛡️ 家庭總體達成健康度
              </div>
              <h4 className="text-base font-extrabold text-slate-800">
                多信封袋智慧分配下，您家庭的總體平均達成度為：
              </h4>
              <p className="text-slate-400 text-xs leading-relaxed max-w-md">
                本指標加權反映了所有信封目標的複利期望進度。目標優先級與分派金額將直接左右本評分。
              </p>
            </div>
            
            <div className="flex flex-col items-center justify-center p-4 bg-white/70 rounded-xl border border-white/95 shadow-inner min-w-[140px] shrink-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">平均達成率</span>
              <span className={`text-4xl font-black ${averageSuccessRate >= 80 ? 'text-emerald-500' : averageSuccessRate >= 50 ? 'text-blue-500' : 'text-rose-500'} my-1 font-mono tracking-tight`}>
                {averageSuccessRate}%
              </span>
              <span className="text-[9px] font-bold text-slate-400 leading-normal text-center mt-1">
                {averageSuccessRate >= 80 ? '🥳 進度極佳' : averageSuccessRate >= 50 ? '👍 穩定推進' : '⚠️ 需調整預算'}
              </span>
            </div>
          </div>

          {/* 信封目標卡片網格 (Card Grid) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map(g => {
              const calc = goalCalculations[g.id];
              const allocated = budgetAllocation[g.id] ?? 0;
              const pill = getPriorityLabel(g.priority);
              const progressPercent = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100));

              return (
                <div 
                  key={g.id}
                  onClick={() => setSelectedGoal(g)}
                  className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 p-5 cursor-pointer select-none bg-white/70 backdrop-blur-md shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md hover:scale-[1.01] ${
                    selectedGoal?.id === g.id 
                      ? 'border-blue-500 ring-2 ring-blue-500/10' 
                      : calc?.isShortfunded
                        ? 'border-rose-200/80 hover:border-rose-300'
                        : 'border-slate-200/60 hover:border-blue-300'
                  }`}
                >
                  <div className="space-y-3">
                    {/* 卡片頂部 */}
                    <div className="flex justify-between items-start">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black border uppercase tracking-wider ${pill.bg}`}>
                        {pill.text}
                      </span>
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditModal(g);
                          }}
                          className="p-1 text-slate-400 hover:text-blue-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="編輯目標"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteGoal(g.id);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="刪除目標"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* 信封名稱 */}
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-sm tracking-tight flex items-center gap-1">
                        {g.name}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-bold block mt-0.5 font-mono">
                        目標金額：${g.targetAmount.toLocaleString()} 元 | {g.targetYears} 年
                      </span>
                    </div>

                    {/* 進度條 */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-black">
                        <span className="text-slate-400">目前累積：${g.currentAmount.toLocaleString()}</span>
                        <span className="text-slate-600 font-mono">{progressPercent}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                          style={{ width: `${progressPercent}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* 卡片底部 (診斷警告與成功率) */}
                  <div className="pt-3 border-t border-slate-100/80 flex items-center justify-between gap-4">
                    {/* 左下：預算分配診斷 */}
                    <div className="flex-1 min-w-0">
                      {calc?.isShortfunded ? (
                        <div className="text-[9px] font-extrabold text-rose-500 leading-normal truncate">
                          ⚠️ 月預算遭擠壓：${Math.round(allocated).toLocaleString()} / ${g.monthlyBudget.toLocaleString()}
                        </div>
                      ) : (
                        <div className="text-[9px] font-extrabold text-emerald-600 leading-normal truncate">
                          ✅ 預算全額撥付：${g.monthlyBudget.toLocaleString()} TWD/月
                        </div>
                      )}
                    </div>

                    {/* 右下：達成率 */}
                    <div className="text-right shrink-0">
                      <span className="text-[8px] font-bold text-slate-400 block tracking-wider">預估達成率</span>
                      <span className={`text-sm font-black font-mono ${
                        calc?.successRate >= 80 
                          ? 'text-emerald-500' 
                          : calc?.successRate >= 50 ? 'text-blue-600' : 'text-rose-500'
                      }`}>
                        {calc?.successRate}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 無目標時的 Empty State */}
          {goals.length === 0 && (
            <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl space-y-3 bg-slate-50/50">
              <PiggyBank className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="font-extrabold text-slate-600 text-sm">目前無任何家庭理財目標信封</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                點擊左側控制台中的「新增信封」按鈕，為您的子女教育、買房換車等目標建立專屬沙盒水庫吧！
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 詳細 Recharts 複利成長 Drawer (與卡片連動) */}
      {selectedGoal && (
        <Card className="p-6 animate-fade-in border-l-4 border-l-blue-500 bg-white/95">
          <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-3">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold text-blue-700 bg-blue-50/60 border border-blue-100">
                📈 複利積累軌跡與理財診斷
              </div>
              <h3 className="font-extrabold text-slate-800 text-base mt-2 flex items-center gap-1">
                {selectedGoal.name}
              </h3>
            </div>
            <button
              onClick={() => setSelectedGoal(null)}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
            {/* 左側：理財診斷 */}
            <div className="xl:col-span-1 p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between space-y-4">
              <div className="space-y-3 text-xs">
                <span className="text-[10px] font-black text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded block w-fit">
                  目標精算明細
                </span>
                
                <div className="flex justify-between border-b border-slate-200/50 pb-1.5">
                  <span className="text-slate-400 font-bold">目前金額：</span>
                  <span className="text-slate-700 font-extrabold">${selectedGoal.currentAmount.toLocaleString()} 元</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/50 pb-1.5">
                  <span className="text-slate-400 font-bold">目標金額：</span>
                  <span className="text-slate-700 font-extrabold">${selectedGoal.targetAmount.toLocaleString()} 元</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/50 pb-1.5">
                  <span className="text-slate-400 font-bold">設定年限：</span>
                  <span className="text-slate-700 font-extrabold">{selectedGoal.targetYears} 年</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/50 pb-1.5">
                  <span className="text-slate-400 font-bold">年化回報率：</span>
                  <span className="text-blue-600 font-black">{(selectedGoal.expectedReturn * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/50 pb-1.5">
                  <span className="text-slate-400 font-bold">設定月投入：</span>
                  <span className="text-slate-700 font-extrabold">${selectedGoal.monthlyBudget.toLocaleString()} 元</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="text-slate-400 font-bold">智慧分配月投入：</span>
                  <span className={`font-black ${goalCalculations[selectedGoal.id]?.isShortfunded ? 'text-rose-500' : 'text-emerald-600'}`}>
                    ${Math.round(budgetAllocation[selectedGoal.id] ?? 0).toLocaleString()} 元
                  </span>
                </div>
              </div>

              {/* 診斷報告 */}
              <div className="pt-4 border-t border-slate-200">
                <span className="text-[10px] font-black text-slate-400 block mb-2 tracking-wider">診斷分析與建議</span>
                {goalCalculations[selectedGoal.id]?.isShortfunded ? (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 space-y-1.5">
                    <h4 className="text-[11px] font-black flex items-center gap-1">⚠️ 預算受擠壓！</h4>
                    <p className="text-[9px] leading-relaxed font-bold">
                      由於家庭總理財預算超支，本目標每月被智慧扣減了 <span className="font-extrabold text-xs">${Math.round(goalCalculations[selectedGoal.id]?.deficitAmount ?? 0).toLocaleString()}</span> 元。
                      預期終點資產僅能累積至 <span className="font-extrabold text-xs">${goalCalculations[selectedGoal.id]?.finalAsset.toLocaleString()}</span> 元，達成率下降為 <span className="font-extrabold text-xs text-rose-600 font-mono">{goalCalculations[selectedGoal.id]?.successRate}%</span>。
                    </p>
                    <p className="text-[9px] leading-relaxed text-rose-500/80 font-bold">
                      👉 建議：調高「家庭每月預算上限」，或將其他次要目標調降為彈性優先級，以保全本項重要理財計劃。
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 border border-emerald-250/80 rounded-xl text-emerald-700 space-y-1.5">
                    <h4 className="text-[11px] font-black flex items-center gap-1">🎉 計劃正常推進！</h4>
                    <p className="text-[9px] leading-relaxed font-bold">
                      本項目標月預算已獲得 100% 足額分配。在 {(selectedGoal.expectedReturn * 100).toFixed(0)}% 複利報酬率下，預期 {selectedGoal.targetYears} 年後可順利累積至 <span className="font-extrabold text-xs">${goalCalculations[selectedGoal.id]?.finalAsset.toLocaleString()}</span> 元，達成率高達 <span className="font-extrabold text-xs text-emerald-600 font-mono">{goalCalculations[selectedGoal.id]?.successRate}%</span>！
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 右側：積累折線圖 (Recharts LineChart) */}
            <div className="xl:col-span-3 h-80 min-h-[300px] flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 block tracking-wider select-none">
                📊 {selectedGoal.targetYears} 年沙盒複利積累軌跡
              </span>
              <div className="flex-1 mt-3">
                <LineChart 
                  data={goalCalculations[selectedGoal.id]?.trajectory ?? []} 
                  xKey="year" 
                  lines={[
                    { key: 'asset', name: '預期累積金額 (TWD)', stroke: '#3b82f6' }
                  ]} 
                  height={260}
                  formatYAxis={(val) => {
                    if (val >= 10000) {
                      return `$${Math.round(val / 10000)}萬`;
                    }
                    return `$${val}`;
                  }}
                />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* 新增/編輯彈出 Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <Card className="max-w-md w-full p-6 bg-white shadow-2xl border border-slate-100 flex flex-col space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 select-none">
              <h3 className="font-black text-slate-800 text-base">
                {editingGoal ? '✏️ 編輯理財目標信封' : '✨ 新增理財目標信封'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveGoal} className="space-y-4 text-xs font-bold text-slate-600">
              {/* 名稱 */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">目標名稱 (可加入 Emoji)</label>
                <input
                  type="text"
                  required
                  placeholder="例如: 🏡 買房頭期款、👼 教育基金"
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* 目前金額 / 目標金額 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">目前已累積 (TWD)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">目標金額 (TWD)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(Math.max(1, parseInt(e.target.value, 10) || 0))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* 年期 / 預期報酬率 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">目標年限 (年)</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    required
                    value={targetYears}
                    onChange={(e) => setTargetYears(Math.max(1, Math.min(50, parseInt(e.target.value, 10) || 0)))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">預期年化報酬 (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    step="0.5"
                    required
                    value={expectedReturn}
                    onChange={(e) => setExpectedReturn(Math.max(0, Math.min(30, parseFloat(e.target.value) || 0)))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* 月度預算 / 優先級 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">預計月投入 (TWD)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={monthlyBudget}
                    onChange={(e) => setMonthlyBudget(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">優先級</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as 'rigid' | 'important' | 'flexible')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="rigid">🔥 剛性首要 (Rigid First)</option>
                    <option value="important">⭐ 重要目標 (Important)</option>
                    <option value="flexible">☕ 彈性享樂 (Flexible)</option>
                  </select>
                </div>
              </div>

              {/* 按鈕 */}
              <div className="pt-4 border-t border-slate-100 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl font-bold cursor-pointer transition-all active:scale-98"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-500/10 cursor-pointer transition-all active:scale-98"
                >
                  儲存信封
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
