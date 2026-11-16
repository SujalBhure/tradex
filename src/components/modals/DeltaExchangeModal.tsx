import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Zap,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Eye,
  EyeOff,
  Wallet,
  Clock,
  ArrowRight,
  DollarSign,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { deltaExchange, DeltaBalance, DeltaCapitalInfo } from '../../lib/deltaExchange';
import { Trade } from '../../types';
import toast from 'react-hot-toast';

interface DeltaExchangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  trades: Trade[];
  onTradesUpdated: (updatedTrades: Trade[], capitalInfo?: DeltaCapitalInfo, deletedTradeIds?: string[]) => void;
  userId?: string;
  currentCapital?: number;
  onCapitalUpdate?: (capital: number) => void;
}

export const DeltaExchangeModal: React.FC<DeltaExchangeModalProps> = ({
  isOpen,
  onClose,
  trades,
  onTradesUpdated,
  userId,
  currentCapital,
  onCapitalUpdate,
}) => {
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  const [syncInterval, setSyncInterval] = useState(5);
  const [autoSyncCapital, setAutoSyncCapital] = useState(true);
  const [capitalInfo, setCapitalInfo] = useState<DeltaCapitalInfo | null>(null);
  const [showDepositHistory, setShowDepositHistory] = useState(false);

  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    message?: string;
    balances?: DeltaBalance[];
  } | null>(null);

  const [activeTab, setActiveTab] = useState<'settings' | 'guide'>('settings');

  useEffect(() => {
    if (isOpen) {
      deltaExchange.reloadCredentials().then((creds) => {
        setApiKey(creds.apiKey || '');
        setApiSecret(creds.apiSecret || '');
        setAutoSync(creds.autoSync ?? true);
        setSyncInterval(creds.syncIntervalSec || 5);

        if (creds.apiKey && creds.apiSecret) {
          handleQuickTest(creds.apiKey, creds.apiSecret);
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleQuickTest = async (key: string, secret: string) => {
    setIsTesting(true);
    await deltaExchange.saveCredentials({ apiKey: key, apiSecret: secret, autoSync: true });
    const res = await deltaExchange.testConnection();
    setIsTesting(false);
    setConnectionStatus({
      connected: res.success,
      message: res.message,
      balances: res.balances,
    });
    if (res.capitalInfo) {
      setCapitalInfo(res.capitalInfo);
    }
  };

  const handleSaveAndConnect = async () => {
    if (!apiKey.trim() || !apiSecret.trim()) {
      toast.error('Please enter both your Delta API Key and Secret.');
      return;
    }

    setIsTesting(true);
    setConnectionStatus(null);

    await deltaExchange.saveCredentials({
      apiKey: apiKey.trim(),
      apiSecret: apiSecret.trim(),
      autoSync: true,
      syncIntervalSec: syncInterval,
    });
    setAutoSync(true);

    const res = await deltaExchange.testConnection();
    setIsTesting(false);

    setConnectionStatus({
      connected: res.success,
      message: res.message,
      balances: res.balances,
    });
    if (res.capitalInfo) {
      setCapitalInfo(res.capitalInfo);
    }

    if (res.success) {
      toast.success('Connected to Delta Exchange India!');
    } else {
      toast.error(res.message || 'Connection failed.');
    }
  };

  const handleManualSync = async () => {
    if (!deltaExchange.isConfigured()) {
      toast.error('Please configure your Delta Exchange API Key first.');
      return;
    }

    setIsSyncing(true);
    try {
      const res = await deltaExchange.syncTrades(trades, userId);
      if (res.success) {
        if (res.capitalInfo) {
          setCapitalInfo(res.capitalInfo);
        }

        onTradesUpdated(res.trades, res.capitalInfo, res.deletedTradeIds);

        // Auto-sync capital to TradeX if enabled or initial capital is uninitialized
        if (res.capitalInfo && onCapitalUpdate) {
          if (autoSyncCapital || !currentCapital || currentCapital === 0) {
            onCapitalUpdate(res.capitalInfo.recommendedCapital);
          }
        }

        toast.success(res.message);
      } else {
        toast.error(res.message);
        if (
          res.message.includes('401') ||
          res.message.includes('Forbidden') ||
          res.message.includes('IP Restriction') ||
          res.message.includes('ip_not_whitelisted')
        ) {
          setConnectionStatus({
            connected: false,
            message: res.message,
          });
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Sync failed.');
      setConnectionStatus({
        connected: false,
        message: err.message || 'Sync failed.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    await deltaExchange.saveCredentials({
      apiKey: '',
      apiSecret: '',
      autoSync: false,
    });
    setApiKey('');
    setApiSecret('');
    setConnectionStatus(null);
    toast.success('Disconnected from Delta Exchange.');
  };

  const handlePurgeCredentials = async () => {
    await deltaExchange.purgeCredentials();
    setApiKey('');
    setApiSecret('');
    setAutoSync(false);
    setConnectionStatus(null);
    toast.success('Delta credentials permanently wiped from this device.');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-xl max-h-[90vh] bg-[#0c1017] border border-cyan-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-white/10 bg-gradient-to-r from-cyan-950/40 via-background-card to-background-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <Zap className="w-5 h-5 text-black" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white tracking-wide">
                    Delta Exchange India
                  </h2>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold">
                    FIU India
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Auto-sync Entries, Stop Loss, Targets, Exits & Realized PnL
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sub-tabs */}
          <div className="flex border-b border-white/10 bg-black/20 px-5 pt-3 gap-2">
            <button
              onClick={() => setActiveTab('settings')}
              className={`pb-3 px-3 text-xs sm:text-sm font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
                activeTab === 'settings'
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Zap className="w-4 h-4" />
              Connection & Auto-Sync
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`pb-3 px-3 text-xs sm:text-sm font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
                activeTab === 'guide'
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              How to Get API Key (Safe)
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-5 flex-1">
            {activeTab === 'settings' ? (
              <>
                {/* Status Card */}
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-3 h-3 rounded-full ${
                        connectionStatus?.connected
                          ? 'bg-cyan-400 animate-pulse'
                          : isTesting
                          ? 'bg-amber-400 animate-ping'
                          : 'bg-slate-600'
                      }`}
                    />
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {connectionStatus?.connected
                          ? 'Connected to Delta Exchange India'
                          : isTesting
                          ? 'Verifying API Credentials...'
                          : 'Delta Exchange Not Connected'}
                      </div>
                      <div className="text-xs text-slate-400">
                        {connectionStatus?.connected
                          ? 'Orders & positions will auto-log to TradeX Cloud'
                          : 'Enter your Read-Only API Key to enable automatic trade logging'}
                      </div>
                    </div>
                  </div>

                  {connectionStatus?.connected && (
                    <button
                      type="button"
                      onClick={handleDisconnect}
                      className="text-xs text-rose-400 hover:underline px-2 py-1"
                    >
                      Disconnect
                    </button>
                  )}
                </div>

                {/* Diagnostic error banner if disconnected / failed */}
                {connectionStatus && !connectionStatus.connected && connectionStatus.message && (
                  <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/30 text-xs space-y-2">
                    <div className="flex items-center gap-2 text-rose-300 font-semibold">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>Delta Exchange Connection Notice</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed text-[11px]">
                      {connectionStatus.message}
                    </p>
                    {connectionStatus.message.toLowerCase().includes('ip') && (
                      <div className="p-2.5 rounded-lg bg-black/50 border border-amber-500/40 text-amber-200 text-[11px] space-y-1">
                        <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                          <span>30-Second Fix on Delta Exchange:</span>
                        </div>
                        <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[10.5px]">
                          <li>Open <a href="https://india.delta.exchange" target="_blank" rel="noreferrer" className="text-cyan-400 underline font-semibold">india.delta.exchange</a> in your browser</li>
                          <li>Go to <strong>Profile (Top-Right) &rarr; API Keys</strong></li>
                          <li>Click on your API Key &rarr; under <strong>IP Restriction</strong>, select <strong>Unrestricted / Leave Blank</strong></li>
                          <li>Save changes, then return here and click <strong>Test &amp; Connect</strong></li>
                        </ol>
                      </div>
                    )}
                  </div>
                )}

                {/* Balances preview if connected */}
                {connectionStatus?.connected && connectionStatus.balances && connectionStatus.balances.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-cyan-300">
                      <Wallet className="w-4 h-4 text-cyan-400" />
                      <span className="font-semibold">Live Wallet Balance:</span>
                    </div>
                    <div className="flex gap-3 text-xs font-mono">
                      {connectionStatus.balances.map((b, idx) => (
                        <span key={idx} className="bg-black/40 px-2.5 py-1 rounded border border-cyan-500/20 text-white">
                          {b.balance.toLocaleString('en-IN', { maximumFractionDigits: 4 })} {b.assetSymbol}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Capital & Deposit Sync Preview */}
                {capitalInfo && (
                  <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-[#0d151c] to-[#0d151c] border border-emerald-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                          <DollarSign className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                            Capital & Deposit Auto-Sync
                            <span className="text-[9px] lowercase bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 px-1.5 py-0.5 rounded">verified</span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Captured all deposit events from Delta Exchange wallet ledger
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-xs">
                      <div className="bg-black/40 p-2.5 rounded-lg border border-white/5">
                        <div className="text-[10px] text-slate-400">Total Capital Added</div>
                        <div className="text-sm font-bold text-cyan-300">
                          ${capitalInfo.recommendedCapital.toLocaleString()}
                        </div>
                        <div className="text-[9px] text-slate-500 truncate">
                          {capitalInfo.depositCount > 1
                            ? `${capitalInfo.depositCount} deposits combined`
                            : capitalInfo.depositCount === 1
                            ? '1 deposit recorded'
                            : 'Derived from equity & PnL'}
                        </div>
                      </div>

                      <div className="bg-black/40 p-2.5 rounded-lg border border-white/5">
                        <div className="text-[10px] text-slate-400">Current Balance</div>
                        <div className="text-sm font-bold text-emerald-400">
                          ${capitalInfo.currentBalance.toLocaleString()}
                        </div>
                        <div className="text-[9px] text-slate-500">Live Delta Equity</div>
                      </div>

                      <div className="bg-black/40 p-2.5 rounded-lg border border-white/5 col-span-2 sm:col-span-1">
                        <div className="text-[10px] text-slate-400">Net Deposits</div>
                        <div className="text-sm font-bold text-white">
                          ${capitalInfo.netDeposits.toLocaleString()}
                        </div>
                        <div className="text-[9px] text-slate-500">Deposits - Withdrawals</div>
                      </div>
                    </div>

                    {/* Deposit History Breakdown (when money was added) */}
                    {capitalInfo.deposits && capitalInfo.deposits.length > 0 && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => setShowDepositHistory(!showDepositHistory)}
                          className="w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-black/40 hover:bg-black/60 border border-white/5 text-[11px] text-slate-300 transition-colors"
                        >
                          <span className="flex items-center gap-1.5 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            Deposit Ledger ({capitalInfo.depositCount} deposit{capitalInfo.depositCount > 1 ? 's' : ''} captured)
                          </span>
                          <span className="flex items-center gap-1 text-[10px] text-cyan-400">
                            {showDepositHistory ? 'Hide history' : 'View all deposits'}
                            {showDepositHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </span>
                        </button>

                        {showDepositHistory && (
                          <div className="mt-2 max-h-36 overflow-y-auto space-y-1.5 pr-1">
                            {capitalInfo.deposits.map((dep, idx) => (
                              <div
                                key={dep.id}
                                className="flex items-center justify-between p-2 rounded bg-black/60 border border-white/5"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-mono text-slate-400">#{idx + 1}</span>
                                  <div>
                                    <div className="text-[11px] font-semibold text-emerald-400">
                                      +${dep.amount.toLocaleString()} {dep.assetSymbol}
                                    </div>
                                    <div className="text-[9px] text-slate-500">
                                      {new Date(dep.createdAt).toLocaleString()}
                                    </div>
                                  </div>
                                </div>
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                                  {dep.transactionType.replace(/_/g, ' ')}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {onCapitalUpdate && (
                      <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-t border-white/5">
                        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={autoSyncCapital}
                            onChange={(e) => setAutoSyncCapital(e.target.checked)}
                            className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                          />
                          <span>Auto-sync Capital with Delta</span>
                        </label>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              onCapitalUpdate(capitalInfo.recommendedCapital);
                              toast.success(`TradeX Capital updated to $${capitalInfo.recommendedCapital.toLocaleString()} (${capitalInfo.depositCount} deposits captured)!`);
                            }}
                            className="text-xs px-2.5 py-1.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 transition-colors font-medium flex items-center gap-1"
                            title="Set starting capital to total deposits ($36.75)."
                          >
                            <span>Apply ${capitalInfo.recommendedCapital.toLocaleString()} (Capital)</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* API Key Form */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      Delta India API Key
                    </label>
                    <input
                      type="text"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="e.g. 5f8b9a1c-3e2d-4b7a-9c8d-1e2f3a4b5c6d"
                      style={{ backgroundColor: '#0d1117', color: '#ffffff' }}
                      className="w-full bg-[#0d1117] border border-slate-700 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-mono text-white placeholder:text-slate-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      Delta India API Secret
                    </label>
                    <div className="relative">
                      <input
                        type={showSecret ? 'text' : 'password'}
                        value={apiSecret}
                        onChange={(e) => setApiSecret(e.target.value)}
                        placeholder="••••••••••••••••••••••••••••••••"
                        style={{ backgroundColor: '#0d1117', color: '#ffffff' }}
                        className="w-full bg-[#0d1117] border border-slate-700 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-mono text-white placeholder:text-slate-600 focus:outline-none pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecret(!showSecret)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleSaveAndConnect}
                      disabled={isTesting}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-95 disabled:opacity-50"
                    >
                      {isTesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Test & Connect
                    </button>

                    <button
                      type="button"
                      onClick={handleManualSync}
                      disabled={isSyncing || !deltaExchange.isConfigured()}
                      className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 border border-white/10 disabled:opacity-40"
                    >
                      {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" /> : <RefreshCw className="w-4 h-4 text-cyan-400" />}
                      Sync Trades Now
                    </button>
                  </div>

                  {/* End-to-End Encrypted Cloud Sync Notice & Purge Option */}
                  <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 text-cyan-300">
                      <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>End-to-End Encrypted (AES-GCM 256). Synced seamlessly between your PC &amp; Mobile.</span>
                    </div>
                    {deltaExchange.isConfigured() && (
                      <button
                        type="button"
                        onClick={handlePurgeCredentials}
                        className="text-xs text-rose-400 hover:text-rose-300 underline font-medium shrink-0"
                      >
                        Purge Credentials
                      </button>
                    )}
                  </div>
                </div>

                {/* Auto-Sync Configuration */}
                <div className="p-4 rounded-xl bg-black/30 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-white flex items-center gap-2">
                        <Zap className="w-4 h-4 text-emerald-400" />
                        Real-Time Auto-Logging &amp; WebSocket
                      </div>
                      <div className="text-xs text-slate-400">
                        Instantly logs trades and positions via live WebSocket stream + high-frequency polling
                      </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoSync}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setAutoSync(val);
                          deltaExchange.saveCredentials({ autoSync: val });
                          if (val) toast.success('Instant Auto-logging enabled!');
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>

                  {autoSync && (
                    <div className="space-y-2 pt-2 border-t border-white/5 text-xs">
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span className="font-medium">Live Stream Active: Trade fills &amp; orders log immediately (&lt;1s)</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Backup Poll Interval:</span>
                        <select
                          value={syncInterval}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setSyncInterval(val);
                            deltaExchange.saveCredentials({ syncIntervalSec: val });
                          }}
                          className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white text-xs focus:outline-none"
                        >
                          <option value={3}>Every 3 seconds (Lightning)</option>
                          <option value={5}>Every 5 seconds (Recommended)</option>
                          <option value={10}>Every 10 seconds</option>
                          <option value={30}>Every 30 seconds</option>
                          <option value={60}>Every 1 minute</option>
                        </select>
                      </div>
                    </div>
                  )}

                </div>
              </>
            ) : (
              /* Setup Guide Tab */
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-200 flex items-start gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block font-semibold mb-0.5">100% Secure &amp; Read-Only:</strong>
                    TradeX only needs read permission to view your order history and positions. Never grant &ldquo;Trade&rdquo; or &ldquo;Withdrawal&rdquo; permissions.
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                    <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 font-bold text-xs flex items-center justify-center shrink-0">
                      1
                    </span>
                    <div className="flex-1 text-sm">
                      <div className="font-semibold text-white flex items-center gap-2">
                        Log in to Delta Exchange India
                        <a
                          href="https://india.delta.exchange"
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
                        >
                          india.delta.exchange <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Open Delta Exchange India in your browser.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                    <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 font-bold text-xs flex items-center justify-center shrink-0">
                      2
                    </span>
                    <div className="flex-1 text-sm">
                      <div className="font-semibold text-white">Navigate to API Keys</div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Click your profile avatar at the top right &rarr; select <strong className="text-white">API Keys</strong> &rarr; click <strong className="text-white">Create API Key</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                    <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 font-bold text-xs flex items-center justify-center shrink-0">
                      3
                    </span>
                    <div className="flex-1 text-sm">
                      <div className="font-semibold text-white">Select Permissions: Read Only &amp; No IP Restriction</div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Select <span className="text-cyan-400 font-bold">Read</span> permission. Do not enable Trade or Withdrawal. <strong className="text-amber-300">Important:</strong> Leave IP Restriction / IP Whitelist <strong>EMPTY (Unrestricted)</strong> so your browser can connect directly without being blocked.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                    <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 font-bold text-xs flex items-center justify-center shrink-0">
                      4
                    </span>
                    <div className="flex-1 text-sm">
                      <div className="font-semibold text-white">Copy Key &amp; Secret into TradeX</div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Paste both into the Connection tab and click <strong className="text-cyan-400">Test &amp; Connect</strong>.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveTab('settings')}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-sm transition-all flex items-center gap-1.5"
                  >
                    I Have My Keys <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
