import { TradingBot } from './tradingBot';
import { errorHandler } from './errorHandler';

export interface DailyTradeAnalysis {
  date: string;
  totalBuyVolume: number;
  totalSellVolume: number;
  totalBuyAmount: number;
  totalSellAmount: number;
  profitLoss: number;
  winRate: number;
  totalTrades: number;
  averageHoldingTime: number;
  bestTrade: {
    type: 'buy' | 'sell';
    profit: number;
    time: number;
  };
  worstTrade: {
    type: 'buy' | 'sell';
    profit: number;
    time: number;
  };
}

export function analyzeDailyTrades(bot: TradingBot): DailyTradeAnalysis {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // 过滤今日交易
    const todayTrades = bot.performance.trades.filter(trade => {
      const tradeDate = new Date(trade.time);
      return tradeDate >= today;
    });

    // 计算买卖量和金额
    const buyTrades = todayTrades.filter(t => t.type === 'buy');
    const sellTrades = todayTrades.filter(t => t.type === 'sell');

    const totalBuyVolume = buyTrades.reduce((sum, t) => sum + t.amount, 0);
    const totalSellVolume = sellTrades.reduce((sum, t) => sum + t.amount, 0);
    const totalBuyAmount = buyTrades.reduce((sum, t) => sum + t.amount * t.price, 0);
    const totalSellAmount = sellTrades.reduce((sum, t) => sum + t.amount * t.price, 0);

    // 计算盈亏和胜率
    const profitLoss = todayTrades.reduce((sum, t) => sum + t.pnl, 0);
    const winningTrades = todayTrades.filter(t => t.pnl > 0);
    const winRate = todayTrades.length > 0 ? winningTrades.length / todayTrades.length : 0;

    // 计算最佳和最差交易
    const sortedByProfit = [...todayTrades].sort((a, b) => b.pnl - a.pnl);
    const bestTrade = sortedByProfit[0] || { type: 'buy', profit: 0, time: Date.now() };
    const worstTrade = sortedByProfit[sortedByProfit.length - 1] || { type: 'buy', profit: 0, time: Date.now() };

    // 计算平均持仓时间
    let totalHoldingTime = 0;
    let pairedTrades = 0;
    for (let i = 0; i < todayTrades.length - 1; i++) {
      if (todayTrades[i].type === 'buy' && todayTrades[i + 1].type === 'sell') {
        totalHoldingTime += todayTrades[i + 1].time - todayTrades[i].time;
        pairedTrades++;
      }
    }
    const averageHoldingTime = pairedTrades > 0 ? totalHoldingTime / pairedTrades : 0;

    return {
      date: today.toISOString().split('T')[0],
      totalBuyVolume,
      totalSellVolume,
      totalBuyAmount,
      totalSellAmount,
      profitLoss,
      winRate,
      totalTrades: todayTrades.length,
      averageHoldingTime,
      bestTrade: {
        type: bestTrade.type,
        profit: bestTrade.pnl,
        time: bestTrade.time
      },
      worstTrade: {
        type: worstTrade.type,
        profit: worstTrade.pnl,
        time: worstTrade.time
      }
    };
  } catch (error) {
    errorHandler.handleError('分析交易数据时出错', 'medium', { error });
    throw error;
  }
}

export function generateTradingReport(analysis: DailyTradeAnalysis): string {
  const formatNumber = (num: number) => num.toFixed(2);
  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / (1000 * 60));
    return `${minutes} 分钟`;
  };
  const formatPercent = (num: number) => `${(num * 100).toFixed(1)}%`;
  const formatDateTime = (timestamp: number) => new Date(timestamp).toLocaleTimeString();

  const profitStatus = analysis.profitLoss > 0 ? '📈 盈利' : '📉 亏损';
  const profitColor = analysis.profitLoss > 0 ? '🟢' : '🔴';
  const winRateStatus = analysis.winRate > 0.5 ? '👍 良好' : '👎 需改进';

  const suggestions = generateTradingSuggestions(analysis);

  return `
📊 今日交易分析报告
${new Date().toLocaleString()}

💰 盈亏概况
${profitColor} 当日盈亏: ${formatNumber(analysis.profitLoss)} USDT (${profitStatus})
📈 交易胜率: ${formatPercent(analysis.winRate)} (${winRateStatus})
🔄 总交易次数: ${analysis.totalTrades} 次
⏱️ 平均持仓时间: ${formatTime(analysis.averageHoldingTime)}

📊 交易数据
买入总量: ${formatNumber(analysis.totalBuyVolume)}
卖出总量: ${formatNumber(analysis.totalSellVolume)}
买入金额: ${formatNumber(analysis.totalBuyAmount)} USDT
卖出金额: ${formatNumber(analysis.totalSellAmount)} USDT

🏆 最佳交易
类型: ${analysis.bestTrade.type === 'buy' ? '买入' : '卖出'}
盈利: ${formatNumber(analysis.bestTrade.profit)} USDT
时间: ${formatDateTime(analysis.bestTrade.time)}

💡 交易建议
${suggestions}

⚠️ 风险提示
• 以上分析基于历史数据，不代表未来表现
• 请合理控制仓位，设置止损保护资金安全
• 建议定期检查和优化交易策略
`;
}

export function generateTradingSuggestions(analysis: DailyTradeAnalysis): string {
  const suggestions: string[] = [];

  // 根据胜率给出建议
  if (analysis.winRate < 0.4) {
    suggestions.push('• 当前胜率偏低，建议暂时降低交易频率，重新评估交易策略');
  } else if (analysis.winRate > 0.6) {
    suggestions.push('• 交易胜率良好，可以适当增加仓位，但注意控制风险');
  }

  // 根据持仓时间给出建议
  if (analysis.averageHoldingTime < 5 * 60 * 1000) { // 小于5分钟
    suggestions.push('• 平均持仓时间较短，可能错过更多盈利机会，建议适当延长持仓时间');
  } else if (analysis.averageHoldingTime > 120 * 60 * 1000) { // 大于2小时
    suggestions.push('• 持仓时间较长，建议设置更合理的止盈止损位，及时了结交易');
  }

  // 根据交易量给出建议
  const volumeRatio = analysis.totalSellVolume / analysis.totalBuyVolume;
  if (volumeRatio < 0.8) {
    suggestions.push('• 买入量明显大于卖出量，注意及时止盈或止损，避免资金沉淀');
  } else if (volumeRatio > 1.2) {
    suggestions.push('• 卖出量明显大于买入量，建议保留一定仓位把握可能的上涨机会');
  }

  // 根据盈亏情况给出建议
  if (analysis.profitLoss < 0) {
    suggestions.push('• 当日处于亏损状态，建议：\n  1. 检查止损设置是否合理\n  2. 降低交易频率\n  3. 等待更明确的市场信号');
  }

  // 如果没有交易记录
  if (analysis.totalTrades === 0) {
    return '• 今日暂无交易记录，建议：\n  1. 检查交易策略是否过于保守\n  2. 确认是否错过重要交易信号\n  3. 关注市场波动机会';
  }

  return suggestions.join('\n');
}
