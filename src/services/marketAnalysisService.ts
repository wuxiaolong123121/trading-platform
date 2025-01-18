import { errorHandler } from './errorHandler';
import { useWebSocketStore } from './websocket';
import { getKlineData } from './klineService';

export interface MarketAnalysis {
  symbol: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  technicalScore: number;  // 0-100
  volatilityScore: number; // 0-100
  trendScore: number;      // 0-100
  signals: {
    macd: 'buy' | 'sell' | 'neutral';
    rsi: 'buy' | 'sell' | 'neutral';
    bollingerBands: 'buy' | 'sell' | 'neutral';
    movingAverages: 'buy' | 'sell' | 'neutral';
  };
  recommendation: {
    action: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
    confidence: number; // 0-1
    reasons: string[];
  };
}

export async function analyzeMarket(symbol: string): Promise<MarketAnalysis> {
  try {
    const ws = useWebSocketStore.getState();
    const klines = await getKlineData(symbol, '1d', 30); // 获取30天的日线数据

    // 获取当前价格和24小时变化
    const currentPrice = ws.marketData.price || 0;
    const priceChange = ws.marketData.priceChange24h || 0;

    // 计算技术指标
    const technicalIndicators = calculateTechnicalIndicators(klines);
    const volatility = calculateVolatility(klines);
    const trend = analyzeTrend(klines);

    // 生成信号
    const signals = generateSignals(technicalIndicators);

    // 计算综合得分
    const technicalScore = calculateTechnicalScore(signals);
    const volatilityScore = normalizeScore(volatility, 0, 100);
    const trendScore = normalizeScore(trend.strength, 0, 100);

    // 生成建议
    const recommendation = generateRecommendation(
      technicalScore,
      volatilityScore,
      trendScore,
      signals,
      trend.direction
    );

    return {
      symbol,
      price: currentPrice,
      priceChange24h: priceChange,
      volume24h: ws.marketData.volume24h || 0,
      marketCap: ws.marketData.marketCap || 0,
      technicalScore,
      volatilityScore,
      trendScore,
      signals,
      recommendation
    };
  } catch (error) {
    errorHandler.handleError('市场分析失败', 'medium', { symbol, error });
    throw error;
  }
}

function calculateTechnicalIndicators(klines: any[]) {
  // 计算MACD
  const macd = calculateMACD(klines);
  
  // 计算RSI
  const rsi = calculateRSI(klines);
  
  // 计算布林带
  const bb = calculateBollingerBands(klines);
  
  // 计算移动平均线
  const ma = calculateMovingAverages(klines);

  return { macd, rsi, bb, ma };
}

function calculateMACD(klines: any[]) {
  const prices = klines.map(k => k.close);
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macdLine = ema12[ema12.length - 1] - ema26[ema26.length - 1];
  const signalLine = calculateEMA([...ema12.map((e, i) => e - ema26[i])], 9);
  
  return {
    macdLine,
    signalLine: signalLine[signalLine.length - 1],
    histogram: macdLine - signalLine[signalLine.length - 1]
  };
}

function calculateRSI(klines: any[], period = 14) {
  const prices = klines.map(k => k.close);
  let gains = 0;
  let losses = 0;

  for (let i = 1; i < period + 1; i++) {
    const difference = prices[prices.length - i] - prices[prices.length - i - 1];
    if (difference >= 0) {
      gains += difference;
    } else {
      losses -= difference;
    }
  }

  const averageGain = gains / period;
  const averageLoss = losses / period;
  
  return 100 - (100 / (1 + (averageGain / averageLoss)));
}

function calculateBollingerBands(klines: any[], period = 20) {
  const prices = klines.map(k => k.close);
  const sma = calculateSMA(prices, period);
  const standardDeviation = calculateStandardDeviation(prices, sma[sma.length - 1]);

  return {
    middle: sma[sma.length - 1],
    upper: sma[sma.length - 1] + (standardDeviation * 2),
    lower: sma[sma.length - 1] - (standardDeviation * 2)
  };
}

function calculateMovingAverages(klines: any[]) {
  const prices = klines.map(k => k.close);
  return {
    ma7: calculateSMA(prices, 7),
    ma25: calculateSMA(prices, 25),
    ma99: calculateSMA(prices, 99)
  };
}

function calculateEMA(prices: number[], period: number): number[] {
  const multiplier = 2 / (period + 1);
  const ema: number[] = [prices[0]];

  for (let i = 1; i < prices.length; i++) {
    ema.push((prices[i] - ema[i - 1]) * multiplier + ema[i - 1]);
  }

  return ema;
}

function calculateSMA(prices: number[], period: number): number[] {
  const sma: number[] = [];
  for (let i = period - 1; i < prices.length; i++) {
    const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    sma.push(sum / period);
  }
  return sma;
}

