// 退休規劃核心財務計算工具

// 生成符合常態分佈的隨機變數 (Box-Muller Transform)
export const randomNormal = (mean: number, std: number): number => {
  let u = 0, v = 0;
  while (u === 0) u = Math.random(); // 避免 log(0)
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * std + mean;
};

export interface MonteCarloResult {
  yearsArray: number[]; // 每年對應的年期 [0, 1, 2, ...]
  p5: number[];         // 歷年 P5 軌跡
  p50: number[];        // 歷年 P50 軌跡
  p95: number[];        // 歷年 P95 軌跡
  successRate: number;  // 終點成功率 (退休資產 >= FIRE 目標)
}

/**
 * 依據年齡動態計算 Glide Path 股債配比與預期報酬、標準差
 */
export const calculateGlidePathReturnAndStd = (
  age: number,
  rStock: number = 0.08,
  sigmaStock: number = 0.18,
  rBond: number = 0.03,
  sigmaBond: number = 0.06
): { expectedReturn: number; std: number; stockWeight: number } => {
  // 110 - age 經典生命週期配置，限制在 20% 到 90% 之間
  const stockWeight = Math.max(0.2, Math.min(0.9, (110 - age) / 100));
  const expectedReturn = stockWeight * rStock + (1 - stockWeight) * rBond;
  const std = stockWeight * sigmaStock + (1 - stockWeight) * sigmaBond;
  return { expectedReturn, std, stockWeight };
};

/**
 * 實作 1000 次蒙地卡羅隨機模擬
 */
export const runMonteCarloSimulation = (
  initial: number,
  monthlyInvest: number,
  years: number,
  mean: number,
  std: number = 0.15, // 預設標準差為 15%
  inflation: number,
  fireTarget: number
): MonteCarloResult => {
  const numSimulations = 1000;
  const yearlyInvest = monthlyInvest * 12;
  
  // 建立儲存每次模擬歷年資產軌跡的二維陣列
  // simulations[sim_idx][year_idx]
  const simulations: number[][] = Array.from({ length: numSimulations }, () => new Array(years + 1).fill(initial));

  for (let s = 0; s < numSimulations; s++) {
    let currentAsset = initial;
    for (let y = 1; y <= years; y++) {
      const randomReturn = randomNormal(mean, std);
      // 完全依照規格書公式：
      // 1. 資產 *= (1 + 隨機報酬率)
      // 2. 資產 += monthlyInvest * 12
      // 3. 資產 / (1 + inflation)
      currentAsset = (currentAsset * (1 + randomReturn) + yearlyInvest) / (1 + inflation);
      simulations[s][y] = Math.max(0, currentAsset); // 資產最少為 0，不為負值
    }
  }

  // 整理歷年 P5, P50, P95
  const p5: number[] = [initial];
  const p50: number[] = [initial];
  const p95: number[] = [initial];
  const yearsArray: number[] = [0];

  for (let y = 1; y <= years; y++) {
    yearsArray.push(y);
    // 獲取所有模擬在第 y 年的資產值並排序
    const yearValues = simulations.map(sim => sim[y]).sort((a, b) => a - b);
    
    // P5 取排序後第 5% 位置 (保守下限)
    p5.push(Math.round(yearValues[Math.floor(numSimulations * 0.05)]));
    // P50 取第 50% 位置 (中位數)
    p50.push(Math.round(yearValues[Math.floor(numSimulations * 0.50)]));
    // P95 取第 95% 位置 (樂觀上限)
    p95.push(Math.round(yearValues[Math.floor(numSimulations * 0.95)]));
  }

  // 計算終點成功率：在最後一年終點資產值 >= fireTarget 的比例
  const finalYearValues = simulations.map(sim => sim[years]);
  const successCount = finalYearValues.filter(val => val >= fireTarget).length;
  const successRate = successCount / numSimulations;

  return {
    yearsArray,
    p5,
    p50,
    p95,
    successRate
  };
};

export type FeasibilityRating = '❌ 不可行' | '⚠️ 勉強可行' | '✅ 可行' | '🟢 非常可行';

export interface FeasibilityResult {
  age: number;
  years: number;
  successRate: number;
  rating: FeasibilityRating;
  expectedAsset: number; // 預期中位數資產
}

