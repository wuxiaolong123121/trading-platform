import React, { useState } from 'react';
import { BarChart2, Activity, PieChart, Globe, Clock, Shield, Bot } from 'lucide-react';
import { useTradingContext } from '../context/TradingContext';
import { useWebSocketStore } from '../services/websocket';
import { useTradingMode } from '../services/tradingMode';
import Dashboard from './sections/Dashboard';
import Trading from './sections/Trading';
import Portfolio from './sections/Portfolio';
import Markets from './sections/Markets';
import Orders from './sections/Orders';
import Settings from './sections/Settings';
import AIAssistant from './sections/AIAssistant';

const TradingDesktopApp = () => {
  const [activeSection, setActiveSection] = useState('trading');
  const { t } = useTradingContext();
  const ws = useWebSocketStore();
  const tradingMode = useTradingMode();

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return <Dashboard />;
      case 'trading':
        return <Trading />;
      case 'portfolio':
        return <Portfolio />;
      case 'markets':
        return <Markets />;
      case 'orders':
        return <Orders />;
      case 'settings':
        return <Settings />;
      case 'ai':
        return <AIAssistant />;
      default:
        return <Trading />;
    }
  };

  return (
    <div className="flex-1 flex bg-gray-100 h-screen overflow-hidden">
      {/* 侧边栏 */}
      <div className="w-64 bg-white border-r flex flex-col flex-shrink-0">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold text-blue-600">CryptoTrader Pro</h1>
        </div>
        <div className="flex-1 py-4 overflow-y-auto">
          <nav className="space-y-1">
            {[
              { icon: BarChart2, label: t.dashboard, id: 'dashboard' },
              { icon: Activity, label: t.trading, id: 'trading' },
              { icon: PieChart, label: t.portfolio, id: 'portfolio' },
              { icon: Globe, label: t.markets, id: 'markets' },
              { icon: Clock, label: t.orders, id: 'orders' },
              { icon: Bot, label: 'AI助手', id: 'ai' },
              { icon: Shield, label: t.settings, id: 'settings' }
            ].map(({ icon: Icon, label, id }) => (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-sm ${
                  activeSection === id 
                    ? 'bg-blue-50 text-blue-600' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* 状态指示器 */}
        <div className="p-4 border-t">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              ws.isConnected ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <span className="text-sm text-gray-600">
              {ws.isConnected ? '已连接' : '未连接'}
            </span>
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">
          {renderSection()}
        </div>
      </div>
    </div>
  );
};

export default TradingDesktopApp;