import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Target, BookMarked, Heart } from 'lucide-react';
import { TabType } from '../../types';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const tabs = [
  { id: 'theme' as TabType, label: '테마성경', icon: BookOpen },
  { id: 'awana' as TabType, label: '어와나암송', icon: Target },
  { id: 'bible' as TabType, label: '성경읽기', icon: BookMarked },
  { id: 'comfort' as TabType, label: '오늘의위로', icon: Heart },
];

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  return (
    <nav className="shrink-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 safe-area-bottom z-50">
      <div className="flex justify-around items-center h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex flex-col items-center justify-center flex-1 h-full relative"
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-x-2 top-0 h-0.5 bg-blue-500 rounded-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              <motion.div
                animate={{ scale: isActive ? 1.1 : 1 }}
                transition={{ type: 'spring', stiffness: 400 }}
              >
                <Icon
                  size={24}
                  className={isActive ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'}
                />
              </motion.div>
              <span
                className={`text-xs mt-1 ${
                  isActive
                    ? 'text-blue-500 font-medium'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