/**
 * 評估各年齡的退休可行性 (52, 55, 58, 60歲)
 */
export const assessRetirementFeasibility = (
  initial: number,
  monthlyInvest: number,
  currentAge: number,
  mean: number,
  std: number = 0.15,
  inflation: number,
  fireTarget: number
): FeasibilityResult[] => {
  const targetAges = [52, 55, 58, 60];

  return targetAges.map(age => {
    const years = age - currentAge;
    
    if (years <= 0) {
      const isAchieved = initial >= fireTarget;
      return {
        age,
        years: 0,
        successRate: isAchieved ? 1 : 0,
        rating: isAchieved ? '🟢 非常可行' : '❌ 不可行',
        expectedAsset: initial
      };
    }

    // 執行輕量化的 Monte Carlo 模擬來算出該年期的成功率
    const simResult = runMonteCarloSimulation(
      initial,
      monthlyInvest,
      years,
      mean,
      std,
      inflation,
      fireTarget
    );

    const rate = simResult.successRate;
    let rating: FeasibilityRating = '❌ 不可行';
    
    if (rate >= 0.90) {
      rating = '🟢 非常可行';
    } else if (rate >= 0.70) {
      rating = '✅ 可行';
    } else if (rate >= 0.40) {
      rating = '⚠️ 勉強可行';
    }

    return {
      age,
      years,
      successRate: rate,
      rating,
      expectedAsset: simResult.p50[simResult.p50.length - 1] // 中位數終點值
    };
  });
};

export interface FullLifeMonteCarloResult {
  yearsArray: number[];       // 每年對應的年齡 [30, 31, 32, ..., 85]
  p5: number[];               // 歷年 P5 軌跡
  p50: number[];              // 歷年 P50 軌跡
  p95: number[];              // 歷年 P95 軌跡
  depletionAgeP5: number | null;   // P5 軌跡歸零年齡
  depletionAgeP50: number | null;  // P50 軌跡歸零年齡
  depletionAgeP95: number | null;  // P95 軌跡歸零年齡
}

/**
 * 實作全生命週期（累積期 + 提領消耗期）的 1000 次蒙地卡羅隨機模擬
 */
