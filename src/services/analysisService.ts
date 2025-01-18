import { Trade } from '../types/trading';

/**
 * 计算收益分布
 * @param trades 交易历史记录
 * @returns 各个收益区间的交易数量
 */
export const calculateReturnsDistribution = (trades: Trade[]): number[] => {
    if (!trades || trades.length === 0) {
        return [0, 0, 0, 0, 0, 0, 0];
    }

    const distribution = [0, 0, 0, 0, 0, 0, 0]; // 对应7个区间

    trades.forEach(trade => {
        const returnRate = ((trade.exitPrice - trade.entryPrice) / trade.entryPrice) * 100;
        
        if (returnRate < -5) {
            distribution[0]++;
        } else if (returnRate < -3) {
            distribution[1]++;
        } else if (returnRate < -1) {
            distribution[2]++;
        } else if (returnRate < 1) {
            distribution[3]++;
        } else if (returnRate < 3) {
            distribution[4]++;
        } else if (returnRate < 5) {
            distribution[5]++;
        } else {
            distribution[6]++;
        }
    });

    return distribution;
};

/**
 * 计算最大回撤
 * @param values 资产价值序列
 * @returns 最大回撤百分比
 */
export const calculateMaxDrawdown = (values: number[]): number => {
    if (!values || values.length < 2) return 0;

    let maxDrawdown = 0;
    let peak = values[0];

    for (let i = 1; i < values.length; i++) {
        if (values[i] > peak) {
            peak = values[i];
        } else {
            const drawdown = (peak - values[i]) / peak;
            maxDrawdown = Math.max(maxDrawdown, drawdown);
        }
    }

    return maxDrawdown * 100;
};
