import React from 'react';
import { motion } from 'framer-motion';
import { Heart, BookOpen } from 'lucide-react';

interface WelcomeSelectorProps {
  onComfortSelect: () => void;
  onBibleSelect: () => void;
}

export const WelcomeSelector: React.FC<WelcomeSelectorProps> = ({
  onComfortSelect,
  onBibleSelect,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 px-6"
    >
      {/* 로고/아이콘 */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="mb-8"
      >
        <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
          <motion.div
            animate={{
              color: [
                '#ef4444', // red
                '#f97316', // orange
                '#eab308', // yellow
                '#22c55e', // green
                '#3b82f6', // blue
                '#8b5cf6', // purple
                '#ec4899', // pink
                '#ef4444', // red (loop)
              ],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'linear',
            }}
          >
            <Heart size={40} fill="currentColor" />
          </motion.div>
        </div>
      </motion.div>

      {/* 인사 메시지 */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="text-center mb-10"
      >
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          오늘 하루 어떻게 보내셨나요?
        </h1>
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
          감사와 평안으로 즐거운 하루를 보내셨나요? 아니면, 고민과 괴로움으로 힘들어하셨나요?
        </p>
        <p className="text-gray-700 dark:text-gray-200 mt-4 font-medium">
          오늘의 위로 말씀을 묵상하세요.
        </p>
      </motion.div>

      {/* 버튼들 */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="w-full max-w-sm space-y-4"
      >
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onComfortSelect}
          className="w-full py-4 px-6 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold shadow-lg flex items-center justify-center gap-3 transition-colors"
        >
          <Heart size={22} />
          오늘의 위로 말씀 보기
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onBibleSelect}
          className="w-full py-4 px-6 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-white rounded-xl font-semibold shadow-md border border-gray-200 dark:border-gray-600 flex items-center justify-center gap-3 transition-colors"
        >
          <BookOpen size={22} />
          성경 읽기 바로가기
        </motion.button>
      </motion.div>
    </motion.div>
  );
};
