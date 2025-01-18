import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, Loader2, Settings2, AlertTriangle } from 'lucide-react';
import { useTradingContext } from '../../context/TradingContext';
import { useWebSocketStore } from '../../services/websocket';
import { callAIAPI } from '../../services/aiService';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  model: string;
}

// 从Settings组件同步配置
const getAIConfigs = () => ({
  openai: {
    apiKey: localStorage.getItem('openai_api_key') || '',
    model: localStorage.getItem('openai_model') || 'gpt-4-turbo',
    enabled: localStorage.getItem('openai_enabled') === 'true'
  },
  anthropic: {
    apiKey: localStorage.getItem('anthropic_api_key') || '',
    model: localStorage.getItem('anthropic_model') || 'claude-3-opus',
    enabled: localStorage.getItem('anthropic_enabled') === 'true'
  },
  gemini: {
    apiKey: localStorage.getItem('gemini_api_key') || '',
    model: localStorage.getItem('gemini_model') || 'gemini-pro',
    enabled: localStorage.getItem('gemini_enabled') === 'true'
  },
  deepseek: {
    apiKey: localStorage.getItem('deepseek_api_key') || '',
    model: localStorage.getItem('deepseek_model') || 'deepseek-chat',
    enabled: localStorage.getItem('deepseek_enabled') === 'true'
  }
});

const STORAGE_KEY = 'ai_chat_history';

const AIAssistant: React.FC = () => {
  // 从本地存储加载历史消息
  const [messages, setMessages] = useState<Message[]>(() => {
    const savedMessages = localStorage.getItem(STORAGE_KEY);
    return savedMessages ? JSON.parse(savedMessages) : [];
  });
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [aiConfigs, setAiConfigs] = useState(getAIConfigs());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { t } = useTradingContext();
  const marketData = useWebSocketStore(state => state.marketData);

  // 监听配置变化
  useEffect(() => {
    const handleStorageChange = () => {
      setAiConfigs(getAIConfigs());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // 保存消息到本地存储
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 获取可用的AI模型选项
  const getAvailableModels = () => {
    const models: Array<{ provider: string; model: string; }> = [];
    Object.entries(aiConfigs).forEach(([provider, config]) => {
      if (config.enabled && config.apiKey) {
        models.push({
          provider,
          model: config.model
        });
      }
    });
    return models;
  };

  const [currentModel, setCurrentModel] = useState<string>(() => {
    const availableModels = getAvailableModels();
    return availableModels.length > 0 
      ? `${availableModels[0].provider}/${availableModels[0].model}`
      : '';
  });

  const handleSend = async () => {
    if (!input.trim() || !currentModel) return;

    const [provider, model] = currentModel.split('/');
    const config = aiConfigs[provider as keyof typeof aiConfigs];
    
    if (!config.apiKey || !config.enabled) {
      alert(`请先在设置中配置并启用 ${provider.toUpperCase()} AI`);
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
      model: currentModel
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsThinking(true);

    try {
      // 准备市场数据上下文
      const context = {
        price: marketData.price,
        change: marketData.change,
        volume: marketData.volume,
        high24h: marketData.high24h,
        low24h: marketData.low24h,
        timestamp: Date.now()
      };

      // 调用AI API
      const response = await callAIAPI(
        provider,
        model,
        config.apiKey,
        input,
        context
      );

      if (response.error) {
        throw new Error(response.error);
      }

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: response.content,
        timestamp: Date.now(),
        model: currentModel
      }]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `抱歉，发生了错误：${errorMessage}\n\n请稍后重试或联系客服获取帮助。`,
        timestamp: Date.now(),
        model: currentModel
      }]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearHistory = () => {
    if (window.confirm('确定要清空所有对话历史吗？')) {
      setMessages([]);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const availableModels = getAvailableModels();

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50">
      <div className="p-4 bg-white border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bot className="w-6 h-6 text-blue-600" />
            <h2 className="text-lg font-semibold">AI 交易助手</h2>
          </div>
          <div className="flex items-center space-x-4">
            {availableModels.length > 0 ? (
              <select
                value={currentModel}
                onChange={(e) => setCurrentModel(e.target.value)}
                className="px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {availableModels.map(({ provider, model }) => (
                  <option key={`${provider}/${model}`} value={`${provider}/${model}`}>
                    {provider.toUpperCase()} - {model}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-sm text-gray-500">请先配置AI服务</span>
            )}
            <button
              onClick={() => window.location.href = '#/settings'}
              className="p-1.5 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
              title="配置AI服务"
            >
              <Settings2 className="w-5 h-5" />
            </button>
            {messages.length > 0 && (
              <button
                onClick={clearHistory}
                className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg"
              >
                清空历史
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-3xl rounded-lg p-4 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border'
              }`}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>
              <div
                className={`mt-2 text-xs ${
                  message.role === 'user' ? 'text-blue-100' : 'text-gray-400'
                }`}
              >
                {new Date(message.timestamp).toLocaleString()}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {messages.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <div className="text-center space-y-4">
            <Bot className="w-12 h-12 mx-auto text-gray-400" />
            <div>
              <p className="text-lg font-medium">AI 交易助手</p>
              <p className="text-sm">可以帮您分析市场、制定策略、管理风险</p>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 bg-white border-t">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start space-x-2">
            <div className="flex-1">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={availableModels.length > 0 
                  ? "输入您的问题..."
                  : "请先在设置中配置AI服务"}
                disabled={availableModels.length === 0}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:bg-gray-50 disabled:text-gray-500"
                rows={3}
              />
              <div className="mt-2 flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <AlertTriangle className="w-4 h-4" />
                  <span>AI 建议仅供参考，请谨慎判断</span>
                </div>
                <span>按 Enter 发送，Shift + Enter 换行</span>
              </div>
            </div>
            <button
              onClick={handleSend}
              disabled={isThinking || !input.trim() || availableModels.length === 0}
              className={`p-3 rounded-lg ${
                isThinking || !input.trim() || availableModels.length === 0
                  ? 'bg-gray-100 text-gray-400'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isThinking ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;