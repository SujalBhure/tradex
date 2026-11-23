import { Trade } from '../types/trading';
import { secureStorage, StoredDeltaCredentials } from './secureStorage';
import { localStorageService } from './localStorageService';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';

export interface DeltaCredentials {
  apiKey: string;
  apiSecret: string;
  autoSync: boolean;
  syncIntervalSec: number; // e.g. 30, 60, 300
  autoPushToSheet?: boolean;
  syncCapital?: boolean;
  lastSyncTimestamp?: number;
}

export interface DeltaBalance {
  assetSymbol: string;
  balance: number;
  availableBalance: number;
}

export interface DeltaDepositRecord {
  id: string | number;
  amount: number;
  assetSymbol: string;
  createdAt: string;
  transactionType: string;
  balanceAfter?: number;
}

export interface DeltaCapitalInfo {
  currentBalance: number;
  firstDepositAmount?: number;
  firstDepositDate?: string;
  totalDeposits: number;
  totalWithdrawals: number;
  netDeposits: number;
  depositCount: number;
  deposits: DeltaDepositRecord[];
  inferredInitialCapital: number;
  recommendedCapital: number;
}

export interface DeltaSyncResult {
  success: boolean;
  message: string;
  newTradesCount: number;
  updatedTradesCount: number;
  trades: Trade[];
  capitalInfo?: DeltaCapitalInfo;
  deletedTradeIds?: string[];
}

const DELTA_BASE_URL = 'https://api.india.delta.exchange';

// Web Crypto HMAC-SHA256 signature generator strictly complying with Delta Exchange India specification:
// Signature data = method (UPPERCASE) + timestamp (seconds) + path + queryString + body
export async function generateDeltaHmac(
  secret: string,
  method: string,
  path: string,
  queryString: string = '',
  body: string = '',
  timestamp: string
): Promise<string> {
  const enc = new TextEncoder();
  const message = method.toUpperCase() + timestamp + path + queryString + body;

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret.trim()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message));
  const hashArray = Array.from(new Uint8Array(sig));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export interface DeltaProductSpec {
  id: number;
  symbol: string;
  description: string;
  contractValue: number;
  contractUnitCurrency?: string;
  quotingAsset?: string;
}

class DeltaExchangeService {
  private creds: DeltaCredentials;
  private productsCache: Map<number, DeltaProductSpec> = new Map();
  private symbolToContractValue: Map<string, number> = new Map();
  private pollingTimer: any = null;
  private onTradesDetectedCallbacks: Set<(newTrades: Trade[]) => void> = new Set();
  private isSyncing = false;

  // Server Clock Drift Calibration (Delta strictly enforces +/- 5 sec window)
  private serverTimeOffsetSec: number = 0;
  private lastOffsetCalibrationTime: number = 0;

  // Real-Time WebSocket Streaming Engine
  private ws: WebSocket | null = null;
  private wsPingInterval: any = null;
  private wsReconnectTimer: any = null;
  private isWsConnecting = false;
  private wsConnectionStatus: 'connected' | 'connecting' | 'disconnected' = 'disconnected';

  // Fast Debounced Auto-Logger Engine
  private syncDebounceTimer: any = null;
  private activeGetExistingTrades: (() => Trade[]) | null = null;
  private activeOnSynced: ((trades: Trade[], capitalInfo?: DeltaCapitalInfo, deletedTradeIds?: string[]) => void) | null = null;
  private activeUserId?: string;

  // Window, Tab & Native App State Listeners
  private boundVisibilityHandler: (() => void) | null = null;
  private boundFocusHandler: (() => void) | null = null;
  private capAppStateHandler: any = null;

  constructor() {
    this.creds = {
      apiKey: '',
      apiSecret: '',
      autoSync: true, // Default to true so auto-logging works immediately
      syncIntervalSec: 4, // Default to 4 seconds high-frequency backup loop
      autoPushToSheet: false,
    };
    // Load from device-local encrypted vault
    this.initCredentials();
  }

  private async initCredentials() {
    try {
      const stored = await secureStorage.loadDeltaCredentials();
      this.creds = {
        apiKey: stored.apiKey || '',
        apiSecret: stored.apiSecret || '',
        autoSync: stored.autoSync ?? true, // Always default to true when credentials exist
        syncIntervalSec: stored.syncIntervalSec || 4,
        autoPushToSheet: false,
        syncCapital: stored.syncCapital ?? true,
        lastSyncTimestamp: stored.lastSyncTimestamp,
      };
      if (this.isConfigured() && this.creds.autoSync) {
        this.startAutoSync();
      }
    } catch (e) {
      console.warn('Failed to load secure Delta credentials on startup:', e);
    }
  }

  public getCredentials(): DeltaCredentials {
    return { ...this.creds };
  }

  public async reloadCredentials(): Promise<DeltaCredentials> {
    const stored = await secureStorage.loadDeltaCredentials();
    this.creds = {
      apiKey: stored.apiKey || '',
      apiSecret: stored.apiSecret || '',
      autoSync: stored.autoSync ?? true,
      syncIntervalSec: stored.syncIntervalSec || 4,
      autoPushToSheet: false,
      syncCapital: stored.syncCapital ?? true,
      lastSyncTimestamp: stored.lastSyncTimestamp,
    };
    return { ...this.creds };
  }

  public async saveCredentials(creds: Partial<DeltaCredentials>): Promise<void> {
    this.creds = {
      ...this.creds,
      ...creds,
      autoSync: creds.autoSync !== undefined ? creds.autoSync : (this.creds.autoSync ?? true),
      syncIntervalSec: creds.syncIntervalSec || this.creds.syncIntervalSec || 4,
    };
    await secureStorage.saveDeltaCredentials(this.creds);

    if (this.creds.autoSync && this.creds.apiKey && this.creds.apiSecret) {
      this.startAutoSync();
    } else {
      this.stopAutoSync();
    }
  }

  public async purgeCredentials(): Promise<void> {
    this.creds = {
      apiKey: '',
      apiSecret: '',
      autoSync: false,
      syncIntervalSec: 4,
      autoPushToSheet: false,
    };
    this.stopAutoSync();
    await secureStorage.clearDeltaCredentials();
  }

  public isConfigured(): boolean {
    return Boolean(this.creds.apiKey.trim() && this.creds.apiSecret.trim());
  }

  public onTradesDetected(cb: (newTrades: Trade[]) => void) {
    this.onTradesDetectedCallbacks.add(cb);
    return () => this.onTradesDetectedCallbacks.delete(cb);
  }

  public getWsStatus(): 'connected' | 'connecting' | 'disconnected' {
    return this.wsConnectionStatus;
  }

