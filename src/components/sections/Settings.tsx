import React, { useState } from 'react';
import { Shield, Bell, AlertTriangle, Key, Eye, EyeOff, Trash2, Plus, SwitchCamera, Brain, Save, Check, RefreshCw } from 'lucide-react';
import { useRiskManagement } from '../../services/riskManagement';
import { useErrorStore } from '../../services/errorHandler';
import { useTradingContext } from '../../context/TradingContext';
import { useTradingMode } from '../../services/tradingMode';

interface AiConfig {
  apiKey: string;
  model: string;
  enabled: boolean;
}

interface AiConfigs {
  openai: AiConfig;
  anthropic: AiConfig;
  gemini: AiConfig;
  deepseek: AiConfig;
}

const defaultModels = {
  openai: ['gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
  anthropic: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
  gemini: ['gemini-pro', 'gemini-pro-vision'],
  deepseek: ['deepseek-chat', 'deepseek-coder']
};

const Settings = () => {
  const { t } = useTradingContext();
  const { limits, updateLimits } = useRiskManagement();
  const errors = useErrorStore(state => state.errors);
  const clearErrors = useErrorStore(state => state.clearErrors);
  const tradingMode = useTradingMode();
  const riskManagement = useRiskManagement();
  const errorStore = useErrorStore();
  const { apiKeys, updateApiKey, removeApiKey } = useTradingContext();
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [showAiKeys, setShowAiKeys] = useState<{[key: string]: boolean}>({
    openai: false,
    anthropic: false,
    gemini: false,
    deepseek: false
  });
  const [exchangeForm, setExchangeForm] = useState({
    exchange: 'binance' as 'binance' | 'okx' | 'huobi' | 'bybit' | 'kucoin' | 'gate',
    apiKey: '',
    secretKey: '',
    passphrase: '',
    name: ''
  });

  const [aiConfigs, setAiConfigs] = useState<AiConfigs>({
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

  const [saveStatus, setSaveStatus] = useState<{
    ai: 'idle' | 'saving' | 'saved';
    exchange: 'idle' | 'saving' | 'saved';
  }>({
    ai: 'idle',
    exchange: 'idle'
  });

  const handleAddExchangeAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus(prev => ({ ...prev, exchange: 'saving' }));
    
    tradingMode.addExchangeAccount({
      name: exchangeForm.name,
      exchange: exchangeForm.exchange,
      apiKey: exchangeForm.apiKey,
      secretKey: exchangeForm.secretKey,
      passphrase: exchangeForm.passphrase
    });

    setExchangeForm({
      exchange: 'binance',
      apiKey: '',
      secretKey: '',
      passphrase: '',
      name: ''
    });

    setSaveStatus(prev => ({ ...prev, exchange: 'saved' }));
    setTimeout(() => {
      setSaveStatus(prev => ({ ...prev, exchange: 'idle' }));
    }, 2000);
  };

  const handleRemoveExchangeAccount = (accountId: string) => {
    if (confirm('确定要删除这个交易所账户吗？')) {
      tradingMode.removeExchangeAccount(accountId);
    }
  };

  const handleAiConfigSave = () => {
    setSaveStatus(prev => ({ ...prev, ai: 'saving' }));
    
    Object.entries(aiConfigs).forEach(([provider, config]) => {
      localStorage.setItem(`${provider}_api_key`, config.apiKey);
      localStorage.setItem(`${provider}_model`, config.model);
      localStorage.setItem(`${provider}_enabled`, config.enabled.toString());
    });

    setSaveStatus(prev => ({ ...prev, ai: 'saved' }));
    setTimeout(() => {
      setSaveStatus(prev => ({ ...prev, ai: 'idle' }));
    }, 2000);
  };

  const handleAiConfigChange = (provider: keyof AiConfigs, field: keyof AiConfig, value: string | boolean) => {
    setAiConfigs(prev => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        [field]: value
      }
    }));
  };

  const toggleShowKey = (provider: string) => {
    setShowAiKeys(prev => ({
      ...prev,
      [provider]: !prev[provider]
    }));
  };

  const handleDemoBalanceChange = (value: number) => {
    if (value < 0) {
      errorStore.setError('初始资金不能小于0');
      return;
    }
    tradingMode.setDemoConfig({ initialBalance: value });
  };

  const handleDemoFeeRateChange = (value: number) => {
    if (value < 0 || value > 1) {
      errorStore.setError('手续费率必须在0-1%之间');
      return;
    }
    tradingMode.setDemoConfig({ feeRate: value });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* 交易模式设置 */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center space-x-2 mb-6">
          <SwitchCamera className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold">交易模式</h2>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="text-lg font-medium">当前模式</h3>
              <p className={`mt-1 text-sm ${tradingMode.mode === 'live' ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}`}>
                {tradingMode.mode === 'live' ? '实盘交易' : '模拟交易'}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {tradingMode.mode === 'live' ? (
                <button
                  onClick={() => tradingMode.switchMode('demo')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
                >
                  <SwitchCamera className="w-5 h-5" />
                  <span>切换到模拟交易</span>
                </button>
              ) : (
                <div className="relative">
                  <button
                    onClick={() => {
                      const hasExchangeAccount = tradingMode.exchangeAccounts.length > 0;
                      if (!hasExchangeAccount) {
                        alert('请先添加交易所账户再切换到实盘交易');
                        return;
                      }
                      
                      const confirmed = window.confirm(
                        '⚠️ 确定要切换到实盘交易吗？\n\n' +
                        '请注意：\n' +
                        '1. 实盘交易将使用真实资金\n' +
                        '2. 请确保已经完全了解交易风险\n' +
                        '3. 建议设置好止损和风险控制\n' +
                        '4. 实盘交易前请仔细检查账户设置\n\n' +
                        '是否继续？'
                      );
                      
                      if (confirmed) {
                        tradingMode.switchMode('live');
                      }
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center space-x-2"
                  >
                    <SwitchCamera className="w-5 h-5" />
                    <span>切换到实盘交易</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 模拟账户设置 */}
          {tradingMode.mode === 'demo' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">模拟账户设置</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    初始资金 (USDT)
                  </label>
                  <input
                    type="number"
                    value={tradingMode.demoConfig.initialBalance}
                    onChange={(e) => handleDemoBalanceChange(parseFloat(e.target.value))}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                    min="0"
                    step="1000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    手续费率 (%)
                  </label>
                  <input
                    type="number"
                    value={tradingMode.demoConfig.feeRate}
                    onChange={(e) => handleDemoFeeRateChange(parseFloat(e.target.value))}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="1"
                    step="0.01"
                  />
                </div>
              </div>
              <button
                onClick={tradingMode.resetDemo}
                className="mt-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>重置模拟账户</span>
              </button>
            </div>
          )}

          {/* 实盘交易提醒 */}
          {tradingMode.mode === 'live' && (
            <div className="p-4 bg-red-50 text-red-800 rounded-lg flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="font-medium">您正在使用实盘交易模式</p>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  <li>所有交易操作将使用真实资金</li>
                  <li>请确保已经完全了解交易风险</li>
                  <li>建议设置好止损和风险控制</li>
                  <li>如有疑问请立即切换回模拟交易</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 风险管理设置 */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Shield className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold">风险管理设置</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              最大订单金额 (USDT)
            </label>
            <input
              type="number"
              value={limits.maxOrderValue}
              onChange={(e) => updateLimits({ maxOrderValue: parseFloat(e.target.value) })}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              min="0"
              step="1000"
            />
            <p className="mt-1 text-sm text-gray-500">单笔订单的最大金额限制</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              最大日亏损 (USDT)
            </label>
            <input
              type="number"
              value={limits.maxDailyLoss}
              onChange={(e) => updateLimits({ maxDailyLoss: parseFloat(e.target.value) })}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              min="0"
              step="100"
            />
            <p className="mt-1 text-sm text-gray-500">每日最大亏损限制，超过后将暂停交易</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              最大杠杆倍数
            </label>
            <input
              type="number"
              value={limits.maxLeverage}
              onChange={(e) => updateLimits({ maxLeverage: parseFloat(e.target.value) })}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              min="1"
              max="20"
              step="1"
            />
            <p className="mt-1 text-sm text-gray-500">交易允许使用的最大杠杆倍数</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              止损百分比 (%)
            </label>
            <input
              type="number"
              value={limits.stopLossPercentage}
              onChange={(e) => updateLimits({ stopLossPercentage: parseFloat(e.target.value) })}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              min="0"
              max="100"
              step="0.1"
            />
            <p className="mt-1 text-sm text-gray-500">默认止损百分比，建议设置在 2-10% 之间</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              止盈百分比 (%)
            </label>
            <input
              type="number"
              value={limits.takeProfitPercentage}
              onChange={(e) => updateLimits({ takeProfitPercentage: parseFloat(e.target.value) })}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              min="0"
              max="100"
              step="0.1"
            />
            <p className="mt-1 text-sm text-gray-500">默认止盈百分比，建议设置在 5-20% 之间</p>
          </div>
        </div>
      </div>

      {/* 交易所账户 */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Key className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold">交易所账户</h2>
          </div>
          {saveStatus.exchange !== 'idle' && (
            <div className={`flex items-center space-x-2 ${
              saveStatus.exchange === 'saved' ? 'text-green-600' : 'text-blue-600'
            }`}>
              {saveStatus.exchange === 'saving' ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-b-transparent" />
              ) : (
                <Check className="w-5 h-5" />
              )}
              <span>{saveStatus.exchange === 'saving' ? '保存中...' : '已保存'}</span>
            </div>
          )}
        </div>

        {tradingMode.exchangeAccounts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            暂无交易所账户，请添加一个账户来开始实盘交易
          </div>
        ) : (
          <div className="mb-6 space-y-4">
            {tradingMode.exchangeAccounts.map((account) => (
              <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-medium">{account.name}</div>
                  <div className="text-sm text-gray-500">{account.exchange}</div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => tradingMode.setActiveAccount(account.id)}
                    className={`px-3 py-1.5 rounded text-sm ${
                      tradingMode.activeAccountId === account.id
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {tradingMode.activeAccountId === account.id ? '当前使用' : '使用'}
                  </button>
                  <button
                    onClick={() => handleRemoveExchangeAccount(account.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleAddExchangeAccount} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                交易所
              </label>
              <select
                value={exchangeForm.exchange}
                onChange={(e) => setExchangeForm(prev => ({
                  ...prev,
                  exchange: e.target.value as typeof exchangeForm.exchange
                }))}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="binance">Binance 币安</option>
                <option value="okx">OKX 欧易</option>
                <option value="huobi">Huobi 火币</option>
                <option value="bybit">Bybit</option>
                <option value="kucoin">KuCoin 库币</option>
                <option value="gate">Gate.io</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                账户名称
              </label>
              <input
                type="text"
                value={exchangeForm.name}
                onChange={(e) => setExchangeForm(prev => ({
                  ...prev,
                  name: e.target.value
                }))}
                placeholder="给这个账户起个名字"
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API Key
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={exchangeForm.apiKey}
                onChange={(e) => setExchangeForm(prev => ({
                  ...prev,
                  apiKey: e.target.value
                }))}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500"
              >
                {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Secret Key
            </label>
            <div className="relative">
              <input
                type={showSecretKey ? 'text' : 'password'}
                value={exchangeForm.secretKey}
                onChange={(e) => setExchangeForm(prev => ({
                  ...prev,
                  secretKey: e.target.value
                }))}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowSecretKey(!showSecretKey)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500"
              >
                {showSecretKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {(exchangeForm.exchange === 'okx' || exchangeForm.exchange === 'kucoin') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Passphrase
              </label>
              <input
                type="password"
                value={exchangeForm.passphrase}
                onChange={(e) => setExchangeForm(prev => ({
                  ...prev,
                  passphrase: e.target.value
                }))}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>添加账户</span>
          </button>
        </form>
      </div>

      {/* AI助手设置 */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Brain className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold">AI助手设置</h2>
          </div>
          <button
            onClick={handleAiConfigSave}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {saveStatus.ai === 'saving' ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-b-transparent" />
            ) : saveStatus.ai === 'saved' ? (
              <Check className="w-5 h-5" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            <span>
              {saveStatus.ai === 'saving' ? '保存中...' : 
               saveStatus.ai === 'saved' ? '已保存' : '保存设置'}
            </span>
          </button>
        </div>

        <div className="space-y-6">
          {(Object.keys(aiConfigs) as Array<keyof AiConfigs>).map((provider) => (
            <div key={provider} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium capitalize">{provider}</h3>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aiConfigs[provider].enabled}
                    onChange={(e) => handleAiConfigChange(provider, 'enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  <span className="ml-3 text-sm font-medium text-gray-700">启用</span>
                </label>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API密钥
                  </label>
                  <div className="relative">
                    <input
                      type={showAiKeys[provider] ? 'text' : 'password'}
                      value={aiConfigs[provider].apiKey}
                      onChange={(e) => handleAiConfigChange(provider, 'apiKey', e.target.value)}
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 pr-10"
                      placeholder={`输入${provider} API密钥`}
                    />
                    <button
                      type="button"
                      onClick={() => toggleShowKey(provider)}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500"
                    >
                      {showAiKeys[provider] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    模型选择
                  </label>
                  <select
                    value={aiConfigs[provider].model}
                    onChange={(e) => handleAiConfigChange(provider, 'model', e.target.value)}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                  >
                    {defaultModels[provider as keyof typeof defaultModels].map((model) => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 错误日志 */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Bell className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold">错误日志</h2>
          </div>
          <button
            onClick={clearErrors}
            className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
          >
            <Trash2 className="w-5 h-5" />
            <span>清空日志</span>
          </button>
        </div>

        <div className="space-y-4">
          {errors.map((error) => (
            <div
              key={error.id}
              className={`p-4 rounded-lg ${
                error.severity === 'critical' ? 'bg-red-50' :
                error.severity === 'high' ? 'bg-orange-50' :
                error.severity === 'medium' ? 'bg-yellow-50' :
                'bg-blue-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className={`w-5 h-5 ${
                    error.severity === 'critical' ? 'text-red-500' :
                    error.severity === 'high' ? 'text-orange-500' :
                    error.severity === 'medium' ? 'text-yellow-500' :
                    'text-blue-500'
                  }`} />
                  <span className="font-medium">{error.message}</span>
                </div>
                <span className="text-sm text-gray-500">
                  {new Date(error.timestamp).toLocaleString()}
                </span>
              </div>
              {error.context && (
                <pre className="mt-2 text-sm bg-white bg-opacity-50 p-2 rounded overflow-x-auto">
                  {JSON.stringify(error.context, null, 2)}
                </pre>
              )}
            </div>
          ))}

          {errors.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              暂无错误日志
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;