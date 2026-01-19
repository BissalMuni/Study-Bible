import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, BookOpen, ChevronDown, ChevronRight, Volume2, VolumeX } from 'lucide-react';
import { Theme } from '../../types';
import { useTTS } from '../../hooks/useTTS';

interface PassageRef {
  book: string;
  bookId: number;
  chapter: number;
  startVerse: number;
  endVerse: number;
  summary: string;
}

interface Section {
  title: string;
  passages: PassageRef[];
}

interface ThemePassageData {
  title: string;
  sections: Section[];
}

interface BibleVerse {
  verse: number;
  content: string;
}

// bible_theme.json 구조: { [bookId]: { [chapter]: { verse, text }[] } }
interface BibleThemeData {
  [bookId: string]: {
    [chapter: string]: { verse: number; text: string }[];
  };
}

interface ThemeDetailProps {
  theme: Theme;
  onBack: () => void;
}

export const ThemeDetail: React.FC<ThemeDetailProps> = ({ theme, onBack }) => {
  const [passageData, setPassageData] = useState<ThemePassageData | null>(null);
  const [expandedSection, setExpandedSection] = useState<number | null>(0);
  const [selectedPassage, setSelectedPassage] = useState<PassageRef | null>(null);
  const [verseContent, setVerseContent] = useState<BibleVerse[]>([]);
  const [loadingVerses, setLoadingVerses] = useState(false);
  const [bibleThemeData, setBibleThemeData] = useState<BibleThemeData | null>(null);
  const { speak, isSpeaking, currentText } = useTTS();

  const handleTTSClick = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    speak(text);
  };

  // Load theme passage data
  useEffect(() => {
    console.log('[ThemeDetail] Loading passages for theme:', theme.id);
    fetch('/data/theme-passages.json')
      .then(res => res.json())
      .then(data => {
        console.log('[ThemeDetail] theme-passages.json loaded, keys:', Object.keys(data));
        if (data[theme.id]) {
          console.log('[ThemeDetail] Found data for theme:', theme.id, data[theme.id]);
          setPassageData(data[theme.id]);
        } else {
          console.log('[ThemeDetail] No data found for theme:', theme.id);
        }
      })
      .catch(err => {
        console.error('[ThemeDetail] Error loading theme-passages.json:', err);
      });
  }, [theme.id]);

  // Load bible theme data
  useEffect(() => {
    fetch('/data/bible_theme.json')
      .then(res => res.json())
      .then(data => {
        setBibleThemeData(data);
      })
      .catch(console.error);
  }, []);

  const handlePassageClick = async (passage: PassageRef) => {
    console.log('[ThemeDetail] Passage clicked:', passage);

    if (selectedPassage?.book === passage.book &&
        selectedPassage?.chapter === passage.chapter &&
        selectedPassage?.startVerse === passage.startVerse) {
      console.log('[ThemeDetail] Same passage clicked, closing');
      setSelectedPassage(null);
      setVerseContent([]);
      return;
    }

    setSelectedPassage(passage);
    setLoadingVerses(true);

    try {
      console.log('[ThemeDetail] bibleThemeData loaded:', !!bibleThemeData);
      if (bibleThemeData) {
        const bookData = bibleThemeData[passage.bookId.toString()];
        console.log('[ThemeDetail] bookData for bookId', passage.bookId, ':', !!bookData);
        if (bookData) {
          const chapterData = bookData[passage.chapter.toString()];
          console.log('[ThemeDetail] chapterData for chapter', passage.chapter, ':', !!chapterData, chapterData?.length, 'verses');
          if (chapterData) {
            const verses = chapterData
              .filter((v) => v.verse >= passage.startVerse && v.verse <= passage.endVerse)
              .map((v) => ({
                verse: v.verse,
                content: v.text
              }));
            console.log('[ThemeDetail] Filtered verses:', verses.length, verses);
            setVerseContent(verses);
          } else {
            console.log('[ThemeDetail] No chapter data found');
          }
        } else {
          console.log('[ThemeDetail] No book data found');
        }
      } else {
        console.log('[ThemeDetail] bible_theme.json not loaded yet');
      }
    } catch (error) {
      console.error('[ThemeDetail] Failed to load verses:', error);
    } finally {
      setLoadingVerses(false);
    }
  };

  const formatReference = (passage: PassageRef) => {
    if (passage.startVerse === passage.endVerse) {
      return `${passage.book} ${passage.chapter}:${passage.startVerse}`;
    }
    return `${passage.book} ${passage.chapter}:${passage.startVerse}-${passage.endVerse}`;
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="shrink-0 bg-white dark:bg-gray-800 z-40 safe-area-top"
      >
        <div className="flex items-center h-14 px-4">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onBack}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ArrowLeft size={24} className="text-gray-700 dark:text-gray-200" />
          </motion.button>
          <h1 className="ml-2 text-lg font-bold text-gray-900 dark:text-white truncate">
            {theme.name}
          </h1>
        </div>
      </motion.div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Hero section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mx-4 mt-4 rounded-2xl overflow-hidden"
          style={{ backgroundColor: theme.color }}
        >
          <div className="p-5 text-white">
            <h2 className="text-xl font-bold mb-1">{theme.name}</h2>
            <p className="opacity-90 text-sm">{theme.description}</p>
            {theme.keywords && theme.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {theme.keywords.map(keyword => (
                  <span
                    key={keyword}
                    className="text-xs px-2 py-1 rounded-full bg-white/20"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Passage sections */}
        <div className="px-4 mt-4 pb-6">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={20} className="text-gray-600 dark:text-gray-400" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              성경 본문 읽기
            </h3>
          </div>

          {!passageData ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                성경 구절 데이터를 불러오는 중...
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {passageData.sections.map((section, sectionIndex) => (
                <motion.div
                  key={sectionIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: sectionIndex * 0.1 }}
                  className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm"
                >
                  {/* Section Header */}
                  <button
                    onClick={() => setExpandedSection(
                      expandedSection === sectionIndex ? null : sectionIndex
                    )}
                    className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 dark:bg-gray-700/50"
                  >
                    <span className="font-medium text-gray-800 dark:text-white text-sm">
                      {section.title}
                    </span>
                    <motion.div
                      animate={{ rotate: expandedSection === sectionIndex ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown size={18} className="text-gray-500" />
                    </motion.div>
                  </button>

                  {/* Passages */}
                  <AnimatePresence>
                    {expandedSection === sectionIndex && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                          {section.passages.map((passage, passageIndex) => {
                            const isSelected = selectedPassage?.book === passage.book &&
                              selectedPassage?.chapter === passage.chapter &&
                              selectedPassage?.startVerse === passage.startVerse;

                            return (
                              <div key={passageIndex}>
                                <button
                                  onClick={() => handlePassageClick(passage)}
                                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                                >
                                  <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                    style={{ backgroundColor: theme.color + '20' }}
                                  >
                                    <BookOpen size={16} color={theme.color} />
                                  </div>
                                  <div className="flex-1 text-left">
                                    <p className="text-sm font-medium text-gray-800 dark:text-white">
                                      {formatReference(passage)}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {passage.summary}
                                    </p>
                                  </div>
                                  <motion.div
                                    animate={{ rotate: isSelected ? 90 : 0 }}
                                    transition={{ duration: 0.2 }}
                                  >
                                    <ChevronRight size={16} className="text-gray-400" />
                                  </motion.div>
                                </button>

                                {/* Verse Content */}
                                <AnimatePresence>
                                  {isSelected && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.2 }}
                                      className="overflow-hidden"
                                    >
                                      <div className="px-4 pb-4">
                                        <div
                                          className="rounded-xl p-4"
                                          style={{ backgroundColor: theme.color + '10' }}
                                        >
                                          {loadingVerses ? (
                                            <p className="text-center text-gray-500 text-sm">
                                              불러오는 중...
                                            </p>
                                          ) : verseContent.length > 0 ? (
                                            <div className="space-y-2">
                                              {verseContent.map((verse) => {
                                                const isCurrentlySpeaking = isSpeaking && currentText === verse.content;
                                                return (
                                                  <div
                                                    key={verse.verse}
                                                    className={`flex items-start gap-2 p-2 rounded-lg transition-colors ${
                                                      isCurrentlySpeaking ? 'bg-white/50 dark:bg-gray-700/50' : ''
                                                    }`}
                                                  >
                                                    <p className="flex-1 text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                                                      <span
                                                        className="font-bold mr-1"
                                                        style={{ color: theme.color }}
                                                      >
                                                        {verse.verse}
                                                      </span>
                                                      {verse.content}
                                                    </p>
                                                    <motion.button
                                                      whileTap={{ scale: 0.9 }}
                                                      onClick={(e) => handleTTSClick(e, verse.content)}
                                                      className={`p-1.5 rounded-full flex-shrink-0 ${
                                                        isCurrentlySpeaking
                                                          ? 'text-white'
                                                          : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                                                      }`}
                                                      style={isCurrentlySpeaking ? { backgroundColor: theme.color } : {}}
                                                    >
                                                      {isCurrentlySpeaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
                                                    </motion.button>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          ) : (
                                            <p className="text-center text-gray-500 text-sm">
                                              성경 본문을 불러올 수 없습니다.
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          )}

          {/* No data message */}
          {passageData === null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center mt-4"
            >
              <BookOpen size={32} className="mx-auto mb-2 text-gray-400" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                이 테마의 성경 구절을 준비 중입니다.
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};
