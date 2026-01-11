import React from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, SkipForward, Repeat, Volume2 } from 'lucide-react';
import { useGlobalState } from '../../contexts/GlobalStateContext';
import { Collection } from '../../types';

interface AudioControllerProps {
  awanaVerses: Collection;
  expandedSections: { expandedBook: string | null };
}

export const AudioController: React.FC<AudioControllerProps> = ({
  awanaVerses,
  expandedSections,
}) => {
  const { state, updateState } = useGlobalState();
  const repeatOptions = [1, 3, 5, 10, 20, 50];

  const handleRepeatChange = (count: number) => {
    updateState('repeatCount', count);
  };

  const toggleRepeatMode = () => {
    updateState('isRepeatMode', !state.isRepeatMode);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4 shadow-sm"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          오디오 컨트롤
        </span>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={toggleRepeatMode}
          className={`p-2 rounded-full ${
            state.isRepeatMode
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-600'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
          }`}
        >
          <Repeat size={18} />
        </motion.button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 dark:text-gray-400">반복:</span>
        <div className="flex gap-1 flex-wrap">
          {repeatOptions.map((count) => (
            <motion.button
              key={count}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleRepeatChange(count)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                state.repeatCount === count
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              {count}회
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
};