  // Delta Exchange India Server Clock Drift Calibration
  // Enforces millisecond-accurate time synchronization to beat Delta's strict 5-second replay window.
  // Fetches live atomic timestamp from Delta's public ticker body which is 100% immune to browser CORS header masking.
  public async calibrateServerTime(force = false): Promise<number> {
    if (!force && Date.now() - this.lastOffsetCalibrationTime < 60000 && this.lastOffsetCalibrationTime > 0) {
      return this.serverTimeOffsetSec;
    }
    try {
      const t0 = Date.now();
      const res = await fetch(`${DELTA_BASE_URL}/v2/tickers/BTCUSD?_t=${Date.now()}`, { cache: 'no-store' });
      const t1 = Date.now();
      const rtt = t1 - t0;

      if (res.ok) {
        const json = await res.json();
        if (json && json.result && json.result.timestamp) {
          // json.result.timestamp is in microseconds (16 digits)
          const serverTimeSec = Math.floor(json.result.timestamp / 1000000);
          const localTimeSec = Math.floor((t0 + rtt / 2) / 1000);
          this.serverTimeOffsetSec = serverTimeSec - localTimeSec;
          this.lastOffsetCalibrationTime = Date.now();
          return this.serverTimeOffsetSec;
        }
      }

      // Fallback: Date header if available (non-browser or permissive proxy)
      const dateHeader = res.headers.get('date');
      if (dateHeader) {
        const serverDateMs = new Date(dateHeader).getTime() + Math.round(rtt / 2);
        this.serverTimeOffsetSec = Math.round((serverDateMs - Date.now()) / 1000);
        this.lastOffsetCalibrationTime = Date.now();
      }
    } catch (e) {
      console.warn('Delta server time calibration failed:', e);
    }
    return this.serverTimeOffsetSec;
  }

  public getCalibratedTimestamp(): string {
    return (Math.floor(Date.now() / 1000) + this.serverTimeOffsetSec).toString();
  }

  // Generic signed request with automatic clock drift recalibration and retry
  private async signedFetch<T = any>(
    method: 'GET' | 'POST',
    path: string,
    queryParams: Record<string, any> = {},
    bodyPayload: Record<string, any> | null = null,
    isRetry = false
  ): Promise<T> {
    if (!this.isConfigured()) {
      throw new Error('Delta Exchange India API Key & Secret are not configured on this device.');
    }

    if (Date.now() - this.lastOffsetCalibrationTime > 180000 || this.lastOffsetCalibrationTime === 0) {
      await this.calibrateServerTime();
    }

    const timestamp = this.getCalibratedTimestamp();

    // Build query string
    const queryEntries = Object.entries(queryParams).filter(([_, v]) => v !== undefined && v !== null);
    queryEntries.sort(([a], [b]) => a.localeCompare(b));
    const searchParams = new URLSearchParams();
    queryEntries.forEach(([k, v]) => searchParams.append(k, String(v)));
    const queryStr = searchParams.toString() ? `?${searchParams.toString()}` : '';

    const bodyStr = bodyPayload && Object.keys(bodyPayload).length > 0 ? JSON.stringify(bodyPayload) : '';

    const signature = await generateDeltaHmac(
      this.creds.apiSecret,
      method,
      path,
      queryStr,
      bodyStr,
      timestamp
    );

    const fullUrl = `${DELTA_BASE_URL}${path}${queryStr}`;

    const headers: Record<string, string> = {
      'api-key': this.creds.apiKey.trim(),
      timestamp: timestamp,
      signature: signature,
      Accept: 'application/json',
    };

    if (bodyStr) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(fullUrl, {
      method,
      headers,
      body: bodyStr || undefined,
    });

    if (!res.ok) {
      let errMsg = `Delta Exchange HTTP ${res.status}`;
      let errJson: any = null;
      try {
        errJson = await res.json();
        if (errJson.error?.message) {
          errMsg = errJson.error.message;
        } else if (errJson.error?.code) {
          errMsg = `${errJson.error.code}: ${errJson.error.message || ''}`;
        } else if (errJson.error) {
          errMsg = typeof errJson.error === 'object' ? JSON.stringify(errJson.error) : String(errJson.error);
        }
      } catch {
        // Fallback to text
        try {
          const txt = await res.text();
          if (txt) errMsg += `: ${txt.slice(0, 100)}`;
        } catch {
          // ignore
        }
      }

      // Auto-recalibrate clock drift on expired_signature / 408 / request_expired and retry once
      const lower = errMsg.toLowerCase();
      const errCode = errJson?.error?.code ? String(errJson.error.code).toLowerCase() : '';
      const isExpiredSignature =
        res.status === 408 ||
        errCode === 'expired_signature' ||
        lower.includes('expired_signature') ||
        lower.includes('allowed time window') ||
        lower.includes('request_expired');

      if (!isRetry && isExpiredSignature) {
        // Delta Exchange India provides the exact atomic server_time in error.context!
        if (errJson?.error?.context?.server_time) {
          const serverSec = Number(errJson.error.context.server_time);
          this.serverTimeOffsetSec = serverSec - Math.floor(Date.now() / 1000);
          this.lastOffsetCalibrationTime = Date.now();
        } else {
          this.lastOffsetCalibrationTime = 0;
          await this.calibrateServerTime(true);
        }
        return this.signedFetch<T>(method, path, queryParams, bodyPayload, true);
      }

      if (res.status === 401) {
        if (errMsg.toLowerCase().includes('ip_not_whitelisted')) {
          errMsg = `Delta IP Restriction: Your API Key has an IP Whitelist enabled on Delta Exchange India, but your current browser IP is not allowed. To fix this: Log into Delta Exchange India (india.delta.exchange) > Profile > API Keys, edit your API key (or create a new Read-Only key) and select "No IP Restriction" (leave IP Whitelist blank) so TradeX can connect directly from your device.`;
        } else {
          errMsg = `Unauthorized (HTTP 401): ${errMsg}. Please verify that your API Key and API Secret are active on Delta Exchange India (api.india.delta.exchange) and that your system clock is accurate.`;
        }
      } else if (res.status === 403) {
        errMsg = `Forbidden (HTTP 403): ${errMsg}. Verify API key permissions (read-only orders & positions required).`;
      } else if (res.status === 429) {
        errMsg = `Rate limit exceeded (HTTP 429). Please retry shortly.`;
      }

      throw new Error(errMsg);
    }

    const data = await res.json();
    return data;
  }

  // Retrieve contract value (lot size conversion factor) for any asset/symbol dynamically from Delta
  public getContractValue(symbol: string): number | undefined {
    if (!symbol) return undefined;
    const upper = symbol.toUpperCase().trim();
    if (this.symbolToContractValue.has(upper)) {
      return this.symbolToContractValue.get(upper);
    }
    const clean = upper.replace(/[\/\-_]/g, '');
    if (this.symbolToContractValue.has(clean)) {
      return this.symbolToContractValue.get(clean);
    }
    if (this.symbolToContractValue.has(`${clean}USD`)) {
      return this.symbolToContractValue.get(`${clean}USD`);
    }
    if (this.symbolToContractValue.has(`${clean}USDT`)) {
      return this.symbolToContractValue.get(`${clean}USDT`);
    }
    return undefined;
  }

