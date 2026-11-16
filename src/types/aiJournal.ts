export type TradingNoteCategory = 'pre-market' | 'post-market' | 'psychology' | 'mistake' | 'setup' | 'general';

export interface TradingNote {
  id: string;
  title: string;
  category: TradingNoteCategory;
  content: string;
  symbol?: string;
  tags: string[];
  isPinned?: boolean;
  date: string; // YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
}

export type PreMarketMood = 'calm' | 'focused' | 'anxious' | 'fomo' | 'fatigued' | 'confident';

export interface SelfJournalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  preMarketMood: PreMarketMood;
  postMarketReflection: string;
  disciplineScore: number; // 1 to 10
  wins: string;
  struggles: string;
  habitsChecked: string[];
  createdAt: string;
}

export type GoalType = 'all-time' | 'long-term' | 'short-term';
export type GoalCategory = 'pnl' | 'discipline' | 'risk' | 'psychology' | 'education';

export interface GoalItem {
  id: string;
  type: GoalType;
  category: GoalCategory;
  title: string;
  description?: string;
  targetDate?: string;
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  progressPercentage: number;
  completed: boolean;
  createdAt: string;
}

export type KnowledgeCategory = 'rule' | 'strategy' | 'lesson';

export interface KnowledgeItem {
  id: string;
  category: KnowledgeCategory;
  title: string;
  content: string;
  keyRules: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export type InsightType = 'leak' | 'strength' | 'recommendation' | 'compliance';
export type InsightSeverity = 'critical' | 'warning' | 'positive' | 'info';

export interface AIInsight {
  id: string;
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  description: string;
  metricImpact?: string;
  actionableTip: string;
  relatedRuleId?: string;
  detectedAt: string;
}

export interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestions?: string[];
}

export type AIProvider = 'gemini' | 'openai' | 'claude' | 'deepseek' | 'groq' | 'openrouter' | 'custom';

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
  customBaseUrl?: string;
}

