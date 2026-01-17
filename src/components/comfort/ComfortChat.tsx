import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Heart, RefreshCw } from 'lucide-react';
import { ComfortResult } from './ComfortResult';

interface Option {
  id: string;
  text: string;
  tags: string[];
}

interface Question {
  id: number;
  question: string;
  type: string;
  options: Option[];
}

interface Verse {
  id: number;
  reference: string;
  text: string;
  tags: string[];
}

interface ComfortData {
  questions: Question[];
  verses: Verse[];
  tagDescriptions: Record<string, string>;
}

export const ComfortChat: React.FC = () => {
  const [data, setData] = useState<ComfortData | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Option | null>>({});
  const [showResult, setShowResult] = useState(false);
  const [recommendedVerses, setRecommendedVerses] = useState<Verse[]>([]);
  const [collectedTags, setCollectedTags] = useState<string[]>([]);

  useEffect(() => {
    fetch('/data/comfort-verses.json')
      .then(res => res.json())
      .then(setData)
      .catch(console.error);
  }, []);

  const handleSelectOption = (option: Option) => {
    setAnswers(prev => ({ ...prev, [currentStep]: option }));

    // 선택하면 자동으로 다음 질문으로 이동
    if (data && currentStep < data.questions.length - 1) {
      setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, 300); // 짧은 딜레이로 선택 애니메이션 보여주기
    } else if (data && currentStep === data.questions.length - 1) {
      // 마지막 질문이면 결과 계산 (답변이 저장된 후 실행)
      setTimeout(() => {
        calculateResultWithAnswer(option);
      }, 300);
    }
  };

  const handleNext = () => {
    if (!data) return;

    if (currentStep < data.questions.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      calculateResult();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const calculateResultWithAnswer = (lastAnswer: Option) => {
    if (!data) return;

    // 마지막 답변 포함하여 태그 수집
    const allTags: string[] = [];
    Object.entries(answers).forEach(([step, answer]) => {
      if (answer?.tags && parseInt(step) !== currentStep) {
        allTags.push(...answer.tags);
      }
    });
    // 마지막 답변 태그 추가
    if (lastAnswer?.tags) {
      allTags.push(...lastAnswer.tags);
    }

    processTagsAndShowResult(allTags);
  };

  const processTagsAndShowResult = (allTags: string[]) => {
    if (!data) return;

    // Count tag frequencies
    const tagCounts: Record<string, number> = {};
    allTags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });

    // Sort tags by frequency
    const sortedTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag);

    setCollectedTags(sortedTags);

    // Score verses based on matching tags
    const scoredVerses = data.verses.map(verse => {
      let score = 0;
      sortedTags.forEach((tag, index) => {
        if (verse.tags.includes(tag)) {
          // Higher weight for more frequent tags
          score += (sortedTags.length - index) * (tagCounts[tag] || 1);
        }
      });
      return { verse, score };
    });

    // Sort by score and take top 4
    const topVerses = scoredVerses
      .filter(v => v.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map(v => v.verse);

    // If we have fewer than 3 verses, add some default comfort verses
    if (topVerses.length < 3) {
      const defaultVerses = data.verses
        .filter(v => v.tags.includes('comfort') && !topVerses.includes(v))
        .slice(0, 3 - topVerses.length);
      topVerses.push(...defaultVerses);
    }

    setRecommendedVerses(topVerses);
    setShowResult(true);
  };

  const calculateResult = () => {
    if (!data) return;

    // Collect all tags from answers
    const allTags: string[] = [];
    Object.values(answers).forEach(answer => {
      if (answer?.tags) {
        allTags.push(...answer.tags);
      }
    });

    processTagsAndShowResult(allTags);
  };

  const handleRestart = () => {
    setCurrentStep(0);
    setAnswers({});
    setShowResult(false);
    setRecommendedVerses([]);
    setCollectedTags([]);
  };

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <RefreshCw className="w-8 h-8 text-blue-500" />
        </motion.div>
      </div>
    );
  }

  if (showResult) {
    return (
      <ComfortResult
        verses={recommendedVerses}
        tags={collectedTags}
        tagDescriptions={data.tagDescriptions}
        onRestart={handleRestart}
      />
    );
  }

  const currentQuestion = data.questions[currentStep];
  const selectedOption = answers[currentStep];
  const progress = ((currentStep + 1) / data.questions.length) * 100;

  return (
    <div className="min-h-full bg-gradient-to-b from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 px-4 py-6">
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
          <span>질문 {currentStep + 1} / {data.questions.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6"
        >
          {/* Question Header with Icon */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
              {currentQuestion.question}
            </h2>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => (
              <motion.button
                key={option.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handleSelectOption(option)}
                className={`w-full p-4 rounded-xl text-left transition-all ${
                  selectedOption?.id === option.id
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md'
                    : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="text-base">{option.text}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Buttons */}
      <div className="flex gap-3">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handlePrev}
          disabled={currentStep === 0}
          className={`flex-1 py-4 rounded-xl font-medium flex items-center justify-center gap-2 ${
            currentStep === 0
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
          }`}
        >
          <ChevronLeft className="w-5 h-5" />
          이전
        </motion.button>
        {currentStep === data.questions.length - 1 ? (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={calculateResult}
            className="flex-1 py-4 rounded-xl font-medium flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white"
          >
            결과 보기
            <Heart className="w-5 h-5" />
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleNext}
            className="flex-1 py-4 rounded-xl font-medium flex items-center justify-center gap-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
          >
            다음
            <ChevronRight className="w-5 h-5" />
          </motion.button>
        )}
      </div>

      {/* Encouragement Message */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6"
      >
        당신의 마음을 이해하고 싶어요 💝
      </motion.p>
    </div>
  );
};
