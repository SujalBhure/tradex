import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Plus,
  Shield,
  Lightbulb,
  AlertTriangle,
  Search,
  Tag,
  Trash2,
  CheckCircle2,
  Bookmark,
  ChevronDown,
  ChevronUp,
  Clock,
  Sparkles,
  Layers,
} from 'lucide-react';
import { KnowledgeItem, KnowledgeCategory } from '../../types/aiJournal';
import { getKnowledgeItems, saveKnowledgeItem, deleteKnowledgeItem, ensureValidUuid } from '../../utils/aiJournalStorage';
import { GlassCard } from '../ui/GlassCard';
import toast from 'react-hot-toast';

interface KnowledgeHubViewProps {
  onItemsUpdated?: () => void;
}

const CATEGORIES: { id: KnowledgeCategory | 'all'; label: string; icon: any; color: string }[] = [
  { id: 'all', label: 'All Knowledge', icon: Bookmark, color: 'text-white' },
  { id: 'rule', label: 'Rules of Engagement', icon: Shield, color: 'text-primary' },
  { id: 'strategy', label: 'Strategy Playbooks', icon: Lightbulb, color: 'text-cyan-400' },
  { id: 'lesson', label: 'Lessons & Mistakes', icon: AlertTriangle, color: 'text-amber-400' },
];