function calculateStandardDeviation(prices: number[], mean: number): number {
  const squareDiffs = prices.map(price => Math.pow(price - mean, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / prices.length;
  return Math.sqrt(avgSquareDiff);
}

function calculateVolatility(klines: any[]): number {
  const returns = [];
  for (let i = 1; i < klines.length; i++) {
    returns.push((klines[i].close - klines[i - 1].close) / klines[i - 1].close);
  }
  return calculateStandardDeviation(returns, returns.reduce((a, b) => a + b, 0) / returns.length) * Math.sqrt(365);
}

function analyzeTrend(klines: any[]) {
  const prices = klines.map(k => k.close);
  const ma7 = calculateSMA(prices, 7);
  const ma25 = calculateSMA(prices, 25);
  const ma99 = calculateSMA(prices, 99);

  const direction = 
    ma7[ma7.length - 1] > ma25[ma25.length - 1] && 
    ma25[ma25.length - 1] > ma99[ma99.length - 1] 
      ? 'up' 
      : ma7[ma7.length - 1] < ma25[ma25.length - 1] && 
        ma25[ma25.length - 1] < ma99[ma99.length - 1]
        ? 'down'
        : 'sideways';

  const strength = calculateTrendStrength(prices, ma7, ma25, ma99);

  return { direction, strength };
}

function calculateTrendStrength(
  prices: number[],
  ma7: number[],
  ma25: number[],
  ma99: number[]
): number {
  const priceVolatility = calculateStandardDeviation(prices, prices.reduce((a, b) => a + b, 0) / prices.length);
  const ma7Slope = (ma7[ma7.length - 1] - ma7[ma7.length - 2]) / ma7[ma7.length - 2];
  const ma25Slope = (ma25[ma25.length - 1] - ma25[ma25.length - 2]) / ma25[ma25.length - 2];
  const ma99Slope = (ma99[ma99.length - 1] - ma99[ma99.length - 2]) / ma99[ma99.length - 2];

  return Math.abs((ma7Slope + ma25Slope + ma99Slope) / (3 * priceVolatility)) * 100;
}

function generateSignals(indicators: any) {
  return {
    macd: indicators.macd.histogram > 0 ? 'buy' : indicators.macd.histogram < 0 ? 'sell' : 'neutral',
    rsi: indicators.rsi > 70 ? 'sell' : indicators.rsi < 30 ? 'buy' : 'neutral',
    bollingerBands: indicators.bb.middle > indicators.bb.upper ? 'sell' : 
                    indicators.bb.middle < indicators.bb.lower ? 'buy' : 'neutral',
    movingAverages: indicators.ma.ma7[indicators.ma.ma7.length - 1] > indicators.ma.ma25[indicators.ma.ma25.length - 1] ? 
                    'buy' : 'sell'
  };
}

function calculateTechnicalScore(signals: any): number {
  let score = 50;
  const weights = {
    macd: 0.3,
    rsi: 0.2,
    bollingerBands: 0.2,
    movingAverages: 0.3
  };

  Object.entries(signals).forEach(([indicator, signal]) => {
    if (signal === 'buy') {
      score += 25 * (weights as any)[indicator];
    } else if (signal === 'sell') {
      score -= 25 * (weights as any)[indicator];
    }
  });

  return Math.min(Math.max(score, 0), 100);
}

function normalizeScore(value: number, min: number, max: number): number {
  return Math.min(Math.max(((value - min) / (max - min)) * 100, 0), 100);
}

function generateRecommendation(
  technicalScore: number,
  volatilityScore: number,
  trendScore: number,
  signals: any,
  trendDirection: string
) {
  const reasons: string[] = [];
  let action: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell' = 'hold';
  let confidence = 0;

  // 评估技术分析信号
  const buySignals = Object.values(signals).filter(s => s === 'buy').length;
  const sellSignals = Object.values(signals).filter(s => s === 'sell').length;
  
  if (buySignals >= 3) {
    reasons.push('多个技术指标显示买入信号');
    action = 'strong_buy';
    confidence += 0.3;
  } else if (buySignals >= 2) {
    reasons.push('部分技术指标显示买入信号');
    action = 'buy';
    confidence += 0.2;
  } else if (sellSignals >= 3) {
    reasons.push('多个技术指标显示卖出信号');
    action = 'strong_sell';
    confidence += 0.3;
  } else if (sellSignals >= 2) {
    reasons.push('部分技术指标显示卖出信号');
    action = 'sell';
    confidence += 0.2;
  }

  // 评估趋势
  if (trendDirection === 'up' && trendScore > 70) {
    reasons.push('强劲上升趋势');
    confidence += 0.2;
    if (action === 'hold') action = 'buy';
  } else if (trendDirection === 'down' && trendScore > 70) {
    reasons.push('强劲下降趋势');
    confidence += 0.2;
    if (action === 'hold') action = 'sell';
  } else {
    reasons.push('市场趋势不明显');
  }

  // 评估波动性
  if (volatilityScore > 80) {
    reasons.push('市场波动性较大，建议谨慎操作');
    confidence -= 0.1;
  } else if (volatilityScore < 20) {
    reasons.push('市场波动性较小，可能存在突破机会');
    confidence += 0.1;
  }

  // 技术得分评估
  if (technicalScore > 80) {
    reasons.push('技术指标整体看多');
    if (action === 'hold') action = 'buy';
    confidence += 0.2;
  } else if (technicalScore < 20) {
    reasons.push('技术指标整体看空');
    if (action === 'hold') action = 'sell';
    confidence += 0.2;
  }

  return {
    action,
    confidence: Math.min(confidence, 1),
    reasons
  };
}
