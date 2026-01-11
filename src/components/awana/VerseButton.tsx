import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause } from 'lucide-react';
import { Verse, Passage } from '../../types';

interface VerseButtonProps {
  verse: Verse;
  passage: Passage;
  collectionId: string;
  fontSize: number;
  repeatCount: number;
}

export const VerseButton: React.FC<VerseButtonProps> = ({
  verse,
  passage,
  collectionId,
  fontSize,
  repeatCount,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentRepeat, setCurrentRepeat] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const repeatRef = useRef(0);

  // Update ref when repeatCount changes
  useEffect(() => {
    repeatRef.current = currentRepeat;
  }, [currentRepeat]);

  const getAudioPath = () => {
    // passage.id is the bookId
    const bookId = passage.id;
    const chapter = passage.chapter;
    const verseNum = verse.verse;

    // Map collectionId to audio folder
    let folder = 'awana-recital';
    if (collectionId === 'wheel-of-gospel') {
      folder = 'wheel-of-gospel';
    } else if (collectionId === 'special-recital') {
      folder = 'special-recital';
    }

    return `/audio/${folder}/${bookId}-${chapter}-${verseNum}.mp3`;
  };

  const handlePlay = () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsPlaying(false);
      setCurrentRepeat(0);
      return;
    }

    const audioPath = getAudioPath();
    console.log('Playing audio:', audioPath);

    const audio = new Audio(audioPath);
    audioRef.current = audio;

    audio.onplay = () => setIsPlaying(true);

    audio.onended = () => {
      const nextRepeat = repeatRef.current + 1;
      if (nextRepeat < repeatCount) {
        setCurrentRepeat(nextRepeat);
        audio.currentTime = 0;
        audio.play().catch(console.error);
      } else {
        setIsPlaying(false);
        setCurrentRepeat(0);
        audioRef.current = null;
      }
    };

    audio.onerror = (e) => {
      setIsPlaying(false);
      setCurrentRepeat(0);
      console.error('Audio load failed:', audioPath, e);
    };

    audio.play().catch((err) => {
      console.error('Play failed:', err);
      setIsPlaying(false);
    });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3"
    >
      <div className="flex items-start gap-3">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handlePlay}
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            isPlaying
              ? 'bg-blue-500 text-white'
              : 'bg-blue-100 dark:bg-blue-900 text-blue-600'
          }`}
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
        </motion.button>

        <div className="flex-1 min-w-0">
          <p
            className="text-gray-900 dark:text-white leading-relaxed"
            style={{ fontSize }}
          >
            <span className="text-blue-600 dark:text-blue-400 font-medium mr-1">
              {verse.verse}절
            </span>
            {verse.content}
          </p>
          {verse.english && (
            <p
              className="text-gray-500 dark:text-gray-400 mt-1 leading-relaxed"
              style={{ fontSize: fontSize - 2 }}
            >
              {verse.english}
            </p>
          )}
        </div>
      </div>

      {isPlaying && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-2 flex items-center gap-2"
        >
          <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-blue-500"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {currentRepeat + 1}/{repeatCount}
          </span>
        </motion.div>
      )}
    </motion.div>
  );
};
