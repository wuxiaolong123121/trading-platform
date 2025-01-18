import { subDays, subMonths, subYears } from 'date-fns';

interface Trade {
  timestamp: Date;
  pnl: number;
  value: number;
}

interface DailyReturn {
  date: Date;
  return: number;
}

export const metricsService = {
  /**
   * 计算性能指标
   */
  calculateMetrics: (trades: Trade[], portfolioValue: number, benchmarkReturns: number[]) => {
    const returns = trades.map(t => t.pnl / t.value);
    const dailyReturns = calculateDailyReturns(trades);
    
    // 计算基础指标
    const totalTrades = trades.length;
    const winningTrades = trades.filter(t => t.pnl > 0).length;
    const winRate = (winningTrades / totalTrades) * 100;
    
    // 计算收益指标
    const totalReturn = calculateTotalReturn(trades);
    const avgProfit = returns.reduce((sum, r) => sum + r, 0) / returns.length * 100;
    const maxDrawdown = calculateMaxDrawdown(dailyReturns);
    
    // 计算风险指标
    const volatility = calculateVolatility(dailyReturns);
    const sharpeRatio = calculateSharpeRatio(dailyReturns, 0.02); // 假设无风险利率为2%
    const sortinoRatio = calculateSortinoRatio(dailyReturns, 0.02);
    
    // 计算连续交易指标
    const streaks = calculateStreaks(trades);
    
    // 计算高级指标
    const { alpha, beta } = calculateAlphaBeta(dailyReturns, benchmarkReturns);
    const informationRatio = calculateInformationRatio(dailyReturns, benchmarkReturns);
    const calmarRatio = calculateCalmarRatio(totalReturn, maxDrawdown);

    return {
      // 基础指标
      totalTrades,
      winRate,
      avgProfit,
      maxDrawdown,
      
      // 收益指标
      totalReturn,
      annualizedReturn: calculateAnnualizedReturn(totalReturn, trades),
      dailyReturn: avgProfit / 252, // 假设一年252个交易日
      maxSingleReturn: Math.max(...returns) * 100,
      maxSingleLoss: Math.min(...returns) * 100,
      
      // 风险指标
      volatility,
      sharpeRatio,
      sortinoRatio,
      calmarRatio,
      
      // 连续交易指标
      maxConsecutiveWins: streaks.maxWins,
      maxConsecutiveLosses: streaks.maxLosses,
      
      // 高级指标
      alpha,
      beta,
      informationRatio
    };
  },

  /**
   * 计算特定时间范围的指标
   */
  calculateTimeRangeMetrics: (trades: Trade[], range: string) => {
    const now = new Date();
    let startDate: Date;
    
    switch (range) {
      case '1d':
        startDate = subDays(now, 1);
        break;
      case '1w':
        startDate = subDays(now, 7);
        break;
      case '1m':
        startDate = subMonths(now, 1);
        break;
      case '3m':
        startDate = subMonths(now, 3);
        break;
      case '1y':
        startDate = subYears(now, 1);
        break;
      default:
        startDate = new Date(0); // 全部历史
    }
    
    const filteredTrades = trades.filter(t => t.timestamp >= startDate);
    return metricsService.calculateMetrics(filteredTrades, 0, []); // 需要提供实际的benchmark数据
  }
};

// 辅助函数
function calculateDailyReturns(trades: Trade[]): DailyReturn[] {
  const dailyMap = new Map<string, number>();
  
  trades.forEach(trade => {
    const date = trade.timestamp.toISOString().split('T')[0];
    const currentReturn = dailyMap.get(date) || 0;
    dailyMap.set(date, currentReturn + (trade.pnl / trade.value));
  });
  
  return Array.from(dailyMap.entries()).map(([date, ret]) => ({
    date: new Date(date),
    return: ret
  }));
}

function calculateTotalReturn(trades: Trade[]): number {
  const initial = trades[0]?.value || 0;
  const final = trades[trades.length - 1]?.value || 0;
  return ((final - initial) / initial) * 100;
}

function calculateMaxDrawdown(returns: DailyReturn[]): number {
  let peak = -Infinity;
  let maxDrawdown = 0;
  let currentValue = 100; // 从100开始计算
  
  returns.forEach(({ return: ret }) => {
    currentValue *= (1 + ret);
    peak = Math.max(peak, currentValue);
    const drawdown = (peak - currentValue) / peak * 100;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
  });
  
  return maxDrawdown;
}

