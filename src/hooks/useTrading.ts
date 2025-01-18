import { useState, useEffect } from 'react';
import { useWebSocketStore } from '../services/websocket';
import { useRiskManagement } from '../services/riskManagement';
import { errorHandler } from '../services/errorHandler';

export function useTrading(symbol: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ws = useWebSocketStore();
  const riskManagement = useRiskManagement();

  useEffect(() => {
    // 连接WebSocket
    if (!ws.isConnected) {
      ws.connect();
    }

    // 订阅市场数据
    ws.sendMessage({
      type: 'subscribe',
      channels: ['ticker', 'orderbook', 'trades'],
      symbol,
    });

    return () => {
      // 取消订阅
      ws.sendMessage({
        type: 'unsubscribe',
        channels: ['ticker', 'orderbook', 'trades'],
        symbol,
      });
    };
  }, [symbol]);

  const placeOrder = async (orderData: any) => {
    try {
      setIsLoading(true);
      setError(null);

      // 风险检查
      const riskCheck = riskManagement.checkOrderRisk(orderData);
      if (!riskCheck.allowed) {
        throw new Error(riskCheck.reason);
      }

      // 发送订单
      ws.sendMessage({
        type: 'place_order',
        data: orderData,
      });

      // 添加持仓记录
      if (orderData.type === 'market' || orderData.type === 'limit') {
        riskManagement.addPosition({
          symbol: orderData.symbol,
          entryPrice: orderData.price,
          amount: orderData.amount,
          stopLoss: orderData.stopLoss,
          takeProfit: orderData.takeProfit,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '下单失败';
      setError(errorMessage);
      errorHandler.handleError(err, 'high', { orderData });
    } finally {
      setIsLoading(false);
    }
  };

  const cancelOrder = async (orderId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      ws.sendMessage({
        type: 'cancel_order',
        data: { orderId },
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '取消订单失败';
      setError(errorMessage);
      errorHandler.handleError(err, 'medium', { orderId });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    placeOrder,
    cancelOrder,
  };
}