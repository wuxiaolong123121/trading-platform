import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { errorHandler } from './errorHandler';

export type TradingMode = 'demo' | 'live';

interface ExchangeAccount {
  id: string;
  name: string;
  exchange: 'binance' | 'okx' | 'huobi';
  apiKey: string;
  secretKey: string;
  passphrase?: string;
}

interface TradingModeStore {
  mode: TradingMode;
  exchangeAccounts: ExchangeAccount[];
  activeAccountId: string | null;
  balance: {
    demo: { [key: string]: number };
    live: { [key: string]: number };
  };
  positions: {
    demo: any[];
    live: any[];
  };
  orders: {
    demo: any[];
    live: any[];
  };
  demoConfig: {
    initialBalance: number;
    feeRate: number;
  };
  setMode: (mode: TradingMode) => void;
  addExchangeAccount: (account: Omit<ExchangeAccount, 'id'>) => void;
  removeExchangeAccount: (accountId: string) => void;
  setActiveAccount: (accountId: string) => void;
  updateBalance: (currency: string, amount: number) => void;
  addPosition: (position: any) => void;
  closePosition: (positionId: string) => void;
  addOrder: (order: any) => void;
  cancelOrder: (orderId: string) => void;
  getBalance: (currency: string) => number;
  getPositions: () => any[];
  getOrders: () => any[];
  resetDemo: () => void;
  getActiveAccount: () => ExchangeAccount | null;
  setDemoConfig: (config: Partial<TradingModeStore['demoConfig']>) => void;
}

const DEFAULT_DEMO_BALANCE = 100000;
const DEFAULT_FEE_RATE = 0.1;

export const useTradingMode = create<TradingModeStore>()(
  persist(
    (set, get) => ({
      mode: 'demo',
      exchangeAccounts: [],
      activeAccountId: null,
      balance: {
        demo: { USDT: DEFAULT_DEMO_BALANCE },
        live: {
          USDT: 0,
          BTC: 0,
          ETH: 0
        }
      },
      positions: {
        demo: [],
        live: []
      },
      orders: {
        demo: [],
        live: []
      },
      demoConfig: {
        initialBalance: DEFAULT_DEMO_BALANCE,
        feeRate: DEFAULT_FEE_RATE
      },

      setMode: (mode) => {
        const state = get();
        if (mode === 'live') {
          if (!state.activeAccountId) {
            errorHandler.handleError('请先添加并选择交易所账户', 'high');
            return;
          }

          const confirmed = window.confirm(
            '⚠️ 重要风险提示：\n\n' +
            '1. 您即将切换到实盘交易模式\n' +
            '2. 实盘交易将使用真实资金\n' +
            '3. 加密货币市场波动剧烈，请确保您了解所有相关风险\n' +
            '4. 建议先在模拟盘中进行练习\n\n' +
            '您确定要切换到实盘交易模式吗？'
          );
          if (!confirmed) {
            return;
          }
        }
        set({ mode });
        errorHandler.handleError(
          `已切换到${mode === 'demo' ? '模拟' : '实盘'}交易模式`,
          'low'
        );
      },

      addExchangeAccount: (account) => {
        const newAccount = {
          ...account,
          id: Date.now().toString()
        };
        set((state) => ({
          exchangeAccounts: [...state.exchangeAccounts, newAccount],
          activeAccountId: state.activeAccountId || newAccount.id
        }));
        errorHandler.handleError('已添加交易所账户', 'low');
      },

      removeExchangeAccount: (accountId) => {
        set((state) => {
          const newAccounts = state.exchangeAccounts.filter(a => a.id !== accountId);
          const newActiveId = state.activeAccountId === accountId
            ? newAccounts[0]?.id || null
            : state.activeAccountId;
          
          if (newAccounts.length === 0 && state.mode === 'live') {
            state.setMode('demo');
          }

          return {
            exchangeAccounts: newAccounts,
            activeAccountId: newActiveId
          };
        });
      },

      setActiveAccount: (accountId) => {
        set({ activeAccountId: accountId });
      },

      getActiveAccount: () => {
        const state = get();
        return state.exchangeAccounts.find(a => a.id === state.activeAccountId) || null;
      },

      updateBalance: (currency, amount) => {
        const { mode } = get();
        set((state) => ({
          balance: {
            ...state.balance,
            [mode]: {
              ...state.balance[mode],
              [currency]: Math.max(0, (state.balance[mode][currency] || 0) + amount)
            }
          }
        }));
      },

      addPosition: (position) => {
        const { mode } = get();
        set((state) => ({
          positions: {
            ...state.positions,
            [mode]: [...state.positions[mode], { ...position, id: Date.now().toString() }]
          }
        }));
      },

      closePosition: (positionId) => {
        const { mode } = get();
        set((state) => ({
          positions: {
            ...state.positions,
            [mode]: state.positions[mode].filter((p) => p.id !== positionId)
          }
        }));
      },

      addOrder: (order) => {
        const { mode } = get();
        set((state) => ({
          orders: {
            ...state.orders,
            [mode]: [...state.orders[mode], { ...order, id: Date.now().toString() }]
          }
        }));
      },

      cancelOrder: (orderId) => {
        const { mode } = get();
        set((state) => ({
          orders: {
            ...state.orders,
            [mode]: state.orders[mode].filter((o) => o.id !== orderId)
          }
        }));
      },

      getBalance: (currency) => {
        const { mode, balance } = get();
        return balance[mode][currency] || 0;
      },

      getPositions: () => {
        const { mode, positions } = get();
        return positions[mode];
      },

      getOrders: () => {
        const { mode, orders } = get();
        return orders[mode];
      },

      resetDemo: () => {
        if (window.confirm('确定要重置模拟账户吗？这将清空所有模拟交易记录。')) {
          const { demoConfig } = get();
          set(state => ({
            balance: {
              ...state.balance,
              demo: { USDT: demoConfig.initialBalance }
            },
            positions: {
              ...state.positions,
              demo: []
            },
            orders: {
              ...state.orders,
              demo: []
            }
          }));
          errorHandler.handleError('模拟账户已重置', 'low');
        }
      },

      setDemoConfig: (config) => {
        set(state => ({
          demoConfig: {
            ...state.demoConfig,
            ...config
          }
        }));
        
        // 如果修改了初始余额，同时更新当前余额
        if (config.initialBalance !== undefined) {
          set(state => ({
            balance: {
              ...state.balance,
              demo: { USDT: config.initialBalance }
            }
          }));
        }
      },
    }),
    {
      name: 'trading-mode-store',
      partialize: (state) => ({
        mode: state.mode,
        exchangeAccounts: state.exchangeAccounts.map(account => ({
          ...account,
          secretKey: ''
        })),
        activeAccountId: state.activeAccountId,
        balance: state.balance,
        positions: state.positions,
        orders: state.orders,
        demoConfig: state.demoConfig
      })
    }
  )
);