import { errorHandler } from './errorHandler';
import { analyzeDailyTrades, generateTradingReport, DailyTradeAnalysis } from './tradeAnalysisService';
import { analyzeMarket, MarketAnalysis } from './marketAnalysisService';
import { TradingBot } from './tradingBot';
import { OpenAI } from 'openai';
import { historyService } from './historyService';
import { getMarketData } from './marketService';

interface AIResponse {
  content: string;
  error?: string;
  analysis?: DailyTradeAnalysis | MarketAnalysis;
}

// 创建市场分析缓存
const marketAnalysisCache = new Map<string, {
  analysis: any;
  timestamp: number;
}>();

// 创建策略优化缓存
const strategyOptimizationCache = new Map<string, {
  optimizedParams: any;
  performance: any;
  timestamp: number;
}>();

// AI模型状态
interface ModelState {
  isTraining: boolean;
  lastTrainingTime: number;
  performanceMetrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
  };
}

const modelState: ModelState = {
  isTraining: false,
  lastTrainingTime: 0,
  performanceMetrics: {
    accuracy: 0,
    precision: 0,
    recall: 0,
    f1Score: 0,
  },
};

export async function callAIAPI(
  provider: string,
  model: string,
  apiKey: string,
  message: string,
  context: any
): Promise<AIResponse> {
  try {
    switch (provider) {
      case 'openai':
        return await callOpenAI(apiKey, model, message, context);
      case 'anthropic':
        return await callAnthropic(apiKey, model, message, context);
      case 'gemini':
        return await callGemini(apiKey, model, message, context);
      case 'deepseek':
        return await callDeepseek(apiKey, model, message, context);
      default:
        throw new Error('不支持的AI提供商');
    }
  } catch (error) {
    errorHandler.handleError(`AI API调用失败: ${error}`, 'high', { provider, model });
    return {
      content: '抱歉，AI服务暂时无法访问，请稍后再试。',
      error: error instanceof Error ? error.message : '未知错误'
    };
  }
}

export async function analyzeTradingPerformance(bot: TradingBot): Promise<AIResponse> {
  try {
    const analysis = analyzeDailyTrades(bot);
    const report = generateTradingReport(analysis);
    
    return {
      content: report,
      analysis
    };
  } catch (error) {
    errorHandler.handleError('生成交易分析报告失败', 'medium', { error });
    return {
      content: '抱歉，无法生成交易分析报告。请稍后再试。',
      error: error instanceof Error ? error.message : '未知错误'
    };
  }
}

export async function getMarketRecommendations(symbols: string[]): Promise<AIResponse> {
  try {
    const currentTime = Date.now();
    const recommendations: any[] = [];

    for (const symbol of symbols) {
      // 检查缓存
      const cached = marketAnalysisCache.get(symbol);
      if (cached && currentTime - cached.timestamp < 5 * 60 * 1000) { // 5分钟缓存
        recommendations.push(cached.analysis);
        continue;
      }

      // 获取市场数据
      const marketData = await getMarketData(symbol);
      const historicalData = await historyService.getHistoricalData(symbol, '1h', 168); // 7天数据

      // 使用AI分析市场
      const analysis = await analyzeMarket(marketData, historicalData);
      
      // 更新缓存
      marketAnalysisCache.set(symbol, {
        analysis,
        timestamp: currentTime
      });

      recommendations.push(analysis);
    }

    return {
      content: formatRecommendations(recommendations),
      timestamp: currentTime
    };
  } catch (error) {
    console.error('获取市场建议失败:', error);
    return null;
  }
}

// AI市场分析
async function analyzeMarket(marketData: any, historicalData: any) {
  try {
    // 技术指标分析
    const technicalAnalysis = analyzeTechnicalIndicators(marketData, historicalData);
    
    // 情绪分析
    const sentimentAnalysis = await analyzeSentiment(marketData.symbol);
    
    // 趋势分析
    const trendAnalysis = analyzeTrends(historicalData);
    
    // 综合分析
    const analysis = combineAnalysis(technicalAnalysis, sentimentAnalysis, trendAnalysis);
    
    return {
      symbol: marketData.symbol,
      price: marketData.price,
      recommendation: analysis.recommendation,
      confidence: analysis.confidence,
      reasons: analysis.reasons
    };
  } catch (error) {
    console.error('市场分析失败:', error);
    return null;
  }
}

