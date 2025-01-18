import { create } from 'zustand';

interface Market {
  symbol: string;
  price: string;
  change: string;
  volume: string;
  favorite: boolean;
  category: string;
  newListing?: boolean;
  launchDate?: string;
}

interface MarketDataStore {
  markets: Market[];
  loading: boolean;
  error: string | null;
  favorites: string[];
  fetchMarkets: () => Promise<void>;
  updateMarkets: (markets: Market[]) => void;
  toggleFavorite: (symbol: string) => void;
}

// 根据交易对判断币种类别
const categorizeMarket = (symbol: string): string => {
  const mainCoins = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'DOT'];
  const defiCoins = ['UNI', 'AAVE', 'CAKE', 'COMP', 'MKR', 'SUSHI', 'CRV', 'YFI'];
  const gameCoins = ['AXS', 'SAND', 'MANA', 'ENJ', 'GALA', 'ILV'];
  const l1Coins = ['AVAX', 'MATIC', 'FTM', 'ONE', 'NEAR', 'ATOM'];
  
  const base = symbol.split('/')[0];
  
  if (mainCoins.includes(base)) return 'main';
  if (defiCoins.includes(base)) return 'defi';
  if (gameCoins.includes(base)) return 'game';
  if (l1Coins.includes(base)) return 'l1';
  return 'other';
};

// 判断是否是新上线的币种
const isNewListing = (timestamp: string): boolean => {
  const listingDate = new Date(parseInt(timestamp));
  const now = new Date();
  const daysDiff = (now.getTime() - listingDate.getTime()) / (1000 * 60 * 60 * 24);
  return daysDiff <= 7;
};

// 生成模拟数据
const generateMockMarkets = (): Market[] => [
  // 主流币种
  { symbol: 'BTC/USDT', price: '42,567.80', change: '+2.5', volume: '1.2B', favorite: true, category: 'main' },
  { symbol: 'ETH/USDT', price: '2,345.67', change: '-1.2', volume: '800M', favorite: true, category: 'main' },
  { symbol: 'BNB/USDT', price: '345.67', change: '+0.8', volume: '500M', favorite: false, category: 'main' },
  { symbol: 'SOL/USDT', price: '123.45', change: '+5.2', volume: '300M', favorite: false, category: 'main' },
  { symbol: 'XRP/USDT', price: '0.5678', change: '+3.1', volume: '250M', favorite: false, category: 'main' },
  { symbol: 'ADA/USDT', price: '0.4567', change: '-0.5', volume: '150M', favorite: false, category: 'main' },
  { symbol: 'DOGE/USDT', price: '0.0789', change: '+1.8', volume: '120M', favorite: false, category: 'main' },
  { symbol: 'DOT/USDT', price: '6.789', change: '-2.1', volume: '90M', favorite: false, category: 'main' },
  
  // DeFi 币种
  { symbol: 'UNI/USDT', price: '5.678', change: '+1.5', volume: '45M', favorite: false, category: 'defi' },
  { symbol: 'AAVE/USDT', price: '89.12', change: '-0.8', volume: '35M', favorite: false, category: 'defi' },
  { symbol: 'CAKE/USDT', price: '2.345', change: '+3.2', volume: '25M', favorite: false, category: 'defi' },
  { symbol: 'COMP/USDT', price: '45.67', change: '-1.5', volume: '20M', favorite: false, category: 'defi' },
  { symbol: 'MKR/USDT', price: '1234.56', change: '+2.3', volume: '15M', favorite: false, category: 'defi' },
  { symbol: 'SUSHI/USDT', price: '1.234', change: '-2.8', volume: '12M', favorite: false, category: 'defi' },
  { symbol: 'CRV/USDT', price: '0.567', change: '+4.2', volume: '10M', favorite: false, category: 'defi' },
  { symbol: 'YFI/USDT', price: '8901.23', change: '-1.7', volume: '8M', favorite: false, category: 'defi' },

  // GameFi 币种
  { symbol: 'AXS/USDT', price: '8.901', change: '+6.7', volume: '30M', favorite: false, category: 'game' },
  { symbol: 'SAND/USDT', price: '0.789', change: '-3.4', volume: '25M', favorite: false, category: 'game' },
  { symbol: 'MANA/USDT', price: '0.456', change: '+2.8', volume: '20M', favorite: false, category: 'game' },
  { symbol: 'ENJ/USDT', price: '0.345', change: '-1.9', volume: '15M', favorite: false, category: 'game' },
  { symbol: 'GALA/USDT', price: '0.0234', change: '+7.8', volume: '12M', favorite: false, category: 'game' },
  { symbol: 'ILV/USDT', price: '123.45', change: '-4.5', volume: '8M', favorite: false, category: 'game' },

  // Layer1 币种
  { symbol: 'AVAX/USDT', price: '34.56', change: '+4.3', volume: '100M', favorite: false, category: 'l1' },
  { symbol: 'MATIC/USDT', price: '0.890', change: '-2.1', volume: '80M', favorite: false, category: 'l1' },
  { symbol: 'FTM/USDT', price: '0.456', change: '+5.6', volume: '40M', favorite: false, category: 'l1' },
  { symbol: 'ONE/USDT', price: '0.0123', change: '-1.4', volume: '20M', favorite: false, category: 'l1' },
  { symbol: 'NEAR/USDT', price: '2.345', change: '+3.2', volume: '35M', favorite: false, category: 'l1' },
  { symbol: 'ATOM/USDT', price: '8.901', change: '-0.9', volume: '45M', favorite: false, category: 'l1' },
];

const useMarketData = create<MarketDataStore>((set) => ({
  markets: [],
  loading: false,
  error: null,
  favorites: [],

  fetchMarkets: async () => {
    set({ loading: true, error: null });
    try {
      // 这里使用模拟数据，实际项目中应该调用OKX API
      const response = await fetch('https://www.okx.com/api/v5/market/tickers?instType=SPOT');
      const data = await response.json();
      
      if (data.code === '0') {
        const markets = data.data.map((item: any) => ({
          symbol: item.instId.replace('-', '/'),
          price: parseFloat(item.last).toFixed(item.last < 1 ? 6 : 2),
          change: `${(parseFloat(item.change24h) * 100).toFixed(2)}`,
          volume: `${(parseFloat(item.vol24h) / 1000000).toFixed(1)}M`,
          favorite: false,
          category: categorizeMarket(item.instId),
          newListing: isNewListing(item.ts),
          launchDate: item.ts
        }));
        
        set({ markets, loading: false });
      } else {
        throw new Error('Failed to fetch markets');
      }
    } catch (error) {
      // 如果API调用失败，使用模拟数据
      const mockMarkets = generateMockMarkets();
      set({ markets: mockMarkets, loading: false });
    }
  },

  updateMarkets: (markets: Market[]) => {
    set({ markets });
  },

  toggleFavorite: (symbol: string) => {
    set((state) => ({
      markets: state.markets.map((market) =>
        market.symbol === symbol
          ? { ...market, favorite: !market.favorite }
          : market
      ),
      favorites: state.markets
        .filter((market) => market.favorite)
        .map((market) => market.symbol),
    }));
  },
}));

export { useMarketData, type Market };