import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Book } from 'lucide-react';
import { useGlobalState } from '../../contexts/GlobalStateContext';
import { SettingsBox } from '../common/SettingsBox';
import { ChapterContent } from './ChapterContent';

interface BibleBook {
  id: number;
  name: string;
  chapters: number;
}

interface BibleData {
  성경: {
    구약: BibleBook[];
    신약: BibleBook[];
  };
}

export const BibleReader: React.FC = () => {
  const { state } = useGlobalState();
  const [bibleData, setBibleData] = useState<BibleData | null>(null);
  const [expandedTestament, setExpandedTestament] = useState<'구약' | '신약' | null>('구약');
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [expandedBook, setExpandedBook] = useState<number | null>(null);

  useEffect(() => {
    fetch('/data/bible.json')
      .then((res) => res.json())
      .then((data) => setBibleData(data))
      .catch(console.error);
  }, []);

  const handleBookClick = (book: BibleBook) => {
    if (expandedBook === book.id) {
      setExpandedBook(null);
    } else {
      setExpandedBook(book.id);
    }
  };

  const handleChapterSelect = (book: BibleBook, chapter: number) => {
    setSelectedBook(book);
    setSelectedChapter(chapter);
  };

  const handleBack = () => {
    setSelectedBook(null);
    setSelectedChapter(null);
  };

  if (!bibleData) {
    return (
      <div className="pt-16 pb-20 flex items-center justify-center min-h-screen">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (selectedBook && selectedChapter) {
    return (
      <ChapterContent
        book={selectedBook}
        chapter={selectedChapter}
        onBack={handleBack}
        fontSize={state.fontSize}
      />
    );
  }

  const renderBooks = (books: BibleBook[], testament: '구약' | '신약') => (
    <div className="space-y-2">
      {books.map((book) => {
        const isExpanded = expandedBook === book.id;
        return (
          <motion.div
            key={book.id}
            layout
            className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden"
          >
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => handleBookClick(book)}
              className="w-full flex items-center justify-between p-3"
            >
              <div className="flex items-center gap-3">
                <Book size={18} className="text-blue-500" />
                <span
                  className="font-medium text-gray-900 dark:text-white"
                  style={{ fontSize: state.fontSize }}
                >
                  {book.name}
                </span>
              </div>
              <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
                <ChevronDown size={18} className="text-gray-400" />
              </motion.div>
            </motion.button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-3 pb-3 flex flex-wrap gap-2">
                    {Array.from({ length: book.chapters }, (_, i) => i + 1).map((chapter) => (
                      <motion.button
                        key={chapter}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleChapterSelect(book, chapter)}
                        className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900 hover:text-blue-600 transition-colors"
                      >
                        {chapter}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );

  return (
    <div className="pt-16 pb-20 px-4 min-h-screen bg-gray-50 dark:bg-gray-900">
      <SettingsBox />

      {/* 구약 */}
      <motion.div className="mb-4">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => setExpandedTestament(expandedTestament === '구약' ? null : '구약')}
          className="w-full flex items-center justify-between p-4 bg-emerald-500 text-white rounded-xl mb-2"
        >
          <span className="font-bold text-lg">구약성경</span>
          <motion.div animate={{ rotate: expandedTestament === '구약' ? 180 : 0 }}>
            <ChevronDown size={24} />
          </motion.div>
        </motion.button>

        <AnimatePresence>
          {expandedTestament === '구약' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              {renderBooks(bibleData.성경.구약, '구약')}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* 신약 */}
      <motion.div>
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => setExpandedTestament(expandedTestament === '신약' ? null : '신약')}
          className="w-full flex items-center justify-between p-4 bg-blue-500 text-white rounded-xl mb-2"
        >
          <span className="font-bold text-lg">신약성경</span>
          <motion.div animate={{ rotate: expandedTestament === '신약' ? 180 : 0 }}>
            <ChevronDown size={24} />
          </motion.div>
        </motion.button>

        <AnimatePresence>
          {expandedTestament === '신약' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              {renderBooks(bibleData.성경.신약, '신약')}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
