import React from 'react';
import { useMarketStore } from '../services/marketDataService';
import TradingChart from './TradingChart';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart2,
  Clock,
  Globe,
  Hash,
  Award
} from 'lucide-react';

interface CoinDetailProps {
  symbol: string;
  onClose: () => void;
}

const CoinDetail: React.FC<CoinDetailProps> = ({ symbol, onClose }) => {
  const { markets } = useMarketStore();
  const coin = markets[symbol];

  if (!coin) return null;

  const stats = [
    { label: '24h最高', value: coin.high24h, icon: TrendingUp },
    { label: '24h最低', value: coin.low24h, icon: TrendingDown },
    { label: '24h成交量', value: coin.volume, icon: Activity },
    { label: '市值排名', value: `#${coin.rank}`, icon: Award },
    { label: '市值', value: coin.marketCap, icon: DollarSign },
    { label: '流通量', value: coin.circulatingSupply, icon: Hash },
  ];

  const additionalInfo = [
    { label: '历史最高', value: coin.ath, date: coin.athDate },
    { label: '历史最低', value: coin.atl, date: coin.atlDate },
    { label: '总供应量', value: coin.totalSupply },
    { label: '最大供应量', value: coin.maxSupply },
    { label: 'ROI', value: coin.roi },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-[80%] h-[80%] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="p-6 border-b flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold">{symbol}</h2>
            <span className={`text-lg ${
              parseFloat(coin.priceChangePercent) >= 0 ? 'text-green-500' : 'text-red-500'
            }`}>
              ${coin.price}
            </span>
            <span className={`px-2 py-1 rounded ${
              parseFloat(coin.priceChangePercent) >= 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
            }`}>
              {coin.change}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 左侧：K线图 */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm p-4">
                <TradingChart
                  symbol={symbol}
                  timeframe="1d"
                  chartType="candles"
                  indicators={['MA', 'VOL']}
                />
              </div>
            </div>

            {/* 右侧：市场数据 */}
            <div className="space-y-6">
              {/* 市场统计 */}
              <div className="bg-white rounded-lg shadow-sm p-4">
                <h3 className="text-lg font-semibold mb-4">市场统计</h3>
                <div className="grid grid-cols-2 gap-4">
                  {stats.map((stat, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-2 text-gray-500 mb-1">
                        <stat.icon className="w-4 h-4" />
                        <span className="text-sm">{stat.label}</span>
                      </div>
                      <div className="font-medium">{stat.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 深度信息 */}
              <div className="bg-white rounded-lg shadow-sm p-4">
                <h3 className="text-lg font-semibold mb-4">深度信息</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">买一价</span>
                    <span className="text-green-500">{coin.bidPrice}</span>
                    <span className="text-gray-500">{coin.bidQty}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">卖一价</span>
                    <span className="text-red-500">{coin.askPrice}</span>
                    <span className="text-gray-500">{coin.askQty}</span>
                  </div>
                </div>
              </div>

              {/* 其他信息 */}
              <div className="bg-white rounded-lg shadow-sm p-4">
                <h3 className="text-lg font-semibold mb-4">其他信息</h3>
                <div className="space-y-3">
                  {additionalInfo.map((info, index) => (
                    <div key={index} className="flex justify-between">
                      <span className="text-gray-500">{info.label}</span>
                      <span className="font-medium">
                        {info.value}
                        {info.date && (
                          <span className="text-sm text-gray-400 ml-2">
                            ({new Date(info.date).toLocaleDateString()})
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoinDetail;
