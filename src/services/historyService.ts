import axios from 'axios';
import { Trade, HistoricalData } from '../types/trading';

const API_BASE_URL = 'http://localhost:3000/api';

// 模拟数据生成函数
const generateMockData = () => {
    const now = new Date();
    const mockTrades: Trade[] = Array.from({ length: 20 }, (_, i) => ({
        id: `trade-${i}`,
        symbol: ['AAPL', 'GOOGL', 'MSFT', 'AMZN'][Math.floor(Math.random() * 4)],
        entryPrice: 100 + Math.random() * 100,
        exitPrice: 150 + Math.random() * 100,
        quantity: Math.floor(Math.random() * 100) + 1,
        entryTime: new Date(now.getTime() - (20 - i) * 24 * 60 * 60 * 1000).toISOString(),
        exitTime: new Date(now.getTime() - (19 - i) * 24 * 60 * 60 * 1000).toISOString(),
        type: Math.random() > 0.5 ? 'BUY' : 'SELL',
        status: 'CLOSED',
        pnl: Math.random() * 1000 - 500,
    }));

    const mockHistoricalData: HistoricalData[] = Array.from({ length: 30 }, (_, i) => ({
        timestamp: new Date(now.getTime() - (30 - i) * 24 * 60 * 60 * 1000).toISOString(),
        value: 10000 + Math.random() * 5000,
        change: Math.random() * 200 - 100,
    }));

    return { trades: mockTrades, historicalData: mockHistoricalData };
};

class HistoryService {
    private mockData = generateMockData();

    // 获取历史交易数据
    async getTradeHistory(startDate?: Date, endDate?: Date): Promise<Trade[]> {
        try {
            // 在实际API准备好之前使用模拟数据
            return this.mockData.trades.filter(trade => {
                if (!startDate || !endDate) return true;
                const tradeDate = new Date(trade.entryTime);
                return tradeDate >= startDate && tradeDate <= endDate;
            });
        } catch (error) {
            console.error('Failed to fetch trade history:', error);
            return [];
        }
    }

    // 获取历史资产价值数据
    async getHistoricalData(
        symbol: string,
        interval: string = '1d',
        limit: number = 100,
        startDate?: Date,
        endDate?: Date
    ): Promise<HistoricalData[]> {
        try {
            // 在实际API准备好之前使用模拟数据
            let data = this.mockData.historicalData;
            
            // 根据时间范围过滤
            if (startDate || endDate) {
                data = data.filter(item => {
                    const itemDate = new Date(item.timestamp);
                    if (startDate && itemDate < startDate) return false;
                    if (endDate && itemDate > endDate) return false;
                    return true;
                });
            }

            // 限制返回数量
            data = data.slice(-limit);

            // 根据时间间隔调整数据
            if (interval !== '1d') {
                // 这里可以添加数据聚合逻辑
                // 例如：将日数据聚合为小时数据
            }

            return data;
        } catch (error) {
            console.error('Failed to fetch historical data:', error);
            return [];
        }
    }

    // 获取实时资产价值
    async getCurrentPortfolioValue(): Promise<number> {
        try {
            const latestData = this.mockData.historicalData[this.mockData.historicalData.length - 1];
            return latestData.value;
        } catch (error) {
            console.error('Failed to fetch current portfolio value:', error);
            return 0;
        }
    }
}

export const historyService = new HistoryService();
