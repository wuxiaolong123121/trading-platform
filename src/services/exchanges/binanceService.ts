import axios from 'axios';
import crypto from 'crypto';
import { errorHandler } from '../errorHandler';

export class BinanceService {
  private baseUrl = 'https://api.binance.com';
  private apiKey: string;
  private secretKey: string;

  constructor(apiKey: string, secretKey: string) {
    this.apiKey = apiKey;
    this.secretKey = secretKey;
  }

  private sign(queryString: string): string {
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(queryString)
      .digest('hex');
  }

  private async request(method: string, endpoint: string, params: any = {}, secured: boolean = false) {
    try {
      const timestamp = Date.now();
      let queryString = Object.entries(params)
        .map(([key, value]) => `${key}=${value}`)
        .join('&');

      if (secured) {
        queryString = `${queryString}&timestamp=${timestamp}`;
        const signature = this.sign(queryString);
        queryString = `${queryString}&signature=${signature}`;
      }

      const url = `${this.baseUrl}${endpoint}?${queryString}`;
      const headers = {
        'X-MBX-APIKEY': secured ? this.apiKey : ''
      };

      const response = await axios({
        method,
        url,
        headers
      });

      return response.data;
    } catch (error) {
      errorHandler.handleError('Binance API请求失败', 'high', { error, endpoint });
      throw error;
    }
  }

  // 市场数据接口
  async getKlines(symbol: string, interval: string, limit: number = 500) {
    return this.request('GET', '/api/v3/klines', { symbol, interval, limit });
  }

  async getOrderBook(symbol: string, limit: number = 100) {
    return this.request('GET', '/api/v3/depth', { symbol, limit });
  }

  async getTicker24h(symbol: string) {
    return this.request('GET', '/api/v3/ticker/24hr', { symbol });
  }

  // 交易接口
  async createOrder(params: {
    symbol: string;
    side: 'BUY' | 'SELL';
    type: 'LIMIT' | 'MARKET';
    quantity: number;
    price?: number;
    timeInForce?: 'GTC' | 'IOC' | 'FOK';
  }) {
    return this.request('POST', '/api/v3/order', params, true);
  }

  async cancelOrder(symbol: string, orderId: number) {
    return this.request('DELETE', '/api/v3/order', { symbol, orderId }, true);
  }

  async getOpenOrders(symbol?: string) {
    return this.request('GET', '/api/v3/openOrders', { symbol }, true);
  }

  // 账户接口
  async getAccountInfo() {
    return this.request('GET', '/api/v3/account', {}, true);
  }

  async getBalances() {
    const account = await this.getAccountInfo();
    return account.balances;
  }

  // 系统接口
  async testConnectivity() {
    return this.request('GET', '/api/v3/ping');
  }

  async getExchangeInfo() {
    return this.request('GET', '/api/v3/exchangeInfo');
  }
}
