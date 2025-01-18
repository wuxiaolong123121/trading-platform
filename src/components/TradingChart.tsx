import React, { useEffect, useRef, useCallback } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi } from 'lightweight-charts';
import { useKlineStore } from '../services/klineService';

interface TradingChartProps {
  symbol: string;
  timeframe?: string;
  height?: number;
}

const TradingChart: React.FC<TradingChartProps> = ({
  symbol,
  timeframe = '1m',
  height = 500
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  const {
    klines,
    loading,
    error,
    setCurrentSymbol,
    setTimeframe: setKlineTimeframe,
    connectWebSocket,
    disconnectWebSocket,
    fetchKlines
  } = useKlineStore();

  // 清理图表
  const cleanupChart = useCallback(() => {
    if (chartRef.current) {
      // 清理引用
      candlestickSeriesRef.current = null;
      volumeSeriesRef.current = null;
      
      // 移除图表
      chartRef.current.remove();
      chartRef.current = null;
    }
  }, []);

  // 初始化图表
  const initChart = useCallback(() => {
    if (!chartContainerRef.current) return;

    // 清理旧的图表
    cleanupChart();

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#333',
      },
      grid: {
        vertLines: { color: '#f0f0f0' },
        horzLines: { color: '#f0f0f0' },
      },
      width: chartContainerRef.current.clientWidth,
      height: height,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    });

    // 添加K线图
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    // 添加成交量图表
    const volumeSeries = chart.addHistogramSeries({
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: 'volume',
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;
    volumeSeriesRef.current = volumeSeries;

    // 自适应大小
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [height]);

  // 初始化图表
  useEffect(() => {
    const cleanup = initChart();
    return () => {
      cleanup?.();
      cleanupChart();
    };
  }, [initChart, cleanupChart]);

  // 设置交易对和时间周期，并获取初始数据
  useEffect(() => {
    setCurrentSymbol(symbol);
    setKlineTimeframe(timeframe);
    fetchKlines(symbol, timeframe);
    connectWebSocket();

    return () => {
      disconnectWebSocket();
    };
  }, [symbol, timeframe]);

  // 更新K线数据
  useEffect(() => {
    if (!candlestickSeriesRef.current || !volumeSeriesRef.current) return;

    const symbolKlines = klines[symbol];
    if (!symbolKlines || symbolKlines.length === 0) return;

    try {
      // 更新K线数据
      candlestickSeriesRef.current.setData(
        symbolKlines.map(k => ({
          time: k.time,
          open: k.open,
          high: k.high,
          low: k.low,
          close: k.close
        }))
      );

      // 更新成交量数据
      volumeSeriesRef.current.setData(
        symbolKlines.map(k => ({
          time: k.time,
          value: k.volume,
          color: k.close >= k.open ? '#26a69a' : '#ef5350'
        }))
      );

      // 移动到最新的K线
      chartRef.current?.timeScale().fitContent();
    } catch (error) {
      console.error('Error updating chart data:', error);
    }
  }, [klines, symbol]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-white">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-white">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <div ref={chartContainerRef} className="w-full h-full" />
    </div>
  );
};

export default TradingChart;