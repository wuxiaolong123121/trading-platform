import React from 'react';
import { useTradingContext } from '../context/TradingContext';

interface OrderBookEntry {
  price: number;
  amount: number;
  total: number;
  percentage: number;
}

const OrderBook: React.FC = () => {
  const { t } = useTradingContext();
  
  // 模拟订单簿数据
  const asks: OrderBookEntry[] = Array.from({ length: 12 }, (_, i) => ({
    price: 45000 + (i * 50),
    amount: Math.random() * 2,
    total: 0,
    percentage: 0
  })).reverse();

  const bids: OrderBookEntry[] = Array.from({ length: 12 }, (_, i) => ({
    price: 44950 - (i * 50),
    amount: Math.random() * 2,
    total: 0,
    percentage: 0
  }));

  // 计算累计数量和百分比
  const calculateTotals = (orders: OrderBookEntry[]) => {
    let runningTotal = 0;
    const maxTotal = Math.max(...orders.map(o => o.amount));
    
    return orders.map(order => {
      runningTotal += order.amount;
      return {
        ...order,
        total: runningTotal,
        percentage: (order.amount / maxTotal) * 100
      };
    });
  };

  const processedAsks = calculateTotals(asks);
  const processedBids = calculateTotals(bids);

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-2 border-b">
        <div className="grid grid-cols-3 text-sm text-gray-500">
          <div>价格(USDT)</div>
          <div className="text-right">数量(BTC)</div>
          <div className="text-right">累计(BTC)</div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {/* 卖单 */}
        <div className="relative">
          {processedAsks.map((ask, i) => (
            <div key={i} className="group relative px-4 py-1 hover:bg-red-50">
              <div className="absolute right-0 top-0 h-full bg-red-50"
                   style={{ width: `${ask.percentage}%`, opacity: 0.2 }} />
              <div className="relative grid grid-cols-3 text-sm">
                <div className="text-red-500">{ask.price.toFixed(2)}</div>
                <div className="text-right">{ask.amount.toFixed(4)}</div>
                <div className="text-right">{ask.total.toFixed(4)}</div>
              </div>
            </div>
          ))}
        </div>

        {/* 最新价格 */}
        <div className="px-4 py-2 bg-gray-50 border-y">
          <div className="text-lg font-semibold text-green-500 text-center">
            45,000.00
          </div>
        </div>

        {/* 买单 */}
        <div className="relative">
          {processedBids.map((bid, i) => (
            <div key={i} className="group relative px-4 py-1 hover:bg-green-50">
              <div className="absolute right-0 top-0 h-full bg-green-50"
                   style={{ width: `${bid.percentage}%`, opacity: 0.2 }} />
              <div className="relative grid grid-cols-3 text-sm">
                <div className="text-green-500">{bid.price.toFixed(2)}</div>
                <div className="text-right">{bid.amount.toFixed(4)}</div>
                <div className="text-right">{bid.total.toFixed(4)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OrderBook;