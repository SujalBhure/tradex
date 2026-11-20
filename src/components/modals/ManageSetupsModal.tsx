import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Tag, Check, RefreshCw, Layers } from 'lucide-react';
import { TradingSetup, Trade } from '../../types/trading';
import { SETUP_PALETTE_COLORS, DEFAULT_TRADING_SETUPS } from '../../utils/setupCalculations';

interface ManageSetupsModalProps {
  isOpen: boolean;
  onClose: () => void;
  setups: TradingSetup[];
  trades: Trade[];
  onSaveSetups: (setups: TradingSetup[]) => void;
}

export const ManageSetupsModal: React.FC<ManageSetupsModalProps> = ({
  isOpen,
  onClose,
  setups,
  trades,
  onSaveSetups,
}) => {
  const [newSetupName, setNewSetupName] = useState('');
  const [newSetupColor, setNewSetupColor] = useState(SETUP_PALETTE_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);

  if (!isOpen) return null;

  // Calculate usage counts per setup
  const usageCounts: Record<string, number> = {};
  trades.forEach((t) => {
    if (t.setup) {
      const normalized = t.setup.trim().toLowerCase();
      usageCounts[normalized] = (usageCounts[normalized] || 0) + 1;
    }
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newSetupName.trim();
    if (!trimmed) return;

    if (setups.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) {
      alert('A setup with this name already exists.');
      return;
    }

    const newSetup: TradingSetup = {
      id: `setup_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: trimmed,
      color: newSetupColor,
    };

    onSaveSetups([...setups, newSetup]);
    setNewSetupName('');
    // Rotate to next palette color
    const nextIdx = (SETUP_PALETTE_COLORS.indexOf(newSetupColor) + 1) % SETUP_PALETTE_COLORS.length;
    setNewSetupColor(SETUP_PALETTE_COLORS[nextIdx]);
  };

  const handleDelete = (setup: TradingSetup) => {
    const count = usageCounts[setup.name.toLowerCase()] || 0;
    if (count > 0) {
      const confirmed = window.confirm(
        `"${setup.name}" is used by ${count} trade(s). Deleting it will keep the existing trade tags intact, but remove it from your setups list. Proceed?`
      );
      if (!confirmed) return;
    }
    const updated = setups.filter((s) => s.id !== setup.id);
    onSaveSetups(updated);
  };

  const handleColorChange = (setupId: string, newColor: string) => {
    const updated = setups.map((s) => (s.id === setupId ? { ...s, color: newColor } : s));
    onSaveSetups(updated);
  };

  const handleResetDefaults = () => {
    const confirmed = window.confirm('Reset setups list to default professional setups?');
    if (confirmed) {
      onSaveSetups(DEFAULT_TRADING_SETUPS);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg bg-[#0e131b] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Manage Trading Setups</h3>
              <p className="text-xs text-slate-400">
                Define the setups you trade to track expectancy & edge
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

        {/* Create New Setup Form */}
        <div className="p-6 border-b border-white/10 bg-white/[0.01]">
          <form onSubmit={handleAdd} className="space-y-3">
            <label className="block text-xs font-semibold text-slate-300">
              Add New Trading Setup
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newSetupName}
                onChange={(e) => setNewSetupName(e.target.value)}
                placeholder="e.g. Liquidity Sweep, Asian Range Break..."
                className="flex-1 px-3.5 py-2 text-sm bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/60"
              />
              <button
                type="submit"
                disabled={!newSetupName.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:hover:bg-emerald-500 rounded-xl transition-all shadow-lg shadow-emerald-500/20"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>

            {/* Color Palette Selector */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-slate-400 mr-1">Badge Color:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {SETUP_PALETTE_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewSetupColor(color)}
                    className="w-6 h-6 rounded-full transition-transform flex items-center justify-center hover:scale-110"
                    style={{ backgroundColor: color }}
                  >
                    {newSetupColor === color && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                  </button>
                ))}
              </div>
            </div>
          </form>
        </div>

        {/* Setups List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-2.5 scrollbar-thin">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-medium">
            <span>YOUR SETUPS ({setups.length})</span>
            <button
              type="button"
              onClick={handleResetDefaults}
              className="flex items-center gap-1 hover:text-emerald-400 transition-colors"
              title="Reset to default library"
            >
              <RefreshCw className="w-3 h-3" /> Reset Defaults
            </button>
          </div>

          {setups.map((setup) => {
            const count = usageCounts[setup.name.toLowerCase()] || 0;
            return (
              <div
                key={setup.id}
                className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all group"
              >
                <div className="flex items-center gap-3">
                  {/* Color Circle Picker */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setEditingId(editingId === setup.id ? null : setup.id)}
                      className="w-5 h-5 rounded-full border border-white/20 shadow-sm transition-transform hover:scale-110"
                      style={{ backgroundColor: setup.color }}
                      title="Click to change color"
                    />
                    {editingId === setup.id && (
                      <div className="absolute left-0 top-7 z-20 flex gap-1 p-2 bg-[#12161f] border border-white/20 rounded-xl shadow-xl flex-wrap w-44">
                        {SETUP_PALETTE_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => {
                              handleColorChange(setup.id, c);
                              setEditingId(null);
                            }}
                            className="w-5 h-5 rounded-full hover:scale-110 transition-transform"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-white">{setup.name}</p>
                    {setup.description && (
                      <p className="text-xs text-slate-400">{setup.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      count > 0
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-white/[0.04] text-slate-500'
                    }`}
                  >
                    {count} {count === 1 ? 'trade' : 'trades'}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleDelete(setup)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all opacity-70 group-hover:opacity-100"
                    title="Delete setup"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-white/[0.02] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold text-white bg-white/10 hover:bg-white/20 rounded-xl transition-all"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
};
