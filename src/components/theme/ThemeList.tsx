import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Route,
  Scale,
  Sword,
  Crown,
  BookOpen,
  Megaphone,
  ChevronRight,
  ChevronDown,
  Heart,
  Users,
  Baby,
  Gift,
  Hand,
  Flame,
  CloudRain,
  Building,
  Bug,
  AlertTriangle,
  Search,
  AlertOctagon,
  Package,
  Star,
  Ship,
  Shield,
  Scroll,
  Mountain,
  Book,
} from 'lucide-react';
import { Theme, ThemeCategory } from '../../types';

const iconMap: Record<string, React.FC<{ size?: number; color?: string }>> = {
  Sparkles,
  Route,
  Scale,
  Sword,
  Crown,
  BookOpen,
  Megaphone,
  Heart,
  Users,
  Baby,
  Gift,
  Hand,
  Flame,
  CloudRain,
  Building,
  Bug,
  AlertTriangle,
  Search,
  AlertOctagon,
  Package,
  Star,
  Ship,
  Shield,
  Scroll,
  Mountain,
  Book,
  HandHeart: Heart, // fallback
  Soup: Gift, // fallback
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
  const [categories, setCategories] = useState<ThemeCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  useEffect(() => {
    fetch('/data/themes.json')
      .then((res) => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then((data) => {
        console.log('Themes loaded:', data);
        setCategories(data.categories || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load themes:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const handleCategoryClick = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  if (loading) {
    return (
      <div className="px-4 flex items-center justify-center min-h-screen">
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
      <div className="pt-4 pb-4 px-4">
        <div className="text-red-500">테마 데이터 로드 실패: {error}</div>
      </div>
    );
  }

  return (
    <div className="pt-4 pb-4 px-4">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 p-2">
          테마별 성경 학습
        </h2>
      </motion.div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-3"
      >
        {categories.map((category) => {
          const CategoryIcon = iconMap[category.icon] || BookOpen;
          const isExpanded = expandedCategory === category.id;

          return (
            <motion.div key={category.id} variants={item}>
              {/* Category Header */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => handleCategoryClick(category.id)}
                className="w-full bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4"
              >
                <motion.div
                  whileHover={{ rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 0.5 }}
                  className="w-14 h-14 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: category.color + '20' }}
                >
                  <CategoryIcon size={28} color={category.color} />
                </motion.div>

                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {category.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {category.description}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {category.themes.length}개 테마
                  </p>
                </div>

                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown size={20} className="text-gray-400" />
                </motion.div>
              </motion.button>

              {/* Expanded Themes */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="pl-4 mt-2 space-y-2">
                      {category.themes.map((theme) => {
                        const ThemeIcon = iconMap[theme.icon] || BookOpen;

                        return (
                          <motion.button
                            key={theme.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => onThemeSelect(theme)}
                            className="w-full bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 flex items-center gap-3 border border-gray-100 dark:border-gray-600"
                          >
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: theme.color + '20' }}
                            >
                              <ThemeIcon size={20} color={theme.color} />
                            </div>

                            <div className="flex-1 text-left">
                              <h4 className="font-medium text-gray-800 dark:text-white text-sm">
                                {theme.name}
                              </h4>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {theme.description}
                              </p>
                              {theme.keywords && theme.keywords.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {theme.keywords.slice(0, 3).map((keyword) => (
                                    <span
                                      key={keyword}
                                      className="text-xs px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300"
                                    >
                                      {keyword}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            <ChevronRight size={16} className="text-gray-400" />
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
};
