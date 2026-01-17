import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Play, BookOpen, Image, Video } from 'lucide-react';
import { Theme } from '../../types';

interface ThemeDetailProps {
  theme: Theme;
  onBack: () => void;
}

export const ThemeDetail: React.FC<ThemeDetailProps> = ({ theme, onBack }) => {
  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header with back button - 고정 높이 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="shrink-0 bg-white dark:bg-gray-800 z-40 safe-area-top"
      >
        <div className="flex items-center h-14 px-4">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onBack}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ArrowLeft size={24} className="text-gray-700 dark:text-gray-200" />
          </motion.button>
          <h1 className="ml-2 text-lg font-bold text-gray-900 dark:text-white">
            {theme.name}
          </h1>
        </div>
      </motion.div>

      {/* 스크롤 가능한 콘텐츠 영역 */}
      <div className="flex-1 overflow-y-auto">
        {/* Hero section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mx-2 mt-4 rounded-2xl overflow-hidden"
          style={{ backgroundColor: theme.color }}
        >
        <div className="p-6 text-white">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-bold mb-2"
          >
            {theme.name}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="opacity-90"
          >
            {theme.description}
          </motion.p>

          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="mt-4 flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full"
          >
            <Play size={18} fill="white" />
            <span className="font-medium">학습 시작하기</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Content sections */}
      <div className="px-4 mt-6 space-y-4">
        <motion.h3
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-lg font-semibold text-gray-900 dark:text-white"
        >
          학습 콘텐츠
        </motion.h3>

        <AnimatePresence>
          {[
            { icon: BookOpen, title: '성경 본문 읽기', desc: '해당 테마의 성경 본문을 읽어보세요' },
            { icon: Play, title: '오디오 낭독', desc: '성경을 음성으로 들어보세요' },
            { icon: Image, title: '이미지 갤러리', desc: '관련 이미지와 삽화를 감상하세요' },
            { icon: Video, title: '영상 학습', desc: '깊이 있는 영상 콘텐츠를 시청하세요' },
          ].map((item, index) => (
            <motion.button
              key={item.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-white dark:bg-gray-800 rounded-xl p-4 flex items-center gap-4 shadow-sm"
            >
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${theme.color}15` }}
              >
                <item.icon size={24} color={theme.color} />
              </div>
              <div className="text-left">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {item.title}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {item.desc}
                </p>
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