  // Load products list to map product_id -> symbol and contract_value (lot size conversion factor)
  public async loadProducts(): Promise<Map<number, DeltaProductSpec>> {
    if (this.productsCache.size > 0 && Date.now() - this.lastOffsetCalibrationTime < 300000) {
      return this.productsCache;
    }

    try {
      const t0 = Date.now();
      const res = await fetch(`${DELTA_BASE_URL}/v2/products`, { cache: 'no-store' });
      const t1 = Date.now();
      const dateHeader = res.headers.get('date');
      if (dateHeader) {
        const serverDateMs = new Date(dateHeader).getTime() + Math.round((t1 - t0) / 2);
        this.serverTimeOffsetSec = Math.round((serverDateMs - Date.now()) / 1000);
        this.lastOffsetCalibrationTime = Date.now();
      }
      if (res.ok) {
        const json = await res.json();
        const list = json.result || [];
        list.forEach((p: any) => {
          const sym = p.symbol || p.short_description || `PROD-${p.id}`;
          const contractVal = parseFloat(p.contract_value || '1');
          const finalVal = contractVal > 0 ? contractVal : 1;
          const spec: DeltaProductSpec = {
            id: p.id,
            symbol: sym,
            description: p.description || p.symbol,
            contractValue: finalVal,
            contractUnitCurrency: p.contract_unit_currency,
            quotingAsset: p.quoting_asset?.symbol,
          };
          this.productsCache.set(p.id, spec);
          if (sym) {
            this.symbolToContractValue.set(sym.toUpperCase(), finalVal);
          }
        });
      }
    } catch (e) {
      console.warn('Failed to pre-cache Delta products:', e);
    }
    return this.productsCache;
  }

  // Fetch wallet balances
  public async getWalletBalances(): Promise<DeltaBalance[]> {
    try {
      const res = await this.signedFetch('GET', '/v2/wallet/balances');
      const balances: DeltaBalance[] = [];
      if (res && res.result) {
        const arr = Array.isArray(res.result) ? res.result : [res.result];
        arr.forEach((b: any) => {
          balances.push({
            assetSymbol: b.asset_symbol || 'USD',
            balance: parseFloat(b.balance || '0'),
            availableBalance: parseFloat(b.available_balance || '0'),
          });
        });
      }
      return balances;
    } catch (e) {
      console.warn('Failed to fetch wallet balances:', e);
      return [];
    }
  }

  // Fetch wallet transactions (deposits, withdrawals, etc.) with cursor pagination
  public async getWalletTransactions(maxPages: number = 5): Promise<any[]> {
    const allTxs: any[] = [];
    let afterCursor: string | undefined = undefined;

    for (let page = 0; page < maxPages; page++) {
      const params: Record<string, any> = { page_size: 50 };
      if (afterCursor) {
        params.after = afterCursor;
      }
      try {
        const res = await this.signedFetch<any>('GET', '/v2/wallet/transactions', params);
        const list = (res && res.result) || [];
        if (!Array.isArray(list) || list.length === 0) break;
        allTxs.push(...list);
        const after = res.meta?.after;
        if (after && after !== afterCursor) {
          afterCursor = after;
        } else {
          break;
        }
      } catch {
        break;
      }
    }
    return allTxs;
  }

  // Compute Cumulative Deposited Capital (all times money was added) and Current Balance from Delta Wallet
  public computeCapitalInfo(
    balances: DeltaBalance[],
    transactions: any[],
    closedTradesNetPnl: number = 0
  ): DeltaCapitalInfo {
    let currentBalance = 0;
    if (balances.length > 0) {
      const usdt = balances.find((b) => b.assetSymbol.toUpperCase() === 'USDT');
      if (usdt) {
        currentBalance = usdt.balance;
      } else {
        currentBalance = balances.reduce((sum, b) => sum + b.balance, 0);
      }
    }

    let firstDepositAmount: number | undefined = undefined;
    let firstDepositDate: string | undefined = undefined;
    let totalDeposits = 0;
    let totalWithdrawals = 0;
    const deposits: DeltaDepositRecord[] = [];

    if (transactions.length > 0) {
      // Sort chronologically (earliest first)
      const sorted = [...transactions].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      for (const tx of sorted) {
        const type = (tx.transaction_type || '').toLowerCase();
        const amount = Math.abs(parseFloat(tx.amount || '0'));
        const assetSymbol = (tx.asset_symbol || tx.asset?.symbol || 'USDT').toUpperCase();
        const balanceAfter = tx.balance ? parseFloat(tx.balance) : undefined;

        if (
          type.includes('deposit') ||
          type === 'credit' ||
          type === 'transfer_in' ||
          type === 'fund_deposit' ||
          type === 'external_deposit'
        ) {
          if (amount > 0) {
            totalDeposits += amount;
            deposits.push({
              id: tx.id || `dep_${tx.created_at}_${deposits.length}`,
              amount: parseFloat(amount.toFixed(2)),
              assetSymbol,
              createdAt: tx.created_at || new Date().toISOString(),
              transactionType: tx.transaction_type || 'deposit',
              balanceAfter,
            });

            if (firstDepositAmount === undefined) {
              firstDepositAmount = amount;
              firstDepositDate = tx.created_at;
            }
          }
        } else if (
          type.includes('withdrawal') ||
          type === 'debit' ||
          type === 'transfer_out' ||
          type === 'fund_withdrawal'
        ) {
          if (amount > 0) {
            totalWithdrawals += amount;
          }
        }
      }
    }

    const netDeposits = Math.max(0, parseFloat((totalDeposits - totalWithdrawals).toFixed(2)));
    const inferredInitialCapital = Math.max(0, parseFloat((currentBalance - closedTradesNetPnl).toFixed(2)));

    // Cumulative capital added: If the user added money multiple times, trading capital
    // represents all money added into the account (net deposits or total deposits).
    // If no deposits recorded in transactions (e.g. read-only permission limitation), infer mathematically.
    const recommendedCapital =
      netDeposits > 0
        ? netDeposits
        : totalDeposits > 0
          ? totalDeposits
          : inferredInitialCapital > 0
            ? inferredInitialCapital
            : currentBalance;

    return {
      currentBalance: parseFloat(currentBalance.toFixed(2)),
      firstDepositAmount: firstDepositAmount ? parseFloat(firstDepositAmount.toFixed(2)) : undefined,
      firstDepositDate,
      totalDeposits: parseFloat(totalDeposits.toFixed(2)),
      totalWithdrawals: parseFloat(totalWithdrawals.toFixed(2)),
      netDeposits,
      depositCount: deposits.length,
      deposits,
      inferredInitialCapital,
      recommendedCapital: parseFloat(recommendedCapital.toFixed(2)),
    };
  }

