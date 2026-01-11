import React from 'react';
import { motion } from 'framer-motion';
import { Settings, Moon, Sun } from 'lucide-react';
import { useGlobalState } from '../../contexts/GlobalStateContext';

interface HeaderProps {
  title: string;
  showSettings?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ title, showSettings = true }) => {
  const { state, updateState } = useGlobalState();

  const toggleDarkMode = () => {
    updateState('isDarkMode', !state.isDarkMode);
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 safe-area-top z-50">
      <div className="flex items-center justify-between h-14 px-4">
        <motion.h1
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-lg font-bold text-gray-900 dark:text-white"
        >
          {title}
        </motion.h1>

        {showSettings && (
          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={toggleDarkMode}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {state.isDarkMode ? (
                <Sun size={20} className="text-yellow-500" />
              ) : (
                <Moon size={20} className="text-gray-600" />
              )}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Settings size={20} className="text-gray-600 dark:text-gray-300" />
            </motion.button>
          </div>
        )}
      </div>
    </header>
  );
};
