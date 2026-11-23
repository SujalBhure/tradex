/**
 * =========================================================================
 * TradeX Supabase Cloud Data Service
 * =========================================================================
 *
 * Implements real database read/write/delete operations for authenticated users
 * with Row Level Security (RLS) enforcement.
 *
 * All user trades and capital are isolated per user_id.
 * Sensitive API keys are NEVER stored here (see secureStorage.ts).
 * =========================================================================
 */

import { supabase } from './supabase';
import { Trade, TradingSetup } from '../types/trading';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Deterministically maps any arbitrary string ID (such as delta_exit_123, delta_pos_..., manual trade IDs)
 * to a RFC 4122 v4 compliant PostgreSQL UUID.
 * Existing valid UUIDs are returned unchanged.
 */
export function toValidUuid(str: string): string {
  if (!str) return '00000000-0000-4000-8000-000000000000';
  if (UUID_REGEX.test(str)) return str.toLowerCase();

  // Deterministic 128-bit hash mixing
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57, h3 = 0x9e3779b9, h4 = 0x85ebca6b;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ ch, 3812015801);
    h4 = Math.imul(h4 ^ ch, 2246822507);
  }

  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  const hex3 = (h3 >>> 0).toString(16).padStart(8, '0');
  const hex4 = (h4 >>> 0).toString(16).padStart(8, '0');
  const fullHex = hex1 + hex2 + hex3 + hex4;

  const p1 = fullHex.substring(0, 8);
  const p2 = fullHex.substring(8, 12);
  const p3 = '4' + fullHex.substring(13, 16);
  const p4 = ((parseInt(fullHex.substring(16, 17), 16) & 0x3) | 0x8).toString(16) + fullHex.substring(17, 20);
  const p5 = fullHex.substring(20, 32);

  return `${p1}-${p2}-${p3}-${p4}-${p5}`.toLowerCase();
}

// Convert DB snake_case row to frontend camelCase Trade object
export function mapRowToTrade(row: any): Trade {
  const rawTags: string[] = Array.isArray(row.tags) ? row.tags : [];
  
  // Extract preserved original string ID and group ID if stored
  let originalId = row.id;
  let originalGroupId = row.trade_group_id || row.id;
  let setupFromTag: string | undefined = undefined;
  const cleanTags: string[] = [];

  for (const tag of rawTags) {
    if (typeof tag === 'string') {
      if (tag.startsWith('__orig_id:')) {
        originalId = tag.substring('__orig_id:'.length);
      } else if (tag.startsWith('__orig_group:')) {
        originalGroupId = tag.substring('__orig_group:'.length);
      } else if (tag.startsWith('__setup:')) {
        setupFromTag = tag.substring('__setup:'.length);
      } else {
        cleanTags.push(tag);
      }
    }
  }

  const resolvedSetup = (typeof row.setup === 'string' && row.setup.trim()) ? row.setup.trim() : setupFromTag;

  return {
    id: originalId,
    tradeGroupId: originalGroupId,
    userId: row.user_id,
    symbol: row.symbol,
    side: row.side,
    lots: Number(row.lots) || 0,
    quantity: Number(row.quantity) || 0,
    entryPrice: Number(row.entry_price) || 0,
    exitPrice: row.exit_price !== null && row.exit_price !== undefined ? Number(row.exit_price) : undefined,
    leverage: Number(row.leverage) || 1,
    capitalUsed: Number(row.capital_used) || 0,
    margin: Number(row.margin) || 0,
    fees: Number(row.fees) || 0,
    grossPnl: row.gross_pnl !== null && row.gross_pnl !== undefined ? Number(row.gross_pnl) : undefined,
    netPnl: row.net_pnl !== null && row.net_pnl !== undefined ? Number(row.net_pnl) : undefined,
    roi: row.roi !== null && row.roi !== undefined ? Number(row.roi) : undefined,
    status: row.status || 'open',
    openedAt: row.opened_at || row.created_at || new Date().toISOString(),
    closedAt: row.closed_at || undefined,
    notes: row.notes || undefined,
    tags: cleanTags.length > 0 ? cleanTags : undefined,
    stopLoss: row.stop_loss !== null && row.stop_loss !== undefined ? Number(row.stop_loss) : undefined,
    target: row.target !== null && row.target !== undefined ? Number(row.target) : undefined,
    riskRewardRatio: row.risk_reward_ratio !== null && row.risk_reward_ratio !== undefined ? Number(row.risk_reward_ratio) : undefined,
    screenshotUrl: row.screenshot_url || undefined,
    setup: resolvedSetup || undefined,
  };
}

