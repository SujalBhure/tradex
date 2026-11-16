import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  ShieldAlert,
  Send,
  Key,
  HelpCircle,
  Lightbulb,
  Target,
  RefreshCw,
  Sliders,
  Eye,
  EyeOff,
  ExternalLink,
  ShieldCheck,
  Check,
  Zap,
  Trash2,
} from 'lucide-react';
import { Trade, TradingMetrics } from '../../types/trading';
import { SelfJournalEntry, KnowledgeItem, AIInsight, AIChatMessage, AIConfig, AIProvider } from '../../types/aiJournal';
import { generateAIInsights, queryAICoach } from '../../utils/aiAnalysisEngine';
import {
  getAIConfig,
  saveAIConfig,
  DEFAULT_AI_CONFIG,
  getStoredAIChatMessages,
  saveAIChatMessage,
  clearAIChatMessages,
  syncAIChatMessagesWithCloud,
} from '../../utils/aiJournalStorage';
import { localStorageService } from '../../lib/localStorageService';
import { GlassCard } from '../ui/GlassCard';
import toast from 'react-hot-toast';

interface AICoachViewProps {
  trades: Trade[];
  selfEntries: SelfJournalEntry[];
  knowledge: KnowledgeItem[];
  metrics: TradingMetrics;
  userId?: string | null;
}

const PROVIDERS: {
  id: AIProvider;
  name: string;
  badge: string;
  defaultModel: string;
  popularModels: string[];
  placeholder: string;
  docUrl: string;
  description: string;
}[] = [
  {
    id: 'claude',
    name: 'Anthropic Claude',
    badge: 'Claude 3.7 Sonnet',
    defaultModel: 'claude-3-7-sonnet-20250219',
    popularModels: [
      'claude-3-7-sonnet-20250219',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
    ],
    placeholder: 'sk-ant-...',
    docUrl: 'https://console.anthropic.com/settings/keys',
    description: 'Anthropic’s latest flagship with hybrid reasoning architecture.',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    badge: 'DeepSeek R1 & V3',
    defaultModel: 'deepseek-reasoner',
    popularModels: [
      'deepseek-reasoner',
      'deepseek-chat',
    ],
    placeholder: 'sk-...',
    docUrl: 'https://platform.deepseek.com/api_keys',
    description: 'State-of-the-art DeepSeek R1 reasoning and quantitative logic.',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    badge: 'o3-mini & GPT-4o',
    defaultModel: 'o3-mini',
    popularModels: [
      'o3-mini',
      'gpt-4o',
      'o1',
      'gpt-4o-mini',
    ],
    placeholder: 'sk-...',
    docUrl: 'https://platform.openai.com/api-keys',
    description: 'Latest high-speed STEM reasoning (o3-mini) and flagship GPT-4o.',
  },
  {
    id: 'groq',
    name: 'Groq (LPU Speed)',
    badge: 'DeepSeek R1 & Llama 3.3',
    defaultModel: 'deepseek-r1-distill-llama-70b',
    popularModels: [
      'deepseek-r1-distill-llama-70b',
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
    ],
    placeholder: 'gsk_...',
    docUrl: 'https://console.groq.com/keys',
    description: 'Sub-second real-time inference running DeepSeek R1 and Llama 3.3.',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    badge: 'Gemini 2.0 Flash',
    defaultModel: 'gemini-2.0-flash',
    popularModels: [
      'gemini-2.0-flash',
      'gemini-2.0-flash-thinking-exp-01-21',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
    ],
    placeholder: 'AIzaSy...',
    docUrl: 'https://aistudio.google.com/app/apikey',
    description: 'Google’s next-gen 2.0 Flash and Flash-Thinking reasoning models.',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    badge: 'Claude 3.7 & DeepSeek R1',
    defaultModel: 'anthropic/claude-3.7-sonnet',
    popularModels: [
      'anthropic/claude-3.7-sonnet',
      'deepseek/deepseek-r1',
      'openai/o3-mini',
      'google/gemini-2.0-flash-001',
      'meta-llama/llama-3.3-70b-instruct',
    ],
    placeholder: 'sk-or-...',
    docUrl: 'https://openrouter.ai/keys',
    description: 'Access Claude 3.7, DeepSeek R1, and o3-mini through one endpoint.',
  },
  {
    id: 'custom',
    name: 'Custom / Local LLM',
    badge: 'Ollama & LM Studio',
    defaultModel: 'default',
    popularModels: ['default', 'deepseek-r1', 'llama3.3', 'qwen2.5'],
    placeholder: 'Optional API Bearer token',
    docUrl: 'https://ollama.com',
    description: 'Run completely private models on your local machine.',
  },
];

