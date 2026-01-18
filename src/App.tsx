import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlobalStateProvider } from './contexts/GlobalStateContext';
import { AdProvider, useAdContext } from './contexts/AdContext';
import { BottomNav } from './components/layout/BottomNav';
import { Header } from './components/layout/Header';
import { ThemeList } from './components/theme/ThemeList';
import { ThemeDetail } from './components/theme/ThemeDetail';
import { AwanaRecital } from './components/awana/AwanaRecital';
import { BibleReader } from './components/bible/BibleReader';
import { ComfortChat } from './components/comfort/ComfortChat';
import { WelcomeSelector } from './components/welcome/WelcomeSelector';
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
  const [showWelcome, setShowWelcome] = useState(true);

  // 광고 컨텍스트 사용
  const { triggerAd } = useAdContext();

  // 오늘 이미 환영 화면을 본 경우 스킵
  useEffect(() => {
    const lastVisit = localStorage.getItem('bibleApp_lastWelcomeDate');
    const today = new Date().toDateString();
    if (lastVisit === today) {
      setShowWelcome(false);
    }
  }, []);

  const handleWelcomeComplete = (tab: TabType) => {
    const today = new Date().toDateString();
    localStorage.setItem('bibleApp_lastWelcomeDate', today);
    setActiveTab(tab);
    setShowWelcome(false);
  };

  const handleThemeSelect = (theme: Theme) => {
    triggerAd('THEME_SELECT');
    setSelectedTheme(theme);
  };

  const handleBackFromTheme = () => {
    triggerAd('THEME_BACK');
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
      case 'comfort':
        return '오늘의 위로';
      default:
        return '';
    }
  };

  // Header를 숨겨야 하는 경우: 테마 상세 또는 성경 장 읽기 중
  const shouldHideHeader = selectedTheme || isReadingChapter;

  // 환영 화면 표시
  if (showWelcome) {
    return (
      <AnimatePresence>
        <WelcomeSelector
          onComfortSelect={() => handleWelcomeComplete('comfort')}
          onBibleSelect={() => handleWelcomeComplete('bible')}
        />
      </AnimatePresence>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header - 고정 높이 */}
      {!shouldHideHeader && <Header title={getTitle()} />}

      {/* Main Content - 남은 공간 모두 차지, 스크롤 가능 */}
      <main className="flex-1 overflow-y-auto">
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

        {activeTab === 'comfort' && (
          <motion.div
            key="comfort"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2 }}
          >
            <ComfortChat />
          </motion.div>
        )}
      </AnimatePresence>
      </main>

      {/* BottomNav - 고정 높이 */}
      <BottomNav activeTab={activeTab} onTabChange={(tab) => {
        if (tab !== activeTab) {
          triggerAd('TAB_CHANGE');
        }
        setActiveTab(tab);
      }} />
    </div>
  );
}

function App() {
  return (
    <GlobalStateProvider>
      <AdProvider>
        <AppContent />
      </AdProvider>
    </GlobalStateProvider>
  );
}

export default App;
