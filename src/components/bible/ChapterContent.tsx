import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronLeft, ChevronRight, X, Volume2, VolumeX } from 'lucide-react';
import { useTTS } from '../../hooks/useTTS';

interface BibleBook {
  id: number;
  name: string;
  chapters: number;
}

interface VerseData {
  verse: number;
  content: string;
}

interface ChapterContentProps {
  book: BibleBook;
  chapter: number;
  onBack: () => void;
  fontSize: number;
}

export const ChapterContent: React.FC<ChapterContentProps> = ({
  book,
  chapter,
  onBack,
  fontSize,
}) => {
  const [verses, setVerses] = useState<VerseData[] | null>(null);
  const [currentChapter, setCurrentChapter] = useState(chapter);
  const [selectedVerse, setSelectedVerse] = useState<VerseData | null>(null);
  const { speak, stop, isSpeaking, currentText } = useTTS();

  // 장 변경 시 TTS 중지
  useEffect(() => {
    stop();
  }, [currentChapter, stop]);

  const handleTTSClick = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    speak(text);
  };

  useEffect(() => {
    let cancelled = false;

    fetch(`/biblerhv/${book.id}-${currentChapter}.txt`)
      .then((res) => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then((text) => {
        const lines = text.split('\n');
        const parsedVerses: VerseData[] = [];
        let verseNum = 1;

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed) {
            parsedVerses.push({
              verse: verseNum,
              content: trimmed,
            });
            verseNum++;
          }
        }

        if (!cancelled) {
          setVerses(parsedVerses);
        }
      })
      .catch((err) => {
        console.error('Failed to load chapter:', err);
      });

    return () => {
      cancelled = true;
    };
  }, [book.id, currentChapter]);

  const goToPrevChapter = () => {
    if (currentChapter > 1) {
      setCurrentChapter(currentChapter - 1);
    }
  };

  const goToNextChapter = () => {
    if (currentChapter < book.chapters) {
      setCurrentChapter(currentChapter + 1);
    }
  };

  const handleVerseClick = (verse: VerseData) => {
    setSelectedVerse(verse);
  };

  const closePopup = () => {
    setSelectedVerse(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header with navigation */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 bg-white dark:bg-gray-800 z-40 safe-area-top border-b border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center justify-between h-14 px-2">
          {/* 이전 장 버튼 */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={goToPrevChapter}
            disabled={currentChapter <= 1}
            className={`p-2 rounded-full ${
              currentChapter <= 1
                ? 'text-gray-300 dark:text-gray-600'
                : 'text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <ChevronLeft size={24} />
          </motion.button>

          {/* 중앙: 목록 버튼 + 제목 */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ArrowLeft size={18} className="text-gray-500" />
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">
              {book.name} {currentChapter}장
            </h1>
          </motion.button>

          {/* 다음 장 버튼 */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={goToNextChapter}
            disabled={currentChapter >= book.chapters}
            className={`p-2 rounded-full ${
              currentChapter >= book.chapters
                ? 'text-gray-300 dark:text-gray-600'
                : 'text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <ChevronRight size={24} />
          </motion.button>
        </div>
      </motion.div>

      {/* Content */}
      <div className="px-3">
        {verses === null ? (
          <div className="flex items-center justify-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"
            />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-1 shadow-sm"
          >
            {verses.length === 0 ? (
              <p className="text-gray-500 text-center py-10">구절을 불러올 수 없습니다.</p>
            ) : (
              <div className="space-y-4">
                {verses.map((verse, idx) => {
                  const isCurrentlySpeaking = isSpeaking && currentText === verse.content;
                  return (
                    <motion.div
                      key={verse.verse}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx * 0.02, 0.5) }}
                      className={`leading-relaxed text-gray-800 dark:text-gray-200 rounded-lg p-3 transition-colors flex items-start gap-2 ${
                        isCurrentlySpeaking ? 'bg-blue-100 dark:bg-blue-900/30' : 'hover:bg-blue-50 dark:hover:bg-gray-700'
                      }`}
                      style={{ fontSize }}
                    >
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => handleVerseClick(verse)}
                      >
                        <span className="text-blue-600 dark:text-blue-400 font-bold mr-2">
                          {verse.verse}
                        </span>
                        {verse.content}
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => handleTTSClick(e, verse.content)}
                        className={`p-2 rounded-full flex-shrink-0 ${
                          isCurrentlySpeaking
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {isCurrentlySpeaking ? <VolumeX size={18} /> : <Volume2 size={18} />}
                      </motion.button>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Bottom spacer for BottomNav */}
      <div className="h-20 safe-area-bottom" />

      {/* Verse Popup */}
      <AnimatePresence>
        {selectedVerse && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closePopup}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-1 py-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl mx-2"
            >
              {/* Popup Header */}
              <div className="sticky top-0 bg-blue-500 text-white p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold">{book.name}</h2>
                    <p className="text-blue-100">{currentChapter}장 {selectedVerse.verse}절</p>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={closePopup}
                    className="p-2 rounded-full hover:bg-blue-400"
                  >
                    <X size={24} />
                  </motion.button>
                </div>
              </div>

              {/* Popup Content */}
              <div className="p-1 overflow-y-auto max-h-[60vh]">
                <p
                  className="text-gray-800 dark:text-gray-200 leading-loose"
                  style={{ fontSize: fontSize + 6 }}
                >
                  {selectedVerse.content}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