  // Test connection & get account balances and capital info
  public async testConnection(): Promise<{
    success: boolean;
    message: string;
    balances?: DeltaBalance[];
    capitalInfo?: DeltaCapitalInfo;
  }> {
    try {
      await this.calibrateServerTime(true);
      await this.loadProducts();
      const [balances, transactions] = await Promise.all([
        this.getWalletBalances(),
        this.getWalletTransactions(5),
      ]);

      const capitalInfo = this.computeCapitalInfo(balances, transactions, 0);

      return {
        success: true,
        message: 'Connected to Delta Exchange India successfully! Account verified.',
        balances,
        capitalInfo,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Failed to authenticate with Delta Exchange India.',
      };
    }
  }

  // Fetch active open positions (tries margined first, falls back to raw positions)
  public async getOpenPositions(): Promise<any[]> {
    try {
      const res = await this.signedFetch('GET', '/v2/positions/margined');
      return (res && res.result) || [];
    } catch (e: any) {
      if (e.message && (e.message.includes('Unauthorized') || e.message.includes('401') || e.message.includes('Forbidden'))) {
        throw e;
      }
      const res = await this.signedFetch('GET', '/v2/positions');
      return (res && res.result) || [];
    }
  }

  // Fetch active orders (to discover stop loss and target for products)
  public async getOpenOrders(): Promise<any[]> {
    const res = await this.signedFetch('GET', '/v2/orders');
    return (res && res.result) || [];
  }

  // Fetch execution fills with cursor pagination across past trades
  public async getFills(maxPages: number = 5): Promise<any[]> {
    const allFills: any[] = [];
    let afterCursor: string | undefined = undefined;

    for (let page = 0; page < maxPages; page++) {
      const params: Record<string, any> = { page_size: 50 };
      if (afterCursor) {
        params.after = afterCursor;
      }
      try {
        const res = await this.signedFetch<any>('GET', '/v2/fills', params);
        const list = (res && res.result) || [];
        if (!Array.isArray(list) || list.length === 0) break;
        allFills.push(...list);
        const after = res.meta?.after;
        if (after && after !== afterCursor) {
          afterCursor = after;
        } else {
          break;
        }
      } catch (e: any) {
        if (page === 0) throw e;
        break;
      }
    }
    return allFills;
  }

  // Fetch closed orders history with cursor pagination
  public async getOrderHistory(maxPages: number = 5): Promise<any[]> {
    const allOrders: any[] = [];
    let afterCursor: string | undefined = undefined;

    for (let page = 0; page < maxPages; page++) {
      const params: Record<string, any> = { page_size: 50, state: 'closed' };
      if (afterCursor) {
        params.after = afterCursor;
      }
      try {
        const res = await this.signedFetch<any>('GET', '/v2/orders/history', params);
        const list = (res && res.result) || [];
        if (!Array.isArray(list) || list.length === 0) break;
        allOrders.push(...list);
        const after = res.meta?.after;
        if (after && after !== afterCursor) {
          afterCursor = after;
        } else {
          break;
        }
      } catch {
        // Break silently if /v2/orders/history is not accessible on standard tier
        break;
      }
    }
    return allOrders;
  }

