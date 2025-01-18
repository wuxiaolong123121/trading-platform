import { getMarketRecommendations, adaptiveLearn } from './aiService';
import { TradingBot } from './tradingBot';
import { errorHandler } from './errorHandler';

interface MarketAlert {
  symbol: string;
  type: 'buy' | 'sell';
  price: number;
  confidence: number;
  timestamp: number;
}

class MarketMonitor {
  private static instance: MarketMonitor;
  private monitoringInterval: number = 5 * 60 * 1000; // 5分钟
  private alerts: MarketAlert[] = [];
  private activeMonitoring: boolean = false;
  private tradingBots: Map<string, TradingBot> = new Map();

  private constructor() {
    // 私有构造函数
  }

  public static getInstance(): MarketMonitor {
    if (!MarketMonitor.instance) {
      MarketMonitor.instance = new MarketMonitor();
    }
    return MarketMonitor.instance;
  }

  public startMonitoring(bot: TradingBot) {
    this.tradingBots.set(bot.id, bot);
    
    if (!this.activeMonitoring) {
      this.activeMonitoring = true;
      this.monitor();
    }
  }

  public stopMonitoring(botId: string) {
    this.tradingBots.delete(botId);
    
    if (this.tradingBots.size === 0) {
      this.activeMonitoring = false;
    }
  }

  private async monitor() {
    while (this.activeMonitoring) {
      try {
        // 获取所有需要监控的交易对
        const symbols = new Set<string>();
        this.tradingBots.forEach(bot => {
          if (bot.strategy === 'multi_coin') {
            bot.config.parameters.symbols.forEach((symbol: string) => symbols.add(symbol));
          } else {
            symbols.add(bot.config.symbol);
          }
        });

        // 获取市场分析
        const analysis = await getMarketRecommendations(Array.from(symbols));
        
        if (!analysis || !analysis.content) {
          throw new Error('无法获取市场分析');
        }

        // 处理每个机器人的交易信号
        for (const [botId, bot] of this.tradingBots) {
          if (bot.status !== 'running') continue;

          // 解析分析结果
          const recommendations = this.parseAnalysis(analysis.content);
          
          // 根据策略处理建议
          if (bot.strategy === 'multi_coin') {
            this.handleMultiCoinStrategy(bot, recommendations);
          } else {
            const recommendation = recommendations.find(r => r.symbol === bot.config.symbol);
            if (recommendation) {
              this.handleSingleCoinStrategy(bot, recommendation);
            }
          }

          // 更新AI模型
          await adaptiveLearn(bot, {
            timestamp: Date.now(),
            recommendations,
            actions: this.alerts
          });
        }

        // 等待下一个监控周期
        await new Promise(resolve => setTimeout(resolve, this.monitoringInterval));
      } catch (error) {
        errorHandler.handleError('市场监控错误', 'high', { error });
        // 出错后等待一分钟再继续
        await new Promise(resolve => setTimeout(resolve, 60000));
      }
    }
  }

  private parseAnalysis(content: string): any[] {
    const recommendations: any[] = [];
    const lines = content.split('\n');
    let currentRec: any = {};

    for (const line of lines) {
      if (line.includes('/USDT')) {
        if (Object.keys(currentRec).length > 0) {
          recommendations.push(currentRec);
        }
        currentRec = { symbol: line.trim() };
      } else if (line.includes('当前价格:')) {
        currentRec.price = parseFloat(line.split(':')[1].trim());
      } else if (line.includes('建议:')) {
        const parts = line.split('(');
        currentRec.recommendation = parts[0].split(':')[1].trim();
        currentRec.confidence = parseFloat(parts[1].split(':')[1]) / 100;
      } else if (line.includes('原因:')) {
        currentRec.reasons = line.split(':')[1].trim().split(',').map((r: string) => r.trim());
      }
    }

    if (Object.keys(currentRec).length > 0) {
      recommendations.push(currentRec);
    }

    return recommendations;
  }

  private handleMultiCoinStrategy(bot: TradingBot, recommendations: any[]) {
    const highConfidenceRecs = recommendations.filter(rec => 
      rec.confidence >= bot.config.parameters.confidenceThreshold &&
      (rec.recommendation === 'strong_buy' || rec.recommendation === 'buy')
    );

    // 按置信度排序
    highConfidenceRecs.sort((a, b) => b.confidence - a.confidence);

    // 获取最佳的N个推荐（N = 最大持仓数 - 当前持仓数）
    const availableSlots = bot.config.parameters.maxPositions - (bot.activePositions?.size || 0);
    const topRecommendations = highConfidenceRecs.slice(0, availableSlots);

    // 创建交易提醒
    topRecommendations.forEach(rec => {
      this.createAlert({
        symbol: rec.symbol,
        type: 'buy',
        price: rec.price,
        confidence: rec.confidence,
        timestamp: Date.now()
      });
    });
  }

  private handleSingleCoinStrategy(bot: TradingBot, recommendation: any) {
    if (!recommendation) return;

    const { confidence, recommendation: action, price } = recommendation;

    // 根据置信度和动作创建提醒
    if (confidence >= 0.7) { // 70%置信度阈值
      if (action === 'strong_buy' || action === 'buy') {
        this.createAlert({
          symbol: bot.config.symbol,
          type: 'buy',
          price,
          confidence,
          timestamp: Date.now()
        });
      } else if (action === 'strong_sell' || action === 'sell') {
        this.createAlert({
          symbol: bot.config.symbol,
          type: 'sell',
          price,
          confidence,
          timestamp: Date.now()
        });
      }
    }
  }

  private createAlert(alert: MarketAlert) {
    this.alerts.push(alert);
    // 保持最新的100条提醒
    if (this.alerts.length > 100) {
      this.alerts.shift();
    }
    
    // 触发交易执行
    this.executeTradeSignal(alert);
  }

  private async executeTradeSignal(alert: MarketAlert) {
    try {
      // 遍历所有相关的机器人
      for (const [_, bot] of this.tradingBots) {
        if (bot.status !== 'running') continue;

        const isRelevant = bot.strategy === 'multi_coin' ? 
          bot.config.parameters.symbols.includes(alert.symbol) :
          bot.config.symbol === alert.symbol;

        if (!isRelevant) continue;

        // 执行交易
        if (alert.type === 'buy') {
          await bot.executeBuy(alert.symbol, alert.price, alert.confidence);
        } else {
          await bot.executeSell(alert.symbol, alert.price, alert.confidence);
        }
      }
    } catch (error) {
      errorHandler.handleError('执行交易信号失败', 'high', { error, alert });
    }
  }

  public getAlerts(): MarketAlert[] {
    return this.alerts;
  }

  public setMonitoringInterval(interval: number) {
    this.monitoringInterval = interval;
  }
}

export const marketMonitor = MarketMonitor.getInstance();
