import React, { useState, useEffect } from 'react';
import { Play, Pause, Settings2, AlertTriangle, Brain, TrendingUp, BarChart2, RefreshCw, Plus } from 'lucide-react';
import { useTradingContext } from '../context/TradingContext';
import { useTradingBotStore, TradingBot, BotStrategy } from '../services/tradingBot';
import { useRiskManagement } from '../services/riskManagement';
import { analyzeTradingPerformance, getMarketRecommendations } from '../services/aiService';

const AutoTradingBot: React.FC = () => {
  const { t } = useTradingContext();
  const {
    bots,
    activeBot,
    createBot,
    startBot,
    stopBot,
    deleteBot,
    isTraining,
    trainingProgress,
    startTraining,
    optimizeStrategy
  } = useTradingBotStore();
  const riskManagement = useRiskManagement();
  const [showNewBotForm, setShowNewBotForm] = useState(false);
  const [newBotConfig, setNewBotConfig] = useState({
    name: '',
    strategy: 'ma_cross' as BotStrategy,
    symbol: 'BTC/USDT',
    interval: '5m',
    riskLevel: 'medium' as const,
    maxPositionSize: 0.05,
    stopLoss: 2,
    takeProfit: 4
  });
  const [analysisReport, setAnalysisReport] = useState<string>('');
  const [marketAnalysis, setMarketAnalysis] = useState<string>('');
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);

  const handleCreateBot = (e: React.FormEvent) => {
    e.preventDefault();
    const botId = createBot({
      name: newBotConfig.name,
      strategy: newBotConfig.strategy,
      config: {
        symbol: newBotConfig.symbol,
        interval: newBotConfig.interval,
        riskLevel: newBotConfig.riskLevel,
        maxPositionSize: newBotConfig.maxPositionSize,
        stopLoss: newBotConfig.stopLoss,
        takeProfit: newBotConfig.takeProfit,
        parameters: getDefaultParameters(newBotConfig.strategy)
      }
    });
    setShowNewBotForm(false);
    setNewBotConfig({
      name: '',
      strategy: 'ma_cross',
      symbol: 'BTC/USDT',
      interval: '5m',
      riskLevel: 'medium',
      maxPositionSize: 0.05,
      stopLoss: 2,
      takeProfit: 4
    });
  };

  const getDefaultParameters = (strategy: BotStrategy) => {
    switch (strategy) {
      case 'ma_cross':
        return {
          fastPeriod: 10,
          slowPeriod: 21,
          signalPeriod: 9,
          maxPositionSize: 0.05
        };
      case 'rsi':
        return {
          period: 14,
          overbought: 70,
          oversold: 30
        };
      case 'grid':
        return {
          upperPrice: 50000,
          lowerPrice: 40000,
          gridLines: 10
        };
      case 'ml_trend':
        return {
          windowSize: 24,
          predictionHorizon: 12,
          confidenceThreshold: 0.75,
          features: ['price', 'volume', 'rsi', 'macd']
        };
      case 'deep_learning':
        return {
          epochs: 100,
          batchSize: 32,
          layers: [64, 32, 16, 8],
          learningRate: 0.001
        };
      case 'multi_coin':
        return {
          confidenceThreshold: 0.3, // 30% 置信度阈值
          maxPositions: 5, // 最大同时持仓数
          updateInterval: 15 * 60 * 1000, // 15分钟更新一次
          symbols: [
            'BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'XRP/USDT', 'ADA/USDT',
            'DOT/USDT', 'DOGE/USDT', 'SHIB/USDT', 'MATIC/USDT', 'SOL/USDT',
            'AVAX/USDT', 'LINK/USDT', 'UNI/USDT', 'ATOM/USDT', 'LTC/USDT'
          ]
        };
      default:
        return {};
    }
  };

  const formatRunningTime = (startTime?: number) => {
    if (!startTime) return '未运行';
    const diff = Date.now() - startTime;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return `${hours}小时${minutes}分钟`;
  };

  const fetchAnalysisReport = async () => {
    if (!activeBot) return;

    const bot = bots.find(b => b.id === activeBot);
    if (!bot) return;

    try {
      const result = await analyzeTradingPerformance(bot);
      if (result.error) {
        errorHandler.handleError('获取交易分析失败', 'medium', { error: result.error });
        return;
      }
      setAnalysisReport(result.content);
    } catch (error) {
      errorHandler.handleError('获取交易分析失败', 'medium', { error });
    }
  };

  const fetchMarketAnalysis = async () => {
    if (isLoadingAnalysis) return;
    
    try {
      setIsLoadingAnalysis(true);
      // 获取所有支持的交易对
      const symbols = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'XRP/USDT', 'ADA/USDT', 
                      'DOT/USDT', 'DOGE/USDT', 'SHIB/USDT', 'MATIC/USDT', 'SOL/USDT'];
      const result = await getMarketRecommendations(symbols);
      setMarketAnalysis(result.content);
    } catch (error) {
      // errorHandler.handleError('获取市场分析失败', 'medium', { error });
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  const renderBotStatus = (bot: TradingBot) => {
    return (
      <div className="bot-status">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">{bot.name}</h3>
          <div className="flex items-center space-x-2">
            {bot.status === 'running' ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                运行中
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                已停止
              </span>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-500">策略</p>
            <p className="font-medium">
              {bot.strategy === 'ma_cross' && '移动平均线交叉'}
              {bot.strategy === 'rsi' && 'RSI指标'}
              {bot.strategy === 'grid' && '网格交易'}
              {bot.strategy === 'ml_trend' && '机器学习趋势'}
              {bot.strategy === 'deep_learning' && '深度学习'}
              {bot.strategy === 'multi_coin' && '多币种智能策略'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">交易对</p>
            <p className="font-medium">
              {bot.strategy === 'multi_coin' ? (
                <span className="text-green-600">多币种自动选择</span>
              ) : (
                bot.config.symbol
              )}
            </p>
          </div>
        </div>

        {bot.strategy === 'multi_coin' && bot.status === 'running' && (
          <div className="mb-4 p-3 bg-gray-50 rounded">
            <h4 className="text-sm font-medium mb-2">当前持仓币种</h4>
            <div className="grid grid-cols-3 gap-2">
              {Array.from(bot.activePositions || []).map((symbol) => (
                <div key={symbol} className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                  {symbol}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="performance-stats grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-500">总交易次数</p>
            <p className="font-medium">{bot.performance.totalTrades}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">胜率</p>
            <p className="font-medium">
              {(bot.performance.winRate * 100).toFixed(2)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">盈亏</p>
            <p className={`font-medium ${bot.performance.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {bot.performance.profitLoss.toFixed(2)} USDT
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          {bot.status === 'running' ? (
            <button
              onClick={() => stopBot(bot.id)}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <Pause className="w-4 h-4 mr-1" />
              停止
            </button>
          ) : (
            <button
              onClick={() => startBot(bot.id)}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <Play className="w-4 h-4 mr-1" />
              启动
            </button>
          )}
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (activeBot) {
      // 立即获取报告
      fetchAnalysisReport();
      // 每15分钟更新一次报告
      const interval = setInterval(fetchAnalysisReport, 15 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [activeBot, bots]);

  useEffect(() => {
    fetchMarketAnalysis();
    const interval = setInterval(fetchMarketAnalysis, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 p-6 bg-gray-100">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 机器人列表 */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Brain className="w-6 h-6 text-blue-600" />
              <h2 className="text-lg font-semibold">自动交易机器人</h2>
            </div>
            <button
              onClick={() => setShowNewBotForm(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              <span>新建机器人</span>
            </button>
          </div>

          {showNewBotForm && (
            <div className="p-6 border-b">
              <form onSubmit={handleCreateBot} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      机器人名称
                    </label>
                    <input
                      type="text"
                      value={newBotConfig.name}
                      onChange={(e) => setNewBotConfig(prev => ({
                        ...prev,
                        name: e.target.value
                      }))}
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      交易策略
                    </label>
                    <select
                      value={newBotConfig.strategy}
                      onChange={(e) => setNewBotConfig(prev => ({
                        ...prev,
                        strategy: e.target.value as BotStrategy
                      }))}
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="ma_cross">均线交叉</option>
                      <option value="rsi">RSI策略</option>
                      <option value="grid">网格交易</option>
                      <option value="ml_trend">机器学习趋势</option>
                      <option value="deep_learning">深度学习</option>
                      <option value="multi_coin">多币种智能策略</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      交易对
                    </label>
                    <select
                      value={newBotConfig.symbol}
                      onChange={(e) => setNewBotConfig(prev => ({
                        ...prev,
                        symbol: e.target.value
                      }))}
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                      disabled={newBotConfig.strategy === 'multi_coin'}
                    >
                      <option value="BTC/USDT">BTC/USDT</option>
                      <option value="ETH/USDT">ETH/USDT</option>
                      <option value="SOL/USDT">SOL/USDT</option>
                    </select>
                    {newBotConfig.strategy === 'multi_coin' && (
                      <small className="text-muted">
                        多币种策略将自动分析和交易多个币种，无需选择单一交易对
                      </small>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      时间周期
                    </label>
                    <select
                      value={newBotConfig.interval}
                      onChange={(e) => setNewBotConfig(prev => ({
                        ...prev,
                        interval: e.target.value
                      }))}
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="1m">1分钟</option>
                      <option value="5m">5分钟</option>
                      <option value="15m">15分钟</option>
                      <option value="1h">1小时</option>
                      <option value="4h">4小时</option>
                      <option value="1d">1天</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      风险等级
                    </label>
                    <select
                      value={newBotConfig.riskLevel}
                      onChange={(e) => setNewBotConfig(prev => ({
                        ...prev,
                        riskLevel: e.target.value as 'low' | 'medium' | 'high'
                      }))}
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">低风险</option>
                      <option value="medium">中等风险</option>
                      <option value="high">高风险</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      最大仓位
                    </label>
                    <input
                      type="number"
                      value={newBotConfig.maxPositionSize}
                      onChange={(e) => setNewBotConfig(prev => ({
                        ...prev,
                        maxPositionSize: parseFloat(e.target.value)
                      }))}
                      step="0.01"
                      min="0.01"
                      max="1"
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      止损比例 (%)
                    </label>
                    <input
                      type="number"
                      value={newBotConfig.stopLoss}
                      onChange={(e) => setNewBotConfig(prev => ({
                        ...prev,
                        stopLoss: parseFloat(e.target.value)
                      }))}
                      step="0.1"
                      min="0.1"
                      max="10"
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      止盈比例 (%)
                    </label>
                    <input
                      type="number"
                      value={newBotConfig.takeProfit}
                      onChange={(e) => setNewBotConfig(prev => ({
                        ...prev,
                        takeProfit: parseFloat(e.target.value)
                      }))}
                      step="0.1"
                      min="0.1"
                      max="20"
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowNewBotForm(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    创建机器人
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="divide-y">
            {bots.map((bot) => (
              <div key={bot.id} className="p-6">
                {renderBotStatus(bot)}
              </div>
            ))}

            {bots.length === 0 && !showNewBotForm && (
              <div className="p-8 text-center text-gray-500">
                暂无机器人，点击"新建机器人"开始创建
              </div>
            )}
          </div>
        </div>

        {/* 交易分析报告 */}
        <div className="bg-white rounded-lg p-4 mt-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">📊 交易分析</h3>
            <button
              onClick={fetchAnalysisReport}
              className="px-3 py-1 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 flex items-center"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              刷新
            </button>
          </div>
          <div className="whitespace-pre-wrap font-mono text-sm">
            {analysisReport || '暂无交易数据'}
          </div>
        </div>

        {/* 市场分析报告 */}
        <div className="bg-white rounded-lg p-4 mt-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">🌍 市场分析</h3>
            <button
              onClick={fetchMarketAnalysis}
              disabled={isLoadingAnalysis}
              className={`px-3 py-1 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 flex items-center ${
                isLoadingAnalysis ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoadingAnalysis ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                  分析中...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-1" />
                  刷新
                </>
              )}
            </button>
          </div>
          <div className="whitespace-pre-wrap font-mono text-sm">
            {marketAnalysis || '正在分析市场数据...'}
          </div>
        </div>

        {/* 风险提示 */}
        <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm text-yellow-700">
              <p className="font-medium mb-1">风险提示：</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>自动交易机器人可能带来显著的投资风险</li>
                <li>过去的表现不代表未来的收益</li>
                <li>请确保了解所使用的交易策略原理</li>
                <li>建议先在模拟环境中测试机器人性能</li>
                <li>合理设置止损和仓位控制，不要投入超过承受能力的资金</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutoTradingBot;