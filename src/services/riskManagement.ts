import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface RiskLimits {
  maxOrderValue: number;
  maxDailyLoss: number;
  maxLeverage: number;
  stopLossPercentage: number;
  takeProfitPercentage: number;
}

interface Position {
  symbol: string;
  entryPrice: number;
  amount: number;
  stopLoss: number;
  takeProfit: number;
}

interface RiskManagementStore {
  limits: RiskLimits;
  positions: Position[];
  dailyPnL: number;
  updateLimits: (limits: Partial<RiskLimits>) => void;
  addPosition: (position: Position) => void;
  removePosition: (symbol: string) => void;
  updateDailyPnL: (pnl: number) => void;
  checkOrderRisk: (order: any) => {
    allowed: boolean;
    reason?: string;
  };
}

export const useRiskManagement = create<RiskManagementStore>()(
  persist(
    (set, get) => ({
      limits: {
        maxOrderValue: 20000, // USDT
        maxDailyLoss: 1000, // USDT
        maxLeverage: 3,
        stopLossPercentage: 5,
        takeProfitPercentage: 10,
      },
      positions: [],
      dailyPnL: 0,

      updateLimits: (newLimits) => {
        set((state) => ({
          limits: { ...state.limits, ...newLimits },
        }));
      },

      addPosition: (position) => {
        set((state) => ({
          positions: [...state.positions, position],
        }));
      },

      removePosition: (symbol) => {
        set((state) => ({
          positions: state.positions.filter((p) => p.symbol !== symbol),
        }));
      },

      updateDailyPnL: (pnl) => {
        set((state) => ({
          dailyPnL: state.dailyPnL + pnl,
        }));
      },

      checkOrderRisk: (order) => {
        const state = get();
        const { limits, dailyPnL, positions } = state;

        // 检查订单金额限制
        const orderValue = order.price * order.amount;
        if (orderValue > limits.maxOrderValue) {
          return {
            allowed: false,
            reason: `订单金额 ${orderValue} USDT 超过最大限制 ${limits.maxOrderValue} USDT`,
          };
        }

        // 检查当日亏损限制
        if (dailyPnL < -limits.maxDailyLoss) {
          return {
            allowed: false,
            reason: `已达到每日最大亏损限制 ${limits.maxDailyLoss} USDT`,
          };
        }

        // 检查杠杆倍数
        if (order.leverage > limits.maxLeverage) {
          return {
            allowed: false,
            reason: `杠杆倍数 ${order.leverage}x 超过最大限制 ${limits.maxLeverage}x`,
          };
        }

        // 检查是否设置止损
        if (!order.stopLoss) {
          const recommendedStopLoss =
            order.type === 'buy'
              ? order.price * (1 - limits.stopLossPercentage / 100)
              : order.price * (1 + limits.stopLossPercentage / 100);

          return {
            allowed: false,
            reason: `请设置止损价格，建议设置在 ${recommendedStopLoss.toFixed(2)}`,
          };
        }

        return { allowed: true };
      },
    }),
    {
      name: 'risk-management-store',
    }
  )
);