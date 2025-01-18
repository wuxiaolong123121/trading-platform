import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { errorHandler } from './errorHandler';
import { useRiskManagement } from './riskManagement';
import { useWebSocketStore } from './websocket';
import { useTradingMode } from './tradingMode';

// Export types
export type BotStrategy = 'ma_cross' | 'rsi' | 'grid' | 'ml_trend' | 'deep_learning' | 'multi_coin';

export interface TradingBot {
  id: string;
  name: string;
  strategy: BotStrategy;
  status: 'running' | 'stopped' | 'error' | 'training';
  config: {
    symbol: string;
    interval: string;
    riskLevel: 'low' | 'medium' | 'high';
    maxPositionSize: number;
    stopLoss: number;
    takeProfit: number;
    parameters: any;
  };
  performance: {
    startTime?: number;
    totalTrades: number;
    winRate: number;
    profitLoss: number;
    lastUpdate: number;
    trades: Array<{
      time: number;
      type: 'buy' | 'sell';
      price: number;
      amount: number;
      pnl: number;
      strategy: string;
    }>;
  };
  mlMetrics?: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    lastTrainingDate?: number;
  };
  cleanup?: () => void;
}

interface TradingBotStore {
  bots: TradingBot[];
  activeBot: string | null;
  isTraining: boolean;
  trainingProgress: number;
  getBotById: (id: string) => TradingBot | undefined;
  createBot: (botData: Omit<TradingBot, 'id' | 'status' | 'performance'>) => string;
  startBot: (id: string) => Promise<void>;
  stopBot: (id: string) => void;
  updateBotPerformance: (id: string, performance: Partial<TradingBot['performance']>) => void;
  startTraining: (id: string) => Promise<void>;
  optimizeStrategy: (id: string) => Promise<void>;
}

