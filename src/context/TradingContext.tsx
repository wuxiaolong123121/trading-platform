import React, { createContext, useContext, useState } from 'react';

const languages = {
  en: {
    dashboard: 'Dashboard',
    trading: 'Trading',
    portfolio: 'Portfolio',
    markets: 'Markets',
    orders: 'Orders',
    settings: 'Settings',
    buy: 'Buy',
    sell: 'Sell',
    autoTrading: 'Auto Trading',
    tradingStrategy: 'Trading Strategy',
    riskLevel: 'Risk Level',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    parameters: 'Parameters',
    tradingMode: 'Trading Mode (Demo/Live)',
    startBot: 'Start Bot',
    stopBot: 'Stop Bot',
    runningStatus: 'Running Status',
    runningTime: 'Running Time',
    totalTrades: 'Total Trades',
    profitLoss: 'Profit/Loss',
    riskWarning: 'Automated trading involves significant risks. Please ensure you understand the risks before starting.',
    orderBook: 'Order Book',
    price: 'Price',
    amount: 'Amount',
    total: 'Total',
    limitOrder: 'Limit Order',
    marketOrder: 'Market Order',
    available: 'Available',
    confirmOrder: 'Confirm Order',
    orderWarning: 'Please carefully check the price and amount before submitting the order.',
    riskManagement: 'Risk Management',
    maxOrderValue: 'Max Order Value',
    maxDailyLoss: 'Max Daily Loss',
    maxLeverage: 'Max Leverage',
    stopLossPercentage: 'Stop Loss Percentage',
    takeProfitPercentage: 'Take Profit Percentage',
    errorLogs: 'Error Logs',
  },
  zh: {
    dashboard: '仪表盘',
    trading: '交易',
    portfolio: '投资组合',
    markets: '市场',
    orders: '订单',
    settings: '设置',
    buy: '买入',
    sell: '卖出',
    autoTrading: '自动交易',
    tradingStrategy: '交易策略',
    riskLevel: '风险等级',
    low: '低',
    medium: '中',
    high: '高',
    parameters: '参数设置',
    tradingMode: '交易模式（模拟/实盘）',
    startBot: '启动机器人',
    stopBot: '停止机器人',
    runningStatus: '运行状态',
    runningTime: '运行时间',
    totalTrades: '交易次数',
    profitLoss: '盈亏',
    riskWarning: '自动交易存在重大风险，请在启动前确保您了解所涉及的风险。',
    orderBook: '订单簿',
    price: '价格',
    amount: '数量',
    total: '总额',
    limitOrder: '限价单',
    marketOrder: '市价单',
    available: '可用',
    confirmOrder: '确认下单',
    orderWarning: '请在提交订单前仔细确认价格和数量。',
    riskManagement: '风险管理',
    maxOrderValue: '最大订单金额',
    maxDailyLoss: '最大日亏损',
    maxLeverage: '最大杠杆',
    stopLossPercentage: '止损百分比',
    takeProfitPercentage: '止盈百分比',
    errorLogs: '错误日志',
  }
};

interface TradingContextType {
  currentLang: string;
  setCurrentLang: (lang: string) => void;
  activeSection: string;
  setActiveSection: (section: string) => void;
  t: typeof languages.en;
}

const TradingContext = createContext<TradingContextType | null>(null);

export const TradingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLang, setCurrentLang] = useState('zh');
  const [activeSection, setActiveSection] = useState('trading');

  const value = {
    currentLang,
    setCurrentLang,
    activeSection,
    setActiveSection,
    t: languages[currentLang as keyof typeof languages]
  };

  return (
    <TradingContext.Provider value={value}>
      {children}
    </TradingContext.Provider>
  );
};

export const useTradingContext = () => {
  const context = useContext(TradingContext);
  if (!context) {
    throw new Error('useTradingContext must be used within a TradingProvider');
  }
  return context;
};