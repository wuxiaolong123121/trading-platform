import { create } from 'zustand';
import { errorHandler } from '../services/errorHandler';

interface WebSocketState {
  socket: WebSocket | null;
  isConnected: boolean;
  marketData: {
    [symbol: string]: {
      price: number;
      volume: number;
      high24h: number;
      low24h: number;
      priceChange24h: number;
      volumeChange24h: number;
      timestamp: number;
    };
  };
  connect: () => void;
  disconnect: () => void;
  updateMarketData: (data: any) => void;
}

export const useWebSocketStore = create<WebSocketState>((set, get) => ({
  socket: null,
  isConnected: false,
  marketData: {},

  connect: () => {
    try {
      const wsUrl = import.meta.env.VITE_WS_URL || 'wss://api.exchange.com/ws';
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        set({ isConnected: true });
        // 订阅市场数据
        socket.send(JSON.stringify({
          type: 'subscribe',
          channels: ['market_data']
        }));
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'market_data') {
            get().updateMarketData(data);
          }
        } catch (error) {
          errorHandler.handleError('WebSocket消息解析错误', 'medium', { error });
        }
      };

      socket.onclose = () => {
        set({ isConnected: false });
        // 自动重连
        setTimeout(() => {
          if (!get().isConnected) {
            get().connect();
          }
        }, 5000);
      };

      socket.onerror = (error) => {
        errorHandler.handleError('WebSocket连接错误', 'high', { error });
        set({ isConnected: false });
      };

      set({ socket });
    } catch (error) {
      errorHandler.handleError('WebSocket初始化错误', 'high', { error });
    }
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.close();
      set({ socket: null, isConnected: false });
    }
  },

  updateMarketData: (data) => {
    const { marketData } = get();
    const { symbol, ...priceData } = data;
    
    set({
      marketData: {
        ...marketData,
        [symbol]: {
          ...marketData[symbol],
          ...priceData,
          timestamp: Date.now()
        }
      }
    });
  }
}));