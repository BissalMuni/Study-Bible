import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlobalStateProvider } from './contexts/GlobalStateContext';
import { BottomNav } from './components/layout/BottomNav';
import { Header } from './components/layout/Header';
import { ThemeList } from './components/theme/ThemeList';
import { ThemeDetail } from './components/theme/ThemeDetail';
import { AwanaRecital } from './components/awana/AwanaRecital';
import { BibleReader } from './components/bible/BibleReader';
import { TabType, Theme } from './types';
import './index.css';

const pageVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabType>('theme');
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [isReadingChapter, setIsReadingChapter] = useState(false);

  const handleThemeSelect = (theme: Theme) => {
    setSelectedTheme(theme);
  };

  const handleBackFromTheme = () => {
    setSelectedTheme(null);
  };

  const getTitle = () => {
    switch (activeTab) {
      case 'theme':
        return '테마성경';
      case 'awana':
        return '어와나 암송';
      case 'bible':
        return '성경읽기';
      default:
        return '';
    }
  };

  // Header를 숨겨야 하는 경우: 테마 상세 또는 성경 장 읽기 중
  const shouldHideHeader = selectedTheme || isReadingChapter;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {!shouldHideHeader && <Header title={getTitle()} />}

      <AnimatePresence mode="wait">
        {activeTab === 'theme' && !selectedTheme && (
          <motion.div
            key="theme-list"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2 }}
          >
            <ThemeList onThemeSelect={handleThemeSelect} />
          </motion.div>
        )}

        {activeTab === 'theme' && selectedTheme && (
          <motion.div
            key="theme-detail"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2 }}
          >
            <ThemeDetail theme={selectedTheme} onBack={handleBackFromTheme} />
          </motion.div>
        )}

        {activeTab === 'awana' && (
          <motion.div
            key="awana"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2 }}
          >
            <AwanaRecital />
          </motion.div>
        )}

        {activeTab === 'bible' && (
          <motion.div
            key="bible"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2 }}
          >
            <BibleReader onChapterViewChange={setIsReadingChapter} />
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

function App() {
  return (
    <GlobalStateProvider>
      <AppContent />
    </GlobalStateProvider>
  );
}

export default App;