export const runFullLifeMonteCarloSimulation = (
  initial: number,
  monthlyInvest: number,
  currentAge: number,
  retireAge: number,
  expectedReturn: number,
  std: number = 0.15,
  inflation: number,
  monthlySpending: number,
  strategy: 'four_percent' | 'gk_dynamic' | 'die_to_zero' | 'cape_based',
  maxAge: number = 85,
  capeRatio: number = 30,
  enableSpendingSmile: boolean = false,
  enableGlidePath: boolean = false
): FullLifeMonteCarloResult => {
  const numSimulations = 1000;
  const yearlyInvest = monthlyInvest * 12;
  const yearlySpending = monthlySpending * 12;
  
  // 計算總模擬年數 (從目前年齡到 maxAge)
  const totalYears = Math.max(1, maxAge - currentAge);
  
  // simulations[sim_idx][year_idx]
  const simulations: number[][] = Array.from({ length: numSimulations }, () => new Array(totalYears + 1).fill(initial));
  
  // 實質利率（Die to Zero 提領均攤用）
  const rReal = Math.max(0.01, expectedReturn - inflation);
  
  // GK 法則目標資產（護欄判定基準）
  const gkTarget = yearlySpending / 0.05;

  for (let s = 0; s < numSimulations; s++) {
    let currentAsset = initial;
    let capeWithdrawAmount = 0; // 用於儲存 CAPE 法則的動態年提領額（隨通膨滾存）
    let hasInitializedCape = false;

    for (let y = 1; y <= totalYears; y++) {
      const age = currentAge + y;
      
      // 動態計算 Glide Path 配置的預期報酬率與標準差
      let currentMean = expectedReturn;
      let currentStd = std;
      if (enableGlidePath) {
        const gp = calculateGlidePathReturnAndStd(age);
        currentMean = gp.expectedReturn;
        currentStd = gp.std;
      }
      
      const randomReturn = randomNormal(currentMean, currentStd);
      
      if (age <= retireAge) {
        // 1. 累積期 (當前年齡至退休年齡)
        currentAsset = (currentAsset * (1 + randomReturn) + yearlyInvest) / (1 + inflation);
      } else {
        // 2. 提領消耗期 (已退休)
        
        // A. 計算支出微笑曲線折減因子 (Spending Smile)
        let smileFactor = 1.0;
        if (enableSpendingSmile) {
          if (age <= 70) {
            smileFactor = 1.0;
          } else if (age <= 80) {
            // 從 70 歲的 1.0 線性降到 80 歲的 0.75
            smileFactor = 1.0 - (age - 70) * 0.025;
          } else {
            // 從 80 歲的 0.75 線性回升，至 90 歲回升為 1.0（限制最高為 1.0）
            smileFactor = Math.min(1.0, 0.75 + (age - 80) * 0.025);
          }
        }

        let withdrawAmount = yearlySpending;
        
        if (strategy === 'gk_dynamic') {
          // GK 動態護欄機制
          if (currentAsset >= gkTarget * 1.2) {
            withdrawAmount = yearlySpending * 1.1; // 富裕增領 10%
          } else if (currentAsset <= gkTarget * 0.8) {
            withdrawAmount = yearlySpending * 0.9; // 防禦減領 10%
          }
        } else if (strategy === 'die_to_zero') {
          // Die to Zero 年金均攤 (動態 Glide Path 實質報酬計算)
          const remainingYears = maxAge - age + 1;
          if (remainingYears > 0) {
            const stepReal = enableGlidePath ? Math.max(0.01, currentMean - inflation) : rReal;
            const annuityFactor = (1 - Math.pow(1 + stepReal, -remainingYears)) / stepReal;
            withdrawAmount = currentAsset / annuityFactor;
          } else {
            withdrawAmount = currentAsset;
          }
        } else if (strategy === 'cape_based') {
          // CAPE 估值連動提領法則
          if (!hasInitializedCape) {
            // 退休第一年，依據退休點累積資產與 CAPE 初始提領率計算 (1.5% + 50/CAPE %)
            const initialWithdrawRate = 0.015 + 0.5 / capeRatio;
            capeWithdrawAmount = currentAsset * initialWithdrawRate;
            hasInitializedCape = true;
          } else {
            // 之後年份隨通膨調整
            capeWithdrawAmount = capeWithdrawAmount * (1 + inflation);
          }
          withdrawAmount = capeWithdrawAmount;
        }

        // 套用開銷微笑曲線折減
        withdrawAmount = withdrawAmount * smileFactor;
        
        // 扣除提領金額並滾存隨機報酬率，隨後折算實質購買力
        currentAsset = Math.max(0, currentAsset - withdrawAmount);
        currentAsset = (currentAsset * (1 + randomReturn)) / (1 + inflation);
      }
      
      simulations[s][y] = Math.max(0, currentAsset);
    }
  }

  // 整理歷年 P5, P50, P95 (X軸為年齡而非第幾年)
  const p5: number[] = [initial];
  const p50: number[] = [initial];
  const p95: number[] = [initial];
  const yearsArray: number[] = [currentAge];

  for (let y = 1; y <= totalYears; y++) {
    yearsArray.push(currentAge + y);
    const yearValues = simulations.map(sim => sim[y]).sort((a, b) => a - b);
    
    p5.push(Math.round(yearValues[Math.floor(numSimulations * 0.05)]));
    p50.push(Math.round(yearValues[Math.floor(numSimulations * 0.50)]));
    p95.push(Math.round(yearValues[Math.floor(numSimulations * 0.95)]));
  }

  // 計算 P5, P50, P95 軌跡的首度歸零年齡 (花光年齡)
  let depletionAgeP5: number | null = null;
  let depletionAgeP50: number | null = null;
  let depletionAgeP95: number | null = null;

  for (let i = 0; i < yearsArray.length; i++) {
    const age = yearsArray[i];
    // 只有在已達退休年齡後，才開始判斷歸零（因為退休前即使為0，也是在累積階段，不叫花光）
    if (age >= retireAge) {
      if (depletionAgeP5 === null && p5[i] <= 0) depletionAgeP5 = age;
      if (depletionAgeP50 === null && p50[i] <= 0) depletionAgeP50 = age;
      if (depletionAgeP95 === null && p95[i] <= 0) depletionAgeP95 = age;
    }
  }

  return {
    yearsArray,
    p5,
    p50,
    p95,
    depletionAgeP5,
    depletionAgeP50,
    depletionAgeP95
  };
};

