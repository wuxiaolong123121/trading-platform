import { create } from 'zustand';

export interface MarketData {
  symbol: string;
  price: string;
  change: string;
  volume: string;
  high24h: string;
  low24h: string;
  marketCap: string;
  circulatingSupply: string;
  totalSupply: string;
  maxSupply: string;
  rank: number;
  ath: string;
  athDate: string;
  atl: string;
  atlDate: string;
  roi: string;
  category: string;
  favorite: boolean;
  priceChangePercent: string;
  volumeChangePercent: string;
  bidPrice: string;
  askPrice: string;
  bidQty: string;
  askQty: string;
}

interface MarketState {
  markets: Record<string, MarketData>;
  sortField: keyof MarketData;
  sortDirection: 'asc' | 'desc';
  loading: boolean;
  error: string | null;
  wsConnected: boolean;
  setMarkets: (markets: Record<string, MarketData>) => void;
  updateMarket: (symbol: string, data: Partial<MarketData>) => void;
  setSortField: (field: keyof MarketData) => void;
  setSortDirection: (direction: 'asc' | 'desc') => void;
  toggleFavorite: (symbol: string) => void;
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;
}

// Binance API endpoints
const BINANCE_REST_API = 'https://api.binance.com/api/v3';

export const useMarketStore = create<MarketState>((set, get) => ({
  markets: {},
  sortField: 'rank',
  sortDirection: 'asc',
  loading: false,
  error: null,
  wsConnected: false,

  setMarkets: (markets) => set({ markets }),

  updateMarket: (symbol, data) => set((state) => ({
    markets: {
      ...state.markets,
      [symbol]: { ...state.markets[symbol], ...data }
    }
  })),

  setSortField: (field) => set({ sortField: field }),

  setSortDirection: (direction) => set({ sortDirection: direction }),

  toggleFavorite: (symbol) => set((state) => ({
    markets: {
      ...state.markets,
      [symbol]: {
        ...state.markets[symbol],
        favorite: !state.markets[symbol].favorite
      }
    }
  })),

  connectWebSocket: () => {
    const { markets, updateMarket } = get();
    const symbols = Object.keys(markets);

    // 使用原生WebSocket
    const ws = new WebSocket('wss://stream.binance.com:9443/ws');

    ws.onopen = () => {
      set({ wsConnected: true });
      
      // Subscribe to ticker updates for all symbols
      const subscribeMsg = {
        method: 'SUBSCRIBE',
        params: symbols.map(symbol => `${symbol.toLowerCase()}@ticker`),
        id: 1
      };
      ws.send(JSON.stringify(subscribeMsg));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.e === '24hrTicker') {
        updateMarket(data.s, {
          price: data.c,
          change: data.P > 0 ? `+${data.P}%` : `${data.P}%`,
          volume: `${(parseFloat(data.v) * parseFloat(data.c)).toFixed(2)}`,
          high24h: data.h,
          low24h: data.l,
          priceChangePercent: data.P,
          volumeChangePercent: data.Q,
          bidPrice: data.b,
          askPrice: data.a,
          bidQty: data.B,
          askQty: data.A
        });
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      set({ error: 'WebSocket connection error' });
    };

    ws.onclose = () => {
      set({ wsConnected: false });
      // Try to reconnect after 5 seconds
      setTimeout(() => get().connectWebSocket(), 5000);
    };
  },

  disconnectWebSocket: () => {
    set({ wsConnected: false });
  }
}));

// 获取市场数据
export const fetchMarketData = async () => {
  const { setMarkets } = useMarketStore.getState();
  
  try {
    // 获取24小时价格统计
    const [tickerRes, infoRes] = await Promise.all([
      fetch(`${BINANCE_REST_API}/ticker/24hr`),
      fetch(`${BINANCE_REST_API}/exchangeInfo`)
    ]);

    const tickerData = await tickerRes.json();
    const infoData = await infoRes.json();

    const markets: Record<string, MarketData> = {};

    tickerData.forEach((ticker: any) => {
      const symbol = ticker.symbol;
      const symbolInfo = infoData.symbols.find((s: any) => s.symbol === symbol);
      
      if (symbolInfo) {
        markets[symbol] = {
          symbol,
          price: ticker.lastPrice,
          change: `${parseFloat(ticker.priceChangePercent).toFixed(2)}%`,
          volume: ticker.volume,
          high24h: ticker.highPrice,
          low24h: ticker.lowPrice,
          marketCap: 'N/A',
          circulatingSupply: 'N/A',
          totalSupply: 'N/A',
          maxSupply: 'N/A',
          rank: 0,
          ath: 'N/A',
          athDate: 'N/A',
          atl: 'N/A',
          atlDate: 'N/A',
          roi: 'N/A',
          category: getCategoryFromSymbol(symbol),
          favorite: false,
          priceChangePercent: ticker.priceChangePercent,
          volumeChangePercent: '0',
          bidPrice: ticker.bidPrice,
          askPrice: ticker.askPrice,
          bidQty: ticker.bidQty,
          askQty: ticker.askQty
        };
      }
    });

    setMarkets(markets);
    return markets;
  } catch (error) {
    console.error('Error fetching market data:', error);
    throw error;
  }
};

// 根据交易对判断分类
function getCategoryFromSymbol(symbol: string): string {
  if (symbol.endsWith('USDT')) {
    const baseAsset = symbol.replace('USDT', '');
    
    const categories: Record<string, string[]> = {
      main: ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'DOT'],
      defi: ['UNI', 'AAVE', 'CAKE', 'COMP', 'MKR', 'SUSHI', 'CRV', 'YFI'],
      gaming: ['AXS', 'SAND', 'MANA', 'ENJ', 'GALA', 'ILV'],
      layer2: ['MATIC', 'OP', 'ARB', 'LRC', 'IMX'],
      chain: ['AVAX', 'ATOM', 'NEAR', 'FTM', 'ONE', 'ALGO'],
      stable: ['USDC', 'DAI', 'TUSD', 'USDD'],
      ai: ['AGIX', 'FET', 'OCEAN', 'RLC', 'NMR']
    };

    for (const [category, tokens] of Object.entries(categories)) {
      if (tokens.includes(baseAsset)) {
        return category;
      }
    }
  }
  
  return 'other';
}