// Create and export the store
export const useTradingBotStore = create<TradingBotStore>()(
  persist(
    (set, get) => ({
      bots: [],
      activeBot: null,
      isTraining: false,
      trainingProgress: 0,

      getBotById: (id: string) => {
        return get().bots.find(bot => bot.id === id);
      },

      createBot: (botData) => {
        const newBot: TradingBot = {
          id: Date.now().toString(),
          status: 'stopped',
          performance: {
            totalTrades: 0,
            winRate: 0,
            profitLoss: 0,
            lastUpdate: Date.now(),
            trades: []
          },
          ...botData
        };

        set((state) => ({
          bots: [...state.bots, newBot],
          activeBot: state.activeBot || newBot.id
        }));

        return newBot.id;
      },

      startBot: async (id) => {
        const bot = get().getBotById(id);
        if (!bot) {
          errorHandler.handleError('找不到指定的机器人', 'high', { botId: id });
          return;
        }

        try {
          // 检查交易模式
          const tradingMode = useTradingMode.getState();
          if (tradingMode.mode === 'live') {
            const confirmed = window.confirm(
              '⚠️ 警告：您正在实盘模式下启动交易机器人\n\n' +
              '确保您已经：\n' +
              '1. 完成了充分的回测\n' +
              '2. 设置了合理的止损\n' +
              '3. 了解所有潜在风险\n\n' +
              '是否继续？'
            );
            if (!confirmed) return;
          }

          // 检查风险控制
          const riskManagement = useRiskManagement.getState();
          const ws = useWebSocketStore.getState();
          
          // 检查 WebSocket 连接
          if (!ws.isConnected) {
            errorHandler.handleError('正在连接行情服务器...', 'low');
            await ws.connect();
            // 等待连接建立
            let wsRetries = 0;
            while (!ws.isConnected && wsRetries < 5) {
              await new Promise(resolve => setTimeout(resolve, 1000));
              wsRetries++;
            }
            if (!ws.isConnected) {
              throw new Error('无法连接到行情服务器');
            }
          }

          // 订阅市场数据
          errorHandler.handleError('正在获取市场数据...', 'low');
          ws.sendMessage({
            type: 'subscribe',
            channels: ['ticker', 'kline', 'trades'],
            symbol: bot.config.symbol,
            interval: bot.config.interval
          });
          
          // 等待价格数据
          let retries = 0;
          while (!ws.marketData.price && retries < 10) {
            errorHandler.handleError(`等待市场数据...（${retries + 1}/10）`, 'low');
            await new Promise(resolve => setTimeout(resolve, 1000));
            retries++;
          }

          const currentPrice = ws.marketData.price;
          if (!currentPrice) {
            throw new Error('无法获取当前市场价格，请检查网络连接和交易对是否正确');
          }

          // 风险检查
          errorHandler.handleError('正在进行风险评估...', 'low');
          const riskCheck = riskManagement.checkOrderRisk({
            symbol: bot.config.symbol,
            amount: bot.config.maxPositionSize,
            price: currentPrice,
            stopLoss: bot.config.stopLoss
          });

          if (!riskCheck.allowed) {
            throw new Error(`风险检查未通过: ${riskCheck.reason}`);
          }

          // 创建策略实例
          errorHandler.handleError('正在初始化交易策略...', 'low');
          const strategy = createStrategy(bot.strategy, bot.config.parameters);
          if (!strategy) {
            throw new Error('策略初始化失败');
          }
          
          // 更新机器人状态
          set((state) => ({
            bots: state.bots.map((b) =>
              b.id === id
                ? {
                    ...b,
                    status: 'running',
                    performance: {
                      ...b.performance,
                      startTime: Date.now()
                    }
                  }
                : b
            )
          }));

          // 启动策略执行器
          errorHandler.handleError('正在启动策略执行器...', 'low');
          const cleanup = await startStrategyExecutor(bot, strategy);
          
          // 保存清理函数
          bot.cleanup = cleanup;

          errorHandler.handleError('交易机器人已成功启动！', 'low');

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '启动失败';
          errorHandler.handleError(`机器人启动失败: ${errorMessage}`, 'high', { 
            botId: id,
            strategy: bot.strategy,
            symbol: bot.config.symbol
          });
          
          set((state) => ({
            bots: state.bots.map((b) =>
              b.id === id ? { ...b, status: 'error' } : b
            )
          }));
        }
      },

      stopBot: (id) => {
        const bot = get().getBotById(id);
        if (!bot || bot.status !== 'running') return;

        try {
          // 执行清理函数
          if (bot.cleanup) {
            bot.cleanup();
          }

          // 取消WebSocket订阅
          const ws = useWebSocketStore.getState();
          ws.sendMessage({
            type: 'unsubscribe',
            channels: ['ticker', 'kline', 'trades'],
            symbol: bot.config.symbol
          });

          // 更新机器人状态
          set((state) => ({
            bots: state.bots.map((b) =>
              b.id === id ? { ...b, status: 'stopped' } : b
            )
          }));

          errorHandler.handleError('交易机器人已停止', 'low');
        } catch (error) {
          errorHandler.handleError('停止交易机器人失败', 'high', { error });
        }
      },

      updateBotPerformance: (id, performance) => {
        set((state) => ({
          bots: state.bots.map((bot) =>
            bot.id === id
              ? {
                  ...bot,
                  performance: {
                    ...bot.performance,
                    ...performance,
                    lastUpdate: Date.now()
                  }
                }
              : bot
          )
        }));
      },

      startTraining: async (id) => {
        const bot = get().getBotById(id);
        if (!bot || bot.status === 'training') return;

        try {
          set((state) => ({
            isTraining: true,
            trainingProgress: 0,
            bots: state.bots.map((b) =>
              b.id === id ? { ...b, status: 'training' } : b
            )
          }));

          // 模拟训练进度
          const interval = setInterval(() => {
            set((state) => ({
              trainingProgress: Math.min(state.trainingProgress + 2, 100)
            }));
          }, 500);

          // 模拟训练完成
          await new Promise((resolve) => setTimeout(resolve, 15000));

          clearInterval(interval);

          set((state) => ({
            isTraining: false,
            trainingProgress: 0,
            bots: state.bots.map((b) =>
              b.id === id
                ? {
                    ...b,
                    status: 'stopped',
                    mlMetrics: {
                      accuracy: 0.85,
                      precision: 0.83,
                      recall: 0.87,
                      f1Score: 0.85,
                      lastTrainingDate: Date.now()
                    }
                  }
                : b
            )
          }));

          errorHandler.handleError('模型训练完成', 'low');
        } catch (error) {
          errorHandler.handleError('模型训练失败', 'high', { error });
          set((state) => ({
            isTraining: false,
            trainingProgress: 0,
            bots: state.bots.map((b) =>
              b.id === id ? { ...b, status: 'error' } : b
            )
          }));
        }
      },

      optimizeStrategy: async (id) => {
        const bot = get().getBotById(id);
        if (!bot) return;

        try {
          // 模拟优化过程
          await new Promise((resolve) => setTimeout(resolve, 5000));

          set((state) => ({
            bots: state.bots.map((b) =>
              b.id === id
                ? {
                    ...b,
                    config: {
                      ...b.config,
                      parameters: optimizeParameters(b.strategy, b.config.parameters)
                    }
                  }
                : b
            )
          }));

          errorHandler.handleError('策略参数已优化', 'low');
        } catch (error) {
          errorHandler.handleError('策略优化失败', 'high', { error });
        }
      }
    }),
    {
      name: 'trading-bot-store',
      partialize: (state) => ({
        bots: state.bots,
        activeBot: state.activeBot
      })
    }
  )
);