// Convert frontend camelCase Trade object to DB snake_case payload
export function mapTradeToRow(trade: Trade, userId: string): any {
  const dbId = toValidUuid(trade.id);
  const rawGroupId = trade.tradeGroupId || trade.id;
  const dbGroupId = toValidUuid(rawGroupId);

  const tags = (Array.isArray(trade.tags) ? trade.tags : []).filter(
    (t) => typeof t === 'string' && !t.startsWith('__orig_id:') && !t.startsWith('__orig_group:') && !t.startsWith('__setup:')
  );
  if (trade.id !== dbId) {
    tags.push(`__orig_id:${trade.id}`);
  }
  if (rawGroupId !== dbGroupId) {
    tags.push(`__orig_group:${rawGroupId}`);
  }
  if (trade.setup && trade.setup.trim()) {
    tags.push(`__setup:${trade.setup.trim()}`);
  }

  return {
    id: dbId,
    user_id: userId,
    symbol: trade.symbol,
    side: trade.side,
    lots: Number(trade.lots) || 0,
    quantity: Number(trade.quantity) || 0,
    entry_price: Number(trade.entryPrice) || 0,
    exit_price: trade.exitPrice !== undefined ? Number(trade.exitPrice) : null,
    leverage: Number(trade.leverage) || 1,
    capital_used: Number(trade.capitalUsed) || 0,
    margin: Number(trade.margin) || 0,
    fees: Number(trade.fees) || 0,
    gross_pnl: trade.grossPnl !== undefined ? Number(trade.grossPnl) : null,
    net_pnl: trade.netPnl !== undefined ? Number(trade.netPnl) : null,
    roi: trade.roi !== undefined ? Number(trade.roi) : null,
    status: trade.status,
    opened_at: trade.openedAt,
    closed_at: trade.closedAt || null,
    notes: trade.notes || null,
    tags: tags.length > 0 ? tags : null,
    stop_loss: trade.stopLoss !== undefined ? Number(trade.stopLoss) : null,
    target: trade.target !== undefined ? Number(trade.target) : null,
    risk_reward_ratio: trade.riskRewardRatio !== undefined ? Number(trade.riskRewardRatio) : null,
    screenshot_url: trade.screenshotUrl || null,
    trade_group_id: dbGroupId,
  };
}

