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
  strategy: 'four_percent' | 'gk_dynamic' | 'die_to_zero',
  maxAge: number = 85
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
    for (let y = 1; y <= totalYears; y++) {
      const age = currentAge + y;
      const randomReturn = randomNormal(expectedReturn, std);
      
      if (age <= retireAge) {
        // 1. 累積期 (當前年齡至退休年齡)
        currentAsset = (currentAsset * (1 + randomReturn) + yearlyInvest) / (1 + inflation);
      } else {
        // 2. 提領消耗期 (已退休)
        let withdrawAmount = yearlySpending;
        
        if (strategy === 'gk_dynamic') {
          // GK 動態護欄機制
          if (currentAsset >= gkTarget * 1.2) {
            withdrawAmount = yearlySpending * 1.1; // 富裕增領 10%
          } else if (currentAsset <= gkTarget * 0.8) {
            withdrawAmount = yearlySpending * 0.9; // 防禦減領 10%
          }
        } else if (strategy === 'die_to_zero') {
          // Die to Zero 年金均攤
          const remainingYears = maxAge - age + 1;
          if (remainingYears > 0) {
            const annuityFactor = (1 - Math.pow(1 + rReal, -remainingYears)) / rReal;
            withdrawAmount = currentAsset / annuityFactor;
          } else {
            withdrawAmount = currentAsset;
          }
        }
        
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