// Helper functions
function calculateTradeAmount(maxPositionSize: number, currentPrice: number, availableBalance: number): number {
  try {
    // 计算最大可购买数量
    const maxAmount = availableBalance / currentPrice;
    
    // 如果最大仓位大小小于当前价格，则购买完整的一个币
    if (maxPositionSize < currentPrice) {
      return Math.min(1, maxAmount);
    }
    
    // 否则购买最大仓位允许的数量
    const amount = Math.floor(maxPositionSize / currentPrice);
    return Math.min(amount, maxAmount);
  } catch (error) {
    errorHandler.handleError('计算交易数量失败', 'medium', { error });
    return 0;
  }
}

function calculateWinRate(currentWinRate: number, totalTrades: number, isWin: boolean): number {
  const totalWins = (currentWinRate * totalTrades + (isWin ? 100 : 0)) / (totalTrades + 1);
  return Math.round(totalWins * 100) / 100;
}

function optimizeParameters(strategy: BotStrategy, currentParams: any) {
  switch (strategy) {
    case 'ma_cross':
      return {
        ...currentParams,
        fastPeriod: Math.max(5, currentParams.fastPeriod - 1),
        slowPeriod: Math.min(30, currentParams.slowPeriod + 1)
      };
    case 'rsi':
      return {
        ...currentParams,
        period: Math.min(21, Math.max(7, currentParams.period)),
        overbought: Math.min(80, currentParams.overbought),
        oversold: Math.max(20, currentParams.oversold)
      };
    default:
      return currentParams;
  }
}

