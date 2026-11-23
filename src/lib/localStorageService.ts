import { Trade, TradingSetup } from '../types/trading';
import { TradingNote, SelfJournalEntry, KnowledgeItem } from '../types/aiJournal';
import { DEFAULT_TRADING_SETUPS, SETUP_PALETTE_COLORS } from '../utils/setupCalculations';

export interface AuthUser {
  id: string;
  email: string;
  fullName?: string;
}

export type SheetUser = AuthUser; // Alias for backward compatibility
export type SyncStatus = 'connected' | 'syncing' | 'offline';

const AUTH_SESSION_KEY = 'tradex_auth_session';
const LOCAL_USERS_KEY = 'tradex_local_users';
const LOCAL_TRADES_KEY = 'tradex_local_trades';
const LOCAL_CAPITAL_KEY = 'tradex_local_capital';

export async function sha256Browser(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

class LocalStorageService {
  private syncStatus: SyncStatus = 'connected';
  private statusListeners: Set<(status: SyncStatus) => void> = new Set();
  private authListeners: Set<(user: AuthUser | null) => void> = new Set();

  public onSyncStatusChange(cb: (status: SyncStatus) => void): () => void {
    this.statusListeners.add(cb);
    cb(this.syncStatus);
    return () => this.statusListeners.delete(cb);
  }

  public setStatus(status: SyncStatus) {
    if (this.syncStatus === status) return;
    this.syncStatus = status;
    this.statusListeners.forEach((cb) => cb(status));
  }

  public onAuthStateChange(cb: (user: AuthUser | null) => void): () => void {
    this.authListeners.add(cb);
    return () => this.authListeners.delete(cb);
  }

  public notifyAuthChange(user: AuthUser | null) {
    this.authListeners.forEach((cb) => cb(user));
  }

  public async signUp(email: string, password: string, fullName: string = ''): Promise<AuthUser> {
    const normalizedEmail = email.trim().toLowerCase();
    const localUsers: Array<{ id: string; email: string; passwordHash: string; fullName: string }> =
      JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '[]');

    if (localUsers.some((u) => u.email === normalizedEmail)) {
      throw new Error('Account with this email already exists.');
    }

    const passwordHash = await sha256Browser(password);
    const userId = crypto.randomUUID();
    const newUser = { id: userId, email: normalizedEmail, passwordHash, fullName };
    localUsers.push(newUser);
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(localUsers));

    const user: AuthUser = { id: userId, email: normalizedEmail, fullName };
    this.setSession(user);
    return user;
  }

  public async signIn(email: string, password: string): Promise<AuthUser> {
    const normalizedEmail = email.trim().toLowerCase();
    const localUsers: Array<{ id: string; email: string; passwordHash: string; fullName: string }> =
      JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '[]');

    const found = localUsers.find((u) => u.email === normalizedEmail);
    if (!found) {
      throw new Error('No account found with this email. Please sign up.');
    }

    const inputHash = await sha256Browser(password);
    if (found.passwordHash !== inputHash) {
      throw new Error('Incorrect password.');
    }

    const user: AuthUser = { id: found.id, email: found.email, fullName: found.fullName };
    this.setSession(user);
    return user;
  }

  public signOut(): void {
    localStorage.removeItem(AUTH_SESSION_KEY);
    this.notifyAuthChange(null);
  }

  public getCurrentUser(): AuthUser | null {
    try {
      const stored = localStorage.getItem(AUTH_SESSION_KEY);
      if (!stored) return null;
      return JSON.parse(stored) as AuthUser;
    } catch {
      return null;
    }
  }

  public setSession(user: AuthUser | null) {
    if (user) {
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_SESSION_KEY);
    }
    this.notifyAuthChange(user);
  }

  public async loadUserData(userId: string): Promise<{
    capital: number;
    trades: Trade[];
    notes: TradingNote[];
    selfJournal: SelfJournalEntry[];
    knowledgeHub: KnowledgeItem[];
  }> {
    return {
      capital: this.getLocalCapital(userId),
      trades: this.getLocalTrades(userId),
      notes: [],
      selfJournal: [],
      knowledgeHub: [],
    };
  }

  public getLocalTrades(userId: string): Trade[] {
    try {
      const data = localStorage.getItem(`${LOCAL_TRADES_KEY}_${userId}`);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public saveLocalTrades(userId: string, trades: Trade[]): void {
    try {
      localStorage.setItem(`${LOCAL_TRADES_KEY}_${userId}`, JSON.stringify(trades));
    } catch (e) {
      console.warn('Local storage write error:', e);
    }
  }

  public getLocalCapital(userId: string): number {
    const raw = localStorage.getItem(`${LOCAL_CAPITAL_KEY}_${userId}`);
    const num = Number(raw);
    return Number.isFinite(num) ? num : 0;
  }

  public saveLocalCapital(userId: string, total: number): void {
    try {
      localStorage.setItem(`${LOCAL_CAPITAL_KEY}_${userId}`, String(total));
    } catch (e) {
      console.warn('Local capital storage write error:', e);
    }
  }

  public async saveUserData(userId: string, data: { trades?: Trade[]; capital?: number }): Promise<void> {
    if (data.trades) this.saveLocalTrades(userId, data.trades);
    if (data.capital !== undefined) this.saveLocalCapital(userId, data.capital);
  }

  public getTradingSetups(): TradingSetup[] {
    try {
      const data = localStorage.getItem('tradex_trading_setups');
      if (data !== null) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Error reading trading setups from localStorage:', e);
    }
    return DEFAULT_TRADING_SETUPS;
  }

  public saveTradingSetups(setups: TradingSetup[]): void {
    try {
      localStorage.setItem('tradex_trading_setups', JSON.stringify(setups));
    } catch (e) {
      console.warn('Error saving trading setups to localStorage:', e);
    }
  }

  public addTradingSetup(name: string, color?: string, description?: string): TradingSetup {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Setup name cannot be empty');
    const existing = this.getTradingSetups();
    const found = existing.find((s) => s.name.toLowerCase() === trimmed.toLowerCase());
    if (found) return found;

    const assignedColor = color || SETUP_PALETTE_COLORS[existing.length % SETUP_PALETTE_COLORS.length];
    const newSetup: TradingSetup = {
      id: `setup_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: trimmed,
      color: assignedColor,
      description,
    };

    const updated = [...existing, newSetup];
    this.saveTradingSetups(updated);
    return newSetup;
  }

  public deleteTradingSetup(id: string): void {
    const existing = this.getTradingSetups();
    const updated = existing.filter((s) => s.id !== id && s.name.toLowerCase() !== id.toLowerCase());
    this.saveTradingSetups(updated);
  }

  // --- PERSISTENT TRADE-TO-SETUP MAPPINGS ---
  // Guaranteed anchor to preserve assigned setups even across full sync resets and raw fill reconstructions
  public getTradeSetupsMap(userId?: string): Record<string, string> {
    try {
      const key = `tradex_trade_setups_map_${userId || 'default'}`;
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) return parsed;
      }
      if (userId) {
        const fallback = localStorage.getItem('tradex_trade_setups_map_default');
        if (fallback) {
          const parsed = JSON.parse(fallback);
          if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading trade setups map from localStorage:', e);
    }
    return {};
  }

  public saveTradeSetupMapping(tradeId: string, setup?: string, groupId?: string, userId?: string): void {
    try {
      const key = `tradex_trade_setups_map_${userId || 'default'}`;
      const current = this.getTradeSetupsMap(userId);
      if (setup && setup.trim()) {
        const val = setup.trim();
        current[tradeId] = val;
        if (groupId) {
          current[groupId] = val;
        }
      } else {
        delete current[tradeId];
        if (groupId) {
          delete current[groupId];
        }
      }
      localStorage.setItem(key, JSON.stringify(current));
    } catch (e) {
      console.warn('Error saving trade setup mapping to localStorage:', e);
    }
  }

  public batchSaveTradeSetupMappings(mappings: Record<string, string>, userId?: string): void {
    try {
      const key = `tradex_trade_setups_map_${userId || 'default'}`;
      const current = this.getTradeSetupsMap(userId);
      const merged = { ...current, ...mappings };
      localStorage.setItem(key, JSON.stringify(merged));
    } catch (e) {
      console.warn('Error batch saving trade setup mappings to localStorage:', e);
    }
  }

  // --- PERSISTENT TRADE ANNOTATIONS (NOTES & SCREENSHOTS) ---
  // Guaranteed anchor to preserve user notes and screenshots against Delta auto-sync overwrites
  public getTradeAnnotationsMap(userId?: string): Record<string, { notes?: string; screenshotUrl?: string }> {
    try {
      const key = `tradex_trade_annotations_map_${userId || 'default'}`;
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === 'object') return parsed;
      }
      if (userId) {
        const fallback = localStorage.getItem('tradex_trade_annotations_map_default');
        if (fallback) {
          const parsed = JSON.parse(fallback);
          if (parsed && typeof parsed === 'object') return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading trade annotations map from localStorage:', e);
    }
    return {};
  }

  public getTradeAnnotation(tradeId: string, userId?: string): { notes?: string; screenshotUrl?: string } | undefined {
    const map = this.getTradeAnnotationsMap(userId);
    return map[tradeId];
  }

  public saveTradeAnnotation(tradeId: string, notes?: string, screenshotUrl?: string, userId?: string): void {
    try {
      const key = `tradex_trade_annotations_map_${userId || 'default'}`;
      const current = this.getTradeAnnotationsMap(userId);
      current[tradeId] = {
        notes: notes !== undefined ? notes : current[tradeId]?.notes,
        screenshotUrl: screenshotUrl !== undefined ? screenshotUrl : current[tradeId]?.screenshotUrl,
      };
      localStorage.setItem(key, JSON.stringify(current));
    } catch (e) {
      console.warn('Error saving trade annotation to localStorage:', e);
    }
  }

  public batchSaveTradeAnnotations(annotations: Record<string, { notes?: string; screenshotUrl?: string }>, userId?: string): void {
    try {
      const key = `tradex_trade_annotations_map_${userId || 'default'}`;
      const current = this.getTradeAnnotationsMap(userId);
      const merged = { ...current, ...annotations };
      localStorage.setItem(key, JSON.stringify(merged));
    } catch (e) {
      console.warn('Error batch saving trade annotations to localStorage:', e);
    }
  }
}

export const localStorageService = new LocalStorageService();

