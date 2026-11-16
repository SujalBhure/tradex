import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  UserCheck,
  Target,
  Plus,
  Smile,
  CheckCircle,
  Calendar,
  Award,
  Sparkles,
  Flame,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import { SelfJournalEntry, GoalItem, PreMarketMood, GoalType } from '../../types/aiJournal';
import {
  getSelfJournalEntries,
  saveSelfJournalEntry,
  getGoals,
  saveGoal,
  deleteGoal,
} from '../../utils/aiJournalStorage';
import { GlassCard } from '../ui/GlassCard';
import toast from 'react-hot-toast';

interface SelfJournalViewProps {
  onEntriesUpdated?: () => void;
}

const MOODS: { value: PreMarketMood; label: string; color: string; desc: string }[] = [
  { value: 'calm', label: 'Calm', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30', desc: 'Patient and detached from outcome' },
  { value: 'focused', label: 'Focused', color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30', desc: 'Attentive to trade setups' },
  { value: 'confident', label: 'Confident', color: 'text-blue-400 bg-blue-400/10 border-blue-400/30', desc: 'Trusting probability and strategy' },
  { value: 'anxious', label: 'Anxious', color: 'text-amber-400 bg-amber-400/10 border-amber-400/30', desc: 'Worried about losses or drawdowns' },
  { value: 'fomo', label: 'FOMO', color: 'text-rose-400 bg-rose-400/10 border-rose-400/30', desc: 'Urge to jump into running candles' },
  { value: 'fatigued', label: 'Fatigued', color: 'text-purple-400 bg-purple-400/10 border-purple-400/30', desc: 'Low energy or sleep deprived' },
];

export const SelfJournalView: React.FC<SelfJournalViewProps> = ({ onEntriesUpdated }) => {
  const [activeSubTab, setActiveSubTab] = useState<'mindset' | 'goals'>('mindset');
  const [entries, setEntries] = useState<SelfJournalEntry[]>(getSelfJournalEntries());
  const [goals, setGoals] = useState<GoalItem[]>(getGoals());

  // Form states for new daily mindset entry
  const [mood, setMood] = useState<PreMarketMood>('focused');
  const [disciplineScore, setDisciplineScore] = useState<number>(9);
  const [wins, setWins] = useState('');
  const [struggles, setStruggles] = useState('');
  const [reflection, setReflection] = useState('');
  const [habits, setHabits] = useState<string[]>([
    'Checked macro news releases before trading',
    'Pre-calculated exact position size with calculator',
    'Set stop loss before clicking submit',
  ]);

  // Goal modal state
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [newGoalType, setNewGoalType] = useState<GoalType>('short-term');
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDesc, setNewGoalDesc] = useState('');
  const [newGoalTargetValue, setNewGoalTargetValue] = useState('');
  const [newGoalUnit, setNewGoalUnit] = useState('$');

  const handleSaveEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reflection.trim() && !wins.trim()) {
      toast.error('Please write at least a quick reflection or win for today.');
      return;
    }

    const newEntry: SelfJournalEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      preMarketMood: mood,
      disciplineScore,
      wins: wins.trim(),
      struggles: struggles.trim(),
      postMarketReflection: reflection.trim(),
      habitsChecked: habits,
      createdAt: new Date().toISOString(),
    };

    const updated = saveSelfJournalEntry(newEntry);
    setEntries(updated);
    setWins('');
    setStruggles('');
    setReflection('');
    toast.success('Daily Self Journal logged successfully!');
    onEntriesUpdated?.();
  };

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;

    const val = parseFloat(newGoalTargetValue);
    const item: GoalItem = {
      id: `goal-${Date.now()}`,
      type: newGoalType,
      category: 'discipline',
      title: newGoalTitle.trim(),
      description: newGoalDesc.trim(),
      targetValue: isNaN(val) ? undefined : val,
      currentValue: 0,
      unit: newGoalUnit,
      progressPercentage: 0,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    const updated = saveGoal(item);
    setGoals(updated);
    setShowGoalModal(false);
    setNewGoalTitle('');
    setNewGoalDesc('');
    setNewGoalTargetValue('');
    toast.success('New goal created!');
  };

  const toggleGoalComplete = (goal: GoalItem) => {
    const updated = saveGoal({
      ...goal,
      completed: !goal.completed,
      progressPercentage: !goal.completed ? 100 : 0,
    });
    setGoals(updated);
    toast.success(goal.completed ? 'Goal marked active' : 'Goal completed! 🎯');
  };

  const handleDeleteGoal = (id: string) => {
    const updated = deleteGoal(id);
    setGoals(updated);
    toast.success('Goal deleted');
  };

  return (
    <div className="space-y-6">
      {/* Header with Sub-Switchers */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary shadow-lg shadow-primary/15">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
                Self Journal & Goals Matrix
              </h1>
              <p className="text-xs text-text-secondary">
                Track psychology, mental discipline, and progressive milestones
              </p>
            </div>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1.5 p-1 bg-black/40 border border-white/10 rounded-xl">
          <button
            onClick={() => setActiveSubTab('mindset')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'mindset'
                ? 'bg-primary text-black shadow-md'
                : 'text-text-secondary hover:text-white'
            }`}
          >
            Psychology & Daily Log
          </button>
          <button
            onClick={() => setActiveSubTab('goals')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'goals'
                ? 'bg-primary text-black shadow-md'
                : 'text-text-secondary hover:text-white'
            }`}
          >
            Goal Hierarchy ({goals.filter((g) => !g.completed).length})
          </button>
        </div>
      </div>

      {activeSubTab === 'mindset' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Daily Check-in Form (5 Cols) */}
          <div className="lg:col-span-5">
            <GlassCard className="!p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                  <Smile className="w-4 h-4 text-primary" />
                  Today's Psychology Check-in
                </h3>
                <span className="text-xs text-text-muted">{new Date().toLocaleDateString()}</span>
              </div>

              <form onSubmit={handleSaveEntry} className="space-y-4">
                {/* Pre-market Mood Selector */}
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-2">
                    Pre-Market Mental State
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {MOODS.map((m) => (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => setMood(m.value)}
                        className={`p-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                          mood === m.value
                            ? `${m.color} ring-1 ring-primary/40`
                            : 'bg-black/30 border-white/10 text-text-secondary hover:border-white/20'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Discipline Rating Slider */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-text-secondary">
                      Session Discipline Rating
                    </label>
                    <span className="text-xs font-bold text-primary">{disciplineScore} / 10</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={disciplineScore}
                    onChange={(e) => setDisciplineScore(Number(e.target.value))}
                    className="w-full accent-primary bg-black/40 h-1.5 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-text-muted mt-1">
                    <span>1 (Impulsive)</span>
                    <span>5 (Average)</span>
                    <span>10 (Flawless Execution)</span>
                  </div>
                </div>

                {/* Wins Field */}
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    What did I do well today?
                  </label>
                  <input
                    type="text"
                    value={wins}
                    onChange={(e) => setWins(e.target.value)}
                    placeholder="e.g. Followed my stop loss rules, waited for 15M candle"
                    className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
                  />
                </div>

                {/* Struggles Field */}
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    What caused hesitation or temptation?
                  </label>
                  <input
                    type="text"
                    value={struggles}
                    onChange={(e) => setStruggles(e.target.value)}
                    placeholder="e.g. Urge to revenge trade after small loss on BTC"
                    className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
                  />
                </div>

                {/* Post Market Reflection */}
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    End of Day Reflection & Mindset Note
                  </label>
                  <textarea
                    rows={3}
                    value={reflection}
                    onChange={(e) => setReflection(e.target.value)}
                    placeholder="Reflect on emotional control and market read..."
                    className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full primary-button py-2.5 text-xs font-bold shadow-lg shadow-primary/15"
                >
                  Save Daily Entry
                </button>
              </form>
            </GlassCard>
          </div>

          {/* Past Entries Timeline (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-text-secondary flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Journal Reflections History
            </h3>

            <div className="space-y-3">
              {entries.map((entry) => {
                const moodObj = MOODS.find((m) => m.value === entry.preMarketMood);
                return (
                  <GlassCard key={entry.id} className="!p-4 sm:!p-5">
                    <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2.5 py-0.5 rounded-md font-semibold border ${moodObj?.color}`}>
                          {moodObj?.label}
                        </span>
                        <span className="text-xs font-bold text-text-primary">{entry.date}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-text-muted">Discipline:</span>
                        <span className="font-bold text-primary">{entry.disciplineScore}/10</span>
                      </div>
                    </div>

                    {entry.wins && (
                      <div className="mb-2 text-xs">
                        <span className="text-success font-semibold">Win: </span>
                        <span className="text-text-secondary">{entry.wins}</span>
                      </div>
                    )}

                    {entry.struggles && (
                      <div className="mb-2 text-xs">
                        <span className="text-amber-400 font-semibold">Struggle: </span>
                        <span className="text-text-secondary">{entry.struggles}</span>
                      </div>
                    )}

                    {entry.postMarketReflection && (
                      <p className="text-xs sm:text-sm text-text-primary leading-relaxed bg-black/30 p-2.5 rounded-xl border border-white/5">
                        "{entry.postMarketReflection}"
                      </p>
                    )}
                  </GlassCard>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Goals Matrix Hierarchy */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-text-secondary flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              3-Tier Goal Hierarchy
            </h3>
            <button
              onClick={() => setShowGoalModal(true)}
              className="primary-button px-3 py-1.5 text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Goal</span>
            </button>
          </div>

          {/* 3 Categories: All-Time, Long-Term, Short-Term */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {(['all-time', 'long-term', 'short-term'] as GoalType[]).map((type) => {
              const categoryGoals = goals.filter((g) => g.type === type);
              const title =
                type === 'all-time'
                  ? 'All-Time Vision'
                  : type === 'long-term'
                  ? 'Long-Term (6-12 Mo)'
                  : 'Short-Term (Weekly)';
              const iconColor =
                type === 'all-time'
                  ? 'text-amber-400'
                  : type === 'long-term'
                  ? 'text-primary'
                  : 'text-cyan-400';

              return (
                <div key={type} className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <h4 className={`text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-1.5 ${iconColor}`}>
                      <Award className="w-4 h-4" />
                      {title}
                    </h4>
                    <span className="text-xs text-text-muted">{categoryGoals.length} goals</span>
                  </div>

                  <div className="space-y-3">
                    {categoryGoals.map((goal) => (
                      <GlassCard key={goal.id} className="!p-4 relative group">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <button
                                onClick={() => toggleGoalComplete(goal)}
                                className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                  goal.completed
                                    ? 'bg-primary border-primary text-black'
                                    : 'border-white/30 hover:border-primary'
                                }`}
                              >
                                {goal.completed && <CheckCircle className="w-3.5 h-3.5" />}
                              </button>
                              <h5
                                className={`text-xs sm:text-sm font-bold ${
                                  goal.completed ? 'line-through text-text-muted' : 'text-text-primary'
                                }`}
                              >
                                {goal.title}
                              </h5>
                            </div>

                            {goal.description && (
                              <p className="text-[11px] text-text-secondary leading-relaxed mb-2 ml-6">
                                {goal.description}
                              </p>
                            )}

                            {/* Progress bar */}
                            <div className="ml-6 space-y-1">
                              <div className="flex justify-between text-[10px] text-text-muted">
                                <span>Progress</span>
                                <span className="font-bold text-primary">{goal.progressPercentage}%</span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-black/50 overflow-hidden border border-white/10">
                                <div
                                  className="h-full bg-primary rounded-full transition-all duration-500"
                                  style={{ width: `${goal.progressPercentage}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => handleDeleteGoal(goal.id)}
                            className="text-text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity p-1"
                            title="Delete goal"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </GlassCard>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Goal Modal */}
      {showGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-background-card border border-white/15 rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Add New Trading Goal
              </h3>
              <button
                onClick={() => setShowGoalModal(false)}
                className="text-text-muted hover:text-white text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Goal Horizon
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['short-term', 'long-term', 'all-time'] as GoalType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setNewGoalType(t)}
                      className={`p-2 rounded-xl text-xs font-semibold border capitalize transition-all ${
                        newGoalType === t
                          ? 'bg-primary/15 border-primary text-primary'
                          : 'bg-black/30 border-white/10 text-text-secondary'
                      }`}
                    >
                      {t.replace('-', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Goal Title
                </label>
                <input
                  type="text"
                  required
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  placeholder="e.g. 100 Trades with strict 2R discipline"
                  className="w-full bg-black border border-white/15 rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Description / Strategy Alignment
                </label>
                <textarea
                  rows={2}
                  value={newGoalDesc}
                  onChange={(e) => setNewGoalDesc(e.target.value)}
                  placeholder="How will you achieve this?"
                  className="w-full bg-black border border-white/15 rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGoalModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-text-secondary hover:text-white"
                >
                  Cancel
                </button>
                <button type="submit" className="primary-button px-4 py-2 text-xs font-bold">
                  Create Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SelfJournalView;