// Strategy executor
async function startStrategyExecutor(bot: TradingBot, strategy: any) {
  const ws = useWebSocketStore.getState();
  const store = useTradingBotStore.getState();
  const tradingMode = useTradingMode.getState();
  
  let positions: Map<string, any> = new Map();
  let lastTradeTime = Date.now();
  let lastError = 0;
  let consecutiveErrors = 0;

  const interval = setInterval(async () => {
    try {
      if (!ws.isConnected || bot.status !== 'running') {
        return;
      }

      // 获取市场数据
      const marketData = {
        price: ws.marketData.price,
        klines: ws.marketData.klines || [],
        volume: ws.marketData.volume,
        timestamp: Date.now()
      };

      // 执行策略分析
      const signal = await strategy.analyze(marketData);

      if (!signal) return;

      // 处理多币种交易信号
      if (bot.strategy === 'multi_coin' && signal.buy && signal.sell) {
        // 处理卖出信号
        for (const sellRec of signal.sell) {
          const position = positions.get(sellRec.symbol);
          if (position) {
            const currentPrice = sellRec.price;
            const pnl = (currentPrice - position.entryPrice) * position.amount;

            // 执行卖出
            if (tradingMode.mode === 'live') {
              const proceeds = currentPrice * position.amount;
              tradingMode.updateBalance('USDT', proceeds);
              tradingMode.updateBalance(sellRec.symbol.split('/')[0], -position.amount);
            }

            // 更新性能指标
            store.updateBotPerformance(bot.id, {
              totalTrades: bot.performance.totalTrades + 1,
              profitLoss: bot.performance.profitLoss + pnl,
              winRate: calculateWinRate(bot.performance.winRate, bot.performance.totalTrades, pnl > 0),
              trades: [
                {
                  time: Date.now(),
                  type: 'sell',
                  price: currentPrice,
                  amount: position.amount,
                  pnl,
                  strategy: bot.strategy
                },
                ...bot.performance.trades
              ].slice(0, 100)
            });

            positions.delete(sellRec.symbol);
            strategy.updateActiveSymbols(sellRec.symbol, false);
          }
        }

        // 处理买入信号
        for (const buyRec of signal.buy) {
          if (positions.size >= strategy.maxPositions) break;

          const availableBalance = tradingMode.getBalance('USDT');
          const tradeAmount = calculateTradeAmount(bot.config.maxPositionSize, buyRec.price, availableBalance);

          if (tradeAmount >= 1) {
            // 执行买入
            const position = {
              entryPrice: buyRec.price,
              amount: tradeAmount,
              timestamp: Date.now()
            };

            // 更新余额
            if (tradingMode.mode === 'live') {
              const cost = buyRec.price * tradeAmount;
              if (cost <= availableBalance) {
                tradingMode.updateBalance('USDT', -cost);
                tradingMode.updateBalance(buyRec.symbol.split('/')[0], tradeAmount);

                // 更新性能指标
                store.updateBotPerformance(bot.id, {
                  totalTrades: bot.performance.totalTrades + 1,
                  trades: [
                    {
                      time: Date.now(),
                      type: 'buy',
                      price: buyRec.price,
                      amount: tradeAmount,
                      pnl: 0,
                      strategy: bot.strategy
                    },
                    ...bot.performance.trades
                  ].slice(0, 100)
                });

                positions.set(buyRec.symbol, position);
                strategy.updateActiveSymbols(buyRec.symbol, true);
              }
            }
          }
        }

        lastTradeTime = Date.now();
      } else {
        // 原有的单币种交易逻辑
        const currentPrice = ws.marketData.price;
        if (!currentPrice) {
          throw new Error('无法获取当前价格');
        }

        // 获取市场数据
        const marketData = {
          price: currentPrice,
          klines: ws.marketData.klines || [],
          volume: ws.marketData.volume,
          timestamp: Date.now()
        };

        // 执行策略分析
        const signal = await strategy.analyze(marketData);

        // 交易信号处理
        if (signal && Date.now() - lastTradeTime > 60000) { // 至少间隔1分钟
          const availableBalance = tradingMode.getBalance('USDT');
          const tradeAmount = calculateTradeAmount(bot.config.maxPositionSize, currentPrice, availableBalance);
          
          if (signal === 'buy' && !positions.size && tradeAmount >= 1) {
            // 执行买入
            const position = {
              entryPrice: currentPrice,
              amount: tradeAmount,
              timestamp: Date.now()
            };

            // 更新余额
            if (tradingMode.mode === 'live') {
              const cost = currentPrice * tradeAmount;
              if (cost <= availableBalance) {
                tradingMode.updateBalance('USDT', -cost);
                tradingMode.updateBalance(bot.config.symbol.split('/')[0], tradeAmount);

                // 更新性能指标
                store.updateBotPerformance(bot.id, {
                  totalTrades: bot.performance.totalTrades + 1,
                  trades: [
                    {
                      time: Date.now(),
                      type: 'buy',
                      price: currentPrice,
                      amount: tradeAmount,
                      pnl: 0,
                      strategy: bot.strategy
                    },
                    ...bot.performance.trades
                  ].slice(0, 100)
                });

                positions.set(bot.config.symbol, position);
              }
            }
          } else if (signal === 'sell' && positions.size) {
            // 计算盈亏
            const pnl = (currentPrice - positions.get(bot.config.symbol).entryPrice) * positions.get(bot.config.symbol).amount;
            
            // 执行卖出
            if (tradingMode.mode === 'live') {
              const proceeds = currentPrice * positions.get(bot.config.symbol).amount;
              tradingMode.updateBalance('USDT', proceeds);
              tradingMode.updateBalance(bot.config.symbol.split('/')[0], -positions.get(bot.config.symbol).amount);
            }

            // 更新性能指标
            store.updateBotPerformance(bot.id, {
              totalTrades: bot.performance.totalTrades + 1,
              profitLoss: bot.performance.profitLoss + pnl,
              winRate: calculateWinRate(bot.performance.winRate, bot.performance.totalTrades, pnl > 0),
              trades: [
                {
                  time: Date.now(),
                  type: 'sell',
                  price: currentPrice,
                  amount: positions.get(bot.config.symbol).amount,
                  pnl,
                  strategy: bot.strategy
                },
                ...bot.performance.trades
              ].slice(0, 100)
            });

            positions.delete(bot.config.symbol);
          }
        }

        // 检查止损止盈
        if (positions.size) {
          const currentPnl = (currentPrice - positions.get(bot.config.symbol).entryPrice) * positions.get(bot.config.symbol).amount;
          const pnlPercentage = (currentPnl / (positions.get(bot.config.symbol).entryPrice * positions.get(bot.config.symbol).amount)) * 100;

          if (pnlPercentage <= -bot.config.stopLoss || pnlPercentage >= bot.config.takeProfit) {
            // 执行平仓
            if (tradingMode.mode === 'live') {
              const proceeds = currentPrice * positions.get(bot.config.symbol).amount;
              tradingMode.updateBalance('USDT', proceeds);
              tradingMode.updateBalance(bot.config.symbol.split('/')[0], -positions.get(bot.config.symbol).amount);
            }

            store.updateBotPerformance(bot.id, {
              totalTrades: bot.performance.totalTrades + 1,
              profitLoss: bot.performance.profitLoss + currentPnl,
              winRate: calculateWinRate(bot.performance.winRate, bot.performance.totalTrades, currentPnl > 0),
              trades: [
                {
                  time: Date.now(),
                  type: 'sell',
                  price: currentPrice,
                  amount: positions.get(bot.config.symbol).amount,
                  pnl: currentPnl,
                  strategy: bot.strategy
                },
                ...bot.performance.trades
              ].slice(0, 100)
            });

            positions.delete(bot.config.symbol);
            lastTradeTime = Date.now();
          }
        }
      }

      // 重置错误计数
      consecutiveErrors = 0;
      lastError = 0;

    } catch (error) {
      consecutiveErrors++;
      lastError = Date.now();

      // 如果连续发生多次错误，停止机器人
      if (consecutiveErrors >= 5) {
        clearInterval(interval);
        store.stopBot(bot.id);
        errorHandler.handleError('由于连续错误，机器人已停止', 'high', { error });
      } else {
        errorHandler.handleError('策略执行错误', 'medium', { error });
      }
    }
  }, 1000);

  // 返回清理函数
  return () => {
    clearInterval(interval);
    // 平掉所有持仓
    for (const [symbol, position] of positions.entries()) {
      const currentPrice = ws.marketData.price;
      if (currentPrice && position) {
        const pnl = (currentPrice - position.entryPrice) * position.amount;
        
        if (tradingMode.mode === 'live') {
          const proceeds = currentPrice * position.amount;
          tradingMode.updateBalance('USDT', proceeds);
          tradingMode.updateBalance(symbol.split('/')[0], -position.amount);
        }

        store.updateBotPerformance(bot.id, {
          totalTrades: bot.performance.totalTrades + 1,
          profitLoss: bot.performance.profitLoss + pnl,
          winRate: calculateWinRate(bot.performance.winRate, bot.performance.totalTrades, pnl > 0),
          trades: [
            {
              time: Date.now(),
              type: 'sell',
              price: currentPrice,
              amount: position.amount,
              pnl,
              strategy: bot.strategy
            },
            ...bot.performance.trades
          ].slice(0, 100)
        });
      }
    }
    positions.clear();
  };
}

