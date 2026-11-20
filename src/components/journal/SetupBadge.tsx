import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tag, Plus, Check, Search, Settings, X } from 'lucide-react';
import { TradingSetup } from '../../types/trading';
import { getSetupColor } from '../../utils/setupCalculations';

interface SetupBadgeProps {
  currentSetup?: string;
  setups: TradingSetup[];
  onSelectSetup: (setupName: string) => void;
  onOpenManageSetups?: () => void;
  onAddNewSetup?: (name: string) => TradingSetup;
  size?: 'sm' | 'md';
  disabled?: boolean;
}

export const SetupBadge: React.FC<SetupBadgeProps> = ({
  currentSetup,
  setups,
  onSelectSetup,
  onOpenManageSetups,
  onAddNewSetup,
  size = 'md',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [newSetupName, setNewSetupName] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Adjust dropdown opening direction if near bottom of viewport
  const handleTriggerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 280) {
        setDropdownPosition('top');
      } else {
        setDropdownPosition('bottom');
      }
    }
    setIsOpen(!isOpen);
    setSearch('');
    setNewSetupName('');
  };

  const filteredSetups = setups.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase().trim())
  );

  const handleSelect = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectSetup(name);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectSetup('');
    setIsOpen(false);
  };

  const handleCreateNew = (e: React.MouseEvent | React.FormEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const name = newSetupName.trim();
    if (!name) return;
    if (onAddNewSetup) {
      const created = onAddNewSetup(name);
      onSelectSetup(created.name);
    } else {
      onSelectSetup(name);
    }
    setNewSetupName('');
    setIsOpen(false);
  };

  const color = getSetupColor(currentSetup, setups);

  return (
    <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={handleTriggerClick}
        className={
          currentSetup
            ? `group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 border hover:scale-105 active:scale-95 shadow-sm`
            : `inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-slate-400 bg-white/[0.03] border border-dashed border-white/20 hover:border-emerald-500/50 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all duration-200`
        }
        style={
          currentSetup
            ? {
                backgroundColor: `${color}18`,
                borderColor: `${color}40`,
                color: color,
              }
            : undefined
        }
        title={currentSetup ? `Setup: ${currentSetup} (Click to change)` : 'Assign setup'}
      >
        {currentSetup ? (
          <>
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0 shadow-[0_0_8px_currentColor]"
              style={{ backgroundColor: color }}
            />
            <span className="truncate max-w-[120px] font-semibold">{currentSetup}</span>
          </>
        ) : (
          <>
            <Tag className="w-3 h-3 shrink-0" />
            <span className="whitespace-nowrap font-medium">+ Setup</span>
          </>
        )}
      </button>

      {/* Popover Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={popoverRef}
            initial={{ opacity: 0, y: dropdownPosition === 'bottom' ? 6 : -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: dropdownPosition === 'bottom' ? 6 : -6, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className={`absolute left-0 z-50 w-64 bg-[#12161f] border border-white/10 rounded-xl shadow-2xl p-2.5 backdrop-blur-xl ${
              dropdownPosition === 'bottom' ? 'top-full mt-1.5' : 'bottom-full mb-1.5'
            }`}
          >
            {/* Search Input */}
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search setup..."
                autoFocus
                className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white/[0.04] border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/60"
              />
            </div>

            {/* Setups list */}
            <div className="max-h-48 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
              {filteredSetups.map((setup) => {
                const isSelected = currentSetup?.toLowerCase() === setup.name.toLowerCase();
                return (
                  <button
                    key={setup.id || setup.name}
                    type="button"
                    onClick={(e) => handleSelect(setup.name, e)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors group ${
                      isSelected
                        ? 'bg-emerald-500/15 text-emerald-400 font-semibold'
                        : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: setup.color }}
                      />
                      <span className="truncate">{setup.name}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  </button>
                );
              })}

              {filteredSetups.length === 0 && search.trim() && (
                <div className="px-2 py-2 text-center text-xs text-slate-400">
                  No match for "{search}"
                </div>
              )}
            </div>

            {/* Inline Quick Add */}
            <form onSubmit={handleCreateNew} className="mt-2 pt-2 border-t border-white/10">
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={newSetupName}
                  onChange={(e) => setNewSetupName(e.target.value)}
                  placeholder="+ Add new setup..."
                  className="flex-1 px-2.5 py-1 text-xs bg-white/[0.04] border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/60"
                />
                <button
                  type="submit"
                  disabled={!newSetupName.trim()}
                  className="px-2 py-1 text-xs bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:hover:bg-emerald-500 text-white rounded-lg font-medium transition-all shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>

            {/* Footer with Clear & Manage */}
            <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
              {currentSetup ? (
                <button
                  type="button"
                  onClick={handleClear}
                  className="flex items-center gap-1 text-rose-400 hover:text-rose-300 hover:underline"
                >
                  <X className="w-3 h-3" /> Remove Setup
                </button>
              ) : (
                <span className="text-slate-500">Pick or type a setup</span>
              )}

              {onOpenManageSetups && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                    onOpenManageSetups();
                  }}
                  className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
                >
                  <Settings className="w-3 h-3" /> Manage Setups
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
