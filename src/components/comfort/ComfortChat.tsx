import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Heart, RefreshCw } from 'lucide-react';
import { ComfortResult } from './ComfortResult';
import { useAdContext } from '../../contexts/AdContext';

interface Option {
  id: string;
  text: string;
  tags: string[];
  category?: 'positive' | 'negative' | 'neutral';
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

interface EncouragementMessage {
  message: string;
  closing: string;
}

interface ComfortData {
  questions: {
    q1: Question;
    q2: Record<string, Question>;
    q3: Record<string, Question>;
    q4: Record<string, Question>;
  };
  verses: Verse[];
  tagDescriptions: Record<string, string>;
  encouragementMessages: Record<string, EncouragementMessage>;
}

interface AnswerState {
  option: Option;
  questionId: number;
}

export const ComfortChat: React.FC = () => {
  const { triggerAd } = useAdContext();
  const [data, setData] = useState<ComfortData | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, AnswerState>>({});
  const [showResult, setShowResult] = useState(false);
  const [recommendedVerses, setRecommendedVerses] = useState<Verse[]>([]);
  const [collectedTags, setCollectedTags] = useState<string[]>([]);

  // 1번 질문 답변의 category (positive, negative, neutral)
  const [emotionCategory, setEmotionCategory] = useState<'positive' | 'negative' | 'neutral' | null>(null);
  // 1번 질문 답변의 id (joy, anger, sorrow, etc.)
  const [emotionType, setEmotionType] = useState<string | null>(null);

  useEffect(() => {
    // Load questions/messages and verses separately
    Promise.all([
      fetch('/data/comfort-verses.json').then(res => res.json()),
      fetch('/data/comfort-verses-data.json').then(res => res.json())
    ])
      .then(([mainData, versesData]) => {
        setData({
          ...mainData,
          verses: versesData
        });
      })
      .catch(console.error);
  }, []);

  // 현재 단계에 맞는 질문 가져오기
  const getCurrentQuestion = (): Question | null => {
    if (!data) return null;

    switch (currentStep) {
      case 0:
        return data.questions.q1;
      case 1:
        if (!emotionType) return null;
        return data.questions.q2[emotionType] || null;
      case 2:
        if (!emotionCategory) return null;
        return data.questions.q3[emotionCategory] || null;
      case 3:
        if (!emotionCategory) return null;
        return data.questions.q4[emotionCategory] || null;
      default:
        return null;
    }
  };

  const handleSelectOption = (option: Option) => {
    const currentQuestion = getCurrentQuestion();
    if (!currentQuestion) return;

    // 답변 저장
    setAnswers(prev => ({
      ...prev,
      [currentStep]: { option, questionId: currentQuestion.id }
    }));

    // 1번 질문이면 category와 emotion type 저장
    if (currentStep === 0) {
      setEmotionCategory(option.category || 'neutral');
      setEmotionType(option.id);
    }

    // 자동으로 다음 질문으로 이동
    if (currentStep < 3) {
      setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, 300);
    } else {
      // 마지막 질문이면 결과 계산
      setTimeout(() => {
        calculateResultWithAnswer(option);
      }, 300);
    }
  };

  const handleNext = () => {
    if (currentStep < 3) {
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

    // 모든 이전 답변의 태그 수집
    const allTags: string[] = [];
    Object.values(answers).forEach(answer => {
      if (answer?.option?.tags) {
        allTags.push(...answer.option.tags);
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

    // 결과 표시 전 광고 확률적 표시
    triggerAd('COMFORT_RESULT');

    let topVerses: Verse[] = [];
    let sortedTags: string[] = [];

    if (allTags.length > 0) {
      // Count tag frequencies
      const tagCounts: Record<string, number> = {};
      allTags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });

      // Sort tags by frequency
      sortedTags = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([tag]) => tag);

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

      // Sort by score and take top 10, then randomly select 5
      const top10 = scoredVerses
        .filter(v => v.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map(v => v.verse);

      // Shuffle and pick 5
      const shuffled = [...top10].sort(() => Math.random() - 0.5);
      topVerses = shuffled.slice(0, 5);
    }

    // If we have fewer than 5 verses, add some default comfort verses
    if (topVerses.length < 5) {
      const defaultVerses = data.verses
        .filter(v => v.tags.includes('comfort') && !topVerses.some(tv => tv.id === v.id))
        .sort(() => Math.random() - 0.5)
        .slice(0, 5 - topVerses.length);
      topVerses.push(...defaultVerses);
    }

    // 태그가 없으면 기본 태그 설정
    if (sortedTags.length === 0) {
      sortedTags = ['comfort'];
    }

    setCollectedTags(sortedTags);
    setRecommendedVerses(topVerses);
    setShowResult(true);
  };

  const calculateResult = () => {
    if (!data) return;

    // Collect all tags from answers
    const allTags: string[] = [];
    Object.values(answers).forEach(answer => {
      if (answer?.option?.tags) {
        allTags.push(...answer.option.tags);
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
    setEmotionCategory(null);
    setEmotionType(null);
  };

  // 새 말씀 보기 - 현재 태그 기반으로 새로운 말씀 랜덤 선택
  const handleNewVerse = () => {
    if (!data || collectedTags.length === 0) return;

    // 현재 수집된 태그로 새로운 말씀 선택
    const tagCounts: Record<string, number> = {};
    collectedTags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });

    const scoredVerses = data.verses.map(verse => {
      let score = 0;
      collectedTags.forEach((tag, index) => {
        if (verse.tags.includes(tag)) {
          score += (collectedTags.length - index) * (tagCounts[tag] || 1);
        }
      });
      return { verse, score };
    });

    const top10 = scoredVerses
      .filter(v => v.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(v => v.verse);

    // Shuffle and pick 5
    const shuffled = [...top10].sort(() => Math.random() - 0.5);
    let topVerses = shuffled.slice(0, 5);

    // If we have fewer than 5 verses, add some default comfort verses
    if (topVerses.length < 5) {
      const defaultVerses = data.verses
        .filter(v => v.tags.includes('comfort') && !topVerses.some(tv => tv.id === v.id))
        .sort(() => Math.random() - 0.5)
        .slice(0, 5 - topVerses.length);
      topVerses = [...topVerses, ...defaultVerses];
    }

    setRecommendedVerses(topVerses);
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
        encouragementMessages={data.encouragementMessages}
        onRestart={handleRestart}
        onNewVerse={handleNewVerse}
      />
    );
  }

  const currentQuestion = getCurrentQuestion();

  // 질문을 가져올 수 없는 경우 (1번 질문 미선택 상태에서 2번으로 이동 등)
  if (!currentQuestion) {
    // 이전 단계로 돌아가기
    if (currentStep > 0) {
      setCurrentStep(0);
    }
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

  const selectedOption = answers[currentStep]?.option;

  return (
    <div className="min-h-full bg-gradient-to-b from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 px-4 py-6">
      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.2 }}
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
        {currentStep === 3 ? (
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
            disabled={currentStep === 0 && !emotionType}
            className={`flex-1 py-4 rounded-xl font-medium flex items-center justify-center gap-2 ${
              currentStep === 0 && !emotionType
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
            }`}
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