// [NEW] 夫妻雙核心退休規劃介面與模擬函式 (Four-Stage Decumulation Monte Carlo Algorithm Decision)
export interface JointRetirementParams {
  memberA: {
    currentAge: number;
    retireAge: number;
    maxAge: number;
    monthlySpending: number;
    passiveIncome: number;
  };
  memberB: {
    currentAge: number;
    retireAge: number;
    maxAge: number;
    monthlySpending: number;
    passiveIncome: number;
  };
  jointSpending: number;
  initialAsset: number;
  monthlyInvest: number;
  expectedReturn: number;
  std: number;
  inflation: number;
  enableGlidePath: boolean;
  enableSpendingSmile: boolean;
}

export interface JointMonteCarloResult {
  yearsArray: number[];       // 主年期時間軸 (A 年齡序列，如 [30, 31, ...])
  yearsArrayB: number[];      // 輔年期時間軸 (B 年齡序列，如 [28, 29, ...])
  p5: number[];
  p50: number[];
  p95: number[];
  depletionAgeP5: number | null;   // P5 軌跡歸零年齡（成員 A 年齡）
  depletionAgeP50: number | null;  // P50 軌跡歸零年齡（成員 A 年齡）
  depletionAgeP95: number | null;  // P95 軌跡歸零年齡（成員 A 年齡）
  successRate: number;        // 夫妻白頭偕老財務安全成功機率
}

/**
 * 實作夫妻雙核心全生命週期（四階段動態提領）的 1000 次蒙地卡羅模擬
 */
