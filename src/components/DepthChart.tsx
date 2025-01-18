import React, { useEffect, useState } from 'react';
import { useWebSocketStore } from '../services/websocket';

interface DepthData {
  bids: [number, number][]; // [price, quantity][]
  asks: [number, number][]; // [price, quantity][]
}

interface DepthChartProps {
  symbol: string;
  maxDepth?: number;
}

const DepthChart: React.FC<DepthChartProps> = ({ symbol, maxDepth = 10 }) => {
  const [depthData, setDepthData] = useState<DepthData>({ bids: [], asks: [] });
  const ws = useWebSocketStore();

  useEffect(() => {
    if (!ws.isConnected) {
      ws.connect();
    }

    // 订阅深度数据
    const subscribeToDepth = () => {
      if (ws.isConnected) {
        ws.sendMessage({
          type: 'subscribe',
          channels: ['depth'],
          symbol: symbol.replace('/', '').toLowerCase(),
        });
      }
    };

    if (ws.isConnected) {
      subscribeToDepth();
    }

    // 模拟深度数据
    const mockDepthData = () => {
      const basePrice = 45000;
      const bids: [number, number][] = [];
      const asks: [number, number][] = [];

      for (let i = 0; i < maxDepth; i++) {
        // 生成买单，价格递减
        bids.push([
          basePrice - i * 10 - Math.random() * 5,
          0.1 + Math.random() * 2
        ]);

        // 生成卖单，价格递增
        asks.push([
          basePrice + i * 10 + Math.random() * 5,
          0.1 + Math.random() * 2
        ]);
      }

      setDepthData({ bids, asks });
    };

    // 在开发环境中使用模拟数据
    const interval = setInterval(mockDepthData, 2000);

    return () => {
      clearInterval(interval);
      if (ws.isConnected) {
        ws.sendMessage({
          type: 'unsubscribe',
          channels: ['depth'],
          symbol: symbol.replace('/', '').toLowerCase(),
        });
      }
    };
  }, [symbol, ws.isConnected, maxDepth]);

  const formatPrice = (price: number) => price.toFixed(2);
  const formatQuantity = (quantity: number) => quantity.toFixed(4);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium">市场深度</h3>
        <div className="text-sm text-gray-500">
          <span className="mr-4">
            买入订单: <span className="text-green-500">{depthData.bids.length}</span>
          </span>
          <span>
            卖出订单: <span className="text-red-500">{depthData.asks.length}</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* 买单列表 */}
        <div className="relative">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>价格(USDT)</span>
            <span>数量({symbol.split('/')[0]})</span>
          </div>
          <div className="space-y-1">
            {depthData.bids.map(([price, quantity], i) => (
              <div key={`bid-${i}`} className="relative flex justify-between items-center text-sm h-6">
                <div
                  className="absolute left-0 bg-green-50"
                  style={{
                    width: `${(quantity / Math.max(...depthData.bids.map(b => b[1]))) * 100}%`,
                    height: '100%',
                    zIndex: 0
                  }}
                />
                <span className="text-green-500 z-10">{formatPrice(price)}</span>
                <span className="z-10">{formatQuantity(quantity)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 卖单列表 */}
        <div className="relative">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>价格(USDT)</span>
            <span>数量({symbol.split('/')[0]})</span>
          </div>
          <div className="space-y-1">
            {depthData.asks.map(([price, quantity], i) => (
              <div key={`ask-${i}`} className="relative flex justify-between items-center text-sm h-6">
                <div
                  className="absolute right-0 bg-red-50"
                  style={{
                    width: `${(quantity / Math.max(...depthData.asks.map(a => a[1]))) * 100}%`,
                    height: '100%',
                    zIndex: 0
                  }}
                />
                <span className="text-red-500 z-10">{formatPrice(price)}</span>
                <span className="z-10">{formatQuantity(quantity)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DepthChart;