// 优化交易策略
export async function optimizeStrategy(bot: TradingBot) {
  try {
    if (modelState.isTraining) {
      return null;
    }

    const cacheKey = `${bot.id}-${bot.strategy}`;
    const cached = strategyOptimizationCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) { // 24小时缓存
      return cached.optimizedParams;
    }

    modelState.isTraining = true;

    // 获取历史数据
    const historicalData = await historyService.getHistoricalData(
      bot.config.symbol,
      bot.config.interval,
      500 // 500个数据点
    );

    // 分割训练和测试数据
    const splitIndex = Math.floor(historicalData.length * 0.8);
    const trainingData = historicalData.slice(0, splitIndex);
    const testingData = historicalData.slice(splitIndex);

    // 优化策略参数
    const optimizedParams = await optimizeParameters(bot.strategy, trainingData);
    
    // 在测试数据上评估性能
    const performance = await evaluateStrategy(bot.strategy, optimizedParams, testingData);

    // 更新模型状态
    modelState.lastTrainingTime = Date.now();
    modelState.performanceMetrics = performance.metrics;

    // 更新缓存
    strategyOptimizationCache.set(cacheKey, {
      optimizedParams,
      performance,
      timestamp: Date.now()
    });

    modelState.isTraining = false;

    return {
      parameters: optimizedParams,
      performance: performance
    };
  } catch (error) {
    console.error('策略优化失败:', error);
    modelState.isTraining = false;
    return null;
  }
}

// 自适应学习系统
export async function adaptiveLearn(bot: TradingBot, newTradeData: any) {
  try {
    // 更新模型的学习数据
    await updateLearningData(bot.id, newTradeData);
    
    // 检查是否需要重新训练
    const shouldRetrain = checkRetrainingNeeded(bot.id);
    
    if (shouldRetrain) {
      // 在后台开始再训练
      retrainModel(bot);
    }
    
    // 返回最新的模型状态
    return {
      lastTrainingTime: modelState.lastTrainingTime,
      performanceMetrics: modelState.performanceMetrics
    };
  } catch (error) {
    console.error('自适应学习失败:', error);
    return null;
  }
}

// 辅助函数
function analyzeTechnicalIndicators(marketData: any, historicalData: any) {
  // 实现技术指标分析
  const indicators = {
    rsi: calculateRSI(historicalData),
    macd: calculateMACD(historicalData),
    bollinger: calculateBollingerBands(historicalData),
    volume: analyzeVolume(historicalData)
  };
  
  return analyzeIndicators(indicators);
}

async function analyzeSentiment(symbol: string) {
  // 实现市场情绪分析
  return {
    score: 0.75,
    signals: ['positive_trend', 'high_volume']
  };
}

function analyzeTrends(historicalData: any) {
  // 实现趋势分析
  return {
    shortTerm: 'upward',
    mediumTerm: 'neutral',
    longTerm: 'upward'
  };
}

function combineAnalysis(technical: any, sentiment: any, trend: any) {
  // 综合各种分析结果
  return {
    recommendation: 'buy',
    confidence: 0.85,
    reasons: ['Strong technical indicators', 'Positive sentiment']
  };
}

// 格式化建议
function formatRecommendations(recommendations: any[]) {
  return recommendations
    .map(rec => {
      if (!rec) return '';
      return `${rec.symbol}\n` +
             `当前价格: ${rec.price}\n` +
             `建议: ${rec.recommendation} (置信度: ${(rec.confidence * 100).toFixed(0)}%)\n` +
             `原因: ${rec.reasons.join(', ')}\n`;
    })
    .join('\n');
}

// 导出模型状态
export function getModelState() {
  return modelState;
}

async function callOpenAI(apiKey: string, model: string, message: string, context: any): Promise<AIResponse> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: '你是一个智能助手，可以帮助用户解答各种问题。当用户询问交易相关的问题时，你会作为专业的交易分析师来回答。'
        },
        {
          role: 'user',
          content: context?.marketData ? 
            `当前市场数据：${JSON.stringify(context.marketData)}\n\n${message}` : 
            message
        }
      ],
      temperature: 0.7
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API错误: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0].message.content
  };
}

async function callAnthropic(apiKey: string, model: string, message: string, context: any): Promise<AIResponse> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: context?.marketData ? 
            `当前市场数据：${JSON.stringify(context.marketData)}\n\n${message}` : 
            message
        }
      ],
      max_tokens: 1000
    })
  });

  if (!response.ok) {
    throw new Error(`Anthropic API错误: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    content: data.content[0].text
  };
}

async function callGemini(apiKey: string, model: string, message: string, context: any): Promise<AIResponse> {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: context?.marketData ? 
                `当前市场数据：${JSON.stringify(context.marketData)}\n\n${message}` : 
                message
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API错误: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    content: data.candidates[0].content.parts[0].text
  };
}

async function callDeepseek(apiKey: string, model: string, message: string, context: any): Promise<AIResponse> {
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: '你是一个智能助手，可以帮助用户解答各种问题。当用户询问交易相关的问题时，你会作为专业的交易分析师来回答。'
        },
        {
          role: 'user',
          content: context?.marketData ? 
            `当前市场数据：${JSON.stringify(context.marketData)}\n\n${message}` : 
            message
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    })
  });

  if (!response.ok) {
    throw new Error(`Deepseek API错误: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0].message.content
  };
}