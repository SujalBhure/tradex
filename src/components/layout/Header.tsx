import React, { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Menu, Transition } from '@headlessui/react';
import { BookOpen, Calculator, BarChart3, LogOut, User, Download, Zap } from 'lucide-react';
import { DecryptedText, ShinyText } from '../ui/reactbits';

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSignOut: () => void;
  userEmail: string | null;
  usdToInrRate: number;
  onUpdateExchangeRate: (rate: number) => Promise<void>;
  realtimeStatus?: 'connected' | 'syncing' | 'offline';
  onExportExcel?: () => void;
  onOpenDeltaExchange?: () => void;
  deltaConfigured?: boolean;
  isDemo?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  onSignOut,
  userEmail,
  usdToInrRate,
  onUpdateExchangeRate,
  realtimeStatus,
  onExportExcel,
  onOpenDeltaExchange,
  deltaConfigured,
  isDemo = false,
}) => {
  const [rateInput, setRateInput] = useState(String(usdToInrRate));
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    setRateInput(String(usdToInrRate));
  }, [usdToInrRate]);

  const syncIndicator = useCallback(() => {
    const activeTabButton = tabRefs.current[activeTab];
    if (!activeTabButton) return;

    setIndicator({
      left: activeTabButton.offsetLeft,
      width: activeTabButton.offsetWidth,
      ready: true,
    });
  }, [activeTab]);

  useLayoutEffect(() => {
    syncIndicator();
  }, [syncIndicator]);

  useEffect(() => {
    const onResize = () => syncIndicator();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [syncIndicator]);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'journal', label: 'Journal', icon: BookOpen },
    { id: 'calculator', label: 'Calculator', icon: Calculator },
  ];

  const handleSaveRate = async () => {
    const parsed = Number(rateInput);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    await onUpdateExchangeRate(parsed);
  };

  return (
    <header className="sticky top-4 z-50 px-4 sm:px-6 lg:px-8">
      <motion.div
        className="bg-black/30 backdrop-blur-md border border-white/10 shadow-lg rounded-2xl h-14 sm:h-16 px-2 sm:px-6 grid grid-cols-[auto_1fr_auto] items-center gap-2 sm:gap-3"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="flex items-center space-x-3 cursor-pointer select-none"
          whileHover={{ scale: 1.03 }}
          transition={{ duration: 0.2 }}
        >
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0 shadow-md shadow-primary/20">
            <BookOpen className="w-5 h-5 text-black" />
          </div>
          <div className="hidden sm:flex items-center">
            <DecryptedText
              text="TradeX"
              animateOn="hover"
              speed={35}
              maxIterations={6}
              className="text-xl font-extrabold text-text-primary leading-tight tracking-tight"
              encryptedClassName="text-xl font-extrabold text-primary font-mono tracking-tight"
            />
          </div>
        </motion.div>


        <div className="flex justify-center min-w-0">
          <div className="relative flex items-center gap-1 sm:gap-2 bg-black/40 p-1 rounded-xl border border-white/5 overflow-hidden w-full max-w-[300px] sm:max-w-[360px] sm:w-auto">
            <motion.div
              className="absolute top-1 bottom-1 bg-primary rounded-lg z-0"
              initial={false}
              animate={{
                x: indicator.left,
                width: indicator.width,
                opacity: indicator.ready ? 1 : 0,
              }}
              transition={{ duration: 0.22, type: 'spring', stiffness: 360, damping: 34 }}
            />
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <motion.button
                  key={tab.id}
                  ref={(node) => {
                    tabRefs.current[tab.id] = node;
                  }}
                  className="relative flex-1 sm:flex-none px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-sm font-medium transition-colors duration-250 flex items-center justify-center space-x-2"
                  onClick={() => onTabChange(tab.id)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className={`relative z-10 flex items-center gap-2 ${isActive ? 'text-black' : 'text-white/80 hover:text-white'}`}>
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3 justify-end">
          {isDemo ? (
            <span
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border shadow-sm select-none bg-cyan-500/10 border-cyan-500/30 text-cyan-300"
              title="TradeX Demo Mode (Sample Data)"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>Demo Mode</span>
            </span>
          ) : realtimeStatus ? (
            <div
              className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-[11px] font-medium border shadow-sm select-none transition-all ${
                realtimeStatus === 'connected'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : realtimeStatus === 'syncing'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  : 'bg-white/5 border-white/10 text-slate-400'
              }`}
              title={realtimeStatus === 'connected' ? 'Cloud Connected (Supabase)' : 'Connecting to Cloud...'}
            >
              <span
                className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                  realtimeStatus === 'connected'
                    ? 'bg-emerald-400 animate-pulse'
                    : realtimeStatus === 'syncing'
                    ? 'bg-amber-400 animate-ping'
                    : 'bg-slate-500'
                }`}
              />
              <span className="hidden xs:inline font-semibold">
                {realtimeStatus === 'connected'
                  ? 'Cloud Synced'
                  : realtimeStatus === 'syncing'
                  ? 'Syncing'
                  : 'Offline'}
              </span>
            </div>
          ) : null}

          {onOpenDeltaExchange && (
            <button
              type="button"
              onClick={onOpenDeltaExchange}
              className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-[11px] font-medium border shadow-sm select-none transition-all cursor-pointer ${
                deltaConfigured
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
              }`}
              title="Delta Exchange India Live Stream & Instant Auto-Logging"
            >
              {deltaConfigured && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>}
              <Zap className={`w-3.5 h-3.5 ${deltaConfigured ? 'text-emerald-400 fill-emerald-400/30' : 'text-slate-400'}`} />
              <span className="hidden sm:inline font-semibold">
                {deltaConfigured ? 'Delta Live' : 'Delta India'}
              </span>
            </button>
          )}

          <div className="hidden md:block">
            {userEmail && (
              <span className="text-xs text-slate-300 truncate max-w-[130px] block" title={userEmail}>
                {userEmail}
              </span>
            )}
          </div>

          <Menu as="div" className="relative inline-block text-left">
            <div>
              <Menu.Button className="p-2 rounded-full text-text-secondary hover:bg-white/10 transition-colors duration-200 shrink-0">
                <User className="w-5 h-5" />
              </Menu.Button>
            </div>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="actions-menu absolute right-0 mt-2 w-60 origin-top-right bg-background-card border border-border rounded-xl shadow-xl p-1 z-50">
                <div className="px-1 py-1">
                  <div className="px-3 py-2 text-xs text-text-secondary truncate border-b border-border">
                    Signed in as <span className="font-semibold text-text-primary">{userEmail || 'Trader'}</span>
                  </div>

                  <div className="py-1">
                    {onOpenDeltaExchange && (
                      <Menu.Item>
                        <button
                          type="button"
                          onClick={onOpenDeltaExchange}
                          className="group flex w-full items-center rounded-lg px-3 py-2 text-xs font-medium text-cyan-300 hover:bg-cyan-500/10 transition-colors"
                        >
                          <Zap className="mr-2 h-4 w-4 text-cyan-400" />
                          Delta Exchange India Sync
                        </button>
                      </Menu.Item>
                    )}

                    {onExportExcel && (
                      <Menu.Item>
                        <button
                          type="button"
                          onClick={onExportExcel}
                          className="group flex w-full items-center rounded-lg px-3 py-2 text-xs font-medium text-text-secondary hover:bg-white/10 transition-colors"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Export to MS Excel (.xlsx)
                        </button>
                      </Menu.Item>
                    )}
                  </div>

                  <div className="px-3 py-2 border-t border-border space-y-2">
                    <p className="text-xs text-text-secondary">USD to INR rate</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        value={rateInput}
                        onChange={(e) => setRateInput(e.target.value)}
                        className="w-full rounded-md bg-black border border-white/20 px-2 py-1 text-sm text-white placeholder:text-white/50 focus:border-primary focus:outline-none"
                        placeholder="85.70"
                      />
                      <button
                        type="button"
                        onClick={handleSaveRate}
                        className="rounded-md px-2 py-1 text-xs bg-primary text-black font-semibold"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                  <div className="border-t border-border pt-1">
                    <Menu.Item>
                      <button
                        onClick={onSignOut}
                        className="group flex w-full items-center rounded-md px-3 py-2 text-sm transition-all duration-200 text-danger data-[active]:bg-danger/20"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                      </button>
                    </Menu.Item>
                  </div>
                </div>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>
      </motion.div>
    </header>
  );
};
