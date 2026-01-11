import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Minus, Type } from 'lucide-react';
import { useGlobalState } from '../../contexts/GlobalStateContext';

export const SettingsBox: React.FC = () => {
  const { state, updateState } = useGlobalState();

  const adjustFontSize = (delta: number) => {
    const newSize = Math.max(12, Math.min(30, state.fontSize + delta));
    updateState('fontSize', newSize);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-end gap-2 mb-4"
    >
      <Type size={16} className="text-gray-500 dark:text-gray-400" />
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => adjustFontSize(-1)}
        className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center"
      >
        <Minus size={16} className="text-gray-600 dark:text-gray-300" />
      </motion.button>
      <span className="text-sm text-gray-600 dark:text-gray-300 w-8 text-center">
        {state.fontSize}
      </span>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => adjustFontSize(1)}
        className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center"
      >
        <Plus size={16} className="text-gray-600 dark:text-gray-300" />
      </motion.button>
    </motion.div>
  );
};