export const KnowledgeHubView: React.FC<KnowledgeHubViewProps> = ({ onItemsUpdated }) => {
  const [items, setItems] = useState<KnowledgeItem[]>(getKnowledgeItems());
  const [activeCategory, setActiveCategory] = useState<KnowledgeCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Realtime Cloud Sync Listener
  React.useEffect(() => {
    const handleSync = () => {
      setItems(getKnowledgeItems());
    };
    window.addEventListener('tradex_knowledge_synced', handleSync);
    return () => window.removeEventListener('tradex_knowledge_synced', handleSync);
  }, []);

  // New item modal
  const [showModal, setShowModal] = useState(false);
  const [category, setCategory] = useState<KnowledgeCategory>('rule');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [keyRuleInput, setKeyRuleInput] = useState('');
  const [rulesList, setRulesList] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [tagsList, setTagsList] = useState<string[]>([]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleAddRule = () => {
    if (!keyRuleInput.trim()) return;
    setRulesList((prev) => [...prev, keyRuleInput.trim()]);
    setKeyRuleInput('');
  };

  const handleRemoveRule = (index: number) => {
    setRulesList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    if (!tagsList.includes(tagInput.trim())) {
      setTagsList((prev) => [...prev, tagInput.trim()]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTagsList((prev) => prev.filter((t) => t !== tagToRemove));
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newItem: KnowledgeItem = {
      id: ensureValidUuid(),
      category,
      title: title.trim(),
      content: content.trim(),
      keyRules: rulesList,
      tags: tagsList.length ? tagsList : ['Trading'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = saveKnowledgeItem(newItem);
    setItems(updated);
    setShowModal(false);
    setTitle('');
    setContent('');
    setRulesList([]);
    setTagsList([]);
    // auto expand newly created item
    setExpandedIds((prev) => new Set(prev).add(newItem.id));
    toast.success('Knowledge item saved! AI Coach is now grounded with this rule.');
    onItemsUpdated?.();
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = deleteKnowledgeItem(id);
    setItems(updated);
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    toast.success('Knowledge item deleted.');
    onItemsUpdated?.();
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
      item.keyRules.some((r) => r.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shadow-lg shadow-primary/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Trading Knowledge Hub
              </h1>
              <p className="text-xs text-slate-200 mt-0.5">
                Your personal rulebook, playbook setups, and lessons referenced by TradeX AI
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="primary-button px-3.5 py-2 text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>Add Knowledge Item</span>
        </button>
      </div>

      {/* Filter Bar & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-black/60 border border-white/15 rounded-xl">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
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
            placeholder="Search rules, SMC, playbooks..."
            className="w-full bg-black/80 border border-white/20 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-primary shadow-inner"
          />
        </div>
      </div>

      {/* Knowledge Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filteredItems.map((item) => {
          const isRule = item.category === 'rule';
          const isStrategy = item.category === 'strategy';
          const isLesson = item.category === 'lesson';
          const isExpanded = expandedIds.has(item.id);

          const badgeColor = isRule
            ? 'text-primary bg-primary/15 border-primary/40'
            : isStrategy
            ? 'text-cyan-400 bg-cyan-400/15 border-cyan-400/40'
            : 'text-amber-400 bg-amber-400/15 border-amber-400/40';

          const categoryTitle = isRule
            ? 'Rule of Engagement'
            : isStrategy
            ? 'Strategy Playbook'
            : 'Costly Lesson';

          return (
            <motion.div
              key={item.id}
              layout
              transition={{ duration: 0.25 }}
              onClick={() => toggleExpand(item.id)}
              className="cursor-pointer"
            >
              <GlassCard 
                hover 
                className={`!p-5 flex flex-col justify-between group border transition-all duration-200 ${
                  isExpanded ? 'border-primary/40 shadow-lg shadow-primary/10 bg-black/85' : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${badgeColor}`}>
                      {categoryTitle}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => handleDelete(item.id, e)}
                        className="text-slate-400 hover:text-danger p-1 rounded hover:bg-white/10 transition-colors"
                        title="Delete item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <span className="p-1 text-slate-300 group-hover:text-primary transition-colors">
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-primary" /> : <ChevronDown className="w-4 h-4" />}
                      </span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-base sm:text-lg font-bold text-white mb-2 leading-snug">
                    {item.title}
                  </h3>

                  {/* Content (Collapsed: 2-line clamp, Expanded: full text) */}
                  <p className={`text-xs sm:text-sm text-slate-200 leading-relaxed mb-3 ${isExpanded ? '' : 'line-clamp-2'}`}>
                    {item.content}
                  </p>

                  {/* Non-Negotiable Rules & Execution Criteria */}
                  {item.keyRules.length > 0 && (
                    <div className="mt-3 p-3 rounded-xl bg-black/60 border border-white/10 mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-primary" />
                          <span>{isRule ? 'Non-Negotiable Rules:' : isStrategy ? 'Execution Criteria:' : 'Key Takeaways:'}</span>
                        </p>
                        {!isExpanded && (
                          <span className="text-[10px] text-slate-300 font-semibold">
                            {item.keyRules.length} items
                          </span>
                        )}
                      </div>

                      <div className="space-y-2">
                        {(isExpanded ? item.keyRules : item.keyRules.slice(0, 2)).map((rule, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-slate-100 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                            <span className="leading-snug">{rule}</span>
                          </div>
                        ))}
                        {!isExpanded && item.keyRules.length > 2 && (
                          <p className="text-[11px] text-primary font-semibold pl-5 pt-0.5">
                            +{item.keyRules.length - 2} more rules (click to expand)
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Footer: Tags & Expand Indicator */}
                <div className="pt-3 border-t border-white/10 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1.5">
                      {item.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-white/10 text-slate-200 font-medium border border-white/10 flex items-center gap-1"
                        >
                          <Tag className="w-2.5 h-2.5 text-primary" />
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="text-[11px] text-primary font-bold flex items-center gap-1">
                      <span>{isExpanded ? 'Collapse' : 'Expand'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12 border border-white/10 rounded-2xl bg-black/40">
          <BookOpen className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <p className="text-white font-bold text-sm">No knowledge items match your search</p>
          <p className="text-slate-300 text-xs mt-1">Try another keyword or add a new playbook item.</p>
        </div>
      )}

      {/* Add Knowledge Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-neutral-950 border border-white/20 rounded-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Add Knowledge Item
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-300 hover:text-white text-lg p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-white mb-1.5">
                  Category
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['rule', 'strategy', 'lesson'] as KnowledgeCategory[]).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategory(c)}
                      className={`p-2.5 rounded-xl text-xs font-bold border capitalize transition-all ${
                        category === c
                          ? 'bg-primary/20 border-primary text-primary shadow-sm'
                          : 'bg-black/60 border-white/15 text-slate-200 hover:border-white/30'
                      }`}
                    >
                      {c === 'rule' ? 'Rule' : c === 'strategy' ? 'Strategy' : 'Lesson'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-white mb-1.5">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. ICT Liquidity Sweep + Fair Value Gap"
                  className="w-full bg-black/90 border border-white/20 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-primary placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white mb-1.5">
                  Description / Overview
                </label>
                <textarea
                  rows={3}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Summarize the core setup criteria, context, or lesson..."
                  className="w-full bg-black/90 border border-white/20 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-primary placeholder:text-slate-400 resize-none"
                />
              </div>

              {/* Add Key Rules / Bullets */}
              <div>
                <label className="block text-xs font-bold text-white mb-1.5">
                  Key Rules & Execution Criteria
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={keyRuleInput}
                    onChange={(e) => setKeyRuleInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddRule())}
                    placeholder="Type rule & press Add..."
                    className="flex-1 bg-black/90 border border-white/20 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-primary placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={handleAddRule}
                    className="px-4 py-2 bg-primary text-black hover:bg-primary-light rounded-xl text-xs font-bold"
                  >
                    Add
                  </button>
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {rulesList.map((r, i) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-black/60 p-2 rounded-lg border border-white/10">
                      <span className="text-slate-100 font-medium">{r}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveRule(i)}
                        className="text-slate-400 hover:text-danger ml-2 p-0.5"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Tags */}
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
                    placeholder="e.g. SMC, Risk, Daily Limit"
                    className="flex-1 bg-black/90 border border-white/20 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-primary placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold text-white"
                  >
                    Add Tag
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {tagsList.map((t, i) => (
                    <span key={i} className="text-xs px-2.5 py-1 bg-primary/15 text-primary border border-primary/30 rounded-lg flex items-center gap-1 font-semibold">
                      {t}
                      <button type="button" onClick={() => handleRemoveTag(t)} className="hover:text-danger ml-1">✕</button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button type="submit" className="primary-button px-5 py-2 text-xs font-bold shadow-lg">
                  Save Knowledge Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeHubView;