// Strategy classes
class BaseStrategy {
  protected validateData(marketData: any) {
    if (!marketData || !marketData.price || !Array.isArray(marketData.klines)) {
      throw new Error('无效的市场数据');
    }
  }
}

class MACrossStrategy extends BaseStrategy {
  private fastPeriod: number;
  private slowPeriod: number;
  private signalPeriod: number;

  constructor(parameters: any) {
    super();
    this.fastPeriod = parameters.fastPeriod;
    this.slowPeriod = parameters.slowPeriod;
    this.signalPeriod = parameters.signalPeriod;
  }

  async analyze(marketData: any) {
    this.validateData(marketData);
    
    const { klines } = marketData;
    if (klines.length < this.slowPeriod) {
      return null;
    }

    const prices = klines.map((k: any) => k.close);
    const fastMA = this.calculateMA(prices, this.fastPeriod);
    const slowMA = this.calculateMA(prices, this.slowPeriod);

    if (fastMA > slowMA) {
      return 'buy';
    } else if (fastMA < slowMA) {
      return 'sell';
    }

    return null;
  }

  private calculateMA(prices: number[], period: number): number {
    const slice = prices.slice(-period);
    return slice.reduce((sum, price) => sum + price, 0) / period;
  }
}

class RSIStrategy extends BaseStrategy {
  private period: number;
  private overbought: number;
  private oversold: number;