const DEFAULT_WELCOME_MESSAGE: AIChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    "👋 Welcome back! I'm your TradeX AI Coach. I've audited your trade logs, trading notes, and knowledge playbooks.\n\nAsk me anything about your behavioral leaks, revenge trade risks, or risk-to-reward metrics.",
  timestamp: 'Just now',
  suggestions: [
    'What is my biggest trading leak?',
    'Did I follow my Knowledge Hub rules?',
    'Analyze my risk-to-reward ratio',
    'How can I stop revenge trading?',
  ],
};

export const AICoachView: React.FC<AICoachViewProps> = ({
  trades,
  selfEntries,
  knowledge,
  metrics,
  userId,
}) => {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [messages, setMessages] = useState<AIChatMessage[]>(() => {
    const stored = getStoredAIChatMessages();
    return stored.length > 0 ? stored : [DEFAULT_WELCOME_MESSAGE];
  });
  const [effectiveUserId, setEffectiveUserId] = useState<string | null>(userId || null);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // BYOK Settings State
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [aiConfig, setAiConfig] = useState<AIConfig>(getAIConfig());
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>(aiConfig.provider);
  const [apiKeyInput, setApiKeyInput] = useState(aiConfig.apiKey);
  const [modelInput, setModelInput] = useState(aiConfig.model);
  const [customBaseUrl, setCustomBaseUrl] = useState(aiConfig.customBaseUrl || 'http://localhost:11434/v1');
  const [showKeyText, setShowKeyText] = useState(false);

  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Generate initial insights
  useEffect(() => {
    const generated = generateAIInsights(trades, selfEntries, knowledge);
    setInsights(generated);
  }, [trades, selfEntries, knowledge]);

  useEffect(() => {
    const current = getAIConfig();
    setAiConfig(current);
    setSelectedProvider(current.provider);
    setApiKeyInput(current.apiKey);
    setModelInput(current.model);
    setCustomBaseUrl(current.customBaseUrl || 'http://localhost:11434/v1');
  }, []);

  // Sync user ID session
  useEffect(() => {
    if (userId) {
      setEffectiveUserId(userId);
    } else {
      const user = localStorageService.getCurrentUser();
      if (user?.id) {
        setEffectiveUserId(user.id);
      }
    }
  }, [userId]);

  // Sync AI chats with Supabase cloud when user authenticates
  useEffect(() => {
    if (!effectiveUserId) return;
    setIsCloudSyncing(true);
    syncAIChatMessagesWithCloud(effectiveUserId)
      .then((synced) => {
        if (synced && synced.length > 0) {
          setMessages(synced);
        }
      })
      .finally(() => {
        setIsCloudSyncing(false);
      });
  }, [effectiveUserId]);

  // Real-time synchronization listener: if mobile or another tab inserts a message
  useEffect(() => {
    const handleRemoteSync = () => {
      const stored = getStoredAIChatMessages();
      if (stored.length > 0) {
        setMessages(stored);
      }
    };
    window.addEventListener('tradex_ai_chats_synced', handleRemoteSync);
    return () => window.removeEventListener('tradex_ai_chats_synced', handleRemoteSync);
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleProviderSelect = (pId: AIProvider) => {
    setSelectedProvider(pId);
    const providerDef = PROVIDERS.find((p) => p.id === pId);
    if (providerDef) {
      setModelInput(providerDef.defaultModel);
    }
  };

  const handleSaveConfig = () => {
    const newConfig: AIConfig = {
      provider: selectedProvider,
      apiKey: apiKeyInput.trim(),
      model: modelInput.trim(),
      customBaseUrl: customBaseUrl.trim(),
    };
    saveAIConfig(newConfig);
    setAiConfig(newConfig);
    setShowKeyModal(false);

    if (newConfig.apiKey) {
      toast.success(`${PROVIDERS.find((p) => p.id === selectedProvider)?.name} (${newConfig.model}) connected!`);
    } else {
      toast.success('Key cleared. Built-in smart heuristics active.');
    }
  };

  const handleClearKey = () => {
    const cleared: AIConfig = {
      ...DEFAULT_AI_CONFIG,
      provider: selectedProvider,
      apiKey: '',
    };
    saveAIConfig(cleared);
    setAiConfig(cleared);
    setApiKeyInput('');
    setShowKeyModal(false);
    toast.success('API key removed. Running on smart local heuristics.');
  };

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim()) return;

    const userMsg: AIChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsTyping(true);

    // Save user message immediately to local & Supabase
    saveAIChatMessage(userMsg, effectiveUserId);

    try {
      const response = await queryAICoach(textToSend, {
        trades,
        selfEntries,
        knowledge,
        metrics,
      });

      const aiMsg: AIChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
      // Save AI reply immediately to local & Supabase
      saveAIChatMessage(aiMsg, effectiveUserId);
    } catch (e) {
      toast.error('AI assistant encountered an issue analyzing your query.');
    } finally {
      setIsTyping(false);
    }
  };

  const handleClearChat = async () => {
    if (
      !window.confirm(
        'Are you sure you want to clear your AI chat history? This will delete conversations across all connected devices (Mobile & PC).'
      )
    ) {
      return;
    }
    await clearAIChatMessages(effectiveUserId);
    setMessages([
      {
        ...DEFAULT_WELCOME_MESSAGE,
        content: "Chat history cleared across devices. I'm ready to evaluate your trade logs or execution rules.",
        timestamp: 'Just now',
      },
    ]);
    toast.success('AI chat history cleared across all devices.');
  };

  const avgDiscipline = selfEntries.length
    ? (selfEntries.reduce((acc, e) => acc + e.disciplineScore, 0) / selfEntries.length).toFixed(1)
    : '9.0';

  const leakCount = insights.filter((i) => i.type === 'leak').length;

  const currentProviderDef = PROVIDERS.find((p) => p.id === aiConfig.provider) || PROVIDERS[0];
  const activeProviderObj = PROVIDERS.find((p) => p.id === selectedProvider) || PROVIDERS[0];
  const hasLiveKey = Boolean(aiConfig.apiKey?.trim());

  return (
    <div className="space-y-6">
      {/* Top Header & Summary Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shadow-lg shadow-primary/20">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  AI Coach & Leak Analyzer
                </h1>
                <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border ${
                  hasLiveKey
                    ? 'bg-primary/20 border-primary/40 text-primary shadow-sm'
                    : 'bg-white/10 border-white/15 text-slate-200'
                }`}>
                  {hasLiveKey ? `${currentProviderDef.name}: ${aiConfig.model} Active` : 'Smart Heuristics (Offline Active)'}
                </span>
              </div>
              <p className="text-xs text-slate-200 mt-0.5">
                Tri-source intelligence connecting Trade Logs + Trading Notes + Knowledge Hub
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowKeyModal(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-black/70 border border-white/20 text-xs font-bold text-white hover:border-primary hover:text-primary transition-all self-start sm:self-auto shadow-md"
        >
          <Sliders className="w-4 h-4 text-primary" />
          <span>{hasLiveKey ? 'BYOK Settings (Active)' : 'Connect AI Key (BYOK)'}</span>
        </button>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <GlassCard className="!p-4 text-center">
          <p className="text-xs font-semibold text-slate-300 mb-1">Discipline Score</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-primary">{avgDiscipline}/10</p>
          <p className="text-[11px] text-slate-200 mt-1">Self Journal Check-in</p>
        </GlassCard>

        <GlassCard className="!p-4 text-center">
          <p className="text-xs font-semibold text-slate-300 mb-1">Detected Leaks</p>
          <p className={`text-2xl sm:text-3xl font-extrabold ${leakCount > 0 ? 'text-danger' : 'text-success'}`}>
            {leakCount}
          </p>
          <p className="text-[11px] text-slate-200 mt-1">Behavioral vulnerabilities</p>
        </GlassCard>

        <GlassCard className="!p-4 text-center">
          <p className="text-xs font-semibold text-slate-300 mb-1">Realized R-Factor</p>
          <p className={`text-2xl sm:text-3xl font-extrabold ${metrics.rFactor >= 0 ? 'text-success' : 'text-danger'}`}>
            {metrics.rFactor >= 0 ? '+' : ''}{metrics.rFactor.toFixed(2)}R
          </p>
          <p className="text-[11px] text-slate-200 mt-1">Cumulative risk payout</p>
        </GlassCard>

        <GlassCard className="!p-4 text-center">
          <p className="text-xs font-semibold text-slate-300 mb-1">Strategy Compliance</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-primary">
            {metrics.winningTrades > 0 ? '100%' : 'Audit Ready'}
          </p>
          <p className="text-[11px] text-slate-200 mt-1">Knowledge Hub alignment</p>
        </GlassCard>
      </div>

      {/* Main Grid: Insights on Left, Interactive Chat on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: AI Insight Feed */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Pattern Recognition & Edge Audits
            </h2>
            <span className="text-xs text-slate-300 font-semibold">{insights.length} active insights</span>
          </div>

          <div className="space-y-3">
            {insights.map((insight) => {
              const isLeak = insight.type === 'leak';
              const isStrength = insight.type === 'strength';

              const cardBorder = isLeak
                ? 'border-danger/35 bg-danger/5'
                : isStrength
                ? 'border-primary/35 bg-primary/5'
                : 'border-white/15 bg-white/5';

              const Icon = isLeak ? AlertTriangle : isStrength ? TrendingUp : Lightbulb;
              const iconColor = isLeak ? 'text-danger' : isStrength ? 'text-primary' : 'text-cyan-400';

              return (
                <GlassCard key={insight.id} className={`!p-4 border ${cardBorder}`}>
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-black/60 border border-white/10 shrink-0">
                      <Icon className={`w-4 h-4 ${iconColor}`} />
                    </div>
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-bold text-white truncate">{insight.title}</h3>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-black/60 border border-white/10 text-slate-200 shrink-0">
                          {insight.type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed font-medium">{insight.description}</p>
                      {insight.metricImpact && (
                        <p className="text-[11px] font-bold text-slate-300">
                          Impact: <span className="text-white">{insight.metricImpact}</span>
                        </p>
                      )}
                      <div className="pt-2 border-t border-white/10">
                        <p className="text-xs text-primary font-semibold flex items-start gap-1.5">
                          <Target className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>Tip: {insight.actionableTip}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </div>

        {/* Right: Interactive AI Coach Chat */}
        <div className="lg:col-span-7">
          <GlassCard className="!p-4 sm:!p-5 flex flex-col h-[580px] border border-white/15">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                <h2 className="text-sm font-bold text-white">Interactive Trading Psychologist & Auditor</h2>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[10px] text-emerald-400 font-medium">
                  <span className={`w-1.5 h-1.5 rounded-full bg-emerald-400 ${isCloudSyncing ? 'animate-spin' : 'animate-pulse'}`} />
                  <span>{effectiveUserId ? 'Cloud Synced (Mobile & PC)' : 'Local Mode'}</span>
                </div>

                <button
                  onClick={handleClearChat}
                  className="flex items-center gap-1 text-slate-300 hover:text-rose-400 px-2 py-1 rounded-lg hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/30 text-xs transition-colors"
                  title="Clear conversation history across devices"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Clear Chat</span>
                </button>
              </div>
            </div>

            {/* Chat Scroll Area */}
            <div className="flex-1 overflow-y-auto space-y-4 py-3 pr-1 text-xs sm:text-sm">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-primary text-black font-semibold shadow-md'
                        : 'bg-black/70 border border-white/15 text-slate-100 shadow-md whitespace-pre-wrap'
                    }`}
                  >
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-slate-300 mt-1 px-1">{msg.timestamp}</span>

                  {/* Suggestion Chips */}
                  {msg.suggestions && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5 max-w-[95%]">
                      {msg.suggestions.map((chip, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(chip)}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-white/10 border border-white/15 text-slate-200 hover:text-white hover:border-primary hover:bg-primary/10 transition-all text-left font-medium"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {isTyping && (
                <div className="flex items-center gap-2 p-3 bg-black/60 border border-white/15 rounded-2xl w-24">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.4s]" />
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Query Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2"
            >
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Ask your AI coach anything about your trades, notes, or rules..."
                className="flex-1 bg-black/80 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-primary shadow-inner"
              />
              <button
                type="submit"
                disabled={!inputQuery.trim() || isTyping}
                className="w-10 h-10 rounded-xl bg-primary text-black flex items-center justify-center shrink-0 disabled:opacity-50 hover:bg-primary-light transition-colors font-bold shadow-md"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </GlassCard>
        </div>
      </div>

      {/* Universal Multi-Provider BYOK Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-neutral-950 border border-white/20 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    BYOK: Plug In Any AI Platform Key
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Direct client-side connection to the newest 2025/2026 reasoning models
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowKeyModal(false)}
                className="text-slate-300 hover:text-white text-lg p-1"
              >
                ✕
              </button>
            </div>

            {/* Provider Grid */}
            <div>
              <label className="block text-xs font-bold text-white mb-2">
                Select Your AI Provider
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PROVIDERS.map((p) => {
                  const isSelected = selectedProvider === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleProviderSelect(p.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-primary/20 border-primary text-white shadow-md'
                          : 'bg-black/60 border-white/15 text-slate-300 hover:border-white/30 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-bold truncate">{p.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                      </div>
                      <p className="text-[10px] text-slate-400 truncate">{p.badge}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* API Key Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-white">
                  {activeProviderObj.name} API Key
                </label>
                <a
                  href={activeProviderObj.docUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-primary hover:underline flex items-center gap-1 font-semibold"
                >
                  <span>Get Key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="relative">
                <input
                  type={showKeyText ? 'text' : 'password'}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder={activeProviderObj.placeholder}
                  className="w-full bg-black/90 border border-white/20 rounded-xl pl-3.5 pr-10 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-primary font-mono shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowKeyText(!showKeyText)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showKeyText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Latest Models Presets & Identifier */}
            <div>
              <label className="block text-xs font-bold text-white mb-1.5">
                Model Identifier
              </label>

              {/* Quick Model Chips */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {activeProviderObj.popularModels.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setModelInput(m)}
                    className={`text-[11px] px-2 py-0.5 rounded-lg border font-mono transition-all ${
                      modelInput === m
                        ? 'bg-primary text-black border-primary font-bold'
                        : 'bg-black/60 border-white/15 text-slate-300 hover:text-white hover:border-white/30'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={modelInput}
                onChange={(e) => setModelInput(e.target.value)}
                placeholder="e.g. claude-3-7-sonnet-20250219, o3-mini, deepseek-reasoner..."
                className="w-full bg-black/90 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-primary font-mono shadow-inner"
              />
              <p className="text-[11px] text-slate-300 mt-1">
                Click any preset chip above or type any model identifier supported by your provider account.
              </p>
            </div>

            {/* Custom Base URL (Visible if provider === 'custom') */}
            {selectedProvider === 'custom' && (
              <div>
                <label className="block text-xs font-bold text-white mb-1.5">
                  Base URL (OpenAI-compatible)
                </label>
                <input
                  type="text"
                  value={customBaseUrl}
                  onChange={(e) => setCustomBaseUrl(e.target.value)}
                  placeholder="http://localhost:11434/v1"
                  className="w-full bg-black/90 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-primary font-mono"
                />
              </div>
            )}

            {/* Security Notice */}
            <div className="p-3 rounded-xl bg-black/60 border border-white/10 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Your API key is stored securely in your browser’s <span className="text-white font-semibold">LocalStorage</span>. Requests are sent directly to the provider. If no key is configured, TradeX uses its built-in local smart heuristics.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={handleClearKey}
                className="text-xs font-bold text-danger hover:underline"
              >
                Clear Key (Use Local Offline)
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  className="primary-button px-5 py-2 text-xs font-bold shadow-lg"
                >
                  Save & Connect
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AICoachView;
