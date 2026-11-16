import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Plus,
  Pin,
  Trash2,
  Search,
  Tag,
  Clock,
  Coins,
  Brain,
  TrendingUp,
  AlertOctagon,
  Sparkles,
  Edit3,
  BookmarkCheck,
} from 'lucide-react';
import { TradingNote, TradingNoteCategory } from '../../types/aiJournal';
import {
  getTradingNotes,
  saveTradingNote,
  deleteTradingNote,
  togglePinTradingNote,
  ensureValidUuid,
} from '../../utils/aiJournalStorage';
import { GlassCard } from '../ui/GlassCard';
import toast from 'react-hot-toast';

interface TradingNotesViewProps {
  onNotesUpdated?: () => void;
}

const CATEGORIES: { id: TradingNoteCategory | 'all'; label: string; icon: any; color: string }[] = [
  { id: 'all', label: 'All Notes', icon: FileText, color: 'text-white' },
  { id: 'pre-market', label: 'Pre-Market Plan', icon: TrendingUp, color: 'text-cyan-400' },
  { id: 'post-market', label: 'Trade Review', icon: BookmarkCheck, color: 'text-primary' },
  { id: 'psychology', label: 'Psychology & Mindset', icon: Brain, color: 'text-purple-400' },
  { id: 'mistake', label: 'Mistake / Leak', icon: AlertOctagon, color: 'text-danger' },
  { id: 'setup', label: 'Playbook Setup', icon: Sparkles, color: 'text-amber-400' },
  { id: 'general', label: 'General', icon: FileText, color: 'text-slate-300' },
];

