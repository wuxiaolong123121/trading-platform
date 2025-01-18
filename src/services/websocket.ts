import { create } from 'zustand';
import { errorHandler } from './errorHandler';

interface MarketData {
  price: number;
  change: number;
  volume: number;
  high24h: number;
  low24h: number;
  trades: Array<{
    price: number;
    amount: number;
    side: 'buy' | 'sell';
    time: string;
  }>;
  klines: Array<{
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
  orderbook: {
    bids: Array<[number, number]>;
    asks: Array<[number, number]>;
  };
}

interface WebSocketStore {
  socket: WebSocket | null;
  isConnected: boolean;
  reconnectAttempts: number;
  subscriptions: Set<string>;
  marketData: MarketData;
  connect: () => void;
  disconnect: () => void;
  sendMessage: (message: any) => void;
  resetReconnectAttempts: () => void;
}

const BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws';
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_INTERVAL = 3000;
const PING_INTERVAL = 30000;

export const useWebSocketStore = create<WebSocketStore>((set, get) => ({
  socket: null,
  isConnected: false,
  reconnectAttempts: 0,
  subscriptions: new Set(),
  marketData: {
    price: 0,
    change: 0,
    volume: 0,
    high24h: 0,
    low24h: 0,
    trades: [],
    klines: [],
    orderbook: {
      bids: [],
      asks: []
    }
  },

  resetReconnectAttempts: () => set({ reconnectAttempts: 0 }),

  connect: () => {
    const state = get();
    if (state.socket?.readyState === WebSocket.OPEN) {
      return;
    }

    // 如果存在旧的连接，先关闭它
    if (state.socket) {
      state.socket.close();
      set({ socket: null });
    }

    if (state.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      return;
    }

    try {
      const socket = new WebSocket(BINANCE_WS_URL);
      let pingInterval: NodeJS.Timeout;
      
      socket.onopen = () => {
        set({ 
          isConnected: true, 
          socket,
          reconnectAttempts: 0
        });

        // Resubscribe to previous subscriptions
        const subscriptions = Array.from(get().subscriptions);
        if (subscriptions.length > 0) {
          socket.send(JSON.stringify({
            method: 'SUBSCRIBE',
            params: subscriptions,
            id: Date.now()
          }));
        }

        // Setup ping interval
        pingInterval = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ ping: Date.now() }));
          }
        }, PING_INTERVAL);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.ping) {
            socket.send(JSON.stringify({ pong: data.ping }));
            return;
          }
          
          if (data.e === '24hrTicker') {
            set((state) => ({
              marketData: {
                ...state.marketData,
                price: parseFloat(data.c),
                change: parseFloat(data.P),
                volume: parseFloat(data.v),
                high24h: parseFloat(data.h),
                low24h: parseFloat(data.l)
              }
            }));
          } else if (data.e === 'kline') {
            const kline = data.k;
            set((state) => {
              const newKlines = [...state.marketData.klines];
              const klineData = {
                time: kline.t,
                open: parseFloat(kline.o),
                high: parseFloat(kline.h),
                low: parseFloat(kline.l),
                close: parseFloat(kline.c),
                volume: parseFloat(kline.v)
              };
              
              const index = newKlines.findIndex(k => k.time === kline.t);
              if (index !== -1) {
                newKlines[index] = klineData;
              } else {
                newKlines.push(klineData);
              }
              
              newKlines.sort((a, b) => a.time - b.time);
              
              return {
                marketData: {
                  ...state.marketData,
                  klines: newKlines.slice(-100)
                }
              };
            });
          } else if (data.e === 'trade') {
            set((state) => ({
              marketData: {
                ...state.marketData,
                trades: [{
                  price: parseFloat(data.p),
                  amount: parseFloat(data.q),
                  side: data.m ? 'sell' : 'buy',
                  time: new Date(data.T).toLocaleTimeString()
                }, ...state.marketData.trades].slice(0, 50)
              }
            }));
          } else if (data.e === 'depthUpdate') {
            set((state) => ({
              marketData: {
                ...state.marketData,
                orderbook: {
                  bids: data.b.map((bid: string[]) => [
                    parseFloat(bid[0]),
                    parseFloat(bid[1])
                  ]),
                  asks: data.a.map((ask: string[]) => [
                    parseFloat(ask[0]),
                    parseFloat(ask[1])
                  ])
                }
              }
            }));
          }
        } catch {
          // 静默处理解析错误
        }
      };

      socket.onerror = () => {
        set({ isConnected: false });
      };

      socket.onclose = () => {
        clearInterval(pingInterval);
        const state = get();
        set({ 
          isConnected: false,
          socket: null,
          reconnectAttempts: state.reconnectAttempts + 1
        });

        // 如果不是主动断开连接，尝试重连
        if (state.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          setTimeout(() => {
            if (!get().isConnected) {
              get().connect();
            }
          }, RECONNECT_INTERVAL);
        }
      };

      set({ socket });
    } catch {
      // 静默处理连接错误
    }
  },

  disconnect: () => {
    const { socket } = get();
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.close();
    }
    set({ 
      socket: null, 
      isConnected: false 
    });
  },

  sendMessage: (message: any) => {
    const { socket, isConnected } = get();
    if (!socket || !isConnected) {
      return;
    }
    
    try {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
      } else if (socket.readyState === WebSocket.CONNECTING) {
        setTimeout(() => get().sendMessage(message), 1000);
      } else {
        get().connect();
        setTimeout(() => get().sendMessage(message), 1000);
      }
    } catch {
      // 静默处理发送错误
    }
  }
}));

export const useMarketData = () => {
  return useWebSocketStore((state) => state.marketData);
};