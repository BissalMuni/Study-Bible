import React from 'react';
import { motion } from 'framer-motion';
import { Heart, RefreshCw, BookOpen, Sparkles } from 'lucide-react';

interface Verse {
  id: number;
  reference: string;
  text: string;
  tags: string[];
}

interface EncouragementMessage {
  message: string;
  closing: string;
}

interface ComfortResultProps {
  verses: Verse[];
  tags: string[];
  tagDescriptions: Record<string, string>;
  encouragementMessages: Record<string, EncouragementMessage>;
  onRestart: () => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

export const ComfortResult: React.FC<ComfortResultProps> = ({
  verses,
  tags,
  tagDescriptions,
  encouragementMessages,
  onRestart,
}) => {
  // Get top 3 tags for display
  const topTags = tags.slice(0, 3);

  // Get encouragement message based on primary tag
  const primaryTag = tags[0] || 'default';
  const encouragement = encouragementMessages[primaryTag] || encouragementMessages['default'] || {
    message: '오늘 하루도 수고하셨어요. 하나님은 당신의 모든 것을 알고 계시고, 항상 함께하십니다.',
    closing: '평안한 밤 되세요'
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="min-h-full bg-gradient-to-b from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 px-4 py-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="text-center mb-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
          className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4"
        >
          <Sparkles className="w-8 h-8 text-white" />
        </motion.div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          오늘 당신을 위한 말씀
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          하나님께서 당신에게 전하시는 위로의 말씀이에요
        </p>
      </motion.div>

      {/* Tags Summary */}
      {topTags.length > 0 && (
        <motion.div variants={itemVariants} className="mb-6">
          <div className="flex flex-wrap justify-center gap-2">
            {topTags.map((tag, index) => (
              <motion.span
                key={tag}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="px-4 py-2 bg-white dark:bg-gray-700 rounded-full text-sm font-medium text-purple-600 dark:text-purple-400 shadow-sm"
              >
                #{tagDescriptions[tag] || tag}
              </motion.span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Verses */}
      <div className="space-y-4 mb-8">
        {verses.map((verse) => (
          <motion.div
            key={verse.id}
            variants={itemVariants}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden"
          >
            {/* Verse Header */}
            <div className="bg-gradient-to-r from-purple-500 to-blue-500 px-4 py-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-white" />
              <span className="text-white font-medium">{verse.reference}</span>
            </div>

            {/* Verse Content */}
            <div className="p-5">
              <p className="text-gray-700 dark:text-gray-200 leading-relaxed text-base">
                "{verse.text}"
              </p>

              {/* Verse Tags */}
              <div className="flex flex-wrap gap-1 mt-4">
                {verse.tags.slice(0, 3).map(tag => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full"
                  >
                    {tagDescriptions[tag] || tag}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Encouragement Message */}
      <motion.div
        variants={itemVariants}
        className="bg-gradient-to-r from-pink-100 to-purple-100 dark:from-pink-900/20 dark:to-purple-900/20 rounded-2xl p-6 mb-6"
      >
        <div className="flex items-start gap-3">
          <Heart className="w-6 h-6 text-pink-500 flex-shrink-0 mt-1" />
          <div>
            <p className="text-gray-700 dark:text-gray-200 leading-relaxed">
              {encouragement.message}
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
              {encouragement.closing} ✨
            </p>
          </div>
        </div>
      </motion.div>

      {/* Restart Button */}
      <motion.button
        variants={itemVariants}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onRestart}
        className="w-full py-4 rounded-xl bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium flex items-center justify-center gap-2 shadow-md"
      >
        <RefreshCw className="w-5 h-5" />
        다시 시작하기
      </motion.button>

      {/* Footer */}
      <motion.p
        variants={itemVariants}
        className="text-center text-sm text-gray-400 dark:text-gray-500 mt-6"
      >
        오늘도 하나님의 사랑 안에서 평안하세요 🙏
      </motion.p>
    </motion.div>
  );
};
