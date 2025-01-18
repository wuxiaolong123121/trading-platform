import React, { useState } from 'react';
import { AlertCircle, SwitchCamera } from 'lucide-react';
import { useTradingContext } from '../context/TradingContext';
import { useTradingMode, TradingMode } from '../services/tradingMode';
import { errorHandler } from '../services/errorHandler';

interface TradingFormProps {
  symbol: string;
  type: 'buy' | 'sell';
  onSubmit: (data: any) => void;
  onClose: () => void;
  currentPrice: number;
}

const TradingForm: React.FC<TradingFormProps> = ({
  symbol,
  type,
  onSubmit,
  onClose,
  currentPrice
}) => {
  const [orderType, setOrderType] = useState<'limit' | 'market'>('limit');
  const [price, setPrice] = useState(currentPrice.toString());
  const [amount, setAmount] = useState('');
  const { t } = useTradingContext();
  const tradingMode = useTradingMode();

  const baseCurrency = symbol.split('/')[0];
  const quoteCurrency = symbol.split('/')[1];
  const availableBalance = tradingMode.getBalance(quoteCurrency);

  const handleModeSwitch = () => {
    const newMode: TradingMode = tradingMode.mode === 'demo' ? 'live' : 'demo';
    tradingMode.setMode(newMode);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const orderAmount = parseFloat(amount);
    const orderPrice = orderType === 'market' ? currentPrice : parseFloat(price);
    const totalCost = orderAmount * orderPrice;

    // 检查余额
    if (type === 'buy' && totalCost > availableBalance) {
      errorHandler.handleError('余额不足', 'high', {
        required: totalCost,
        available: availableBalance
      });
      return;
    }

    if (type === 'sell' && orderAmount > tradingMode.getBalance(baseCurrency)) {
      errorHandler.handleError('余额不足', 'high', {
        required: orderAmount,
        available: tradingMode.getBalance(baseCurrency)
      });
      return;
    }

    // 更新余额
    if (type === 'buy') {
      tradingMode.updateBalance(quoteCurrency, -totalCost);
      tradingMode.updateBalance(baseCurrency, orderAmount);
    } else {
      tradingMode.updateBalance(baseCurrency, -orderAmount);
      tradingMode.updateBalance(quoteCurrency, totalCost);
    }

    // 添加订单记录
    const order = {
      symbol,
      type,
      orderType,
      price: orderPrice,
      amount: orderAmount,
      total: totalCost,
      status: 'completed',
      timestamp: Date.now()
    };

    tradingMode.addOrder(order);
    onSubmit(order);
  };

  const handlePercentageClick = (percentage: number) => {
    if (type === 'buy') {
      const maxAmount = availableBalance / (orderType === 'market' ? currentPrice : parseFloat(price));
      setAmount((maxAmount * (percentage / 100)).toFixed(8));
    } else {
      const maxAmount = tradingMode.getBalance(baseCurrency);
      setAmount((maxAmount * (percentage / 100)).toFixed(8));
    }
  };

  return (
    <div className="bg-white rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          {type === 'buy' ? '买入' : '卖出'} {symbol}
        </h3>
        <button
          onClick={handleModeSwitch}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg ${
            tradingMode.mode === 'demo'
              ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
              : 'bg-red-100 text-red-700 hover:bg-red-200'
          }`}
        >
          <SwitchCamera className="w-4 h-4" />
          <span className="text-sm font-medium">
            {tradingMode.mode === 'demo' ? '模拟交易' : '实盘交易'}
          </span>
        </button>
      </div>

      <div className="flex space-x-2 mb-6">
        <button
          onClick={() => setOrderType('limit')}
          className={`flex-1 py-2 rounded ${
            orderType === 'limit'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          限价单
        </button>
        <button
          onClick={() => setOrderType('market')}
          className={`flex-1 py-2 rounded ${
            orderType === 'market'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          市价单
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {orderType === 'limit' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              价格 (USDT)
            </label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              placeholder="输入价格"
              step="0.01"
              required
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            数量 ({baseCurrency})
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            placeholder="输入数量"
            step="0.0001"
            required
          />
        </div>

        <div className="flex justify-between text-sm text-gray-500 py-2">
          <span>可用 {quoteCurrency}</span>
          <span>{availableBalance.toFixed(2)}</span>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {[25, 50, 75, 100].map((percent) => (
            <button
              key={percent}
              type="button"
              onClick={() => handlePercentageClick(percent)}
              className="py-1 text-sm border rounded hover:bg-gray-50"
            >
              {percent}%
            </button>
          ))}
        </div>

        <button
          type="submit"
          className={`w-full py-3 rounded-lg font-medium mt-6 ${
            type === 'buy'
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
        >
          {type === 'buy' ? '买入' : '卖出'} {symbol}
        </button>
      </form>

      <div className="mt-4 p-3 bg-yellow-50 rounded-lg flex items-start space-x-2">
        <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-yellow-700">
          {tradingMode.mode === 'demo'
            ? '当前为模拟交易模式，交易不会损失真实资金。'
            : '当前为实盘交易模式，请注意风险控制。'}
        </p>
      </div>
    </div>
  );
};

export default TradingForm;