export const TradingNotesView: React.FC<TradingNotesViewProps> = ({ onNotesUpdated }) => {
  const [notes, setNotes] = useState<TradingNote[]>(getTradingNotes());
  const [activeCategory, setActiveCategory] = useState<TradingNoteCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Realtime Cloud Sync Listener
  React.useEffect(() => {
    const handleSync = () => {
      setNotes(getTradingNotes());
    };
    window.addEventListener('tradex_notes_synced', handleSync);
    return () => window.removeEventListener('tradex_notes_synced', handleSync);
  }, []);

  // Note Modal (New / Edit)
  const [showModal, setShowModal] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TradingNoteCategory>('pre-market');
  const [content, setContent] = useState('');
  const [symbol, setSymbol] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isPinned, setIsPinned] = useState(false);

  const openNewNoteModal = () => {
    setEditingNoteId(null);
    setTitle('');
    setCategory('pre-market');
    setContent('');
    setSymbol('');
    setTags(['Trading']);
    setIsPinned(false);
    setShowModal(true);
  };

  const openEditModal = (note: TradingNote) => {
    setEditingNoteId(note.id);
    setTitle(note.title);
    setCategory(note.category);
    setContent(note.content);
    setSymbol(note.symbol || '');
    setTags(note.tags || []);
    setIsPinned(!!note.isPinned);
    setShowModal(true);
  };

  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    const clean = tagInput.trim();
    if (!tags.includes(clean)) {
      setTags((prev) => [...prev, clean]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error('Please fill in title and note content.');
      return;
    }

    const noteToSave: TradingNote = {
      id: ensureValidUuid(editingNoteId || undefined),
      title: title.trim(),
      category,
      content: content.trim(),
      symbol: symbol.trim().toUpperCase() || undefined,
      tags: tags.length > 0 ? tags : ['Trading'],
      isPinned,
      date: new Date().toISOString().split('T')[0],
      createdAt: editingNoteId
        ? notes.find((n) => n.id === editingNoteId)?.createdAt || new Date().toISOString()
        : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = saveTradingNote(noteToSave);
    setNotes(updated);
    setShowModal(false);
    toast.success(editingNoteId ? 'Note updated successfully!' : 'Trading note recorded!');
    onNotesUpdated?.();
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = deleteTradingNote(id);
    setNotes(updated);
    toast.success('Note deleted.');
    onNotesUpdated?.();
  };

  const handleTogglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = togglePinTradingNote(id);
    setNotes(updated);
    toast.success('Note pin status updated.');
  };

  // Filter and Sort: Pinned first, then newest
  const filteredNotes = notes
    .filter((n) => {
      const matchesCat = activeCategory === 'all' || n.category === activeCategory;
      const matchesSearch =
        searchQuery.trim() === '' ||
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (n.symbol && n.symbol.toLowerCase().includes(searchQuery.toLowerCase())) ||
        n.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCat && matchesSearch;
    })
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shadow-lg shadow-primary/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Trading Notes & Reflections
              </h1>
              <p className="text-xs text-slate-200 mt-0.5">
                Simple, fast recording of trade ideas, psychology reflections, and lessons learned
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={openNewNoteModal}
          className="primary-button px-4 py-2.5 text-xs font-bold flex items-center gap-2 self-start sm:self-auto shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>New Trading Note</span>
        </button>
      </div>

      {/* Filter Bar & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Category Pills (Horizontal scroll on mobile) */}
        <div className="flex items-center gap-1.5 p-1 bg-black/60 border border-white/15 rounded-xl overflow-x-auto scrollbar-none max-w-full">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all ${
                  isActive
                    ? 'bg-primary text-black shadow-md font-bold'
                    : 'text-slate-200 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-300 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes, BTC, psychology..."
            className="w-full bg-black/80 border border-white/20 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-primary shadow-inner"
          />
        </div>
      </div>

      {/* Notes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filteredNotes.map((note) => {
          const categoryObj = CATEGORIES.find((c) => c.id === note.category) || CATEGORIES[0];
          const CategoryIcon = categoryObj.icon;

          return (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <GlassCard
                hover
                className={`!p-5 flex flex-col justify-between group border transition-all duration-200 h-full ${
                  note.isPinned
                    ? 'border-amber-400/40 shadow-lg shadow-amber-400/5 bg-black/80'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div>
                  {/* Note Top Meta */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border border-white/15 bg-white/5 text-slate-200 flex items-center gap-1">
                        <CategoryIcon className={`w-3 h-3 ${categoryObj.color}`} />
                        <span>{categoryObj.label}</span>
                      </span>

                      {note.symbol && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 border border-primary/25 text-primary flex items-center gap-1">
                          <Coins className="w-2.5 h-2.5" />
                          {note.symbol}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleTogglePin(note.id, e)}
                        className={`p-1.5 rounded transition-colors ${
                          note.isPinned
                            ? 'text-amber-400 hover:bg-amber-400/10'
                            : 'text-slate-400 hover:text-amber-400 hover:bg-white/10'
                        }`}
                        title={note.isPinned ? 'Unpin note' : 'Pin note to top'}
                      >
                        <Pin className="w-3.5 h-3.5 fill-current" />
                      </button>

                      <button
                        onClick={() => openEditModal(note)}
                        className="text-slate-400 hover:text-primary p-1.5 rounded hover:bg-white/10 transition-colors"
                        title="Edit note"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => handleDelete(note.id, e)}
                        className="text-slate-400 hover:text-danger p-1.5 rounded hover:bg-white/10 transition-colors"
                        title="Delete note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-base sm:text-lg font-bold text-white mb-2 leading-snug">
                    {note.title}
                  </h3>

                  {/* Content */}
                  <p className="text-xs sm:text-sm text-slate-100 leading-relaxed whitespace-pre-line mb-4 font-normal">
                    {note.content}
                  </p>
                </div>

                {/* Footer: Date & Tags */}
                <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 mt-2">
                  <div className="flex items-center gap-1 text-[11px] text-slate-300 font-medium">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>
                      {new Date(note.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {note.tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-white/10 text-slate-200 font-medium flex items-center gap-1"
                      >
                        <Tag className="w-2.5 h-2.5 text-primary" />
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>

      {filteredNotes.length === 0 && (
        <div className="text-center py-12 border border-white/10 rounded-2xl bg-black/40">
          <FileText className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <p className="text-white font-bold text-sm">No notes found</p>
          <p className="text-slate-300 text-xs mt-1">
            Capture your first trade reflection, setup idea, or pre-market note.
          </p>
        </div>
      )}

      {/* Note Composer Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-neutral-950 border border-white/20 rounded-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <span>{editingNoteId ? 'Edit Trading Note' : 'New Trading Note'}</span>
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-300 hover:text-white text-lg p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="space-y-4">
              {/* Category Selector */}
              <div>
                <label className="block text-xs font-bold text-white mb-1.5">
                  Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(['pre-market', 'post-market', 'psychology', 'mistake', 'setup', 'general'] as TradingNoteCategory[]).map(
                    (cat) => {
                      const opt = CATEGORIES.find((c) => c.id === cat)!;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setCategory(cat)}
                          className={`p-2 rounded-xl text-xs font-bold border transition-all text-left truncate flex items-center gap-1.5 ${
                            category === cat
                              ? 'bg-primary/20 border-primary text-primary shadow-sm'
                              : 'bg-black/60 border-white/15 text-slate-200 hover:border-white/30'
                          }`}
                        >
                          <opt.icon className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{opt.label}</span>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Title & Coin Symbol */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-white mb-1.5">
                    Note Title
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. BTC Sweep of Asia High"
                    className="w-full bg-black/90 border border-white/20 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-primary placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-white mb-1.5">
                    Symbol (Optional)
                  </label>
                  <input
                    type="text"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    placeholder="e.g. BTCUSDT"
                    className="w-full bg-black/90 border border-white/20 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-primary placeholder:text-slate-400 uppercase"
                  />
                </div>
              </div>

              {/* Content Textarea */}
              <div>
                <label className="block text-xs font-bold text-white mb-1.5">
                  Note Details & Thoughts
                </label>
                <textarea
                  rows={4}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Record your entry thesis, emotions before/during trade, mistakes made, or lessons for next time..."
                  className="w-full bg-black/90 border border-white/20 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-primary placeholder:text-slate-400 resize-none font-normal"
                />
              </div>

              {/* Tags Input */}
              <div>
                <label className="block text-xs font-bold text-white mb-1.5">
                  Tags
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    placeholder="Type tag & press Enter (e.g. FOMO, Breakout)..."
                    className="flex-1 bg-black/90 border border-white/20 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-primary placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold text-white"
                  >
                    Add
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {tags.map((t, i) => (
                    <span
                      key={i}
                      className="text-xs px-2.5 py-1 bg-primary/15 text-primary border border-primary/30 rounded-lg flex items-center gap-1 font-semibold"
                    >
                      {t}
                      <button type="button" onClick={() => handleRemoveTag(t)} className="hover:text-danger ml-1">
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Pin Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="pinNote"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="rounded border-white/20 bg-black text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                />
                <label htmlFor="pinNote" className="text-xs font-bold text-white cursor-pointer select-none">
                  Pin this note to the top of your journal
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button type="submit" className="primary-button px-5 py-2 text-xs font-bold shadow-lg">
                  {editingNoteId ? 'Update Note' : 'Save Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TradingNotesView;
