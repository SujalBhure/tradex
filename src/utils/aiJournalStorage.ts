import { SelfJournalEntry, GoalItem, KnowledgeItem, TradingNote, AIConfig } from '../types/aiJournal';
import { supabase } from '../lib/supabase';

const SELF_JOURNAL_KEY = 'tradex_self_journal_entries';
const GOALS_KEY = 'tradex_goals_items';
const KNOWLEDGE_HUB_KEY = 'tradex_knowledge_hub_items';
const TRADING_NOTES_KEY = 'tradex_trading_notes';
const GEMINI_API_KEY = 'tradex_gemini_api_key';
const AI_CONFIG_KEY = 'tradex_ai_config';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const ensureValidUuid = (id?: string): string => {
  if (id && UUID_REGEX.test(id)) return id;
  return crypto.randomUUID();
};

export const DEFAULT_TRADING_NOTES: TradingNote[] = [
  {
    id: 'a1000000-0000-4000-8000-000000000001',
    title: 'Pre-Market BTC & ETH Liquidity Map',
    category: 'pre-market',
    content: 'BTC hovering below Monday high ($64,200). Looking for an Asian session liquidity sweep into the 15m Fair Value Gap between $63,600 and $63,800. Wait for market structure break on 1m before pulling the trigger. Risk strictly capped at 1%.',
    symbol: 'BTCUSDT',
    tags: ['SMC', 'Liquidity Sweep', 'Pre-Market'],
    isPinned: true,
    date: new Date().toISOString().split('T')[0],
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'a1000000-0000-4000-8000-000000000002',
    title: 'Post-Market Lesson: Avoid Moving Stop Losses',
    category: 'mistake',
    content: 'Took a short on SOL earlier. Price reacted at first, then started stalling. I widened my stop loss thinking it was just a fakeout. Ended up taking a 1.8R loss instead of 1R. Never move stops after entry - accept the 1R loss and wait for the next setup.',
    symbol: 'SOLUSDT',
    tags: ['Discipline', 'Stop Loss', 'Risk Management'],
    isPinned: true,
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'a1000000-0000-4000-8000-000000000003',
    title: 'Psychology Check: Overtrading Temptation',
    category: 'psychology',
    content: 'Feeling restless after missing the morning breakout. Reminded myself that missing a move costs $0, but taking low-probability revenge trades costs real capital. Taking a 30-minute walk away from the screens.',
    tags: ['Mindset', 'Patience', 'Psychology'],
    isPinned: false,
    date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
];

export const DEFAULT_GOALS: GoalItem[] = [
  {
    id: 'goal-1',
    type: 'all-time',
    category: 'pnl',
    title: '$100K Funded Account Milestones',
    description: 'Pass funded evaluation and achieve financial independence through systematic risk execution.',
    targetValue: 100000,
    currentValue: 5500,
    unit: '$',
    progressPercentage: 5.5,
    completed: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'goal-2',
    type: 'long-term',
    category: 'discipline',
    title: 'Maintain > 2.0 Profit Factor Over 100 Trades',
    description: 'Keep losers strictly capped at 1R while letting high-probability setups run to 2.5R+.',
    targetValue: 2.0,
    currentValue: 2.08,
    unit: 'PF',
    progressPercentage: 100,
    completed: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'goal-3',
    type: 'short-term',
    category: 'risk',
    title: 'Zero Revenge Trades This Week',
    description: 'If a trade hits stop loss, enforce mandatory 30-minute terminal walk-away before evaluating another setup.',
    progressPercentage: 85,
    completed: false,
    createdAt: new Date().toISOString(),
  },
];

export const DEFAULT_KNOWLEDGE: KnowledgeItem[] = [
  {
    id: 'b1000000-0000-4000-8000-000000000001',
    category: 'rule',
    title: 'Rules of Engagement (Non-Negotiables)',
    content: 'Core risk management framework that protects trading capital under all market volatility conditions.',
    keyRules: [
      'Never risk more than 1.5% of total capital on any single trade setup.',
      'Maximum 3 trades per calendar day (shut down screens if 2 consecutive stop-outs occur).',
      'Never widen or move stop losses once position is filled.',
      'No trading 15 minutes before or after high-impact macroeconomic news releases (CPI, FOMC, NFP).'
    ],
    tags: ['Risk Management', 'Discipline', 'Daily Limit'],
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'b1000000-0000-4000-8000-000000000002',
    category: 'strategy',
    title: 'Liquidity Sweep + Fair Value Gap (FVG)',
    content: 'High-probability reversal setup targeting institutional liquidity pools during London and New York sessions.',
    keyRules: [
      'Identify Asian session high/low or previous day high/low.',
      'Wait for clear sweep of liquidity with strong rejection wick.',
      'Enter on 5-minute / 15-minute Fair Value Gap retest with stop below the sweep low.',
      'Target opposing liquidity pool with minimum 2:1 Risk/Reward ratio.'
    ],
    tags: ['SMC', 'Price Action', 'Liquidity', 'Reversal'],
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'b1000000-0000-4000-8000-000000000003',
    category: 'lesson',
    title: 'Costly Lesson: Revenge Trading BTC Dump',
    content: 'Logged after taking back-to-back impulsive short entries following a failed breakout.',
    keyRules: [
      'Market structure did not confirm breakdown; entered out of frustration from missing the earlier move.',
      'Violation: Took 4 trades within 20 minutes with escalating position size.',
      'Actionable Fix: Walk away from screens for at least 30 minutes following any stopped out trade.'
    ],
    tags: ['Psychology', 'Mistake Analysis', 'Revenge Trading'],
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const DEFAULT_SELF_ENTRIES: SelfJournalEntry[] = [
  {
    id: 'entry-1',
    date: new Date().toISOString().split('T')[0],
    preMarketMood: 'focused',
    postMarketReflection: 'Disciplined execution today. Waited patiently for confirmation before taking the BTC Long. Let the trade hit target without premature manual exit.',
    disciplineScore: 9,
    wins: 'Waited 45 minutes for proper candle close confirmation instead of FOMO entry.',
    struggles: 'Felt slight urge to take a second trade on ETH without a clear setup, but walked away.',
    habitsChecked: ['Checked macro calendar', 'Calculated exact lot size with calculator', 'Set stop loss before entering'],
    createdAt: new Date().toISOString(),
  },
];

// Self Journal Persistence
export const getSelfJournalEntries = (): SelfJournalEntry[] => {
  try {
    const raw = localStorage.getItem(SELF_JOURNAL_KEY);
    if (!raw) {
      localStorage.setItem(SELF_JOURNAL_KEY, JSON.stringify(DEFAULT_SELF_ENTRIES));
      return DEFAULT_SELF_ENTRIES;
    }
    return JSON.parse(raw);
  } catch (e) {
    return DEFAULT_SELF_ENTRIES;
  }
};

export const saveSelfJournalEntry = (entry: SelfJournalEntry): SelfJournalEntry[] => {
  const entries = getSelfJournalEntries();
  const existingIndex = entries.findIndex((e) => e.id === entry.id || e.date === entry.date);
  let updated: SelfJournalEntry[];
  if (existingIndex >= 0) {
    updated = [...entries];
    updated[existingIndex] = entry;
  } else {
    updated = [entry, ...entries];
  }
  localStorage.setItem(SELF_JOURNAL_KEY, JSON.stringify(updated));
  return updated;
};

// Goals Persistence
export const getGoals = (): GoalItem[] => {
  try {
    const raw = localStorage.getItem(GOALS_KEY);
    if (!raw) {
      localStorage.setItem(GOALS_KEY, JSON.stringify(DEFAULT_GOALS));
      return DEFAULT_GOALS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return DEFAULT_GOALS;
  }
};

export const saveGoal = (goal: GoalItem): GoalItem[] => {
  const goals = getGoals();
  const index = goals.findIndex((g) => g.id === goal.id);
  let updated: GoalItem[];
  if (index >= 0) {
    updated = [...goals];
    updated[index] = goal;
  } else {
    updated = [goal, ...goals];
  }
  localStorage.setItem(GOALS_KEY, JSON.stringify(updated));
  return updated;
};

export const deleteGoal = (id: string): GoalItem[] => {
  const goals = getGoals().filter((g) => g.id !== id);
  localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
  return goals;
};

// Knowledge Hub Persistence
export const getKnowledgeItems = (): KnowledgeItem[] => {
  try {
    const raw = localStorage.getItem(KNOWLEDGE_HUB_KEY);
    if (!raw) {
      localStorage.setItem(KNOWLEDGE_HUB_KEY, JSON.stringify(DEFAULT_KNOWLEDGE));
      return DEFAULT_KNOWLEDGE;
    }
    return JSON.parse(raw);
  } catch (e) {
    return DEFAULT_KNOWLEDGE;
  }
};

export const saveKnowledgeItem = (item: KnowledgeItem): KnowledgeItem[] => {
  const sanitizedItem: KnowledgeItem = { ...item, id: ensureValidUuid(item.id) };
  const items = getKnowledgeItems();
  const index = items.findIndex((i) => i.id === sanitizedItem.id);
  let updated: KnowledgeItem[];
  if (index >= 0) {
    updated = [...items];
    updated[index] = sanitizedItem;
  } else {
    updated = [sanitizedItem, ...items];
  }
  localStorage.setItem(KNOWLEDGE_HUB_KEY, JSON.stringify(updated));

  if (supabase) {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) {
        supabase.from('knowledge_items').upsert({
          id: sanitizedItem.id,
          user_id: session.user.id,
          title: sanitizedItem.title,
          category: sanitizedItem.category,
          content: sanitizedItem.content,
          description: sanitizedItem.content,
          key_rules: sanitizedItem.keyRules || [],
          tags: sanitizedItem.tags || [],
          created_at: sanitizedItem.createdAt,
          updated_at: sanitizedItem.updatedAt || new Date().toISOString(),
        }).then(({ error }) => {
          if (error) console.error('Cloud knowledge sync error:', error);
        });
      }
    });
  }

  return updated;
};

export const deleteKnowledgeItem = (id: string): KnowledgeItem[] => {
  const items = getKnowledgeItems().filter((i) => i.id !== id);
  localStorage.setItem(KNOWLEDGE_HUB_KEY, JSON.stringify(items));

  if (supabase && UUID_REGEX.test(id)) {
    supabase.from('knowledge_items').delete().eq('id', id).then(({ error }) => {
      if (error) console.error('Cloud knowledge delete error:', error);
    });
  }

  return items;
};

export const syncKnowledgeWithCloud = async (userId: string): Promise<KnowledgeItem[]> => {
  if (!supabase || !userId) return getKnowledgeItems();
  try {
    const { data: cloudItems, error } = await supabase
      .from('knowledge_items')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const localItems = getKnowledgeItems();
    const cloudMap = new Map((cloudItems || []).map((k) => [k.id, k]));

    // Upload any local items not in cloud
    for (const local of localItems) {
      if (!cloudMap.has(local.id) && UUID_REGEX.test(local.id)) {
        await supabase.from('knowledge_items').upsert({
          id: local.id,
          user_id: userId,
          title: local.title,
          category: local.category,
          content: local.content,
          description: local.content,
          key_rules: local.keyRules || [],
          tags: local.tags || [],
          created_at: local.createdAt,
          updated_at: local.updatedAt,
        });
      }
    }

    if (cloudItems && cloudItems.length > 0) {
      const merged: KnowledgeItem[] = cloudItems.map((k) => ({
        id: k.id,
        category: k.category as any,
        title: k.title,
        content: k.content || k.description || '',
        keyRules: k.key_rules || [],
        tags: k.tags || [],
        createdAt: k.created_at,
        updatedAt: k.updated_at,
      }));
      localStorage.setItem(KNOWLEDGE_HUB_KEY, JSON.stringify(merged));
      return merged;
    }
  } catch (err) {
    console.warn('Knowledge cloud sync fallback to local:', err);
  }
  return getKnowledgeItems();
};

export const DEFAULT_AI_CONFIG: AIConfig = {
  provider: 'gemini',
  apiKey: '',
  model: 'gemini-2.0-flash',
  customBaseUrl: '',
};

export const getAIConfig = (): AIConfig => {
  try {
    const raw = localStorage.getItem(AI_CONFIG_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
    const legacyKey = localStorage.getItem(GEMINI_API_KEY);
    if (legacyKey) {
      return {
        provider: 'gemini',
        apiKey: legacyKey,
        model: 'gemini-2.0-flash',
      };
    }
    return DEFAULT_AI_CONFIG;
  } catch (e) {
    return DEFAULT_AI_CONFIG;
  }
};

export const saveAIConfig = (config: AIConfig): void => {
  localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(config));
  if (config.provider === 'gemini' && config.apiKey) {
    localStorage.setItem(GEMINI_API_KEY, config.apiKey);
  }
};

// Gemini API Key Persistence (Legacy compatibility)
export const getGeminiApiKey = (): string => {
  const config = getAIConfig();
  if (config.provider === 'gemini') {
    return config.apiKey;
  }
  return localStorage.getItem(GEMINI_API_KEY) || '';
};

export const saveGeminiApiKey = (key: string): void => {
  if (key.trim()) {
    localStorage.setItem(GEMINI_API_KEY, key.trim());
    const curr = getAIConfig();
    saveAIConfig({ ...curr, provider: 'gemini', apiKey: key.trim() });
  } else {
    localStorage.removeItem(GEMINI_API_KEY);
  }
};

// Trading Notes Persistence
export const getTradingNotes = (): TradingNote[] => {
  try {
    const raw = localStorage.getItem(TRADING_NOTES_KEY);
    if (!raw) {
      localStorage.setItem(TRADING_NOTES_KEY, JSON.stringify(DEFAULT_TRADING_NOTES));
      return DEFAULT_TRADING_NOTES;
    }
    return JSON.parse(raw);
  } catch (e) {
    return DEFAULT_TRADING_NOTES;
  }
};

export const saveTradingNote = (note: TradingNote): TradingNote[] => {
  const sanitizedNote: TradingNote = { ...note, id: ensureValidUuid(note.id) };
  const notes = getTradingNotes();
  const index = notes.findIndex((n) => n.id === sanitizedNote.id);
  let updated: TradingNote[];
  if (index >= 0) {
    updated = [...notes];
    updated[index] = sanitizedNote;
  } else {
    updated = [sanitizedNote, ...notes];
  }
  localStorage.setItem(TRADING_NOTES_KEY, JSON.stringify(updated));

  if (supabase) {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) {
        supabase.from('trading_notes').upsert({
          id: sanitizedNote.id,
          user_id: session.user.id,
          title: sanitizedNote.title,
          category: sanitizedNote.category,
          content: sanitizedNote.content,
          symbol: sanitizedNote.symbol || null,
          tags: sanitizedNote.tags || [],
          is_pinned: !!sanitizedNote.isPinned,
          date: sanitizedNote.date,
          created_at: sanitizedNote.createdAt,
          updated_at: sanitizedNote.updatedAt || new Date().toISOString(),
        }).then(({ error }) => {
          if (error) console.error('Cloud note sync error:', error);
        });
      }
    });
  }

  return updated;
};