export const runJointFullLifeMonteCarloSimulation = (
  params: JointRetirementParams
): JointMonteCarloResult => {
  const numSimulations = 1000;
  const {
    memberA,
    memberB,
    jointSpending,
    initialAsset,
    monthlyInvest,
    expectedReturn,
    std,
    inflation,
    enableGlidePath,
    enableSpendingSmile
  } = params;

  // 計算家庭總模擬年數 (從目前的年齡差，覆蓋雙方的 maxAge)
  const yearsA = Math.max(1, memberA.maxAge - memberA.currentAge);
  const yearsB = Math.max(1, memberB.maxAge - memberB.currentAge);
  const totalYears = Math.max(yearsA, yearsB);

  // simulations[sim_idx][year_idx]
  const simulations: number[][] = Array.from(
    { length: numSimulations },
    () => new Array(totalYears + 1).fill(initialAsset)
  );

  for (let s = 0; s < numSimulations; s++) {
    let currentAsset = initialAsset;

    for (let y = 1; y <= totalYears; y++) {
      const ageA = memberA.currentAge + y;
      const ageB = memberB.currentAge + y;

      const hasAExpired = ageA > memberA.maxAge;
      const hasBExpired = ageB > memberB.maxAge;

      // 如果兩人都已過世，資產保持 0 且停止模擬
      if (hasAExpired && hasBExpired) {
        simulations[s][y] = 0;
        continue;
      }

      // 動態 Glide Path 報酬與標準差（以成員 A 的年齡為主基準）
      let currentMean = expectedReturn;
      let currentStd = std;
      if (enableGlidePath) {
        const gp = calculateGlidePathReturnAndStd(Math.min(memberA.maxAge, ageA));
        currentMean = gp.expectedReturn;
        currentStd = gp.std;
      }

      const randomReturn = randomNormal(currentMean, currentStd);

      // 1. 家庭儲蓄投入 (累積流) - 成員在世且未退休時，各自貢獻 50%
      let totalInvest = 0;
      if (!hasAExpired && ageA <= memberA.retireAge) {
        totalInvest += (monthlyInvest * 12) / 2;
      }
      if (!hasBExpired && ageB <= memberB.retireAge) {
        totalInvest += (monthlyInvest * 12) / 2;
      }

      // 2. 退休年金被動流入 - 成員在世且已退休時
      let totalPassive = 0;
      if (!hasAExpired && ageA > memberA.retireAge) {
        totalPassive += memberA.passiveIncome * 12;
      }
      if (!hasBExpired && ageB > memberB.retireAge) {
        totalPassive += memberB.passiveIncome * 12;
      }

      // 3. 退休支出流 (個人支出帶有支出微笑曲線)
      let totalSpend = 0;

      // 成員 A 個人支出
      if (!hasAExpired && ageA > memberA.retireAge) {
        let smileFactorA = 1.0;
        if (enableSpendingSmile) {
          if (ageA > 70 && ageA <= 80) {
            smileFactorA = 1.0 - (ageA - 70) * 0.025;
          } else if (ageA > 80) {
            smileFactorA = Math.min(1.0, 0.75 + (ageA - 80) * 0.025);
          }
        }
        totalSpend += memberA.monthlySpending * 12 * smileFactorA;
      }

      // 成員 B 個人支出
      if (!hasBExpired && ageB > memberB.retireAge) {
        let smileFactorB = 1.0;
        if (enableSpendingSmile) {
          if (ageB > 70 && ageB <= 80) {
            smileFactorB = 1.0 - (ageB - 70) * 0.025;
          } else if (ageB > 80) {
            smileFactorB = Math.min(1.0, 0.75 + (ageB - 80) * 0.025);
          }
        }
        totalSpend += memberB.monthlySpending * 12 * smileFactorB;
      }

      // 家庭共同支出 (至少有一人已退休且仍在世)
      const hasAnyRetired =
        (!hasAExpired && ageA > memberA.retireAge) ||
        (!hasBExpired && ageB > memberB.retireAge);

      if (hasAnyRetired) {
        totalSpend += jointSpending * 12;
      }

      // 4. 淨流計算與資產演進 (防範與邊界處理)
      const netCashFlow = totalInvest + totalPassive - totalSpend;

      if (netCashFlow >= 0) {
        currentAsset = (currentAsset * (1 + randomReturn) + netCashFlow) / (1 + inflation);
      } else {
        currentAsset = Math.max(0, currentAsset + netCashFlow); // 期初提領
        currentAsset = (currentAsset * (1 + randomReturn)) / (1 + inflation);
      }

      simulations[s][y] = Math.max(0, currentAsset);
    }
  }

  // 整理歷年 P5, P50, P95 (X軸主年期時間軸為 A 與 B 的年齡對照)
  const p5: number[] = [initialAsset];
  const p50: number[] = [initialAsset];
  const p95: number[] = [initialAsset];
  const yearsArray: number[] = [memberA.currentAge];
  const yearsArrayB: number[] = [memberB.currentAge];

  for (let y = 1; y <= totalYears; y++) {
    yearsArray.push(memberA.currentAge + y);
    yearsArrayB.push(memberB.currentAge + y);

    const yearValues = simulations.map((sim) => sim[y]).sort((a, b) => a - b);

    p5.push(Math.round(yearValues[Math.floor(numSimulations * 0.05)]));
    p50.push(Math.round(yearValues[Math.floor(numSimulations * 0.50)]));
    p95.push(Math.round(yearValues[Math.floor(numSimulations * 0.95)]));
  }

  // 計算首度歸零年齡（以 A 的年齡表示）
  let depletionAgeP5: number | null = null;
  let depletionAgeP50: number | null = null;
  let depletionAgeP95: number | null = null;

  for (let i = 0; i < yearsArray.length; i++) {
    const ageA = yearsArray[i];
    const ageB = yearsArrayB[i];

    // 只有在有人已退休後才計算歸零
    const hasAnyRetired = ageA > memberA.retireAge || ageB > memberB.retireAge;

    if (hasAnyRetired) {
      if (depletionAgeP5 === null && p5[i] <= 0) depletionAgeP5 = ageA;
      if (depletionAgeP50 === null && p50[i] <= 0) depletionAgeP50 = ageA;
      if (depletionAgeP95 === null && p95[i] <= 0) depletionAgeP95 = ageA;
    }
  }

  // 成功率計算：直到雙方終點 (或 maxAge) 結束時，資產大於 0 的路徑比例
  const finalYearValues = simulations.map((sim) => sim[totalYears]);
  const successCount = finalYearValues.filter((val) => val > 0).length;
  const successRate = successCount / numSimulations;

  return {
    yearsArray,
    yearsArrayB,
    p5,
    p50,
    p95,
    depletionAgeP5,
    depletionAgeP50,
    depletionAgeP95,
    successRate
  };
};

export interface JointFeasibilityResult {
  retireAgeA: number;
  retireAgeB: number;
  successRate: number;
  rating: FeasibilityRating;
  expectedAsset: number;
}

