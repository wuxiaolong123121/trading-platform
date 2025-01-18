import { format } from 'date-fns';

interface TradeRecord {
  timestamp: Date;
  pair: string;
  side: 'buy' | 'sell';
  amount: number;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  fee: number;
}

export const exportService = {
  /**
   * 导出交易记录到CSV
   */
  exportToCSV: (trades: TradeRecord[], filename = 'trading_history.csv') => {
    // CSV 头部
    const headers = [
      '时间',
      '交易对',
      '方向',
      '数量',
      '入场价',
      '出场价',
      '盈亏',
      '手续费',
      '盈亏率(%)'
    ];

    // 转换数据为CSV行
    const rows = trades.map(trade => [
      format(trade.timestamp, 'yyyy-MM-dd HH:mm:ss'),
      trade.pair,
      trade.side === 'buy' ? '买入' : '卖出',
      trade.amount.toFixed(8),
      trade.entryPrice.toFixed(2),
      trade.exitPrice.toFixed(2),
      trade.pnl.toFixed(2),
      trade.fee.toFixed(4),
      ((trade.pnl / (trade.amount * trade.entryPrice)) * 100).toFixed(2)
    ]);

    // 组合CSV内容
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // 创建Blob并下载
    const blob = new Blob(['\ufeff' + csvContent], { 
      type: 'text/csv;charset=utf-8;' 
    });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  /**
   * 导出性能报告
   */
  exportPerformanceReport: (
    metrics: any,
    trades: TradeRecord[],
    filename = 'performance_report.csv'
  ) => {
    const sections = [
      ['性能指标报告', ''],
      ['生成时间', format(new Date(), 'yyyy-MM-dd HH:mm:ss')],
      [''],
      ['总体表现', ''],
      ['总交易次数', metrics.totalTrades],
      ['胜率', `${metrics.winRate}%`],
      ['平均收益', `${metrics.avgProfit}%`],
      ['最大回撤', `${metrics.maxDrawdown}%`],
      ['夏普比率', metrics.sharpeRatio],
      ['收益回撤比', metrics.calmarRatio],
      ['最大连续盈利', metrics.maxConsecutiveWins],
      ['最大连续亏损', metrics.maxConsecutiveLosses],
      [''],
      ['收益统计', ''],
      ['总收益', `${metrics.totalReturn}%`],
      ['年化收益', `${metrics.annualizedReturn}%`],
      ['日均收益', `${metrics.dailyReturn}%`],
      ['最大单笔收益', `${metrics.maxSingleReturn}%`],
      ['最大单笔亏损', `${metrics.maxSingleLoss}%`],
      [''],
      ['风险指标', ''],
      ['波动率', `${metrics.volatility}%`],
      ['Beta', metrics.beta],
      ['Alpha', `${metrics.alpha}%`],
      ['信息比率', metrics.informationRatio],
      ['索提诺比率', metrics.sortinoRatio],
    ];

    const csvContent = sections.map(row => row.join(',')).join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { 
      type: 'text/csv;charset=utf-8;' 
    });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
