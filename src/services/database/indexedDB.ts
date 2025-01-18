import { openDB, IDBPDatabase } from 'idb';
import { errorHandler } from '../errorHandler';

interface DBSchema {
  trades: {
    key: string;
    value: any;
    indexes: { 'by-date': number };
  };
  orders: {
    key: string;
    value: any;
    indexes: { 'by-status': string };
  };
  settings: {
    key: string;
    value: any;
  };
  market_data: {
    key: string;
    value: any;
    indexes: { 'by-symbol': string };
  };
}

class Database {
  private db: IDBPDatabase<DBSchema> | null = null;
  private readonly DB_NAME = 'trading_platform';
  private readonly DB_VERSION = 1;

  async connect() {
    try {
      this.db = await openDB<DBSchema>(this.DB_NAME, this.DB_VERSION, {
        upgrade(db) {
          // 交易历史
          const tradeStore = db.createObjectStore('trades', {
            keyPath: 'id',
            autoIncrement: true
          });
          tradeStore.createIndex('by-date', 'timestamp');

          // 订单
          const orderStore = db.createObjectStore('orders', {
            keyPath: 'id',
            autoIncrement: true
          });
          orderStore.createIndex('by-status', 'status');

          // 设置
          db.createObjectStore('settings', {
            keyPath: 'key'
          });

          // 市场数据
          const marketStore = db.createObjectStore('market_data', {
            keyPath: 'id',
            autoIncrement: true
          });
          marketStore.createIndex('by-symbol', 'symbol');
        }
      });

      console.log('数据库连接成功');
    } catch (error) {
      errorHandler.handleError('数据库连接失败', 'high', { error });
      throw error;
    }
  }

  async add<T extends keyof DBSchema>(
    store: T,
    data: Omit<DBSchema[T]['value'], 'id'>
  ) {
    try {
      if (!this.db) await this.connect();
      return await this.db!.add(store, data);
    } catch (error) {
      errorHandler.handleError('添加数据失败', 'medium', { error, store, data });
      throw error;
    }
  }

  async get<T extends keyof DBSchema>(
    store: T,
    key: string | number
  ): Promise<DBSchema[T]['value'] | undefined> {
    try {
      if (!this.db) await this.connect();
      return await this.db!.get(store, key);
    } catch (error) {
      errorHandler.handleError('获取数据失败', 'medium', { error, store, key });
      throw error;
    }
  }

  async getAll<T extends keyof DBSchema>(
    store: T
  ): Promise<DBSchema[T]['value'][]> {
    try {
      if (!this.db) await this.connect();
      return await this.db!.getAll(store);
    } catch (error) {
      errorHandler.handleError('获取所有数据失败', 'medium', { error, store });
      throw error;
    }
  }

  async put<T extends keyof DBSchema>(
    store: T,
    data: DBSchema[T]['value']
  ) {
    try {
      if (!this.db) await this.connect();
      return await this.db!.put(store, data);
    } catch (error) {
      errorHandler.handleError('更新数据失败', 'medium', { error, store, data });
      throw error;
    }
  }

  async delete<T extends keyof DBSchema>(store: T, key: string | number) {
    try {
      if (!this.db) await this.connect();
      await this.db!.delete(store, key);
    } catch (error) {
      errorHandler.handleError('删除数据失败', 'medium', { error, store, key });
      throw error;
    }
  }

  async clear<T extends keyof DBSchema>(store: T) {
    try {
      if (!this.db) await this.connect();
      await this.db!.clear(store);
    } catch (error) {
      errorHandler.handleError('清空数据失败', 'medium', { error, store });
      throw error;
    }
  }

  async getByIndex<T extends keyof DBSchema>(
    store: T,
    indexName: keyof DBSchema[T]['indexes'],
    key: any
  ) {
    try {
      if (!this.db) await this.connect();
      return await this.db!.getAllFromIndex(store, indexName, key);
    } catch (error) {
      errorHandler.handleError('通过索引获取数据失败', 'medium', { error, store, indexName, key });
      throw error;
    }
  }

  async count<T extends keyof DBSchema>(store: T): Promise<number> {
    try {
      if (!this.db) await this.connect();
      return await this.db!.count(store);
    } catch (error) {
      errorHandler.handleError('计数失败', 'low', { error, store });
      throw error;
    }
  }
}

export const db = new Database();
