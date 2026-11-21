import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Toaster, toast, ToastBar } from 'react-hot-toast';
import { X, ClipboardList, Brain, UserCheck, BookOpen, FileText, Download } from 'lucide-react';
import { Header } from './components/layout/Header';
import { WelcomeModal } from './components/auth/WelcomeModal';
import { AuthLayout } from './components/auth/AuthLayout';
import { TradingCapitalCard } from './components/dashboard/TradingCapitalCard';
import { MetricsGrid } from './components/dashboard/MetricsGrid';
import { SetupExpectancyTracker } from './components/dashboard/SetupExpectancyTracker';

import { LoadingSpinner } from './components/ui/LoadingSpinner';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { TradingCapitalCardSkeleton } from './components/ui/TradingCapitalCardSkeleton';
import { MetricsGridSkeleton } from './components/ui/MetricsGridSkeleton';
import { ChartSkeleton } from './components/ui/ChartSkeleton';
import { Trade, TradingMetrics, JournalFilterStatus, TradingSetup } from './types/trading';
import {
  LOT_SIZES,
  calculateRiskRewardRatio,
  calculatePnL,
  calculateQuantity,
  calculateMargin,
  calculateFees,
  toCamelCase,
  toSnakeCase,
} from './utils/tradingCalculations';
import { localStorageService as localData } from './lib/localStorageService';
import { supabase } from './lib/supabase';
import { supabaseDataService } from './lib/supabaseDataService';
import { secureStorage } from './lib/secureStorage';
import { DEMO_USER_ID, DEMO_CAPITAL, DEMO_TRADES } from './utils/demoData';
import { exportToExcelWorkbook, parseExcelOrCsvFile } from './utils/excelExportImport';
import { DeltaExchangeModal } from './components/modals/DeltaExchangeModal';
import { deltaExchange, DeltaCapitalInfo } from './lib/deltaExchange';
import { ExchangeRateProvider } from './contexts/ExchangeRateContext';
import { MarketType, isSymbolInMarket } from './utils/market';
import { Waves } from './components/ui/reactbits';
import { getSelfJournalEntries, getKnowledgeItems, syncTradingNotesWithCloud, syncKnowledgeWithCloud, syncAIChatMessagesWithCloud } from './utils/aiJournalStorage';
import { SelfJournalEntry, KnowledgeItem } from './types/aiJournal';

const PerformanceCharts = React.lazy(() => import('./components/performance/PerformanceCharts'));
const PositionCalculator = React.lazy(() =>
  import('./components/calculator/PositionCalculator').then((m) => ({ default: m.PositionCalculator }))
);
const TradeHistoryTable = React.lazy(() =>
  import('./components/journal/TradeHistoryTable').then((m) => ({ default: m.TradeHistoryTable }))
);
const EmptyJournal = React.lazy(() =>
  import('./components/journal/EmptyJournal').then((m) => ({ default: m.EmptyJournal }))
);
const AICoachView = React.lazy(() =>
  import('./components/ai/AICoachView').then((m) => ({ default: m.AICoachView }))
);
const TradingNotesView = React.lazy(() =>
  import('./components/notes/TradingNotesView').then((m) => ({ default: m.TradingNotesView }))
);
const SelfJournalView = React.lazy(() =>
  import('./components/self-journal/SelfJournalView').then((m) => ({ default: m.SelfJournalView }))
);
const KnowledgeHubView = React.lazy(() =>
  import('./components/knowledge-hub/KnowledgeHubView').then((m) => ({ default: m.KnowledgeHubView }))
);
const AddTradeModal = React.lazy(() =>
  import('./components/modals/AddTradeModal').then((m) => ({ default: m.AddTradeModal }))
);
const EditTradeModal = React.lazy(() =>
  import('./components/modals/EditTradeModal').then((m) => ({ default: m.EditTradeModal }))
);
const CloseTradeModal = React.lazy(() =>
  import('./components/modals/CloseTradeModal').then((m) => ({ default: m.CloseTradeModal }))
);
const DeleteConfirmationModal = React.lazy(() =>
  import('./components/modals/DeleteConfirmationModal').then((m) => ({ default: m.DeleteConfirmationModal }))
);
const ResetJournalModal = React.lazy(() =>
  import('./components/modals/ResetJournalModal').then((m) => ({ default: m.ResetJournalModal }))
);
const ManageSetupsModal = React.lazy(() =>
  import('./components/modals/ManageSetupsModal').then((m) => ({ default: m.ManageSetupsModal }))
);
const EXCHANGE_RATE_STORAGE_KEY = 'tradex_usd_to_inr_rate';


