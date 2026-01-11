import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronLeft, ChevronRight, X } from 'lucide-react';

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
  const [verses, setVerses] = useState<VerseData[]>([]);
  const [currentChapter, setCurrentChapter] = useState(chapter);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVerse, setSelectedVerse] = useState<VerseData | null>(null);

  useEffect(() => {
    setIsLoading(true);
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

        setVerses(parsedVerses);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load chapter:', err);
        setIsLoading(false);
      });
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
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 z-40 safe-area-top border-b border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center justify-between h-14 px-4">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onBack}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ArrowLeft size={24} className="text-gray-700 dark:text-gray-200" />
          </motion.button>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">
            {book.name} {currentChapter}장
          </h1>
          <div className="w-10" />
        </div>
      </motion.div>

      {/* Content */}
      <div className="pt-24 pb-28 px-5">
        {isLoading ? (
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
            className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm"
          >
            {verses.length === 0 ? (
              <p className="text-gray-500 text-center py-10">구절을 불러올 수 없습니다.</p>
            ) : (
              verses.map((verse, idx) => (
                <motion.p
                  key={verse.verse}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.02, 0.5) }}
                  onClick={() => handleVerseClick(verse)}
                  className="mb-3 leading-relaxed text-gray-800 dark:text-gray-200 cursor-pointer hover:bg-blue-50 dark:hover:bg-gray-700 rounded-lg p-2 -mx-2 transition-colors"
                  style={{ fontSize }}
                >
                  <span className="text-blue-600 dark:text-blue-400 font-bold mr-2">
                    {verse.verse}
                  </span>
                  {verse.content}
                </motion.p>
              ))
            )}
          </motion.div>
        )}
      </div>

      {/* Chapter Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-20 left-0 right-0 px-4"
      >
        <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl p-2 shadow-lg">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={goToPrevChapter}
            disabled={currentChapter <= 1}
            className={`flex items-center gap-1 px-4 py-2 rounded-lg ${
              currentChapter <= 1
                ? 'text-gray-300 dark:text-gray-600'
                : 'text-blue-500 hover:bg-blue-50 dark:hover:bg-gray-700'
            }`}
          >
            <ChevronLeft size={20} />
            <span className="font-medium">이전</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onBack}
            className="px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <span className="font-medium">목록</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={goToNextChapter}
            disabled={currentChapter >= book.chapters}
            className={`flex items-center gap-1 px-4 py-2 rounded-lg ${
              currentChapter >= book.chapters
                ? 'text-gray-300 dark:text-gray-600'
                : 'text-blue-500 hover:bg-blue-50 dark:hover:bg-gray-700'
            }`}
          >
            <span className="font-medium">다음</span>
            <ChevronRight size={20} />
          </motion.button>
        </div>
      </motion.div>

      {/* Verse Popup */}
      <AnimatePresence>
        {selectedVerse && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closePopup}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden shadow-2xl"
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
              <div className="p-8 overflow-y-auto max-h-[60vh]">
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