  /**
   * Pure Trade Lifecycle Reconstructor:
   * Accurately parses Delta execution fills, positions, and closed orders into TradeX trades.
   * Tracks chronological position changes per product:
   * - Detects Partial Exits vs Full Exits.
   * - Computes exact weighted entry price, gross PnL, commission fees, and net PnL.
   * - Connects partial/full exits and active positions with tradeGroupId for tree visualization.
   */
  public reconstructTrades(
    fills: any[],
    closedOrders: any[],
    activePositions: any[],
    openOrders: any[],
    existingTrades: Trade[],
    userId?: string
  ): { trades: Trade[]; newCount: number; updatedCount: number; deletedTradeIds: string[] } {
    const existingTradeMap = new Map<string, Trade>();
    existingTrades.forEach((t) => existingTradeMap.set(t.id, t));

    let newCount = 0;
    let updatedCount = 0;

    // Index open orders by product_id to match SL / Target
    const openOrdersByProduct = new Map<number, any[]>();
    for (const o of openOrders) {
      const list = openOrdersByProduct.get(o.product_id) || [];
      list.push(o);
      openOrdersByProduct.set(o.product_id, list);
    }

    // Index active positions by product_id
    const activePosByProduct = new Map<number, any>();
    for (const pos of activePositions) {
      const size = parseFloat(pos.size || '0');
      if (size !== 0) {
        activePosByProduct.set(pos.product_id, pos);
      }
    }

    // Sort all fills chronologically (oldest first, with secondary deterministic ID sort)
    const sortedFills = [...fills].sort((a, b) => {
      const timeDiff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (timeDiff !== 0) return timeDiff;
      return (Number(a.id) || 0) - (Number(b.id) || 0);
    });

    // Group fills by product
    const productFills = new Map<number, any[]>();
    for (const fill of sortedFills) {
      const list = productFills.get(fill.product_id) || [];
      list.push(fill);
      productFills.set(fill.product_id, list);
    }

    const productActiveGroupMap = new Map<number, { currentGroupId: string; weightedAvgEntryPrice: number }>();

    // Process each product's fills to reconstruct trade lifecycle
    for (const [productId, productFillsList] of productFills.entries()) {
      let currentPosition = 0; // signed lots: > 0 long, < 0 short
      let weightedAvgEntryPrice = 0;
      let accumulatedEntryFees = 0;
      let currentGroupId = '';
      let positionOpenedAt = '';
      const defaultLeverage = 25;

      for (const fill of productFillsList) {
        const fillSize = Math.abs(parseFloat(fill.size || '0'));
        const fillPrice = parseFloat(fill.price || '0');
        const fillFee = Math.abs(parseFloat(fill.commission || fill.fee || '0'));
        const isBuy = fill.side === 'buy';
        const signedSize = isBuy ? fillSize : -fillSize;

        const symbol =
          fill.product_symbol ||
          this.productsCache.get(productId)?.symbol ||
          `PROD-${productId}`;

        const productSpec = this.productsCache.get(productId);
        const contractValue = productSpec?.contractValue || this.getContractValue(symbol) || 1;

        const isSameDirection = (currentPosition > 0 && isBuy) || (currentPosition < 0 && !isBuy);

        if (currentPosition === 0 || isSameDirection) {
          if (currentPosition === 0) {
            currentGroupId = `delta_group_${productId}_${fill.id}`;
            positionOpenedAt = fill.created_at || new Date().toISOString();
            weightedAvgEntryPrice = fillPrice;
            accumulatedEntryFees = fillFee;
            currentPosition = signedSize;
          } else {
            const newTotalLots = Math.abs(currentPosition) + fillSize;
            weightedAvgEntryPrice =
              (weightedAvgEntryPrice * Math.abs(currentPosition) + fillPrice * fillSize) / newTotalLots;
            accumulatedEntryFees += fillFee;
            currentPosition += signedSize;
          }
        } else {
          // Opposite direction fill => Exit (Partial or Full)
          const positionSide: 'long' | 'short' = currentPosition > 0 ? 'long' : 'short';
          const positionBefore = Math.abs(currentPosition);
          const exitLots = Math.min(positionBefore, fillSize);
          const exitQuantity = exitLots * contractValue;
          const remainingAfter = Math.max(0, positionBefore - exitLots);

          // An exit is partial if there are lots still remaining in this position lifecycle.
          // If the product currently has no active open position on exchange, the final closing fill is guaranteed to be a Full Exit.
          const hasActivePositionOnExchange = activePosByProduct.has(productId);
          const isLastFillForProduct = productFillsList.indexOf(fill) === productFillsList.length - 1;
          const isPartial = remainingAfter > 0.00001 && (hasActivePositionOnExchange || !isLastFillForProduct);

          const entryPrice = weightedAvgEntryPrice;
          const exitPrice = fillPrice;

          // Allocate proportional share of accumulated entry fees to this exit leg
          const allocatedEntryFee = positionBefore > 0
            ? (exitLots / positionBefore) * accumulatedEntryFees
            : 0;
          accumulatedEntryFees = Math.max(0, accumulatedEntryFees - allocatedEntryFee);
          const totalLegFees = parseFloat((allocatedEntryFee + fillFee).toFixed(4));

          // Gross PnL: use explicit reported realized_pnl if non-zero, otherwise compute via notional exitQuantity
          const fillRealizedPnl = parseFloat(fill.realized_pnl || '0');
          const grossPnl =
            fillRealizedPnl !== 0
              ? fillRealizedPnl
              : positionSide === 'long'
                ? (exitPrice - entryPrice) * exitQuantity
                : (entryPrice - exitPrice) * exitQuantity;

          const netPnl = grossPnl - totalLegFees;
          const margin = (entryPrice * exitQuantity) / defaultLeverage;
          const roi = margin > 0 ? parseFloat(((netPnl / margin) * 100).toFixed(2)) : 0;

          const exitTradeId = `delta_exit_${fill.id}`;
          const existing = existingTradeMap.get(exitTradeId);

          const exitTrade: Trade = {
            id: exitTradeId,
            tradeGroupId: currentGroupId,
            userId,
            symbol,
            side: positionSide,
            lots: exitLots,
            quantity: parseFloat(exitQuantity.toFixed(6)),
            entryPrice: parseFloat(entryPrice.toFixed(4)),
            exitPrice: parseFloat(exitPrice.toFixed(4)),
            leverage: defaultLeverage,
            margin: parseFloat(margin.toFixed(2)),
            capitalUsed: parseFloat(margin.toFixed(2)),
            fees: totalLegFees,
            grossPnl: parseFloat(grossPnl.toFixed(4)),
            netPnl: parseFloat(netPnl.toFixed(4)),
            roi,
            status: 'closed',
            openedAt: positionOpenedAt,
            closedAt: fill.created_at || new Date().toISOString(),
            notes: isPartial
              ? `Partial Exit: Closed ${exitLots} lots at $${exitPrice.toLocaleString()} (${remainingAfter.toFixed(2)} lots remaining)`
              : `Full Exit: Position closed ${exitLots} lots at $${exitPrice.toLocaleString()}`,
            tags: ['Delta Exchange', isPartial ? 'Partial Exit' : 'Full Exit'],
          };

          const groupSetup = Array.from(existingTradeMap.values()).find(
            (t) => t.tradeGroupId === currentGroupId && t.setup
          )?.setup;

          if (!existing) {
            if (groupSetup) {
              exitTrade.setup = groupSetup;
            }
            existingTradeMap.set(exitTradeId, exitTrade);
            newCount++;
          } else {
            const persistentAnnotation = localStorageService.getTradeAnnotation(exitTradeId, userId);
            const preservedNotes =
              existing.notes !== undefined && existing.notes !== null
                ? existing.notes
                : (persistentAnnotation?.notes !== undefined ? persistentAnnotation.notes : exitTrade.notes);
            const preservedScreenshot =
              existing.screenshotUrl || persistentAnnotation?.screenshotUrl;
            const preservedTags = Array.from(
              new Set([...(existing.tags || []), ...(exitTrade.tags || [])])
            );

            existingTradeMap.set(exitTradeId, {
              ...exitTrade,
              notes: preservedNotes,
              screenshotUrl: preservedScreenshot,
              tags: preservedTags,
              setup: existing ? existing.setup : groupSetup,
              stopLoss: existing.stopLoss ?? exitTrade.stopLoss,
              target: existing.target ?? exitTrade.target,
              riskRewardRatio: existing.riskRewardRatio ?? exitTrade.riskRewardRatio,
            });

            // Only count as updated if exchange execution fields actually shifted
            if (
              existing.exitPrice !== exitTrade.exitPrice ||
              existing.status !== exitTrade.status ||
              existing.netPnl !== exitTrade.netPnl
            ) {
              updatedCount++;
            }
          }

          // Update position tracker
          if (isPartial) {
            currentPosition = currentPosition > 0 ? remainingAfter : -remainingAfter;
          } else {
            currentPosition = 0;
            weightedAvgEntryPrice = 0;
            accumulatedEntryFees = 0;
            const overshoot = fillSize - positionBefore;
            if (overshoot > 0.00001) {
              currentPosition = isBuy ? overshoot : -overshoot;
              weightedAvgEntryPrice = fillPrice;
              accumulatedEntryFees = (overshoot / fillSize) * fillFee;
              currentGroupId = `delta_group_${productId}_flip_${fill.id}`;
              positionOpenedAt = fill.created_at || new Date().toISOString();
            }
          }
        }
      }

      if (currentPosition !== 0 && currentGroupId) {
        productActiveGroupMap.set(productId, { currentGroupId, weightedAvgEntryPrice });
      }
    }

    // Process Active Open Positions
    for (const pos of activePositions) {
      const size = parseFloat(pos.size || '0');
      if (size === 0) continue;

      const productId = pos.product_id;
      const symbol =
        pos.product_symbol ||
        this.productsCache.get(productId)?.symbol ||
        `PROD-${productId}`;
      const side: 'long' | 'short' = size > 0 ? 'long' : 'short';
      const rawEntryPrice = parseFloat(pos.entry_price || '0');
      const leverage = parseFloat(pos.leverage || '1');
      const posContractVal =
        this.productsCache.get(productId)?.contractValue ||
        this.getContractValue(symbol) ||
        1;
      const lots = Math.abs(size);
      const quantity = lots * posContractVal;
      const margin = parseFloat(
        pos.margin || ((rawEntryPrice * quantity) / (leverage || 1)).toFixed(2)
      );

      // Find SL & Target in open orders
      let stopLoss: number | undefined;
      let target: number | undefined;
      const pOrders = openOrdersByProduct.get(productId) || [];
      for (const o of pOrders) {
        if (o.stop_price && parseFloat(o.stop_price) > 0) {
          stopLoss = parseFloat(o.stop_price);
        }
        if (o.order_type === 'limit_order' && o.reduce_only && o.price) {
          target = parseFloat(o.price);
        }
      }

      let riskReward: number | undefined;
      if (stopLoss && target && rawEntryPrice > 0) {
        const risk = Math.abs(rawEntryPrice - stopLoss);
        const reward = Math.abs(target - rawEntryPrice);
        if (risk > 0) {
          riskReward = parseFloat((reward / risk).toFixed(2));
        }
      }

      const matchedGroup = productActiveGroupMap.get(productId);
      const tradeId = `delta_pos_${productId}_${pos.created_at || 'active'}`;
      const tradeGroupId = matchedGroup ? matchedGroup.currentGroupId : tradeId;
      const entryPrice = matchedGroup ? matchedGroup.weightedAvgEntryPrice : rawEntryPrice;

      const existing = existingTradeMap.get(tradeId);
      if (!existing) {
        const newTrade: Trade = {
          id: tradeId,
          tradeGroupId,
          userId,
          symbol,
          side,
          quantity: parseFloat(quantity.toFixed(6)),
          lots: lots,
          entryPrice,
          stopLoss,
          target,
          riskRewardRatio: riskReward,
          margin,
          leverage,
          capitalUsed: margin,
          fees: 0,
          status: 'open',
          openedAt: pos.created_at || new Date().toISOString(),
          notes: `Auto-logged from Delta Exchange India (Active Position ID: ${pos.id || productId})`,
          tags: ['Delta Exchange', 'Open Position'],
        };
        existingTradeMap.set(tradeId, newTrade);
        newCount++;
      } else {
        if (existing.status === 'open') {
          let modified = false;
          if (stopLoss && existing.stopLoss !== stopLoss) {
            existing.stopLoss = stopLoss;
            modified = true;
          }
          if (target && existing.target !== target) {
            existing.target = target;
            modified = true;
          }
          if (riskReward && existing.riskRewardRatio !== riskReward) {
            existing.riskRewardRatio = riskReward;
            modified = true;
          }
          if (tradeGroupId && existing.tradeGroupId !== tradeGroupId) {
            existing.tradeGroupId = tradeGroupId;
            modified = true;
          }
          if (modified) updatedCount++;
        }
      }
    }

    // Collect all order IDs that already contributed to fills
    const filledOrderIds = new Set<string>();
    for (const fill of fills) {
      if (fill.order_id) filledOrderIds.add(String(fill.order_id));
    }

    // Clean up phantom / duplicate Delta entries from existing trades:
    // 1. Remove trades with invalid/zero entry price (phantom cancelled limit orders)
    // 2. Remove delta_order_ entries that duplicate a reconstructed delta_exit_ trade
    // 3. Remove zero-PnL phantom bracket orders
    // 4. Remove delta_pos_ open placeholders if the position is no longer active on exchange
    const deletedTradeIds: string[] = [];
    for (const [id, trade] of existingTradeMap.entries()) {
      if (id.startsWith('delta_order_')) {
        const isZeroPrice = trade.entryPrice <= 0 || !trade.exitPrice;
        const isZeroPnlDuplicate =
          trade.grossPnl === 0 && trade.entryPrice === trade.exitPrice;
        if (isZeroPrice || isZeroPnlDuplicate) {
          existingTradeMap.delete(id);
          deletedTradeIds.push(id);
          updatedCount++;
        }
      } else if (id.startsWith('delta_pos_')) {
        // If an active position ID was recorded while open, but is no longer open on exchange:
        // Delete the open position placeholder so it doesn't linger as an unclosed trade
        const parts = id.split('_'); // delta, pos, productId, ...
        const pId = parseInt(parts[2], 10);
        if (!isNaN(pId) && !activePosByProduct.has(pId)) {
          existingTradeMap.delete(id);
          deletedTradeIds.push(id);
          updatedCount++;
        }
      }
    }

    // Process Historical Closed Orders (from /v2/orders/history)
    // Only process standalone filled orders that were NOT already processed in fills,
    // and strictly exclude cancelled/unfilled bracket orders (TP limit / SL limit)
    for (const order of closedOrders) {
      const orderIdStr = String(order.id);
      const orderId = `delta_order_${order.id}`;
      const exitTradeId = `delta_exit_${order.id}`;

      // Skip if order was already part of execution fills
      if (filledOrderIds.has(orderIdStr)) continue;

      // Skip if order was cancelled or rejected (e.g. cancelled TP/SL bracket orders)
      const state = (order.state || '').toLowerCase();
      if (state === 'cancelled' || state === 'rejected') continue;

      // Must have actual filled size and valid fill price
      const filledSize = Math.abs(parseFloat(order.filled_size || order.size || '0'));
      const avgPrice = parseFloat(order.average_fill_price || '0');
      if (filledSize <= 0 || avgPrice <= 0) continue;

      // Strictly skip orders with 0 realized PnL (such as standalone entry orders, unfilled/cancelled bracket orders)
      const pnl = parseFloat(order.realized_pnl || '0');
      if (pnl === 0 || avgPrice <= 0) continue;

      if (!existingTradeMap.has(orderId) && !existingTradeMap.has(exitTradeId)) {
        const symbol =
          order.product_symbol ||
          this.productsCache.get(order.product_id)?.symbol ||
          `PROD-${order.product_id}`;
        const orderContractVal =
          this.getContractValue(symbol) ||
          (order.product_id ? this.productsCache.get(order.product_id)?.contractValue : undefined) ||
          1;
        const orderLots = filledSize;
        const orderQuantity = orderLots * orderContractVal;
        const side: 'long' | 'short' = order.side === 'buy' ? 'long' : 'short';
        const fee = Math.abs(parseFloat(order.paid_commission || '0'));
        const netPnl = pnl !== 0 ? pnl - fee : 0;
        const lev = parseFloat(order.leverage || '25');
        const orderMargin = (avgPrice * orderQuantity) / (lev || 1);

        const closedOrderTrade: Trade = {
          id: orderId,
          tradeGroupId: orderId,
          userId,
          symbol,
          side,
          lots: orderLots,
          quantity: parseFloat(orderQuantity.toFixed(6)),
          entryPrice: avgPrice,
          exitPrice: avgPrice,
          leverage: lev,
          margin: parseFloat(orderMargin.toFixed(2)),
          capitalUsed: parseFloat(orderMargin.toFixed(2)),
          fees: fee,
          grossPnl: pnl,
          netPnl: netPnl,
          roi: 0,
          status: 'closed',
          openedAt: order.created_at || new Date().toISOString(),
          closedAt: order.updated_at || order.created_at || new Date().toISOString(),
          notes: `Auto-logged from Delta Exchange historical closed order #${order.id} (${order.side.toUpperCase()})`,
          tags: ['Delta Exchange', 'Closed Order'],
        };
        existingTradeMap.set(orderId, closedOrderTrade);
        newCount++;
      }
    }

    // Final safety pass: purge any zero-PnL or zero-price phantom orders
    for (const [id, trade] of existingTradeMap.entries()) {
      if (id.startsWith('delta_order_')) {
        const isZeroPrice = trade.entryPrice <= 0 || !trade.exitPrice;
        const isZeroPnlDuplicate =
          (trade.grossPnl === 0 || !trade.grossPnl) && trade.entryPrice === trade.exitPrice;
        if (isZeroPrice || isZeroPnlDuplicate) {
          existingTradeMap.delete(id);
          if (!deletedTradeIds.includes(id)) deletedTradeIds.push(id);
          updatedCount++;
        }
      }
    }

    // Safety pass: strictly preserve all user setups, notes, and screenshots from persistent map
    const persistentMap = localStorageService.getTradeSetupsMap(userId);
    const persistentAnnotations = localStorageService.getTradeAnnotationsMap(userId);
    for (const [id, trade] of existingTradeMap.entries()) {
      if (!trade.setup && persistentMap[id]) {
        trade.setup = persistentMap[id];
      }
      if (persistentAnnotations[id]) {
        if (persistentAnnotations[id].notes !== undefined && (!trade.notes || trade.notes.startsWith('Full Exit:') || trade.notes.startsWith('Partial Exit:'))) {
          trade.notes = persistentAnnotations[id].notes;
        }
        if (persistentAnnotations[id].screenshotUrl && !trade.screenshotUrl) {
          trade.screenshotUrl = persistentAnnotations[id].screenshotUrl;
        }
      }
    }

    const mergedTrades = Array.from(existingTradeMap.values()).sort(
      (a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime()
    );

    return { trades: mergedTrades, newCount, updatedCount, deletedTradeIds };
  }

  /**
   * Main Auto-Logger:
   * Inspects Delta Exchange open positions, fills, and historical orders,
   * calculates Entry, SL, Target, and Partial/Full Exits, converts them into TradeX format,
   * and merges them with existing trades.
   * NEVER swallows authentication or network errors.
   */
  public async syncTrades(existingTrades: Trade[], userId?: string): Promise<DeltaSyncResult> {
    if (this.isSyncing) {
      return {
        success: false,
        message: 'Sync is already running.',
        newTradesCount: 0,
        updatedTradesCount: 0,
        trades: existingTrades,
      };
    }

    if (!this.isConfigured()) {
      return {
        success: false,
        message: 'Delta Exchange API Key & Secret not configured.',
        newTradesCount: 0,
        updatedTradesCount: 0,
        trades: existingTrades,
      };
    }

    this.isSyncing = true;
    try {
      // If passed existingTrades is empty, check localStorage as recovery fallback
      let candidateTrades = existingTrades;
      if (candidateTrades.length === 0 && userId) {
        const cached = localStorageService.getLocalTrades(userId);
        if (cached && cached.length > 0) {
          candidateTrades = cached;
        }
      }

      await this.calibrateServerTime(true);
      await this.loadProducts();

      // Fetch positions, open orders (for SL/TP), historical fills, closed orders, balances, and wallet transactions
      const [positions, openOrders, fills, closedOrders, balances, transactions] = await Promise.all([
        this.getOpenPositions(),
        this.getOpenOrders(),
        this.getFills(15),
        this.getOrderHistory(15),
        this.getWalletBalances(),
        this.getWalletTransactions(10),
      ]);

      const { trades: mergedTrades, newCount, updatedCount, deletedTradeIds } = this.reconstructTrades(
        fills,
        closedOrders,
        positions,
        openOrders,
        candidateTrades,
        userId
      );

      const closedTradesNetPnl = mergedTrades
        .filter((t) => t.status === 'closed' && typeof t.netPnl === 'number')
        .reduce((sum, t) => sum + (t.netPnl || 0), 0);

      const capitalInfo = this.computeCapitalInfo(balances, transactions, closedTradesNetPnl);

      await this.saveCredentials({ lastSyncTimestamp: Date.now() });

      return {
        success: true,
        message:
          newCount > 0 || updatedCount > 0
            ? `Synced with Delta India: ${newCount} new trade(s) logged (including past fills & partial exits), ${updatedCount} updated.`
            : 'Delta Exchange is in sync (all past and active trades up to date).',
        newTradesCount: newCount,
        updatedTradesCount: updatedCount,
        trades: mergedTrades,
        capitalInfo,
        deletedTradeIds,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Failed to sync with Delta Exchange.',
        newTradesCount: 0,
        updatedTradesCount: 0,
        trades: existingTrades,
      };
    } finally {
      this.isSyncing = false;
    }
  }

  // --- REAL-TIME WEBSOCKET STREAMING ENGINE ---
  public initWebSocket() {
    if (typeof window === 'undefined' || typeof WebSocket === 'undefined') return;
    if (!this.isConfigured()) return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isWsConnecting = true;
    this.wsConnectionStatus = 'connecting';

    try {
      const socket = new WebSocket('wss://socket.india.delta.exchange');
      this.ws = socket;

      socket.onopen = async () => {
        this.isWsConnecting = false;
        try {
          await this.calibrateServerTime();
          const timestamp = this.getCalibratedTimestamp();
          const signature = await generateDeltaHmac(
            this.creds.apiSecret,
            'GET',
            '/live',
            '',
            '',
            timestamp
          );

          const authPayload = {
            type: 'key-auth',
            payload: {
              'api-key': this.creds.apiKey.trim(),
              timestamp: parseInt(timestamp, 10),
              signature,
            },
          };

          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(authPayload));
          }

          // Start 20s heartbeat ping
          if (this.wsPingInterval) clearInterval(this.wsPingInterval);
          this.wsPingInterval = setInterval(() => {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({ type: 'ping' }));
            }
          }, 20000);
        } catch (authErr) {
          console.warn('Failed to send Delta WebSocket key-auth:', authErr);
        }
      };

      socket.onmessage = async (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'key-auth') {
            if (data.success) {
              this.wsConnectionStatus = 'connected';
              // Subscribe to private live trading channels
              const subPayload = {
                type: 'subscribe',
                payload: {
                  channels: [
                    { name: 'orders' },
                    { name: 'fills' },
                    { name: 'positions' },
                    { name: 'margins' },
                  ],
                },
              };
              socket.send(JSON.stringify(subPayload));

              // Immediate sync after authenticating
              this.triggerDebouncedSync(100);
            } else {
              console.warn('Delta WebSocket key-auth rejected:', data);
              if (
                data.status_code === 408 ||
                data.status === 'request_expired' ||
                data.error?.code === 'expired_signature'
              ) {
                if (data.error?.context?.server_time) {
                  this.serverTimeOffsetSec = Number(data.error.context.server_time) - Math.floor(Date.now() / 1000);
                  this.lastOffsetCalibrationTime = Date.now();
                } else {
                  this.lastOffsetCalibrationTime = 0;
                  await this.calibrateServerTime(true);
                }
              }
            }
            return;
          }

          // Live execution notifications: 'orders', 'fills', 'positions', 'margins'
          const channel = data.channel || data.type;
          if (['orders', 'fills', 'positions', 'margins'].includes(channel)) {
            // Instant trade event received over WebSocket!
            this.triggerDebouncedSync(200);
          }
        } catch {
          // ignore parsing error
        }
      };

      socket.onerror = () => {
        this.isWsConnecting = false;
        this.wsConnectionStatus = 'disconnected';
      };

      socket.onclose = () => {
        this.isWsConnecting = false;
        this.wsConnectionStatus = 'disconnected';
        if (this.wsPingInterval) {
          clearInterval(this.wsPingInterval);
          this.wsPingInterval = null;
        }
        // Auto-reconnect if autoSync is still active
        if (this.creds.autoSync && this.isConfigured()) {
          if (this.wsReconnectTimer) clearTimeout(this.wsReconnectTimer);
          this.wsReconnectTimer = setTimeout(() => {
            if (this.creds.autoSync && this.isConfigured()) {
              this.initWebSocket();
            }
          }, 4000);
        }
      };
    } catch (err) {
      console.warn('Delta WebSocket initialization error:', err);
      this.isWsConnecting = false;
      this.wsConnectionStatus = 'disconnected';
    }
  }

  public closeWebSocket() {
    if (this.wsPingInterval) {
      clearInterval(this.wsPingInterval);
      this.wsPingInterval = null;
    }
    if (this.wsReconnectTimer) {
      clearTimeout(this.wsReconnectTimer);
      this.wsReconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch { }
      this.ws = null;
    }
    this.wsConnectionStatus = 'disconnected';
    this.isWsConnecting = false;
  }

  // --- WINDOW FOCUS, TAB VISIBILITY & NATIVE APP STATE LISTENERS ---
  private initVisibilityListeners() {
    if (typeof window === 'undefined') return;
    this.removeVisibilityListeners();

    this.boundVisibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        // Tab restored to foreground - sync immediately
        this.triggerDebouncedSync(100);
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          this.initWebSocket();
        }
      }
    };

    this.boundFocusHandler = () => {
      // Window gained focus - sync immediately
      this.triggerDebouncedSync(100);
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        this.initWebSocket();
      }
    };

    document.addEventListener('visibilitychange', this.boundVisibilityHandler);
    window.addEventListener('focus', this.boundFocusHandler);

    // Native Capacitor App state change listener (when returning from Delta app to TradeX app)
    try {
      if (Capacitor.isNativePlatform()) {
        CapApp.addListener('appStateChange', (state) => {
          if (state.isActive) {
            this.triggerDebouncedSync(100);
            if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
              this.initWebSocket();
            }
          }
        }).then((handle) => {
          this.capAppStateHandler = handle;
        }).catch(() => { });
      }
    } catch { }
  }

  private removeVisibilityListeners() {
    if (typeof window === 'undefined') return;
    if (this.boundVisibilityHandler) {
      document.removeEventListener('visibilitychange', this.boundVisibilityHandler);
      this.boundVisibilityHandler = null;
    }
    if (this.boundFocusHandler) {
      window.removeEventListener('focus', this.boundFocusHandler);
      this.boundFocusHandler = null;
    }
    if (this.capAppStateHandler) {
      try {
        this.capAppStateHandler.remove();
      } catch { }
      this.capAppStateHandler = null;
    }
  }

  // --- FAST DEBOUNCED AUTO-LOGGER ---
  public triggerDebouncedSync(delayMs = 250) {
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
    }
    this.syncDebounceTimer = setTimeout(async () => {
      if (!this.isConfigured() || this.isSyncing) return;
      const currentTrades = this.activeGetExistingTrades ? this.activeGetExistingTrades() : [];
      const res = await this.syncTrades(currentTrades, this.activeUserId);
      if (
        res.success &&
        (res.newTradesCount > 0 ||
          res.updatedTradesCount > 0 ||
          res.capitalInfo ||
          (res.deletedTradeIds && res.deletedTradeIds.length > 0))
      ) {
        if (this.activeOnSynced) {
          this.activeOnSynced(res.trades, res.capitalInfo, res.deletedTradeIds);
        }
        this.onTradesDetectedCallbacks.forEach((cb) => cb(res.trades));
      }
    }, delayMs);
  }

  // Real-Time Auto-Sync Coordinator
  // Connects WebSocket live stream, hooks tab/app focus events, and runs a high-frequency polling loop
  public startAutoSync(
    getExistingTrades?: () => Trade[],
    onSynced?: (trades: Trade[], capitalInfo?: DeltaCapitalInfo, deletedTradeIds?: string[]) => void,
    userId?: string
  ) {
    this.stopAutoSync();
    if (getExistingTrades) this.activeGetExistingTrades = getExistingTrades;
    if (onSynced) this.activeOnSynced = onSynced;
    if (userId) this.activeUserId = userId;

    if (!this.creds.autoSync || !this.isConfigured()) return;

    // 1. Initialize real-time WebSocket connection
    this.initWebSocket();

    // 2. Setup tab/window/app focus listeners
    this.initVisibilityListeners();

    // 3. High-frequency polling safety net (default 4 seconds)
    const intervalMs = Math.max(3, this.creds.syncIntervalSec || 4) * 1000;
    this.pollingTimer = setInterval(() => {
      this.triggerDebouncedSync(50);
    }, intervalMs);

    // Run immediate sync on start
    this.triggerDebouncedSync(100);
  }

  public stopAutoSync() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
      this.syncDebounceTimer = null;
    }
    this.closeWebSocket();
    this.removeVisibilityListeners();
  }
}

export const deltaExchange = new DeltaExchangeService();
