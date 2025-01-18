import React, { useState, useEffect } from 'react';
import { Search, Star, TrendingUp, TrendingDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useMarketStore, fetchMarketData } from '../../services/marketDataService';
import TradingChart from '../TradingChart';

const Markets = () => {
  const { 
    markets, 
    sortField, 
    sortDirection, 
    setSortField, 
    setSortDirection,
    toggleFavorite 
  } = useMarketStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [category, setCategory] = useState('all');
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('1m');

  const timeframes = [
    { value: '1m', label: '1分钟' },
    { value: '5m', label: '5分钟' },
    { value: '15m', label: '15分钟' },
    { value: '1h', label: '1小时' },
    { value: '4h', label: '4小时' },
    { value: '1d', label: '1天' },
  ];

  useEffect(() => {
    fetchMarketData();
  }, []);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredMarkets = Object.values(markets).filter(market => {
    const matchesSearch = market.symbol.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || 
      (filter === 'favorites' && market.favorite) ||
      (filter === 'gainers' && parseFloat(market.priceChangePercent) > 0) ||
      (filter === 'losers' && parseFloat(market.priceChangePercent) < 0);
    const matchesCategory = category === 'all' || market.category === category;
    return matchesSearch && matchesFilter && matchesCategory;
  });

  const sortedMarkets = [...filteredMarkets].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    const direction = sortDirection === 'asc' ? 1 : -1;
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return aValue.localeCompare(bValue) * direction;
    }
    return ((aValue as number) - (bValue as number)) * direction;
  });

  const getSortIcon = (field: string) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />;
  };

  const renderKlineModal = () => {
    if (!selectedSymbol) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg w-[95vw] h-[90vh] flex flex-col">
          <div className="flex justify-between items-center p-4 border-b">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-bold">{selectedSymbol}</h2>
              <select
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              >
                {timeframes.map(tf => (
                  <option key={tf.value} value={tf.value}>
                    {tf.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setSelectedSymbol(null)}
              className="text-gray-500 hover:text-gray-700 p-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 p-4">
            <TradingChart
              symbol={selectedSymbol}
              timeframe={selectedTimeframe}
              height={window.innerHeight * 0.75}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="flex flex-col space-y-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="搜索交易对..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg ${
                filter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-100'
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setFilter('favorites')}
              className={`px-4 py-2 rounded-lg ${
                filter === 'favorites' ? 'bg-blue-500 text-white' : 'bg-gray-100'
              }`}
            >
              <Star className="w-5 h-5" />
            </button>
            <button
              onClick={() => setFilter('gainers')}
              className={`px-4 py-2 rounded-lg ${
                filter === 'gainers' ? 'bg-blue-500 text-white' : 'bg-gray-100'
              }`}
            >
              <TrendingUp className="w-5 h-5" />
            </button>
            <button
              onClick={() => setFilter('losers')}
              className={`px-4 py-2 rounded-lg ${
                filter === 'losers' ? 'bg-blue-500 text-white' : 'bg-gray-100'
              }`}
            >
              <TrendingDown className="w-5 h-5" />
            </button>
          </div>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="all">全部分类</option>
            <option value="main">主流币</option>
            <option value="defi">DeFi</option>
            <option value="gaming">游戏</option>
            <option value="layer2">Layer2</option>
            <option value="chain">公链</option>
            <option value="stable">稳定币</option>
            <option value="ai">AI</option>
            <option value="other">其他</option>
          </select>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    交易对
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('price')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>最新价</span>
                      {getSortIcon('price')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('priceChangePercent')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>24h涨跌</span>
                      {getSortIcon('priceChangePercent')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('volume')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>24h成交额</span>
                      {getSortIcon('volume')}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedMarkets.map((market) => (
                  <tr 
                    key={market.symbol} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedSymbol(market.symbol)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(market.symbol);
                          }}
                          className={`focus:outline-none ${
                            market.favorite ? 'text-yellow-400' : 'text-gray-400'
                          }`}
                        >
                          <Star className="w-5 h-5" />
                        </button>
                        <span>{market.symbol}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      ${parseFloat(market.price).toFixed(2)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap ${
                      parseFloat(market.priceChangePercent) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {parseFloat(market.priceChangePercent).toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      ${parseFloat(market.volume).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {renderKlineModal()}
    </div>
  );
};

export default Markets;