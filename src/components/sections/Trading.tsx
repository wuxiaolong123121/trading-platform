import React, { useState, useEffect } from 'react';
import { useWebSocketStore } from '../../services/websocket';
import TradingChart from '../TradingChart';
import OrderBook from '../OrderBook';
import TradingForm from '../TradingForm';
import AutoTradingBot from '../AutoTradingBot';
import DepthChart from '../DepthChart';
import { useTradingContext } from '../../context/TradingContext';
import { ArrowUp, ArrowDown, Clock, BarChart2, Activity, Bot, Search, ChevronDown } from 'lucide-react';
import { useMarketData } from '../../services/marketData';

// 定义时间周期选项
const timeframeOptions = [
  { value: '1m', label: '1分钟' },
  { value: '5m', label: '5分钟' },
  { value: '15m', label: '15分钟' },
  { value: '30m', label: '30分钟' },
  { value: '1h', label: '1小时' },
  { value: '4h', label: '4小时' },
  { value: '1d', label: '1天' },
  { value: '1w', label: '1周' },
];

const Trading = () => {
  const { t } = useTradingContext();
  const [timeframe, setTimeframe] = useState('1m');
  const [selectedSymbol, setSelectedSymbol] = useState('BTC/USDT');
  const [showTradingForm, setShowTradingForm] = useState(false);
  const [tradingType, setTradingType] = useState<'buy' | 'sell'>('buy');
  const [chartType, setChartType] = useState('candles');
  const [indicator, setIndicator] = useState('technical');
  const [activeTab, setActiveTab] = useState<'manual' | 'auto'>('manual');
  const [showSymbolSelector, setShowSymbolSelector] = useState(false);
  const [showTimeframeSelector, setShowTimeframeSelector] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const ws = useWebSocketStore();
  const marketData = useWebSocketStore(state => state.marketData);
  const { markets, loading } = useMarketData();

  // 过滤交易对
  const filteredMarkets = markets.filter(market => 
    market.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 实时价格数据
  const [priceData, setPriceData] = useState({
    price: '45,678.90',
    priceChangePercent: '+1.2',
    high24h: '46,789.00',
    low24h: '44,567.80',
    volume24h: '2.1B',
    lastUpdate: new Date(),
  });

  useEffect(() => {
    if (!ws.isConnected) {
      ws.connect();
    }

    const subscribeToData = () => {
      if (ws.isConnected) {
        ws.sendMessage({
          type: 'subscribe',
          channels: ['ticker', 'kline', 'trades', 'orderbook'],
          symbol: selectedSymbol,
          interval: timeframe
        });
      }
    };

    if (ws.isConnected) {
      subscribeToData();
    }

    const checkConnection = setInterval(() => {
      if (!ws.isConnected) {
        ws.connect();
      } else {
        subscribeToData();
      }
    }, 3000);

    return () => {
      clearInterval(checkConnection);
      if (ws.isConnected) {
        ws.sendMessage({
          type: 'unsubscribe',
          channels: ['ticker', 'kline', 'trades', 'orderbook'],
          symbol: selectedSymbol
        });
      }
    };
  }, [selectedSymbol, timeframe, ws.isConnected]);

  useEffect(() => {
    if (marketData.price) {
      setPriceData(prev => ({
        ...prev,
        price: marketData.price.toFixed(2),
        priceChangePercent: marketData.change.toFixed(2),
        lastUpdate: new Date()
      }));
    }
  }, [marketData]);

  const handleTrade = (data: any) => {
    console.log('Trade submitted:', data);
    setShowTradingForm(false);
  };

  const handleSymbolSelect = (symbol: string) => {
    setSelectedSymbol(symbol);
    setShowSymbolSelector(false);
    setSearchTerm('');
  };

  const handleTimeframeSelect = (value: string) => {
    setTimeframe(value);
    setShowTimeframeSelector(false);
  };

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* 顶部栏 */}
      <div className="flex items-center justify-between p-4 bg-white border-b">
        <div className="flex items-center space-x-4">
          {/* 交易对选择器 */}
          <div className="relative">
            <button
              className="flex items-center px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
              onClick={() => setShowSymbolSelector(!showSymbolSelector)}
            >
              <span className="font-medium">{selectedSymbol}</span>
              <ChevronDown className="w-4 h-4 ml-2" />
            </button>
            {showSymbolSelector && (
              <div className="absolute z-10 w-64 mt-2 bg-white rounded-lg shadow-lg">
                <div className="p-2">
                  <input
                    type="text"
                    placeholder="搜索交易对..."
                    className="w-full px-3 py-2 border rounded"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {filteredMarkets.map((market) => (
                    <button
                      key={market.symbol}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100"
                      onClick={() => handleSymbolSelect(market.symbol)}
                    >
                      {market.symbol}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 时间周期选择器 */}
          <div className="relative">
            <button
              className="flex items-center px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
              onClick={() => setShowTimeframeSelector(!showTimeframeSelector)}
            >
              <Clock className="w-4 h-4 mr-2" />
              <span>{timeframeOptions.find(t => t.value === timeframe)?.label || timeframe}</span>
              <ChevronDown className="w-4 h-4 ml-2" />
            </button>
            {showTimeframeSelector && (
              <div className="absolute z-10 w-32 mt-2 bg-white rounded-lg shadow-lg">
                {timeframeOptions.map((option) => (
                  <button
                    key={option.value}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100"
                    onClick={() => handleTimeframeSelect(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 图表类型切换 */}
          <div className="flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-lg">
            <button
              className={`p-1 rounded ${chartType === 'candles' ? 'bg-white shadow' : ''}`}
              onClick={() => setChartType('candles')}
            >
              <BarChart2 className="w-4 h-4" />
            </button>
            <button
              className={`p-1 rounded ${chartType === 'line' ? 'bg-white shadow' : ''}`}
              onClick={() => setChartType('line')}
            >
              <Activity className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 价格信息 */}
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-2xl font-bold">{priceData.price}</div>
            <div className={`text-sm ${
              parseFloat(priceData.priceChangePercent) >= 0 ? 'text-green-500' : 'text-red-500'
            }`}>
              {priceData.priceChangePercent}%
            </div>
          </div>
          <div className="text-sm text-gray-500">
            <div>高: {priceData.high24h}</div>
            <div>低: {priceData.low24h}</div>
          </div>
          <div className="text-sm text-gray-500">
            <div>24h量: {priceData.volume24h}</div>
            <div>更新: {priceData.lastUpdate.toLocaleTimeString()}</div>
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="flex-1 p-4">
        {/* 交易模式选择器 */}
        <div className="mb-4 flex justify-between items-center">
          <div className="flex space-x-4">
            <button
              className={`px-6 py-2 rounded-lg flex items-center ${
                activeTab === 'manual'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              onClick={() => setActiveTab('manual')}
            >
              <Activity className="w-4 h-4 mr-2" />
              手动交易
            </button>
            <button
              className={`px-6 py-2 rounded-lg flex items-center ${
                activeTab === 'auto'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              onClick={() => setActiveTab('auto')}
            >
              <Bot className="w-4 h-4 mr-2" />
              自动交易
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {/* 左侧：K线图和深度图 */}
          <div className="col-span-3 space-y-4">
            {/* K线图 */}
            <div className="bg-white rounded-lg p-4">
              <TradingChart
                symbol={selectedSymbol}
                timeframe={timeframe}
                height={400}
              />
            </div>
            
            {/* 深度图 */}
            <div className="bg-white rounded-lg p-4">
              <DepthChart symbol={selectedSymbol} maxDepth={15} />
            </div>
          </div>

          {/* 右侧：交易面板 */}
          <div className="col-span-1">
            {activeTab === 'manual' ? (
              /* 手动交易面板 */
              <div className="bg-white rounded-lg p-4 sticky top-4">
                <h3 className="text-lg font-medium mb-4">手动交易</h3>
                <div className="space-y-3">
                  <button
                    className="w-full py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center justify-center"
                    onClick={() => {
                      setTradingType('buy');
                      setShowTradingForm(true);
                    }}
                  >
                    <ArrowUp className="w-4 h-4 mr-2" />
                    买入
                  </button>
                  <button
                    className="w-full py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center justify-center"
                    onClick={() => {
                      setTradingType('sell');
                      setShowTradingForm(true);
                    }}
                  >
                    <ArrowDown className="w-4 h-4 mr-2" />
                    卖出
                  </button>
                </div>
              </div>
            ) : (
              /* 自动交易面板 */
              <div className="bg-white rounded-lg p-4 sticky top-4">
                <AutoTradingBot symbol={selectedSymbol} />
              </div>
            )}
          </div>
        </div>

        {/* 交易表单弹窗 */}
        {showTradingForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96">
              <TradingForm
                symbol={selectedSymbol}
                type={tradingType}
                onSubmit={handleTrade}
                onClose={() => setShowTradingForm(false)}
                currentPrice={parseFloat(priceData.price.replace(/,/g, ''))}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Trading;