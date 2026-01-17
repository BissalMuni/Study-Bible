import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGlobalState } from '../../contexts/GlobalStateContext';
import { BookList } from './BookList';
import { AudioController } from './AudioController';
import { CollectionSelector } from './CollectionSelector';
import { SettingsBox } from '../common/SettingsBox';
import { Collection } from '../../types';

interface ExpandedSections {
  expandedBook: string | null;
}

export const AwanaRecital: React.FC = () => {
  const { state, updateState } = useGlobalState();
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [passagesData, setPassagesData] = useState<Collection[] | null>(null);
  const [expandedSections, setExpandedSections] = useState<ExpandedSections>({
    expandedBook: null,
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/data/all_passages.json');
        if (response.ok) {
          const data = await response.json();
          setPassagesData(data);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    loadData();
  }, []);

  const handleCollectionChange = (collectionId: string) => {
    updateState('currentCollection', collectionId);
    setExpandedSections({ expandedBook: null });
  };

  const toggleBookExpansion = (passageKey: string) => {
    setSelectedBook(passageKey);
    if (expandedSections.expandedBook === passageKey) {
      setExpandedSections({ expandedBook: null });
    } else {
      setExpandedSections({ expandedBook: passageKey });
    }
  };

  if (isLoading || !passagesData) {
    return (
      <div className="flex items-center justify-center h-full">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  const allCollectionsData = Array.isArray(passagesData) ? passagesData : [passagesData];
  const currentCollectionData =
    allCollectionsData.find((coll) => coll.id === state.currentCollection) || allCollectionsData[0];

  return (
    <div className="pt-4 pb-4 px-4 bg-gray-50 dark:bg-gray-900">
      <SettingsBox />

      <CollectionSelector
        collections={allCollectionsData}
        currentCollection={state.currentCollection}
        onCollectionChange={handleCollectionChange}
      />

      <AudioController
        awanaVerses={currentCollectionData}
        expandedSections={expandedSections}
      />

      <BookList
        selectedBook={selectedBook}
        expandedSections={expandedSections}
        toggleBookExpansion={toggleBookExpansion}
        awanaVerses={currentCollectionData}
      />
    </div>
  );
};
