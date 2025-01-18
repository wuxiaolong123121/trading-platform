import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import crypto from 'crypto';
import { errorHandler } from './errorHandler';

interface User {
  id: string;
  email: string;
  apiKeys: {
    exchange: string;
    apiKey: string;
    secretKey: string;
    passphrase?: string;
  }[];
  settings: {
    theme: 'light' | 'dark';
    language: string;
    notifications: boolean;
    twoFactorEnabled: boolean;
  };
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  twoFactorSecret: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (email: string, password: string) => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  addApiKey: (exchangeKey: User['apiKeys'][0]) => void;
  removeApiKey: (exchange: string) => void;
  enable2FA: () => Promise<string>;
  verify2FA: (token: string) => Promise<boolean>;
  encryptApiKey: (key: string) => string;
  decryptApiKey: (encryptedKey: string) => string;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      twoFactorSecret: null,

      login: async (email: string, password: string) => {
        try {
          // 这里应该调用后端API进行验证
          // 示例中使用模拟数据
          const user: User = {
            id: '1',
            email,
            apiKeys: [],
            settings: {
              theme: 'light',
              language: 'zh-CN',
              notifications: true,
              twoFactorEnabled: false
            }
          };

          set({ user, isAuthenticated: true });
        } catch (error) {
          errorHandler.handleError('登录失败', 'high', { error });
          throw error;
        }
      },

      logout: () => {
        set({ user: null, isAuthenticated: false, twoFactorSecret: null });
      },

      register: async (email: string, password: string) => {
        try {
          // 这里应该调用后端API进行注册
          // 示例中使用模拟数据
          const user: User = {
            id: '1',
            email,
            apiKeys: [],
            settings: {
              theme: 'light',
              language: 'zh-CN',
              notifications: true,
              twoFactorEnabled: false
            }
          };

          set({ user, isAuthenticated: true });
        } catch (error) {
          errorHandler.handleError('注册失败', 'high', { error });
          throw error;
        }
      },

      updateUser: (updates) => {
        const { user } = get();
        if (user) {
          set({ user: { ...user, ...updates } });
        }
      },

      addApiKey: (exchangeKey) => {
        const { user } = get();
        if (user) {
          const encryptedApiKey = get().encryptApiKey(exchangeKey.apiKey);
          const encryptedSecretKey = get().encryptApiKey(exchangeKey.secretKey);
          
          const newApiKey = {
            ...exchangeKey,
            apiKey: encryptedApiKey,
            secretKey: encryptedSecretKey
          };

          const updatedApiKeys = [...user.apiKeys.filter(k => k.exchange !== exchangeKey.exchange), newApiKey];
          set({ user: { ...user, apiKeys: updatedApiKeys } });
        }
      },

      removeApiKey: (exchange) => {
        const { user } = get();
        if (user) {
          const updatedApiKeys = user.apiKeys.filter(k => k.exchange !== exchange);
          set({ user: { ...user, apiKeys: updatedApiKeys } });
        }
      },

      enable2FA: async () => {
        try {
          // 这里应该调用后端API获取2FA密钥
          const secret = 'JBSWY3DPEHPK3PXP'; // 示例密钥
          set({ twoFactorSecret: secret });
          return secret;
        } catch (error) {
          errorHandler.handleError('启用2FA失败', 'high', { error });
          throw error;
        }
      },

      verify2FA: async (token: string) => {
        try {
          // 这里应该调用后端API验证2FA令牌
          const isValid = true; // 示例验证结果
          if (isValid && get().user) {
            set({ 
              user: { 
                ...get().user!, 
                settings: { 
                  ...get().user!.settings, 
                  twoFactorEnabled: true 
                } 
              } 
            });
          }
          return isValid;
        } catch (error) {
          errorHandler.handleError('验证2FA失败', 'high', { error });
          throw error;
        }
      },

      encryptApiKey: (key: string) => {
        // 这里应该使用更安全的加密方法
        const cipher = crypto.createCipher('aes-256-cbc', 'your-secret-key');
        let encrypted = cipher.update(key, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return encrypted;
      },

      decryptApiKey: (encryptedKey: string) => {
        // 这里应该使用更安全的解密方法
        const decipher = crypto.createDecipher('aes-256-cbc', 'your-secret-key');
        let decrypted = decipher.update(encryptedKey, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
      }
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);
