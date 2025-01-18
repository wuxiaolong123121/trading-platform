import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { useTradingContext } from '../../context/TradingContext';
import { useWebSocketStore } from '../../services/websocket';
import { historyService } from '../../services/historyService';
import { format } from 'date-fns';

const Dashboard = () => {
  const { t } = useTradingContext();
  const ws = useWebSocketStore();
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [dailyPnL, setDailyPnL] = useState(0);
  const [positionPnL, setPositionPnL] = useState(0);
  const [tradeCount, setTradeCount] = useState(0);
  const [activePositions, setActivePositions] = useState<any[]>([]);
  const [recentTrades, setRecentTrades] = useState<any[]>([]);

  // 获取数据
  const fetchData = async () => {
    try {
      // 获取当前资产价值
      const value = await historyService.getCurrentPortfolioValue();
      setPortfolioValue(value);

      // 获取今日交易数据
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const trades = await historyService.getTradeHistory(today, new Date());
      
      // 计算今日盈亏
      const todayPnL = trades.reduce((sum, trade) => sum + trade.pnl, 0);
      setDailyPnL(todayPnL);
      
      // 设置交易次数
      setTradeCount(trades.length);

      // 获取活跃持仓
      const positions = trades.filter(trade => trade.status === 'OPEN');
      setActivePositions(positions);

      // 计算持仓盈亏
      const openPnL = positions.reduce((sum, pos) => sum + pos.pnl, 0);
      setPositionPnL(openPnL);

      // 获取最近交易
      setRecentTrades(trades.slice(0, 5));
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    }
  };

  // 初始化数据和WebSocket更新
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // 每10秒更新一次
    return () => clearInterval(interval);
  }, []);

  // WebSocket更新
  useEffect(() => {
    if (ws.lastMessage) {
      try {
        const data = JSON.parse(ws.lastMessage);
        if (data.type === 'PORTFOLIO_UPDATE') {
          setPortfolioValue(data.value);
          setDailyPnL(data.dailyPnL);
          setPositionPnL(data.positionPnL);
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    }
  }, [ws.lastMessage]);

  const stats = [
    { 
      label: '总资产', 
      value: `$${portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: `${((portfolioValue - 100000) / 100000 * 100).toFixed(2)}%`,
      icon: DollarSign,
      trend: portfolioValue >= 100000 ? 'up' : 'down'
    },
    { 
      label: '今日盈亏', 
      value: `$${dailyPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: `${(dailyPnL / portfolioValue * 100).toFixed(2)}%`,
      icon: TrendingUp,
      trend: dailyPnL >= 0 ? 'up' : 'down'
    },
    { 
      label: '持仓盈亏', 
      value: `$${positionPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: `${(positionPnL / portfolioValue * 100).toFixed(2)}%`,
      icon: TrendingDown,
      trend: positionPnL >= 0 ? 'up' : 'down'
    },
    { 
      label: '交易次数', 
      value: tradeCount.toString(),
      change: `今日`,
      icon: Activity,
      trend: 'neutral'
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
              </div>
              <stat.icon className={`w-8 h-8 ${
                stat.trend === 'up' ? 'text-green-500' :
                stat.trend === 'down' ? 'text-red-500' :
                'text-blue-500'
              }`} />
            </div>
            <p className={`text-sm mt-2 ${
              stat.trend === 'up' ? 'text-green-500' :
              stat.trend === 'down' ? 'text-red-500' :
              'text-blue-500'
            }`}>
              {stat.change}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">活跃持仓</h3>
          <div className="space-y-4">
            {activePositions.map((position, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b">
                <div>
                  <p className="font-medium">{position.symbol}</p>
                  <p className="text-sm text-gray-500">{position.quantity}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">${(position.entryPrice * position.quantity).toLocaleString()}</p>
                  <p className={position.pnl >= 0 ? 'text-green-500' : 'text-red-500'}>
                    {position.pnl >= 0 ? '+' : ''}{position.pnl.toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">最近交易</h3>
          <div className="space-y-4">
            {recentTrades.map((trade, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b">
                <div>
                  <p className="font-medium">{trade.symbol}</p>
                  <p className="text-sm text-gray-500">{format(new Date(trade.exitTime || trade.entryTime), 'HH:mm')}</p>
                </div>
                <div className="text-right">
                  <p className={`font-medium ${trade.type === 'BUY' ? 'text-green-500' : 'text-red-500'}`}>
                    {trade.type === 'BUY' ? '买入' : '卖出'} {trade.quantity}
                  </p>
                  <p className="text-sm text-gray-500">${trade.entryPrice.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;