/**
 * 評估夫妻雙核心退休可行性 (動態調整雙方退休年齡)
 */
export const assessJointRetirementFeasibility = (
  params: JointRetirementParams
): JointFeasibilityResult[] => {
  // 設計四個目標退休年齡對 (A, B) 進行交叉評估
  const targetAgePairs = [
    { a: 55, b: 55 },
    { a: 58, b: 58 },
    { a: 60, b: 60 },
    { a: 65, b: 65 }
  ];

  return targetAgePairs.map((pair) => {
    // 複製參數並替換雙方的退休年齡進行沙盒試算
    const trialParams: JointRetirementParams = {
      ...params,
      memberA: { ...params.memberA, retireAge: pair.a },
      memberB: { ...params.memberB, retireAge: pair.b }
    };

    const simResult = runJointFullLifeMonteCarloSimulation(trialParams);
    const rate = simResult.successRate;

    let rating: FeasibilityRating = '❌ 不可行';
    if (rate >= 0.90) {
      rating = '🟢 非常可行';
    } else if (rate >= 0.70) {
      rating = '✅ 可行';
    } else if (rate >= 0.40) {
      rating = '⚠️ 勉強可行';
    }

    return {
      retireAgeA: pair.a,
      retireAgeB: pair.b,
      successRate: rate,
      rating,
      expectedAsset: simResult.p50[simResult.p50.length - 1]
    };
  });
};

// [NEW] 歷史黑天鵝危機大類年度收益矩陣 (10年)
const CRISIS_YEARLY_RETURNS: Record<
  'tech_2000' | 'financial_2008' | 'inflation_2022',
  {
    tw_stock: number[];
    us_stock: number[];
    bond: number[];
    crypto: number[];
    cash: number[];
  }
> = {
  tech_2000: {
    // 2000-2009
    tw_stock: [-0.44, 0.18, -0.20, 0.35, 0.05, 0.07, 0.22, 0.12, -0.43, 0.74],
    us_stock: [-0.09, -0.12, -0.22, 0.28, 0.10, 0.05, 0.15, 0.05, -0.37, 0.26],
    bond: [0.11, 0.08, 0.10, 0.04, 0.04, 0.02, 0.04, 0.07, 0.07, 0.06],
    crypto: [0.05, 0.15, 0.15, 0.05, 0.02, 0.05, 0.10, 0.05, -0.10, 0.15], // 當時無加密幣，以黃金/避險回報替代
    cash: [0.05, 0.04, 0.02, 0.015, 0.015, 0.03, 0.045, 0.045, 0.02, 0.005]
  },
  financial_2008: {
    // 2008-2017
    tw_stock: [-0.43, 0.74, 0.18, -0.18, 0.10, 0.12, 0.15, -0.06, 0.19, 0.18],
    us_stock: [-0.37, 0.26, 0.15, 0.02, 0.16, 0.32, 0.13, 0.01, 0.12, 0.21],
    bond: [0.07, 0.06, 0.06, 0.08, 0.04, -0.02, 0.06, 0.005, 0.026, 0.035],
    crypto: [0.05, 0.20, 0.30, 0.10, 0.15, 0.20, -0.10, 0.08, 0.12, 0.25], // 避險/大宗替代
    cash: [0.02, 0.005, 0.005, 0.005, 0.005, 0.005, 0.005, 0.005, 0.005, 0.01]
  },
  inflation_2022: {
    // 2022-2031 (包含 2022-2024 真實數據與後續預期數據)
    tw_stock: [-0.22, 0.26, 0.30, 0.10, 0.08, 0.08, 0.07, 0.07, 0.07, 0.07],
    us_stock: [-0.19, 0.24, 0.25, 0.09, 0.08, 0.08, 0.07, 0.07, 0.07, 0.07],
    bond: [-0.13, 0.05, 0.06, 0.04, 0.04, 0.04, 0.04, 0.04, 0.04, 0.04],
    crypto: [-0.64, 1.50, 0.60, 0.15, 0.10, -0.20, 0.30, 0.10, 0.15, 0.10],
    cash: [0.02, 0.04, 0.045, 0.035, 0.03, 0.025, 0.02, 0.02, 0.02, 0.02]
  }
};