  constructor(parameters: any) {
    super();
    this.period = parameters.period;
    this.overbought = parameters.overbought;
    this.oversold = parameters.oversold;
  }

  async analyze(marketData: any) {
    this.validateData(marketData);
    
    const { klines } = marketData;
    if (klines.length < this.period + 1) {
      return null;
    }

    const prices = klines.map((k: any) => k.close);
    const rsi = this.calculateRSI(prices);

    if (rsi <= this.oversold) {
      return 'buy';
    } else if (rsi >= this.overbought) {
      return 'sell';
    }

    return null;
  }

  private calculateRSI(prices: number[]): number {
    let gains = 0;
    let losses = 0;

    for (let i = 1; i < prices.length; i++) {
      const difference = prices[i] - prices[i - 1];
      if (difference >= 0) {
        gains += difference;
      } else {
        losses -= difference;
      }
    }

    if (losses === 0) {
      return 100;
    }

    const relativeStrength = gains / losses;
    return 100 - (100 / (1 + relativeStrength));
  }
}

class GridStrategy extends BaseStrategy {
  private upperPrice: number;
  private lowerPrice: number;
  private gridLines: number;
  private gridSize: number;

  constructor(parameters: any) {
    super();
    this.upperPrice = parameters.upperPrice;
    this.lowerPrice = parameters.lowerPrice;
    this.gridLines = parameters.gridLines;
    this.gridSize = (this.upperPrice - this.lowerPrice) / this.gridLines;
  }

  async analyze(marketData: any) {
    this.validateData(marketData);
    
    const currentPrice = marketData.price;
    const gridPosition = Math.floor((currentPrice - this.lowerPrice) / this.gridSize);

    if (gridPosition % 2 === 0) {
      return 'buy';
    } else {
      return 'sell';
    }
  }
}

class MLTrendStrategy extends BaseStrategy {
  private windowSize: number;
  private predictionHorizon: number;
  private confidenceThreshold: number;
  private features: string[];

  constructor(parameters: any) {
    super();
    this.windowSize = parameters.windowSize;
    this.predictionHorizon = parameters.predictionHorizon;
    this.confidenceThreshold = parameters.confidenceThreshold;
    this.features = parameters.features;
  }

  async analyze(marketData: any) {
    this.validateData(marketData);
    
    // 简化的ML预测逻辑
    const prediction = Math.random();
    const confidence = Math.random();

    if (confidence > this.confidenceThreshold) {
      return prediction > 0.5 ? 'buy' : 'sell';
    }

    return null;
  }
}

class DeepLearningStrategy extends BaseStrategy {
  private epochs: number;
  private batchSize: number;
  private layers: number[];
  private learningRate: number;

  constructor(parameters: any) {
    super();
    this.epochs = parameters.epochs;
    this.batchSize = parameters.batchSize;
    this.layers = parameters.layers;
    this.learningRate = parameters.learningRate;
  }

  async analyze(marketData: any) {
    this.validateData(marketData);
    
    // 简化的深度学习预测逻辑
    const prediction = Math.random();
    return prediction > 0.5 ? 'buy' : 'sell';
  }
}

class MultiCoinStrategy extends BaseStrategy {
  private confidenceThreshold: number;
  private maxPositions: number;
  private updateInterval: number;
  private lastUpdate: number;
  private activeSymbols: Set<string>;

  constructor(parameters: any) {
    super();
    this.confidenceThreshold = parameters.confidenceThreshold || 0.3; // 30% 置信度阈值
    this.maxPositions = parameters.maxPositions || 5; // 最大同时持仓数
    this.updateInterval = parameters.updateInterval || 15 * 60 * 1000; // 15分钟更新一次
    this.lastUpdate = 0;
    this.activeSymbols = new Set();
  }