export const supabaseDataService = {
  /**
   * Fetch all trades for the authenticated user from Supabase.
   */
  async fetchUserTrades(userId: string): Promise<Trade[]> {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .order('opened_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch trades from Supabase:', error);
      throw new Error(`Supabase query failed: ${error.message}`);
    }

    return (data || []).map(mapRowToTrade);
  },

  /**
   * Insert or update a trade in Supabase.
   */
  async saveTrade(trade: Trade, userId: string): Promise<void> {
    if (!supabase) return;

    const row = mapTradeToRow(trade, userId);
    const { error } = await supabase
      .from('trades')
      .upsert(row, { onConflict: 'id' });

    if (error) {
      console.error('Failed to save trade in Supabase:', error);
      throw new Error(`Failed to save trade: ${error.message}`);
    }
  },

  /**
   * Insert or update multiple trades in Supabase in bulk.
   */
  async saveTradesBulk(trades: Trade[], userId: string): Promise<void> {
    if (!supabase || trades.length === 0) return;

    const rows = trades.map((t) => mapTradeToRow(t, userId));
    const { error } = await supabase
      .from('trades')
      .upsert(rows, { onConflict: 'id' });

    if (error) {
      console.error('Failed to save bulk trades in Supabase:', error);
      throw new Error(`Failed to save bulk trades: ${error.message}`);
    }
  },

  /**
   * Delete a single trade from Supabase.
   */
  async deleteTrade(tradeId: string, userId: string): Promise<void> {
    if (!supabase) return;

    const dbId = toValidUuid(tradeId);
    const { error } = await supabase
      .from('trades')
      .delete()
      .eq('id', dbId)
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to delete trade from Supabase:', error);
      throw new Error(`Failed to delete trade: ${error.message}`);
    }
  },

  /**
   * Delete multiple trades by ID from Supabase.
   */
  async deleteTradesBulk(tradeIds: string[], userId: string): Promise<void> {
    if (!supabase || tradeIds.length === 0) return;

    const dbIds = tradeIds.map(toValidUuid);
    const { error } = await supabase
      .from('trades')
      .delete()
      .in('id', dbIds)
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to delete trades bulk from Supabase:', error);
      throw new Error(`Failed to delete trades: ${error.message}`);
    }
  },

  /**
   * Fetch current trading capital for user.
   */
  async fetchUserCapital(userId: string): Promise<number> {
    if (!supabase) return 0;

    const { data, error } = await supabase
      .from('trading_capital')
      .select('total')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Failed to fetch capital from Supabase:', error);
      return 0;
    }

    return Number(data?.total) || 0;
  },

  /**
   * Update or upsert user capital in Supabase.
   */
  async saveUserCapital(capital: number, userId: string): Promise<void> {
    if (!supabase) return;

    // Check if row exists
    const { data: existing } = await supabase
      .from('trading_capital')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await supabase
        .from('trading_capital')
        .update({ total: capital, available: capital, used: 0, updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      if (error) {
        console.error('Failed to update capital in Supabase:', error);
        throw new Error(`Failed to update capital: ${error.message}`);
      }
    } else {
      const { error } = await supabase
        .from('trading_capital')
        .insert({ user_id: userId, total: capital, available: capital, used: 0 });

      if (error) {
        console.error('Failed to insert capital in Supabase:', error);
        throw new Error(`Failed to set capital: ${error.message}`);
      }
    }
  },

  /**
   * Completely reset journal in Supabase (deletes all trades and resets capital).
   */
  async resetUserJournal(userId: string): Promise<void> {
    if (!supabase) return;

    // Delete all user trades
    const { error: tradesErr } = await supabase
      .from('trades')
      .delete()
      .eq('user_id', userId);

    if (tradesErr) {
      throw new Error(`Failed to clear trades in Supabase: ${tradesErr.message}`);
    }

    // Reset capital to 0
    await this.saveUserCapital(0, userId);
  },

  /**
   * Fetch custom trading setups from cloud.
   * Multi-layered: checks database table first, falls back to auth metadata.
   */
  async fetchTradingSetups(userId: string): Promise<TradingSetup[] | null> {
    if (!supabase || !userId) return null;
    try {
      // 1. Fetch from database configuration row
      const { data, error } = await supabase
        .from('trading_notes')
        .select('content')
        .eq('user_id', userId)
        .eq('title', '__tradex_trading_setups__')
        .maybeSingle();

      if (!error && data?.content) {
        try {
          const parsed = JSON.parse(data.content);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch {}
      }

      // 2. Fallback to auth user metadata
      const { data: authData } = await supabase.auth.getUser();
      if (Array.isArray(authData?.user?.user_metadata?.trading_setups) && authData.user.user_metadata.trading_setups.length > 0) {
        return authData.user.user_metadata.trading_setups;
      }
    } catch (e) {
      console.warn('Error fetching trading setups from cloud:', e);
    }
    return null;
  },

  /**
   * Persist custom trading setups to cloud across database and user metadata.
   */
  /**
   * Persist custom trading setups to cloud across database and user metadata.
   */
  async saveTradingSetups(setups: TradingSetup[], userId: string): Promise<void> {
    if (!supabase || !userId) return;
    const noteId = toValidUuid(`tradex_trading_setups_${userId}`);
    try {
      // Use 'general' category to satisfy PostgreSQL CHECK constraint:
      // CHECK (category IN ('pre-market', 'review', 'psychology', 'mistake', 'playbook', 'general'))
      const { error: upsertErr } = await supabase
        .from('trading_notes')
        .upsert(
          {
            id: noteId,
            user_id: userId,
            title: '__tradex_trading_setups__',
            category: 'general',
            content: JSON.stringify(setups),
            tags: ['__system__', '__tradex_config__'],
            is_pinned: false,
            date: new Date().toISOString().split('T')[0],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );

      if (upsertErr) {
        console.error('Error upserting trading setups to trading_notes:', upsertErr);
      }
    } catch (e) {
      console.warn('Error saving trading setups to trading_notes:', e);
    }

    try {
      await supabase.auth.updateUser({
        data: { trading_setups: setups },
      });
    } catch (e) {
      console.warn('Error saving trading setups to user_metadata:', e);
    }
  },

  /**
   * Fetch persistent trade-to-setup map from cloud.
   */
  async fetchTradeSetupsMap(userId: string): Promise<Record<string, string>> {
    if (!supabase || !userId) return {};
    try {
      const { data, error } = await supabase
        .from('trading_notes')
        .select('content')
        .eq('user_id', userId)
        .eq('title', '__tradex_trade_setups_map__')
        .maybeSingle();

      if (!error && data?.content) {
        try {
          const parsed = JSON.parse(data.content);
          if (parsed && typeof parsed === 'object') return parsed;
        } catch {}
      }
    } catch (e) {
      console.warn('Error fetching trade setups map from cloud:', e);
    }
    return {};
  },

  /**
   * Save persistent trade-to-setup map to cloud.
   */
  async saveTradeSetupsMap(map: Record<string, string>, userId: string): Promise<void> {
    if (!supabase || !userId) return;
    const mapNoteId = toValidUuid(`tradex_trade_setups_map_${userId}`);
    try {
      // Use 'general' category to satisfy PostgreSQL CHECK constraint:
      // CHECK (category IN ('pre-market', 'review', 'psychology', 'mistake', 'playbook', 'general'))
      const { error: upsertErr } = await supabase
        .from('trading_notes')
        .upsert(
          {
            id: mapNoteId,
            user_id: userId,
            title: '__tradex_trade_setups_map__',
            category: 'general',
            content: JSON.stringify(map),
            tags: ['__system__', '__tradex_config__'],
            is_pinned: false,
            date: new Date().toISOString().split('T')[0],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );

      if (upsertErr) {
        console.error('Error upserting trade setups map to trading_notes:', upsertErr);
      }
    } catch (e) {
      console.warn('Error saving trade setups map to cloud:', e);
    }
  },
};

