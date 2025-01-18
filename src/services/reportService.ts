import { create } from 'zustand';
import { errorHandler } from './errorHandler';

interface TradeRecord {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  price: number;
  amount: number;
  total: number;
  fee: number;
  timestamp: number;
}

interface DailyReport {
  date: string;
  trades: number;
  volume: number;
  profit: number;
  fees: number;
  winRate: number;
}

interface ProfitRecord {
  timestamp: number;
  profit: number;
  balance: number;
}

interface ReportState {
  tradeHistory: TradeRecord[];
  dailyReports: DailyReport[];
  profitHistory: ProfitRecord[];
  addTrade: (trade: Omit<TradeRecord, 'id' | 'timestamp'>) => void;
  generateDailyReport: (date: string) => DailyReport;
  generateProfitChart: (startDate: Date, endDate: Date) => ProfitRecord[];
  exportTradeHistory: (format: 'csv' | 'json') => string;
  calculateMetrics: () => {
    totalTrades: number;
    winRate: number;
    averageProfit: number;
    totalProfit: number;
    maxDrawdown: number;
  };
}

export const useReport = create<ReportState>((set, get) => ({
  tradeHistory: [],
  dailyReports: [],
  profitHistory: [],

  addTrade: (trade) => {
    const newTrade: TradeRecord = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      ...trade
    };

    set(state => ({
      tradeHistory: [...state.tradeHistory, newTrade]
    }));

    // 更新每日报表
    const date = new Date().toISOString().split('T')[0];
    const dailyReport = get().generateDailyReport(date);
    
    set(state => ({
      dailyReports: [
        ...state.dailyReports.filter(r => r.date !== date),
        dailyReport
      ]
    }));

    // 更新利润历史
    const currentBalance = get().profitHistory[get().profitHistory.length - 1]?.balance || 0;
    const profit = trade.type === 'sell' 
      ? (trade.price - trade.total / trade.amount) * trade.amount - trade.fee
      : 0;

    set(state => ({
      profitHistory: [
        ...state.profitHistory,
        {
          timestamp: Date.now(),
          profit,
          balance: currentBalance + profit
        }
      ]
    }));
  },

  generateDailyReport: (date) => {
    try {
      const { tradeHistory } = get();
      const startTime = new Date(date).getTime();
      const endTime = startTime + 24 * 60 * 60 * 1000;

      const dailyTrades = tradeHistory.filter(
        trade => trade.timestamp >= startTime && trade.timestamp < endTime
      );

      const volume = dailyTrades.reduce((sum, trade) => sum + trade.total, 0);
      const fees = dailyTrades.reduce((sum, trade) => sum + trade.fee, 0);
      
      const sellTrades = dailyTrades.filter(trade => trade.type === 'sell');
      const profit = sellTrades.reduce((sum, trade) => {
        const buyTrade = tradeHistory.find(t => 
          t.type === 'buy' && 
          t.symbol === trade.symbol && 
          t.timestamp < trade.timestamp
        );
        if (!buyTrade) return sum;
        return sum + (trade.price - buyTrade.price) * trade.amount - trade.fee;
      }, 0);

      const winTrades = sellTrades.filter(trade => {
        const buyTrade = tradeHistory.find(t => 
          t.type === 'buy' && 
          t.symbol === trade.symbol && 
          t.timestamp < trade.timestamp
        );
        return buyTrade && (trade.price > buyTrade.price);
      });

      return {
        date,
        trades: dailyTrades.length,
        volume,
        profit,
        fees,
        winRate: sellTrades.length ? winTrades.length / sellTrades.length : 0
      };
    } catch (error) {
      errorHandler.handleError('生成每日报表失败', 'medium', { error, date });
      throw error;
    }
  },

  generateProfitChart: (startDate, endDate) => {
    try {
      const { profitHistory } = get();
      return profitHistory.filter(record => 
        record.timestamp >= startDate.getTime() && 
        record.timestamp <= endDate.getTime()
      );
    } catch (error) {
      errorHandler.handleError('生成利润图表失败', 'medium', { error });
      throw error;
    }
  },

  exportTradeHistory: (format) => {
    try {
      const { tradeHistory } = get();

      if (format === 'csv') {
        const headers = ['ID', '交易对', '类型', '价格', '数量', '总额', '手续费', '时间'];
        const rows = tradeHistory.map(trade => [
          trade.id,
          trade.symbol,
          trade.type,
          trade.price,
          trade.amount,
          trade.total,
          trade.fee,
          new Date(trade.timestamp).toISOString()
        ]);
        
        return [headers, ...rows]
          .map(row => row.join(','))
          .join('\n');
      }

      return JSON.stringify(tradeHistory, null, 2);
    } catch (error) {
      errorHandler.handleError('导出交易历史失败', 'medium', { error });
      throw error;
    }
  },

  calculateMetrics: () => {
    try {
      const { tradeHistory, profitHistory } = get();
      
      const sellTrades = tradeHistory.filter(trade => trade.type === 'sell');
      const winTrades = sellTrades.filter(trade => {
        const buyTrade = tradeHistory.find(t => 
          t.type === 'buy' && 
          t.symbol === trade.symbol && 
          t.timestamp < trade.timestamp
        );
        return buyTrade && (trade.price > buyTrade.price);
      });

      const totalProfit = profitHistory.reduce((sum, record) => sum + record.profit, 0);
      
      // 计算最大回撤
      let maxDrawdown = 0;
      let peak = 0;
      profitHistory.forEach(record => {
        if (record.balance > peak) {
          peak = record.balance;
        }
        const drawdown = peak - record.balance;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }
      });

      return {
        totalTrades: sellTrades.length,
        winRate: sellTrades.length ? winTrades.length / sellTrades.length : 0,
        averageProfit: sellTrades.length ? totalProfit / sellTrades.length : 0,
        totalProfit,
        maxDrawdown
      };
    } catch (error) {
      errorHandler.handleError('计算交易指标失败', 'medium', { error });
      throw error;
    }
  }
}));