export interface CrisisBacktestPoint {
  month: number;
  yearNum: number;
  assetValue: number;
  spentValue: number;
}

export interface CrisisBacktestResult {
  history: CrisisBacktestPoint[];
  isDepleted: boolean;
  depletionMonth: number | null;
  finalAsset: number;
}

/**
 * [NEW] 實作歷史黑天鵝危機提領存活回測引擎 (唯讀沙盒)
 */
export const runRetirementCrisisBacktest = (
  initialAsset: number,
  monthlySpending: number,
  allocation: { tw_stock: number; us_stock: number; bond: number; cash: number; crypto: number },
  enableGk: boolean,
  enableSpendingSmile: boolean,
  scenarioId: 'tech_2000' | 'financial_2008' | 'inflation_2022',
  inflation: number
): CrisisBacktestResult => {
  const returns = CRISIS_YEARLY_RETURNS[scenarioId];
  const history: CrisisBacktestPoint[] = [{ month: 0, yearNum: 0, assetValue: initialAsset, spentValue: monthlySpending }];
  
  let currentAsset = initialAsset;
  let hasDepleted = false;
  let depletionMonth: number | null = null;
  
  // GK 動態提領護欄判定基準
  const yearlySpending = monthlySpending * 12;
  const gkTarget = yearlySpending / 0.05;

  // 10年 (120個月)
  const totalMonths = 120;

  for (let m = 1; m <= totalMonths; m++) {
    if (currentAsset <= 0) {
      if (!hasDepleted) {
        hasDepleted = true;
        depletionMonth = m - 1;
      }
      currentAsset = 0;
      history.push({
        month: m,
        yearNum: Math.ceil(m / 12),
        assetValue: 0,
        spentValue: 0
      });
      continue;
    }

    const yearIndex = Math.floor((m - 1) / 12); // 0 ~ 9 年
    
    // 計算該月的資產回報率 (年收益率均攤為月收益率)
    const getMonthlyReturn = (yearlyRet: number) => {
      return Math.pow(1 + yearlyRet, 1 / 12) - 1;
    };

    const monthlyTw = getMonthlyReturn(returns.tw_stock[yearIndex]);
    const monthlyUs = getMonthlyReturn(returns.us_stock[yearIndex]);
    const monthlyBond = getMonthlyReturn(returns.bond[yearIndex]);
    const monthlyCrypto = getMonthlyReturn(returns.crypto[yearIndex]);
    const monthlyCash = getMonthlyReturn(returns.cash[yearIndex]);

    // 依配置比例算出該月投資組合的加權報酬率
    const portfolioReturn =
      allocation.tw_stock * monthlyTw +
      allocation.us_stock * monthlyUs +
      allocation.bond * monthlyBond +
      allocation.crypto * monthlyCrypto +
      allocation.cash * monthlyCash;

    // 計算本期提領支出 (隨通膨逐月滾增)
    let currentSpending = monthlySpending * Math.pow(1 + inflation / 12, m);

    // A. 支出微笑曲線 (假設提領期第 1 至 10 年，年齡為 60 至 70 歲，微笑折減尚未完全顯現，但在回測中依然支援)
    if (enableSpendingSmile) {
      const simulatedAge = 60 + yearIndex;
      let smileFactor = 1.0;
      if (simulatedAge > 70) {
        smileFactor = 1.0 - (simulatedAge - 70) * 0.025;
      }
      currentSpending *= smileFactor;
    }

    // B. GK 動態提領護欄
    if (enableGk) {
      if (currentAsset >= gkTarget * 1.2) {
        currentSpending *= 1.1; // 富裕增領
      } else if (currentAsset <= gkTarget * 0.8) {
        currentSpending *= 0.9; // 防禦減領
      }
    }

    // 扣除本月提領額 (期初提領)
    currentAsset = Math.max(0, currentAsset - currentSpending);

    // 滾存本月加權報酬率 (期末增值)
    currentAsset = currentAsset * (1 + portfolioReturn);

    history.push({
      month: m,
      yearNum: Math.ceil(m / 12),
      assetValue: Math.round(currentAsset),
      spentValue: Math.round(currentSpending)
    });
  }

  return {
    history,
    isDepleted: hasDepleted,
    depletionMonth,
    finalAsset: Math.round(currentAsset)
  };
};