function calculateVolatility(returns: DailyReturn[]): number {
  const returnValues = returns.map(r => r.return);
  const mean = returnValues.reduce((sum, r) => sum + r, 0) / returnValues.length;
  const squaredDiffs = returnValues.map(r => Math.pow(r - mean, 2));
  const variance = squaredDiffs.reduce((sum, sq) => sum + sq, 0) / returnValues.length;
  return Math.sqrt(variance * 252) * 100; // 年化波动率
}

function calculateSharpeRatio(returns: DailyReturn[], riskFreeRate: number): number {
  const returnValues = returns.map(r => r.return);
  const mean = returnValues.reduce((sum, r) => sum + r, 0) / returnValues.length;
  const volatility = calculateVolatility(returns) / 100;
  return (mean * 252 - riskFreeRate) / volatility;
}

function calculateSortinoRatio(returns: DailyReturn[], riskFreeRate: number): number {
  const returnValues = returns.map(r => r.return);
  const mean = returnValues.reduce((sum, r) => sum + r, 0) / returnValues.length;
  const negativeReturns = returnValues.filter(r => r < 0);
  const downside = Math.sqrt(
    negativeReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / negativeReturns.length * 252
  );
  return (mean * 252 - riskFreeRate) / downside;
}

function calculateStreaks(trades: Trade[]): { maxWins: number; maxLosses: number } {
  let currentWinStreak = 0;
  let currentLossStreak = 0;
  let maxWins = 0;
  let maxLosses = 0;
  
  trades.forEach(trade => {
    if (trade.pnl > 0) {
      currentWinStreak++;
      currentLossStreak = 0;
      maxWins = Math.max(maxWins, currentWinStreak);
    } else {
      currentLossStreak++;
      currentWinStreak = 0;
      maxLosses = Math.max(maxLosses, currentLossStreak);
    }
  });
  
  return { maxWins, maxLosses };
}

function calculateAlphaBeta(returns: DailyReturn[], benchmarkReturns: number[]): { alpha: number; beta: number } {
  // 简化版本的计算，实际应该使用回归分析
  const returnValues = returns.map(r => r.return);
  const covariance = calculateCovariance(returnValues, benchmarkReturns);
  const benchmarkVariance = calculateVariance(benchmarkReturns);
  const beta = covariance / benchmarkVariance;
  
  const portfolioMean = returnValues.reduce((sum, r) => sum + r, 0) / returnValues.length;
  const benchmarkMean = benchmarkReturns.reduce((sum, r) => sum + r, 0) / benchmarkReturns.length;
  const alpha = (portfolioMean - 0.02/252) - beta * (benchmarkMean - 0.02/252);
  
  return { alpha: alpha * 252 * 100, beta };
}

function calculateInformationRatio(returns: DailyReturn[], benchmarkReturns: number[]): number {
  const returnValues = returns.map(r => r.return);
  const excessReturns = returnValues.map((r, i) => r - benchmarkReturns[i]);
  const mean = excessReturns.reduce((sum, r) => sum + r, 0) / excessReturns.length;
  const trackingError = Math.sqrt(
    excessReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / excessReturns.length * 252
  );
  return (mean * 252) / trackingError;
}

function calculateCalmarRatio(totalReturn: number, maxDrawdown: number): number {
  return totalReturn / maxDrawdown;
}

function calculateAnnualizedReturn(totalReturn: number, trades: Trade[]): number {
  const firstDate = trades[0]?.timestamp;
  const lastDate = trades[trades.length - 1]?.timestamp;
  if (!firstDate || !lastDate) return 0;
  
  const years = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
  return Math.pow(1 + totalReturn / 100, 1 / years) - 1;
}

function calculateCovariance(a: number[], b: number[]): number {
  const meanA = a.reduce((sum, val) => sum + val, 0) / a.length;
  const meanB = b.reduce((sum, val) => sum + val, 0) / b.length;
  const products = a.map((val, i) => (val - meanA) * (b[i] - meanB));
  return products.reduce((sum, val) => sum + val, 0) / a.length;
}

function calculateVariance(values: number[]): number {
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
}
