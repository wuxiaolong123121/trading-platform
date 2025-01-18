import { create } from 'zustand';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ErrorLog {
  id: string;
  timestamp: number;
  message: string;
  severity: ErrorSeverity;
  context?: any;
  stack?: string;
}

interface ErrorStore {
  errors: ErrorLog[];
  addError: (error: Omit<ErrorLog, 'id' | 'timestamp'>) => void;
  removeError: (id: string) => void;
  clearErrors: () => void;
}

export const useErrorStore = create<ErrorStore>((set) => ({
  errors: [],
  addError: (error) => set((state) => ({
    errors: [
      {
        id: Math.random().toString(36).substring(7),
        timestamp: Date.now(),
        ...error
      },
      ...state.errors
    ].slice(0, 100) // 只保留最近100条错误记录
  })),
  removeError: (id) => set((state) => ({
    errors: state.errors.filter(error => error.id !== id)
  })),
  clearErrors: () => set({ errors: [] })
}));

class ErrorHandler {
  private static instance: ErrorHandler;
  
  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  public handleError(
    error: Error | string,
    severity: ErrorSeverity = 'medium',
    context?: any
  ) {
    const errorStore = useErrorStore.getState();
    
    const errorMessage = error instanceof Error ? error.message : error;
    const stack = error instanceof Error ? error.stack : undefined;

    // 添加错误到store
    errorStore.addError({
      message: this.getLocalizedErrorMessage(errorMessage),
      severity,
      context,
      stack
    });

    // 对于严重错误，采取额外措施
    if (severity === 'critical') {
      this.handleCriticalError(errorMessage, context);
    }

    // 记录到控制台
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${severity.toUpperCase()}] ${errorMessage}`, context);
    }
  }

  private handleCriticalError(message: string, context?: any) {
    // 关闭所有活跃订单
    const ws = window.WebSocket;
    if (ws) {
      try {
        ws.close();
      } catch (e) {
        console.error('Failed to close WebSocket:', e);
      }
    }

    // 保存错误现场
    const errorSnapshot = {
      timestamp: new Date().toISOString(),
      message,
      context,
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    // 保存到本地存储
    try {
      const snapshots = JSON.parse(localStorage.getItem('error-snapshots') || '[]');
      snapshots.unshift(errorSnapshot);
      localStorage.setItem('error-snapshots', JSON.stringify(snapshots.slice(0, 10)));
    } catch (e) {
      console.error('Failed to save error snapshot:', e);
    }
  }

  private getLocalizedErrorMessage(message: string): string {
    // 错误信息本地化映射
    const errorMessages: Record<string, string> = {
      'network_error': '网络连接错误，请检查网络连接',
      'invalid_order': '无效的订单参数',
      'insufficient_balance': '账户余额不足',
      'price_out_of_range': '价格超出有效范围',
      'unauthorized': '未授权的操作，请先登录',
      'server_error': '服务器错误，请稍后重试',
      'websocket_disconnected': 'WebSocket连接断开，正在重新连接...',
      'order_failed': '下单失败',
      'cancel_failed': '取消订单失败',
      'position_limit': '持仓数量超过限制',
      'invalid_leverage': '无效的杠杆倍数',
      'market_closed': '市场已关闭',
      'rate_limit': '请求频率超限，请稍后重试'
    };

    // 查找本地化消息，如果没有则返回原始消息
    const key = message.toLowerCase().replace(/\s+/g, '_');
    return errorMessages[key] || message;
  }
}

export const errorHandler = ErrorHandler.getInstance();