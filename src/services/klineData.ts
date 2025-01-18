import create from 'zustand';

export interface Kline {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface KlineStore {
  klines: Kline[];
  timeframe: string;
  symbol: string;
  loading: boolean;
  error: string | null;
  setTimeframe: (timeframe: string) => void;
  setSymbol: (symbol: string) => void;
  updateKlines: (klines: Kline[]) => void;
  appendKline: (kline: Kline) => void;
  updateLastKline: (kline: Kline) => void;
  fetchKlines: () => Promise<void>;
}

// 生成模拟K线数据
const generateMockKlines = (count: number, basePrice: number = 45000): Kline[] => {
  const now = Date.now();
  const klines: Kline[] = [];
  let lastClose = basePrice;

  for (let i = 0; i < count; i++) {
    const time = now - (count - i) * 60000; // 每分钟一根K线
    const volatility = basePrice * 0.002; // 0.2% 波动率
    const open = lastClose;
    const close = open * (1 + (Math.random() - 0.5) * 0.004); // ±0.2% 随机波动
    const high = Math.max(open, close) * (1 + Math.random() * 0.001); // 最高价
    const low = Math.min(open, close) * (1 - Math.random() * 0.001); // 最低价
    const volume = Math.random() * 100 + 50; // 随机成交量

    klines.push({
      time: Math.floor(time / 1000),
      open,
      high,
      low,
      close,
      volume
    });

    lastClose = close;
  }

  return klines;
};

export const useKlineStore = create<KlineStore>((set, get) => ({
  klines: [],
  timeframe: '1m',
  symbol: 'BTC/USDT',
  loading: false,
  error: null,

  setTimeframe: (timeframe: string) => {
    set({ timeframe });
    get().fetchKlines();
  },

  setSymbol: (symbol: string) => {
    set({ symbol });
    get().fetchKlines();
  },

  updateKlines: (klines: Kline[]) => set({ klines }),

  appendKline: (kline: Kline) => set(state => ({
    klines: [...state.klines, kline]
  })),

  updateLastKline: (kline: Kline) => set(state => ({
    klines: state.klines.map((k, index) => 
      index === state.klines.length - 1 ? kline : k
    )
  })),

  fetchKlines: async () => {
    const { symbol, timeframe } = get();
    set({ loading: true, error: null });

    try {
      // 这里应该调用实际的API
      // const response = await fetch(`api/klines?symbol=${symbol}&interval=${timeframe}`);
      // const data = await response.json();
      
      // 使用模拟数据
      const mockKlines = generateMockKlines(100);
      set({ klines: mockKlines, loading: false });
    } catch (error) {
      set({ error: 'Failed to fetch klines', loading: false });
    }
  }
}));