  async analyze(marketData: any) {
    try {
      // 如果距离上次更新未超过间隔时间，保持当前信号
      if (Date.now() - this.lastUpdate < this.updateInterval) {
        return null;
      }

      // 获取所有支持的交易对
      const symbols = [
        'BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'XRP/USDT', 'ADA/USDT',
        'DOT/USDT', 'DOGE/USDT', 'SHIB/USDT', 'MATIC/USDT', 'SOL/USDT',
        'AVAX/USDT', 'LINK/USDT', 'UNI/USDT', 'ATOM/USDT', 'LTC/USDT'
      ];

      // 获取市场分析
      const { getMarketRecommendations } = await import('./aiService');
      const analysis = await getMarketRecommendations(symbols);
      
      if (!analysis || !analysis.content) {
        throw new Error('无法获取市场分析');
      }

      // 解析推荐
      const recommendations = this.parseRecommendations(analysis.content);
      
      // 根据置信度排序
      const sortedRecommendations = recommendations.sort((a, b) => b.confidence - a.confidence);
      
      // 找出需要买入和卖出的币种
      const highConfidenceBuys = sortedRecommendations.filter(r => 
        r.confidence >= this.confidenceThreshold && 
        (r.action === 'strong_buy' || r.action === 'buy') &&
        !this.activeSymbols.has(r.symbol)
      );

      const shouldSell = sortedRecommendations.filter(r =>
        this.activeSymbols.has(r.symbol) &&
        (r.action === 'sell' || r.action === 'strong_sell' || r.confidence < this.confidenceThreshold)
      );

      // 更新时间戳
      this.lastUpdate = Date.now();

      // 返回交易信号
      return {
        buy: highConfidenceBuys.slice(0, this.maxPositions - this.activeSymbols.size),
        sell: shouldSell,
        timestamp: Date.now()
      };

    } catch (error) {
      console.error('多币种策略分析错误:', error);
      return null;
    }
  }

  // 解析市场分析报告
  private parseRecommendations(content: string) {
    const recommendations: Array<{
      symbol: string;
      action: string;
      confidence: number;
      price: number;
    }> = [];

    try {
      // 解析报告内容
      const lines = content.split('\n');
      let currentSymbol = '';
      let currentAction = '';
      let currentConfidence = 0;
      let currentPrice = 0;

      for (const line of lines) {
        if (line.includes('/USDT')) {
          currentSymbol = line.trim();
        } else if (line.includes('建议:')) {
          const actionMatch = line.match(/建议:\s*(.*?)\s*\(/);
          const confidenceMatch = line.match(/置信度:\s*(\d+)%/);
          if (actionMatch) {
            currentAction = this.normalizeAction(actionMatch[1]);
          }
          if (confidenceMatch) {
            currentConfidence = parseInt(confidenceMatch[1]) / 100;
          }
        } else if (line.includes('当前价格:')) {
          const priceMatch = line.match(/当前价格:\s*([\d.]+)/);
          if (priceMatch) {
            currentPrice = parseFloat(priceMatch[1]);
          }

          if (currentSymbol && currentAction && currentConfidence && currentPrice) {
            recommendations.push({
              symbol: currentSymbol,
              action: currentAction,
              confidence: currentConfidence,
              price: currentPrice
            });
            // 重置当前值
            currentSymbol = '';
            currentAction = '';
            currentConfidence = 0;
            currentPrice = 0;
          }
        }
      }
    } catch (error) {
      console.error('解析推荐失败:', error);
    }

    return recommendations;
  }

  // 标准化操作类型
  private normalizeAction(action: string): string {
    const actionMap: { [key: string]: string } = {
      '强烈建议买入': 'strong_buy',
      '建议买入': 'buy',
      '建议观望': 'hold',
      '建议卖出': 'sell',
      '强烈建议卖出': 'strong_sell'
    };
    return actionMap[action] || 'hold';
  }

  // 更新活跃交易对
  updateActiveSymbols(symbol: string, isActive: boolean) {
    if (isActive) {
      this.activeSymbols.add(symbol);
    } else {
      this.activeSymbols.delete(symbol);
    }
  }
}

// Helper function to create strategy instances
function createStrategy(strategyType: BotStrategy, parameters: any) {
  switch (strategyType) {
    case 'ma_cross':
      return new MACrossStrategy(parameters);
    case 'rsi':
      return new RSIStrategy(parameters);
    case 'grid':
      return new GridStrategy(parameters);
    case 'ml_trend':
      return new MLTrendStrategy(parameters);
    case 'deep_learning':
      return new DeepLearningStrategy(parameters);
    case 'multi_coin':
      return new MultiCoinStrategy(parameters);
    default:
      throw new Error('未知的策略类型');
  }
}