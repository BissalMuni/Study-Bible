import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Route,
  Scale,
  Sword,
  Crown,
  BookOpen,
  Megaphone,
  ChevronRight,
} from 'lucide-react';
import { Theme } from '../../types';

const iconMap: Record<string, React.FC<{ size?: number; color?: string }>> = {
  Sparkles,
  Route,
  Scale,
  Sword,
  Crown,
  BookOpen,
  Megaphone,
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

interface ThemeListProps {
  onThemeSelect: (theme: Theme) => void;
}

export const ThemeList: React.FC<ThemeListProps> = ({ onThemeSelect }) => {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/data/themes.json')
      .then((res) => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then((data) => {
        console.log('Themes loaded:', data);
        setThemes(data.themes || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load themes:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="pt-16 pb-20 px-4 flex items-center justify-center min-h-screen">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="pt-16 pb-20 px-4">
        <div className="text-red-500">테마 데이터 로드 실패: {error}</div>
      </div>
    );
  }

  return (
    <div className="pt-16 pb-20 px-4">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          테마별 성경 학습
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          구약성경을 테마별로 입체적으로 학습하세요
        </p>
      </motion.div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-3"
      >
        {themes.map((theme) => {
          const Icon = iconMap[theme.icon] || BookOpen;

          return (
            <motion.button
              key={theme.id}
              variants={item}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onThemeSelect(theme)}
              className="w-full bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4"
            >
              <motion.div
                whileHover={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.5 }}
                className="w-14 h-14 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: theme.color + '20' }}
              >
                <Icon size={28} color={theme.color} />
              </motion.div>

              <div className="flex-1 text-left">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {theme.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {theme.description}
                </p>
              </div>

              <ChevronRight size={20} className="text-gray-400" />
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
};
