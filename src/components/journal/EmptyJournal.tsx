import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { PlusCircle, BarChart3, Upload } from 'lucide-react';
import { SpotlightCard, TrueFocus } from '../ui/reactbits';

interface EmptyJournalProps {
  onAddTradeClick: () => void;
  onImportCsv: (file: File) => Promise<void> | void;
}

export const EmptyJournal: React.FC<EmptyJournalProps> = ({ onAddTradeClick, onImportCsv }) => {
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsImporting(true);
    try {
      await onImportCsv(file);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <SpotlightCard
        spotlightColor="rgba(0, 255, 136, 0.12)"
        className="glass-card flex flex-col items-center justify-center text-center p-10 sm:p-14 !rounded-2xl"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={handleImportFileChange}
        />
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-primary/10">
          <BarChart3 className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
        </div>
        
        <div className="mb-4">
          <TrueFocus
            sentence="Track. Analyze. Profit."
            className="text-lg sm:text-2xl font-extrabold tracking-wide text-text-primary"
            borderColor="#00FF88"
            glowColor="rgba(0, 255, 136, 0.4)"
          />
        </div>
        
        <h2 className="text-xl sm:text-2xl font-bold text-text-primary mb-2">Your Journal is Empty</h2>
        <p className="text-text-secondary max-w-sm mb-6 text-xs sm:text-sm">
          Start by logging your first trade or import existing history to unleash full performance analytics.
        </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <motion.button
          onClick={onAddTradeClick}
          className="bg-primary hover:bg-primary-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <PlusCircle className="w-5 h-5" />
          <span>Add Your First Trade</span>
        </motion.button>
        <motion.button
          onClick={handleImportClick}
          disabled={isImporting}
          className="bg-background-light hover:bg-white/10 text-text-secondary font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-60"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Upload className="w-5 h-5" />
          <span>{isImporting ? 'Importing...' : 'Import CSV'}</span>
        </motion.button>
      </div>
      </SpotlightCard>
    </motion.div>
  );
};