export const deleteTradingNote = (id: string): TradingNote[] => {
  const notes = getTradingNotes().filter((n) => n.id !== id);
  localStorage.setItem(TRADING_NOTES_KEY, JSON.stringify(notes));

  if (supabase && UUID_REGEX.test(id)) {
    supabase.from('trading_notes').delete().eq('id', id).then(({ error }) => {
      if (error) console.error('Cloud note delete error:', error);
    });
  }

  return notes;
};

export const togglePinTradingNote = (id: string): TradingNote[] => {
  const notes = getTradingNotes();
  const updated = notes.map((n) => (n.id === id ? { ...n, isPinned: !n.isPinned } : n));
  localStorage.setItem(TRADING_NOTES_KEY, JSON.stringify(updated));

  const target = updated.find((n) => n.id === id);
  if (supabase && target && UUID_REGEX.test(id)) {
    supabase.from('trading_notes').update({ is_pinned: target.isPinned }).eq('id', id).then(({ error }) => {
      if (error) console.error('Cloud pin update error:', error);
    });
  }

  return updated;
};

export const syncTradingNotesWithCloud = async (userId: string): Promise<TradingNote[]> => {
  if (!supabase || !userId) return getTradingNotes();
  try {
    const { data: cloudNotes, error } = await supabase
      .from('trading_notes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const localNotes = getTradingNotes();
    const cloudMap = new Map((cloudNotes || []).map((n) => [n.id, n]));

    // Upload local notes that are not in cloud yet
    for (const local of localNotes) {
      if (!cloudMap.has(local.id) && UUID_REGEX.test(local.id)) {
        await supabase.from('trading_notes').upsert({
          id: local.id,
          user_id: userId,
          title: local.title,
          category: local.category,
          content: local.content,
          symbol: local.symbol || null,
          tags: local.tags || [],
          is_pinned: !!local.isPinned,
          date: local.date,
          created_at: local.createdAt,
          updated_at: local.updatedAt,
        });
      }
    }

    if (cloudNotes && cloudNotes.length > 0) {
      const merged: TradingNote[] = cloudNotes.map((n) => ({
        id: n.id,
        title: n.title,
        category: n.category as any,
        content: n.content,
        symbol: n.symbol || undefined,
        tags: n.tags || [],
        isPinned: n.is_pinned,
        date: n.date,
        createdAt: n.created_at,
        updatedAt: n.updated_at,
      }));
      localStorage.setItem(TRADING_NOTES_KEY, JSON.stringify(merged));
      return merged;
    }
  } catch (err) {
    console.warn('Trading notes cloud sync fallback to local:', err);
  }
  return getTradingNotes();
};

// AI Chat Messages Persistence & Realtime Cloud Sync
const AI_CHAT_MESSAGES_KEY = 'tradex_ai_chat_messages';

export const getStoredAIChatMessages = (): AIChatMessage[] => {
  try {
    const raw = localStorage.getItem(AI_CHAT_MESSAGES_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse local AI chat messages:', e);
  }
  return [];
};

export const saveAIChatMessage = async (
  msg: AIChatMessage,
  userId?: string | null
): Promise<AIChatMessage> => {
  const sanitized: AIChatMessage = { ...msg, id: ensureValidUuid(msg.id) };
  const current = getStoredAIChatMessages();
  const exists = current.some((m) => m.id === sanitized.id);
  const updated = exists
    ? current.map((m) => (m.id === sanitized.id ? sanitized : m))
    : [...current, sanitized];
  localStorage.setItem(AI_CHAT_MESSAGES_KEY, JSON.stringify(updated));

  if (supabase && userId) {
    supabase
      .from('ai_chat_messages')
      .upsert({
        id: sanitized.id,
        user_id: userId,
        role: sanitized.role,
        content: sanitized.content,
        suggestions: sanitized.suggestions || [],
        created_at: new Date().toISOString(),
      })
      .then(({ error }) => {
        if (error) console.error('Cloud AI chat sync error:', error);
      });
  }

  return sanitized;
};

export const clearAIChatMessages = async (userId?: string | null): Promise<void> => {
  localStorage.removeItem(AI_CHAT_MESSAGES_KEY);
  if (supabase && userId) {
    const { error } = await supabase.from('ai_chat_messages').delete().eq('user_id', userId);
    if (error) console.error('Cloud AI chat clear error:', error);
  }
};

export const syncAIChatMessagesWithCloud = async (userId: string): Promise<AIChatMessage[]> => {
  if (!supabase || !userId) return getStoredAIChatMessages();
  try {
    const { data: cloudMsgs, error } = await supabase
      .from('ai_chat_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const localMsgs = getStoredAIChatMessages();
    const cloudMap = new Map((cloudMsgs || []).map((m) => [m.id, m]));

    // If there are valid local messages not yet in the cloud, upload them
    for (const local of localMsgs) {
      if (local.id !== 'welcome' && !cloudMap.has(local.id) && UUID_REGEX.test(local.id)) {
        await supabase.from('ai_chat_messages').upsert({
          id: local.id,
          user_id: userId,
          role: local.role,
          content: local.content,
          suggestions: local.suggestions || [],
          created_at: new Date().toISOString(),
        });
      }
    }

    if (cloudMsgs && cloudMsgs.length > 0) {
      const formatted: AIChatMessage[] = cloudMsgs.map((m) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: m.suggestions || undefined,
      }));
      localStorage.setItem(AI_CHAT_MESSAGES_KEY, JSON.stringify(formatted));
      return formatted;
    }
  } catch (err) {
    console.warn('AI chat messages cloud sync fallback to local:', err);
  }
  return getStoredAIChatMessages();
};
