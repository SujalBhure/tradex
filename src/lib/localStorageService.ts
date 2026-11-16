import { Trade } from '../types/trading';
import { TradingNote, SelfJournalEntry, KnowledgeItem } from '../types/aiJournal';

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
}

export const localStorageService = new LocalStorageService();

