import React from 'react';
import { motion } from 'framer-motion';
import { Collection } from '../../types';

interface CollectionSelectorProps {
  collections: Collection[];
  currentCollection: string;
  onCollectionChange: (collectionId: string) => void;
}

export const CollectionSelector: React.FC<CollectionSelectorProps> = ({
  collections,
  currentCollection,
  onCollectionChange,
}) => {
  return (
    <div className="mb-4">
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {collections.map((collection) => {
          const isActive = collection.id === currentCollection;
          return (
            <motion.button
              key={collection.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => onCollectionChange(collection.id)}
              className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-500 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
              }`}
            >
              {collection.name}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
