import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Book } from 'lucide-react';
import { VerseButton } from './VerseButton';
import { Collection, Passage } from '../../types';
import { useGlobalState } from '../../contexts/GlobalStateContext';

interface BookListProps {
  selectedBook: string | null;
  expandedSections: { expandedBook: string | null };
  toggleBookExpansion: (passageKey: string) => void;
  awanaVerses: Collection;
}

export const BookList: React.FC<BookListProps> = ({
  selectedBook,
  expandedSections,
  toggleBookExpansion,
  awanaVerses,
}) => {
  const { state } = useGlobalState();

  const processedPassages = awanaVerses.passages.map((passage, index) => ({
    ...passage,
    uniqueKey: `${passage.id}-${passage.chapter}-${index}`,
  }));

  return (
    <div className="space-y-2">
      {processedPassages.map((passage) => {
        const isExpanded = expandedSections.expandedBook === passage.uniqueKey;

        return (
          <motion.div
            key={passage.uniqueKey}
            layout
            className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm"
          >
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => toggleBookExpansion(passage.uniqueKey!)}
              className="w-full flex items-center justify-between p-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <Book size={20} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-left">
                  <p
                    className="font-medium text-gray-900 dark:text-white"
                    style={{ fontSize: state.fontSize }}
                  >
                    {passage.book.name} {passage.chapter}장
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {passage.verses.length}개 구절
                  </p>
                </div>
              </div>

              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown size={20} className="text-gray-400" />
              </motion.div>
            </motion.button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-2">
                    {passage.verses.map((verse, idx) => (
                      <VerseButton
                        key={idx}
                        verse={verse}
                        passage={passage}
                        collectionId={awanaVerses.id}
                        fontSize={state.fontSize}
                        repeatCount={state.repeatCount}
                      />
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
};
