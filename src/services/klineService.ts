import { create } from 'zustand';

export interface Kline {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface KlineState {
  klines: Record<string, Kline[]>;
  currentSymbol: string;
  timeframe: string;
  loading: boolean;
  error: string | null;
  wsConnected: boolean;
  setKlines: (symbol: string, klines: Kline[]) => void;
  updateLastKline: (symbol: string, kline: Kline) => void;
  appendKline: (symbol: string, kline: Kline) => void;
  setCurrentSymbol: (symbol: string) => void;
  setTimeframe: (timeframe: string) => void;
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;
  fetchKlines: (symbol: string, timeframe: string) => Promise<void>;
}

// Mock data for development
const generateMockKlines = (count: number): Kline[] => {
  const now = Date.now();
  const oneMinute = 60 * 1000;
  const basePrice = 45000;
  const klines: Kline[] = [];

  for (let i = 0; i < count; i++) {
    const time = Math.floor((now - (count - i) * oneMinute) / 1000);
    const randomChange = (Math.random() - 0.5) * 100;
    const open = basePrice + randomChange;
    const close = open + (Math.random() - 0.5) * 50;
    const high = Math.max(open, close) + Math.random() * 25;
    const low = Math.min(open, close) - Math.random() * 25;
    const volume = Math.random() * 10;

    klines.push({
      time,
      open,
      high,
      low,
      close,
      volume
    });
  }

  return klines;
};

const TIMEFRAME_MAP = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '1h': '1h',
  '4h': '4h',
  '1d': '1d',
};

// 格式化交易对
const formatSymbol = (symbol: string) => {
  // 移除斜杠并转换为大写
  return symbol.replace('/', '').toUpperCase();
};

export const useKlineStore = create<KlineState>((set, get) => ({
  klines: {},
  currentSymbol: 'BTCUSDT',
  timeframe: '1m',
  loading: false,
  error: null,
  wsConnected: false,

  setKlines: (symbol, klines) => set((state) => ({
    klines: { ...state.klines, [symbol]: klines }
  })),

  updateLastKline: (symbol, kline) => set((state) => {
    const symbolKlines = state.klines[symbol] || [];
    if (symbolKlines.length === 0) return state;

    const updatedKlines = [...symbolKlines];
    updatedKlines[updatedKlines.length - 1] = kline;

    return {
      klines: { ...state.klines, [symbol]: updatedKlines }
    };
  }),

  appendKline: (symbol, kline) => set((state) => {
    const symbolKlines = state.klines[symbol] || [];
    return {
      klines: { ...state.klines, [symbol]: [...symbolKlines, kline] }
    };
  }),

  setCurrentSymbol: (symbol) => {
    const formattedSymbol = formatSymbol(symbol);
    set({ currentSymbol: formattedSymbol });
    get().fetchKlines(formattedSymbol, get().timeframe);
  },

  setTimeframe: (timeframe) => {
    set({ timeframe });
    get().fetchKlines(get().currentSymbol, timeframe);
  },

  connectWebSocket: () => {
    const { currentSymbol, updateLastKline, appendKline } = get();
    const formattedSymbol = formatSymbol(currentSymbol);
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${formattedSymbol.toLowerCase()}@kline_1m`);

    ws.onopen = () => {
      set({ wsConnected: true });
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.e === 'kline') {
        const k = data.k;
        const kline: Kline = {
          time: Math.floor(k.t / 1000),
          open: parseFloat(k.o),
          high: parseFloat(k.h),
          low: parseFloat(k.l),
          close: parseFloat(k.c),
          volume: parseFloat(k.v)
        };

        if (k.x) {
          // 当前K线已完成，添加新的K线
          appendKline(formattedSymbol, kline);
        } else {
          // 更新当前K线
          updateLastKline(formattedSymbol, kline);
        }
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      set({ error: 'WebSocket connection error' });
    };

    ws.onclose = () => {
      set({ wsConnected: false });
      // 5秒后尝试重连
      setTimeout(() => get().connectWebSocket(), 5000);
    };
  },

  disconnectWebSocket: () => {
    set({ wsConnected: false });
  },

  fetchKlines: async (symbol: string, timeframe: string) => {
    set({ loading: true, error: null });

    try {
      // 在开发环境中使用模拟数据
      if (process.env.NODE_ENV === 'development') {
        const mockKlines = generateMockKlines(1000);
        get().setKlines(symbol, mockKlines);
        set({ loading: false });
        return;
      }

      const formattedSymbol = formatSymbol(symbol);
      const interval = TIMEFRAME_MAP[timeframe as keyof typeof TIMEFRAME_MAP] || '1m';
      
      const response = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${formattedSymbol}&interval=${interval}&limit=1000`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to fetch klines: ${response.status} ${response.statusText} - ${errorData}`);
      }

      const data = await response.json();
      const klines: Kline[] = data.map((k: any) => ({
        time: Math.floor(k[0] / 1000),
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5])
      }));

      get().setKlines(formattedSymbol, klines);
      set({ loading: false });
    } catch (error) {
      console.error('Error fetching klines:', error);
      // 如果获取实际数据失败，使用模拟数据
      const mockKlines = generateMockKlines(1000);
      get().setKlines(symbol, mockKlines);
      set({ loading: false });
    }
  }
}));

export async function getKlineData(
  symbol: string,
  timeframe: string,
  limit: number = 30
): Promise<Kline[]> {
  try {
    const store = useKlineStore.getState();
    const formattedSymbol = formatSymbol(symbol);

    // 如果已经有数据，直接返回
    if (store.klines[formattedSymbol]?.length >= limit) {
      return store.klines[formattedSymbol].slice(-limit);
    }

    // 否则获取新数据
    await store.fetchKlines(formattedSymbol, timeframe);
    const klines = store.klines[formattedSymbol] || [];
    
    // 如果没有获取到数据，使用模拟数据
    if (klines.length === 0) {
      const mockKlines = generateMockKlines(limit);
      store.setKlines(formattedSymbol, mockKlines);
      return mockKlines;
    }

    return klines.slice(-limit);
  } catch (error) {
    console.error('获取K线数据失败:', error);
    // 返回模拟数据作为后备
    return generateMockKlines(limit);
  }
}
