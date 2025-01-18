import React, { useState, useEffect } from 'react';
import { PieChart, ArrowUpRight, ArrowDownRight, RefreshCw, TrendingUp, Calendar, Clock, DollarSign } from 'lucide-react';
import { useTradingContext } from '../../context/TradingContext';
import { useTradingMode } from '../../services/tradingMode';
import { useWebSocketStore } from '../../services/websocket';
import DatePicker from 'react-datepicker';
import { Line, Pie, Bar } from 'react-chartjs-2';
import { format, subDays, subMonths } from 'date-fns';
import { metricsService } from '../../services/metricsService';
import { exportService } from '../../services/exportService';
import { calculateReturnsDistribution } from '../../services/analysisService';
import { historyService } from '../../services/historyService';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const UPDATE_INTERVAL = 10000;

const Portfolio = () => {
  const { t } = useTradingContext();
  const tradingMode = useTradingMode();
  const ws = useWebSocketStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('1d');
  const [customDateRange, setCustomDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [tradeHistory, setTradeHistory] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({
    totalTrades: 0,
    winRate: 0,
    avgProfit: 0,
    maxDrawdown: 0,
    sharpeRatio: 0,
    sortinoRatio: 0,
    calmarRatio: 0,
    volatility: 0,
    beta: 0,
    alpha: 0,
    informationRatio: 0,
    maxConsecutiveWins: 0,
    maxConsecutiveLosses: 0,
    dailyROI: 0
  });

  // 处理自定义日期范围选择
  const handleDateRangeChange = (dates: [Date | null, Date | null]) => {
    setCustomDateRange(dates);
    if (dates[0] && dates[1]) {
      // 更新图表和指标
      const filteredData = historicalData.filter(
        d => d.timestamp >= dates[0] && d.timestamp <= dates[1]
      );
      updateMetrics(filteredData);
    }
  };

  // 导出交易记录
  const handleExportTrades = () => {
    exportService.exportToCSV(tradeHistory);
  };

  // 导出性能报告
  const handleExportPerformance = () => {
    exportService.exportPerformanceReport(metrics, tradeHistory);
  };

  // 图表配置
  const chartOptions = {
    responsive: true,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: '投资组合表现'
      }
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  // 准备图表数据
  const chartData = {
    labels: historicalData.map(d => format(d.timestamp, 'MM/dd HH:mm')),
    datasets: [
      {
        label: '投资组合总值',
        data: historicalData.map(d => d.totalValue),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        yAxisID: 'y',
        fill: true,
      },
      {
        label: '日收益率',
        data: historicalData.map(d => d.dailyReturn),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        yAxisID: 'y1',
        type: 'bar' as const,
      }
    ]
  };

  // 收益分布图数据
  const returnsDistributionData = {
    labels: ['< -5%', '-5% ~ -3%', '-3% ~ -1%', '-1% ~ 1%', '1% ~ 3%', '3% ~ 5%', '> 5%'],
    datasets: [{
      label: '收益分布',
      data: calculateReturnsDistribution(tradeHistory),
      backgroundColor: [
        'rgba(255, 99, 132, 0.5)',
        'rgba(255, 159, 64, 0.5)',
        'rgba(255, 205, 86, 0.5)',
        'rgba(75, 192, 192, 0.5)',
        'rgba(54, 162, 235, 0.5)',
        'rgba(153, 102, 255, 0.5)',
        'rgba(201, 203, 207, 0.5)'
      ],
      borderColor: [
        'rgb(255, 99, 132)',
        'rgb(255, 159, 64)',
        'rgb(255, 205, 86)',
        'rgb(75, 192, 192)',
        'rgb(54, 162, 235)',
        'rgb(153, 102, 255)',
        'rgb(201, 203, 207)'
      ],
      borderWidth: 1
    }]
  };

  // 获取数据
  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      let startDate: Date | undefined;
      let endDate = new Date();

      // 根据选择的时间范围设置开始日期
      switch (selectedTimeRange) {
        case '1d':
          startDate = subDays(endDate, 1);
          break;
        case '1w':
          startDate = subDays(endDate, 7);
          break;
        case '1m':
          startDate = subMonths(endDate, 1);
          break;
        case '3m':
          startDate = subMonths(endDate, 3);
          break;
        case '1y':
          startDate = subMonths(endDate, 12);
          break;
        case 'custom':
          if (customDateRange[0] && customDateRange[1]) {
            [startDate, endDate] = customDateRange;
          }
          break;
      }

      // 获取历史数据
      const [trades, history] = await Promise.all([
        historyService.getTradeHistory(startDate, endDate),
        historyService.getHistoricalData(startDate, endDate)
      ]);

      setTradeHistory(trades);
      setHistoricalData(history);
      
      // 更新指标
      updateMetrics(history);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // 定期更新数据
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, UPDATE_INTERVAL);
    return () => clearInterval(interval);
  }, [selectedTimeRange, customDateRange]);

  // WebSocket更新
  useEffect(() => {
    if (ws.lastMessage) {
      try {
        const data = JSON.parse(ws.lastMessage);
        if (data.type === 'PORTFOLIO_UPDATE') {
          // 更新最新的资产价值
          setHistoricalData(prev => {
            const newData = [...prev];
            newData[newData.length - 1] = {
              ...newData[newData.length - 1],
              value: data.value
            };
            return newData;
          });
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    }
  }, [ws.lastMessage]);

  // 更新指标
  const updateMetrics = (historicalData: any[]) => {
    if (!historicalData.length) return;

    // 将历史数据转换为所需格式
    const trades = tradeHistory.map(trade => ({
      timestamp: new Date(trade.entryTime),
      pnl: trade.pnl,
      value: trade.entryPrice * trade.quantity
    }));

    // 使用 metricsService 计算所有指标
    const calculatedMetrics = metricsService.calculateMetrics(
      trades,
      historicalData[historicalData.length - 1].value,
      historicalData.map(d => d.change) // 使用价格变化作为基准收益
    );

    setMetrics({
      totalTrades: calculatedMetrics.totalTrades,
      winRate: calculatedMetrics.winRate,
      avgProfit: calculatedMetrics.avgProfit,
      maxDrawdown: calculatedMetrics.maxDrawdown,
      sharpeRatio: calculatedMetrics.sharpeRatio,
      sortinoRatio: calculatedMetrics.sortinoRatio,
      calmarRatio: calculatedMetrics.calmarRatio,
      volatility: calculatedMetrics.volatility,
      beta: calculatedMetrics.beta,
      alpha: calculatedMetrics.alpha,
      informationRatio: calculatedMetrics.informationRatio,
      maxConsecutiveWins: calculatedMetrics.maxConsecutiveWins,
      maxConsecutiveLosses: calculatedMetrics.maxConsecutiveLosses,
      dailyROI: calculatedMetrics.dailyReturn
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* 顶部统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">总收益率</p>
              <p className={`text-2xl font-bold ${metrics.dailyROI >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {metrics.dailyROI >= 0 ? '+' : ''}{metrics.dailyROI.toFixed(2)}%
              </p>
            </div>
            <TrendingUp className={`w-8 h-8 ${metrics.dailyROI >= 0 ? 'text-green-500' : 'text-red-500'}`} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">夏普比率</p>
              <p className="text-2xl font-bold">{metrics.sharpeRatio.toFixed(2)}</p>
              <p className="text-xs text-gray-500">索提诺比率: {metrics.sortinoRatio.toFixed(2)}</p>
            </div>
            <Clock className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">最大回撤</p>
              <p className="text-2xl font-bold text-red-500">-{metrics.maxDrawdown.toFixed(2)}%</p>
              <p className="text-xs text-gray-500">收益回撤比: {metrics.calmarRatio.toFixed(2)}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-red-500 transform rotate-180" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Alpha</p>
              <p className="text-2xl font-bold">{metrics.alpha.toFixed(2)}%</p>
              <p className="text-xs text-gray-500">Beta: {metrics.beta.toFixed(2)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* 时间范围选择 */}
      <div className="flex items-center justify-between bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center space-x-4">
          {['1d', '1w', '1m', '3m', '1y', 'all'].map((range) => (
            <button
              key={range}
              onClick={() => setSelectedTimeRange(range)}
              className={`px-3 py-1 rounded ${
                selectedTimeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {range.toUpperCase()}
            </button>
          ))}
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="px-3 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200"
          >
            自定义
          </button>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={handleExportTrades}
            className="flex items-center text-sm text-blue-600 hover:text-blue-700"
          >
            <Calendar className="w-4 h-4 mr-1" />
            导出交易记录
          </button>
          <button
            onClick={handleExportPerformance}
            className="flex items-center text-sm text-blue-600 hover:text-blue-700"
          >
            <TrendingUp className="w-4 h-4 mr-1" />
            导出分析报告
          </button>
        </div>
      </div>

      {showDatePicker && (
        <div className="bg-white rounded-lg shadow-sm p-4">
          <DatePicker
            selectsRange={true}
            startDate={customDateRange[0]}
            endDate={customDateRange[1]}
            onChange={handleDateRangeChange}
            inline
          />
        </div>
      )}

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 资产走势图 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-6">资产走势</h3>
          <Line options={chartOptions} data={chartData} />
        </div>

        {/* 收益分布图 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-6">收益分布</h3>
          <Bar
            data={returnsDistributionData}
            options={{
              responsive: true,
              plugins: {
                legend: {
                  position: 'top' as const,
                },
                title: {
                  display: true,
                  text: '收益率分布'
                }
              }
            }}
          />
        </div>
      </div>

      {/* 详细指标 */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-6">详细指标</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <h4 className="font-medium text-gray-600 mb-4">交易统计</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">总交易次数</span>
                <span>{metrics.totalTrades}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">胜率</span>
                <span>{metrics.winRate.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">最大连胜</span>
                <span>{metrics.maxConsecutiveWins}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">最大连亏</span>
                <span>{metrics.maxConsecutiveLosses}</span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-600 mb-4">收益指标</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">平均收益</span>
                <span>{metrics.avgProfit.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">年化收益</span>
                <span>{(metrics.avgProfit * 252).toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">信息比率</span>
                <span>{metrics.informationRatio.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">波动率</span>
                <span>{metrics.volatility.toFixed(2)}%</span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-600 mb-4">风险指标</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">最大回撤</span>
                <span>{metrics.maxDrawdown.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Beta</span>
                <span>{metrics.beta.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Alpha</span>
                <span>{metrics.alpha.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">夏普比率</span>
                <span>{metrics.sharpeRatio.toFixed(2)}</span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-600 mb-4">其他指标</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">收益回撤比</span>
                <span>{metrics.calmarRatio.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">索提诺比率</span>
                <span>{metrics.sortinoRatio.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">信息比率</span>
                <span>{metrics.informationRatio.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 交易历史记录 */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">交易历史</h3>
          <div className="flex items-center space-x-4">
            <select 
              className="border rounded p-1"
              onChange={(e) => {/* 处理筛选 */}}
            >
              <option value="all">全部交易</option>
              <option value="profit">盈利交易</option>
              <option value="loss">亏损交易</option>
            </select>
            <button className="flex items-center text-sm text-blue-600 hover:text-blue-700">
              <Calendar className="w-4 h-4 mr-1" />
              导出记录
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">时间</th>
                <th className="text-left py-3 px-4">交易对</th>
                <th className="text-right py-3 px-4">方向</th>
                <th className="text-right py-3 px-4">数量</th>
                <th className="text-right py-3 px-4">入场价</th>
                <th className="text-right py-3 px-4">出场价</th>
                <th className="text-right py-3 px-4">盈亏</th>
                <th className="text-right py-3 px-4">手续费</th>
              </tr>
            </thead>
            <tbody>
              {/* 临时使用模拟数据 */}
              {[1, 2, 3].map((_, index) => (
                <tr key={index} className="border-b hover:bg-gray-50">
                  <td className="py-4 px-4">2025-01-18 18:20</td>
                  <td className="py-4 px-4">BTC/USDT</td>
                  <td className="text-right py-4 px-4 text-green-500">买入</td>
                  <td className="text-right py-4 px-4">0.1</td>
                  <td className="text-right py-4 px-4">$42,000</td>
                  <td className="text-right py-4 px-4">$43,500</td>
                  <td className="text-right py-4 px-4 text-green-500">+$150</td>
                  <td className="text-right py-4 px-4">$2.5</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Portfolio;