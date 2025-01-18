import { create } from 'zustand';
import { errorHandler } from './errorHandler';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
}

interface PriceAlert {
  id: string;
  symbol: string;
  condition: 'above' | 'below';
  price: number;
  active: boolean;
  createdAt: number;
}

interface NotificationState {
  notifications: Notification[];
  priceAlerts: PriceAlert[];
  hasPermission: boolean;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  clearAll: () => void;
  addPriceAlert: (alert: Omit<PriceAlert, 'id' | 'createdAt'>) => void;
  removePriceAlert: (id: string) => void;
  togglePriceAlert: (id: string) => void;
  requestPermission: () => Promise<boolean>;
  sendBrowserNotification: (title: string, options?: NotificationOptions) => void;
  sendEmail: (to: string, subject: string, content: string) => Promise<void>;
}

export const useNotification = create<NotificationState>((set, get) => ({
  notifications: [],
  priceAlerts: [],
  hasPermission: false,

  addNotification: (notification) => {
    const newNotification: Notification = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      read: false,
      ...notification
    };

    set(state => ({
      notifications: [newNotification, ...state.notifications]
    }));

    // 发送浏览器通知
    if (get().hasPermission) {
      get().sendBrowserNotification(notification.title, {
        body: notification.message,
        icon: '/logo.png'
      });
    }
  },

  markAsRead: (id) => {
    set(state => ({
      notifications: state.notifications.map(n =>
        n.id === id ? { ...n, read: true } : n
      )
    }));
  },

  clearAll: () => {
    set({ notifications: [] });
  },

  addPriceAlert: (alert) => {
    const newAlert: PriceAlert = {
      id: Date.now().toString(),
      createdAt: Date.now(),
      ...alert
    };

    set(state => ({
      priceAlerts: [...state.priceAlerts, newAlert]
    }));
  },

  removePriceAlert: (id) => {
    set(state => ({
      priceAlerts: state.priceAlerts.filter(a => a.id !== id)
    }));
  },

  togglePriceAlert: (id) => {
    set(state => ({
      priceAlerts: state.priceAlerts.map(a =>
        a.id === id ? { ...a, active: !a.active } : a
      )
    }));
  },

  requestPermission: async () => {
    try {
      if (!('Notification' in window)) {
        throw new Error('This browser does not support notifications');
      }

      const permission = await Notification.requestPermission();
      const hasPermission = permission === 'granted';
      set({ hasPermission });
      return hasPermission;
    } catch (error) {
      errorHandler.handleError('请求通知权限失败', 'medium', { error });
      return false;
    }
  },

  sendBrowserNotification: (title, options = {}) => {
    try {
      if (!get().hasPermission) return;

      new Notification(title, {
        icon: '/logo.png',
        ...options
      });
    } catch (error) {
      errorHandler.handleError('发送浏览器通知失败', 'low', { error });
    }
  },

  sendEmail: async (to, subject, content) => {
    try {
      // 这里应该调用后端API发送邮件
      console.log('Sending email:', { to, subject, content });
    } catch (error) {
      errorHandler.handleError('发送邮件失败', 'medium', { error });
      throw error;
    }
  }
}));

// 监控价格并触发警报
export function setupPriceAlertMonitor(getCurrentPrice: (symbol: string) => number) {
  const checkAlerts = () => {
    const { priceAlerts, addNotification } = useNotification.getState();
    
    priceAlerts.forEach(alert => {
      if (!alert.active) return;

      const currentPrice = getCurrentPrice(alert.symbol);
      const condition = alert.condition === 'above' 
        ? currentPrice >= alert.price
        : currentPrice <= alert.price;

      if (condition) {
        addNotification({
          type: 'warning',
          title: '价格警报',
          message: `${alert.symbol} 价格已${alert.condition === 'above' ? '超过' : '低于'} ${alert.price}`
        });
      }
    });
  };

  // 每分钟检查一次价格警报
  const interval = setInterval(checkAlerts, 60000);

  // 返回清理函数
  return () => clearInterval(interval);
}
