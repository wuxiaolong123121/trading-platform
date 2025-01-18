import React, { useState } from 'react';
import { Clock, CheckCircle, XCircle } from 'lucide-react';
import { useTradingContext } from '../../context/TradingContext';

const Orders = () => {
  const { t } = useTradingContext();
  const [activeTab, setActiveTab] = useState('open');

  const orders = {
    open: [
      {
        id: '1',
        type: '限价买入',
        symbol: 'BTC/USDT',
        price: '42,000.00',
        amount: '0.1',
        total: '4,200.00',
        time: '2024-01-15 10:30',
        status: 'pending'
      },
      {
        id: '2',
        type: '限价卖出',
        symbol: 'ETH/USDT',
        price: '2,500.00',
        amount: '1.0',
        total: '2,500.00',
        time: '2024-01-15 10:25',
        status: 'pending'
      }
    ],
    history: [
      {
        id: '3',
        type: '市价买入',
        symbol: 'BTC/USDT',
        price: '41,500.00',
        amount: '0.2',
        total: '8,300.00',
        time: '2024-01-15 09:15',
        status: 'completed'
      },
      {
        id: '4',
        type: '限价卖出',
        symbol: 'ETH/USDT',
        price: '2,450.00',
        amount: '2.0',
        total: '4,900.00',
        time: '2024-01-15 08:30',
        status: 'cancelled'
      }
    ]
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return '已完成';
      case 'cancelled':
        return '已取消';
      default:
        return '待成交';
    }
  };

  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b px-6 py-4">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab('open')}
              className={`px-4 py-2 text-sm font-medium rounded-lg ${
                activeTab === 'open'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              当前委托
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 text-sm font-medium rounded-lg ${
                activeTab === 'history'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              历史委托
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left py-3 px-4">时间</th>
                <th className="text-left py-3 px-4">交易对</th>
                <th className="text-left py-3 px-4">类型</th>
                <th className="text-right py-3 px-4">价格</th>
                <th className="text-right py-3 px-4">数量</th>
                <th className="text-right py-3 px-4">总额</th>
                <th className="text-center py-3 px-4">状态</th>
                <th className="text-center py-3 px-4">操作</th>
              </tr>
            </thead>
            <tbody>
              {orders[activeTab as keyof typeof orders].map((order) => (
                <tr key={order.id} className="border-b hover:bg-gray-50">
                  <td className="py-4 px-4 text-sm">{order.time}</td>
                  <td className="py-4 px-4 font-medium">{order.symbol}</td>
                  <td className="py-4 px-4">
                    <span className={`px-2 py-1 text-sm rounded ${
                      order.type.includes('买入') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                    }`}>
                      {order.type}
                    </span>
                  </td>
                  <td className="text-right py-4 px-4">${order.price}</td>
                  <td className="text-right py-4 px-4">{order.amount}</td>
                  <td className="text-right py-4 px-4">${order.total}</td>
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-center space-x-1">
                      {getStatusIcon(order.status)}
                      <span className="text-sm">{getStatusText(order.status)}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex justify-center space-x-2">
                      {order.status === 'pending' && (
                        <>
                          <button className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded">
                            修改
                          </button>
                          <button className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded">
                            取消
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Orders;