function App() {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const marketMode: MarketType = 'crypto';
  const [usdToInrRate, setUsdToInrRate] = useState<number>(() => {
    const stored = localStorage.getItem(EXCHANGE_RATE_STORAGE_KEY);
    const parsed = stored ? Number(stored) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 85.7;
  });

  const [journalSubTab, setJournalSubTab] = useState<'trades' | 'aiCoach' | 'selfJournal' | 'knowledgeHub'>('trades');
  const [selfEntries, setSelfEntries] = useState<SelfJournalEntry[]>(() => getSelfJournalEntries());
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>(() => getKnowledgeItems());

  const refreshSelfEntries = useCallback(() => {
    setSelfEntries(getSelfJournalEntries());
  }, []);

  const refreshKnowledge = useCallback(() => {
    setKnowledgeItems(getKnowledgeItems());
  }, []);

  const [tradingCapital, setTradingCapital] = useState(0);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'syncing' | 'offline'>('syncing');

  const [isDeltaModalOpen, setIsDeltaModalOpen] = useState(false);
  const [isDeltaConfigured, setIsDeltaConfigured] = useState(() => deltaExchange.isConfigured());
  const [modalState, setModalState] = useState({ add: false, edit: false, close: false, delete: false, resetJournal: false });
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [tradingSetups, setTradingSetups] = useState<TradingSetup[]>(() => localData.getTradingSetups());
  const [isManageSetupsModalOpen, setIsManageSetupsModalOpen] = useState(false);

  const handleDeltaTradesUpdated = useCallback(async (
    updatedTrades: Trade[],
    capitalInfo?: DeltaCapitalInfo,
    deletedTradeIds?: string[]
  ) => {
    // 1. Merge and preserve all user-assigned setups from ALL sources:
    // a. persistent setup map (rock-solid primary anchor)
    // b. tradesRef.current (in-memory state)
    // c. local trades cache
    const persistentMap = userId ? localData.getTradeSetupsMap(userId) : {};
    const setupsMap = new Map<string, string>(Object.entries(persistentMap));

    tradesRef.current.forEach((t) => {
      if (t.setup) {
        setupsMap.set(t.id, t.setup);
        if (t.tradeGroupId) setupsMap.set(t.tradeGroupId, t.setup);
      }
    });

    if (userId) {
      try {
        localData.getLocalTrades(userId).forEach((t) => {
          if (t.setup) {
            if (!setupsMap.has(t.id)) setupsMap.set(t.id, t.setup);
            if (t.tradeGroupId && !setupsMap.has(t.tradeGroupId)) setupsMap.set(t.tradeGroupId, t.setup);
          }
        });
      } catch {}
    }

    const mergedTrades = updatedTrades.map((t) => {
      const resolved = t.setup || setupsMap.get(t.id) || (t.tradeGroupId ? setupsMap.get(t.tradeGroupId) : undefined);
      if (resolved && t.setup !== resolved) {
        return { ...t, setup: resolved };
      }
      return t;
    });

    setTrades(mergedTrades);
    tradesRef.current = mergedTrades;

    // Automatically sync and update capital from Delta Exchange (including multiple deposits)
    if (capitalInfo && capitalInfo.recommendedCapital > 0) {
      setTradingCapital(prev => {
        if (prev === 0 || !prev || (capitalInfo.recommendedCapital !== prev && (capitalInfo.depositCount || 0) > 0)) {
          const newCap = capitalInfo.recommendedCapital;
          if (userId && userId !== DEMO_USER_ID) {
            if (supabase) supabaseDataService.saveUserCapital(newCap, userId).catch(() => {});
          }
          const depText = capitalInfo.depositCount > 1 ? ` (${capitalInfo.depositCount} deposits combined)` : '';
          toast.success(`Delta Capital synced: $${newCap.toLocaleString()} total capital added${depText}!`);
          return newCap;
        }
        return prev;
      });
    }

    if (userId && userId !== DEMO_USER_ID) {
      // 1. Immediately cache locally so page reload NEVER loses trades even before network roundtrip
      try {
        const localCap = capitalInfo?.recommendedCapital ?? tradingCapital;
        localData.saveLocalTrades(userId, mergedTrades);
        if (localCap) localData.saveLocalCapital(userId, localCap);
      } catch (err) {
        console.warn('Local trades cache save failed:', err);
      }

      // 2. Persist to Supabase with automatic UUID mapping
      if (supabase) {
        try {
          if (deletedTradeIds && deletedTradeIds.length > 0) {
            await supabaseDataService.deleteTradesBulk(deletedTradeIds, userId);
          }
          await supabaseDataService.saveTradesBulk(mergedTrades, userId);
        } catch (e) {
          console.warn('Delta trades cloud sync error:', e);
        }
      }
    }
  }, [userId, tradingCapital]);

  // Enforce clean TradeX document title for tabs and bookmarks
  useEffect(() => {
    document.title = 'TradeX';
  }, []);

  // Pre-load Delta Exchange products (contract values and specs) for dynamic conversions
  useEffect(() => {
    deltaExchange.loadProducts().catch(() => {});
  }, []);

  const tradesRef = useRef(trades);
  useEffect(() => {
    tradesRef.current = trades;
  }, [trades]);

  // Real-Time WebSocket Streaming & Immediate Auto-Sync from Delta Exchange India
  useEffect(() => {
    setIsDeltaConfigured(deltaExchange.isConfigured());
    if (!sessionChecked) return;

    deltaExchange.startAutoSync(
      () => tradesRef.current,
      (newTrades, capitalInfo, deletedTradeIds) => {
        const oldTradeIds = new Set(tradesRef.current.map((t) => t.id));
        const addedTrades = newTrades.filter((t) => !oldTradeIds.has(t.id));

        handleDeltaTradesUpdated(newTrades, capitalInfo, deletedTradeIds);

        if (addedTrades.length > 0) {
          const first = addedTrades[0];
          const sideText = first.side.toUpperCase();
          const pnlText =
            first.status === 'closed' && typeof first.netPnl === 'number'
              ? ` | PnL: ${first.netPnl >= 0 ? '+$' : '-$'}${Math.abs(first.netPnl).toFixed(2)}`
              : '';
          toast.success(
            `⚡ Instant Auto-Log: ${first.symbol} ${sideText} (${first.quantity} qty) @ $${first.entryPrice.toLocaleString()}${pnlText}!`,
            { id: `trade-autolog-${first.id}`, duration: 5000 }
          );
        }
      }
    );
    return () => deltaExchange.stopAutoSync();
  }, [handleDeltaTradesUpdated, sessionChecked]);

  const [selectedTradeIds, setSelectedTradeIds] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<JournalFilterStatus>('all');
  const [filterDate, setFilterDate] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const pendingDeleteTimersRef = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const sortedTrades = useMemo(() => {
    return [...trades].sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());
  }, [trades]);

  const dashboardTrades = trades;

  const isDemo = userId === DEMO_USER_ID;
  const loadAndPrepareUserData = useCallback(async (currentUserId: string) => {
    setIsDataLoading(true);

    try {
      // 1. Check if user is in Demo Mode
      if (currentUserId === DEMO_USER_ID) {
        setTradingCapital(DEMO_CAPITAL);
        setTrades(DEMO_TRADES);
        setShowWelcomeModal(false);
        setRealtimeStatus('connected');
        return;
      }

      // 2. Real Authenticated User: Load from Supabase first
      if (supabase) {
        try {
          // Sync custom setups & persistent trade setups map from cloud across devices
          try {
            const [cloudSetups, cloudSetupMap] = await Promise.all([
              supabaseDataService.fetchTradingSetups(currentUserId),
              supabaseDataService.fetchTradeSetupsMap(currentUserId),
            ]);

            if (cloudSetups !== null) {
              setTradingSetups(cloudSetups);
              localData.saveTradingSetups(cloudSetups);
            }
            if (cloudSetupMap && Object.keys(cloudSetupMap).length > 0) {
              localData.batchSaveTradeSetupMappings(cloudSetupMap, currentUserId);
            }
          } catch (setupErr) {
            console.warn('Setups cloud sync warning:', setupErr);
          }

          const [rawCloudTrades, cloudCapital] = await Promise.all([
            supabaseDataService.fetchUserTrades(currentUserId),
            supabaseDataService.fetchUserCapital(currentUserId),
          ]);

          // Enrich cloud trades with the persistent setup mapping so setups never disappear
          const persistentMap = localData.getTradeSetupsMap(currentUserId);
          const cloudTrades = rawCloudTrades.map((t) => {
            const resolved = t.setup || persistentMap[t.id] || (t.tradeGroupId ? persistentMap[t.tradeGroupId] : undefined);
            return resolved ? { ...t, setup: resolved } : t;
          });

          // Automatically purge legacy phantom zero-price / duplicate Delta bracket orders from DB
          const phantomIds = cloudTrades
            .filter((t) => t.id.startsWith('delta_order_') && (t.entryPrice <= 0 || !t.exitPrice || (t.grossPnl === 0 && t.entryPrice === t.exitPrice)))
            .map((t) => t.id);

          const sanitizedTrades = phantomIds.length > 0
            ? cloudTrades.filter((t) => !phantomIds.includes(t.id))
            : cloudTrades;

          if (phantomIds.length > 0) {
            supabaseDataService.deleteTradesBulk(phantomIds, currentUserId).catch(() => {});
          }

          if (sanitizedTrades.length > 0 || cloudCapital > 0) {
            setTrades(sanitizedTrades);
            setTradingCapital(cloudCapital);
            setShowWelcomeModal(false);
            setRealtimeStatus('connected');
            // Sync local storage backup for instant offline access safely
            try {
              localData.saveLocalTrades(currentUserId, sanitizedTrades);
              localData.saveLocalCapital(currentUserId, cloudCapital);
            } catch (cacheErr) {
              console.warn('Offline cache write warning:', cacheErr);
            }
            return;
          } else {
            // Cloud returned 0 trades; check local storage to recover any pre-existing synced trades
            const localFallback = await localData.loadUserData(currentUserId);
            if (localFallback.trades && localFallback.trades.length > 0) {
              const localPhantoms = localFallback.trades
                .filter((t) => t.id.startsWith('delta_order_') && (t.entryPrice <= 0 || !t.exitPrice || (t.grossPnl === 0 && t.entryPrice === t.exitPrice)))
                .map((t) => t.id);
              const sanitizedLocal = localPhantoms.length > 0
                ? localFallback.trades.filter((t) => !localPhantoms.includes(t.id))
                : localFallback.trades;

              setTrades(sanitizedLocal);
              setTradingCapital(localFallback.capital || 0);
              setShowWelcomeModal(false);
              setRealtimeStatus('connected');

              // Auto-push recovered local trades to Supabase cloud
              supabaseDataService.saveTradesBulk(sanitizedLocal, currentUserId).catch(() => {});
              if (localFallback.capital) {
                supabaseDataService.saveUserCapital(localFallback.capital, currentUserId).catch(() => {});
              }
              return;
            }
          }

          setTrades(sanitizedTrades);
          setTradingCapital(cloudCapital);
          setShowWelcomeModal(cloudCapital === 0 && sanitizedTrades.length === 0);
          setRealtimeStatus('connected');
          return;
        } catch (cloudErr) {
          console.warn('Supabase fetch failed, trying local fallback:', cloudErr);
        }
      }

      // 3. Fallback to local storage
      const data = await localData.loadUserData(currentUserId);
      const phantomIds = (data.trades || [])
        .filter((t) => t.id.startsWith('delta_order_') && (t.entryPrice <= 0 || !t.exitPrice || (t.grossPnl === 0 && t.entryPrice === t.exitPrice)))
        .map((t) => t.id);
      const sanitizedFallbackTrades = phantomIds.length > 0
        ? data.trades.filter((t) => !phantomIds.includes(t.id))
        : data.trades;

      setTradingCapital(data.capital);
      setShowWelcomeModal(data.capital === 0 && sanitizedFallbackTrades.length === 0);
      setTrades(sanitizedFallbackTrades);
    } catch (error) {
      console.error("Data loading error:", error);
      toast.error((error as Error).message || "Failed to load data.");
    } finally {
      setIsDataLoading(false);
    }
  }, []);

  useEffect(() => {
    // 1. Check Supabase auth if configured
    let subscription: { unsubscribe: () => void } | null = null;

    if (supabase) {
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (session?.user) {
          setIsAuthenticated(true);
          setUserId(session.user.id);
          setUserEmail(session.user.email ?? null);
          localData.setSession({
            id: session.user.id,
            email: session.user.email || '',
            fullName: session.user.user_metadata?.full_name || '',
          });

          // Initialize E2EE Vault and sync encrypted credentials from cloud
          try {
            await secureStorage.setUserContext(session.user.id, session.user.email || '');
            const synced = await secureStorage.syncFromCloud(session.user.user_metadata);
            if (synced) {
              const deltaCreds = await deltaExchange.reloadCredentials();
              setIsDeltaConfigured(Boolean(deltaCreds.apiKey && deltaCreds.apiSecret));
            }
          } catch (vaultErr) {
            console.warn('E2EE Vault sync on session start:', vaultErr);
          }

          if (Array.isArray(session.user.user_metadata?.trading_setups)) {
            const cloudSetups = session.user.user_metadata.trading_setups as TradingSetup[];
            setTradingSetups(cloudSetups);
            localData.saveTradingSetups(cloudSetups);
          }
        } else {
          const localUser = localData.getCurrentUser();
          if (localUser) {
            setIsAuthenticated(true);
            setUserId(localUser.id);
            setUserEmail(localUser.email);
          } else {
            setIsAuthenticated(false);
            setUserId(null);
            setUserEmail(null);
          }
        }
        setSessionChecked(true);
      });

      const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          setIsAuthenticated(true);
          setUserId(session.user.id);
          setUserEmail(session.user.email ?? null);
          localData.setSession({
            id: session.user.id,
            email: session.user.email || '',
            fullName: session.user.user_metadata?.full_name || '',
          });

          // Initialize E2EE Vault and sync encrypted credentials from cloud
          try {
            await secureStorage.setUserContext(session.user.id, session.user.email || '');
            const synced = await secureStorage.syncFromCloud(session.user.user_metadata);
            if (synced) {
              const deltaCreds = await deltaExchange.reloadCredentials();
              setIsDeltaConfigured(Boolean(deltaCreds.apiKey && deltaCreds.apiSecret));
            }
          } catch (vaultErr) {
            console.warn('E2EE Vault sync on auth change:', vaultErr);
          }

          if (Array.isArray(session.user.user_metadata?.trading_setups)) {
            const cloudSetups = session.user.user_metadata.trading_setups as TradingSetup[];
            setTradingSetups(cloudSetups);
            localData.saveTradingSetups(cloudSetups);
          }
        } else {
          const localUser = localData.getCurrentUser();
          if (!localUser) {
            setIsAuthenticated(false);
            setUserId(null);
            setUserEmail(null);
          }
        }
      });
      subscription = data.subscription;
    } else {
      const user = localData.getCurrentUser();
      if (user) {
        setIsAuthenticated(true);
        setUserId(user.id);
        setUserEmail(user.email);
      } else {
        setIsAuthenticated(false);
        setUserId(null);
        setUserEmail(null);
      }
      setSessionChecked(true);
    }

    const unsubAuth = localData.onAuthStateChange((currentUser) => {
      if (currentUser) {
        setIsAuthenticated(true);
        setUserId(currentUser.id);
        setUserEmail(currentUser.email);
      }
    });

    const unsubSync = localData.onSyncStatusChange((status) => {
      setRealtimeStatus(status);
    });

    return () => {
      if (subscription) subscription.unsubscribe();
      unsubAuth();
      unsubSync();
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated && userId) {
      loadAndPrepareUserData(userId);
    } else if (!isAuthenticated && sessionChecked) {
      setTrades([]);
      setTradingCapital(0);
      setShowWelcomeModal(false);
      setIsDataLoading(false);
      setRealtimeStatus('offline');
    }
  }, [isAuthenticated, userId, sessionChecked, loadAndPrepareUserData]);

  // Cross-device sync: reload setups and setups mapping when tab/app regains focus or visibility
  useEffect(() => {
    if (!userId || userId === DEMO_USER_ID) return;

    const syncCrossDevice = async () => {
      try {
        const [cloudSetups, cloudSetupMap] = await Promise.all([
          supabaseDataService.fetchTradingSetups(userId),
          supabaseDataService.fetchTradeSetupsMap(userId),
        ]);

        if (cloudSetups !== null) {
          setTradingSetups(cloudSetups);
          localData.saveTradingSetups(cloudSetups);
        }
        if (cloudSetupMap && Object.keys(cloudSetupMap).length > 0) {
          localData.batchSaveTradeSetupMappings(cloudSetupMap, userId);
          setTrades((prev) => {
            let changed = false;
            const updated = prev.map((t) => {
              const mapped = cloudSetupMap[t.id] || (t.tradeGroupId ? cloudSetupMap[t.tradeGroupId] : undefined);
              if (mapped && t.setup !== mapped) {
                changed = true;
                return { ...t, setup: mapped };
              }
              return t;
            });
            if (changed) {
              tradesRef.current = updated;
              return updated;
            }
            return prev;
          });
        }
      } catch {}
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncCrossDevice();
      }
    };

    window.addEventListener('focus', syncCrossDevice);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', syncCrossDevice);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [userId]);

  const forceScrollTop = useCallback(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  useEffect(() => {
    // On mobile browsers, run scroll reset across a few frames to beat history/page restore timing.
    forceScrollTop();
    const raf1 = requestAnimationFrame(() => {
      forceScrollTop();
      requestAnimationFrame(() => forceScrollTop());
    });
    const timeoutId = setTimeout(forceScrollTop, 140);

    return () => {
      cancelAnimationFrame(raf1);
      clearTimeout(timeoutId);
    };
  }, [activeTab, isDataLoading, forceScrollTop]);

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        forceScrollTop();
      }
    };

    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [forceScrollTop]);

  useEffect(() => {
    const prefetch = () => {
      void import('./components/calculator/PositionCalculator');
      void import('./components/journal/TradeHistoryTable');
      void import('./components/journal/EmptyJournal');
      void import('./components/modals/AddTradeModal');
      void import('./components/modals/EditTradeModal');
      void import('./components/modals/CloseTradeModal');
      void import('./components/modals/DeleteConfirmationModal');
      void import('./components/modals/ResetJournalModal');
      void import('./components/performance/PerformanceCharts');
    };

    if (typeof window === 'undefined') return;

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let idleId: number | undefined;

    if ('requestIdleCallback' in window) {
      idleId = (window as any).requestIdleCallback(prefetch, { timeout: 1200 });
    } else {
      timeoutId = setTimeout(prefetch, 700);
    }

    return () => {
      if (idleId !== undefined && 'cancelIdleCallback' in window) {
        (window as any).cancelIdleCallback(idleId);
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      pendingDeleteTimersRef.current.forEach((timerId) => clearTimeout(timerId));
      pendingDeleteTimersRef.current.clear();
    };
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.warn('Supabase sign out error:', e);
    }
    // Lock vault & wipe secrets from memory
    secureStorage.lockVault();
    localData.signOut();
    setIsAuthenticated(false);
    setUserId(null);
    setUserEmail(null);
    setTrades([]);
    setTradingCapital(0);
    toast.success('Signed out successfully.');
  }, []);

  const handleUpdateExchangeRate = async (rate: number) => {
    if (!Number.isFinite(rate) || rate <= 0) {
      toast.error('Enter a valid conversion rate.');
      return;
    }

    setUsdToInrRate(rate);
    localStorage.setItem(EXCHANGE_RATE_STORAGE_KEY, String(rate));
    toast.success('Conversion rate updated.');
  };

  const handleCapitalUpdate = async (capital: number) => {
    if (!userId) return;

    if (userId !== DEMO_USER_ID) {
      if (supabase) {
        try {
          await supabaseDataService.saveUserCapital(capital, userId);
        } catch (err: any) {
          console.error('Supabase capital update failed:', err);
        }
      }
      try {
        localData.saveLocalCapital(userId, capital);
      } catch {}
    }

    setTradingCapital(capital);
    if (showWelcomeModal) setShowWelcomeModal(false);
    toast.success('Capital updated!');
  };

  const handleAddTrade = useCallback(async (newTradeData: Omit<Trade, 'id' | 'tradeGroupId'>) => {
    if (!userId) return;
    const newId = crypto.randomUUID();
    const trade: Trade = {
      ...newTradeData,
      id: newId,
      tradeGroupId: newId,
      userId,
      riskRewardRatio: calculateRiskRewardRatio(newTradeData),
    };

    if (userId !== DEMO_USER_ID) {
      if (supabase) {
        try {
          await supabaseDataService.saveTrade(trade, userId);
        } catch (err: any) {
          console.error('Supabase trade save failed:', err);
          toast.error('Cloud save failed: ' + err.message);
        }
      }
    }

    setTrades(prev => [trade, ...prev]);
    setModalState(prev => ({ ...prev, add: false }));
    setActiveTab('journal');
    toast.success('Trade added successfully!');
  }, [userId]);

  const handleImportCsv = useCallback(async (file: File) => {
    if (!userId) {
      toast.error('Please sign in before importing.');
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'csv' && ext !== 'xlsx' && ext !== 'xls') {
      toast.error('Please select an Excel (.xlsx/.xls) or CSV file.');
      return;
    }

    try {
      const parsedTrades = await parseExcelOrCsvFile(file, userId);
      if (!parsedTrades.length) {
        toast.error('No valid trade rows found.');
        return;
      }

      if (userId !== DEMO_USER_ID) {
        if (supabase) {
          try {
            await supabaseDataService.saveTradesBulk(parsedTrades, userId);
          } catch (err: any) {
            console.error('Supabase bulk save error:', err);
          }
        }
      }

      setTrades((prev) => [...parsedTrades, ...prev]);
      setActiveTab('journal');
      toast.success(`Successfully imported ${parsedTrades.length} trade(s) from ${file.name}!`);
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(error?.message || 'Unable to import file.');
    }
  }, [userId]);

  const handleExportExcel = useCallback(() => {
    try {
      exportToExcelWorkbook({
        trades,
        capital: tradingCapital,
        selfJournal: selfEntries,
        userEmail,
      });
      toast.success('Downloaded complete trading journal as Excel (.xlsx)!');
    } catch (err: any) {
      toast.error(err.message || 'Export failed.');
    }
  }, [trades, tradingCapital, selfEntries, userEmail]);

  const handleUpdateTrade = useCallback(async (updatedTrade: Trade) => {
    if (!userId) return;
    const tradeWithRR = { ...updatedTrade, riskRewardRatio: calculateRiskRewardRatio(updatedTrade) };

    if (userId !== DEMO_USER_ID) {
      if (supabase) {
        try {
          await supabaseDataService.saveTrade(tradeWithRR, userId);
        } catch (err: any) {
          console.error('Supabase trade update failed:', err);
        }
      }
    }

    setTrades(prev => prev.map(t => t.id === updatedTrade.id ? tradeWithRR : t));
    setModalState(prev => ({ ...prev, edit: false }));
    setSelectedTrade(null);
    toast.success('Trade updated successfully!');
  }, [userId]);

  const handleSaveTradingSetups = useCallback(async (newSetups: TradingSetup[]) => {
    setTradingSetups(newSetups);
    localData.saveTradingSetups(newSetups);

    // Sync to Supabase so all devices (Mobile APK, PC Web) share the exact same custom setups
    if (userId && userId !== DEMO_USER_ID) {
      await supabaseDataService.saveTradingSetups(newSetups, userId);
    }
    toast.success('Trading setups updated!');
  }, [userId]);

  const handleAddNewSetup = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const created = localData.addTradingSetup(trimmed);
    const updated = localData.getTradingSetups();
    setTradingSetups(updated);

    if (userId && userId !== DEMO_USER_ID) {
      supabaseDataService.saveTradingSetups(updated, userId).catch(() => {});
    }

    toast.success(`Created setup: ${created.name}`);
    return created;
  }, [userId]);

  const handleUpdateTradeSetup = useCallback(async (tradeId: string, setup: string) => {
    const normalizedSetup = setup && setup.trim() ? setup.trim() : undefined;

    // 1. Immediately update UI state & synchronously update tradesRef
    setTrades((prev) => {
      const updated = prev.map((t) => (t.id === tradeId ? { ...t, setup: normalizedSetup } : t));
      tradesRef.current = updated;
      return updated;
    });

    const targetTrade =
      tradesRef.current.find((t) => t.id === tradeId) ||
      (userId ? localData.getLocalTrades(userId).find((t) => t.id === tradeId) : undefined);

    const groupId = targetTrade?.tradeGroupId;

    // 2. Persist to local cache immediately AND persistent setup map
    if (userId) {
      try {
        const currentTrades = localData.getLocalTrades(userId);
        const updatedLocal = currentTrades.map((t) =>
          t.id === tradeId ? { ...t, setup: normalizedSetup } : t
        );
        localData.saveLocalTrades(userId, updatedLocal);
        localData.saveTradeSetupMapping(tradeId, normalizedSetup, groupId, userId);
      } catch (e) {
        console.warn('Failed to save trade setup locally:', e);
      }
    }

    // 3. Persist to Supabase cloud immediately
    if (userId && userId !== DEMO_USER_ID && supabase) {
      if (targetTrade) {
        try {
          const tradeWithSetup: Trade = { ...targetTrade, setup: normalizedSetup };
          await supabaseDataService.saveTrade(tradeWithSetup, userId);

          // Also update the persistent cloud setup map
          const currentMap = localData.getTradeSetupsMap(userId);
          supabaseDataService.saveTradeSetupsMap(currentMap, userId).catch(() => {});
        } catch (err: any) {
          console.error('Supabase trade setup update error:', err);
          toast.error('Failed to sync setup tag to cloud');
          return;
        }
      }
    }

    toast.success(normalizedSetup ? `Tagged as "${normalizedSetup}"` : 'Setup unassigned', {
      id: `setup-toast-${tradeId}`,
      duration: 2500,
    });
  }, [userId]);

  const handleDeleteTrade = useCallback(async (tradeId: string) => {
    if (!userId) return;
    const tradeToDelete = trades.find(t => t.id === tradeId) || (selectedTrade?.id === tradeId ? selectedTrade : null);
    if (!tradeToDelete) return;

    setTrades(prev => prev.filter(t => t.id !== tradeId));
    setModalState(prev => ({ ...prev, delete: false }));
    setSelectedTrade(null);

    let undone = false;
    const timerKey = `single-${tradeId}`;

    const timerId = setTimeout(async () => {
      pendingDeleteTimersRef.current.delete(timerKey);
      if (undone) return;

      if (userId !== DEMO_USER_ID) {
        if (supabase) {
          try {
            await supabaseDataService.deleteTrade(tradeId, userId);
          } catch (err: any) {
            console.error('Supabase delete trade failed:', err);
          }
        }
      }
    }, 5000);

    pendingDeleteTimersRef.current.set(timerKey, timerId);

    toast.custom(
      (t) => (
        <div className="bg-background-card text-text-primary border border-border rounded-xl px-3 py-2 shadow-lg flex items-center gap-3">
          <span className="text-sm">Trade deleted</span>
          <button
            type="button"
            className="text-sm font-semibold text-primary"
            onClick={() => {
              undone = true;
              clearTimeout(timerId);
              pendingDeleteTimersRef.current.delete(timerKey);
              setTrades(prev => (prev.some(trade => trade.id === tradeToDelete.id) ? prev : [...prev, tradeToDelete]));
              toast.dismiss(t.id);
              toast.success('Delete undone.');
            }}
          >
            Undo
          </button>
          <button
            type="button"
            className="p-1 rounded hover:bg-white/10"
            aria-label="Dismiss"
            onClick={() => toast.dismiss(t.id)}
          >
            <X className="w-4 h-4 text-text-secondary" />
          </button>
        </div>
      ),
      { id: `undo-delete-${tradeId}`, duration: 5000 }
    );
  }, [userId, trades, selectedTrade]);

  const handleDeleteMultipleTrades = useCallback(async (tradeIds: string[]) => {
    if (!userId) return;
    const deletedTrades = trades.filter(t => tradeIds.includes(t.id));
    if (deletedTrades.length === 0) return;

    setTrades(prev => prev.filter(t => !tradeIds.includes(t.id)));
    setSelectedTradeIds(new Set());

    let undone = false;
    const timerKey = `bulk-${Date.now()}`;

    const timerId = setTimeout(async () => {
      pendingDeleteTimersRef.current.delete(timerKey);
      if (undone) return;

      if (userId !== DEMO_USER_ID) {
        if (supabase) {
          try {
            await supabaseDataService.deleteTradesBulk(tradeIds, userId);
          } catch (err: any) {
            console.error('Supabase bulk delete failed:', err);
          }
        }
      }
    }, 5000);

    pendingDeleteTimersRef.current.set(timerKey, timerId);

    toast.custom(
      (t) => (
        <div className="bg-background-card text-text-primary border border-border rounded-xl px-3 py-2 shadow-lg flex items-center gap-3">
          <span className="text-sm">{deletedTrades.length} trades deleted</span>
          <button
            type="button"
            className="text-sm font-semibold text-primary"
            onClick={() => {
              undone = true;
              clearTimeout(timerId);
              pendingDeleteTimersRef.current.delete(timerKey);
              setTrades(prev => {
                const existingIds = new Set(prev.map(trade => trade.id));
                const restored = deletedTrades.filter(trade => !existingIds.has(trade.id));
                return [...prev, ...restored];
              });
              toast.dismiss(t.id);
              toast.success('Delete undone.');
            }}
          >
            Undo
          </button>
          <button
            type="button"
            className="p-1 rounded hover:bg-white/10"
            aria-label="Dismiss"
            onClick={() => toast.dismiss(t.id)}
          >
            <X className="w-4 h-4 text-text-secondary" />
          </button>
        </div>
      ),
      { id: `undo-delete-multiple-${timerKey}`, duration: 5000 }
    );
  }, [userId, trades]);

  const handleResetJournal = useCallback(async () => {
    if (!userId) return;

    if (userId !== DEMO_USER_ID) {
      if (supabase) {
        try {
          await supabaseDataService.resetUserJournal(userId);
        } catch (err: any) {
          console.error('Supabase reset journal failed:', err);
        }
      }
    }

    setTrades([]);
    setTradingCapital(0);
    setSelectedTradeIds(new Set());
    closeModal('resetJournal');
    setShowWelcomeModal(true);
    toast.success('Journal has been reset.');
  }, [userId]);

  const handleCloseTrade = useCallback(async (tradeId: string, exitPrice: number, partialCloseData?: { lots: number; quantity: number }) => {
    if (!userId) return;
    const originalTrade = trades.find(t => t.id === tradeId);
    if (!originalTrade) return;

    if (partialCloseData && partialCloseData.quantity > 0) {
      const { lots: lotsToClose, quantity: quantityToClose } = partialCloseData;
      const feeForClosedPortion = (originalTrade.fees / originalTrade.quantity) * quantityToClose;
      const pnl = calculatePnL({ ...originalTrade, quantity: quantityToClose }, exitPrice);
      const closedPortionTrade: Trade = {
        ...originalTrade,
        id: crypto.randomUUID(),
        tradeGroupId: originalTrade.tradeGroupId,
        lots: lotsToClose,
        quantity: quantityToClose,
        exitPrice,
        status: 'closed',
        closedAt: new Date().toISOString(),
        notes: undefined,
        fees: feeForClosedPortion,
        riskRewardRatio: calculateRiskRewardRatio({ ...originalTrade, exitPrice }),
        ...pnl
      };

      const remainingQuantity = originalTrade.quantity - quantityToClose;

      if (userId !== DEMO_USER_ID) {
        if (supabase) {
          try {
            await supabaseDataService.saveTrade(closedPortionTrade, userId);
          } catch (err: any) {
            console.error('Supabase save closed portion error:', err);
          }
        }
      }

      if (remainingQuantity > 1e-9) {
        const updatedOriginalTrade: Trade = {
          ...originalTrade,
          lots: originalTrade.lots - lotsToClose,
          quantity: remainingQuantity,
          fees: originalTrade.fees - feeForClosedPortion,
          riskRewardRatio: calculateRiskRewardRatio(originalTrade),
        };

        if (userId !== DEMO_USER_ID) {
          if (supabase) {
            try {
              await supabaseDataService.saveTrade(updatedOriginalTrade, userId);
            } catch (err: any) {
              console.error('Supabase update original trade error:', err);
            }
          }
        }

        setTrades(prev => [closedPortionTrade, ...prev.map(t => t.id === originalTrade.id ? updatedOriginalTrade : t)]);
      } else {
        if (userId !== DEMO_USER_ID) {
          if (supabase) {
            try {
              await supabaseDataService.deleteTrade(originalTrade.id, userId);
            } catch (err: any) {
              console.error('Supabase delete original trade error:', err);
            }
          }
        }

        setTrades(prev => [closedPortionTrade, ...prev.filter(t => t.id !== originalTrade.id)]);
      }
      toast.success('Trade partially closed!');
    } else {
      const closedTrade = {
        ...originalTrade,
        exitPrice,
        status: 'closed' as 'closed',
        closedAt: new Date().toISOString(),
      };
      const pnl = calculatePnL(closedTrade, exitPrice);
      const finalTrade = { ...closedTrade, ...pnl, riskRewardRatio: calculateRiskRewardRatio(closedTrade) };

      if (userId !== DEMO_USER_ID) {
        if (supabase) {
          try {
            await supabaseDataService.saveTrade(finalTrade, userId);
          } catch (err: any) {
            console.error('Supabase save closed trade error:', err);
          }
        }
      }

      setTrades(prev => prev.map(t => t.id === tradeId ? finalTrade : t));
      toast.success('Trade fully closed!');
    }
    setModalState(prev => ({ ...prev, close: false }));
    setSelectedTrade(null);
  }, [userId, trades]);

  const openModal = (modal: 'add' | 'edit' | 'close' | 'delete' | 'resetJournal', trade: Trade | null = null) => {
    setSelectedTrade(trade);
    setModalState(prev => ({ ...prev, [modal]: true }));
  };

  const closeModal = (modal: 'add' | 'edit' | 'close' | 'delete' | 'resetJournal') => {
    setModalState(prev => ({ ...prev, [modal]: false }));
    setSelectedTrade(null);
  };

  const handleTabChange = useCallback((tab: string) => {
    if (tab === activeTab) return;

    // Reset scroll before and after state swap so the next tab always enters from the top.
    forceScrollTop();
    setActiveTab(tab);
    requestAnimationFrame(() => forceScrollTop());
  }, [activeTab, forceScrollTop]);

  const metrics = useMemo((): TradingMetrics => {
    if (!dashboardTrades || dashboardTrades.length === 0) {
      return {
        totalTrades: 0, winningTrades: 0, losingTrades: 0, winRate: 0,
        totalPnL: 0, totalFees: 0, avgWin: 0, avgLoss: 0, avgRiskRewardRatio: 0,
        rFactor: 0, profitFactor: 0, sharpeRatio: 0,
        winStreak: 0, losingStreak: 0,
      };
    }

    const closedTrades = dashboardTrades.filter(trade => trade.status === 'closed' && typeof trade.netPnl === 'number');
    const winningTrades = closedTrades.filter(trade => (trade.netPnl || 0) > 0);
    const losingTrades = closedTrades.filter(trade => (trade.netPnl || 0) < 0);

    const totalPnL = closedTrades.reduce((sum, trade) => sum + (trade.netPnl || 0), 0);
    const totalFees = dashboardTrades.reduce((sum, trade) => sum + trade.fees, 0);

    const avgWin = winningTrades.length > 0
      ? winningTrades.reduce((sum, trade) => sum + (trade.netPnl || 0), 0) / winningTrades.length
      : 0;

    const avgLoss = losingTrades.length > 0
      ? Math.abs(losingTrades.reduce((sum, trade) => sum + (trade.netPnl || 0), 0) / losingTrades.length)
      : 0;

    const tradesWithRR = closedTrades.filter(t => t.riskRewardRatio && t.riskRewardRatio > 0);
    const totalRR = tradesWithRR.reduce((sum, t) => sum + (t.riskRewardRatio || 0), 0);
    const avgRiskRewardRatio = tradesWithRR.length > 0 ? totalRR / tradesWithRR.length : 0;

    const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0;

    const closedTradesByDate = [...closedTrades].sort((a, b) => new Date(a.closedAt!).getTime() - new Date(b.closedAt!).getTime());

    let currentWinStreak = 0;
    let maxWinStreak = 0;
    let currentLosingStreak = 0;
    let maxLosingStreak = 0;

    for (const trade of closedTradesByDate) {
      if ((trade.netPnl || 0) > 0) {
        currentWinStreak++;
        currentLosingStreak = 0;
        if (currentWinStreak > maxWinStreak) {
          maxWinStreak = currentWinStreak;
        }
      } else if ((trade.netPnl || 0) < 0) {
        currentLosingStreak++;
        currentWinStreak = 0;
        if (currentLosingStreak > maxLosingStreak) {
          maxLosingStreak = currentLosingStreak;
        }
      } else {
        currentWinStreak = 0;
        currentLosingStreak = 0;
      }
    }

    const grossProfit = winningTrades.reduce((sum, trade) => sum + (trade.netPnl || 0), 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, trade) => sum + (trade.netPnl || 0), 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : winningTrades.length > 0 ? 99.99 : 0;

    const totalRFactor = closedTrades.reduce((sum, trade) => {
      let tradeRisk = 0;
      if (trade.stopLoss && trade.entryPrice) {
        tradeRisk = Math.abs(trade.entryPrice - trade.stopLoss) * (trade.quantity || 1);
      } else if (trade.margin && trade.margin > 0) {
        tradeRisk = trade.margin;
      }
      const r = tradeRisk > 0 ? (trade.netPnl || 0) / tradeRisk : 0;
      return sum + r;
    }, 0);

    // 1. Daily Aggregations for Best & Worst Day Profit
    const dailyPnLMap: { [dateKey: string]: number } = {};
    for (const trade of closedTrades) {
      if (trade.closedAt) {
        const d = new Date(trade.closedAt);
        if (!isNaN(d.getTime())) {
          const dateKey = trade.closedAt.split('T')[0];
          dailyPnLMap[dateKey] = (dailyPnLMap[dateKey] || 0) + (trade.netPnl || 0);
        }
      }
    }

    const dailyEntries = Object.entries(dailyPnLMap);
    let bestDayProfit = 0;
    let bestDayDate = '-';
    let worstDayProfit = 0;
    let worstDayDate = '-';

    if (dailyEntries.length > 0) {
      let maxVal = -Infinity;
      let minVal = Infinity;

      for (const [dateStr, pnl] of dailyEntries) {
        const formattedDate = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (pnl > maxVal) {
          maxVal = pnl;
          bestDayProfit = pnl;
          bestDayDate = formattedDate;
        }
        if (pnl < minVal) {
          minVal = pnl;
          worstDayProfit = pnl;
          worstDayDate = formattedDate;
        }
      }
    }

    // 2. Weekly Growth (This Week vs Last Week)
    const now = new Date();
    const currentDayOfWeek = now.getDay();
    const diffToMonday = (currentDayOfWeek + 6) % 7;
    const startOfThisWeek = new Date(now);
    startOfThisWeek.setDate(now.getDate() - diffToMonday);
    startOfThisWeek.setHours(0, 0, 0, 0);

    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);

    const endOfLastWeek = new Date(startOfThisWeek);
    endOfLastWeek.setMilliseconds(-1);

    let thisWeekPnL = 0;
    let lastWeekPnL = 0;

    for (const trade of closedTrades) {
      if (trade.closedAt) {
        const tradeDate = new Date(trade.closedAt);
        if (tradeDate >= startOfThisWeek) {
          thisWeekPnL += trade.netPnl || 0;
        } else if (tradeDate >= startOfLastWeek && tradeDate <= endOfLastWeek) {
          lastWeekPnL += trade.netPnl || 0;
        }
      }
    }

    let weekOverWeekGrowth = 0;
    if (lastWeekPnL !== 0) {
      weekOverWeekGrowth = ((thisWeekPnL - lastWeekPnL) / Math.abs(lastWeekPnL)) * 100;
    } else if (thisWeekPnL !== 0) {
      weekOverWeekGrowth = thisWeekPnL > 0 ? 100 : -100;
    }

    // 3. Monthly Growth (This Month vs Last Month)
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const startOfThisMonth = new Date(currentYear, currentMonth, 1);
    const startOfLastMonth = new Date(currentYear, currentMonth - 1, 1);
    const endOfLastMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

    let thisMonthPnL = 0;
    let lastMonthPnL = 0;

    for (const trade of closedTrades) {
      if (trade.closedAt) {
        const tradeDate = new Date(trade.closedAt);
        if (tradeDate >= startOfThisMonth) {
          thisMonthPnL += trade.netPnl || 0;
        } else if (tradeDate >= startOfLastMonth && tradeDate <= endOfLastMonth) {
          lastMonthPnL += trade.netPnl || 0;
        }
      }
    }

    let monthOverMonthGrowth = 0;
    if (lastMonthPnL !== 0) {
      monthOverMonthGrowth = ((thisMonthPnL - lastMonthPnL) / Math.abs(lastMonthPnL)) * 100;
    } else if (thisMonthPnL !== 0) {
      monthOverMonthGrowth = thisMonthPnL > 0 ? 100 : -100;
    }

    // 4. Capital Growth %
    const initCap = typeof tradingCapital === 'number' ? tradingCapital : Number((tradingCapital as any)?.total || 0);
    const currCap = initCap + totalPnL;
    const capitalGrowthPercent = initCap > 0 ? (totalPnL / initCap) * 100 : 0;

    return {
      totalTrades: new Set(dashboardTrades.map(t => t.tradeGroupId || t.id)).size,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate,
      totalPnL,
      totalFees,
      avgWin,
      avgLoss,
      avgRiskRewardRatio,
      rFactor: totalRFactor,
      profitFactor,
      sharpeRatio: 0,
      winStreak: maxWinStreak,
      losingStreak: maxLosingStreak,
      weekOverWeekGrowth,
      thisWeekPnL,
      lastWeekPnL,
      monthOverMonthGrowth,
      thisMonthPnL,
      lastMonthPnL,
      bestDayProfit,
      bestDayDate,
      worstDayProfit,
      worstDayDate,
      capitalGrowthPercent,
    };
  }, [dashboardTrades, tradingCapital]);
  // ... other code at the top
  const dashboardRef = React.useRef<HTMLDivElement>(null);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <>
            <motion.div
              ref={dashboardRef}
              className="space-y-8 bento-section"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {isDataLoading ? (
                <>
                  <TradingCapitalCardSkeleton />
                  <MetricsGridSkeleton />
                  <ChartSkeleton />
                </>
              ) : (
                <>
                  <TradingCapitalCard
                    capital={tradingCapital}
                    onCapitalUpdate={handleCapitalUpdate}
                    totalPnL={metrics.totalPnL}
                  />
                  <MetricsGrid metrics={metrics} />
                  <SetupExpectancyTracker
                    trades={dashboardTrades}
                    customSetups={tradingSetups}
                    onOpenManageSetups={() => setIsManageSetupsModalOpen(true)}
                    onNavigateToJournal={() => {
                      setActiveTab('journal');
                      setJournalSubTab('trades');
                    }}
                  />
                  <Suspense fallback={<ChartSkeleton />}>
                    <PerformanceCharts trades={dashboardTrades} initialCapital={tradingCapital} />
                  </Suspense>
                </>
              )}
            </motion.div>
          </>
        );

      case 'journal': {
        const journalTabs = [
          { id: 'trades', label: 'Trade Logs', icon: ClipboardList, badge: trades.length > 0 ? String(trades.length) : undefined },
          { id: 'aiCoach', label: 'AI Coach & Leaks', icon: Brain, badge: 'AI' },
          { id: 'selfJournal', label: 'Trading Notes', icon: FileText },
          { id: 'knowledgeHub', label: 'Knowledge Hub', icon: BookOpen },
        ];

        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            {/* Journal Sub-Navigation */}
            <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1">
              <div className="flex items-center gap-1.5 p-1 bg-black/40 border border-white/10 rounded-xl shrink-0">
                {journalTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = journalSubTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setJournalSubTab(tab.id as any)}
                      className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all shrink-0 ${isActive
                          ? 'bg-primary text-black shadow-md'
                          : 'text-text-secondary hover:text-white hover:bg-white/5'
                        }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                      {tab.badge && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${isActive ? 'bg-black text-primary' : 'bg-primary/20 text-primary'
                            }`}
                        >
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="px-3 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-xs font-semibold text-cyan-400 flex items-center gap-2 transition-all shadow-sm"
                  title="Export complete journal to Excel (.xlsx)"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Export .xlsx</span>
                </button>
              </div>
            </div>

            {/* Sub-Tab Content */}
            {journalSubTab === 'trades' && (
              isDataLoading ? (
                <div className="glass-card p-12 text-center">
                  <LoadingSpinner size="lg" />
                  <p className="mt-4 text-text-secondary">Loading Journal...</p>
                </div>
              ) : trades.length > 0 ? (
                <Suspense fallback={<ChartSkeleton />}>
                  <TradeHistoryTable
                    trades={sortedTrades}
                    onEdit={(trade) => openModal('edit', trade)}
                    onDelete={(trade) => openModal('delete', trade)}
                    onClose={(trade) => openModal('close', trade)}
                    selectedTradeIds={selectedTradeIds}
                    setSelectedTradeIds={setSelectedTradeIds}
                    filterStatus={filterStatus}
                    setFilterStatus={setFilterStatus}
                    filterDate={filterDate}
                    setFilterDate={setFilterDate}
                    onDeleteMultiple={handleDeleteMultipleTrades}
                    onImportCsv={handleImportCsv}
                    onAddTradeClick={() => openModal('add')}
                    onResetJournalClick={() => openModal('resetJournal')}
                    onOpenDeltaSync={() => setIsDeltaModalOpen(true)}
                    setups={tradingSetups}
                    onUpdateTradeSetup={handleUpdateTradeSetup}
                    onOpenManageSetups={() => setIsManageSetupsModalOpen(true)}
                    onAddNewSetup={handleAddNewSetup}
                  />
                </Suspense>
              ) : (
                <Suspense fallback={<ChartSkeleton />}>
                  <EmptyJournal
                    onAddTradeClick={() => openModal('add')}
                    onImportCsv={handleImportCsv}
                  />
                </Suspense>
              )
            )}

            {journalSubTab === 'aiCoach' && (
              <Suspense fallback={<ChartSkeleton />}>
                <AICoachView
                  trades={trades}
                  selfEntries={selfEntries}
                  knowledge={knowledgeItems}
                  metrics={metrics}
                  userId={userId}
                />
              </Suspense>
            )}

            {journalSubTab === 'selfJournal' && (
              <Suspense fallback={<ChartSkeleton />}>
                <TradingNotesView onNotesUpdated={refreshSelfEntries} />
              </Suspense>
            )}

            {journalSubTab === 'knowledgeHub' && (
              <Suspense fallback={<ChartSkeleton />}>
                <KnowledgeHubView onItemsUpdated={refreshKnowledge} />
              </Suspense>
            )}
          </motion.div>
        );
      }

      case 'calculator':
        return (
          <Suspense fallback={<ChartSkeleton />}>
            <PositionCalculator initialCapital={tradingCapital} market={marketMode} />
          </Suspense>
        );

      default:
        return null;
    }
  };

  if (!sessionChecked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthLayout />;
  }

  return (
    <ExchangeRateProvider usdToInrRate={usdToInrRate} market={marketMode}>
      <div className="min-h-screen bg-black text-text-primary relative overflow-x-hidden">
        <Waves
          lineColor="rgba(0, 255, 136, 0.07)"
          backgroundColor="transparent"
          waveSpeedX={0.015}
          waveSpeedY={0.01}
          waveAmpX={32}
          waveAmpY={16}
          friction={0.92}
          tension={0.01}
          maxCursorMove={80}
          xGap={14}
          yGap={34}
          className="fixed inset-0 pointer-events-none -z-10"
        />
        <Header
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onSignOut={handleSignOut}
          userEmail={userEmail}
          usdToInrRate={usdToInrRate}
          onUpdateExchangeRate={handleUpdateExchangeRate}
          realtimeStatus={realtimeStatus}
          onOpenSheetSync={() => setIsSheetSyncModalOpen(true)}
          onExportExcel={handleExportExcel}
          onOpenDeltaExchange={() => setIsDeltaModalOpen(true)}
          deltaConfigured={isDeltaConfigured}
          isDemo={isDemo}
        />
        <main className="w-full max-w-screen-3xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
          <ErrorBoundary fallbackTitle="View Rendering Error">
            {renderContent()}
          </ErrorBoundary>
        </main>

        <WelcomeModal
          isOpen={showWelcomeModal}
          onComplete={handleCapitalUpdate}
        />

        <DeltaExchangeModal
          isOpen={isDeltaModalOpen}
          onClose={() => {
            setIsDeltaModalOpen(false);
            setIsDeltaConfigured(deltaExchange.isConfigured());
          }}
          trades={trades}
          onTradesUpdated={handleDeltaTradesUpdated}
          userId={userId || undefined}
          currentCapital={tradingCapital}
          onCapitalUpdate={handleCapitalUpdate}
        />

        <Suspense fallback={null}>
          <AddTradeModal
            isOpen={modalState.add}
            onClose={() => closeModal('add')}
            onAddTrade={handleAddTrade}
            market={marketMode}
            setups={tradingSetups}
            onAddNewSetup={handleAddNewSetup}
          />

          <ResetJournalModal
            isOpen={modalState.resetJournal}
            onClose={() => closeModal('resetJournal')}
            onConfirmReset={handleResetJournal}
          />

          <ManageSetupsModal
            isOpen={isManageSetupsModalOpen}
            onClose={() => setIsManageSetupsModalOpen(false)}
            setups={tradingSetups}
            trades={trades}
            onSaveSetups={handleSaveTradingSetups}
          />
        </Suspense>

        {selectedTrade && (
          <Suspense fallback={null}>
            <EditTradeModal
              isOpen={modalState.edit}
              onClose={() => closeModal('edit')}
              onUpdateTrade={handleUpdateTrade}
              trade={selectedTrade}
              market={marketMode}
              setups={tradingSetups}
            />
            <CloseTradeModal
              isOpen={modalState.close}
              onClose={() => closeModal('close')}
              onConfirmClose={handleCloseTrade}
              trade={selectedTrade}
            />
            <DeleteConfirmationModal
              isOpen={modalState.delete}
              onClose={() => closeModal('delete')}
              onConfirmDelete={handleDeleteTrade}
              trade={selectedTrade}
            />
          </Suspense>
        )}

        <Toaster
          position="bottom-right"
          toastOptions={{
            className: 'bg-background-card text-text-primary border border-border',
            success: {
              iconTheme: {
                primary: '#10B981',
                secondary: '#FFFFFF',
              },
            },
            error: {
              iconTheme: {
                primary: '#EF4444',
                secondary: '#FFFFFF',
              },
            },
          }}
        >
          {(t) => (
            <ToastBar toast={t}>
              {({ icon, message }) => (
                <>
                  {icon}
                  {message}
                  {t.type !== 'loading' && (
                    <button
                      onClick={() => toast.dismiss(t.id)}
                      className="p-1 rounded-full hover:bg-white/10 ml-2 shrink-0"
                    >
                      <X className="w-4 h-4 text-text-secondary" />
                    </button>
                  )}
                </>
              )}
            </ToastBar>
          )}
        </Toaster>
      </div>
    </ExchangeRateProvider>
  );
}

export default App;
