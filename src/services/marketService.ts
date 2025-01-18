import { useWebSocketStore } from '../stores/webSocketStore';
import { errorHandler } from './errorHandler';

interface MarketData {
  symbol: string;
  price: number;
  volume: number;
  high24h: number;
  low24h: number;
  priceChange24h: number;
  volumeChange24h: number;
  timestamp: number;
}

// 市场数据缓存
const marketDataCache = new Map<string, {
  data: MarketData;
  timestamp: number;
}>();

// 缓存过期时间（毫秒）
const CACHE_EXPIRY = 5000; // 5秒

export async function getMarketData(symbol: string): Promise<MarketData> {
  try {
    const now = Date.now();
    
    // 检查缓存
    const cached = marketDataCache.get(symbol);
    if (cached && now - cached.timestamp < CACHE_EXPIRY) {
      return cached.data;
    }

    // 从WebSocket获取实时数据
    const ws = useWebSocketStore.getState();
    const marketData = ws.marketData[symbol];

    if (!marketData || !marketData.price) {
      throw new Error(`无法获取${symbol}的市场数据`);
    }

    // 构建市场数据对象
    const data: MarketData = {
      symbol,
      price: marketData.price,
      volume: marketData.volume || 0,
      high24h: marketData.high24h || marketData.price,
      low24h: marketData.low24h || marketData.price,
      priceChange24h: marketData.priceChange24h || 0,
      volumeChange24h: marketData.volumeChange24h || 0,
      timestamp: now
    };

    // 更新缓存
    marketDataCache.set(symbol, {
      data,
      timestamp: now
    });

    return data;
  } catch (error) {
    errorHandler.handleError('获取市场数据失败', 'medium', { error, symbol });
    throw error;
  }
}

// 批量获取市场数据
export async function getBatchMarketData(symbols: string[]): Promise<Map<string, MarketData>> {
  const results = new Map<string, MarketData>();
  
  await Promise.all(
    symbols.map(async (symbol) => {
      try {
        const data = await getMarketData(symbol);
        results.set(symbol, data);
      } catch (error) {
        console.error(`获取${symbol}市场数据失败:`, error);
      }
    })
  );

  return results;
}

// 获取24小时价格变化百分比
export function get24hPriceChangePercent(symbol: string): number {
  const cached = marketDataCache.get(symbol);
  if (!cached) return 0;

  const { price, priceChange24h } = cached.data;
  if (!price || !priceChange24h) return 0;

  return (priceChange24h / (price - priceChange24h)) * 100;
}

// 获取24小时交易量变化百分比
export function get24hVolumeChangePercent(symbol: string): number {
  const cached = marketDataCache.get(symbol);
  if (!cached) return 0;

  const { volume, volumeChange24h } = cached.data;
  if (!volume || !volumeChange24h) return 0;

  return (volumeChange24h / (volume - volumeChange24h)) * 100;
}

// 清除指定币种的缓存
export function clearMarketDataCache(symbol?: string) {
  if (symbol) {
    marketDataCache.delete(symbol);
  } else {
    marketDataCache.clear();
  }
}

// 获取所有缓存的市场数据
export function getAllCachedMarketData(): Map<string, MarketData> {
  const now = Date.now();
  const results = new Map<string, MarketData>();

  for (const [symbol, cached] of marketDataCache.entries()) {
    if (now - cached.timestamp < CACHE_EXPIRY) {
      results.set(symbol, cached.data);
    }
  }

  return results;
}

// 监听价格变化
export function watchPriceChange(
  symbol: string,
  threshold: number,
  callback: (data: { oldPrice: number; newPrice: number; change: number }) => void
): () => void {
  let lastPrice = marketDataCache.get(symbol)?.data.price;
  
  const ws = useWebSocketStore.getState();
  const unsubscribe = ws.subscribe(
    `market.${symbol}.price`,
    (price: number) => {
      if (!lastPrice) {
        lastPrice = price;
        return;
      }

      const change = ((price - lastPrice) / lastPrice) * 100;
      if (Math.abs(change) >= threshold) {
        callback({
          oldPrice: lastPrice,
          newPrice: price,
          change
        });
        lastPrice = price;
      }
    }
  );

  return unsubscribe;
}
